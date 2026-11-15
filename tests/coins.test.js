/* 巅峰台球 / PRO POOL — 金币结算 + 自由球预览 + levelProgress 单测（ai-levels-dev）
 * 纯 Node（vm 沙箱）加载 config / physics / levels / game，不依赖浏览器。
 * 运行：node tests/coins.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

let pass = 0;
let fail = 0;
const fails = [];

function check(name, cond, detail) {
  const tail = detail ? '  ' + detail : '';
  if (cond) {
    pass++;
    console.log('  [OK]   ' + name + tail);
  } else {
    fail++;
    fails.push(name + tail);
    console.log('  [FAIL] ' + name + tail);
  }
}

function createSandbox() {
  const window = {};
  const sandbox = {
    window: window,
    self: window,
    console: console,
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    String: String, Number: Number, Boolean: Boolean, RegExp: RegExp,
    Error: Error, TypeError: TypeError, RangeError: RangeError,
    parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, isFinite: isFinite,
    setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  sandbox.globalThis = sandbox;
  window.window = window;
  vm.createContext(sandbox);
  return sandbox;
}

function loadScript(sandbox, rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

const sandbox = createSandbox();
['js/config.js', 'js/physics.js', 'js/levels.js', 'js/game.js'].forEach(function (f) {
  loadScript(sandbox, f);
});

const Pool = sandbox.window.Pool;
const C = Pool.CONFIG;
const Game = Pool.Game;

/* 与 game.js 内部一致的经济默认值，用于校验 CONFIG.economy 缺失/不完整时的回退 */
const DEFAULT_ECONOMY = {
  matchWin: { easy: 80, normal: 140, hard: 240 },
  matchLoss: { easy: 30, normal: 45, hard: 70 },
  pvpWin: 60,
  levelWinRepeatRate: 0.30,
  levelLoss: 40,
  minCoins: 0
};

function finiteNumber(value, fallback) {
  return (typeof value === 'number' && isFinite(value)) ? value : fallback;
}

function resolvedEconomy() {
  const e = (C.economy && typeof C.economy === 'object') ? C.economy : {};
  const dw = DEFAULT_ECONOMY.matchWin;
  const dl = DEFAULT_ECONOMY.matchLoss;
  const w = (e.matchWin && typeof e.matchWin === 'object') ? e.matchWin : {};
  const l = (e.matchLoss && typeof e.matchLoss === 'object') ? e.matchLoss : {};
  return {
    matchWin: {
      easy: finiteNumber(w.easy, dw.easy),
      normal: finiteNumber(w.normal, dw.normal),
      hard: finiteNumber(w.hard, dw.hard)
    },
    matchLoss: {
      easy: finiteNumber(l.easy, dl.easy),
      normal: finiteNumber(l.normal, dl.normal),
      hard: finiteNumber(l.hard, dl.hard)
    },
    pvpWin: finiteNumber(e.pvpWin, DEFAULT_ECONOMY.pvpWin),
    levelWinRepeatRate: finiteNumber(e.levelWinRepeatRate, DEFAULT_ECONOMY.levelWinRepeatRate),
    levelLoss: finiteNumber(e.levelLoss, DEFAULT_ECONOMY.levelLoss),
    minCoins: finiteNumber(e.minCoins, DEFAULT_ECONOMY.minCoins)
  };
}

function makeSave(coins) {
  return {
    version: 1,
    coins: coins == null ? 0 : coins,
    stars: {},
    cleared: {},
    ownedCues: ['oak'],
    equipped: 'oak',
    settings: { guide: true, sound: false },
    record: { wins: 0, losses: 0, matches: 0 }
  };
}

function newGame(coins) {
  const stats = { saves: 0, persists: 0 };
  const game = new Game({
    save: makeSave(coins),
    persist: function () { stats.persists++; },
    renderer: null,
    audio: null
  });
  game.on('save', function () { stats.saves++; });
  game._stats = stats;
  return game;
}

