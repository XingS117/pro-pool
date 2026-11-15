global.window=global;
for (const f of ['config','physics','levels','ai','game']) require('../js/'+f+'.js');
const P=window.Pool,AI=P.AI,C=P.CONFIG,R=C.table.ballRadius,W=C.table.width,H=C.table.height;
let s=1234; const rnd=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};
function rack(n){
  const w=new P.Physics.PhysicsWorld();
  w.addBall({id:'cue',number:0,x:0.30+rnd()*0.5,y:R+0.09+rnd()*(H-2*R-0.18)});
  for(let k=1;k<=n;k++) for(let t=0;t<600;t++){
    const x=R+0.07+rnd()*(W-2*R-0.14), y=R+0.07+rnd()*(H-2*R-0.14);
    let ok=true;
    for(const b of w.balls) if(Math.hypot(b.x-x,b.y-y)<2*R+0.06){ok=false;break;}
    if(!ok)continue;
    for(const pk of w.pockets) if(Math.hypot(pk.x-x,pk.y-y)<pk.radius+R*2.5){ok=false;break;}
    if(!ok)continue;
    w.addBall({id:'b'+k,number:k,x:x,y:y}); break;
  }
  return w;
}
for(const d of ['easy','normal','hard']){
  const times=[];
  for(let i=0;i<40;i++){
    const w=rack(15);
    const ids=w.balls.filter(b=>b.number>0).map(b=>b.id);
    const t0=Date.now();
    AI.chooseShot(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:d,ballInHand:false,maxTimeMs:250,cuePower:1,cueSpin:1});
    times.push(Date.now()-t0);
  }
  times.sort((a,b)=>a-b);
  console.log(d.padEnd(7),'avg',(times.reduce((a,b)=>a+b,0)/times.length).toFixed(1)+'ms',
    'p50',times[20]+'ms','p95',times[37]+'ms','max',times[times.length-1]+'ms');
}
