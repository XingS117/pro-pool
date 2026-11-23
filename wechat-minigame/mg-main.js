/* 一杆入袋 PRO POOL · 微信小游戏主程序（完整版 UI）
 * 复用 core.js 引擎：单人/双人/12关闯关/9支球杆商店/金币星星/设置/暂停/胜负音效 */
require('./adapter.js');
require('./core.js');
const P = window.Pool;
const sys = window.__MG_SYS;
const canvas = window.__MG_CANVAS;
const W = sys.screenWidth, H = sys.screenHeight;
const renderer = new P.Renderer(canvas);
// 小游戏用自研渲染内核，不走 X5 降级（否则退化成横版简笔画、无法竖屏旋转）
renderer.compat = false;
try { if (window.document && window.document.body && window.document.body.classList) window.document.body.classList.remove('browser-compat'); } catch (e) {}
const audio = new P.Audio();
/* 背景音乐：WebAudio 程序化生成活泼短循环（零音频文件、不占包体） */
const BGM = (function () {
  let ctx = null, master = null, timer = null, step = 0, playing = false;
  // 欢快的 C 大调小旋律（音符频率，0=休止）
  const MELODY = [
    523, 659, 784, 659, 523, 659, 784, 1047,
    880, 784, 659, 784, 587, 698, 880, 698,
    523, 659, 784, 659, 523, 587, 659, 0,
    784, 880, 1047, 880, 784, 659, 523, 0
  ];
  const BASS = [131, 131, 175, 175, 196, 196, 165, 165];
  function ensure() {
    if (ctx) return true;
    try {
      ctx = wx.createWebAudioContext();
      master = ctx.createGain();
      master.gain.value = 0.0;
      master.connect(ctx.destination);
      return true;
    } catch (e) { ctx = null; return false; }
  }
  function note(freq, when, dur, type, vol) {
    if (!ctx || !freq) return;
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'triangle'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(g); g.connect(master);
      o.start(when); o.stop(when + dur + 0.02);
    } catch (e) {}
  }
  function tick() {
    if (!ctx || !playing) return;
    const now = ctx.currentTime;
    const beat = 0.20;
    const i = step % MELODY.length;
    note(MELODY[i], now, beat * 0.9, 'triangle', 0.14);
    if (step % 4 === 0) note(BASS[Math.floor(step / 4) % BASS.length], now, beat * 2.2, 'sine', 0.10);
    step++;
  }
  return {
    start() {
      if (playing || !ensure()) return;
      try { if (ctx.state === 'suspended' && ctx.resume) ctx.resume(); } catch (e) {}
      playing = true; step = 0;
      try { master.gain.setTargetAtTime(0.5, ctx.currentTime, 0.1); } catch (e) {}
      tick(); timer = setInterval(tick, 200);
    },
    stop() {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      try { master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05); } catch (e) {}
    },
    isPlaying() { return playing; }
  };
})();
const SAVE_KEY = 'propool_save_v1';
const PREFS_KEY = 'propool_prefs_v1';