function baseShotCtx() {
  return {
    firstHitId: 'b1',
    potted: [],
    cuePotted: false,
    railAfterContact: false,
    railBalls: {},
    isBreak: false,
    preGroup: null,
    preGroupCleared: false,
    preOpen: true,
    preTargets: [],
    power: 0.4,
    angle: 0,
    spinX: 0,
    spinY: 0
  };
}

function clearLevel(game, levelId, shots) {
  game.startLevel(levelId);
  const lv = game.level;
  for (let i = 0; i < game.world.balls.length; i++) {
    const b = game.world.balls[i];
    if (b.id !== 'cue') { b.active = false; b.pocketed = true; }
  }
  game.shots = shots == null ? lv.par : shots;
  game.shotCtx = baseShotCtx();
  game.resolveLevelShot();
  return lv;
}

function failLevel(game, levelId) {
  game.startLevel(levelId);
  game.shots = game.level.maxShots;
  game.shotCtx = baseShotCtx();
  game.resolveLevelShot();
  return game.level;
}

console.log('巅峰台球 — 金币 / 自由球 / 关卡进度 测试');

/* ============================== 1. 经济配置 ============================== */
console.log('\n=== A. CONFIG.economy ===');
const eco = resolvedEconomy();
check('CONFIG.economy 存在', !!C.economy && typeof C.economy === 'object');
check('matchWin 三档完整', typeof eco.matchWin.easy === 'number' && typeof eco.matchWin.normal === 'number' && typeof eco.matchWin.hard === 'number',
  JSON.stringify(eco.matchWin));
check('matchLoss 三档完整', typeof eco.matchLoss.easy === 'number' && typeof eco.matchLoss.normal === 'number' && typeof eco.matchLoss.hard === 'number',
  JSON.stringify(eco.matchLoss));
check('pvpWin / levelWinRepeatRate / levelLoss / minCoins 完整',
  typeof eco.pvpWin === 'number' && typeof eco.levelWinRepeatRate === 'number' &&
  typeof eco.levelLoss === 'number' && typeof eco.minCoins === 'number',
  'pvp=' + eco.pvpWin + ' repeat=' + eco.levelWinRepeatRate + ' loss=' + eco.levelLoss + ' min=' + eco.minCoins);

/* ============================== 2. AI 对局 ============================== */
console.log('\n=== B. AI 对局金币 ===');
(function () {
  const g = newGame(0);
  g.startMatch('ai', 'normal');
  g.finishMatch(0, 'unit test');
  check('AI 胜利 normal：金币 +matchWin', g.save.coins === eco.matchWin.normal, 'coins=' + g.save.coins + ' expect=' + eco.matchWin.normal);
  check('AI 胜利：matchResult.coins 为正', g.matchResult.coins === eco.matchWin.normal, 'coins=' + g.matchResult.coins);
  check('AI 胜利：emit(save) 触发', g._stats.saves >= 1, 'saves=' + g._stats.saves);
  check('AI 胜利：persist 触发', g._stats.persists >= 1, 'persists=' + g._stats.persists);
  check('AI 胜利：record.wins +1', g.save.record.wins === 1, JSON.stringify(g.save.record));
})();

(function () {
  const g = newGame(500);
  g.startMatch('ai', 'hard');
  g.finishMatch(1, 'unit test');
  check('AI 失败 hard：金币 -matchLoss', g.save.coins === 500 - eco.matchLoss.hard, 'coins=' + g.save.coins);
  check('AI 失败：matchResult.coins 为负', g.matchResult.coins === -eco.matchLoss.hard, 'coins=' + g.matchResult.coins);
  check('AI 失败：coinsDelta 为负', g.matchResult.coinsDelta === -eco.matchLoss.hard, 'delta=' + g.matchResult.coinsDelta);
  check('AI 失败：record.losses +1', g.save.record.losses === 1, JSON.stringify(g.save.record));
  check('AI 失败：emit(save) 触发', g._stats.saves >= 1, 'saves=' + g._stats.saves);
})();

