/* 构建微信小游戏核心 bundle：拼接浏览器核心模块(不含 DOM 主程序 main.js)。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const order = ['config', 'physics', 'renderer', 'audio', 'ai', 'levels', 'game'];
let out = '/* PRO POOL core bundle (auto-generated, do not edit) */\n';
for (const m of order) out += fs.readFileSync(path.join(ROOT, 'js', m + '.js'), 'utf8') + '\n';
fs.writeFileSync(path.join(ROOT, 'wechat-minigame', 'core.js'), out, 'utf8');
console.log('core.js bytes', out.length);
