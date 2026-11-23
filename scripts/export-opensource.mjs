/* 导出干净开源树：白名单复制，绝不携带敏感/运营/第三方素材。
   用法: node scripts/export-opensource.mjs [targetDir]
   默认目标: ../pro-pool-oss */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = path.resolve(process.argv[2] || path.join(ROOT, '..', 'pro-pool-oss'));

const FILES = ['index.html','README.md','README.zh-CN.md','LICENSE','启动游戏.bat','privacy.html'];
const DIRS  = ['css','js','scripts','docs/screenshots','docs/assets','wechat-minigame','server'];
const DOCS  = ['CREDITS.md','DEPLOY.md','ghost-ball-preview.png'];

function copyDir(src, dst, filter) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name.startsWith('_') || e.name.startsWith('.') || e.name === 'node_modules') continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d, filter);
    else if (!filter || filter(e.name)) fs.copyFileSync(s, d);
  }
}
// 保留目标目录下的 .git（避免把已初始化的仓库连同历史一起删掉）
for (const e of fs.readdirSync(TARGET, { withFileTypes: true })) {
  if (e.name === '.git') continue;
  fs.rmSync(path.join(TARGET, e.name), { recursive: true, force: true });
}
fs.mkdirSync(TARGET, { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(ROOT, f), path.join(TARGET, f));
for (const d of DIRS) copyDir(path.join(ROOT, d), path.join(TARGET, d));
fs.mkdirSync(path.join(TARGET, 'docs'), { recursive: true });
for (const f of DOCS) fs.copyFileSync(path.join(ROOT, 'docs', f), path.join(TARGET, 'docs', f));
copyDir(path.join(ROOT, '软著申请'), path.join(TARGET, '软著申请'),
  n => /\.(md|pdf)$/.test(n));
copyDir(path.join(ROOT, 'tests'), path.join(TARGET, 'tests'),
  n => /\.(js|mjs|py|json)$/.test(n));
fs.writeFileSync(path.join(TARGET, '.gitignore'),
  ['node_modules/','dist/','tests/*.png','tests/*.jpg','tests/_*','.frames/','.workbuddy/','*.key','*.pem','Thumbs.db','.DS_Store'].join('\n')+'\n', 'utf8');
let n = 0;
(function count(d){ for (const e of fs.readdirSync(d,{withFileTypes:true})) { if(e.isDirectory()) count(path.join(d,e.name)); else n++; } })(TARGET);
console.log('exported', n, 'files ->', TARGET);
