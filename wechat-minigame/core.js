/* PRO POOL core bundle (auto-generated, do not edit) */
/* 即刻开球 — 全局配置（Lead 维护）
 *
 * 明文依赖表（单文件内分层，改动前先看这里）：
 *   config.js  ── 无依赖，提供 CONFIG / BALL_COLORS / UTIL
 *   physics.js ── config.js（表尺寸、物理常数）
 *   renderer.js── config.js（表尺寸、袋口、球色、cues[].visual）
 *   audio.js   ── 无依赖（WebAudio + 内嵌采样）
 *   ai.js      ── config.js + physics.js（clone 试打）
 *   levels.js  ── config.js（坐标单位与表尺寸约定）
 *   game.js    ── config/physics/audio/ai/levels + CONFIG.economy
 *   main.js    ── 全部模块（输入、HUD、屏幕、commandMap、insets）
 *
 * 约定：米制坐标，原点在台呢左上角，x 向右(2.54)，y 向下(1.27)，
 * 角度 0 = +x，单位弧度。物理层与渲染层共用此约定。
 */
(function () {
  var Pool = (window.Pool = window.Pool || {});

  var W = 2.54;
  var H = 1.27;
  var R = 0.028575;
  var PR = 0.052;

  var pockets = [
    { x: 0, y: 0, radius: PR, corner: true, index: 0 },
    { x: W * 0.5, y: 0, radius: PR, corner: false, index: 1 },
    { x: W, y: 0, radius: PR, corner: true, index: 2 },
    { x: 0, y: H, radius: PR, corner: true, index: 3 },
    { x: W * 0.5, y: H, radius: PR, corner: false, index: 4 },
    { x: W, y: H, radius: PR, corner: true, index: 5 }
  ];

  var BALL_COLORS = {
    1: '#f2c230', 2: '#1f5bb5', 3: '#cf3a2b', 4: '#6b3f9e',
    5: '#e5852b', 6: '#2b8a57', 7: '#8a2f3d', 8: '#191919',
    9: '#f2c230', 10: '#1f5bb5', 11: '#cf3a2b', 12: '#6b3f9e',
    13: '#e5852b', 14: '#2b8a57', 15: '#8a2f3d'
  };

  var CUES = [
    {
      id: 'oak', name: '经典橡木', en: 'CLASSIC OAK', price: 0, starsRequired: 0,
      power: 1.0, spin: 1.0, aim: 1.0, role: '均衡型',
      desc: '均衡的入门杆：力量、旋转与辅助线都在基准，适合先练手感。',
      colors: { butt: '#6b3a22', wrap: '#24150f', shaft: '#d8b98e', accent: '#c9a24a', tip: '#4a78a6' },
      pattern: 'oak'
    },
    {
      id: 'maple', name: '枫木猎手', en: 'MAPLE HUNTER', price: 600, starsRequired: 0,
      power: 1.10, spin: 0.95, aim: 0.98, role: '力量型',
      desc: '轻快枫木前节：出杆速度 +10%，适合大力开球与长台，但旋转略弱。',
      colors: { butt: '#b87a3e', wrap: '#3a2015', shaft: '#efd9b5', accent: '#d8b25e', tip: '#4a8fc6' },
      pattern: 'maple'
    },
    {
      id: 'carbon', name: '碳纤黑刃', en: 'CARBON EDGE', price: 1500, starsRequired: 8,
      power: 0.98, spin: 1.20, aim: 1.02, role: '旋转型',
      desc: '低形变碳纤维前节：旋转 +20%，高低杆/塞更明显，适合走位与缩杆。',
      colors: { butt: '#1b1d20', wrap: '#0c0d0f', shaft: '#2a2d31', accent: '#7d8794', tip: '#4a78a6' },
      pattern: 'carbon'
    },
    {
      id: 'rosewood', name: '玫瑰木典藏', en: 'ROSEWOOD HERITAGE', price: 2800, starsRequired: 16,
      power: 1.05, spin: 1.08, aim: 1.12, role: '控制型',
      desc: '老料玫瑰木：辅助线更长、旋转稳定，适合需要精细走位的球局。',
      colors: { butt: '#5c201f', wrap: '#1b0e0d', shaft: '#e6cba0', accent: '#d4af62', tip: '#4a78a6' },
      pattern: 'rosewood'
    },
    {
      id: 'gold', name: '鎏金冠军', en: 'GOLD CHAMPION', price: 5000, starsRequired: 28,
      power: 1.15, spin: 1.15, aim: 1.16, role: '全能型',
      desc: '冠军限定：力量、旋转、辅助线三项都强，没有明显短板。',
      colors: { butt: '#2a1b10', wrap: '#0f0b08', shaft: '#f0d49a', accent: '#e7bf5f', tip: '#4a78a6' },
      pattern: 'gold'
    },
    {
      id: 'rod', name: '远投钓竿', en: 'LONG CAST ROD', price: 3200, starsRequired: 20,
      power: 0.98, spin: 0.94, aim: 1.24, role: '远瞄型', shape: 'rod',
      desc: '异形长竿：辅助线最长、袋口黏滞窗口最大，力量与旋转略低，适合远台薄球。',
      colors: { butt: '#183c4a', wrap: '#0b1c24', shaft: '#b9d8d2', accent: '#6fb7c7', tip: '#4a78a6' },
      pattern: 'carbon'
    },
    {
      id: 'pistol', name: '裁决之枪', en: 'JUDGEMENT PISTOL', price: 4200, starsRequired: 24,
      power: 1.24, spin: 0.90, aim: 1.05, role: '爆发型', shape: 'pistol',
      desc: '枪式短促发力：出杆最猛，适合开球和强攻，但旋转与走位控制较弱。',
      colors: { butt: '#22262b', wrap: '#0c0f12', shaft: '#8f989f', accent: '#c7a45a', tip: '#4a78a6' },
      pattern: 'carbon'
    },
    {
      id: 'wand', name: '星辉魔杖', en: 'STARLIGHT WAND', price: 5200, starsRequired: 30,
      power: 0.94, spin: 1.30, aim: 1.18, role: '旋转型', shape: 'wand',
      desc: '星辉杖身：旋转最强、辅助线强，力量偏小；适合高杆/低杆/塞的精细走位。',
      colors: { butt: '#3a1d54', wrap: '#160b24', shaft: '#d9c7ef', accent: '#e3b85f', tip: '#6a8fd0' },
      pattern: 'gold'
    },
    {
      id: 'golf', name: '果岭推杆', en: 'GREEN PUTTER', price: 6500, starsRequired: 36,
      power: 1.02, spin: 0.88, aim: 1.30, role: '控制型', shape: 'golf',
      desc: '高尔夫异形杆：辅助线与袋口黏滞最强，适合把每一杆都送到袋口；旋转较弱。',
      colors: { butt: '#1d3b2c', wrap: '#0b1711', shaft: '#d7d9d4', accent: '#b7c4a4', tip: '#4a78a6' },
      pattern: 'carbon'
    }
  ];


  /* 球杆视觉形象：只描述「造型语言」，不复制任何第三方具体造型。
   * renderer._drawCue / main.cueArt 共用这一份数据，保证商店与对局一致。
   * profile    : 杆身轮廓  classic 传统 / taper 渐收 / faceted 切面 / 异形轮廓
   * joint      : 接环      single 单环 / double 双环 / none 无
   * wrapStyle  : 握把纹理  linen 亚麻 / leather 皮革 / rings 环纹 / knurl 滚花
   * accentShape: 装饰母题  diamond 菱 / chevron 人字 / dot 点 / star 星 / none
   * tipRing    : 杆头金属环
   */
  var CUE_VISUALS = {
    oak:      { profile: 'classic', joint: 'single', wrapStyle: 'linen',   accentShape: 'dot',     tipRing: true },
    maple:    { profile: 'taper',   joint: 'double', wrapStyle: 'rings',   accentShape: 'chevron', tipRing: true },
    carbon:   { profile: 'faceted', joint: 'single', wrapStyle: 'knurl',   accentShape: 'diamond', tipRing: false },
    rosewood: { profile: 'classic', joint: 'double', wrapStyle: 'leather', accentShape: 'diamond', tipRing: true },
    gold:     { profile: 'faceted', joint: 'double', wrapStyle: 'leather', accentShape: 'star',    tipRing: true },
    rod:      { profile: 'rod',     joint: 'none',   wrapStyle: 'rings',   accentShape: 'none',    tipRing: false },
    pistol:   { profile: 'pistol',  joint: 'none',   wrapStyle: 'knurl',   accentShape: 'chevron', tipRing: false },
    wand:     { profile: 'wand',    joint: 'none',   wrapStyle: 'leather', accentShape: 'star',    tipRing: false },
    golf:     { profile: 'golf',    joint: 'none',   wrapStyle: 'knurl',   accentShape: 'none',    tipRing: false }
  };
  for (var vi = 0; vi < CUES.length; vi++) {
    CUES[vi].visual = CUE_VISUALS[CUES[vi].id] || CUE_VISUALS.oak;
  }

  Pool.CONFIG = {
    table: { width: W, height: H, ballRadius: R, pocketRadius: PR, railWidth: 0.095 },
    pockets: pockets,
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
    },
    cues: CUES,
    // 关卡首通直接奖励的球杆（不占用金币/星星购买）
    levelRewardCues: {
      l4: 'maple',
      l8: 'carbon',
      l12: 'gold'
    },
    // 金币经济：只用于游戏内购买球杆，不接任何支付/广告/红包。
    // 负数表示扣除；金币下限 minCoins，永不为负。
    economy: {
      matchWin:  { easy: 80,  normal: 140, hard: 240 }, // AI 对局胜利
      matchLoss: { easy: 30,  normal: 45,  hard: 70  }, // AI 对局失败（扣）
      pvpWin: 60,                                       // 本地双人：胜者 +，败者不扣
      levelWinRepeatRate: 0.30,                          // 关卡重复通关 = rewardCoins × 0.30
      levelLoss: 40,                                     // 关卡失败（扣）
      minCoins: 0
    },
    settings: {
      chargeTime: 1.15,
      minPower: 0.06,
      maxChargePower: 1,
      aimSensitivity: 1,
      keyboardAngleStep: 0.00035,      // 0.0201°
      keyboardAngleStepFine: 0.000077, // 0.0044° = 0.00035 × 0.22
      cueLength: 1.45,
      cueGap: 0.035,
      cameraShake: true
    }
  };

  Pool.BALL_COLORS = BALL_COLORS;

  Pool.UTIL = {
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    easeOutCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    easeInOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    clamp01: function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; },
    angleDiff: function (a, b) {
      var d = (a - b) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      return d;
    },
    formatTime: function (s) {
      var m = Math.floor(s / 60); var ss = Math.floor(s % 60);
      return m + ':' + (ss < 10 ? '0' : '') + ss;
    }
  };
})();
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

/* ============================================================================
 * 即刻开球 / PRO POOL — Canvas 渲染器
 * 文件：js/renderer.js   负责人：visuals-dev
 *
 * 经典 script（非 ES module），挂载 window.Pool.Renderer。
 * 所有台呢 / 木纹 / 球 / 球杆 / 特效均为程序化 Canvas 绘制，无外部资源。
 *
 * 对外 API（严格遵循 docs/CONTRACT.md）：
 *   var renderer = new Pool.Renderer(canvas)
 *   renderer.resize()
 *   renderer.render(state, dtSeconds)
 *   renderer.worldToScreen(x, y) -> {x, y}       // CSS 像素
 *   renderer.screenToWorld(px, py) -> {x, y}
 *   renderer.handleEvent(evt)                    // 物理事件 -> 粒子/震屏/闪光
 *   renderer.celebrate(kind)                     // 'win' | 'lose' | 'level'
 *
 * 附加便利 API（可选，不改变契约）：
 *   renderer.setCue(cueId)                       // 切换球杆外观
 *   renderer.destroy()                           // 释放 ResizeObserver
 * ==========================================================================*/
(function () {
  'use strict';

  var Pool = (window.Pool = window.Pool || {});

  var TAU = Math.PI * 2;

  /* --------------------------------------------------------------------------
   * 兜底配置：正常情况下 config.js 会先加载；这里只保证渲染器永不崩溃。
   * ------------------------------------------------------------------------*/
  var FW = 2.54, FH = 1.27, FR = 0.028575, FP = 0.052;
  var FALLBACK_CONFIG = {
    table: { width: FW, height: FH, ballRadius: FR, pocketRadius: FP, railWidth: 0.095 },
    pockets: [
      { x: 0, y: 0, radius: FP, corner: true, index: 0 },
      { x: FW * 0.5, y: 0, radius: FP, corner: false, index: 1 },
      { x: FW, y: 0, radius: FP, corner: true, index: 2 },
      { x: 0, y: FH, radius: FP, corner: true, index: 3 },
      { x: FW * 0.5, y: FH, radius: FP, corner: false, index: 4 },
      { x: FW, y: FH, radius: FP, corner: true, index: 5 }
    ],
    cues: [{
      id: 'oak', name: '经典橡木', en: 'CLASSIC OAK',
      colors: { butt: '#6b3a22', wrap: '#24150f', shaft: '#d8b98e', accent: '#c9a24a', tip: '#4a78a6' },
      pattern: 'oak'
    }],
    settings: { cueLength: 1.45, cueGap: 0.035, cameraShake: true }
  };

  var FALLBACK_BALL_COLORS = {
    1: '#f2c230', 2: '#1f5bb5', 3: '#cf3a2b', 4: '#6b3f9e',
    5: '#e5852b', 6: '#2b8a57', 7: '#8a2f3d', 8: '#191919',
    9: '#f2c230', 10: '#1f5bb5', 11: '#cf3a2b', 12: '#6b3f9e',
    13: '#e5852b', 14: '#2b8a57', 15: '#8a2f3d'
  };

  /* --------------------------------------------------------------------------
   * 基础工具
   * ------------------------------------------------------------------------*/
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  // 确定性伪随机，保证每次 resize 的木纹一致
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashStr(str) {
    var h = 2166136261;
    str = String(str);
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    }
    return (h >>> 0) / 4294967296;
  }

  /* --------------------------------------------------------------------------
   * 颜色工具（带缓存，避免渲染循环里反复解析与拼接字符串）
   * ------------------------------------------------------------------------*/
  var _hexCache = {};
  function parseHex(hex) {
    if (_hexCache[hex]) return _hexCache[hex];
    var h = hex.charCodeAt(0) === 35 ? hex.slice(1) : hex;
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var v = parseInt(h, 16);
    var out = { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
    _hexCache[hex] = out;
    return out;
  }
  function rgbStr(r, g, b) {
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  var _shadeCache = {};
  function shade(hex, amt) {
    var key = hex + '|' + amt;
    if (_shadeCache[key]) return _shadeCache[key];
    var c = parseHex(hex);
    var out;
    if (amt >= 0) {
      out = rgbStr(c.r + (255 - c.r) * amt, c.g + (255 - c.g) * amt, c.b + (255 - c.b) * amt);
    } else {
      out = rgbStr(c.r * (1 + amt), c.g * (1 + amt), c.b * (1 + amt));
    }
    _shadeCache[key] = out;
    return out;
  }
  function rgba(hex, a) {
    var c = parseHex(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  /* --------------------------------------------------------------------------
   * 路径 / 虚线工具
   * ------------------------------------------------------------------------*/
  function roundRectPath(ctx, x, y, w, h, r) {
    var rr = Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.lineTo(x, y + rr);
    ctx.arcTo(x, y, x + rr, y, rr);
    ctx.closePath();
  }

  // 渐变宽带：给定两点与近/远半宽，生成可填充的梯形路径
  function taperBandPath(ctx, x1, y1, x2, y2, w1, w2) {
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len;
    ctx.beginPath();
    ctx.moveTo(x1 + nx * w1, y1 + ny * w1);
    ctx.lineTo(x2 + nx * w2, y2 + ny * w2);
    ctx.lineTo(x2 - nx * w2, y2 - ny * w2);
    ctx.lineTo(x1 - nx * w1, y1 - ny * w1);
    ctx.closePath();
  }

  // stops: [[offset, cssColor], ...]
  function paintTaperedBand(ctx, x1, y1, x2, y2, w1, w2, stops, comp) {
    var grad = ctx.createLinearGradient(x1, y1, x2, y2);
    for (var i = 0; i < stops.length; i++) grad.addColorStop(stops[i][0], stops[i][1]);
    taperBandPath(ctx, x1, y1, x2, y2, w1, w2);
    var prev = ctx.globalCompositeOperation;
    if (comp) ctx.globalCompositeOperation = comp;
    ctx.fillStyle = grad;
    ctx.fill();
    if (comp) ctx.globalCompositeOperation = prev;
  }

  // 不依赖 ctx.setLineDash 的手动虚线，便于控制端点与平滑动画
  function dashedLine(ctx, x1, y1, x2, y2, dash, gap) {
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return;
    var ux = dx / len, uy = dy / len;
    var pos = 0;
    var step = dash + gap;
    ctx.beginPath();
    while (pos < len) {
      var a = pos;
      var b = Math.min(pos + dash, len);
      ctx.moveTo(x1 + ux * a, y1 + uy * a);
      ctx.lineTo(x1 + ux * b, y1 + uy * b);
      pos += step;
    }
    ctx.stroke();
  }

  function makePattern(g, canvas, scale) {
    var p = null;
    try { p = g.createPattern(canvas, 'repeat'); } catch (e) { p = null; }
    if (!p) return null;
    if (scale && scale !== 1 && p.setTransform && window.DOMMatrix) {
      try { p.setTransform(new window.DOMMatrix().scale(scale, scale)); } catch (e2) { /* 忽略 */ }
    }
    return p;
  }

  /* --------------------------------------------------------------------------
   * 程序化纹理：台呢（离屏 canvas 生成一次）
   *   - 交织纤维 + 高频噪点 + 低频色斑（低频用周期函数保证无缝平铺）
   * ------------------------------------------------------------------------*/
  // 台呢纹理的纯绘制降级实现：不使用 ImageData，适用于不支持像素级 API 的宿主
  function makeClothTextureByDrawing(S, cv, g) {
    var base = g.createLinearGradient(0, 0, S, S);
    base.addColorStop(0, '#2c7a45');
    base.addColorStop(0.5, '#357f4b');
    base.addColorStop(1, '#2a7342');
    g.fillStyle = base;
    g.fillRect(0, 0, S, S);
    // 低频色斑
    var rng = makeRng(20261107);
    g.globalAlpha = 0.05;
    for (var k = 0; k < 26; k++) {
      var bx = rng() * S, by = rng() * S, br = 40 + rng() * 110;
      var rg = g.createRadialGradient(bx, by, 0, bx, by, br);
      rg.addColorStop(0, rng() > 0.5 ? '#6fb56f' : '#1f5c36');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.beginPath();
      g.arc(bx, by, br, 0, TAU);
      g.fill();
    }
    // 经纬交织网格
    g.globalAlpha = 0.10;
    g.strokeStyle = '#8ec98a';
    g.lineWidth = 1;
    for (var x2 = 0; x2 < S; x2 += 4) {
      g.beginPath(); g.moveTo(x2 + 0.5, 0); g.lineTo(x2 + 0.5, S); g.stroke();
    }
    g.globalAlpha = 0.07;
    g.strokeStyle = '#143c25';
    for (var y2 = 0; y2 < S; y2 += 4) {
      g.beginPath(); g.moveTo(0, y2 + 0.5); g.lineTo(S, y2 + 0.5); g.stroke();
    }
    // 高频噪点
    g.globalAlpha = 0.055;
    g.fillStyle = '#cfeacb';
    for (var n = 0; n < 2600; n++) {
      var nx = rng() * S, ny = rng() * S;
      g.fillRect(nx, ny, 1, 1);
    }
    g.globalAlpha = 1;
    return cv;
  }

  function makeClothTexture() {
    var S = 512;
    var cv = makeCanvas(S, S);
    var g = cv.getContext('2d');
    // ImageData 逐像素路径在部分宿主（如微信小游戏主线程 2D Canvas）不可用，
    // 此时退化为纯绘制路径：底色 + 经纬交织网格 + 低频色斑 + 噪点，
    // 视觉接近且不依赖像素级 API。
    var img = null, data = null;
    try {
      if (typeof g.createImageData === 'function') {
        img = g.createImageData(S, S);
        data = img && img.data;
      }
    } catch (e) { img = null; data = null; }
    if (!data) return makeClothTextureByDrawing(S, cv, g);
    var i, x, y, px, py;
    for (y = 0; y < S; y++) {
      py = y / S;
      for (x = 0; x < S; x++) {
        i = (y * S + x) * 4;
        px = x / S;
        var weave = ((x & 1) ? 1 : -1) * ((y & 1) ? 1 : -1);
        var f1 = Math.sin(TAU * 4 * px + 1.1) * Math.sin(TAU * 3 * py + 0.4);
        var f2 = Math.sin(TAU * 13 * px + 2.2) * Math.sin(TAU * 11 * py + 1.7);
        var nap = Math.sin(TAU * (4 * px + 3 * py) + 0.6);
        var blot = Math.sin(TAU * 2 * px + 2.0) * Math.cos(TAU * 2 * py + 0.7);
        var n = Math.random() - 0.5;
        var v = 0.5 + weave * 0.13 + f1 * 0.06 + f2 * 0.045 + nap * 0.03 + blot * 0.075 + n * 0.13;
        var r = 28 + v * 30;
        var gg = 116 + v * 58;
        var b = 52 + v * 36;
        data[i] = clamp(r, 0, 255);
        data[i + 1] = clamp(gg, 0, 255);
        data[i + 2] = clamp(b, 0, 255);
        data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return cv;
  }

  // 柔边圆形贴图，用于尘土 / 火花 / 光晕
  function makeSoftSprite(size, stops) {
    var cv = makeCanvas(size, size);
    var g = cv.getContext('2d');
    var c = size / 2;
    var grd = g.createRadialGradient(c, c, 0, c, c, c);
    for (var i = 0; i < stops.length; i++) grd.addColorStop(stops[i][0], stops[i][1]);
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return cv;
  }

  /* --------------------------------------------------------------------------
   * Renderer
   * ------------------------------------------------------------------------*/
  function Renderer(canvas) {
    if (!canvas) throw new Error('Pool.Renderer: 需要 canvas 元素');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) throw new Error('Pool.Renderer: 无法获取 2d context');
    // 腾讯/QQ 浏览器的 X5 内核在混合模式/滤镜合成上容易黑屏，
    // 使用一套不依赖纹理、滤镜和 blend-mode 的兼容绘制。
    this.compat = /MQQBrowser|TBS|QQBrowser|MicroMessenger/i.test(navigator.userAgent || '');
    if (this.compat) document.body.classList.add('browser-compat');

    this._touch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
    // 触摸端（手机/平板）使用更小的画布像素预算与特效池；桌面保持原预算/画质。
    // 判定与 main.js 的 touch-device 一致：粗指针 / body.touch-device / 窄屏触摸。
    var touchUi = false;
    try { touchUi = !!(document.body && document.body.classList.contains('touch-device')); } catch (e) {}
    try { if (!touchUi) touchUi = window.matchMedia('(pointer: coarse)').matches; } catch (e) {}
    if (!touchUi && this._touch && (window.innerWidth || 0) < 1200) touchUi = true;
    this._touchUi = touchUi;
    this.config = Pool.CONFIG || FALLBACK_CONFIG;
    this.table = this.config.table || FALLBACK_CONFIG.table;
    this.pockets = this.config.pockets || FALLBACK_CONFIG.pockets;
    this.ballColors = Pool.BALL_COLORS || FALLBACK_BALL_COLORS;
    this.ballRadius = this.table.ballRadius || FR;
    // 袋口半径：_buildStatic / _drawTableFx 都依赖它换算屏幕尺寸。
    // 缺失会让 LEN() 得到 NaN，createRadialGradient 直接抛错、整页启动失败。
    this.pocketRadius = this.table.pocketRadius || FP;

    // 视觉外框（比 CONFIG.railWidth 略宽，纯视觉，不参与物理）
    this.FRAME = 0.145;
    this.CUSHION = 0.05;

    this.cueId = 'oak';

    // 可选安全区（CSS 像素）：用于避开顶部/底部 HUD。默认 0，不影响契约行为。
    var cfgInsets = (this.config.settings && this.config.settings.renderInsets) || null;
    this.insets = { top: 0, right: 0, bottom: 0, left: 0 };
    if (cfgInsets) {
      this.insets.top = cfgInsets.top || 0;
      this.insets.right = cfgInsets.right || 0;
      this.insets.bottom = cfgInsets.bottom || 0;
      this.insets.left = cfgInsets.left || 0;
    }

    this.dpr = 1;
    this.cssW = 0;
    this.cssH = 0;
    this.scale = 1;     // CSS px / m
    this.tx = 0;
    this.ty = 0;
    this._L = null;

    // 竖屏竖向球台：物理世界不变，仅渲染层整体旋转
    this.portraitRotate = 0;      // 0 或 -Math.PI/2
    this._portrait = false;
    this._viewTransform = null;   // { cx, cy, scale, rot, cos, sin }
    this._tableLayer = null;      // 竖屏静态层（未旋转的整张球桌）

    this.time = 0;
    this._tick = 0;
    this.shake = 0;
    this.flash = 0;
    this.dim = 0;
    this.celebrateT = 0;
    this.celebrateKind = null;
    this._resizePending = false;
    this._pixelChecked = false;

    // 一次性纹理
    var cloth = makeClothTexture();
    this.tex = { cloth: cloth };
    this._fx = {
      glowWarm: makeSoftSprite(96, [
        [0, 'rgba(255,226,172,0.95)'], [0.28, 'rgba(244,196,120,0.55)'],
        [0.62, 'rgba(190,140,70,0.16)'], [1, 'rgba(140,100,50,0)']
      ]),
      dustWarm: makeSoftSprite(64, [
        [0, 'rgba(232,220,196,0.85)'], [0.4, 'rgba(198,184,158,0.38)'],
        [1, 'rgba(180,168,146,0)']
      ]),
      dustGreen: makeSoftSprite(64, [
        [0, 'rgba(178,214,186,0.8)'], [0.4, 'rgba(128,176,146,0.32)'],
        [1, 'rgba(100,150,120,0)']
      ]),
      spark: makeSoftSprite(48, [
        [0, 'rgba(255,252,240,1)'], [0.22, 'rgba(255,230,160,0.9)'],
        [0.55, 'rgba(240,190,90,0.28)'], [1, 'rgba(220,170,70,0)']
      ]),
      flash: makeSoftSprite(128, [
        [0, 'rgba(255,250,238,1)'], [0.35, 'rgba(255,236,196,0.6)'],
        [0.7, 'rgba(230,200,140,0.18)'], [1, 'rgba(200,170,110,0)']
      ])
    };

    // 球体缓存
    this._spr = null;
    this._ballSS = 2;             // 球体 sprite 超采样倍数（内部像素 = dpr * SS）
    this._ballSpin = {};          // 渲染层滚动角状态，按球 id 存，不写 physics 球对象
    this._lastShots = 0;
    this._lastPhase = 'menu';
    this._frameDt = 1 / 60;       // 当前帧 dt，供滚动角累积/回正
    this._stripeGrads = {};
    this._gradCache = {};
    this._gradCacheCount = 0;
    this._rot = {};
    this._seed = {};
    this._v1 = { x: 0, y: 0, z: 0 };
    this._v2 = { x: 0, y: 0, z: 0 };
    this._aimData = {
      valid: false, dirX: 1, dirY: 0,
      hitType: 'none', hitDist: 0, hitX: 0, hitY: 0,
      ghostX: 0, ghostY: 0, target: null,
      targetDirX: 0, targetDirY: 0, normalX: 0, normalY: 0,
      tangentX: 0, tangentY: 0
    };
    this._cueGeom = { valid: false };

    // 粒子池（数组对象复用，渲染循环内不新建粒子对象）
    // 硬上限：触摸端取更小容量，桌面维持原容量；永不 push 超出这些值。
    var particleCap = this._touchUi ? 180 : 300;
    var ringCap = this._touchUi ? 20 : 28;
    var pocketFxCap = this._touchUi ? 10 : 12;
    var railFxCap = this._touchUi ? 10 : 18;
    var confettiCap = this._touchUi ? 100 : 160;
    var moteCap = this._touchUi ? 28 : 44;
    this._fxCaps = { particles: particleCap, rings: ringCap, pocketFx: pocketFxCap, railFx: railFxCap, confetti: confettiCap, motes: moteCap };
    this._particles = [];
    for (var i = 0; i < particleCap; i++) {
      this._particles.push({
        alive: false, x: 0, y: 0, vx: 0, vy: 0,
        life: 0, max: 1, size: 0, grow: 0, alpha: 1,
        drag: 2, grav: 0, spr: 0, kind: 0
      });
    }
    this._pCursor = 0;

    this._rings = [];
    for (var r1 = 0; r1 < ringCap; r1++) {
      this._rings.push({ alive: false, x: 0, y: 0, r0: 0, r1: 0, life: 0, max: 0.5, w: 1, color: '255,255,255' });
    }
    this._ringCursor = 0;

    this._pocketFx = [];
    for (var r2 = 0; r2 < pocketFxCap; r2++) {
      this._pocketFx.push({ alive: false, x: 0, y: 0, life: 0, max: 0.5, size: 0.1 });
    }
    this._pocketCursor = 0;

    this._railFx = [];
    for (var r3 = 0; r3 < railFxCap; r3++) {
      this._railFx.push({ alive: false, x: 0, y: 0, life: 0, max: 0.4, size: 0.1 });
    }
    this._railCursor = 0;

    this._confetti = [];
    for (var c1 = 0; c1 < confettiCap; c1++) {
      this._confetti.push({
        alive: false, x: 0, y: 0, vx: 0, vy: 0,
        rot: 0, vr: 0, w: 4, h: 7, life: 0, max: 3,
        color: '#e8c66a', sway: 0, swaySpeed: 1
      });
    }
    this._confettiCursor = 0;

    // menu 背景的尘埃
    this._motes = [];
    var mrng = makeRng(0x51ed270b);
    for (var m = 0; m < moteCap; m++) {
      this._motes.push({
        x: mrng(), y: mrng(), r: 0.5 + mrng() * 1.2,
        sp: 0.008 + mrng() * 0.02, ph: mrng() * TAU, amp: 0.005 + mrng() * 0.02
      });
    }

    // 自适应尺寸
    var self = this;
    this._onWinResize = function () { self._queueResize(); };
    window.addEventListener('resize', this._onWinResize);

    this._ro = null;
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(function () { self._queueResize(); });
      try { this._ro.observe(this.canvas); } catch (e) { /* 忽略 */ }
    }

    this.resize();
  }

  Renderer.prototype._queueResize = function () {
    var self = this;
    if (this._resizePending) return;
    this._resizePending = true;
    window.setTimeout(function () {
      self._resizePending = false;
      self.resize();
    }, 60);
  };

  Renderer.prototype.destroy = function () {
    if (this._ro) { try { this._ro.disconnect(); } catch (e) {} this._ro = null; }
    if (this._onWinResize) window.removeEventListener('resize', this._onWinResize);
  };

  Renderer.prototype.setCue = function (id) {
    this.cueId = id || 'oak';
    return this;
  };

  // 可选：为 HUD 预留安全区（CSS 像素）。不调用则维持“台面最大化居中”。
  Renderer.prototype.setInsets = function (insets) {
    var src = insets || {};
    var changed = (this.insets.top !== (src.top || 0)) ||
      (this.insets.right !== (src.right || 0)) ||
      (this.insets.bottom !== (src.bottom || 0)) ||
      (this.insets.left !== (src.left || 0));
    this.insets.top = src.top || 0;
    this.insets.right = src.right || 0;
    this.insets.bottom = src.bottom || 0;
    this.insets.left = src.left || 0;
    if (changed) this.resize(true);
    return this;
  };

  Renderer.prototype._getCueDef = function (state) {
    var cues = this.config.cues || FALLBACK_CONFIG.cues;
    var wanted = (state && (state.cueId || (state.cue && state.cue.id))) || this.cueId;
    for (var i = 0; i < cues.length; i++) if (cues[i].id === wanted) return cues[i];
    for (var j = 0; j < cues.length; j++) if (cues[j].id === 'oak') return cues[j];
    return cues[0] || FALLBACK_CONFIG.cues[0];
  };

  // 读取 Lead 在 config.js 定义的 cues[].visual；缺省时按旧字段安全回退
  Renderer.prototype._getCueVisual = function (def) {
    var v = (def && def.visual) || null;
    if (!v) {
      return {
        profile: (def && def.shape) || 'classic',
        joint: (def && def.shape) ? 'none' : 'single',
        wrapStyle: 'linen',
        accentShape: 'dot',
        tipRing: true
      };
    }
    return {
      profile: v.profile || (def && def.shape) || 'classic',
      joint: v.joint || 'single',
      wrapStyle: v.wrapStyle || 'linen',
      accentShape: v.accentShape || 'none',
      tipRing: !!v.tipRing
    };
  };

  // 是否应进入竖屏竖向球台（供 render 在 body class 晚到 / 旋转后兜底）
  Renderer.prototype._shouldPortrait = function () {
    if (!(this.cssH > this.cssW)) return false;
    var coarse = false;
    try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) { coarse = false; }
    var bodyEl = document.body;
    return !!coarse || !!(bodyEl && (bodyEl.classList.contains('touch-device') || bodyEl.classList.contains('portrait-play')));
  };

  Renderer.prototype._sizeSame = function (w, h, dpr) {
    return this.cssW === w && this.cssH === h && this.dpr === dpr &&
      this.canvas.width === Math.round(w * dpr) && this.canvas.height === Math.round(h * dpr);
  };

  Renderer.prototype.resize = function (force) {
    var cw = this.canvas.clientWidth;
    var ch = this.canvas.clientHeight;
    if (!cw || !ch) {
      var rect = this.canvas.getBoundingClientRect();
      cw = Math.round(rect.width);
      ch = Math.round(rect.height);
    }
    if (!cw || !ch) {
      // 隐藏或尚未布局：退化为窗口尺寸，避免空白
      cw = Math.max(1, window.innerWidth || 960);
      ch = Math.max(1, window.innerHeight || 540);
    }
    cw = Math.max(1, Math.round(cw));
    ch = Math.max(1, Math.round(ch));

    // 手机竖屏：竖向球台（长边沿屏幕竖直）。桌面 / 横屏严格保持 rot = 0。
    var coarse = false;
    try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) { coarse = false; }
    var bodyEl = document.body;
    // 画布像素预算：触摸端 DPR 上限 2（与桌面一致）。
    // 之前压到 1.25 是为了规避每 90 帧一次 getImageData 造成的 GPU 同步停顿；
    // 那个停顿已彻底移除，球体/高光也改成离屏缓存 + 2 倍超采样，
    // 现在把 DPR 恢复到 2 才能在手机上得到「高保真、号码清楚」的画面。
    // CSS 坐标与命中完全不受影响。
    var touchCap = !!(this._touchUi || coarse ||
      (bodyEl && bodyEl.classList.contains('touch-device')) ||
      (this._touch && (window.innerWidth || 0) < 1200));
    this._touchUi = touchCap;
    var maxDpr = 2;
    var dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    var touchUi = coarse ||
      !!(bodyEl && bodyEl.classList.contains('touch-device')) ||
      !!(bodyEl && bodyEl.classList.contains('portrait-play'));
    var portrait = touchUi && ch > cw;
    var rot = portrait ? -Math.PI * 0.5 : 0;
    var rotChanged = rot !== this.portraitRotate;

    if (!force && !rotChanged && this._sizeSame(cw, ch, dpr) && this._static) return;

    this.portraitRotate = rot;
    this._portrait = portrait;
    this._ballSpin = {};
    this._lastShots = 0;
    // 竖屏木框压到 0.025m：木框越薄，同样屏宽下台呢越大，球也随之变大。
    this.FRAME = portrait ? 0.025 : 0.145;
    // 物理球严格按 2R 摆；视觉直径保持不超过物理间距，确保球之间零遮挡。
    this.ballVisualScale = 1;
    this.cssW = cw;
    this.cssH = ch;
    this.dpr = dpr;
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);

    var wDev = this.canvas.width, hDev = this.canvas.height;
    if (!this._static || this._static.width !== wDev || this._static.height !== hDev) {
      this._static = makeCanvas(wDev, hDev);
      this._menu = makeCanvas(wDev, hDev);
    }

    this._fit();
    this._invalidateCaches();
    this._buildStatic();
    this._buildMenuBg();
    this._prewarmBallSprites();
  };

  Renderer.prototype._fit = function () {
    var cfg = this.table;
    var w = this.cssW, h = this.cssH;
    var outerW = cfg.width + this.FRAME * 2;
    var outerH = cfg.height + this.FRAME * 2;
    var padX = Math.max(rot ? 1 : 8, w * (rot ? 0.002 : 0.018));
    var padY = Math.max(rot ? 2 : 4, h * 0.016);
    var ins = this.insets || { top: 0, right: 0, bottom: 0, left: 0 };
    var availW = Math.max(40, w - ins.left - ins.right);
    var availH = Math.max(40, h - ins.top - ins.bottom);
    var rot = this.portraitRotate || 0;

    if (rot) {
      // 竖屏：外框 2.83×1.56 交换为 1.56×2.83，再以屏幕可用区中心旋转绘制
      var viewOuterW = outerH;
      var viewOuterH = outerW;
      var scale = Math.min((availW - padX * 2) / viewOuterW, (availH - padY * 2) / viewOuterH);
      if (!isFinite(scale) || scale <= 0) scale = 1;
      this.scale = scale;
      var cx = ins.left + availW * 0.5;
      var cy = ins.top + availH * 0.5;
      var cos = Math.cos(rot), sin = Math.sin(rot);
      var lx = -cfg.width * scale * 0.5;
      var ly = -cfg.height * scale * 0.5;
      this.tx = cx + cos * lx - sin * ly;
      this.ty = cy + sin * lx + cos * ly;
      this._viewTransform = { cx: cx, cy: cy, scale: scale, rot: rot, cos: cos, sin: sin };
      this._L = {
        d: this.dpr,
        S: scale * this.dpr,
        OX: 0,
        OY: 0,
        w: Math.round(w * this.dpr),
        h: Math.round(h * this.dpr),
        portrait: true
      };
      return;
    }

    // 横屏 / 桌面：保持原有实现与原点语义（回归安全底线）
    var scale0 = Math.min((availW - padX * 2) / outerW, (availH - padY * 2) / outerH);
    if (!isFinite(scale0) || scale0 <= 0) scale0 = 1;
    this.scale = scale0;
    this.tx = ins.left + (availW - cfg.width * scale0) * 0.5;
    this.ty = ins.top + (availH - cfg.height * scale0) * 0.5;
    this._viewTransform = {
      cx: this.tx + cfg.width * scale0 * 0.5,
      cy: this.ty + cfg.height * scale0 * 0.5,
      scale: scale0, rot: 0, cos: 1, sin: 0
    };
    this._L = {
      d: this.dpr,
      S: scale0 * this.dpr,
      OX: this.tx * this.dpr,
      OY: this.ty * this.dpr,
      w: Math.round(w * this.dpr),
      h: Math.round(h * this.dpr)
    };
  };

  Renderer.prototype._invalidateCaches = function () {
    this._spr = null;
    this._stripeGrads = {};
    this._gradCache = {};
    this._gradCacheCount = 0;
  };

  Renderer.prototype.worldToScreen = function (x, y) {
    var vt = this._viewTransform;
    if (!vt || !this.portraitRotate) {
      // 与旧版完全一致的横屏映射（不引入额外浮点运算）
      return { x: this.tx + x * this.scale, y: this.ty + y * this.scale };
    }
    var dx = x - this.table.width * 0.5;
    var dy = y - this.table.height * 0.5;
    var rx = vt.cos * dx - vt.sin * dy;
    var ry = vt.sin * dx + vt.cos * dy;
    return { x: vt.cx + rx * vt.scale, y: vt.cy + ry * vt.scale };
  };
  Renderer.prototype.screenToWorld = function (px, py) {
    var vt = this._viewTransform;
    if (!vt || !this.portraitRotate) {
      var s = this.scale || 1;
      return { x: (px - this.tx) / s, y: (py - this.ty) / s };
    }
    var sx = (px - vt.cx) / vt.scale;
    var sy = (py - vt.cy) / vt.scale;
    var dx = vt.cos * sx + vt.sin * sy;
    var dy = -vt.sin * sx + vt.cos * sy;
    return { x: this.table.width * 0.5 + dx, y: this.table.height * 0.5 + dy };
  };

  // 把世界方向向量旋转到屏幕方向（竖屏用；横屏原样返回）
  Renderer.prototype._screenDir = function (dx, dy) {
    var vt = this._viewTransform;
    if (!vt || !this.portraitRotate) return { x: dx, y: dy };
    return { x: vt.cos * dx - vt.sin * dy, y: vt.sin * dx + vt.cos * dy };
  };

  /* --------------------------------------------------------------------------
   * 静态层（木框 / 台呢 / 库边 / 袋口 / 瞄点）——仅在 resize 时重建
   * ------------------------------------------------------------------------*/
  Renderer.prototype._buildStatic = function () {
    var cv = this._static;
    if (!cv) return;
    var sg = cv.getContext('2d');
    var screenL = this._L;
    var g = sg;
    var L = screenL;
    var S = L.S, OX = L.OX, OY = L.OY;
    var W = this.table.width, H = this.table.height;
    var FRAME = this.FRAME;
    var self = this;

    function X(m) { return OX + m * S; }
    function Y(m) { return OY + m * S; }
    function LEN(m) { return m * S; }

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, L.w, L.h);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    /* ---------- 1. 俱乐部背景 ---------- */
    var bg = g.createLinearGradient(0, 0, 0, L.h);
    bg.addColorStop(0, '#181310');
    bg.addColorStop(0.42, '#0f0c09');
    bg.addColorStop(1, '#060505');
    g.fillStyle = bg;
    g.fillRect(0, 0, L.w, L.h);

    var warm = g.createRadialGradient(L.w * 0.5, L.h * 0.06, 0, L.w * 0.5, L.h * 0.06, L.w * 0.74);
    warm.addColorStop(0, 'rgba(130,88,46,0.22)');
    warm.addColorStop(0.45, 'rgba(92,60,30,0.09)');
    warm.addColorStop(1, 'rgba(40,24,12,0)');
    g.fillStyle = warm;
    g.fillRect(0, 0, L.w, L.h);

    var floorGlow = g.createRadialGradient(L.w * 0.5, L.h * 0.9, 0, L.w * 0.5, L.h * 0.9, L.w * 0.42);
    floorGlow.addColorStop(0, 'rgba(84,66,44,0.10)');
    floorGlow.addColorStop(1, 'rgba(20,16,10,0)');
    g.fillStyle = floorGlow;
    g.fillRect(0, 0, L.w, L.h);

    // 竖屏：先在独立离屏层绘制未旋转的完整球桌，再统一旋转合成。
    // 台呢 / 木纹 / 袋口 / 瞄点全部共用同一组 90° 变换。
    var portrait = !!this.portraitRotate;
    var layerW = 0, layerH = 0;
    if (portrait) {
      layerW = Math.ceil((W + FRAME * 2) * S);
      layerH = Math.ceil((H + FRAME * 2) * S);
      if (!this._tableLayer || this._tableLayer.width !== layerW || this._tableLayer.height !== layerH) {
        this._tableLayer = makeCanvas(layerW, layerH);
      }
      g = this._tableLayer.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, layerW, layerH);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      L = { d: this.dpr, S: S, OX: FRAME * S, OY: FRAME * S, w: layerW, h: layerH };
      OX = L.OX;
      OY = L.OY;
    }

    /* ---------- 2. 球桌投影 ---------- */
    if (!portrait) {
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.92)';
    g.shadowBlur = LEN(0.13);
    g.shadowOffsetY = LEN(0.04);
    g.fillStyle = '#000';
    roundRectPath(g, X(-FRAME), Y(-FRAME), LEN(W + FRAME * 2), LEN(H + FRAME * 2), LEN(0.05));
    g.fill();
    g.restore();
    }

    /* ---------- 3. 胡桃木外框 ---------- */
    var fx = X(-FRAME), fy = Y(-FRAME);
    var fw = LEN(W + FRAME * 2), fh = LEN(H + FRAME * 2);
    var fr = LEN(0.045);

    g.save();
    roundRectPath(g, fx, fy, fw, fh, fr);
    g.clip();

    var wood = g.createLinearGradient(fx, fy, fx + fw * 0.8, fy + fh);
    wood.addColorStop(0, '#a87a4e');
    wood.addColorStop(0.22, '#8d643e');
    wood.addColorStop(0.5, '#704b2e');
    wood.addColorStop(0.78, '#573920');
    wood.addColorStop(1, '#3c2715');
    g.fillStyle = wood;
    g.fillRect(0, 0, L.w, L.h);

    var rng = makeRng(0x9e3779b9);
    var i, bx, by, br, light, blob;
    // 树瘤状色斑
    for (i = 0; i < 150; i++) {
      bx = rng() * L.w;
      by = rng() * L.h;
      br = LEN(0.008 + rng() * 0.085);
      light = rng() < 0.42;
      blob = g.createRadialGradient(bx, by, 0, bx, by, br);
      blob.addColorStop(0, light ? 'rgba(232,196,146,0.16)' : 'rgba(30,16,6,0.22)');
      blob.addColorStop(0.65, light ? 'rgba(210,170,120,0.07)' : 'rgba(30,16,6,0.10)');
      blob.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = blob;
      g.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    // 木纹长丝
    for (i = 0; i < 250; i++) {
      var gy = rng() * L.h;
      var amp = LEN(0.0015 + rng() * 0.008);
      var phase = rng() * TAU;
      g.beginPath();
      g.moveTo(-20, gy);
      for (var lx = -20; lx <= L.w + 20; lx += 70) {
        g.lineTo(lx, gy + Math.sin(lx * 0.011 + phase) * amp + Math.sin(lx * 0.037 + phase * 1.7) * amp * 0.35);
      }
      g.strokeStyle = rng() < 0.52 ? 'rgba(8,4,1,0.32)' : 'rgba(182,132,82,0.14)';
      g.lineWidth = Math.max(0.5, LEN(0.0004) * (0.6 + rng() * 1.6));
      g.stroke();
    }
    // 细噪点
    var ds = Math.max(1, L.d * 0.7);
    for (i = 0; i < 2400; i++) {
      g.fillStyle = rng() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(182,132,82,0.07)';
      g.fillRect(rng() * L.w, rng() * L.h, ds, ds);
    }
    // 斜向油光
    var sheen = g.createLinearGradient(fx, fy, fx + fw, fy + fh * 0.55);
    sheen.addColorStop(0, 'rgba(255,214,160,0.10)');
    sheen.addColorStop(0.42, 'rgba(255,214,160,0.02)');
    sheen.addColorStop(1, 'rgba(0,0,0,0.14)');
    g.fillStyle = sheen;
    g.fillRect(0, 0, L.w, L.h);

    // 清漆油光
    var gloss = g.createRadialGradient(fx + fw * 0.24, fy + fh * 0.10, 0, fx + fw * 0.24, fy + fh * 0.10, fw * 0.55);
    gloss.addColorStop(0, 'rgba(255,228,184,0.11)');
    gloss.addColorStop(0.55, 'rgba(255,222,170,0.025)');
    gloss.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gloss;
    g.fillRect(0, 0, L.w, L.h);
    g.restore();

    // 外缘倒角
    var edge = g.createLinearGradient(fx, fy, fx + fw, fy + fh);
    edge.addColorStop(0, 'rgba(255,230,190,0.46)');
    edge.addColorStop(0.34, 'rgba(255,225,180,0.06)');
    edge.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.strokeStyle = edge;
    g.lineWidth = Math.max(1.4, LEN(0.0032));
    roundRectPath(g, fx, fy, fw, fh, fr);
    g.stroke();

    // 黄铜嵌线
    var inlay = g.createLinearGradient(fx, fy, fx + fw, fy + fh);
    inlay.addColorStop(0, 'rgba(232,200,140,0.30)');
    inlay.addColorStop(0.45, 'rgba(200,166,104,0.10)');
    inlay.addColorStop(1, 'rgba(120,96,54,0.16)');
    g.strokeStyle = inlay;
    g.lineWidth = Math.max(0.9, LEN(0.0016));
    roundRectPath(g, X(-0.062), Y(-0.062), LEN(W + 0.124), LEN(H + 0.124), LEN(0.016));
    g.stroke();

    // 木框内侧倒角高光
    g.strokeStyle = 'rgba(255,224,180,0.10)';
    g.lineWidth = Math.max(0.7, LEN(0.0014));
    roundRectPath(g, X(-FRAME + 0.010), Y(-FRAME + 0.010), LEN(W + FRAME * 2 - 0.020), LEN(H + FRAME * 2 - 0.020), fr * 0.88);
    g.stroke();

    /* ---------- 4. 台呢 ---------- */
    var clothX = X(0), clothY = Y(0), clothW = LEN(W), clothH = LEN(H);
    var pat = makePattern(g, this.tex.cloth, this.dpr * 0.85);

    g.save();
    g.beginPath();
    g.rect(clothX, clothY, clothW, clothH);
    g.clip();

    var base = g.createLinearGradient(clothX, clothY, clothX + clothW * 0.35, clothY + clothH);
    base.addColorStop(0, '#2f9e4f');
    base.addColorStop(0.5, '#268c46');
    base.addColorStop(1, '#1b7438');
    g.fillStyle = base;
    g.fillRect(clothX, clothY, clothW, clothH);

    if (pat) {
      g.globalAlpha = 0.84;
      g.fillStyle = pat;
      g.fillRect(clothX, clothY, clothW, clothH);
      g.globalAlpha = 1;
    }

    // 顶部主光
    var tl = g.createRadialGradient(X(W * 0.5), Y(-H * 0.30), 0, X(W * 0.5), Y(-H * 0.30), LEN(W * 0.74));
    tl.addColorStop(0, 'rgba(245,255,232,0.22)');
    tl.addColorStop(0.22, 'rgba(216,246,218,0.16)');
    tl.addColorStop(0.52, 'rgba(150,202,168,0.055)');
    tl.addColorStop(0.8, 'rgba(16,44,32,0.12)');
    tl.addColorStop(1, 'rgba(0,0,0,0.18)');
    g.fillStyle = tl;
    g.fillRect(clothX, clothY, clothW, clothH);

    // 斜向布料光泽
    var sheen2 = g.createLinearGradient(clothX, clothY + clothH, clothX + clothW, clothY);
    sheen2.addColorStop(0, 'rgba(255,255,255,0)');
    sheen2.addColorStop(0.44, 'rgba(255,255,255,0.040)');
    sheen2.addColorStop(0.56, 'rgba(255,255,255,0.062)');
    sheen2.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sheen2;
    g.fillRect(clothX, clothY, clothW, clothH);

    // 台呢边缘暗角
    var clothEdge = g.createRadialGradient(X(W * 0.5), Y(H * 0.5), LEN(Math.min(W, H) * 0.3), X(W * 0.5), Y(H * 0.5), LEN(W * 0.56));
    clothEdge.addColorStop(0, 'rgba(0,0,0,0)');
    clothEdge.addColorStop(0.66, 'rgba(0,0,0,0.07)');
    clothEdge.addColorStop(1, 'rgba(0,0,0,0.28)');
    g.fillStyle = clothEdge;
    g.fillRect(clothX, clothY, clothW, clothH);
    g.restore();

    /* ---------- 5. 库边 ---------- */
    var CD = this.CUSHION;
    var cushL = X(-0.035), cushT = Y(-0.035);
    var cushW = LEN(W + 0.07), cushH = LEN(H + 0.07);

    // 上库
    var tg = g.createLinearGradient(0, Y(-CD), 0, Y(0.005));
    tg.addColorStop(0, '#42b46c');
    tg.addColorStop(0.5, '#319d5c');
    tg.addColorStop(0.88, '#258049');
    tg.addColorStop(1, '#1a663a');
    g.fillStyle = tg;
    g.fillRect(cushL, Y(-CD), cushW, LEN(CD + 0.005));
    if (pat) {
      g.save(); g.globalAlpha = 0.34; g.fillStyle = pat;
      g.fillRect(cushL, Y(-CD), cushW, LEN(CD + 0.005)); g.restore();
    }

    // 下库
    var bg2 = g.createLinearGradient(0, Y(H + CD), 0, Y(H - 0.005));
    bg2.addColorStop(0, '#36a866');
    bg2.addColorStop(0.45, '#319d5e');
    bg2.addColorStop(0.86, '#3aa96a');
    bg2.addColorStop(1, '#217a44');
    g.fillStyle = bg2;
    g.fillRect(cushL, Y(H - 0.005), cushW, LEN(CD + 0.005));
    if (pat) {
      g.save(); g.globalAlpha = 0.30; g.fillStyle = pat;
      g.fillRect(cushL, Y(H - 0.005), cushW, LEN(CD + 0.005)); g.restore();
    }

    // 左库
    var lg2 = g.createLinearGradient(X(-CD), 0, X(0.005), 0);
    lg2.addColorStop(0, '#3bab6b');
    lg2.addColorStop(0.55, '#2c9157');
    lg2.addColorStop(1, '#1d7443');
    g.fillStyle = lg2;
    g.fillRect(X(-CD), cushT, LEN(CD + 0.005), cushH);
    if (pat) {
      g.save(); g.globalAlpha = 0.32; g.fillStyle = pat;
      g.fillRect(X(-CD), cushT, LEN(CD + 0.005), cushH); g.restore();
    }

    // 右库
    var rg2 = g.createLinearGradient(X(W + CD), 0, X(W - 0.005), 0);
    rg2.addColorStop(0, '#37a668');
    rg2.addColorStop(0.5, '#2a8e56');
    rg2.addColorStop(0.9, '#2a7452');
    rg2.addColorStop(1, '#1a6f40');
    g.fillStyle = rg2;
    g.fillRect(X(W - 0.005), cushT, LEN(CD + 0.005), cushH);
    if (pat) {
      g.save(); g.globalAlpha = 0.30; g.fillStyle = pat;
      g.fillRect(X(W - 0.005), cushT, LEN(CD + 0.005), cushH); g.restore();
    }

    // 库边鼻端高光
    g.strokeStyle = 'rgba(224,244,224,0.13)';
    g.lineWidth = Math.max(0.8, LEN(0.0012));
    g.beginPath();
    g.moveTo(X(-0.035), Y(0.004)); g.lineTo(X(W + 0.035), Y(0.004));
    g.moveTo(X(-0.035), Y(H - 0.004)); g.lineTo(X(W + 0.035), Y(H - 0.004));
    g.moveTo(X(0.004), Y(-0.035)); g.lineTo(X(0.004), Y(H + 0.035));
    g.moveTo(X(W - 0.004), Y(-0.035)); g.lineTo(X(W - 0.004), Y(H + 0.035));
    g.stroke();

    // 库边与木框之间的凹槽
    g.strokeStyle = 'rgba(0,0,0,0.52)';
    g.lineWidth = Math.max(1, LEN(0.0032));
    roundRectPath(g, X(-CD - 0.002), Y(-CD - 0.002), LEN(W + 2 * CD + 0.004), LEN(H + 2 * CD + 0.004), LEN(0.022));
    g.stroke();
    g.strokeStyle = 'rgba(255,224,180,0.09)';
    g.lineWidth = Math.max(0.6, LEN(0.0012));
    roundRectPath(g, X(-CD - 0.006), Y(-CD - 0.006), LEN(W + 2 * CD + 0.012), LEN(H + 2 * CD + 0.012), LEN(0.024));
    g.stroke();

    // 库边投向台呢的阴影
    g.save();
    g.beginPath();
    g.rect(clothX, clothY, clothW, clothH);
    g.clip();
    var sw = LEN(0.058);
    var st = g.createLinearGradient(0, Y(0), 0, Y(0.058));
    st.addColorStop(0, 'rgba(0,0,0,0.40)');
    st.addColorStop(0.4, 'rgba(0,0,0,0.14)');
    st.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = st; g.fillRect(clothX, clothY, clothW, sw);

    var sb = g.createLinearGradient(0, Y(H), 0, Y(H - 0.058));
    sb.addColorStop(0, 'rgba(0,0,0,0.34)');
    sb.addColorStop(0.4, 'rgba(0,0,0,0.11)');
    sb.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sb; g.fillRect(clothX, clothY + clothH - sw, clothW, sw);

    var sl = g.createLinearGradient(X(0), 0, X(0.058), 0);
    sl.addColorStop(0, 'rgba(0,0,0,0.34)');
    sl.addColorStop(0.4, 'rgba(0,0,0,0.11)');
    sl.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sl; g.fillRect(clothX, clothY, sw, clothH);

    var sr = g.createLinearGradient(X(W), 0, X(W - 0.058), 0);
    sr.addColorStop(0, 'rgba(0,0,0,0.30)');
    sr.addColorStop(0.4, 'rgba(0,0,0,0.10)');
    sr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sr; g.fillRect(clothX + clothW - sw, clothY, sw, clothH);
    g.restore();

    /* ---------- 6. 六个真实袋口 ---------- */
    var pockets = this.pockets;
    for (var pi = 0; pi < pockets.length; pi++) {
      var pk = pockets[pi];
      var pcx, pcy, pang, prx, pry;
      if (pk.corner) {
        var inX = pk.x < 1e-6 ? 1 : -1;
        var inY = pk.y < 1e-6 ? 1 : -1;
        pang = Math.atan2(inY, inX);
        // 角袋：接近正圆，避免旧版横向拉长后“袋口变形”的观感
        prx = LEN(this.pocketRadius);
        pry = LEN(this.pocketRadius);
        pcx = X(pk.x);
        pcy = Y(pk.y);
      } else {
        pang = 0;
        prx = LEN(this.pocketRadius);
        pry = LEN(this.pocketRadius);
        pcx = X(pk.x);
        pcy = Y(pk.y);
      }

      g.save();
      g.translate(pcx, pcy);
      g.rotate(pang);

      // 袋口周围台呢的切割阴影
      var cut = g.createRadialGradient(0, 0, Math.min(prx, pry) * 0.72, 0, 0, Math.max(prx, pry) * 1.30);
      cut.addColorStop(0, 'rgba(0,0,0,0.34)');
      cut.addColorStop(0.66, 'rgba(0,0,0,0.16)');
      cut.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = cut;
      g.beginPath(); g.ellipse(0, 0, prx * 1.30, pry * 1.30, 0, 0, TAU); g.fill();

      // 袋口暗部
      var hole = g.createRadialGradient(0, 0, 0, 0, 0, Math.max(prx, pry));
      hole.addColorStop(0, 'rgba(1,2,2,1)');
      hole.addColorStop(0.5, 'rgba(3,5,4,0.99)');
      hole.addColorStop(0.82, 'rgba(3,5,4,0.88)');
      hole.addColorStop(1, 'rgba(2,4,3,0)');
      g.fillStyle = hole;
      g.beginPath(); g.ellipse(0, 0, prx, pry, 0, 0, TAU); g.fill();

      // 深喉
      g.beginPath();
      g.ellipse(0, LEN(0.003), prx * 0.80, pry * 0.78, 0, 0, TAU);
      g.fillStyle = 'rgba(0,0,0,0.94)';
      g.fill();

      // 袋网暗示
      g.save();
      g.beginPath(); g.ellipse(0, 0, prx * 0.88, pry * 0.88, 0, 0, TAU); g.clip();
      g.strokeStyle = 'rgba(150,152,146,0.075)';
      g.lineWidth = Math.max(0.6, LEN(0.0013));
      for (var ni = -2; ni <= 2; ni++) {
        g.beginPath();
        g.moveTo(-prx, ni * pry * 0.34);
        g.quadraticCurveTo(0, ni * pry * 0.62, prx, ni * pry * 0.34);
        g.stroke();
        g.beginPath();
        g.moveTo(ni * prx * 0.34, -pry);
        g.quadraticCurveTo(ni * prx * 0.62, 0, ni * prx * 0.34, pry);
        g.stroke();
      }
      g.restore();

      // 金属袋口圈
      var rim = g.createLinearGradient(-prx, -pry, prx, pry);
      rim.addColorStop(0, 'rgba(248,226,176,0.82)');
      rim.addColorStop(0.42, 'rgba(158,130,78,0.48)');
      rim.addColorStop(1, 'rgba(38,28,16,0.70)');
      g.strokeStyle = rim;
      g.lineWidth = Math.max(1.2, LEN(0.0044));
      g.beginPath(); g.ellipse(0, 0, prx * 0.95, pry * 0.95, 0, 0, TAU); g.stroke();

      // 袋口内侧金属反光
      g.strokeStyle = 'rgba(255,240,204,0.32)';
      g.lineWidth = Math.max(0.8, LEN(0.0016));
      g.beginPath();
      g.ellipse(0, 0, prx * 0.90, pry * 0.90, 0, Math.PI * 1.06, Math.PI * 1.58);
      g.stroke();

      // 黄铜包边
      g.strokeStyle = 'rgba(196,160,96,0.16)';
      g.lineWidth = Math.max(1, LEN(0.008));
      g.beginPath(); g.ellipse(0, 0, prx * 1.07, pry * 1.07, 0, 0, TAU); g.stroke();

      // 袋口朝台面的亮边
      g.strokeStyle = 'rgba(214,232,214,0.10)';
      g.lineWidth = Math.max(0.6, LEN(0.0014));
      g.beginPath();
      g.ellipse(0, 0, prx * 0.93, pry * 0.93, 0, Math.PI * 0.92, Math.PI * 1.55);
      g.stroke();

      g.restore();
    }

    /* ---------- 7. 黄铜菱形瞄点 ---------- */
    var railMid = -(FRAME + this.CUSHION) * 0.5;
    var diamLongX = [];
    var kk;
    for (kk = 1; kk <= 7; kk++) if (kk !== 4) diamLongX.push(W * kk / 8);
    var diamShortY = [H * 0.25, H * 0.5, H * 0.75];

    function drawDiamond(x, y) {
      var half = LEN(0.0076);
      g.save();
      g.translate(x, y);
      g.rotate(Math.PI / 4);
      // 凹槽
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(-half - LEN(0.0012), -half - LEN(0.0006), half * 2 + LEN(0.0024), half * 2 + LEN(0.0024));
      g.fillStyle = 'rgba(255,214,160,0.10)';
      g.fillRect(-half - LEN(0.0012), -half - LEN(0.0016), half * 2 + LEN(0.0024), LEN(0.0012));
      var dg = g.createLinearGradient(-half, -half, half, half);
      dg.addColorStop(0, '#ffefc4');
      dg.addColorStop(0.32, '#e3c176');
      dg.addColorStop(0.66, '#a87d3c');
      dg.addColorStop(1, '#6b4d24');
      g.fillStyle = dg;
      g.fillRect(-half, -half, half * 2, half * 2);
      g.strokeStyle = 'rgba(30,18,8,0.65)';
      g.lineWidth = Math.max(0.7, L.d * 0.8);
      g.strokeRect(-half, -half, half * 2, half * 2);
      g.restore();
    }

    for (i = 0; i < diamLongX.length; i++) {
      drawDiamond(X(diamLongX[i]), Y(railMid));
      drawDiamond(X(diamLongX[i]), Y(H - railMid));
    }
    for (i = 0; i < diamShortY.length; i++) {
      drawDiamond(X(railMid), Y(diamShortY[i]));
      drawDiamond(X(W - railMid), Y(diamShortY[i]));
    }

    if (portrait) {
      // 将未旋转的球桌层按同一组参数旋转合成到全屏静态层
      var vt = this._viewTransform;
      var dpr = this.dpr;
      var outerLayerW = (W + FRAME * 2) * S;
      var outerLayerH = (H + FRAME * 2) * S;
      sg.save();
      sg.translate(vt.cx * dpr, vt.cy * dpr);
      sg.rotate(this.portraitRotate);
      // 球桌投影在合成前绘制，避免被离屏层裁切
      sg.save();
      sg.shadowColor = 'rgba(0,0,0,0.92)';
      sg.shadowBlur = LEN(0.13);
      sg.shadowOffsetY = LEN(0.04);
      sg.fillStyle = '#000';
      roundRectPath(sg, -outerLayerW * 0.5, -outerLayerH * 0.5, outerLayerW, outerLayerH, LEN(0.05));
      sg.fill();
      sg.restore();
      sg.drawImage(this._tableLayer, -layerW * 0.5, -layerH * 0.5);
      sg.restore();
      g = sg;
      L = screenL;
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    /* ---------- 8. 整体灯光 / 暗角 ---------- */
    var bloom = g.createRadialGradient(L.w * 0.5, 0, 0, L.w * 0.5, 0, L.h * 0.85);
    bloom.addColorStop(0, 'rgba(255,226,180,0.10)');
    bloom.addColorStop(0.5, 'rgba(255,220,170,0.025)');
    bloom.addColorStop(1, 'rgba(255,220,170,0)');
    g.fillStyle = bloom;
    g.fillRect(0, 0, L.w, L.h);

    var vg = g.createRadialGradient(L.w * 0.5, L.h * 0.44, Math.min(L.w, L.h) * 0.3, L.w * 0.5, L.h * 0.44, Math.max(L.w, L.h) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.6, 'rgba(0,0,0,0.14)');
    vg.addColorStop(1, 'rgba(0,0,0,0.64)');
    g.fillStyle = vg;
    g.fillRect(0, 0, L.w, L.h);
  };

  /* --------------------------------------------------------------------------
   * 菜单氛围背景：虚化台面 + 吊灯光束 + 暗角（一次生成）
   * ------------------------------------------------------------------------*/
  Renderer.prototype._buildMenuBg = function () {
    var cv = this._menu;
    if (!cv || !this._static) return;
    var g = cv.getContext('2d');
    var L = this._L;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, L.w, L.h);

    var bg = g.createLinearGradient(0, 0, 0, L.h);
    bg.addColorStop(0, '#1b1510');
    bg.addColorStop(0.4, '#100c09');
    bg.addColorStop(1, '#050403');
    g.fillStyle = bg;
    g.fillRect(0, 0, L.w, L.h);

    var lamp = g.createRadialGradient(L.w * 0.5, L.h * 0.02, 0, L.w * 0.5, L.h * 0.02, L.w * 0.55);
    lamp.addColorStop(0, 'rgba(255,214,150,0.22)');
    lamp.addColorStop(0.35, 'rgba(180,120,60,0.08)');
    lamp.addColorStop(1, 'rgba(60,36,16,0)');
    g.fillStyle = lamp;
    g.fillRect(0, 0, L.w, L.h);

    // 虚化台面
    g.save();
    g.globalAlpha = 0.48;
    try { g.filter = 'blur(' + Math.max(5, Math.round(8 * L.d)) + 'px)'; } catch (e) { /* 忽略 */ }
    g.drawImage(this._static, 0, 0);
    g.restore();

    var dim = g.createLinearGradient(0, 0, 0, L.h);
    dim.addColorStop(0, 'rgba(4,3,2,0.58)');
    dim.addColorStop(0.40, 'rgba(4,3,2,0.28)');
    dim.addColorStop(0.75, 'rgba(4,3,2,0.50)');
    dim.addColorStop(1, 'rgba(2,2,2,0.86)');
    g.fillStyle = dim;
    g.fillRect(0, 0, L.w, L.h);

    // 吊灯光束
    g.save();
    g.globalCompositeOperation = 'lighter';
    var beams = [
      { x: 0.5, w: 0.18, a: 0.036 },
      { x: 0.30, w: 0.11, a: 0.022 },
      { x: 0.70, w: 0.13, a: 0.026 }
    ];
    for (var i = 0; i < beams.length; i++) {
      var b = beams[i];
      var topX = L.w * b.x;
      var bottomX = topX + L.w * 0.02;
      var grad = g.createLinearGradient(0, 0, 0, L.h);
      grad.addColorStop(0, 'rgba(255,224,176,' + b.a + ')');
      grad.addColorStop(0.55, 'rgba(255,220,170,' + (b.a * 0.32) + ')');
      grad.addColorStop(1, 'rgba(255,220,170,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(topX - L.w * b.w * 0.16, 0);
      g.lineTo(topX + L.w * b.w * 0.16, 0);
      g.lineTo(bottomX + L.w * b.w * 1.5, L.h);
      g.lineTo(bottomX - L.w * b.w * 1.5, L.h);
      g.closePath();
      g.fill();
    }
    g.restore();

    // 台呢绿色氛围
    var green = g.createRadialGradient(L.w * 0.5, L.h * 0.58, 0, L.w * 0.5, L.h * 0.58, L.w * 0.42);
    green.addColorStop(0, 'rgba(56,136,94,0.075)');
    green.addColorStop(0.6, 'rgba(36,100,70,0.03)');
    green.addColorStop(1, 'rgba(20,60,40,0)');
    g.fillStyle = green;
    g.fillRect(0, 0, L.w, L.h);

    // 暗角
    var vg = g.createRadialGradient(L.w * 0.5, L.h * 0.46, Math.min(L.w, L.h) * 0.3, L.w * 0.5, L.h * 0.46, Math.max(L.w, L.h) * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.55, 'rgba(0,0,0,0.28)');
    vg.addColorStop(1, 'rgba(0,0,0,0.88)');
    g.fillStyle = vg;
    g.fillRect(0, 0, L.w, L.h);
  };


  /* --------------------------------------------------------------------------
   * 主循环
   * ------------------------------------------------------------------------*/
  Renderer.prototype._drawCompat = function (state, step) {
    var ctx = this.ctx;
    var W = this.table.width, H = this.table.height;
    var cw = this.cssW || window.innerWidth, ch = this.cssH || window.innerHeight;
    ctx.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    var bg = ctx.createLinearGradient(0, 0, 0, ch);
    bg.addColorStop(0, '#111611');
    bg.addColorStop(1, '#060806');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);
    if ((state.phase || 'menu') === 'menu') return;

    var pr = Math.max(4, this.scale * this.pocketRadius);
    if (this.portraitRotate) {
      // 兼容模式竖屏：球桌局部旋转变换，简单纯色块，不依赖滤镜/混合模式
      var vt = this._viewTransform, S = this.scale;
      var outerW = (W + this.FRAME * 2) * S;
      var outerH = (H + this.FRAME * 2) * S;
      var frp = Math.max(16, S * 0.12);
      ctx.save();
      ctx.translate(vt.cx, vt.cy);
      ctx.rotate(this.portraitRotate);
      ctx.fillStyle = '#5a3a20';
      roundRectPath(ctx, -outerW * 0.5 - frp, -outerH * 0.5 - frp, outerW + frp * 2, outerH + frp * 2, Math.max(8, frp * 0.28));
      ctx.fill();
      ctx.fillStyle = '#a87a4e';
      roundRectPath(ctx, -outerW * 0.5, -outerH * 0.5, outerW, outerH, Math.max(7, frp * 0.24));
      ctx.fill();
      ctx.fillStyle = '#27904a';
      ctx.fillRect(-W * S * 0.5, -H * S * 0.5, W * S, H * S);
      var glowP = ctx.createRadialGradient(0, -H * S * 0.1, 0, 0, -H * S * 0.1, W * S * 0.62);
      glowP.addColorStop(0, 'rgba(210,240,210,.14)');
      glowP.addColorStop(1, 'rgba(0,0,0,.18)');
      ctx.fillStyle = glowP;
      ctx.fillRect(-W * S * 0.5, -H * S * 0.5, W * S, H * S);
      ctx.restore();
    } else {
      var p0 = this.worldToScreen(0, 0);
      var p1 = this.worldToScreen(W, H);
      var fr = Math.max(22, this.scale * 0.12);
      var x0 = Math.min(p0.x, p1.x) - fr, y0 = Math.min(p0.y, p1.y) - fr;
      var tw = Math.abs(p1.x - p0.x) + fr * 2, th = Math.abs(p1.y - p0.y) + fr * 2;
      ctx.fillStyle = '#5a3a20';
      roundRectPath(ctx, x0, y0, tw, th, Math.max(8, fr * 0.28)); ctx.fill();
      ctx.fillStyle = '#a87a4e';
      roundRectPath(ctx, x0 + 3, y0 + 3, tw - 6, th - 6, Math.max(7, fr * 0.24)); ctx.fill();
      var ix0 = Math.min(p0.x, p1.x), iy0 = Math.min(p0.y, p1.y);
      var iw = Math.abs(p1.x - p0.x), ih = Math.abs(p1.y - p0.y);
      ctx.fillStyle = '#27904a'; ctx.fillRect(ix0, iy0, iw, ih);
      var glow = ctx.createRadialGradient(ix0 + iw * .5, iy0 + ih * .4, 0, ix0 + iw * .5, iy0 + ih * .4, iw * .6);
      glow.addColorStop(0, 'rgba(210,240,210,.14)'); glow.addColorStop(1, 'rgba(0,0,0,.18)');
      ctx.fillStyle = glow; ctx.fillRect(ix0, iy0, iw, ih);
    }
    var pockets = this.pockets || [];
    for (var pi = 0; pi < pockets.length; pi++) {
      var pp = this.worldToScreen(pockets[pi].x, pockets[pi].y);
      ctx.beginPath(); ctx.arc(pp.x, pp.y, pr, 0, TAU);
      ctx.fillStyle = '#020403'; ctx.fill();
      ctx.strokeStyle = '#0a0b08'; ctx.lineWidth = 2; ctx.stroke();
    }
    var balls = (state.world && state.world.balls) || [];
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (!b || !b.active || b.pocketed) continue;
      var bsp = this.worldToScreen(b.x, b.y);
      var br = Math.max(4, this.scale * this.ballRadius * (this.ballVisualScale || 1));
      ctx.save();
      ctx.beginPath(); ctx.ellipse(bsp.x + br * .25, bsp.y + br * .35, br * 1.08, br * .9, 0, 0, TAU);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
      ctx.beginPath(); ctx.arc(bsp.x, bsp.y, br, 0, TAU);
      var kind = b.kind || (b.number === 0 ? 'cue' : (b.number > 8 ? 'stripe' : 'solid'));
      if (b.number === 0) kind = 'cue';
      var col = b.color || this.ballColors[b.number] || '#f2c230';
      if (kind === 'cue') ctx.fillStyle = '#f2eee2';
      else if (kind === 'stripe') ctx.fillStyle = col;
      else ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.42)'; ctx.lineWidth = Math.max(.7, br * .06); ctx.stroke();
      if (kind === 'stripe') {
        ctx.save(); ctx.beginPath(); ctx.arc(bsp.x, bsp.y, br * .96, 0, TAU); ctx.clip();
        ctx.translate(bsp.x, bsp.y);
        if (this.portraitRotate) ctx.rotate(this.portraitRotate);
        ctx.fillStyle = '#f6f0df';
        ctx.fillRect(-br, -br * .28, br * 2, br * .56);
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(bsp.x - br * .28, bsp.y - br * .34, br * .32, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill();
      if (b.number && b.number !== 0) {
        ctx.beginPath(); ctx.arc(bsp.x, bsp.y, br * .46, 0, TAU);
        ctx.fillStyle = '#f8f3e6'; ctx.fill();
        ctx.fillStyle = '#151515'; ctx.font = '800 ' + Math.max(7, br * .62).toFixed(1) + 'px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(b.number), bsp.x, bsp.y + br * .02);
      } else if (kind === 'cue') {
        ctx.fillStyle = 'rgba(176,54,48,.75)';
        for (var di = 0; di < 3; di++) {
          ctx.beginPath();
          ctx.arc(bsp.x + (di - 1) * br * .22, bsp.y + (di % 2 ? -.18 : .12) * br, Math.max(1.4, br * .055), 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    var aim = state.aim || {};
    if (aim.visible && !aim.ballInHand && state.world) {
      var compatWorld = state.world;
      var cue = compatWorld.cueBall || (compatWorld.getBall ? compatWorld.getBall('cue') : null);
      if (cue) {
        var ang = aim.angle || 0, dx = Math.cos(ang), dy = Math.sin(ang);
        var sd = this._screenDir(dx, dy);
        var cp = this.worldToScreen(cue.x, cue.y);
        var hit = (typeof compatWorld.castRay === 'function') ? compatWorld.castRay(cue.x, cue.y, dx, dy, cue.id) : null;
        var ep;
        if (hit && hit.type === 'ball' && hit.ghost) ep = this.worldToScreen(hit.ghost.x, hit.ghost.y);
        else if (hit && isFinite(hit.distance)) ep = this.worldToScreen(hit.x, hit.y);
        else ep = { x: cp.x + sd.x * 500, y: cp.y + sd.y * 500 };
        // 兼容模式：简化纯色半透明梯形，不依赖渐变 / 滤镜
        var bw1 = Math.max(2, this.scale * 0.006);
        var bw2 = Math.max(4, this.scale * 0.014);
        ctx.save();
        taperBandPath(ctx, cp.x, cp.y, ep.x, ep.y, bw1, bw2);
        ctx.fillStyle = 'rgba(214,242,236,0.36)';
        ctx.fill();
        taperBandPath(ctx, cp.x, cp.y, ep.x, ep.y, bw1 * 0.45, bw2 * 0.40);
        ctx.fillStyle = 'rgba(255,248,232,0.34)';
        ctx.fill();
        ctx.restore();
        if (hit && hit.type === 'ball' && hit.ghost) {
          var gr = Math.max(4, this._ballDrawR());
          ctx.beginPath(); ctx.arc(ep.x, ep.y, gr, 0, TAU);
          ctx.strokeStyle = 'rgba(246,242,228,.75)'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        if (aim.illegal) {
          var ip = this.worldToScreen(aim.illegal.x, aim.illegal.y);
          var ir = Math.max(8, this._ballDrawR() * 1.6);
          ctx.beginPath(); ctx.arc(ip.x, ip.y, ir, 0, TAU);
          ctx.strokeStyle = 'rgba(198,73,58,.92)'; ctx.lineWidth = 2; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ip.x - ir * .6, ip.y + ir * .6); ctx.lineTo(ip.x + ir * .6, ip.y - ir * .6); ctx.stroke();
        }
        // 兼容模式球杆：简化线杆，避免高级纹理
        var back = ang + Math.PI + this.portraitRotate;
        ctx.save(); ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(cp.x, cp.y); ctx.lineTo(cp.x + Math.cos(back) * 420, cp.y + Math.sin(back) * 420); ctx.stroke();
        ctx.strokeStyle = '#d8b98e'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(cp.x, cp.y); ctx.lineTo(cp.x + Math.cos(back) * 420, cp.y + Math.sin(back) * 420); ctx.stroke();
        ctx.restore();
      }
    }
  };

  Renderer.prototype.render = function (state, dt) {
    state = state || {};
    var raw = (typeof dt === 'number' && isFinite(dt)) ? dt : 1 / 60;
    var step = clamp(raw, 0.0005, 0.05);
    this.time += step;
    if (!this._L) this.resize();
    if (!this._L) return;
    this._checkSize();
    // orientation / body class may change without a resize event (e.g. entering portrait game)
    if (this._shouldPortrait() !== this._portrait) this.resize(true);
    this._update(step);
    this._frameDt = step;
    var phaseNow = state.phase || 'menu';
    if (phaseNow === 'menu') {
      this._ballSpin = {};
      this._lastPhase = 'menu';
    } else if (this._lastPhase === 'menu') {
      this._ballSpin = {};
      this._lastPhase = phaseNow;
    }
    if (this.compat) { this._drawCompat(state, step); return; }
    var phase = state.phase || 'aim';
    try {
      if (phase === 'menu') {
        this._drawMenu(state, step);
      } else {
        this._drawScene(state, step);
      }
      this._checkCanvasPixels(state);
    } catch (err) {
      this._enableCompat();
    }
  };

  Renderer.prototype._enableCompat = function () {
    if (this.compat) return;
    this.compat = true;
    if (document.body) document.body.classList.add('browser-compat');
    this.resize(true);
  };

  Renderer.prototype._checkCanvasPixels = function (state) {
    if (this.compat || (state.phase || 'menu') === 'menu') return;
    if (!this._touch) return; // 桌面端不做兜底切换，避免误判黑八/暗部像素
    // 纯 JS 兜底：不再读像素。原先每 90 帧 getImageData(1px) 会在手机上强制
    // GPU→CPU 同步，产生 100~200ms 长帧；即使只做一次，真机上也扛不住。
    // 现在只检查画布/静态层是否有效；渲染异常仍由 render() 的 try/catch
    // -> _enableCompat 兜底，X5 系 UA 仍由构造函数直接进入 compat。
    if (this._pixelChecked) return;
    this._pixelChecked = true;
    if (!this.canvas.width || !this.canvas.height || !this._L || !this._static) {
      this._enableCompat();
    }
  };

  Renderer.prototype._checkSize = function () {
    this._tick++;
    if (this._tick % 20 !== 0) return;
    var cw = this.canvas.clientWidth;
    var ch = this.canvas.clientHeight;
    if (cw && ch && (Math.abs(cw - this.cssW) > 1 || Math.abs(ch - this.cssH) > 1)) this.resize();
  };

  Renderer.prototype._update = function (dt) {
    var i;
    this.shake *= Math.exp(-dt * 7.5);
    if (this.shake < 0.0015) this.shake = 0;
    this.flash *= Math.exp(-dt * 4.2);
    if (this.flash < 0.002) this.flash = 0;
    this.dim *= Math.exp(-dt * 1.5);
    if (this.dim < 0.002) this.dim = 0;
    if (this.celebrateT > 0) {
      this.celebrateT -= dt;
      if (this.celebrateT < 0) this.celebrateT = 0;
    }

    var ps = this._particles;
    for (i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }
      var drag = Math.exp(-dt * p.drag);
      p.vx *= drag;
      p.vy *= drag;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    var rings = this._rings;
    for (i = 0; i < rings.length; i++) {
      if (!rings[i].alive) continue;
      rings[i].life -= dt;
      if (rings[i].life <= 0) rings[i].alive = false;
    }
    var pf = this._pocketFx;
    for (i = 0; i < pf.length; i++) {
      if (!pf[i].alive) continue;
      pf[i].life -= dt;
      if (pf[i].life <= 0) pf[i].alive = false;
    }
    var rf = this._railFx;
    for (i = 0; i < rf.length; i++) {
      if (!rf[i].alive) continue;
      rf[i].life -= dt;
      if (rf[i].life <= 0) rf[i].alive = false;
    }
    var cf = this._confetti;
    for (i = 0; i < cf.length; i++) {
      var c = cf[i];
      if (!c.alive) continue;
      c.life -= dt;
      if (c.life <= 0) { c.alive = false; continue; }
      c.vy += 52 * dt;
      c.vx += Math.sin(c.life * c.swaySpeed + c.sway) * 14 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.vr * dt;
    }
  };

  /* --------------------------------------------------------------------------
   * menu 渲染：虚化台面 + 呼吸灯光 + 缓慢浮尘
   * ------------------------------------------------------------------------*/
  Renderer.prototype._drawMenu = function (state, dt) {
    var ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#050403';
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    if (this._menu) ctx.drawImage(this._menu, 0, 0, this.cssW, this.cssH);

    var breath = 0.5 + 0.5 * Math.sin(this.time * 0.7);
    var glow = ctx.createRadialGradient(this.cssW * 0.5, this.cssH * 0.14, 0, this.cssW * 0.5, this.cssH * 0.14, this.cssW * 0.55);
    glow.addColorStop(0, 'rgba(255,220,168,' + (0.028 + breath * 0.020).toFixed(3) + ')');
    glow.addColorStop(0.42, 'rgba(255,214,160,' + (0.008 + breath * 0.006).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(255,214,160,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    ctx.restore();

    // 浮尘
    ctx.save();
    ctx.fillStyle = '#f4e6c8';
    for (var i = 0; i < this._motes.length; i++) {
      var m = this._motes[i];
      var nx = (m.x + this.time * m.sp) % 1;
      if (nx < 0) nx += 1;
      var ny = (m.y + Math.sin(this.time * 0.12 + m.ph) * m.amp) % 1;
      if (ny < 0) ny += 1;
      var alpha = 0.04 + 0.10 * (0.5 + 0.5 * Math.sin(this.time * 0.6 + m.ph));
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(nx * this.cssW, ny * this.cssH, m.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    var fade = ctx.createLinearGradient(0, 0, 0, this.cssH);
    fade.addColorStop(0, 'rgba(2,2,2,0.36)');
    fade.addColorStop(0.18, 'rgba(2,2,2,0)');
    fade.addColorStop(0.78, 'rgba(2,2,2,0)');
    fade.addColorStop(1, 'rgba(2,2,2,0.55)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
  };

  /* --------------------------------------------------------------------------
   * 游戏场景
   * ------------------------------------------------------------------------*/
  Renderer.prototype._drawScene = function (state, dt) {
    var ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // 屏震
    var offX = 0, offY = 0;
    var shakeOn = !this.config.settings || this.config.settings.cameraShake !== false;
    if (shakeOn && this.shake > 0.002) {
      var amp = Math.min(1.2, this.shake) * Math.min(this.cssW, this.cssH) * 0.011;
      offX = (Math.random() * 2 - 1) * amp;
      offY = (Math.random() * 2 - 1) * amp;
    }
    // _static 首层就是不透明的全屏渐变，正常帧不必再清一次全屏。
    // 只有屏震产生偏移、四边会露出时才补底色：每帧省掉一次全屏 fillRect，
    // 这是真机上最贵的一笔固定像素填充。
    if (offX || offY) {
      ctx.fillStyle = '#070605';
      ctx.fillRect(0, 0, this.cssW, this.cssH);
    }
    if (this._static) ctx.drawImage(this._static, offX, offY, this.cssW, this.cssH);

    ctx.save();
    ctx.translate(offX, offY);

    var world = state.world || null;
    var aim = state.aim || {};
    var cueBall = this._findCueBall(world);
    var a = this._computeAim(state, world, cueBall, aim);
    var cueVisible = cueBall && cueBall.active && aim.visible !== false;
    // 自由球/抓起母球时 aim.visible 是 false，但母球手势层必须照画
    var grabMode = !!(cueBall && cueBall.active &&
      (aim.ballInHand || aim.cueDragging || aim.ballReAdjust));
    if (cueVisible) this._updateCueGeom(aim, cueBall, this._getCueDef(state));

    this._drawTableFx();

    if (cueVisible && aim.showCue !== false) this._drawCueShadow(aim, cueBall);

    if (world && world.balls) this._drawBalls(world, state);

    if (world && state.targetIds && state.targetIds.length) this._drawTargetRings(state, world);
    if (grabMode) this._drawBallInHand(cueBall, aim);
    if (cueVisible && aim.illegal) this._drawIllegalAim(aim);

    if (cueVisible && aim.guide !== false) this._drawGuides(state, a, aim, cueBall, world);
    if (cueVisible && aim.showCue !== false) {
      // 竖屏时把球杆裁在球台外框内：底部就是角度尺，杆子不能再穿过去压住控件
      if (this.portraitRotate) {
        var fb = this._frameScreenBox();
        ctx.save();
        ctx.beginPath();
        ctx.rect(fb.x, fb.y, fb.w, fb.h);
        ctx.clip();
        this._drawCue(state, aim, cueBall);
        ctx.restore();
      } else {
        this._drawCue(state, aim, cueBall);
      }
    }
    if (cueVisible) this._drawSpinDot(cueBall, aim);

    this._drawParticles();
    this._drawConfetti();

    ctx.restore();

    if (this.flash > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,246,228,' + (this.flash * 0.10).toFixed(3) + ')';
      ctx.fillRect(0, 0, this.cssW, this.cssH);
      ctx.restore();
    }
    if (this.dim > 0.01) {
      ctx.fillStyle = 'rgba(0,0,0,' + (this.dim * 0.30).toFixed(3) + ')';
      ctx.fillRect(0, 0, this.cssW, this.cssH);
    }
  };

  /* 球台外框（含木框）在屏幕上的矩形，用于把球杆裁在台面范围内 */
  Renderer.prototype._frameScreenBox = function () {
    var W = this.table.width, H = this.table.height, F = this.FRAME;
    var pts = [[-F, -F], [W + F, -F], [-F, H + F], [W + F, H + F]];
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      var s = this.worldToScreen(pts[i][0], pts[i][1]);
      if (s.x < x0) x0 = s.x; if (s.x > x1) x1 = s.x;
      if (s.y < y0) y0 = s.y; if (s.y > y1) y1 = s.y;
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };

  Renderer.prototype._findCueBall = function (world) {
    if (!world) return null;
    if (world.cueBall) return world.cueBall;
    var balls = world.balls || [];
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b && (b.id === 'cue' || b.number === 0)) return b;
    }
    return null;
  };

  Renderer.prototype._getBallById = function (world, id) {
    if (!world) return null;
    if (typeof world.getBall === 'function') {
      try {
        var b = world.getBall(id);
        if (b) return b;
      } catch (e) { /* 忽略 */ }
    }
    var balls = world.balls || [];
    for (var i = 0; i < balls.length; i++) {
      if (balls[i] && (balls[i].id === id || String(balls[i].number) === String(id))) return balls[i];
    }
    return null;
  };

  Renderer.prototype._kindOf = function (number) {
    if (number === 0) return 'cue';
    if (number === 8) return 'eight';
    return number >= 9 ? 'stripe' : 'solid';
  };

  /* --------------------------------------------------------------------------
   * 瞄准射线（优先 world.castRay，缺失时本地兜底）
   * ------------------------------------------------------------------------*/
  Renderer.prototype._computeAim = function (state, world, cueBall, aim) {
    var a = this._aimData;
    a.valid = false;
    if (!cueBall || !cueBall.active) return a;
    a.cueX = cueBall.x;
    a.cueY = cueBall.y;
    var ang = (typeof aim.angle === 'number' && isFinite(aim.angle)) ? aim.angle : 0;
    a.dirX = Math.cos(ang);
    a.dirY = Math.sin(ang);
    a.cueAim = (typeof aim.cueAim === 'number' && aim.cueAim > 0) ? aim.cueAim : 1;
    var hit = null;
    if (world && typeof world.castRay === 'function') {
      try { hit = world.castRay(cueBall.x, cueBall.y, a.dirX, a.dirY, cueBall.id); } catch (e) { hit = null; }
    }
    if (hit && typeof hit.distance === 'number' && isFinite(hit.distance)) {
      this._fillAimFromHit(a, hit);
      return a;
    }
    this._castAimFallback(a, world, cueBall);
    return a;
  };

  Renderer.prototype._fillAimFromHit = function (a, hit) {
    var R = this.ballRadius;
    a.hitDist = hit.distance;
    a.hitType = hit.type || 'none';
    var gx, gy;
    if (hit.ghost && typeof hit.ghost.x === 'number') {
      gx = hit.ghost.x; gy = hit.ghost.y;
    } else {
      gx = a.cueX + a.dirX * hit.distance;
      gy = a.cueY + a.dirY * hit.distance;
    }
    a.ghostX = gx; a.ghostY = gy;
    a.hitX = (typeof hit.x === 'number') ? hit.x : gx;
    a.hitY = (typeof hit.y === 'number') ? hit.y : gy;

    if (a.hitType === 'pocket') {
      a.target = null;
      a.hitX = hit.x; a.hitY = hit.y;
      a.ghostX = hit.x; a.ghostY = hit.y;
      a.normalX = hit.normal ? hit.normal.x : 0;
      a.normalY = hit.normal ? hit.normal.y : 0;
      a.targetDirX = 0; a.targetDirY = 0;
      a.tangentX = 0; a.tangentY = 0;
    } else if (a.hitType === 'ball' && hit.ball) {
      var target = hit.ball;
      a.target = target;
      var nx = hit.normal ? hit.normal.x : (gx - target.x);
      var ny = hit.normal ? hit.normal.y : (gy - target.y);
      var nl = Math.sqrt(nx * nx + ny * ny) || 1;
      nx /= nl; ny /= nl;
      a.normalX = nx; a.normalY = ny;
      a.targetDirX = -nx;
      a.targetDirY = -ny;
      a.hitX = target.x + nx * R;
      a.hitY = target.y + ny * R;
      var dot = a.dirX * nx + a.dirY * ny;
      var tx = a.dirX - nx * dot;
      var ty = a.dirY - ny * dot;
      var tl = Math.sqrt(tx * tx + ty * ty);
      if (tl > 1e-6) { a.tangentX = tx / tl; a.tangentY = ty / tl; }
      else { a.tangentX = 0; a.tangentY = 0; }
    } else {
      a.target = null;
      // 库边：用返回法线算反射
      var cnx = hit.normal ? hit.normal.x : 0;
      var cny = hit.normal ? hit.normal.y : 0;
      a.normalX = cnx; a.normalY = cny;
      var rd = a.dirX * cnx + a.dirY * cny;
      a.targetDirX = a.dirX - 2 * rd * cnx;
      a.targetDirY = a.dirY - 2 * rd * cny;
      a.tangentX = 0; a.tangentY = 0;
    }
    a.valid = true;
  };

  Renderer.prototype._castAimFallback = function (a, world, cueBall) {
    var R = this.ballRadius;
    var W = this.table.width, H = this.table.height;
    var cx = cueBall.x, cy = cueBall.y;
    var dx = a.dirX, dy = a.dirY;
    var best = Infinity, bestBall = null;
    var balls = (world && world.balls) || [];
    var i, b;
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (!b || !b.active || b === cueBall) continue;
      var ox = b.x - cx, oy = b.y - cy;
      var proj = ox * dx + oy * dy;
      if (proj <= 0) continue;
      var perp2 = ox * ox + oy * oy - proj * proj;
      var rr = 4 * R * R;
      if (perp2 >= rr) continue;
      var t = proj - Math.sqrt(rr - perp2);
      if (t > 0 && t < best) { best = t; bestBall = b; }
    }

    var tC = Infinity, cnx = 0, cny = 0, t2;
    if (dx > 1e-9) { t2 = (W - R - cx) / dx; if (t2 > 0 && t2 < tC) { tC = t2; cnx = -1; cny = 0; } }
    else if (dx < -1e-9) { t2 = (R - cx) / dx; if (t2 > 0 && t2 < tC) { tC = t2; cnx = 1; cny = 0; } }
    if (dy > 1e-9) { t2 = (H - R - cy) / dy; if (t2 > 0 && t2 < tC) { tC = t2; cnx = 0; cny = -1; } }
    else if (dy < -1e-9) { t2 = (R - cy) / dy; if (t2 > 0 && t2 < tC) { tC = t2; cnx = 0; cny = 1; } }

    if (best < tC) {
      var gx = cx + dx * best, gy = cy + dy * best;
      a.hitType = 'ball';
      a.hitDist = best;
      a.ghostX = gx; a.ghostY = gy;
      a.target = bestBall;
      var nx = gx - bestBall.x, ny = gy - bestBall.y;
      var nl = Math.sqrt(nx * nx + ny * ny) || 1;
      nx /= nl; ny /= nl;
      a.normalX = nx; a.normalY = ny;
      a.targetDirX = -nx; a.targetDirY = -ny;
      a.hitX = bestBall.x + nx * R;
      a.hitY = bestBall.y + ny * R;
      var dot = dx * nx + dy * ny;
      var tx = dx - nx * dot, ty = dy - ny * dot;
      var tl = Math.sqrt(tx * tx + ty * ty);
      if (tl > 1e-6) { a.tangentX = tx / tl; a.tangentY = ty / tl; }
      else { a.tangentX = 0; a.tangentY = 0; }
    } else if (isFinite(tC)) {
      a.hitType = 'cushion';
      a.hitDist = tC;
      a.hitX = cx + dx * tC;
      a.hitY = cy + dy * tC;
      a.ghostX = a.hitX; a.ghostY = a.hitY;
      a.target = null;
      a.normalX = cnx; a.normalY = cny;
      var rd = dx * cnx + dy * cny;
      a.targetDirX = dx - 2 * rd * cnx;
      a.targetDirY = dy - 2 * rd * cny;
      a.tangentX = 0; a.tangentY = 0;
    } else {
      a.hitType = 'none';
      a.hitDist = 0;
      a.target = null;
    }
    a.valid = true;
  };

  /* --------------------------------------------------------------------------
   * 瞄准辅助线
   * ------------------------------------------------------------------------*/
  /* 虚影母球（ghost ball）
   * 玩家瞄准时，接触瞬间的母球位置不再画成空心虚线圈，而是复用真实母球
   * 的离屏 sprite（球体底色 + 固定光源高光/暗部/描边 + 红点身份标记），
   * 以半透明叠在台面上：看起来就是一颗还没打出去的白球虚影。
   * 刻意不使用 ctx.setLineDash —— 那只是个圈，不是球。 */
  Renderer.prototype._drawGhostCueBall = function (ctx, cx, cy, r, alpha) {
    var spr = this._ensureBallSprites(r);
    if (!spr) return;
    // key 与 _drawBall 里母球一致，直接命中同一张缓存 sprite
    var cueColor = (this.ballColors && this.ballColors[0]) || '#f2c230';
    var full = this._getBallSprite({ number: 0, kind: 'cue', color: cueColor }, spr, r);
    if (!full || !full.canvas) return;
    var a = Math.max(0, Math.min(1, alpha));

    ctx.save();
    // 极淡的接触阴影：真实球都"坐"在台呢上，虚影也要有这个体积暗示
    ctx.globalAlpha = a * 0.20;
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.10, cy + r * 0.30, r * 0.98, r * 0.70, 0, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fill();

    // 极淡的落点柔光，让虚影浮在台呢上而不是一块贴纸
    var glow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.9);
    glow.addColorStop(0, 'rgba(255,255,250,' + (0.10 * a).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(255,255,250,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.9, 0, TAU);
    ctx.fill();

    // 1a) 乳白底：压住台呢的绿色，让虚影明确是「白球」而不是一团绿雾
    ctx.globalAlpha = a * 0.62;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.995, 0, TAU);
    ctx.fillStyle = 'rgba(252,250,242,1)';
    ctx.fill();

    // 1b) 球体底色：与真实母球同一张 sprite
    ctx.globalAlpha = a;
    ctx.drawImage(full.canvas, cx - full.sizeCss * 0.5, cy - full.sizeCss * 0.5, full.sizeCss, full.sizeCss);

    // 2) 固定光源的高光 / 边缘暗部 / 描边：与真实母球同一张 overlay
    var ov = spr.overlay;
    if (ov && ov.canvas) {
      ctx.drawImage(ov.canvas, cx - ov.sizeCss * 0.5, cy - ov.sizeCss * 0.5, ov.sizeCss, ov.sizeCss);
    }

    // 3) 母球身份：红点（静态，不做球面自转投影）
    ctx.globalAlpha = Math.min(1, a * 1.15);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, r * 0.13), 0, TAU);
    ctx.fillStyle = 'rgba(176,54,48,1)';
    ctx.fill();

    // 4) 实线细轮廓：给虚影一个干净的球体边界（刻意不用虚线）
    ctx.globalAlpha = a * 0.62;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.99, 0, TAU);
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.strokeStyle = 'rgba(255,255,250,1)';
    ctx.stroke();
    ctx.restore();
  };

  Renderer.prototype._drawGuides = function (state, a, aim, cueBall, world) {
    if (!a || !a.valid) return;
    var ctx = this.ctx;
    var R = this._ballDrawR();
    var p0 = this.worldToScreen(cueBall.x, cueBall.y);
    var sd = this._screenDir(a.dirX, a.dirY);
    var sx = p0.x + sd.x * R * 1.04;
    var sy = p0.y + sd.y * R * 1.04;
    var ex, ey, gp;
    if (a.hitType === 'ball') {
      gp = this.worldToScreen(a.ghostX, a.ghostY);
      ex = gp.x; ey = gp.y;
    } else {
      gp = this.worldToScreen(a.hitX, a.hitY);
      ex = gp.x; ey = gp.y;
    }

    // 宽带渐变瞄准线：近端窄、远端宽、渐隐，外圈柔光，内核青白/暖白
    var cueDef = this._getCueDef(state);
    var guideColor = (cueDef && cueDef.guideColor) || this._guideColorForCue(cueDef);
    this._drawAimBeam(ctx, sx, sy, ex, ey, R, guideColor);

    ctx.save();
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(1.2, R * 0.085), 0, TAU);
    ctx.fillStyle = 'rgba(248,244,228,0.80)';
    ctx.fill();
    ctx.restore();

    if (a.hitType === 'ball' && a.target) {
      // 虚影母球：复用真实母球的球体/高光/描边，半透明呈现接触瞬间的白球
      this._drawGhostCueBall(ctx, gp.x, gp.y, R, 0.52);

      this._drawTargetPath(a, world, guideColor);

      // 母球分离方向
      if (Math.abs(a.tangentX) + Math.abs(a.tangentY) > 0.03) {
        var sepLen = 0.24 + Math.max(0.9, Math.min(1.18, a.cueAim || 1)) * 0.12;
        var tp = this.worldToScreen(a.ghostX + a.tangentX * sepLen, a.ghostY + a.tangentY * sepLen);
        ctx.save();
        ctx.strokeStyle = 'rgba(' + guideColor.target + ',0.32)';
        ctx.lineWidth = 1;
        dashedLine(ctx, gp.x, gp.y, tp.x, tp.y, 4, 6);
        ctx.restore();
      }
    } else if (a.hitType === 'cushion') {
      ctx.save();
      ctx.strokeStyle = 'rgba(' + guideColor.target + ',0.72)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(gp.x - 4, gp.y - 4); ctx.lineTo(gp.x + 4, gp.y + 4);
      ctx.moveTo(gp.x + 4, gp.y - 4); ctx.lineTo(gp.x - 4, gp.y + 4);
      ctx.stroke();
      var rp = this.worldToScreen(a.hitX + a.targetDirX * 0.34, a.hitY + a.targetDirY * 0.34);
      ctx.strokeStyle = 'rgba(' + guideColor.target + ',0.32)';
      ctx.lineWidth = 1;
      dashedLine(ctx, gp.x, gp.y, rp.x, rp.y, 4, 6);
      ctx.restore();
    }
  };

  Renderer.prototype._guideColorForCue = function (cue) {
    var id = cue && cue.id;
    // 配色按球杆定位区分，同时保持相近亮度与足够对比度。
    if (id === 'carbon' || id === 'pistol') return { glow: '98,188,255', beam: '150,218,255', core: '218,244,255', target: '107,187,238' };
    if (id === 'rosewood') return { glow: '255,105,92', beam: '255,157,126', core: '255,232,210', target: '239,123,102' };
    if (id === 'gold') return { glow: '255,205,74', beam: '255,221,116', core: '255,249,218', target: '245,185,66' };
    if (id === 'rod' || id === 'golf') return { glow: '95,225,183', beam: '135,238,203', core: '220,255,242', target: '91,208,159' };
    if (id === 'wand') return { glow: '204,144,255', beam: '220,181,255', core: '250,232,255', target: '179,122,238' };
    if (id === 'maple') return { glow: '255,154,72', beam: '255,190,112', core: '255,244,219', target: '237,139,64' };
    return { glow: '188,232,226', beam: '214,242,236', core: '255,250,238', target: '244,216,160' };
  };

  Renderer.prototype._drawAimBeam = function (ctx, sx, sy, ex, ey, R, palette) {
    palette = palette || this._guideColorForCue(null);
    var glow = palette.glow, beam = palette.beam, core = palette.core;
    var dx = ex - sx, dy = ey - sy;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 2) return;
    var wNear = Math.max(2.0, R * 0.15);
    var wFar = Math.min(R * 0.55, wNear + len * 0.010);
    ctx.save();
    // 外圈柔光（叠加，低透明度）
    paintTaperedBand(ctx, sx, sy, ex, ey, wNear * 2.6, wFar * 2.3, [
      [0, 'rgba(' + glow + ',0.10)'],
      [0.55, 'rgba(' + glow + ',0.05)'],
      [1, 'rgba(' + glow + ',0)']
    ], 'lighter');
    // 中间柔边
    paintTaperedBand(ctx, sx, sy, ex, ey, wNear * 1.55, wFar * 1.40, [
      [0, 'rgba(' + beam + ',0.18)'],
      [0.65, 'rgba(' + beam + ',0.07)'],
      [1, 'rgba(' + beam + ',0)']
    ]);
    // 主体宽带
    paintTaperedBand(ctx, sx, sy, ex, ey, wNear, wFar, [
      [0, 'rgba(' + core + ',0.62)'],
      [0.50, 'rgba(' + core + ',0.34)'],
      [1, 'rgba(' + core + ',0)']
    ]);
    // 近端暖白核心，增强“出杆方向”的确认感
    var nearLen = Math.min(len * 0.22, R * 3.2);
    if (nearLen > 2) {
      var nx = sx + dx / len * nearLen;
      var ny = sy + dy / len * nearLen;
      paintTaperedBand(ctx, sx, sy, nx, ny, wNear * 0.38, wNear * 0.34, [
        [0, 'rgba(' + core + ',0.58)'],
        [1, 'rgba(' + core + ',0)']
      ]);
    }
    ctx.restore();
  };

  Renderer.prototype._drawTargetPath = function (a, world, palette) {
    var target = a.target;
    if (!target) return;
    palette = palette || this._guideColorForCue(null);
    var dx = a.targetDirX, dy = a.targetDirY;
    var R = this.ballRadius;
    var endX = target.x + dx * 1.15;
    var endY = target.y + dy * 1.15;
    var pocket = false;

    // 目标球路径也走真实射线：能识别中袋/角袋，不再固定截断在 1.15m
    if (world && typeof world.castRay === 'function') {
      var hit = world.castRay(target.x, target.y, dx, dy, target.id);
      if (hit && isFinite(hit.distance)) {
        if (hit.type === 'pocket') {
          endX = hit.x; endY = hit.y; pocket = true;
        } else if (hit.type === 'ball' && hit.ghost) {
          endX = hit.ghost.x; endY = hit.ghost.y;
        } else {
          endX = hit.x; endY = hit.y;
        }
      }
    }

    // 辅助线可读距离由球杆的“辅助线”属性决定：入门杆约 0.9m，顶级杆到 1.9m+
    // 辅助线长度按球杆 aim 属性分级：低级杆明显截短，只有高级杆才接近洞口。
    // 0.58m 起步；aim=1.30 的顶级杆最多 1.55m，不再默认贯穿整张球台。
    var maxLen = 0.58 + Math.max(0, (a.cueAim || 1) - 1) * 2.5;
    maxLen = Math.min(maxLen, 1.55);
    var pathDx = endX - target.x, pathDy = endY - target.y;
    var pathLen = Math.sqrt(pathDx * pathDx + pathDy * pathDy);
    if (pathLen > maxLen) {
      endX = target.x + (pathDx / pathLen) * maxLen;
      endY = target.y + (pathDy / pathLen) * maxLen;
      pocket = false;
    }

    var st = this.worldToScreen(target.x, target.y);
    var en = this.worldToScreen(endX, endY);
    var ctx = this.ctx;
    var rpx = this._ballDrawR();
    // 小屏（竖屏）也要有可读宽度，因此给一个最小屏幕像素宽度
    var wStart = Math.max(5.5, rpx * 0.72);
    var wEnd = Math.max(1.2, wStart * 0.10);

    ctx.save();
    // 外圈暖金柔光
    paintTaperedBand(ctx, st.x, st.y, en.x, en.y, wStart * 1.70, wEnd * 2.60, [
      [0, 'rgba(' + palette.glow + ',0.12)'],
      [0.60, 'rgba(' + palette.glow + ',0.055)'],
      [1, 'rgba(' + palette.glow + ',0)']
    ], 'lighter');
    // 半透明楔形渐变带：目标球处宽、远端收窄并淡出
    paintTaperedBand(ctx, st.x, st.y, en.x, en.y, wStart, wEnd, [
      [0, 'rgba(' + palette.target + ',0.40)'],
      [0.50, 'rgba(' + palette.target + ',0.21)'],
      [1, 'rgba(' + palette.target + ',0)']
    ]);
    // 细芯线，保证在深色台呢上仍然清晰
    paintTaperedBand(ctx, st.x, st.y, en.x, en.y, Math.max(1.0, wStart * 0.22), Math.max(0.5, wEnd * 0.30), [
      [0, 'rgba(' + palette.core + ',0.50)'],
      [0.55, 'rgba(' + palette.core + ',0.23)'],
      [1, 'rgba(' + palette.core + ',0)']
    ]);

    if (pocket) {
      var pg = ctx.createRadialGradient(en.x, en.y, 0, en.x, en.y, Math.max(6, rpx * 1.8));
      pg.addColorStop(0, 'rgba(' + palette.target + ',0.34)');
      pg.addColorStop(1, 'rgba(' + palette.target + ',0)');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(en.x, en.y, Math.max(6, rpx * 1.8), 0, TAU);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(en.x, en.y, Math.max(1.2, rpx * 0.10), 0, TAU);
      ctx.fillStyle = 'rgba(' + palette.core + ',0.42)';
      ctx.fill();
    }
    ctx.restore();
  };

  Renderer.prototype._drawTargetRings = function (state, world) {
    var ctx = this.ctx;
    var ids = state.targetIds || [];
    var r = this._ballDrawR();
    for (var i = 0; i < ids.length; i++) {
      var b = this._getBallById(world, ids[i]);
      if (!b || !b.active) continue;
      var s = this.worldToScreen(b.x, b.y);
      var pulse = 0.5 + 0.5 * Math.sin(this.time * 3.1 + i * 1.7);
      var alpha = 0.20 + 0.30 * pulse;
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x, s.y, r * (1.34 + 0.06 * pulse), 0, TAU);
      ctx.strokeStyle = 'rgba(240,222,176,' + alpha.toFixed(3) + ')';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s.x, s.y, r * 1.58, 0, TAU);
      ctx.strokeStyle = 'rgba(240,222,176,' + (alpha * 0.34).toFixed(3) + ')';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }
  };

  Renderer.prototype._drawIllegalAim = function (aim) {
    if (!aim || !aim.illegal) return;
    var ctx = this.ctx;
    var s = this.worldToScreen(aim.illegal.x, aim.illegal.y);
    var r = Math.max(10, this._ballDrawR() * 1.7);
    ctx.save();
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, TAU);
    ctx.fillStyle = 'rgba(191,66,52,0.10)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(198,73,58,0.92)';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x - r * 0.62, s.y + r * 0.62);
    ctx.lineTo(s.x + r * 0.62, s.y - r * 0.62);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  };

  /* 自由球手势层：手里拿着球 → 半透明母球跟手 + 虚线落点环；
   * 已经放好 → 母球外面一圈“还能再抓起来”的呼吸提示环。 */
  Renderer.prototype._drawBallInHand = function (cueBall, aim) {
    var ctx = this.ctx;
    var preview = (aim && aim.cuePreview) || null;
    var dragging = !!(aim && aim.cueDragging);
    var inHand = !!(aim && aim.ballInHand);
    var px = preview ? preview.x : cueBall.x;
    var py = preview ? preview.y : cueBall.y;
    var s = this.worldToScreen(px, py);
    var r = Math.max(2, this._ballDrawR());
    var pulse = 0.5 + 0.5 * Math.sin(this.time * 4.4);
    // 手里拿着球 / 正拖着球：亮；只是“还能再调整”：弱
    var strong = inHand || dragging || !!preview;
    var alpha = strong ? 1 : 0.85;

    ctx.save();

    // 落点光晕
    var glow = ctx.createRadialGradient(s.x, s.y, r * 0.5, s.x, s.y, r * 3.2);
    glow.addColorStop(0, 'rgba(255,242,196,' + (0.26 * alpha).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(255,242,196,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * 3.2, 0, TAU);
    ctx.fill();

    // 手里的母球（真实母球此时已从球堆里隐去）
    if (inHand || dragging || preview) {
      var lift = dragging ? r * 0.16 : 0;
      ctx.beginPath();
      ctx.ellipse(s.x + r * 0.14, s.y + r * 0.30 + lift, r * 1.02, r * 0.72, 0, 0, TAU);
      ctx.fillStyle = 'rgba(0,0,0,' + (dragging ? 0.26 : 0.14) + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x, s.y - lift, r * (dragging ? 1.06 : 1), 0, TAU);
      ctx.fillStyle = 'rgba(246,242,228,' + (dragging ? 0.95 : 0.86) + ')';
      ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.10);
      ctx.strokeStyle = 'rgba(255,252,240,' + (dragging ? 0.95 : 0.72) + ')';
      ctx.stroke();
      // 半透明母球上的红点，跟真实母球保持同一个身份
      ctx.fillStyle = 'rgba(176,54,48,' + (dragging ? 0.85 : 0.7) + ')';
      ctx.beginPath();
      ctx.arc(s.x, s.y - lift, Math.max(1, r * 0.14), 0, TAU);
      ctx.fill();
    }

    // 旋转虚线环：明确的“可以抓/正在抓”信号
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(this.time * 0.7);
    ctx.setLineDash([Math.max(2.5, r * 0.62), Math.max(2.5, r * 0.46)]);
    ctx.lineDashOffset = -this.time * r * 1.6;
    ctx.strokeStyle = 'rgba(180,224,255,' + (0.26 + 0.3 * alpha * (0.5 + 0.5 * pulse)).toFixed(3) + ')';
    ctx.lineWidth = Math.max(1, r * 0.10);
    ctx.beginPath();
    ctx.arc(0, 0, r * (1.85 + 0.14 * pulse * (strong ? 0 : 1)), 0, TAU);
    ctx.stroke();
    ctx.restore();

    // 左右两只“抓手”箭头：告诉玩家这颗球可以按住拖动
    var grip = Math.max(3.5, r * 0.52);
    var arm = Math.max(5, r * 0.9);
    ctx.strokeStyle = 'rgba(255,240,205,' + (0.45 + 0.45 * alpha).toFixed(3) + ')';
    ctx.lineWidth = Math.max(1.3, r * 0.15);
    ctx.lineCap = 'round';
    var reach = r * (1.9 + 0.10 * pulse * (strong ? 0 : 1));
    for (var side = -1; side <= 1; side += 2) {
      var bx = s.x + side * reach;
      ctx.beginPath();
      ctx.moveTo(bx - side * grip, s.y - arm);
      ctx.lineTo(bx, s.y);
      ctx.lineTo(bx - side * grip, s.y + arm);
      ctx.stroke();
      var by = s.y + side * reach;
      ctx.beginPath();
      ctx.moveTo(s.x - arm, by - side * grip);
      ctx.lineTo(s.x, by);
      ctx.lineTo(s.x + arm, by - side * grip);
      ctx.stroke();
    }

    ctx.restore();
  };

  Renderer.prototype._drawSpinDot = function (cueBall, aim) {
    var s = this.worldToScreen(cueBall.x, cueBall.y);
    var r = this._ballDrawR();
    var sx = clamp(typeof aim.spinX === 'number' ? aim.spinX : 0, -1, 1);
    var sy = clamp(typeof aim.spinY === 'number' ? aim.spinY : 0, -1, 1);
    var ox = sx * r * 0.60, oy = -sy * r * 0.60;
    if (this.portraitRotate) {
      var sc = this._viewTransform.cos, ss = this._viewTransform.sin;
      var rx = sc * ox - ss * oy;
      var ry = ss * ox + sc * oy;
      ox = rx; oy = ry;
    }
    var x = s.x + ox;
    var y = s.y + oy;
    var dr = Math.max(1.6, r * 0.17);
    var ctx = this.ctx;
    ctx.save();
    var glow = ctx.createRadialGradient(x, y, 0, x, y, dr * 2.4);
    glow.addColorStop(0, 'rgba(232,66,52,0.55)');
    glow.addColorStop(1, 'rgba(232,66,52,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, dr * 2.4, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, dr, 0, TAU);
    ctx.fillStyle = '#d63a2e';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,230,0.85)';
    ctx.lineWidth = Math.max(0.7, dr * 0.22);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - dr * 0.32, y - dr * 0.32, dr * 0.26, 0, TAU);
    ctx.fillStyle = 'rgba(255,238,228,0.85)';
    ctx.fill();
    ctx.restore();
  };

  /* --------------------------------------------------------------------------
   * 球体缓存：球面明暗 / 统一光影 / 接触阴影
   * ------------------------------------------------------------------------*/
  Renderer.prototype._ensureBallSprites = function (r) {
    var ss = this._ballSS || 1;
    var pix = this.dpr * ss;
    // key 明确包含实际像素半径、dpr 与 SS；任一变化都会重烘
    var pixelR = Math.round(r * pix * 2) / 2;
    var key = pixelR + '|' + this.dpr + '|' + ss;
    if (this._spr && this._spr.key === key && this._spr.full) return this._spr;
    var sh = this._makeShadowSprite(r);
    var spr = {
      key: key,
      r: r,
      ss: ss,
      pix: pix,
      shadow: sh.canvas,
      shadowCss: sh.sizeCss,
      overlay: this._makeSphereOverlay(r, pix),
      full: {},
      numPatches: {},
      stripeMesh: null,
      stripeColors: {}
    };
    this._spr = spr;
    this._stripeGrads = {};
    return spr;
  };

  // 球体离屏缓存：只含球色/花色白带/白号圈/数字/母球三色斑点，
  // 不含球面高光。高光在 _drawBall 里固定屏幕方向叠加，避免整张圆盘自转。
  Renderer.prototype._getBallSprite = function (ball, spr, r) {
    var number = ball.number || 0;
    var kind = ball.kind || this._kindOf(number);
    if (number === 0) kind = 'cue';
    var color = ball.color || this.ballColors[number] || '#f2c230';
    var key = kind + '|' + number + '|' + color;
    var full = spr.full[key];
    if (!full) full = spr.full[key] = this._makeBallSprite(kind, color, number, r, spr);
    return full;
  };

  // 球体底图只保留基础球色/白底；号码、花色、母球斑点全部改为
  // 由 _drawBall 按实时四元数姿态做球面投影，不再烘在整张 sprite 里。
  Renderer.prototype._makeBallSprite = function (kind, color, number, r, spr) {
    var ss = this._ballSS || 1;
    var pix = this.dpr * ss;
    var colorKind = (kind === 'solid' || kind === 'eight');
    var base = this._makeSphereSprite(colorKind ? color : '#fbf8ee', r, pix);
    return { canvas: base.canvas, sizeCss: base.sizeCss };
  };


  // 号码贴片：透明底 + 白号圈 + 深色数字。绘制时按球面切平面做仿射投影。
  Renderer.prototype._getNumberPatch = function (number, r, spr) {
    var key = String(number);
    if (spr.numPatches[key]) return spr.numPatches[key];
    var ss = this._ballSS || 1;
    var pix = this.dpr * ss;
    var sizeCss = r * 0.88;
    var sizeDev = Math.max(12, Math.ceil(sizeCss * pix));
    var c = makeCanvas(sizeDev, sizeDev);
    var g = c.getContext('2d');
    var cx = sizeDev / 2, cy = sizeDev / 2;
    var discR = sizeDev * (0.40 / 0.88);
    g.beginPath();
    g.arc(cx, cy, discR, 0, TAU);
    g.fillStyle = '#ffffff';
    g.fill();
    g.strokeStyle = 'rgba(10,8,4,0.55)';
    g.lineWidth = Math.max(1.2, discR * 0.11);
    g.stroke();
    var txt = String(number);
    var fs = discR * (txt.length > 1 ? 1.23 : 1.67);
    g.font = '900 ' + fs.toFixed(2) + 'px "Arial Black","Segoe UI",Arial,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    var tw = g.measureText(txt).width;
    if (tw > discR * 1.72) {
      fs *= (discR * 1.72) / tw;
      g.font = '900 ' + fs.toFixed(2) + 'px "Arial Black","Segoe UI",Arial,sans-serif';
    }
    g.fillStyle = '#0a0a0a';
    g.fillText(txt, cx, cy + discR * 0.02);
    spr.numPatches[key] = c;
    return c;
  };

  // 花色带：球面局部纬度带（|y|<=0.52），按四元数投影成网格。
  Renderer.prototype._getStripeMesh = function (spr) {
    if (spr.stripeMesh) return spr.stripeMesh;
    var lats = [-0.52, 0, 0.52];
    var lon = 16;
    var verts = [];
    for (var li = 0; li < lats.length; li++) {
      var y = lats[li];
      var rr = Math.sqrt(Math.max(0, 1 - y * y));
      var row = [];
      for (var ji = 0; ji <= lon; ji++) {
        var a = (ji / lon) * TAU;
        row.push({ x: rr * Math.cos(a), y: y, z: rr * Math.sin(a) });
      }
      verts.push(row);
    }
    var quads = [];
    for (var bi = 0; bi < lats.length - 1; bi++) {
      for (var j = 0; j < lon; j++) {
        quads.push({ a: verts[bi][j], b: verts[bi][j + 1], c: verts[bi + 1][j + 1], d: verts[bi + 1][j], band: bi });
      }
    }
    spr.stripeMesh = { quads: quads, colors: null };
    return spr.stripeMesh;
  };

  Renderer.prototype._stripeColors = function (spr, color) {
    var k = spr.stripeColors[color];
    if (!k) k = spr.stripeColors[color] = [shade(color, 0.10), shade(color, -0.06)];
    return k;
  };

  Renderer.prototype._drawStripeSurface = function (ctx, q, cx, cy, r, color, spr) {
    var mesh = this._getStripeMesh(spr);
    var colors = this._stripeColors(spr, color);
    var quads = mesh.quads;
    for (var qi = 0; qi < quads.length; qi++) {
      var Q = quads[qi];
      var p0 = qRot(q, Q.a.x, Q.a.y, Q.a.z);
      var p1 = qRot(q, Q.b.x, Q.b.y, Q.b.z);
      var p2 = qRot(q, Q.c.x, Q.c.y, Q.c.z);
      var p3 = qRot(q, Q.d.x, Q.d.y, Q.d.z);
      if (p0.z <= 0 && p1.z <= 0 && p2.z <= 0 && p3.z <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(cx + p0.x * r, cy + p0.y * r);
      ctx.lineTo(cx + p1.x * r, cy + p1.y * r);
      ctx.lineTo(cx + p2.x * r, cy + p2.y * r);
      ctx.lineTo(cx + p3.x * r, cy + p3.y * r);
      ctx.closePath();
      ctx.fillStyle = colors[Q.band];
      ctx.fill();
      // 用同色描边盖住相邻网格的抗锯齿细缝，避免花色带出现竖条纹
      ctx.strokeStyle = colors[Q.band];
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
  };

  Renderer.prototype._drawNumberSurface = function (ctx, number, q, cx, cy, r, spr) {
    var patch = this._getNumberPatch(number, r, spr);
    var normals = [qRot(q, 0, 0, 1), qRot(q, 0, 0, -1)];
    var u = qRot(q, 1, 0, 0);
    var v = qRot(q, 0, 1, 0);
    var size = r * 0.88;
    for (var i = 0; i < normals.length; i++) {
      var n = normals[i];
      if (n.z <= 0.02) continue;
      ctx.save();
      ctx.translate(cx + n.x * r, cy + n.y * r);
      ctx.transform(u.x, u.y, v.x, v.y, 0, 0);
      ctx.drawImage(patch, -size * 0.5, -size * 0.5, size, size);
      ctx.restore();
    }
  };

  Renderer.prototype._drawCueSpots = function (ctx, q, cx, cy, r) {
    var local = [
      [-0.34, -0.08, '#d23f36'],
      [-0.06, -0.34, '#35a05a'],
      [0.20, 0.02, '#f2c231']
    ];
    for (var i = 0; i < local.length; i++) {
      var x = local[i][0], y = local[i][1];
      var z = Math.sqrt(Math.max(0.01, 1 - x * x - y * y));
      var n = qRot(q, x, y, z);
      if (n.z <= 0.02) continue;
      var rad = r * 0.105 * (0.35 + 0.65 * n.z);
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = local[i][2];
      ctx.beginPath();
      ctx.arc(cx + n.x * r, cy + n.y * r, rad, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // ---- 四元数：渲染层球面姿态（不写 physics 球对象） ----
  var Q_ID = { x: 0, y: 0, z: 0, w: 1 };
  function qMul(a, b) {
    return {
      x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
      w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
    };
  }
  function qNorm(q) {
    var l = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w) || 1;
    return { x: q.x / l, y: q.y / l, z: q.z / l, w: q.w / l };
  }
  function qAxis(ax, ay, az, ang) {
    var l = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
    var s = Math.sin(ang * 0.5);
    return { x: ax / l * s, y: ay / l * s, z: az / l * s, w: Math.cos(ang * 0.5) };
  }
  function qRot(q, x, y, z, out) {
    var tx = 2 * (q.y * z - q.z * y);
    var ty = 2 * (q.z * x - q.x * z);
    var tz = 2 * (q.x * y - q.y * x);
    out = out || {};
    out.x = x + q.w * tx + (q.y * tz - q.z * ty);
    out.y = y + q.w * ty + (q.z * tx - q.x * tz);
    out.z = z + q.w * tz + (q.x * ty - q.y * tx);
    return out;
  }
  function qSlerp(a, b, t) {
    var d = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    var bb = b;
    if (d < 0) { d = -d; bb = { x: -b.x, y: -b.y, z: -b.z, w: -b.w }; }
    if (d > 0.9995) {
      return qNorm({ x: a.x + (bb.x - a.x) * t, y: a.y + (bb.y - a.y) * t, z: a.z + (bb.z - a.z) * t, w: a.w + (bb.w - a.w) * t });
    }
    var th = Math.acos(Math.max(-1, Math.min(1, d)));
    var s = Math.sin(th);
    var wa = Math.sin((1 - t) * th) / s;
    var wb = Math.sin(t * th) / s;
    return { x: a.x * wa + bb.x * wb, y: a.y * wa + bb.y * wb, z: a.z * wa + bb.z * wb, w: a.w * wa + bb.w * wb };
  }

  Renderer.prototype._getBallSpin = function (ball) {
    var id = ball.id || ('n' + (ball.number || 0));
    var st = this._ballSpin[id];
    if (!st) {
      st = {
        q: { x: 0, y: 0, z: 0, w: 1 }, q0: null,
        sx: null, sy: null, lx: null, ly: null,
        still: 0, settling: false, settleT: 0, moving: false
      };
      this._ballSpin[id] = st;
    }
    return st;
  };

  // 真实向前滚动：轴 = 屏幕位移方向的垂直轴 (-dy,dx)，角度 = 位移/ballRadius。
  // 停稳 speed<.004 && moved<.05 持续 .10s 后，用 .14s slerp 回到正面（identity）。
  Renderer.prototype._updateBallSpin = function (ball, st, cx, cy, r, dt) {
    var dx = 0, dy = 0, moved = 0, dwx = 0, dwy = 0, distW = 0;
    if (st.sx == null) {
      st.sx = cx; st.sy = cy; st.lx = ball.x; st.ly = ball.y;
    } else {
      dx = cx - st.sx; dy = cy - st.sy;
      moved = Math.sqrt(dx * dx + dy * dy);
      dwx = (Number(ball.x) || 0) - st.lx;
      dwy = (Number(ball.y) || 0) - st.ly;
      distW = Math.sqrt(dwx * dwx + dwy * dwy);
      if (moved > r * 6) {
        st.sx = cx; st.sy = cy; st.lx = ball.x; st.ly = ball.y;
        moved = 0; distW = 0;
      }
    }
    st.sx = cx; st.sy = cy;
    st.lx = Number(ball.x) || 0; st.ly = Number(ball.y) || 0;

    var speed = Math.sqrt((ball.vx || 0) * (ball.vx || 0) + (ball.vy || 0) * (ball.vy || 0));
    if (moved > 0.06) {
      st.moving = true;
      st.still = 0;
      st.settling = false;
      if (distW > 1e-6) {
        // 屏幕位移方向定义滚动轴；世界位移/ballRadius 定义滚动角
        var ax = -dy, ay = dx;
        var al = Math.sqrt(ax * ax + ay * ay);
        if (al > 1e-6) {
          var dq = qAxis(ax / al, ay / al, 0, distW / this.ballRadius);
          st.q = qNorm(qMul(dq, st.q));
        }
      }
    } else {
      st.moving = false;
      if (speed > 0.004 || moved > 0.05) {
        st.settling = false;
        st.still = 0;
      }
      if (!st.settling) {
        if (speed < 0.004 && moved < 0.05) st.still += dt;
        else st.still = 0;
        if (st.still >= 0.10) {
          st.settling = true;
          st.settleT = 0;
          st.q0 = { x: st.q.x, y: st.q.y, z: st.q.z, w: st.q.w };
        }
      }
    }
    if (st.settling) {
      st.settleT += dt;
      var t = Math.min(1, st.settleT / 0.14);
      var e = t * t * (3 - 2 * t);
      st.q = qSlerp(st.q0 || Q_ID, Q_ID, e);
      if (t >= 1) {
        st.q = { x: 0, y: 0, z: 0, w: 1 };
        st.settling = false;
        st.still = 0;
      }
    }
    return st.q;
  };

  Renderer.prototype._makeSphereSprite = function (color, r, pix) {
    var px = pix || this.dpr;
    var pad = 2 * px;
    var sizeDev = Math.ceil(2 * r * px + pad * 2);
    var c = makeCanvas(sizeDev, sizeDev);
    var g = c.getContext('2d');
    var rad = r * px;
    var cx = sizeDev / 2, cy = sizeDev / 2;
    var base = color || '#f4eddc';
    // 小球（手机 13~16px）不能用大球的强高光：白心会盖掉颜色，
    // 整颗球看起来会像"发白的糖"，与真实台球那种饱和实色球完全不像。
    var small = r < 14;
    var h0 = small ? 0.24 : 0.70;
    var h1 = small ? 0.10 : 0.34;
    var grd = g.createRadialGradient(cx - rad * 0.30, cy - rad * 0.36, rad * 0.04, cx, cy, rad * 1.22);
    grd.addColorStop(0, shade(base, h0));
    grd.addColorStop(0.24, shade(base, h1));
    grd.addColorStop(0.58, base);
    grd.addColorStop(0.84, shade(base, -0.14));
    grd.addColorStop(1, shade(base, -0.42));
    g.fillStyle = grd;
    g.beginPath();
    g.arc(cx, cy, rad, 0, TAU);
    g.fill();
    // 台呢暖色反光
    g.save();
    g.beginPath();
    g.arc(cx, cy, rad, 0, TAU);
    g.clip();
    var bounce = g.createRadialGradient(cx + rad * 0.22, cy + rad * 0.70, 0, cx + rad * 0.22, cy + rad * 0.70, rad * 0.85);
    bounce.addColorStop(0, 'rgba(150,132,96,0.12)');
    bounce.addColorStop(1, 'rgba(150,132,96,0)');
    g.fillStyle = bounce;
    g.fillRect(0, 0, sizeDev, sizeDev);
    g.restore();
    return { canvas: c, sizeCss: sizeDev / px, sizeDev: sizeDev };
  };

  Renderer.prototype._makeSphereOverlay = function (r, pix) {
    var px = pix || this.dpr;
    var pad = 2 * px;
    var sizeDev = Math.ceil(2 * r * px + pad * 2);
    var c = makeCanvas(sizeDev, sizeDev);
    var g = c.getContext('2d');
    var rad = r * px;
    var cx = sizeDev / 2, cy = sizeDev / 2;

    g.save();
    g.beginPath();
    g.arc(cx, cy, rad, 0, TAU);
    g.clip();

    // 边缘暗部：保留体积但不把球压成黑边
    var rim = g.createRadialGradient(cx, cy, rad * 0.56, cx, cy, rad);
    rim.addColorStop(0, 'rgba(0,0,0,0)');
    rim.addColorStop(0.66, 'rgba(0,0,0,0.07)');
    rim.addColorStop(0.90, 'rgba(0,0,0,0.30)');
    rim.addColorStop(1, 'rgba(0,0,0,0.48)');
    g.fillStyle = rim;
    g.fillRect(0, 0, sizeDev, sizeDev);

    // 主高光：更亮、更聚，接近摄影棚里的硬高光
    var hx = cx - rad * 0.34, hy = cy - rad * 0.40;
    var hl = g.createRadialGradient(hx, hy, 0, hx, hy, rad * 0.64);
    hl.addColorStop(0, r < 14 ? 'rgba(255,255,255,0.56)' : 'rgba(255,255,255,0.99)');
    hl.addColorStop(0.12, 'rgba(255,255,255,0.80)');
    hl.addColorStop(0.38, 'rgba(255,255,255,0.24)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl;
    g.fillRect(0, 0, sizeDev, sizeDev);

    // 高光核
    g.fillStyle = 'rgba(255,255,255,0.96)';
    g.beginPath();
    g.ellipse(hx + rad * 0.03, hy + rad * 0.02, rad * 0.095, rad * 0.062, -0.55, 0, TAU);
    g.fill();

    // 第二高光：模拟球房顶灯在球面另一侧的柔反射
    var fillLight = g.createRadialGradient(cx + rad * 0.28, cy + rad * 0.48, 0, cx + rad * 0.28, cy + rad * 0.48, rad * 0.55);
    fillLight.addColorStop(0, 'rgba(240,226,192,0.16)');
    fillLight.addColorStop(0.55, 'rgba(240,226,192,0.04)');
    fillLight.addColorStop(1, 'rgba(240,226,192,0)');
    g.fillStyle = fillLight;
    g.fillRect(0, 0, sizeDev, sizeDev);

    // 底部接触暗部：让球“坐”在台呢上，而不是贴图浮空
    var contact = g.createRadialGradient(cx, cy + rad * 0.74, 0, cx, cy + rad * 0.74, rad * 0.46);
    contact.addColorStop(0, 'rgba(0,0,0,0.12)');
    contact.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = contact;
    g.fillRect(0, 0, sizeDev, sizeDev);

    // 上方轮廓光：让球的边缘从深色背景里“浮”出来
    var rimLight = g.createLinearGradient(cx - rad * 0.78, cy - rad * 0.82, cx + rad * 0.18, cy + rad * 0.18);
    rimLight.addColorStop(0, 'rgba(255,248,228,0.30)');
    rimLight.addColorStop(0.42, 'rgba(255,248,228,0.08)');
    rimLight.addColorStop(1, 'rgba(255,248,228,0)');
    g.fillStyle = rimLight;
    g.beginPath();
    g.arc(cx, cy, rad * 0.995, 0, TAU);
    g.fill();

    // 下方环境反射：台呢的绿 + 顶部灯光的暖
    var env = g.createLinearGradient(0, cy + rad * 0.18, 0, cy + rad);
    env.addColorStop(0, 'rgba(170,205,235,0)');
    env.addColorStop(0.55, 'rgba(155,196,168,0.10)');
    env.addColorStop(1, 'rgba(218,225,194,0.16)');
    g.fillStyle = env;
    g.beginPath();
    g.ellipse(cx, cy + rad * 0.02, rad * 0.98, rad * 0.95, 0, 0, TAU);
    g.fill();

    // 窗口柔光反射
    var win = g.createLinearGradient(cx - rad * 0.5, cy - rad * 0.78, cx + rad * 0.2, cy - rad * 0.05);
    win.addColorStop(0, 'rgba(255,255,255,0)');
    win.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    win.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = win;
    g.beginPath();
    g.ellipse(cx - rad * 0.2, cy - rad * 0.32, rad * 0.60, rad * 0.32, -0.7, 0, TAU);
    g.fill();
    g.restore();

    // 描边
    g.strokeStyle = 'rgba(0,0,0,0.34)';
    g.lineWidth = Math.max(0.6, px * 0.7);
    g.beginPath();
    g.arc(cx, cy, Math.max(0.5, rad - 0.5), 0, TAU);
    g.stroke();

    return { canvas: c, sizeCss: sizeDev / px, sizeDev: sizeDev };
  };

  Renderer.prototype._makeShadowSprite = function (r) {
    var dpr = this.dpr;
    var sizeCss = Math.max(8, r * 3.7);
    var sizeDev = Math.ceil(sizeCss * dpr);
    var c = makeCanvas(sizeDev, sizeDev);
    var g = c.getContext('2d');
    var rad = r * dpr;
    var cx = sizeDev / 2, cy = sizeDev / 2;
    g.save();
    g.translate(cx + rad * 0.28, cy + rad * 0.36);
    g.scale(1, 0.9);
    var grd = g.createRadialGradient(0, 0, rad * 0.5, 0, 0, rad * 1.28);
    grd.addColorStop(0, 'rgba(0,0,0,0.58)');
    grd.addColorStop(0.5, 'rgba(0,0,0,0.30)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, rad * 1.28, 0, TAU);
    g.fill();
    g.restore();
    return { canvas: c, sizeCss: sizeCss, sizeDev: sizeDev };
  };

  Renderer.prototype._getSolidSprite = function (color, r) {
    var spr = this._spr;
    if (!spr) return null;
    var entry = spr.solids[color];
    if (!entry) entry = spr.solids[color] = this._makeSphereSprite(color, r);
    return entry;
  };

  /* --------------------------------------------------------------------------
   * 球的滚动姿态（四元数积分）
   * ------------------------------------------------------------------------*/
  function rotVec(rs, vx, vy, vz, out) {
    var qx = rs.qx, qy = rs.qy, qz = rs.qz, qw = rs.qw;
    var tx = 2 * (qy * vz - qz * vy);
    var ty = 2 * (qz * vx - qx * vz);
    var tz = 2 * (qx * vy - qy * vx);
    out.x = vx + qw * tx + qy * tz - qz * ty;
    out.y = vy + qw * ty + qz * tx - qx * tz;
    out.z = vz + qw * tz + qx * ty - qy * tx;
  }

  Renderer.prototype._updateRotation = function (ball) {
    var id = ball.id || ('n' + ball.number);
    var rs = this._rot[id];
    if (!rs) {
      if (this._seed[id] == null) this._seed[id] = hashStr(id);
      rs = this._rot[id] = {
        qx: 0, qy: 0, qz: 0, qw: 1,
        px: ball.x, py: ball.y,
        roll: 0,
        seed: this._seed[id]
      };
      return rs;
    }
    var dx = ball.x - rs.px;
    var dy = ball.y - rs.py;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1.2) {
      rs.px = ball.x;
      rs.py = ball.y;
      return rs;
    }
    if (dist > 0.00006) {
      var ang = dist / this.ballRadius;
      rs.roll += ang;
      var ax = -dy / dist, ay = dx / dist;
      var half = ang * 0.5;
      var sn = Math.sin(half), cw = Math.cos(half);
      var dxq = ax * sn, dyq = ay * sn, dzq = 0, dwq = cw;
      var qx = rs.qx, qy = rs.qy, qz = rs.qz, qw = rs.qw;
      var nx = dwq * qx + dxq * qw + dyq * qz - dzq * qy;
      var ny = dwq * qy - dxq * qz + dyq * qw + dzq * qx;
      var nz = dwq * qz + dxq * qy - dyq * qx + dzq * qw;
      var nw = dwq * qw - dxq * qx - dyq * qy - dzq * qz;
      var inv = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz + nw * nw) || 1);
      rs.qx = nx * inv;
      rs.qy = ny * inv;
      rs.qz = nz * inv;
      rs.qw = nw * inv;
    }
    rs.px = ball.x;
    rs.py = ball.y;
    // 2D 回退渲染器也让停下的球慢慢把号码转回正面
    var speed = Math.sqrt((ball.vx || 0) * (ball.vx || 0) + (ball.vy || 0) * (ball.vy || 0));
    if (speed < 0.02 && dist < 0.00002) {
      rs.settle = (rs.settle || 0) + 1 / 60;
      if (rs.settle > 0.06) {
        rs.qx += (0 - rs.qx) * 0.14;
        rs.qy += (0 - rs.qy) * 0.14;
        rs.qz += (0 - rs.qz) * 0.14;
        rs.qw += (1 - rs.qw) * 0.14;
        var inv2 = 1 / (Math.sqrt(rs.qx * rs.qx + rs.qy * rs.qy + rs.qz * rs.qz + rs.qw * rs.qw) || 1);
        rs.qx *= inv2; rs.qy *= inv2; rs.qz *= inv2; rs.qw *= inv2;
      }
    } else {
      rs.settle = 0;
    }
    return rs;
  };

  /* --------------------------------------------------------------------------
   * 绘制球
   * ------------------------------------------------------------------------*/
  // 竖屏时球体高光/阴影随球台一起旋转；号码文字仍保持正向可读
  Renderer.prototype._drawSpriteRotated = function (ctx, canvas, cx, cy, size, rot) {
    if (!rot) {
      ctx.drawImage(canvas, cx - size * 0.5, cy - size * 0.5, size, size);
      return;
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.drawImage(canvas, -size * 0.5, -size * 0.5, size, size);
    ctx.restore();
  };

  /* 画球用的半径：物理半径 × 视觉系数（只影响画面，不影响碰撞）。
     当前 ballVisualScale = 1：球画出来正好等于物理直径，
     因此紧密球堆也零遮挡（用户明确要求“一点遮挡都不能有”）。
     需要放大球时改 resize 里的 ballVisualScale，并同步用摆球间距补偿。 */
  Renderer.prototype._ballDrawR = function () {
    return this.ballRadius * this.scale * (this.ballVisualScale || 1);
  };

  Renderer.prototype._drawBalls = function (world, state) {
    var ctx = this.ctx;
    var balls = world.balls || [];
    var r = this._ballDrawR();
    if (r < 0.4) return;
    if (state && typeof state.shots === 'number') {
      if (state.shots === 0 && this._lastShots > 0) this._ballSpin = {};
      this._lastShots = state.shots;
    }
    var dt = this._frameDt || 1 / 60;
    this._ballR = r;
    var spr = this._ensureBallSprites(r);
    var i, b, s, sh;
    // 自由球未落位时母球在“手里”，由 _drawBallInHand 画成半透明预览
    var inHand = !!(state && state.aim && state.aim.ballInHand);

    // 接触阴影先全部绘制（每球 1 次 drawImage）
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (!b || !b.active || b.pocketed) continue;
      if (inHand && b.number === 0) continue;
      s = this.worldToScreen(b.x, b.y);
      this._drawSpriteRotated(ctx, spr.shadow, s.x, s.y, spr.shadowCss, this.portraitRotate);
    }
    // 整球 sprite（球面+高光+描边+号码/花色）每球 1 次 drawImage
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (!b || !b.active || b.pocketed) continue;
      if (inHand && b.number === 0) continue;
      s = this.worldToScreen(b.x, b.y);
      this._drawBall(ctx, b, s.x, s.y, r, spr, dt);
    }
  };

  /* 只画号码 / 母球红点：与球体分离，便于统一压在最上层 */
  Renderer.prototype._drawBallNumber = function (ctx, ball, cx, cy, r, rs) {
    var number = ball.number || 0;
    if (number === 0) { this._drawCueMarks(ctx, cx, cy, r, rs); return; }
    var kind = ball.kind || this._kindOf(number);
    if (kind === 'stripe') this._drawStripeNumber(ctx, cx, cy, r, number, rs);
    else this._drawProjectedNumber(ctx, cx, cy, r, number, rs);
  };

  // 在 resize/初始化阶段预构建全部整球 sprite，避免第一颗球首次绘制时
  // 在游戏帧里做 16 张离屏 canvas + 字体测量，造成进入球局的一帧长卡。
  Renderer.prototype._prewarmBallSprites = function () {
    if (this.compat) return;
    var r = this._ballDrawR();
    if (!(r >= 0.4)) return;
    var spr = this._ensureBallSprites(r);
    if (spr._warmed) return;
    spr._warmed = true;
    var colors = this.ballColors || {};
    this._getBallSprite({ number: 0, kind: 'cue', color: colors[0] || '#f4eddc' }, spr, r);
    for (var n = 1; n <= 15; n++) {
      this._getBallSprite({ number: n, kind: this._kindOf(n), color: colors[n] || '#f2c230' }, spr, r);
      this._getNumberPatch(n, r, spr);
    }
  };

  Renderer.prototype._drawBall = function (ctx, ball, cx, cy, r, spr, dt) {
    var full = this._getBallSprite(ball, spr, r);
    if (!full) return;
    var st = this._getBallSpin(ball);
    var freeze = !!(window.__PROPOOL__ && window.__PROPOOL__.__freezeSpin);
    if (!freeze) this._updateBallSpin(ball, st, cx, cy, r, dt || 1 / 60);
    var q = st.q || { x: 0, y: 0, z: 0, w: 1 };
    var number = ball.number || 0;
    var kind = ball.kind || this._kindOf(number);
    if (number === 0) kind = 'cue';
    var color = ball.color || this.ballColors[number] || '#f2c230';

    // 1) 静态球体底色（不含高光/号码/花色）
    ctx.drawImage(full.canvas, cx - full.sizeCss * 0.5, cy - full.sizeCss * 0.5, full.sizeCss, full.sizeCss);

    // 2) 球面图案：花色带、号码、母球三色斑点都按实时姿态投影
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0.1, r), 0, TAU);
    ctx.clip();
    if (kind === 'stripe') this._drawStripeSurface(ctx, q, cx, cy, r, color, spr);
    if (number > 0) this._drawNumberSurface(ctx, number, q, cx, cy, r, spr);
    if (kind === 'cue') this._drawCueSpots(ctx, q, cx, cy, r);
    ctx.restore();

    // 3) 固定屏幕光源：高光/暗部/描边不随球面转
    var ov = spr.overlay;
    if (ov) {
      ctx.save();
      ctx.globalAlpha = 0.96;
      ctx.drawImage(ov.canvas, cx - ov.sizeCss * 0.5, cy - ov.sizeCss * 0.5, ov.sizeCss, ov.sizeCss);
      ctx.restore();
    }
  };

  Renderer.prototype._drawCueMarks = function (ctx, cx, cy, r, rs) {
    // 职业比赛用的“红点母球”标记：给滚动一个可见参照，避免白球看起来在平移
    var pts = [
      [0.00, 0.00, 1.00],
      [0.62, 0.18, 0.76],
      [-0.54, 0.52, 0.66]
    ];
    var v = this._v2;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var len = Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]) || 1;
      rotVec(rs, p[0] / len, p[1] / len, p[2] / len, v);
      if (v.z <= 0.08) continue;
      var a = Math.min(1, (v.z - 0.06) * 2.4);
      var rr = r * 0.052 * (0.62 + v.z * 0.55);
      var vx = v.x, vy = v.y;
      if (this.portraitRotate) {
        var mc = this._viewTransform.cos, ms = this._viewTransform.sin;
        vx = mc * v.x - ms * v.y;
        vy = ms * v.x + mc * v.y;
      }
      ctx.save();
      ctx.globalAlpha = 0.42 * a;
      ctx.fillStyle = 'rgba(176,54,48,1)';
      ctx.beginPath();
      ctx.arc(cx + r * vx * 0.93, cy + r * vy * 0.93, rr, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  };

  Renderer.prototype._drawStripe = function (ctx, cx, cy, r, color, rs) {
    var grad = this._stripeGrads[color];
    if (!grad) {
      grad = ctx.createLinearGradient(-r * 0.8, -r * 0.9, r * 0.8, r * 0.9);
      grad.addColorStop(0, shade(color, 0.34));
      grad.addColorStop(0.42, color);
      grad.addColorStop(0.8, shade(color, -0.22));
      grad.addColorStop(1, shade(color, -0.40));
      this._stripeGrads[color] = grad;
    }
    // 用四元数把球面“腰带”方向真正投影到屏幕，而不是播放假的摇摆动画
    var axis = this._v1;
    rotVec(rs, 0, 1, 0, axis);
    if (this.portraitRotate) {
      var c = this._viewTransform.cos, s = this._viewTransform.sin;
      var ax = c * axis.x - s * axis.y;
      var ay = s * axis.x + c * axis.y;
      axis.x = ax; axis.y = ay;
    }
    var bandAng = Math.atan2(axis.y, axis.x) + Math.PI * 0.5;
    var bandOff = 0;
    var bandHalf = r * 0.62;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0.5, r - 0.3), 0, TAU);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(bandAng);
    ctx.fillStyle = grad;
    ctx.fillRect(-r * 1.35, bandOff - bandHalf, r * 2.7, bandHalf * 2);
    var edgeG = ctx.createLinearGradient(0, bandOff - bandHalf, 0, bandOff + bandHalf);
    edgeG.addColorStop(0, 'rgba(0,0,0,0.20)');
    edgeG.addColorStop(0.14, 'rgba(0,0,0,0)');
    edgeG.addColorStop(0.86, 'rgba(0,0,0,0)');
    edgeG.addColorStop(1, 'rgba(0,0,0,0.20)');
    ctx.fillStyle = edgeG;
    ctx.fillRect(-r * 1.35, bandOff - bandHalf, r * 2.7, bandHalf * 2);
    ctx.restore();
  };

  /* 小球（手机竖屏球径常只有 16~24px）专用：号码不随球面转动、
   * 直接正对屏幕画一个更大的白圈 + 粗体数字，保证一眼能认出是几号球。 */
  Renderer.prototype._drawFlatNumber = function (ctx, cx, cy, r, number) {
    // 白圈只占球径 60%：球本身的颜色必须一眼看得出来（上一版白圈占到 86%，
    // 球被吃成一个"白色号码牌"，这是被批评的核心）。
    // 真实台球的号码只是球面上一块小圆（约球径 38~42%），
    // 旧版 52% + 粗黑大字把球色吃光了，看起来像"号码筹码"。
    var smallBall = r < 11;
    var dr = Math.max(2.6, r * (smallBall ? 0.35 : 0.50));
    ctx.beginPath();
    ctx.arc(cx, cy, dr, 0, TAU);
    // 号圈不是纯白按钮：略带暖白 + 细暖描边，看起来像印在球面上
    ctx.fillStyle = '#f4eedf';
    ctx.fill();
    ctx.strokeStyle = 'rgba(74,56,30,0.28)';
    ctx.lineWidth = Math.max(0.4, r * 0.035);
    ctx.stroke();
    var fs = Math.max(5.5, r * (smallBall ? 0.60 : 0.88));
    if (number > 9) fs *= 0.88;
    ctx.fillStyle = '#262626';
    ctx.font = '600 ' + fs.toFixed(2) + 'px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), cx, cy + fs * 0.04);
  };

  Renderer.prototype._drawStripeNumber = function (ctx, cx, cy, r, number, rs) {
    var pole = this._v1;
    rotVec(rs, 0, 0, 1, pole);
    if (pole.z <= 0.12) return;
    // 球径小于 36px 时透视号码会歪到球的一侧、看起来像"贴了张白纸"，
    // 直接用正对屏幕的居中号圈（真实台球号码本来就是球面上的一块圆）。
    if (r < 18) {
      ctx.save();
      ctx.globalAlpha = clamp01((pole.z - 0.14) / 0.24);
      this._drawFlatNumber(ctx, cx, cy, r, number);
      ctx.restore();
      return;
    }
    if (this.portraitRotate) {
      var pc = this._viewTransform.cos, ps = this._viewTransform.sin;
      var px0 = pc * pole.x - ps * pole.y;
      var py0 = ps * pole.x + pc * pole.y;
      pole.x = px0; pole.y = py0;
    }
    var nx = cx + r * pole.x * 0.93;
    var ny = cy + r * pole.y * 0.93;
    var shrink = 0.55 + 0.45 * Math.max(0, pole.z);
    var rr = r * 0.46 * shrink;
    ctx.save();
    ctx.beginPath();
    ctx.arc(nx, ny, rr, 0, TAU);
    ctx.fillStyle = '#f8f3e6';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.20)';
    ctx.lineWidth = Math.max(0.6, r * 0.026);
    ctx.stroke();
    var fs = rr * 1.42;
    ctx.fillStyle = '#101010';
    ctx.font = '800 ' + fs.toFixed(2) + 'px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), nx, ny + fs * 0.045);
    ctx.restore();
  };

  Renderer.prototype._drawProjectedNumber = function (ctx, cx, cy, r, number, rs) {
    var pole = this._v1;
    rotVec(rs, 0, 0, 1, pole);
    var nz = pole.z;
    if (nz <= 0.12) return;
    if (r < 18) {
      ctx.save();
      ctx.globalAlpha = clamp01((nz - 0.14) / 0.24);
      this._drawFlatNumber(ctx, cx, cy, r, number);
      ctx.restore();
      return;
    }
    if (this.portraitRotate) {
      var pc0 = this._viewTransform.cos, ps0 = this._viewTransform.sin;
      var px1 = pc0 * pole.x - ps0 * pole.y;
      var py1 = ps0 * pole.x + pc0 * pole.y;
      pole.x = px1; pole.y = py1;
    }
    var alphaDisc = clamp01((nz - 0.10) / 0.18);
    var alphaText = clamp01((nz - 0.34) / 0.26);
    var A = 0.58;
    var sinA = Math.sin(A), cosA = Math.cos(A);
    var ex = cx + r * cosA * pole.x;
    var ey = cy + r * cosA * pole.y;
    var rot = Math.atan2(pole.y, pole.x);
    var rAlong = Math.max(0.4, r * sinA * Math.max(0.10, nz));
    var rPerp = r * sinA;
    ctx.save();
    // 号码圈必须裁剪在球面内，避免旋转时溢出
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0.5, r - 0.4), 0, TAU);
    ctx.clip();
    ctx.globalAlpha = alphaDisc;
    ctx.beginPath();
    ctx.ellipse(ex, ey, rAlong, rPerp, rot, 0, TAU);
    ctx.fillStyle = '#f6f1e3';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = Math.max(0.6, r * 0.024);
    ctx.stroke();
    if (alphaText > 0.02) {
      ctx.globalAlpha = alphaText;
      var fs = r * 0.74 * (0.76 + 0.24 * nz);
      ctx.fillStyle = '#0e0e0e';
      ctx.font = '800 ' + fs.toFixed(2) + 'px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(number), ex, ey + fs * 0.04);
    }
    ctx.restore();
  };

  /* --------------------------------------------------------------------------
   * 球杆
   * ------------------------------------------------------------------------*/
  Renderer.prototype._updateCueGeom = function (aim, cueBall, def) {
    var g = this._cueGeom;
    var settings = this.config.settings || {};
    var R = this._ballDrawR();
    var L = (settings.cueLength || 1.45) * this.scale;
    var power = clamp01(typeof aim.power === 'number' ? aim.power : 0);
    var gap = ((settings.cueGap || 0.035) + power * 0.22) * this.scale;
    var visual = this._getCueVisual(def);
    // 不同 profile 的锥度（相对球半径）：tip / ferrule / joint / butt
    var PROFILE_W = {
      classic: [0.20, 0.235, 0.33, 0.50],
      taper:   [0.17, 0.21, 0.30, 0.55],
      faceted: [0.20, 0.25, 0.38, 0.52],
      rod:     [0.155, 0.18, 0.23, 0.32],
      pistol:  [0.20, 0.24, 0.34, 0.58],
      wand:    [0.16, 0.20, 0.27, 0.40],
      golf:    [0.23, 0.27, 0.40, 0.58]
    };
    var pw = PROFILE_W[visual.profile] || PROFILE_W.classic;
    g.valid = true;
    g.angle = (typeof aim.angle === 'number' && isFinite(aim.angle)) ? aim.angle : 0;
    g.xTip = R + gap;
    g.xTipEnd = g.xTip + Math.max(2, 0.006 * this.scale);
    g.xFerEnd = g.xTipEnd + Math.max(2.5, 0.012 * this.scale);
    g.xJoint = g.xTip + L * 0.605;
    g.xWrapEnd = g.xTip + L * 0.775;
    g.xButt = g.xTip + L;
    g.wTip = Math.max(2.2, R * pw[0]);
    g.wFer = Math.max(2.4, R * pw[1]);
    g.wJoint = Math.max(3.2, R * pw[2]);
    g.wButt = Math.max(4.4, R * pw[3]);
    g.visual = visual;
    return g;
  };

  function cueHalfAt(g, x) {
    if (x <= g.xFerEnd) {
      return lerp(g.wTip, g.wFer, (x - g.xTip) / Math.max(0.001, g.xFerEnd - g.xTip));
    }
    if (x <= g.xJoint) {
      return lerp(g.wFer, g.wJoint, (x - g.xFerEnd) / Math.max(0.001, g.xJoint - g.xFerEnd));
    }
    return lerp(g.wJoint, g.wButt, (x - g.xJoint) / Math.max(0.001, g.xButt - g.xJoint));
  }

  Renderer.prototype._cueSilhouette = function (ctx, g, widen) {
    var w = widen || 1;
    var steps = 18;
    var i, x, h;
    ctx.beginPath();
    for (i = 0; i <= steps; i++) {
      x = lerp(g.xTip, g.xButt, i / steps);
      h = cueHalfAt(g, x) * w;
      if (i === 0) ctx.moveTo(x, -h);
      else ctx.lineTo(x, -h);
    }
    for (i = steps; i >= 0; i--) {
      x = lerp(g.xTip, g.xButt, i / steps);
      h = cueHalfAt(g, x) * w;
      ctx.lineTo(x, h);
    }
    ctx.closePath();
  };

  Renderer.prototype._cueSegPath = function (ctx, xa, xb, wa, wb) {
    ctx.beginPath();
    ctx.moveTo(xa, -wa);
    ctx.lineTo(xb, -wb);
    ctx.lineTo(xb, wb);
    ctx.lineTo(xa, wa);
    ctx.closePath();
  };

  // 只缓存固定几何/颜色的渐变；坐标都在球杆局部空间，跨帧可安全复用。
  // 缓存上限 128，resize / 换杆时由 _invalidateCaches 清空。
  Renderer.prototype._cachedGradient = function (key, factory) {
    var hit = this._gradCache[key];
    if (hit) return hit;
    if (this._gradCacheCount > 128) {
      this._gradCache = {};
      this._gradCacheCount = 0;
    }
    var gr = factory();
    this._gradCache[key] = gr;
    this._gradCacheCount++;
    return gr;
  };

  Renderer.prototype._cylGradient = function (ctx, wMax, base) {
    if (ctx !== this.ctx) {
      var raw = ctx.createLinearGradient(0, -wMax, 0, wMax);
      raw.addColorStop(0, shade(base, 0.50));
      raw.addColorStop(0.16, shade(base, 0.24));
      raw.addColorStop(0.46, base);
      raw.addColorStop(0.74, shade(base, -0.28));
      raw.addColorStop(1, shade(base, -0.62));
      return raw;
    }
    var key = 'cyl|' + wMax.toFixed(2) + '|' + base;
    return this._cachedGradient(key, function () {
      var gr = ctx.createLinearGradient(0, -wMax, 0, wMax);
      gr.addColorStop(0, shade(base, 0.50));
      gr.addColorStop(0.16, shade(base, 0.24));
      gr.addColorStop(0.46, base);
      gr.addColorStop(0.74, shade(base, -0.28));
      gr.addColorStop(1, shade(base, -0.62));
      return gr;
    });
  };

  // 金属接环：横向渐变 + 上缘高光 / 下缘暗边
  Renderer.prototype._drawMetalBand = function (ctx, x, halfWidth, thickness, color) {
    var t = Math.max(1, thickness);
    var gr;
    if (ctx === this.ctx) {
      var key = 'mb|' + x.toFixed(2) + '|' + t.toFixed(2) + '|' + color;
      gr = this._cachedGradient(key, function () {
        var g2 = ctx.createLinearGradient(x - t * 0.5, 0, x + t * 0.5, 0);
        g2.addColorStop(0, shade(color, -0.48));
        g2.addColorStop(0.22, shade(color, 0.55));
        g2.addColorStop(0.48, color);
        g2.addColorStop(0.78, shade(color, -0.18));
        g2.addColorStop(1, shade(color, -0.62));
        return g2;
      });
    } else {
      gr = ctx.createLinearGradient(x - t * 0.5, 0, x + t * 0.5, 0);
      gr.addColorStop(0, shade(color, -0.48));
      gr.addColorStop(0.22, shade(color, 0.55));
      gr.addColorStop(0.48, color);
      gr.addColorStop(0.78, shade(color, -0.18));
      gr.addColorStop(1, shade(color, -0.62));
    }
    ctx.fillStyle = gr;
    ctx.fillRect(x - t * 0.5, -halfWidth, t, halfWidth * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.fillRect(x - t * 0.5, -halfWidth, t, Math.max(0.5, halfWidth * 0.055));
    ctx.fillStyle = 'rgba(0,0,0,0.26)';
    ctx.fillRect(x - t * 0.5, halfWidth * 0.88, t, Math.max(0.5, halfWidth * 0.10));
  };

  // 装饰母题：diamond / chevron / dot / star / none
  Renderer.prototype._drawAccentShape = function (ctx, x, size, kind, color) {
    if (!kind || kind === 'none') return;
    var s = Math.max(3, size);
    var gr;
    if (ctx === this.ctx) {
      var key = 'ac|' + x.toFixed(2) + '|' + s.toFixed(2) + '|' + kind + '|' + color;
      gr = this._cachedGradient(key, function () {
        var g2 = ctx.createLinearGradient(x - s, -s, x + s, s);
        g2.addColorStop(0, shade(color, 0.62));
        g2.addColorStop(0.42, shade(color, 0.12));
        g2.addColorStop(0.72, shade(color, -0.18));
        g2.addColorStop(1, shade(color, -0.52));
        return g2;
      });
    } else {
      gr = ctx.createLinearGradient(x - s, -s, x + s, s);
      gr.addColorStop(0, shade(color, 0.62));
      gr.addColorStop(0.42, shade(color, 0.12));
      gr.addColorStop(0.72, shade(color, -0.18));
      gr.addColorStop(1, shade(color, -0.52));
    }
    ctx.save();
    if (kind === 'diamond') {
      ctx.translate(x, 0);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = gr;
      ctx.fillRect(-s * 0.62, -s * 0.62, s * 1.24, s * 1.24);
      ctx.strokeStyle = 'rgba(20,12,6,0.45)';
      ctx.lineWidth = Math.max(0.6, s * 0.10);
      ctx.strokeRect(-s * 0.62, -s * 0.62, s * 1.24, s * 1.24);
    } else if (kind === 'chevron') {
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(x - s, -s * 0.52);
      ctx.lineTo(x, s * 0.34);
      ctx.lineTo(x + s, -s * 0.52);
      ctx.lineTo(x + s * 0.56, -s * 0.88);
      ctx.lineTo(x, -s * 0.16);
      ctx.lineTo(x - s * 0.56, -s * 0.88);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'dot') {
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(x, 0, s * 0.58, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,250,232,0.55)';
      ctx.beginPath();
      ctx.arc(x - s * 0.16, -s * 0.20, s * 0.16, 0, TAU);
      ctx.fill();
    } else if (kind === 'star') {
      ctx.fillStyle = gr;
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var ra = (i % 2 === 0) ? s * 0.92 : s * 0.30;
        var aa = -Math.PI / 2 + i * Math.PI / 4;
        var xx = x + Math.cos(aa) * ra;
        var yy = Math.sin(aa) * ra;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,250,232,0.38)';
      ctx.beginPath();
      ctx.arc(x, 0, s * 0.16, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  // 握把纹理：linen / leather / rings / knurl / weave
  Renderer.prototype._drawWrapTexture = function (ctx, g, style, colors, hJoint, hWrapEnd) {
    var x0 = g.xJoint, x1 = g.xWrapEnd;
    var halfWidth = hWrapEnd;
    var x, k;
    ctx.save();
    this._cueSegPath(ctx, x0, x1, hJoint, hWrapEnd);
    ctx.clip();
    if (style === 'linen') {
      ctx.lineWidth = Math.max(0.5, halfWidth * 0.045);
      ctx.strokeStyle = 'rgba(0,0,0,0.20)';
      for (x = x0; x < x1; x += 2.1) {
        ctx.beginPath(); ctx.moveTo(x, -halfWidth); ctx.lineTo(x + 0.4, halfWidth); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,238,206,0.10)';
      for (k = -halfWidth; k < halfWidth; k += Math.max(1.5, halfWidth * 0.28)) {
        ctx.beginPath(); ctx.moveTo(x0, k); ctx.lineTo(x1, k + 0.4); ctx.stroke();
      }
    } else if (style === 'leather') {
      // 皮革：宽幅不规则明暗 + 纤维走向
      for (x = x0 + 1; x < x1; x += 3.4) {
        var n = Math.sin(x * 0.19) * 0.5 + Math.sin(x * 0.073 + 1.4) * 0.5;
        ctx.strokeStyle = n > 0 ? 'rgba(255,232,198,0.055)' : 'rgba(0,0,0,0.14)';
        ctx.lineWidth = Math.max(1, halfWidth * 0.22);
        ctx.beginPath(); ctx.moveTo(x, -halfWidth); ctx.lineTo(x + n * 0.8, halfWidth); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = Math.max(0.6, halfWidth * 0.05);
      for (k = 0; k < 4; k++) {
        var yy = -halfWidth + (halfWidth * 2) * ((k + 0.5) / 4);
        ctx.beginPath(); ctx.moveTo(x0, yy + Math.sin(x0 * 0.1 + k) * 0.8); ctx.lineTo(x1, yy + Math.sin(x1 * 0.1 + k) * 0.8); ctx.stroke();
      }
    } else if (style === 'rings') {
      for (x = x0; x < x1; x += 2.5) {
        var idx = Math.round((x - x0) / 2.5);
        ctx.strokeStyle = (idx % 2 === 0) ? 'rgba(0,0,0,0.26)' : 'rgba(255,236,200,0.10)';
        ctx.lineWidth = Math.max(0.6, halfWidth * 0.11);
        ctx.beginPath(); ctx.moveTo(x, -halfWidth); ctx.lineTo(x, halfWidth); ctx.stroke();
      }
    } else if (style === 'knurl') {
      ctx.lineWidth = Math.max(0.55, halfWidth * 0.06);
      ctx.strokeStyle = 'rgba(255,240,214,0.11)';
      for (x = x0 - halfWidth; x < x1; x += 3.0) {
        ctx.beginPath(); ctx.moveTo(x, -halfWidth); ctx.lineTo(x + halfWidth * 2, halfWidth); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.20)';
      for (x = x0 - halfWidth; x < x1; x += 3.0) {
        ctx.beginPath(); ctx.moveTo(x, halfWidth); ctx.lineTo(x + halfWidth * 2, -halfWidth); ctx.stroke();
      }
    } else if (style === 'weave') {
      ctx.lineWidth = Math.max(0.7, halfWidth * 0.09);
      for (x = x0 - halfWidth; x < x1; x += 3.2) {
        ctx.strokeStyle = ((Math.round((x - x0) / 3.2) % 2) === 0) ? 'rgba(255,236,202,0.12)' : 'rgba(0,0,0,0.18)';
        ctx.beginPath(); ctx.moveTo(x, -halfWidth); ctx.lineTo(x + halfWidth * 2, halfWidth); ctx.stroke();
      }
    }
    ctx.restore();
  };

  Renderer.prototype._drawCueShadow = function (aim, cueBall) {
    var ctx = this.ctx;
    var g = this._cueGeom;
    if (!g.valid) return;
    var p0 = this.worldToScreen(cueBall.x, cueBall.y);
    ctx.save();
    // 用多层低透明度轮廓近似软阴影，避免出现一条生硬黑边
    var layers = [
      { ox: 3.0, oy: 5.0, w: 1.14, a: 0.07 },
      { ox: 4.5, oy: 7.5, w: 1.06, a: 0.09 },
      { ox: 6.0, oy: 10.0, w: 1.00, a: 0.10 }
    ];
    for (var li = 0; li < layers.length; li++) {
      var ly = layers[li];
      ctx.save();
      ctx.translate(p0.x + ly.ox, p0.y + ly.oy);
      ctx.rotate(g.angle + Math.PI + this.portraitRotate);
      this._cueSilhouette(ctx, g, ly.w);
      ctx.fillStyle = 'rgba(0,0,0,' + ly.a + ')';
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  Renderer.prototype._drawCue = function (state, aim, cueBall) {
    var ctx = this.ctx;
    var g = this._cueGeom;
    if (!g.valid) return;
    var def = this._getCueDef(state);
    var colors = def.colors || FALLBACK_CONFIG.cues[0].colors;
    var pattern = def.pattern || 'oak';
    var visual = this._getCueVisual(def);
    var profile = visual.profile;
    var p0 = this.worldToScreen(cueBall.x, cueBall.y);
    var hTip = cueHalfAt(g, g.xTip);
    var hFer = cueHalfAt(g, g.xFerEnd);
    var hJoint = cueHalfAt(g, g.xJoint);
    var hWrapEnd = cueHalfAt(g, g.xWrapEnd);
    var hButt = cueHalfAt(g, g.xButt);

    ctx.save();
    ctx.translate(p0.x, p0.y);
    ctx.rotate(g.angle + Math.PI + this.portraitRotate);

    // 杆身
    var shaftGrad = this._cylGradient(ctx, Math.max(hFer, hJoint), colors.shaft);
    this._cueSegPath(ctx, g.xFerEnd, g.xJoint, hFer, hJoint);
    ctx.fillStyle = shaftGrad;
    ctx.fill();

    // 木纹 / 碳纤纹理
    ctx.save();
    this._cueSegPath(ctx, g.xFerEnd, g.xJoint, hFer, hJoint);
    ctx.clip();
    if (pattern === 'carbon') {
      ctx.strokeStyle = 'rgba(255,255,255,0.055)';
      ctx.lineWidth = 0.8;
      for (var cx1 = g.xFerEnd; cx1 < g.xJoint; cx1 += 4.5) {
        ctx.beginPath();
        ctx.moveTo(cx1, -hJoint);
        ctx.lineTo(cx1 + 3.2, hJoint);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx1 + 3.2, -hJoint);
        ctx.lineTo(cx1, hJoint);
        ctx.stroke();
      }
    } else {
      for (var gi = 0; gi < 14; gi++) {
        var gy = lerp(-hJoint, hJoint, (gi + 0.5) / 14);
        ctx.beginPath();
        ctx.moveTo(g.xFerEnd, gy * 0.82);
        ctx.quadraticCurveTo(lerp(g.xFerEnd, g.xJoint, 0.5), gy * 1.06, g.xJoint, gy);
        ctx.strokeStyle = (gi % 2 === 0) ? 'rgba(46,24,8,0.46)' : 'rgba(255,246,222,0.24)';
        ctx.lineWidth = Math.max(0.7, hJoint * 0.11);
        ctx.stroke();
      }
      // 前节沿长度方向的色温变化
      var tint = this._cachedGradient('tint|' + g.xFerEnd.toFixed(1) + '|' + g.xJoint.toFixed(1), function () {
        var t2 = ctx.createLinearGradient(g.xFerEnd, 0, g.xJoint, 0);
        t2.addColorStop(0, 'rgba(255,244,220,0.07)');
        t2.addColorStop(0.55, 'rgba(120,74,36,0.03)');
        t2.addColorStop(1, 'rgba(70,40,16,0.12)');
        return t2;
      });
      ctx.fillStyle = tint;
      ctx.fillRect(g.xFerEnd, -hJoint, g.xJoint - g.xFerEnd, hJoint * 2);
    }
    // profile 造型差异：切面 / 细杆金属环
    if (profile === 'faceted') {
      for (var fi = 1; fi <= 5; fi++) {
        var fyy = -hJoint + (hJoint * 2) * (fi / 6);
        ctx.strokeStyle = (fi % 2 === 0) ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.18)';
        ctx.lineWidth = Math.max(0.7, hJoint * 0.06);
        ctx.beginPath();
        ctx.moveTo(g.xFerEnd, fyy * 0.94);
        ctx.lineTo(g.xJoint, fyy);
        ctx.stroke();
      }
    } else if (profile === 'rod') {
      for (var rb = 0; rb < 3; rb++) {
        var rbx = lerp(g.xFerEnd, g.xJoint, 0.24 + rb * 0.24);
        this._drawMetalBand(ctx, rbx, hJoint, Math.max(1.2, hJoint * 0.20), colors.accent);
      }
    }
    ctx.restore();

    // 皮头
    var tipGrad = this._cylGradient(ctx, hTip, colors.tip);
    this._cueSegPath(ctx, g.xTip, g.xTipEnd, hTip, hTip * 0.98);
    ctx.fillStyle = tipGrad;
    ctx.fill();

    // 先角 / 铜箍
    var ferGrad = this._cylGradient(ctx, hFer, '#efe7d4');
    this._cueSegPath(ctx, g.xTipEnd, g.xFerEnd, hFer * 0.99, hFer);
    ctx.fillStyle = ferGrad;
    ctx.fill();

    // 杆头金属环（由 visual.tipRing 控制）
    if (visual.tipRing) {
      this._drawMetalBand(
        ctx,
        g.xTipEnd + Math.max(1, (g.xFerEnd - g.xTipEnd) * 0.18),
        hFer * 0.99,
        Math.max(1.1, hFer * 0.22),
        colors.accent
      );
    }

    // 接环：single / double / none
    if (visual.joint === 'double') {
      var jGap = Math.max(1.5, hJoint * 0.55);
      this._drawMetalBand(ctx, g.xJoint - jGap, hJoint, Math.max(1.4, hJoint * 0.24), colors.accent);
      this._drawMetalBand(ctx, g.xJoint + jGap, hJoint, Math.max(1.4, hJoint * 0.24), colors.accent);
    } else if (visual.joint === 'single') {
      this._drawMetalBand(ctx, g.xJoint, hJoint, Math.max(1.6, hJoint * 0.28), colors.accent);
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.24)';
      ctx.lineWidth = Math.max(0.7, hJoint * 0.12);
      ctx.beginPath(); ctx.moveTo(g.xJoint, -hJoint); ctx.lineTo(g.xJoint, hJoint); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,246,222,0.10)';
      ctx.lineWidth = Math.max(0.6, hJoint * 0.06);
      ctx.beginPath(); ctx.moveTo(g.xJoint + 0.8, -hJoint); ctx.lineTo(g.xJoint + 0.8, hJoint); ctx.stroke();
    }

    // 握把
    var wrapGrad = this._cylGradient(ctx, Math.max(hJoint, hWrapEnd), colors.wrap);
    this._cueSegPath(ctx, g.xJoint, g.xWrapEnd, hJoint, hWrapEnd);
    ctx.fillStyle = wrapGrad;
    ctx.fill();
    this._drawWrapTexture(ctx, g, visual.wrapStyle, colors, hJoint, hWrapEnd);

    // 尾段
    var buttGrad = this._cylGradient(ctx, Math.max(hWrapEnd, hButt), colors.butt);
    this._cueSegPath(ctx, g.xWrapEnd, g.xButt, hWrapEnd, hButt);
    ctx.fillStyle = buttGrad;
    ctx.fill();

    // 尾段装饰（按 visual.accentShape 差异化，不使用任何第三方具体造型）
    ctx.save();
    this._cueSegPath(ctx, g.xWrapEnd, g.xButt, hWrapEnd, hButt);
    ctx.clip();
    var buttSpan = g.xButt - g.xWrapEnd;
    // 基础纹理：碳纤斜纹 / 木料纵向丝纹
    if (pattern === 'carbon') {
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      for (var ci = g.xWrapEnd; ci < g.xButt; ci += 5) {
        ctx.beginPath();
        ctx.moveTo(ci, -hButt);
        ctx.lineTo(ci + 2, hButt);
        ctx.stroke();
      }
    } else {
      for (var ri = 0; ri < 4; ri++) {
        var ryy = lerp(-hButt, hButt, (ri + 0.5) / 4);
        ctx.beginPath();
        ctx.moveTo(g.xWrapEnd, ryy * 0.85);
        ctx.quadraticCurveTo(g.xWrapEnd + buttSpan * 0.5, ryy * 1.06, g.xButt, ryy);
        ctx.strokeStyle = (ri % 2 === 0) ? 'rgba(0,0,0,0.18)' : 'rgba(255,238,206,0.10)';
        ctx.lineWidth = Math.max(0.7, hButt * 0.08);
        ctx.stroke();
      }
    }
    // 尾段接环
    this._drawMetalBand(ctx, g.xWrapEnd + buttSpan * 0.10, hButt, Math.max(1.3, hButt * 0.17), colors.accent);
    // 装饰母题
    if (visual.accentShape && visual.accentShape !== 'none') {
      var ax0 = g.xWrapEnd + buttSpan * 0.34;
      var ax1 = g.xButt - buttSpan * 0.20;
      for (var ai = 0; ai < 3; ai++) {
        this._drawAccentShape(ctx, lerp(ax0, ax1, ai / 2), hButt * 0.62, visual.accentShape, colors.accent);
      }
    }
    // 尾端金属环
    this._drawMetalBand(ctx, g.xButt - buttSpan * 0.10, hButt, Math.max(1.2, hButt * 0.20), colors.accent);
    ctx.restore();

    // 异形球杆装饰：按 visual.profile 追加结构（钓竿卷线器 / 枪柄 / 魔杖星辉 / 高尔夫杆头）
    this._drawCueDeco(ctx, g, profile, colors, hTip, hButt);

    // 纵向高光与下缘暗边
    ctx.beginPath();
    ctx.moveTo(g.xTip, -hTip * 0.42);
    ctx.lineTo(g.xButt, -hButt * 0.42);
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = Math.max(0.8, hTip * 0.22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(g.xFerEnd, hJoint * 0.78);
    ctx.lineTo(g.xButt, hButt * 0.80);
    ctx.strokeStyle = 'rgba(20,10,4,0.28)';
    ctx.lineWidth = Math.max(0.8, hTip * 0.24);
    ctx.stroke();

    // 轮廓
    this._cueSilhouette(ctx, g, 1);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  };

  Renderer.prototype._drawCueDeco = function (ctx, g, shape, colors, hTip, hButt) {
    if (!shape || shape === 'classic') return;
    ctx.save();
    if (shape === 'rod') {
      var rx = g.xTip + (g.xButt - g.xTip) * 0.72;
      var rr = Math.max(6, hButt * 4.2);
      ctx.translate(rx, 0);
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = Math.max(1.2, hButt * 0.42);
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(8,18,22,0.72)';
      ctx.beginPath(); ctx.arc(0, 0, rr * 0.62, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(220,242,236,0.55)';
      ctx.lineWidth = Math.max(0.8, hButt * 0.22);
      ctx.beginPath(); ctx.arc(0, 0, rr * 0.72, -0.9, 1.7); ctx.stroke();
      ctx.fillStyle = colors.accent;
      ctx.beginPath(); ctx.arc(0, 0, Math.max(1.2, hButt * 0.55), 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(220,242,236,0.32)';
      ctx.lineWidth = Math.max(0.7, hButt * 0.15);
      ctx.beginPath(); ctx.moveTo(rr * 0.7, -hButt * 0.6); ctx.lineTo(rr * 1.7, -hButt * 2.0); ctx.stroke();
    } else if (shape === 'pistol') {
      var bx = g.xTip + (g.xButt - g.xTip) * 0.72;
      ctx.translate(bx, 0);
      ctx.rotate(0.62);
      ctx.fillStyle = colors.butt;
      ctx.strokeStyle = 'rgba(220,205,170,0.28)';
      ctx.lineWidth = Math.max(1, hButt * 0.18);
      ctx.beginPath();
      ctx.moveTo(-hButt * 0.7, -hButt * 1.1);
      ctx.lineTo(hButt * 1.3, -hButt * 0.4);
      ctx.lineTo(hButt * 1.1, hButt * 5.6);
      ctx.lineTo(-hButt * 0.4, hButt * 5.0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = Math.max(1.2, hButt * 0.25);
      ctx.beginPath(); ctx.arc(hButt * 0.2, hButt * 1.4, hButt * 1.3, 0.1, Math.PI - 0.1); ctx.stroke();
      ctx.fillStyle = 'rgba(10,10,12,0.65)';
      ctx.fillRect(-hButt * 0.4, -hButt * 1.8, hButt * 1.6, hButt * 0.5);
    } else if (shape === 'wand') {
      var wx = g.xTip + (g.xButt - g.xTip) * 0.74;
      ctx.translate(wx, 0);
      ctx.rotate(Math.PI / 4);
      var st = Math.max(7, hButt * 3.0);
      ctx.shadowColor = 'rgba(228,184,92,0.55)';
      ctx.shadowBlur = 9;
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var ra = i % 2 ? st * 0.34 : st;
        var aa = -Math.PI / 2 + i * Math.PI / 4;
        var xx = Math.cos(aa) * ra, yy = Math.sin(aa) * ra;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,246,210,0.82)';
      ctx.beginPath(); ctx.arc(0, 0, st * 0.26, 0, TAU); ctx.fill();
    } else if (shape === 'golf') {
      var gx = g.xTip + (g.xButt - g.xTip) * 0.88;
      var hh = Math.max(10, hTip * 6.0);
      ctx.translate(gx, 0);
      ctx.rotate(-0.18);
      // 明显的推杆杆头：横向大块金属头 + 深色轮廓
      ctx.fillStyle = colors.shaft;
      ctx.strokeStyle = 'rgba(22,34,26,0.72)';
      ctx.lineWidth = Math.max(1.4, hTip * 0.28);
      ctx.beginPath();
      ctx.moveTo(-hh * 0.40, -hh * 0.55);
      ctx.lineTo(hh * 0.55, -hh * 0.42);
      ctx.lineTo(hh * 0.72, hh * 0.18);
      ctx.lineTo(hh * 0.20, hh * 0.55);
      ctx.lineTo(-hh * 0.45, hh * 0.40);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(-hh * 0.24, -hh * 0.22, hh * 0.48, Math.max(1.5, hh * 0.08));
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = Math.max(1, hTip * 0.20);
      ctx.beginPath(); ctx.moveTo(-hh * 0.25, hh * 0.18); ctx.lineTo(hh * 0.35, hh * 0.10); ctx.stroke();
    }
    ctx.restore();
  };

  /* --------------------------------------------------------------------------
   * 特效：粒子 / 光环 / 落袋闪光 / 彩带
   * ------------------------------------------------------------------------*/
  Renderer.prototype._drawTableFx = function () {
    var ctx = this.ctx;
    var i, s, size, alpha, prog;
    var pf = this._pocketFx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < pf.length; i++) {
      var f = pf[i];
      if (!f.alive) continue;
      prog = 1 - f.life / f.max;
      alpha = Math.pow(f.life / f.max, 1.3) * 0.62;
      s = this.worldToScreen(f.x, f.y);
      size = f.size * this.scale * (1.9 + prog * 2.3);
      if (size < 1) continue;
      ctx.globalAlpha = alpha;
      ctx.drawImage(this._fx.glowWarm, s.x - size * 0.5, s.y - size * 0.5, size, size);
    }
    // 触摸端跳过库边第二层柔光：它是纯叠加 fill-rate，视觉信息量最低；
    // 袋口闪光（pocketFx）保留，保证进球反馈不被削弱。
    if (!this._touchUi) {
      var rf = this._railFx;
      for (i = 0; i < rf.length; i++) {
        var r = rf[i];
        if (!r.alive) continue;
        prog = 1 - r.life / r.max;
        alpha = Math.pow(r.life / r.max, 1.6) * 0.6;
        s = this.worldToScreen(r.x, r.y);
        size = r.size * this.scale * (1.0 + prog * 0.8);
        if (size < 1) continue;
        ctx.globalAlpha = alpha;
        ctx.drawImage(this._fx.glowWarm, s.x - size * 0.5, s.y - size * 0.5, size, size);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  Renderer.prototype._drawParticles = function () {
    var ctx = this.ctx;
    var ps = this._particles;
    var scale = this.scale;
    var i, p, s, size, alpha, lifeT, prog;
    // 尘土
    for (i = 0; i < ps.length; i++) {
      p = ps[i];
      if (!p.alive || p.kind !== 0) continue;
      lifeT = p.life / p.max;
      alpha = Math.pow(lifeT, 1.25) * p.alpha;
      if (alpha <= 0.015) continue;
      s = this.worldToScreen(p.x, p.y);
      size = Math.max(1.6, (p.size + p.grow * (1 - lifeT) * 4) * scale);
      ctx.globalAlpha = alpha;
      ctx.drawImage(p.spr === 1 ? this._fx.dustGreen : this._fx.dustWarm, s.x - size * 0.5, s.y - size * 0.5, size, size);
    }
    // 火花（叠加发光）：触摸端给叠加层设硬预算，避免开球瞬间几十个
    // 'lighter' 精灵同时刷屏；形状/亮度不变，只是限制同帧叠加数量。
    ctx.globalCompositeOperation = 'lighter';
    var sparkDrawn = 0;
    var sparkBudget = this._touchUi ? 64 : ps.length;
    for (i = 0; i < ps.length; i++) {
      p = ps[i];
      if (!p.alive || p.kind !== 1) continue;
      lifeT = p.life / p.max;
      alpha = Math.pow(lifeT, 1.1) * 0.9;
      if (alpha <= 0.015) continue;
      if (sparkDrawn >= sparkBudget) continue;
      sparkDrawn++;
      s = this.worldToScreen(p.x, p.y);
      size = Math.max(2.2, (p.size + p.grow * (1 - lifeT) * 5) * scale);
      ctx.globalAlpha = alpha;
      ctx.drawImage(this._fx.spark, s.x - size * 0.5, s.y - size * 0.5, size, size);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // 扩散光环
    ctx.save();
    for (i = 0; i < this._rings.length; i++) {
      var rg = this._rings[i];
      if (!rg.alive) continue;
      lifeT = rg.life / rg.max;
      prog = 1 - lifeT;
      var rad = lerp(rg.r0, rg.r1, prog);
      s = this.worldToScreen(rg.x, rg.y);
      ctx.strokeStyle = 'rgba(' + rg.color + ',' + (lifeT * 0.55).toFixed(3) + ')';
      ctx.lineWidth = rg.w;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(0.5, rad * scale), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  };

  Renderer.prototype._drawConfetti = function () {
    var ctx = this.ctx;
    var cf = this._confetti;
    var any = false;
    var drawn = 0;
    var drawBudget = this._touchUi ? 70 : cf.length;
    for (var i = 0; i < cf.length; i++) {
      var c = cf[i];
      if (!c.alive) continue;
      if (drawn >= drawBudget) continue;
      drawn++;
      any = true;
      var lifeT = c.life / c.max;
      var alpha = lifeT > 0.82 ? (1 - lifeT) / 0.18 : lifeT / 0.82;
      ctx.globalAlpha = clamp01(alpha);
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w * 0.5, -c.h * 0.5, c.w, c.h);
      ctx.restore();
    }
    if (any) ctx.globalAlpha = 1;
  };

  Renderer.prototype._spawnDust = function (x, y, count, spr) {
    var pool = this._particles;
    for (var k = 0; k < count; k++) {
      var p = null;
      for (var t = 0; t < pool.length; t++) {
        var idx = (this._pCursor + t) % pool.length;
        if (!pool[idx].alive) {
          p = pool[idx];
          this._pCursor = (idx + 1) % pool.length;
          break;
        }
      }
      if (!p) return;
      var ang = Math.random() * TAU;
      var spd = rand(0.02, 0.16);
      p.alive = true;
      p.kind = 0;
      p.x = x + rand(-0.008, 0.008);
      p.y = y + rand(-0.008, 0.008);
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd;
      p.max = rand(0.30, 0.65);
      p.life = p.max;
      p.size = rand(0.010, 0.028);
      p.grow = rand(0.02, 0.06);
      p.alpha = rand(0.30, 0.65);
      p.drag = rand(3, 6);
      p.grav = 0;
      p.spr = spr || 0;
    }
  };

  Renderer.prototype._spawnSpark = function (x, y, count, spr) {
    var pool = this._particles;
    for (var k = 0; k < count; k++) {
      var p = null;
      for (var t = 0; t < pool.length; t++) {
        var idx = (this._pCursor + t) % pool.length;
        if (!pool[idx].alive) {
          p = pool[idx];
          this._pCursor = (idx + 1) % pool.length;
          break;
        }
      }
      if (!p) return;
      var ang = Math.random() * TAU;
      var spd = rand(0.12, 0.55);
      p.alive = true;
      p.kind = 1;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd;
      p.max = rand(0.14, 0.32);
      p.life = p.max;
      p.size = rand(0.005, 0.012);
      p.grow = rand(0.01, 0.03);
      p.alpha = 1;
      p.drag = rand(1.2, 2.4);
      p.grav = 0;
      p.spr = spr || 0;
    }
  };

  Renderer.prototype._spawnRing = function (x, y, r0, r1, life, color, w) {
    var pool = this._rings;
    for (var t = 0; t < pool.length; t++) {
      var idx = (this._ringCursor + t) % pool.length;
      if (!pool[idx].alive) {
        var r = pool[idx];
        this._ringCursor = (idx + 1) % pool.length;
        r.alive = true;
        r.x = x; r.y = y;
        r.r0 = r0; r.r1 = r1;
        r.max = life; r.life = life;
        r.color = color || '255,255,255';
        r.w = w || 1.2;
        return;
      }
    }
  };

  Renderer.prototype._spawnPocketFx = function (x, y, size) {
    var pool = this._pocketFx;
    for (var t = 0; t < pool.length; t++) {
      var idx = (this._pocketCursor + t) % pool.length;
      if (!pool[idx].alive) {
        var f = pool[idx];
        this._pocketCursor = (idx + 1) % pool.length;
        f.alive = true;
        f.x = x; f.y = y;
        f.max = 0.55; f.life = 0.55;
        f.size = size || 0.12;
        return;
      }
    }
  };

  Renderer.prototype._spawnRailFx = function (x, y, size) {
    var pool = this._railFx;
    for (var t = 0; t < pool.length; t++) {
      var idx = (this._railCursor + t) % pool.length;
      if (!pool[idx].alive) {
        var f = pool[idx];
        this._railCursor = (idx + 1) % pool.length;
        f.alive = true;
        f.x = x; f.y = y;
        f.max = 0.35; f.life = 0.35;
        f.size = size || 0.09;
        return;
      }
    }
  };

  Renderer.prototype._spawnConfetti = function (palette) {
    var pool = this._confetti;
    for (var t = 0; t < pool.length; t++) {
      var idx = (this._confettiCursor + t) % pool.length;
      if (!pool[idx].alive) {
        var c = pool[idx];
        this._confettiCursor = (idx + 1) % pool.length;
        c.alive = true;
        c.x = Math.random() * (this.cssW || window.innerWidth);
        c.y = rand(-(this.cssH || window.innerHeight) * 0.25, -10);
        c.vx = rand(-18, 18);
        c.vy = rand(10, 50);
        c.rot = Math.random() * TAU;
        c.vr = rand(-5, 5);
        c.w = rand(3, 7);
        c.h = rand(6, 12);
        c.max = rand(2.4, 3.8);
        c.life = c.max;
        c.color = palette[(Math.random() * palette.length) | 0];
        c.sway = Math.random() * TAU;
        c.swaySpeed = rand(2, 4.5);
        return;
      }
    }
  };

  /* --------------------------------------------------------------------------
   * 对外：物理事件 -> 特效
   * ------------------------------------------------------------------------*/
  Renderer.prototype.handleEvent = function (evt) {
    if (!evt) return;
    if (Object.prototype.toString.call(evt) === '[object Array]') {
      for (var k = 0; k < evt.length; k++) this.handleEvent(evt[k]);
      return;
    }
    var shakeOn = !this.config.settings || this.config.settings.cameraShake !== false;
    var type = evt.type;

    if (type === 'cushion') {
      var cs = evt.speed || 0;
      var cx = (typeof evt.x === 'number') ? evt.x : 0;
      var cy = (typeof evt.y === 'number') ? evt.y : 0;
      this._spawnDust(cx, cy, 4, 1);
      if (cs > 0.6) this._spawnSpark(cx, cy, 2, 0);
      this._spawnRailFx(cx, cy, 0.09);
      if (shakeOn) this.shake = Math.min(0.6, this.shake + Math.min(0.10, cs * 0.014));
    } else if (type === 'ball-hit') {
      var bs = evt.speed || 0;
      var mx = (typeof evt.x === 'number') ? evt.x : 0;
      var my = (typeof evt.y === 'number') ? evt.y : 0;
      if ((typeof evt.x !== 'number') && evt.a && evt.b) {
        mx = (evt.a.x + evt.b.x) * 0.5;
        my = (evt.a.y + evt.b.y) * 0.5;
      }
      if (bs > 0.55) this._spawnSpark(mx, my, Math.min(9, 2 + Math.round(bs * 2)), 0);
      this._spawnDust(mx, my, bs > 0.5 ? 3 : 5, 1);
      this._spawnRing(mx, my, 0.008, 0.045, 0.30, '255,238,200', 1.2);
      if (shakeOn) this.shake = Math.min(0.8, this.shake + Math.min(0.14, bs * 0.022));
    } else if (type === 'pocket') {
      var px = (typeof evt.x === 'number') ? evt.x : null;
      var py = (typeof evt.y === 'number') ? evt.y : null;
      if ((px === null || py === null) && evt.pocketIndex != null) {
        var pk = this.pockets[evt.pocketIndex];
        if (pk) { px = pk.x; py = pk.y; }
      }
      if (px === null) px = 0;
      if (py === null) py = 0;
      this._spawnPocketFx(px, py, 0.20);
      this._spawnDust(px, py, 12, 0);
      this._spawnSpark(px, py, 7, 3);
      this._spawnRing(px, py, 0.01, 0.16, 0.5, '255,226,170', 2);
      if (shakeOn) this.shake = Math.min(1, this.shake + 0.22);
      this.flash = Math.max(this.flash, 0.22);
    } else if (type === 'strike') {
      var power = evt.power || 0;
      var sx = (typeof evt.x === 'number') ? evt.x : (evt.ball ? evt.ball.x : null);
      var sy = (typeof evt.y === 'number') ? evt.y : (evt.ball ? evt.ball.y : null);
      if (sx !== null && sy !== null && power > 0.25) this._spawnDust(sx, sy, 2, 0);
      if (shakeOn) this.shake = Math.min(0.9, this.shake + 0.03 + power * 0.08);
      if (power > 0.75) this.flash = Math.max(this.flash, 0.08);
    }
  };

  Renderer.prototype.celebrate = function (kind) {
    kind = kind || 'win';
    this.celebrateKind = kind;
    this.celebrateT = 3;
    if (kind === 'lose') {
      this.dim = 1;
      this.shake = Math.max(this.shake, 0.06);
      return;
    }
    var palette;
    if (kind === 'level') {
      palette = ['#9fc6ff', '#e8d59a', '#f6f0dd', '#7f9fd4', '#cfae63'];
    } else {
      palette = ['#e8c66a', '#f4e6c2', '#b98d3f', '#fff4d6', '#8f6a2c'];
    }
    var n = kind === 'level' ? 70 : 110;
    for (var i = 0; i < n; i++) this._spawnConfetti(palette);
    this.flash = Math.max(this.flash, 0.5);
    this.shake = Math.max(this.shake, 0.3);
    for (var k = 0; k < 10; k++) {
      this._spawnDust(rand(0.2, this.table.width - 0.2), rand(0.2, this.table.height - 0.2), 1, 0);
    }
  };


  Pool.Renderer = Renderer;
  Pool.Renderer.VERSION = '1.0.0';
})();

/* 即刻开球 — 程序化音频（WebAudio，无外部素材） */
(function () {
  var Pool = (window.Pool = window.Pool || {});

  /* 真实台球采样（已裁成短片段并 base64 内联，运行时零网络请求）
   * Billiard Balls Hit / Pool ball being hit into a pocket / Cue hitting the ball
   * 来源 Directory.Audio，Creative Commons。 */
  var SAMPLE_DATA = {"hit":"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","cue":"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","pocket":"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","sink":"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","cheer":"SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYyLjEyLjEwMgAAAAAAAAAAAAAA//OAwAAAAAAAAAAAAEluZm8AAAAPAAAAhQAAbWIABQcJDQ8RFBYYHB4gJCYoKy0vMzU3Oz0/QkRGSkxOUlRVWVtdYWNlaWpscHJ0eHp8f4GDh4mLj5GTlpianqCipqiqra+xtbe5vb/AxMbIzM7Q1NXX293f4+Xn6uzu8vT2+vz+AAAAAExhdmM2Mi4yOAAAAAAAAAAAAAAAACQEJgAAAAAAAG1i64cxHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zgMQAJereDUdMWACAAESTTtXmZmfsCWfwGB5p2ZmZ5CIYAYBxHVsOPTN3wSB2Fg9gIAiHRvHWXqGlMpM3N3wzYxlb3vPmhoykyWO8nn6THeO9ckB4HwewAACB0LJm5vbDc3N33sYx738MOUmOwdhoyXm797+GMZUsZX/se9779n//+/hjGe9lb7///YypNDRnBDlxwIFz58EDgP/y4PlxwIFw+rZa4hEI40JC2YlIq1KtwCnhGofKGE3FfB/oeT9FucMqHMl4ALKZUAARERT/84LEKzSjxqZfj3gCItK3Qvq9HqhQn8DnGIp3PVFyU8SM/S1LtqF1f4LiBAWF9C3q5zHy/T6riPIcN0jBA3kAhTY1EgFjZL5tPRXu6b91YyQITZX/MSWr6M1vPmC4bjyRKfuGd/pVCD7XChZ8VUY4Nah4z7VkxfqHPl8kTxIGvl+4fv9632e9JNfVNfwP7QZ396a9/873/v/Gv///f///9Wz9qj9/v/tin/pr+kTEuAMQ3uFaucICBFy7Xm9EMQ9IYnR1qaBnIYv13YXDkfW26v/zgsQcMEN+njfYeAAAySKxe7S4TBjOSsOg62XWoz5+3mNGbLVrrUSBBbFAzRaMiorBpvX9rexhBQQGQALFgQ20tWOCW863kSFnVry5SbPuj/vNt7GxxZnbPEgVXm2STG83jt7+2tbpn0+vn//5j4vBcoRfE2819f/4su2+TqzOsX3HpRs3lgzSuZL5hNjzXljz5o9pFs93GiUeTtlNf5vnDfHliYTiMfs81bxteoMrD+ikgAACWZfJqSdm/qZWr1vNdd5gC0lKkaztT1HZfHIB//OCxB8ubBKZ5soLyOy5tK1aM0NiVu1abyGGkPnOZYYQ5DUtgOratT8HV5uw7dJT1Oc/8LFezStLUxU0DJWzy+tKIw/dR04raf2N6pY7IYq/jT7lf5R2kllCUKIDIpBBJ5t3EmGi82wpRTrQy+Uv/FSx90QOADjw/q6/kxFbcXIQ5dOW+bsqav/qITzyN6ka51VCyGDhDuxyuqMfKbMbxAJiAcb/iYu9pAAkrM47frxmftyqgiVljbpKqKwJjgwdHw6KHViEUiHK8wpXPQM0qWb/84LEKTErfpngywusmwyy87UvWVqtqJu/I34j8fpbOEtnPm5dPS6izo7H8p6O5Zk8ncoRoKbAbEDHxKTwhsEOyFpqg6AcRjlPCNbpbKgvWFuE0aHwvPnhLKSO62satdXDRte1zh5x+f9q7/gcPJvMwK8zoUSGiZIIeCQSYIpqt1d071r2OOWNfkoQQK5mU7IHREryBwmICn0I306EbQ0hQOcZ9QYyyPEqyJIC1yPwT3CIzM3F3Qge3IOxkVIWcFRNGjnM0rN5PTyTqlkqtRlklv/zgsQoMlPmneLLEaQf+Vv1TvI8bKJ3WLAmzPHt5KXViduZyGkjNiVQJb+pajU9KLEdla6FTQwZowqckPIYqwN+XUWI6MNVXCUbBqDYpg8LxLPo7vi0WEwfFzybJmulSrSf4lix+hs3yNFmgaKqKO+/93AqS4QkmCQRExgdlDvdjRRFEMkaxEB6cSKpCJ0gunJtVNcnG8vXzX/lxwW5f/DNIgmkQPrhE+SPVf/xYmrkAACyR2KOpDmdDG5XOw8/0Nroqu0mYvle5tzKL33psTcY//OCxCIwc76lRsmRxJSrFE24WZiV/uXMroXffZ5X7ia81+Z5U9K/eM7E52V0tt3X5pqbCWz/d0kOy6XwXXroSSIEwyAwS/bzgcvnNxR6pY99uZlF90GL4VMN6lXBQkmDkQiI+dICVRo/pyp41ljad5lpubrO9V/BKCwAUoPIinrJBrBw8Tid0ZbGVZllXy9O9w5EcLxUvH//8rX8W9f/0SOxQz5D31oXD99LLaJ1gALBOqXpnLKrNY428sph33ciS5XwbgD6sfvxG1Uyxe2I7iL/84LEJCmsFroGwguo2mpylqTF/btxTK3KalzKGaP7+7VfVFruNLlKL+//WVq9d+niz7yAiblfqZtq1uXGHXiEKoA5nLHSVVi0u7StKVV2tUKVmKLueLEMKtv/xS99aN0FSAGou3O+qMrIRqop/1c97HfUpUI+VK/T67aerOxBRSUEQFbYVH9xV+44WFA+MG1SgAAGaxs7lNaV2ZvPs3HJ+xDzDGluAD5q2UPZF/4tnfeeZTATlSG3uN9sQ7Js7NrvbE1KonQbsU2fK9zVivh/6//zgsRBJvP+uebCBawLdjstm7VM702yB/k9lYHXm6Z+o6VHIqhoenkmbKHTKUgoWzRIgtRdvrtE3EtpfMfw0U3rA69eJseYIAbpO7/QRecm5yp8ujy5v//k92f/9UcOsodjDP5xf+oR7SABZzHpLlbCYj7Nx83olPMCaQ5YQwmYBIHLVsYmnKkkbUyQpzY3GBdgbUPrEUaxZtrXyHxHnxvONvNPGOPiPZvhRY9KMx0SZP4naOICAJB4EgYV8HR/aB5CyTuhSaXwwMYGPQUvsY+///OCxGkno6q55HmFpe8ykTdKvWbCtUj/Z5JwTElBAAgkKibZUOuhjsqf6HXc5z5H6kyr092Q2sm4OkzUAib+8F3ftd0CAyRUkdXPn7EpZe1Xy+Yp/Euf5vBKY25IUOVsmgML2r1erZZjw3NWyZq2/wLtbjH362peTHv5a1mpArCa3s9O8YiiNIGoxPDkBEbCBYeL3UIqRCXYgtRnqjVcXb+Qx1nOxm36Mh+TsU6Kpg8tXY6avLqJyd/8rxhtiERVSfMvmtyKpSpu2qGBiLF6P8D/84LEjiQrxsoOeU+1nO/irRgBqllMg3UpreU9nAGcpfhxIi8b/MqKZwvbU5nm7R0+oDALITVpq8gzFwTzyBuj+rIrFOxMLJpWPGzbg+Z5LsUSzh49n7HilVQ/U0cvouwJk6l0ZYuMfOGRVu6q29aRMKZnE0HNQeNj0I7zaogdUyNN1Nzo6H6I6pViIVqqooKMyO0x3ufoZbMZnJ/XOtnam06paTUazvIS3Y+hkmB9Sh01rR/4VakUAKkEll9utnjNUth34rG2Htbbq7rXo6ZBS//zgsTBKUvaueTDyt2m707AD/sRpIhP1mG8n1N3FhiEQK/tqkqbzt0z6U3bXbvcf7Tz1ip8SkOr3Mcpmnu5WMPosn1Z4Djb+DGp2q9qzT48qV5fNTVblAaIR4uKRVKsuICxI+umObS/7HxpEzX8Myxf1Eryy8kgp1RK5OVWu3/dH+vsTnS5Ulq+ign//RXN5wYwSgwEh+uAABqe9Ka9mgj123OPLEHEcB/44WndxbQMtnJLD7DWNJwNmg1o0rdN7GYDRiz4tprrM0hI9LJ21TRt//OCxN8pQ9K15MIFyOmN5X8qu6tWtajkDYRmpK4bpIak0/AEat7rXnKvSSRP8i+DZUNH8S+JQEoL0S7PRmzYjla7P18Je3Bc8kiDAjIXnS6sBWjUuPrSksdfqq1YFD+vgWKFa//+XLDsaKAkFhNKiPRKFiPVGn9ev6/xH/tHFftcWlVDW9ylXrc1//K+vUlxJwHhQYceo2ZAnQxdFqauRntDcldSu57frrfOA3qsu+7ZxzT+PMvRvVAVe071xh0FQOMWVTVom8dRR5p7PrMspYL/84LE/jIz5qVEylHBXBcaAaTlixUr0Niih2aoPmJT2mi9A/coiEZiUagbHlDMxuK1zPBAxSyhnqfxWMpaWzFKLBsNNP24cponLGxvSjoEyyM2wsJ0ZpQvt39jbox/hT0dhMMr3f0RKfF4pRFahFMFwUgBxOaYhYennB6PgalTnjlin0vabTGxrKHl0PuLSq5VC+Iq55INi7VP+ap7kaIYEAuoJ4qq1AjKo4c7Ldy+X3KSffuccDcEtq47zvYD/XsfWQyiMz7Sb8af6ggGGX5hiP/zgsT5M0vOoALSUcDMpf+AWhQ/cpLdNxusnq2ta3ewv7+dwmeVYMjW6k7Qbn+XcuTE5egdkBKkmpKW3FWDVpLaFqCvTas11w7SjMxUZcMMCJ4UO+cP2SsbGYd8bu/lg19v/mLqNv7k3//6xvXFr0ttgbA+DwxCtPABqAOHZ2QHYoLXLDbRrqp/mm101vi//79qnH/2vP/x/w1HIaKiIads4yeWsYurDAUYgOKx5gkJjy6GEpiw4m6iKp0pQQhAKI0hDiQNQd03ddp/lpvjDcpa//OCxO8xO/6pRMvRrdSR0kf2gsll8ecxN0oEoYsMzm4zVZHDcojVPTXZ2ltO/FLtSHYxEX93CJLa3agyS5SJcjKHqcZlJKOGMoBCGmJBhmw8CVGqmFrOGFLwEKQpiUyPMRFTRNp5vmkiuDO/V8JKPJlYuUa6o9ntPHZXCn//o/UdXm/n7/s9td5e/kezwrRnROAIpY2pQyp0wQxFarHityOAmgwXT2FR//8kFnC41f5FTWIp3Fo//////9EjygHBYCgFxghiOWzg/rTEADlYMYT/84LE7jn76pQC29Gt1bjjyRYKApSvtgzrSFz1L1tkQFep6DDqTDuZTbjMMiM3D0XUwZe/shceTxJbYseVc5Je0DG2nvy01oMNROZwxbWvjDlLI4jHHbjsuwj0tg2T2KOM1a7tRq3DjXsBIECRphDhuDgOGtJi0F5UFO+kGTMgjNO/7oOGn3Fk3VugREJb121vttre2KSJvyRrbnvuV/v/WIakVk0f//yvJ85+XmpHsaAp2N2qQcppOyRCFp8EB47DhQQsk46eOw36/j///o3EIf/zgsTKO2wOlUTT18ho19oGg6y9E1KnNr//////YPBUedc1kQloKIjtKiegPF6qKM0vwVq5D7wS9wI8qhDahz6MOUwaaXSQbZ8Go1WsnaxOO27ktd9gUMtdbdp0pUyZu7rWxQSUEpTGIwIQDlwer/juS6IWIVeWpTwLabpFLc431qA3tqUuVilj0My1yVNX/YvDSg4MNkyMgIH3JmNFjwqL4wG/MtizyPZnKH9f6IWqPVaoDtZKYQmKtvvRjiMbrDIy1xmI/bHJ9bf+/WCqFM2K//OCxKA7dBKQAtPRyMb56QmW1vBVr3Hpu8BvgnivHIm21wGS0BACAN2ASJPIDsdXwiv/UJ8ESMBpc0U32IyXqcO/////gUM46JX+ijBiSIRYgFBMKw1iongQUaWAAqQLjUmJxmVUPIGiLq6gh4o+/0RgWJspZiMQq/bvJexeMWt4txl8Ow5y9WkEebiNIPzIl7QiQwh7If1hfl2dCpnR0+n2iuX7u4w5Xzl2X4Z/q7S0MdtReH65EYLBPs+kO09/duCqaWV+zMpl0nMWYx2gUJL/84LEdjNsBqYOyZvEjDGJWdZZ+siFD0Gc8he/+nI4S1FA96knqUYupNBPK0S6TA8FEcImSm/1F9EwegovHtRfKJuT0S4gnzElS+p6+ouPv/TRNaRRNb+YomRedswGcqLrMZJJQuQAxvxm3P07gXMJJR09aSt7Qv+1FrboGxiJT2wvOYl8/ZtzbX5PAc/9uWwlsaMcQeF85d9I/9BZpp3c/GFMNSiWxj+dqU1rHe7+FqmuXY5IJ3HGfn5LfOoBo7Uq9bt67qCPt3cpTWyNqa+sDv/zgsRsMDuupUTBl8Rym5aC2qNGCjMuBZBBI+poyL/3tCDIYz+GVCTpNppNNc8bPBQYEKSR9GlCPn3055W8qJZQOo6HskDsOecER9cz73U2/r/XQOdsbfyz/hQN8mD8U5A3UAALXoN0lmDMMb+DkN/RXMGUEwcVqi6TtTFbJ0H2+K2JTDz8qXu9UoJqsgRUnLHuWJL5RVtyb7+OVzKOxSvLolPbqVaarPwLhSXu18cq1NjUjb5ROchkOpEUfoWztyJywVhx7T2gv8Z3ml3lpqak//OCxG8w+/al4svFsc/18sbdq4g4pGmibtW3+I8zh93h1j0h6zff///+YrlqNiCfw/1WlKbZdYi3h7zCs37jM2nu5Zn072Dq8PU5Bcol4lwxehFZv/zTVf1KFAFxYth/whqbAgQABIqcQtX7EhW7x45jcxLaC3LZ6/R3yKEgdZFqBtnXTXSzU2xn2veOdr/wGRV+H8bpjO5671bWNbh6zCrbWsfOsWg7sw7az2FzCDH65+tp7fGtRPjFvOH0GttaFZuH7K6Rc9lsOMr+a5qZrQj/84LEbymT7rpOw9bd////Z/s63vKxBA+eJ6sT3BIjfcEhjau59UuHYaHTaGbzzHw7hkMjZLv/2V//7r+W//tr0SStR2r1gAgAY4X1FKdvO54xTROpqR7MD2dZXQDW9PF+5QqrGc0jyS0c99lcLWzK5R/NEp8X3i8LWPD3audVta180+73ljtYR8pi/Lk7Rd6ibN78+3Or0Yz6zPsxmduY8zu6No32af6Hb+gmDlPQapw4AZhV1qPDhymfFhXUQ1EFQrnzWIxmfVaH1TMzNfJvfv/zgsSMJYwOviZ6S6EhOz/IdpaihBjK1dQAmsmdRH94T88lc2JfTginFwPdoBSI1zHi/eQ4088FFuErfHR+GBFKfN0i8c9sz22LefECuaR9eXetR/rdoMudardgOUNQhTcnB1sAt+VRPDz7TvKyw616hIF5Jat7H01z9O73wdGvTytw9QPOuXT/ffjEMAcFtp5QlCcCIweAIgQOChf///iCHO5mZDrJY2WZvL+VGI0Pip96loGNvLrsCADscR9dveQKPmyHHjTJN83t5hAC3Q7V//OCxLkn68KxRHoLyAEyQhsZJsSM/kVURuhMjPMuHXMV5qG4x67gUjPcx85b59Wr6WriD/LHP1lKGlhzbrtS9o9PFX1VphWHNfnhu/d52IIQVD5CjhUooxBxBA6qd3VyMZWXyu4m3qZFXRKnGAVR/qNKNyMrgOd/qdNnr9f0N0ZGJnbad2fYjZCDBU40OChGFAOmFVC+rSCC5AXd4003Q08NV4xD2aE1lcSlTEwfU09tY8kUPAvFKoBZW5TnT8trvLDMCtTdyBy577xpx7tyQxX/84LE3SkDzrVMfguFdqpVpaszuXZR+SUV63nhLoeu3MrNu5elso3J3QA0jCF/PDD8Unsy20xOxCPR6V7ma+NPjMX0oCZ77f0I2wxi6sV0L/UTedJqrvG20crkhqj19PaWHKg9XQ8AYFKLg6sWmj3MclUNAksvrg1r4Yz/87f0pq1wdY99tvr/5s9f/z0lotcbvCF70yf8HxcqapAA3r1W/ZhqzS6jTsSScvu4ms1xwVog9xx3aiSjgYguRMYDQIaY5AHSFKtnS6OMYP0e6bSBdP/zgsT9MaO2pKDKV8c0l5tbHo0/O/kfbc10wxVRJiFtmUSjh1q4NS5ZcrtXivCbnoe7PMGFFWSMAn+r2OZ1M/y5Iap2VcmIkg7Jw3rQsrUazg3OG1FyrmXuNdxMhBqw7jqT0Y4o+23sexY/QFgSCFPNVrexpbutdxUC8Pe99PvhkX8veer+G3819HfZNf/F///+99ZoTBuKB42I9kQVgADfgnHlDdrUdyxYf+ZgpuTH0hVMCqIARJhJjvwtgDTEgRKQl8S5R5jI5XJaCBJO7Kx0//OCxPoxm7alQsvW+MOtZoGgUMpnqKAYMh6OXeRWfr2NUNm7FsJvGYuxuVzFyzHoNlUdnwYBvJS/rtRSrIQI5UT8wTKJBepe2JZKp2nNzZJ5WuSU2LQ1xrk98o2cdZMRN4dV2qs9CuTP6VN07catqz+mrIuHBN00nNt7my5rXjcPEnj731/zL7973VD9wA9Tvo6HBP6H//0KOO7MWFW4fVQABP/XtQ2/D6VK1i5QP46sNPvGYDBAq5BstSyWQatgoCLfQtOF3wuK8gsW0yH0nXf/84LE9zFztqVCwsXMpA78UbEoe1uJVZmBH/p72sLVf89U1qtu1ZnoxSX+09+vMzcVwo3bmawVZVRiMsl0TpWZmagUL35bGa1n8NT9qaj5HBcYUXPc6nPaqW0vkiVIqUia8kUf/9bbNNJ7yjmqciG76AvAWDIm1cfsYQMozJBmE0VTDudodN0OO/7DEw76kzf//+MR+X8+Wmhan0a8dWAJlkEdwkkiocrEOM6XtOyeRUMBt2LQiEYsu78pVVZyOBo2MEWDWiQXI9PHHpt0Ld10of/zgsT1MGO+peLKVcVshZK7E9DkOP9Lp6W3ZVHJVaq6w7KN6puV5+jjVx/7fJy/ehmYCxAkKHdLhhyJ0iab4I8IXSWOSaFTMlpN09LdnIC4kJELCEuRmyk45c8OnzRhsUTuLaPjSimWhZmvG2/6qKsfrU477LGiP/3u55lBZCeF4VLCeSNRvoyN+ZsqDzb9f//17KIi9rIpShssYclAG4ABWHbmd/JKSnlkXoMpbFsEGVIMbFhpRIMYAYZeghUNUxYCsnKyFD4yxVcUXdO2wSMo//OCxPcxQ/KkpMpVyU141gWOR6U3ZprUfTjl/JLG4rNY40lmphKZiXSHVNK+6qUkQvdtuyoEIwR0Q7X4Q+UEl45VNKXX7cqfl9l3UlHC7e8mliEjQjolCCFJtj0ilNB0JCioSMk50nH3fcgjOMNo1RRcax3SQz3/0qUIAuInSuF3V8gGCALTQ0VZMNi4fUG1tbDbv/tE+mOkzWvZX/9b7hjK89Xsr5Tg214/+HtiWf68JQqskADIrmpbyml2Vmms0deX40lO+tHYamnG8c3Lvg3/84LE9jXcBqVC0lfIpmkymJ0wEUD7J8SOC6KNu47D9x2U6kPalLdr4Xs4Zv83vvda1dzs55//2svzyxmnRd8YKl3AlmMj+OB+d9weWHkhqvfNXshkU9r/+Vbc5dFU4QwCpH4OO2Um1jaN1W/r3Pc44IgeFqJZ3BYqEihH/6GuqM/no6HmCkYJl9n+d3X/ma6OOn/7zJ55FcCqwhcqjkjp6eGIbzh9+GmSiHonFpZA4KOTFCRGpQyV06qqzyoNK6dIUPjFhMwSbTHbWPQc1qEryf/zgsTiKpQCviTCz6m3ac+k+qxqo8OxVu88vuRVUtrr1tfw5Ir9iWSyYfyzNTHYpYxmqXCnnJdBpEcmiEhcOEsiQtGhG2/9/cbjltmD7Bw/bk8mqAxZIFOwICiLCjEy0ydwAi0dPosRpTCcieMkCqXEFmNeovl8ySZtala0WXTYQiE6jyYF48X0RySYEJkFIHT1JZmyKSKjBtZVp0DBvqZpE2ZBlH00dNMzQMU/81f7Jk6x1f8wWYLNmukCHUfiHrVrt+1esSDdJGZaypf79hUw//OCxPs49AagoNmnwkRK3nTwrt+pyvtasVJJhYIO4Iq4RT24xF6elfmrIntljVrWFdosn5ANFdnL9JY1aqZUtbustav3cp+hn4+7T4M/IJA4J24eYUnxGZXG9S/fZqXKSnr+fNMzJFFRo9NzVSbJqmZrUzqA7EFdSFZcb0TIuv+Rav/5VUD0RRisY6kBccbUfz9dXP8Pp2q/72u4pLlCJgCVfwaWTE/UUQ99hQAlt+CaW/TxuHrWD8Q5J701QiIAdgZETCQRBZjEMTMNExEqgQD/84LE2y0rPrHgy1HEI8gjKhIGEUwpU68MUE2sPDqwjLHfEI7pjATBXngaGGOsqVgllDKasESl92t2qbT4V3WxsymWcgF7WaUUHy9u8bEbQq0flYQG04KhLLFgHVwf+xN3MWyu3K4nTwzR4zmU1ZgXHVJSxemwi9zlNioyYlESkSRUCvkIwQQNExbnX/b00W/oIoGwHsTxGy0dw/FEewgpwlLVIGhfX1l9RfTUzoIv6kkugVvv+ukl//5sUnhIge4OANWMAAN+Vz07S02O5JaqSP/zgsTqNtO+oeDeWxj1LpZElNaq2QVS0yHaWZiAcU46fcErvLeA2AS4tLZjPyHCLkriQq8WQ1lavoaX1BMDehzCprM0bPq44ZK6iZfVxt+rncjifQkcc5wxBioURsSN5PEhR8vWQdIc7TfGtZ32NUR/5UMix/TUTVMf+sR4VyW3beqRIO///NU5ql1+peaUdguDwiYbViBssrs727ms6P5jf+h/U/+ph5//5o1iKlcJP/tAhZCgAx+Y5SW6u6K1R1LdPbjdLQTTYwid6YnLcsMo//OCxNItI76x4svPHRlkcoQqcmIxMCBr6wtQQ9TgRrspgdFzuq/YjaZ89FFepa1y/LL/e6ls7vPWePOU706qWo83JqTppCBqH5h92h4NSQXsf1MNs1J562W7li1Pc13+4zS+op3VvtxOf2VjuROH1GRFf/yu599t//4db2Wm0B0JcCh0gCkUYCgiGAV35RVvIMHW/vWpFVP/3J/6LIgoZtYh5LgYqoJmbu6lW52Wx2cpJPLWmxFYzD1MSAs0rHBDgZbTLpPldHGMMrMysIRUBJ//84LE4S1rzrXkwsvl9EaNUspYEgHJhvoGVreISFiS1kKl6wKv15gwNgkugaHs9RSmsxCGoCby1y5ftXrkvLatOdhrklVVDBq7iWQL1UHGNGAAAU4UBWuvHJ6XGMKnAwZe8ijNmW1qRxrdJu9W7AKgbqSCxzVp/q2X0EWqv+9sveztfV2U01Nf3n+rsTm5ZhdnH6ud///61ygyl0ukr1AQQlHRlhJcavRWQTDKv/mjYiNwZRjkOWlDlGgGFi5Hnd7OI5dkO/80TiULCBCVNShxuv/zgsTvPHwKnKDOj3YPjZXywgFrV2HJi5Vdyu2aWS1uUpwjVqmtywOzLJ6GrmAtSVoJlcEFkGk573e0hS2pt4ur9jTp2tXPx63zzYpNJuDmr+E4U18QasVp1epTTMc9ghh2u3rwMdARGymNyF9Lird6Uqf++0LD2q9I/S75ma7ik5v1+ahtr/vf++LGh0AGELhWZWr8Zf7//u7z2+bWnb9sYFMM6xKryZxYgCwWB01DAhASTMygAWa4hpuV4zA9ycu9SM7G8UiHCnEhZlzepuB6//OCxMEoq0a95MPQ3CgOFhRTkJseUKNmsUzkdEqynDjEN5dMFygIlspLMm8Wz85zLqDBpT3a1amls23BMRrACYJRghUU3jm1lv56fp61LF3deWpawcRYeQYLORhsWc85my+qYx6fxjf9byuHw+AgUCB84oInUzK/K3m0bFVlQz8jWuNVWm/1Yjf/QVURdw8o4S+DoPPqwU3Lqtyluyy/Gq9qYty3TX2sMQaQDn5G0SX20/GTOu+ah78TDLGgz3L1C94yA30XmIm89DBMjlVeVwD/84LE4SlTzrnkfguEyR1YbgKaq61X1uU3d3ZXT1MZZegBUjuBYIidNOAzmxrVRZhhQErrPKrCmrxupFYxXtPXEpRVqI2SGESKggywlc7mQSj/61Cqk5DGMYxz/+UVo3vUQMLriZcNsEg0QrGQDhQQoJptSk6iAELC3ef/AQFCn//JU+ox39lYq/8IvQvgdzUKPTFgsK71fXBUNfNVa0/vC19PBkqnMKmWDgtNWWoE2drUspWDGoDklRDZpMzxoMh1hAlV+UI6N7pXbgiIxe5hIv/zgsT/Mhu+qUDKR8mloWYLtdKll0uq3qbm69hsLK1h2HvfAywjJwhyfKRpWIac3ASE3zOIS3GxFJfRuLZeKH5So2+8uvzc5KqeUCdjKeUIz0OdMN4xlrZ6//2CDnW99z8SJdyYnNBMlJRoVC5YmVJCIyoJy6FKEs7fkO/Vh0J8Ow7f1dkYysjOpSaigOCLypQMuqoDj6pRnqXxFABpRSL6fprcA0lylkM/TRmrSvzG4tBKAW+1ud2zMIeqBTGYg4hEs2nVmn1U6oFyy2oiZVQc//OCxPowo1qooMJFyK9hJyg2S3Ll65Pt+AqEJgkrEhdkoMtYEJHS2p0cBvsJ+nirn88RucHBluike4xm8aJjxldWu6R4rC1Qt4oZUGJXfzCjfNpY79/bMtpHkSHjL2XUaHSHYWjl0GNkYw5Q6KHVhggJ1L/U7jTaL5m9SGQaIA5Dmfe2ZVc6UI1ZFKRRB06dBviQef5pqAAcOPunqR3JRypGY5ObsUjoQTJWqlcthdtuVIdzIZV9JWu04wgLMPnOwKCA3lokDmnbUcX0xi/NENr/84LE+y/z5q3kw8scIpVl+MU9QkZZG0hzGI4Sc4i+pRFKEmSrVCoXRfm9bYmcmxJX7ccqgUrioHuPNd6b4WTHbL+mICsZJs72ukz6UitzC+reIr048ZD3is1oMV5Cjf4ncc0Y96dTG0GDuU4dCYoHBMTURIoxCUPfo4WwdQxn6HI058iDQkZRVqkB4q+zlFWqqUM/VtRD/FVBheU8blMxMyyUzsDQfE4fceRw20lcJjKjADrqGSOXKNFVJ0Aw1e1EM2CSk9PU0xpuAsK/cPTEZf/zgsT/MiO2peDLyxxLZXBTmMMWgFDAwlq9C1qdrtQvp1kUzGokSRhlhR4+VAijsc+yoecBhNTlDQb+yuevVW1Qn4igW7bRaZW9rnZnBKQo7irEczOE7K9cVimqmDiIMqv+UYVr/uQqh3wg297WaTj3REigybzpMzf+4UuiM5/zdUTrMIb/bUXpmznKIop+Hvt2/7oxf7tp/Fdn+gNKgAHQqPudIty+Sy7GNciEIpqGU4RhYEnzA8npMFUE3B4YONBQkQYMRZ3GZ4MUqAdaiVjA//OCxPoxm4agAMvNbDcPYUoRMZ50GgOMih6VUuY6pUDlh89bHbW1ZfyrjcOOx0gPFakUQr09tOOUdkkTkGAtxA+jgirel1BukwI6uPQAJgUHyGuOTl3saEdmRJF+QROMuzE+EHEDlLLllz2F7SqbmuXe+EnLLj46l/5rmISuDQwOeEZnWuGu6DyXtJgj9ET/f4aEm/yaIw+RAxDgQCrgMQ16Vv4/NJehm3J4NjdijuU7tJKD/XEfW/MydfrAVerkUfIEDdW6EkUDgd7sfEa9CVL/84LE9zBD5qlCw9EUOcTuPBgNIltI7IyOVWyzJFUiGKPcfTJNlziVmdzKJQvE5HZmmLf0cqtcJmgnEIBrNezz41m/xexCY7ys8WEzVxdGsaIoijqEUs1aajjFOcwVo3txqqKrsaj3HYrTvOL0TYp5c1zKLX8M/bM0PX6qDokGMe5QtclvKmg6igqLjocIo+aJFaoRh98YnoTN/rRFQ7YCtcKdY1SekMatzNnt9eERp3em3OV0KjGqS70Mw1DqT6JiZih7PJcQDE5EtIMUqtbyUv/zgsT6MlvurUTD0RjYqRizoeFGjz1HVhHq4WMB3KhUKxRJOrnIxs5xsMPUJU+su2OK+j3OFGXYZI6sY36uYXj990WJi45xS8Bue6mrr8vij3AxXfxbMpyUAO1LLV8NOkDFr6IKc5jj7gWGqZXJyMzXONVK1p1rWYkprt7j7sd/IwZNV3/x/BBb/8N//lB6kFREQmSVMVVgCwjrG2XTMG087SRqegGExOYiKvHbUsONZ2mUN9D6HEx5wUwncq9TxaAaRiWgxR3oahpBE11BbdIF//OCxPQuY6aooMvRGAiB42wuhhtZqXqsjK4Yhu1uE2KeVS1qd6kfCkkHIwTCWrdPanwfuKGlBnGJYggePJjsfxL4LMp32VheXKCxC1UnDL+/cnL3HtREgJVL3Qu7LkzBl1tccxb6DbGD8u0FIsxrLU6WLSIuW3aV4RCBsrDpHjknEgd1Wv/sO9p//3v0rkv/WbfmojCW/6QXXcAAxBlDr5SzG/15IlGqCI0v0iqzNaU2GFFyUCEPoVQigw0wQsExt4ArQvSB3gDjkcH0fdVeUvD/84DE/jGz6qVAyxGJPLPFsow2RXNAc8Q9g6g5h2pIyFY9lbqF3CIWHhdY8dOD+JydcsSLGyYT5aORKKU/ttwV4pLcwK1sRSFaiPmxulfMKJTrg22jv1ueVsYtZgSVUgetgLjpe+a4aDnoSD/m1hK9mFLaS1tLyhGH3R1+RFfJFHWVbjn/4eq5Kh6MKf9qukJrhRIfH/3fzWlHf7Q1/ldCFwuXHcHKokFupD8ikNHGJVqU00lltLH4VTt3chQwag0p/nMuKpBYSTCXb+xZ35DS//OCxPoz3BKhQsvRUNZ5CKkLvOJVlr/RUlLG4lA1a1Adp0S8Mpo4HikosVcp2QdyfSphvlVf8Y7hOS6HYEwoIa3Qow8bBtVvWir8ahBKey21C6bx34lO7uVzOgsJKCLX/KqFI52UPmFToNMyC6kfoVRJX1UWEH/9hRvlRxd8gCFEiN/Ir1DVZBV50ToICUXFzqIf6BZidceK1VACrUL/xDUZk9erH35dN2o5DLBI8oMQKD17OQSCqCSOEaAgOCRQS4OAwlIeWtKx0ASX01Nfryv/84LE7i2MDq1EwkukL3JYKoKNNs7JjopbdGNwyzhtYPyXS6r8Ri7GXdi8WtRCpKH2Yi21Se1TUSrYxBtxd9BMYlKp2wM5PSGZRn73zOtdqEOJ4QRJdPVrvLMSRLDRdsFKILyyV7B0yjQngUEohiKJHJLUPUOU1y7v5Ksskqvleokt4a/4GDjr//7ZJVkFlOvSvFho6NEqdISjq+OVGGw3//zjRJKggCnYW697kIlHJqhotSV0Y03eGWsMuEwzhrLai+rMxZwCAbCgcEAgNVVflv/zgsT7M7vqoKTLEaQTnAJcywSEF/E/H2uw27boD0JVFpsTdk4ItNgqlMKQyJElw/VSxq9ggQY5YEg4nWvPInjL5Ojlhol8Lo5qtwZ1Q4TV/OC7xk1/8avD0pUQRtv+2+j7Fn8OvpVIlig1+v6Up74eRZIO7h8RaRIwe5EORGUOsVbrcw4w9nDxVa3YGZ9Kk1KwwFFHM/P1ILKOYif5zubyf8cP/dXggAKC4AQpzQau0FikjFjN9W5ShujypcEiUJzRBZMIjK5T0BcAGC/jX1FF//OCxPAxG9qh4NPLVNKEtThRBtVhlyKOxOesPo1oXdAbKqV/2+R7dFyWAvisK2lK2x1KfEbMhoKRcMG3CNPSIpSckvuoEWSNKK+fNfn4UmoUz3eIVavWtgjPW4tYK23MF4mINY96BBioYRayIdiIQWax31IcVMiFYgiVu8+c/qznXVmRLpPUg7JuUn/qVU///xV/2jHlRmKjK7PHqkxBTUWABlrDocrYU12vRV4w98Ym59yIKdggNFrWkFr3Msy8fMU0Ej2rpACElpKfC03SQJP/84LE7y6MFqXiw8tskJFiwUIXm+DaphkUSQa8Gsto4CGbHnUQ9SjYvFIzGrdLLdz+L/Q7ZuZ2rNWXdxSKrVo81l5odnW3lC9Y3EQlOsTkX3pHZ1e0wCYfCOyiddo/TqXYsmWUpTPdflfMSK+blbz0J0DGHlQFX6pCTgNYa9PCl9gOE4mGoQjy5SAIerIX//wb//FeL5JMQU1FMy4xMDC4Bn4jDcsnqeMySLWLVam3PUt7CBBUomNkCXt6YKoAmaQiAlJO17lDq0teyigVrEeezP/zgsT0LkNepUDLB6rmqy8lHhY9bLeVF2yluU7KJKxVJCUSxmt2aNGaJAfxjIDlZ6CA1S5LYjiLR6+Mte6M0BzvJKrfWKGkUUshqHx/9PdayZnaGLOr2O6cnUGtH1kKi9kKucuvq3rK/nJmtrsQ2+cmeT+Q4ZD/9A9NGAgZxPwhDiQIyimqOvCDIV/9Qhzp0J+hAgUDJZgCHjUAw3PxuKPjGoFnH+gC7k/j8tFByhkymsOEpGcREc4MDe8YiKHBJgiMXgmB8oErtIgSllMrmCUB//OCxPYurBapRMsFdD/yltd8p8SLQXnDhMBJxMtBMK49jHZefEyD7rapoFhquczyw7SzXzeFCKwn6uiXnbbTTTiAz5fJBobO2aRLkl9duXINDKkpa4ZslRKGjKLIOYWbLOLobYjj82/0hOKFml/llauW1H67f/+lt0VTwTSIiZzei11amfDGT/XX/8kwXGx1/+1h+p49pn7hu1hIpc+skfxor6vlFqESC0EogBxCRFYDDatw0OQWBQwHYbsoLp9nNGYGLkAqeivHLkb8wUvxxKT/84LE/zD0FqFEwxFslL+I3gJWUwUErSueGj+GrzdZVBzsIoCIEWtNSKMUNyBXBit2VVthpfLgAPo+0bL2GwMkr5Qw7NJe2SAoVDmSRyfq9+zzp0zCdtECOuZYssT2jWypDffRt///yNuru2d5qfQfEyFEUZVMwiO6mlb4wwvQnzGYxDRV+h844oTEiCBMrC7Mh4oMVCoZlqrq6DlHkKzaEYTM5Dvu3q5ouB2FAA0YcTFfvs7MWp+kwqODfhqBVzRl4kdB5t+092g0yN5G0+zEF//zgsT/NjQWlADby4zhdpiIcpZZmFVSQBfxY+bDTCCKsNXTJ7iYL7VHO4/0QHpBPMMlKwsqp7b/vHKNFFcO6DrX/x65iXu3I1o+4TC+1bfrv2MwV9Vw87034hwbnElgonfRXvgQS6kurIEEoFQmYOhAer4Fq/v2e5Lf8UdjWREr/mqg1r+XvxRJ+/SIaVyhorX9tA2s24aVhrtR/zXmnB3xLEpcAgGHkkMTU7NQSwZ+Ybp8Gj149TurSuTeDDofRMntlhUSWqK3EwghCJQidlqM//OCxOou+9al5MvRGKYFqRl91izu6XVEXNmyEdScou4pMC8rQXUGkTc8U65nUa80qiWJ7bvPj5Vu0g0bj4pp7LAr71hTvd/7v/fGokdvKI2S9tN7em/jIhmWDYIghKOFhFrgoSoNOlGFrc3EbuBVtzEiBU8Xdj4NNb5y9v//+7MSov/e/5PJe+v4Nv/goYJD786v9DBGHyat/8X/xRdQP4IqQIAUMu1KKWZjEB2oZdOQN0WHXJEJpvFAFh1RqeMMhkT0BkJb5uiehw0E3IAwBqP/84LE8jCT9qVUy9FRST0og+JNIT5k8ci0TZ2AUnCMpMrTiwQDHa/bz7LxNwUWDEcUy7eoZFJmW8oSbGkTii4ep894LGYZqZmiN8Tawr3cOLR6rULniJ+jdRnca1hxoagCHhFbfzMMKm48GH1hDWUuUTEW+YvWlzDxZ7bciiIxSygmx9kQqZGkTV60hJTDHqO2ojlv9IIka0oJqsHNzfn/rZ/Z0Qa1/c2sqv/zpoWdbJl95/S6TW78TSqH//9QUkVCn+KqhQAGNUNv/FbF2buS2f/zgsTzOVPulLLL03GMaWRy2TX78w+k+RD5KztMaQ5da7Yfw14waMuq1d3P3K8YuYVuy1jckVrXtUsxWnoEiZDEPrt9Hex1HbXehtWsMcVO69napCyrzD1zJ+Y2X7LXtx6sQDF2bnRV+aK5kICq7Ozs5qt1NNQ7aImRjFP0EzMd2YpujMhHQrmAU1yir6kiSuMfxFLGb2H2QTTlf8zCrjDnfiYkSaDVqIpLb+1NXGDwPhEsHyn83CcJrztr2a6PJ8PNAXmX2ca0z2Ng0RMCgAQL//OCxNEpi+ax7MsLUS96rtOJdzJmRbE80/eBDgoIAmHUcKtcIqlfRFYdzw6Qgkynh+O54xir+V9b4ScLEJbZIONvYrM/Zt6jTYYMT0Y5//mFkYYImL9VxGxuJq9qQndrxpMa3neb01jce+298SepKvxWn5wcshA//9Q9zkIXVq+pvtDMIBOD8KuFguwDmeGw5Rsi5j6lig9zgRaRMTbyldqGH5AIcl7JGKqCBAIgRMOHVoBHE+woSGJgIKMAMTQZJgsEiIXPbvxJNQGIDWmkIED/84LE7iyjLqVK28ccUEXUGAI8lOm7sSfZP4hBkPzfAJryG0rcSHn+fFtnFfFrJUBk7XpvxClYDOwEy+tagCmp7b0UYgBSYQiuEvh3uedPM12gw27dENAkPy6nkEBWKWifqrcjcMLZHTcaSHfq0kx2MdjOWLkEB0anq572yyVhiRrmB3UwTKTs8NkscXRiMkIyKSgjGjrYnEg/XhnybaMrNDBFvuCCSBQgI4IcqKGPtDmptFyQgkjG2JekDEw9WffiyLemQV/WEB93iKisJHnkLf/zgsT/QwwWjKjbE+D5ONRz2jYSLnnilJGOqoOS+hl9WrSSu4/r2R9u8ATThylkAogUTOIxYHSQe2s5FpEZ0YoStOKvrLoAWyyMMKaFHbstmm+VuLPDWsglNJT8ypo1i7TQGDwxqIxW7IJZVjVnOktSKU9oS575c+UW5FVidS3Mw52UQBG7G90luxS63ygu2LgYIkBX1hXx1rWffYPAucymUTbX8kFmlLaj4W/hnId2lVr+GZnHf/rGAtv6i5JFYccQr660IvIxh3qVf7iQd9nA//OCxLYtm8agoMoL5LWhVWrYzluF+cprUaqQzqVu85aYTrsSn0n0N4XNQzQvsETGqmMkghrcoZUKhak+sVjdaciTpE21m2Z3k29V8p7FyV0eVRyZls6Q20WE8XDHPIDoV8DDlDj3iRo2MWjP7/OL43bcFocJJl0TxAvLO/PNmlL6zBP7Gr2tvFv/64rr2lCMp0YKtpE/+s6H9SfuCV/1Id7ncr7ud0qU7zSq/1V+////6K46TJADQ/N1J25QXstzNJQym/GYelDUKV3OKKsWf6P/84LEwylsFqiiw8VUyj6G6+zDDEUBFQ/s4+q8Imu1m1nOrM2obUcYmyvpxuUhfO0A+f1pKTrHbjbSEu/Kt9hSGby+t5uv5bGij5g9t+39ZU8r5/rqgqKwoSRdSZna5VkrXdtkzMz0zkdprM2KiqRUnR3bmqdqupjHc7pUk/QSNzlMNdjP39Su6GenQxv6Pq3///6Byj1MQU1F1ACxyIhPRD5m5KpTD8DUkon4PlKwy+xRshbgnwgGQMRHOVzgUD1TRLRgpsKkyzoIhxA5bEsiO//zgsTgKSwWrULLBVaIutUIRJvr6tjMqckQTUrHpmFcdGqs1WurS9Wh1Y6QzotE4phXCuqyXDGVx+ePCGXrn6+EdMHstlAgCSkbHMAYqhOrjjnmb2Ol5QIAIIpWxo8RKomNIEx3qY5m//0apzKcYLKQwx0K9XFBcqVRnDg76CIx9RZhEOgr9BwpUWbFm9RB/T///VWFVUxBTUXEACHVhUO/al8boK9t8Xao4kyNb8CDi0c2fJFMJKHhaiZJeYLOTOBUxANbzckqE5ooiaPFgQOE//OCxPsv1BalRMMLUL1npGuCODjkikfZTA4ueZbCQlF94/dZ5eWVhYLoxihr7JkWRFJBFHREZtnp+rP4RxEtYJhytZOCsU/cFbLA5JXTYDwJAQPkJYpm2Ly6iufFhDiP3Lv0cLlz9ZT1r9MbkWQi6nf/9AYJThxL6GFNQQ+pWQrzh3GFkqHAYPh+J3h8EL//y5+c5UPKIgAFk8NLbh7Ggljv0EoWY+LpsFWki2WsTkW6lGCRAd6syA6TIci6yiiOyOzms/YC2RMeWPq5C1WnuGr/84LE+y/bHqFEwwVUdukQsT5j0vPGjzVosZhb70iQKwbsrm0qvK85MbDCVhuDxqX+Ziq9SRqM8qHnJIxSz6kkfqov60zwZmVmT7EwHoqIz+97QMqSWpAmOlMVGA3WBlNRaWf8jBtfJtX//ydScOggNlkwkfxBNfJD/+kR4yRsocZd/ZpDQc1ny1f01f//391/zMdXVJMxXcoOTEFNRTMuMTAwqqqqqqqqqqqqqqqqqqqqqqqq3AHpyTku1NHW12l3SpZGUojKYlOaUR8RQD8Jdf/zgsT/MgQWoeLD0VBq24FClwFEpi5lggo6RRMypmikGcFlDhoIYlOS2uiqNPRwTg2uoTooojviIkiRDhGKEQqa8VYKolVVSdBD2zl5RFuo1jCo6htiCWXm4vNlDF+ZNQwg1NPnVWFnH/9c2UX0ycoIBsJCH/wCbN3Mj+rtls+hNmRleiQAatUeDD+QvwC+JAeEhsFyNUxCYoJBFqkblVPD9Eoa7DLGNs9L+xJ3lVHaFlCE4POhCTU/TspCjY1QGDtAicbvOZTvy/UdJBYEd+fT//OCxOApG06xRHpHUJik2hicn+ZsSWklEssTkGzkZbhNw7LJTYn7/4fKHrhshNFiXHp5qVb/9OvF2tK4isiitaiYnbz5rdWVLBOq9cDOpDknvaz/lWVYU9qkxKTZ/55HQtDp6/5XWLXm9+w3v/cob0xzj5u1QRJ2/U4xNCv+VzHJoLLOzZLn/8jO3fv6oRtFyrRzwGEqTEFNY4zOG4csSV3nZgedT7dx/1bnFUznKKJOwyNSgJDbs7UWgqEO0YcEDNm1ZSNTC2uCmORXRC+BDAf/84LE/jCMDpygysXnqnmoy2e8DVdQHkJtV8eBWMq4ri/R9aw3xBqF1qjGdhNFCI8zXOonIjZOmHUeA2qA9R/qv0mRagD7LorIt7PpViJSryJYk44Wv/koQQaByI5Nqn/+ULD7+Tk/+4EcR6FgIuycc09fCX//8PEDB3pctdQ81zFSn+lX72q/8axEr4/Slr//IMiJDVpMQU1FMy4xMDCqqqqqqqqqqqqqqqAACeiwsGF1NQxFs5ieh6fdmbToRrnetkdhM6CkNnii3NRiyhMGk//zgsT8MCP+oKDL0Rla1eFma8JUoOOrnoAiHUunj+I4bgahx6u5HsSZ58sd3B8zyP8rswGZza7yVfTbgXZ7mFNeNvWWJ3BgfFz0JKtuOI3+s73Fm1SMPOv/SuJOES9Jn/PjGDZZEgUr6m5JKCKDBfia4S+6+Sr/+JjVja9hg0ddK5dnvwzXwRP7s3//jH7zRnKA2DQhsoABS4vtWtx2G599GvRtyWav+/bWVjvTLaNbaXQWMERZuUukzRmpMzBEESIyhGWkfS9PzMQn0mIFeJOw//OCxOsr86at5MPRGHuj7KcPdIpXM15XA8AyrO3Fr1nCIT8adGLNKeJdLtXqFb7wzko+GaleUvpDESrw82EODwTKZfL7VBTTFN2Yru4strUJq01vGnu1a29v7Xj7zAqHXJrZL2rSJrYHh3//kG9/v8HmzRJ4iQTS1BE7N+NHy8Nf8PK2ptxpdvggM3+zs4Mrt+x9F0+7dyiVqoKXUhqxl5HfiENU8Fu9K2mPO0aWT8pL7taYsmLGWY0b/VEZzIkCT2/vu5AO5+3E5hg8SgsYUIj/84LE/zHT9p1g0gXp8eIh1lzlDvAfwkSrYCjRivbnFC4ECMliAq00CV4VgLxhZLQm6Z+xnyViMfo0gYGRmYWR6olije9VpoqlYC0nW+cnjM+q+vE28jvSUWFQ8HuL2n3cCoIrdFvCV/EWe7VyiIYe5Q0Jwsn/fKCl9jx9yXPyyuL25lfsKs7vfy+tfp/Iyj1Vc25j+E//f///OADpOtxvs3KZHHGsNRl8Hxp9kGkEyqTLEZF3AgqjADRhfaD05YfeBxmuAhGPMoQmaTBK1M2kif/zgsT7MePynKDL0VJ9vGldCqYvcckWLDWVQqFo3v3E46/jvw9OtYksjhpTNfsvn4JbRyKNvoerS8FKaJhEIcppW+cNtmbhekzwKYngtzDCfhL82H/mHcfqOOQgAV89jzcwt5U8RtzU7KtNSohUJhOYWaYfE2DcsG6eSLVz/BInBuXX/xDXECKEBUWLktfNSkip6SWMFrIy5HIHgepfRNd3HwTjB8FxzX0hR3yqESqb2p9HFCJK1//8Ch61/QjV7KAKqGC2ELn7LT6eaf+ZuO3L//OCxPc5PBaUANYRUOPRp/b953l8wNMV7zxVq2DRD0qBH5bs/tLY78Ssy7O074MQ59/q6jXTH2MnRZSxS9N7CjShXaQRQIIsMNqyaGEdA4OIJxYzF8XZWto2CwrJ8rPKM/v86aL3OV0nXCpd37N8cFhIbjT9DnoPHKa7G/6EyjnGs1GfpYveVFjazq2c9rDBoGlHWP2586pqFeABRNSRACrFD1S5qRaW06nGYSUoPZrlAwOUc53laK8RmpMvNIsx521YEwJW5pcMuRGHAdaGrwX/84LE1ieTCrHkwk9QgAcyDOwd5GWhrs3kIOR+sqHKOiqlnZVCkllrOYmZxoWxIkm5kj9N1WnSrhuocq1LRUuI4RxLxBRdsoWq4yHQau0QdIXaVThMBJHqRcW5Y8S6sjTO1c/U9w4EqH2egqBgsfUjlQXrQYbYjo93w1LXAuIAWUVnpEpK/stP8omizKoWKc04Wr2Yk+v+5m2bs5aUe8wxq1cWPs+GxUMqQDVbG3GRadvcA5RBnjkZU7zLOilt0yKaMOQsJSPC40TUNGCzgxQ2ZP/zgsT7NJuCmULL0VCU1O/zSGcxBVSfdeLCEglAAFwsQwWnhuKYZssb7SoQtGK/TAoG9lRpkqpmgIeTNyMwn5lHQyp+3stnmiy9LTENYv7Y2rlhezOKHkHUbWzssAetRp9ygMzL6QI767/q2N54uM2jPYKupiu4MONAvR+j4Yo31avEV9MztL+Gp//7UrzkyAyCYXW9glOigcDd+/zjGuMmBmPFSQ9dkAHqbjcso343DtuNMC3StlLlNOeeBUdUzmaUi8bcpn51uhdgKyVim3KV//OCxOwwaw6cosvHVLGaOTSw0v12ncon5UfHdvLTuqeTU6i2V0DpNkftUCAwMdYQ3kOsVIuZBFExEyOc33ElbZqAXdEKAuT4nxd46KU6ePyE+V6w4u0iqm9KIRN6wk7CgQ472m7wAzHTFqBhzC5BFYGi1z+nJvx/8G7PUY+NWmT5GTmua70uX9DnKliwm8tl88GYgMeh01wwaEptoADWfp77MvkVNLYpQytrL2PI2Cou9yFMFOYfUmozG4AcyQOUYNBq5xqsON7CX/XjWj8/ClD/84LE7i4zbqFCw8dQ8s2QhHtTbwuqP0sLxaYD1dthkQYTK9wnz/QZUnC2qhpSMAvR0ysx/NZsJOsJDJ0eTAhDMwtre2YZ2M8n51n+oBFzSUZvkNYJvjD+DGb2CNBkwyBbvXEjp1QWSmywvtFizF3X2vVfEJELNzb9s00pGVPyH+524pSB0Wn/08fBjDS45T/wUfc6ye8nisKBukeoYJoZHXwiMTk8JmHchtwVSTDrs2Xk277UsjbqDGPsFhMkarFn6fuITcDVV1qYhYbxqnTjj//zgsT5MAMCoULDx1FFY6j0ZOo2Fgy3PK1rWj1iZlQWicUjmxYxZa3rUNHxFGrW9sQaLYKJ2DdbcGxbMc4RyK1cMqwpJXtIkB4wQo8P6eSxw48iOPqfoPW3JCglFKHp3mqY6HfJ7zDbbnnP3bEc7/9495f+WVH5ZjH0iz1RBR7xaF/5TWhZChq0ST45Wd23Xku/+0T/+7Pn/h1ooS0N01SmmnVrRWSUEuvqdwHAriQ0yCHmuvPAlO19PtIgqICgRpgjLcYFKEiKJqrkP7ANC110//OCxP0x8/6koMPNUtt25vC9ncpm5FpM/sZ5fjNvG9Y/G9GtMOlrqvzE/qvrbp7V7B1JRBLJqrHYDt52/whyHYnDUByamdOHCF54lJ4nSGQUH1Jt7cSwjJGUXRUrNBkfcYqpN/FsqcdkVqK8WlMjHylmzgpRDD9SobSU0oEzI9SoaCCMuYz//MQE8wGEDq/p/2ZfpK6hiJ1MQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVWSNuEG3J05UyqHMhzPKbqgOYOAUuAqFtTBmmWjnlApy3L/84LE+S/z+qFAwkXJPUPF4dk/xn7PEYrDSvMTRQpQGKrh8ue+uZfs7fKPTuP+1FOvNSkufrIGm7dJbJxy9dTeI8MInnKpXF2H9G1XVJdJ/HAcpaVwKaCtySplHX9f/05JyJDXysWelVDsdfwnzf/pX8D5/iqoo8RDWo8c8is3/lG+12c1pXsdeOFIGsbUNf+tMdATulVZAJqZPfKjVyaSiMTyDZDkMoXyFG2SMsIuCTOyOVYF4YRzEGWCAro6UPFzUjapV0f2rQ2lrQ0cDFkvMP/zgsTlKmP2tg57EPku5EhXQJyYwkUZQRVYA+nOGSd4iLQRvUNoicA4nUBcdGVX1Z0O48c8dHROZoR2yjtdypzSb9Xm8mXPb7OXN2pRZV+vzM/N36TMzRwkMmd7r40pbLhg/i0zXSxi/54rlwxegjgLikluXPxDLxpNbvF4dBLX+38Vf1i8DzH6+sdX9OsM/FaZbvsDtiQOlrFUP69AdnB4oMyoevdxIobqj0G6p2NKTEFNRTMuMTAwqqqqqqqqqqqqqqqqqqpi9ZJ3JRt728dd//OCxP83bA6pRnpZSKINdSx1UjULL8jrxkPC4Q1CXsPCdUayvl9bEq7eRIsOJqR4htlSNsWA2IdsQ8hvBjk0UsqSLi0QQ5ywVFroi6jijkRggKMSCH1iC46LIdKd4i6bdc+JbmV67ODpnUI6aWwpDw+EFxRJSOD3VU3gJp+khq9VeThf/m/n////5EWem2KNZBT7zYYbTEGCO24jjafyT2a0/E4ZtwzPv43J6kHIivtDoGMU7ljFZU67itieNszZVexlUT3QM1KKQiNUEGtpVjP/84LEziS7srSgeYdMLHia8/LIFnzDck1IctEh1MLC4lTuJOQAVyUGx9MQskyyucqGFgq3IwKEQmLgTWpExEsWF2BSo8yn7QM146rG9yFS8MRakte9TFJx1Fk155KlemQ2/YxjbMpRj/cSDASq4zEbEooCZBYghTEDQzjvG74I81p1Kpm1nq3q6qWfquerWlL+on4caFLGO26SXv2+UVXLp4pQ+L+wUrM2WNKooQqJCIgB+8rQXXddurSZpfMbCxgsdskLWGbeML9hPXEao0t85f/zgsT9MGv2pKDCR3fxKhjUBuknS+8QFArMS/Wu31WL3I9i0p535X+7lXrfzFyvL6sxhM0nJxarlzz+T113uzFaPy+pDjTMUfIy+IjLLA3MPC5sTrzMssspIGGGy5pDSrSBWS20m+o3lz2RCw14op5ckN1BJW89azvohTXpAiL4f2BlXGPC8ZtTYtiwIxQRBnAxSOCXQQgNjv4pvUhHGf1TBBsEijVcVFrECXxyWakMYsR2YhGpvbSK2cVei4VUwG1okOLMjE/Jo1eZq4D/gUYs//OCxP81tAaYAMJFzEZO0qUW5yJzd749GaON0btzcCyiTzErh6EKPvQisJBRbVxCpW+WoVfnlRGQFSq7iI1JwDkp4wiXVM1QDWypOACawqSGWkbushizIsWCpmaaYghscSx+UpBrFGVs9y//itnqLJS+mBf1i1GNzo2OTkxykilsxij4xBliAgbYgCEIZcI81MgMM8WiIoRPOUuASljkUkNLTQ7IIevQO8dKiE1qJMsaUMiTEGmM8GUIJanzLuzyqzalVoLWRaWGi7+uZRWpRQz/84LE7C2DLqFAwkeMrhp1o7LIJSu+ORevSy7c3Fn+Z8XaDjIc0Fkd24L0gubeJJOK4Sq1Gt4doWT0DxRYSGbUpCbFIKjsjno9HnJh8MTGCt5mZxxb14kpmerrHTdWF5PWLPPIH6N6zlpmUEP8xX+QQMgVTnQJECgh2qJZToUwhFjUOUYoVpgp3UE/hgb+hX//pjs+ZsxsKHn5Y1WBr7jxCYuwief2WQY2BqjgJGwzA7XmUpkBGKRqjQXCOUpqD9zblSotk3jOTUYQEsEYDK25vf/zgsT6MRvimUDDBahpzyahiUXh6+9Spy3spibU7bxVpI16BqKozuGVHmcGeUfIwJbAQbtysXZhUapZzxfPFY0FjDYIg/068V23sX10LqgpVQl2JXCPI9no+jf/V3OdmZWTLyBEZa51KplKdMI+4CDMiEZEN/O/1mFX5AopaC9u72ME5xw9WrEAUGFmqy38kKrVDSowf3Ew5t82Pf/5pr/l1D8Fgej////4Jpw7Ogb/+NM+CP822MUcCWbll+lWS3WMxWmeCjZu1qMuW9yqj2jU//OCxPk35BaQoMvRjokFCHTLXwU/lI1tjTA4JecVYBIUhfRebA01J9qU7qlgXcabPQwO7UfnJbBFiL5OPKWW/DFlmKZ4omHohhdaIxXfKtillUMQ5SQuDFO3kO/TM7CdgwuxELCsNJrlKdMzln16dHRlSeV2/zubH0LhLsQhDMjCLL9rsyTxIAboqIQp9kalv/O2INmbMqjSk9x5CEb8YNJECu+ZtOzuQjGN7q/Z7fjWqAPYpajvv02SJwzGJXtpLdI1CWtMATLTHRAW4rxx0zX/84LE3S9EFplAywuol9ZldV/WlMrdkZSg/MPx7vQLAsRgGWyuXXpuXNLYk/kuuQiS/luIxh06krchjKhjghcREpTcSx3TvlhMeInchEkun4yc283O7IsPevGc45pJt550zj+qUai/t/aejmd92BzNycEa+mBhFLFUimMFKBnKpkLMXm//QOdlCBD/2v0IysLier6GMWYxiv6G9GZkX4VtSHZd2uMyt0eTcHlZTTRaPQbQvCVoYa9ySada2mftIbuW7QODpU7zqpJ8dh8VG54gSf/zgsTkLiwWoULDBYy1iWpc5zWmMmgG04TDkHYHgtbbN2tK3MlrP1LVLXEvxSH3pxb1wadhJfEqhwAugmZvYZsHc6/mSNXicy6sulbPq0BGKr1IrnzGeipVRKHJqYoZ4KIIZAXKvOOJr+EzRlNEQhpxvFPaGr4+c3tvO25Ktja4J2zKUjOc5BywRJc1cnFnn9/TH1//rN9h9vIKEuKlIcOMxA4KUFA1PqtrjBMgQgph3QVf/U/4iIPBmJ/q/+h/AWqnjDoRSUxqPTsbjchfRdlF//OCxO83k7aQAMPLrQ8wxoLgLR4kS4V9ZdR78XNooQsDBjDLcjdSQw7ZsUlPXepYBXTXXheNPeIw9AtaH9drayncsdV4CWGgasSJTBDlHjTbuFq9TxOzbisdl62I6eOaGMXq15IcYHIvlhvarL3/FjjjvPGSxWl67898K62tsX0yO74w2DY+8khgQ+XP+46mimq7pmZmcvWKWU8xRUIrJW7yGxZn8rmVPKTy6QYyWd1X0xXB9BvkoZypJb1jllYgAGTMPQU8ubowVKpu3QUsNx3/84LE1DBzVpwAwwetjil1t7H+Ykv+mh1kliezex64fXYylqY9i5HJfVcielLXICb9NN22xus5K54XL4P/P7kpv38OcgOrLn3pqWCWhECS/RNJ8ohL8YpYpb8VcSP40kYldrsxtwMLMIlMcoXm1Lb1ick87dmp147h9SY1J7HXw+oiYPNa01WVJCyq47D4RH8/Kf7f///es6stdWqVSZV4Sxmt6HKVG/XUsjdxLoZywYGP6agYvBBjk8ghKkAEZQx2PUliDXX5nk/b8tbgyI9XK//zgsTWMBQSnKbCxcjtBziS5sUBgr8boYNoZXHVpS92m3id39Q/vF6qGIrLjt6n7bj0ps03eUtanv42NfHo5YaJFhQcw/K2BRKTiOEfptWv+vHxOfjTC0sXHQmG+VW7AvKEw1ev5UTjkGUbeVtLS9M6rTTaVwRzUUOFQ7oAwQIn//6xXw/IxhhUw6PUw6b9n6St/NrHt1w19YxftJy/p4+JY0RxQo/YRMuy7Zvgs0Sv+QMWTEFkCF3FzUy+u8oUr4bq6tZLm4kkSj3JyXySg4wD//OAxNkuxA6gpsMRoe3ZzhIaxLpgdmRaI8t8tcbZkLDE1R9ZSskCG8tK6eMMbwazvoVZnBCFVFKIWUA5Tcedg1uOwh4QLHDCyRDHnEodQ11s6TZ3rdO6FjLWWJvnn//+uXdV5uBQQgDCGGAgKqb/3++MtNS55LMz51sR8y0Y+1DIvuuREtYz3YzK7Mxhtkp/Qg+aEdXKOwJAbtrnh9psPuvOtwLoo5l5FrMkUKW8XEd0iMBwp7lvG2tNge+HngjLFwcNxpbal92HVpu46FCrlv/zgsTfKMv+qUR6BawnT0Etf55O14EtzkxZjMjcic3nGYebpHJExx2H3eKXtiBg0JLBpQ/EWrzjloo4R/TrltPMdJNWBCJ82UztSp05VlijbTLjl6vtbUjevU1Acrf/5hX1/AVkSO+ga+Y8d3aO5M2j9N0yQZaov7x37ZN87iUxuTixi1/F4wdXqSfMDM1EpeEoYOyzywcAUAAAAAAgobUihZYu7v51cueLzMpynUVA138YZ//5hCrUxC5VA6uHOiEVfWHnebVkLKVb2QulLC+k//OCxP85TBaUAMPRrDbJQVZjNd/JncdvW5GqdAE8kkludaVQ9HL8Nxx/K+MxEn4s5XI7+NFSVojGctT8ciTYLsVuxa5CX3wM6HO7ZqV3dkyRp4OykTPNY4lMsOVJIjGB5HztQRiKHR9mJpNzCPP63xDVWzNqrcDjRoeiRAnC/fK1+1/L3//BdQlf/cMXJg2q7/3kOiw9OBqHglMa5FlEI5r//+iBpJV18Rd/y5WNDLrD/6h6B3+jkWdlr0JftkNxNZ+J6ULDtxJYoVQ/KLkipp7/84LE3S6D7qAAwxGggSUs1uoGsAjjyyuVXWhxh+IzQOpWlfZFLaSMXLFmUzMR5LaGZ3O6diDaOepqtahsPomGBrqXu+60t41EYIGhSVKFERtFNgVkhIsRYTL77kRFlkjinQ0Sxa5Q7pl923+jp+GUvHwzYlBo5iw9BUAeDttOh9H2f9WpvUZTaaiotFHXVLb1UtrqhtSnD0lVkWIJlnHG6v///5pFxnXqXSTnXdRakLoIAdF0u73M1jTiKLaklWxD1k9JiApocmyJDDOZwgslVf/zgsTnMaPynALCV6QrDCWahJwEKRgtwtDYpTSLarUKEmT54O4K9HW9LqWFmdw88PFXC8tEswZ3VuX9R1/VKRLq3sZiaoZOC0EGW7kyZYQ4DlQiCCD4HxqllDFpSbx520RFkN9X91Fe1//DD2FQ7DIdhZ6lr50vZ+7eZ/ayTar2+qi001nl74LiRpeHtXMUtf8Sn8T45/tKe8GrlkKWmjsvhiGmPQzPymMKqP6qnDyQgXDUyFAYBLgtzicIfiVJitylrutGWdTpnq4FpYozFXr///OCxOQrs6qhQn4RgbQIHcBrTnUrToExZ7BM3LqeIY50vzlakbm+UGQlekX7BNiWZQbM5LBBcQN6kEIpX4aRQPjM+OkMo2XWhTpEjZdNT2iZ1qx81WCLKv9KbFsu36zX/jvt7NKuazizq9Mzf7awzFcWiM5WLJZ+b9RjQaSmMcrMInWMVNDVOUT02co5gyCiCV/8rsKfkGA8QuN0CoP8WqeI3J12WHMee6HaG0iUoui+4wVFKoMhfhqKsz8OU/cYl9A8D7rsdimZEVAmFuErh5r/84LE+THzrpSgywWuCZVDbDXD28kPLlcKGmNto21V5L0snZXdk81UbA/M82RI2PXItx+47L4Li6fjVj4NSIjLxUrElW6YlWsuJy216PTXVDedDpUqKNn0kVslbsc+WyIxxfAuz5vaE57xD17Qq+7zD6Xd3+pYn+Wm0OIliNGTKzSf+Sle5ADGIcbD4g6KZMCEiJ/6BWCuIErGwcUGhPARl//TlSyv4cd/yQKDeFDPRQ1qlBYlMOM6p6G5SR+sgigyhdeTO070P1Yu3KVQqKSuy//zgsT1NOvOkADLx6ym06s0ZjbO4XAHIDp7EaqRt7oGrzdSLzsooqPKW4YSSVUeEbo8Iy29PnnWsSC3OQ1tdR7gtyL00RaCXTJYQEU0N4IqnJ+WWicioeUZXVnFrS2O7bGw6xWBuP7X7HPd+jd4L5Wl6brX97UOMRvrQmcasvcZvTTyM2mKH4ohzCkQxWU5qa5+zU7pta13dZNH3WNH841t6nU/ulFqqa0imzlRxphj9rd7KqJbF6mVW9D9Wg7blLYJdFLT+zWMEvM7FeWYZUtP//OCxOUx68KcAsMNrUlDc9rCopmMTOrVSt/N0MrjEonJXO7xwyzj07nf+/Vs3LsqjErpMse0nKGZf8KZXpC70YgFCWsZulY1vNEMSjB7Jo+cPrUmbbmIQc3v3cNVP9+2tvo17J5iGP236BQAuebJ1u50H4isWyR2Y1PT2q59JVqudN+OZ5QeXiE+iGf/p+TjO0Mf8OA7eo61oCvmypVqEkpjzjKlqH6shjpUsZGFSTsDfBJWTJoP1gXdlORyqYh2B1F0O8P4F6zEqQCjU7c1G7P/84LE4SoruqSgwsetvkLVsKG2MB4FCcK2sGU2xaEhRBijVc0cqNRPKSwzQP62NsAbK7kBMmooXFW5S29CZBPSOBHZmodywaKQxyBMumojKYSe6IkEV3yWVT81EQvJIv2d7/2+Un4DzpnbHLLJJKxeKvhKePxyUh1Dlo8PP1bRcdHx/tlz/1rC6eWPHRKKbl176ykzMwJ2D2lmVsB98srUJQ2hXsiPD8sqC1eT2H5nrLv1OV+sJNIDtFHOr40g7HuzM5A2mPyayoQAAAIq0ZeNRv/zgsT8PKwWlKJ+WYRG7MGV+p6p7DoV9PH0cKy5vGuE4HNM/eRZFZBy5HQcB+q97dhynFcnGaMxx0Q6rd9WM30+4VYdnHLyFqt9beFnFfRYI0yvR2Xx80DaA/JHllwKCrAQNQxIPqUOFip5XG1ul8MsUZJMlkzRl8o0aT6yrxcEigAMLrvc3DQ/ysLa1GMeTbj/4+1lJTv+74s347qP/+J+h62tfHCeVHbc0lO5bzWUCstq/29GqGivbutwUcbR8VA28fZckHSOWQRJnift03Ma//OCxM0qrA6p5n4Rge3pW2FQ+HJ9qVt8mdPa1h4Vjt/gzuvjfWnVqMRZPLbdSrbs3aKTwFXeB+p6pnM0ONWWT8NuSycQuPt1PQNbQROJK0sFaBE+6jsoJBMEkWvto6J/uvQ21LJw4507s9OspXWoYzyFtcxR9V/444exW7XIlton/z3FrBWV7/R5xYw6ELJECkFK0PgNT3PKqXG1FFo4I+q7uX39z//90zGYfR+Sv841ZVVMQaUSBAJxShFWbIRgSrutE9WWXSYdXRH1MdfhaMz/84LE5jHTvp1AwwetvA4erMGlSpHdItJKlluqBnvldA3DYIsBicIFrN8fEDMs3VnkxCpDifdsZfiPF1A4IROrl221d1ZoLBSWFTb5UFCg1FdBqW9S4wUlEev9DKFzkeGr9vmhVfiCb//laYFIeV88qqjr9rgfbTukf/tUf6FR8N+nx3OVN3UaV6b3sXDHDTHuBvRDAaWAAF7pNDHB44rLg6hoqwWkfBYClQlQhcFtUxyEoJYpXsY7w+giJiFBeiSRgwTJj4V7FYcQfSGdKK40lP/zgsTgKSPWse5j0TBv0y5F6iP6Yh6blqyfS0kZ82NzyIn4sGx0qwWVxHmDzb29/h6xKBwpW653bcNwJItIeoHCz5qjPL6jNVF1K+f7iMvmt7vdv2WSt7a+K7kdwrMT3FYUKNf///w7QC7Cx1j2roOiQqHXYcHCMwkbozZ35hJ6kN+mdnY4qjFR/QdrQLIIPU9R48QGtzyj3UTWCCrYAIqM0xCjJOFVCgPYTQ6y4pgDUFqTpokznVQN47R5m4gsJwtotY9Z8p0oYZ36OwexVIep//OCxP8yjAahRHvLPCzFKO8mi88pDdKVXdWq9tev1BmZ23s0XdKSQPOzWgRZ10uickpaU+f+G7C0dKxJSHN/WFs4ppEfW0TVvvMO76HKwxp3nZKf/VYrZl5jf//zA3eGn+r5mpZtun/v3BnduIRhZcYO4RzFVNaCVICUNHEnGqtf/7NQuggXCK9w18/e40UkhK0mvle4f1NWxgwaX15Qsy1BEQ1VWAEm3GCOq1TOu1SiW2KjZixvHJRqeOchrpBzVLW4w3itN5GRGowHbk3qgnT/84LE+DLMBqFGe9E8dUmoxgBM6hw40jdWsWNjUW8Zynq6i2ne/OJnDGqVjXkdKcDyp4I/niEXVEvzOWaepg63MaOZrVJmk2/F62/8h1v0zlWqrk1LL/2Ny7G2ciXx9AzddRdFOnSSCArgeWtrdp//seI5YGiMNGT/Bf/KXufSRFGRH9QbO0XSjprK+r/k63v1Ps4lMT4aJAAqtZjkF35IyqVRuI0r9rtjrqzkNspLEo9ch+EVKtSMNkGIFAaSVsqeGD4VGoBmIZlGa5iyduPvtP/zgsTwLYPWrU57Eay5qkZlkcn5XnG7HaS5yKz+FLEZPLaSYpYCgWYvdvzcAwMw869RTgp4iB+qt+5MOIjfeFBdbWlocBw1/rq0FujZtB28hzfvL69q/bA6iUrv2Ya6y+1poiatCt/iNr5bo9mtdF9LpCc84OYtKH/QyhKETKXDwNt3sXmTkFGKhRoplFHqjrRuKqnZpRLU/8oebWRPzNHmkYD4rvVHj5JMAZLcclUE392I9PYw6ziMMmfqVULkSoLAIWLAwNKMK0udaGV+rgxl//OCxP41Q9adRMPRrYoeqFkluXPz/K0qmBwCivUsqjb/SPstysWLUlo+42fytWKKCpLlGL1PG8ZyxKI86cLCl4c1OhEIcDGEMWYrfp5I/QSMRKPPJUCQ39vX/F8PPAY3/8OPiDH0/hW3thxNjPy+1821ZXXzbN833/uHCs5x4J/h/pyaaXJmqeWOJ9le1aWWV27rOKtueLbDzN+42w//LQxFkPd+v//jd6V3eWrnv2Mcy4hDbSpAgOxmlt0kNxaZvyugaRMRWWu67cywYSId6Br/84LE7TRL8qV0y82tOQJAdmrACQbz4zIoCiu5sZ6+8P3JHQ9LrvbhQVn1sU9NPSLHLOVw5arWpfcubrV6Pti78/2tM35W0d/zAwDJ4o53ci7vaeSd7U5WxmVTtyXbtsmpr6ntS+3zg6t4XrfV4ESmsL63EvA1///imZIvxvFNf/P3ej3QwEDWJmfXe99fMT/aw8evWa/+csx7I893UPCIPFY/ZiINlBGUDEjVfs+KBWqACBaqzN2xqC5iYjLx0dIy9zoaeqyo+iT3O1R54U2Clv/zgsTfL5NuoODLzawx/KRLCKbc7RV6aOW5mfUFo6sZhERhOr0ipql65ZajJsaLC3qkjeESuTc7HJdYpP7nAcNjrg2+zZPwmQmCfWLtyUYlJGYVKoGJwOhypCnxSBP961LHV+73pa+a0xjPcHdc1//+t/9/r/+/+NYruszlKQJHz10flCOp9f46PKWbmjPkJMUEM5FcgY+QtDVHl8w0JHD/4i+KVYA26GQzspzgzk1basu9YifVpnsCxwhJgozI3apo9LZbLb4VIsOvv4icyWRx//OCxOQty46kssvHrCirhvRLYpTcFRzfyGmhUTUIaxg/OpdYnG4J47yymqDOLS+LwfUqvg775vy/1NTzjisJGQBzyi9TbbDuF6sPVNlh0nnNInMN1qYQoDDXEF7Nizc4su3I+yHy6iePfWMWtmEO5whL8SlHmv7W1tbgT5xbf//9W/GopuAri4bZmKPjPk9nFg1Z2jKOtdVGE6nP1HKfO1qKLysncVGf/+sqe1PW99bP/jNGdjLxjyxVDhHZfKZVBjwwfcaA1m1AEOR5yFP0w6f/84LE8DYj9pSi082vtAyksLdiVxmeyTjVM2s+KIw5RQXHIfh+hzguQKWKaS+fl/V0P1JbE5cllWNLXnH1fv7E9DUJoKXr3Q20prdS1r6CSvCQAHJCysmz0zB6Av0PoxvIz1tc3FcLhkjlWhd4ax85y+q3oQmUg2udLeDCxv/EVvQhxriHJK2Tf/LesuHzPE3/iu/ht1Hix2AOzLW4RNDtIgIilaQIfVa7R8qjExQxgh0mMi/9AT+JRFBIHkCu6TXACN7y+XaoumHNU1yzMzPCnv/zgsTbMmOWmALLxayvhyqOSzyjC7nU5IQBCzKoXRhrCsdDe6krMvIY4sz2HDSrGr4t25zqpb6ZZosJqVcdPx7wUqhzhJ4kWOm47CEVvbUbBBmdxcI1r6Y3s3kQQ4CzOqlRq6RKjJ+Hp9LfUi7auHeW2t6W////+3k0HRyVS8kMz9tNT47D6FHa4JS6NsQNopReJr6Wr0+EggG/hsDP982bFA4SQFAaHExBTUUzLjEwlAgAnMLzZP09dlY9M50xzGV0BrSYOQkzRGgwmJbb9ISk//OCxNUq+06opnoXxKd6SpEIJvkXcRwcnVWtibNP1alRdm9CspWqbnYrxcVl09XMy1aK+srXF73PEd0ehZEuJtCnfNUOea1cvN0i2Mw8oIoQkczoaGqXtJnj/CDPJ/y/wj1fDf6f/g3CFmHuvxva5Z7///jRttCJcTvVXXC3A6k/7pK/iRqV1JcSiZtZTxFFPbTZYgeITIAAadKH38rQzFH+r1Ieh9yJ8vVNVGbrcZYvOLt9Ko/GcY49M6wSnlwo9/asMNCjUqjstgp94drRmy7/84LE5SqD/qlmeNHFs8Msd6w7MZYlFr9WIv7qjlVyBpzB0ZbI8H+yZU6cGS7k3YiyPRBhMgFl5+lLSpk9uXlTbS0wcKq4xW5iJ1yNiGVtVrtbCNOqrXy38pPDXtZY+GSpWv/+oIVRBDtjAp/w1rUktf9Gr9OREdQqZao1o9qPVRsjFrSpn59V4Ye0cN6HpK0RGXTPCm6iksZd69OrBzbAlwMzawQimSAqR1mTytI5rzPVhJO+smqvbA9pWm+4wMIFmmBQPZuvS073Skal1d+JyP/zgsT+MLPilUTDEaW6wgsI9LMXqjeMRnH/eFkktjkph1Z0q5Wi09bpqWy32dLXoYGf4lCVANnCSMFPvDEP1Zmi1ZpYnLKk1MisvIJRBrR0HC5mhYVgww2asqZz+5t/uNbWPyucRMjVlEpdeXvcxf/5g+zoCEEslD7Z4mu/9lFC8vuDa9x6/qLcsNAaimbzBSpMGVFrr9Xw9JVY28ho3/KCcQjIBoABFpqd0Z+jgCCrMbqxmVpPrdg5nlt92srYa2x2rZqadel07PywZ4+0XiL7//OCxP80s/aEAMrHzL7QFE5TP3JVTRmzQswh2Wy+mlmrlDDvyuxMU8dlEatVNxetfp7sxdlFm3H5SsM+4GMVcKjJWJHeyy1fzzLloVTt21+Z4uY8OG9h1QlG3rFeaeFa/+UvjFv/2Y+v0eVr+V/ksEAnNJg5iIZxjig0a3/KKtb2ttxqvFrxPHUzc6VfwsfUtG8wQYePy6tDBJWkkBEoGPok14qsgralyhTMu2UfrAjku+XRekSCAL4iVOqFJVierUBHjNdsWUIevp8OmKNd63v/84LE8C5bvo1iw9Gkx2p2SeWPqVunrH376eOUjFb+cnonUvVZVG6t1jJyKxaxHY7TvtAM7QVqXKdwrw6Hp8luPUXMpIEAxhM5djW9RQUsg88RryBj3RZ8stS3A4aLj3vmKqXHoYwwFQsYORWpt+mm5+Xe6/7q0hIMSdEexrNUVxJI6v93f3d7IGxVGR3trXOlos7LJyoIAmMpkkYp6Sjl+GEMu++6Y6m70uW2ZXEXhtylmILttLMY3AU/Ga6it2lxppJEpY88ufSelkXprsBMTf/zgsT6L4wWkgx+EYTuvSCj5zkxWjNq3V19+1al97fZfjep7V2mmKBnysRwiNDczEvk3yYnPwRuXMwheMzw6jrAel3oYmWV5t64WWHqBio5reUHRtCtkOt2pIqOZx20qKhyIJkSPKZnCQHxFD5lVCm5hLU2uVFBKcLRUm7CuNS71os7jkYzx/K0d/F3K8RXnUcqaOA0DQGqDnWkcVfisvpyJO1mHXTKxFnNsoIwyZfhjUvkCFQymt/ODJTaViaUikVRaBL96n8hlrDVYCeWihh4//OCxP8xU7qJQssRpFsdG6NHH3xwk9a1CLmN2giVaW2r8VjMEU1FN368Lge2+kvaW79BFHFMDdg7XpbYsxm7FsrkugO/GqtUsqTyAunGA6glNNiBeGqOK3tZLKKfHXcQwJfRbUvqn0dvll9Hn2105uLiUSTiM8O1zc+b1DpSs4vXz/Lau+IZ7fdbGw74n0rZUqRHLDyLrk7//2vESdWq0O1MQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/84LE/TMr9nwCyZfEVVWyRFjB6Zuq5Ca6qhD1KyjTxqN1Qv8rLsVHIEVyPde05E9jVZLZZU1+YIMtbYLYr2szNP3Op+13nVq1dV2Ci6FpbUwB8cGl5Q6jSz/gjpOvCnVDO1s2nlWf7tubqnMqp0slW1/2zCgGcVoIOxQpnUOQCM/zSmHTxM7+v7lFsDQsSZlPYFRTyiphE3s6YSx0p6zEyNB+nShpNZxyiYjUHQElYlEnSgBNEWrlwUZ9MRhD+0e4mJBjmVRKjqQ6G9O6BMxIlP/zgsTCIYt2ojZgxcDqNkOZ/reauM+rrRpTvXqdVNF5X5hPkOgvk68YdpIR8FdzUNV6/kZjT/U2cenq3NxERStgBg/FQUiNcWcEx7mJrBIqpK2tr+jkoWKoNEX6uzd1Xi15UkdeVkjBGEA55JHbTAtf9iqpf8ZIqsmxf8M3K7fK+vc9X8tLNcXwLD4jiZg6vk2XUfHypNUWTSXVlUu/KPInPlRvrArpLGbmuAxqICALyiqlrsv4XWTWg1nT1pCqCs5UBRNLKoKtaWGbarCs+yuj//OCxP8xDBZkpH4RoEXSeQq6mUTcTp1OrXSenbmktrG47rrMAlRlUfSuO06cqpYkkjwkILoBWCSgJpNTmccyTyPoRbjqTqGssJrZap00Yz2K2mi4O0NiUjTt8Nt1ypV/IrSoLC0WTWSb7NfDfI00oWHhyIAAIFyrTMzfxa803K0zM4rAwfTcrTQ1zBTews3K6xF1a1NR/K7N61/KreSagwoMKDI1qY5RujCGCLMMkaA5xuDjNYyT+SKQRaIPknwcQZofwbIgwkYfgk4mhwJZhbr/84LE/jL8AiwCw9E0HAhxI8Z6+YW5tbGNkZVcwtTe2N7Y2qVTKVdJlIJNIHqT0nxdS7FSVBdy2F7JMQUkRQlkYZdC/mgoHcW2cZklgnGnFlHoLCgUGEgQsQLEARpwkCAxBMgpI0ouLKNNFCRQGIFmE7h2dnxIkRONKPMJoIpGnFlHgmaWKirOgFhYWFj/gyKioqKCwsLfKhUVFRH6hYWFiVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zgsT2MYqk5AB7zNxVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV","lose":"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JrkNu3dCMoBGTodVqjQoZaFpgQzQpoNLmYzP2sq8s89+n/SctD1F3zCs8tnAWFBZzu4xU4WvpW4ougKRuBQ4UeqtjjYjsVtAmrm9G93/70T0zwnBLBb+OAIwKB0YKZZQGUMVQBFmMuY3RhjQUOEgZVvRCQVno+hwYGb6EJggcxyIBQWERQYA61UAWgUVQdWBfjLT//NyxO0tgjJMAtbZDgp475EwIBDgv6TKvC0w1Ws5ycIEtZdhukNBFB25lyY7PsTfOSr2WcYg7Ihoo40SdG6/v+b2ExM3tNBi4ey1xPcZGyZU0lLu46NxvJrGFxrJafJRubMJSh47oH6QuvnU7/5dfUX/////9InfWNUYHDdaEEWkuqYaOZuIbwsNHXlGRZIOM6JM83R3MEPBxgaUMONSNMBBYm2qR4lOChcAlTRphqmTAkvWXrqM//NyxOEoyrJcBM6XC4gT3tFeKxuFDiFAU8G9I4MBnnoL3lYUHTRCAV2Og3WowoRIhSNaTM/SShCh745S91Xq9o+yTW7vf/WeFSXRm5Yq5wNP7l2VfsxljvuV6n1O17ec5FbL951ta7NZTk595DhodrGhu8Atc7/t2AOABAgBkUM9FkmRqSMVDAEEmSMdMBy4zkVMNLhgINYQjCR4x1dARmZeUAEPK4BqUZpGpoTr2mHKgEYUAjGM//NyxOcqOfJQBVrQAMwx4OVGuDHlMmMJGYJhUAYlAbVwpiZn8WQCoUFBTI9QYHJCrlBYGKDDBDSskmoEErBMOEkiQz/oHkwkxAsGBi4oVAFxiUAwRlktf+HXgR7tSynl8Crybk67qQmBpBFYFkFVr+9zH0MC0b6qdXozRxWGoU4rOcYFZTBEixXzyWuXzVjVS1//Zb+q4nv5Z5cucxvsqjdWpQ7mpuZpJXXlH8///////////f8///NyxOhKfBZQFZvQAPn////+7crhx35fAj9yeDn7i0JkcPQ7Iv///////////////+/3v97/9/+//f+XUtqmpa0qq3JVQ3K1epWr0lynvUjKoAoBR1YJQlGUaYSgbCMfackkmvMretbTkSWlULNS2KFFLbjiwWDUAsCRNcUgGAEZIgSJnqs1LJbcY0iJsWa240sijKWxjSyKNS8Y0siO6gZBU7iUNcSuyoarOgq6CpUNSp0FXQVH//NyxGgg6Y4oC8xIAIalQ2JcFR52VBYkp4KnsqC3Er/EXLB2o8DT4NJMQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq","turn":"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"};


  function now() { return (window.performance && performance.now()) || Date.now(); }

  var AudioEngine = function () {
    this.ctx = null;
    this.master = null;
    this.comp = null;
    this.noiseBuffer = null;
    this.enabled = true;
    this.ready = false;
    this.ambienceOn = false;
    this.samples = {};
    this._samplesLoading = false;
    this._last = {};
  };

  AudioEngine.prototype._build = function () {
    if (this.ctx || !(window.AudioContext || window.webkitAudioContext)) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    var ctx = new AC();
    this.ctx = ctx;

    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 22;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.28;
    comp.connect(ctx.destination);
    this.comp = comp;

    var master = ctx.createGain();
    master.gain.value = this.enabled ? 0.85 : 0;
    master.connect(comp);
    this.master = master;

    // 白噪声缓冲
    var len = Math.floor(ctx.sampleRate * 2);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;

    this.ready = true;
    this._loadSamples();
  };

  AudioEngine.prototype.unlock = function () {
    this._build();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    // 不启动环境风声/低频嗡鸣：球房安静，只保留击球与落袋反馈
  };

  AudioEngine.prototype.setEnabled = function (on) {
    this.enabled = !!on;
    if (this.master && this.ctx) {
      var t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(this.enabled ? 0.85 : 0, t, 0.08);
    }
    if (this.enabled) this.unlock();
  };

  AudioEngine.prototype._loadSamples = function () {
    if (!this.ctx || this._samplesLoading) return;
    this._samplesLoading = true;
    var self = this;
    if (typeof atob !== 'function' || typeof Uint8Array === 'undefined') return;
    Object.keys(SAMPLE_DATA).forEach(function (name) {
      try {
        var b64 = SAMPLE_DATA[name];
        var bin = atob(b64);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        self.ctx.decodeAudioData(bytes.buffer, function (buf) {
          self.samples[name] = buf;
        }, function () {});
      } catch (e) { /* fallback synth */ }
    });
  };

  /* WebAudio 的 Gain / Filter 一旦连到 master 就不会被 GC。每杆几十个碰撞音节点
   * 会一直挂在音频图上，打两三杆后遍历成本累积 → 越打越卡。这里统一在音源
   * 播放结束时把整条链断开（只断连接，不改任何音量/包络，声音完全一样）。 */
  AudioEngine.prototype._autoRelease = function (src, nodes) {
    if (!src) return src;
    var list = nodes || [];
    src.onended = function () {
      try { src.disconnect(); } catch (e) { /* ignore */ }
      for (var i = 0; i < list.length; i++) {
        try { if (list[i]) list[i].disconnect(); } catch (e) { /* ignore */ }
      }
      src.onended = null;
    };
    return src;
  };

  AudioEngine.prototype._playSample = function (name, gain, rate, lowpassFreq, attack) {
    if (!this.ready || !this.enabled || !this.samples[name]) return false;
    var ctx = this.ctx;
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = this.samples[name];
    src.playbackRate.value = rate || 1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, gain || 0.3), t + (attack || 0.006));
    var node = src;
    if (lowpassFreq && ctx.createBiquadFilter) {
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = lowpassFreq;
      src.connect(lp);
      node = lp;
    }
    node.connect(g);
    g.connect(this.master);
    this._autoRelease(src, [node, g]);
    src.start(t);
    return true;
  };

  AudioEngine.prototype._noise = function (duration) {
    var src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    return src;
  };

  AudioEngine.prototype._gate = function (key, ms) {
    var t = now();
    if (this._last[key] && t - this._last[key] < ms) return false;
    this._last[key] = t;
    return true;
  };

  AudioEngine.prototype._tone = function (freq, type, dur, gain, when, slideTo) {
    if (!this.ready || !this.enabled) return;
    var ctx = this.ctx;
    var t = when || ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.master);
    this._autoRelease(osc, [g]);
    osc.start(t); osc.stop(t + dur + 0.03);
  };

  AudioEngine.prototype.cueHit = function (power) {
    this.unlock();
    if (!this.ready || !this.enabled) return;
    var ctx = this.ctx, t = ctx.currentTime;
    var p = Math.max(0.05, Math.min(1, power));
    if (this._playSample('cue', 0.30 + p * 0.34, 0.96 + Math.random() * 0.08, 4200, 0.002)) {
      this._tone(88 + p * 28, 'sine', 0.09, 0.09 + p * 0.10, t, 52);
      return;
    }
    // 皮头击球：短促的宽带“啪”+ 木杆低频闷响，不用正弦哔声
    var src = this._noise(0.12);
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 420;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 900 + p * 700; bp.Q.value = 0.9;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28 + p * 0.34, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(this.master);
    this._autoRelease(src, [hp, bp, g]);
    src.start(t); src.stop(t + 0.08);
    this._tone(92 + p * 35, 'sine', 0.09, 0.12 + p * 0.12, t, 54);
    this._tone(210 + p * 60, 'triangle', 0.035, 0.05 + p * 0.06, t, 150);
  };

  AudioEngine.prototype.ball = function (speed) {
    if (!this.ready || !this.enabled) return;
    if (!this._gate('ball', 18)) return;
    var v = Math.min(1, Math.max(0.08, speed / 5));
    var ctx = this.ctx, t = ctx.currentTime;
    if (this._playSample('hit', 0.08 + v * 0.30, 0.90 + Math.random() * 0.14, 4300, 0.004)) {
      if (v > 0.55) this._tone(170, 'sine', 0.05, v * 0.035, t, 95);
      return;
    }
    // 真实台球碰撞是极短的宽带脆响，不是高音正弦
    var src = this._noise(0.06);
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1300 + v * 500;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2400 + Math.random() * 700; bp.Q.value = 1.15;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06 + v * 0.22, t + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035 + v * 0.02);
    src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(this.master);
    this._autoRelease(src, [hp, bp, g]);
    src.start(t); src.stop(t + 0.07);
    if (v > 0.55) {
      var body = ctx.createOscillator();
      var bg = ctx.createGain();
      body.type = 'sine';
      body.frequency.setValueAtTime(220, t);
      body.frequency.exponentialRampToValueAtTime(120, t + 0.04);
      bg.gain.setValueAtTime(0.0001, t);
      bg.gain.exponentialRampToValueAtTime(v * 0.06, t + 0.002);
      bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      body.connect(bg); bg.connect(this.master);
      this._autoRelease(body, [bg]);
      body.start(t); body.stop(t + 0.06);
    }
  };

  AudioEngine.prototype.cushion = function (speed) {
    if (!this.ready || !this.enabled) return;
    if (!this._gate('cushion', 26)) return;
    var v = Math.min(1, Math.max(0.08, speed / 5));
    var ctx = this.ctx, t = ctx.currentTime;
    var src = this._noise(0.12);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 360 + v * 200; lp.Q.value = 0.75;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07 + v * 0.15, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    this._autoRelease(src, [lp, g]);
    src.start(t); src.stop(t + 0.11);
    this._tone(96 + v * 24, 'sine', 0.08, 0.045 + v * 0.06, t, 58);
  };

  AudioEngine.prototype.pocket = function () {
    if (!this.ready || !this.enabled) return;
    var ctx = this.ctx, t = ctx.currentTime;
    if (this._playSample('pocket', 0.56, 0.94 + Math.random() * 0.06, 1600, 0.018)) {
      this._tone(62, 'sine', 0.22, 0.14, t, 36);
      return;
    }
    // 落袋：袋口皮革闷响 → 球落入网兜的低频滚动，不用“哔”声
    var src = this._noise(0.4);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(760, t);
    lp.frequency.exponentialRampToValueAtTime(130, t + 0.34);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    this._autoRelease(src, [lp, g]);
    src.start(t); src.stop(t + 0.38);
    this._tone(78, 'sine', 0.26, 0.16, t, 42);
    for (var i = 0; i < 2; i++) {
      var cl = this._noise(0.1);
      var cb = ctx.createBiquadFilter();
      cb.type = 'bandpass'; cb.frequency.value = 260 + i * 120; cb.Q.value = 1.2;
      var cg = ctx.createGain();
      var at = t + 0.06 + i * 0.09;
      cg.gain.setValueAtTime(0.0001, at);
      cg.gain.exponentialRampToValueAtTime(0.08 - i * 0.02, at + 0.003);
      cg.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
      cl.connect(cb); cb.connect(cg); cg.connect(this.master);
      this._autoRelease(cl, [cb, cg]);
      cl.start(at); cl.stop(at + 0.1);
    }
  };

  AudioEngine.prototype.ui = function () {
    this.unlock();
    // 柔和界面反馈：不做高频“biu”滑音
    this._tone(880, 'triangle', 0.045, 0.012, this.ctx.currentTime);
  };

  /** 程序化人群欢呼：带通噪声 + 随机拍手 + 口哨，不依赖外部音频。 */
  AudioEngine.prototype._cheer = function () {
    if (!this.ready || !this.enabled) return;
    var ctx = this.ctx, t = ctx.currentTime;

    var src = this._noise(2.8);
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 180;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2600;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.19, t + 0.10);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.75);
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.master);
    this._autoRelease(src, [hp, lp, g]);
    src.start(t); src.stop(t + 2.85);

    // 零散掌声，制造人群的“包络”
    for (var i = 0; i < 22; i++) {
      var clap = this._noise(0.075);
      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900 + Math.random() * 1600;
      bp.Q.value = 0.9;
      var cg = ctx.createGain();
      var at = t + 0.03 + Math.random() * 1.65;
      var amp = 0.018 + Math.random() * 0.045;
      cg.gain.setValueAtTime(0.0001, at);
      cg.gain.exponentialRampToValueAtTime(amp, at + 0.004);
      cg.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
      clap.connect(bp); bp.connect(cg); cg.connect(this.master);
      this._autoRelease(clap, [bp, cg]);
      clap.start(at); clap.stop(at + 0.09);
    }

    // 两声短口哨
    for (var j = 0; j < 2; j++) {
      this._tone(1050 + Math.random() * 350, 'sine', 0.16, 0.025, t + 0.25 + j * 0.32, 1550);
    }
  };

  AudioEngine.prototype.cheer = function () {
    this.unlock();
    if (!this.ready) return;
    this._cheer();
  };

  AudioEngine.prototype.win = function () {
    this.unlock();
    if (!this.ready) return;
    // 胜负结果用真实人群欢呼采样，不再用“噔噔噔”的合成上行音阶。
    if (this._playSample('cheer', 0.92, 1.0, 12000, 0.025)) return;
    this._cheer();
  };

  /* 换人提示音：参考视频里的两下金属铃（基频 1450Hz，带 3125 / 5392Hz 非谐分音）。
     短、亮、有起音噪声，不会拖住回合节奏。 */
  AudioEngine.prototype.turnSwitch = function () {
    this.unlock();
    if (!this.ready || !this.enabled) return;
    // 参考音（叮叮.mp3）优先；采样还没解码完时退回下面的合成铃
    if (this._playSample('turn', 0.62, 1.0, 9000, 0.003)) return;
    var ctx = this.ctx;
    var t = ctx.currentTime;
    var partials = [[1, 1.0], [2.155, 0.42], [3.72, 0.16]];
    var strikes = [0, 0.22];
    for (var si = 0; si < strikes.length; si++) {
      var when = t + strikes[si];
      var base = 1450 * (si === 0 ? 1 : 0.985);
      var amp = si === 0 ? 0.15 : 0.115;
      for (var i = 0; i < partials.length; i++) {
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(base * partials[i][0], when);
        g.gain.setValueAtTime(0.0001, when);
        g.gain.linearRampToValueAtTime(Math.max(0.0002, amp * partials[i][1]), when + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, when + (si === 0 ? 0.5 : 0.42));
        osc.connect(g); g.connect(this.master);
        this._autoRelease(osc, [g]);
        osc.start(when); osc.stop(when + 0.55);
      }
      // 起音“咔”：极短高通噪声，让小喇叭上也听得出这是一次提示
      if (this.noiseBuffer) {
        var src = this._noise(0.03);
        var hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 2200;
        var ng = ctx.createGain();
        ng.gain.setValueAtTime(0.0001, when);
        ng.gain.linearRampToValueAtTime(si === 0 ? 0.05 : 0.035, when + 0.003);
        ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
        src.connect(hp); hp.connect(ng); ng.connect(this.master);
        this._autoRelease(src, [hp, ng]);
        src.start(when); src.stop(when + 0.06);
      }
    }
  };

  /* 失败音：按参考视频重做——约 1.2 秒内从 ~1500Hz 直流下滑到 ~440Hz，
     低八度跟随，尾部留一点稳定长音。整体约 2 秒收完，不再拖成 3.7 秒的慢旋律。 */
  AudioEngine.prototype.lose = function () {
    this.unlock();
    if (!this.ready || !this.enabled) return;
    // 参考音（游戏失败.mp3）优先；解码未完成时退回下面的合成下沉滑音
    if (this._playSample('lose', 0.78, 1.0, 12000, 0.01)) return;
    var ctx = this.ctx;
    var t = ctx.currentTime;
    // 主滑音 + 低八度：三角波经低通，越到后面越闷
    var voices = [[1500, 440, 0.17, 1.15], [750, 220, 0.10, 1.15]];
    for (var vi = 0; vi < voices.length; vi++) {
      var v = voices[vi];
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      var lp = ctx.createBiquadFilter();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(v[0], t);
      osc.frequency.exponentialRampToValueAtTime(v[1], t + v[3]);
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2600, t);
      lp.frequency.exponentialRampToValueAtTime(760, t + v[3] + 0.1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v[2], t + 0.05);
      g.gain.setValueAtTime(v[2], t + 0.55);
      g.gain.exponentialRampToValueAtTime(v[2] * 0.62, t + 0.85);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.05);
      osc.connect(lp); lp.connect(g); g.connect(this.master);
      this._autoRelease(osc, [lp, g]);
      osc.start(t); osc.stop(t + 2.1);
    }
    // 尾部稳定音（参考视频后半段的 440Hz 长音），带极轻颤音
    var tail = ctx.createOscillator();
    var tailG = ctx.createGain();
    tail.type = 'sine';
    tail.frequency.setValueAtTime(440, t + 0.95);
    tailG.gain.setValueAtTime(0.0001, t + 0.95);
    tailG.gain.linearRampToValueAtTime(0.075, t + 1.25);
    tailG.gain.exponentialRampToValueAtTime(0.0001, t + 2.45);
    tail.connect(tailG); tailG.connect(this.master);
    this._autoRelease(tail, [tailG]);
    tail.start(t + 0.95); tail.stop(t + 2.5);
    // 一下很轻的低频落地，给“沉下去”一个支点
    this._tone(120, 'sine', 0.9, 0.05, t, 70);
  };

  AudioEngine.prototype.star = function (index) {
    // 落袋本身已经有真实采样反馈；这里不再叠加高频进球提示音，
    // 玩家反馈的那声“biu”就是这两条 880→1320→1760Hz 的滑音。
    return;
  };

  AudioEngine.prototype._startAmbience = function () {
    if (!this.ready || this.ambienceOn) return;
    this.ambienceOn = true;
    var ctx = this.ctx, t = ctx.currentTime;

    // 极低的球房环境噪声
    var src = this._noise(2);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 240;
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 40;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.018, t + 2.2);
    src.connect(lp); lp.connect(hp); hp.connect(g); g.connect(this.master);
    src.start(t);
    if (src.stop) src.stop(t + 9999);

    // 两把低音提琴式的持续音，若隐若现
    var pad = ctx.createGain();
    pad.gain.value = 0.008;
    pad.connect(this.master);
    var freqs = [55, 82.41];
    for (var i = 0; i < freqs.length; i++) {
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freqs[i];
      var og = ctx.createGain();
      og.gain.value = 0.5;
      o.connect(og); og.connect(pad);
      o.start(t);
    }
    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    var lfoG = ctx.createGain();
    lfoG.gain.value = 0.004;
    lfo.connect(lfoG); lfoG.connect(pad.gain);
    lfo.start(t);
  };

  Pool.Audio = AudioEngine;
})();

/* 即刻开球 / PRO POOL — 机器人决策 AI（ai-levels-dev）
 * 对外接口：Pool.AI.chooseShot(world, opts)
 * 约束：绝不修改传入 world；所有候选通过 world.clone() 试打验证。
 */
(function () {
  'use strict';

  var Pool = (window.Pool = window.Pool || {});

  /* ============================ 基础工具 ============================ */

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hypot(x, y) { return Math.sqrt(x * x + y * y); }
  function dist(ax, ay, bx, by) { return hypot(bx - ax, by - ay); }
  function angleDiff(a, b) {
    var d = (a - b) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  function now() {
    if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }
  function unit(dx, dy) {
    var l = hypot(dx, dy);
    if (l < 1e-12) return null;
    return { x: dx / l, y: dy / l };
  }
  /* 点到线段的距离 */
  function pointSegDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var l2 = dx * dx + dy * dy;
    if (l2 < 1e-12) return hypot(px - ax, py - ay);
    var t = ((px - ax) * dx + (py - ay) * dy) / l2;
    t = clamp(t, 0, 1);
    return hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  function ignoreMap(ids) {
    var m = {};
    for (var i = 0; i < ids.length; i++) if (ids[i] != null) m[ids[i]] = 1;
    return m;
  }
  /* 可复现随机数（mulberry32）——同一局面决策可复现 */
  function makeRng(seed) {
    var a = (seed >>> 0) || 0x9e3779b9;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ============================ 配置读取 ============================ */

  function defaultPockets(W, H, PR) {
    return [
      { x: 0, y: 0, radius: PR, corner: true, index: 0 },
      { x: W * 0.5, y: 0, radius: PR, corner: false, index: 1 },
      { x: W, y: 0, radius: PR, corner: true, index: 2 },
      { x: 0, y: H, radius: PR, corner: true, index: 3 },
      { x: W * 0.5, y: H, radius: PR, corner: false, index: 4 },
      { x: W, y: H, radius: PR, corner: true, index: 5 }
    ];
  }

  function tableInfo() {
    var cfg = Pool.CONFIG || {};
    var t = cfg.table || {};
    var W = t.width || 2.54;
    var H = t.height || 1.27;
    var R = t.ballRadius || 0.028575;
    var PR = t.pocketRadius || 0.052;
    var raw = cfg.pockets || defaultPockets(W, H, PR);
    var pockets = [];
    for (var i = 0; i < raw.length; i++) {
      var p = raw[i];
      pockets.push({
        x: p.x, y: p.y,
        radius: p.radius != null ? p.radius : PR,
        corner: !!p.corner,
        index: p.index != null ? p.index : i
      });
    }
    return {
      W: W, H: H, R: R, PR: PR,
      pockets: pockets,
      minX: R, maxX: W - R, minY: R, maxY: H - R
    };
  }

  function physCfg() {
    var p = (Pool.CONFIG && Pool.CONFIG.physics) || {};
    var ballFriction = p.ballFriction != null ? p.ballFriction : 0.06;
    return {
      maxShotSpeed: p.maxShotSpeed || 7.6,
      rollingDecel: p.rollingDecel || 0.36,
      cushionRestitution: p.cushionRestitution != null ? p.cushionRestitution : 0.76,
      ballRestitution: p.ballRestitution != null ? p.ballRestitution : 0.95,
      throwFriction: clamp(ballFriction * 2.5, 0.04, 0.5),
      stopSpeed: p.stopSpeed || 0.012
    };
  }

  /* ============================ 球与合法性 ============================ */

  function isActive(b) {
    if (!b) return false;
    if (b.active === false) return false;
    if (b.pocketed === true) return false;
    return true;
  }

  function activeBalls(world) {
    var src = (world && world.balls) || [];
    var out = [];
    for (var i = 0; i < src.length; i++) if (isActive(src[i])) out.push(src[i]);
    return out;
  }

  function findBall(world, ref) {
    if (!world || ref == null) return null;
    if (typeof ref === 'object') return ref;
    var b = null;
    if (typeof world.getBall === 'function') {
      try { b = world.getBall(ref); } catch (e) { b = null; }
    }
    if (b) return b;
    var src = world.balls || [];
    for (var i = 0; i < src.length; i++) {
      if (src[i].id === ref || src[i].number === ref) return src[i];
    }
    if ((ref === 'cue' || ref === 0) && world.cueBall) return world.cueBall;
    return null;
  }

  function findNumber(world, number) {
    var src = (world && world.balls) || [];
    for (var i = 0; i < src.length; i++) if (src[i].number === number) return src[i];
    return null;
  }

  function legalTargets(world, opts) {
    var out = [];
    var seen = {};
    var i, b;
    var ids = opts && opts.targetIds;
    if (ids && ids.length) {
      for (i = 0; i < ids.length; i++) {
        b = findBall(world, ids[i]);
        if (!b || seen[b.id]) continue;
        if (!isActive(b)) continue;
        if (b.number === 0 || b.id === 'cue') continue;
        seen[b.id] = 1;
        out.push(b);
      }
      return out;
    }
    var group = (opts && opts.group) || 'open';
    var balls = activeBalls(world);
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.number === 0 || b.id === 'cue') continue;
      if (group === 'eight') {
        if (b.number !== 8) continue;
      } else if (group === 'solid') {
        if (!(b.number >= 1 && b.number <= 7)) continue;
      } else if (group === 'stripe') {
        if (!(b.number >= 9 && b.number <= 15)) continue;
      } else {
        if (b.number === 8) continue;
      }
      if (seen[b.id]) continue;
      seen[b.id] = 1;
      out.push(b);
    }
    return out;
  }

  function insideTable(x, y, info, clearance) {
    var c = clearance || 0;
    return x >= info.R + c - 1e-9 && x <= info.W - info.R - c + 1e-9 &&
      y >= info.R + c - 1e-9 && y <= info.H - info.R - c + 1e-9;
  }

  /* 路径遮挡：忽略 ignoreIds 中的球，若任一球心到线段距离 < 阈值则视为被挡 */
  function pathBlocked(balls, ax, ay, bx, by, threshold, ignore) {
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (!isActive(b)) continue;
      if (ignore && ignore[b.id]) continue;
      if (pointSegDist(b.x, b.y, ax, ay, bx, by) < threshold) return b;
    }
    return null;
  }

  /* ============================ 难度档位 ============================ */

  var DIFFICULTY = {
    // 三档梯度：refine=角度/力度修正，verify=出口自检，aggressive=宽网格强制命中。
    // 球房新手只打明显球且带手感误差；职业陪练会修正+自检（中上水平）；
    // 黑八高手满窗口搜索，能瞄必进。
    easy: {
      maxCut: 0.95, consider: 7, sims: 3, angleErr: 0.0042, powerErr: 0,
      spin: false, position: 0.12, conf: 0.68, spinTries: 0,
      refine: false, verify: false, aggressive: false, budget: 40, powerScale: 1.18
    },
    normal: {
      maxCut: 1.12, consider: 10, sims: 5, angleErr: 0, powerErr: 0,
      spin: true, position: 0.40, conf: 0.93, spinTries: 2,
      refine: true, verify: true, aggressive: false, budget: 110
    },
    hard: {
      // 黑八高手：接近满级瞄准，候选/试打断崖式增加，走位权重接近实战高手
      maxCut: 1.44, consider: 24, sims: 16, angleErr: 0.00008, powerErr: 0,
      spin: true, position: 0.80, conf: 0.985, spinTries: 5,
      budget: 170, spinGain: 0.03, twoPly: 0.85,
      refine: true, verify: true, aggressive: true
    }
  };

  /* ============================ 评估模型 ============================ */

  function potQuality(cut, dcg, dtp, prof) {
    var angQ = clamp(1 - cut / prof.maxCut, 0, 1);
    var aq = Math.pow(angQ, 1.35);
    var distQ = 1 / (1 + 0.45 * dcg + 0.85 * dtp);
    return clamp(0.66 * aq + 0.34 * distQ, 0, 1);
  }

  /* 力度估算：用实测行程曲线反解初速。
     中杆（AI 默认 spinY≈0.1）是“先滑动后滚动”，实测 v² ≈ 1.40 × 行程，
     旧版按纯滚动 1.116 估算会系统性偏小（约 12%），目标球常常差一点到袋。 */
  // 实测（AI 默认杆法）：初速 v 与停球行程 d 的关系接近 v = 1.21 * d^0.41。
  // 低速段台呢会额外“抓”球，所以不能用 v² ∝ d 的纯滚动模型（短球会系统性偏小）。
  function speedForDistance(d) {
    return 1.21 * Math.pow(Math.max(d, 0.05), 0.41);
  }
  function estimatePower(dcg, dtp, cut, info) {
    var pc = physCfg();
    var vObj = speedForDistance(dtp) / 0.92;
    var cosCut = Math.max(0.32, Math.cos(cut) * 0.92);
    var vCueAtHit = vObj / cosCut;
    var v0 = Math.sqrt(vCueAtHit * vCueAtHit + speedForDistance(dcg) * speedForDistance(dcg));
    var power = (v0 * 1.06) / pc.maxShotSpeed;
    return clamp(power, 0.10, 0.98);
  }

  /* 袋口实际可打瞄准点：
   * 球心被库边约束在 [R, W-R] x [R, H-R] 内，若直接瞄角袋中心，
   * 低角度来球会先压库再进袋。把袋心收进可打矩形得到物理可达的瞄准点。 */
  function aimPointOf(p, info) {
    return {
      x: clamp(p.x, info.minX, info.maxX),
      y: clamp(p.y, info.minY, info.maxY)
    };
  }

  /* 碰撞抛掷补偿：真实物理里目标球会沿母球的切向被“甩”偏，
   * 偏角约为 atan(tan(cut)/(1+e))（受库仑上限约束）。
   * 这里反推假想球位置，使目标球的实际出射方向指向袋口瞄准点。 */
  function throwAdjust(t, cuePos, aim, info) {
    var R = info.R;
    var pc = physCfg();
    var e = pc.ballRestitution;
    var maxDev = Math.atan(Math.max(0, pc.throwFriction || 0));
    var u = unit(aim.x - t.x, aim.y - t.y);
    if (!u) return null;
    var uAng = Math.atan2(u.y, u.x);
    var nAng = uAng;
    var gx = t.x - u.x * 2 * R;
    var gy = t.y - u.y * 2 * R;
    // 物理里 throwFriction = 0（无甩球）时，目标球严格沿球心连线出射，
    // 此时再做“抛掷补偿”反而会把假想球推偏（实测偏 0.55°，0.87m 上放大到 8mm、出球偏 9°）。
    if (maxDev > 1e-6) {
      for (var iter = 0; iter < 2; iter++) {
        var d = unit(gx - cuePos.x, gy - cuePos.y);
        if (!d) return null;
        var cutSigned = angleDiff(Math.atan2(d.y, d.x), nAng);
        var dev = Math.atan(Math.tan(cutSigned) / (1 + e));
        if (dev > maxDev) dev = maxDev;
        if (dev < -maxDev) dev = -maxDev;
        nAng = uAng - dev;
        gx = t.x - Math.cos(nAng) * 2 * R;
        gy = t.y - Math.sin(nAng) * 2 * R;
      }
    }
    var cueDir = unit(gx - cuePos.x, gy - cuePos.y);
    if (!cueDir) return null;
    return {
      ghostX: gx,
      ghostY: gy,
      angle: Math.atan2(cueDir.y, cueDir.x),
      cut: Math.abs(angleDiff(uAng, Math.atan2(cueDir.y, cueDir.x)))
    };
  }

  /* 高手式微调：几何瞄准有 0.2~0.5° 的系统偏差（甩球补偿、袋口内缩、低速度下的
     摩擦非线性），长台会放大成明显偏差。这里用真实物理引擎做小范围搜索，
     把角度校到“能进的区间中心”，再顺手校准力度。只有 hard 档启用。 */
  function refineShot(world, cueId, cand, info, prof, deadline, remaining, aggressive) {
    if (!cand || !cand.targetId) return null;
    var spin = aiSpinY(null);
    function tryShot(angle, power) {
      if (now() > deadline - 10) return null;
      var res = simulate(world, cueId, { angle: angle, power: power, spinX: 0, spinY: spin, targetId: cand.targetId }, info, null, deadline);
      if (!res || !res.verified) return null;
      if (!res.potted || res.cuePotted) return null;
      if (res.firstHit && res.firstHit !== cand.targetId) return null;
      return res;
    }
    // 常规窗口覆盖 0.2~0.5° 系统偏差；aggressive 是「高手必须打进」的宽网格，
    // 覆盖几何估算与真实物理之间可达 2~3° 的偏差（切角越大偏差越大）。
    // 大切角（>25°）时几何假想球与真实物理可差 4~5°，窗口必须覆盖到 ±0.10 rad。
    var offsets = aggressive
      ? [0, 0.006, -0.006, 0.012, -0.012, 0.02, -0.02, 0.03, -0.03,
         0.045, -0.045, 0.06, -0.06, 0.08, -0.08, 0.10, -0.10]
      : [0, 0.0012, -0.0012, 0.0024, -0.0024, 0.0036, -0.0036, 0.005, -0.005, 0.0065, -0.0065];
    // 力度档从基准往上扫：estimatePower 在「远台 / 擦库 / 大角度」时会明显低估，
    // 之前最多只到 ×1.4，救不回来（实测有案例需要 ×2.2 才够）。
    var powers = aggressive
      ? [1.0, 1.2, 1.5, 1.9, 2.4, 3.0, 3.6]
      : [1.0, 1.2, 1.5, 1.9, 2.4];
    var hits = [];
    for (var pi = 0; pi < powers.length; pi++) {
      for (var oi = 0; oi < offsets.length; oi++) {
        var pw = clamp(cand.power * powers[pi], 0.06, 1);
        var res2 = tryShot(cand.angle + offsets[oi], pw);
        if (res2) hits.push({ off: offsets[oi], pw: pw, res: res2 });
      }
      if (hits.length) break; // 这一档力度能进就够了
    }
    if (!hits.length) return null;
    hits.sort(function (a, b) { return a.off - b.off; });
    var mid = hits[Math.floor(hits.length / 2)];
    // 职业做法：找“刚好能进”的临界力度，再加约 22% 余量——
    // 既有余量保证不会停在袋口，又不会因为用力过猛把母球打飞、丢掉下一杆。
    var lo = mid.pw;
    for (var bi = 0; bi < 4; bi++) {
      var lower = clamp(lo * 0.88, 0.06, 1);
      if (tryShot(cand.angle + mid.off, lower)) { lo = lower; mid.res = tryShot(cand.angle + mid.off, lower) || mid.res; }
      else break;
    }
    var withMargin = clamp(lo * 1.22, 0.06, 1);
    var resM = tryShot(cand.angle + mid.off, withMargin);
    if (resM) { mid.pw = withMargin; mid.res = resM; }
    else { mid.pw = lo; }
    var posVal = 0;
    var rest = remaining ? remainingAfter(remaining, cand.targetId) : null;
    if (mid.res && mid.res.cueEnd && rest && rest.length) {
      posVal = positionValue(mid.res.world || world, mid.res.cueEnd, rest, info, prof, cueId);
    }
    return { angle: cand.angle + mid.off, power: mid.pw, res: mid.res, pos: posVal, hits: hits.length };
  }

  /* ============================ 候选生成 ============================ */

  function buildCandidates(world, opts, info, legal, prof, cuePos, cueId, eightLegal) {
    var R = info.R;
    var balls = activeBalls(world);
    var tol = 2 * R * 0.98;
    var out = [];
    for (var ti = 0; ti < legal.length; ti++) {
      var t = legal[ti];
      if (!isActive(t)) continue;
      for (var pi = 0; pi < info.pockets.length; pi++) {
        var p = info.pockets[pi];
        var aim = aimPointOf(p, info);
        var dxp = aim.x - t.x, dyp = aim.y - t.y;
        var dtp = hypot(dxp, dyp);
        if (dtp < R * 2) continue;
        var adj = throwAdjust(t, cuePos, aim, info);
        if (!adj) continue;
        var gx = adj.ghostX, gy = adj.ghostY;
        if (!insideTable(gx, gy, info, 0)) continue;
        var dcx = gx - cuePos.x, dcy = gy - cuePos.y;
        var dcg = hypot(dcx, dcy);
        if (dcg < 2 * R * 1.02) continue;
        var cut = adj.cut;
        if (cut > prof.maxCut) continue;
        if (pathBlocked(balls, cuePos.x, cuePos.y, gx, gy, tol, ignoreMap([cueId, t.id]))) continue;
        if (pathBlocked(balls, t.x, t.y, aim.x, aim.y, tol, ignoreMap([t.id, cueId]))) continue;
        out.push({
          target: t,
          targetId: t.id,
          pocketIndex: p.index,
          pocket: p,
          aimX: aim.x, aimY: aim.y,
          ghostX: gx, ghostY: gy,
          cut: cut,
          dcg: dcg,
          dtp: dtp,
          angle: adj.angle,
          power: clamp(estimatePower(dcg, dtp, cut, info) * (prof.powerScale || 1), 0.06, 1),
          quality: potQuality(cut, dcg, dtp, prof),
          eightLegal: !!eightLegal,
          cuePos: cuePos
        });
      }
    }
    out.sort(function (a, b) {
      if (prof === DIFFICULTY.hard) {
        var ea = a.target && a.target.number === 8 ? 1 : 0;
        var eb = b.target && b.target.number === 8 ? 1 : 0;
        if (ea !== eb) return ea - eb;
        if (Math.abs(a.quality - b.quality) < 0.08) {
          var da = a.cut * 0.70 + a.dcg * 0.10 + a.dtp * 0.06 + a.power * 0.05;
          var db = b.cut * 0.70 + b.dcg * 0.10 + b.dtp * 0.06 + b.power * 0.05;
          return da - db;
        }
      }
      return b.quality - a.quality;
    });
    return out;
  }

  /* 对手的合法目标球（用于“两拍”评估：别把好打的位置留给对手） */
  function opponentTargetIds(worldView, opts, cueId) {
    var g = opts && opts.group;
    var balls = activeBalls(worldView);
    var out = [];
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (!b || b.id === cueId || !b.number) continue;
      if (!g || g === 'open') { out.push(b.id); continue; }
      var kind = b.number === 8 ? 'eight' : (b.number < 8 ? 'solid' : 'stripe');
      if (kind !== g) out.push(b.id);
    }
    return out;
  }

  /* 从给定母球位置评估“下一杆最好打多简单”，0..1 */
  function bestNextPot(worldView, cuePos, targets, info, prof, cueId) {
    if (!targets || !targets.length) return 1;
    var R = info.R;
    var balls = activeBalls(worldView);
    var tol = 2 * R * 0.98;
    var best = 0;
    for (var i = 0; i < targets.length; i++) {
      var t = findBall(worldView, targets[i]);
      if (!t || !isActive(t) || t.id === cueId) continue;
      for (var pi = 0; pi < info.pockets.length; pi++) {
        var p = info.pockets[pi];
        var aim = aimPointOf(p, info);
        var dxp = aim.x - t.x, dyp = aim.y - t.y;
        var dtp = hypot(dxp, dyp);
        if (dtp < R * 2) continue;
        var adj = throwAdjust(t, cuePos, aim, info);
        if (!adj) continue;
        var gx = adj.ghostX, gy = adj.ghostY;
        if (!insideTable(gx, gy, info, 0)) continue;
        var dcx = gx - cuePos.x, dcy = gy - cuePos.y;
        var dcg = hypot(dcx, dcy);
        if (dcg < 2 * R * 1.02) continue;
        var cut = adj.cut;
        if (cut > 1.28) continue;
        if (pathBlocked(balls, cuePos.x, cuePos.y, gx, gy, tol, ignoreMap([cueId, t.id]))) continue;
        if (pathBlocked(balls, t.x, t.y, aim.x, aim.y, tol, ignoreMap([t.id, cueId]))) continue;
        var q = potQuality(cut, dcg, dtp, prof);
        if (q > best) best = q;
      }
    }
    return best;
  }

  /* 母球最终位置评分（含安全区偏好） */
  function positionValue(worldView, cueEnd, remaining, info, prof, cueId) {
    if (!cueEnd) return 0;
    var val = remaining && remaining.length ? bestNextPot(worldView, cueEnd, remaining, info, prof, cueId) : 1;
    var edge = Math.min(cueEnd.x - info.R, info.W - info.R - cueEnd.x,
      cueEnd.y - info.R, info.H - info.R - cueEnd.y);
    var cushionBonus = clamp(1 - edge / 0.22, 0, 1) * 0.06;
    return clamp(val + cushionBonus, 0, 1);
  }

  /* ============================ 试打模拟 ============================ */

  function firstHitFromEvents(events, cueId, fromIndex) {
    if (!events) return null;
    for (var i = fromIndex || 0; i < events.length; i++) {
      var ev = events[i];
      if (!ev || ev.type !== 'ball-hit') continue;
      var a = ev.a, b = ev.b;
      var aid = a && typeof a === 'object' ? a.id : a;
      var bid = b && typeof b === 'object' ? b.id : b;
      if (aid === cueId) return bid;
      if (bid === cueId) return aid;
    }
    return null;
  }

  function placeCue(clone, cueId, pos) {
    var cue = findBall(clone, cueId);
    if (!cue) return false;
    cue.x = pos.x;
    cue.y = pos.y;
    if (cue.vx != null) cue.vx = 0;
    if (cue.vy != null) cue.vy = 0;
    if (cue.spinX != null) cue.spinX = 0;
    if (cue.spinY != null) cue.spinY = 0;
    cue.active = true;
    cue.pocketed = false;
    cue.pocketIndex = null;
    return true;
  }

  /* AI 默认杆法：真实中杆是“先滑动”，球速衰减快、容易低估距离。
     模拟与实际出杆必须用同一个默认值，否则 AI 会误判自己打不进。 */
  var AI_DEFAULT_SPIN_Y = 0.10;
  function aiSpinY(v) {
    return (v === null || v === undefined || !isFinite(v)) ? AI_DEFAULT_SPIN_Y : v;
  }

  /* 用 clone 试打一杆；cuePos 用于自由球摆放。返回 null 表示物理不可用。 */
  function simulate(world, cueId, shot, info, cuePos, deadline) {
    var cw = null;
    try { cw = world.clone(); } catch (e) { cw = null; }
    if (!cw || typeof cw.strike !== 'function' || typeof cw.step !== 'function') return null;
    if (cuePos && !placeCue(cw, cueId, cuePos)) return null;

    var origEvents = world.events;
    var origLen = (origEvents && origEvents.length) || 0;
    var shared = (cw.events === origEvents);
    var seen = shared ? origLen : 0;

    try {
      cw.strike(cueId, {
        angle: shot.angle,
        power: shot.power,
        spinX: shot.spinX || 0,
        spinY: aiSpinY(shot.spinY)
      });
    } catch (e) {
      return null;
    }

    var cueBall = findBall(cw, cueId);
    var target = findBall(cw, shot.targetId);
    var eight = findNumber(cw, 8);
    var dt = 1 / 60;
    var t = 0;
    var maxT = 10;
    var simEvents = [];
    var stoppedFn = typeof cw.allStopped === 'function' ? cw.allStopped : null;
    var completed = true;
    var steps = 0;
    try {
      while (t < maxT) {
        cw.step(dt);
        t += dt;
        steps++;
        var evs = cw.events;
        if (evs) {
          for (var i = seen; i < evs.length; i++) simEvents.push(evs[i]);
          seen = evs.length;
        }
        if (stoppedFn && stoppedFn.call(cw)) break;
        if (steps % 20 === 0 && deadline && now() > deadline) { completed = false; break; }
      }
    } catch (e) {
      completed = false;
    }

    /* 防御：极个别实现 clone 共享事件数组，恢复原长度 */
    if (shared && origEvents && origEvents.length !== origLen) {
      try { origEvents.length = origLen; } catch (e2) { /* ignore */ }
    }

    var potted = false;
    var pottedPocket = null;
    if (target && !isActive(target)) {
      potted = true;
      pottedPocket = target.pocketIndex != null ? target.pocketIndex : null;
    }
    var cuePotted = !!(cueBall && !isActive(cueBall));
    var eightPotted = !!(eight && !isActive(eight));
    var cueEnd = cueBall ? { x: cueBall.x, y: cueBall.y } : null;
    var firstHit = firstHitFromEvents(simEvents, cueId, 0);

    return {
      verified: true,
      world: cw,
      potted: potted,
      pottedPocket: pottedPocket,
      cuePotted: cuePotted,
      eightPotted: eightPotted,
      cueEnd: cueEnd,
      firstHit: firstHit,
      completed: completed,
      simSeconds: t,
      eventCount: simEvents.length
    };
  }

  /* 轻量解析模拟（物理引擎不可用时的兜底，也用于粗略走位估计） */
  function analyticRollout(world, shot, info, cueId) {
    var R = info.R;
    var PR = info.PR;
    var pc = physCfg();
    var src = (world && world.balls) || [];
    var balls = [];
    var i, j;
    for (i = 0; i < src.length; i++) {
      var sb = src[i];
      if (!isActive(sb)) continue;
      balls.push({ id: sb.id, number: sb.number, x: sb.x, y: sb.y, vx: 0, vy: 0, active: true, pocketIndex: null });
    }
    var cue = null;
    for (i = 0; i < balls.length; i++) {
      if (balls[i].id === cueId) { cue = balls[i]; break; }
    }
    if (!cue) {
      for (i = 0; i < balls.length; i++) if (balls[i].number === 0) { cue = balls[i]; break; }
    }
    if (!cue) return null;

    var speed = shot.power * pc.maxShotSpeed;
    cue.vx = Math.cos(shot.angle) * speed;
    cue.vy = Math.sin(shot.angle) * speed;
    var decel = pc.rollingDecel * 1.7;
    var e = 0.94;
    var dt = 0.008;
    var t = 0;
    var firstHit = null;
    var cuePotted = false;
    var spinY = shot.spinY || 0;
    var lastT = 0;

    function moving() {
      for (var k = 0; k < balls.length; k++) {
        var b = balls[k];
        if (b.active && (b.vx * b.vx + b.vy * b.vy) > 4e-4) return true;
      }
      return false;
    }

    while (t < 6) {
      /* 移动 + 摩擦 */
      for (i = 0; i < balls.length; i++) {
        var b = balls[i];
        if (!b.active) continue;
        var sp = hypot(b.vx, b.vy);
        if (sp < 0.006) { b.vx = 0; b.vy = 0; continue; }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        var nsp = Math.max(0, sp - decel * dt);
        var kk = nsp / sp;
        b.vx *= kk; b.vy *= kk;
      }
      /* 球-球碰撞 */
      for (i = 0; i < balls.length; i++) {
        var a = balls[i];
        if (!a.active) continue;
        for (j = i + 1; j < balls.length; j++) {
          var c = balls[j];
          if (!c.active) continue;
          var dx = c.x - a.x, dy = c.y - a.y;
          var d2 = dx * dx + dy * dy;
          if (d2 >= 4 * R * R || d2 < 1e-12) continue;
          var d = Math.sqrt(d2);
          var nx = dx / d, ny = dy / d;
          var vn = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
          if (vn <= 0) {
            var push = (2 * R - d) * 0.5;
            a.x -= nx * push; a.y -= ny * push;
            c.x += nx * push; c.y += ny * push;
            continue;
          }
          var imp = (1 + e) * vn * 0.5;
          if (a === cue || c === cue) {
            var pre = hypot(cue.vx, cue.vy);
            if (!firstHit) firstHit = (a === cue ? c.id : a.id);
            if (pre > 0.01 && spinY !== 0) {
              var pdx = cue.vx / pre, pdy = cue.vy / pre;
              cue.vx += pdx * spinY * pre * 0.55;
              cue.vy += pdy * spinY * pre * 0.55;
            }
          }
          a.vx -= imp * nx; a.vy -= imp * ny;
          c.vx += imp * nx; c.vy += imp * ny;
        }
      }
      /* 库边 */
      for (i = 0; i < balls.length; i++) {
        var bb = balls[i];
        if (!bb.active) continue;
        if (bb.x < R) { bb.x = R; if (bb.vx < 0) bb.vx = -bb.vx * pc.cushionRestitution; }
        else if (bb.x > info.W - R) { bb.x = info.W - R; if (bb.vx > 0) bb.vx = -bb.vx * pc.cushionRestitution; }
        if (bb.y < R) { bb.y = R; if (bb.vy < 0) bb.vy = -bb.vy * pc.cushionRestitution; }
        else if (bb.y > info.H - R) { bb.y = info.H - R; if (bb.vy > 0) bb.vy = -bb.vy * pc.cushionRestitution; }
      }
      /* 落袋 */
      for (i = 0; i < balls.length; i++) {
        var pb = balls[i];
        if (!pb.active) continue;
        for (j = 0; j < info.pockets.length; j++) {
          var pk = info.pockets[j];
          if (dist(pb.x, pb.y, pk.x, pk.y) < PR * 0.92) {
            pb.active = false;
            pb.pocketIndex = pk.index;
            if (pb === cue) cuePotted = true;
            break;
          }
        }
      }
      t += dt;
      lastT = t;
      if (!moving()) break;
    }

    var target = null;
    for (i = 0; i < balls.length; i++) {
      if (balls[i].id === shot.targetId) { target = balls[i]; break; }
    }
    var eight = null;
    for (i = 0; i < balls.length; i++) if (balls[i].number === 8) { eight = balls[i]; break; }
    return {
      verified: false,
      potted: !!(target && !target.active),
      pottedPocket: target ? target.pocketIndex : null,
      cuePotted: cuePotted,
      eightPotted: !!(eight && !eight.active),
      cueEnd: cue.active ? { x: cue.x, y: cue.y } : null,
      firstHit: firstHit,
      completed: true,
      simSeconds: lastT,
      eventCount: 0
    };
  }

  /* ============================ 自由球摆放 ============================ */

  function validCueSpot(world, x, y, info, balls, extraClearance) {
    var clear = extraClearance != null ? extraClearance : 0.008;
    if (!insideTable(x, y, info, clear)) return false;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (!isActive(b)) continue;
      if (b.id === 'cue' || b.number === 0) continue;
      if (dist(x, y, b.x, b.y) < 2 * info.R + 0.006) return false;
    }
    for (var j = 0; j < info.pockets.length; j++) {
      var p = info.pockets[j];
      if (dist(x, y, p.x, p.y) < info.PR + info.R * 1.6) return false;
    }
    return true;
  }

  /* 寻找能形成简单直球的摆放点 */
  function findPlacements(world, opts, info, legal, prof, cueId) {
    var R = info.R;
    var balls = activeBalls(world);
    var tol = 2 * R * 0.98;
    var out = [];
    var offsets = [0.34, 0.48, 0.66, 0.88, 1.15];
    for (var ti = 0; ti < legal.length; ti++) {
      var t = legal[ti];
      if (!isActive(t)) continue;
      for (var pi = 0; pi < info.pockets.length; pi++) {
        var p = info.pockets[pi];
        var aim = aimPointOf(p, info);
        var dxp = aim.x - t.x, dyp = aim.y - t.y;
        var dtp = hypot(dxp, dyp);
        if (dtp < R * 2) continue;
        var ux = dxp / dtp, uy = dyp / dtp;
        var gx = t.x - ux * 2 * R, gy = t.y - uy * 2 * R;
        if (!insideTable(gx, gy, info, 0)) continue;
        if (pathBlocked(balls, t.x, t.y, aim.x, aim.y, tol, ignoreMap([t.id, cueId]))) continue;
        for (var oi = 0; oi < offsets.length; oi++) {
          var off = offsets[oi];
          var cx = gx - ux * off, cy = gy - uy * off;
          if (!validCueSpot(world, cx, cy, info, balls)) continue;
          if (!insideTable(gx, gy, info, 0)) continue;
          if (pathBlocked(balls, cx, cy, gx, gy, tol, ignoreMap([cueId, t.id]))) continue;
          var dcg = off;
          var q = potQuality(0, dcg, dtp, prof);
          var nextPos = positionValue(world, { x: gx, y: gy }, remainingAfter(legal, t.id), info, prof, cueId);
          var score = q * 100 + nextPos * 20 - off * 3;
          out.push({
            x: cx, y: cy,
            targetId: t.id,
            pocketIndex: p.index,
            angle: Math.atan2(gy - cy, gx - cx),
            power: estimatePower(dcg, dtp, 0, info),
            quality: q,
            score: score
          });
        }
      }
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }

  function remainingAfter(legal, pottedId) {
    var out = [];
    for (var i = 0; i < legal.length; i++) {
      if (legal[i].id !== pottedId) out.push(legal[i]);
    }
    return out;
  }

  /* 自由球兜底：网格扫描一个合法空位 */
  function fallbackSpot(world, info) {
    var balls = activeBalls(world);
    var best = null;
    var bestScore = -Infinity;
    var nx = 22, ny = 11;
    for (var ix = 1; ix < nx; ix++) {
      for (var iy = 1; iy < ny; iy++) {
        var x = info.W * ix / nx;
        var y = info.H * iy / ny;
        if (!validCueSpot(world, x, y, info, balls, 0.01)) continue;
        var dmin = Infinity;
        for (var i = 0; i < balls.length; i++) {
          if (!isActive(balls[i]) || balls[i].id === 'cue') continue;
          dmin = Math.min(dmin, dist(x, y, balls[i].x, balls[i].y));
        }
        var score = Math.min(dmin, 0.8) - 0.15 * (Math.abs(y - info.H / 2) + Math.abs(x - info.W * 0.28));
        if (score > bestScore) { bestScore = score; best = { x: x, y: y }; }
      }
    }
    return best;
  }

  /* ============================ 安全球 ============================ */

  function opponentTargets(world, opts, legal) {
    var legalIds = {};
    for (var i = 0; i < legal.length; i++) legalIds[legal[i].id] = 1;
    var out = [];
    var balls = activeBalls(world);
    for (var j = 0; j < balls.length; j++) {
      var b = balls[j];
      if (b.number === 0 || b.id === 'cue') continue;
      if (legalIds[b.id]) continue;
      out.push(b);
    }
    if (!out.length) {
      for (var k = 0; k < balls.length; k++) {
        var b2 = balls[k];
        if (b2.number === 0 || b2.id === 'cue') continue;
        if (b2.number === 8) continue;
        out.push(b2);
      }
    }
    return out;
  }

  function chooseSafety(world, opts, info, legal, cuePos, cueId, prof, deadline) {
    var R = info.R;
    var balls = activeBalls(world);
    var tol = 2 * R * 0.98;
    var opp = opponentTargets(world, opts, legal);
    var best = null;
    var pool = [];
    var i;
    for (i = 0; i < legal.length; i++) {
      var t = legal[i];
      if (!isActive(t)) continue;
      var dx = t.x - cuePos.x, dy = t.y - cuePos.y;
      var d = hypot(dx, dy);
      if (d < 2 * R * 1.05) continue;
      var u = unit(dx, dy);
      if (!u) continue;
      var gx = t.x - u.x * 2 * R, gy = t.y - u.y * 2 * R;
      if (!insideTable(gx, gy, info, 0)) continue;
      if (pathBlocked(balls, cuePos.x, cuePos.y, gx, gy, tol, ignoreMap([cueId, t.id]))) continue;
      var power = clamp(0.11 + 0.11 * d, 0.13, 0.46);
      var shot = { angle: Math.atan2(u.y, u.x), power: power, spinX: 0, spinY: 0, targetId: t.id };
      var res = analyticRollout(world, shot, info, cueId);
      if (res && res.cuePotted) continue;
      var cueEnd = res && res.cueEnd ? res.cueEnd : { x: gx, y: gy };
      var threat = bestNextPot(world, cueEnd, opp, info, prof, cueId);
      var edge = Math.min(cueEnd.x - R, info.W - R - cueEnd.x, cueEnd.y - R, info.H - R - cueEnd.y);
      var nearRail = clamp(1 - edge / 0.25, 0, 1);
      var score = -threat * 100 + nearRail * 16 + (1 / (1 + d)) * 12;
      pool.push({ score: score, shot: shot, cueEnd: cueEnd, targetId: t.id });
    }

    // 高手档：把几何评分最高的几个安全球用真实物理试打一遍，
    // 用“对手下一步真实位置”重新评分，避免几何估算偏差。
    if (prof.twoPly && pool.length > 1 && deadline && now() < deadline - 20) {
      pool.sort(function (a, b) { return b.score - a.score; });
      var topN = Math.min(pool.length, 4);
      for (i = 0; i < topN; i++) {
        if (now() > deadline - 12) break;
        var cand = pool[i];
        var sim = simulate(world, cueId, cand.shot, info, null, deadline);
        if (!sim || !sim.verified || sim.cuePotted) continue;
        var realEnd = sim.cueEnd || cand.cueEnd;
        var realThreat = bestNextPot(sim.world, realEnd, opp, info, prof, cueId);
        var edge2 = Math.min(realEnd.x - R, info.W - R - realEnd.x, realEnd.y - R, info.H - R - realEnd.y);
        var nearRail2 = clamp(1 - edge2 / 0.25, 0, 1);
        var sc2 = -realThreat * 100 + nearRail2 * 16;
        if (sc2 > cand.score) { cand.score = sc2; cand.cueEnd = realEnd; }
      }
      pool.sort(function (a, b) { return b.score - a.score; });
    }

    if (!pool.length) return null;
    var winner = pool[0];
    return {
      score: winner.score,
      angle: winner.shot.angle,
      power: winner.shot.power,
      spinX: 0,
      spinY: 0,
      ballId: winner.targetId,
      targetId: winner.targetId,
      pocketIndex: null,
      confidence: 0.18,
      plan: 'safety',
      placement: null
    };
  }

  /* ============================ 决策主流程 ============================ */

  function seedFromWorld(world, opts, prof) {
    var seed = 2166136261;
    function mix(n) {
      seed ^= Math.round((n * 100000) | 0);
      seed = Math.imul(seed, 16777619) >>> 0;
    }
    var balls = (world && world.balls) || [];
    for (var i = 0; i < balls.length; i++) mix(balls[i].number + 1), mix(balls[i].x), mix(balls[i].y);
    mix(opts && opts.ballInHand ? 7 : 3);
    mix(prof && prof.sims ? prof.sims : 3);
    return seed >>> 0;
  }

  function chooseShot(world, opts) {
    var t0 = now();
    opts = opts || {};

    var result = {
      angle: 0, power: 0.35, spinX: 0, spinY: 0,
      ballId: null, pocketIndex: null, confidence: 0,
      plan: 'safety', placement: null
    };

    if (!world || !world.balls) return result;

    var info = tableInfo();
    var difficulty = opts.difficulty || 'normal';
    var prof = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    var cueId = opts.cueBallId || 'cue';
    var cue = findBall(world, cueId);
    var legal = legalTargets(world, opts);

    if (!legal.length) return result;
    if (!cue && !opts.ballInHand) {
      result.ballId = legal[0].id;
      var fb = unit(legal[0].x - info.W * 0.5, legal[0].y - info.H * 0.5);
      result.angle = fb ? Math.atan2(fb.y, fb.x) : 0;
      return result;
    }

    var eightLegal = false;
    for (var ei = 0; ei < legal.length; ei++) if (legal[ei].number === 8) eightLegal = true;

    // 球杆系数：出杆时 power/spin 会被乘上球杆属性，模拟必须用同一套换算
    var cuePower = (opts && opts.cuePower) > 0 ? opts.cuePower : 1;
    var cueSpin = (opts && opts.cueSpin) > 0 ? opts.cueSpin : 1;
    var maxTime = opts.maxTimeMs || 300;
    var hardDeadline = t0 + clamp(maxTime, 60, 300);
    var softBudget = prof.budget || 85;
    var softDeadline = t0 + Math.min(hardDeadline - t0, softBudget);
    // 角度/力度微调单独设截止：否则低档位也会把整个 250ms 预算跑满，
    // 出现「陪练比高手还慢」的体感。
    var refineDeadline = Math.min(hardDeadline, t0 + Math.round(softBudget * 1.25));

    var rng = makeRng(seedFromWorld(world, opts, prof));
    var cuePosStart = cue ? { x: cue.x, y: cue.y } : { x: info.W * 0.25, y: info.H / 2 };
    var placementPos = null;

    /* ---------- 自由球：先找能简单进球的摆放点 ---------- */
    if (opts.ballInHand) {
      var places = findPlacements(world, opts, info, legal, prof, cueId);
      var tried = 0;
      var chosenPlace = null;
      for (var qi = 0; qi < places.length && tried < 2; qi++) {
        var pl = places[qi];
        var shotP = { angle: pl.angle, power: pl.power, spinX: 0, spinY: aiSpinY(null), targetId: pl.targetId };
        var simP = null;
        if (tried < 2 && now() < softDeadline) {
          simP = simulate(world, cueId, shotP, info, { x: pl.x, y: pl.y }, hardDeadline);
          tried++;
        }
        if (simP && simP.verified) {
          if (simP.potted && !simP.cuePotted && (!simP.firstHit || simP.firstHit === pl.targetId)) {
            chosenPlace = { place: pl, res: simP };
            break;
          }
        } else if (!chosenPlace) {
          chosenPlace = { place: pl, res: null };
          break;
        }
      }
      if (!chosenPlace && places.length) chosenPlace = { place: places[0], res: null };
      if (chosenPlace) {
        placementPos = { x: chosenPlace.place.x, y: chosenPlace.place.y };
        var placeRes = chosenPlace.res;
        var potted = placeRes ? placeRes.potted : true;
        result.angle = chosenPlace.place.angle;
        result.power = clamp(chosenPlace.place.power / cuePower, 0.03, 1);
        result.spinX = 0;
        result.spinY = clamp(aiSpinY(null) / cueSpin, -1, 1);
        result.ballId = chosenPlace.place.targetId;
        result.pocketIndex = chosenPlace.place.pocketIndex;
        result.placement = placementPos;
        result.plan = 'pot';
        result.confidence = clamp(
          (potted ? chosenPlace.place.quality : chosenPlace.place.quality * 0.6) * prof.conf, 0.05, 0.97
        );
        return finishShot(result, prof, rng);
      }
      /* 找不到进球点：用兜底空位 + 安全球 */
      placementPos = fallbackSpot(world, info) || cuePosStart;
      var safe = chooseSafety(world, opts, info, legal, placementPos, cueId, prof, hardDeadline);
      if (safe) {
        safe.placement = placementPos;
        return finishShot(safe, prof, rng);
      }
      result.placement = placementPos;
      return finishShot(result, prof, rng);
    }

    var cuePos = cuePosStart;

    /* ---------- 候选：每个合法目标球 × 6 袋 ---------- */
    var cands = buildCandidates(world, opts, info, legal, prof, cuePos, cueId, eightLegal);

    if (!cands.length) {
      var safety = chooseSafety(world, opts, info, legal, cuePos, cueId, prof, hardDeadline);
      if (safety) return finishShot(safety, prof, rng);
      /* 终极兜底：朝最近合法球方向轻推 */
      var near = null, nearD = Infinity;
      for (var ni = 0; ni < legal.length; ni++) {
        var dd = dist(cuePos.x, cuePos.y, legal[ni].x, legal[ni].y);
        if (dd < nearD) { nearD = dd; near = legal[ni]; }
      }
      if (near) {
        result.angle = Math.atan2(near.y - cuePos.y, near.x - cuePos.x);
        result.power = 0.3;
        result.ballId = near.id;
      }
      return finishShot(result, prof, rng);
    }

    var remaining = legal.slice();
    var options = [];
    var simBudget = prof.sims;
    var consider = Math.min(cands.length, prof.consider);

    for (var ci = 0; ci < consider; ci++) {
      var cand = cands[ci];
      var sim = null;
      if (simBudget > 0 && now() < softDeadline) {
        sim = simulate(world, cueId, cand, info, null, hardDeadline);
        if (sim && sim.verified) simBudget--;
      }
      /* 力度微调：模拟差一点到袋时补一档力度，避免目标球中途停住 */
      if (sim && sim.verified && !sim.potted && !sim.cuePotted && cand.quality >= 0.30 &&
        ci < 3 && simBudget > 0 && now() < softDeadline - 6) {
        var retry = {
          target: cand.target, targetId: cand.targetId, pocketIndex: cand.pocketIndex,
          pocket: cand.pocket, aimX: cand.aimX, aimY: cand.aimY,
          ghostX: cand.ghostX, ghostY: cand.ghostY,
          cut: cand.cut, dcg: cand.dcg, dtp: cand.dtp,
          angle: cand.angle, power: clamp(cand.power * 1.35, 0.08, 1),
          quality: cand.quality, eightLegal: cand.eightLegal, cuePos: cand.cuePos
        };
        var sim2 = simulate(world, cueId, retry, info, null, hardDeadline);
        if (sim2 && sim2.verified) {
          simBudget--;
          if (sim2.potted && !sim2.cuePotted) { sim = sim2; cand = retry; }
        }
      }
      var res = sim || analyticRollout(world, cand, info, cueId);
      if (!res) continue;
      var afterRemaining = remainingAfter(remaining, cand.targetId);
      var posVal = (res.cueEnd ? positionValue(res.world || world, res.cueEnd, afterRemaining, info, prof, cueId) : 0);
      var oppVal = 0;
      if (prof.twoPly && res && res.verified && res.cueEnd) {
        var oppT = opponentTargetIds(res.world || world, opts, cueId);
        if (oppT.length) oppVal = bestNextPot(res.world || world, res.cueEnd, oppT, info, prof, cueId);
      }
      var score = scoreCandidate(cand, res, posVal, prof, oppVal);
      options.push({ cand: cand, res: res, score: score, pos: posVal, opp: oppVal });
    }

    if (!options.length) {
      var s2 = chooseSafety(world, opts, info, legal, cuePos, cueId, prof, hardDeadline);
      if (s2) return finishShot(s2, prof, rng);
      return finishShot(result, prof, rng);
    }

    options.sort(function (a, b) { return b.score - a.score; });
    var best = options[0];

    /* 高手档：对最优候选做真实物理微调（角度 + 力度），把“差一点”变成“正好进”。
       几何瞄准存在 0.2~0.5° 系统偏差，这一步就是职业选手的练球修正。 */
    if (prof.refine && now() < hardDeadline - 40) {
      // 只对“几何上值得打”的前几个候选做微调，且优先救回那些模拟差一点没进的球
      // 顺序：① 已模拟进球的候选直接用；② 常规微调救回"差一点"的；
      // ③ 全部没进时用宽网格强制命中——高手不能放着能瞄的球改打安全球。
      var pool = options.slice(0, 4);
      var picked = null;
      for (var qi2 = 0; qi2 < pool.length; qi2++) {
        if (now() > hardDeadline - 25) break;
        var opt = pool[qi2];
        if (opt.res && opt.res.potted) { picked = opt; break; }
        if ((opt.cand.quality || 0) < 0.35) continue;
        var tuned2 = refineShot(world, cueId, opt.cand, info, prof, refineDeadline, remaining, false);
        if (tuned2) { picked = opt; picked.cand = Object.assign({}, opt.cand, { angle: tuned2.angle, power: tuned2.power }); picked.res = tuned2.res; picked.pos = tuned2.pos; picked.tuned = tuned2.hits; break; }
      }
      if (!picked && prof.aggressive) {
        for (var fi2 = 0; fi2 < Math.min(3, pool.length); fi2++) {
          if (now() > hardDeadline - 60) break;
          var fopt = pool[fi2];
          if ((fopt.cand.quality || 0) < 0.25) continue;
          var forced = refineShot(world, cueId, fopt.cand, info, prof, refineDeadline, remaining, true);
          if (forced) {
            picked = fopt;
            picked.cand = Object.assign({}, fopt.cand, { angle: forced.angle, power: forced.power });
            picked.res = forced.res; picked.pos = forced.pos; picked.tuned = forced.hits;
            break;
          }
        }
      }
      if (picked) best = picked;
    }

    /* ---------- 走位微调：normal / hard 尝试不同高低杆 ---------- */
    if (prof.spin && prof.spinTries > 0 && best.cand && best.res && best.res.verified &&
      best.res.potted && now() < t0 + 60) {
      var remaining2 = remainingAfter(remaining, best.cand.targetId);
      if (remaining2.length) {
        var bestPos = best.pos;
        var bestSpinY = 0;
        var spins = prof.spinTries >= 5 ? [0.45, -0.45, 0.75, -0.75, 0.95]
          : (prof.spinTries >= 3 ? [0.45, -0.45, 0.75] : [0.45, -0.45]);
        for (var si = 0; si < spins.length; si++) {
          if (now() > hardDeadline - 15) break;
          var spShot = {
            angle: best.cand.angle, power: best.cand.power,
            spinX: 0, spinY: spins[si], targetId: best.cand.targetId
          };
          var spRes = simulate(world, cueId, spShot, info, null, hardDeadline);
          if (!spRes || !spRes.verified || !spRes.potted || spRes.cuePotted) continue;
          if (spRes.firstHit && spRes.firstHit !== best.cand.targetId) continue;
          var spPos = positionValue(spRes.world, spRes.cueEnd, remaining2, info, prof, cueId);
          if (spPos > bestPos + (prof.spinGain || 0.06)) {
            bestPos = spPos;
            bestSpinY = spins[si];
            best.res = spRes;
            best.pos = spPos;
          }
        }
        if (bestSpinY !== 0) best.cand = best.cand;
        best.spinY = bestSpinY;
      }
    }

    // AI 默认用极轻中高杆，避免新的真实“中杆滑动”在短距离模拟中停在目标球前；
    // 人类玩家仍由真实击球点决定，中杆保持定杆。
    // 关键：试打与微调都用 AI_DEFAULT_SPIN_Y，实拍必须一致。
    // 之前 best.spinY 缺省是 0，会把“跟进”变成“中杆滑动”，球明显变短、停在袋口。
    var outSpinY = (best.spinY !== null && best.spinY !== undefined && Math.abs(best.spinY) > 1e-6)
      ? aiSpinY(best.spinY)
      : AI_DEFAULT_SPIN_Y;
    var plan = 'pot';
    if (!best.res || !best.res.verified) {
      // 没拿到可信的模拟结果时不能盲目进攻：几何上"看起来能进"不等于物理上能进
      // （路径擦库、目标球被挤偏等）。开着 refine 的档位再试一次，仍无解就打安全球。
      var retry = null;
      if (prof.refine && best.cand && (best.cand.quality || 0) >= 0.45 && now() < hardDeadline - 30) {
        retry = refineShot(world, cueId, best.cand, info, prof, refineDeadline, remaining, !!prof.aggressive);
      }
      if (retry) {
        best.cand = Object.assign({}, best.cand, { angle: retry.angle, power: retry.power });
        best.res = retry.res; best.pos = retry.pos;
        plan = 'pot';
      } else {
        plan = 'safety';
      }
    } else if (!best.res.potted) {
      plan = 'safety';
    }

    var c = best.cand;
    result.angle = c.angle;
    // 反算球杆系数：模拟里用原始功率，出杆时会被乘上 cuePower
    result.power = clamp(c.power / cuePower, 0.03, 1);
    result.spinX = 0;
    result.spinY = clamp(outSpinY / cueSpin, -1, 1);
    result.ballId = c.targetId;
    result.pocketIndex = c.pocketIndex;
    result.plan = plan;

    // 出口自检：用最终要出的参数（角度/力度/杆法）再模拟一次。
    // 关键：出杆前 finishShot 会叠加 ±powerErr 的力度噪声，
    // 所以自检必须按「最坏情况力度」验证，否则临界球会在噪声下翻转
    // （表现为「AI 觉得能进、实际停在袋口」）。
    if (plan === 'pot') {
      var worstPower = clamp(c.power * (1 - (prof.powerErr || 0)) , 0.03, 1);
      var finalRes = simulate(world, cueId, { angle: c.angle, power: worstPower, spinX: 0, spinY: outSpinY, targetId: c.targetId }, info, null, hardDeadline);
      var finalOk = !!(finalRes && finalRes.verified && finalRes.potted && !finalRes.cuePotted);
      if (!finalOk) {
        var fallbackRes = simulate(world, cueId, { angle: c.angle, power: c.power, spinX: 0, spinY: AI_DEFAULT_SPIN_Y, targetId: c.targetId }, info, null, hardDeadline);
        if (fallbackRes && fallbackRes.verified && fallbackRes.potted && !fallbackRes.cuePotted) {
          outSpinY = AI_DEFAULT_SPIN_Y;
          best.res = fallbackRes;
        } else if (prof.verify) {
          // 高手档：再做一次宽网格强制命中。绝不在"辅助线还指着这个球"的时候
          // 把 plan 改成 safety 却继续用进球角度出杆（这正是玩家看到的明显瞄偏）。
          var lastTry = refineShot(world, cueId, c, info, prof, refineDeadline, remaining, !!prof.aggressive);
          if (lastTry) {
            c = Object.assign({}, c, { angle: lastTry.angle, power: lastTry.power });
            result.angle = c.angle;
            result.power = clamp(c.power / cuePower, 0.03, 1);
            outSpinY = AI_DEFAULT_SPIN_Y;
            result.spinY = clamp(outSpinY / cueSpin, -1, 1);
            best.res = lastTry.res;
          } else {
            // 确实打不进：换成真正的安全球方案（用它自己的角度和力度），
            // 而不是沿用刚才那个进球候选的瞄准线。
            var safeShot = chooseSafety(world, opts, info, legal, cuePos, cueId, prof, hardDeadline);
            if (safeShot) {
              result.angle = safeShot.angle;
              result.power = clamp(safeShot.power / cuePower, 0.03, 1);
              result.spinY = clamp(AI_DEFAULT_SPIN_Y / cueSpin, -1, 1);
              result.ballId = safeShot.ballId || safeShot.targetId || c.targetId;
              result.pocketIndex = null;
            }
            plan = 'safety';
            outSpinY = AI_DEFAULT_SPIN_Y;
          }
        } else {
          plan = 'safety';
          outSpinY = AI_DEFAULT_SPIN_Y;
        }
      }
    }
    // plan 可能在自检里被改过，必须同步回 result（旧版漏了这一步）。
    result.plan = plan;
    result.spinY = clamp(outSpinY / cueSpin, -1, 1);

    var potP;
    if (best.res && best.res.verified) potP = best.res.potted ? 1 : c.quality * 0.45;
    else potP = c.quality * 0.85;
    result.confidence = clamp(potP * prof.conf * (1 - 0.25 * c.cut / Math.PI), 0.03, 0.98);

    return finishShot(result, prof, rng);
  }

  function scoreCandidate(cand, res, posVal, prof, oppVal) {
    var score = 0;
    var verified = !!res.verified;
    var potted = !!res.potted;
    if (verified) {
      score += potted ? 100 : -22;
      // 球好不好打必须主导：直线/近距离/低切角大幅加分
      score += cand.quality * 42;
      score -= cand.cut * 9;
    } else {
      score += cand.quality * 88;
    }
    if (potted) score += 18 * (1 - cand.cut / Math.max(0.2, prof.maxCut));
    if (res.cuePotted) score -= 165;
    if (res.eightPotted) score += cand.eightLegal ? 140 : -300;
    if (res.firstHit && res.firstHit !== cand.targetId) score -= 60;
    // 走位是次级收益：封顶后最多相当于 +26 分，无法压过“好打的球”
    score += Math.min(prof.position * 46, 34) * (potted ? posVal : 0.2 * posVal);
    // 两拍（仅高手档）：主要用来挑安全球——不进球的杆法尽量别把好打的位置留给对手。
    // 进球本身价值最高，所以对进球杆只做很轻的修正，避免“为了走位而不进球”。
    if (prof.twoPly && oppVal) score -= prof.twoPly * (potted ? 8 : 42) * oppVal;
    score -= cand.power * 2.5;
    return score;
  }

  /* 加入难度误差（easy 角度/力度误差更大），返回合法范围 */
  function finishShot(result, prof, rng) {
    var direct = result.plan === 'pot' && Math.abs(result.cut || 0) < 0.035;
    var angleErr = (direct && prof.aggressive) ? 0 : prof.angleErr * (1.2 - 0.4 * (result.confidence || 0));
    var angle = result.angle + (rng() * 2 - 1) * angleErr;
    var power = result.power * (1 + (rng() * 2 - 1) * prof.powerErr);
    result.angle = angle;
    result.power = clamp(power, 0.06, 1);
    result.spinX = clamp(result.spinX || 0, -1, 1);
    result.spinY = clamp(result.spinY || 0, -1, 1);
    if (result.plan !== 'pot') result.confidence = clamp(result.confidence, 0.02, 0.35);
    result.confidence = clamp(result.confidence, 0.02, 0.98);
    return result;
  }

  /* ============================ 调试 / 测试辅助 ============================ */

  /* 只做几何分析，不做试打；不修改 world */
  function analyze(world, opts) {
    opts = opts || {};
    var info = tableInfo();
    var prof = DIFFICULTY[opts.difficulty] || DIFFICULTY.normal;
    var cueId = opts.cueBallId || 'cue';
    var legal = legalTargets(world, opts);
    var eightLegal = false;
    for (var i = 0; i < legal.length; i++) if (legal[i].number === 8) eightLegal = true;
    var cue = findBall(world, cueId);
    var cuePos = cue ? { x: cue.x, y: cue.y } : { x: info.W * 0.25, y: info.H / 2 };
    var placements = [];
    if (opts.ballInHand) {
      placements = findPlacements(world, opts, info, legal, prof, cueId);
      if (placements.length) cuePos = { x: placements[0].x, y: placements[0].y };
    }
    var cands = buildCandidates(world, opts, info, legal, prof, cuePos, cueId, eightLegal);
    var summary = [];
    for (var c = 0; c < cands.length; c++) {
      var cd = cands[c];
      summary.push({
        targetId: cd.targetId,
        pocketIndex: cd.pocketIndex,
        cutDeg: Math.round(cd.cut * 180 / Math.PI),
        dcg: Math.round(cd.dcg * 1000) / 1000,
        dtp: Math.round(cd.dtp * 1000) / 1000,
        quality: Math.round(cd.quality * 1000) / 1000,
        power: Math.round(cd.power * 1000) / 1000,
        angle: Math.round(cd.angle * 1000000) / 1000000
      });
    }
    return {
      legal: legal.map(function (b) { return b.id; }),
      cuePos: cuePos,
      candidates: summary,
      placements: placements.slice(0, 3).map(function (p) {
        return { x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000, targetId: p.targetId, quality: Math.round(p.quality * 1000) / 1000 };
      }),
      table: { W: info.W, H: info.H, R: info.R, PR: info.PR }
    };
  }

  Pool.AI = {
    version: '1.1.0',
    chooseShot: chooseShot,
    analyze: analyze,
    difficulty: DIFFICULTY
  };
})();
/* 即刻开球 / PRO POOL — 关卡数据（ai-levels-dev 维护）
 * 坐标单位米，原点在台呢左上角，x 向右 (2.54)，y 向下 (1.27)。
 * Pool.LEVELS = [ ... ]，完整摆球（不含母球）。
 *
 * 关卡机制（练习型关卡设计）：
 *   targets [] 本关必须打进的目标球号码（全色低号球 1..7）；
 *   blockers [] 干扰球号码（花色球 9..15），不能打进，进袋判失败；
 *   balls [] = targets + blockers 的完整摆球，供 physics/game 建世界。
 *   game.js 读取 targets / blockers；未提供 targets 时旧逻辑沿用 balls 全量（向后兼容）。
 *
 * 每关另含：goal（HUD 目标）、rules（辅助线/旋转说明与规则备注）。
 * 全部坐标经 tests/level_placements.test.js 结构校验，
 * 并由 tests/tmp_levels_solve.js 用 physics.js 逐目标实机验证「能打进且不先碰干扰球」。
 */
(function () {
  'use strict';

  var Pool = (window.Pool = window.Pool || {});

  Pool.LEVELS = [
    /* 01 ------------------------------------------------------------------ */
    {
      id: 'l1', name: '目标初体验', subtitle: 'FIRST POT', difficulty: 1,
      tip: '只打全色目标球：瞄准后轻推直线，白球别碰花色干扰球。',
      goal: { type: 'targets', total: 1, label: '打进 1 颗目标球' },
      rules: {
        guide: true,
        spin: false,
        guideText: '辅助线开启，可参考假想球与目标线路',
        spinText: '本关关闭旋转，专注力度与角度',
        summary: '辅助线开启 · 旋转关闭',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 1.27, y: 0.98 },
      targets: [1],
      blockers: [9],
      balls: [
        { number: 1, x: 1.2526, y: 0.4966 }, // target
        { number: 9, x: 0.7006, y: 0.7606 } // blocker
      ],
      ballInHand: true,
      maxShots: 10,
      par: 1,
      rewardCoins: 80,
      allowGuide: true,
      allowSpin: false
    },
    /* 02 ------------------------------------------------------------------ */
    {
      id: 'l2', name: '隔球直线', subtitle: 'THROUGH TRAFFIC', difficulty: 2,
      tip: '目标球旁边多了一颗花色球：路线被挤窄，出杆更要干净。',
      goal: { type: 'targets', total: 1, label: '打进 1 颗目标球' },
      rules: {
        guide: true,
        spin: false,
        guideText: '辅助线开启，可参考假想球与目标线路',
        spinText: '本关关闭旋转，专注力度与角度',
        summary: '辅助线开启 · 旋转关闭',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 0.55, y: 0.95 },
      targets: [1],
      blockers: [9],
      balls: [
        { number: 1, x: 0.8446, y: 0.4606 }, // target
        { number: 9, x: 1.4086, y: 0.6766 } // blocker
      ],
      ballInHand: true,
      maxShots: 12,
      par: 1,
      rewardCoins: 110,
      allowGuide: true,
      allowSpin: false
    },
    /* 03 ------------------------------------------------------------------ */
    {
      id: 'l3', name: '角度入门', subtitle: 'CUT SHOT', difficulty: 3,
      tip: '开始有角度：先找假想球，再把目标球稳稳送进袋口。',
      goal: { type: 'targets', total: 1, label: '打进 1 颗目标球' },
      rules: {
        guide: true,
        spin: false,
        guideText: '辅助线开启，可参考假想球与目标线路',
        spinText: '本关关闭旋转，专注力度与角度',
        summary: '辅助线开启 · 旋转关闭',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 0.4, y: 0.635 },
      targets: [1],
      blockers: [9],
      balls: [
        { number: 1, x: 1.8766, y: 0.4366 }, // target
        { number: 9, x: 1.2766, y: 0.6406 } // blocker
      ],
      ballInHand: false,
      maxShots: 12,
      par: 2,
      rewardCoins: 150,
      allowGuide: true,
      allowSpin: false
    },
    /* 04 ------------------------------------------------------------------ */
    {
      id: 'l4', name: '双目标', subtitle: 'TWO TARGETS', difficulty: 4,
      tip: '两颗目标球一上一下：分配好母球停点，别为走位碰到花色球。',
      goal: { type: 'targets', total: 2, label: '打进 2 颗目标球' },
      rules: {
        guide: true,
        spin: true,
        guideText: '辅助线开启，可参考假想球与目标线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线开启 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 0.45, y: 1 },
      targets: [1, 2],
      blockers: [9],
      balls: [
        { number: 1, x: 0.7006, y: 0.4486 }, // target
        { number: 2, x: 1.9606, y: 0.9406 }, // target
        { number: 9, x: 1.2766, y: 0.6406 } // blocker
      ],
      ballInHand: true,
      maxShots: 12,
      par: 2,
      rewardCoins: 180,
      allowGuide: true,
      allowSpin: true
    },
    /* 05 ------------------------------------------------------------------ */
    {
      id: 'l5', name: '花球拦路', subtitle: 'BLOCKERS', difficulty: 5,
      tip: '花色球挡住两侧袋口，只能走中袋：稳准薄，别把干扰球撞进袋。',
      goal: { type: 'targets', total: 2, label: '打进 2 颗目标球' },
      rules: {
        guide: true,
        spin: true,
        guideText: '辅助线开启，可参考假想球与目标线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线开启 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 0.7, y: 0.635 },
      targets: [1, 2],
      blockers: [9, 10],
      balls: [
        { number: 1, x: 1.8646, y: 0.7966 }, // target
        { number: 2, x: 1.8646, y: 0.4726 }, // target
        { number: 9, x: 1.3486, y: 1.1086 }, // blocker
        { number: 10, x: 1.3486, y: 0.1606 } // blocker
      ],
      ballInHand: false,
      maxShots: 12,
      par: 3,
      rewardCoins: 220,
      allowGuide: true,
      allowSpin: true
    },
    /* 06 ------------------------------------------------------------------ */
    {
      id: 'l6', name: '薄边切球', subtitle: 'THIN CUT', difficulty: 6,
      tip: '切角更大：瞄准点更薄、力度稍大，把目标球送进袋，出杆别抖。',
      goal: { type: 'targets', total: 2, label: '打进 2 颗目标球' },
      rules: {
        guide: true,
        spin: true,
        guideText: '辅助线开启，可参考假想球与目标线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线开启 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 0.8, y: 0.95 },
      targets: [1, 2],
      blockers: [9, 10],
      balls: [
        { number: 1, x: 1.8766, y: 0.7486 }, // target
        { number: 2, x: 1.4806, y: 0.7366 }, // target
        { number: 9, x: 1.3486, y: 0.1486 }, // blocker
        { number: 10, x: 0.7726, y: 0.3406 } // blocker
      ],
      ballInHand: false,
      maxShots: 14,
      par: 3,
      rewardCoins: 260,
      allowGuide: true,
      allowSpin: true
    },
    /* 07 ------------------------------------------------------------------ */
    {
      id: 'l7', name: '三球连线', subtitle: 'THREE BALLS', difficulty: 7,
      tip: '三颗目标球分散在不同角度：先打最稳的一颗，再处理贴库球。',
      goal: { type: 'targets', total: 3, label: '打进 3 颗目标球' },
      rules: {
        guide: true,
        spin: true,
        guideText: '辅助线开启，可参考假想球与目标线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线开启 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 0.45, y: 0.635 },
      targets: [1, 2, 3],
      blockers: [9, 10],
      balls: [
        { number: 1, x: 0.7846, y: 0.2686 }, // target
        { number: 2, x: 1.6486, y: 0.7126 }, // target
        { number: 3, x: 1.7446, y: 0.5566 }, // target
        { number: 9, x: 1.0606, y: 0.8446 }, // blocker
        { number: 10, x: 1.3486, y: 0.1246 } // blocker
      ],
      ballInHand: false,
      maxShots: 14,
      par: 4,
      rewardCoins: 290,
      allowGuide: true,
      allowSpin: true
    },
    /* 08 ------------------------------------------------------------------ */
    {
      id: 'l8', name: '密集干扰', subtitle: 'HEAVY TRAFFIC', difficulty: 8,
      tip: '干扰球更多、台面更堵：能直落就别翻袋，时刻注意母球走位。',
      goal: { type: 'targets', total: 3, label: '打进 3 颗目标球' },
      rules: {
        guide: true,
        spin: true,
        guideText: '辅助线开启，可参考假想球与目标线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线开启 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 1.27, y: 1 },
      targets: [1, 2, 3],
      blockers: [9, 10, 11],
      balls: [
        { number: 1, x: 0.7006, y: 0.3406 }, // target
        { number: 2, x: 0.7486, y: 0.9406 }, // target
        { number: 3, x: 1.8766, y: 0.7606 }, // target
        { number: 9, x: 1.3246, y: 0.5806 }, // blocker
        { number: 10, x: 1.0366, y: 0.4846 }, // blocker
        { number: 11, x: 1.4446, y: 0.6526 } // blocker
      ],
      ballInHand: false,
      maxShots: 18,
      par: 4,
      rewardCoins: 330,
      allowGuide: true,
      allowSpin: true
    },
    /* 09 ------------------------------------------------------------------ */
    {
      id: 'l9', name: '长台清点', subtitle: 'LONG TABLE', difficulty: 9,
      tip: '关闭辅助线：靠记忆判断线路，长台把目标球送进袋口，发力要平直。',
      goal: { type: 'targets', total: 3, label: '打进 3 颗目标球' },
      rules: {
        guide: false,
        spin: true,
        guideText: '本关关闭辅助线，靠手感判断线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线关闭 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 0.3, y: 0.635 },
      targets: [1, 2, 3],
      blockers: [10, 11, 12],
      balls: [
        { number: 1, x: 0.7726, y: 0.4486 }, // target
        { number: 2, x: 1.5406, y: 0.5686 }, // target
        { number: 3, x: 1.6246, y: 0.7006 }, // target
        { number: 10, x: 0.2806, y: 0.1006 }, // blocker
        { number: 11, x: 1.0726, y: 0.8446 }, // blocker
        { number: 12, x: 1.3246, y: 0.2566 } // blocker
      ],
      ballInHand: false,
      maxShots: 18,
      par: 5,
      rewardCoins: 370,
      allowGuide: false,
      allowSpin: true
    },
    /* 10 ------------------------------------------------------------------ */
    {
      id: 'l10', name: '组合出杆', subtitle: 'COMBINATION', difficulty: 10,
      tip: '组合与走位：用高低杆把母球送到下一颗目标球附近。',
      goal: { type: 'targets', total: 4, label: '打进 4 颗目标球' },
      rules: {
        guide: false,
        spin: true,
        guideText: '本关关闭辅助线，靠手感判断线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线关闭 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 1.27, y: 0.635 },
      targets: [1, 2, 3, 4],
      blockers: [9, 10, 11],
      balls: [
        { number: 1, x: 0.6166, y: 0.4846 }, // target
        { number: 2, x: 0.7126, y: 0.7006 }, // target
        { number: 3, x: 1.8286, y: 0.5686 }, // target
        { number: 4, x: 0.9046, y: 0.2566 }, // target
        { number: 9, x: 2.1406, y: 1.0846 }, // blocker
        { number: 10, x: 2.1886, y: 0.0886 }, // blocker
        { number: 11, x: 1.1566, y: 1.1086 } // blocker
      ],
      ballInHand: false,
      maxShots: 24,
      par: 5,
      rewardCoins: 410,
      allowGuide: false,
      allowSpin: true
    },
    /* 11 ------------------------------------------------------------------ */
    {
      id: 'l11', name: '四球挑战', subtitle: 'FOUR BALLS', difficulty: 11,
      tip: '四颗目标球 + 四颗干扰球：每一杆都要想好下一杆。',
      goal: { type: 'targets', total: 4, label: '打进 4 颗目标球' },
      rules: {
        guide: false,
        spin: true,
        guideText: '本关关闭辅助线，靠手感判断线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线关闭 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 0.35, y: 0.9 },
      targets: [1, 2, 3, 4],
      blockers: [9, 10, 11, 12],
      balls: [
        { number: 1, x: 1.6246, y: 0.8326 }, // target
        { number: 2, x: 1.5166, y: 0.1006 }, // target
        { number: 3, x: 0.8206, y: 0.7006 }, // target
        { number: 4, x: 1.9606, y: 0.6046 }, // target
        { number: 9, x: 1.4086, y: 0.4966 }, // blocker
        { number: 10, x: 1.4926, y: 0.4006 }, // blocker
        { number: 11, x: 1.1086, y: 0.9526 }, // blocker
        { number: 12, x: 1.3726, y: 1.0726 } // blocker
      ],
      ballInHand: false,
      maxShots: 26,
      par: 6,
      rewardCoins: 460,
      allowGuide: false,
      allowSpin: true
    },
    /* 12 ------------------------------------------------------------------ */
    {
      id: 'l12', name: '终局清台', subtitle: 'FINAL RUN', difficulty: 12,
      tip: '终局：清光四颗目标球，别碰任何花色干扰球，稳住节奏收下挑战。',
      goal: { type: 'targets', total: 4, label: '打进 4 颗目标球' },
      rules: {
        guide: false,
        spin: true,
        guideText: '本关关闭辅助线，靠手感判断线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线关闭 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。本模式不含八球分组与黑八顺序限制。'
      },
      cue: { x: 1.27, y: 1.05 },
      targets: [1, 2, 3, 4],
      blockers: [11, 12, 13, 14],
      balls: [
        { number: 1, x: 0.7966, y: 0.3886 }, // target
        { number: 2, x: 0.7486, y: 0.9406 }, // target
        { number: 3, x: 1.6486, y: 0.4126 }, // target
        { number: 4, x: 1.7686, y: 0.9286 }, // target
        { number: 11, x: 1.2406, y: 0.6166 }, // blocker
        { number: 12, x: 1.1686, y: 0.2446 }, // blocker
        { number: 13, x: 1.5766, y: 0.7126 }, // blocker
        { number: 14, x: 1.4446, y: 0.2206 } // blocker
      ],
      ballInHand: false,
      maxShots: 26,
      par: 6,
      rewardCoins: 500,
      allowGuide: false,
      allowSpin: true
    }
  ];
})();
/* 即刻开球 — 游戏流程 / 八球规则 / 关卡 / 存档（Lead 维护） */
(function () {
  var Pool = (window.Pool = window.Pool || {});
  var U = Pool.UTIL;
  var C = Pool.CONFIG;

  function kindOf(n) {
    if (n === 0) return 'cue';
    if (n === 8) return 'eight';
    return n < 8 ? 'solid' : 'stripe';
  }
  function colorOf(n) {
    if (n === 0) return '#f2eddf';
    return Pool.BALL_COLORS[n] || '#cccccc';
  }
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  var AI_NAMES = {
    easy: '球房新手',
    normal: '职业陪练',
    hard: '黑八高手'
  };
  /* 金币经济默认值：CONFIG.economy 缺失/不完整时回退（保证单测可独立运行）。
   * 一切金币变动都只用于游戏内购买球杆，不接任何支付/广告。 */
  var DEFAULT_ECONOMY = {
    matchWin: { easy: 80, normal: 140, hard: 240 },
    matchLoss: { easy: 30, normal: 45, hard: 70 },
    pvpWin: 60,
    levelWinRepeatRate: 0.30,
    levelLoss: 40,
    minCoins: 0
  };

  function finiteNumber(value, fallback) {
    return (typeof value === 'number' && isFinite(value)) ? value : fallback;
  }

  /* 合并 CONFIG.economy 与默认值，任何字段缺失都安全回退 */
  function economy() {
    var e = (Pool.CONFIG && Pool.CONFIG.economy) || null;
    if (!e || typeof e !== 'object') e = {};
    var dw = DEFAULT_ECONOMY.matchWin;
    var dl = DEFAULT_ECONOMY.matchLoss;
    var w = (e.matchWin && typeof e.matchWin === 'object') ? e.matchWin : {};
    var l = (e.matchLoss && typeof e.matchLoss === 'object') ? e.matchLoss : {};
    return {
      matchWin: {
        easy: finiteNumber(w.easy, dw.easy),
        normal: finiteNumber(w.normal, dw.normal),
        hard: finiteNumber(w.hard, dw.hard)
      },
      matchLoss: {
        easy: finiteNumber(l.easy, dl.easy),
        normal: finiteNumber(l.normal, dl.normal),
        hard: finiteNumber(l.hard, dl.hard)
      },
      pvpWin: finiteNumber(e.pvpWin, DEFAULT_ECONOMY.pvpWin),
      levelWinRepeatRate: finiteNumber(e.levelWinRepeatRate, DEFAULT_ECONOMY.levelWinRepeatRate),
      levelLoss: finiteNumber(e.levelLoss, DEFAULT_ECONOMY.levelLoss),
      minCoins: finiteNumber(e.minCoins, DEFAULT_ECONOMY.minCoins)
    };
  }

  var Game = function (opts) {
    opts = opts || {};
    this.renderer = opts.renderer || null;
    this.audio = opts.audio || null;
    this.save = opts.save || this.defaultSave();
    this.persist = opts.persist || function () {};
    this.listeners = {};
    this.cue = this.findCue(this.save.equipped) || C.cues[0];

    this.phase = 'menu';
    this.mode = null;
    this.difficulty = 'normal';
    this.level = null;
    this.world = null;
    this.players = [];
    this.activePlayer = 0;
    this.time = 0;
    this.paused = false;
    this.guideEnabled = this.save.settings ? this.save.settings.guide !== false : true;

    this.aimAngle = 0;
    this.aimTargetAngle = 0;
    this._aimSnap = null;
    this.fineAim = false;
    this._fineRaw = null;
    this._fineAim = null;
    this.power = 0;
    this.charging = false;
    this.chargeT = 0;
    this.spinX = 0;
    this.spinY = 0;
    this.ballInHand = false;
    this.cuePreview = null;
    // 自由球放好之后还能再抓起来调整；cueDragging 表示正被手指/鼠标拖着
    this.ballReAdjust = false;
    this.cueDragging = false;
    this.openTable = true;
    this.breakShot = true;
    this.shots = 0;
    this.shotsByPlayer = [0, 0];
    this.fouls = [0, 0];
    this.shotCtx = null;
    this.shotTime = 0;
    this.timeoutT = 0;
    this.ai = { stage: 'idle', t: 0, plan: null };
    this.matchResult = null;
    this.levelResult = null;
    this.lastAimError = 0;

    try {
      this.world = this.buildDemoWorld();
    } catch (e) {
      this.world = null;
    }
    this.faceNearestTarget();
  };

  /* ---------------------------------- 存档 ---------------------------------- */
  Game.prototype.defaultSave = function () {
    return {
      version: 1,
      coins: 0,
      stars: {},
      cleared: {},
      ownedCues: ['oak'],
      equipped: 'oak',
      settings: { guide: true, sound: true },
      record: { wins: 0, losses: 0, matches: 0 },
      createdAt: Date.now()
    };
  };

  Game.prototype.totalStars = function () {
    var total = 0, stars = this.save.stars || {};
    for (var k in stars) if (Object.prototype.hasOwnProperty.call(stars, k)) total += stars[k] || 0;
    return total;
  };

  /* 应用金币变动：负数扣除，结果 clamp 到 minCoins；返回实际变动（带符号）。 */
  Game.prototype.applyCoins = function (delta) {
    var eco = economy();
    var d = finiteNumber(delta, 0);
    var before = finiteNumber(this.save.coins, 0);
    var next = before + d;
    var min = finiteNumber(eco.minCoins, 0);
    if (!isFinite(next)) next = before;
    if (next < min) next = min;
    this.save.coins = next;
    return next - before;
  };

  Game.prototype.findCue = function (id) {
    for (var i = 0; i < C.cues.length; i++) if (C.cues[i].id === id) return C.cues[i];
    return C.cues[0];
  };

  Game.prototype.isCueOwned = function (id) {
    return (this.save.ownedCues || []).indexOf(id) >= 0;
  };

  Game.prototype.canBuyCue = function (id) {
    var cue = this.findCue(id);
    if (!cue || this.isCueOwned(id)) return { ok: false, reason: 'owned' };
    if (this.totalStars() < (cue.starsRequired || 0)) return { ok: false, reason: 'stars', need: cue.starsRequired };
    if (this.save.coins < cue.price) return { ok: false, reason: 'coins', need: cue.price };
    return { ok: true };
  };

  Game.prototype.buyCue = function (id) {
    var res = this.canBuyCue(id);
    if (!res.ok) {
      this.emit('toast', {
        text: res.reason === 'stars' ? '需要 ' + res.need + ' 颗星才能解锁这支球杆' :
          res.reason === 'coins' ? '金币不足，还差 ' + (res.need - this.save.coins) : '已经拥有这支球杆',
        type: 'foul'
      });
      return false;
    }
    var cue = this.findCue(id);
    this.save.coins -= cue.price;
    this.save.ownedCues.push(id);
    this.save.equipped = id;
    this.cue = cue;
    this.persist(this.save);
    this.emit('save', this.save);
    this.emit('cue', this.getState());
    this.emit('toast', { text: '已购入并装备 · ' + cue.name, type: 'good' });
    if (this.audio) this.audio.star();
    return true;
  };

  Game.prototype.equipCue = function (id) {
    if (!this.isCueOwned(id)) return false;
    var cue = this.findCue(id);
    if (!cue) return false;
    this.save.equipped = id;
    this.cue = cue;
    this.persist(this.save);
    this.emit('save', this.save);
    this.emit('cue', this.getState());
    this.emit('toast', { text: '已装备 · ' + cue.name, type: 'good' });
    if (this.audio) this.audio.ui();
    return true;
  };

  /* ---------------------------------- 建造球局 ---------------------------------- */
  Game.prototype.PhysicsCtor = function () {
    if (!Pool.Physics) return null;
    return Pool.Physics.PhysicsWorld || Pool.Physics;
  };

  Game.prototype.createWorld = function () {
    var Ctor = this.PhysicsCtor();
    if (!Ctor) throw new Error('Physics engine missing');
    return new Ctor({
      width: C.table.width,
      height: C.table.height,
      ballRadius: C.table.ballRadius,
      pocketRadius: C.table.pocketRadius
    });
  };

  Game.prototype.addBall = function (world, number, x, y) {
    return world.addBall({
      id: number === 0 ? 'cue' : 'b' + number,
      number: number,
      kind: kindOf(number),
      color: colorOf(number),
      x: x,
      y: y
    });
  };

  Game.prototype.rackPositions = function () {
    var W = C.table.width, H = C.table.height, R = C.table.ballRadius;
    var apexX = W * 0.75, cy = H / 2;
    var gap = 0.0006;
    // 物理摆球必须严格接触：任何间隙都会让开球能量在第一碰撞后断链，
    // 造成“中间一堆球打不开”。视觉尺寸单独在 renderer 控制，不能靠放松物理间距解决遮挡。
    var d = 2 * R + gap;
    var rowGap = d * Math.sqrt(3) / 2;
    var rows = [
      [1],
      [9, 2],
      [3, 8, 10],
      [7, 14, 4, 12],
      [5, 13, 6, 15, 11]
    ];
    var out = [];
    for (var r = 0; r < rows.length; r++) {
      for (var i = 0; i < rows[r].length; i++) {
        out.push({
          number: rows[r][i],
          x: apexX + r * rowGap,
          y: cy + (i - (rows[r].length - 1) / 2) * d
        });
      }
    }
    return out;
  };

  Game.prototype.buildDemoWorld = function () {
    var world = this.createWorld();
    this.addBall(world, 0, C.table.width * 0.32, C.table.height * 0.5);
    var rack = this.rackPositions();
    for (var i = 0; i < rack.length; i++) this.addBall(world, rack[i].number, rack[i].x, rack[i].y);
    return world;
  };

  Game.prototype.buildMatchWorld = function () {
    var world = this.createWorld();
    var W = C.table.width, H = C.table.height;
    this.addBall(world, 0, W * 0.25, H / 2);
    var rack = this.rackPositions();
    for (var i = 0; i < rack.length; i++) this.addBall(world, rack[i].number, rack[i].x, rack[i].y);
    return world;
  };

  Game.prototype.buildLevelWorld = function (level) {
    var world = this.createWorld();
    this.addBall(world, 0, level.cue.x, level.cue.y);
    for (var i = 0; i < level.balls.length; i++) {
      var b = level.balls[i];
      this.addBall(world, b.number, b.x, b.y);
    }
    return world;
  };

  /* ---------------------------------- 开始对局 ---------------------------------- */
  Game.prototype.startMatch = function (mode, difficulty) {
    this.mode = mode || 'ai';
    this.difficulty = difficulty || 'normal';
    this.level = null;
    this.paused = false;
    this.time = 0;
    this.breakShot = true;
    this.openTable = true;
    this.ballInHand = false;
    this.cuePreview = null;
    this.ballReAdjust = false;
    this.cueDragging = false;
    this.shots = 0;
    this.shotsByPlayer = [0, 0];
    this.fouls = [0, 0];
    this.matchResult = null;
    this.levelResult = null;
    this.spinX = 0;
    this.spinY = 0;
    this.power = 0;
    this.charging = false;
    this.chargeT = 0;
    this.cue = this.findCue(this.save.equipped) || C.cues[0];
    this.guideEnabled = this.save.settings ? this.save.settings.guide !== false : true;

    if (mode === 'pvp') {
      this.players = [
        { name: '玩家 1', short: 'P1', group: null, isAI: false, color: '#e8cd8e' },
        { name: '玩家 2', short: 'P2', group: null, isAI: false, color: '#9fc7ae' }
      ];
    } else {
      this.players = [
        { name: '你', short: '你', group: null, isAI: false, color: '#e8cd8e' },
        { name: '机器人 · ' + AI_NAMES[this.difficulty], short: 'AI', group: null, isAI: true, color: '#c98a7a' }
      ];
    }
    this.activePlayer = 0;
    this.world = this.buildMatchWorld();
    this.phase = 'aim';
    this.aimAngle = 0;
    this.aimTargetAngle = 0;
    this._aimSnap = null;
    this.faceNearestTarget();
    this.emit('started', this.getState());
    this.emit('hud', this.getState());
    this.emit('turn', { player: 0, name: this.players[0].name, isAI: false, break: true });
    this.emit('toast', { text: '开球 · 瞄准后蓄力出杆', type: 'good' });
  };

  Game.prototype.startLevel = function (levelId) {
    var level = null;
    var levels = Pool.LEVELS || [];
    for (var i = 0; i < levels.length; i++) if (levels[i].id === levelId) level = levels[i];
    if (!level) {
      this.emit('toast', { text: '未找到该关卡', type: 'foul' });
      return false;
    }
    this.mode = 'level';
    this.level = level;
    this.difficulty = 'normal';
    this.paused = false;
    this.time = 0;
    this.breakShot = false;
    this.openTable = true;
    this.ballInHand = !!level.ballInHand;
    this.cuePreview = null;
    this.ballReAdjust = false;
    this.cueDragging = false;
    this.shots = 0;
    this.shotsByPlayer = [0, 0];
    this.fouls = [0, 0];
    this.matchResult = null;
    this.levelResult = null;
    this.spinX = 0;
    this.spinY = 0;
    this.power = 0;
    this.charging = false;
    this.chargeT = 0;
    this.cue = this.findCue(this.save.equipped) || C.cues[0];
    this.guideEnabled = level.allowGuide === false ? false : (this.save.settings ? this.save.settings.guide !== false : true);
    this.players = [{ name: '你', short: '你', group: null, isAI: false, color: '#e8cd8e' }];
    this.activePlayer = 0;
    this.world = this.buildLevelWorld(level);
    this.phase = 'aim';
    this.aimTargetAngle = this.aimAngle;
    this.faceNearestTarget();
    if (this.ballInHand) this.ensureCueSafe();
    this.emit('started', this.getState());
    this.emit('hud', this.getState());
    this.emit('turn', { player: 0, name: '你', isAI: false, level: true });
    var lvTip = level.tip || '清光台面所有球';
    if (this.ballInHand) lvTip = '自由球 · 点击球桌确认母球位置 · ' + lvTip;
    this.emit('toast', { text: lvTip, type: 'good' });
    return true;
  };

  Game.prototype.restart = function () {
    if (this.mode === 'level' && this.level) this.startLevel(this.level.id);
    else this.startMatch(this.mode || 'ai', this.difficulty);
  };

  Game.prototype.quitToMenu = function () {
    this.phase = 'menu';
    this.paused = false;
    this.mode = null;
    this.level = null;
    this.players = [];
    this.activePlayer = 0;
    this.ballInHand = false;
    this.cuePreview = null;
    this.ballReAdjust = false;
    this.cueDragging = false;
    this.charging = false;
    this.matchResult = null;
    this.levelResult = null;
    this.ai = { stage: 'idle', t: 0, plan: null };
    try { this.world = this.buildDemoWorld(); } catch (e) { this.world = null; }
    this.emit('menu', this.getState());
  };

  /* ---------------------------------- 瞄准 / 击球 ---------------------------------- */
  Game.prototype.isHumanTurn = function () {
    if (this.mode === 'level') return true;
    var p = this.players[this.activePlayer];
    return !!p && !p.isAI;
  };

  Game.prototype.isAIThinking = function () {
    return !this.isHumanTurn() && this.ai.stage !== 'idle' && this.ai.stage !== 'done';
  };

  Game.prototype.canShoot = function () {
    return this.phase === 'aim' && !this.paused && this.world && this.world.allStopped() &&
      !this.ballInHand && this.isHumanTurn() && !this.charging;
  };

  Game.prototype.aimAt = function (x, y) {
    if (!this.world || this.phase !== 'aim' || this.paused) return;
    if (this.cueDragging) return;
    if (!this.isHumanTurn()) return;
    var cue = this.world.getBall('cue');
    if (!cue) return;
    if (cue.active === false) return;

    if (this.ballInHand) {
      // 自由球：只更新半透明预览位置，真实母球在 placeCueAt 时才落位
      this.previewCuePos(x, y);
      return;
    }
    var dx = x - cue.x, dy = y - cue.y;
    if (Math.sqrt(dx * dx + dy * dy) < C.table.ballRadius * 2.4) return;
    var raw = Math.atan2(dy, dx);
    var ang;
    if (this.fineAim) {
      if (this._fineRaw == null) {
        this._fineRaw = raw;
        this._fineAim = this.aimTargetAngle;
      }
      ang = this._fineAim + U.angleDiff(raw, this._fineRaw) * 0.22;
    } else {
      this._fineRaw = null;
      this._fineAim = null;
      ang = this._assistAim(raw);
    }
    // 鼠标直接跟手，只保留极小的抖动死区；精细模式用 Shift 降低灵敏度
    if (Math.abs(U.angleDiff(ang, this.aimTargetAngle)) < 0.0007) return;
    this.aimTargetAngle = ang;
    this.aimAngle = ang;
  };

  /* 袋口黏滞：当瞄准角正好落在“母球—假想球—目标球—袋口”的合法进球线上时，
   * 把目标角轻推到精确值，并保留一小段回滞，便于微调。球杆的 aim 越高，窗口越宽。 */
  Game.prototype._assistAim = function (raw) {
    var cue = this.world ? this.world.getBall('cue') : null;
    if (!cue || cue.active === false) { this._aimSnap = null; return raw; }
    var cueAim = (this.cue && this.cue.aim) ? this.cue.aim : 1;
    var tol = U.clamp(0.008 + (cueAim - 1) * 0.055, 0.007, 0.021);
    if (this._aimSnap) {
      if (Math.abs(U.angleDiff(raw, this._aimSnap.raw)) < tol * 1.45) return this._aimSnap.angle;
      this._aimSnap = null;
    }
    var targets = this.getTargetIds(this.players[this.activePlayer]);
    var pockets = this.world.pockets || [];
    var R = C.table.ballRadius;
    var best = null, bestDiff = tol;
    for (var ti = 0; ti < targets.length; ti++) {
      var ball = this.world.getBall(targets[ti]);
      if (!ball || !ball.active) continue;
      for (var pi = 0; pi < pockets.length; pi++) {
        var pk = pockets[pi];
        var px = pk.x - ball.x, py = pk.y - ball.y;
        var pd = Math.sqrt(px * px + py * py);
        if (pd < R * 4) continue;
        var ux = px / pd, uy = py / pd;
        var gx = ball.x - ux * R * 2;
        var gy = ball.y - uy * R * 2;
        var aim = Math.atan2(gy - cue.y, gx - cue.x);
        var diff = Math.abs(U.angleDiff(raw, aim));
        if (diff > bestDiff) continue;
        // 母球到假想球之间必须没有别的球
        var h1 = this.world.castRay(cue.x, cue.y, Math.cos(aim), Math.sin(aim), cue.id);
        if (!h1 || h1.type !== 'ball' || !h1.ball || h1.ball.id !== ball.id) continue;
        // 目标球到袋口之间必须没有球挡住，且射线确实进袋
        var h2 = this.world.castRay(ball.x, ball.y, ux, uy, ball.id);
        if (h2 && h2.type === 'ball') continue;
        if (!h2 || h2.type !== 'pocket') continue;
        best = { raw: raw, angle: aim, ballId: ball.id, pocket: pi };
        bestDiff = diff;
      }
    }
    this._aimSnap = best;
    return best ? best.angle : raw;
  };

  Game.prototype.setFineAim = function (on) {
    on = !!on;
    if (this.fineAim === on) return;
    this.fineAim = on;
    this._fineRaw = null;
    this._fineAim = null;
  };

  Game.prototype.fineTune = function (delta) {
    if (!this.canShoot()) return;
    this._aimSnap = null;
    this._fineRaw = null;
    this._fineAim = null;
    this.aimAngle += delta;
    if (this.aimAngle > Math.PI) this.aimAngle -= Math.PI * 2;
    if (this.aimAngle < -Math.PI) this.aimAngle += Math.PI * 2;
    this.aimTargetAngle = this.aimAngle;
  };

  Game.prototype.beginCharge = function () {
    if (!this.canShoot()) return false;
    // 不使用目标角强制吸附：出杆必须沿着玩家当前看到的辅助线
    this.charging = true;
    this.chargeT = 0;
    this.power = 0;
    this._chargeManual = null;
    this.emit('charge', true);
    return true;
  };

  /* 力度条拖拽：把「按住自动蓄力」切换为「拉到哪就是多少力度」。
   * 只有真正拖动时才调用；按住不动仍走自动蓄力，三条出杆路径互不干扰。 */
  Game.prototype.setChargeManual = function (level) {
    if (!this.charging) return;
    var v = U.clamp01(level);
    this._chargeManual = v;
    this.chargeT = v * C.settings.chargeTime;
    this.power = v;
  };

  Game.prototype.cancelCharge = function () {
    this.charging = false;
    this.chargeT = 0;
    this.power = 0;
    this._chargeManual = null;
    this.emit('charge', false);
  };

  Game.prototype.releaseShot = function () {
    if (!this.charging) return false;
    this.charging = false;
    this._chargeManual = null;
    var power = Math.max(C.settings.minPower, this.power);
    this.emit('charge', false);
    this.shoot(power, this.spinX, this.spinY);
    return true;
  };

  Game.prototype.setSpin = function (sx, sy) {
    if (this.mode === 'level' && this.level && this.level.allowSpin === false) return;
    this.spinX = U.clamp(sx, -1, 1);
    this.spinY = U.clamp(sy, -1, 1);
    // 限制在圆内
    var len = Math.sqrt(this.spinX * this.spinX + this.spinY * this.spinY);
    if (len > 1) { this.spinX /= len; this.spinY /= len; }
    this.emit('spin', { x: this.spinX, y: this.spinY });
  };

  Game.prototype.resetSpin = function () {
    this.spinX = 0;
    this.spinY = 0;
    this.emit('spin', { x: 0, y: 0 });
  };

  Game.prototype.shoot = function (power, spinX, spinY) {
    if (!this.world || this.phase !== 'aim' || this.paused) return false;
    if (this.ballInHand) return false;
    var cue = this.world.getBall('cue');
    if (!cue || cue.active === false) return false;
    var cdef = this.cue || C.cues[0];
    var shotPower = U.clamp(power * cdef.power, 0.03, 1);
    var sx = U.clamp((spinX == null ? this.spinX : spinX) * cdef.spin, -1, 1);
    var sy = U.clamp((spinY == null ? this.spinY : spinY) * cdef.spin, -1, 1);

    var shooter = this.players[this.activePlayer] || { group: null };
    var preGroup = shooter.group || null;
    var preGroupCleared = preGroup ? this.countGroup(preGroup) === 0 : false;

    this.shotCtx = {
      firstHitId: null,
      potted: [],
      cuePotted: false,
      railAfterContact: false,
      railBalls: {},
      isBreak: this.breakShot,
      preGroup: preGroup,
      preGroupCleared: preGroupCleared,
      preOpen: !preGroup,
      preTargets: this.getTargetIds(shooter),
      power: shotPower,
      angle: this.aimAngle,
      spinX: sx,
      spinY: sy
    };

    // 开球专用能量：不改变普通击球手感，只给第一碰撞链多一点余量，
    // 让紧密球堆从中心彻底展开。速度仍受物理层 MAX_SPEED 限制。
    var strikeSpeed = this.breakShot ? Math.min(this.world.params.maxShotSpeed * 1.22 * shotPower, 13) : undefined;
    this.world.strike('cue', {
      angle: this.aimAngle,
      power: shotPower,
      speed: strikeSpeed,
      spinX: sx,
      spinY: sy
    });
    // 球组额外冲量必须等母球实际接触后施加；出杆瞬间提前唤醒会被摩擦耗尽。
    // 低力度不触发，且不会在打空球时凭空推动球堆。

    this.phase = 'shooting';
    this.ballReAdjust = false;
    this.cueDragging = false;
    this.shotTime = 0;
    this.shots++;
    if (this.shotsByPlayer[this.activePlayer] != null) this.shotsByPlayer[this.activePlayer]++;
    this.charging = false;
    this.power = shotPower;
    this.ai.stage = 'done';
    if (this.audio) this.audio.cueHit(power);
    this.emit('shot', { power: power, effective: shotPower, angle: this.aimAngle, spinX: sx, spinY: sy });
    this.emit('hud', this.getState());
    return true;
  };

  /* ---------------------------------- 位置合法性 ---------------------------------- */
  Game.prototype.isValidCuePos = function (x, y) {
    if (!this.world) return false;
    var R = C.table.ballRadius;
    var m = R + 0.004;
    if (x < m || x > C.table.width - m || y < m || y > C.table.height - m) return false;
    var balls = this.world.balls;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (!b.active || b.id === 'cue') continue;
      var dx = b.x - x, dy = b.y - y;
      if (dx * dx + dy * dy < Math.pow(2 * R + 0.0015, 2)) return false;
    }
    var pockets = C.pockets;
    for (var j = 0; j < pockets.length; j++) {
      var p = pockets[j];
      var pdx = p.x - x, pdy = p.y - y;
      if (pdx * pdx + pdy * pdy < Math.pow(p.radius + R * 1.6, 2)) return false;
    }
    return true;
  };

  Game.prototype.findSafeSpot = function (preferX, preferY) {
    var W = C.table.width, H = C.table.height;
    if (preferX != null && this.isValidCuePos(preferX, preferY)) return { x: preferX, y: preferY };
    var candidates = [];
    var nx = 28, ny = 14;
    for (var ix = 1; ix < nx; ix++) {
      for (var iy = 1; iy < ny; iy++) {
        candidates.push({ x: W * ix / nx, y: H * iy / ny });
      }
    }
    candidates.sort(function (a, b) {
      var da = a.x * a.x + (a.y - H / 2) * (a.y - H / 2);
      var db = b.x * b.x + (b.y - H / 2) * (b.y - H / 2);
      return da - db;
    });
    for (var i = 0; i < candidates.length; i++) {
      if (this.isValidCuePos(candidates[i].x, candidates[i].y)) return candidates[i];
    }
    return { x: W * 0.25, y: H / 2 };
  };

  /* 停球合法性：和「手动摆球」不是一回事。
     真实台球里母球可以停在贴着别的球、也可以停在袋口边上；
     旧版直接复用 isValidCuePos（要求与邻球间距 > 2R+1.5mm、离袋心 > 9.8cm），
     结果每次停球贴球/靠袋就被传送回开球点，玩家看到的是“白球自己回原位”。 */
  Game.prototype.isCueRestLegal = function (x, y) {
    var W = C.table.width, H = C.table.height, R = C.table.ballRadius;
    // 与物理层一致：球心可达 [R, W-R] x [R, H-R]，贴库是合法停球。
    // 旧版这里多留了 1mm 余量（R+0.001），任何贴库停球都会被判非法 → 瞬移回开球点。
    var m = R - 1e-6;
    if (!(x >= m && x <= W - m && y >= m && y <= H - m)) return false;
    var balls = (this.world && this.world.balls) || [];
    var minD = 2 * R - 0.004;   // 允许接触与物理求解后的微小压缩
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (!b || !b.active || b.id === 'cue') continue;
      var dx = b.x - x, dy = b.y - y;
      if (dx * dx + dy * dy < minD * minD) return false;
    }
    return true;
  };

  Game.prototype.ensureCueSafe = function (strict) {
    var cue = this.world && this.world.getBall('cue');
    if (!cue) return;
    if (cue.active === false) {
      cue.active = true;
      cue.pocketed = false;
      cue.pocketIndex = null;
      cue.vx = 0; cue.vy = 0;
    }
    var ok = strict ? this.isValidCuePos(cue.x, cue.y) : this.isCueRestLegal(cue.x, cue.y);
    if (!ok) {
      var spot = this.findSafeSpot(C.table.width * 0.25, C.table.height / 2);
      cue.x = spot.x; cue.y = spot.y; cue.vx = 0; cue.vy = 0;
    }
  };

  /* 自由球预览：只记录坐标供 renderer 画半透明母球，不移动真实母球、不改瞄准角。
   * 返回记录到的坐标；非法位置返回 null。 */
  Game.prototype.previewCuePos = function (x, y) {
    if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y) || !this.world) {
      this.cuePreview = null;
      return null;
    }
    if (!this.isValidCuePos(x, y)) {
      this.cuePreview = null;
      return null;
    }
    this.cuePreview = { x: x, y: y };
    return this.cuePreview;
  };

  Game.prototype.placeCueAt = function (x, y) {
    if (this.phase !== 'aim' || !this.ballInHand || this.paused) return false;
    if (!this.isValidCuePos(x, y)) return false;
    var cue = this.world.getBall('cue');
    if (!cue) return false;
    cue.active = true;
    cue.pocketed = false;
    cue.pocketIndex = null;
    cue.x = x; cue.y = y; cue.vx = 0; cue.vy = 0;
    cue.spinX = 0; cue.spinY = 0;
    this.ballInHand = false;
    // 放好之后保留“可再调整”状态：玩家不满意可以再按住母球拖一次
    this.ballReAdjust = true;
    this.cueDragging = false;
    this.cuePreview = null;
    this.faceNearestTarget();
    this.emit('hud', this.getState());
    this.emit('toast', { text: '母球已放好 · 不满意可以再按住母球拖动调整', type: 'good' });
    if (this.audio) this.audio.ui();
    return true;
  };

  /* ---------------------- 自由球：抓起 / 拖动 / 放下 ----------------------
   * 需求：母球落袋后要能看到“把球抓起来移动位置放在手里”的动作，
   * 并且放好之后如果觉得不合适，还能再抓起来调整，直到出杆前都可以。 */
  Game.prototype.canGrabCue = function () {
    if (!this.world || this.phase !== 'aim' || this.paused) return false;
    if (this.charging) return false;
    if (!this.isHumanTurn()) return false;
    return !!this.ballInHand || !!this.ballReAdjust || !!this.cueDragging;
  };

  /* 抓起母球并立刻移到 (x,y)：自由球模式下点哪抓哪，之后拖动跟手。 */
  Game.prototype.beginCueDrag = function (x, y) {
    if (!this.canGrabCue()) return false;
    var cue = this.world.getBall('cue');
    if (!cue) return false;
    if (!this.isValidCuePos(x, y)) return false;
    this.cueDragging = true;
    this.ballInHand = false;
    this.ballReAdjust = true;
    this.cuePreview = null;
    this._aimSnap = null;
    cue.active = true;
    cue.pocketed = false;
    cue.pocketIndex = null;
    cue.vx = 0; cue.vy = 0;
    cue.x = x; cue.y = y;
    if (this.audio) this.audio.ui();
    this.emit('hud', this.getState());
    return true;
  };

  /* 拖动中：非法位置（压着别的球 / 压袋口 / 出台）保持原位并返回 false。 */
  Game.prototype.dragCueTo = function (x, y) {
    if (!this.cueDragging) return false;
    var cue = this.world && this.world.getBall('cue');
    if (!cue || !this.isValidCuePos(x, y)) return false;
    cue.x = x; cue.y = y; cue.vx = 0; cue.vy = 0;
    return true;
  };

  Game.prototype.endCueDrag = function () {
    if (!this.cueDragging) return false;
    this.cueDragging = false;
    this.ballReAdjust = true;
    this.faceNearestTarget();
    this.emit('hud', this.getState());
    this.emit('toast', { text: '母球已放下 · 还能再按住拖动调整', type: 'good' });
    return true;
  };

  /* ---------------------------------- 主循环 ---------------------------------- */
  Game.prototype.update = function (dt) {
    if (this.paused || this.phase === 'menu' || this.phase === 'over') return;
    dt = Math.min(dt || 0, 0.05);
    this.time += dt;

    if (this.charging) {
      if (this._chargeManual != null) {
        // 拖拽定力度：保持手动值，不再随时间自动增长
        this.chargeT = this._chargeManual * C.settings.chargeTime;
        this.power = this._chargeManual;
      } else {
        this.chargeT += dt;
        this.power = U.clamp01(this.chargeT / C.settings.chargeTime);
      }
    }

    if (this.phase === 'aim' && this.isAIThinking()) {
      this.updateAI(dt);
    }

    // 鼠标瞄准平滑：大角度快速跟随，小抖动缓慢收敛，既稳又不拖沓
    if (this.phase === 'aim' && !this.paused && this.isHumanTurn() && !this.ballInHand && !this.charging) {
      var aimDiff = U.angleDiff(this.aimTargetAngle, this.aimAngle);
      if (Math.abs(aimDiff) > 0.00035) {
        var aimRate = Math.abs(aimDiff) > 0.14 ? 1 : Math.min(1, dt * 14);
        this.aimAngle += aimDiff * aimRate;
        if (this.aimAngle > Math.PI) this.aimAngle -= Math.PI * 2;
        if (this.aimAngle < -Math.PI) this.aimAngle += Math.PI * 2;
      }
    }

    if (this.phase === 'shooting') {
      this.shotTime += dt;
      this.stepPhysics(dt);
      var stopped = this.world.allStopped();
      if ((stopped && this.shotTime > 0.18) || this.shotTime > 18) {
        if (!stopped) this.forceStop();
        this.endShot();
      }
    }
  };

  Game.prototype.stepPhysics = function (dt) {
    if (!this.world) return;
    this.world.step(dt);
    // 物理层已保证球心不会停在台呢边界之外（袋口豁口处夹回 + 法线反射），
    // 因此不再需要旧版 _scratch「出界犯规」标记；母球犯规只由真正的落袋事件结算。
    var events = this.world.events || [];
    for (var i = 0; i < events.length; i++) {
      var evt = events[i];
      this.handlePhysicsEvent(evt);
    }
    if (this.world.events && this.world.events.length) this.world.events.length = 0;
    this.applyBreakImpulse();
  };

  // 街机开球辅助，只在高力度开球首次实际接触后执行一次。
  // 保留普通碰撞/低力度开球；不挪动球的位置，以真实速度和摩擦产生位移。
  Game.prototype.applyBreakImpulse = function () {
    var ctx = this.shotCtx;
    if (!ctx || !ctx.isBreak || !ctx.firstHitId || ctx.breakImpulseApplied || ctx.power <= 0.65) return;
    ctx.breakImpulseApplied = true;
    var gain = (ctx.power - 0.65) / 0.35;
    var strength = 1.8 * gain * gain;
    var balls = this.world.balls;
    var cx = 0, cy = 0, count = 0, i;
    for (i = 0; i < balls.length; i++) {
      if (balls[i].active && balls[i].number > 0) {
        cx += balls[i].x; cy += balls[i].y; count++;
      }
    }
    if (!count) return;
    cx /= count; cy /= count;
    // 把扩散中心轻微后移，中心球也能有明确的前进方向。
    cx -= Math.cos(ctx.angle) * this.world.ballRadius * 0.35;
    cy -= Math.sin(ctx.angle) * this.world.ballRadius * 0.35;
    for (i = 0; i < balls.length; i++) {
      var ball = balls[i];
      if (!ball.active || ball.number === 0) continue;
      var dx = ball.x - cx, dy = ball.y - cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < 1e-8) { dx = Math.cos(ctx.angle); dy = Math.sin(ctx.angle); d = 1; }
      var speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      // 已充分获得碰撞能量的球保留原路径；补足低速球的可见扩散。
      if (speed < strength) {
        ball.vx = dx / d * strength;
        ball.vy = dy / d * strength;
        this.world._primeAngular(ball, strength, Math.atan2(ball.vy, ball.vx), 0, 0);
        ball._moving = true;
      }
    }
  };

  Game.prototype.handlePhysicsEvent = function (evt) {
    var ctx = this.shotCtx;
    if (!ctx) return;
    if (evt.type === 'ball-hit') {
      var a = evt.a, b = evt.b;
      if (!ctx.firstHitId && a && b) {
        if (a.id === 'cue' && b.id !== 'cue') ctx.firstHitId = b.id;
        else if (b.id === 'cue' && a.id !== 'cue') ctx.firstHitId = a.id;
      }
      if (this.audio) this.audio.ball(evt.speed || 0);
    } else if (evt.type === 'cushion') {
      if (ctx.firstHitId) ctx.railAfterContact = true;
      if (ctx.firstHitId && evt.ball && evt.ball.id !== 'cue' && evt.ball.active) {
        ctx.railBalls[evt.ball.id] = true;
      }
      if (this.audio) this.audio.cushion(evt.speed || 0);
    } else if (evt.type === 'pocket') {
      var ball = evt.ball;
      if (ball) {
        ctx.potted.push(ball);
        if (ball.id === 'cue') ctx.cuePotted = true;
      }
      if (this.audio) this.audio.pocket();
    }
    if (this.renderer && this.renderer.handleEvent) {
      try { this.renderer.handleEvent(evt); } catch (e) { /* ignore render fx */ }
    }
  };

  Game.prototype.forceStop = function () {
    if (this.world.stopAll) { this.world.stopAll(); return; }
    var balls = this.world.balls;
    for (var i = 0; i < balls.length; i++) {
      balls[i].vx = 0; balls[i].vy = 0;
      if (balls[i].spinX != null) balls[i].spinX = 0;
      if (balls[i].spinY != null) balls[i].spinY = 0;
    }
  };

  Game.prototype.endShot = function () {
    if (this.mode === 'level') this.resolveLevelShot();
    else this.resolveMatchShot();
  };

  /* ---------------------------------- 工具 ---------------------------------- */
  Game.prototype.countGroup = function (kind) {
    if (!this.world) return 0;
    var n = 0;
    for (var i = 0; i < this.world.balls.length; i++) {
      var b = this.world.balls[i];
      if (b.active && b.kind === kind) n++;
    }
    return n;
  };

  Game.prototype.levelTargetNumbers = function () {
    if (!this.level || !this.level.targets || !this.level.targets.length) return null;
    return this.level.targets;
  };

  Game.prototype.levelBlockerNumbers = function () {
    if (!this.level || !this.level.blockers) return [];
    return this.level.blockers;
  };

  Game.prototype.activeObjectCount = function () {
    if (!this.world) return 0;
    var nums = this.levelTargetNumbers();
    var n = 0;
    for (var i = 0; i < this.world.balls.length; i++) {
      var b = this.world.balls[i];
      if (!b.active || b.id === 'cue') continue;
      if (!nums || nums.indexOf(b.number) >= 0) n++;
    }
    return n;
  };

  Game.prototype.getTargetIds = function (player) {
    if (!this.world) return [];
    if (this.mode === 'level') {
      var all = [], nums = this.levelTargetNumbers();
      for (var i = 0; i < this.world.balls.length; i++) {
        var b = this.world.balls[i];
        if (b.active && b.id !== 'cue' && (!nums || nums.indexOf(b.number) >= 0)) all.push(b.id);
      }
      return all;
    }
    if (!player) return [];
    var ids = [];
    if (!player.group) {
      for (var j = 0; j < this.world.balls.length; j++) {
        var x = this.world.balls[j];
        if (x.active && x.id !== 'cue' && x.kind !== 'eight') ids.push(x.id);
      }
      if (!ids.length) {
        for (var k = 0; k < this.world.balls.length; k++) {
          if (this.world.balls[k].active && this.world.balls[k].kind === 'eight') ids.push('b8');
        }
      }
      return ids;
    }
    for (var m = 0; m < this.world.balls.length; m++) {
      var y = this.world.balls[m];
      if (y.active && y.kind === player.group) ids.push(y.id);
    }
    if (!ids.length) {
      for (var n = 0; n < this.world.balls.length; n++) {
        if (this.world.balls[n].active && this.world.balls[n].kind === 'eight') ids.push('b8');
      }
    }
    return ids;
  };

  Game.prototype.getAimIllegal = function () {
    if (!this.world || this.phase !== 'aim' || this.paused || this.ballInHand) return null;
    if (!this.isHumanTurn()) return null;
    var cue = this.world.getBall('cue');
    if (!cue || !cue.active) return null;
    var hit = this.world.castRay(cue.x, cue.y, Math.cos(this.aimAngle), Math.sin(this.aimAngle), cue.id);
    if (!hit || hit.type !== 'ball' || !hit.ball) return null;
    var targets = this.getTargetIds(this.players[this.activePlayer]);
    if (targets.indexOf(hit.ball.id) >= 0) return null;
    return { id: hit.ball.id, number: hit.ball.number, x: hit.ball.x, y: hit.ball.y };
  };

  Game.prototype.faceNearestTarget = function () {
    if (!this.world) return;
    var cue = this.world.getBall('cue');
    if (!cue) return;
    var targets = this.getTargetIds(this.players[this.activePlayer]);
    if (!targets.length) {
      // 开球时指向球堆
      var rack = this.world.getBall('b1');
      if (rack) {
        this.aimAngle = Math.atan2(rack.y - cue.y, rack.x - cue.x);
        this.aimTargetAngle = this.aimAngle;
      }
      return;
    }
    var best = null, bestD = Infinity;
    for (var i = 0; i < targets.length; i++) {
      var b = this.world.getBall(targets[i]);
      if (!b) continue;
      var d = Math.pow(b.x - cue.x, 2) + Math.pow(b.y - cue.y, 2);
      if (d < bestD) { bestD = d; best = b; }
    }
    this._aimSnap = null;
    if (best) {
      this.aimAngle = Math.atan2(best.y - cue.y, best.x - cue.x);
      this.aimTargetAngle = this.aimAngle;
    }
  };

  /* ---------------------------------- 八球结算 ---------------------------------- */
  Game.prototype.resolveMatchShot = function () {
    var ctx = this.shotCtx;
    var shooter = this.players[this.activePlayer];
    var opponentIdx = 1 - this.activePlayer;
    var potted = ctx.potted || [];
    var pottedObj = [];
    for (var i = 0; i < potted.length; i++) if (potted[i].id !== 'cue') pottedObj.push(potted[i]);
    var eightPotted = false;
    for (var j = 0; j < pottedObj.length; j++) if (pottedObj[j].number === 8) eightPotted = true;

    // 开球黑八：重新摆球
    if (ctx.isBreak && eightPotted) {
      this.breakShot = true;
      this.ballInHand = false;
      this.world = this.buildMatchWorld();
      this.phase = 'aim';
      this.resetSpin();
      this.faceNearestTarget();
      this.emit('hud', this.getState());
      this.emit('toast', { text: '开球黑八 · 重新摆球，仍由你开球', type: 'good' });
      this.emit('turn', { player: this.activePlayer, name: shooter.name, isAI: shooter.isAI, break: true });
      if (shooter.isAI) this.startAITurn();
      return;
    }

    // 黑八落袋
    if (eightPotted) {
      var legalWin = !ctx.cuePotted && ctx.preGroupCleared && ctx.firstHitId === 'b8' && !this.foulOnFirstHit(ctx);
      if (legalWin) this.finishMatch(this.activePlayer, '清台后打进黑八');
      else this.finishMatch(opponentIdx, ctx.cuePotted ? '对手击打黑八时母球落袋' : '黑八提前落袋');
      return;
    }

    var foul = false, reason = '';
    if (ctx.cuePotted) { foul = true; reason = '母球落袋'; }
    else if (!ctx.firstHitId) { foul = true; reason = '空杆 · 未碰到任何球'; }
    else if (this.foulOnFirstHit(ctx)) {
      foul = true;
      reason = ctx.preGroup ? (ctx.preGroupCleared ? '先碰到了非黑八球' : '先碰到了非本方球') : '开台时先碰到黑八';
    }

    // 开球有效性：无进球时至少两球吃库
    if (!foul && ctx.isBreak && pottedObj.length === 0) {
      var railCount = ctx.railBalls ? Object.keys(ctx.railBalls).length : 0;
      if (railCount < 2) {
        foul = true;
        reason = '开球无效 · 至少两球吃库（实际 ' + railCount + ' 球）';
      }
    }

    var legalPot = 0;
    if (ctx.isBreak) {
      // 开球进球继续出杆，但球台保持开放，不分配球组
      if (!foul) legalPot = pottedObj.length;
    } else if (!foul && !ctx.preGroup) {
      var firstObj = null;
      for (var k = 0; k < pottedObj.length; k++) {
        if (pottedObj[k].kind !== 'eight') { firstObj = pottedObj[k]; break; }
      }
      if (firstObj) {
        var group = firstObj.kind;
        shooter.group = group;
        var other = group === 'solid' ? 'stripe' : 'solid';
        this.players[opponentIdx].group = other;
        for (var m = 0; m < pottedObj.length; m++) {
          if (pottedObj[m].kind === group) legalPot++;
        }
        this.openTable = false;
      }
    } else if (!foul && ctx.preGroup) {
      for (var q = 0; q < pottedObj.length; q++) {
        if (pottedObj[q].kind === ctx.preGroup) legalPot++;
      }
    }

    this.breakShot = false;
    var switched = false;
    if (foul) {
      this.fouls[this.activePlayer] = (this.fouls[this.activePlayer] || 0) + 1;
      this.emit('toast', { text: '犯规 · ' + reason + ' · 对手自由球', type: 'foul' });
      this.activePlayer = opponentIdx;
      switched = true;
      this.enterBallInHand();
    } else if (legalPot > 0) {
      this.emit('toast', {
        text: ctx.isBreak ? '开球进球 · 球台仍然开放 · 继续出杆' : '进球 × ' + legalPot + ' · 继续出杆',
        type: 'good'
      });
      if (this.audio) this.audio.star();
    } else {
      this.activePlayer = opponentIdx;
      switched = true;
      this.emit('toast', {
        text: (pottedObj.length ? '未进本方球' : '未进球') + ' · 轮到 ' + this.players[opponentIdx].name,
        type: 'info'
      });
    }

    this.phase = 'aim';
    this.charging = false;
    this.chargeT = 0;
    this.power = 0;
    this.resetSpin();
    this.ai = { stage: 'idle', t: 0, plan: null };
    this.faceNearestTarget();
    if (!this.ballInHand) this.ensureCueSafe();

    if (this.audio && switched && !foul) this.audio.ui();
    var newPlayer = this.players[this.activePlayer];
    this.emit('hud', this.getState());
    this.emit('turn', {
      player: this.activePlayer,
      name: newPlayer.name,
      isAI: newPlayer.isAI,
      switched: switched,
      foul: foul,
      reason: reason
    });
    if (newPlayer.isAI) this.startAITurn();
  };

  Game.prototype.foulOnFirstHit = function (ctx) {
    if (!ctx.firstHitId) return true;
    var obj = this.world.getBall(ctx.firstHitId);
    if (!obj) return true;
    if (!ctx.preGroup) return obj.kind === 'eight';
    if (ctx.preGroupCleared) return obj.kind !== 'eight';
    return obj.kind !== ctx.preGroup;
  };

  /* ---------------------------------- 关卡结算 ---------------------------------- */
  Game.prototype.resolveLevelShot = function () {
    var ctx = this.shotCtx;
    var level = this.level;
    var potted = ctx.potted || [];
    var objPotted = [];
    for (var i = 0; i < potted.length; i++) if (potted[i].id !== 'cue') objPotted.push(potted[i]);
    var blockerNums = this.levelBlockerNumbers(), blockerPotted = [];
    for (var bi = 0; bi < objPotted.length; bi++) if (blockerNums.indexOf(objPotted[bi].number) >= 0) blockerPotted.push(objPotted[bi]);
    var cleared = this.activeObjectCount() === 0;

    this.breakShot = false;
    // 母球 scratch 优先于清台/打满杆数/干扰球结算：同杆犯规不算清台。
    if (ctx.cuePotted) {
      this.emit('toast', { text: '母球落袋 · 自由摆球', type: 'foul' });
      this.enterBallInHand();
      if (this.shots >= level.maxShots) {
        this.finishLevel(false);
        return;
      }
    } else if (blockerPotted.length) {
      this.finishLevel(false);
      this.emit('toast', { text: '花色干扰球进袋 · 本关失败', type: 'foul' });
      return;
    }
    if (!ctx.cuePotted && cleared && this.shots <= level.maxShots) {
      this.finishLevel(true);
      return;
    } else if (this.shots >= level.maxShots) {
      this.finishLevel(false);
      return;
    }

    // 旧版这里条件写反：普通一杆（母球没落袋）会给玩家发自由球并提示“母球落袋”。
    if (!ctx.cuePotted) {
      if (objPotted.length) {
        this.emit('toast', { text: '目标球进袋 × ' + objPotted.length + ' · 还剩 ' + (level.maxShots - this.shots) + ' 杆', type: 'good' });
        if (this.audio) this.audio.star();
      } else {
        this.emit('toast', { text: '未进球 · 还剩 ' + (level.maxShots - this.shots) + ' 杆', type: 'info' });
      }
    }

    this.phase = 'aim';
    this.charging = false;
    this.chargeT = 0;
    this.power = 0;
    this.resetSpin();
    this.ai = { stage: 'idle', t: 0, plan: null };
    this.faceNearestTarget();
    if (!this.ballInHand) this.ensureCueSafe();
    this.emit('hud', this.getState());
  };

  Game.prototype.finishLevel = function (success) {
    var level = this.level;
    var eco = economy();
    var stars = 0;
    if (success) {
      stars = this.shots <= level.par ? 3 : (this.shots <= level.par + 2 ? 2 : 1);
    }
    var prevStars = (this.save.stars && this.save.stars[level.id]) || 0;
    var firstClear = success && prevStars === 0;
    var rewardCoins = level.rewardCoins || 0;
    var coinsDelta = 0;
    if (success) {
      if (!this.save.stars) this.save.stars = {};
      this.save.stars[level.id] = Math.max(prevStars, stars);
      if (!this.save.cleared) this.save.cleared = {};
      this.save.cleared[level.id] = true;
      // 首通全额；重复通关按 levelWinRepeatRate 折算（整数金币）
      coinsDelta = firstClear ? rewardCoins : Math.round(rewardCoins * eco.levelWinRepeatRate);
    } else {
      // 关卡失败扣金币，具体扣除由 applyCoins 兜底到 minCoins
      coinsDelta = -eco.levelLoss;
    }
    // 负数表示扣除；applyCoins 会 clamp 到 minCoins 并返回实际变动
    var coins = this.applyCoins(coinsDelta);
    var cueReward = null;
    var cueRewardCoins = 0;
    if (success && firstClear) {
      var rewardCueId = C.levelRewardCues ? C.levelRewardCues[level.id] : null;
      if (rewardCueId) {
        var rewardCue = this.findCue(rewardCueId);
        if (rewardCue && this.save.ownedCues.indexOf(rewardCueId) < 0) {
          this.save.ownedCues.push(rewardCueId);
          this.persist(this.save);
          this.emit('save', this.save);
          cueReward = { id: rewardCue.id, name: rewardCue.name };
        } else if (rewardCue && rewardCue.price > 0) {
          // 已提前购买：返还一半金币作为首通补偿
          cueRewardCoins = Math.round(rewardCue.price * 0.5);
          this.save.coins = (this.save.coins || 0) + cueRewardCoins;
          this.persist(this.save);
          this.emit('save', this.save);
        }
      }
    }
    this.levelResult = {
      success: success,
      stars: stars,
      coins: coins,
      coinsDelta: coinsDelta,
      shots: this.shots,
      par: level.par,
      maxShots: level.maxShots,
      firstClear: firstClear,
      levelId: level.id,
      levelName: level.name,
      cueReward: cueReward,
      cueRewardCoins: cueRewardCoins
    };
    this.phase = 'over';
    this.charging = false;
    this.persist(this.save);
    this.emit('save', this.save);
    this.emit('hud', this.getState());
    this.emit('levelOver', this.levelResult);
    // Failure must also sound when the game began from a direct level card/API path.
    if (this.audio) {
      if (success) this.audio.win();
      else this.audio.lose();
    }
  };

  Game.prototype.finishMatch = function (winnerIdx, reason) {
    this.phase = 'over';
    this.charging = false;
    var winner = this.players[winnerIdx];
    var eco = economy();
    var humanWon = false;
    var coinsDelta = 0;
    var coins = 0;
    if (this.mode === 'ai') {
      humanWon = winnerIdx === 0;
      if (!this.save.record) this.save.record = { wins: 0, losses: 0, matches: 0 };
      this.save.record.matches = (this.save.record.matches || 0) + 1;
      var winAmount = eco.matchWin[this.difficulty];
      var lossAmount = eco.matchLoss[this.difficulty];
      if (winAmount == null) winAmount = eco.matchWin.normal;
      if (lossAmount == null) lossAmount = eco.matchLoss.normal;
      if (humanWon) {
        this.save.record.wins = (this.save.record.wins || 0) + 1;
        coinsDelta = winAmount;
      } else {
        this.save.record.losses = (this.save.record.losses || 0) + 1;
        coinsDelta = -lossAmount;
      }
      coins = this.applyCoins(coinsDelta);
      this.persist(this.save);
      this.emit('save', this.save);
    } else if (this.mode === 'pvp') {
      // 本地双人共用一份存档：胜者加金币，败者不扣
      coinsDelta = eco.pvpWin;
      coins = this.applyCoins(coinsDelta);
      this.persist(this.save);
      this.emit('save', this.save);
    }
    this.matchResult = {
      winner: winnerIdx,
      winnerName: winner ? winner.name : '',
      reason: reason || '',
      shots: this.shotsByPlayer.slice(),
      fouls: this.fouls.slice(),
      coins: coins,
      coinsDelta: coinsDelta
    };
    this.paused = false;
    this.emit('hud', this.getState());
    this.emit('matchOver', this.matchResult);
    if (this.audio) {
      if (this.mode === 'pvp' || humanWon) this.audio.win();
      else this.audio.lose();
    }
  };

  Game.prototype.enterBallInHand = function () {
    this._aimSnap = null;
    this.cuePreview = null;
    this.ballInHand = true;
    this.ballReAdjust = false;
    this.cueDragging = false;
    var cue = this.world && this.world.getBall('cue');
    if (!cue) { this.emit('ballinhand', this.getState()); return; }
    if (cue.active === false) {
      // 真落袋：球已消失在洞里，给一个合法默认摆放点等待玩家抓起。
      var W = C.table.width, H = C.table.height;
      var spot = this.findSafeSpot(W * 0.25, H / 2);
      cue.x = spot.x; cue.y = spot.y;
      cue.active = true;
      cue.pocketed = false;
      cue.pocketIndex = null;
    }
    // 母球仍在台上（含停在袋口/贴库）时保持原位：
    // 自由球是「玩家抓起来摆」，不是「把球从当前位置传送走」。
    // 旧版无条件 ensureCueSafe(true) 会用摆放级校验判定袋口位置非法，
    // 在收杆那一帧把母球瞬移回开球点。
    cue.vx = 0; cue.vy = 0;
    cue.spinX = 0; cue.spinY = 0;
    this.emit('ballinhand', this.getState());
  };

  /* ---------------------------------- AI 回合 ---------------------------------- */
  Game.prototype.startAITurn = function () {
    var p = this.players[this.activePlayer];
    if (!p || !p.isAI) return;
    this.ai = { stage: 'think', t: 0, plan: null };
    this.charging = false;
    this.power = 0;
    this.emit('ai', { stage: 'think', player: this.activePlayer });
    this.emit('hud', this.getState());
  };

  Game.prototype.updateAI = function (dt) {
    var self = this;
    this.ai.t += dt;
    if (this.ai.stage === 'think') {
      if (this.ai.t < 0.55) return;
      var p = this.players[this.activePlayer];
      var plan = null;
      try {
        if (Pool.AI && Pool.AI.chooseShot) {
          var aiCue = this.cue || C.cues[0];
          var opts = {
            cueBallId: 'cue',
            group: p.group || 'open',
            targetIds: this.getTargetIds(p),
            difficulty: this.difficulty,
            ballInHand: this.ballInHand,
            maxTimeMs: 250,
            // 出杆时 power/spin 会乘上球杆系数，AI 必须按同一套系数反算，
            // 否则换成力量型/球感型球杆后力度整体偏小，球会停在袋口。
            cuePower: aiCue.power || 1,
            cueSpin: aiCue.spin || 1
          };
          if (plan && plan.placement) { /* noop */ }
          plan = Pool.AI.chooseShot(this.world, opts);
        }
      } catch (e) {
        plan = null;
      }
      if (!plan) plan = this.fallbackAIPlan();
      if (this.ballInHand) {
        var want = plan.placement;
        if (!want || !this.isValidCuePos(want.x, want.y)) {
          want = this.findSafeSpot(C.table.width * 0.25, C.table.height / 2);
        }
        var cue = this.world.getBall('cue');
        if (cue) {
          cue.active = true; cue.x = want.x; cue.y = want.y; cue.vx = 0; cue.vy = 0;
          cue.pocketed = false; cue.pocketIndex = null;
        }
        this.ballInHand = false;
      }
      this.aimAngle = plan.angle != null ? plan.angle : this.aimAngle;
      this.spinX = U.clamp(plan.spinX || 0, -1, 1);
      this.spinY = U.clamp(plan.spinY || 0, -1, 1);
      this.power = 0;
      this.ai.plan = plan;
      this.ai.stage = 'windup';
      this.ai.t = 0;
      this.emit('spin', { x: this.spinX, y: this.spinY });
      this.emit('ai', { stage: 'aim', player: this.activePlayer, plan: plan });
      this.emit('hud', this.getState());
    } else if (this.ai.stage === 'windup') {
      var dur = 0.72;
      var k = U.clamp01(this.ai.t / dur);
      var targetPower = this.ai.plan ? this.ai.plan.power : 0.5;
      this.power = targetPower * U.easeInOutCubic(k);
      if (this.ai.t >= dur) {
        var plan2 = this.ai.plan || this.fallbackAIPlan();
        this.power = plan2.power;
        this.ai.stage = 'done';
        this.shoot(plan2.power, plan2.spinX, plan2.spinY);
      }
    }
  };

  Game.prototype.fallbackAIPlan = function () {
    var targets = this.getTargetIds(this.players[this.activePlayer]);
    var ball = targets.length ? this.world.getBall(targets[0]) : null;
    var cue = this.world.getBall('cue');
    var angle = 0;
    if (ball && cue) angle = Math.atan2(ball.y - cue.y, ball.x - cue.x);
    return {
      angle: angle + (Math.random() - 0.5) * 0.04,
      power: 0.42 + Math.random() * 0.2,
      spinX: 0, spinY: 0,
      placement: null,
      plan: 'safety'
    };
  };

  /* ---------------------------------- 暂停 / 状态 ---------------------------------- */
  Game.prototype.pause = function () {
    if (this.phase === 'menu' || this.phase === 'over') return false;
    this.paused = true;
    this.charging = false;
    this.chargeT = 0;
    this.power = 0;
    this.emit('pause', true);
    return true;
  };

  Game.prototype.resume = function () {
    if (!this.paused) return false;
    this.paused = false;
    this.emit('pause', false);
    return true;
  };

  Game.prototype.togglePause = function () {
    if (this.paused) return this.resume();
    return this.pause();
  };

  Game.prototype.toggleGuide = function () {
    if (this.mode === 'level' && this.level && this.level.allowGuide === false) {
      this.emit('toast', { text: '本关不提供辅助线', type: 'foul' });
      return false;
    }
    this.guideEnabled = !this.guideEnabled;
    if (!this.save.settings) this.save.settings = {};
    this.save.settings.guide = this.guideEnabled;
    this.persist(this.save);
    this.emit('guide', this.guideEnabled);
    return this.guideEnabled;
  };

  Game.prototype.remainingFor = function (player, idx) {
    if (this.mode === 'level') {
      if (this.level) return this.activeObjectCount();
      return 0;
    }
    if (!player) return 0;
    if (player.group) {
      var n = this.countGroup(player.group);
      if (n > 0) return n;
      var eight = this.world ? this.world.getBall('b8') : null;
      return eight && eight.active ? 1 : 0;
    }
    return this.activeObjectCount();
  };

  Game.prototype.getState = function () {
    var active = this.players[this.activePlayer] || null;
    var players = [];
    for (var i = 0; i < this.players.length; i++) {
      var p = this.players[i];
      players.push({
        name: p.name,
        short: p.short,
        group: p.group,
        isAI: p.isAI,
        color: p.color,
        remaining: this.remainingFor(p, i),
        shots: this.shotsByPlayer[i] || 0,
        fouls: this.fouls[i] || 0
      });
    }
    var targetIds = this.world ? this.getTargetIds(active) : [];
    return {
      mode: this.mode,
      phase: this.phase,
      paused: this.paused,
      activePlayer: this.activePlayer,
      players: players,
      targetIds: targetIds,
      remaining: this.mode === 'level' ? this.activeObjectCount() : targetIds.length,
      ballInHand: this.ballInHand,
      ballReAdjust: this.ballReAdjust,
      cueDragging: this.cueDragging,
      aiThinking: this.phase === 'aim' && !this.isHumanTurn() && this.ai.stage === 'think',
      isAI: active ? active.isAI : false,
      openTable: !this.players.length ? true : this.players.every(function (pl) { return !pl.group; }),
      breakShot: this.breakShot,
      level: this.level,
      shots: this.shots,
      maxShots: this.level ? this.level.maxShots : null,
      par: this.level ? this.level.par : null,
      // 关卡 HUD 进度（仅关卡模式；其他模式为 null）
      levelProgress: this.mode === 'level' && this.level ? {
        total: this.level.balls ? this.level.balls.length : 0,
        remaining: this.activeObjectCount(),
        shotsLeft: Math.max(0, (this.level.maxShots || 0) - this.shots),
        par: this.level.par,
        maxShots: this.level.maxShots,
        guideAllowed: this.level.allowGuide !== false,
        spinAllowed: this.level.allowSpin !== false
      } : null,
      guide: this.guideEnabled,
      spinX: this.spinX,
      spinY: this.spinY,
      power: this.power,
      charging: this.charging,
      aimAngle: this.aimAngle,
      cue: this.cue,
      cueOwned: this.isCueOwned(this.cue.id),
      totalStars: this.totalStars(),
      coins: this.save.coins || 0,
      matchResult: this.matchResult,
      levelResult: this.levelResult,
      shotsByPlayer: this.shotsByPlayer.slice(),
      fouls: this.fouls.slice(),
      time: this.time
    };
  };

  Game.prototype.getRenderState = function () {
    var active = this.players[this.activePlayer] || null;
    var players = [];
    for (var i = 0; i < this.players.length; i++) {
      var p = this.players[i];
      players.push({
        name: p.name,
        group: p.group,
        isAI: p.isAI,
        color: p.color,
        remaining: this.remainingFor(p, i)
      });
    }
    var thinking = this.phase === 'aim' && !this.isHumanTurn() && this.ai.stage === 'think';
    var humanAim = this.phase === 'aim' && this.isHumanTurn();
    var aiWindup = this.phase === 'aim' && this.ai.stage === 'windup';
    var aimVisible = this.phase === 'aim' && !this.paused && !this.ballInHand && !this.cueDragging &&
      !thinking && (humanAim || aiWindup);
    var targetIds = this.world ? this.getTargetIds(active) : [];
    // 开台阶段不把全部 14 颗球都高亮，避免视觉噪声；分组后/关卡再显示合法目标光环
    var highlightIds = this.mode === 'level' || (active && active.group) ? targetIds : [];
    var cueBall = this.world && this.world.getBall('cue');
    var cueVelocity = cueBall ? Math.sqrt(cueBall.vx * cueBall.vx + cueBall.vy * cueBall.vy) : 0;
    var spinDirection = cueVelocity > 0.03 && cueBall
      ? (this.spinX > 0.02 ? 1 : this.spinX < -0.02 ? -1 : 0) : 0;
    return {
      world: this.world,
      phase: this.phase,
      paused: this.paused,
      mode: this.mode,
      aim: {
        angle: this.aimAngle,
        power: this.power,
        charging: this.charging,
        visible: aimVisible,
        guide: this.guideEnabled,
        showCue: aimVisible,
        spinX: this.spinX,
        spinY: this.spinY,
        spinDirection: spinDirection,
        ballInHand: this.ballInHand,
        ballReAdjust: this.ballReAdjust,
        cueDragging: this.cueDragging,
        cueAim: this.cue ? this.cue.aim : 1,
        illegal: aimVisible ? this.getAimIllegal() : null,
        cuePreview: this.cuePreview ? { x: this.cuePreview.x, y: this.cuePreview.y } : null
      },
      players: players,
      activePlayer: this.activePlayer,
      targetIds: highlightIds,
      remaining: this.mode === 'level' ? this.activeObjectCount() : targetIds.length,
      time: this.time,
      banner: null,
      cue: this.cue,
      aiThinking: thinking,
      level: this.level
    };
  };

  /* ---------------------------------- 事件 ---------------------------------- */
  Game.prototype.on = function (name, fn) {
    (this.listeners[name] || (this.listeners[name] = [])).push(fn);
    return this;
  };
  Game.prototype.emit = function (name, data) {
    var list = this.listeners[name];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      try { list[i](data); } catch (e) { console.error('[listener]', name, e); }
    }
  };

  Pool.Game = Game;
})();

