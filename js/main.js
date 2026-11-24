/* 一杆入袋 — 入口 / UI 装配 / 输入 / 循环（Lead 维护） */
(function () {
  var Pool = (window.Pool = window.Pool || {});
  var C = Pool.CONFIG;
  var U = Pool.UTIL;
  var SAVE_KEY = 'propool_save_v1';

  var $ = function (id) { return document.getElementById(id); };

  var game = null;
  var renderer = null;
  var audio = null;
  var save = null;
  var toastTimer = null;
  var flashTimer = null;
  var resultTimer = null;
  var pendingNextLevel = null;
  var pendingLevelId = null;
  var selectedDifficulty = 'normal';
  var lastRenderError = false;
  var lastPower = -1;
  var lastSpin = { x: 0, y: 0 };
  var lastAngleText = '';
  var spinDragging = false;
  var aimLocked = false;
  var touchAiming = false;
  var touchCharging = false;
  var shootButton = null;
  var isTouchDevice = false;
  var orientationPaused = false;
  var portraitOverride = false;
  var portraitHintShown = false;
  var initialized = false;

  /* ---------------------------------- 存档 ---------------------------------- */
  function defaultSave() {
    return {
      version: 1, coins: 0, stars: {}, cleared: {},
      ownedCues: ['oak'], equipped: 'oak',
      settings: { guide: true, sound: true },
      record: { wins: 0, losses: 0, matches: 0 },
      createdAt: Date.now()
    };
  }
  function loadSave() {
    var base = defaultSave();
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.coins === 'number') base.coins = parsed.coins;
          if (parsed.stars && typeof parsed.stars === 'object') base.stars = parsed.stars;
          if (parsed.cleared && typeof parsed.cleared === 'object') base.cleared = parsed.cleared;
          if (Array.isArray(parsed.ownedCues)) {
            base.ownedCues = parsed.ownedCues.filter(function (id) { return !!findCue(id); });
            if (base.ownedCues.indexOf('oak') < 0) base.ownedCues.unshift('oak');
          }
          if (parsed.equipped && base.ownedCues.indexOf(parsed.equipped) >= 0) base.equipped = parsed.equipped;
          if (parsed.settings) {
            base.settings.guide = parsed.settings.guide !== false;
            base.settings.sound = parsed.settings.sound !== false;
          }
          if (parsed.record) {
            base.record.wins = parsed.record.wins || 0;
            base.record.losses = parsed.record.losses || 0;
            base.record.matches = parsed.record.matches || 0;
          }
        }
      }
    } catch (e) { /* 首次运行 / 隐私模式 */ }
    return base;
  }
  function persistSave(s) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  }
  function findCue(id) {
    for (var i = 0; i < C.cues.length; i++) if (C.cues[i].id === id) return C.cues[i];
    return null;
  }

  /* ---------------------------------- 初始化 ---------------------------------- */
  function init() {
    if (initialized) return;
    initialized = true;
    save = loadSave();
    audio = new Pool.Audio();
    audio.enabled = save.settings.sound !== false;
    isTouchDevice = detectTouchDevice();
    document.body.classList.toggle('touch-device', isTouchDevice);

    var canvas = $('game-canvas');
    try {
      if (!Pool.Renderer) throw new Error('Renderer missing');
      renderer = new Pool.Renderer(canvas);
      applyRendererInsets();
      if (renderer.resize) renderer.resize();
    } catch (e) {
      console.error('Renderer init failed', e);
      renderer = null;
      showBootError('画面初始化失败\n' + e.message + '\n请刷新页面，或换用 Chrome / Edge / 华为浏览器。');
      return;
    }

    try {
      game = new Pool.Game({
        renderer: renderer,
        audio: audio,
        save: save,
        persist: persistSave,
        onLocalShot: function (p) { onOnlineShot(p); },
        onStateSettled: function (s) { onOnlineSettled(s); },
        onGroupAssigned: function (g) { onOnlineGroupAssigned(g); },
        onCuePlaced: function (p) { if (online.active && Pool.Net) Pool.Net.cuePlaced(p); },
        onGameOver: function (r) { if (online.active && Pool.Net) Pool.Net.gameResult(r); },
        onPauseChange: function (p) { if (online.active && Pool.Net) Pool.Net.pauseState(p); },
        onTurnTimeout: function () { if (online.active && Pool.Net) Pool.Net.turnTimeout(); }
      });
    } catch (e) {
      console.error('Game init failed', e);
      showBootError('游戏初始化失败\n' + e.message + '\n请刷新页面重试。');
      return;
    }

    bindGameEvents();
    bindUI();
    // 调试/自动化钩子（不影响正常游玩）
    window.__PROPOOL__ = { game: game, renderer: renderer, audio: audio, save: save };
    refreshMenu();
    applySoundUI();
    syncCueStyle(game.cue);
    syncBodyState();
    showScreen('menu');

    requestAnimationFrame(loop);
    observeHudInsets();
    window.addEventListener('resize', function () {
      syncBodyState();
      applyRendererInsets();
      if (renderer && renderer.resize) renderer.resize();
    });
    window.addEventListener('orientationchange', function () {
      setTimeout(function () {
        syncBodyState();
        applyRendererInsets();
        if (renderer && renderer.resize) renderer.resize();
      }, 180);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && game && game.phase !== 'menu' && game.phase !== 'over' && !game.paused) {
        openPause();
      }
    });
  }

  function detectTouchDevice() {
    try {
      return window.matchMedia('(pointer: coarse)').matches ||
        (navigator.maxTouchPoints > 0 && window.innerWidth < 1200);
    } catch (e) { return false; }
  }

  function syncBodyState() {
    if (!document.body) return;
    var hud = $('hud');
    var inGame = !!game && game.mode !== 'menu' && game.phase !== 'over' &&
      !!hud && !hud.classList.contains('hidden');
    // 不再用前置遮罩挡住手机：竖屏直接可玩，横屏自动使用紧凑 HUD。
    // 很多微信/手机浏览器不允许锁定方向，旧逻辑会把玩家永久卡在“请横屏”。
    var portrait = !!(isTouchDevice && inGame && window.innerHeight > window.innerWidth);
    if (window.innerWidth > window.innerHeight) portraitOverride = false;
    document.body.classList.toggle('touch-device', isTouchDevice);
    document.body.classList.toggle('ingame', !!inGame);
    document.body.classList.toggle('touch-ingame', !!(isTouchDevice && inGame));
    document.body.classList.toggle('portrait-play', portrait);
    // 双人本地对战：给 body 一个类，CSS 不必依赖 :has()（旧内核不支持会整段失效）
    document.body.classList.toggle('mode-pvp', !!(game && game.mode === 'pvp' && inGame));
    document.body.classList.remove('orientation-blocked');
    if (portrait && !portraitHintShown) {
      portraitHintShown = true;
      var ph = $('hint-text');
      if (ph) ph.textContent = '竖向球台 · 右侧力度条下拉蓄力 · 松手出杆';
    }
    if (orientationPaused) {
      orientationPaused = false;
      if (game && game.paused) game.resume();
      var pauseScreen = $('screen-pause');
      if (pauseScreen) pauseScreen.classList.remove('active');
      refreshHud();
    }
  }

  /* 单一真相源：HUD 实际占用的屏幕四边由 DOM 实测，
   * CSS 改控件高度不再需要同步 JS 里的固定 px 数值。
   * 左右侧栏也参与计算 —— 球台会为控件带让位（竖屏时自然偏左）。 */
  function measureInsets() {
    var W = window.innerWidth || 960, H = window.innerHeight || 540;
    var empty = { top: 0, bottom: 0, left: 0, right: 0 };
    if (!document.body.classList.contains('ingame')) return empty;
    function box(sel) {
      var e = document.querySelector(sel);
      if (!e || getComputedStyle(e).display === 'none') return null;
      var b = e.getBoundingClientRect();
      return (b.height > 0 && b.width > 0) ? b : null;
    }
    var top = 0, bottom = 0, b;
    var topEls = ['.hud-top', '.hud-level'];
    for (var i = 0; i < topEls.length; i++) {
      b = box(topEls[i]);
      if (b) top = Math.max(top, Math.ceil(b.bottom));
    }
    b = box('.hud-bottom');
    if (b) bottom = Math.max(0, Math.ceil(H - b.top));
    // 关键：球台与 HUD 之间不允许再"允许重叠"。留 3px 呼吸即可，
    // 台呢必须完整可见 —— 上一版给了 44px 容差，工具键和力度条直接压到台面上。
    var gap = 3;
    top = Math.max(0, top + gap);
    bottom = Math.max(0, bottom + gap);
    var left = 0, right = 0;
    // 右侧控件带：竖屏 / 横屏 / 桌面一律整条让出来，控件绝不压在球台上
    b = box('.hud-side-right');
    if (b) right = Math.max(0, Math.ceil(W - b.left) + gap);
    top = Math.min(top, Math.round(H * 0.26));
    bottom = Math.min(bottom, Math.round(H * 0.26));
    right = Math.min(right, Math.round(W * 0.30));
    return { top: top, bottom: bottom, left: left, right: right };
  }

  var hudInsetsRO = null, insetsPending = false;
  function scheduleInsets() {
    if (insetsPending) return;
    insetsPending = true;
    requestAnimationFrame(function () {
      insetsPending = false;
      applyRendererInsets();
    });
  }

  /* 把球台在屏幕上的实际外框写进 CSS 变量：
     顶栏 / 底栏都以球台宽度为准（用户要求「底栏不能比球台两端更宽」，
     同时「顶栏要拉宽到跟球台一样，才放得下 7 颗球」）。
     另外把右侧控件带的上下边界也写出去，手机端 4 个功能键就贴在它上方/下方。 */
  function syncTableBox() {
    try {
      var root = document.documentElement.style;
      if (!renderer || !renderer.scale || !renderer.worldToScreen || !game.world) return;
      var W = game.world.width, H = game.world.height;
      var xs = [], ys = [], i, s;
      var pts = [[0, 0], [W, 0], [0, H], [W, H]];
      for (i = 0; i < 4; i++) {
        s = renderer.worldToScreen(pts[i][0], pts[i][1]);
        xs.push(s.x); ys.push(s.y);
      }
      var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
      var m = (renderer.FRAME || 0) * renderer.scale;
      root.setProperty('--table-l', (minX - m).toFixed(1) + 'px');
      root.setProperty('--table-w', (maxX - minX + 2 * m).toFixed(1) + 'px');
      var band = $('hud-side-right');
      if (band) {
        var br = band.getBoundingClientRect();
        root.setProperty('--band-top', br.top.toFixed(1) + 'px');
        root.setProperty('--band-bottom', br.bottom.toFixed(1) + 'px');
      }
    } catch (e) { /* ignore */ }
  }

  function applyRendererInsets() {
    if (!renderer || !renderer.setInsets) return;
    var ins = measureInsets();
    renderer.setInsets(ins);
    // 右侧控件带垂直方向跟着「台呢中心」走：台呢中心 = 视口中心 + (上边距 - 下边距)/2
    var shift = Math.round((ins.top - ins.bottom) / 2);
    try {
      document.documentElement.style.setProperty('--band-shift', shift + 'px');
    } catch (e) { /* ignore */ }
    // 台呢外框要在 setInsets 之后才准；控件带位置又依赖 --band-shift，
    // 所以放到下一帧统一量一次。
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(syncTableBox);
    else syncTableBox();
  }

  function observeHudInsets() {
    if (hudInsetsRO || typeof ResizeObserver === 'undefined') return;
    hudInsetsRO = new ResizeObserver(scheduleInsets);
    var sels = '.hud-top,.hud-level,.hud-bottom,.hud-side-right';
    var els = document.querySelectorAll(sels);
    for (var i = 0; i < els.length; i++) hudInsetsRO.observe(els[i]);
  }

  /* 启动失败不再黑屏：DOM 层先可见，把异常显示成可读文字 */
  function showBootError(msg) {
    var el = $('boot-error');
    if (el) { el.textContent = msg; el.classList.add('show'); }
    showFatal(msg);
  }

  /* 声明式事件 → 命令分发：DOM 只写 data-action，控制器不持有 DOM 引用 */
  var commandMap = {};
