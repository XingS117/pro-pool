#!/usr/bin/env node
/* 扫码助手：把最新二维码写成自动刷新的本地页面，并在默认浏览器 + 工作台弹出。
   用法: node scripts/show-qr.mjs [二维码图片路径] [标题] [说明]
   约定：生成脚本持续覆盖 图片路径，本页 meta refresh 3 秒自动更新。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const img = path.resolve(process.argv[2] || path.join(ROOT, 'tests/_qr_live.png'));
const title = process.argv[3] || '扫码登录';
const note = process.argv[4] || '请用手机扫码并在设备上确认';
const out = path.join(ROOT, 'docs/扫码登录.html');
let b64 = '';
try { b64 = fs.readFileSync(img).toString('base64'); } catch (e) {}
const html = [
'<!DOCTYPE html><html lang=zh-CN><head><meta charset=utf-8>',
'<meta http-equiv=refresh content=3><title>' + title + '</title>',
'<style>body{margin:0;background:#0e1510;color:#f5f2e8;font-family:system-ui,"Microsoft YaHei",sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh}',
'h1{font-size:22px;margin:0 0 6px;color:#e8c478}p{font-size:14px;opacity:.75;margin:0 0 22px}',
'.box{background:#fff;padding:18px;border-radius:16px;box-shadow:0 18px 60px rgba(0,0,0,.5)}img{display:block;width:300px;height:300px}',
'.tip{margin-top:18px;font-size:13px;opacity:.6}</style></head><body>',
'<h1>' + title + '</h1><p>' + note + '</p>',
'<div class=box><img src="data:image/png;base64,' + b64 + '"></div>',
'<div class=tip>页面每 3 秒自动刷新二维码</div></body></html>'
].join('');
fs.writeFileSync(out, html, 'utf8');
// Windows: 用默认浏览器弹出
if (process.platform === 'win32') {
  spawnSync('cmd', ['/c', 'start', '', out], { shell: false, stdio: 'ignore' });
}
console.log('QR page: ' + out);
console.log('下一步：在右侧工作台 preview_page 打开同一路径即可并排查看。');