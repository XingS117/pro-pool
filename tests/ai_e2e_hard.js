/* 端到端：在真实 Game 里用 hard AI 连打一整局，检查是否有球停在袋口。 */
global.window=global;
for (const f of ['config','physics','levels','ai','game']) require('../js/'+f+'.js');
const P=window.Pool, AI=P.AI;
const G=new P.Game({save:{version:1,coins:0,stars:{},cleared:{},ownedCues:['oak'],equipped:'oak',settings:{guide:true,sound:false},record:{wins:0,losses:0,matches:0}},persist(){},audio:null,renderer:null});
G.startMatch('ai','hard');
let shots=0, pots=0, lip=0, fouls=0, guard=0;
while(G.phase!=='over' && guard++<200){
  if(G.phase!=='aim'){ G.update(1/60); continue; }
  const p=G.players[G.activePlayer];
  const shot=AI.chooseShot(G.world,{cueBallId:'cue',group:p.group||'open',targetIds:G.getTargetIds(p),difficulty:'hard',ballInHand:!!G.ballInHand,maxTimeMs:250,cuePower:(G.cue||{}).power||1,cueSpin:(G.cue||{}).spin||1});
  if(!shot) break;
  if(shot.placement&&G.ballInHand) G.placeCueAt(shot.placement.x,shot.placement.y);
  G.aimAngle=shot.angle;G.aimTargetAngle=shot.angle;
  const before=G.world.balls.filter(b=>b.active&&b.number>0).length;
  if(!G.shoot(shot.power,shot.spinX||0,shot.spinY||0)) break;
  shots++;
  for(let k=0;k<1200&&G.phase==='shooting';k++) G.update(1/120);
  const after=G.world.balls.filter(b=>b.active&&b.number>0).length;
  if(after<before) pots++;
  else {
    // 没进：只看这一杆的目标球是否卡在袋口（其它球本来就可能停在袋边）
    const tgt=G.world.getBall(shot.ballId);
    const pk=G.world.pockets[shot.pocketIndex];
    if(tgt&&tgt.active&&pk&&Math.hypot(tgt.x-pk.x,tgt.y-pk.y)<0.11) lip++;
  }
  if(G.shotCtx&&G.shotCtx.cuePotted) fouls++;
}
console.log(JSON.stringify({shots,pots,lipStopped:lip,fouls,phase:G.phase,winner:G.matchResult?G.matchResult.winner:null}));
