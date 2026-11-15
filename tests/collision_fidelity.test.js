/* 碰撞方向保真：目标球出射方向必须与几何预期一致（CCD 回归） */
global.window=global;
require('../js/config.js');require('../js/physics.js');
const P=window.Pool,C=P.CONFIG,R=C.table.ballRadius;
const D=180/Math.PI;
function norm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
let pass=0,fail=0;const bad=[];
function ok(n,c,d){if(c)pass++;else{fail++;bad.push(n+' :: '+d);}}
function dirErr(cx,cy,tx,ty,ax,ay,pw,spinX){
  const w=new P.Physics.PhysicsWorld();
  const cue=w.addBall({id:'cue',number:0,x:cx,y:cy});
  const t=w.addBall({id:'b1',number:1,x:tx,y:ty});
  const dx=ax-tx,dy=ay-ty,l=Math.hypot(dx,dy);
  const gx=tx-dx/l*2*R, gy=ty-dy/l*2*R;
  const ang=Math.atan2(gy-cy,gx-cx);
  const theory=Math.atan2(dy,dx);
  w.strike('cue',{angle:ang,power:pw,spinX:spinX||0,spinY:0.1});
  w.clearEvents();
  for(let i=0;i<5400;i++){
    w.step(1/600);
    if(w.events.some(e=>e.type==='ball-hit')) return Math.abs(norm(Math.atan2(t.vy,t.vx)-theory)*D);
    w.clearEvents();
    if(w.allStopped())break;
  }
  return null;
}
const cases=[
 ['正对中袋',1.27,1.05,1.27,0.30,1.27,0],
 ['正对角袋',0.55,0.55,0.30,0.30,0,0],
 ['偏 20°',1.55,0.90,2.10,0.50,2.54,0],
 ['偏 35°',1.35,0.95,2.00,0.55,2.54,0]
];
let worst=0;
for(const [n,cx,cy,tx,ty,ax,ay] of cases){
  for(const pw of [0.5,0.8,1.0]){
    const e=dirErr(cx,cy,tx,ty,ax,ay,pw,0);
    ok(n+' pw'+pw+' 方向误差<1°',e!==null&&e<1,'err='+(e===null?'n/a':e.toFixed(2))+'°');
    if(e!==null&&e>worst)worst=e;
  }
  // 侧塞允许 <1.5°（真实物理里塞会轻微影响方向）
  for(const sx of [0.6,-0.6]){
    const e=dirErr(cx,cy,tx,ty,ax,ay,0.8,sx);
    ok(n+' 塞'+sx+' 方向误差<1.5°',e!==null&&e<1.5,'err='+(e===null?'n/a':e.toFixed(2))+'°');
  }
}
console.log('PASS: '+pass+'  FAIL: '+fail+'  worstNoSpin='+worst.toFixed(2)+'°');
if(bad.length)console.log(bad.join('\n'));
process.exit(fail?1:0);
