/* 巅峰台球 / PRO POOL — 关卡数据完整性单测（ai-levels-dev）
 * 运行：node tests/level_placements.test.js
 * 纯 Node：vm 沙箱模拟 window 后加载 js/config.js + js/levels.js，不依赖浏览器。
 *
 * 关卡机制：每关区分
 *   targets  必须打进的目标球（全色低号球 1..7）
 *   blockers 不能打进、只做干扰的花色球（9..15）
 *   balls    完整摆球 = targets + blockers
 *
 * 校验项：
 *   0. 环境：CONFIG / 12 关 / 6 袋；
 *   A. 结构：id、name、subtitle、tip、difficulty（严格递增）、奖励、开关字段；
 *   B. 目标/干扰：两数组非空、球号范围与去重、互斥、与 balls 完全一致、目标球不覆盖全部球；
 *   C. 几何：球/母球在台面内、两两间距、袋口安全区、球堆不过密；
 *   D. goal：type/total（目标球数）/label；
 *   E. rules：guide/spin 与 allowGuide/allowSpin 一致，中文说明齐全；
 *   F. 杆数：maxShots ≥ 目标球数+1、par ≥ 目标球数、par ≤ maxShots-2；
 *   G. 可解性（几何）：每颗目标球至少存在一条直线/薄球进球线路，且母球到假想球、
 *      目标球到袋口的路径都不被任何其他球（含干扰球）挡住；
 *   H. 梯度：目标球数 / 干扰球数 / 球数 / maxShots / par / 奖励随难度单调不降。
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.resolve(__dirname, '..');

function loadPool() {
  var sandbox = { console: console };
  var ctx = vm.createContext(sandbox);
  vm.runInContext('globalThis.window = globalThis;', ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8'), ctx, { filename: 'js/config.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'levels.js'), 'utf8'), ctx, { filename: 'js/levels.js' });
  return vm.runInContext('window.Pool', ctx);
}

var Pool = loadPool();
var C = Pool.CONFIG;
var LEVELS = Pool.LEVELS;
var R = C.table.ballRadius;
var W = C.table.width;
var H = C.table.height;
var PR = C.table.pocketRadius;
var POCKETS = C.pockets;
var EPS = 1e-9;
var RAD = Math.PI / 180;

var passed = 0;
var failed = 0;
var failures = [];
var summaryRows = [];

function check(name, cond, detail) {
  var tail = detail ? '  ' + detail : '';
  if (cond) {
    passed++;
    console.log('  [OK]   ' + name + tail);
  } else {
    failed++;
    failures.push(name + tail);
    console.log('  [FAIL] ' + name + tail);
  }
}
function group(title) { console.log('\n=== ' + title + ' ==='); }
function note(text) { console.log('  - ' + text); }
function isNum(v) { return typeof v === 'number' && isFinite(v); }
function isStr(v) { return typeof v === 'string' && v.length > 0; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function hypot(x, y) { return Math.sqrt(x * x + y * y); }
function unit(x, y) { var l = hypot(x, y); return l < 1e-12 ? null : { x: x / l, y: y / l }; }
function angleDiff(a, b) {
  var d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function segDist(px, py, ax, ay, bx, by) {
  var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  if (l2 < 1e-12) return hypot(px - ax, py - ay);
  var t = ((px - ax) * dx + (py - ay) * dy) / l2;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  return hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/* 几何可解性：某颗目标球是否存在一条「母球→假想球→袋口」不被其他球挡住的线路 */
