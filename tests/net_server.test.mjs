/* 信令服务器集成测试：4 位纯数字房间 / 建房加入 / 出杆 / 换手 / 重连 / 销毁 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const WebSocket = require('../server/node_modules/ws');
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 18787;
const proc = spawn(process.execPath, [path.join(ROOT, 'server', 'pool-ws.mjs')], {
  env: { ...process.env, POOL_WS_PORT: String(PORT), POOL_WS_HOST: '127.0.0.1', POOL_WS_NO_BUSY: '1' },
  stdio: ['ignore','pipe','pipe']
});
let pass = 0, fail = 0; const bad = [];
function ok(n,c,d){ if(c) pass++; else { fail++; bad.push(n+' :: '+(d||'')); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
function open() {
  return new Promise((res, rej) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
    const inbox = []; const waiters = [];
    ws.on('message', raw => { const m = JSON.parse(raw.toString()); const w = waiters.find(x => x.pred(m)); if (w) { waiters.splice(waiters.indexOf(w),1); clearTimeout(w.t); w.res(m); } else inbox.push(m); });
    ws.on('open', () => res({
      ws, send: o => ws.send(JSON.stringify(o)),
      next: (pred, ms=4000) => new Promise((resolve, reject) => {
        const i = inbox.findIndex(pred); if (i >= 0) return resolve(inbox.splice(i,1)[0]);
        const w = { pred, res: resolve, t: setTimeout(() => { const k = waiters.indexOf(w); if (k>=0) waiters.splice(k,1); resolve({ type: '__timeout__', _timeout: true }); }, ms) };
        waiters.push(w);
      }),
      drain: (pred) => { const out = []; for (let i = inbox.length - 1; i >= 0; i--) if (pred(inbox[i])) out.push(inbox.splice(i,1)[0]); return out; }
    }));
    ws.on('error', rej);
  });
}
await sleep(900);
let A, B;
try {
  A = await open(); B = await open();
  // 1) 建房 → 4 位纯数字
  A.send({ type: 'create_room' });
  const created = await A.next(m => m.type === 'room_created');
  ok('建房返回房间号', !!created.code, JSON.stringify(created));
  ok('房间号为 4 位纯数字', /^\d{4}$/.test(created.code), created.code);
  ok('座位码已生成', !!created.seatCode && created.seatCode.length === 8, created.seatCode);
  ok('建房者座位 0', created.seat === 0, String(created.seat));
  const code = created.code;
  // 2) 加入
  B.send({ type: 'join_room', code });
  const joined = await B.next(m => m.type === 'room_joined');
  ok('加入成功座位 1', joined.seat === 1, String(joined.seat));
  const startB = await B.next(m => m.type === 'start');
  const startA = await A.next(m => m.type === 'start');
  ok('双方收到 start', startB.firstPlayer === 0 && startA.firstPlayer === 0);
  // 3) 错误房间号
  const C = await open();
  C.send({ type: 'join_room', code: 'ABCDE' });
  const e1 = await C.next(m => m.type === 'error');
  ok('非数字房间号被拒', e1.code === 'BAD_CODE', e1.code);
  C.send({ type: 'join_room', code: '9999' });
  const e2 = await C.next(m => m.type === 'error');
  ok('不存在房间被拒', e2.code === 'NO_ROOM', e2.code);
  C.ws.close();
  // 4) 非回合方出杆被拒
  B.send({ type: 'shot', version: 0, angle: 0.1, power: 0.5, spinX: 0, spinY: 0 });
  const e3 = await B.next(m => m.type === 'error');
  ok('非回合方出杆被拒', e3.code === 'NOT_YOUR_TURN', e3.code);
  // 5) 回合方出杆 → 对方收到
  A.send({ type: 'shot', version: 0, angle: 0.35, power: 0.8, spinX: 0.2, spinY: -0.1 });
  const shot = await B.next(m => m.type === 'opponent_shot');
  ok('出杆转发给对手', shot.angle === 0.35 && shot.power === 0.8 && shot.spinX === 0.2 && shot.spinY === -0.1, JSON.stringify(shot));
  ok('出杆带版本号', shot.version === 0, String(shot.version));
  // 6) 换手（进球继续场景：客户端上报 seat=0 保持先手）
  A.send({ type: 'swap', seat: 0 }); await sleep(450);
  A.send({ type: 'shot', version: 1, angle: 0.2, power: 0.6, spinX: 0, spinY: 0 });
  const shot2 = await B.next(m => m.type === 'opponent_shot');
  ok('进球继续：同一方再出杆被转发', shot2.version === 1 && !shot2._timeout, JSON.stringify(shot2));
  // 7) 过期版本被拒
  await sleep(400);
  A.send({ type: 'shot', version: 2, angle: 0.2, power: 0.6, spinX: 0, spinY: 0 });
  await B.next(m => m.type === 'opponent_shot', 4000);
  await sleep(400);
  A.send({ type: 'shot', version: 2, angle: 0.2, power: 0.6, spinX: 0, spinY: 0 });
  const e4 = await A.next(m => m.type === 'error');
  ok('过期版本被拒', e4.code === 'BAD_VERSION', e4.code);
  // 8) 断线重连
  const seatCode = joined.seatCode;
  B.ws.close(); await sleep(300);
  const disc = await A.next(m => m.type === 'opponent_disconnected');
  ok('掉线通知对手', disc.seat === 1, JSON.stringify(disc));
  B = await open();
  B.send({ type: 'rejoin', code, seatCode });
  const rejoined = await B.next(m => m.type === 'room_joined');
  ok('重连恢复座位 1', rejoined.seat === 1, String(rejoined.seat));
  const resumed = await B.next(m => m.type === 'resume');
  ok('重连补发 lastShot', !!resumed.lastShot && resumed.lastShot.angle === 0.2, JSON.stringify(resumed));
  // 9) 对局结束 + rematch
  A.send({ type: 'game_over', winnerSeat: 0, reason: '清台' });
  const over = await B.next(m => m.type === 'game_over');
  ok('对局结束广播', over.winnerSeat === 0, JSON.stringify(over));
  A.send({ type: 'rematch' });
  const re1 = await A.next(m => m.type === 'start');
  ok('再来一局沿用原房间号', re1.rematch === true && re1.firstPlayer === 0, JSON.stringify(re1));
  // leave：用全新房间测试，避免前面消息干扰
  const D = await open(), E = await open();
  D.send({ type: 'create_room' });
  const dc = await D.next(m => m.type === 'room_created');
  E.send({ type: 'join_room', code: dc.code });
  await E.next(m => m.type === 'room_joined');
  await E.next(m => m.type === 'start');
  await D.next(m => m.type === 'start');
  E.send({ type: 'leave' });
  const left = await D.next(m => m.type === 'opponent_left', 4000);
  ok('离开通知对手', left.reason === 'leave', JSON.stringify(left));
  D.ws.close(); E.ws.close();
} catch (e) {
  fail++; bad.push('EXCEPTION :: ' + String(e && e.stack || e).slice(0, 300));
}
try { A && A.ws.close(); } catch (e) {}
try { B && B.ws.close(); } catch (e) {}
proc.kill();
await sleep(200);
console.log('=== 信令服务器集成测试 ===');
console.log('PASS: ' + pass + '  FAIL: ' + fail);
if (bad.length) console.log(bad.join('\n'));
process.exit(fail ? 1 : 0);