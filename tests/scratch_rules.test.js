/* Scratch behavior at corner/side mouths and level completion precedence. */
global.window=global;for(const f of ['config','physics','levels','ai','game'])require('../js/'+f+'.js');
const P=global.Pool,C=P.CONFIG,fail=[];const ok=(x,m)=>{if(!x)fail.push(m)};
function make(){return new P.Game({save:{version:1,coins:100,stars:{},cleared:{},ownedCues:['oak'],equipped:'oak',settings:{guide:true,sound:false},record:{wins:0,losses:0,matches:0}},persist(){}})}
// Side pocket: genuine center entry captures; a grazing exit outside its radius stays live.
{
 const w=new P.Physics.PhysicsWorld();const b=w.addBall({number:0,x:1.27,y:.14});b.vx=0;b.vy=-1;for(let i=0;i<200&&!b.pocketed;i++)w.step(1/600);ok(b.pocketed&&b.pocketIndex===1,'center-line side-pocket entry captured');
 const w2=new P.Physics.PhysicsWorld();const g=w2.addBall({number:0,x:1.34,y:.18});g.vx=0;g.vy=-3;w2.step(.05);ok(g.active&&!g.pocketed&&g.y>=0&&g.y<.06,'side-mouth graze is not miscaptured');
}
// Out-of-play cue scratch creates a true foul and reserves ball-in-hand; do not move its in-play coordinate.
{
 const g=make();g.startMatch('pvp');g.breakShot=false;g.activePlayer=0;g.shotCtx={isBreak:false,firstHitId:'b1',cuePotted:false,potted:[],railBalls:{},preGroup:null,preGroupCleared:false,preTargets:['b1'],power:.5,angle:0,spinX:0,spinY:0};
 g.phase='shooting';g.shots=1;g.shotsByPlayer=[1,0];g.world.stopAll();const cue=g.world.getBall('cue');cue.x=1.3;cue.y=.2;cue.vx=0;cue.vy=-4;cue._moving=true;
 for(let i=0;i<60&&g.phase==='shooting';i++)g.update(1/120);
 ok(g.phase==='aim'&&g.ballInHand,'cue scratch enters ball-in-hand');ok(g.activePlayer===1,'cue scratch switches player');ok(cue.active&&cue.x>=g.world.ballRadius&&cue.y>=g.world.ballRadius&&g.ballInHand,'ball-in-hand retains a safe displayed cue');
}
// Clearing the final target while scratching still incurs a foul and does not bypass the scratch rule.
{
 const g=make();g.startLevel('l1');g.ballInHand=false;g.shots=0;g.shotCtx={cuePotted:true,potted:[g.world.getBall('b1')],firstHitId:'b1',isBreak:false,power:.5,angle:0,spinX:0,spinY:0};g.world.getBall('b1').active=false;g.world.getBall('b1').pocketed=true;g.resolveLevelShot();ok(g.phase==='aim'&&g.ballInHand&&!g.levelResult,'last-target pocket plus scratch does not clear level');
}
if(fail.length){console.error(fail.join('\n'));process.exit(1)}console.log('SCRATCH RULE TESTS PASSED');
