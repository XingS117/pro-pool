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
window.document = {
  createElement: tag => (tag === 'canvas' ? wx.createCanvas() : stubEl()),
  createElementNS: (ns, tag) => stubEl(),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  body: stubEl(),
  documentElement: stubEl()
};
window.addEventListener = () => {};
window.removeEventListener = () => {};
window.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 16);
window.cancelAnimationFrame = id => clearTimeout(id);
window.performance = window.performance || { now: () => Date.now() };
window.location = { protocol: 'https:', hostname: 'wechat-minigame', href: '' };
window.navigator = window.navigator || { userAgent: 'wechat-minigame' };
