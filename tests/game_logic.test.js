/* Lead: 游戏流程 / 八球规则 / 关卡的 Node 逻辑回归测试 */
global.window = global;
require('../js/config.js');
require('../js/physics.js');
require('../js/levels.js');
require('../js/ai.js');
require('../js/game.js');

const Pool = global.Pool;
const C = Pool.CONFIG;
const R = C.table.ballRadius, W = C.table.width, H = C.table.height;
let failures = [];
let i = 0;
function ok(cond, msg) { if (!cond) failures.push(msg); }

function makeSave() {
  return {
    version: 1, coins: 0, stars: {}, cleared: {}, ownedCues: ['oak'], equipped: 'oak',
    settings: { guide: true, sound: false }, record: { wins: 0, losses: 0, matches: 0 }
  };
}
function makeGame() {
  return new Pool.Game({ save: makeSave(), persist: function () {}, renderer: null, audio: null });
}
function playFrames(game, maxSec) {
  let t = 0;
  while (game.phase === 'shooting' && t < maxSec) { game.update(1 / 60); t += 1 / 60; }
  return t;
}
function ensureCuePlaced(game) {
  if (!game.ballInHand) return;
  const spot = game.findSafeSpot(W * 0.25, H * 0.5);
  const ok = game.placeCueAt(spot.x, spot.y);
  if (!ok) failures.push('placeCueAt failed for ' + JSON.stringify(spot));
}
function checkWorld(game, label) {
  const balls = game.world.balls;
  for (const b of balls) {
    if (!isFinite(b.x) || !isFinite(b.y)) failures.push(label + ' NaN position ' + b.id);
    if (b.active && (b.x < -0.2 || b.x > W + 0.2 || b.y < -0.2 || b.y > H + 0.2)) failures.push(label + ' escaped ' + b.id + ' ' + b.x + ',' + b.y);
  }
}

// 1. 开局结构
let game = makeGame();
game.startMatch('pvp', 'normal');
ok(game.players.length === 2, 'pvp player count');
ok(game.world.balls.length === 16, '16 balls at rack');
ok(game.phase === 'aim', 'phase aim after start');
ok(!game.world.allStopped() === false, 'rack is stationary');
let overlap = false;
for (let a = 0; a < game.world.balls.length; a++) for (let b = a + 1; b < game.world.balls.length; b++) {
  const A = game.world.balls[a], B = game.world.balls[b];
  if (Math.hypot(A.x - B.x, A.y - B.y) < 2 * R - 1e-6) overlap = true;
}
ok(!overlap, 'rack has no overlapping balls');

// 2. 随机打完一局 pvp（双方轮换），验证不崩溃并有人获胜
let seed = 1234567;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
let shots = 0, turns = 0;
while (game.phase !== 'over' && shots < 260) {
  checkWorld(game, 'pvp');
  if (game.phase === 'aim') {
    ensureCuePlaced(game);
    if (game.phase !== 'aim') continue;
    if (game.ballInHand) { failures.push('still ballInHand after placement'); break; }
    game.aimAngle = rnd() * Math.PI * 2;
    game.spinX = (rnd() - 0.5) * 0.6;
    game.spinY = (rnd() - 0.5) * 0.6;
    const beforeTurn = game.activePlayer;
    if (!game.shoot(0.25 + rnd() * 0.6)) { failures.push('shoot rejected'); break; }
    shots++;
    const dt = playFrames(game, 25);
    if (game.phase === 'shooting') { failures.push('shot did not settle in 25s'); break; }
    if (beforeTurn !== game.activePlayer) turns++;
    // 8 球提前落袋会结束，属于正常
  } else if (game.phase === 'over') break;
  else { failures.push('unexpected phase ' + game.phase); break; }
}
// 随机乱打不保证清台；验证规则状态机在大量击球后仍健康即可
ok(game.phase === 'aim' || game.phase === 'over', 'pvp state healthy after ' + shots + ' shots, phase=' + game.phase);
if (game.phase === 'over') ok(!!game.matchResult, 'matchResult exists when over');
console.log('PVP after ' + shots + ' shots: switches=' + turns + ', phase=' + game.phase + ', winner=' + (game.matchResult && game.matchResult.winnerName));

