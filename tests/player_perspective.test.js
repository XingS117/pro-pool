/* 玩家视角验收：完全模拟玩家操作——
   用「屏幕辅助线的几何 ghost 角」瞄准，配常见力度，必须 100% 进袋。
   这是最贴近用户体感的一条测试，直接对应「我瞄准了却打不进」的投诉。 */
global.window=global;
for (const f of ['config','physics','levels','ai','game']) require('../js/'+f+'.js');
const P=window.Pool,C=P.CONFIG,R=C.table.ballRadius;
let pass=0,fail=0;const bad=[];

function trial(cueXY,tgtXY,pocketXY,power){
  const G=new P.Game({save:{version:1,coins:0,stars:{},cleared:{},ownedCues:['oak'],equipped:'oak',
    settings:{guide:true,sound:false},record:{wins:0,losses:0,matches:0}},persist(){},audio:null,renderer:null});
  G.startMatch('pvp','normal');
  const W=G.world;
  W.balls.forEach(b=>{ if(b.number!==0) b.active=false; });
  const cue=W.getBall('cue');
  cue.active=true; cue.pocketed=false; cue.pocketIndex=null;
  cue.x=cueXY[0]; cue.y=cueXY[1]; cue.vx=0; cue.vy=0;
  const t=W.addBall({id:'t1',number:1,x:tgtXY[0],y:tgtXY[1]});
  /* 玩家看到的辅助线：几何 ghost */
  const dx=pocketXY[0]-tgtXY[0], dy=pocketXY[1]-tgtXY[1], l=Math.hypot(dx,dy);
  const gx=tgtXY[0]-dx/l*2*R, gy=tgtXY[1]-dy/l*2*R;
  const ang=Math.atan2(gy-cueXY[1], gx-cueXY[0]);
  G.aimAngle=ang; G.aimTargetAngle=ang; G.phase='aim'; G.ballInHand=false;
  if(!G.shoot(power,0,0)) return {ok:false,why:'shoot blocked'};
  for(let i=0;i<1500;i++){ G.update(1/120); if(G.phase!=='shooting')break; }
  return {ok:!t.active, why:t.active?'球未落袋 停在['+t.x.toFixed(3)+','+t.y.toFixed(3)+']':''};
}

const LAYOUTS=[
 {n:'中袋 35cm',  cue:[1.27,0.85], tgt:[1.27,0.40], pk:[1.27,0]},
 {n:'中袋 1.2m',  cue:[1.27,1.05], tgt:[1.27,0.25], pk:[1.27,0]},
 {n:'中袋偏 20°', cue:[0.95,0.85], tgt:[1.22,0.42], pk:[1.27,0]},
 {n:'中袋偏 35°', cue:[0.80,0.75], tgt:[1.18,0.45], pk:[1.27,0]},
 {n:'角袋 30°',   cue:[1.60,0.85], tgt:[2.15,0.50], pk:[2.54,0]},
 {n:'角袋 45°',   cue:[1.40,0.95], tgt:[2.10,0.55], pk:[2.54,0]},
 {n:'左角袋 20°', cue:[0.55,0.95], tgt:[0.30,0.55], pk:[0,0]},
 {n:'底中袋 25°', cue:[0.95,0.95], tgt:[1.20,1.05], pk:[1.27,1.27]},
 {n:'远台直球',   cue:[0.25,0.635], tgt:[1.85,0.40], pk:[2.54,0]},
 {n:'薄 60°',     cue:[1.35,0.95], tgt:[2.00,0.55], pk:[2.54,0]}
];
const POWERS=[0.35,0.55,0.75,0.95];

for(const L of LAYOUTS){
  let ok=0;
  for(const pw of POWERS){
    const r=trial(L.cue,L.tgt,L.pk,pw);
    if(r.ok) ok++;
    else bad.push(L.n+' pw'+pw+' :: '+r.why);
  }
  if(ok===POWERS.length) pass++;
  else fail++;
  console.log('  '+L.n.padEnd(12)+(ok===POWERS.length?'✓':'✗')+' '+ok+'/'+POWERS.length+' 力度');
}
console.log('=== 玩家视角（辅助线瞄准 + 常规力度）===');
console.log('PASS: '+pass+'  FAIL: '+fail+'  （共 '+(LAYOUTS.length*POWERS.length)+' 杆）');
if(bad.length)console.log(bad.slice(0,8).join('\n'));
process.exit(fail?1:0);
