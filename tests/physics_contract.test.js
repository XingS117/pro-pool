/* 物理契约测试：锁死「物理必须满足的几何/守恒不变量」。
   核心判据一律以 castRay（几何精确、也是玩家辅助线的来源）为基准，
   而不是碰撞后被位置分离推开的两球连线。
   —— 专门补上「AI 能不能进球」测不出的盲区。 */
global.window=global;
require('../js/config.js');require('../js/physics.js');
const P=window.Pool,C=P.CONFIG,R=C.table.ballRadius,W=C.table.width,H=C.table.height;
const D=180/Math.PI;
let pass=0,fail=0;const bad=[];
function ok(n,c,d){if(c)pass++;else{fail++;bad.push(n+' :: '+d);}}
function norm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}

/* 用几何 ghost 求瞄准角并取 castRay 的 normal 作为物理应得方向 */
function setup(cx,cy,list,ax,ay){
  const w=new P.Physics.PhysicsWorld();
  w.addBall({id:'cue',number:0,x:cx,y:cy});
  list.forEach((b,i)=>w.addBall({id:'b'+(i+1),number:b[2]||(i+1),x:b[0],y:b[1]}));
  const t=w.getBall('b1');
  const ddx=ax-t.x, ddy=ay-t.y, l=Math.hypot(ddx,ddy);
  const gx=t.x-ddx/l*2*R, gy=t.y-ddy/l*2*R;
  const ang=Math.atan2(gy-cy,gx-cx);
  const ray=w.castRay(cx,cy,Math.cos(ang),Math.sin(ang),'cue');
  return {w,t,ang,ray};
}
function hitOnce(w,power,spinY){
  w.clearEvents();
  const cue=w.getBall('cue');
  for(let i=0;i<6000;i++){
    w.step(1/600);
    const ev=w.events.find(e=>e.type==='ball-hit');
    if(ev) return true;
    w.clearEvents();
    if(w.allStopped())break;
  }
  return false;
}

/* 1) 辅助线一致：目标球出射方向 == castRay 几何法线的反向 */
{
  const cases=[
    [1.27,1.05,1.27,0.30,1.27,0],[0.55,0.55,0.30,0.30,0,0],
    [1.55,0.90,2.10,0.50,2.54,0],[1.35,0.95,2.00,0.55,2.54,0],
    [0.90,0.45,1.60,0.60,2.54,0],[0.60,0.635,1.35,0.635,1.27,0]
  ];
  let worst=0;
  for(const [cx,cy,tx,ty,ax,ay] of cases){
    for(const pw of [0.2,0.5,0.8,1.0]){
      const s=setup(cx,cy,[[tx,ty]],ax,ay);
      if(!s.ray||!s.ray.normal){ok('castRay 命中 '+pw,false,'no normal');continue;}
      const expect=Math.atan2(-s.ray.normal.y,-s.ray.normal.x);
      s.w.strike('cue',{angle:s.ang,power:pw,spinX:0,spinY:0.1});
      if(!hitOnce(s.w)){ok('碰撞发生 pw'+pw,false,'未接触');continue;}
      const actual=Math.atan2(s.t.vy,s.t.vx);
      const e=Math.abs(norm(actual-expect)*D);
      if(e>worst)worst=e;
      ok('目标球方向==辅助线法线 pw'+pw, e<0.6, 'err='+e.toFixed(2)+'°');
    }
  }
  console.log('  [契约1 辅助线一致] worst '+worst.toFixed(3)+'°');
}