command('online', function () {
  var inp = document.getElementById('online-code'); if (inp) inp.value = '';
  showScreen('online'); refreshOnlineUI();
});
  function command(name, fn) { commandMap[name] = fn; }
  function runCommand(name, el) {
    var fn = commandMap[name];
    if (typeof fn === 'function') fn(el);
  }

  function showFatal(msg) {
    var menu = $('screen-menu');
    if (menu) {
      var p = document.createElement('p');
      p.style.cssText = 'color:#e39a8c;font-size:12px;margin-top:18px;max-width:480px;line-height:1.8';
      p.textContent = msg;
      menu.querySelector('.menu-main').appendChild(p);
    }
  }

  /* 固定步长累加器。
   * 旧版把 dt 直接 clamp 到 50ms：一旦真机掉到 10fps，物理时间每帧只推进 50ms，
   * 球滚成慢动作、一杆要 7 秒才结算完（用户录屏里力度条停在 56% 长达 7 秒就是这个）。
   * 现在：真实经过多少时间就补多少个 1/60 的物理步（单帧最多 6 步防螺旋），
   * 渲染仍然每帧只做一次。低帧率下球速正常、结算时长正常，只是画面帧数少。 */
  var FIXED_STEP = 1 / 60;
  var MAX_STEPS = 6;
  var stepAcc = 0;
  function loop(now) {
    var real = loop._last ? (now - loop._last) / 1000 : FIXED_STEP;
    loop._last = now;
    if (real > 0.25) real = 0.25;       // 切后台回来不要一次补上百帧
    if (real < 0) real = 0;
    if (game) {
      // 在线对战进行中（aim/shooting）不能被隐藏的菜单页挡住物理更新；
      // 只有真正的暂停/结束屏才暂停。
      var inOnlinePlay = game.mode === 'online' && (game.phase === 'aim' || game.phase === 'shooting');
      var pausedLike = game.paused || game.phase === 'menu' || game.phase === 'over' ||
        (activeOverlay() && !inOnlinePlay);
      if (pausedLike) {
        stepAcc = 0;
      } else {
        stepAcc = Math.min(stepAcc + real, FIXED_STEP * MAX_STEPS);
        var steps = 0;
        while (stepAcc >= FIXED_STEP && steps < MAX_STEPS) {
          try { game.update(FIXED_STEP); } catch (e) { console.error('update error', e); }
          stepAcc -= FIXED_STEP;
          steps++;
        }
      }
      if (renderer) {
        try {
          renderer.render(game.getRenderState(), Math.min(real, FIXED_STEP));
          lastRenderError = false;
        } catch (e) {
          if (!lastRenderError) { console.error('render error', e); lastRenderError = true; }
        }
      }
      updateLiveUI();
    }
    requestAnimationFrame(loop);
  }

  /* ---------------------------------- 事件绑定 ---------------------------------- */
  function bindGameEvents() {
    game.on('hud', function () { refreshHud(); });
    game.on('toast', function (t) {
      if (game && game.mode === 'online' && online.active && t && typeof t.text === 'string') {
        var txt = t.text;
        // 自由球 toast 在换手前 emit，归属是 1 - activePlayer；
        // 轮到 toast 在换手后 emit，归属是 activePlayer。
        var freeWho = ((1 - game.activePlayer) === online.mySeat) ? '你' : '对手';
        var turnWho = (game.activePlayer === online.mySeat) ? '你' : '对手';
        // 显示层按本机视角校正：两端 activePlayer 已同步，避免 Game 层结算时序差异导致双方都显示“对手”
        if (txt.indexOf('轮到 ') >= 0) txt = txt.replace(/轮到 (?:你|对手)/, '轮到 ' + turnWho);
        if (txt.indexOf('自由球') >= 0) txt = txt.replace(/(?:你|对手)自由球/, freeWho + '自由球');
        showToast({ text: txt, type: t.type });
        return;
      }
      showToast(t);
    });
    game.on('turn', onTurn);
    game.on('spin', function (d) { setSpinUI(d.x, d.y); });
    game.on('guide', function (on) { updateGuideButton(on); });
    game.on('charge', function () { updatePowerUI(game.getState()); });
    game.on('matchOver', showMatchResult);
    game.on('levelOver', showLevelResult);
    game.on('save', function () { refreshMenuCoins(); if (currentScreen('shop')) refreshShop(); if (currentScreen('levels')) refreshLevels(); });
    game.on('cue', function (s) { applyCue(s.cue); refreshHud(); });
    game.on('started', function (s) { syncCueStyle(s.cue); });
    game.on('ballinhand', function () {
      updateHint(game.getState());
      if (game.isHumanTurn()) {
        showToast({ text: '自由球 · 按住球桌拖动母球摆放，松手放下', type: 'info' });
      }
    });
    game.on('ai', function (d) { updateHint(game.getState()); });
    game.on('pause', function (on) {
      if (!on) {
        var pause = $('screen-pause');
        if (pause) pause.classList.remove('active');
      }
    });

    bindAnalytics();
  }

  /* ---------------------------------- 行为埋点 ---------------------------------- */
  /* 第一方埋点：同源 GET /games/pool/e.gif?e=<事件>，由 nginx 写独立日志。
     不引入任何第三方 SDK，不采集身份信息，sessionStorage 只存一个随机串用于去重。
     任何异常都必须静默吞掉——埋点绝不能影响游戏本身。 */
  function bindAnalytics() {
    var ENDPOINT = '/games/pool/e.gif';
    var sid = '';
    try {
      sid = sessionStorage.getItem('kq-sid') || '';
      if (!sid) {
        sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem('kq-sid', sid);
      }
    } catch (e) {
      sid = 'na';
    }

    function send(ev, extra) {
      try {
        // file:// 本地预览时同源绝对路径会解析成 file:///C:/games/... 并报
        // ERR_FILE_NOT_FOUND；线上 HTTPS 才是埋点的目标环境，直接跳过本地。
        if (location.protocol === 'file:') return;
        // 开源友好：第一方埋点只在本项目官方部署域名下发送。
        // 其他人 clone / 本地 / 自托管运行时不会向作者服务器发任何数据。
        var h = location.hostname;
        if (h !== 'xingshuwen.com' && h !== 'www.xingshuwen.com') return;
        var q = '?e=' + encodeURIComponent(ev) + '&sid=' + sid + '&v=1&t=' + Date.now();
        if (extra) q += '&' + extra;
        var img = new Image();
        img.src = ENDPOINT + q;
      } catch (e) { /* 静默 */ }
    }

    // 每局只报一次「开球」：收到 started 后，第一次出杆即为开球
    var awaitingBreak = false;

    game.on('started', function () {
      send('start', 'm=' + (game.mode || 'unknown'));
      awaitingBreak = true;
    });

    game.on('shot', function () {
      // 每次出杆后，下次瞄准的角度尺从视觉中线重新开始。
      lastAngleCursorX = -1;
      var angleStrip = $('angle-strip'), angleCursor = $('angle-strip-cursor');
      if (angleStrip && angleCursor) angleCursor.style.left = Math.round((angleStrip.clientWidth || 0) * 0.5) + 'px';
      if (!awaitingBreak) return;
      awaitingBreak = false;
      send('break', 'm=' + (game.mode || 'unknown'));
    });

    game.on('levelOver', function (r) {
      awaitingBreak = false;
      var ok = !!(r && r.success);
      send(ok ? 'clear' : 'fail', 'm=level&lv=' + encodeURIComponent((r && r.levelId) || ''));
    });

    game.on('matchOver', function (r) {
      awaitingBreak = false;
      if (game.mode !== 'ai') return; // 双人模式不计胜负
      send(r && r.winner === 0 ? 'win' : 'lose', 'm=ai&d=' + encodeURIComponent(game.difficulty || ''));
    });

    send('open');
  }

  function registerCommands() {
    command('shop', function () { refreshShop(); showScreen('shop'); });
    command('help', function () { showScreen('help'); });
    command('levels', function () { refreshLevels(); showScreen('levels'); });
    command('menu', function () { showMenu(); });
    command('rematch', function () {
  if (game && game.mode === 'online' && online.active && Pool.Net) {
    Pool.Net.rematch();
    showToast({ text: '已请求再来一局 · 等待对方同意开始', type: 'info' });
    var box = $('result-actions');
    if (box) box.innerHTML = '<div class="rematch-wait">等待对方同意开始…</div>' + resultButton('返回主菜单', 'menu', false);
    return;
  }
  startMatch(game.mode === 'level' ? 'ai' : game.mode, game.difficulty);
});
    command('restart', function () { restartGame(); });
    command('quit', function () { showMenu(); });
    command('resume', function () { resumeGame(); });
    command('fullscreen', toggleFullscreen);
    command('back', function () { showMenu(); });
  }

  function bindUI() {
    registerCommands();
    // 首次交互解锁音频
    document.addEventListener('pointerdown', function () {
      if (audio && save.settings.sound !== false) audio.unlock();
    }, { once: true });

    document.addEventListener('click', function (e) {
      var actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        e.preventDefault();
        handleAction(actionEl.getAttribute('data-action'), actionEl);
        return;
      }
      var diff = e.target.closest('.difficulty-card');
      if (diff) {
        var cards = document.querySelectorAll('.difficulty-card');
        for (var i = 0; i < cards.length; i++) cards[i].classList.remove('selected');
        diff.classList.add('selected');
        selectedDifficulty = diff.getAttribute('data-difficulty') || 'normal';
        if (audio) audio.ui();
        return;
      }
      var shopBtn = e.target.closest('[data-cue-action]');
      if (shopBtn) {
        handleCueAction(shopBtn.getAttribute('data-cue-id'), shopBtn.getAttribute('data-cue-action'));
        return;
      }
      var levelCard = e.target.closest('[data-level-id]');
      if (levelCard && !levelCard.classList.contains('locked')) {
        startLevelById(levelCard.getAttribute('data-level-id'));
      }
    });

    $('btn-start-solo').addEventListener('click', function () { startMatch('ai', selectedDifficulty); });
    $('btn-guide').addEventListener('click', function () {
      var on = game.toggleGuide();
      updateGuideButton(on);
      if (audio) audio.ui();
    });
    $('btn-sound').addEventListener('click', toggleSound);
    $('btn-pause').addEventListener('click', function () { openPause(); });
    $('btn-spin').addEventListener('click', function () { toggleSpinPanel(); });
    initOnline();
    $('spin-close').addEventListener('click', function () { closeSpinPanel(); });

    var canvas = $('game-canvas');
    canvas.addEventListener('pointerdown', onCanvasDown);
    canvas.addEventListener('pointermove', onCanvasMove);
    canvas.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      // 右键切换：已打开则总是允许关闭，否则需可操作状态才打开
      var widget = $('spin-widget');
      if (widget && widget.classList.contains('open')) { closeSpinPanel(); return; }
      if (!canHumanAct()) return;
      openSpinPanel();
    });
    canvas.addEventListener('pointerup', function () { onCanvasUp(); });
    canvas.addEventListener('pointercancel', function () {
      touchAiming = false;
      if (game && game.cueDragging) game.endCueDrag();
      if (game && game.charging) game.cancelCharge();
    });
    document.addEventListener('pointerup', function () { onCanvasUp(); });
    window.addEventListener('blur', function () {
      if (game) { if (game.charging) game.cancelCharge(); game.setFineAim(false); }
    });

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    bindSpinWidget();
    bindAngleControls();
    bindPowerTrack();
    bindAngleStrip();
    bindSpinPresets();
    bindTouchShoot();
    bindOrientationControls();
    $('spin-ball').addEventListener('dblclick', function (e) {
      e.preventDefault();
      game.resetSpin();
      setSpinUI(0, 0);
      if (audio) audio.ui();
    });
  }

  function bindSpinWidget() {
    var ball = $('spin-ball');
    function updateFromEvent(e) {
      var r = ball.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var nx = (e.clientX - cx) / (r.width * 0.44);
      var ny = (e.clientY - cy) / (r.height * 0.44);
      var len = Math.sqrt(nx * nx + ny * ny);
      if (len > 1) { nx /= len; ny /= len; }
      game.setSpin(nx, -ny);
    }
    ball.addEventListener('pointerdown', function (e) {
      if (!canHumanAct()) return;
      e.preventDefault(); e.stopPropagation();
      spinDragging = true;
      ball.setPointerCapture(e.pointerId);
      updateFromEvent(e);
      if (audio) audio.unlock();
    });
    ball.addEventListener('pointermove', function (e) {
      if (!spinDragging) return;
      e.preventDefault(); e.stopPropagation();
      updateFromEvent(e);
    });
    ball.addEventListener('pointerup', function () { spinDragging = false; });
    ball.addEventListener('pointercancel', function () { spinDragging = false; });
    ball.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  /* ------------------------------ 触屏 / 精准控制 ------------------------------ */
  function bindAngleControls() {
    var btns = document.querySelectorAll('[data-angle-step]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!game || !game.canShoot()) return;
        var deg = parseFloat(this.getAttribute('data-angle-step'));
        if (!isFinite(deg)) return;
        game.fineTune(deg * Math.PI / 180);
        updateAngleUI(game.getState());
        if (audio) audio.ui();
      });
    }
  }

  function normalizeAngleDeg(rad) {
    var d = (rad || 0) * 180 / Math.PI;
    d = ((d + 180) % 360 + 360) % 360 - 180;
    return d;
  }

  var lastAngleCursorX = -1;

  function updateAngleUI(s) {
    var el = $('angle-readout');
    if (!game) return;
    var deg = normalizeAngleDeg(game.aimAngle);
    // 角度尺保持中性中心，不把上一杆的世界角度误显示成刻度偏移。
    if (el) { el.textContent = ''; el.setAttribute('aria-label', '当前瞄准角度'); }
    // 游标固定中线；拖拽仍然改变 aimAngle，视觉刻度不跟着世界角度漂移。
    var strip = $('angle-strip');
    if (strip) {
      var w = strip.clientWidth || 0;
      var cursor = $('angle-strip-cursor');
      if (w > 12 && cursor) {
        var ratio = U.clamp(deg / 180, -1, 1);
        var cxp = Math.round((ratio * 0.5 + 0.5) * (w - 14) + 7);
        if (cxp !== lastAngleCursorX) {
          lastAngleCursorX = cxp;
          cursor.style.left = cxp + 'px';
        }
      }
    }
  }

  /* 潘晓婷教学中的 11 个击球点：中心 1 + 竖线 4（高/中高/中低/低）
     + 横线 2（左塞/右塞）+ 四角 4（高低杆 × 左右塞）。
     每个点都有独立名称与实战效果，预设按钮与说明共用这一张表。 */
  var SPIN_POINTS = [
    { name: '中杆', x: 0, y: 0,
      desc: '中杆 · 定杆：出杆无自转，先滑动后自然滚动；短距离撞击后基本停在原地，分离角接近 90°。' },
    { name: '中高杆', x: 0, y: 0.35,
      desc: '中高杆 · 轻微前冲：微弱前旋，走位柔和不飘，容错率最高，是实战使用率最高的衔接杆法。' },
    { name: '高杆', x: 0, y: 0.7,
      desc: '高杆 · 跟进：强烈前旋，撞击后沿原方向持续跟进，分离角小于 90°，适合向前衔接下一杆。' },
    { name: '中低杆', x: 0, y: -0.35,
      desc: '中低杆 · 轻微回缩：微弱后旋，母球碰球后轻轻减速或小幅回缩，是高低杆之间的柔和过渡。' },
    { name: '低杆', x: 0, y: -0.7,
      desc: '低杆（后斯登）· 回缩：强烈后旋，撞击后反向回缩，分离角大于 90°，可避开前方障碍球。' },
    { name: '左塞', x: -0.7, y: 0,
      desc: '左塞：水平侧旋，直线段几乎不偏，吃库后向左改变反弹角，用于贴库球与多库走位。' },
    { name: '右塞', x: 0.7, y: 0,
      desc: '右塞：水平侧旋，直线段几乎不偏，吃库后向右改变反弹角，用于贴库球与多库走位。' },
    { name: '高杆左塞', x: -0.5, y: 0.5,
      desc: '高杆左塞：先向前跟进，吃库后侧旋向左释放，走出大角度折线，可绕开障碍球。' },
    { name: '高杆右塞', x: 0.5, y: 0.5,
      desc: '高杆右塞（偷塞）：先跟进，吃库后向右折出；夹角加塞可打出偷塞效果，实现跨台走位。' },
    { name: '低杆左塞', x: -0.5, y: -0.5,
      desc: '低杆左塞：先向后回缩，吃库后叠加左塞偏移，适合精准多库救位。' },
    { name: '低杆右塞', x: 0.5, y: -0.5,
      desc: '低杆右塞：先回缩，吃库后叠加右塞偏移，走出非常规线路。' }
  ];
  function spinPointAt(x, y) {
    for (var i = 0; i < SPIN_POINTS.length; i++) {
      var p = SPIN_POINTS[i];
      if (Math.abs(x - p.x) < 0.08 && Math.abs(y - p.y) < 0.08) return p;
    }
    return null;
  }
  function spinDescription(x, y) {
    var hit = spinPointAt(x, y);
    if (hit) return hit.desc;
    // 拖拽到非预设点时按区间给通用说明
    var side = x > 0.25 ? '右塞' : x < -0.25 ? '左塞' : '';
    var strong = Math.abs(y) > 0.55;
    var vert = y > 0.25 ? (strong ? '高杆' : '中高杆') : y < -0.25 ? (strong ? '低杆' : '中低杆') : '';
    if (vert && side) return vert + side + '：复合击球点，' + (y > 0 ? '先跟进' : '先回缩') + '，吃库后向' + (x > 0 ? '右' : '左') + '偏转。';
    if (vert) return vert + '：' + (y > 0 ? '母球撞击后向前跟进。' : '母球撞击后向后回缩。');
    if (side) return side + '：母球碰库后改变反弹角，可用来修正走位。';
    return '中杆：母球平稳向前滚动，撞击后沿分离角自然走位。';
  }

  function updateSpinDescription(x, y) {
    var desc = $('spin-desc');
    if (desc) desc.textContent = spinDescription(x, y);
    var presets = document.querySelectorAll('[data-spin-x]');
    for (var i = 0; i < presets.length; i++) {
      var px = parseFloat(presets[i].getAttribute('data-spin-x')) || 0;
      var py = parseFloat(presets[i].getAttribute('data-spin-y')) || 0;
      presets[i].classList.toggle('active', Math.abs(x - px) < 0.08 && Math.abs(y - py) < 0.08);
    }
  }

  function bindSpinPresets() {
    var presets = document.querySelectorAll('[data-spin-x]');
    for (var i = 0; i < presets.length; i++) {
      presets[i].addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!canHumanAct()) return;
        var sx = parseFloat(this.getAttribute('data-spin-x')) || 0;
        var sy = parseFloat(this.getAttribute('data-spin-y')) || 0;
        game.setSpin(sx, sy);
        setSpinUI(game.spinX, game.spinY);
        if (audio) audio.ui();
      });
    }
  }

  /* 力度条：按住即自动蓄力，向下拖拽则「拉到哪就是多少力度」，松手出杆。
   * 与画布左键 / Space / 触屏出杆按钮共用同一套 beginCharge/releaseShot。 */
  function bindPowerTrack() {
    var track = $('power-track');
    if (!track) return;
    // 手指比 26px 的力度条粗得多，pointer 事件挂在整块控件上，映射仍按力度条本身换算
    var hit = $('power-block') || track;
    var dragId = null, startY = 0, startPower = 0, travel = 120;
    /* 往下拖 = 力度变大（用户明确要求的方向）。
     * 按下后先记录起手位置与当前力度，拖动时按"往下拖了多少"线性加力；
     * 按住的自动蓄力仍然有效，第一次移动才锚定，不会被瞬间抹掉。 */
    function applyPower(p) {
      game.setChargeManual(U.clamp01(p));
      updatePowerUI(game.getState());
    }
    hit.addEventListener('pointerdown', function (e) {
      if (!canHumanAct() || game.charging) return;
      e.preventDefault(); e.stopPropagation();
      if (audio) audio.unlock();
      dragId = e.pointerId;
      startY = e.clientY;
      startPower = game.power || 0;
      var tr = track.getBoundingClientRect();
      travel = Math.max(80, (tr.height || 160) * 0.82);
      try { hit.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (game.beginCharge()) applyPower(startPower);
    });
    hit.addEventListener('pointermove', function (e) {
      if (dragId === null || e.pointerId !== dragId) return;
      e.preventDefault(); e.stopPropagation();
      applyPower(startPower + (e.clientY - startY) / travel);
    });
    function finish(e) {
      if (dragId === null || (e && e.pointerId !== dragId)) return;
      if (e) { e.preventDefault(); e.stopPropagation(); }
      dragId = null; rect = null;
      if (game.charging) {
        // 0% 附近误触/轻点不算出杆：避免从 0 拉动手一抖就归零出杆
        if ((game.power || 0) < 0.05 && typeof game.cancelCharge === "function") {
          game.cancelCharge();
          showToast({ text: "力度太小，未出杆", type: "info" });
        } else {
          game.releaseShot();
          aimLocked = false;
        }
        updatePowerUI(game.getState());
      }
    }
    hit.addEventListener('pointerup', finish);
    hit.addEventListener('pointercancel', function (e) {
      if (dragId === null) return;
      dragId = null; rect = null;
      if (game.charging) game.cancelCharge();
      updatePowerUI(game.getState());
    });
  }

  /* 底部角度刻度尺：左右拖拽做角度精调（每像素 0.02°）。
   * 球台外的角度调整只允许走这里，不经过画布。 */
  function bindAngleStrip() {
    var strip = $('angle-strip');
    if (!strip) return;
    var dragId = null, lastX = 0, sens = 0.12;
    strip.addEventListener('pointerdown', function (e) {
      if (!canHumanAct() || game.charging) return;
      e.preventDefault(); e.stopPropagation();
      if (audio) audio.unlock();
      dragId = e.pointerId;
      lastX = e.clientX;
      // 手指比鼠标粗，灵敏度放大到 0.42°/px；鼠标 0.12°/px 保留精细微调
      // 参考实机：角度条要有钝感，手指每像素 0.12°，鼠标 0.06°。
      sens = (e.pointerType === 'touch' || e.pointerType === 'pen') ? 0.12 : 0.06;
      strip.classList.add('is-dragging');
      try { strip.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    strip.addEventListener('pointermove', function (e) {
      if (dragId === null || e.pointerId !== dragId) return;
      e.preventDefault(); e.stopPropagation();
      var dx = e.clientX - lastX;
      lastX = e.clientX;
      if (!dx) return;
      game.fineTune(dx * sens * Math.PI / 180);
      updateAngleUI(game.getState());
    });
    function finish(e) {
      if (dragId === null || (e && e.pointerId !== dragId)) return;
      if (e) { e.preventDefault(); e.stopPropagation(); }
      dragId = null;
      strip.classList.remove('is-dragging');
      updateAngleUI(game.getState());
    }
    strip.addEventListener('pointerup', finish);
    strip.addEventListener('pointercancel', finish);
  }

  function bindTouchShoot() {
    shootButton = $('btn-touch-shoot') || $('btn-shot');
    if (!shootButton) return;
    var btn = shootButton;
    function start(e) {
      if (!canHumanAct()) return;
      e.preventDefault();
      if (audio) audio.unlock();
      if (!game.beginCharge()) return;
      touchCharging = true;
      btn.classList.add('is-charging');
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      updatePowerUI(game.getState());
    }
    function end(e) {
      if (!touchCharging) return;
      if (e) e.preventDefault();
      touchCharging = false;
      btn.classList.remove('is-charging');
      if (game && game.charging) {
        game.releaseShot();
        try { if (navigator.vibrate) navigator.vibrate(12); } catch (err) { /* ignore */ }
      }
      updatePowerUI(game.getState());
      updateTouchShootState(game.getState());
    }
    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', function (e) {
      if (e) e.preventDefault();
      touchCharging = false;
      btn.classList.remove('is-charging');
      if (game && game.charging) game.cancelCharge();
      updatePowerUI(game.getState());
    });
    btn.addEventListener('click', function (e) { e.preventDefault(); });
  }

  function updateTouchShootState(s) {
    if (!shootButton || !s) return;
    if (!s.charging && touchCharging) {
      touchCharging = false;
      shootButton.classList.remove('is-charging');
    }
    var ready = s.phase === 'aim' && !s.paused && !s.isAI && !s.ballInHand && !s.cueDragging;
    shootButton.classList.toggle('is-ready', !!ready);
    shootButton.classList.toggle('is-disabled', !ready && !s.charging);
    shootButton.setAttribute('aria-disabled', ready ? 'false' : 'true');
  }

  function bindOrientationControls() {
    var enter = $('btn-orientation');
    if (enter) {
      enter.addEventListener('click', function (e) {
        e.preventDefault();
        if (audio) audio.unlock();
        attemptLandscape();
      });
    }
    var fsBtn = $('btn-fullscreen');
    if (fsBtn) {
      fsBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (audio) audio.unlock();
        toggleFullscreen();
      });
    }
    // 全屏状态变化时同步按钮按下态，玩家一眼能看出现在是不是全屏
    document.addEventListener('fullscreenchange', syncFullscreenButton);
    document.addEventListener('webkitfullscreenchange', syncFullscreenButton);
    syncFullscreenButton();
    var back = $('btn-orientation-back');
    if (back) {
      back.addEventListener('click', function (e) {
        e.preventDefault();
        showMenu();
      });
    }
    var skip = $('btn-orientation-skip');
    if (skip) {
      skip.addEventListener('click', function (e) {
        e.preventDefault();
        enterPortraitPlay();
      });
    }
  }

  /* 全屏按钮的按下态（X5 只认 webkitfullscreenchange） */
  function syncFullscreenButton() {
    var btn = $('btn-fullscreen');
    if (!btn) return;
    var on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = on ? '退出全屏 (F)' : '全屏 (F)';
  }

  function enterPortraitPlay() {
    portraitOverride = true;
    document.body.classList.remove('orientation-blocked');
    document.body.classList.add('portrait-play');
    orientationPaused = false;
    if (game && game.paused) game.resume();
    var pauseScreen = $('screen-pause');
    if (pauseScreen) pauseScreen.classList.remove('active');
    applyRendererInsets();
    if (renderer && renderer.resize) renderer.resize();
    refreshHud();
    showToast({ text: '已竖屏进入；横屏视野更好，建议横屏', type: 'info' });
  }

  function attemptLandscape() {
    var root = document.documentElement;
    var p = null;
    try { p = root.requestFullscreen ? root.requestFullscreen() : null; } catch (e) { p = null; }
    var lock = function () {
      try {
        if (screen.orientation && screen.orientation.lock) {
          var q = screen.orientation.lock('landscape');
          if (q && q.catch) q.catch(function () {});
        }
      } catch (e) { /* iOS 等不支持 */ }
      setTimeout(function () {
        syncBodyState();
        applyRendererInsets();
        if (renderer && renderer.resize) renderer.resize();
      }, 420);
    };
    if (p && p.then) p.then(lock).catch(lock); else lock();
    setTimeout(function () {
      if (window.innerHeight > window.innerWidth) {
        // 手机浏览器/微信不一定允许锁定方向；不要让玩家卡死在引导页
        enterPortraitPlay();
      }
    }, 900);
  }

  function isTouchEvent(e) {
    return !!e && (e.pointerType === 'touch' || e.pointerType === 'pen');
  }

  function onTouchCanvasDown(e) {
    if (!canHumanAct()) return;
    if (!pointInTable(e)) return;
    var s = game.getState();
    var p = screenToWorld(e);
    if (!p) return;
    if (audio) audio.unlock();
    // 自由球：按住母球就“抓起来”，拖动跟手；点空白处则直接把球放到那里
    if (s.ballInHand || s.ballReAdjust) {
      if (s.ballInHand || cueScreenDist(e) < cueGrabRadius()) {
        if (game.beginCueDrag(p.x, p.y)) {
          e.preventDefault();
          return;
        }
      }
      if (s.ballInHand) {
        if (!game.placeCueAt(p.x, p.y) && audio) audio.ui();
        return;
      }
    }
    var cue = game.world.getBall('cue');
    if (cue && cue.active !== false && renderer && renderer.worldToScreen) {
      try {
        var cp = renderer.worldToScreen(cue.x, cue.y);
        var canvas = $('game-canvas');
        var r = canvas.getBoundingClientRect();
        var dx = cp.x - (e.clientX - r.left);
        var dy = cp.y - (e.clientY - r.top);
        if (Math.sqrt(dx * dx + dy * dy) < 22) {
          openSpinPanel();
          return;
        }
      } catch (err) { /* ignore */ }
    }
    touchAiming = true;
    try { $('game-canvas').setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    game.aimAt(p.x, p.y);
    e.preventDefault();
  }

  /* ---------------------------------- 画布输入 ---------------------------------- */
  function activeOverlay() {
    return !!document.querySelector('#screens .screen.active');
  }

  function currentScreen(name) {
    var el = $('screen-' + name);
    return !!(el && el.classList.contains('active'));
  }

  function canHumanAct() {
    if (!game || !game.world) return false;
    var s = game.getState();
    return s.phase === 'aim' && !s.paused && !s.isAI && s.mode && !activeOverlay();
  }

  /* 母球在屏幕上的像素距离 —— 用于判断“这一下是不是想抓球” */
  function cueScreenDist(e) {
    if (!renderer || !renderer.worldToScreen || !game || !game.world) return Infinity;
    var cue = game.world.getBall('cue');
    if (!cue) return Infinity;
    try {
      var cp = renderer.worldToScreen(cue.x, cue.y);
      var r = $('game-canvas').getBoundingClientRect();
      var dx = cp.x - (e.clientX - r.left);
      var dy = cp.y - (e.clientY - r.top);
      return Math.sqrt(dx * dx + dy * dy);
    } catch (err) { return Infinity; }
  }

  /* 抓球半径：球半径的 2.2 倍，且不小于 24px，保证手指点得中 */
  function cueGrabRadius() {
    var r = 26;
    if (renderer && renderer.scale && renderer.ballRadius) {
      r = Math.max(24, renderer.scale * renderer.ballRadius * 2.2);
    }
    return r;
  }

  function screenToWorld(e) {
    if (!renderer || !renderer.screenToWorld) return null;
    var canvas = $('game-canvas');
    var r = canvas.getBoundingClientRect();
    try {
      return renderer.screenToWorld(e.clientX - r.left, e.clientY - r.top);
    } catch (err) {
      return null;
    }
  }

  /* 只有台呢范围内才能调整球杆角度；球台外一律交给底部角度条。
   * screenToWorld 返回的是世界坐标（竖屏旋转已逆变换），因此竖屏同样成立。 */
  function pointInTable(e) {
    var p = screenToWorld(e);
    if (!p) return false;
    var W = C.table.width, H = C.table.height, m = 0.015;
    return p.x >= -m && p.x <= W + m && p.y >= -m && p.y <= H + m;
  }

  function onCanvasDown(e) {
    if (e.button !== 0 || !canHumanAct()) return;
    if (isTouchEvent(e)) { onTouchCanvasDown(e); return; }
    if (!pointInTable(e)) return;
    var s = game.getState();
    var p = screenToWorld(e);
    if (!p) return;
    if (audio) audio.unlock();

    // 自由球：按住母球就“抓起来”，拖动跟手；点空白处则直接把球放到那里
    if (s.ballInHand || s.ballReAdjust) {
      if (s.ballInHand || cueScreenDist(e) < cueGrabRadius()) {
        if (game.beginCueDrag(p.x, p.y)) {
          e.preventDefault();
          try { $('game-canvas').setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          return;
        }
      }
      if (s.ballInHand) {
        var placed = game.placeCueAt(p.x, p.y);
        if (!placed && audio) audio.ui();
        return;
      }
    }

    var cue = game.world.getBall('cue');
    if (cue && cue.active !== false && renderer && renderer.worldToScreen) {
      try {
        var cp = renderer.worldToScreen(cue.x, cue.y);
        var dx = cp.x - (e.clientX - $('game-canvas').getBoundingClientRect().left);
        var dy = cp.y - (e.clientY - $('game-canvas').getBoundingClientRect().top);
        if (Math.sqrt(dx * dx + dy * dy) < 24) {
          openSpinPanel();
          return;
        }
      } catch (err) { /* ignore */ }
    }

    if (game.beginCharge()) {
      e.preventDefault();
      updatePowerUI(game.getState());
    }
  }

  function onCanvasMove(e) {
    if (game && game.cueDragging) {
      var dragP = screenToWorld(e);
      if (dragP) game.dragCueTo(dragP.x, dragP.y);
      e.preventDefault();
      return;
    }
    if (aimLocked) return;
    if (!game || !game.world || game.phase === 'menu' || game.phase === 'over' || game.paused) return;
    if (activeOverlay()) return;
    if (!game.isHumanTurn()) return;
    if (isTouchEvent(e)) {
      if (!touchAiming || game.ballInHand) return;
      if (!pointInTable(e)) return;
      var tp = screenToWorld(e);
      if (!tp) return;
      game.aimAt(tp.x, tp.y);
      e.preventDefault();
      return;
    }
    if (game.charging) return;
    if (!pointInTable(e)) return;
    var p = screenToWorld(e);
    if (!p) return;
    game.aimAt(p.x, p.y);
  }

  function onCanvasUp() {
    if (!game) return;
    if (game.cueDragging) { game.endCueDrag(); return; }
    touchAiming = false;
    if (game.charging) {
      game.releaseShot();
      aimLocked = false;
      updatePowerUI(game.getState());
    }
    if (touchCharging && !game.charging) {
      touchCharging = false;
      if (shootButton) shootButton.classList.remove('is-charging');
    }
  }

  /* ---------------------------------- 键盘 ---------------------------------- */
  function onKeyDown(e) {
    if (e.key === 'Shift' && game) game.setFineAim(true);
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    var key = e.key;

    if (key === 'Escape') {
      e.preventDefault();
      if (currentScreen('result')) return;
      if (currentScreen('pause')) { resumeGame(); return; }
      if (currentScreen('difficulty')) { closeScreen('difficulty'); return; }
      if (currentScreen('levels') || currentScreen('shop') || currentScreen('help')) { showMenu(); return; }
      if (game && game.phase !== 'menu' && game.phase !== 'over') openPause();
      return;
    }

    if (key === 'f' || key === 'F') { toggleFullscreen(); return; }
    if (key === 'm' || key === 'M') { toggleSound(); return; }

    if (!game || activeOverlay() || game.phase === 'menu' || game.phase === 'over') return;

    if (key === 'g' || key === 'G') { updateGuideButton(game.toggleGuide()); return; }
    if (key === 's' || key === 'S') { toggleSpinPanel(); return; }
    if (key === 'l' || key === 'L') { toggleAimLock(); return; }

    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      if (!game.canShoot()) return;
      e.preventDefault();
      var step = C.settings.keyboardAngleStep * (e.shiftKey ? 0.22 : 1);
      game.fineTune(key === 'ArrowLeft' ? -step : step);
      return;
    }

    if (e.code === 'Space') {
      if (activeOverlay()) return;
      e.preventDefault();
      if (game.beginCharge()) updatePowerUI(game.getState());
    }
  }

  function onKeyUp(e) {
    if (e.key === 'Shift' && game) game.setFineAim(false);
    if (e.code === 'Space' && game && game.charging) {
      e.preventDefault();
      game.releaseShot();
      aimLocked = false;
      updatePowerUI(game.getState());
    }
  }


  /* ================================ 在线对战 ================================ */
  var online = { active: false, version: 0, mySeat: -1, waiting: false, opponentConnected: true, reconnectTimer: null, reconnectLeft: 0, forfeited: false, pauseTimer: null, pauseLeft: 0, rematchTimer: null, rematchLeft: 0 };

  function setOnlineStatus(text, cls) {
    var el = $('online-status'); if (!el) return;
    el.textContent = text; el.className = 'online-status' + (cls ? ' ' + cls : '');
  }
  function refreshOnlineUI() {
    if (!Pool.Net) { setOnlineStatus('网络模块未加载', 'err'); return; }
    var st = Pool.Net.state;
    var room = $('online-room');
    if (room && st.roomCode) { room.hidden = false; var rc = $('online-room-code'); if (rc) rc.textContent = st.roomCode; }
    else if (room) room.hidden = true;
    if (online.active) setOnlineStatus('已连接 · 房间 ' + st.roomCode, 'ok');
    else setOnlineStatus(st.connected ? '已连接服务器' : '未连接', st.connected ? 'ok' : '');
  }
  function initOnline() {
    if (!Pool.Net) return;
    var btn = $('online-create');
    if (btn) btn.addEventListener('click', function () {
      setOnlineStatus('正在创建房间…');
      Pool.Net.createRoom().then(function (r) {
        if (r._timeout) return setOnlineStatus('创建超时，请检查服务器', 'err');
        online.active = true; online.mySeat = r.seat; online.version = 0; online.waiting = true;
        refreshOnlineUI(); if (audio) audio.star();
      }).catch(function () { setOnlineStatus('连接失败，请确认服务器已启动', 'err'); });
    });
    var join = $('online-join-btn');
    if (join) join.addEventListener('click', function () {
      var inp = $('online-code'); var code = inp ? inp.value.replace(/[^0-9]/g, '') : '';
      if (code.length !== 4) return setOnlineStatus('请输入 4 位数字房间号', 'err');
      setOnlineStatus('正在加入房间…');
      Pool.Net.joinRoom(code).then(function (r) {
        if (r.code === 'NO_ROOM') return setOnlineStatus('房间不存在或已失效', 'err');
        if (r.code === 'ROOM_FULL') return setOnlineStatus('房间已满', 'err');
        if (r._timeout) return setOnlineStatus('加入超时', 'err');
        online.active = true; online.mySeat = r.seat; online.version = 0; online.waiting = true;
        if (inp) inp.value = '';   // 用过的房间号立即清空，避免下次残留
        refreshOnlineUI();
      }).catch(function () { setOnlineStatus('连接失败', 'err'); });
    });
    var prb = document.getElementById("pause-resume-btn");
    if (prb) prb.addEventListener("click", function () {
      if (audio) audio.ui();
      if (Pool.Net) Pool.Net.forceResume();
      // 本地立即恢复（对方也会收到 pause_state false）
      stopPauseCountdown();
      var mask = document.getElementById("pause-mask"); if (mask) mask.hidden = true;
      if (game) game._onlinePaused = false;
      showToast({ text: "已恢复游戏", type: "good" });
      refreshHud();
    });
    var copy = $('online-copy');
    if (copy) copy.addEventListener('click', function () {
      var code = Pool.Net.state.roomCode; if (!code) return;
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(function () { showToast({ text: '房间号已复制：' + code, type: 'good' }); });
      else showToast({ text: '房间号：' + code, type: 'info' });
    });
    Pool.Net.on('start', function (m) {
      if (m.resumed) return;   // 重连恢复走 resume 消息，绝不能重新开局
      online.active = true; online.version = 0; online.waiting = false;
      clearReconnectWait();
      startMatch('online');
      // 关键：把本机座位告诉 Game，isHumanTurn 才能正确锁回合。
      // 双方物理确定性保证 resolveMatchShot 后 activePlayer 自然同步，不手动改回合。
      if (game) {
        game.onlineSeat = online.mySeat;
        game.activePlayer = m.firstPlayer;   // 仅开局先手由服务器统一指定
      }
      showToast({ text: m.rematch ? '再来一局！' : (m.firstPlayer === online.mySeat ? '你先手，开球！' : '对手先手，请等待'), type: 'good' });
      refreshHud();
    });
    Pool.Net.on('opponent_shot', function (m) {
      if (!game) return;
      online.version = Math.max(online.version, m.version || 0);
      var ok = game.applyRemoteShot(m);
      refreshHud();
      if (!ok) showToast({ text: '同步异常：请与对手重开房间', type: 'foul' });
    });
    Pool.Net.on('opponent_disconnected', function () {
      if (!game || game.phase === 'over') return;
      online.opponentConnected = false;
      startReconnectWait();
    });
    Pool.Net.on('opponent_left', function (m) {
      if (game && game.mode === 'online' && game.phase !== 'over') {
        clearReconnectWait();
        // 对方离开/超时：判对方弃权，本机胜，走 pvp 积分
        game.finishMatch(online.mySeat, m && m.reason === 'timeout' ? '对手重连超时，判负' : '对手退出房间，判负');
      }
      online.active = false;
    });
    Pool.Net.on("group_assigned", function (g) { showGroupToast(g); });
    Pool.Net.on("cue_placed", function (p) { onCuePlacedRemote(p); });
    Pool.Net.on("turn_timeout", function (t) {
      if (!game || game.mode !== "online") return;
      game.activePlayer = t.seat;
      game.turnTime = 0; game._turnTimedOut = false;
      game.ballInHand = false; game.freeBallSeat = -1; game.ballReAdjust = false;
      showToast({ text: "本杆超时 · 自动换手", type: "foul" });
      refreshHud();
    });
    Pool.Net.on("force_resume", function () {
      if (!game || game.mode !== "online") return;
      if (game.paused) game.resume();  // 会触发 onPauseChange(false) 广播给对方
      showToast({ text: "对方恢复了游戏", type: "info" });
    });
    Pool.Net.on("pause_state", function (p) {
      if (!game || game.mode !== "online") return;
      var mask = document.getElementById('pause-mask');
      if (p.paused) {
        var by = (typeof p.by === 'number') ? p.by : -1;
        if (by === online.mySeat) return; // 自己暂停不弹对方遮罩
        online.pausedBySeat = by;
        if (mask) mask.hidden = false;
        game._onlinePaused = true;
        startPauseCountdown();
      } else {
        stopPauseCountdown();
        if (mask) mask.hidden = true;
        if (!online.reconnectTimer) game._onlinePaused = false;
      }
      refreshHud();
    });
    Pool.Net.on("rematch_pending", function (p) {
      if (!game || game.mode !== "online") return;
      if (p.by === online.mySeat) {
        showToast({ text: "已请求再来一局 · 等待对方同意开始", type: "info" });
        var box = $("result-actions");
        if (box) { box.innerHTML = '<div class="rematch-wait">等待对方同意开始…<br><span id="rematch-countdown">对方未同意，等待 <b>03:00</b> 后自动断开</span></div>' + resultButton("返回主菜单", "menu", false); startRematchCountdown(); }
      } else {
        showToast({ text: "对方想再来一局", type: "info" });
        var box2 = $("result-actions");
        if (box2) box2.innerHTML = resultButton("同意再来一局", "rematch", true) + resultButton("返回主菜单", "menu", false);
      }
    });
    Pool.Net.on("rematch_cancelled", function () {
      showToast({ text: "对方取消了再来一局", type: "info" });
    });
    Pool.Net.on("room_closed", function (m) {
      stopPauseCountdown();
      var pm = document.getElementById("pause-mask"); if (pm) pm.hidden = true;
      if (game && game.mode === "online") {
        game._onlinePaused = false;
        if (game.phase !== "over") game.finishMatch(1 - online.mySeat, (m && m.reason) || "房间已断开");
      }
      online.active = false;
      showToast({ text: (m && m.reason) || "房间已断开", type: "foul" });
    });
    Pool.Net.on("pause_timeout", function (t) {
      stopPauseCountdown();
      var mask = document.getElementById("pause-mask"); if (mask) mask.hidden = true;
      if (game && game.mode === "online" && game.phase !== "over") {
        if (game.paused) game.resume();
        game._onlinePaused = false;
        game.finishMatch(t.winner, t.reason || "暂停超时");
      }
      refreshHud();
    });
    Pool.Net.on("game_result", function (r) {
      if (!game || game.mode !== "online" || game.phase === "over") return;
      if (r.snapshot && game.applyState) game.applyState(r.snapshot);
      game.finishMatch(r.winner, r.reason || "对手判定");
      refreshHud();
    });
    Pool.Net.on("state_sync", function (s) {
      if (!game || game.mode !== "online" || !s.snapshot) return;
      if (game.phase === "shooting") { game._pendingState = s.snapshot; return; }
      game.applyState(s.snapshot);
      refreshHud();
    });
    Pool.Net.on("turn_sync", function (t) {
      if (!game || game.mode !== "online" || game.phase === "over") return;
      if (game.activePlayer !== t.seat) {
        game.activePlayer = t.seat;
        refreshHud();
      }
    });

    Pool.Net.on("resume", function (m) {
      if (!m || m.resumed === false) return;
      // 重连恢复：不重置局面，直接套用服务器缓存的快照
      online.active = true; online.waiting = false;
      online.version = m.turn || 0;
      clearReconnectWait();
      if (game && game.mode === "online" && m.snapshot && game.applyState) {
        game.applyState(m.snapshot);
        game.onlineSeat = online.mySeat;
        showToast({ text: "已恢复对局", type: "good" });
      } else if (game && game.mode !== "online") {
        startMatch("online");
        game.onlineSeat = online.mySeat;
      }
      refreshHud();
    });
    Pool.Net.on('opponent_reconnected', function (m) {
      clearReconnectWait(); online.opponentConnected = true;
      showToast({ text: '对手已重连，对局继续', type: 'good' });
      refreshHud();
    });
    Pool.Net.on('game_over', function (m) { showToast({ text: '对局结束', type: 'info' }); });
    Pool.Net.on('error', function (m) { setOnlineStatus((m.code || 'ERR') + ': ' + (m.message || ''), 'err'); });
  }
  function startPauseCountdown() {
    stopPauseCountdown();
    online.pauseLeft = 180;
    updatePauseCountdownUI();
    online.pauseTimer = setInterval(function () {
      online.pauseLeft--;
      updatePauseCountdownUI();
      if (online.pauseLeft <= 0) stopPauseCountdown();
    }, 1000);
  }
  function stopPauseCountdown() {
    if (online.pauseTimer) { clearInterval(online.pauseTimer); online.pauseTimer = null; }
  }
  function updatePauseCountdownUI() {
    var el = document.getElementById("pause-countdown"); if (!el) return;
    var b = el.querySelector("b");
    var s = Math.max(0, online.pauseLeft);
    var mm = String(Math.floor(s / 60)).padStart(2, "0");
    var ss = String(s % 60).padStart(2, "0");
    if (b) b.textContent = mm + ":" + ss;
  }
  function startRematchCountdown() {
    if (online.rematchTimer) clearInterval(online.rematchTimer);
    online.rematchLeft = 180;
    updateRematchCountdownUI();
    online.rematchTimer = setInterval(function () {
      online.rematchLeft--;
      updateRematchCountdownUI();
      if (online.rematchLeft <= 0) clearInterval(online.rematchTimer);
    }, 1000);
  }
  function stopRematchCountdown() {
    if (online.rematchTimer) { clearInterval(online.rematchTimer); online.rematchTimer = null; }
  }
  function updateRematchCountdownUI() {
    var el = document.getElementById("rematch-countdown"); if (!el) return;
    var b = el.querySelector("b"); if (!b) return;
    var s = Math.max(0, online.rematchLeft);
    b.textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }
  function startReconnectWait() {
    clearReconnectWait();
    online.reconnectLeft = 60; online.forfeited = false;
    if (game) game._onlinePaused = true;
    var mask = $('reconnect-mask'); if (mask) mask.hidden = false;
    var cnt = $('reconnect-count'); if (cnt) cnt.textContent = String(online.reconnectLeft);
    if (audio) audio.ui();
    online.reconnectTimer = setInterval(function () {
      online.reconnectLeft--;
      if (cnt) cnt.textContent = String(Math.max(0, online.reconnectLeft));
      if (online.reconnectLeft <= 0) {
        clearReconnectWait();
        if (game && game.mode === 'online' && game.phase !== 'over') {
          game.finishMatch(online.mySeat, '对手重连超时，判负');
        }
        online.active = false;
      }
    }, 1000);
  }
  function clearReconnectWait() {
    if (online.reconnectTimer) { clearInterval(online.reconnectTimer); online.reconnectTimer = null; }
    if (game) game._onlinePaused = false;
    var mask = $('reconnect-mask'); if (mask) mask.hidden = true;
  }
  function onCuePlacedRemote(p) {
    if (!game || game.mode !== "online" || game.phase !== "aim") return;
    var cue = game.world && game.world.getBall("cue");
    if (!cue) return;
    cue.x = p.cueX; cue.y = p.cueY; cue.vx = 0; cue.vy = 0;
    cue.active = true; cue.pocketed = false; cue.pocketIndex = null;
    game.ballInHand = false; game.ballReAdjust = false;
    game.emit("hud", game.getState());
    showToast({ text: "对手已摆放母球", type: "info" });
  }
  function onOnlineGroupAssigned(g) {
    if (!online.active || !Pool.Net) return;
    Pool.Net.groupAssigned(g);
    showGroupToast(g);
  }
  function showGroupToast(g) {
    var mine = (g.seat === online.mySeat);
    var gname = g.group === "solid" ? "全色球（1-7）" : "花色球（9-15）";
    showToast({ text: (mine ? "你" : "对手") + "打" + gname + " · 球组已确定", type: "good" });
  }
  function onOnlineShot(p) {
    if (!online.active || !Pool.Net) return;
    online.version++;
    Pool.Net.sendShot({ version: online.version - 1, angle: p.angle, power: p.power, spinX: p.spinX, spinY: p.spinY, cueX: p.cueX, cueY: p.cueY, snapshot: game && game.exportState ? game.exportState() : null });
  }
  function onOnlineSettled(s) {
    if (!online.active || !Pool.Net) return;
    if (s.over) Pool.Net.gameOver(s.winner != null ? s.winner : online.mySeat, '清台');
    else { Pool.Net.swap(s.activePlayer); if (s.snapshot) Pool.Net.stateSync(s); }
  }

  /* ---------------------------------- 操作分发 ---------------------------------- */
  function handleAction(action, el) {
    if (audio) audio.ui();
    // 声明式优先：新增交互只需 command('name', fn) + DOM 上 data-action
    if (typeof commandMap[action] === 'function') {
      commandMap[action](el);
      return;
    }
    switch (action) {
      case 'solo':
        showScreen('difficulty', true);
        break;
      case 'pvp':
        startMatch('pvp');
        break;
      case 'levels':
        refreshLevels();
        showScreen('levels');
        break;
      case 'shop':
        refreshShop();
        showScreen('shop');
        break;
      case 'help':
        showScreen('help');
        break;
      case 'fullscreen':
        toggleFullscreen();
        break;
      case 'close':
        closeScreen('difficulty');
        break;
      case 'back':
        showMenu();
        break;
      case 'resume':
        resumeGame();
        break;
      case 'restart':
        restartGame();
        break;
      case 'quit':
        showMenu();
        break;
      case 'rematch':
        startMatch(game.mode === 'level' ? 'ai' : game.mode, game.difficulty);
        break;
      case 'next-level':
        if (pendingNextLevel) startLevelById(pendingNextLevel);
        break;
      case 'retry-level':
        if (pendingLevelId) startLevelById(pendingLevelId);
        break;
      case 'menu':
        showMenu();
        break;
      default:
        break;
    }
  }

  function handleCueAction(id, action) {
    if (!game) return;
    if (action === 'equip') {
      game.equipCue(id);
    } else if (action === 'buy') {
      game.buyCue(id);
    }
    refreshShop();
    refreshMenu();
    refreshHud();
  }

  function toggleSound() {
    if (!audio) return;
    var next = !audio.enabled || save.settings.sound === false;
    audio.setEnabled(next);
    save.settings.sound = next;
    persistSave(save);
    applySoundUI();
    if (next) audio.ui();
    showToast({ text: next ? '声音已开启' : '声音已关闭', type: 'info' });
  }

  function applySoundUI() {
    var btn = $('btn-sound');
    if (!btn) return;
    var on = save.settings.sound !== false;
    btn.classList.toggle('off', !on);
    var waves = $('sound-waves');
    if (waves) waves.style.opacity = on ? '1' : '0.18';
    var slash = document.getElementById('sound-slash');
    if (!slash) {
      slash = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      slash.setAttribute('d', 'M4 4 20 20');
      slash.setAttribute('stroke', 'currentColor');
      slash.setAttribute('stroke-width', '1.3');
      slash.id = 'sound-slash';
      btn.querySelector('svg').appendChild(slash);
    }
    slash.style.display = on ? 'none' : '';
  }

  /* 全屏：桌面 F 键 / 手机右上角按钮共用。X5 与旧内核只有 webkit 前缀，两种都试。 */
  function toggleFullscreen() {
    var el = document.documentElement;
    var on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    try {
      if (!on) {
        var p = el.requestFullscreen ? el.requestFullscreen()
          : (el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null);
        if (p && p.catch) p.catch(function () {});
      } else {
        var q = document.exitFullscreen ? document.exitFullscreen()
          : (document.webkitExitFullscreen ? document.webkitExitFullscreen() : null);
        if (q && q.catch) q.catch(function () {});
      }
    } catch (err) { /* 微信内可能直接抛错，交给下面的兜底 */ }
    // 全屏切换会改变可视区域：重算 HUD 实测边距并重建画布
    setTimeout(afterFullscreenChange, 220);
    setTimeout(afterFullscreenChange, 620);
  }

  function afterFullscreenChange() {
    syncFullscreenButton();
    syncBodyState();
    applyRendererInsets();
    if (renderer && renderer.resize) renderer.resize();
  }

  /* ---------------------------------- 对局启动 / 退出 ---------------------------------- */
  function startMatch(mode, difficulty) {
    aimLocked = false;
    hideAllScreens();
    $('hud').classList.remove('hidden');
    $('hud').setAttribute('aria-hidden', 'false');
    game.startMatch(mode, difficulty || 'normal');
    syncBodyState();
    applyRendererInsets();
    syncCueStyle(game.cue);
    refreshHud();
    setSpinUI(0, 0);
    updateGuideButton(game.guideEnabled);
    updateHint(game.getState());
  }

  function startLevelById(id) {
    hideAllScreens();
    $('hud').classList.remove('hidden');
    $('hud').setAttribute('aria-hidden', 'false');
    var ok = game.startLevel(id);
    if (!ok) {
      $('hud').classList.add('hidden');
      showScreen('levels');
      return;
    }
    syncBodyState();
    applyRendererInsets();
    syncCueStyle(game.cue);
    refreshHud();
    setSpinUI(0, 0);
    updateGuideButton(game.guideEnabled);
    updateHint(game.getState());
  }

  function restartGame() {
    hideAllScreens();
    $('hud').classList.remove('hidden');
    game.restart();
    syncBodyState();
    applyRendererInsets();
    refreshHud();
    setSpinUI(0, 0);
    updateGuideButton(game.guideEnabled);
  }

  function resumeGame() {
    if (!game) return;
    game.resume();
    closeScreen('pause');
    $('hud').classList.remove('hidden');
    $('hud').setAttribute('aria-hidden', 'false');
    syncBodyState();
    applyRendererInsets();
  }

  function openPause() {
    if (!game || game.phase === 'menu' || game.phase === 'over' || game.paused) return;
    if (game.pause()) {
      showScreen('pause', true);
      if (audio) audio.ui();
    }
  }

  function showMenu() {
    if (resultTimer) { clearTimeout(resultTimer); resultTimer = null; }
    orientationPaused = false;
    if (game) game.quitToMenu();
    $('hud').classList.add('hidden');
    $('hud').setAttribute('aria-hidden', 'true');
    syncBodyState();
    applyRendererInsets();
    hideAllScreens();
    showScreen('menu');
    refreshMenu();
    if (audio) audio.ui();
  }

  /* ---------------------------------- 屏幕 ---------------------------------- */
  function showScreen(name, overlay) {
    if (!overlay) hideAllScreens();
    var el = $('screen-' + name);
    if (el) el.classList.add('active');
    if (name === 'menu') refreshMenu();
    if (name === 'levels') refreshLevels();
    if (name === 'shop') refreshShop();
  }

  function closeScreen(name) {
    var el = $('screen-' + name);
    if (el) el.classList.remove('active');
    if (name === 'difficulty') refreshMenu();
    if (name === 'pause' && game) game.resume();
  }

  function hideAllScreens() {
    var screens = document.querySelectorAll('#screens .screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
  }

  /* ---------------------------------- HUD ---------------------------------- */
  function refreshHud() {
    if (!game || !game.mode) return;
    var s = game.getState();
    var scoreboard = document.querySelector('.scoreboard');
    var card1 = $('player-card-1');
    var vs = document.querySelector('.score-vs');
    var isLevel = s.mode === 'level';

    card1.classList.toggle('hidden', isLevel);
    vs.classList.toggle('hidden', isLevel);
    $('hud-level').classList.toggle('hidden', !isLevel);

    if (isLevel && s.level) {
      var lv = s.level;
      $('hud-level-name').textContent = lv.name;
      var prog = s.levelProgress || null;
      var left = prog ? prog.shotsLeft : Math.max(0, s.maxShots - s.shots);
      var remain = prog ? prog.remaining : s.remaining;
      // 手机端只留关键信息，详细目标数交给顶栏的进球洞
    $('hud-level-shots').textContent = isTouchDevice
      ? ('剩余 ' + left + ' 杆')
      : ('剩余 ' + left + ' 杆 · 目标球 ' + remain + '/' + (prog ? prog.total : (lv.balls || []).length) + ' · 标准 ' + lv.par + ' 杆');
      var goalEl = $('hud-level-goal');
      if (goalEl) goalEl.textContent = (lv.goal && lv.goal.label) ? lv.goal.label : ('清光 ' + (lv.balls || []).length + ' 颗目标球');
      var rulesEl = $('hud-level-rules');
      if (rulesEl) rulesEl.textContent = (lv.rules && (lv.rules.summary || lv.rules.note)) ? (lv.rules.summary || lv.rules.note) : '';
      var sideRules = $('side-rules');
      if (sideRules) {
        var note = (lv.rules && lv.rules.note) ? lv.rules.note : '';
        sideRules.textContent = (lv.rules && lv.rules.summary ? lv.rules.summary : '') + (note ? '\n' + note : '');
      }
    } else {
      var goalEl2 = $('hud-level-goal'); if (goalEl2) goalEl2.textContent = '';
      var rulesEl2 = $('hud-level-rules'); if (rulesEl2) rulesEl2.textContent = '';
      var sideRules2 = $('side-rules'); if (sideRules2) sideRules2.textContent = '';
    }
    var coinEl = $('hud-coins-value');
    if (coinEl) coinEl.textContent = (game && game.save) ? (game.save.coins || 0) : 0;

    var isOnlineMode = s.mode === 'online' && typeof online.mySeat === 'number';
    for (var i = 0; i < 2; i++) {
      var p = s.players[i];
      // 在线：本机(我)固定显示在左(card-0)，对手显示在右(card-1)
      var cardIdx = isOnlineMode ? (i === online.mySeat ? 0 : 1) : i;
      var card = $('player-card-' + cardIdx);
      if (!p) { card.classList.add('hidden'); continue; }
      card.classList.remove('hidden');
      var isTurn = i === s.activePlayer && s.phase !== 'over';
      card.classList.toggle('is-active', isTurn);
      // 双人对战最需要“现在轮到谁”：非当前回合整张卡压暗，当前回合加亮边
      card.classList.toggle('is-idle', !isTurn);
      card.classList.toggle('is-ai', !!p.isAI);
      $('player-name-' + cardIdx).textContent = isOnlineMode ? (i === online.mySeat ? '我' : '对手') : p.name;
      $('avatar-' + cardIdx).textContent = isOnlineMode ? (i === online.mySeat ? '我' : '对手') : (p.short || (p.isAI ? 'AI' : '你'));
      var groupText = '';
      var stripNums = [];
      if (isLevel) {
        var lv = s.level;
        var tlist = (lv && lv.targets) ? lv.targets : (lv && lv.balls ? lv.balls.map(function (b) { return b.number; }) : []);
        groupText = '目标 ' + s.remaining + '/' + tlist.length;
        for (var k = 0; k < tlist.length; k++) stripNums.push(tlist[k]);
      } else if (p.group) {
        var eightLeft = game.countGroup(p.group) === 0;
        groupText = eightLeft ? '目标 · 黑八' : (p.group === 'solid' ? '全色球 · 1-7' : '花色球 · 9-15');
        if (eightLeft) stripNums = [8];
        else {
          var start = p.group === 'solid' ? 1 : 9;
          for (var n = start; n < start + 7; n++) stripNums.push(n);
        }
      } else {
        groupText = '待定';
        stripNums = [0, 0, 0, 0, 0, 0, 0];
      }
      $('player-group-' + cardIdx).textContent = groupText;
      $('balls-' + cardIdx).innerHTML = stripNums.map(ballChipHTML).join('');
    }

    var activeP = s.players[s.activePlayer];
    var turnText = '—';
    if (s.phase === 'over') turnText = '对局结束';
    else if (s.paused) turnText = '已暂停';
    else if (isLevel) turnText = s.aiThinking ? '机器人思考中' : '关卡挑战';
    else if (activeP) {
      if (s.mode === 'pvp') turnText = (isTouchDevice ? (activeP.short || 'P1') : activeP.name) + ' 回合';
      else if (activeP.isAI) turnText = s.aiThinking ? '思考中…' : 'AI 回合';
      else if (isOnlineMode) turnText = (activeP && activeP.isAI) ? '—' : ((s.activePlayer === online.mySeat) ? (s.phase === 'shooting' ? '你击球中' : '你的回合') : (s.phase === 'shooting' ? '对手击球中' : '对手回合'));
      else turnText = s.phase === 'shooting' ? '击球中…' : '你的回合';
    }
    $('turn-label').textContent = turnText;

    var cue = s.cue || game.cue;
    if (cue) {
      $('cue-name').textContent = cue.name;
      $('cue-stats').textContent = (cue.role || '均衡型') + ' · 力量 ' + Math.round(cue.power * 100) + ' · 旋转 ' + Math.round(cue.spin * 100);
    }

    updateGuideButton(s.guide);
    updateHint(s);
    updateSpinAvailability(s);
  }

  /* 顶栏球位：号码 0 = 空位（还没定花色的黑洞）。
     打进的球保留位置、只变成黑洞，这样「进一个少一个」一眼看得出来。 */
  function ballChipHTML(num) {
    if (!num) return '<span class="ball-chip hole"></span>';
    var ball = game.world ? game.world.getBall('b' + num) : null;
    var active = ball ? ball.active : true;
    var seven = num === 8;
    var stripe = num > 8;
    var color = seven ? '#191919' : (Pool.BALL_COLORS[num] || '#ccc');
    return '<span class="ball-chip ' + (stripe ? 'stripe ' : '') + (seven ? 'is-eight ' : '') + (active ? '' : 'done') +
      '" style="--c:' + color + '"><span>' + num + '</span></span>';
  }

  function updateGuideButton(on) {
    var btn = $('btn-guide');
    if (!btn) return;
    btn.classList.toggle('off', !on);
    var blocked = game && game.mode === 'level' && game.level && game.level.allowGuide === false;
    btn.style.opacity = blocked ? '0.32' : '';
  }

  function updateSpinAvailability(s) {
    var disabled = s.mode === 'level' && s.level && s.level.allowSpin === false;
    var orb = $('btn-spin');
    if (orb) orb.classList.toggle('is-disabled', !!disabled);
    if (disabled) closeSpinPanel();
  }

  function updateHint(s) {
    var hint = $('hint-text');
    if (!hint || !s) return;
    var text;
    if (s.phase === 'over') text = '本局结束';
    else if (s.paused) text = '球局已暂停';
    else if (s.phase === 'shooting') text = '球在滚动 · 等待停稳';
    else if (s.cueDragging) text = '抓着母球拖动 · 松手放下';
    else if (s.mode === 'level' && s.ballInHand) text = isTouchDevice ? '自由球 · 按住球桌拖动母球，松手放下' : '自由球 · 移动鼠标预览位置 · 按住拖到想要的位置';
    else if (s.ballReAdjust && !s.isAI) text = isTouchDevice ? '母球已放好 · 还能再按住母球拖动 · 也可以直接瞄准' : '母球已放好 · 还能再按住母球拖动调整 · 也可以直接瞄准';
    else if (s.ballInHand && !s.isAI) text = isTouchDevice ? '对手犯规 · 自由球：按住球桌拖动母球摆放' : '对手犯规 · 自由球：移动鼠标预览位置 · 按住拖到想要的位置';
    else if (s.ballInHand && s.isAI) text = '机器人获得自由球 · 正在选择摆球位置';
    else if (s.aiThinking) text = '机器人正在计算角度与走位…';
    else if (s.isAI) text = '机器人正在瞄准…';
    else if (s.charging) text = isTouchDevice ? '蓄力中 · 松手击球' : '蓄力中 · 松开左键出杆';
    else if (s.mode === 'level') text = '剩余 ' + Math.max(0, s.maxShots - s.shots) + ' 杆 · ' + (isTouchDevice ? '拖动瞄准 · 按住出杆键蓄力' : '移动鼠标瞄准，按住左键蓄力');
    else text = isTouchDevice ? '拖动球桌瞄准 · 按住「蓄力出杆」蓄力 · 松开击球' : '移动鼠标瞄准 · 按住左键蓄力 · 松开击球 · ←→ 微调';
    hint.textContent = text;
  }

  function updateTurnTimer(s) {
    var el = $("turn-timer"); if (!el) return;
    if (game.mode !== "online" || s.phase !== "aim" || s.isAI || game.paused || game._onlinePaused || s.ballInHand) {
      el.hidden = true; return;
    }
    var left = Math.max(0, 45 - (game.turnTime || 0));
    if (left > 10) { el.hidden = true; return; }
    el.hidden = false;
    var n = Math.ceil(left);
    var num = $("turn-timer-num");
    if (num && num.textContent !== String(n)) {
      num.textContent = String(n);
      if (audio && audio.tick) audio.tick();   // 读秒提示音
    }
    el.classList.toggle("urgent", left <= 5);
  }

  function updateLiveUI() {
    if (!game) return;
    var s = game.getState();
    updatePowerUI(s);
    updateAngleUI(s);
    updateTurnTimer(s);
    updateTouchShootState(s);
    // 击球点指示（同步节流：仅变化时写 DOM）
    if (Math.abs(s.spinX - lastSpin.x) > 0.001 || Math.abs(s.spinY - lastSpin.y) > 0.001) {
      setSpinUI(s.spinX, s.spinY);
    }
    // 回合文字/提示在状态变化时刷新即可，这里只处理蓄力提示
    if (s.charging) {
      var ph = $('power-hint');
      var chargeText = isTouchDevice ? '蓄力中 · 松手击球' : '蓄力中 · 松开左键出杆';
      if (ph && ph.textContent !== chargeText) {
        ph.textContent = chargeText;
        ph.classList.add('charging');
      }
    } else {
      var ph2 = $('power-hint');
      if (ph2) {
        // 手机侧栏只有 56px 宽，提示必须极短，否则换行会撑高控件带
        var baseHint = isTouchDevice ? '从上往下拖 · 松手出杆' : '按住左键蓄力 · 松开击球';
        if (ph2.textContent !== baseHint) ph2.textContent = baseHint;
        if (ph2.classList.contains('charging')) ph2.classList.remove('charging');
      }
    }
  }

  function updatePowerUI(s) {
    var p = U.clamp01(s.power || 0);
    var track = $('power-track');
    var val = $('power-value');
    var num = $('power-number');
    // 单一真相源：只写 CSS 变量，横/竖力度条由 CSS 决定用 scaleX 还是 scaleY。
    if (track) {
      track.style.setProperty('--power', p.toFixed(4));
      track.classList.toggle('charging', !!s.charging);
    }
    if (num) num.textContent = Math.round(p * 200);
    if (val) val.textContent = Math.round(p * 100) + '%';
    if (shootButton) {
      shootButton.style.setProperty('--charge', p.toFixed(3));
      shootButton.classList.toggle('is-full', p >= 0.995);
    }
    lastPower = p;
  }

  function setSpinUI(x, y) {
    lastSpin.x = x; lastSpin.y = y;
    var orb = $('btn-spin');
    if (orb) {
      orb.style.setProperty('--spin-x', x.toFixed(3));
      orb.style.setProperty('--spin-y', (-y).toFixed(3));
    }
    var dot = $('spin-dot');
    if (dot) dot.style.transform = 'translate(' + (x * 43) + 'px,' + (-y * 43) + 'px)';
    var lx = '中杆', ly = '无旋转';
    if (x > 0.16) lx = '右塞';
    else if (x < -0.16) lx = '左塞';
    // 细化到中高杆 / 中低杆，避免 11 个击球点里的两档被笼统显示成「高杆/低杆」
    if (y > 0.45) ly = '高杆';
    else if (y > 0.16) ly = '中高杆';
    else if (y < -0.45) ly = '低杆';
    else if (y < -0.16) ly = '中低杆';
    var lxEl = $('spin-label-x');
    var lyEl = $('spin-label-y');
    if (lxEl) lxEl.textContent = lx;
    if (lyEl) lyEl.textContent = ly;
    updateSpinDescription(x, y);
  }

  function setAimLock(on, quiet) {
    aimLocked = !!on;
    var hint = $('hint-text');
    if (hint) {
      if (aimLocked) hint.textContent = '瞄准已锁定 · 按 L 解锁 · 按 Space 蓄力出杆';
      else hint.textContent = '移动鼠标瞄准 · 按住左键蓄力 · 松开击球';
    }
    if (!quiet) showToast({ text: aimLocked ? '瞄准已锁定，调整击球点不会改变方向' : '瞄准已解锁', type: 'info' });
  }

  function toggleAimLock() {
    setAimLock(!aimLocked);
    if (audio) audio.ui();
  }

  function toggleSpinPanel() {
    var widget = $('spin-widget');
    if (!widget) return;
    if (game && game.mode === 'level' && game.level && game.level.allowSpin === false) {
      showToast({ text: '本关不提供旋转控制', type: 'foul' });
      return;
    }
    widget.classList.toggle('open');
    if (widget.classList.contains('open')) setAimLock(true, true);
    if (audio) audio.ui();
  }
  function openSpinPanel() {
    if (game && game.mode === 'level' && game.level && game.level.allowSpin === false) {
      showToast({ text: '本关为固定杆法练习，不提供旋转控制', type: 'info' });
      return;
    }
    $('spin-widget').classList.add('open');
    setAimLock(true, true);
    if (audio) audio.ui();
  }
  function closeSpinPanel() { $('spin-widget').classList.remove('open'); }

  /* ---------------------------------- 菜单 / 商店 / 关卡 ---------------------------------- */
  function syncCueStyle(cue) {
    if (!cue) return;
    if (renderer && renderer.setCue) renderer.setCue(cue.id);
    var root = document.documentElement;
    root.style.setProperty('--cue-butt', cue.colors.butt);
    root.style.setProperty('--cue-shaft', cue.colors.shaft);
    root.style.setProperty('--cue-accent', cue.colors.accent);
    root.style.setProperty('--cue-wrap', cue.colors.wrap || '#24150f');
  }

  function applyCue(cue) {
    if (!cue) return;
    syncCueStyle(cue);
    refreshMenuCue(cue);
  }

  function refreshMenu() {
    if (!game) return;
    refreshMenuCoins();
    var cue = game.cue || C.cues[0];
    syncCueStyle(cue);
    refreshMenuCue(cue);
    var stars = game.totalStars();
    var cleared = 0;
    for (var k in save.cleared) if (save.cleared[k]) cleared++;
    var totalLevels = (Pool.LEVELS || []).length;
    var rec = save.record || { wins: 0, losses: 0 };
    $('menu-record-text').textContent = '通关 ' + cleared + '/' + totalLevels + ' · ' + (rec.wins || 0) + ' 胜 ' + (rec.losses || 0) + ' 负';
    var lit = U.clamp(Math.ceil(stars / 6), 0, 5);
    var starHTML = '';
    for (var i = 0; i < 5; i++) {
      starHTML += '<svg class="' + (i < lit ? 'on' : '') + '" viewBox="0 0 24 24"><path d="m12 3.4 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3.4Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    }
    $('menu-record-stars').innerHTML = starHTML;
  }

  function refreshMenuCoins() {
    if (!game) return;
    var s = game.getState();
    $('menu-coins').textContent = s.coins || 0;
    $('menu-stars').textContent = s.totalStars || 0;
    $('levels-coins').textContent = s.coins || 0;
    $('shop-coins').textContent = s.coins || 0;
  }

  function refreshMenuCue(cue) {
    if (!cue) return;
    $('menu-cue-name').textContent = cue.name;
    $('showcase-name').textContent = cue.name;
    $('showcase-en').textContent = cue.en;
    $('showcase-tier').textContent = cue.en.split(' ')[0] || 'CUE';
    $('showcase-power').textContent = Math.round(cue.power * 100);
    $('showcase-spin').textContent = Math.round(cue.spin * 100);
    $('showcase-aim').textContent = Math.round(cue.aim * 100);
    var bars = document.querySelectorAll('.showcase-stats i em');
    var vals = [cue.power, cue.spin, cue.aim];
    for (var i = 0; i < bars.length; i++) {
      bars[i].style.width = U.clamp(62 + (vals[i] - 0.98) * 300, 58, 100) + '%';
    }
    document.documentElement.style.setProperty('--cue-butt', cue.colors.butt);
    document.documentElement.style.setProperty('--cue-shaft', cue.colors.shaft);
    document.documentElement.style.setProperty('--cue-accent', cue.colors.accent);
    document.documentElement.style.setProperty('--cue-wrap', cue.colors.wrap || '#24150f');
  }

  function refreshLevels() {
    if (!game) return;
    var grid = $('level-grid');
    if (!grid) return;
    var levels = Pool.LEVELS || [];
    var html = '';
    for (var i = 0; i < levels.length; i++) {
      var lv = levels[i];
      var unlocked = i === 0 || (save.cleared && save.cleared[levels[i - 1].id]);
      var stars = (save.stars && save.stars[lv.id]) || 0;
      var mini = '';
      for (var b = 0; b < lv.balls.length; b++) {
        var num = lv.balls[b].number;
        mini += '<i style="--c:' + (Pool.BALL_COLORS[num] || '#ccc') + '"></i>';
      }
      var starHTML = '';
      for (var st = 0; st < 3; st++) {
        starHTML += '<svg class="' + (st < stars ? 'on' : '') + '" viewBox="0 0 24 24"><path d="m12 3.4 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3.4Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
      }
      var diff = '';
      for (var d = 0; d < 5; d++) diff += '<i class="' + (d < lv.difficulty ? 'on' : '') + '"></i>';
      html += '<article class="level-card ' + (unlocked ? '' : 'locked') + ' ' + (stars > 0 ? 'best' : '') + '" data-level-id="' + lv.id + '">' +
        '<div class="level-card-top"><span class="level-index">LEVEL ' + String(i + 1).padStart(2, '0') + '</span><span class="level-diff">' + diff + '</span></div>' +
        '<h3>' + lv.name + '</h3><span class="level-sub">' + (lv.subtitle || '') + '</span>' +
        '<div class="level-balls-mini">' + mini + '</div>' +
        '<div class="level-card-foot"><span class="level-stars">' + starHTML + '</span>' +
        '<span class="level-reward"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M12 7.5v9M9.8 9.5h3.5a1.8 1.8 0 0 1 0 3.5h-2.6a1.8 1.8 0 0 0 0 3.5h3.6" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>' + (lv.rewardCoins || 0) + '</span></div>' +
        (unlocked ? '' : '<div class="level-lock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>通过上一关解锁</div>') +
        '</article>';
    }
    grid.innerHTML = html;
    refreshMenuCoins();
  }

  /* 商店球杆插图：按 cues[].visual 生成自有造型语言。
   * 只借用「圆柱渐变 / 金属接环 / 握把纹理 / 几何装饰」这些通用表现手法，
   * 不复制任何第三方游戏的具体杆身配色、纹样、名称或角色形象。 */
  function cueArt(cue) {
    var shaft = 'var(--cue-shaft)';
    var butt = 'var(--cue-butt)';
    var accent = 'var(--cue-accent)';
    var wrap = 'var(--cue-wrap)';
    var v = cue.visual || {};
    var shape = cue.shape;
    var gid = 'cue-' + (cue.id || 'x');
    var defs = '<defs>' +
      '<linearGradient id="' + gid + '-s" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="rgba(255,255,255,.45)"/><stop offset=".42" stop-color="' + shaft + '"/>' +
        '<stop offset="1" stop-color="rgba(0,0,0,.30)"/></linearGradient>' +
      '<linearGradient id="' + gid + '-b" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="rgba(255,255,255,.18)"/><stop offset=".5" stop-color="' + butt + '"/>' +
        '<stop offset="1" stop-color="rgba(0,0,0,.42)"/></linearGradient>' +
      '</defs>';
    var art = '';

    function jointRects(x0, x1, h) {
      var n = v.joint === 'double' ? 2 : (v.joint === 'single' ? 1 : 0);
      var out = '';
      for (var i = 0; i < n; i++) {
        var x = x0 + (x1 - x0) * (i + 1) / (n + 1);
        out += '<rect x="' + (x - 2) + '" y="' + (32 - h / 2) + '" width="4" height="' + h + '" rx="1" fill="' + accent + '" opacity=".92"/>';
      }
      return out;
    }
    function wrapTexture(x0, x1, h) {
      var out = '', x, i;
      if (v.wrapStyle === 'rings') {
        for (x = x0 + 6; x < x1 - 4; x += 9) out += '<rect x="' + x + '" y="' + (32 - h / 2) + '" width="2" height="' + h + '" fill="rgba(0,0,0,.28)"/>';
      } else if (v.wrapStyle === 'knurl') {
        for (x = x0 + 4; x < x1 - 2; x += 7) {
          out += '<path d="M' + x + ' ' + (32 - h / 2) + ' l4 ' + h + '" stroke="rgba(255,255,255,.16)" stroke-width="1" fill="none"/>';
          out += '<path d="M' + (x + 4) + ' ' + (32 - h / 2) + ' l-4 ' + h + '" stroke="rgba(0,0,0,.22)" stroke-width="1" fill="none"/>';
        }
      } else if (v.wrapStyle === 'leather') {
        out += '<rect x="' + x0 + '" y="' + (32 - h / 2) + '" width="' + (x1 - x0) + '" height="' + h + '" fill="rgba(0,0,0,.10)"/>';
        for (x = x0 + 8; x < x1 - 4; x += 16) out += '<line x1="' + x + '" y1="' + (32 - h / 2) + '" x2="' + x + '" y2="' + (32 + h / 2) + '" stroke="rgba(255,255,255,.10)" stroke-width="1"/>';
      } else { // linen
        for (x = x0 + 3; x < x1 - 2; x += 5) out += '<line x1="' + x + '" y1="' + (32 - h / 2) + '" x2="' + (x + 2) + '" y2="' + (32 + h / 2) + '" stroke="rgba(0,0,0,.18)" stroke-width="1"/>';
      }
      return out;
    }
    function motif(cx, cy, r) {
      var a = v.accentShape;
      if (a === 'diamond') return '<path d="M' + cx + ' ' + (cy - r) + ' L' + (cx + r) + ' ' + cy + ' L' + cx + ' ' + (cy + r) + ' L' + (cx - r) + ' ' + cy + ' Z" fill="' + accent + '"/>';
      if (a === 'chevron') return '<path d="M' + (cx - r) + ' ' + (cy - r * .6) + ' L' + cx + ' ' + (cy + r * .35) + ' L' + (cx + r) + ' ' + (cy - r * .6) + '" stroke="' + accent + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
      if (a === 'star') return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * .6) + '" fill="' + accent + '"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (r * .24) + '" fill="#fff6d8"/>';
      if (a === 'dot') return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * .45) + '" fill="' + accent + '"/>';
      return '';
    }

    if (shape === 'rod' || shape === 'pistol' || shape === 'wand' || shape === 'golf') {
      // 异形杆：沿用自有轮廓，补一层通用金属接环与几何装饰
      if (shape === 'rod') {
        art = '<line x1="14" y1="32" x2="300" y2="32" stroke="' + shaft + '" stroke-width="5" stroke-linecap="round"/>' +
          '<line x1="300" y1="32" x2="402" y2="32" stroke="' + butt + '" stroke-width="10" stroke-linecap="round"/>' +
          '<circle cx="296" cy="32" r="19" fill="rgba(8,18,24,.72)" stroke="' + accent + '" stroke-width="3"/>' +
          '<circle cx="296" cy="32" r="7" fill="' + accent + '"/>' +
          '<path d="M310 13 C338 8 360 14 376 26" stroke="' + accent + '" stroke-width="2" fill="none" opacity=".8"/>';
      } else if (shape === 'pistol') {
        art = '<rect x="16" y="24" width="300" height="17" rx="4" fill="' + shaft + '"/>' +
          '<rect x="16" y="29" width="300" height="5" fill="rgba(255,255,255,.18)"/>' +
          '<rect x="286" y="20" width="38" height="25" rx="4" fill="' + wrap + '" stroke="' + accent + '" stroke-width="2"/>' +
          '<path d="M278 40 L308 40 L326 60 L300 60 Z" fill="' + butt + '" stroke="' + accent + '" stroke-width="2"/>' +
          '<circle cx="305" cy="32" r="10" fill="rgba(0,0,0,.35)" stroke="' + accent + '" stroke-width="2"/>' +
          '<line x1="322" y1="28" x2="398" y2="28" stroke="' + butt + '" stroke-width="9" stroke-linecap="round"/>';
      } else if (shape === 'wand') {
        art = '<path d="M14 34 L330 28 L394 27" stroke="' + shaft + '" stroke-width="7" stroke-linecap="round" fill="none"/>' +
          '<path d="M14 34 L330 28" stroke="rgba(255,255,255,.28)" stroke-width="2" stroke-linecap="round" fill="none"/>' +
          '<path d="M366 9 L372 24 L388 29 L373 35 L367 51 L361 35 L346 29 L361 23 Z" fill="' + accent + '"/>' +
          '<circle cx="366" cy="29" r="4" fill="#fff6d8"/>' +
          '<circle cx="338" cy="14" r="2.4" fill="' + accent + '" opacity=".8"/>';
      } else {
        art = '<line x1="14" y1="28" x2="334" y2="28" stroke="' + shaft + '" stroke-width="7" stroke-linecap="round"/>' +
          '<path d="M334 28 Q368 20 384 36 Q398 50 374 54 L340 50 Q321 47 326 36 Z" fill="' + shaft + '" stroke="rgba(20,30,24,.65)" stroke-width="2"/>' +
          '<path d="M338 38 L376 34" stroke="' + accent + '" stroke-width="2" opacity=".8"/>' +
          '<rect x="18" y="20" width="80" height="18" rx="5" fill="' + wrap + '"/>' +
          '<rect x="18" y="20" width="80" height="3" rx="1.5" fill="rgba(255,255,255,.2)"/>';
      }
      art += motif(210, 32, 7);
    } else {
      // 常规杆：渐变圆柱 + 皮头 + 先角 + 接环 + 握把纹理 + 装饰母题
      var h = v.profile === 'taper' ? 6 : (v.profile === 'faceted' ? 9 : 7);
      art =
        '<rect x="14" y="' + (32 - h / 2) + '" width="232" height="' + h + '" rx="' + (h * .45) + '" fill="url(#' + gid + '-s)"/>' +
        '<rect x="246" y="' + (32 - h / 2 - 1) + '" width="156" height="' + (h + 2) + '" rx="' + (h * .45) + '" fill="url(#' + gid + '-b)"/>' +
        '<rect x="11" y="' + (32 - h / 2 - 1) + '" width="9" height="' + (h + 2) + '" rx="2" fill="#4a78a6"/>' +
        '<rect x="20" y="' + (32 - h / 2 - 1) + '" width="12" height="' + (h + 2) + '" rx="2" fill="#efe7d4" opacity=".92"/>' +
        jointRects(244, 402, h + 4) +
        wrapTexture(300, 398, h + 2) +
        motif(274, 32, 8);
      if (v.tipRing !== false) art += '<rect x="21" y="' + (32 - h / 2 - 1) + '" width="2" height="' + (h + 2) + '" fill="' + accent + '" opacity=".9"/>';
    }
    return '<svg class="shop-cue-art" viewBox="0 0 420 64" aria-hidden="true">' + defs + art + '</svg>';
  }

  function refreshShop() {
    if (!game) return;
    var grid = $('shop-grid');
    if (!grid) return;
    var stars = game.totalStars();
    var coins = save.coins || 0;
    var html = '';
    for (var i = 0; i < C.cues.length; i++) {
      var cue = C.cues[i];
      var owned = game.isCueOwned(cue.id);
      var equipped = save.equipped === cue.id;
      var starOk = stars >= (cue.starsRequired || 0);
      var coinOk = coins >= cue.price;
      var btnText = '', btnClass = '', btnAction = 'buy';
      if (equipped) { btnText = '已装备'; btnClass = 'equipped'; btnAction = 'none'; }
      else if (owned) { btnText = '装备'; btnAction = 'equip'; }
      else if (!starOk) { btnText = '未解锁'; btnClass = 'locked'; btnAction = 'none'; }
      else if (!coinOk) { btnText = '金币不足'; btnClass = 'locked'; btnAction = 'none'; }
      else { btnText = '购买'; btnAction = 'buy'; }
      var styleVars = '--cue-butt:' + cue.colors.butt + ';--cue-shaft:' + cue.colors.shaft + ';--cue-accent:' + cue.colors.accent + ';--cue-wrap:' + (cue.colors.wrap || '#24150f');
      var rewardTag = '';
      if (C.levelRewardCues) {
        for (var rk in C.levelRewardCues) {
          if (C.levelRewardCues[rk] !== cue.id) continue;
          var rewardLv = null;
          for (var rl = 0; rl < (Pool.LEVELS || []).length; rl++) if (Pool.LEVELS[rl].id === rk) rewardLv = Pool.LEVELS[rl];
          rewardTag = '<span class="shop-reward-tag">首通「' + (rewardLv ? rewardLv.name : rk) + '」免费获得</span>';
          break;
        }
      }
      var stats = '<div class="shop-stats">' +
        shopStat('力量', cue.power) + shopStat('旋转', cue.spin) + shopStat('辅助线', cue.aim) + '</div>';
      var shapeName = ({ rod: '钓竿', pistol: '枪式', wand: '魔杖', golf: '高尔夫' })[cue.shape] || '';
      var shapeTag = shapeName ? '<span class="shop-shape-tag">异形 · ' + shapeName + '</span>' : '';
      html += '<article class="shop-card ' + (equipped ? 'equipped' : '') + '" data-shape="' + (cue.shape || 'classic') + '" style="' + styleVars + '">' +
        '<div class="shop-card-top"><span class="shop-tier">' + (cue.starsRequired ? cue.starsRequired + ' 星' : '入门') + '</span>' +
        (owned ? '<span class="shop-owned">' + (equipped ? '当前装备' : '已拥有') + '</span>' : '') + '</div>' +
        '<div class="shop-cue-visual">' + cueArt(cue) + '</div>' +
        '<h3>' + cue.name + '</h3><div class="shop-en">' + cue.en + ' · ' + (cue.role || '均衡型') + '</div>' + shapeTag +
        '<p class="shop-desc">' + cue.desc + '</p>' + rewardTag + stats +
        '<div class="shop-foot">' +
        (owned ? '<span class="shop-price">' + (cue.starsRequired ? cue.starsRequired + ' 星解锁' : '初始球杆') + '</span>' :
          (starOk ? '<span class="shop-price"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M12 7.5v9M9.8 9.5h3.5a1.8 1.8 0 0 1 0 3.5h-2.6a1.8 1.8 0 0 0 0 3.5h3.6" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>' + cue.price + '</span>' :
            '<span class="shop-requirement">需 ' + (cue.starsRequired || 0) + ' 星解锁</span>')) +
        '<button class="shop-buy ' + btnClass + '" data-cue-action="' + btnAction + '" data-cue-id="' + cue.id + '"' + (btnAction === 'none' ? ' disabled' : '') + '>' + btnText + '</button>' +
        '</div></article>';
    }
    grid.innerHTML = html;
    refreshMenuCoins();
  }

  function shopStat(label, val) {
    return '<div class="shop-stat"><span>' + label + '</span><b>' + Math.round(val * 100) + '</b><i><em style="width:' + U.clamp(62 + (val - 0.98) * 300, 58, 100) + '%"></em></i></div>';
  }

  /* ---------------------------------- Toast / 回合 / 结果 ---------------------------------- */
  /* 手机上提示条只有 336px 宽，长文案会变成 4~5 行压住球台；
   * 这里按「·」分段截短，只保留前半句（完整文案仍在 hint/关卡说明里）。 */
  function shortToastText(text) {
    var t = String(text || '');
    if (!isTouchDevice || t.length <= 30) return t;
    var parts = t.split(' · ');
    var out = parts[0];
    for (var i = 1; i < parts.length; i++) {
      if ((out + ' · ' + parts[i]).length > 30) break;
      out += ' · ' + parts[i];
    }
    if (out.length < t.length && out.indexOf('。') < 0) out += '…';
    return out;
  }

  function showToast(data) {
    if (!data) return;
    var toast = $('toast');
    if (!toast) return;
    toast.textContent = shortToastText(data.text || '');
    toast.className = 'toast show' + (data.type ? ' ' + data.type : '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 2400);
  }

  function onTurn(data) {
    if (!data) return;
    setAimLock(false, true);
    // 换人提示音：本地双人和人机对战统一使用同一套（开球那一回合不响）
    if (audio && data.switched && audio.turnSwitch) audio.turnSwitch();
    // 回合状态只用顶部对抗条表达，不再用中央大横幅盖住台面
    var flash = $('turn-flash');
    if (flash) { flash.classList.remove('show'); flash.textContent = ''; }
    var tl = $('turn-label');
    if (tl) tl.textContent = data.foul ? '犯规 · 自由球' :
      (data.level ? '继续挑战' : (data.break ? '开球' : (data.isAI ? '机器人回合' : (data.name || '你的回合'))));
  }

  function resultButton(label, action, primary) {
    return '<button class="' + (primary ? 'btn-primary' : 'btn-ghost') + '" data-action="' + action + '">' + label + '</button>';
  }

  function showMatchResult(res) {
    if (!res) return;
    if (resultTimer) clearTimeout(resultTimer);
    resultTimer = setTimeout(function () {
      $('hud').classList.add('hidden');
      hideAllScreens();
      syncBodyState();
      var isAI = game.mode === 'ai';
      var isOnline = game.mode === 'online';
      var humanWon = isOnline ? (res.winner === online.mySeat) : (res.winner === 0);
      var lose = (isAI || isOnline) && !humanWon;
      var modal = document.querySelector('#screen-result .modal');
      modal.classList.toggle('result-lose', lose);
      $('result-kicker').textContent = lose ? 'MATCH COMPLETE · DEFEAT' : 'MATCH COMPLETE';
      if (isOnline) $('result-title').textContent = humanWon ? '你获胜了' : '你输了';
      else if (!isAI) $('result-title').textContent = res.winnerName + ' 获胜';
      else $('result-title').textContent = humanWon ? '你赢下了这局' : '惜败一局';
      $('result-sub').textContent = (res.reason || '') + (isOnline ? (humanWon ? ' · 干得漂亮' : ' · 再来一局扳回来') : (isAI ? ' · 机器人 ' + (humanWon ? '承认了这局的差距' : '把握住了机会') : ' · 一场势均力敌的较量'));
      $('result-stars').innerHTML = '';
      var totalShots = (res.shots || []).reduce(function (a, b) { return a + b; }, 0);
      var totalFouls = (res.fouls || []).reduce(function (a, b) { return a + b; }, 0);
      $('result-stats').innerHTML =
        '<div class="result-stat"><span>总杆数</span><b>' + totalShots + '</b></div>' +
        '<div class="result-stat"><span>犯规</span><b>' + totalFouls + '</b></div>' +
        '<div class="result-stat"><span>用时</span><b>' + U.formatTime(game.time) + '</b></div>';
      var reward = $('result-reward');
      var coins = (typeof res.coins === 'number') ? res.coins : 0;
      if (coins !== 0) {
        reward.classList.remove('hidden');
        reward.querySelector('span').textContent = coins > 0 ? '金币奖励' : '金币扣除';
        $('result-coins').textContent = (coins > 0 ? '+' : '') + coins;
        reward.classList.toggle('result-cost', coins < 0);
      } else {
        reward.classList.add('hidden');
      }
      $('result-actions').innerHTML = resultButton('再来一局', 'rematch', true) + resultButton('返回主菜单', 'menu', false);
      showScreen('result', true);
      refreshMenuCoins();
    }, 480);
  }

  function showLevelResult(res) {
    if (!res) return;
    if (resultTimer) clearTimeout(resultTimer);
    var levels = Pool.LEVELS || [];
    var idx = -1;
    for (var i = 0; i < levels.length; i++) if (levels[i].id === res.levelId) idx = i;
    pendingLevelId = res.levelId;
    pendingNextLevel = (idx >= 0 && idx + 1 < levels.length) ? levels[idx + 1].id : null;
    resultTimer = setTimeout(function () {
      $('hud').classList.add('hidden');
      hideAllScreens();
      syncBodyState();
      var modal = document.querySelector('#screen-result .modal');
      modal.classList.toggle('result-lose', !res.success);
      $('result-kicker').textContent = res.success ? 'LEVEL CLEARED' : 'CHALLENGE FAILED';
      $('result-title').textContent = res.success ? '关卡通过' : '挑战失败';
      $('result-sub').textContent = res.success ?
        '用 ' + res.shots + ' 杆清台 · 标准 ' + res.par + ' 杆' :
        '杆数用尽 · 还剩 ' + (game.activeObjectCount ? game.activeObjectCount() : 0) + ' 颗球';
      var starHTML = '';
      for (var s = 0; s < 3; s++) {
        starHTML += '<span class="rstar ' + (s < res.stars ? 'on' : '') + '"><svg viewBox="0 0 24 24"><path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.6l6.5-.9L12 2.8Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg></span>';
      }
      $('result-stars').innerHTML = starHTML;
      $('result-stats').innerHTML =
        '<div class="result-stat"><span>使用杆数</span><b>' + res.shots + '</b></div>' +
        '<div class="result-stat"><span>标准杆</span><b>' + res.par + '</b></div>' +
        '<div class="result-stat"><span>杆数上限</span><b>' + res.maxShots + '</b></div>';

      var reward = $('result-reward');
      var lcoins = (typeof res.coins === 'number') ? res.coins : 0;
      if (lcoins !== 0) {
        reward.classList.remove('hidden');
        reward.querySelector('span').textContent = lcoins > 0 ?
          (res.firstClear ? '首次通关奖励' : '通关金币') : '挑战失败扣除';
        $('result-coins').textContent = (lcoins > 0 ? '+' : '') + lcoins;
        reward.classList.toggle('result-cost', lcoins < 0);
      } else {
        reward.classList.add('hidden');
      }

      var actions = '';
      if (res.success) {
        if (pendingNextLevel) actions += resultButton('下一关 →', 'next-level', true);
        actions += resultButton('再来一次', 'retry-level', !pendingNextLevel);
      } else {
        actions += resultButton('再来一次', 'retry-level', true);
      }
      actions += resultButton('主菜单', 'menu', false);
      $('result-actions').innerHTML = actions;

      var unlock = document.querySelector('.new-cue-unlock');
      if (unlock) unlock.remove();
      if (res.cueReward) {
        var cueNote = document.createElement('div');
        cueNote.className = 'new-cue-unlock';
        cueNote.textContent = '关卡奖励球杆 · ' + res.cueReward.name + ' 已加入球杆库';
        $('result-actions').parentNode.insertBefore(cueNote, $('result-actions'));
      } else if (res.cueRewardCoins > 0) {
        var coinNote = document.createElement('div');
        coinNote.className = 'new-cue-unlock';
        coinNote.textContent = '已拥有该奖励球杆 · 返还 ' + res.cueRewardCoins + ' 金币';
        $('result-actions').parentNode.insertBefore(coinNote, $('result-actions'));
      }
      if (res.success) {
        var starsNow = game.totalStars();
        for (var c = 0; c < C.cues.length; c++) {
          var cue = C.cues[c];
          if (cue.starsRequired > 0 && starsNow >= cue.starsRequired && !game.isCueOwned(cue.id)) {
            var note = document.createElement('div');
            note.className = 'new-cue-unlock';
            note.textContent = '商店已解锁新球杆 · ' + cue.name + '（' + cue.starsRequired + ' 星）';
            $('result-actions').parentNode.insertBefore(note, $('result-actions'));
            break;
          }
        }
      }

      showScreen('result', true);
      refreshMenuCoins();
      if (res.success) {
        var starEls = document.querySelectorAll('#result-stars .rstar');
        for (var i2 = 0; i2 < starEls.length; i2++) {
          (function (ii) {
            setTimeout(function () {
              starEls[ii].classList.add('show');
              if (audio && ii < res.stars) audio.star(ii);
            }, 260 + ii * 160);
          })(i2);
        }
      }
    }, 520);
  }

  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();
})();