// 3. 单人 AI 对战：人类回合随机击球，AI 回合自动运行
game = makeGame();
let matchOver = false;
game.on('matchOver', function () { matchOver = true; });
game.startMatch('ai', 'normal');
let steps = 0, humanShots = 0;
while (!matchOver && steps < 6000) {
  if (game.phase === 'aim') {
    if (game.isHumanTurn()) {
      ensureCuePlaced(game);
      if (game.ballInHand) { failures.push('AI game human ballInHand stuck'); break; }
      game.aimAngle = rnd() * Math.PI * 2;
      game.shoot(0.3 + rnd() * 0.5);
      humanShots++;
    }
  }
  game.update(1 / 30);
  steps++;
  if (steps % 300 === 0) checkWorld(game, 'ai');
}
ok(matchOver, 'AI match finished (steps=' + steps + ')');
console.log('AI match finished: steps=' + steps + ', humanShots=' + humanShots + ', result=' + JSON.stringify(game.matchResult && {w: game.matchResult.winnerName, coins: game.matchResult.coins}));

// 4. 所有关卡可启动、可模拟（不要求通关）
const events = { levelOver: null };
game = makeGame();
game.on('levelOver', function (r) { events.levelOver = r; });
let levelStarted = 0, levelFinished = 0;
for (const lv of Pool.LEVELS) {
  const g = makeGame();
  let over = null;
  g.on('levelOver', function (r) { over = r; });
  if (!g.startLevel(lv.id)) { failures.push('startLevel failed ' + lv.id); continue; }
  levelStarted++;
  ensureCuePlaced(g);
  let n = 0;
  const maxFrames = 60 * 30 * (lv.maxShots + 2);
  while (!over && g.phase !== 'over' && n < maxFrames) {
    if (g.phase === 'aim') {
      ensureCuePlaced(g);
      if (g.ballInHand) { failures.push(lv.id + ' ballInHand stuck'); break; }
      g.aimAngle = rnd() * Math.PI * 2;
      g.spinX = 0; g.spinY = 0;
      g.shoot(0.25 + rnd() * 0.55);
    }
    g.update(1 / 60);
    n++;
  }
  if (g.phase === 'over') levelFinished++;
  if (!g.levelResult) {
    // 强制打满杆数也应产生结果
    failures.push(lv.id + ' no levelResult, phase=' + g.phase);
  }
}
ok(levelStarted === Pool.LEVELS.length, 'all levels started');
console.log('Levels started=' + levelStarted + ', finished=' + levelFinished);

// 5. 母球与最后一颗目标球同杆落袋：scratch 优先，不能清台后静默复位
game = makeGame();
game.startLevel('l1');
game.ballInHand = false;
game.shots = 1;
game.shotCtx = { cuePotted: true, potted: [game.world.getBall('b1')], firstHitId: 'b1', isBreak: false, power: 0.5, angle: 0, spinX: 0, spinY: 0 };
game.world.getBall('b1').active = false; game.world.getBall('b1').pocketed = true;
game.resolveLevelShot();
ok(game.phase === 'aim' && game.ballInHand && !game.levelResult, 'cue scratch on final target retains ball-in-hand and fails to auto-clear');

// 6. render state 契约
game = makeGame();
game.startMatch('ai', 'easy');
const rs = game.getRenderState();
ok(rs.world === game.world, 'render state world');
ok(rs.aim && typeof rs.aim.angle === 'number', 'render aim angle');
ok(Array.isArray(rs.players) && rs.players.length === 2, 'render players');
ok(Array.isArray(rs.targetIds), 'render targetIds');
ok(['aim', 'shooting'].includes(rs.phase), 'render phase=' + rs.phase);

if (failures.length) {
  console.error('FAILURES (' + failures.length + ')');
  failures.slice(0, 40).forEach(f => console.error(' - ' + f));
  process.exit(1);
} else {
  console.log('\nGAME LOGIC TESTS PASSED');
}