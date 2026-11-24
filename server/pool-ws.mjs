/* 一杆入袋 · 在线对战信令服务器
   只做：房间生命周期 / 消息转发 / 回合合法性校验。不跑物理、不存数据库。
   房间号：4 位纯数字（0000~9999），内存 Map，进程重启即丢。 */
import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { randomInt } from 'node:crypto';

const PORT = Number(process.env.POOL_WS_PORT || 8787);
const HOST = process.env.POOL_WS_HOST || '127.0.0.1';
const WAIT_TTL = 30 * 60 * 1000;      // 等待中房间 30 分钟
const TURN_TIMEOUT_MS = Number(process.env.POOL_WS_TURN_MS || 45000); // 每杆限时（默认45秒）
const REMATCH_TIMEOUT_MS = Number(process.env.POOL_WS_REMATCH_TIMEOUT_MS || 180000); // 再来一局等待超时
const PAUSE_TIMEOUT_MS = Number(process.env.POOL_WS_PAUSE_TIMEOUT_MS || 180000); // 暂停超时（默认3分钟）
const NO_BUSY = process.env.POOL_WS_NO_BUSY === "1"; // 测试环境可关闭串行锁
const DISCONNECT_TTL = Number(process.env.POOL_WS_DISCONNECT_TTL || 60) * 1000; // 掉线重连窗口（默认 60 秒）
const REMATCH_TTL = 60 * 1000;        // 对局结束再来一局窗口 60 秒
const EMPTY_TTL = 30 * 1000;          // 空房间 30 秒

const rooms = new Map();
const bySocket = new WeakMap();       // ws -> { roomCode, seat }

function code4() {
  return String(randomInt(0, 10000)).padStart(4, '0');
}
function seatCode8() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = ''; for (let i = 0; i < 8; i++) s += chars[randomInt(0, chars.length)];
  return s;
}
function send(ws, obj) {
  if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(obj)); } catch (e) {} }
}
function err(ws, code, message) { send(ws, { type: 'error', code, message }); }
function newRoom(code) {
  return { code, seats: [null, null], started: false, turn: 0, version: 0,
    lastShot: null, createdAt: Date.now(), emptySince: null, rematchUntil: null, finished: false,
    pausedAt: null, pausedBy: -1, rematchBy: -1, rematchAt: null,
    turnStartedAt: Date.now(), turnElapsed: 0 };
}
function getRoom(code) { return rooms.get(code) || null; }
function resetTurnClock(room) { room.turnStartedAt = Date.now(); room.turnElapsed = 0; room.turnSwitchedAt = Date.now(); }
function pauseTurnClock(room) {
  if (!room.turnStartedAt) return;
  room.turnElapsed = (room.turnElapsed || 0) + (Date.now() - room.turnStartedAt);
  room.turnStartedAt = 0;
}
function resumeTurnClock(room) { room.turnStartedAt = Date.now(); }
function turnElapsedMs(room) {
  if (!room.turnStartedAt) return room.turnElapsed || 0;
  return (room.turnElapsed || 0) + (Date.now() - room.turnStartedAt);
}

