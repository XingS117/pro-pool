/* 微信小游戏运行时模拟测试
   在 Node 中模拟 wx 运行时（Canvas / WebAudio / 存储 / 触摸 / 分享），
   验证 adapter + core + mg-main 能启动、能响应触摸、核心模块完整。
   防止后续改动引入宿主不兼容（如 ImageData / DOM API 依赖）。 */
const fs = require('fs'), path = require('path');
const MG = path.join(__dirname, '..', 'wechat-minigame');
const work = path.join(__dirname, '_mg_run');
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });
for (const f of ['adapter.js', 'core.js', 'mg-main.js']) fs.copyFileSync(path.join(MG, f), path.join(work, f));
fs.copyFileSync(path.join(__dirname, 'mg_canvas_stub.js'), path.join(work, 'canvas-stub.js'));
fs.copyFileSync(path.join(__dirname, 'mg_harness.js'), path.join(work, 'harness.js'));
let sim = null, err = null;
try {
  const simulate = require(path.join(work, 'harness.js'));
  sim = simulate();
} catch (e) {
  err = e;
}
const out = (sim && sim.results.join('\n')) || ('LOAD_ERR: ' + (err && err.stack || '').slice(0, 600));
fs.rmSync(work, { recursive: true, force: true });
console.log(out);
let pass = 0, fail = 0; const bad = [];
function ok(n, c, d) { if (c) pass++; else { fail++; bad.push(n + ' :: ' + (d || '')); } }
const has = s => out.indexOf(s) >= 0;
ok('adapter 加载成功', has('ADAPTER_OK'), out.slice(0, 300));
ok('核心模块加载成功', has('CORE_OK'), out.slice(0, 300));
ok('小游戏主程序加载成功', has('MG_OK'), out.slice(0, 400));
ok('wx.createCanvas 可用', has('adapterCanvas=true'));
ok('AudioContext 映射', has('adapterAudioCtx=function'));
ok('localStorage 映射', has('adapterStorage=object'));
ok('requestAnimationFrame 映射', has('adapterRaf=function'));
ok('atob 映射（内嵌采样解码）', has('adapterAtob=function'));
ok('分享菜单已启用', has('showShareMenu'));
ok('分享回调已注册', has('onShareAppMessage'));
ok('核心模块完整（Physics/Game/Renderer/AI）', has('POOL=true'));
ok('隐私弹窗触摸响应', has('T1_OK'));
ok('主菜单触摸响应', has('T2_OK'));
console.log('=== 微信小游戏运行时 ===');
console.log('PASS: ' + pass + '  FAIL: ' + fail);
if (bad.length) console.log(bad.join('\n'));
process.exit(fail ? 1 : 0);