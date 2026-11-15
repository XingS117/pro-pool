/* 三档 AI 分难度基线：容易(切<15°且近) / 中等(15~40°) / 难(40°+或远) */
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
function classify(c){
  if(!c) return null;
  if(c.cutDeg<15 && c.dcg<0.7) return 'easy';
  if(c.cutDeg<40 && c.dcg<1.3) return 'mid';
  return 'hard';
}
function bench(diff,trials){
  const stat={easy:[0,0],mid:[0,0],hard:[0,0]};
  let maxMs=0;
  for(let i=0;i<trials*4;i++){
    const w=rack();
    const ids=w.balls.filter(b=>b.number>0).map(b=>b.id);
    if(!ids.length) continue;
    const an=AI.analyze(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:diff,ballInHand:false,maxTimeMs:300});
    const best=an.candidates&&an.candidates[0];
    const cls=classify(best);
    if(!cls) continue;
    if(stat[cls][0]>=22) continue;
    const t0=Date.now();
    const s=AI.chooseShot(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:diff,ballInHand:false,maxTimeMs:250,cuePower:1,cueSpin:1});
    const ms=Date.now()-t0; if(ms>maxMs)maxMs=ms;
    if(!s) continue;
    stat[cls][0]++;
    const w2=w.clone(), t=w2.getBall(s.ballId);
    w2.strike('cue',{angle:s.angle,power:s.power,spinX:s.spinX||0,spinY:s.spinY||0});
    for(let k=0;k<900;k++){w2.step(1/60);if(w2.allStopped())break;}
    if(!t.active) stat[cls][1]++;
  }
  const out={};
  for(const k of ['easy','mid','hard']){
    const [n,m]=stat[k];
    out[k]=n?{n,rate:+(m/n*100).toFixed(1)}:{n:0,rate:null};
  }
  out.maxMs=maxMs;
  return out;
}
const D={};
for(const d of ['easy','normal','hard']) D[d]=bench(d,30);
console.log(JSON.stringify(D,null,1));
console.log('\n=== 汇总 ===');
console.log('level  | 容易(切<15近) | 中等(15~40) | 难(40+或远)');
for(const d of ['easy','normal','hard']){
  const r=D[d];
  const f=x=>x.rate===null?'--':x.rate+'% ('+x.n+')';
  console.log(d.padEnd(7),'|',String(f(r.easy)).padEnd(13),'|',String(f(r.mid)).padEnd(11),'|',f(r.hard));
}