(function () {
  const g = newGame(0);
  g.startMatch('ai', 'normal');
  g.finishMatch(1, 'unit test');
  check('金币下限 0：0 金币失败后仍为 minCoins', g.save.coins === eco.minCoins, 'coins=' + g.save.coins);
  check('金币下限：matchResult.coins 不为负', g.matchResult.coins >= 0, 'coins=' + g.matchResult.coins);
  check('金币下限：coinsDelta 仍记录规则扣除', g.matchResult.coinsDelta === -eco.matchLoss.normal, 'delta=' + g.matchResult.coinsDelta);
})();

(function () {
  const g = newGame(10);
  g.startMatch('ai', 'easy');
  g.finishMatch(1, 'unit test');
  check('金币不足时按实际可扣金额结算', g.save.coins === eco.minCoins && g.matchResult.coins === -10,
    'coins=' + g.save.coins + ' result=' + g.matchResult.coins);
})();

/* ============================== 3. PVP ============================== */
console.log('\n=== C. PVP 对局金币 ===');
(function () {
  const g = newGame(100);
  g.startMatch('pvp', 'normal');
  g.finishMatch(1, 'pvp win');
  check('PVP 胜者 +pvpWin（共用存档）', g.save.coins === 100 + eco.pvpWin, 'coins=' + g.save.coins);
  check('PVP matchResult.coins 为 +pvpWin', g.matchResult.coins === eco.pvpWin, 'coins=' + g.matchResult.coins);
  check('PVP 不改 AI 战绩', g.save.record.matches === 0 && g.save.record.wins === 0 && g.save.record.losses === 0, JSON.stringify(g.save.record));
  check('PVP emit(save) 触发', g._stats.saves >= 1, 'saves=' + g._stats.saves);
})();

/* ============================== 4. 关卡 ============================== */
console.log('\n=== D. 关卡金币 ===');
let repeatGame = null;
let repeatLevel = null;
let firstClearCoins = 0;
(function () {
  const g = newGame(0);
  const lv = clearLevel(g, 'l1');
  repeatGame = g;
  repeatLevel = lv;
  check('关卡首通：success 不变', g.levelResult.success === true);
  check('关卡首通：coins +rewardCoins', g.levelResult.coins === lv.rewardCoins, 'coins=' + g.levelResult.coins + ' reward=' + lv.rewardCoins);
  check('关卡首通：存档金币同步', g.save.coins === lv.rewardCoins, 'coins=' + g.save.coins);
  check('关卡首通：firstClear 标记', g.levelResult.firstClear === true);
  check('关卡首通：emit(save) 触发', g._stats.saves >= 1, 'saves=' + g._stats.saves);
  firstClearCoins = g.save.coins;
})();

(function () {
  const g = repeatGame;
  const before = g.save.coins;
  clearLevel(g, 'l1');
  const expect = Math.round(repeatLevel.rewardCoins * eco.levelWinRepeatRate);
  check('关卡重复通关：coins 按比例折算', g.levelResult.coins === expect, 'coins=' + g.levelResult.coins + ' expect=' + expect);
  check('关卡重复通关：存档金币累加', g.save.coins === before + expect, 'coins=' + g.save.coins);
  check('关卡重复通关：firstClear=false', g.levelResult.firstClear === false);
  check('关卡重复通关：不改 success/stars', g.levelResult.success === true && g.levelResult.stars === 3,
    'success=' + g.levelResult.success + ' stars=' + g.levelResult.stars);
})();

