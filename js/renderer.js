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
  function makeClothTexture() {
    var S = 512;
    var cv = makeCanvas(S, S);
    var g = cv.getContext('2d');
    var img = g.createImageData(S, S);
    var data = img.data;
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
