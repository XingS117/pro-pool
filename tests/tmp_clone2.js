global.window=global;
require('../js/config.js');require('../js/physics.js');
const P=window.Pool,C=P.CONFIG,R=C.table.ballRadius;
function build(){
  const w=new P.Physics.PhysicsWorld();
  w.addBall({id:'cue',number:0,x:0.35,y:0.635});
  w.addBall({id:'b1',number:1,x:0.85,y:0.50});
  w.addBall({id:'b2',number:2,x:1.60,y:0.90});
  w.addBall({id:'b3',number:3,x:2.10,y:0.30});
  return w;
}
const ANG=0.35, PW=0.55, SY=0.1;
function run(w,label){
  const t=w.getBall('b1');
  w.strike('cue',{angle:ANG,power:PW,spinX:0,spinY:SY});
  for(let k=0;k<900;k++){w.step(1/60);if(w.allStopped())break;}
  return {label,
    cue:[+w.getBall('cue').x.toFixed(6),+w.getBall('cue').y.toFixed(6)],
    b1:[+t.x.toFixed(6),+t.y.toFixed(6)], b1Active:t.active?1:0,
    all:w.balls.map(b=>[+b.x.toFixed(6),+b.y.toFixed(6),b.active?1:0])};
}
const A=run(build(),'direct');
const B=run(build().clone(),'clone');
console.log('direct cue',A.cue,'b1',A.b1,'active',A.b1Active);
console.log('clone  cue',B.cue,'b1',B.b1,'active',B.b1Active);
const d=Math.hypot(A.cue[0]-B.cue[0],A.cue[1]-B.cue[1]);
console.log('cue差(m)',+d.toFixed(9),'b1差(m)',+Math.hypot(A.b1[0]-B.b1[0],A.b1[1]-B.b1[1]).toFixed(9));
/* 二次克隆（模拟多次 simulate） */
const base=build();
const C1=run(base.clone(),'c1');
console.log('再次 clone 复现性 cue',C1.cue,'b1',C1.b1);
/* 检查 clone 是否复制了 _px/_py */
const src=build();
src.step(1/600);
const cl=src.clone();
console.log('clone后 _px 是否存在:',cl.balls.map(b=>b._px!==undefined).join(','));
console.log('clone后 位置一致:',cl.balls.every((b,i)=>Math.abs(b.x-src.balls[i].x)<1e-12));
