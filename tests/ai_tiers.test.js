/* 三档难度梯度验收
   两个维度，分别对应用户体感：
   A. 出手命中率：三档都必须接近 100%（不能"瞄了打不进"）
   B. 能力梯度：机会识别(敢出手比例) + 单次上手连续进球，必须 新手 < 陪练 < 高手
   固定种子，阈值留余量。 */
global.window=global;
for (const f of ['config','physics','levels','ai','game']) require('../js/'+f+'.js');
const P=window.Pool,AI=P.AI,C=P.CONFIG,R=C.table.ballRadius,W=C.table.width,H=C.table.height;
let pass=0,fail=0;const bad=[];
function ok(n,c,d){if(c)pass++;else{fail++;bad.push(n+' :: '+d);}}
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
function shotStats(diff,trials){
  let pot=0,made=0,safe=0;
  for(let i=0;i<trials*4&&(pot+safe)<trials;i++){
    const w=mkRack(7000+i*13,4);
    const ids=w.balls.filter(b=>b.number>0).map(b=>b.id);
    const an=AI.analyze(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:diff,ballInHand:false,maxTimeMs:300});
    const best=an.candidates&&an.candidates[0];
    if(!best||!(best.cutDeg<15&&best.dcg<0.7)) continue;
    const s=AI.chooseShot(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:diff,ballInHand:false,maxTimeMs:250,cuePower:1,cueSpin:1});
    if(s.plan==='safety'){ safe++; continue; }
    pot++;
    const w2=w.clone(), t=w2.getBall(s.ballId);
    w2.strike('cue',{angle:s.angle,power:s.power,spinX:s.spinX||0,spinY:s.spinY||0});
    for(let k=0;k<900;k++){w2.step(1/60);if(w2.allStopped())break;}
    if(!t.active)made++;
  }
  return {pot,safe,rate:pot?made/pot:0};
}
function runOut(diff,balls,seed){
  const w=mkRack(seed,balls);
  let pots=0;
  for(let i=0;i<12;i++){
    const ids=w.balls.filter(b=>b.active&&b.number>0).map(b=>b.id);
    if(!ids.length)break;
    let s=null;
    try{ s=AI.chooseShot(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:diff,ballInHand:false,maxTimeMs:250,cuePower:1,cueSpin:1}); }catch(e){break;}
    if(!s||s.plan==='safety')break;
    const before=w.balls.filter(b=>b.active&&b.number>0).length;
    w.strike('cue',{angle:s.angle,power:s.power,spinX:s.spinX||0,spinY:s.spinY||0});
    for(let k=0;k<900;k++){w.step(1/60);if(w.allStopped())break;}
    if(!w.getBall('cue').active)break;
    const after=w.balls.filter(b=>b.active&&b.number>0).length;
    if(after<before) pots+=(before-after); else break;
  }
  return pots;
}
function avgPots(diff,racks){ let tot=0; for(let i=0;i<racks;i++) tot+=runOut(diff,7,9000+i*17); return tot/racks; }

const S={},A={};
for(const d of ['easy','normal','hard']){ S[d]=shotStats(d,24); A[d]=avgPots(d,12); }

console.log('  出手命中率: easy='+(S.easy.rate*100).toFixed(0)+'%  normal='+(S.normal.rate*100).toFixed(0)+'%  hard='+(S.hard.rate*100).toFixed(0)+'%');
console.log('  敢出手/机会: easy='+S.easy.pot+'/'+(S.easy.pot+S.easy.safe)+'  normal='+S.normal.pot+'/'+(S.normal.pot+S.normal.safe)+'  hard='+S.hard.pot+'/'+(S.hard.pot+S.hard.safe));
console.log('  单次上手:   easy='+A.easy.toFixed(2)+'  normal='+A.normal.toFixed(2)+'  hard='+A.hard.toFixed(2));

/* A. 出手命中率：三档都不能"瞄了打不进" */
ok('新手出手命中率 >= 97%', S.easy.rate >= 0.97, (S.easy.rate*100).toFixed(1)+'%');
ok('职业陪练出手命中率 >= 97%', S.normal.rate >= 0.97, (S.normal.rate*100).toFixed(1)+'%');
ok('黑八高手出手命中率 >= 99%', S.hard.rate >= 0.99, (S.hard.rate*100).toFixed(1)+'%');

/* B. 机会识别梯度：越高档越敢打 */
ok('机会识别: 新手 <= 陪练', S.easy.pot <= S.normal.pot + 2, 'easy='+S.easy.pot+' normal='+S.normal.pot);
ok('机会识别: 陪练 <= 高手', S.normal.pot <= S.hard.pot + 2, 'normal='+S.normal.pot+' hard='+S.hard.pot);

/* C. 连续作战梯度 */
ok('单次上手: 新手 < 陪练', A.easy < A.normal - 0.8, 'easy='+A.easy.toFixed(2)+' normal='+A.normal.toFixed(2));
ok('单次上手: 陪练 < 高手', A.normal < A.hard - 0.8, 'normal='+A.normal.toFixed(2)+' hard='+A.hard.toFixed(2));
ok('职业陪练达到中上水平(>=2.8球/次)', A.normal >= 2.8, 'normal='+A.normal.toFixed(2));
ok('黑八高手具备清台能力(>=5.0球/次)', A.hard >= 5.0, 'hard='+A.hard.toFixed(2));

console.log('=== 三档梯度 ===');
console.log('PASS: '+pass+'  FAIL: '+fail);
if(bad.length)console.log(bad.join('\n'));
process.exit(fail?1:0);
