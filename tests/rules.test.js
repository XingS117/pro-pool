/* Lead: 八球 / 关卡规则定向测试（直接驱动结算逻辑） */
global.window = global;
require('../js/config.js');
require('../js/physics.js');
require('../js/levels.js');
require('../js/ai.js');
require('../js/game.js');
const Pool = global.Pool, C = Pool.CONFIG, R = C.table.ballRadius;
let fails = [];
function ok(c, m) { if (!c) fails.push(m); }
function save() { return { version:1, coins:0, stars:{}, cleared:{}, ownedCues:['oak'], equipped:'oak', settings:{guide:true,sound:false}, record:{wins:0,losses:0,matches:0} }; }
function newGame() { const g = new Pool.Game({ save: save(), persist: function(){}, renderer:null, audio:null }); g.startMatch('pvp','normal'); return g; }
function deactivate(g, except) {
  for (const b of g.world.balls) {
    if (b.id === 'cue' || except.includes(b.id)) continue;
    b.active = false; b.pocketed = true;
  }
}
function ctxFor(g, firstHitId, pottedIds, opts) {
  const potted = [];
  for (const id of pottedIds) {
    const b = g.world.getBall(id);
    b.active = false; b.pocketed = true;
    potted.push(b);
  }
  return Object.assign({
    firstHitId: firstHitId,
    potted: potted,
    cuePotted: false,
    railAfterContact: false,
    isBreak: false,
    preGroup: g.players[g.activePlayer].group,
    preGroupCleared: false,
    preOpen: !g.players[g.activePlayer].group,
    preTargets: [],
    power: 0.4, angle: 0, spinX: 0, spinY: 0
  }, opts || {});
}
function simulateResolution(g, ctx, mode) {
  g.shotCtx = ctx;
  g.phase = 'shooting';
  if (mode === 'level') g.resolveLevelShot(); else g.resolveMatchShot();
}

// ===== 1. 开台合法进球：定球组 + 继续出杆 =====
(function(){
  const g = newGame();
  deactivate(g, ['b1']);
  const ctx = ctxFor(g, 'b1', ['b1'], { preOpen: true });
  simulateResolution(g, ctx);
  ok(g.players[0].group === 'solid', 'open pot assigns solid, got ' + g.players[0].group);
  ok(g.players[1].group === 'stripe', 'opponent gets stripe');
  ok(g.activePlayer === 0, 'legal pot keeps turn');
  ok(g.phase === 'aim', 'phase aim after legal pot');
  console.log('1 open pot:', g.players.map(p=>p.group).join('/'), 'active', g.activePlayer);
})();

// ===== 2. 黑八提前落袋：对手获胜 =====
(function(){
  const g = newGame();
  g.players[0].group = 'solid'; g.players[1].group = 'stripe';
  deactivate(g, ['b1']);
  const ctx = ctxFor(g, 'b8', ['b8'], { preGroup:'solid', preGroupCleared:false });
  simulateResolution(g, ctx);
  ok(g.phase === 'over', 'early eight ends match, phase=' + g.phase);
  ok(g.matchResult && g.matchResult.winner === 1, 'early eight -> opponent wins, got ' + (g.matchResult && g.matchResult.winner));
  console.log('2 early eight: winner', g.matchResult && g.matchResult.winner);
})();

// ===== 3. 清台后黑八：当前玩家获胜 =====
(function(){
  const g = newGame();
  g.players[0].group = 'solid'; g.players[1].group = 'stripe';
  deactivate(g, ['b8']);
  const ctx = ctxFor(g, 'b8', ['b8'], { preGroup:'solid', preGroupCleared:true });
  simulateResolution(g, ctx);
  ok(g.phase === 'over', 'legal eight ends match');
  ok(g.matchResult && g.matchResult.winner === 0, 'legal eight -> shooter wins, got ' + (g.matchResult && g.matchResult.winner));
  console.log('3 legal eight: winner', g.matchResult && g.matchResult.winner);
})();

// ===== 4. 母球落袋：犯规、换人、自由球 =====
(function(){
  const g = newGame();
  deactivate(g, ['b1']);
  const ctx = ctxFor(g, null, [], { cuePotted:true });
  simulateResolution(g, ctx);
  ok(g.activePlayer === 1, 'cue pocket switches player');
  ok(g.ballInHand === true, 'cue pocket gives ball in hand');
  ok(g.phase === 'aim', 'phase aim after foul');
  console.log('4 cue pocket: active', g.activePlayer, 'ballInHand', g.ballInHand);
})();

// ===== 5. 空杆：犯规 =====
(function(){
  const g = newGame();
  deactivate(g, ['b1']);
  const ctx = ctxFor(g, null, []);
  simulateResolution(g, ctx);
  ok(g.activePlayer === 1, 'no hit switches');
  ok(g.ballInHand === true, 'no hit gives ball in hand');
  console.log('5 no hit: active', g.activePlayer, 'ballInHand', g.ballInHand);
})();

