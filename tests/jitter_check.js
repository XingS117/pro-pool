global.window=global;
require('../js/config.js');require('../js/physics.js');
const P=window.Pool,C=P.CONFIG,R=C.table.ballRadius,W=C.table.width,H=C.table.height;
function probe(startX,startY,angleDeg,speed){
  const w=new P.Physics.PhysicsWorld();
  const b=w.addBall({number:5,x:startX,y:startY});
  const a=angleDeg*Math.PI/180;
  b.vx=Math.cos(a)*speed;b.vy=Math.sin(a)*speed;
  b._wx=0;b._wy=0;b._wz=0;b._sx=0;b._moving=true;
  let flips=0,maxStep=0,px=b.x,py=b.y,restAt=-1;
  for(let i=0;i<7200;i++){
    const vx=b.vx,vy=b.vy;
    w.step(1/600);
    if(!b.active) return {out:'potted',flips,maxStep:+maxStep.toFixed(5)};
    const d=Math.hypot(b.x-px,b.y-py);
    if(d>maxStep)maxStep=d;
    if(vx*b.vx<0||vy*b.vy<0)flips++;
    px=b.x;py=b.y;
    if(Math.hypot(b.vx,b.vy)<1e-6){restAt=i;break;}
  }
  // 停稳后再跑 300 子步，检查是否还在动
  const rx=b.x,ry=b.y;
  let post=0;
  for(let i=0;i<300;i++){w.step(1/600);post=Math.max(post,Math.hypot(b.x-rx,b.y-ry));}
  return {out:'rest',flips,maxStep:+maxStep.toFixed(5),postRest:+post.toFixed(6),restAt};
}
let worstFlips={flips:-1},worstStep={maxStep:0},worstPost={postRest:0},bad=[];
for(const start of [[0.45,1.0],[0.30,0.97],[0.18,1.10],[0.10,1.12],[1.0,0.30],[1.27,0.30],[2.1,1.05],[0.25,0.25]]){
  for(const ang of [200,210,220,225,230,240,250,260,270,280,300,320]){
    for(const sp of [0.35,0.7,1.2,2.0,3.0,4.5]){
      const r=probe(start[0],start[1],ang,sp);
      if(r.flips>worstFlips.flips)worstFlips=Object.assign({start,ang,sp},r);
      if((r.maxStep||0)>worstStep.maxStep)worstStep=Object.assign({start,ang,sp},r);
      if((r.postRest||0)>worstPost.postRest)worstPost=Object.assign({start,ang,sp},r);
      if((r.flips||0)>8||(r.maxStep||0)>0.012||(r.postRest||0)>1e-3)bad.push(Object.assign({start,ang,sp},r));
    }
  }
}
console.log('cases: 8*12*6 =',8*12*6);
console.log('worst flips:',JSON.stringify(worstFlips));
console.log('worst substep jump:',JSON.stringify(worstStep));
console.log('worst post-rest drift:',JSON.stringify(worstPost));
console.log('BAD (jitter suspects):',bad.length,JSON.stringify(bad.slice(0,5)));