function destroyRoom(code) { rooms.delete(code); }
function broadcast(room, obj) {
  for (const s of room.seats) if (s && s.connected) send(s.ws, obj);
}
function roomTick() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const online = room.seats.some(s => s && s.connected);
    if (!online) {
      if (!room.emptySince) room.emptySince = now;
      if (now - room.emptySince > EMPTY_TTL) destroyRoom(code);
      continue;
    }
    room.emptySince = null;
    const off = room.seats.find(s => s && !s.connected);
    if (off) {
      if (!off.disconnectedAt) off.disconnectedAt = now;
      if (now - off.disconnectedAt > DISCONNECT_TTL) {
        broadcast(room, { type: 'opponent_left', reason: 'timeout' });
        destroyRoom(code);
      }
    }
    if (room.started && !room.finished && !room.pausedAt && turnElapsedMs(room) > TURN_TIMEOUT_MS && room.seats.some(x => x && x.connected)) {
      // 切换冷却：防止 tick 抖动导致同一杆连续换手两次
      if (!room.turnSwitchedAt || now - room.turnSwitchedAt > TURN_TIMEOUT_MS * 0.8) {
        room.turn = 1 - room.turn;
        room.busy = false; room.busySince = null;
        room.turnSwitchedAt = now;
        resetTurnClock(room);
        broadcast(room, { type: "turn_timeout", seat: room.turn, by: -1, elapsed: 0 });
      }
    }
    if (room.busy && room.busySince && now - room.busySince > 6000) { room.busy = false; room.busySince = null; }
    // 暂停超过 3 分钟：判非暂停方胜（暂停方弃权）
    if (room.pausedAt && room.pausedBy >= 0 && now - room.pausedAt > PAUSE_TIMEOUT_MS && !room.finished) {
      const winner = 1 - room.pausedBy;
      room.finished = true; room.pausedAt = null;
      broadcast(room, { type: 'pause_timeout', winner: winner, reason: '暂停超过 3 分钟，判暂停方弃权' });
    }
    if (room.rematchBy >= 0 && room.rematchAt && now - room.rematchAt > REMATCH_TIMEOUT_MS) {
      broadcast(room, { type: 'room_closed', reason: '对方未同意再来一局，房间已断开' });
      destroyRoom(code);
      continue;
    }
    if (room.finished && room.rematchUntil && now > room.rematchUntil) destroyRoom(code);
    if (!room.started && now - room.createdAt > WAIT_TTL) destroyRoom(code);
  }
}
setInterval(roomTick, Number(process.env.POOL_WS_TICK_MS || 5000));

function validShot(m, room) {
  const n = v => typeof v === 'number' && isFinite(v);
  return n(m.angle) && m.angle >= -Math.PI && m.angle <= Math.PI &&
    n(m.power) && m.power > 0 && m.power <= 1 &&
    n(m.spinX) && m.spinX >= -1 && m.spinX <= 1 &&
    n(m.spinY) && m.spinY >= -1 && m.spinY <= 1;
}

const server = createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); }
  else { res.writeHead(404); res.end(''); }
});
const wss = new WebSocketServer({ server, maxPayload: 8192 });