function loadSave() {
  try { const s = wx.getStorageSync(SAVE_KEY); if (s) return JSON.parse(s); } catch (e) {}
  return { version: 1, coins: 0, stars: {}, cleared: {}, ownedCues: ['oak'], equipped: 'oak',
    settings: { guide: true, sound: true }, record: { wins: 0, losses: 0, matches: 0 } };
}
function loadPrefs() {
  try { const s = wx.getStorageSync(PREFS_KEY); if (s) return JSON.parse(s); } catch (e) {}
  return { theme: 'night', bgm: false };
}
let prefs = loadPrefs();
function savePrefs() { try { wx.setStorageSync(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {} }

const game = new P.Game({ save: loadSave(), persist: s => { try { wx.setStorageSync(SAVE_KEY, JSON.stringify(s)); } catch (e) {} }, audio, renderer });
// 切换回合：音效 + 击球点复位（每杆都从中杆开始，不继承上一杆的击球点）
try {
  game.on('turn', d => {
    // 每次新回合都把 UI 击球点归零（引擎内部也会 resetSpin，这里同步 UI 层）
    spinX = 0; spinY = 0; spinFree = false;
    if (d && d.switched && audio.turnSwitch) { try { audio.turnSwitch(); } catch (e) {} }
  });
  // 出杆后也立即归零，保证同一回合的下一杆（连杆/自由球）回到中杆
  game.on('shot', () => { spinX = 0; spinY = 0; spinFree = false; });
} catch (e) {}
renderer.resize();
const ctx = renderer.ctx;

const CUES = (P.CONFIG && P.CONFIG.cues) || [];
const LEVELS = P.LEVELS || [];
const SPIN = [
  ['高杆左塞', -0.5, 0.5], ['高杆', 0, 0.7], ['高杆右塞', 0.5, 0.5],
  ['左塞', -0.7, 0], ['中杆', 0, 0], ['右塞', 0.7, 0],
  ['低杆左塞', -0.5, -0.5], ['低杆', 0, -0.7], ['低杆右塞', 0.5, -0.5],
  ['中高杆', 0, 0.35], ['中低杆', 0, -0.35]
];

/* ---------------- 状态 ---------------- */
// menu | difficulty | levels | shop | settings | help | play | spin | over | pause
let screen = 'menu';
let power = 0.6, spinX = 0, spinY = 0, spinFree = false;
let spinDragging = false;
let aiming = false, powering = false, draggingCue = false, angling = false, angleLastX = 0;
let soundOn = game.save.settings ? game.save.settings.sound !== false : true;
let guideOn = game.save.settings ? game.save.settings.guide !== false : true;
let listScroll = 0, selectedCue = 0, toast = null;
let lastMode = 'ai', lastDifficulty = 'normal', lastLevelIdx = 0;

try { wx.showShareMenu({ withShareTicket: true }); wx.onShareAppMessage(() => ({ title: '一杆入袋 PRO POOL · 真实物理台球，免费即玩' })); } catch (e) {}

/* ---------------- 主题色 ---------------- */
function T() {
  if (prefs.theme === 'day') {
    return { bg: '#e9e4d6', panel: '#f5f1e6', ink: '#2a2318', sub: '#6b6252', gold: '#a97b1f',
      card: '#e4ddca', cardOn: '#f0d9a0', line: 'rgba(90,72,40,0.28)', mask: 'rgba(233,228,214,0.94)',
      felt: '#1f6f45', green: '#2f8f57' };
  }
  return { bg: '#0a120c', panel: '#121a14', ink: '#f5f2e8', sub: 'rgba(245,242,232,0.62)', gold: '#e8c478',
    card: '#1c2a20', cardOn: '#e8c478', line: 'rgba(232,196,120,0.28)', mask: 'rgba(6,10,8,0.94)',
    felt: '#17663b', green: '#2ea44f' };
}

/* ---------------- 布局常量 ---------------- */
// 微信小程序右上角胶囊的中线 Y（逻辑像素）。各页面顶部元素都以此为基准对齐，
// 避免与胶囊重叠/错位。getMenuButtonBoundingClientRect 在真机与开发者工具均可用；
// 拿不到时用安全区顶部 + 胶囊半高兜底。
function capsuleMidY() {
  try {
    if (wx.getMenuButtonBoundingClientRect) {
      const b = wx.getMenuButtonBoundingClientRect();
      if (b && typeof b.top === 'number' && typeof b.bottom === 'number') return (b.top + b.bottom) / 2;
    }
  } catch (e) {}
  return (window.__MG_SAFE_TOP || 0) + 26;
}
const CAPSY = capsuleMidY();          // 胶囊中线：顶部元素与它对齐
const TOPBASE = CAPSY + 26;           // 胶囊下方一段距离：内容区起始
// 首页整体下移量：原标题中心在 H*0.115，让标题顶部恰好落在胶囊下方
const MENU_DY = Math.max(0, TOPBASE - (H * 0.115 - 20));
// 首页按钮额外下移：拉开与统计文字/主视觉的距离
const MENU_BTN_DY = MENU_DY + 16;
// 二级页面统一下移量：原页面标题约在 y=36~H*0.16，让标题中线不高于胶囊中线下方
const SUB_DY = Math.max(0, TOPBASE + 6 - 40);

const ICON = 38, GAP = 9;
const CTRL_W = Math.round(W * 0.13);
const PLAY_TOP = Math.min(window.__MG_SAFE_TOP || 0, H * 0.10) + 54;
const PLAY_BOTTOM = 88;
const TABLE_H = H - PLAY_TOP - PLAY_BOTTOM;
const INSET = ICON / 2;
const GROUP_TOP = PLAY_TOP + INSET;
const GROUP_BOTTOM = PLAY_TOP + TABLE_H - INSET;
const BAR_H = Math.max(100, (GROUP_BOTTOM - GROUP_TOP) - ICON * 4 - GAP * 4);
const ctrlCX = W - CTRL_W / 2;
function iconAt(i) { return { x: ctrlCX - ICON / 2, y: GROUP_TOP + i * (ICON + GAP), w: ICON, h: ICON }; }
const R = {
  // 首页：3 个大胶囊竖排 + 底部 3 个小胶囊并排（总宽与大胶囊一致）
  solo:   { x: W * 0.09, y: H * 0.435 + MENU_BTN_DY, w: W * 0.82, h: 58 },
  pvp:    { x: W * 0.09, y: H * 0.435 + 68 + MENU_BTN_DY, w: W * 0.82, h: 58 },
  levels: { x: W * 0.09, y: H * 0.435 + 136 + MENU_BTN_DY, w: W * 0.82, h: 58 },
  shop:   { x: W * 0.09,                     y: H * 0.435 + 212 + MENU_BTN_DY, w: W * 0.82 / 3 - 5, h: 52 },
  settings:{ x: W * 0.09 + W * 0.82 / 3 + 2.5, y: H * 0.435 + 212 + MENU_BTN_DY, w: W * 0.82 / 3 - 5, h: 52 },
  help:   { x: W * 0.09 + (W * 0.82 / 3 + 2.5) * 2, y: H * 0.435 + 212 + MENU_BTN_DY, w: W * 0.82 / 3 - 5, h: 52 },
  back:   { x: 10, y: CAPSY - 20, w: 76, h: 40 },
  menuIcon: iconAt(0), orbIcon: iconAt(1),
  bar: { x: ctrlCX - 11, y: GROUP_TOP + 2 * (ICON + GAP), w: 22, h: BAR_H },
  soundIcon: { x: ctrlCX - ICON / 2, y: GROUP_TOP + 2 * (ICON + GAP) + BAR_H + GAP, w: ICON, h: ICON },
  guideIcon: { x: ctrlCX - ICON / 2, y: GROUP_BOTTOM - ICON, w: ICON, h: ICON },
  angleStrip: { x: 12, y: H - 88, w: (W - CTRL_W) - 24, h: 38 },
  // 结算/暂停页按钮：间距收紧、整体上移居中
  again: { x: W * 0.18, y: H * 0.44, w: W * 0.64, h: 48 },
  next:  { x: W * 0.18, y: H * 0.44 + 66, w: W * 0.64, h: 48 },
  home:  { x: W * 0.18, y: H * 0.44 + 132, w: W * 0.64, h: 48 },
  resume:{ x: W * 0.18, y: H * 0.44, w: W * 0.64, h: 50 },
  restart:{ x: W * 0.18, y: H * 0.44 + 60, w: W * 0.64, h: 50 },
  quit:  { x: W * 0.18, y: H * 0.44 + 120, w: W * 0.64, h: 50 }
};
// 结算页「返回主菜单」按钮位置：关卡用第三个槽位，对局（仅2按钮）紧邻再来一局
function overHomeR() {
  if (game.mode === 'level') return levelBtnR(2);
  return { x: W * 0.18, y: R.again.y + 70, w: W * 0.64, h: 48 };
}
// 关卡结算三按钮：从奖励卡片下方起排（奖励卡底=H*0.40+54，球杆奖励文字=H*0.40+70）
function levelBtnR(i) { return { x: W * 0.18, y: H * 0.50 + i * 60, w: W * 0.64, h: 48 }; }
function setPlayInsets(on) {
  if (!renderer.setInsets) return;
  renderer.setInsets(on ? { top: PLAY_TOP, right: CTRL_W, bottom: PLAY_BOTTOM, left: 0 } : { top: 0, right: 0, bottom: 0, left: 0 });
}
const inR = (t, r) => t.clientX >= r.x && t.clientX <= r.x + r.w && t.clientY >= r.y && t.clientY <= r.y + r.h;
function world(t) { return renderer.screenToWorld(t.clientX, t.clientY); }
// 触摸点是否落在母球上（用于自由球/可再调整时按住母球拖动）
function hitCueBall(t) {
  try {
    const cue = game.world && game.world.getBall && game.world.getBall('cue');
    if (!cue) return false;
    // 自由球初始母球可能不可见：允许点预览位置；可见时按屏幕位置判定
    const px = (game.cuePreview && game.cuePreview.x != null) ? game.cuePreview.x : cue.x;
    const py = (game.cuePreview && game.cuePreview.y != null) ? game.cuePreview.y : cue.y;
    const sp = renderer.worldToScreen(px, py);
    const sr = (game.world.ballRadius || 0.03) * (renderer.scale || 1);
    const hitR = Math.max(22, sr * 1.9);  // 触摸容差：至少 22px，便于手指按住
    return (t.clientX - sp.x) ** 2 + (t.clientY - sp.y) ** 2 <= hitR * hitR;
  } catch (e) { return false; }
}
function say(text, type) { toast = { text, type: type || 'good', until: Date.now() + 1800 }; }

function startMatch(mode, diff) {
  lastMode = mode; lastDifficulty = diff || 'normal';
  setPlayInsets(true);
  game.startMatch(mode, diff || 'normal');
  screen = 'play'; power = 0.6; spinX = 0; spinY = 0; spinFree = false;
  try { audio.unlock(); } catch (e) {}
  if (prefs.bgm) BGM.start();
}
function startLevel(idx) {
  if (idx < 0 || idx >= LEVELS.length) return;
  if (idx > 0 && !game.save.cleared[LEVELS[idx - 1].id]) { say('先通过上一关才能解锁', 'foul'); return; }
  lastLevelIdx = idx;
  setPlayInsets(true);
  game.startLevel(LEVELS[idx].id);
  screen = 'play'; power = 0.6; spinX = 0; spinY = 0; spinFree = false;
  try { audio.unlock(); } catch (e) {}
  if (prefs.bgm) BGM.start();
}
function goHome() { setPlayInsets(false); try { game.quitToMenu(); } catch (e) {} screen = 'menu'; listScroll = 0; }

/* ---------------- 绘制辅助 ---------------- */
function rr(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
}
function panel(x, y, w, h, c) {
  ctx.fillStyle = c.panel; rr(x, y, w, h, 16); ctx.fill();
  ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.stroke();
}
function btn(r, label, fill, fg, fs) {
  ctx.save();
  ctx.fillStyle = fill; rr(r.x, r.y, r.w, r.h, 12); ctx.fill();
  ctx.fillStyle = fg; ctx.font = '600 ' + (fs || 17) + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2); ctx.restore();
}
function title(text, x, y, size, c, color) {
  ctx.fillStyle = color || c.ink; ctx.font = '700 ' + size + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
}
function star(x, y, r, on, c) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r;
    const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = on ? '#f2c230' : 'rgba(140,140,140,0.28)'; ctx.fill();
  ctx.strokeStyle = on ? '#b8861b' : 'rgba(140,140,140,0.4)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}
function coin(x, y, r) {
  ctx.save();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffe9a8'); g.addColorStop(0.6, '#e8b93c'); g.addColorStop(1, '#a8781b');
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#7d5711'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#7d5711'; ctx.font = '700 ' + Math.round(r * 1.1) + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('¥', x, y + 1);
  ctx.restore();
}
// 真实质感球杆：斜置，木纹渐变 + 接环 + 握把 + 皮头
function drawCueArt(x, y, len, angle, cue, c) {
  if (!cue) return;
  const v = cue.visual || {}, w = Math.max(7, len * 0.04);
  const L = -len / 2, R = len / 2;
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  // 地面投影
  ctx.save(); ctx.translate(0, w * 0.5); ctx.scale(1, 0.3);
  ctx.beginPath(); ctx.ellipse(0, 0, len * 0.5, w, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill(); ctx.restore();
  // 前节：圆柱渐变（上暗→中亮→下暗），木纹高光
  const sg = ctx.createLinearGradient(0, -w * 0.45, 0, w * 0.45);
  sg.addColorStop(0, shade(cue.colors.shaft, -0.5));
  sg.addColorStop(0.25, cue.colors.shaft);
  sg.addColorStop(0.42, shade(cue.colors.shaft, 0.22));
  sg.addColorStop(0.6, cue.colors.shaft);
  sg.addColorStop(1, shade(cue.colors.shaft, -0.55));
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(L, -w * 0.26); ctx.lineTo(0, -w * 0.4);
  ctx.lineTo(0, w * 0.4); ctx.lineTo(L, w * 0.26); ctx.closePath(); ctx.fill();
  // 木纹细线
  ctx.strokeStyle = shade(cue.colors.shaft, -0.28); ctx.lineWidth = 0.6; ctx.globalAlpha = 0.5;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath(); ctx.moveTo(L + i * 4, -w * 0.18 + i * 2); ctx.lineTo(0, -w * 0.3 + i * 3); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // 后把：圆柱渐变
  const bg = ctx.createLinearGradient(0, -w * 0.75, 0, w * 0.75);
  bg.addColorStop(0, shade(cue.colors.butt, -0.55));
  bg.addColorStop(0.28, cue.colors.butt);
  bg.addColorStop(0.44, shade(cue.colors.butt, 0.2));
  bg.addColorStop(0.62, cue.colors.butt);
  bg.addColorStop(1, shade(cue.colors.butt, -0.6));
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(0, -w * 0.52); ctx.lineTo(R * 0.86, -w * 0.7);
  ctx.lineTo(R * 0.86, w * 0.7); ctx.lineTo(0, w * 0.52); ctx.closePath(); ctx.fill();
  // 握把纹理（按 wrapStyle）
  if (v.wrapStyle === 'linen' || v.wrapStyle === 'rings') {
    ctx.strokeStyle = cue.colors.wrap; ctx.lineWidth = Math.max(1, w * 0.1);
    for (let i = 1; i <= 8; i++) {
      const px = len * 0.1 + i * (len * 0.045);
      ctx.beginPath(); ctx.moveTo(px, -w * 0.55); ctx.lineTo(px + w * 0.2, w * 0.55); ctx.stroke();
    }
  } else if (v.wrapStyle === 'leather') {
    ctx.fillStyle = cue.colors.wrap;
    ctx.fillRect(len * 0.12, -w * 0.56, len * 0.34, w * 1.12);
    ctx.strokeStyle = shade(cue.colors.wrap, 0.3); ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) { const px = len * 0.12 + i * len * 0.06; ctx.beginPath(); ctx.moveTo(px, -w*0.55); ctx.lineTo(px, w*0.55); ctx.stroke(); }
  } else if (v.wrapStyle === 'knurl') {
    ctx.strokeStyle = shade(cue.colors.butt, -0.5); ctx.lineWidth = 0.8;
    for (let i = 0; i < 16; i++) { const px = len * 0.12 + i * len * 0.03; ctx.beginPath(); ctx.moveTo(px, -w*0.6); ctx.lineTo(px + w*0.3, w*0.6); ctx.stroke(); }
  }
  // 接环
  if (v.joint !== 'none') {
    ctx.fillStyle = cue.colors.accent;
    ctx.fillRect(-w * 0.12, -w * 0.45, w * 0.14, w * 0.9);
    if (v.joint === 'double') ctx.fillRect(w * 0.1, -w * 0.5, w * 0.12, w);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-w * 0.1, -w * 0.42, w * 0.03, w * 0.84);
  }
  // 装饰母题
  if (v.accentShape === 'diamond') {
    ctx.fillStyle = cue.colors.accent;
    ctx.beginPath(); ctx.moveTo(len * 0.28, 0); ctx.lineTo(len * 0.31, -w * 0.32);
    ctx.lineTo(len * 0.35, 0); ctx.lineTo(len * 0.31, w * 0.32); ctx.closePath(); ctx.fill();
  } else if (v.accentShape === 'star') {
    ctx.fillStyle = cue.colors.accent;
    const sx = len * 0.32, sr = w * 0.32;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI/2 + i*Math.PI/5, rr2 = i%2?sr*0.45:sr; const px=sx+Math.cos(a)*rr2, py=Math.sin(a)*rr2; i?ctx.lineTo(px,py):ctx.moveTo(px,py); }
    ctx.closePath(); ctx.fill();
  } else if (v.accentShape === 'chevron') {
    ctx.strokeStyle = cue.colors.accent; ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) { const px = len*0.26 + i*len*0.05; ctx.beginPath(); ctx.moveTo(px, -w*0.3); ctx.lineTo(px+w*0.15, 0); ctx.lineTo(px, w*0.3); ctx.stroke(); }
  }
  // 尾部造型（按名字/shape 区分）
  const tailX = R * 0.86;
  if (cue.shape === 'wand') {
    // 魔杖：顶端星星
    ctx.fillStyle = cue.colors.accent;
    const sr = w * 0.7;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a=-Math.PI/2+i*Math.PI/5, rr2=i%2?sr*0.45:sr; const px=tailX+Math.cos(a)*rr2, py=Math.sin(a)*rr2; i?ctx.lineTo(px,py):ctx.moveTo(px,py); }
    ctx.closePath(); ctx.fill();
  } else if (cue.shape === 'pistol') {
    // 枪式：握把 + 扳机
    ctx.fillStyle = shade(cue.colors.butt, -0.3);
    ctx.fillRect(tailX - w * 0.6, 0, w * 1.2, w * 1.1);
    ctx.strokeStyle = cue.colors.accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tailX - w * 0.2, w * 0.3, w * 0.3, 0, Math.PI); ctx.stroke();
  } else if (cue.shape === 'golf') {
    // 推杆：T 形杆头
    ctx.fillStyle = shade(cue.colors.shaft, -0.2);
    ctx.fillRect(tailX - w * 0.2, -w * 1.0, w * 0.5, w * 2.0);
  } else if (cue.shape === 'rod') {
    // 钓竿：导环
    ctx.strokeStyle = cue.colors.accent; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const px = L + len*0.15 + i*len*0.1; ctx.beginPath(); ctx.arc(px, 0, w*0.22, 0, Math.PI*2); ctx.stroke(); }
  } else {
    // 传统球杆：尾部保护圈 + logo 点
    ctx.fillStyle = shade(cue.colors.butt, -0.6);
    ctx.fillRect(tailX - w * 0.1, -w * 0.72, w * 0.22, w * 1.44);
    ctx.fillStyle = cue.colors.accent;
    ctx.beginPath(); ctx.arc(tailX - w * 0.15, 0, w * 0.16, 0, Math.PI * 2); ctx.fill();
  }
  // 皮头（蓝白）
  ctx.fillStyle = '#e8e4d8';
  ctx.beginPath(); ctx.ellipse(L, 0, w * 0.1, w * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = cue.colors.tip || '#4a78a6';
  ctx.beginPath(); ctx.ellipse(L - w * 0.03, 0, w * 0.06, w * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function shade(hex, amt) {
  try {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r * (1 + amt))));
    g = Math.max(0, Math.min(255, Math.round(g * (1 + amt))));
    b = Math.max(0, Math.min(255, Math.round(b * (1 + amt))));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  } catch (e) { return hex; }
}
// 真实台球图标：带号码与花色腰带
function drawBall(x, y, r, num) {
  const col = (P.BALL_COLORS && P.BALL_COLORS[num]) || '#cccccc';
  const stripe = num > 8;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = stripe ? '#f4f1e8' : col; ctx.fill();
  ctx.shadowColor = 'transparent';
  if (stripe) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(x - r, y - r * 0.5, r * 2, r); ctx.restore(); }
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = '#fbf9f2'; ctx.beginPath(); ctx.arc(x, y, r * 0.46, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a1a'; ctx.font = '700 ' + Math.max(7, r * 0.9) + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(num), x, y + 0.5);
  ctx.restore();
}