function hasPotLine(lv, targetNumber) {
  var target = null;
  for (var i = 0; i < lv.balls.length; i++) if (lv.balls[i].number === targetNumber) target = lv.balls[i];
  if (!target) return null;
  var ballList = lv.balls.map(function (b) { return { id: 'b' + b.number, number: b.number, x: b.x, y: b.y }; });
  var targetId = 'b' + targetNumber;
  var cue = lv.cue;
  for (var pi = 0; pi < POCKETS.length; pi++) {
    var p = POCKETS[pi];
    var aim = { x: clamp(p.x, R, W - R), y: clamp(p.y, R, H - R) };
    var dt = hypot(aim.x - target.x, aim.y - target.y);
    if (dt < 2 * R) continue;
    var u = unit(aim.x - target.x, aim.y - target.y);
    if (!u) continue;
    var ghost = { x: target.x - u.x * 2 * R, y: target.y - u.y * 2 * R };
    if (ghost.x < R || ghost.x > W - R || ghost.y < R || ghost.y > H - R) continue;
    var dc = hypot(ghost.x - cue.x, ghost.y - cue.y);
    if (dc < 2 * R * 1.02) continue;
    var cd = unit(ghost.x - cue.x, ghost.y - cue.y);
    if (!cd) continue;
    var cut = Math.abs(angleDiff(Math.atan2(u.y, u.x), Math.atan2(cd.y, cd.x)));
    if (cut > 80 * RAD) continue;
    var blocked = false;
    var k, b;
    for (k = 0; k < ballList.length && !blocked; k++) {
      b = ballList[k];
      if (b.id === 'cue' || b.id === targetId) continue;
      if (segDist(b.x, b.y, cue.x, cue.y, ghost.x, ghost.y) < 2 * R - 0.002) blocked = true;
    }
    if (blocked) continue;
    for (k = 0; k < ballList.length && !blocked; k++) {
      b = ballList[k];
      if (b.id === targetId || b.id === 'cue') continue;
      if (segDist(b.x, b.y, target.x, target.y, aim.x, aim.y) < 2 * R - 0.002) blocked = true;
    }
    if (blocked) continue;
    return { pocket: pi, cutDeg: cut / RAD };
  }
  return null;
}

/* ============================== 0. 加载与环境 ============================== */
group('0. 加载与环境');
check('Pool.CONFIG 可用（config.js 已加载）', !!(C && C.table && C.pockets), 'CONFIG ' + (C ? 'ok' : 'missing'));
check('台面参数符合预期', C.table.width === 2.54 && C.table.height === 1.27 &&
  Math.abs(C.table.ballRadius - 0.028575) < 1e-12 && Math.abs(C.table.pocketRadius - 0.052) < 1e-12,
  'W=' + C.table.width + ' H=' + C.table.height + ' R=' + C.table.ballRadius + ' PR=' + C.table.pocketRadius);
check('Pool.LEVELS 为数组且恰好 12 关', Array.isArray(LEVELS) && LEVELS.length === 12,
  '实际 ' + (Array.isArray(LEVELS) ? LEVELS.length : 'N/A'));
check('袋口数量为 6', Array.isArray(POCKETS) && POCKETS.length === 6, '实际 ' + (POCKETS ? POCKETS.length : 'N/A'));

if (!Array.isArray(LEVELS) || LEVELS.length === 0) {
  console.error('\n致命错误：Pool.LEVELS 不可用，终止。');
  process.exit(1);
}

/* ============================== 1. 逐关校验 ============================== */
var EXPECTED_IDS = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10', 'l11', 'l12'];
var seenIds = {};
var prev = null;
var prevTargets = null;
var prevBlockers = null;

