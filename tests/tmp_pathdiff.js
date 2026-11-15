/* 对比：AI simulate 路径 vs 游戏真实执行路径 */
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
function newGame(){return new P.Game({save:{version:1,coins:0,stars:{},cleared:{},ownedCues:['oak'],equipped:'oak',settings:{guide:true,sound:false},record:{wins:0,losses:0,matches:0}},persist(){},audio:null,renderer:null});}
let shown=0;
for(let i=0;i<120 && shown<5;i++){
  const w=rack();
  const ids=w.balls.filter(b=>b.number>0).map(b=>b.id);
  const an=AI.analyze(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:'normal',ballInHand:false,maxTimeMs:300});
  const best=an.candidates&&an.candidates[0];
  if(!best||!(best.cutDeg<15&&best.dcg<0.7)) continue;
  const s=AI.chooseShot(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:'normal',ballInHand:false,maxTimeMs:250,cuePower:1,cueSpin:1});
  // 路径A：simulate 等价
  const wa=w.clone(); const ta=wa.getBall(s.ballId);
  wa.strike('cue',{angle:s.angle,power:s.power,spinX:s.spinX||0,spinY:s.spinY||0});
  for(let k=0;k<900;k++){wa.step(1/60);if(wa.allStopped())break;}
  const potA=!ta.active;
  // 路径B：游戏真实
  const G=newGame(); G.startMatch('pvp','normal');
  const Wg=G.world;
  Wg.balls.forEach(b=>{ if(b.number!==0) b.active=false; });
  const cue=Wg.getBall('cue');
  cue.active=true; cue.pocketed=false;
  cue.x=w.getBall('cue').x; cue.y=w.getBall('cue').y; cue.vx=0; cue.vy=0;
  const tb=Wg.addBall({id:'tt',number:1,x:w.getBall(s.ballId).x,y:w.getBall(s.ballId).y});
  G.aimAngle=s.angle; G.aimTargetAngle=s.angle; G.phase='aim'; G.ballInHand=false;
  const okB=G.shoot(s.power,s.spinX||0,s.spinY||0);
  for(let k=0;k<1500;k++){G.update(1/120);if(G.phase!=='shooting')break;}
  const potB=!tb.active;
  if(potA!==potB || !potB){
    shown++;
    console.log(JSON.stringify({cut:best.cutDeg,dtp:+best.dtp.toFixed(2),power:+s.power.toFixed(3),
      spinY:+(s.spinY||0).toFixed(2),shootOk:okB,simPotted:potA,realPotted:potB,
      simRestA:[+ta.x.toFixed(3),+ta.y.toFixed(3)],realRest:[+tb.x.toFixed(3),+tb.y.toFixed(3)]}));
  }
}
