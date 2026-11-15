/* 物理指纹快照（golden master）
   固定一批局面与击球参数，记录最终每球状态。任何改动后：
   - 只改 UI/CSS/文案     → 快照必须 0 变化
   - 有意修改物理         → 必须显式执行  node tests/physics_snapshot.test.js --update
   并人工确认差异合理，否则一律视为回归。 */
global.window=global;
require('../js/config.js');require('../js/physics.js');
const P=window.Pool,C=P.CONFIG;
const fs=require('fs'),path=require('path');
const GOLD=path.join(__dirname,'physics_snapshot.golden.json');
const update=process.argv.includes('--update');
const TOL=1e-6;

/* 每例：母球 + 若干球 + 出杆参数 */
const CASES=[
 {n:'直球中袋', cue:[1.27,1.05,-Math.PI/2], balls:[[1.27,0.45]], power:0.6, sx:0, sy:0.1},
 {n:'切 20°',   cue:[0.95,0.85], aimAt:[1.22,0.42], pocket:[1.27,0], balls:[[1.22,0.42]], power:0.7, sx:0, sy:0.1},
 {n:'切 45°',   cue:[1.40,0.95], aimAt:[2.10,0.55], pocket:[2.54,0], balls:[[2.10,0.55]], power:0.8, sx:0, sy:0.1},
 {n:'切 60°',   cue:[1.35,0.95], aimAt:[2.00,0.55], pocket:[2.54,0], balls:[[2.00,0.55]], power:0.9, sx:0, sy:0.1},
 {n:'高杆',     cue:[0.60,0.635], aimAt:[1.35,0.635], pocket:[1.27,0], balls:[[1.35,0.635]], power:0.7, sx:0, sy:0.9},
 {n:'低杆',     cue:[0.60,0.635], aimAt:[1.35,0.635], pocket:[1.27,0], balls:[[1.35,0.635]], power:0.7, sx:0, sy:-0.9},
 {n:'左塞',     cue:[0.60,0.635], aimAt:[1.35,0.635], pocket:[1.27,0], balls:[[1.35,0.635]], power:0.7, sx:-1, sy:0.1},
 {n:'右塞',     cue:[0.60,0.635], aimAt:[1.35,0.635], pocket:[1.27,0], balls:[[1.35,0.635]], power:0.7, sx:1, sy:0.1},
 {n:'库边反弹', cue:[0.70,1.00,-0.5], balls:[], power:0.9, sx:0, sy:0.1},
 {n:'球堆连锁', cue:[0.35,0.635,0], balls:[[1.10,0.635],[1.40,0.66],[1.70,0.60],[1.95,0.68]], power:1.0, sx:0, sy:0.1},
 {n:'母球落袋', cue:[0.40,0.55], aimAt:[0.10,0.10], pocket:[0,0], balls:[[0.55,0.25]], power:0.9, sx:0, sy:0.1},
 {n:'极小力度', cue:[0.60,0.635,0], balls:[[1.00,0.635]], power:0.08, sx:0, sy:0},
 {n:'极限力度', cue:[0.35,0.635,0], balls:[[1.60,0.635]], power:1.0, sx:0, sy:0.1},
 {n:'贴库斜撞', cue:[0.50,0.05], aimAt:[2.30,1.00], pocket:[2.54,1.27], balls:[[1.10,0.40]], power:0.85, sx:0.4, sy:-0.5}
];

function angleFor(c){
  if(typeof c.cue[2]==='number') return c.cue[2];
  if(c.aimAt&&c.pocket){
    const dx=c.pocket[0]-c.aimAt[0], dy=c.pocket[1]-c.aimAt[1], l=Math.hypot(dx,dy);
    const R=C.table.ballRadius;
    const gx=c.aimAt[0]-dx/l*2*R, gy=c.aimAt[1]-dy/l*2*R;
    return Math.atan2(gy-c.cue[1], gx-c.cue[0]);
  }
  return 0;
}
function runCase(c){
  const w=new P.Physics.PhysicsWorld();
  w.addBall({id:'cue',number:0,x:c.cue[0],y:c.cue[1]});
  c.balls.forEach((b,i)=>w.addBall({id:'b'+(i+1),number:i+1,x:b[0],y:b[1]}));
  w.strike('cue',{angle:angleFor(c),power:c.power,spinX:c.sx,spinY:c.sy});
  for(let i=0;i<3600;i++){ w.step(1/600); if(w.allStopped())break; }
  /* 指纹：每球的最终位置/速度（保留 9 位）+ 是否落袋 */
  return w.balls.map(b=>[
    b.id,
    +b.x.toFixed(9), +b.y.toFixed(9),
    +b.vx.toFixed(9), +b.vy.toFixed(9),
    b.active?1:0
  ]);
}
const actual={};
for(const c of CASES) actual[c.n]=runCase(c);

if(update){
  fs.writeFileSync(GOLD,JSON.stringify({note:'物理指纹；仅在有意修改物理并用 --update 时刷新',cases:actual},null,0),'utf8');
  console.log('已更新物理指纹: '+CASES.length+' 例 -> '+path.basename(GOLD));
  process.exit(0);
}
if(!fs.existsSync(GOLD)){
  console.log('缺少 physics_snapshot.golden.json，请先运行: node tests/physics_snapshot.test.js --update');
  process.exit(1);
}
const golden=JSON.parse(fs.readFileSync(GOLD,'utf8')).cases;
let pass=0,fail=0;const bad=[];
for(const c of CASES){
  const a=actual[c.n], g=golden[c.n];
  if(!g){bad.push(c.n+' :: 指纹缺失');fail++;continue;}
  let worst=0,worstField='';
  const n=Math.max(a.length,g.length);
  for(let i=0;i<n;i++){
    if(!a[i]||!g[i]){worst=Infinity;worstField='球数不一致';break;}
    if(a[i][0]!==g[i][0]||a[i][5]!==g[i][5]){worst=Infinity;worstField='id/落袋不一致';break;}
    for(let k=1;k<=4;k++){
      const d=Math.abs(a[i][k]-g[i][k]);
      if(d>worst){worst=d;worstField='球'+a[i][0]+' 字段'+k;}
    }
  }
  if(worst<=TOL) pass++;
  else { fail++; bad.push(c.n+' :: '+worstField+' 偏差 '+worst.toExponential(2)); }
}
console.log('=== 物理指纹 ===');
console.log('PASS: '+pass+'  FAIL: '+fail);
if(bad.length){
  console.log(bad.slice(0,10).join('\n'));
  console.log('若确认是有意修改物理，执行: node tests/physics_snapshot.test.js --update');
}
process.exit(fail?1:0);