for (var i = 0; i < LEVELS.length; i++) {
  var lv = LEVELS[i];
  var tag = (lv && lv.id ? lv.id : '#' + i);
  group('[' + (i + 1) + '/12] ' + tag + (lv && lv.name ? ' ' + lv.name : ''));

  /* ---------- A. 结构 ---------- */
  check(tag + ' 结构：id / name / subtitle / tip 齐全',
    isStr(lv.id) && isStr(lv.name) && isStr(lv.subtitle) && isStr(lv.tip) && lv.tip.length >= 8,
    lv.tip ? 'tip=' + lv.tip.length + '字' : 'tip 缺失');
  check(tag + ' id 形如 lN 且唯一', /^l[0-9]+$/.test(String(lv.id)) && !seenIds[lv.id], 'id=' + lv.id);
  seenIds[lv.id] = true;
  check(tag + ' difficulty 为整数且等于序号 ' + (i + 1), lv.difficulty === i + 1, 'difficulty=' + lv.difficulty);
  check(tag + ' ballInHand / allowGuide / allowSpin 为布尔值',
    typeof lv.ballInHand === 'boolean' && typeof lv.allowGuide === 'boolean' && typeof lv.allowSpin === 'boolean',
    'ballInHand=' + lv.ballInHand + ' guide=' + lv.allowGuide + ' spin=' + lv.allowSpin);
  check(tag + ' rewardCoins 为 80..500 的整数',
    Number.isInteger(lv.rewardCoins) && lv.rewardCoins >= 80 && lv.rewardCoins <= 500,
    'rewardCoins=' + lv.rewardCoins);

  var balls = Array.isArray(lv.balls) ? lv.balls : [];
  var targets = Array.isArray(lv.targets) ? lv.targets : null;
  var blockers = Array.isArray(lv.blockers) ? lv.blockers : null;

  /* ---------- B. 目标球 / 干扰球 ---------- */
  check(tag + ' targets / blockers 均为非空数组',
    !!targets && targets.length >= 1 && !!blockers && blockers.length >= 1,
    'targets=' + (targets ? targets.length : 'N/A') + ' blockers=' + (blockers ? blockers.length : 'N/A'));

  var numsOk = true, numsDetail = [];
  var targetSet = {}, blockerSet = {}, ballSet = {};
  var t, bi;
  if (targets) {
    for (t = 0; t < targets.length; t++) {
      if (!Number.isInteger(targets[t]) || targets[t] < 1 || targets[t] > 7) {
        numsOk = false; numsDetail.push('目标球号 ' + targets[t] + ' 超出 1..7');
      }
      if (targetSet[targets[t]]) { numsOk = false; numsDetail.push('目标球号 ' + targets[t] + ' 重复'); }
      targetSet[targets[t]] = true;
    }
  }
  if (blockers) {
    for (t = 0; t < blockers.length; t++) {
      if (!Number.isInteger(blockers[t]) || blockers[t] < 9 || blockers[t] > 15) {
        numsOk = false; numsDetail.push('干扰球号 ' + blockers[t] + ' 超出 9..15');
      }
      if (blockerSet[blockers[t]]) { numsOk = false; numsDetail.push('干扰球号 ' + blockers[t] + ' 重复'); }
      blockerSet[blockers[t]] = true;
    }
  }
  if (targets && blockers) {
    for (t = 0; t < targets.length; t++) if (blockerSet[targets[t]]) { numsOk = false; numsDetail.push('目标/干扰重复 ' + targets[t]); }
  }
  check(tag + ' 目标球为 1..7 且唯一、干扰球为 9..15 且唯一、两者互斥', numsOk,
    numsOk ? 'targets=[' + (targets || []).join(',') + '] blockers=[' + (blockers || []).join(',') + ']' : numsDetail.join('; '));

  var unionOk = true, unionDetail = [];
  for (bi = 0; bi < balls.length; bi++) {
    var b = balls[bi];
    if (!Number.isInteger(b.number)) { unionOk = false; unionDetail.push('非法球号 ' + b.number); continue; }
    if (ballSet[b.number]) { unionOk = false; unionDetail.push('balls 内球号重复 ' + b.number); }
    ballSet[b.number] = true;
    if (!targetSet[b.number] && !blockerSet[b.number]) { unionOk = false; unionDetail.push('b' + b.number + ' 既不是目标也不是干扰'); }
  }
  if (targets) for (t = 0; t < targets.length; t++) if (!ballSet[targets[t]]) { unionOk = false; unionDetail.push('目标球 ' + targets[t] + ' 不在 balls'); }
  if (blockers) for (t = 0; t < blockers.length; t++) if (!ballSet[blockers[t]]) { unionOk = false; unionDetail.push('干扰球 ' + blockers[t] + ' 不在 balls'); }
  check(tag + ' balls 恰好等于 targets + blockers（无多无缺）', unionOk, unionOk ? 'balls=' + balls.length : unionDetail.join('; '));

  check(tag + ' 目标球不覆盖全部球（每关都有干扰球）',
    !!targets && !!blockers && targets.length < balls.length && blockers.length > 0,
    'targets=' + (targets ? targets.length : 'N/A') + ' balls=' + balls.length);
  check(tag + ' 目标/干扰数量符合梯度（目标 1..4、干扰 1..4、总球数 2..8）',
    !!targets && !!blockers && targets.length >= 1 && targets.length <= 4 &&
    blockers.length >= 1 && blockers.length <= 4 && balls.length >= 2 && balls.length <= 8,
    '目标=' + (targets ? targets.length : 'N/A') + ' 干扰=' + (blockers ? blockers.length : 'N/A') + ' 球数=' + balls.length);
  check(tag + ' 不含 8 号球且无越界球号',
    balls.every(function (x) { return x.number !== 8 && ((x.number >= 1 && x.number <= 7) || (x.number >= 9 && x.number <= 15)); }),
    'nums=[' + balls.map(function (x) { return x.number; }).join(',') + ']');

  /* ---------- C. 几何 ---------- */
  var seats = [{ id: 'cue', x: lv.cue ? lv.cue.x : NaN, y: lv.cue ? lv.cue.y : NaN }];
  var inTableOk = true, geomDetail = [];
  check(tag + ' cue 坐标存在且为有限数',
    !!lv.cue && isNum(lv.cue.x) && isNum(lv.cue.y),
    lv.cue ? '(' + lv.cue.x + ', ' + lv.cue.y + ')' : 'cue 缺失');
  if (lv.cue && isNum(lv.cue.x) && isNum(lv.cue.y)) {
    if (lv.cue.x < R - EPS || lv.cue.x > W - R + EPS || lv.cue.y < R - EPS || lv.cue.y > H - R + EPS) {
      inTableOk = false; geomDetail.push('cue 出界');
    }
  }
  for (var gj = 0; gj < balls.length; gj++) {
    var gb = balls[gj];
    if (!isNum(gb.x) || !isNum(gb.y)) { inTableOk = false; geomDetail.push('b' + gb.number + ' 坐标非法'); continue; }
    seats.push({ id: 'b' + gb.number, x: gb.x, y: gb.y });
    if (gb.x < R - EPS || gb.x > W - R + EPS || gb.y < R - EPS || gb.y > H - R + EPS) {
      inTableOk = false; geomDetail.push('b' + gb.number + ' 出界');
    }
  }
  check(tag + ' 母球与全部球球心在台面内（R ≤ x ≤ W-R 且 R ≤ y ≤ H-R）', inTableOk,
    inTableOk ? '全部在界内' : geomDetail.join('; '));

  var pairOk = true, pairDetail = [], minSep = 9;
  for (var s1 = 0; s1 < seats.length; s1++) {
    for (var s2 = s1 + 1; s2 < seats.length; s2++) {
      var dd = hypot(seats[s1].x - seats[s2].x, seats[s1].y - seats[s2].y);
      minSep = Math.min(minSep, dd);
      if (dd < 2 * R - EPS) { pairOk = false; pairDetail.push(seats[s1].id + '/' + seats[s2].id + ' 间距 ' + dd.toFixed(5)); }
    }
  }
  check(tag + ' 任意两球（含母球）球心间距 ≥ 2R（不重叠）', pairOk,
    pairOk ? '最小间距 ' + minSep.toFixed(4) + 'm' : pairDetail.join('; '));
  check(tag + ' 球堆不过密（最小间距 ≥ 2R + 0.02，避免打不开）', minSep >= 2 * R + 0.02 - EPS,
    '最小间距 ' + minSep.toFixed(4) + 'm');

  var pocketOk = true, pocketDetail = [];
  for (var s3 = 0; s3 < seats.length; s3++) {
    for (var pi = 0; pi < POCKETS.length; pi++) {
      var p = POCKETS[pi];
      var pd = hypot(seats[s3].x - p.x, seats[s3].y - p.y);
      if (pd < p.radius + R * 1.2 - EPS) {
        pocketOk = false;
        pocketDetail.push(seats[s3].id + ' 距袋口#' + pi + ' ' + pd.toFixed(5));
      }
    }
  }
  check(tag + ' 母球与球均不落在袋口捕获区（距袋心 ≥ pocketRadius + 1.2R）', pocketOk,
    pocketOk ? '安全' : pocketDetail.join('; '));

  /* ---------- D. goal ---------- */
  var goal = lv.goal;
  check(tag + ' goal 字段完整（total = 目标球数、label 含目标球）',
    !!goal && typeof goal === 'object' &&
    (goal.type === 'targets' || goal.type === 'clear') &&
    goal.total === targets.length &&
    isStr(goal.label) && goal.label.indexOf('目标球') >= 0 && goal.label.indexOf(String(targets.length)) >= 0,
    goal ? JSON.stringify(goal) : 'goal 缺失');

  /* ---------- E. rules ---------- */
  var rules = lv.rules;
  var rulesBaseOk = !!rules && typeof rules === 'object' &&
    rules.guide === lv.allowGuide && rules.spin === lv.allowSpin &&
    isStr(rules.guideText) && isStr(rules.spinText) && isStr(rules.summary) && typeof rules.note === 'string';
  check(tag + ' rules 字段完整且 guide/spin 与 allowGuide/allowSpin 一致', rulesBaseOk,
    rules ? 'guide=' + rules.guide + ' spin=' + rules.spin : 'rules 缺失');
  check(tag + ' rules.guideText / spinText 为中文说明且与开关状态一致',
    !!rules && rules.guideText.indexOf(lv.allowGuide ? '开启' : '关闭') >= 0 &&
    rules.spinText.indexOf(lv.allowSpin ? '开启' : '关闭') >= 0 &&
    rules.guideText.length >= 6 && rules.spinText.length >= 6,
    rules ? rules.guideText + ' / ' + rules.spinText : 'N/A');
  check(tag + ' rules.summary 为一行摘要且与开关一致',
    !!rules && rules.summary ===
      (lv.allowGuide ? '辅助线开启' : '辅助线关闭') + ' · ' + (lv.allowSpin ? '旋转开启' : '旋转关闭'),
    rules ? rules.summary : 'N/A');
  check(tag + ' rules.note 说明目标球/干扰球规则',
    !!rules && rules.note.indexOf('目标球') >= 0 && rules.note.indexOf('干扰球') >= 0,
    rules ? rules.note : 'N/A');

  /* ---------- F. 杆数 ---------- */
  check(tag + ' maxShots / par 为整数且为正',
    Number.isInteger(lv.maxShots) && lv.maxShots > 0 && Number.isInteger(lv.par) && lv.par > 0,
    'maxShots=' + lv.maxShots + ' par=' + lv.par);
  check(tag + ' maxShots ≥ 目标球数 + 1', lv.maxShots >= targets.length + 1,
    'maxShots=' + lv.maxShots + ' 目标球=' + targets.length);
  check(tag + ' par ≥ 目标球数（理论最少杆数）', lv.par >= targets.length,
    'par=' + lv.par + ' 目标球=' + targets.length);
  check(tag + ' par ≤ maxShots - 2', lv.par <= lv.maxShots - 2,
    'par=' + lv.par + ' maxShots=' + lv.maxShots);

  /* ---------- G. 可解性（几何） ---------- */
  var potLines = [];
  var allSolvable = true;
  for (var ti = 0; ti < targets.length; ti++) {
    var line = hasPotLine(lv, targets[ti]);
    if (!line) { allSolvable = false; potLines.push('t' + targets[ti] + ':无'); }
    else potLines.push('t' + targets[ti] + ':袋' + line.pocket + '/' + line.cutDeg.toFixed(1) + '°');
  }
  check(tag + ' 每颗目标球都存在直线/薄球进球线路（母球到假想球、目标到袋口均不被挡）',
    allSolvable && targets.length > 0, potLines.join(' | '));

  /* ---------- H. 梯度 ---------- */
  if (prev) {
    check(tag + ' 目标球数随难度单调不降', targets.length >= prevTargets,
      prevTargets + ' → ' + targets.length);
    check(tag + ' 干扰球数随难度单调不降', blockers.length >= prevBlockers,
      prevBlockers + ' → ' + blockers.length);
    check(tag + ' 总球数随难度单调不降', balls.length >= prev.balls,
      prev.balls + ' → ' + balls.length);
    check(tag + ' maxShots 随难度单调不降', lv.maxShots >= prev.maxShots,
      prev.maxShots + ' → ' + lv.maxShots);
    check(tag + ' par 随难度单调不降', lv.par >= prev.par, prev.par + ' → ' + lv.par);
    check(tag + ' rewardCoins 随难度单调不降', lv.rewardCoins >= prev.rewardCoins,
      prev.rewardCoins + ' → ' + lv.rewardCoins);
    check(tag + ' difficulty 严格递增', lv.difficulty > prev.difficulty,
      prev.difficulty + ' → ' + lv.difficulty);
  }
  prev = { balls: balls.length, maxShots: lv.maxShots, par: lv.par, rewardCoins: lv.rewardCoins, difficulty: lv.difficulty };
  prevTargets = targets.length;
  prevBlockers = blockers.length;

  summaryRows.push({
    id: lv.id,
    targets: targets.slice(),
    blockers: blockers.slice(),
    balls: balls.length,
    maxShots: lv.maxShots,
    par: lv.par,
    reward: lv.rewardCoins,
    solvable: allSolvable
  });
  note('目标=' + targets.length + ' 干扰=' + blockers.length + ' 球数=' + balls.length +
    ' / ' + lv.maxShots + ' 杆上限 / par ' + lv.par + ' / ' + lv.rewardCoins + ' 金币 / ' +
    (allSolvable ? '可解' : '不可解'));
}