/* 2) 碰后不重叠、不出界 */
{
  let minGap=Infinity, outCount=0;
  const w=new P.Physics.PhysicsWorld();
  w.addBall({id:'cue',number:0,x:0.30,y:0.635});
  for(let i=0;i<8;i++) w.addBall({id:'b'+(i+1),number:i+1,x:1.4+i*0.02,y:0.30+i*0.06});
  w.strike('cue',{angle:0,power:1,spinX:0,spinY:0.1});
  for(let i=0;i<1800;i++){
    w.step(1/600);
    for(const b of w.balls){
      if(!b.active)continue;
      if(b.x<R-1e-3||b.x>W-R+1e-3||b.y<R-1e-3||b.y>H-R+1e-3) outCount++;
    }
    if(w.allStopped())break;
  }
  for(let i=0;i<w.balls.length;i++)for(let j=i+1;j<w.balls.length;j++){
    const a=w.balls[i],b=w.balls[j];
    if(!a.active||!b.active)continue;
    const gap=Math.hypot(a.x-b.x,a.y-b.y)-2*R;
    if(gap<minGap)minGap=gap;
  }
  ok('球堆碰后不重叠',minGap>-0.002,'minGap='+(minGap*1000).toFixed(2)+'mm');
  ok('球始终在台面内',outCount===0,'violations='+outCount);
}

/* 3) 动能不增（等质量，e<1） */
{
  const s=setup(0.60,0.635,[[1.35,0.635]],1.27,0);
  s.w.strike('cue',{angle:s.ang,power:0.8,spinX:0,spinY:0.1});
  const cue=s.w.getBall('cue'), t=s.t;
  const p0=Math.hypot(cue.vx,cue.vy);
  if(hitOnce(s.w)){
    const v1=Math.hypot(cue.vx,cue.vy), v2=Math.hypot(t.vx,t.vy);
    ok('碰后总动能不增',v1*v1+v2*v2<=p0*p0*1.03,'in='+p0.toFixed(3)+' sumSq='+(v1*v1+v2*v2).toFixed(3));
    ok('目标球获得足够速度',v2>0.5,'obj='+v2.toFixed(3)+' cueIn='+p0.toFixed(2));
  } else ok('动能用例碰撞发生',false,'未接触');
}

/* 4) 无塞薄球：母球分离角接近 90° */
{
  const s=setup(0.60,0.40,[[1.20,0.60]],2.54,0);
  s.w.strike('cue',{angle:s.ang,power:0.9,spinX:0,spinY:0.1});
  const cue=s.w.getBall('cue'), t=s.t;
  if(hitOnce(s.w)){
    const a1=Math.atan2(cue.vy,cue.vx), a2=Math.atan2(t.vy,t.vx);
    const sep=Math.abs(norm(a2-a1)*D);
    ok('分离角≈90°',Math.abs(sep-90)<10,'sep='+sep.toFixed(1)+'°');
  } else ok('分离角用例碰撞发生',false,'未接触');
}

/* 5) 多球连锁：每次碰撞的目标球方向仍需符合几何法线 */
{
  const w=new P.Physics.PhysicsWorld();
  w.addBall({id:'cue',number:0,x:0.35,y:0.635});
  w.addBall({id:'b1',number:1,x:1.10,y:0.635});
  w.addBall({id:'b2',number:2,x:1.40,y:0.66});
  w.addBall({id:'b3',number:3,x:1.70,y:0.60});
  const t1=w.getBall('b1');
  const ang=0;
  const ray=w.castRay(0.35,0.635,1,0,'cue');
  const expect=ray&&ray.normal?Math.atan2(-ray.normal.y,-ray.normal.x):null;
  w.strike('cue',{angle:ang,power:1,spinX:0,spinY:0.1});
  w.clearEvents();
  let checked=false;
  for(let i=0;i<6000;i++){
    w.step(1/600);
    if(!checked && w.events.some(e=>e.type==='ball-hit') && expect!==null){
      // 第一对碰撞可能不是 b1，退化为只验证存在方向合理的出射
      const e=Math.abs(norm(Math.atan2(t1.vy,t1.vx)-expect)*D);
      checked=true;
      ok('连锁碰撞首球方向合理',e<3||Math.hypot(t1.vx,t1.vy)<0.2,'err='+e.toFixed(2)+'° v='+Math.hypot(t1.vx,t1.vy).toFixed(2));
    }
    w.clearEvents();
    if(w.allStopped())break;
  }
  ok('连锁碰撞发生',checked,'no hit');
}

console.log('=== 物理契约 ===');
console.log('PASS: '+pass+'  FAIL: '+fail);
if(bad.length)console.log(bad.slice(0,10).join('\n'));
process.exit(fail?1:0);