/* ---------------- 击球点网格（4+4+3，末行居中） ---------------- */
// 击球点页：上方大母球（可手动点选），下方 3/3/3/2 胶囊网格
// 整体下移：母球与胶囊网格都比原来靠下，母球明显落在微信胶囊下方
const BALL_CX = W / 2, BALL_CY = H * 0.27 + SUB_DY, BALL_R = Math.min(W * 0.28, 112);
function spinRect(i) {
  const cols = 3, gw = W * 0.86;
  const gy0 = H * 0.45 + SUB_DY, ch = 48, gap = 8, cw = (gw - gap * (cols - 1)) / cols;
  const row = Math.floor(i / cols), col = i % cols;
  const inRow = Math.min(cols, SPIN.length - row * cols);
  // 最后一行不足 3 个：等分整个宽度，左右边缘与上面整齐对齐
  const w = inRow === cols ? cw : (gw - gap * (inRow - 1)) / inRow;
  const x0 = (W - gw) / 2;
  return { x: x0 + col * (w + gap), y: gy0 + row * (ch + gap), w, h: ch };
}
// 母球上点击位置 -> 最近的击球点预设（仅用于说明卡片取名，不再吸附坐标）
function pickSpinAt(x, y) {
  const nx = (x - BALL_CX) / (BALL_R * 0.72), ny = -(y - BALL_CY) / (BALL_R * 0.72);
  let best = 0, bd = Infinity;
  for (let i = 0; i < SPIN.length; i++) {
    const d = (nx - SPIN[i][1]) ** 2 + (ny - SPIN[i][2]) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
// 自由点选：把白盘上的触摸位置转成连续击球点（归一化到单位圆内，半径上限 0.85）
function setSpinFree(x, y) {
  let nx = (x - BALL_CX) / (BALL_R * 0.72), ny = -(y - BALL_CY) / (BALL_R * 0.72);
  const len = Math.hypot(nx, ny), maxR = 0.85;
  if (len > maxR) { nx = nx / len * maxR; ny = ny / len * maxR; }
  spinX = nx; spinY = ny; spinFree = true;
}
/* ---------------- 列表项坐标 ---------------- */
// 非对局页面使用全宽（不预留右侧控制栏），避免最右列被裁掉
function pageRight() { return W; }
function levelRect(i) { const cols = 3, gw = W * 0.90, gap = 9, cw = (gw - gap * 2) / cols; return { x: (W - gw) / 2 + (i % cols) * (cw + gap), y: 120 + SUB_DY + Math.floor(i / cols) * 100 - listScroll, w: cw, h: 90 }; }
function cueRect(i) { return { x: W * 0.05, y: 104 + SUB_DY + i * 82 - listScroll, w: W * 0.90, h: 74 }; }
function diffRect(i) { return { x: W * 0.14, y: H * 0.34 + SUB_DY + i * 74, w: W * 0.72, h: 60 }; }
function settingsRect(i) { return { x: W * 0.10, y: H * 0.28 + SUB_DY + i * 74, w: W * 0.80, h: 60 }; }
// 击球点页关闭按钮：微信胶囊下方留 10px 间距，避免误触小程序关闭
const spinCloseR = { x: W - 46, y: CAPSY + 28, w: 34, h: 30 };

/* ---------------- 触摸分发 ---------------- */
function setPower(t) {
  const r = R.bar;
  // 往下拉力度增大，与黄色从上往下覆盖一致
  power = Math.max(0.05, Math.min(1, (t.clientY - r.y) / r.h));
}
wx.onTouchStart(e => {
  const t = e.touches[0]; if (!t) return;
  try { audio.unlock(); } catch (err) {}
  if (screen === 'menu') {
    if (inR(t, R.solo)) { screen = 'difficulty'; return; }
    if (inR(t, R.pvp)) return startMatch('pvp');
    if (inR(t, R.levels)) { screen = 'levels'; listScroll = 0; return; }
    if (inR(t, R.shop)) { screen = 'shop'; listScroll = 0; return; }
    if (inR(t, R.settings)) { screen = 'settings'; return; }
    if (inR(t, R.help)) { screen = 'help'; return; }
    return;
  }
  if (screen === 'difficulty') {
    const opts = [ ['easy','入门'], ['normal','标准'], ['hard','大师'] ];
    for (let i = 0; i < opts.length; i++) {
      if (inR(t, diffRect(i))) return startMatch('ai', opts[i][0]);
    }
    if (inR(t, R.back)) screen = 'menu';
    return;
  }
  if (screen === 'levels') {
    if (inR(t, R.back)) { screen = 'menu'; return; }
    for (let i = 0; i < LEVELS.length; i++) {
      const r = levelRect(i);
      if (inR(t, r) && r.y > 100 && r.y < H - 20) return startLevel(i);
    }
    return;
  }
  if (screen === 'shop') {
    if (inR(t, R.back)) { screen = 'menu'; return; }
    for (let i = 0; i < CUES.length; i++) {
      const r = cueRect(i);
      if (inR(t, r) && r.y > 96 && r.y < H - 20) {
        const cue = CUES[i];
        if (game.isCueOwned(cue.id)) { game.equipCue(cue.id); say('已装备 · ' + cue.name); }
        else {
          const res = game.canBuyCue(cue.id);
          if (res.ok) { game.buyCue(cue.id); say('已购入并装备 · ' + cue.name); }
          else say(res.reason === 'stars' ? ('需要 ' + res.need + ' 颗星') : ('金币不足，还差 ' + (res.need - game.save.coins)));
        }
        return;
      }
    }
    return;
  }
  if (screen === 'settings') {
    if (inR(t, R.back)) { screen = 'menu'; return; }
    const rows = [0, 1, 2, 3];
    for (const i of rows) {
      const r = settingsRect(i);
      if (!inR(t, r)) continue;
      if (i === 0) { soundOn = !soundOn; game.save.settings.sound = soundOn; try { audio.setEnabled(soundOn); } catch (e) {} game.persist(game.save); }
      if (i === 1) { guideOn = !guideOn; game.save.settings.guide = guideOn; game.persist(game.save); }
      if (i === 2) { prefs.theme = prefs.theme === 'night' ? 'day' : 'night'; savePrefs(); }
      if (i === 3) { prefs.bgm = !prefs.bgm; savePrefs(); if (prefs.bgm) BGM.start(); else BGM.stop(); }
      return;
    }
    return;
  }
  if (screen === 'help' || screen === 'over' || screen === 'pause') {
    if (screen === 'help' && inR(t, R.back)) { screen = 'menu'; return; }
    if (screen === 'pause') {
      if (inR(t, R.resume)) { try { game.resume(); } catch (e) {} screen = 'play'; return; }
      if (inR(t, R.restart)) { try { game.resume(); } catch (e) {} screen = 'play'; try { game.restart(); } catch (e) {} return; }
      if (inR(t, R.quit)) { goHome(); return; }
    }
    if (screen === 'over') {
      const isLv = game.mode === 'level';
      const againR = isLv ? levelBtnR(0) : R.again;
      if (inR(t, againR)) return isLv ? startLevel(lastLevelIdx) : startMatch(lastMode, lastDifficulty);
      if (isLv && inR(t, levelBtnR(1))) {
        const lr = game.levelResult || {};
        if (lr.success && lastLevelIdx + 1 < LEVELS.length) return startLevel(lastLevelIdx + 1);
        say(lr.success ? '已是最后一关' : '通过本关才能进入下一关', 'foul');
        return;
      }
      if (inR(t, overHomeR())) return goHome();
    }
    return;
  }
  if (screen === 'spin') {
    // 点关闭按钮（胶囊下方）——优先判定，避免被球体/空白逻辑吞掉
    if (inR(t, spinCloseR)) { screen = 'play'; return; }
    // 点大母球白色圆盘：自由选击球点（连续坐标，红点即时跟随），并可拖动连续调整
    if ((t.clientX - BALL_CX) ** 2 + (t.clientY - BALL_CY) ** 2 <= BALL_R * BALL_R) {
      spinDragging = true; spinFree = true; setSpinFree(t.clientX, t.clientY); return;
    }
    // 点文字胶囊：吸附到预设击球点
    for (let i = 0; i < SPIN.length; i++) {
      if (inR(t, spinRect(i))) { spinX = SPIN[i][1]; spinY = SPIN[i][2]; spinFree = false; return; }
    }
    // 点底部空白关闭
    if (t.clientY > H - 70) screen = 'play';
    return;
  }
  // play
  if (inR(t, R.menuIcon)) { try { game.pause(); } catch (e) {} screen = 'pause'; return; }
  if (inR(t, R.orbIcon)) { screen = 'spin'; return; }
  if (inR(t, R.soundIcon)) { soundOn = !soundOn; game.save.settings.sound = soundOn; try { audio.setEnabled(soundOn); } catch (e) {} game.persist(game.save); return; }
  if (inR(t, R.guideIcon)) { try { guideOn = game.toggleGuide(); } catch (e) { guideOn = !guideOn; } return; }
  if (inR(t, R.angleStrip)) { angling = true; angleLastX = t.clientX; return; }
  if (inR(t, R.bar)) { powering = true; setPower(t); return; }
  const w = world(t);
  // 自由球/可再调整：按住母球抓起并拖动（用引擎的 beginCueDrag/dragCueTo/endCueDrag）
  if (game.canGrabCue && game.canGrabCue() && hitCueBall(t)) {
    if (game.beginCueDrag(w.x, w.y)) { draggingCue = true; return; }
  }
  // 首次自由球点空位：直接落位
  if (game.ballInHand) { try { game.placeCueAt(w.x, w.y); } catch (e) {} return; }
  aiming = true; game.aimAt(w.x, w.y);
});
wx.onTouchMove(e => {
  const t = e.touches[0]; if (!t) return;
  if (screen === 'levels' || screen === 'shop') {
    const max = screen === 'levels' ? Math.max(0, Math.ceil(LEVELS.length / 3) * 104 + 118 + SUB_DY - (H - 110 - SUB_DY) + 40) : Math.max(0, CUES.length * 82 + 104 + SUB_DY - (H - 110 - SUB_DY) + 40);
    listScroll = Math.max(0, Math.min(max, listScroll - (e.touches[0].clientY - (wx.__lastY || t.clientY))));
    wx.__lastY = t.clientY; return;
  }
  // 击球点页：在白盘上拖动连续选择击球点
  if (screen === 'spin') {
    if (spinDragging) setSpinFree(t.clientX, t.clientY);
    return;
  }
  wx.__lastY = t.clientY;
  if (screen !== 'play' || !t) return;
  if (powering) { setPower(t); return; }
  if (angling) {
    const dx = t.clientX - angleLastX; angleLastX = t.clientX;
    if (dx && game.fineTune) game.fineTune(dx * 0.06 * Math.PI / 180);  // 灵敏度减半，便于精细找角度
    return;
  }
  const w = world(t);
  if (draggingCue) { try { game.dragCueTo(w.x, w.y); } catch (e) {} return; }
  if (aiming) game.aimAt(w.x, w.y);
});
wx.onTouchEnd(() => {
  wx.__lastY = 0;
  if (draggingCue) { try { game.endCueDrag(); } catch (e) {} }
  if (powering && screen === 'play' && game.phase === 'aim' && !game.ballInHand) {
    try { game.shoot(power, spinX, spinY); } catch (e) {}
    // 每次击打后力度条归零，不保留上一杆力度（本次修复）
    power = 0;
  }
  aiming = false; powering = false; draggingCue = false; angling = false; spinDragging = false;
});

/* ---------------- 各屏幕绘制 ---------------- */
function drawBack(c, txt) {
  // 返回按钮与微信胶囊保持中线对齐，避免顶到屏幕边缘/被胶囊遮挡
  const r = R.back;
  ctx.fillStyle = c.gold; ctx.font = '600 16px sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('‹ ' + (txt || '返回'), r.x + 4, r.y + r.h / 2);
  ctx.textAlign = 'center';
}
// 立体黑8球（径向渐变 + 高光 + 投影 + 透视号码圈 + 皇冠）
function drawEightBall(cx, cy, r) {
  ctx.save();
  // 地面阴影
  ctx.save(); ctx.translate(cx, cy + r * 0.92); ctx.scale(1, 0.26);
  const sg = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = sg; ctx.fill(); ctx.restore();
  // 球体：多重径向渐变模拟黑球反光
  const g = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.45, r * 0.05, cx + r * 0.1, cy + r * 0.15, r * 1.15);
  g.addColorStop(0, '#6a6f78'); g.addColorStop(0.22, '#2b3038'); g.addColorStop(0.55, '#101318'); g.addColorStop(0.85, '#05070a'); g.addColorStop(1, '#000000');
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  // 边缘反光弧
  ctx.strokeStyle = 'rgba(150,170,200,0.35)'; ctx.lineWidth = r * 0.05;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.97, Math.PI * 1.05, Math.PI * 1.5); ctx.stroke();
  // 高光斑（主 + 次）
  ctx.save(); ctx.translate(cx - r * 0.34, cy - r * 0.44); ctx.rotate(-0.6);
  const h1 = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.3);
  h1.addColorStop(0, 'rgba(255,255,255,0.85)'); h1.addColorStop(0.5, 'rgba(255,255,255,0.25)'); h1.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.28, r * 0.13, 0, 0, Math.PI * 2); ctx.fillStyle = h1; ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.arc(cx + r * 0.42, cy - r * 0.5, r * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
  // 透视号码圈（略椭圆）
  ctx.save(); ctx.translate(cx + r * 0.06, cy + r * 0.06);
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.52, r * 0.50, 0, 0, Math.PI * 2);
  const wg = ctx.createRadialGradient(-r * 0.15, -r * 0.15, r * 0.05, 0, 0, r * 0.55);
  wg.addColorStop(0, '#ffffff'); wg.addColorStop(0.8, '#f0eee6'); wg.addColorStop(1, '#cfcabb');
  ctx.fillStyle = wg; ctx.fill();
  ctx.strokeStyle = 'rgba(120,110,90,0.4)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#141414'; ctx.font = '800 ' + Math.round(r * 0.78) + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('8', 0, r * 0.03);
  ctx.restore();
  // 皇冠（金色渐变多边形）
  ctx.save(); ctx.translate(cx - r * 0.05, cy - r * 0.92);
  const cg = ctx.createLinearGradient(0, -r * 0.42, 0, r * 0.15);
  cg.addColorStop(0, '#fff2a8'); cg.addColorStop(0.45, '#e8b93c'); cg.addColorStop(1, '#a9741a');
  ctx.beginPath();
  ctx.moveTo(-r * 0.52, r * 0.12); ctx.lineTo(-r * 0.58, -r * 0.32);
  ctx.lineTo(-r * 0.28, -r * 0.08); ctx.lineTo(0, -r * 0.46);
  ctx.lineTo(r * 0.3, -r * 0.08); ctx.lineTo(r * 0.58, -r * 0.32);
  ctx.lineTo(r * 0.52, r * 0.12); ctx.closePath();
  ctx.fillStyle = cg; ctx.fill();
  ctx.strokeStyle = '#8a6012'; ctx.lineWidth = 1.2; ctx.stroke();
  // 皇冠宝石
  ctx.fillStyle = '#d94f4f'; ctx.beginPath(); ctx.arc(0, -r * 0.02, r * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6fb7d8'; ctx.beginPath(); ctx.arc(-r * 0.3, r * 0.03, r * 0.045, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.3, r * 0.03, r * 0.045, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}
// 首页主视觉：立体黑8球 + 皇冠 + 两侧小球（去掉球杆，缩小尺寸给标题留空间）
function drawHero(c, cx, cy) {
  const r = Math.min(W * 0.155, 64);
  // 两侧小球（等大，纯色）
  drawBall(cx - r * 1.15, cy + r * 0.30, r * 0.38, 1);
  drawBall(cx + r * 1.15, cy + r * 0.30, r * 0.38, 3);
  drawEightBall(cx, cy, r);
}
function drawMenu(c) {
  const cx = W / 2;
  // 顶部资源条：金币/星星与右上胶囊中线对齐
  const sy = CAPSY;
  coin(30, sy, 13);
  ctx.fillStyle = c.ink; ctx.font = '600 16px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(String(game.save.coins || 0), 48, sy);
  star(112, sy, 12, true, c);
  ctx.fillText(String(game.totalStars ? game.totalStars() : 0), 130, sy);
  ctx.textAlign = 'center';
  // 标题与下方内容统一下移：以 TOPBASE（胶囊下方）为锚点，避免顶部拥挤
  const dy = MENU_DY;
  // 标题下移：缩小与上方金币行的落差，避免过于贴顶
  const titleY = H * 0.115 + dy + 30;
  ctx.fillStyle = c.gold; ctx.font = '800 40px sans-serif'; ctx.fillText('一杆入袋', cx, titleY);
  ctx.fillStyle = c.sub; ctx.font = '600 14px sans-serif'; ctx.fillText('P R O   P O O L', cx, titleY + 30);
  // 主视觉下移，拉开与 PRO POOL 的距离（皇冠不再贴副标题）
  drawHero(c, cx, H * 0.285 + dy + 30);
  // 统计文字
  const rec = game.save.record || {};
  let cleared = 0; for (const k in game.save.cleared) if (game.save.cleared[k]) cleared++;
  ctx.fillStyle = c.sub; ctx.font = '600 13px sans-serif';
  ctx.fillText('通关 ' + cleared + '/' + LEVELS.length + '  ·  ' + (rec.wins || 0) + ' 胜 ' + (rec.losses || 0) + ' 负', cx, H * 0.425 + dy);
  // 大胶囊（3 个）：文字严格居中，左侧配精致图标
  const menuIconArt = (kind, ix, iy, c) => {
    ctx.save(); ctx.translate(ix, iy);
    // 投影
    ctx.save(); ctx.translate(0, 2); ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
    // 金属圆盘：径向渐变 + 高光边
    const dg = ctx.createRadialGradient(-6, -7, 1, 0, 0, 18);
    dg.addColorStop(0, '#fff0bf'); dg.addColorStop(0.45, '#e8c478'); dg.addColorStop(1, '#9d7420');
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,190,0.7)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 15, Math.PI * 1.05, Math.PI * 1.7);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.6; ctx.stroke();
    // 图标主体：深褐立体
    ctx.fillStyle = '#4a3210';
    if (kind === 'solo') {
      ctx.beginPath(); ctx.arc(0, -4, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 9, 7.5, Math.PI, Math.PI * 2); ctx.fill();
    } else if (kind === 'pvp') {
      ctx.beginPath(); ctx.arc(-4.5, -3, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-4.5, 8, 6, Math.PI, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5.5, -3, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5.5, 8, 6, Math.PI, Math.PI * 2); ctx.fill();
    } else {
      // 奖杯：杯身（上宽下窄）+ 双耳 + 高光 + 底座 + 星
      ctx.beginPath();
      ctx.moveTo(-8, -8); ctx.lineTo(8, -8); ctx.lineTo(6.5, 2); ctx.lineTo(2.5, 5);
      ctx.lineTo(-2.5, 5); ctx.lineTo(-6.5, 2); ctx.closePath(); ctx.fill();
      // 双耳
      ctx.lineWidth = 2.4; ctx.strokeStyle = '#4a3210';
      ctx.beginPath(); ctx.arc(-9, -4, 3.6, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(9, -4, 3.6, Math.PI * 1.5, Math.PI * 0.5); ctx.stroke();
      // 杯中星光
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath(); ctx.arc(0, -3, 2.2, 0, Math.PI * 2); ctx.fill();
      // 杯柱 + 底座
      ctx.fillStyle = '#4a3210';
      ctx.fillRect(-1.6, 5, 3.2, 4);
      ctx.fillRect(-6, 9, 12, 2.6);
      ctx.fillRect(-8, 11.6, 16, 2.4);
    }
    ctx.restore();
  };
  const big = (r, label, sub2, kind) => {
    ctx.fillStyle = c.card; rr(r.x, r.y, r.w, r.h, 18); ctx.fill();
    ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.stroke();
    menuIconArt(kind, r.x + 32, r.y + r.h / 2, c);
    ctx.textAlign = 'center';
    ctx.fillStyle = c.ink; ctx.font = '600 17px sans-serif';
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 - 8);
    ctx.fillStyle = c.sub; ctx.font = '10px sans-serif';
    ctx.fillText(sub2, r.x + r.w / 2, r.y + r.h / 2 + 11);
  };
  big(R.solo, '单人挑战', '与机器人对战 · 三档难度', 'solo');
  big(R.pvp, '双人对战', '同一台设备 · 轮流上手', 'pvp');
  big(R.levels, '闯关练习', LEVELS.length + ' 关 · 赢金币解锁球杆', 'levels');
  // 小胶囊（3 个并排，总宽与大胶囊一致）
  const small = (r, label) => {
    ctx.fillStyle = c.card; rr(r.x, r.y, r.w, r.h, 14); ctx.fill();
    ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = c.ink; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
  };
  small(R.shop, '球杆商店'); small(R.settings, '设置'); small(R.help, '玩法说明');
}
function drawDifficulty(c) {
  title('选择难度', W / 2, H * 0.16 + SUB_DY, 24, c);
  ctx.fillStyle = c.sub; ctx.font = '12px sans-serif'; ctx.fillText('机器人会观察球路、计算走位', W / 2, H * 0.22 + SUB_DY);
  const opts = [ ['easy','入门','球房新手 · 偶尔打丢简单球'], ['normal','标准','职业陪练 · 稳定进球与走位'], ['hard','大师','黑八高手 · 精准计算'] ];
  for (let i = 0; i < opts.length; i++) {
    const r = diffRect(i);
    ctx.fillStyle = c.card; rr(r.x, r.y, r.w, r.h, 12); ctx.fill();
    ctx.strokeStyle = c.line; ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = c.ink; ctx.font = '600 17px sans-serif'; ctx.fillText(opts[i][1], r.x + 18, r.y + 22);
    ctx.fillStyle = c.sub; ctx.font = '11px sans-serif'; ctx.fillText(opts[i][2], r.x + 18, r.y + 42);
    ctx.textAlign = 'center';
  }
  drawBack(c);
}
function drawLevels(c) {
  title('闯关练习', W / 2, 40 + SUB_DY, 22, c);
  coin(W * 0.24, 78 + SUB_DY, 10); ctx.fillStyle = c.ink; ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(String(game.save.coins || 0), W * 0.24 + 14, 78 + SUB_DY);
  star(W * 0.60, 78 + SUB_DY, 10, true, c); ctx.fillText(String(game.totalStars ? game.totalStars() : 0), W * 0.60 + 14, 78 + SUB_DY); ctx.textAlign = 'center';
  ctx.save(); ctx.beginPath(); ctx.rect(0, 96 + SUB_DY, W, H - 110 - SUB_DY); ctx.clip();
  for (let i = 0; i < LEVELS.length; i++) {
    const r = levelRect(i), lv = LEVELS[i];
    const unlocked = i === 0 || !!game.save.cleared[LEVELS[i - 1].id];
    const stars = (game.save.stars && game.save.stars[lv.id]) || 0;
    ctx.fillStyle = unlocked ? c.card : 'rgba(120,120,120,0.18)'; rr(r.x, r.y, r.w, r.h, 10); ctx.fill();
    ctx.strokeStyle = c.line; ctx.stroke();
    ctx.fillStyle = unlocked ? c.ink : c.sub; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(String(i + 1).padStart(2, '0'), r.x + 8, r.y + 16);
    ctx.fillText(unlocked ? lv.name : '未解锁', r.x + 8, r.y + 34);
    ctx.font = '9px sans-serif'; ctx.fillStyle = c.sub; ctx.fillText(unlocked ? (lv.subtitle || '') : '通过上一关解锁', r.x + 8, r.y + 50);
    for (let s = 0; s < 3; s++) star(r.x + 16 + s * 16, r.y + r.h - 14, 6, s < stars, c);
    ctx.textAlign = 'center';
  }
  ctx.restore();
  drawBack(c);
}
function drawShop(c) {
  title('球杆商店', W / 2, 40 + SUB_DY, 22, c);
  coin(W * 0.24, 78 + SUB_DY, 10); ctx.fillStyle = c.ink; ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(String(game.save.coins || 0), W * 0.24 + 14, 78 + SUB_DY);
  star(W * 0.60, 78 + SUB_DY, 10, true, c); ctx.fillText(String(game.totalStars ? game.totalStars() : 0), W * 0.60 + 14, 78 + SUB_DY); ctx.textAlign = 'center';
  ctx.save(); ctx.beginPath(); ctx.rect(0, 96 + SUB_DY, W, H - 110 - SUB_DY); ctx.clip();
  for (let i = 0; i < CUES.length; i++) {
    const r = cueRect(i), cue = CUES[i];
    const owned = game.isCueOwned(cue.id), equipped = game.save.equipped === cue.id;
    ctx.fillStyle = equipped ? c.cardOn : c.card; rr(r.x, r.y, r.w, r.h, 10); ctx.fill();
    ctx.strokeStyle = equipped ? c.gold : c.line; ctx.lineWidth = equipped ? 2 : 1; ctx.stroke();
    drawCueArt(r.x + 62, r.y + r.h / 2, r.w * 0.26, -0.28, cue, c);
    ctx.textAlign = 'left'; ctx.fillStyle = c.ink; ctx.font = '600 14px sans-serif';
    ctx.fillText(cue.name, r.x + 116, r.y + 20);
    ctx.fillStyle = c.sub; ctx.font = '10px sans-serif'; ctx.fillText(cue.role + ' · 力' + cue.power + ' 旋' + cue.spin + ' 瞄' + cue.aim, r.x + 116, r.y + 38);
    ctx.fillStyle = c.sub; ctx.font = '9px sans-serif';
    const desc = cue.desc || ''; ctx.fillText(desc.slice(0, 18) + (desc.length > 18 ? '…' : ''), r.x + 116, r.y + 54);
    ctx.textAlign = 'right'; ctx.fillStyle = equipped ? c.gold : c.sub; ctx.font = '600 11px sans-serif';
    ctx.fillText(equipped ? '使用中' : (owned ? '点击装备' : (cue.starsRequired ? cue.starsRequired + '★' : '') + cue.price), r.x + r.w - 10, r.y + r.h / 2);
    ctx.textAlign = 'center';
  }
  ctx.restore();
  drawBack(c);
}
function drawSettings(c) {
  title('设置', W / 2, H * 0.16 + SUB_DY, 24, c);
  const rows = [
    ['音效', soundOn ? '开' : '关'],
    ['辅助线', guideOn ? '开' : '关'],
    ['显示模式', prefs.theme === 'night' ? '夜间' : '白天'],
    ['背景音乐', prefs.bgm ? '开' : '关']
  ];
  for (let i = 0; i < rows.length; i++) {
    const r = settingsRect(i);
    ctx.fillStyle = c.card; rr(r.x, r.y, r.w, r.h, 12); ctx.fill(); ctx.strokeStyle = c.line; ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = c.ink; ctx.font = '600 16px sans-serif'; ctx.fillText(rows[i][0], r.x + 16, r.y + 30);
    ctx.textAlign = 'right'; ctx.fillStyle = c.gold; ctx.font = '600 14px sans-serif'; ctx.fillText(rows[i][1] + '  ›', r.x + r.w - 16, r.y + 30);
    ctx.textAlign = 'center';
  }
  drawBack(c);
}
const HELP_SECTIONS = [
  { t: '三种玩法', items: [
    ['单人挑战', '和电脑对打，入门 / 标准 / 大师三档难度'],
    ['双人对战', '同一台手机，两人轮流上手'],
    ['闯关练习', '12 关布局挑战，赢金币和星星']
  ]},
  { t: '怎么打球', items: [
    ['瞄准', '在球台上拖动手指，瞄准线指向目标球'],
    ['微调', '底部金色标尺左右拖动，精细调整角度'],
    ['出杆', '右侧力度条往下拉蓄力，松手自动击球'],
    ['击球点', '点右侧白球图标，选高杆 / 低杆 / 左右塞']
  ]},
  { t: '赢球与奖励', items: [
    ['胜负', '打进本方 7 颗球后，再进黑八即获胜'],
    ['奖励', '赢球得金币和星星，可去商店解锁 9 支球杆'],
    ['球杆', '力量、旋转、辅助线长度各支不同']
  ]}
];
function drawHelp(c) {
  const helpDy = SUB_DY + 22;                 // 整体再下移
  title('玩法说明', W / 2, 36 + helpDy, 22, c);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  let y = 78 + helpDy;
  for (const sec of HELP_SECTIONS) {
    // 分节标题：金色竖条 + 标题
    ctx.fillStyle = c.gold; rr(18, y - 9, 4, 18, 2); ctx.fill();
    ctx.fillStyle = c.ink; ctx.font = '700 15px sans-serif';
    ctx.fillText(sec.t, 30, y); y += 28;
    for (const it of sec.items) {
      ctx.fillStyle = c.gold; ctx.font = '600 12px sans-serif';
      ctx.fillText(it[0], 34, y);
      ctx.fillStyle = c.sub; ctx.font = '11px sans-serif';
      ctx.fillText('— ' + it[1], 90, y);
      y += 27;                                 // 条目间距略增
    }
    y += 22;                                   // 三大块之间间距拉大
  }
  ctx.textAlign = 'center'; drawBack(c);
}

