/* 11 个击球点：HTML 预设 / main.js 名称与说明表 / CSS 布局 一致性 */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
let pass=0,fail=0;const bad=[];
function ok(n,c,d){if(c)pass++;else{fail++;bad.push(n+' :: '+d);}}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const main=fs.readFileSync(path.join(root,'js/main.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css/style.css'),'utf8');
const btns=[...html.matchAll(/data-spin-x="([-0-9.]+)"\s+data-spin-y="([-0-9.]+)"[^>]*>([^<]+)<\/button>/g)]
  .map(m=>({x:+m[1],y:+m[2],name:m[3].trim()}));
const names=['中杆','中高杆','高杆','中低杆','低杆','左塞','右塞','高杆左塞','高杆右塞','低杆左塞','低杆右塞'];
ok('HTML 有 11 个预设',btns.length===11,'count='+btns.length);
ok('11 个名称齐全',names.every(n=>btns.some(b=>b.name===n)),'missing='+names.filter(n=>!btns.some(b=>b.name===n)).join(','));
const coords=btns.map(b=>b.x+','+b.y);
ok('11 个坐标两两不同',new Set(coords).size===11,'unique='+new Set(coords).size);
ok('包含中高杆/中低杆两档',btns.some(b=>b.y===0.35)&&btns.some(b=>b.y===-0.35),'');
ok('四个复合塞齐全',['高杆左塞','高杆右塞','低杆左塞','低杆右塞'].every(n=>btns.some(b=>b.name===n)),'');
// main.js 的 SPIN_POINTS 表
const tableNames=[...main.matchAll(/name:\s*'([^']+)'/g)].map(m=>m[1]);
const spinTable=main.slice(main.indexOf('var SPIN_POINTS'),main.indexOf('function spinPointAt'));
const tablePts=[...spinTable.matchAll(/name:\s*'([^']+)',\s*x:\s*([-0-9.]+),\s*y:\s*([-0-9.]+)/g)]
  .map(m=>({name:m[1],x:+m[2],y:+m[3]}));
ok('main.js 表有 11 项',tablePts.length===11,'count='+tablePts.length);
ok('表与 HTML 名称一致',names.every(n=>tablePts.some(p=>p.name===n)),'');
ok('表与 HTML 坐标一致',tablePts.every(p=>btns.some(b=>b.name===p.name&&b.x===p.x&&b.y===p.y)),
   tablePts.filter(p=>!btns.some(b=>b.name===p.name&&b.x===p.x&&b.y===p.y)).map(p=>p.name).join(','));
ok('每项都有独立效果说明',(spinTable.match(/desc:/g)||[]).length===11,'descs='+(spinTable.match(/desc:/g)||[]).length);
ok('说明按点位精确匹配',main.indexOf('function spinPointAt')>0&&main.indexOf('var hit = spinPointAt(x, y)')>0,'');
ok('竖屏用 6 列(与桌面对齐)',css.indexOf('grid-template-columns:repeat(6,minmax(0,1fr))')>0,'');
console.log('PASS: '+pass+'  FAIL: '+fail);
if(bad.length)console.log(bad.join('\n'));
process.exit(fail?1:0);
