/* 检查：hard AI 出手后目标球是否“停在袋口”。统计进球率与“卡在袋口附近”的次数。 */
global.window = global;
require('../js/config.js'); require('../js/physics.js'); require('../js/levels.js');
require('../js/ai.js'); require('../js/game.js');
const P = window.Pool, AI = P.AI;
let seed = 777;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function rack() {
  const w = new P.Physics.PhysicsWorld();
  const R = w.ballRadius, W = w.width, H = w.height;
  w.addBall({ id: 'cue', number: 0, x: 0.35 + rnd() * 0.3, y: R + 0.1 + rnd() * (H - 2 * R - 0.2) });
  for (const n of [1, 2, 3, 4, 5, 6, 7]) {
    for (let t = 0; t < 400; t++) {
      const x = R + 0.06 + rnd() * (W - 2 * R - 0.12), y = R + 0.06 + rnd() * (H - 2 * R - 0.12);
      const bs = w.balls;
      let ok = true;
      for (const b of bs) if (Math.hypot(b.x - x, b.y - y) < 2 * R + 0.07) { ok = false; break; }
      if (!ok) continue;
      for (const pk of w.pockets) if (Math.hypot(pk.x - x, pk.y - y) < pk.radius + R * 3) { ok = false; break; }
      if (!ok) continue;
      w.addBall({ id: 'b' + n, number: n, x, y });
      break;
    }
  }
  return w;
}
let attempts = 0, potted = 0, lip = 0, worse = 0;
for (let i = 0; i < 40; i++) {
  seed = 5000 + i * 91;
  const w = rack();
  const targets = w.balls.filter(b => b.active && b.number > 0).map(b => b.id);
  const shot = AI.chooseShot(w, { cueBallId: 'cue', group: 'solid', targetIds: targets, difficulty: 'hard', ballInHand: false, maxTimeMs: 300 });
  if (!shot || shot.plan === 'safety') continue;
  const tgt = w.getBall(shot.ballId);
  const pk = w.pockets[shot.pocketIndex];
  attempts++;
  w.strike('cue', { angle: shot.angle, power: shot.power, spinX: shot.spinX || 0, spinY: shot.spinY == null ? 0.1 : shot.spinY });
  for (let k = 0; k < 900; k++) { w.step(1 / 60); if (w.allStopped()) break; }
  if (!tgt.active) { potted++; continue; }
  const d = Math.hypot(tgt.x - pk.x, tgt.y - pk.y);
  if (d < 0.11) { lip++; if (lip <= 5) console.log('LIP', JSON.stringify({i, ball: shot.ballId, pocket: shot.pocketIndex, power: +shot.power.toFixed(3), spinY: +(shot.spinY||0).toFixed(2), conf: +shot.confidence.toFixed(2), dist: +d.toFixed(3)})); } else worse++;
}
console.log(JSON.stringify({ attempts, potted, lipStopped: lip, stoppedElsewhere: worse }));
