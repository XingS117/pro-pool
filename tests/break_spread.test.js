/* Real simulation: full break moves every ball, weak and missed breaks stay physical. */
const assert = require('node:assert/strict');
global.window = global;
for (const f of ['config','physics','levels','ai','game']) require('../js/'+f+'.js');
function run(power, angle=0, ordinary=false) {
 const g=new Pool.Game({persist(){},renderer:null,audio:null});
 g.startMatch('pvp','normal'); if(ordinary) g.breakShot=false;
 g.aimAngle=angle; g.aimTargetAngle=angle;
 const balls=g.world.balls.filter(b=>b.number>0);
 const stats=balls.map(b=>({n:b.number,x:b.x,y:b.y,path:0,max:0,peak:0,first:null}));
 g.shoot(power,0,0);
 const initialSpeed=Math.hypot(g.world.getBall('cue').vx,g.world.getBall('cue').vy);
 for(let frame=0;frame<1080 && g.phase==='shooting';frame++) {
  const prev=balls.map(b=>[b.x,b.y]); g.update(1/60);
  balls.forEach((b,i)=>{const s=stats[i];s.path+=Math.hypot(b.x-prev[i][0],b.y-prev[i][1]);s.max=Math.max(s.max,Math.hypot(b.x-s.x,b.y-s.y));s.peak=Math.max(s.peak,Math.hypot(b.vx,b.vy));if(s.first===null && s.path>.001)s.first=frame/60;});
 }
 return {g,stats,initialSpeed};
}
const weak=run(.2), mid=run(.5), full=run(1);
assert(weak.initialSpeed < mid.initialSpeed && mid.initialSpeed < full.initialSpeed, 'break speed must increase with power');
assert(!weak.g.shotCtx.breakImpulseApplied && !mid.g.shotCtx.breakImpulseApplied,'weak breaks must not get forced spread');
assert(full.g.shotCtx.breakImpulseApplied,'full break applies impulse after contact');
for(const s of full.stats){assert(s.max>=.10, 'ball '+s.n+' must visibly move >=10cm: '+s.max);assert(s.peak>=.5,'ball '+s.n+' must receive force');}
for(const angle of [-.01,.01]) { const r=run(1,angle);for(const s of r.stats)assert(s.max>=.10,'off-centre ball '+s.n+' max displacement '+s.max); }
const miss=run(1,Math.PI/2);assert(!miss.g.shotCtx.breakImpulseApplied,'miss cannot wake rack');
const ordinary=run(1,0,true);assert(!ordinary.g.shotCtx.breakImpulseApplied,'ordinary shots cannot use break assistance');
console.log(JSON.stringify({weakSpeed:weak.initialSpeed,midSpeed:mid.initialSpeed,fullSpeed:full.initialSpeed,fullBallStats:full.stats},null,2));
console.log('BREAK SPREAD TESTS PASSED');
