/* 一键全量回归： node tests/run_all.mjs  （仓库根目录或任意目录均可）
   覆盖：物理/AI/关卡/经济/规则 单测、历次回归固化、浏览器层、E2E、浸泡。
   任一失败以非零码退出。 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodeTests = [
  'tests/physics.test.js','tests/ai.sim.js','tests/coins.test.js','tests/level_placements.test.js',
  'tests/rules.test.js','tests/game_logic.test.js','tests/break_rules.test.js','tests/reward.test.js',
  'tests/break_spread.test.js','tests/scratch_rules.test.js',
  'tests/regressions.test.js','tests/collision_fidelity.test.js','tests/physics_contract.test.js','tests/physics_snapshot.test.js','tests/player_perspective.test.js','tests/mg_runtime.test.js','tests/mg_compile_preflight.test.js','tests/jitter_check.js','tests/cue_points.test.js','tests/spin_points_ui.test.js','tests/ghost_ball.test.js',
  'tests/ai_aimable.test.js','tests/ai_tiers.test.js','tests/ai_lipcheck.js','tests/ai_runout.js',
  'tests/ai_e2e_hard.js','tests/full_audit.js',
  'tests/net_server.test.mjs','tests/net_e2e.test.mjs'
];
const pyTests = ['tests/e2e_acceptance.py','tests/soak.py','tests/browser_audit.py','tests/spin_ui_audit.py','tests/ghost_ball_ui.py','tests/cross_browser.test.py','tests/screen_verify.py','tests/timeout_bidir.py','tests/real_scenario.py','tests/bar_verify.py','tests/timeout_verify.py','tests/repro_nofoul.py','tests/turnmsg_verify.py','tests/multi_verify.py','tests/pause_mechanism.py','tests/three_features.py','tests/auto_reconnect_verify.py','tests/result_verify.py','tests/repro_foul.py'];
let fail = 0;
function run(cmd, args, label) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', timeout: 300000 });
  const ok = r.status === 0;
  if (!ok) { fail++; console.log('FAIL ' + label + (r.stderr ? ' :: ' + r.stderr.trim().split('\n').slice(-2).join(' | ') : '')); }
  else console.log('PASS ' + label);
}
for (const f of nodeTests) run(process.execPath, [f], f);
for (const f of pyTests) run('python', [f], f);
console.log('---- TOTAL FAILURES: ' + fail + ' ----');
process.exit(fail ? 1 : 0);
