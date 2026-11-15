/* ============================================================
 * 即刻开球 / PRO POOL — 物理引擎 js/physics.js
 * ------------------------------------------------------------
 * 经典 script（非 ES module），挂载 window.Pool.Physics.PhysicsWorld。
 * 纯 JS、无外部依赖；Node 环境（无 window）可直接 require/vm 加载，
 * 此时若不存在 Pool.CONFIG 则使用内置默认参数（与 config.js 保持一致）。
 *
 * 世界坐标：原点在台呢左上角，x 向右（长边 2.54m），y 向下（短边 1.27m），
 * 单位米；角度 0 指向 +x，Math.PI/2 指向 +y。
 *
 * 关键实现：
 *  - 固定子步长积分（默认 1/600s）+ 每子步位移限制，8m/s 也不穿透；
 *  - 球心速度 + 球面接触点滑移速度（u = v + ω × (-R)）区分滑动/滚动摩擦；
 *  - 球-球碰撞：法向恢复系数冲量 + 位置分离 + 切向摩擦（侧旋甩球），不粘滞；
 *  - 库边：法向反弹 + 切向摩擦/侧旋导致反弹角偏转；
 *  - 高杆/低杆通过初始角速度（超滚动/反滚动）自然产生跟进/回缩；
 *  - 侧旋（左/右击球点）会让球在滚动中缓慢转向（swerve，见 SPIN_SWERVE_K）：
 *    母球轨迹随击球点左右弯曲；无侧旋（含所有普通击球/开球）仍严格直线，
 *    球-球碰撞的切向甩球仍为 0，目标球始终沿球心连线；
 *  - castRay 精确返回首次球/库碰撞的接触点、法线与 ghost 母球位置；
 *  - 全部计算确定性（无随机数），clone 后可复现。
 *
 * castRay 返回约定（重要，供 renderer / AI 使用）：
 *   distance        从射线起点到「接触点」的距离
 *                   （球命中 = 起点到两球接触点；库边命中 = 起点到库边接触点）
 *   x, y            接触点世界坐标
 *   type            'ball' | 'cushion' | 'none'
 *   ball            命中的目标球（cushion/none 为 null）
 *   normal          球命中：目标球心指向接触点的单位法线；
 *                   库边命中：指向台内的单位法线；none 时为 {x:0,y:0}
 *   ghost           母球球心在接触瞬间的位置（球命中必有；库边为 null）
 *   centerDistance  （附加）射线起点到 ghost 球心（库边命中时为球心贴库位置）的距离
 *   type === 'none' 时 distance = Infinity，x/y 为射线远端（便于绘制兜底）。
 *
 * 附加能力（非契约必需，方便调试 / AI）：
 *   strike(id, { ..., speed })  可显式指定出杆速度（默认 power * maxShotSpeed）
 *   world.nearestPocket(x,y)    -> 最近袋口索引
 *   world.clearEvents()         清空本帧事件队列（等价于 world.events.length = 0）
 * ========================================================== */