/* ---------------- 对局内绘制 ---------------- */
let playerAvatarImg = null, playerAvatarTried = false;
function loadPlayerAvatar() {
  if (playerAvatarTried) return; playerAvatarTried = true;
  try { if (wx.getUserInfo) wx.getUserInfo({ success(res) {
    const url = res && res.userInfo && (res.userInfo.avatarUrl || res.userInfo.avatar);
    if (url) { const im = wx.createImage(); im.onload = () => { playerAvatarImg = im; }; im.src = url; }
  }, fail() {} }); } catch (e) {}
}
function drawAvatar(cx, cy, r, isAI, active, img, c, variant) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = active ? c.gold : 'rgba(245,242,232,0.28)'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = '#2a2f2c'; ctx.fill();
  if (variant === 0 || variant === 1) {
    // 双人对战：两个明显不同的角色头像（玩家1 金发暖色 / 玩家2 蓝发冷色），中间标数字
    const p1 = variant === 0;
    const hair = p1 ? '#e8b93c' : '#5aa6d8';
    const skin = p1 ? '#f0c9a0' : '#e6b58e';
    const shirt = p1 ? '#c0562f' : '#356b9c';
    ctx.fillStyle = shirt;
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.62, r * 0.62, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.1, r * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hair;
    if (p1) {
      // 玩家1：短发 + 微笑
      ctx.beginPath(); ctx.arc(cx, cy - r * 0.24, r * 0.44, Math.PI, Math.PI * 2); ctx.fill();
    } else {
      // 玩家2：戴帽檐（更明显的区分）
      ctx.beginPath(); ctx.arc(cx, cy - r * 0.2, r * 0.45, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillRect(cx - r * 0.55, cy - r * 0.24, r * 1.1, r * 0.16);
    }
    ctx.fillStyle = '#2a2018';
    ctx.beginPath(); ctx.arc(cx - r * 0.15, cy - r * 0.08, r * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.15, cy - r * 0.08, r * 0.06, 0, Math.PI * 2); ctx.fill();
    // 角色数字标记，右下角小圆
    ctx.fillStyle = p1 ? '#e8b93c' : '#5aa6d8';
    ctx.beginPath(); ctx.arc(cx + r * 0.62, cy + r * 0.62, r * 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#101418'; ctx.font = '700 ' + Math.round(r * 0.42) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(p1 ? 1 : 2), cx + r * 0.62, cy + r * 0.64);
  } else if (!isAI && img) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    try { ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2); } catch (e) {}
    ctx.restore();
  } else if (isAI) {
    ctx.fillStyle = '#c98a7a'; ctx.fillRect(cx - r * 0.5, cy - r * 0.45, r, r * 0.8);
    ctx.strokeStyle = '#c98a7a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.45); ctx.lineTo(cx, cy - r * 0.72); ctx.stroke();
    ctx.fillStyle = '#f5f2e8';
    ctx.beginPath(); ctx.arc(cx - r * 0.22, cy - r * 0.08, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.22, cy - r * 0.08, r * 0.1, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#e8cd8e';
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.22, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.5, r * 0.46, Math.PI, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
// 玩家本方球号：按 group 取 1-7（全色）或 9-15（花色），未定组默认全色
function playerNums(idx) {
  const p = game.players && game.players[idx];
  // 你=全色小号 1-7；AI=花色大号 9-15。分组确定后以实际 group 为准。
  let stripe = idx === 1;
  if (p && p.group === 'stripe') stripe = true;
  else if (p && p.group === 'solid') stripe = false;
  return stripe ? [9, 10, 11, 12, 13, 14, 15] : [1, 2, 3, 4, 5, 6, 7];
}
function isPotted(n) {
  const b = game.world && game.world.getBall ? game.world.getBall(n) : null;
  return !b || b.active === false;
}
function drawVersusBar(c) {
  const st = game.getState ? game.getState() : null;
  const active = st ? st.activePlayer : game.activePlayer;
  loadPlayerAvatar();
  const barX = 8, barY = Math.max(2, PLAY_TOP - 46), barW = (W - CTRL_W) - 16, barH = 42;
  panel(barX, barY, barW, barH, c);
  const cy = barY + barH / 2;
  const isLevel = game.mode === 'level';
  const midX = barX + barW / 2;
  if (isLevel) {
    // 关卡模式：显示目标与剩余
    ctx.fillStyle = c.gold; ctx.font = '700 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('关卡挑战', midX, cy - 8);
    ctx.fillStyle = c.ink; ctx.font = '11px sans-serif';
    ctx.fillText('目标 ' + (game.level ? game.level.name : '') + ' · 剩 ' + (game.remainingFor ? game.remainingFor(game.players[0], 0) : 0) + ' 颗', midX, cy + 9);
    ctx.restore && 0;
    return;
  }
  // 对局条布局（左→右）：球号(大→小) · 头像1 | VS | 头像2 · 球号(小→大)
  // 头像紧挨 VS 左右两侧，球号隔开一小段距离放到外侧，且靠近头像的是小号。
  const avR = 10, ballR = 6.5, gap = 14;
  const VS_HALF = 15, AV_GAP = 12;            // VS 半宽 / 头像与 VS 的间距（加大）
  const ax = midX - VS_HALF - AV_GAP - avR;   // 玩家1 头像（VS 左侧）
  const bx = midX + VS_HALF + AV_GAP + avR;   // 玩家2 头像（VS 右侧）
  const BALL_GAP = avR + 14;                  // 球号与头像间距（缩小，头像外移后球位置不变）
  const isPvp = game.mode === 'pvp';
  if (isPvp) {
    // 双人对战：两个不同角色头像「1」和「2」，不用机器人头像/微信头像
    drawAvatar(ax, cy, avR, false, active === 0, null, c, 0);
    drawAvatar(bx, cy, avR, false, active === 1, null, c, 1);
  } else {
    drawAvatar(ax, cy, avR, false, active === 0, playerAvatarImg, c);
    drawAvatar(bx, cy, avR, true, active === 1, null, c);
  }
  for (let side = 0; side < 2; side++) {
    const nums = playerNums(side);
    for (let i = 0; i < nums.length; i++) {
      const n = nums[i];
      // i=0 是小号（1 / 9），放在靠头像最近处，向外依次递增
      const x = side === 0 ? (ax - BALL_GAP - i * gap) : (bx + BALL_GAP + i * gap);
      if (isPotted(n)) {
        ctx.beginPath(); ctx.arc(x, cy, ballR * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.stroke();
      } else drawBall(x, cy, ballR, n);
    }
  }
  // VS 小底板：只占中间空档，不覆盖任何球
  ctx.fillStyle = c.panel; rr(midX - 15, cy - 14, 30, 28, 7); ctx.fill();
  ctx.fillStyle = c.gold; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('VS', midX, cy - 7);
  ctx.fillStyle = c.ink; ctx.font = '9px sans-serif';
  const turnTxt = isPvp ? (active === 0 ? '玩家1 回合' : '玩家2 回合') : (active === 0 ? '你的回合' : 'AI 回合');
  ctx.fillText(game.phase === 'shooting' ? '运行中' : turnTxt, midX, cy + 8);
}
// 当前装备球杆的光谱色（力度渐变用）：取球杆 colors.accent / tip，无则用金色
function cueSpectrum() {
  try {
    const eq = game.save && game.save.equipped;
    const def = CUES && CUES.find(x => x.id === eq);
    const col = def && def.colors;
    if (col && col.accent) {
      return { hi: col.accent, mid: col.tip || '#e8c478', lo: col.butt || '#6b3a22' };
    }
  } catch (e) {}
  return { hi: '#fff0a8', mid: '#e8c478', lo: '#a8781b' };
}
// 对称条框：左右完全对称、颜色均匀（不做左亮右暗的伪 3D，避免出现不对称）
function draw3DFrame(x, y, w, h, c) {
  const rad = Math.min(10, w / 2);
  // 外框：左右对称渐变——中间略亮、两侧同色变暗，肉眼左右一致
  const of = ctx.createLinearGradient(x, 0, x + w, 0);
  of.addColorStop(0, '#2e2c25'); of.addColorStop(0.5, '#433f33'); of.addColorStop(1, '#2e2c25');
  ctx.fillStyle = of; rr(x, y, w, h, rad); ctx.fill();
  // 一圈均匀描边（四边同色，不区分高光/暗边）
  ctx.strokeStyle = 'rgba(232,196,120,0.42)'; ctx.lineWidth = 1.2;
  rr(x, y, w, h, rad); ctx.stroke();
  // 内槽：纯深色填充，左右对称
  const pad = Math.max(2, w * 0.14);
  ctx.fillStyle = '#080c09'; rr(x + pad, y + 3, w - pad * 2, h - 6, Math.min(6, (w - pad * 2) / 2)); ctx.fill();
  return { ix: x + pad, iy: y + 3, iw: w - pad * 2, ih: h - 6 };
}

function drawPlay(c) {
  const safeTop = Math.min(window.__MG_SAFE_TOP || 0, H * 0.12);
  drawVersusBar(c);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const oi = R.orbIcon, si = R.soundIcon, gi = R.guideIcon, mi = R.menuIcon;
  const iconBase = prefs.theme === 'day' ? 'rgba(245,241,230,0.9)' : 'rgba(10,14,11,0.82)';
  const iconEdge = 'rgba(232,196,120,0.42)';
  circleIcon(oi, iconBase, iconEdge);
  const ocx = oi.x + oi.w / 2, ocy = oi.y + oi.h / 2, orb = oi.w * 0.26;
  ctx.beginPath(); ctx.arc(ocx, ocy, orb, 0, Math.PI * 2); ctx.fillStyle = '#f2eee2'; ctx.fill();
  ctx.beginPath(); ctx.arc(ocx + spinX * orb * 0.7, ocy - spinY * orb * 0.7, Math.max(2, orb * 0.28), 0, Math.PI * 2);
  ctx.fillStyle = '#c0392b'; ctx.fill();
  circleIcon(si, iconBase, 'rgba(245,242,232,0.28)');
  ctx.fillStyle = c.ink; ctx.font = '600 17px sans-serif'; ctx.fillText(soundOn ? '♪' : '×', si.x + si.w / 2, si.y + si.h / 2);
  circleIcon(gi, iconBase, guideOn ? iconEdge : 'rgba(245,242,232,0.28)');
  ctx.save(); ctx.strokeStyle = guideOn ? c.gold : c.sub; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(gi.x + 9, gi.y + gi.h - 10); ctx.lineTo(gi.x + gi.w - 9, gi.y + 11); ctx.stroke(); ctx.restore();
  circleIcon(mi, iconBase, 'rgba(245,242,232,0.28)');
  ctx.fillStyle = c.ink; ctx.font = '600 16px sans-serif'; ctx.fillText('☰', mi.x + mi.w / 2, mi.y + mi.h / 2 + 1);
  // 力度条：对称条框 + 随球杆变化的渐变光带。
  // 方向（重要）：手往下拉 = 力度增大 = 光带自顶部向下延伸（自上而下走）。
  const b = R.bar;
  const slot = draw3DFrame(b.x, b.y, b.w, b.h, c);
  const fh = slot.ih * power;
  if (fh > 0.5) {
    const sp = cueSpectrum();
    // 渐变沿填充方向：顶部=球杆亮色，向下过渡到暗色，形成光谱
    const g = ctx.createLinearGradient(0, slot.iy, 0, slot.iy + slot.ih);
    g.addColorStop(0, sp.hi); g.addColorStop(0.5, sp.mid); g.addColorStop(1, sp.lo);
    ctx.save(); rr(slot.ix, slot.iy, slot.iw, slot.ih, Math.min(6, slot.iw / 2)); ctx.clip();
    ctx.fillStyle = g; ctx.fillRect(slot.ix, slot.iy, slot.iw, fh);
    // 光带前沿（底部）高亮线：标示当前力度位置
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(slot.ix, slot.iy + fh - 2, slot.iw, 2);
    ctx.restore();
  }
  // 顶部百分比胶囊：也做成小立体块
  ctx.fillStyle = iconBase; rr(b.x - 12, b.y - 2, b.w + 24, 22, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(232,196,120,0.4)'; ctx.lineWidth = 1; rr(b.x - 12, b.y - 2, b.w + 24, 22, 6); ctx.stroke();
  ctx.fillStyle = powering ? c.gold : c.ink; ctx.font = (powering ? '700 14px' : '600 12px') + ' sans-serif';
  ctx.fillText(Math.round(power * 100) + '%', b.x + b.w / 2, b.y + 9);
  // 角度标尺：3D 立体横条
  const s = R.angleStrip;
  draw3DFrame(s.x, s.y + 4, s.w, 30, c);
  // 刻度（凹槽内）
  ctx.strokeStyle = 'rgba(232,196,120,0.5)'; ctx.lineWidth = 1;
  for (let i = -6; i <= 6; i++) {
    const gx = s.x + s.w / 2 + i * (s.w / 14);
    ctx.beginPath(); ctx.moveTo(gx, s.y + 12); ctx.lineTo(gx, s.y + (i === 0 ? 32 : 24)); ctx.stroke();
  }
  // 中央指针：立体金色滑块
  const cg = ctx.createLinearGradient(0, s.y + 4, 0, s.y + 34);
  cg.addColorStop(0, '#fff0a8'); cg.addColorStop(1, '#a8781b');
  ctx.fillStyle = cg; rr(s.x + s.w / 2 - 3, s.y + 6, 6, 28, 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(s.x + s.w / 2 - 2, s.y + 8); ctx.lineTo(s.x + s.w / 2 - 2, s.y + 32); ctx.stroke();
}
const SPIN_DESC = {
  '高杆左塞': '打母球左上：强烈前旋带左塞，撞球后快速跟进，碰库后向左折线，适合走位绕球。',
  '高杆': '打母球上方：强烈前旋（跟随球），撞击目标后母球继续向前推进，适合连续进攻。',
  '高杆右塞': '打母球右上：强烈前旋带右塞，撞球后跟进，碰库后向右折线改变走位方向。',
  '左塞': '打母球左侧：加左旋，母球碰库后向左反弹偏转，常用于绕开障碍或走位到左侧。',
  '中杆': '打母球正中：定杆，撞击目标球后母球基本停在原地，最适合角度小的直线球。',
  '右塞': '打母球右侧：加右旋，母球碰库后向右反弹偏转，用于控制靠库后的落点。',
  '低杆左塞': '打母球左下：缩杆带左塞，撞球后母球向后退回并带左旋，可拉回并改变线路。',
  '低杆': '打母球下方：缩杆（后旋球），撞击目标后母球向后退回，拉开距离防贴库。',
  '低杆右塞': '打母球右下：缩杆带右塞，撞球后向后退回并带右旋，兼顾退位与转向。',
  '中高杆': '打母球中上：轻微前旋，撞击后小幅向前跟进，力度温和容易控制。',
  '中低杆': '打母球中下：轻微后旋，撞击后小幅向后退回，适合需要一点点退位的球。'
};
function drawSpin(c) {
  ctx.fillStyle = c.mask; ctx.fillRect(0, 0, W, H);
  // 标题下移到胶囊下方，不与胶囊同高
  const tY = TOPBASE + 6;
  title('击球点', W / 2, tY, 20, c);
  ctx.fillStyle = c.sub; ctx.font = '12px sans-serif';
  ctx.fillText('点上方球体或下方选项选择击球点', W / 2, tY + 26);
  // 关闭按钮移到微信胶囊正下方并留一段距离，避免误触小程序自带的关闭
  ctx.fillStyle = c.card; rr(spinCloseR.x, spinCloseR.y, spinCloseR.w, spinCloseR.h, 14); ctx.fill();
  ctx.strokeStyle = c.line; ctx.lineWidth = 1; rr(spinCloseR.x, spinCloseR.y, spinCloseR.w, spinCloseR.h, 14); ctx.stroke();
  ctx.fillStyle = c.sub; ctx.font = '600 15px sans-serif';
  ctx.fillText('×', spinCloseR.x + spinCloseR.w / 2, spinCloseR.y + spinCloseR.h / 2);
  // 大母球：立体渐变 + 十字 + 参考圈
  ctx.save();
  const g = ctx.createRadialGradient(BALL_CX - BALL_R * 0.35, BALL_CY - BALL_R * 0.4, BALL_R * 0.05, BALL_CX, BALL_CY, BALL_R);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#f0ece0'); g.addColorStop(1, '#b8b2a4');
  ctx.beginPath(); ctx.arc(BALL_CX, BALL_CY, BALL_R, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(90,80,60,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.save(); ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.arc(BALL_CX, BALL_CY, BALL_R * 0.72, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(BALL_CX - BALL_R * 0.72, BALL_CY); ctx.lineTo(BALL_CX + BALL_R * 0.72, BALL_CY);
  ctx.moveTo(BALL_CX, BALL_CY - BALL_R * 0.72); ctx.lineTo(BALL_CX, BALL_CY + BALL_R * 0.72); ctx.stroke();
  ctx.restore();
  // 击球红点（随选择移动）
  const rx = BALL_CX + spinX * BALL_R * 0.72, ry = BALL_CY - spinY * BALL_R * 0.72;
  const rg = ctx.createRadialGradient(rx - 2, ry - 2, 1, rx, ry, BALL_R * 0.13);
  rg.addColorStop(0, '#ff8a7a'); rg.addColorStop(1, '#a52a1e');
  ctx.beginPath(); ctx.arc(rx, ry, BALL_R * 0.13, 0, Math.PI * 2); ctx.fillStyle = rg; ctx.fill();
  ctx.restore();
  // 上下标注
  ctx.fillStyle = c.sub; ctx.font = '11px sans-serif';
  ctx.fillText('低杆', BALL_CX - BALL_R - 18, BALL_CY + BALL_R * 0.72);
  ctx.fillText('高杆', BALL_CX - BALL_R - 18, BALL_CY - BALL_R * 0.72);
  // 11 胶囊（预设快捷项）：自由点选时不高亮任何一个
  let curName = spinFree ? '自定义击球点' : '中杆';
  for (let i = 0; i < SPIN.length; i++) {
    const r = spinRect(i), on = !spinFree && Math.abs(spinX - SPIN[i][1]) < 1e-6 && Math.abs(spinY - SPIN[i][2]) < 1e-6;
    ctx.fillStyle = on ? c.cardOn : c.card; rr(r.x, r.y, r.w, r.h, 12); ctx.fill();
    ctx.strokeStyle = on ? c.gold : c.line; ctx.lineWidth = on ? 2 : 1; ctx.stroke();
    ctx.fillStyle = on ? '#201a10' : c.ink; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(SPIN[i][0], r.x + r.w / 2, r.y + r.h / 2);
    if (on) curName = SPIN[i][0];
  }
  // 说明卡片：紧贴胶囊下方，带边框，字号加大，长文字自动换行，避免遮挡
  const lastRect = spinRect(SPIN.length - 1);
  const cardY = lastRect.y + lastRect.h + 12, cardH = 88;
  ctx.fillStyle = c.card; rr(14, cardY, W - 28, cardH, 12); ctx.fill();
  ctx.strokeStyle = c.line; ctx.lineWidth = 1; rr(14, cardY, W - 28, cardH, 12); ctx.stroke();
  ctx.fillStyle = c.gold; ctx.font = '700 16px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(curName, 28, cardY + 22);
  // 描述按宽度折行（最多 3 行）
  ctx.fillStyle = c.ink; ctx.font = '12px sans-serif';
  const desc = spinFree
    ? '自由选点：白点越靠上前旋越强（跟进），越靠下后旋越强（缩杆），越靠侧边侧旋越强（改变碰库走向）。点下方 11 个预设可快速选定。'
    : (SPIN_DESC[curName] || '');
  const maxW = W - 56;
  let line = '', ly = cardY + 44, lines = 0;
  for (const ch of desc) {
    if (ctx.measureText(line + ch).width > maxW) {
      ctx.fillText(line, 28, ly); line = ch; ly += 18; lines++;
      if (lines >= 2) break;
    } else line += ch;
  }
  if (line && lines < 3) ctx.fillText(line, 28, ly);
  ctx.textAlign = 'center';
}
function drawPause(c) {
  ctx.fillStyle = 'rgba(4,8,5,0.78)'; ctx.fillRect(0, 0, W, H);
  title('已暂停', W / 2, H * 0.30, 28, c);
  ctx.fillStyle = c.sub; ctx.font = '12px sans-serif'; ctx.fillText('休息一下，随时继续', W / 2, H * 0.30 + 30);
  btn(R.resume, '继续游戏', prefs.theme === 'day' ? '#2f8f57' : '#2ea44f', '#fff');
  btn(R.restart, '重新开始本局', c.card, c.ink);
  btn(R.quit, '退出到主菜单', c.card, c.sub);
}
function drawOver(c) {
  ctx.fillStyle = c.mask; ctx.fillRect(0, 0, W, H);
  const cx = W / 2;
  const isLv = game.mode === 'level';
  const green = prefs.theme === 'day' ? '#2f8f57' : '#2ea44f';
  if (isLv) {
    const lr = game.levelResult || {};
    const win = !!lr.success;
    const stars = lr.stars || 0;
    title(win ? '闯关成功' : '挑战失败', cx, H * 0.20, 28, c, win ? c.gold : c.sub);
    ctx.fillStyle = c.sub; ctx.font = '12px sans-serif';
    ctx.fillText((lr.levelName || '') + '  ·  ' + (lr.shots || 0) + ' 杆 / 标准 ' + (lr.par || 0) + ' 杆', cx, H * 0.20 + 30);
    // 三颗星：获得的高亮，未获得的暗
    for (let i = 0; i < 3; i++) star(cx + (i - 1) * 54, H * 0.32, 22, i < stars, c);
    // 奖励区
    ctx.fillStyle = c.card; rr(W * 0.18, H * 0.40, W * 0.64, 54, 12); ctx.fill();
    ctx.strokeStyle = c.line; ctx.stroke();
    const d = lr.coinsDelta || 0;
    coin(W * 0.30, H * 0.40 + 27, 11);
    ctx.fillStyle = d >= 0 ? green : '#d4675a'; ctx.font = '700 16px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText((d >= 0 ? '+' : '') + d, W * 0.30 + 18, H * 0.40 + 27);
    star(W * 0.58, H * 0.40 + 27, 10, stars > 0, c);
    ctx.fillStyle = stars > 0 ? c.gold : c.sub;
    ctx.fillText('+' + stars, W * 0.58 + 16, H * 0.40 + 27);
    ctx.textAlign = 'center';
    if (lr.cueReward) { ctx.fillStyle = c.gold; ctx.font = '11px sans-serif'; ctx.fillText('额外奖励球杆：' + lr.cueReward.name, cx, H * 0.40 + 70); }
    // 三个按钮：关卡专用位置，避开上方的奖励卡片
    btn(levelBtnR(0), '重复本关', c.card, c.ink);
    btn(levelBtnR(1), win && lastLevelIdx + 1 < LEVELS.length ? '下一关' : '关卡已完成', green, '#fff', 15);
    btn(levelBtnR(2), '返回主菜单', c.card, c.sub);
  } else {
    const res = game._lastResult || {};
    const isPvp = game.mode === 'pvp';
    // winner=0 玩家赢、winner=1 AI 赢；pvp 显示胜者名，不写死"你赢"
    const win = isPvp ? true : (typeof res.winner === 'number' ? res.winner === 0 : true);
    const head = isPvp ? ((res.winnerName || '玩家') + ' 获胜') : (win ? '你赢下了这局' : '惜败一局');
    const headY = H * 0.32;
    title(head, cx, headY, 27, c, (win || isPvp) ? c.gold : c.sub);
    ctx.fillStyle = c.sub; ctx.font = '13px sans-serif';
    const d = typeof res.coinsDelta === 'number' ? res.coinsDelta : 0;
    const coinTxt = d > 0 ? ('金币 +' + d) : (d < 0 ? ('金币 ' + d) : '本局无金币变化');
    ctx.fillText(coinTxt, cx, headY + 34);
    btn(R.again, '再来一局', green, '#fff');
    btn(overHomeR(), '返回主菜单', c.card, c.ink);
  }
}
function circleIcon(r, fill, stroke) {
  ctx.save(); ctx.beginPath(); ctx.arc(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  ctx.restore();
}
function overlay(alpha) { ctx.save(); ctx.fillStyle = 'rgba(6,9,7,' + alpha + ')'; ctx.fillRect(0, 0, W, H); ctx.restore(); }

function drawUI() {
  const UI_DPR = (renderer.dpr || 1);
  ctx.setTransform(UI_DPR, 0, 0, UI_DPR, 0, 0);
  const c = T();
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (screen === 'menu') drawMenu(c);
  else if (screen === 'difficulty') drawDifficulty(c);
  else if (screen === 'levels') drawLevels(c);
  else if (screen === 'shop') drawShop(c);
  else if (screen === 'settings') drawSettings(c);
  else if (screen === 'help') drawHelp(c);
  else if (screen === 'play') drawPlay(c);
  else if (screen === 'spin') drawSpin(c);
  else if (screen === 'pause') { ctx.save(); ctx.setTransform(UI_DPR, 0, 0, UI_DPR, 0, 0); ctx.restore(); drawPause(c); }
  else if (screen === 'over') drawOver(c);
  // toast
  if (toast && Date.now() < toast.until) {
    ctx.fillStyle = 'rgba(6,10,8,0.9)'; rr(W / 2 - 110, H * 0.12, 220, 36, 10); ctx.fill();
    ctx.fillStyle = toast.type === 'foul' ? '#e07a6a' : '#e8c478'; ctx.font = '600 13px sans-serif';
    ctx.fillText(toast.text, W / 2, H * 0.12 + 18);
  } else toast = null;
  ctx.restore();
}
/* ---------------- 生命周期：切后台自动暂停 ---------------- */
let last = Date.now();
// 游戏中把小游戏滑到后台时自动暂停；回到前台仍停在暂停页，
// 需玩家主动点「继续游戏」才回到对局，避免回来就继续跑导致漏回合。
try {
  wx.onHide && wx.onHide(function () {
    if (screen === 'play') {
      try { game.pause(); } catch (e) {}
      screen = 'pause';
    }
  });
  wx.onShow && wx.onShow(function () {
    // 回到前台保持暂停页不动（不自动恢复），等待玩家点继续/返回
    last = Date.now();
  });
} catch (e) {}

/* ---------------- 主循环 ---------------- */
function loop() {
  // 无论本帧发生什么，都必须把下一帧排上。否则任何一次绘制/物理异常都会让
  // requestAnimationFrame 链条断掉，画面永久定格在最后一帧——玩家看到的就是
  // 「卡在此页面，无法进行下一步」，而且没有任何报错提示。
  try {
    const now = Date.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (screen === 'play' || screen === 'spin') {
      try { game.update(dt); } catch (e) {}
      if (game.phase === 'over' && screen === 'play') {
        // 关键：存引擎的 matchResult（含 winner/coinsDelta），不能用 getState()——
        // getState() 没有 winner 字段，会导致 AI 赢也显示"你赢"、金币 +0
        try { game._lastResult = game.matchResult || game.getState().matchResult || null; } catch (e) {}
        screen = 'over';
      }
      renderer.render(game.getRenderState(), dt);
    } else if (screen === 'pause' || screen === 'over') {
      renderer.render(game.getRenderState(), 0);
    } else {
      const d = (renderer.dpr || 1);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.fillStyle = T().bg; ctx.fillRect(0, 0, W, H);
    }
    drawUI();
  } catch (e) {
    // 吞掉异常以保证主循环存活；同时把首错记下来，便于真机反馈定位
    if (!window.__MG_LOOP_ERR) window.__MG_LOOP_ERR = (e && (e.message || String(e))) || 'unknown';
  }
  window.requestAnimationFrame(loop);
}
loop();