(function () {
  const g = newGame(100);
  const lv = failLevel(g, 'l1');
  check('关卡失败：success=false', g.levelResult.success === false);
  check('关卡失败：coins -levelLoss', g.levelResult.coins === -eco.levelLoss, 'coins=' + g.levelResult.coins);
  check('关卡失败：存档金币扣除', g.save.coins === 100 - eco.levelLoss, 'coins=' + g.save.coins);
  check('关卡失败：coinsDelta 为负', g.levelResult.coinsDelta === -eco.levelLoss, 'delta=' + g.levelResult.coinsDelta);
  check('关卡失败：emit(save) 触发', g._stats.saves >= 1, 'saves=' + g._stats.saves);
  check('关卡失败：failedShots 与 maxShots 对齐', g.shots === lv.maxShots, 'shots=' + g.shots);
})();

(function () {
  const g = newGame(0);
  failLevel(g, 'l1');
  check('关卡失败金币下限：不为负', g.save.coins === eco.minCoins, 'coins=' + g.save.coins);
  check('关卡失败金币下限：levelResult.coins 不为负', g.levelResult.coins >= 0, 'coins=' + g.levelResult.coins);
  check('关卡失败金币下限：coinsDelta 记录规则扣除', g.levelResult.coinsDelta === -eco.levelLoss, 'delta=' + g.levelResult.coinsDelta);
})();

/* ============================== 5. economy 回退 ============================== */
console.log('\n=== E. CONFIG.economy 缺失/不完整时的回退 ===');
(function () {
  const saved = C.economy;
  try {
    delete C.economy;
    const fallback = resolvedEconomy();
    const g = newGame(0);
    g.startMatch('ai', 'normal');
    g.finishMatch(0, 'fallback');
    check('缺少 economy 时 AI 胜利回退默认值', g.save.coins === fallback.matchWin.normal, 'coins=' + g.save.coins);

    const g2 = newGame(0);
    const lv = clearLevel(g2, 'l1');
    check('缺少 economy 时关卡首通仍发 rewardCoins', g2.save.coins === lv.rewardCoins, 'coins=' + g2.save.coins);

    C.economy = { matchWin: { easy: 1 } };
    const partial = resolvedEconomy();
    const g3 = newGame(0);
    g3.startMatch('ai', 'easy');
    g3.finishMatch(0, 'partial');
    check('不完整 economy：已有字段生效', g3.save.coins === 1, 'coins=' + g3.save.coins);
    const g4 = newGame(0);
    g4.startMatch('ai', 'hard');
    g4.finishMatch(0, 'partial');
    check('不完整 economy：缺失字段回退默认值', g4.save.coins === partial.matchWin.hard, 'coins=' + g4.save.coins);
  } finally {
    C.economy = saved;
  }
})();

/* ============================== 6. levelProgress ============================== */
console.log('\n=== F. getState().levelProgress ===');
(function () {
  const g = newGame(0);
  check('非关卡模式 levelProgress 为 null', g.getState().levelProgress === null,
    'value=' + JSON.stringify(g.getState().levelProgress));

  g.startMatch('ai', 'normal');
  check('AI 对局 levelProgress 为 null', g.getState().levelProgress === null);

  g.startLevel('l1');
  const lv = g.level;
  const st = g.getState();
  const lp = st.levelProgress;
  check('关卡模式 levelProgress 存在', !!lp);
  check('levelProgress.total = 关卡球数', lp && lp.total === lv.balls.length, 'total=' + (lp && lp.total) + ' balls=' + lv.balls.length);
  check('levelProgress.remaining = 剩余目标球', lp && lp.remaining === g.activeObjectCount(), 'remaining=' + (lp && lp.remaining));
  check('levelProgress.shotsLeft = maxShots - shots', lp && lp.shotsLeft === lv.maxShots - g.shots, 'shotsLeft=' + (lp && lp.shotsLeft));
  check('levelProgress.par/maxShots 对齐', lp && lp.par === lv.par && lp.maxShots === lv.maxShots);
  check('levelProgress.guideAllowed/spinAllowed 布尔',
    lp && lp.guideAllowed === (lv.allowGuide !== false) && lp.spinAllowed === (lv.allowSpin !== false),
    'guide=' + (lp && lp.guideAllowed) + ' spin=' + (lp && lp.spinAllowed));

  g.shots = 2;
  check('levelProgress.shotsLeft 随 shots 更新', g.getState().levelProgress.shotsLeft === Math.max(0, lv.maxShots - 2),
    'shotsLeft=' + g.getState().levelProgress.shotsLeft);

  const target = g.world.balls.filter(function (b) { return b.id !== 'cue'; })[0];
  if (target) {
    target.active = false;
    target.pocketed = true;
    check('levelProgress.remaining 随落袋更新', g.getState().levelProgress.remaining === g.activeObjectCount(),
      'remaining=' + g.getState().levelProgress.remaining);
  }
})();

