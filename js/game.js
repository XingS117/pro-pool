/* 一杆入袋 — 游戏流程 / 八球规则 / 关卡 / 存档（Lead 维护） */
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
    // 在线对战钩子（离线模式默认空实现，行为完全不变）
    this.onLocalShot = opts.onLocalShot || function () {};
    this.onStateSettled = opts.onStateSettled || function () {};
    this._suppressNet = false;
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

    if (mode === 'pvp' || mode === 'online') {
      this.players = [
        { name: mode === 'online' ? '你' : '玩家 1', short: mode === 'online' ? '你' : 'P1', group: null, isAI: false, color: '#e8cd8e' },
        { name: mode === 'online' ? '对手' : '玩家 2', short: mode === 'online' ? '对手' : 'P2', group: null, isAI: false, color: '#9fc7ae' }
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

  /* 在线对战：执行对手的一杆（用完全相同的 shoot 路径，保证物理一致） */
  Game.prototype.applyRemoteShot = function (p) {
    if (!p || this.phase !== 'aim') return false;
    var cue = this.world && this.world.getBall('cue');
    if (typeof p.cueX === 'number' && typeof p.cueY === 'number' && cue) {
      cue.x = p.cueX; cue.y = p.cueY; cue.vx = 0; cue.vy = 0;
      this.ballInHand = false;
    }
    this.aimAngle = p.angle;
    this.aimTargetAngle = p.angle;
    this.aimSnap = null;
    this._suppressNet = true;
    try { return this.shoot(p.power, p.spinX, p.spinY); }
    finally { this._suppressNet = false; }
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
    if (!this._suppressNet) {
      var cueNow = this.world.getBall('cue');
      this.onLocalShot({
        angle: this.aimAngle, power: shotPower, spinX: sx, spinY: sy,
        cueX: this.ballInHand && cueNow ? cueNow.x : null,
        cueY: this.ballInHand && cueNow ? cueNow.y : null
      });
    }
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
    if (!this._suppressNet) this.onStateSettled({ activePlayer: this.activePlayer, over: !!this.matchResult });
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
