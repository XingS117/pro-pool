/* 微信小游戏「导入即编译」等价预检
   在 Node 侧验证开发者工具编译期会检查的所有静态条件，
   避免用户打开工具才报错。 */
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..', 'wechat-minigame');
let pass = 0, fail = 0; const bad = [];
function ok(n, c, d) { if (c) pass++; else { fail++; bad.push(n + ' :: ' + (d || '')); } }
ok('game.js 入口存在', fs.existsSync(path.join(D, 'game.js')));
ok('game.json 存在', fs.existsSync(path.join(D, 'game.json')));
ok('project.config.json 存在', fs.existsSync(path.join(D, 'project.config.json')));
const js = fs.readdirSync(D).filter(f => f.endsWith('.js'));
ok('JS 文件齐备（adapter/core/mg-main/game）', ['adapter.js','core.js','mg-main.js','game.js'].every(f => js.includes(f)), js.join(','));
let esm = [], missingReq = [], bom = [];
for (const f of js) {
  const t = fs.readFileSync(path.join(D, f), 'utf8');
  if (/^\s*(import|export)\s/m.test(t)) esm.push(f);
  if (t.charCodeAt(0) === 0xFEFF) bom.push(f);
  for (const m of t.matchAll(/require\(['"](\.\/[^'"]+)['"]\)/g)) {
    const p = path.join(D, m[1].replace('./', ''));
    if (!fs.existsSync(p)) missingReq.push(f + ' -> ' + m[1]);
  }
}
ok('无 ES module 语法（小游戏用 CommonJS）', esm.length === 0, esm.join(','));
ok('所有 require 路径存在', missingReq.length === 0, missingReq.join(' | '));
ok('无 UTF-8 BOM', bom.length === 0, bom.join(','));
let jsonOk = true, cfg = {}, gj = {};
try { cfg = JSON.parse(fs.readFileSync(path.join(D, 'project.config.json'), 'utf8')); } catch (e) { jsonOk = false; }
try { gj = JSON.parse(fs.readFileSync(path.join(D, 'game.json'), 'utf8')); } catch (e) { jsonOk = false; }
ok('两个 JSON 合法', jsonOk);
ok('AppID 格式正确', /^wx[a-f0-9]{16}$/.test(cfg.appid || ''), cfg.appid);
ok('compileType = game', cfg.compileType === 'game', cfg.compileType);
ok('game.json 无非标准字段 appid', !('appid' in gj));
let total = 0; for (const f of fs.readdirSync(D)) { const p = path.join(D, f); if (fs.statSync(p).isFile()) total += fs.statSync(p).size; }
ok('主包 < 4MB', total < 4 * 1024 * 1024, (total / 1024).toFixed(1) + ' KB');
console.log('=== 小游戏编译预检 ===');
console.log('主包 ' + (total / 1024).toFixed(1) + ' KB / 4096 KB | AppID ' + cfg.appid);
console.log('PASS: ' + pass + '  FAIL: ' + fail);
if (bad.length) console.log(bad.join('\n'));
process.exit(fail ? 1 : 0);