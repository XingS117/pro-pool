/* 全面体检：极端物理输入 + 长局状态机 + 自由球流程 */
global.window=global;
for (const f of ['config','physics','levels','ai','game']) require('../js/'+f+'.js');
const P=window.Pool,AI=P.AI,C=P.CONFIG,R=C.table.ballRadius,W=C.table.width,H=C.table.height;
const issues=[];
function note(kind,detail){ issues.push({kind,detail}); }
function finiteWorld(w){ for(const b of w.balls){ if(!isFinite(b.x)||!isFinite(b.y)||!isFinite(b.vx)||!isFinite(b.vy)||!isFinite(b._wx)||!isFinite(b._wy)||!isFinite(b._wz)) return false; } return true; }

/* ---- 1) 极端参数网格 ---- */
let grid=0,nan=0,stuck=0,outOfTable=0;
for(const sx of [-1,0,1]) for(const sy of [-1,0,1]) for(const pw of [0,0.03,0.5,1]) for(let ai=0;ai<8;ai++){
  const w=new P.Physics.PhysicsWorld();
  const cue=w.addBall({number:0,x:0.635,y:0.635});
  const ang=ai*Math.PI/4;
  w.strike('cue',{angle:ang,power:pw,spinX:sx,spinY:sy});
  grid++;
  let steps=0,maxOut=0;
  for(let i=0;i<3000;i++){
    w.step(1/600); steps++;
    if(!finiteWorld(w)){nan++;break;}
    const out=Math.max(R-cue.x,cue.x-(W-R),R-cue.y,cue.y-(H-R));
    if(out>maxOut)maxOut=out;
    if(w.allStopped())break;
  }
  if(!finiteWorld(w))note('NaN',{sx,sy,pw,ang});
  if(steps>=3000)stuck++;
  if(cue.active && maxOut>0.002)outOfTable++;
}

/* ---- 2) 长时间随机对局（真实 Game 状态机） ---- */
function newGame(){return new P.Game({save:{version:1,coins:0,stars:{},cleared:{},ownedCues:['oak'],equipped:'oak',settings:{guide:true,sound:false},record:{wins:0,losses:0,matches:0}},persist(){},audio:null,renderer:null});}
let seed=4242;function rnd(){seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;}
let matches=0,shots=0,phaseStuck=0,cueMissing=0,inconsistent=0,overCount=0;
for(let m=0;m<12;m++){
  const G=newGame();G.startMatch('pvp','normal');matches++;
  let guard=0;
  while(G.phase!=='over'&&guard++<400){
    if(G.phase==='aim'){
      if(G.ballInHand){
        // 随机尝试摆放，含非法坐标
        let placed=false;
        for(let t=0;t<20&&!placed;t++){
          const x=R+rnd()*(W-2*R),y=R+rnd()*(H-2*R);
          placed=G.placeCueAt(x,y);
        }
        if(!placed){ note('placeCueAllFailed',{m,guard}); break; }
      }
      const a=(rnd()-0.5)*Math.PI*2;
      G.aimAngle=a;G.aimTargetAngle=a;
      if(!G.shoot(0.05+rnd()*0.95,(rnd()*2-1),(rnd()*2-1))){
        note('shootFailed',{m,guard,phase:G.phase,bih:G.ballInHand}); break;
      }
      shots++;
    }
    for(let k=0;k<2000&&G.phase==='shooting';k++)G.update(1/120);
    if(G.phase==='shooting'){phaseStuck++;note('phaseStuck',{m,guard});break;}
    const cue=G.world.getBall('cue');
    if(!cue){cueMissing++;break;}
    // 状态一致性
    if(G.phase==='aim'&&cue.active===false&&!G.ballInHand){inconsistent++;note('cueInactiveButNoBallInHand',{m,guard});break;}
    if(G.ballInHand&&G.phase!=='aim'){inconsistent++;note('ballInHandOutsideAim',{m,guard,phase:G.phase});break;}
    const active=G.world.balls.filter(b=>b.active&&b.number>0).length;
    if(active<0||active>15){note('ballCount',{m,guard,active});}
  }
  if(G.phase==='over')overCount++;
}

/* ---- 3) 自由球：所有调用路径 ---- */
const G3=newGame();G3.startMatch('pvp','normal');
G3.enterBallInHand();
const c3=G3.world.getBall('cue');
if(!c3.active)note('ballInHandCueInactive',{});
if(!G3.ballInHand)note('ballInHandFlag',{});
if(!G3.isValidCuePos(c3.x,c3.y)&&c3.active)note('ballInHandCueIllegal',{pos:[c3.x,c3.y]});

console.log(JSON.stringify({
 grid:{cases:grid,nan,stuck,outOfTable},
 matches:{matches,shots,overCount,phaseStuck,cueMissing,inconsistent},
 issues:issues.slice(0,12),issueCount:issues.length
},null,1));
