/* 一杆入袋 · 在线对战网络层（经典 script，挂 window.Pool.Net）
   只做连接/房间/消息编解码/重连，不含 UI 与游戏逻辑。
   地址：同源 wss://<host>/pool-ws/（file:// 下可用 ws://127.0.0.1:8787） */
(function () {
  'use strict';
  var Pool = (window.Pool = window.Pool || {});
  var listeners = {};
  var ws = null, roomCode = '', seat = -1, seatCode = '';
  var pending = [], connected = false, manualClose = false, autoRetry = null;
  function emit(ev, data) { (listeners[ev] || []).forEach(function (fn) { try { fn(data); } catch (e) {} }); }
  function endpoint() {
    if (window.__POOL_WS_URL__) return window.__POOL_WS_URL__;
    var loc = window.location;
    if (loc.protocol === 'file:') return 'ws://127.0.0.1:8787';
    var proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + loc.host + '/pool-ws/';
  }
  function send(o) { if (ws && ws.readyState === 1) { ws.send(JSON.stringify(o)); return true; } return false; }
  function connect() {
    return new Promise(function (resolve, reject) {
      if (ws && ws.readyState === 1) return resolve();
      manualClose = false;
      try { ws = new WebSocket(endpoint()); } catch (e) { return reject(e); }
      ws.onopen = function () { connected = true; emit('connection', { connected: true }); resolve(); };
      ws.onclose = function () {
        connected = false; emit('connection', { connected: false });
        // 非主动关闭且曾在房间中：自动用座位码重连（切页面/网络波动场景）
        if (!manualClose && roomCode && seatCode && !autoRetry) {
          emit('auto_reconnecting', { code: roomCode });
          autoRetry = setTimeout(function () {
            autoRetry = null;
            if (!manualClose && roomCode && seatCode) { Pool.Net.rejoin(roomCode, seatCode).catch(function () {}); }
          }, 800);
        }
      };
      ws.onerror = function (e) { emit('error', { code: 'WS_ERROR', message: '连接失败' }); reject(e); };
      ws.onmessage = function (ev) {
        var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.type === 'room_created') { roomCode = m.code; seat = m.seat; seatCode = m.seatCode; }
        if (m.type === 'room_joined') { roomCode = m.code; seat = m.seat; seatCode = m.seatCode; }
        // pause_state 兜底：直接切遮罩，避免 listener 注册时序问题
        if (m.type === 'pause_state' && typeof document !== 'undefined') {
          var pm = document.getElementById('pause-mask');
          if (pm) pm.hidden = !m.paused;
          var G = window.__PROPOOL__ && window.__PROPOOL__.game;
          if (G && G.mode === 'online') G._onlinePaused = !!m.paused;
        }
        if (m.type === 'force_resume') {
          var GR = window.__PROPOOL__ && window.__PROPOOL__.game;
          if (GR && GR.mode === 'online' && GR.paused) GR.resume();
        }
        emit(m.type, m); emit('message', m);
      };
    });
  }
  function wait(type, ms) {
    return new Promise(function (resolve) {
      var done = false;
      var fn = function (m) { if (done) return; done = true; unsub(type, fn); clearTimeout(t); resolve(m); };
      var t = setTimeout(function () { if (done) return; done = true; unsub(type, fn); resolve({ type: '__timeout__', _timeout: true }); }, ms || 5000);
      sub(type, fn);
    });
  }
  function sub(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return function () { unsub(ev, fn); }; }
  function unsub(ev, fn) { var a = listeners[ev]; if (!a) return; var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }
  Pool.Net = {
    connect: connect,
    createRoom: function () { return connect().then(function () { var p = wait('room_created', 6000); send({ type: 'create_room' }); return p; }); },
    joinRoom: function (code) { return connect().then(function () { var p = wait('room_joined', 6000); send({ type: 'join_room', code: String(code) }); return p; }); },
    rejoin: function (code, sc) { return connect().then(function () { var p = wait('room_joined', 6000); send({ type: 'rejoin', code: String(code), seatCode: sc }); return p; }); },
    sendShot: function (p) { return send({ type: 'shot', version: p.version, angle: p.angle, power: p.power, spinX: p.spinX, spinY: p.spinY, cueX: p.cueX, cueY: p.cueY, snapshot: p.snapshot }); },
    swap: function (seatIndex) { return send({ type: 'swap', seat: seatIndex }); },
    groupAssigned: function (info) { return send({ type: 'group_assigned', seat: info.seat, group: info.group, name: info.name }); },
    cuePlaced: function (info) { return send({ type: 'cue_placed', cueX: info.cueX, cueY: info.cueY }); },
    stateSync: function (s) { return send({ type: 'state_sync', snapshot: s.snapshot }); },
    gameResult: function (r) { return send({ type: 'game_result', winner: r.winner, reason: r.reason, snapshot: r.snapshot }); },
    pauseState: function (paused) { return send({ type: 'pause_state', paused: paused }); },
    forceResume: function () { return send({ type: 'force_resume' }); },
    turnTimeout: function () { return send({ type: 'turn_timeout' }); },
    gameOver: function (winner, reason) { return send({ type: 'game_over', winnerSeat: winner, reason: reason }); },
    rematch: function () { return send({ type: 'rematch' }); },
    rematchCancel: function () { return send({ type: 'rematch_cancel' }); },
    leave: function () { send({ type: 'leave' }); this.close(); },
    drop: function () { /* 模拟网络闪断：断底层连接但保留座位，触发自动重连 */ if (ws) { try { ws.close(); } catch (e) {} } },
    clearRoom: function () { roomCode = ''; seatCode = ''; seat = -1; },
    close: function () { manualClose = true; if (autoRetry) { clearTimeout(autoRetry); autoRetry = null; } if (ws) { try { ws.close(); } catch (e) {} } ws = null; connected = false; roomCode = ''; seatCode = ''; },
    on: function (ev, fn) { return sub(ev, fn); },
    off: function (ev, fn) { return unsub(ev, fn); },
    get state() { return { roomCode: roomCode, seat: seat, seatCode: seatCode, connected: connected }; }
  };
})();