wss.on('connection', (ws) => {
  let lastShotAt = 0;
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch (e) { return err(ws, 'BAD_JSON', '消息格式错误'); }
    const ctx = bySocket.get(ws);
    const room = ctx ? getRoom(ctx.roomCode) : null;
    switch (m.type) {
      case 'create_room': {
        if (ctx) { leave(ctx, room, ws); }
        let code = code4(); while (getRoom(code)) code = code4();
        const r = newRoom(code); rooms.set(code, r);
        const sc = seatCode8();
        r.seats[0] = { ws, seatCode: sc, connected: true, name: '玩家1' };
        bySocket.set(ws, { roomCode: code, seat: 0 });
        send(ws, { type: 'room_created', code, seat: 0, seatCode: sc });
        break;
      }
      case 'join_room': {
        const code = String(m.code || '').trim();
        if (!/^\d{4}$/.test(code)) return err(ws, 'BAD_CODE', '房间号须为 4 位数字');
        const r = getRoom(code);
        if (!r) return err(ws, 'NO_ROOM', '房间不存在或已失效');
        if (r.seats[1]) return err(ws, 'ROOM_FULL', '房间已满');
        const sc = seatCode8();
        r.seats[1] = { ws, seatCode: sc, connected: true, name: '玩家2' };
        bySocket.set(ws, { roomCode: code, seat: 1 });
        send(ws, { type: 'room_joined', code, seat: 1, seatCode: sc, opponent: '玩家1' });
        r.started = true; r.turn = 0; r.version = 0; r.finished = false; resetTurnClock(r); r.rematchUntil = null;
        broadcast(r, { type: 'start', firstPlayer: 0 });
        break;
      }
      case 'rejoin': {
        const code = String(m.code || '').trim();
        const r = getRoom(code);
        if (!r) return err(ws, 'NO_ROOM', '房间已失效，请重新建房');
        const idx = r.seats.findIndex(s => s && s.seatCode === String(m.seatCode || ''));
        if (idx < 0) return err(ws, 'BAD_SEAT', '座位码不匹配');
        const seat = r.seats[idx];
        try { seat.ws.close(); } catch (e) {}
        seat.ws = ws; seat.connected = true; seat.disconnectedAt = null;
        bySocket.set(ws, { roomCode: code, seat: idx });
        // rejoin 必然来自离线恢复：无条件通知房间内其他人（旧 seat 的引用已失效）
        for (const other of r.seats) {
          if (other && other !== seat && other.connected) {
            send(other.ws, { type: 'opponent_reconnected', seat: idx });
          }
        }
        send(ws, { type: 'room_joined', code, seat: idx, seatCode: seat.seatCode, opponent: '对手' });
        if (r.started) send(ws, { type: 'resume', turn: r.turn, snapshot: r.snapshot, lastShot: r.lastShot });
        break;
      }
      case 'shot': {
        if (!ctx || !room || !room.started || room.finished) return err(ws, 'NOT_PLAYING', '对局未进行');
        if (ctx.seat !== room.turn) return err(ws, 'NOT_YOUR_TURN', '还没轮到你');
        if (m.version !== room.version) return err(ws, 'BAD_VERSION', '版本过期，请等待同步');
        if (!validShot(m, room)) return err(ws, 'BAD_SHOT', '出杆参数越界');
        if (!NO_BUSY && room.busy) return err(ws, 'BUSY', '上一杆结算中，请稍候');
        const now = Date.now();
        if (!NO_BUSY) { room.busy = true; room.busySince = Date.now(); }
        if (now - lastShotAt < 300) return err(ws, 'TOO_FAST', '出杆过快');
        lastShotAt = now;
        const shot = { type: 'opponent_shot', version: room.version, angle: m.angle, power: m.power,
          spinX: m.spinX, spinY: m.spinY, cueX: m.cueX ?? null, cueY: m.cueY ?? null };
        if (m.snapshot) room.snapshot = m.snapshot;
        room.lastShot = shot;
        room.version++;
        // 换手由客户端结算后上报 swap（进球不换手 / 犯规换手等规则在客户端）
        for (const s of room.seats) if (s && s.connected && s.ws !== ws) send(s.ws, shot);
        break;
      }
      case 'turn_timeout': {
        // 客户端只显示倒计时，不再上报超时；权威换手由 roomTick 执行。
        // 保留此分支仅为兼容旧客户端，且不再改变 turn，避免与 tick 双重切换。
        break;
      }
      case 'pause_state': {
        if (!ctx || !room) return;
        if (m.paused) { room.pausedAt = Date.now(); room.pausedBy = ctx.seat; pauseTurnClock(room); }
        else { room.pausedAt = null; room.pausedBy = -1; resumeTurnClock(room); }
        for (const seat of room.seats) if (seat && seat.connected && seat.ws !== ws)
          send(seat.ws, { type: 'pause_state', paused: !!m.paused, by: ctx.seat });
        break;
      }
      case 'force_resume': {
        // 非暂停方强制恢复：只有对方能按，转发给暂停方令其解除暂停
        if (!ctx || !room || room.pausedBy < 0 || ctx.seat === room.pausedBy) return;
        const pauser = room.seats[room.pausedBy];
        if (pauser && pauser.connected) send(pauser.ws, { type: 'force_resume' });
        break;
      }
      case 'game_result': {
        if (!ctx || !room) return;
        room.finished = true; room.busy = false;
        for (const seat of room.seats) if (seat && seat.connected && seat.ws !== ws) send(seat.ws, { type: 'game_result', winner: m.winner, reason: m.reason, snapshot: m.snapshot });
        break;
      }
      case 'state_sync': {
        if (!ctx || !room || !m.snapshot) return;
        room.busy = false;
        for (const seat of room.seats) if (seat && seat.connected && seat.ws !== ws) send(seat.ws, { type: 'state_sync', snapshot: m.snapshot });
        break;
      }
      case 'cue_placed': {
        if (!ctx || !room) return;
        for (const seat of room.seats) if (seat && seat.connected && seat.ws !== ws) send(seat.ws, { type: 'cue_placed', cueX: m.cueX, cueY: m.cueY });
        break;
      }
      case 'group_assigned': {
        if (!ctx || !room) return;
        broadcast(room, { type: 'group_assigned', seat: m.seat, group: m.group, name: m.name || '' });
        break;
      }
      case 'swap': {
        if (!ctx || !room || !room.started) return;
        if (typeof m.seat === 'number' && (m.seat === 0 || m.seat === 1)) room.turn = m.seat;
        else room.turn = 1 - ctx.seat;
        resetTurnClock(room);
        // 广播权威回合给双方，强制对齐（犯规换手两端可能不一致）
        broadcast(room, { type: 'turn_sync', seat: room.turn });
        break;
      }
      case 'game_over': {
        if (!ctx || !room) return;
        room.finished = true; room.rematchUntil = Date.now() + REMATCH_TTL;
        broadcast(room, { type: 'game_over', winnerSeat: m.winnerSeat ?? 1 - ctx.seat, reason: m.reason || '' });
        break;
      }
      case 'rematch': {
        if (!ctx || !room || !room.finished) return;
        // 协商：双方都点才算同意
        if (room.rematchBy < 0) {
          room.rematchBy = ctx.seat; room.rematchAt = Date.now();
          broadcast(room, { type: 'rematch_pending', by: ctx.seat });
        } else if (room.rematchBy === ctx.seat) {
          // 同一人重复点：只提醒等待
          send(ws, { type: 'rematch_pending', by: ctx.seat });
        } else {
          // 另一方同意 -> 开新局
          room.finished = false; room.rematchUntil = null; room.version = 0; room.turn = 0;
          room.lastShot = null; room.rematchBy = -1; room.rematchAt = null; resetTurnClock(room);
          room.snapshot = null; room.finished = false; room.busy = false;
          broadcast(room, { type: 'start', firstPlayer: 0, rematch: true });
        }
        break;
      }
      case 'rematch_cancel': {
        if (!ctx || !room) return;
        room.rematchBy = -1; room.rematchAt = null;
        broadcast(room, { type: 'rematch_cancelled' });
        break;
      }
      case 'leave': {
        leave(ctx, room, ws); break;
      }
    }
  });
  ws.on('close', () => {
    const ctx = bySocket.get(ws); if (!ctx) return;
    const room = getRoom(ctx.roomCode); if (!room) return;
    const seat = room.seats[ctx.seat];
    if (seat && seat.ws === ws) {
      seat.connected = false; seat.disconnectedAt = Date.now();
      // 只有"该连接仍是当前座位连接"才算真正掉线；
      // rejoin 时旧连接的延迟 close 不能再广播一次掉线遮罩。
      broadcast(room, { type: 'opponent_disconnected', seat: ctx.seat });
    }
  });
});
function leave(ctx, room, ws) {
  if (!ctx || !room) return;
  const seat = room.seats[ctx.seat];
  if (seat) room.seats[ctx.seat] = null;
  broadcast(room, { type: 'opponent_left', reason: 'leave' });
  if (ws) bySocket.delete(ws);
}
server.listen(PORT, HOST, () => console.log(`pool-ws listening on ${HOST}:${PORT}`));
