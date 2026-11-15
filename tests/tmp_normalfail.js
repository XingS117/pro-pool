/* 诊断：normal 在容易球上失败的案例，打印 plan/power/spin/落点 */
global.window=global;
for (const f of ['config','physics','levels','ai','game']) require('../js/'+f+'.js');
const P=window.Pool,AI=P.AI,C=P.CONFIG,R=C.table.ballRadius,W=C.table.width,H=C.table.height;
let seed=8642;
function rnd(){seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;}
function rack(){
  const w=new P.Physics.PhysicsWorld();
  w.addBall({id:'cue',number:0,x:0.30+rnd()*0.6,y:R+0.10+rnd()*(H-2*R-0.20)});
  for(let n=1;n<=4;n++){
    for(let t=0;t<600;t++){
      const x=R+0.08+rnd()*(W-2*R-0.16), y=R+0.08+rnd()*(H-2*R-0.16);
      let ok=true;
      for(const b of w.balls) if(Math.hypot(b.x-x,b.y-y)<2*R+0.09){ok=false;break;}
      if(!ok)continue;
      for(const pk of w.pockets) if(Math.hypot(pk.x-x,pk.y-y)<pk.radius+R*2.5){ok=false;break;}
      if(!ok)continue;
      w.addBall({id:'b'+n,number:n,x:x,y:y}); break;
    }
  }
  return w;
}
let n=0;
for(let i=0;i<120 && n<8;i++){
  const w=rack();
  const ids=w.balls.filter(b=>b.number>0).map(b=>b.id);
  const an=AI.analyze(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:'normal',ballInHand:false,maxTimeMs:300});
  const best=an.candidates&&an.candidates[0];
  if(!best||!(best.cutDeg<15&&best.dcg<0.7)) continue;
  const s=AI.chooseShot(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:'normal',ballInHand:false,maxTimeMs:250,cuePower:1,cueSpin:1});
  const w2=w.clone(), t=w2.getBall(s.ballId), pk=w2.pockets[s.pocketIndex];
  w2.strike('cue',{angle:s.angle,power:s.power,spinX:s.spinX||0,spinY:s.spinY||0});
  for(let k=0;k<900;k++){w2.step(1/60);if(w2.allStopped())break;}
  if(t.active){
    n++;
    console.log(JSON.stringify({
      cut:best.cutDeg, dcg:+best.dcg.toFixed(2), dtp:+best.dtp.toFixed(2), quality:+best.quality.toFixed(2),
      plan:s.plan, power:+s.power.toFixed(3), spinY:+(s.spinY||0).toFixed(2), conf:+(s.confidence||0).toFixed(2),
      rest:[+t.x.toFixed(3),+t.y.toFixed(3)],
      distToPocket:pk?+Math.hypot(t.x-pk.x,t.y-pk.y).toFixed(4):null
    }));
  }
}
console.log('失败样本数',n);
