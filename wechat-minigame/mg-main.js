/* 即刻开球 PRO POOL · 微信小游戏主程序（canvas UI，复用核心物理/AI/规则/渲染） */
require('./adapter.js');
require('./core.js');
const P = window.Pool;
const sys = window.__MG_SYS;
const canvas = window.__MG_CANVAS;
const W = sys.screenWidth, H = sys.screenHeight;
const renderer = new P.Renderer(canvas);
const audio = new P.Audio();
const SAVE_KEY = 'propool_save_v1';
function loadSave() {
  try { const s = wx.getStorageSync(SAVE_KEY); if (s) return JSON.parse(s); } catch (e) {}
  return { version: 1, coins: 0, stars: {}, cleared: {}, ownedCues: ['oak'], equipped: 'oak', settings: { guide: true, sound: true }, record: { wins: 0, losses: 0, matches: 0 } };
}
const game = new P.Game({ save: loadSave(), persist: s => { try { wx.setStorageSync(SAVE_KEY, JSON.stringify(s)); } catch (e) {} }, audio, renderer });
renderer.resize();
const ctx = renderer.ctx;
const SPIN = [
  ['高杆左塞', -0.5, 0.5], ['高杆', 0, 0.7], ['高杆右塞', 0.5, 0.5],
  ['左塞', -0.7, 0], ['中杆', 0, 0], ['右塞', 0.7, 0],
  ['低杆左塞', -0.5, -0.5], ['低杆', 0, -0.7], ['低杆右塞', 0.5, -0.5],
  ['中高杆', 0, 0.35], ['中低杆', 0, -0.35]
];
let screen = 'privacy';           // privacy | menu | play | spin | over
let power = 0.6, spinX = 0, spinY = 0;
let aiming = false, powering = false, draggingCue = false;
let agree = false;
try { agree = wx.getStorageSync('pp_privacy') === '1'; } catch (e) {}
if (agree) screen = 'menu';
// 分享
try { wx.showShareMenu({ withShareTicket: true }); wx.onShareAppMessage(() => ({ title: '即刻开球 PRO POOL · 真实物理台球，免费即玩' })); } catch (e) {}
// UI 矩形
const R = {
  solo: { x: W * 0.16, y: H * 0.40, w: W * 0.68, h: 52 },
  pvp: { x: W * 0.16, y: H * 0.40 + 68, w: W * 0.68, h: 52 },
  agree: { x: W * 0.2, y: H * 0.62, w: W * 0.6, h: 48 },
  shoot: { x: W * 0.30, y: H - 74, w: W * 0.40, h: 48 },
  menu: { x: 12, y: H - 74, w: 64, h: 48 },
  orb: { x: W - 70, y: H - 74, w: 58, h: 48 },
  bar: { x: W - 40, y: H * 0.28, w: 26, h: H * 0.40 },
  again: { x: W * 0.2, y: H * 0.55, w: W * 0.6, h: 48 },
  back: { x: W * 0.2, y: H * 0.55 + 62, w: W * 0.6, h: 48 }
};
const inR = (t, r) => t.clientX >= r.x && t.clientX <= r.x + r.w && t.clientY >= r.y && t.clientY <= r.y + r.h;
function world(t) { return renderer.screenToWorld(t.clientX, t.clientY); }
function start(mode) { game.startMatch(mode, 'normal'); screen = 'play'; power = 0.6; try { audio.unlock(); } catch (e) {} }
wx.onTouchStart(e => {
  const t = e.touches[0]; if (!t) return;
  try { audio.unlock(); } catch (err) {}
  if (screen === 'privacy') { if (inR(t, R.agree)) { agree = true; try { wx.setStorageSync('pp_privacy', '1'); } catch (err) {} screen = 'menu'; } return; }
  if (screen === 'menu') { if (inR(t, R.solo)) start('ai'); else if (inR(t, R.pvp)) start('pvp'); return; }
  if (screen === 'over') { if (inR(t, R.again)) start(game.mode || 'pvp'); else if (inR(t, R.back)) screen = 'menu'; return; }
  if (screen === 'spin') {
    // 3 列网格
    const gx = W * 0.10, gy = H * 0.30, cw = W * 0.80 / 3, ch = 44;
    for (let i = 0; i < SPIN.length; i++) {
      const r = { x: gx + (i % 3) * cw, y: gy + Math.floor(i / 3) * ch, w: cw - 4, h: ch - 4 };
      if (inR(t, r)) { spinX = SPIN[i][1]; spinY = SPIN[i][2]; screen = 'play'; return; }
    }
    screen = 'play'; return;
  }
  // play
  if (inR(t, R.shoot)) { if (game.phase === 'aim' && !game.ballInHand) game.shoot(power, spinX, spinY); return; }
  if (inR(t, R.menu)) { screen = 'menu'; return; }
  if (inR(t, R.orb)) { screen = 'spin'; return; }
  if (inR(t, R.bar)) { powering = true; setPower(t); return; }
  const w = world(t);
  if (game.ballInHand) { draggingCue = true; game.placeCueAt(w.x, w.y); return; }
  aiming = true; game.aimAt(w.x, w.y);
});
function setPower(t) { const r = R.bar; power = Math.max(0.05, Math.min(1, (t.clientY - r.y) / r.h)); }
wx.onTouchMove(e => {
  const t = e.touches[0]; if (!t || screen !== 'play') return;
  if (powering) { setPower(t); return; }
  const w = world(t);
  if (draggingCue) { game.placeCueAt(w.x, w.y); return; }
  if (aiming) game.aimAt(w.x, w.y);
});
wx.onTouchEnd(() => { aiming = false; powering = false; draggingCue = false; });
// 绘制 UI
function btn(r, label, fill, fg) {
  ctx.save();
  ctx.fillStyle = fill; ctx.beginPath();
  const rad = 12; ctx.moveTo(r.x + rad, r.y); ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rad); ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rad); ctx.arcTo(r.x, r.y + r.h, r.x, r.y, rad); ctx.arcTo(r.x, r.y, r.x + r.w, r.y, rad); ctx.fill();
  ctx.fillStyle = fg; ctx.font = '600 17px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2); ctx.restore();
}
function overlay(alpha) { ctx.save(); ctx.fillStyle = 'rgba(6,9,7,' + alpha + ')'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
function drawUI() {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (screen === 'privacy') {
    overlay(0.92);
    ctx.fillStyle = '#f5f2e8'; ctx.font = '700 24px sans-serif'; ctx.fillText('隐私保护提示', W / 2, H * 0.30);
    ctx.font = '14px sans-serif'; ctx.fillStyle = 'rgba(245,242,232,0.85)';
    ['本游戏不收集任何个人信息，无需注册登录。', '游戏进度仅保存在本机存储中。', '无第三方 SDK，不向任何服务器发送数据。', '点击查看即表示同意《隐私协议》。'].forEach((s, i) => ctx.fillText(s, W / 2, H * 0.38 + i * 24));
    btn(R.agree, '同意并开始', '#2ea44f', '#fff');
  } else if (screen === 'menu') {
    overlay(0.88);
    ctx.fillStyle = '#e8c478'; ctx.font = '700 40px sans-serif'; ctx.fillText('即刻开球', W / 2, H * 0.22);
    ctx.fillStyle = '#f5f2e8'; ctx.font = '600 20px sans-serif'; ctx.fillText('PRO POOL', W / 2, H * 0.22 + 40);
    ctx.font = '13px sans-serif'; ctx.fillStyle = 'rgba(245,242,232,0.7)'; ctx.fillText('真实物理 · 免费 · 无广告', W / 2, H * 0.22 + 68);
    btn(R.solo, '单人挑战', '#2ea44f', '#fff');
    btn(R.pvp, '双人对战', '#3a4a3f', '#f5f2e8');
  } else if (screen === 'spin') {
    overlay(0.9);
    ctx.fillStyle = '#f5f2e8'; ctx.font = '700 20px sans-serif'; ctx.fillText('击球点（11 预设）', W / 2, H * 0.24);
    const gx = W * 0.10, gy = H * 0.30, cw = W * 0.80 / 3, ch = 44;
    SPIN.forEach((s, i) => {
      const r = { x: gx + (i % 3) * cw, y: gy + Math.floor(i / 3) * ch, w: cw - 4, h: ch - 4 };
      const on = (Math.abs(spinX - s[1]) < 1e-6 && Math.abs(spinY - s[2]) < 1e-6);
      btn(r, s[0], on ? '#e8c478' : '#3a4a3f', on ? '#201a10' : '#f5f2e8');
    });
  } else if (screen === 'over') {
    overlay(0.85);
    ctx.fillStyle = '#e8c478'; ctx.font = '700 30px sans-serif'; ctx.fillText('对局结束', W / 2, H * 0.36);
    ctx.fillStyle = '#f5f2e8'; ctx.font = '16px sans-serif'; ctx.fillText((game.winnerName || '胜负已分'), W / 2, H * 0.36 + 36);
    btn(R.again, '再来一局', '#2ea44f', '#fff');
    btn(R.back, '回主菜单', '#3a4a3f', '#f5f2e8');
  } else if (screen === 'play') {
    // 顶部 HUD
    ctx.fillStyle = 'rgba(6,9,7,0.72)'; ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = '#f5f2e8'; ctx.font = '600 14px sans-serif'; ctx.textAlign = 'left';
    const turn = game.players && game.players[game.activePlayer] ? ('玩家' + (game.activePlayer + 1)) : '';
    const hint = game.phase === 'shooting' ? '运动中…' : (game.ballInHand ? '自由球：拖动母球摆放' : '拖动瞄准 · 下拉力度 · 点出杆');
    ctx.fillText(turn + ' · ' + hint, 12, 20);
    ctx.textAlign = 'center';
    // 力度条
    const b = R.bar; ctx.fillStyle = 'rgba(6,9,7,0.6)'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#e8c478'; ctx.fillRect(b.x, b.y + b.h * (1 - power), b.w, b.h * power);
    ctx.fillStyle = '#f5f2e8'; ctx.font = '12px sans-serif'; ctx.fillText(Math.round(power * 100) + '%', b.x + b.w / 2, b.y - 12);
    btn(R.shoot, '出杆', '#2ea44f', '#fff');
    btn(R.menu, '菜单', '#3a4a3f', '#f5f2e8');
    btn(R.orb, '击球点', '#3a4a3f', '#e8c478');
  }
  ctx.restore();
}
let last = Date.now();
function loop() {
  const now = Date.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (screen === 'play' || screen === 'spin' || screen === 'over') {
    game.update(dt);
    if (game.phase === 'over' && screen !== 'over') screen = 'over';
    renderer.render(game.getRenderState(), dt);
  } else {
    ctx.save(); ctx.fillStyle = '#0a120c'; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  drawUI();
  window.requestAnimationFrame(loop);
}
loop();