/* ============================== 2. 全局约束 ============================== */
group('2. 全局约束');
check('关卡 id 覆盖 l1..l12 且顺序正确',
  Object.keys(seenIds).length === 12 &&
  LEVELS.map(function (l) { return l.id; }).join(',') === EXPECTED_IDS.join(','),
  'ids=' + LEVELS.map(function (l) { return l.id; }).join(','));
check('难度序列为 1..12 严格递增',
  LEVELS.every(function (l, idx) { return l.difficulty === idx + 1; }),
  'difficulties=' + LEVELS.map(function (l) { return l.difficulty; }).join(','));
check('全部关卡均不含 8 号球', LEVELS.every(function (l) {
  return l.balls.every(function (b) { return b.number !== 8; });
}), '无 8 号');
check('全部目标球均为全色低号 1..7', LEVELS.every(function (l) {
  return l.targets.every(function (n) { return n >= 1 && n <= 7; });
}), '目标球 ≤ 7');
check('全部干扰球均为花色 9..15', LEVELS.every(function (l) {
  return l.blockers.every(function (n) { return n >= 9 && n <= 15; });
}), '干扰球 9..15');
check('ballInHand / allowGuide / allowSpin 均有关卡变化（非单一取值）',
  new Set(LEVELS.map(function (l) { return l.ballInHand; })).size === 2 &&
  new Set(LEVELS.map(function (l) { return l.allowGuide; })).size === 2 &&
  new Set(LEVELS.map(function (l) { return l.allowSpin; })).size === 2,
  'ballInHand/guide/spin 均有变化');
