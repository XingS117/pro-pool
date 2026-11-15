/* 高手「能瞄必进」验收：只统计 analyze 给出高质量进球候选的局面 */
global.window=global;
for (const f of ['config','physics','levels','ai','game']) require('../js/'+f+'.js');
const P=window.Pool,AI=P.AI,C=P.CONFIG,R=C.table.ballRadius,W=C.table.width,H=C.table.height;
let seed=2024;
function rnd(){seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;}
function rack(){
  const w=new P.Physics.PhysicsWorld();
  w.addBall({id:'cue',number:0,x:0.3+rnd()*0.5,y:R+0.08+rnd()*(H-2*R-0.16)});
  const n=1+Math.floor(rnd()*3);
  for(let k=1;k<=n;k++){
    for(let t=0;t<500;t++){
      const x=R+0.08+rnd()*(W-2*R-0.16),y=R+0.08+rnd()*(H-2*R-0.16);
      let ok=true;
      for(const b of w.balls) if(Math.hypot(b.x-x,b.y-y)<2*R+0.09){ok=false;break;}
      if(!ok)continue;
      for(const pk of w.pockets) if(Math.hypot(pk.x-x,pk.y-y)<pk.radius+R*2.5){ok=false;break;}
      if(!ok)continue;
      w.addBall({id:'b'+k,number:k,x:x,y:y});break;
    }
  }
  return w;
}
function bench(diff,trials){
  let tested=0,potted=0,plans={},maxMs=0,misses=[],totalMs=0;
  for(let i=0;i<trials*4 && tested<trials;i++){
    const w=rack();
    const ids=w.balls.filter(b=>b.number>0).map(b=>b.id);
    if(!ids.length) continue;
    const an=AI.analyze(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:diff,ballInHand:false,maxTimeMs:300});
    const best=an.candidates&&an.candidates[0];
    // 只测「辅助线能瞄准」：有候选、质量够高、切角不太夸张
    if(!best || best.quality<0.45 || best.cutDeg>45) continue;
    tested++;
    const t0=Date.now();
    const s=AI.chooseShot(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:diff,ballInHand:false,maxTimeMs:300,cuePower:1,cueSpin:1});
    const ms=Date.now()-t0; totalMs+=ms; if(ms>maxMs)maxMs=ms;
    const w2=w.clone(),tgt=w2.getBall(s.ballId);
    w2.strike('cue',{angle:s.angle,power:s.power,spinX:s.spinX||0,spinY:s.spinY||0});
    for(let k=0;k<900;k++){w2.step(1/60);if(w2.allStopped())break;}
    const ok=!tgt.active;
    plans[s.plan]=(plans[s.plan]||0)+1;
    if(ok)potted++;
    else if(misses.length<6)misses.push({ball:s.ballId,quality:+best.quality.toFixed(2),cut:best.cutDeg,plan:s.plan,power:+s.power.toFixed(2),spinY:+(s.spinY||0).toFixed(2)});
  }
  return {diff,tested,potted,rate:tested?+(potted/tested*100).toFixed(1):0,plans,avgMs:+(totalMs/Math.max(1,tested)).toFixed(1),maxMs,misses};
}
console.log(JSON.stringify(bench('hard',60),null,1));
console.log(JSON.stringify(bench('normal',60),null,1));
