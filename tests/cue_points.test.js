/* 潘晓婷 11 个击球点 vs 当前物理：实测 + 断言 */
global.window=global;
require('../js/config.js');require('../js/physics.js');
const P=window.Pool,C=P.CONFIG,R=C.table.ballRadius;
let pass=0,fail=0;const bad=[];
function ok(n,c,d){if(c)pass++;else{fail++;bad.push(n+' :: '+d);}}
function straight(sx,sy){
  const w=new P.Physics.PhysicsWorld();
  const cue=w.addBall({number:0,x:0.35,y:0.635});
  w.addBall({number:1,x:0.78,y:0.635});
  w.strike('cue',{angle:0,power:0,speed:2.6,spinX:sx,spinY:sy});
  const v=Math.hypot(cue.vx,cue.vy),wr=R*Math.abs(cue._wy);
  let hitX=null;
  for(let i=0;i<6000;i++){
    w.step(1/600);
    if(hitX===null&&w.events.some(e=>e.type==='ball-hit'))hitX=cue.x;
    if(hitX!==null&&Math.hypot(cue.vx,cue.vy)<1e-6)break;
    w.clearEvents();
  }
  return {omegaOverV:+(wr/v).toFixed(3),afterHit:+(cue.x-hitX).toFixed(3)};
}
function cushion(sx){
  const w=new P.Physics.PhysicsWorld();
  const y=C.table.height-R-0.0005;
  const b=w.addBall({number:0,x:1.1,y:y});
  b.vx=Math.cos(Math.PI/4)*3;b.vy=Math.sin(Math.PI/4)*3;
  b._wx=0;b._wy=0;b._wz=sx*3/R*0.42;b._sx=sx;
  let out=null;
  for(let i=0;i<600;i++){w.step(1/600);if(b.vy<0){out=Math.atan2(b.vy,b.vx)*180/Math.PI;break;}}
  return out===null?0:+out.toFixed(1);
}
/* 与 index.html / main.js SPIN_POINTS 完全一致的 11 点 */
const rows=[
 ['中杆',0,0],['中高杆',0,0.35],['高杆',0,0.7],['中低杆',0,-0.35],['低杆',0,-0.7],
 ['左塞',-0.7,0],['右塞',0.7,0],
 ['高杆左塞',-0.5,0.5],['高杆右塞',0.5,0.5],['低杆左塞',-0.5,-0.5],['低杆右塞',0.5,-0.5]
];
const base=cushion(0);
console.log('击球点 | ωR/v | 正碰后位移(+跟进/-回缩) | 吃库出射角');
const sig=new Map();
const res={};
for(const [name,sx,sy] of rows){
  const s=straight(sx,sy),c=cushion(sx);
  res[name]={...s,cushion:c};
  const key=s.omegaOverV.toFixed(3)+'|'+s.afterHit.toFixed(3)+'|'+c.toFixed(1);
  sig.set(name,key);
  console.log(name.padEnd(10),'|',String(s.omegaOverV).padEnd(6),'|',String(s.afterHit).padEnd(12),'|',c);
}
console.log('无塞45°入射基准出射角:',base);
ok('共 11 个击球点',rows.length===11,'count='+rows.length);
const keys=[...sig.values()];
ok('11 点物理签名两两不同',new Set(keys).size===11,'unique='+new Set(keys).size+' of 11');
ok('中杆定杆',Math.abs(res['中杆'].afterHit)<0.2,'afterHit='+res['中杆'].afterHit);
ok('高杆 > 中高杆 > 中杆',res['高杆'].afterHit>res['中高杆'].afterHit&&res['中高杆'].afterHit>res['中杆'].afterHit,
   [res['高杆'].afterHit,res['中高杆'].afterHit,res['中杆'].afterHit].join('>'));
ok('低杆 < 中低杆 < 中杆',res['低杆'].afterHit<res['中低杆'].afterHit&&res['中低杆'].afterHit<res['中杆'].afterHit,
   [res['低杆'].afterHit,res['中低杆'].afterHit,res['中杆'].afterHit].join('<'));
ok('低杆确实回缩',res['低杆'].afterHit<0,'afterHit='+res['低杆'].afterHit);
ok('左塞/右塞吃库变轨方向正确',res['左塞'].cushion<base&&res['右塞'].cushion>base,
   'L='+res['左塞'].cushion+' base='+base+' R='+res['右塞'].cushion);
console.log('PASS: '+pass+'  FAIL: '+fail);
if(bad.length)console.log(bad.join('\n'));
process.exit(fail?1:0);
