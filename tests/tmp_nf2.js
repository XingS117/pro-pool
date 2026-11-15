global.window=global;
for (const f of ['config','physics','levels','ai','game']) require('../js/'+f+'.js');
const P=window.Pool,AI=P.AI,C=P.CONFIG,R=C.table.ballRadius,W=C.table.width,H=C.table.height;
function mkRack(seed,n){
  let s=seed;
  const rnd=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};
  const w=new P.Physics.PhysicsWorld();
  w.addBall({id:'cue',number:0,x:0.30+rnd()*0.5,y:R+0.09+rnd()*(H-2*R-0.18)});
  const placed=[{x:w.getBall('cue').x,y:w.getBall('cue').y}];
  for(let k=1;k<=n;k++) for(let t2=0;t2<600;t2++){
    const x=R+0.07+rnd()*(W-2*R-0.14), y=R+0.07+rnd()*(H-2*R-0.14);
    let good=true;
    for(const b of placed) if(Math.hypot(b.x-x,b.y-y)<2*R+0.06){good=false;break;}
    if(!good)continue;
    for(const pk of w.pockets) if(Math.hypot(pk.x-x,pk.y-y)<pk.radius+R*2.5){good=false;break;}
    if(!good)continue;
    w.addBall({id:'b'+k,number:k,x:x,y:y}); placed.push({x,y}); break;
  }
  return w;
}
function canPot(w,s,pw){
  const w2=w.clone(),t=w2.getBall(s.ballId);
  if(!t) return false;
  w2.strike('cue',{angle:s.angle,power:pw,spinX:s.spinX||0,spinY:s.spinY||0});
  for(let k=0;k<900;k++){w2.step(1/60);if(w2.allStopped())break;}
  return !t.active;
}
let n=0,made=0;
for(let i=0;i<64&&n<16;i++){
  const w=mkRack(7000+i*13,4);
  const ids=w.balls.filter(b=>b.number>0).map(b=>b.id);
  const an=AI.analyze(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:'normal',ballInHand:false,maxTimeMs:300});
  const best=an.candidates&&an.candidates[0];
  if(!best||!(best.cutDeg<15&&best.dcg<0.7))continue;
  n++;
  const s=AI.chooseShot(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:'normal',ballInHand:false,maxTimeMs:250,cuePower:1,cueSpin:1});
  const ok=canPot(w,s,s.power);
  if(ok){made++;continue;}
  let lo=null,hi=null;
  for(let pw=0.08;pw<=1.0;pw+=0.01) if(canPot(w,s,pw)){if(lo===null)lo=pw;hi=pw;}
  console.log(JSON.stringify({
    cut:best.cutDeg, dcg:+best.dcg.toFixed(2), dtp:+best.dtp.toFixed(2), q:+best.quality.toFixed(2),
    plan:s.plan, power:+s.power.toFixed(3), spinY:+(s.spinY||0).toFixed(2),
    pottable:lo!==null, range:lo===null?null:[+lo.toFixed(2),+hi.toFixed(2)]
  }));
}
console.log('容易球',made+'/'+n);