// ===== 6. 先碰对方球：犯规 =====
(function(){
  const g = newGame();
  g.players[0].group = 'solid'; g.players[1].group = 'stripe';
  deactivate(g, ['b9']);
  const ctx = ctxFor(g, 'b9', [], { preGroup:'solid', preGroupCleared:false });
  simulateResolution(g, ctx);
  ok(g.activePlayer === 1, 'wrong first hit switches');
  ok(g.ballInHand === true, 'wrong first hit gives ball in hand');
  console.log('6 wrong hit: active', g.activePlayer, 'ballInHand', g.ballInHand);
})();

// ===== 7. 打进对方球：不犯规但换人 =====
(function(){
  const g = newGame();
  g.players[0].group = 'solid'; g.players[1].group = 'stripe';
  deactivate(g, ['b9']);
  const ctx = ctxFor(g, 'b1', ['b9'], { preGroup:'solid', preGroupCleared:false });
  simulateResolution(g, ctx);
  ok(g.activePlayer === 1, 'pot opponent only switches');
  ok(g.ballInHand === false, 'pot opponent is not a foul');
  console.log('7 pot opponent: active', g.activePlayer, 'ballInHand', g.ballInHand);
})();

// ===== 8. 打进本方球：继续出杆 =====
(function(){
  const g = newGame();
  g.players[0].group = 'solid'; g.players[1].group = 'stripe';
  deactivate(g, ['b1']);
  const ctx = ctxFor(g, 'b1', ['b1'], { preGroup:'solid', preGroupCleared:false });
  simulateResolution(g, ctx);
  ok(g.activePlayer === 0, 'own pot keeps turn');
  ok(g.ballInHand === false, 'own pot no ball in hand');
  console.log('8 own pot: active', g.activePlayer);
})();

// ===== 9. 关卡通关：三星 / 金币 / 存档 =====
(function(){
  const g = new Pool.Game({ save: save(), persist: function(){}, renderer:null, audio:null });
  const lv = Pool.LEVELS[0];
  g.startLevel(lv.id);
  for (const b of g.world.balls) if (b.id !== 'cue') { b.active = false; b.pocketed = true; }
  g.shots = lv.par;
  g.shotCtx = ctxFor(g, 'b1', [], {});
  g.resolveLevelShot();
  ok(g.levelResult && g.levelResult.success === true, 'level success flag');
  ok(g.levelResult && g.levelResult.stars === 3, 'par => 3 stars, got ' + (g.levelResult && g.levelResult.stars));
  ok(g.levelResult && g.levelResult.coins === lv.rewardCoins, 'first clear coins');
  ok(g.save.coins === lv.rewardCoins, 'coins saved');
  console.log('9 level clear:', JSON.stringify(g.levelResult));
})();

// ===== 10. 关卡杆数用尽：失败 =====
(function(){
  const g = new Pool.Game({ save: save(), persist: function(){}, renderer:null, audio:null });
  const lv = Pool.LEVELS[0];
  g.startLevel(lv.id);
  g.shots = lv.maxShots;
  g.shotCtx = ctxFor(g, null, [], {});
  g.resolveLevelShot();
  ok(g.levelResult && g.levelResult.success === false, 'level fail when shots exhausted');
  console.log('10 level fail:', JSON.stringify(g.levelResult));
})();

// ===== 11. 关卡复用存档：重复通关按 rewardCoins × levelWinRepeatRate 发放 =====
(function(){
  const g = new Pool.Game({ save: save(), persist: function(){}, renderer:null, audio:null });
  const lv = Pool.LEVELS[0];
  const econ = (Pool.CONFIG && Pool.CONFIG.economy) || {};
  const rate = (typeof econ.levelWinRepeatRate === 'number') ? econ.levelWinRepeatRate : 0.30;
  g.startLevel(lv.id);
  for (const b of g.world.balls) if (b.id !== 'cue') { b.active = false; b.pocketed = true; }
  g.shots = lv.par;
  g.shotCtx = ctxFor(g, 'b1', [], {});
  g.resolveLevelShot();
  const coins1 = g.save.coins;
  g.startLevel(lv.id);
  for (const b of g.world.balls) if (b.id !== 'cue') { b.active = false; b.pocketed = true; }
  g.shots = lv.par;
  g.shotCtx = ctxFor(g, 'b1', [], {});
  g.resolveLevelShot();
  const expected = Math.round(lv.rewardCoins * rate);
  ok(g.levelResult.coins === expected, 'replay awards ' + expected + ' coins (got ' + g.levelResult.coins + ')');
  ok(g.save.coins === coins1 + expected, 'replay coins credited once');
  console.log('11 replay: coins', g.save.coins, 'award', g.levelResult.coins);
})();

if (fails.length) { console.error('\nFAILURES ('+fails.length+')'); fails.forEach(f=>console.error(' - '+f)); process.exit(1); }
console.log('\nRULE TESTS PASSED');