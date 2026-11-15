/* 黑八高手清台能力基准：随机球局，统计单次上手进球数与一杆清台率。
   用法： node tests/ai_runout.js [difficulty] [racks] */
global.window = global;
require('../js/config.js'); require('../js/physics.js'); require('../js/levels.js');
require('../js/ai.js'); require('../js/game.js');
const P = window.Pool, AI = P.AI;
const DIFF = process.argv[2] || 'hard';
const RACKS = Number(process.argv[3] || 16);
let seed = 42;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function rack() {
  const w = new P.Physics.PhysicsWorld();
  const R = w.ballRadius, W = w.width, H = w.height;
  const cue = { x: 0.35 + rnd() * 0.3, y: R + 0.1 + rnd() * (H - 2 * R - 0.2) };
  w.addBall({ id: 'cue', number: 0, x: cue.x, y: cue.y });
  const placed = [{ x: cue.x, y: cue.y }];
  for (const n of [1, 2, 3, 4, 5, 6, 7]) {
    let ok = false;
    for (let t = 0; t < 400 && !ok; t++) {
      const x = R + 0.06 + rnd() * (W - 2 * R - 0.12), y = R + 0.06 + rnd() * (H - 2 * R - 0.12);
      if (placed.every(p => Math.hypot(p.x - x, p.y - y) > 2 * R + 0.07) &&
        w.pockets.every(pk => Math.hypot(pk.x - x, pk.y - y) > pk.radius + R * 3)) {
        w.addBall({ id: 'b' + n, number: n, x, y }); placed.push({ x, y }); ok = true;
      }
    }
    if (!ok) return null;
  }
  return w;
}
function runOut() {
  const w = rack(); if (!w) return null;
  let pots = 0, shots = 0;
  for (let i = 0; i < 12; i++) {
    const targets = w.balls.filter(b => b.active && b.number > 0).map(b => b.id);
    if (!targets.length) break;
    const shot = AI.chooseShot(w, { cueBallId: 'cue', group: 'solid', targetIds: targets, difficulty: DIFF, ballInHand: false, maxTimeMs: 300 });
    if (!shot || shot.plan === 'safety') break;
    const before = w.balls.filter(b => b.active && b.number > 0).length;
    w.strike('cue', { angle: shot.angle, power: shot.power, spinX: shot.spinX || 0, spinY: shot.spinY == null ? 0.1 : shot.spinY });
    shots++;
    for (let k = 0; k < 900; k++) { w.step(1 / 60); if (w.allStopped()) break; }
    const cue = w.getBall('cue');
    if (!cue.active) break;
    const after = w.balls.filter(b => b.active && b.number > 0).length;
    if (after < before) pots += (before - after); else break;
  }
  return { pots, shots };
}
let tot = 0, runs = 0, clear = 0, maxPots = 0;
for (let i = 0; i < RACKS; i++) {
  seed = 1000 + i * 37;
  const r = runOut();
  if (!r) continue;
  tot += r.pots; runs++; maxPots = Math.max(maxPots, r.pots);
  if (r.pots >= 7) clear++;
}
console.log(JSON.stringify({ difficulty: DIFF, racks: runs, avgPots: +(tot / runs).toFixed(2), maxPots, fullClear: clear }));