(function (root, factory) {
  'use strict';
  var Pool = root.Pool = root.Pool || {};
  factory(Pool);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Pool.Physics;
  }
})(typeof window !== 'undefined' ? window
  : (typeof globalThis !== 'undefined' ? globalThis : this), function (Pool) {
  'use strict';

  /* ------------------------------------------------------------
   * 内置默认参数（CONFIG 缺失时的 fallback，与 js/config.js 对齐）
   * ---------------------------------------------------------- */
  var FALLBACK = {
    table: {
      width: 2.54,
      height: 1.27,
      ballRadius: 0.028575,
      pocketRadius: 0.052,
      railWidth: 0.095
    },
    physics: {
      maxShotSpeed: 7.6,
      ballRestitution: 0.95,
      cushionRestitution: 0.76,
      ballFriction: 0.06,
      cushionFriction: 0.2,
      rollingDecel: 0.36,
      slidingDecel: 2.6,
      spinDecay: 1.9,
      substep: 1 / 600,
      stopSpeed: 0.012
    }
  };

  var BALL_COLORS = {
    0: '#f6f3ec',
    1: '#f2c230', 2: '#1f5bb5', 3: '#cf3a2b', 4: '#6b3f9e',
    5: '#e5852b', 6: '#2b8a57', 7: '#8a2f3d', 8: '#191919',
    9: '#f2c230', 10: '#1f5bb5', 11: '#cf3a2b', 12: '#6b3f9e',
    13: '#e5852b', 14: '#2b8a57', 15: '#8a2f3d'
  };

  /* 物理调参常量（与具体台面无关） */
  var MAX_SPEED = 13;            // 硬速度上限 m/s（防极端输入）
  var SLIP_COUPLING = 3.5;       // 滑动摩擦下 |u| 的衰减系数（实心球 1+5/2）
  var SPIN_FOLLOW_K = 0.7;       // 高杆超滚动系数（0..1：spinY=1 时角速度 = 1.7 倍滚动）
  var SPIN_DRAW_K = 1.75;        // 低杆反滚动系数（spinY=-1 时角速度 = -0.75 倍滚动）
  var SPIN_SIDE_K = 0.42;        // 侧旋强度（R*ωz = 0.42 * v）
  var SPIN_SWERVE_K = 0.03;      // 侧旋弧线（swerve）角速度 rad/s per 单位侧旋
                                 // 只对带侧旋的球生效；量级很小（1.2m 约 1.7cm），不会造成夸张弧线
  var CUSHION_MIN_SPEED = 0.02;  // 低于此冲击速度不再反弹（防库边抖动）
  var ROLL_TOLERANCE = 0.02;     // 滑移速度低于此值视为滚动
  var STOP_SLIP_FACTOR = 2;

  /* ------------------------------------------------------------
   * 小工具
   * ---------------------------------------------------------- */
  function num(v, d) {
    return (typeof v === 'number' && v === v && isFinite(v)) ? v : d;
  }
  function clamp(v, a, b) {
    return v < a ? a : (v > b ? b : v);
  }
  function hypot(x, y) {
    return Math.sqrt(x * x + y * y);
  }
  function kindOf(number) {
    if (number === 0) return 'cue';
    if (number === 8) return 'eight';
    return number > 8 ? 'stripe' : 'solid';
  }
  function defInternal(obj, key, value) {
    Object.defineProperty(obj, key, {
      value: value,
      writable: true,
      enumerable: false,
      configurable: true
    });
  }
  function copyVec(v) {
    return { x: v.x, y: v.y };
  }

  function defaultPockets(width, height, radius) {
    var half = width * 0.5;
    return [
      { x: 0, y: 0, radius: radius, corner: true, index: 0 },
      { x: half, y: 0, radius: radius, corner: false, index: 1 },
      { x: width, y: 0, radius: radius, corner: true, index: 2 },
      { x: 0, y: height, radius: radius, corner: true, index: 3 },
      { x: half, y: height, radius: radius, corner: false, index: 4 },
      { x: width, y: height, radius: radius, corner: true, index: 5 }
    ];
  }

  function normalizePockets(list, width, height, fallbackRadius) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i] || {};
      var x = num(p.x, 0);
      var y = num(p.y, 0);
      var corner = (p.corner === true) ||
        ((x === 0 || x === width) && (y === 0 || y === height));
      out.push({
        x: x,
        y: y,
        radius: num(p.radius, fallbackRadius),
        corner: corner,
        index: (p.index === undefined || p.index === null) ? i : p.index
      });
    }
    return out;
  }

  /* 解析实例参数：opts > Pool.CONFIG > 内置 fallback */
  function resolveSettings(opts) {
    opts = opts || {};
    var cfg = (Pool && Pool.CONFIG && typeof Pool.CONFIG === 'object') ? Pool.CONFIG : null;
    var table = (cfg && cfg.table) || {};
    var cfgPhys = (cfg && cfg.physics) || {};
    var custom = opts.physics || {};
    var fb = FALLBACK;

    var width = num(opts.width, num(table.width, fb.table.width));
    var height = num(opts.height, num(table.height, fb.table.height));
    var ballRadius = num(opts.ballRadius, num(table.ballRadius, fb.table.ballRadius));
    var pocketRadius = num(opts.pocketRadius, num(table.pocketRadius, fb.table.pocketRadius));

    function pick(name, fallback) {
      return num(custom[name], num(cfgPhys[name], fallback));
    }

    var params = {
      maxShotSpeed: clamp(pick('maxShotSpeed', fb.physics.maxShotSpeed), 0.5, 20),
      ballRestitution: clamp(pick('ballRestitution', fb.physics.ballRestitution), 0, 1),
      cushionRestitution: clamp(pick('cushionRestitution', fb.physics.cushionRestitution), 0, 1),
      ballFriction: clamp(pick('ballFriction', fb.physics.ballFriction), 0, 1),
      cushionFriction: clamp(pick('cushionFriction', fb.physics.cushionFriction), 0, 1),
      rollingDecel: Math.max(0.01, pick('rollingDecel', fb.physics.rollingDecel)),
      slidingDecel: Math.max(0.01, pick('slidingDecel', fb.physics.slidingDecel)),
      spinDecay: Math.max(0, pick('spinDecay', fb.physics.spinDecay)),
      substep: clamp(pick('substep', fb.physics.substep), 1 / 4000, 1 / 240),
      stopSpeed: clamp(pick('stopSpeed', fb.physics.stopSpeed), 0.0005, 0.2)
    };
    if (params.slidingDecel < params.rollingDecel) {
      params.slidingDecel = params.rollingDecel;
    }
    // 目标球必须严格沿假想球法线方向运动，辅助线才能可信。
    // 真实球台有轻微“甩球”，但在本作里它会造成 5-8° 的辅助线偏差，
    // 因此关闭碰撞切向摩擦；旋转仍然作用在母球自身的滚动/走位上。
    params.throwFriction = 0;

    var pockets;
    var customGeometry = (opts.width !== undefined || opts.height !== undefined ||
      opts.pocketRadius !== undefined);
    if (opts.pockets && opts.pockets.length) {
      pockets = normalizePockets(opts.pockets, width, height, pocketRadius);
    } else if (!customGeometry && cfg && cfg.pockets && cfg.pockets.length) {
      pockets = normalizePockets(cfg.pockets, width, height, pocketRadius);
    } else {
      pockets = defaultPockets(width, height, pocketRadius);
    }

    return {
      width: width,
      height: height,
      ballRadius: ballRadius,
      pocketRadius: pocketRadius,
      params: params,
      pockets: pockets
    };
  }

  /* ------------------------------------------------------------
   * 球的公共数据结构（契约）：id/number/kind/color/x/y/vx/vy/
   * active/pocketed/pocketIndex/spinX/spinY/rotation
   * 内部角速度 _wx/_wy/_wz 与 _moving 用不可枚举属性隐藏，避免污染契约字段。
   * ---------------------------------------------------------- */
  function makeBall(spec, world) {
    spec = spec || {};
    var number = Math.round(num(spec.number, 0));
    if (number < 0) number = 0;

    var color = spec.color;
    if (!color) {
      if (Pool && Pool.BALL_COLORS && Pool.BALL_COLORS[number]) {
        color = Pool.BALL_COLORS[number];
      } else {
        color = BALL_COLORS[number] || '#f6f3ec';
      }
    }

    var ball = {
      id: (spec.id !== undefined && spec.id !== null) ? String(spec.id)
        : (number === 0 ? 'cue' : 'b' + number),
      number: number,
      kind: spec.kind || kindOf(number),
      color: color,
      x: num(spec.x, 0),
      y: num(spec.y, 0),
      vx: num(spec.vx, 0),
      vy: num(spec.vy, 0),
      active: spec.active === false ? false : true,
      pocketed: spec.pocketed === true,
      pocketIndex: (spec.pocketIndex === undefined) ? null : spec.pocketIndex,
      spinX: clamp(num(spec.spinX, 0), -1, 1),
      spinY: clamp(num(spec.spinY, 0), -1, 1),
      rotation: num(spec.rotation, 0)
    };
    if (ball.pocketed || !ball.active) {
      ball.active = false;
    }

    defInternal(ball, '_wx', 0);
    defInternal(ball, '_wy', 0);
    defInternal(ball, '_wz', 0);
    defInternal(ball, '_sx', 0);   // 击球点侧旋 -1..1（用于侧旋弧线，和 _wz 同步衰减）
    defInternal(ball, '_moving', false);

    return ball;
  }

  /* ============================================================
   * PhysicsWorld
   * ========================================================== */
  function PhysicsWorld(opts) {
    if (!(this instanceof PhysicsWorld)) return new PhysicsWorld(opts);
    var s = resolveSettings(opts);

    this.width = s.width;
    this.height = s.height;
    this.ballRadius = s.ballRadius;
    this.pocketRadius = s.pocketRadius;
    this.table = {
      width: s.width,
      height: s.height,
      ballRadius: s.ballRadius,
      pocketRadius: s.pocketRadius
    };
    this.pockets = s.pockets;
    this.params = s.params;
    this._maxPocketRadius = 0;
    for (var pi = 0; pi < this.pockets.length; pi++) {
      if (this.pockets[pi].radius > this._maxPocketRadius) {
        this._maxPocketRadius = this.pockets[pi].radius;
      }
    }
    // 袋口开口：库边在袋口附近不再是一堵连续墙，
    // 否则球会在袋口边缘撞上“看不见的库边”，看起来瞄进了却弹出来。
    var minDim = Math.min(s.width, s.height);
    this._cornerMouth = Math.max(s.ballRadius * 3.0, minDim * 0.0695);
    this._sideMouth = Math.max(s.ballRadius * 2.6, minDim * 0.06);

    this.balls = [];        // 全部球（含 inactive）
    this.cueBall = null;    // 母球引用
    this.events = [];       // 本帧事件队列（game 读完自行清空）
    this.time = 0;
    this._pairLock = Object.create(null);          // 累计模拟时间（调试用）
    this._pairLock = Object.create(null);
  }

  /* ------------------------- 球管理 ------------------------- */

  PhysicsWorld.prototype.addBall = function (spec) {
    var ball = makeBall(spec, this);
    if (!ball.pocketed && ball.active) {
      var sp = hypot(ball.vx, ball.vy);
      if (sp > 1e-9) {
        var angle = Math.atan2(ball.vy, ball.vx);
        this._primeAngular(ball, sp, angle, ball.spinX, ball.spinY);
        ball._moving = true;
      }
    }
    this.balls.push(ball);
    if (ball.number === 0 && ball.id === 'cue') {
      this.cueBall = ball;
    } else if (ball.number === 0 && !this.cueBall) {
      this.cueBall = ball;
    }
    this._separateAll();
    return ball;
  };

  PhysicsWorld.prototype.getBall = function (idOrNumber) {
    if (idOrNumber === null || idOrNumber === undefined) return null;
    var i, ball;
    for (i = 0; i < this.balls.length; i++) {
      ball = this.balls[i];
      if (ball.id === idOrNumber) return ball;
    }
    var n = null;
    if (typeof idOrNumber === 'number') {
      n = idOrNumber;
    } else if (/^[0-9]+$/.test(String(idOrNumber))) {
      n = parseInt(idOrNumber, 10);
    }
    if (n !== null) {
      for (i = 0; i < this.balls.length; i++) {
        if (this.balls[i].number === n) return this.balls[i];
      }
    }
    return null;
  };

  PhysicsWorld.prototype.resetFrom = function (specs) {
    this.balls.length = 0;
    this.cueBall = null;
    this.events.length = 0;
    this.time = 0;
    if (specs && specs.length) {
      for (var i = 0; i < specs.length; i++) {
        this.addBall(specs[i]);
      }
    }
    return this;
  };

  PhysicsWorld.prototype.clone = function () {
    var w = new PhysicsWorld({
      width: this.width,
      height: this.height,
      ballRadius: this.ballRadius,
      pocketRadius: this.pocketRadius,
      pockets: this.pockets,
      physics: this.params
    });
    for (var i = 0; i < this.balls.length; i++) {
      var src = this.balls[i];
      var b = makeBall({
        id: src.id,
        number: src.number,
        kind: src.kind,
        color: src.color,
        x: src.x,
        y: src.y,
        vx: src.vx,
        vy: src.vy,
        active: src.active,
        pocketed: src.pocketed,
        pocketIndex: src.pocketIndex,
        spinX: src.spinX,
        spinY: src.spinY,
        rotation: src.rotation
      }, w);
      b._wx = src._wx;
      b._wy = src._wy;
      b._wz = src._wz;
      b._sx = src._sx;
      b._moving = src._moving;
      w.balls.push(b);
      if (b.number === 0 && (w.cueBall === null || b.id === 'cue')) {
        w.cueBall = b;
      }
    }
    w.time = this.time;
    return w;
  };

  PhysicsWorld.prototype.clearEvents = function () {
    this.events.length = 0;
    return this;
  };

  /* ------------------------- 击球 ------------------------- */

  /* 根据出杆方向/速度/击球点初始化角速度：
   * 击球点决定“出杆瞬间”的球面角速度：
   *   中杆 spinY=0 → ω=0（真实滑动，随后由台呢摩擦自然转成滚动）；
   *   高杆 spinY>0 → 超滚动，低杆 spinY<0 → 反滚动。
   * base = v/R 为纯滚动角速度，符号与击球点直接对应。 */
  PhysicsWorld.prototype._primeAngular = function (ball, speed, angle, spinX, spinY, explicitPoint) {
    var R = this.ballRadius;
    if (!(speed > 0)) {
      ball._wx = 0;
      ball._wy = 0;
      ball._wz = 0;
      ball._sx = 0;
      return;
    }
    var base = speed / R;
    // 中杆不预置旋转：先滑动、再由摩擦过渡到自然滚动。
    // 高杆/低杆分别把球带入前旋/后旋，击球点才真正改变碰撞后的走位。
    var follow;
    if (explicitPoint && Math.abs(spinY) < 1e-6) follow = 0; // 中杆定杆：先滑动
    else if (explicitPoint) follow = spinY >= 0
      ? base * SPIN_FOLLOW_K * spinY
      : base * SPIN_DRAW_K * spinY;
    else follow = base; // 旧 API 未提供击球点：保留纯滚动默认契约
    var dx = Math.cos(angle);
    var dy = Math.sin(angle);
    ball._wx = -dy * follow;
    ball._wy = dx * follow;
    ball._wz = spinX * base * SPIN_SIDE_K;
    ball._sx = spinX;
  };

  PhysicsWorld.prototype.strike = function (cueBallId, opts) {
    opts = opts || {};
    var ball = this.getBall(cueBallId === undefined || cueBallId === null ? 'cue' : cueBallId);
    if (!ball || !ball.active) return;

    var angle = num(opts.angle, 0);
    var power = clamp(num(opts.power, 0), 0, 1);
    var spinX = clamp(num(opts.spinX, 0), -1, 1);
    var spinY = clamp(num(opts.spinY, 0), -1, 1);
    var spinYSpecified = Object.prototype.hasOwnProperty.call(opts, 'spinY');
    var speed = num(opts.speed, power * this.params.maxShotSpeed);
    if (speed < 0) speed = 0;
    if (speed > MAX_SPEED) speed = MAX_SPEED;

    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.spinX = spinX;
    ball.spinY = spinY;
    this._primeAngular(ball, speed, angle, spinX, spinY, spinYSpecified);
    ball._moving = speed > 0;
    if (!ball._moving) {
      ball._wx = 0;
      ball._wy = 0;
      ball._wz = 0;
    }

    this.events.push({
      type: 'strike',
      ball: ball,
      power: power,
      x: ball.x,
      y: ball.y
    });
  };

  /* ------------------------- 步进 ------------------------- */

  PhysicsWorld.prototype.step = function (dtSeconds) {
    var dt = num(dtSeconds, 0);
    if (dt <= 0) return;
    if (dt > 0.05) dt = 0.05;      // 卡顿保护
    var sub = this.params.substep;
    var n = Math.ceil(dt / sub - 1e-6);
    if (n < 1) n = 1;
    if (n > 400) n = 400;
    var h = dt / n;
    for (var i = 0; i < n; i++) {
      this._substep(h);
    }
    this.time += dt;
  };

  PhysicsWorld.prototype._substep = function (h) {
    var balls = this.balls;
    var i, b;

    // 1) 摩擦 / 旋转衰减 / 静止判定
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.active) this._friction(b, h);
    }
    // 2) 位移积分（位置限制在子步内：速度上限 13m/s * 1/600s ≈ 0.022m < 2R）
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (!b.active) continue;
      var sp = hypot(b.vx, b.vy);
      if (sp > MAX_SPEED) {
        var f = MAX_SPEED / sp;
        b.vx *= f;
        b.vy *= f;
        sp = MAX_SPEED;
      }
      b._px = b.x;
      b._py = b.y;
      b.x += b.vx * h;
      b.y += b.vy * h;
      if (sp > 0) b.rotation += sp * h / this.ballRadius;
    }
    // 3) 袋口捕获（先于库边，保证角袋/中袋口正常落袋）
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.active) this._checkPocket(b);
    }
    // 4) 球-球碰撞（两轮迭代，稳定球堆）
    this._resolveBallCollisions();
    // 5) 库边
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.active) this._cushion(b);
    }
    // 6) 袋口豁口（jaw）碰撞。
    //    旧实现把球推到「以袋心为圆心的环」上再夹回台内，两个约束互相打架，
    //    每 1/600s 把球瞬移 2~3cm，看上去就是球在袋角高频颤抖。
    //    现在改成和普通库边同一套：位置精确贴到台呢边界，速度按法线反射。
    //    球心进入捕获圆早就落袋了，所以这里只会处理「撞在袋角」的球。
    var RB = this.ballRadius;
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (!b.active) continue;
      var lowX = b.x < RB, highX = b.x > this.width - RB;
      var lowY = b.y < RB, highY = b.y > this.height - RB;
      if (!lowX && !highX && !lowY && !highY) continue;
      // 只在袋口豁口附近才这样处理；其余位置 _cushion 已经处理过
      var inMouth = false;
      for (var mi = 0; mi < this.pockets.length; mi++) {
        var mp = this.pockets[mi];
        var mdx = b.x - mp.x, mdy = b.y - mp.y;
        if (mdx * mdx + mdy * mdy < Math.pow(mp.radius + RB * 2.2, 2)) { inMouth = true; break; }
      }
      if (!inMouth) {
        b.x = Math.max(RB, Math.min(this.width - RB, b.x));
        b.y = Math.max(RB, Math.min(this.height - RB, b.y));
        continue;
      }
      var eJaw = 0.52;
      var hitSpeed = 0;
      if (lowX) {
        b.x = RB;
        if (b.vx < 0) { hitSpeed = Math.max(hitSpeed, -b.vx); b.vx = -b.vx * eJaw; b.vy *= 0.96; }
      } else if (highX) {
        b.x = this.width - RB;
        if (b.vx > 0) { hitSpeed = Math.max(hitSpeed, b.vx); b.vx = -b.vx * eJaw; b.vy *= 0.96; }
      }
      if (lowY) {
        b.y = RB;
        if (b.vy < 0) { hitSpeed = Math.max(hitSpeed, -b.vy); b.vy = -b.vy * eJaw; b.vx *= 0.96; }
      } else if (highY) {
        b.y = this.height - RB;
        if (b.vy > 0) { hitSpeed = Math.max(hitSpeed, b.vy); b.vy = -b.vy * eJaw; b.vx *= 0.96; }
      }
      if (hitSpeed > 0.05 && b._moving) {
        this.events.push({ type: 'cushion', ball: b, speed: hitSpeed, x: b.x, y: b.y });
      }
    }
  };

  /* ------------------------- 摩擦 ------------------------- */

  PhysicsWorld.prototype._friction = function (b, h) {
    // 完全静止的球：只做 spin 字段衰减（零成本快速路径）
    if (b.vx === 0 && b.vy === 0 && b._wx === 0 && b._wy === 0 && b._wz === 0) {
      if (b.spinX !== 0 || b.spinY !== 0) {
        var d0 = Math.exp(-this.params.spinDecay * h);
        b.spinX *= d0;
        b.spinY *= d0;
        if (Math.abs(b.spinX) < 1e-4) b.spinX = 0;
        if (Math.abs(b.spinY) < 1e-4) b.spinY = 0;
      }
      b._sx = 0;
      if (b._moving) this._stop(b);
      return;
    }

    var R = this.ballRadius;
    var P = this.params;
    var vx = b.vx, vy = b.vy;
    var wx = b._wx, wy = b._wy, wz = b._wz;

    // 接触点滑移速度 u = v - R*wy, v + R*wx（滚动时 u = 0）
    var ux = vx - R * wy;
    var uy = vy + R * wx;
    var u = hypot(ux, uy);
    var remaining = h;

    if (u > 1e-7) {
      // 滑动阶段：摩擦力 = -slidingDecel * û；|u| 以 3.5*slidingDecel 衰减
      var tSlide = u / (SLIP_COUPLING * P.slidingDecel);
      var ts = tSlide < h ? tSlide : h;
      var dv = P.slidingDecel * ts;
      var nxu = ux / u, nyu = uy / u;
      vx -= dv * nxu;
      vy -= dv * nyu;
      // 摩擦力矩：Δwx = 5/(2R) * Δvy，Δwy = -5/(2R) * Δvx
      wx += (5 / (2 * R)) * (-dv * nyu);
      wy += (5 / (2 * R)) * (dv * nxu);
      remaining = h - ts;
    }

    // 滚动阶段：滚动阻力线性减速（与速度方向相反）
    if (remaining > 1e-12) {
      var ux2 = vx - R * wy;
      var uy2 = vy + R * wx;
      var u2 = hypot(ux2, uy2);
      if (u2 < ROLL_TOLERANCE) {
        var sp = hypot(vx, vy);
        if (sp > 0) {
          // 台呢绒毛在低速段会额外“抓住”球：避免球以极低速度长时间漂移
          var rollDecel = P.rollingDecel + sp * 0.035 + (sp < 0.55 ? (0.55 - sp) * 1.15 : 0);
          var nsp = sp - rollDecel * remaining;
          if (nsp < 0) nsp = 0;
          var sf = nsp / sp;
          vx *= sf;
          vy *= sf;
          if (nsp === 0) {
            wx = 0;
            wy = 0;
          } else {
            wx = -vy / R;
            wy = vx / R;
          }
        } else {
          wx = 0;
          wy = 0;
        }
      } else {
        // 残余滑动（数值安全兜底）
        var ts2 = Math.min(u2 / (SLIP_COUPLING * P.slidingDecel), remaining);
        var dv2 = P.slidingDecel * ts2;
        vx -= dv2 * ux2 / u2;
        vy -= dv2 * uy2 / u2;
        wx += (5 / (2 * R)) * (-dv2 * uy2 / u2);
        wy += (5 / (2 * R)) * (dv2 * ux2 / u2);
      }
    }

    // 侧旋弧线（swerve）：带塞的球在滚动/滑动中持续缓慢转向（真实侧旋 masse 的轻量近似）。
    // 正侧旋=右塞 → 相对当前行进方向向右弯；同步旋转滚动角速度轴，避免制造额外滑移。
    // 只影响带侧旋的球；无侧旋（含所有普通击球/开球）轨迹仍是直线。
    if (b._sx !== 0) {
      var swSpeed = hypot(vx, vy);
      if (swSpeed > 1e-9) {
        var dTheta = SPIN_SWERVE_K * b._sx * h;
        var cosT = Math.cos(dTheta);
        var sinT = Math.sin(dTheta);
        var tvx = vx * cosT - vy * sinT;
        var tvy = vx * sinT + vy * cosT;
        var twx = wx * cosT - wy * sinT;
        var twy = wx * sinT + wy * cosT;
        vx = tvx; vy = tvy; wx = twx; wy = twy;
      }
      b._sx *= Math.exp(-P.spinDecay * h);
      if (Math.abs(b._sx) < 1e-4) b._sx = 0;
    }

    // 侧旋自然衰减
    if (wz !== 0) {
      wz *= Math.exp(-P.spinDecay * h);
      if (Math.abs(wz) < 1e-6) wz = 0;
    }
    // 公共 spin 字段自然衰减（供 renderer / AI 读）
    b.spinX *= Math.exp(-P.spinDecay * h);
    b.spinY *= Math.exp(-P.spinDecay * h);
    if (Math.abs(b.spinX) < 1e-4) b.spinX = 0;
    if (Math.abs(b.spinY) < 1e-4) b.spinY = 0;

    b.vx = vx;
    b.vy = vy;
    b._wx = wx;
    b._wy = wy;
    b._wz = wz;

    // 静止判定：线速度与滑移都足够小 -> 完全静止
    var speed = hypot(vx, vy);
    var slip = hypot(vx - R * wy, vy + R * wx);
    if (speed < P.stopSpeed && slip < P.stopSpeed * STOP_SLIP_FACTOR) {
      this._stop(b);
    } else if (!b._moving && (speed > P.stopSpeed || slip > P.stopSpeed * STOP_SLIP_FACTOR)) {
      b._moving = true;
    }
  };

  PhysicsWorld.prototype._stop = function (b) {
    b.vx = 0;
    b.vy = 0;
    b._wx = 0;
    b._wy = 0;
    b._wz = 0;
    b._sx = 0;
    b.spinX = 0;
    b.spinY = 0;
    if (b._moving) {
      b._moving = false;
      this.events.push({ type: 'stopped', ball: b });
    }
  };

  /* ------------------------- 球-球碰撞 ------------------------- */

  PhysicsWorld.prototype._resolveBallCollisions = function () {
    var balls = this.balls;
    var i, need = false;
    for (i = 0; i < balls.length; i++) {
      if (balls[i].active && balls[i]._moving) { need = true; break; }
    }
    if (!need) return; // 全部静止：无需球-球检测
    for (var iter = 0; iter < 2; iter++) {
      for (i = 0; i < balls.length; i++) {
        var a = balls[i];
        if (!a.active) continue;
        for (var j = i + 1; j < balls.length; j++) {
          var b = balls[j];
          if (!b.active) continue;
          this._collidePair(a, b);
        }
      }
    }
  };

  /* 初始化/摆球时做一次纯位置分离（不产生冲量、不产生事件）。 */
  PhysicsWorld.prototype._separateAll = function () {
    var balls = this.balls;
    var R = this.ballRadius;
    var minD = 2 * R;
    for (var i = 0; i < balls.length; i++) {
      var a = balls[i];
      if (!a.active) continue;
      for (var j = i + 1; j < balls.length; j++) {
        var b = balls[j];
        if (!b.active) continue;
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var d2 = dx * dx + dy * dy;
        if (d2 >= minD * minD) continue;
        var d = Math.sqrt(d2);
        var nx = d > 1e-9 ? dx / d : 1;
        var ny = d > 1e-9 ? dy / d : 0;
        var dd = d > 1e-9 ? d : 1e-9;
        var push = (minD - dd) * 0.5;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  };

  PhysicsWorld.prototype._collidePair = function (a, b) {
    if (!a._moving && !b._moving) return; // 静止球对无需检测（初始重叠已在摆球时分离）
    var R = this.ballRadius;
    var minD = 2 * R;
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var d2 = dx * dx + dy * dy;
    if (d2 >= minD * minD) return;

    var d = Math.sqrt(d2);
    var nx, ny;
    if (d > 1e-9) {
      nx = dx / d;
      ny = dy / d;
    } else {
      nx = 1;
      ny = 0;
      d = 1e-9;
    }

    var rvx = b.vx - a.vx;
    var rvy = b.vy - a.vy;

    // 精确接触法线（连续碰撞检测）。每子步球心可移动 10~17mm，约为球半径的
    // 35~60%，用穿透后的球心连线当法线会偏 13°~40°（切角越大越偏），
    // 表现为「辅助线瞄对了也打不进」「AI 瞄不准」。
    // 做法：取子步开始的两球位置与相对速度，解 |p + v·t| = 2R 的 t∈[0,1]，
    // 用那一瞬间的球心连线作为法线；冲量与位置分离都用它。
    var ax0 = (a._px === undefined) ? a.x : a._px;
    var ay0 = (a._py === undefined) ? a.y : a._py;
    var bx0 = (b._px === undefined) ? b.x : b._px;
    var by0 = (b._py === undefined) ? b.y : b._py;
    var px = bx0 - ax0, py = by0 - ay0;
    var vv = rvx * rvx + rvy * rvy;
    if (vv > 1e-12) {
      var pp = px * px + py * py;
      var pv = px * rvx + py * rvy;
      // |p + v t|^2 = minD^2  →  vv t^2 + 2 pv t + (pp - minD^2) = 0
      var cc = pp - minD * minD;
      var disc = pv * pv - vv * cc;
      var tC = -1;
      if (disc >= 0 && pp > minD * minD - 1e-12) {
        var sq = Math.sqrt(disc);
        var t1 = (-pv - sq) / vv;
        var t2 = (-pv + sq) / vv;
        if (t1 >= 0 && t1 <= 1) tC = t1;
        else if (t2 >= 0 && t2 <= 1) tC = t2;
      }
      if (tC >= 0) {
        var hx = px + rvx * tC, hy = py + rvy * tC;
        var hl = Math.sqrt(hx * hx + hy * hy);
        if (hl > 1e-9) { nx = hx / hl; ny = hy / hl; }
      }
    }

    var vn = rvx * nx + rvy * ny;

    // 位置分离（避免粘滞/自爆：只改位置，不注入能量）
    var overlap = minD - d;
    if (overlap > 1e-9) {
      var push = overlap * 0.5;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
    }

    if (vn >= 0) return; // 正在分离

    var impact = -vn;
    var P = this.params;
    var e = impact > 0.03 ? P.ballRestitution : 0;
    var j = (1 + e) * impact * 0.5; // 等质量：每球法向速度改变量

    a.vx -= j * nx;
    a.vy -= j * ny;
    b.vx += j * nx;
    b.vy += j * ny;

    // 切向摩擦 + 侧旋“甩球”：u_t = (va-vb)·t + R(wz_a - wz_b)
    var tx = -ny;
    var ty = nx;
    var ut = ((a.vx - b.vx) * tx + (a.vy - b.vy) * ty) +
      R * (a._wz - b._wz);
    var jt = -ut * 0.5;
    var maxJt = P.throwFriction * j;
    if (jt > maxJt) jt = maxJt;
    else if (jt < -maxJt) jt = -maxJt;

    if (jt !== 0) {
      a.vx += jt * tx;
      a.vy += jt * ty;
      b.vx -= jt * tx;
      b.vy -= jt * ty;
      var dwz = (5 / (2 * R)) * jt;
      a._wz += dwz;
      b._wz += dwz;
    }

    // 碰球后让两球残留的水平角速度对齐新速度方向，消除侧向滑移造成的弧线
    this._alignRollAfterHit(a);
    this._alignRollAfterHit(b);

    if (impact > 0.02) {
      a._moving = true;
      b._moving = true;
      this.events.push({
        type: 'ball-hit',
        a: a,
        b: b,
        speed: impact,
        x: a.x + nx * R,
        y: a.y + ny * R
      });
    }
  };

  /* 碰球后把水平滚动角速度 _wx/_wy 投影到“新线速度方向对应的滚动轴”上，丢掉垂直分量。
   * 投影后接触点滑移只剩沿速度方向的分量，母球碰球后走直线（只加速/减速），不再画弧。
   * 保留投影符号 -> 高杆跟进 / 低杆回缩方向不变；速度≈0 时方向无意义，保留原角速度。 */
  PhysicsWorld.prototype._alignRollAfterHit = function (ball) {
    var sp = hypot(ball.vx, ball.vy);
    if (!isFinite(sp) || sp < 1e-9) return; // 完全停住（或异常值）：保留原角速度
    var ux = ball.vx / sp;
    var uy = ball.vy / sp;
    var rx = -uy;            // 滚动角速度单位方向 = 速度方向左转 90°
    var ry = ux;
    var mag = ball._wx * rx + ball._wy * ry;
    if (!isFinite(mag)) return;
    ball._wx = rx * mag;
    ball._wy = ry * mag;
  };

  /* ------------------------- 库边 / 袋口开口 ------------------------- */

  /** 该方向上的库边是否在袋口开口内。axis='x' 表示左右库，axis='y' 表示上下库。 */
  PhysicsWorld.prototype._isPocketOpening = function (b, axis) {
    if (axis === 'x') {
      return b.y < this._cornerMouth || b.y > this.height - this._cornerMouth;
    }
    return b.x < this._cornerMouth ||
      b.x > this.width - this._cornerMouth ||
      Math.abs(b.x - this.width * 0.5) < this._sideMouth;
  };

  PhysicsWorld.prototype._cushion = function (b) {
    var R = this.ballRadius;
    if (b.x < R && !this._isPocketOpening(b, 'x')) {
      b.x = R;
      this._bounce(b, 1, 0);
    } else if (b.x > this.width - R && !this._isPocketOpening(b, 'x')) {
      b.x = this.width - R;
      this._bounce(b, -1, 0);
    }
    if (b.y < R && !this._isPocketOpening(b, 'y')) {
      b.y = R;
      this._bounce(b, 0, 1);
    } else if (b.y > this.height - R && !this._isPocketOpening(b, 'y')) {
      b.y = this.height - R;
      this._bounce(b, 0, -1);
    }
  };

  /* n 为指向台内的单位法线 */
  PhysicsWorld.prototype._bounce = function (b, nx, ny) {
    var vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return;
    var R = this.ballRadius;
    var P = this.params;
    var impact = -vn;

    if (impact <= CUSHION_MIN_SPEED) {
      // 低速：直接吸收法向速度，避免库边抖动
      b.vx -= vn * nx;
      b.vy -= vn * ny;
      if (!b._moving && hypot(b.vx, b.vy) > P.stopSpeed) b._moving = true;
      return;
    }

    var e = P.cushionRestitution;
    // 法向反弹
    b.vx -= (1 + e) * vn * nx;
    b.vy -= (1 + e) * vn * ny;

    // 切向：库边摩擦 + 侧旋改变反弹角
    var tx = ny;
    var ty = -nx;
    var vt = b.vx * tx + b.vy * ty;
    var u = vt + R * b._wz;
    var dv = -u / SLIP_COUPLING;
    var maxDv = P.cushionFriction * (1 + e) * impact;
    if (dv > maxDv) dv = maxDv;
    else if (dv < -maxDv) dv = -maxDv;
    if (dv !== 0) {
      b.vx += dv * tx;
      b.vy += dv * ty;
      b._wz += (5 / (2 * R)) * dv;
    }

    b._moving = true;
    // 接触点 = 球心 - R * n（球心此刻已贴库）
    this.events.push({
      type: 'cushion',
      ball: b,
      speed: impact,
      x: b.x - nx * R,
      y: b.y - ny * R
    });
  };

  /* ------------------------- 袋口 ------------------------- */

  PhysicsWorld.prototype.nearestPocket = function (x, y) {
    var best = 0;
    var bestD = Infinity;
    for (var i = 0; i < this.pockets.length; i++) {
      var p = this.pockets[i];
      var dx = x - p.x;
      var dy = y - p.y;
      var d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };

  PhysicsWorld.prototype._checkPocket = function (b) {
    var best = -1;
    var bestD = Infinity;
    var pr = this._maxPocketRadius;
    var inside = b.x > pr && b.x < this.width - pr && b.y > pr && b.y < this.height - pr;
    if (inside) return; // 远离所有袋口，直接跳过（距离/开方开销为零）
    // 门槛：球心已经越过台呢边界（进入袋口豁口），
    // 或者球心本身已经落进袋口圆内（球边缘压在袋口上的正常进球）。
    // 仅凭「本子步线段扫过袋心附近」不够：沿库边正常滚过、球边缘离洞口
    // 还有近 2cm 的球会被误判落袋，接着被自由球流程瞬移回开球点。
    var R = this.ballRadius;
    var overEdge = b.x < R || b.x > this.width - R || b.y < R || b.y > this.height - R;
    // 捕获半径 = 袋口半径 + 0.55R：球边压在袋口上就应该掉下去。
    // 再放宽会把“擦着袋口滚过去”的球也吞掉（实测 0.85R 时 x 偏 7cm 的球会被误判进袋）。
    for (var i = 0; i < this.pockets.length; i++) {
      var p = this.pockets[i];
      var capR = p.radius + this.ballRadius * 0.55;
      // 扫掠检测：判断本子步走过的线段是否穿过捕获圆，而不是只看子步末端。
      // 只看末端会让“进球/不进”取决于子步相位——实测同一杆在 0.290~0.291、
      // 0.311 这些窄带里会莫名擦袋而过，表现为球停在袋口。
      var ax = (b._px === undefined) ? b.x : b._px;
      var ay = (b._py === undefined) ? b.y : b._py;
      var sx = b.x - ax, sy = b.y - ay;
      var segLen2 = sx * sx + sy * sy;
      var t = 0;
      if (segLen2 > 1e-12) {
        t = ((p.x - ax) * sx + (p.y - ay) * sy) / segLen2;
        if (t < 0) t = 0; else if (t > 1) t = 1;
      }
      var cx = ax + sx * t - p.x;
      var cy = ay + sy * t - p.y;
      var d = Math.sqrt(cx * cx + cy * cy);
      var dc = Math.sqrt((b.x - p.x) * (b.x - p.x) + (b.y - p.y) * (b.y - p.y));
      // overEdge 为真：球心已进入袋口缺口，无条件落袋。
      // 否则（球心还在台呢内、只是压在袋口边）：
      //   目标球 —— 真实台球里滚到洞口边缘就会掉下去，不需要还有速度；
      //   母球   —— 才适用「力没了就停在袋口」的规则，但仍允许极低速（滚动残余）落袋。
      // 旧版对所有球都要求 speed > 0.4，把中袋的慢速正常进球也挡掉了：
      // 实测顶中袋球速衰减到 <0.4 时不算进，必须偏 0.2~1.5° 才能“撞”进去。
      var speed = Math.hypot(b.vx, b.vy);
      var isCue = (b.number === 0 || b.id === 'cue');
      var nearMouth = dc < p.radius + this.ballRadius * 0.25;
      // 母球仍保留「要还有冲劲才算落袋」，否则会误吞刚滚到袋口、力度已尽的母球
      // （表现为犯规→自由球→母球被瞬移回开球点）；
      // 目标球只要球心进袋口圆就落袋，真实台球里滚到洞口就会掉下去。
      var accepted = overEdge || (nearMouth && (!isCue || speed > 0.4));
      if (d < capR && accepted && d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) this._capture(b, best);
  };

  PhysicsWorld.prototype._capture = function (b, index) {
    var p = this.pockets[index];
    var pocketIndex = (p.index === undefined || p.index === null) ? index : p.index;
    b.active = false;
    b.pocketed = true;
    b.pocketIndex = pocketIndex;
    b.vx = 0;
    b.vy = 0;
    b._wx = 0;
    b._wy = 0;
    b._wz = 0;
    b._sx = 0;
    b.spinX = 0;
    b.spinY = 0;
    b._moving = false;
    this.events.push({
      type: 'pocket',
      ball: b,
      pocketIndex: pocketIndex,
      x: b.x,
      y: b.y
    });
  };

  /* 强制让单球/全部球静止（供 game 的超时兜底使用）。
   * 直接改 ball.vx/vy 不会清掉内部角速度，可能被摩擦重新带动，故提供此辅助。 */
  PhysicsWorld.prototype.stopBall = function (ballOrId) {
    var b = (ballOrId && typeof ballOrId === 'object') ? ballOrId : this.getBall(ballOrId);
    if (!b) return;
    b.vx = 0;
    b.vy = 0;
    b._wx = 0;
    b._wy = 0;
    b._wz = 0;
    b._sx = 0;
    b.spinX = 0;
    b.spinY = 0;
    b._moving = false;
  };

  PhysicsWorld.prototype.stopAll = function () {
    for (var i = 0; i < this.balls.length; i++) {
      var b = this.balls[i];
      if (b.active) this.stopBall(b);
    }
    return this;
  };

  /* ------------------------- 状态查询 ------------------------- */

  PhysicsWorld.prototype.allStopped = function () {
    for (var i = 0; i < this.balls.length; i++) {
      var b = this.balls[i];
      if (b.active && b._moving) return false;
    }
    return true;
  };

  /* 瞄准射线：半径 = 球半径的扫掠圆，返回首次球/库碰撞。
   * 忽略 ignoreBallId（可为 id 或球号）与 inactive 球。 */
  PhysicsWorld.prototype.castRay = function (x, y, dirX, dirY, ignoreBallId) {
    var R = this.ballRadius;
    var d = hypot(dirX, dirY);
    var maxLen = Math.sqrt(this.width * this.width + this.height * this.height) * 2;

    if (!(d > 1e-12)) {
      return {
        distance: Infinity,
        x: x,
        y: y,
        type: 'none',
        ball: null,
        normal: { x: 0, y: 0 },
        ghost: null,
        centerDistance: Infinity
      };
    }
    var dx = dirX / d;
    var dy = dirY / d;
    var ignore = (ignoreBallId === undefined || ignoreBallId === null) ? null : ignoreBallId;
    var minD = 2 * R;
    var i, b;

    // ---- 球 ----
    var bestT = Infinity;
    var hitBall = null;
    for (i = 0; i < this.balls.length; i++) {
      b = this.balls[i];
      if (!b.active) continue;
      if (ignore !== null && (b.id === ignore || b.number === ignore)) continue;
      var lx = b.x - x;
      var ly = b.y - y;
      var l2 = lx * lx + ly * ly;
      if (l2 < minD * minD - 1e-9) continue;  // 起点已重叠，忽略
      var proj = lx * dx + ly * dy;
      if (proj <= 0) continue;
      var perp2 = l2 - proj * proj;
      if (perp2 > minD * minD) continue;
      var t = proj - Math.sqrt(Math.max(0, minD * minD - perp2));
      if (t <= 1e-9) continue;
      if (t < bestT) {
        bestT = t;
        hitBall = b;
      }
    }

    // ---- 库边（球心活动范围 [R, W-R] x [R, H-R]）----
    var tc = Infinity;
    var cnx = 0, cny = 0;
    var tl, tr, tt, tb;
    if (dx < -1e-12) {
      tl = (R - x) / dx;
      if (tl > 0 && tl < tc) { tc = tl; cnx = 1; cny = 0; }
    } else if (dx > 1e-12) {
      tr = (this.width - R - x) / dx;
      if (tr > 0 && tr < tc) { tc = tr; cnx = -1; cny = 0; }
    }
    if (dy < -1e-12) {
      tt = (R - y) / dy;
      if (tt > 0 && tt < tc) { tc = tt; cnx = 0; cny = 1; }
    } else if (dy > 1e-12) {
      tb = (this.height - R - y) / dy;
      if (tb > 0 && tb < tc) { tc = tb; cnx = 0; cny = -1; }
    }

    // ---- 袋口（球心射线进入袋口捕获圆）----
    var pocketT = Infinity;
    var pocketIndex = -1;
    for (i = 0; i < this.pockets.length; i++) {
      var pk = this.pockets[i];
      var pox = pk.x - x;
      var poy = pk.y - y;
      var pproj = pox * dx + poy * dy;
      if (pproj <= 0) continue;
      var pper2 = pox * pox + poy * poy - pproj * pproj;
      var prr = pk.radius * pk.radius;
      if (pper2 > prr) continue;
      var pt = pproj - Math.sqrt(Math.max(0, prr - pper2));
      if (pt > 0 && pt < pocketT) {
        pocketT = pt;
        pocketIndex = i;
      }
    }

    // ---- 取最近 ----
    if (hitBall !== null && (pocketIndex < 0 || bestT <= pocketT) && (bestT < tc || !isFinite(tc))) {
      var gx = x + dx * bestT;
      var gy = y + dy * bestT;
      var nx = (gx - hitBall.x) / minD;
      var ny = (gy - hitBall.y) / minD;
      var nlen = hypot(nx, ny);
      if (nlen > 1e-9) {
        nx /= nlen;
        ny /= nlen;
      }
      var contactX = gx + dx * R;
      var contactY = gy + dy * R;
      return {
        distance: bestT + R,
        x: contactX,
        y: contactY,
        type: 'ball',
        ball: hitBall,
        normal: { x: nx, y: ny },
        ghost: { x: gx, y: gy },
        centerDistance: bestT
      };
    }

    if (pocketIndex >= 0 && pocketT < tc) {
      var pk2 = this.pockets[pocketIndex];
      var entryX = x + dx * pocketT;
      var entryY = y + dy * pocketT;
      var pnx = entryX - pk2.x;
      var pny = entryY - pk2.y;
      var pnl = hypot(pnx, pny) || 1;
      return {
        distance: pocketT,
        x: pk2.x,
        y: pk2.y,
        type: 'pocket',
        ball: null,
        normal: { x: pnx / pnl, y: pny / pnl },
        ghost: null,
        pocketIndex: pocketIndex,
        centerDistance: pocketT
      };
    }

    if (isFinite(tc)) {
      var cx = x + dx * tc;
      var cy = y + dy * tc;
      var contactX2 = cx - cnx * R;
      var contactY2 = cy - cny * R;
      return {
        distance: tc + R,
        x: contactX2,
        y: contactY2,
        type: 'cushion',
        ball: null,
        normal: { x: cnx, y: cny },
        ghost: null,
        centerDistance: tc
      };
    }

    return {
      distance: Infinity,
      x: x + dx * maxLen,
      y: y + dy * maxLen,
      type: 'none',
      ball: null,
      normal: { x: 0, y: 0 },
      ghost: null,
      centerDistance: Infinity
    };
  };

  /* ============================================================
   * 导出
   * ========================================================== */
  Pool.Physics = {
    PhysicsWorld: PhysicsWorld,
    version: '1.0.0',
    MAX_SPEED: MAX_SPEED
  };
});
