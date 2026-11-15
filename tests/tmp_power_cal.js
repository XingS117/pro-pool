/* 校准 estimatePower：角袋对角布局，保证母球始终在台内 */
global.window=global;
require('../js/config.js');require('../js/physics.js');
const P=window.Pool,C=P.CONFIG,R=C.table.ballRadius,W=C.table.width,H=C.table.height;
const PK={x:2.54,y:0};
const U={x:-Math.SQRT1_2,y:Math.SQRT1_2};   // 指向台内
function potRange(dcg,dtp){
  const tx=PK.x+U.x*dtp, ty=PK.y+U.y*dtp;
  const cx=tx+U.x*dcg, cy=ty+U.y*dcg;
  if(tx<R||tx>W-R||ty<R||ty>H-R||cx<R||cx>W-R||cy<R||cy>H-R) return {invalid:true};
  let lo=null,hi=null;
  const ang=Math.atan2(PK.y-ty,PK.x-tx);
  for(let pw=0.05;pw<=1.0;pw+=0.01){
    const w=new P.Physics.PhysicsWorld();
    w.addBall({id:'cue',number:0,x:cx,y:cy});
    const t=w.addBall({id:'b1',number:1,x:tx,y:ty});
    w.strike('cue',{angle:ang,power:+pw.toFixed(3),spinX:0,spinY:0.1});
    for(let k=0;k<1500;k++){w.step(1/60);if(w.allStopped())break;}
    if(!t.active){ if(lo===null)lo=pw; hi=pw; }
  }
  return {lo,hi,tx,ty,cx,cy};
}
function speedForDistance(d){ return 1.21*Math.pow(Math.max(d,0.05),0.41); }
function est(dcg,dtp){
  const pc=C.physics;
  const vObj=speedForDistance(dtp)/0.92;
  const vCueAtHit=vObj/0.92;
  const v0=Math.sqrt(vCueAtHit*vCueAtHit+speedForDistance(dcg)*speedForDistance(dcg));
  return Math.min(0.98,Math.max(0.10,(v0*1.06)/pc.maxShotSpeed));
}
console.log('dtp | dcg | 估算 | 真实[lo,hi] | 判定');
let bad=0;
for(const dtp of [0.25,0.40,0.60,0.85,1.10,1.40]){
  for(const dcg of [0.25,0.50,0.80]){
    const r=potRange(dcg,dtp);
    if(r.invalid){console.log(' dtp='+dtp,'dcg='+dcg,'布局越界');continue;}
    const e=est(dcg,dtp);
    const inside=(r.lo!==null)&&(e>=r.lo-0.01&&e<=r.hi+0.01);
    if(!inside)bad++;
    console.log(' '+String(dtp).padEnd(5),'|',String(dcg).padEnd(4),'|',e.toFixed(3),'|',
      (r.lo===null?'无解':(r.lo.toFixed(2)+'~'+r.hi.toFixed(2))).padEnd(14),'|',inside?'OK':'**偏差**');
  }
}
console.log('偏差数:',bad);
