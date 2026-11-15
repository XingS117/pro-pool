global.window=global; require('../js/config.js'); require('../js/physics.js'); require('../js/levels.js'); require('../js/ai.js'); require('../js/game.js');
const Pool=global.Pool;
let fail=[]; const ok=(c,m)=>{ if(!c) fail.push(m); else console.log('OK',m); };
function save(){return {coins:0,stars:{},cleared:{},ownedCues:['oak'],equipped:'oak',settings:{guide:true,sound:false},record:{wins:0,losses:0,matches:0}};}
function clearLevel(lv){
  const g=new Pool.Game({save:save(),persist(){},renderer:null,audio:null});
  g.startLevel(lv);
  for(const b of g.world.balls) if(b.id!=='cue'){b.active=false;b.pocketed=true;}
  g.shots=g.level.par;
  g.shotCtx={firstHitId:'b1',potted:[],cuePotted:false,railAfterContact:false,isBreak:false,preGroup:null,preGroupCleared:false,preOpen:true,preTargets:[],power:.4,angle:0,spinX:0,spinY:0};
  g.resolveLevelShot();
  return g;
}
for(const [lv,id] of [['l4','maple'],['l8','carbon'],['l12','gold']]){
  const g=clearLevel(lv);
  ok(g.save.ownedCues.includes(id), lv+' grants '+id);
  ok(g.levelResult && g.levelResult.cueReward && g.levelResult.cueReward.id===id, lv+' result cueReward');
  console.log('  result', JSON.stringify(g.levelResult));
}
// replay does not duplicate
const l4=clearLevel('l4');
const before=l4.save.ownedCues.length;
l4.startLevel('l4');
for(const b of l4.world.balls) if(b.id!=='cue'){b.active=false;b.pocketed=true;}
l4.shots=l4.level.par;
l4.shotCtx={firstHitId:'b1',potted:[],cuePotted:false,railAfterContact:false,isBreak:false,preGroup:null,preGroupCleared:false,preOpen:true,preTargets:[],power:.4,angle:0,spinX:0,spinY:0};
l4.resolveLevelShot();
ok(l4.levelResult.cueReward===null,'replay no duplicate cue reward');
// compensation test
(function(){
  const g=new Pool.Game({save:save(),persist(){},renderer:null,audio:null});
  g.save.ownedCues=['oak','maple']; g.save.equipped='maple';
  g.startLevel('l4');
  g.ballInHand=false;
  for(const b of g.world.balls) if(b.id!=='cue'){b.active=false;b.pocketed=true;}
  g.shots=g.level.par;
  g.shotCtx={firstHitId:'b1',potted:[],cuePotted:false,railAfterContact:false,isBreak:false,preGroup:null,preGroupCleared:false,preOpen:true,preTargets:[],power:.4,angle:0,spinX:0,spinY:0};
  const coinsBefore=g.save.coins;
  g.resolveLevelShot();
  ok(g.levelResult.cueRewardCoins===300,'owned reward cue gives 300 coins compensation, got '+g.levelResult.cueRewardCoins);
  ok(g.save.coins===coinsBefore+180+300,'coins include clear reward + compensation, got '+g.save.coins);
})();
if(fail.length){console.error('FAIL',fail);process.exit(1);} console.log('REWARD TESTS PASSED');