check('每关 tip 都提示目标球/干扰球机制', LEVELS.every(function (l) {
  return String(l.tip).indexOf('目标') >= 0 || String(l.tip).indexOf('干扰') >= 0 || String(l.tip).indexOf('花色') >= 0;
}), 'tip 均说明机制');
var l12 = LEVELS[11];
check('l12 rules.note 说明不含八球分组/黑八顺序限制',
  typeof l12.rules.note === 'string' &&
  l12.rules.note.indexOf('目标球') >= 0 &&
  l12.rules.note.indexOf('八球') >= 0,
  'note=' + l12.rules.note);

/* ============================== 3. 一览表 ============================== */
console.log('\n================ 关卡一览表 ================');
console.log('关卡 | 目标球 | 干扰球 | 球数 | maxShots | par | 奖励 | 可解');
console.log('-----|--------|--------|------|----------|-----|------|-----');
summaryRows.forEach(function (r) {
  console.log([
    r.id,
    '[' + r.targets.join(',') + ']',
    '[' + r.blockers.join(',') + ']',
    r.balls,
    r.maxShots,
    r.par,
    r.reward,
    r.solvable ? 'yes' : 'NO'
  ].join(' | '));
});

/* ============================== 汇总 ============================== */
console.log('\n==================================================');
console.log('  PASS: ' + passed + '   FAIL: ' + failed + '   TOTAL: ' + (passed + failed));
console.log('==================================================');
if (failed > 0) {
  console.error('\nFAILURES (' + failed + ')');
  failures.forEach(function (msg) { console.error(' - ' + msg); });
  process.exit(1);
}
console.log('ALL LEVEL PLACEMENT TESTS PASSED\n');
