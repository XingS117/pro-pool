/* 微信小游戏运行时适配层：把浏览器 API 映射到 wx API。
   核心游戏代码(config/physics/renderer/audio/ai/levels/game)无需修改即可运行。 */
const sys = wx.getSystemInfoSync();
const mainCanvas = wx.createCanvas();
mainCanvas.width = Math.round(sys.screenWidth * sys.pixelRatio);
mainCanvas.height = Math.round(sys.screenHeight * sys.pixelRatio);
window.__MG_CANVAS = mainCanvas;
window.__MG_SYS = sys;
window.devicePixelRatio = sys.pixelRatio;
window.innerWidth = sys.screenWidth;
window.innerHeight = sys.screenHeight;
window.screen = { width: sys.screenWidth, height: sys.screenHeight };
// WebAudio -> wx WebAudioContext
function MgAudioContext(){ return wx.createWebAudioContext(); }
window.AudioContext = MgAudioContext;
window.webkitAudioContext = MgAudioContext;
// base64 -> binary（audio.js 内嵌采样解码用）
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
window.atob = function (s) {
  s = String(s).replace(/=+$/, '');
  let out = '', buf = 0, bits = 0;
  for (let i = 0; i < s.length; i++) {
    buf = (buf << 6) | B64.indexOf(s[i]); bits += 6;
    if (bits >= 8) { bits -= 8; out += String.fromCharCode((buf >> bits) & 0xFF); }
  }
  return out;
};
// 存储
window.localStorage = {
  getItem: k => { try { const v = wx.getStorageSync(k); return v === '' ? null : v; } catch (e) { return null; } },
  setItem: (k, v) => { try { wx.setStorageSync(k, String(v)); } catch (e) {} },
  removeItem: k => { try { wx.removeStorageSync(k); } catch (e) {} }
};
window.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
// 离屏 canvas / 图片
window.Image = function () { const im = wx.createImage(); return im; };
const stubEl = () => ({ style: {}, classList: { add(){}, remove(){}, toggle(){} }, addEventListener(){}, removeEventListener(){}, appendChild(){}, setAttribute(){}, getContext: () => null });
const classList = {
  _set: {},
  add: function () { for (let i = 0; i < arguments.length; i++) this._set[arguments[i]] = 1; },
  remove: function () { for (let i = 0; i < arguments.length; i++) delete this._set[arguments[i]]; },
  toggle: function (c, f) { if (f === undefined) { if (this._set[c]) delete this._set[c]; else this._set[c] = 1; } else if (f) this._set[c] = 1; else delete this._set[c]; },
  contains: function (c) { return !!this._set[c]; }
};
window.document = {
  createElement: tag => (tag === 'canvas' ? wx.createCanvas() : stubEl()),
  createElementNS: (ns, tag) => stubEl(),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  body: Object.assign(stubEl(), { classList: classList }),
  documentElement: stubEl()
};
window.addEventListener = () => {};
window.removeEventListener = () => {};
window.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 16);
window.cancelAnimationFrame = id => clearTimeout(id);
window.performance = window.performance || { now: () => Date.now() };
window.location = { protocol: 'https:', hostname: 'wechat-minigame', href: '' };
window.navigator = window.navigator || { userAgent: 'wechat-minigame' };

// ---- Canvas 像素能力兼容 -------------------------------------------------
// 微信小游戏 2D Canvas 主线程不支持 ctx.createImageData（仅 wx.createImageData
// 或 OffscreenCanvas 具备该能力）。渲染器用它生成台呢纹理，这里做能力探测与
// 降级：能用则补齐 createImageData/putImageData，不能用则退化为纯绘制路径。
(function () {
  function patchCtx(ctx) {
    if (!ctx || ctx.__mgPatched) return;
    ctx.__mgPatched = true;
    if (typeof ctx.createImageData === 'function') return;
    ctx.createImageData = function (w, h) {
      if (typeof wx.createImageData === 'function') {
        try { return wx.createImageData(w, h); } catch (e) { /* fallthrough */ }
      }
      try {
        var off = wx.createOffscreenCanvas({ type: '2d', width: w, height: h });
        var c2 = off.getContext('2d');
        var d = c2.createImageData(w, h);
        return d;
      } catch (e) {
        return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
      }
    };
  }
  var origCreate = wx.createCanvas;
  wx.createCanvas = function () {
    var cv = origCreate.apply(wx, arguments);
    try { patchCtx(cv.getContext('2d')); } catch (e) {}
    // 小游戏 canvas 没有 DOM 盒模型，补一个与屏幕尺寸一致的矩形
    if (typeof cv.getBoundingClientRect !== 'function') {
      cv.getBoundingClientRect = function () {
        return { left: 0, top: 0, width: sys.screenWidth, height: sys.screenHeight,
                 right: sys.screenWidth, bottom: sys.screenHeight, x: 0, y: 0 };
      };
    }
    return cv;
  };
  if (typeof mainCanvas.getBoundingClientRect !== 'function') {
    mainCanvas.getBoundingClientRect = function () {
      return { left: 0, top: 0, width: sys.screenWidth, height: sys.screenHeight,
               right: sys.screenWidth, bottom: sys.screenHeight, x: 0, y: 0 };
    };
  }
  // 主画布
  patchCtx(mainCanvas.getContext('2d'));
  window.__MG_HAS_IMAGEDATA = (function () {
    try { var t = mainCanvas.getContext('2d').createImageData(1, 1); return !!(t && t.data); }
    catch (e) { return false; }
  })();
})();