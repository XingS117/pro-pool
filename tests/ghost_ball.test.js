/* 瞄准虚影母球回归：必须是「复用真实母球外观的半透明白球」，
   而不是空心的虚线圈。 */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'renderer.js'), 'utf8');
let pass=0, fail=0; const bad=[];
function ok(n,c,d){ if(c)pass++; else {fail++; bad.push(n+' :: '+d);} }

// 取出 _drawGuides 函数体（到下一个 prototype 定义为止）
const gi = src.indexOf('Renderer.prototype._drawGuides = function');
ok('_drawGuides 存在', gi >= 0, 'not found');
const gj = src.indexOf('Renderer.prototype.', gi + 40);
const guides = src.slice(gi, gj > 0 ? gj : src.length);

ok('瞄准线调用虚影母球', guides.includes('_drawGhostCueBall'), 'missing call');
ok('幽灵球不再用 setLineDash 画圈', !guides.includes('setLineDash'), 'still dashed');
ok('幽灵球不再用 guideColor.target 填充空心圈',
   !guides.includes("guideColor.target + ',0.06)'"),
   'old ring fill still present');

// 新方法本体
const mi = src.indexOf('Renderer.prototype._drawGhostCueBall = function');
ok('_drawGhostCueBall 存在', mi >= 0, 'not found');
const mj = src.indexOf('Renderer.prototype.', mi + 40);
const m = src.slice(mi, mj > 0 ? mj : src.length);
ok('复用球体 sprite 缓存', m.includes('_ensureBallSprites') && m.includes('_getBallSprite'), 'no sprite reuse');
ok('画真实母球底色', m.includes('drawImage(full.canvas'), 'no base sprite draw');
ok('画真实母球高光/暗部 overlay', m.includes('ov.canvas') && m.includes('drawImage(ov.canvas'), 'no overlay');
ok('画母球红点身份标记', m.includes('176,54,48'), 'no cue spot');
ok('半透明（globalAlpha 由 alpha 参数控制）', m.includes('ctx.globalAlpha = a'), 'no alpha');
ok('有接触阴影（体积感）', m.includes('ellipse') && m.includes('rgba(0,0,0,1)'), 'no contact shadow');
ok('轮廓为实线（无虚线）', !m.includes('setLineDash'), 'dashed outline');
ok('有乳白底避免发绿', m.includes('252,250,242'), 'no ivory base');

// 自由球的抓取环仍保留（不要误删）
ok('自由球抓取环未被误删', src.includes("ctx.setLineDash([Math.max(2.5, r * 0.62)"), 'ball-in-hand ring removed');

console.log('=== 虚影母球 ===');
console.log('PASS: '+pass+'  FAIL: '+fail);
if(bad.length) console.log(bad.join('\n'));
process.exit(fail ? 1 : 0);
