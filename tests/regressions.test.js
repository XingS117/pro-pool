/* 历次回归 bug 固化：每次改动后跑这个文件，确保不再复现 */
global.window=global;
for (const f of ['config','physics','levels','ai','game']) require('../js/'+f+'.js');
const P=window.Pool,AI=P.AI,C=P.CONFIG,R=C.table.ballRadius;
let pass=0,fail=0;const bad=[];
function ok(name,cond,detail){ if(cond)pass++; else {fail++;bad.push(name+' :: '+detail);} }
function newGame(){return new P.Game({save:{version:1,coins:0,stars:{},cleared:{},ownedCues:['oak'],equipped:'oak',settings:{guide:true,sound:false},record:{wins:0,losses:0,matches:0}},persist(){},audio:null,renderer:null});}
function setShot(G){ G.phase='shooting';G.shotTime=0;
  G.shotCtx={isBreak:false,firstHitId:null,cuePotted:false,potted:[],railBalls:{},preGroup:null,preGroupCleared:false,preTargets:[],power:0.6,angle:0,spinX:0,spinY:0}; }
function runToAim(G,maxFrames){ let prev=[];for(let i=0;i<(maxFrames||2000);i++){G.update(1/120);if(G.phase!=='shooting')break;} }

/* 1) 母球停在袋口不得瞬移回开球点（第十四轮） */
{
  const G=newGame();G.startMatch('pvp','normal');
  const c=G.world.getBall('cue');c.x=0.45;c.y=0.95;
  const dx=-0.45,dy=0.32,l=Math.hypot(dx,dy);
  c.vx=dx/l*0.9;c.vy=dy/l*0.9;c._moving=true;c._wx=0;c._wy=0;c._wz=0;c._sx=0;
  setShot(G);let jumps=0,px=c.x,py=c.y;
  for(let i=0;i<2000;i++){G.update(1/120);if(Math.hypot(c.x-px,c.y-py)>0.08)jumps++;px=c.x;py=c.y;if(G.phase!=='shooting')break;}
  ok('母球停袋口不瞬移',jumps===0&&c.active,'jumps='+jumps+' pos=['+c.x.toFixed(3)+','+c.y.toFixed(3)+']');
}

/* 2) 母球真落袋 → 自由球，且母球在合法位置（第十四轮） */
{
  const G=newGame();G.startMatch('pvp','normal');
  const c=G.world.getBall('cue');
  c.active=false;c.pocketed=true;c.pocketIndex=2;c.x=2.5;c.y=1.24;c.vx=0;c.vy=0;
  G.enterBallInHand();
  ok('真落袋给自由球',G.ballInHand===true&&c.active===true,'bih='+G.ballInHand+' active='+c.active);
  ok('自由球母球位置合法',G.isValidCuePos(c.x,c.y),'pos=['+c.x.toFixed(3)+','+c.y.toFixed(3)+']');
}

/* 3) 中杆/高杆/低杆三态（第十轮） */
{
  function afterHit(sy){
    const w=new P.Physics.PhysicsWorld();
    const cue=w.addBall({number:0,x:0.35,y:0.635});w.addBall({number:1,x:0.78,y:0.635});
    w.strike('cue',{angle:0,power:0,speed:2.6,spinX:0,spinY:sy});
    let hx=null;for(let i=0;i<6000;i++){w.step(1/600);if(hx===null&&w.events.some(e=>e.type==='ball-hit'))hx=cue.x;
      if(hx!==null&&Math.hypot(cue.vx,cue.vy)<1e-6)break;w.clearEvents();}
    return cue.x-hx;
  }
  const c=afterHit(0),t=afterHit(1),b=afterHit(-1);
  ok('高杆跟进 > 中杆',t>c+0.2,'top='+t.toFixed(3)+' center='+c.toFixed(3));
  ok('低杆回缩 < 0',b<-0.1,'bottom='+b.toFixed(3));
  ok('中杆近似定杆',Math.abs(c)<0.2,'center='+c.toFixed(3));
}

/* 4) 球杆系数：AI 输出 power 乘 cuePower 后必须仍能进（第十三轮） */
{
  const w=new P.Physics.PhysicsWorld();
  w.addBall({id:'cue',number:0,x:0.5,y:0.635});w.addBall({id:'b1',number:1,x:1.4,y:0.635});
  for(const cp of [0.94,1.0,1.15,1.24]){
    const s=AI.chooseShot(w,{cueBallId:'cue',group:'solid',targetIds:['b1'],difficulty:'hard',ballInHand:false,maxTimeMs:300,cuePower:cp,cueSpin:1});
    const w2=w.clone(),t=w2.getBall('b1');
    w2.strike('cue',{angle:s.angle,power:s.power*cp,spinX:s.spinX||0,spinY:s.spinY||0});
    for(let i=0;i<900;i++){w2.step(1/60);if(w2.allStopped())break;}
    ok('球杆系数 '+cp+' 仍能进',!t.active,'cp='+cp+' power='+s.power.toFixed(3));
  }
}

/* 5) 袋口不颤抖（第七轮） */
{
  let worst=0;
  for(const st of [[0.45,1.0],[0.25,0.25],[1.0,0.30]]) for(const ang of [200,225,260]) for(const sp of [1.2,3.0,4.5]){
    const w=new P.Physics.PhysicsWorld(),q=w.addBall({number:5,x:st[0],y:st[1]});
    const a=ang*Math.PI/180;q.vx=Math.cos(a)*sp;q.vy=Math.sin(a)*sp;q._wx=0;q._wy=0;q._wz=0;q._sx=0;q._moving=true;
    let f=0;for(let i=0;i<7200;i++){const vx=q.vx,vy=q.vy;w.step(1/600);if(!q.active)break;
      if(vx*q.vx<0||vy*q.vy<0)f++;if(Math.hypot(q.vx,q.vy)<1e-6)break;}
    if(f>worst)worst=f;
  }
  ok('袋口无高频颤抖',worst<=8,'maxFlips='+worst);
}

/* 6) 高速擦袋口不误判落袋（第十四轮） */
{
  const w=new P.Physics.PhysicsWorld(),b=w.addBall({number:1,x:1.34,y:0.18});
  b.vx=0;b.vy=-3;b._wx=0;b._wy=0;b._wz=0;b._moving=true;
  for(let i=0;i<12;i++)w.step(0.02);
  ok('擦袋口不误判落袋',b.active===true&&b.pocketed===false,'active='+b.active+' pocketed='+b.pocketed);
}

console.log('=== 历次回归固化 ===');
console.log('PASS: '+pass+'  FAIL: '+fail);
if(bad.length)console.log(bad.join('\n'));
process.exit(fail?1:0);