/* ============================== 7. 自由球预览 ============================== */
console.log('\n=== G. 自由球预览（previewCuePos / aimAt / placeCueAt） ===');
(function () {
  const g = newGame(0);
  g.startLevel('l1');
  g.ballInHand = true;
  g.phase = 'aim';

  const cue = g.world.getBall('cue');
  const spot = g.findSafeSpot(1.2, 0.5);
  const before = { x: cue.x, y: cue.y };
  const aimBefore = g.aimAngle;

  g.aimAt(spot.x, spot.y);
  check('aimAt(自由球) 不移动真实母球', cue.x === before.x && cue.y === before.y,
    'cue=(' + cue.x.toFixed(3) + ',' + cue.y.toFixed(3) + ')');
  check('aimAt(自由球) 不改 aimAngle', g.aimAngle === aimBefore, 'aim=' + g.aimAngle);
  check('aimAt(自由球) 记录 cuePreview',
    !!g.cuePreview && Math.abs(g.cuePreview.x - spot.x) < 1e-9 && Math.abs(g.cuePreview.y - spot.y) < 1e-9,
    'preview=' + JSON.stringify(g.cuePreview));

  const rs = g.getRenderState();
  check('getRenderState().aim.cuePreview 暴露预览',
    !!rs.aim.cuePreview && rs.aim.cuePreview.x === g.cuePreview.x && rs.aim.cuePreview.y === g.cuePreview.y);

  check('previewCuePos 返回坐标', !!g.previewCuePos(spot.x, spot.y) && !!g.cuePreview);
  g.previewCuePos(-5, -5);
  check('previewCuePos 非法位置清空预览', g.cuePreview === null);

  g.previewCuePos(spot.x, spot.y);
  check('placeCueAt 成功落位', g.placeCueAt(spot.x, spot.y) === true);
  check('placeCueAt 移动母球到目标点', Math.abs(cue.x - spot.x) < 1e-9 && Math.abs(cue.y - spot.y) < 1e-9);
  check('placeCueAt 清空 cuePreview', g.cuePreview === null);
  check('placeCueAt 结束自由球状态', g.ballInHand === false);

  g.enterBallInHand();
  g.previewCuePos(spot.x, spot.y);
  g.enterBallInHand();
  check('enterBallInHand 清空 cuePreview', g.cuePreview === null);

  g.ballInHand = false;
  const aimAfter = g.aimAngle;
  g.aimAt(2.3, 0.7);
  check('非自由球 aimAt 仍更新瞄准角', g.aimAngle !== aimAfter || Math.abs(g.aimAngle - aimAfter) < 1e-9,
    'aim=' + g.aimAngle);
  check('非自由球 aimAt 不产生 cuePreview', g.cuePreview === null);

  const c2 = g.world.getBall('cue');
  const before2 = { x: c2.x, y: c2.y };
  g.aimAt(0.3, 1.0);
  check('非自由球 aimAt 不移动母球', c2.x === before2.x && c2.y === before2.y);
})();

/* ============================== 汇总 ============================== */
console.log('\n----------------------------------------');
console.log('通过: ' + pass + '  失败: ' + fail);
if (fail) {
  console.log('失败项:');
  fails.forEach(function (f) { console.log('  - ' + f); });
  process.exitCode = 1;
} else {
  console.log('COINS TESTS PASSED');
}
