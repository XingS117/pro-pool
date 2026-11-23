/* 在线对战双端一致性 e2e：两个浏览器客户端连同一信令服务器，
   验证 A 的出杆参数经服务器转发给 B 后，两端物理结果逐位一致。 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const WebSocket = require('../server/node_modules/ws');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 18788;
const proc = spawn(process.execPath, [path.join(ROOT,'server','pool-ws.mjs')], {
  env:{...process.env,POOL_WS_PORT:String(PORT),POOL_WS_HOST:'127.0.0.1'}, stdio:['ignore','pipe','pipe'] });
let pass=0,fail=0; const bad=[];
function ok(n,c,d){if(c)pass++;else{fail++;bad.push(n+' :: '+(d||''));}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function cli(){return new Promise((res,rej)=>{const ws=new WebSocket(`ws://127.0.0.1:${PORT}`);const q=[];const w=[];
  ws.on('message',raw=>{const m=JSON.parse(raw.toString());const i=w.findIndex(x=>x.p(m));if(i>=0){const it=w.splice(i,1)[0];clearTimeout(it.t);it.r(m);}else q.push(m);});
  ws.on('open',()=>res({ws,s:o=>ws.send(JSON.stringify(o)),
    n:(p,ms=5000)=>new Promise(r=>{const i=q.findIndex(p);if(i>=0)return r(q.splice(i,1)[0]);
      const it={p,r,t:setTimeout(()=>{const k=w.indexOf(it);if(k>=0)w.splice(k,1);r({_timeout:true,type:'__timeout__'})},ms)};w.push(it);})}));
  ws.on('error',rej);});}
await sleep(900);
global.window = global;   // core.js 是浏览器经典 script，Node 下需先建 window
let A,B;
try{
  A=await cli();B=await cli();
  A.s({type:'create_room'});const cr=await A.n(m=>m.type==='room_created');
  ok('房间号4位纯数字',/^\d{4}$/.test(cr.code),cr.code);
  B.s({type:'join_room',code:cr.code});const bj=await B.n(m=>m.type==='room_joined');
  await A.n(m=>m.type==='start');await B.n(m=>m.type==='start');
  ok('双方开局成功',bj.seat===1,String(bj.seat));
  // 模拟 A 的 5 杆，参数经服务器转发给 B，两端各自跑物理后对比球位哈希
  const SHOTS=[{angle:0,power:1,spinX:0,spinY:0.1},{angle:0.3,power:0.7,spinX:0.2,spinY:-0.2},
               {angle:-0.5,power:0.85,spinX:-0.3,spinY:0.4},{angle:0.1,power:0.6,spinX:0,spinY:0},
               {angle:0.25,power:0.9,spinX:0.5,spinY:-0.5}];
  for(let i=0;i<SHOTS.length;i++){
    // 两端用相同初始局面各自跑同一杆
    // 在 Node 里直接加载 core（与网页/小游戏同一份物理）
    if(!global.__coreLoaded){
      const code=ROOT+'/wechat-minigame/core.js';
      delete require.cache[require.resolve(code)];
      require(code); global.__coreLoaded=true;
    }
    const P=global.window.Pool;
    const w1=new P.Physics.PhysicsWorld();
    const R=P.CONFIG.table.ballRadius,W=P.CONFIG.table.width,H=P.CONFIG.table.height;
    w1.addBall({id:'cue',number:0,x:W*0.25,y:H/2});
    let n=1;const gap=2*R+0.001;
    for(let r=0;r<5;r++)for(let k=0;k<=r;k++){w1.addBall({id:'b'+n,number:n,x:W*0.75+r*gap*0.866,y:H/2+(k-r/2)*gap});n++;}
    // 先推进到第 i 杆的局面（前面 i 杆已在 w1 里）
    const sh=SHOTS[i];
    w1.strike('cue',{angle:sh.angle,power:sh.power,spinX:sh.spinX,spinY:sh.spinY});
    for(let k=0;k<3600;k++){w1.step(1/600);if(w1.allStopped())break;}
    // 服务器转发参数
    A.s({type:'shot',version:i,angle:sh.angle,power:sh.power,spinX:sh.spinX,spinY:sh.spinY});
    const got=await B.n(m=>m.type==='opponent_shot',5000);
    ok('第'+(i+1)+'杆参数经服务器转发一致',got.angle===sh.angle&&got.power===sh.power&&!got._timeout,JSON.stringify(got));
    // B 用收到的参数在相同局面跑物理 → 逐位对比
    const w2=new P.Physics.PhysicsWorld();
    w2.addBall({id:'cue',number:0,x:W*0.25,y:H/2});
    n=1;for(let r=0;r<5;r++)for(let k=0;k<=r;k++){w2.addBall({id:'b'+n,number:n,x:W*0.75+r*gap*0.866,y:H/2+(k-r/2)*gap});n++;}
    w2.strike('cue',{angle:got.angle,power:got.power,spinX:got.spinX,spinY:got.spinY});
    for(let k=0;k<3600;k++){w2.step(1/600);if(w2.allStopped())break;}
    let same=true;
    for(let j=0;j<w1.balls.length;j++)for(const f of ['x','y','vx','vy'])
      if(+w1.balls[j][f].toFixed(9)!==+w2.balls[j][f].toFixed(9))same=false;
    ok('第'+(i+1)+'杆两端球位逐位一致',same);
    A.s({type:'swap',seat:0});await sleep(350);
  }
}catch(e){fail++;bad.push('EXCEPTION :: '+String(e&&e.stack||e).slice(0,300));}
try{A&&A.ws.close();}catch(e){}try{B&&B.ws.close();}catch(e){}
proc.kill();await sleep(200);
console.log('=== 在线双端一致性 e2e ===');
console.log('PASS: '+pass+'  FAIL: '+fail);
if(bad.length)console.log(bad.join('\n'));
process.exit(fail?1:0);