/* 三档真实表现：单次上手连进 + 清台率 + 细分难度 */
global.window=global;
for (const f of ['config','physics','levels','ai','game']) require('../js/'+f+'.js');
const P=window.Pool,AI=P.AI,C=P.CONFIG,R=C.table.ballRadius,W=C.table.width,H=C.table.height;
let seed=4242;
function rnd(){seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;}
function rack(n){
  const w=new P.Physics.PhysicsWorld();
  w.addBall({id:'cue',number:0,x:0.30+rnd()*0.5,y:R+0.09+rnd()*(H-2*R-0.18)});
  const placed=[{x:w.getBall('cue').x,y:w.getBall('cue').y}];
  for(let k=1;k<=n;k++){
    for(let t=0;t<600;t++){
      const x=R+0.07+rnd()*(W-2*R-0.14), y=R+0.07+rnd()*(H-2*R-0.14);
      let ok=true;
      for(const b of placed) if(Math.hypot(b.x-x,b.y-y)<2*R+0.06){ok=false;break;}
      if(!ok)continue;
      for(const pk of w.pockets) if(Math.hypot(pk.x-x,pk.y-y)<pk.radius+R*2.5){ok=false;break;}
      if(!ok)continue;
      w.addBall({id:'b'+k,number:k,x:x,y:y}); placed.push({x,y}); break;
    }
  }
  return w;
}
function runOut(diff,balls){
  const w=rack(balls);
  let pots=0,shots=0;
  for(let i=0;i<12;i++){
    const ids=w.balls.filter(b=>b.active&&b.number>0).map(b=>b.id);
    if(!ids.length)break;
    let s=null;
    try{ s=AI.chooseShot(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:diff,ballInHand:false,maxTimeMs:250,cuePower:1,cueSpin:1}); }catch(e){break;}
    if(!s||s.plan==='safety')break;
    const before=w.balls.filter(b=>b.active&&b.number>0).length;
    w.strike('cue',{angle:s.angle,power:s.power,spinX:s.spinX||0,spinY:s.spinY||0});
    shots++;
    for(let k=0;k<900;k++){w.step(1/60);if(w.allStopped())break;}
    const cue=w.getBall('cue');
    if(!cue.active)break;
    const after=w.balls.filter(b=>b.active&&b.number>0).length;
    if(after<before) pots+=(before-after); else break;
  }
  return {pots,shots};
}
const out={};
for(const d of ['easy','normal','hard']){
  let tot=0,n=0,clear=0,maxPots=0;
  for(let i=0;i<20;i++){
    seed=9000+i*17;
    const r=runOut(d,7);
    tot+=r.pots;n++;
    if(r.pots>=7)clear++;
    if(r.pots>maxPots)maxPots=r.pots;
  }
  out[d]={avgPots:+(tot/n).toFixed(2),maxPots,fullClears:clear,ofRacks:n};
}
console.log(JSON.stringify(out,null,1));
