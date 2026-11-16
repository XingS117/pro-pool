/* 一杆入袋 / PRO POOL — 机器人决策 AI（ai-levels-dev）
 * 对外接口：Pool.AI.chooseShot(world, opts)
 * 约束：绝不修改传入 world；所有候选通过 world.clone() 试打验证。
 */
(function () {
  'use strict';

  var Pool = (window.Pool = window.Pool || {});

  /* ============================ 基础工具 ============================ */

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hypot(x, y) { return Math.sqrt(x * x + y * y); }
  function dist(ax, ay, bx, by) { return hypot(bx - ax, by - ay); }
  function angleDiff(a, b) {
    var d = (a - b) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  function now() {
    if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }
  function unit(dx, dy) {
    var l = hypot(dx, dy);
    if (l < 1e-12) return null;
    return { x: dx / l, y: dy / l };
  }
  /* 点到线段的距离 */
  function pointSegDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var l2 = dx * dx + dy * dy;
    if (l2 < 1e-12) return hypot(px - ax, py - ay);
    var t = ((px - ax) * dx + (py - ay) * dy) / l2;
    t = clamp(t, 0, 1);
    return hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  function ignoreMap(ids) {
    var m = {};
    for (var i = 0; i < ids.length; i++) if (ids[i] != null) m[ids[i]] = 1;
    return m;
  }
  /* 可复现随机数（mulberry32）——同一局面决策可复现 */
  function makeRng(seed) {
    var a = (seed >>> 0) || 0x9e3779b9;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ============================ 配置读取 ============================ */

  function defaultPockets(W, H, PR) {
    return [
      { x: 0, y: 0, radius: PR, corner: true, index: 0 },
      { x: W * 0.5, y: 0, radius: PR, corner: false, index: 1 },
      { x: W, y: 0, radius: PR, corner: true, index: 2 },
      { x: 0, y: H, radius: PR, corner: true, index: 3 },
      { x: W * 0.5, y: H, radius: PR, corner: false, index: 4 },
      { x: W, y: H, radius: PR, corner: true, index: 5 }
    ];
  }

  function tableInfo() {
    var cfg = Pool.CONFIG || {};
    var t = cfg.table || {};
    var W = t.width || 2.54;
    var H = t.height || 1.27;
    var R = t.ballRadius || 0.028575;
    var PR = t.pocketRadius || 0.052;
    var raw = cfg.pockets || defaultPockets(W, H, PR);
    var pockets = [];
    for (var i = 0; i < raw.length; i++) {
      var p = raw[i];
      pockets.push({
        x: p.x, y: p.y,
        radius: p.radius != null ? p.radius : PR,
        corner: !!p.corner,
        index: p.index != null ? p.index : i
      });
    }
    return {
      W: W, H: H, R: R, PR: PR,
      pockets: pockets,
      minX: R, maxX: W - R, minY: R, maxY: H - R
    };
  }

  function physCfg() {
    var p = (Pool.CONFIG && Pool.CONFIG.physics) || {};
    var ballFriction = p.ballFriction != null ? p.ballFriction : 0.06;
    return {
      maxShotSpeed: p.maxShotSpeed || 7.6,
      rollingDecel: p.rollingDecel || 0.36,
      cushionRestitution: p.cushionRestitution != null ? p.cushionRestitution : 0.76,
      ballRestitution: p.ballRestitution != null ? p.ballRestitution : 0.95,
      throwFriction: clamp(ballFriction * 2.5, 0.04, 0.5),
      stopSpeed: p.stopSpeed || 0.012
    };
  }

  /* ============================ 球与合法性 ============================ */

  function isActive(b) {
    if (!b) return false;
    if (b.active === false) return false;
    if (b.pocketed === true) return false;
    return true;
  }

  function activeBalls(world) {
    var src = (world && world.balls) || [];
    var out = [];
    for (var i = 0; i < src.length; i++) if (isActive(src[i])) out.push(src[i]);
    return out;
  }

  function findBall(world, ref) {
    if (!world || ref == null) return null;
    if (typeof ref === 'object') return ref;
    var b = null;
    if (typeof world.getBall === 'function') {
      try { b = world.getBall(ref); } catch (e) { b = null; }
    }
    if (b) return b;
    var src = world.balls || [];
    for (var i = 0; i < src.length; i++) {
      if (src[i].id === ref || src[i].number === ref) return src[i];
    }
    if ((ref === 'cue' || ref === 0) && world.cueBall) return world.cueBall;
    return null;
  }

  function findNumber(world, number) {
    var src = (world && world.balls) || [];
    for (var i = 0; i < src.length; i++) if (src[i].number === number) return src[i];
    return null;
  }

  function legalTargets(world, opts) {
    var out = [];
    var seen = {};
    var i, b;
    var ids = opts && opts.targetIds;
    if (ids && ids.length) {
      for (i = 0; i < ids.length; i++) {
        b = findBall(world, ids[i]);
        if (!b || seen[b.id]) continue;
        if (!isActive(b)) continue;
        if (b.number === 0 || b.id === 'cue') continue;
        seen[b.id] = 1;
        out.push(b);
      }
      return out;
    }
    var group = (opts && opts.group) || 'open';
    var balls = activeBalls(world);
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.number === 0 || b.id === 'cue') continue;
      if (group === 'eight') {
        if (b.number !== 8) continue;
      } else if (group === 'solid') {
        if (!(b.number >= 1 && b.number <= 7)) continue;
      } else if (group === 'stripe') {
        if (!(b.number >= 9 && b.number <= 15)) continue;
      } else {
        if (b.number === 8) continue;
      }
      if (seen[b.id]) continue;
      seen[b.id] = 1;
      out.push(b);
    }
    return out;
  }

  function insideTable(x, y, info, clearance) {
    var c = clearance || 0;
    return x >= info.R + c - 1e-9 && x <= info.W - info.R - c + 1e-9 &&
      y >= info.R + c - 1e-9 && y <= info.H - info.R - c + 1e-9;
  }

  /* 路径遮挡：忽略 ignoreIds 中的球，若任一球心到线段距离 < 阈值则视为被挡 */
  function pathBlocked(balls, ax, ay, bx, by, threshold, ignore) {
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (!isActive(b)) continue;
      if (ignore && ignore[b.id]) continue;
      if (pointSegDist(b.x, b.y, ax, ay, bx, by) < threshold) return b;
    }
    return null;
  }

  /* ============================ 难度档位 ============================ */

  var DIFFICULTY = {
    // 三档梯度：refine=角度/力度修正，verify=出口自检，aggressive=宽网格强制命中。
    // 球房新手只打明显球且带手感误差；职业陪练会修正+自检（中上水平）；
    // 黑八高手满窗口搜索，能瞄必进。
    easy: {
      maxCut: 0.95, consider: 7, sims: 3, angleErr: 0.0042, powerErr: 0,
      spin: false, position: 0.12, conf: 0.68, spinTries: 0,
      refine: false, verify: false, aggressive: false, budget: 40, powerScale: 1.18
    },
    normal: {
      maxCut: 1.12, consider: 10, sims: 5, angleErr: 0, powerErr: 0,
      spin: true, position: 0.40, conf: 0.93, spinTries: 2,
      refine: true, verify: true, aggressive: false, budget: 110
    },
    hard: {
      // 黑八高手：接近满级瞄准，候选/试打断崖式增加，走位权重接近实战高手
      maxCut: 1.44, consider: 24, sims: 16, angleErr: 0.00008, powerErr: 0,
      spin: true, position: 0.80, conf: 0.985, spinTries: 5,
      budget: 170, spinGain: 0.03, twoPly: 0.85,
      refine: true, verify: true, aggressive: true
    }
  };

  /* ============================ 评估模型 ============================ */

  function potQuality(cut, dcg, dtp, prof) {
    var angQ = clamp(1 - cut / prof.maxCut, 0, 1);
    var aq = Math.pow(angQ, 1.35);
    var distQ = 1 / (1 + 0.45 * dcg + 0.85 * dtp);
    return clamp(0.66 * aq + 0.34 * distQ, 0, 1);
  }

  /* 力度估算：用实测行程曲线反解初速。
     中杆（AI 默认 spinY≈0.1）是“先滑动后滚动”，实测 v² ≈ 1.40 × 行程，
     旧版按纯滚动 1.116 估算会系统性偏小（约 12%），目标球常常差一点到袋。 */
  // 实测（AI 默认杆法）：初速 v 与停球行程 d 的关系接近 v = 1.21 * d^0.41。
  // 低速段台呢会额外“抓”球，所以不能用 v² ∝ d 的纯滚动模型（短球会系统性偏小）。
  function speedForDistance(d) {
    return 1.21 * Math.pow(Math.max(d, 0.05), 0.41);
  }
  function estimatePower(dcg, dtp, cut, info) {
    var pc = physCfg();
    var vObj = speedForDistance(dtp) / 0.92;
    var cosCut = Math.max(0.32, Math.cos(cut) * 0.92);
    var vCueAtHit = vObj / cosCut;
    var v0 = Math.sqrt(vCueAtHit * vCueAtHit + speedForDistance(dcg) * speedForDistance(dcg));
    var power = (v0 * 1.06) / pc.maxShotSpeed;
    return clamp(power, 0.10, 0.98);
  }

  /* 袋口实际可打瞄准点：
   * 球心被库边约束在 [R, W-R] x [R, H-R] 内，若直接瞄角袋中心，
   * 低角度来球会先压库再进袋。把袋心收进可打矩形得到物理可达的瞄准点。 */
  function aimPointOf(p, info) {
    return {
      x: clamp(p.x, info.minX, info.maxX),
      y: clamp(p.y, info.minY, info.maxY)
    };
  }

  /* 碰撞抛掷补偿：真实物理里目标球会沿母球的切向被“甩”偏，
   * 偏角约为 atan(tan(cut)/(1+e))（受库仑上限约束）。
   * 这里反推假想球位置，使目标球的实际出射方向指向袋口瞄准点。 */
  function throwAdjust(t, cuePos, aim, info) {
    var R = info.R;
    var pc = physCfg();
    var e = pc.ballRestitution;
    var maxDev = Math.atan(Math.max(0, pc.throwFriction || 0));
    var u = unit(aim.x - t.x, aim.y - t.y);
    if (!u) return null;
    var uAng = Math.atan2(u.y, u.x);
    var nAng = uAng;
    var gx = t.x - u.x * 2 * R;
    var gy = t.y - u.y * 2 * R;
    // 物理里 throwFriction = 0（无甩球）时，目标球严格沿球心连线出射，
    // 此时再做“抛掷补偿”反而会把假想球推偏（实测偏 0.55°，0.87m 上放大到 8mm、出球偏 9°）。
    if (maxDev > 1e-6) {
      for (var iter = 0; iter < 2; iter++) {
        var d = unit(gx - cuePos.x, gy - cuePos.y);
        if (!d) return null;
        var cutSigned = angleDiff(Math.atan2(d.y, d.x), nAng);
        var dev = Math.atan(Math.tan(cutSigned) / (1 + e));
        if (dev > maxDev) dev = maxDev;
        if (dev < -maxDev) dev = -maxDev;
        nAng = uAng - dev;
        gx = t.x - Math.cos(nAng) * 2 * R;
        gy = t.y - Math.sin(nAng) * 2 * R;
      }
    }
    var cueDir = unit(gx - cuePos.x, gy - cuePos.y);
    if (!cueDir) return null;
    return {
      ghostX: gx,
      ghostY: gy,
      angle: Math.atan2(cueDir.y, cueDir.x),
      cut: Math.abs(angleDiff(uAng, Math.atan2(cueDir.y, cueDir.x)))
    };
  }

  /* 高手式微调：几何瞄准有 0.2~0.5° 的系统偏差（甩球补偿、袋口内缩、低速度下的
     摩擦非线性），长台会放大成明显偏差。这里用真实物理引擎做小范围搜索，
     把角度校到“能进的区间中心”，再顺手校准力度。只有 hard 档启用。 */
  function refineShot(world, cueId, cand, info, prof, deadline, remaining, aggressive) {
    if (!cand || !cand.targetId) return null;
    var spin = aiSpinY(null);
    function tryShot(angle, power) {
      if (now() > deadline - 10) return null;
      var res = simulate(world, cueId, { angle: angle, power: power, spinX: 0, spinY: spin, targetId: cand.targetId }, info, null, deadline);
      if (!res || !res.verified) return null;
      if (!res.potted || res.cuePotted) return null;
      if (res.firstHit && res.firstHit !== cand.targetId) return null;
      return res;
    }
    // 常规窗口覆盖 0.2~0.5° 系统偏差；aggressive 是「高手必须打进」的宽网格，
    // 覆盖几何估算与真实物理之间可达 2~3° 的偏差（切角越大偏差越大）。
    // 大切角（>25°）时几何假想球与真实物理可差 4~5°，窗口必须覆盖到 ±0.10 rad。
    var offsets = aggressive
      ? [0, 0.006, -0.006, 0.012, -0.012, 0.02, -0.02, 0.03, -0.03,
         0.045, -0.045, 0.06, -0.06, 0.08, -0.08, 0.10, -0.10]
      : [0, 0.0012, -0.0012, 0.0024, -0.0024, 0.0036, -0.0036, 0.005, -0.005, 0.0065, -0.0065];
    // 力度档从基准往上扫：estimatePower 在「远台 / 擦库 / 大角度」时会明显低估，
    // 之前最多只到 ×1.4，救不回来（实测有案例需要 ×2.2 才够）。
    var powers = aggressive
      ? [1.0, 1.2, 1.5, 1.9, 2.4, 3.0, 3.6]
      : [1.0, 1.2, 1.5, 1.9, 2.4];
    var hits = [];
    for (var pi = 0; pi < powers.length; pi++) {
      for (var oi = 0; oi < offsets.length; oi++) {
        var pw = clamp(cand.power * powers[pi], 0.06, 1);
        var res2 = tryShot(cand.angle + offsets[oi], pw);
        if (res2) hits.push({ off: offsets[oi], pw: pw, res: res2 });
      }
      if (hits.length) break; // 这一档力度能进就够了
    }
    if (!hits.length) return null;
    hits.sort(function (a, b) { return a.off - b.off; });
    var mid = hits[Math.floor(hits.length / 2)];
    // 职业做法：找“刚好能进”的临界力度，再加约 22% 余量——
    // 既有余量保证不会停在袋口，又不会因为用力过猛把母球打飞、丢掉下一杆。
    var lo = mid.pw;
    for (var bi = 0; bi < 4; bi++) {
      var lower = clamp(lo * 0.88, 0.06, 1);
      if (tryShot(cand.angle + mid.off, lower)) { lo = lower; mid.res = tryShot(cand.angle + mid.off, lower) || mid.res; }
      else break;
    }
    var withMargin = clamp(lo * 1.22, 0.06, 1);
    var resM = tryShot(cand.angle + mid.off, withMargin);
    if (resM) { mid.pw = withMargin; mid.res = resM; }
    else { mid.pw = lo; }
    var posVal = 0;
    var rest = remaining ? remainingAfter(remaining, cand.targetId) : null;
    if (mid.res && mid.res.cueEnd && rest && rest.length) {
      posVal = positionValue(mid.res.world || world, mid.res.cueEnd, rest, info, prof, cueId);
    }
    return { angle: cand.angle + mid.off, power: mid.pw, res: mid.res, pos: posVal, hits: hits.length };
  }

  /* ============================ 候选生成 ============================ */

  function buildCandidates(world, opts, info, legal, prof, cuePos, cueId, eightLegal) {
    var R = info.R;
    var balls = activeBalls(world);
    var tol = 2 * R * 0.98;
    var out = [];
    for (var ti = 0; ti < legal.length; ti++) {
      var t = legal[ti];
      if (!isActive(t)) continue;
      for (var pi = 0; pi < info.pockets.length; pi++) {
        var p = info.pockets[pi];
        var aim = aimPointOf(p, info);
        var dxp = aim.x - t.x, dyp = aim.y - t.y;
        var dtp = hypot(dxp, dyp);
        if (dtp < R * 2) continue;
        var adj = throwAdjust(t, cuePos, aim, info);
        if (!adj) continue;
        var gx = adj.ghostX, gy = adj.ghostY;
        if (!insideTable(gx, gy, info, 0)) continue;
        var dcx = gx - cuePos.x, dcy = gy - cuePos.y;
        var dcg = hypot(dcx, dcy);
        if (dcg < 2 * R * 1.02) continue;
        var cut = adj.cut;
        if (cut > prof.maxCut) continue;
        if (pathBlocked(balls, cuePos.x, cuePos.y, gx, gy, tol, ignoreMap([cueId, t.id]))) continue;
        if (pathBlocked(balls, t.x, t.y, aim.x, aim.y, tol, ignoreMap([t.id, cueId]))) continue;
        out.push({
          target: t,
          targetId: t.id,
          pocketIndex: p.index,
          pocket: p,
          aimX: aim.x, aimY: aim.y,
          ghostX: gx, ghostY: gy,
          cut: cut,
          dcg: dcg,
          dtp: dtp,
          angle: adj.angle,
          power: clamp(estimatePower(dcg, dtp, cut, info) * (prof.powerScale || 1), 0.06, 1),
          quality: potQuality(cut, dcg, dtp, prof),
          eightLegal: !!eightLegal,
          cuePos: cuePos
        });
      }
    }
    out.sort(function (a, b) {
      if (prof === DIFFICULTY.hard) {
        var ea = a.target && a.target.number === 8 ? 1 : 0;
        var eb = b.target && b.target.number === 8 ? 1 : 0;
        if (ea !== eb) return ea - eb;
        if (Math.abs(a.quality - b.quality) < 0.08) {
          var da = a.cut * 0.70 + a.dcg * 0.10 + a.dtp * 0.06 + a.power * 0.05;
          var db = b.cut * 0.70 + b.dcg * 0.10 + b.dtp * 0.06 + b.power * 0.05;
          return da - db;
        }
      }
      return b.quality - a.quality;
    });
    return out;
  }

  /* 对手的合法目标球（用于“两拍”评估：别把好打的位置留给对手） */
  function opponentTargetIds(worldView, opts, cueId) {
    var g = opts && opts.group;
    var balls = activeBalls(worldView);
    var out = [];
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (!b || b.id === cueId || !b.number) continue;
      if (!g || g === 'open') { out.push(b.id); continue; }
      var kind = b.number === 8 ? 'eight' : (b.number < 8 ? 'solid' : 'stripe');
      if (kind !== g) out.push(b.id);
    }
    return out;
  }

  /* 从给定母球位置评估“下一杆最好打多简单”，0..1 */
  function bestNextPot(worldView, cuePos, targets, info, prof, cueId) {
    if (!targets || !targets.length) return 1;
    var R = info.R;
    var balls = activeBalls(worldView);
    var tol = 2 * R * 0.98;
    var best = 0;
    for (var i = 0; i < targets.length; i++) {
      var t = findBall(worldView, targets[i]);
      if (!t || !isActive(t) || t.id === cueId) continue;
      for (var pi = 0; pi < info.pockets.length; pi++) {
        var p = info.pockets[pi];
        var aim = aimPointOf(p, info);
        var dxp = aim.x - t.x, dyp = aim.y - t.y;
        var dtp = hypot(dxp, dyp);
        if (dtp < R * 2) continue;
        var adj = throwAdjust(t, cuePos, aim, info);
        if (!adj) continue;
        var gx = adj.ghostX, gy = adj.ghostY;
        if (!insideTable(gx, gy, info, 0)) continue;
        var dcx = gx - cuePos.x, dcy = gy - cuePos.y;
        var dcg = hypot(dcx, dcy);
        if (dcg < 2 * R * 1.02) continue;
        var cut = adj.cut;
        if (cut > 1.28) continue;
        if (pathBlocked(balls, cuePos.x, cuePos.y, gx, gy, tol, ignoreMap([cueId, t.id]))) continue;
        if (pathBlocked(balls, t.x, t.y, aim.x, aim.y, tol, ignoreMap([t.id, cueId]))) continue;
        var q = potQuality(cut, dcg, dtp, prof);
        if (q > best) best = q;
      }
    }
    return best;
  }

  /* 母球最终位置评分（含安全区偏好） */
  function positionValue(worldView, cueEnd, remaining, info, prof, cueId) {
    if (!cueEnd) return 0;
    var val = remaining && remaining.length ? bestNextPot(worldView, cueEnd, remaining, info, prof, cueId) : 1;
    var edge = Math.min(cueEnd.x - info.R, info.W - info.R - cueEnd.x,
      cueEnd.y - info.R, info.H - info.R - cueEnd.y);
    var cushionBonus = clamp(1 - edge / 0.22, 0, 1) * 0.06;
    return clamp(val + cushionBonus, 0, 1);
  }

  /* ============================ 试打模拟 ============================ */

  function firstHitFromEvents(events, cueId, fromIndex) {
    if (!events) return null;
    for (var i = fromIndex || 0; i < events.length; i++) {
      var ev = events[i];
      if (!ev || ev.type !== 'ball-hit') continue;
      var a = ev.a, b = ev.b;
      var aid = a && typeof a === 'object' ? a.id : a;
      var bid = b && typeof b === 'object' ? b.id : b;
      if (aid === cueId) return bid;
      if (bid === cueId) return aid;
    }
    return null;
  }

  function placeCue(clone, cueId, pos) {
    var cue = findBall(clone, cueId);
    if (!cue) return false;
    cue.x = pos.x;
    cue.y = pos.y;
    if (cue.vx != null) cue.vx = 0;
    if (cue.vy != null) cue.vy = 0;
    if (cue.spinX != null) cue.spinX = 0;
    if (cue.spinY != null) cue.spinY = 0;
    cue.active = true;
    cue.pocketed = false;
    cue.pocketIndex = null;
    return true;
  }

  /* AI 默认杆法：真实中杆是“先滑动”，球速衰减快、容易低估距离。
     模拟与实际出杆必须用同一个默认值，否则 AI 会误判自己打不进。 */
  var AI_DEFAULT_SPIN_Y = 0.10;
  function aiSpinY(v) {
    return (v === null || v === undefined || !isFinite(v)) ? AI_DEFAULT_SPIN_Y : v;
  }

  /* 用 clone 试打一杆；cuePos 用于自由球摆放。返回 null 表示物理不可用。 */
  function simulate(world, cueId, shot, info, cuePos, deadline) {
    var cw = null;
    try { cw = world.clone(); } catch (e) { cw = null; }
    if (!cw || typeof cw.strike !== 'function' || typeof cw.step !== 'function') return null;
    if (cuePos && !placeCue(cw, cueId, cuePos)) return null;

    var origEvents = world.events;
    var origLen = (origEvents && origEvents.length) || 0;
    var shared = (cw.events === origEvents);
    var seen = shared ? origLen : 0;

    try {
      cw.strike(cueId, {
        angle: shot.angle,
        power: shot.power,
        spinX: shot.spinX || 0,
        spinY: aiSpinY(shot.spinY)
      });
    } catch (e) {
      return null;
    }

    var cueBall = findBall(cw, cueId);
    var target = findBall(cw, shot.targetId);
    var eight = findNumber(cw, 8);
    var dt = 1 / 60;
    var t = 0;
    var maxT = 10;
    var simEvents = [];
    var stoppedFn = typeof cw.allStopped === 'function' ? cw.allStopped : null;
    var completed = true;
    var steps = 0;
    try {
      while (t < maxT) {
        cw.step(dt);
        t += dt;
        steps++;
        var evs = cw.events;
        if (evs) {
          for (var i = seen; i < evs.length; i++) simEvents.push(evs[i]);
          seen = evs.length;
        }
        if (stoppedFn && stoppedFn.call(cw)) break;
        if (steps % 20 === 0 && deadline && now() > deadline) { completed = false; break; }
      }
    } catch (e) {
      completed = false;
    }

    /* 防御：极个别实现 clone 共享事件数组，恢复原长度 */
    if (shared && origEvents && origEvents.length !== origLen) {
      try { origEvents.length = origLen; } catch (e2) { /* ignore */ }
    }

    var potted = false;
    var pottedPocket = null;
    if (target && !isActive(target)) {
      potted = true;
      pottedPocket = target.pocketIndex != null ? target.pocketIndex : null;
    }
    var cuePotted = !!(cueBall && !isActive(cueBall));
    var eightPotted = !!(eight && !isActive(eight));
    var cueEnd = cueBall ? { x: cueBall.x, y: cueBall.y } : null;
    var firstHit = firstHitFromEvents(simEvents, cueId, 0);

    return {
      verified: true,
      world: cw,
      potted: potted,
      pottedPocket: pottedPocket,
      cuePotted: cuePotted,
      eightPotted: eightPotted,
      cueEnd: cueEnd,
      firstHit: firstHit,
      completed: completed,
      simSeconds: t,
      eventCount: simEvents.length
    };
  }

  /* 轻量解析模拟（物理引擎不可用时的兜底，也用于粗略走位估计） */
  function analyticRollout(world, shot, info, cueId) {
    var R = info.R;
    var PR = info.PR;
    var pc = physCfg();
    var src = (world && world.balls) || [];
    var balls = [];
    var i, j;
    for (i = 0; i < src.length; i++) {
      var sb = src[i];
      if (!isActive(sb)) continue;
      balls.push({ id: sb.id, number: sb.number, x: sb.x, y: sb.y, vx: 0, vy: 0, active: true, pocketIndex: null });
    }
    var cue = null;
    for (i = 0; i < balls.length; i++) {
      if (balls[i].id === cueId) { cue = balls[i]; break; }
    }
    if (!cue) {
      for (i = 0; i < balls.length; i++) if (balls[i].number === 0) { cue = balls[i]; break; }
    }
    if (!cue) return null;

    var speed = shot.power * pc.maxShotSpeed;
    cue.vx = Math.cos(shot.angle) * speed;
    cue.vy = Math.sin(shot.angle) * speed;
    var decel = pc.rollingDecel * 1.7;
    var e = 0.94;
    var dt = 0.008;
    var t = 0;
    var firstHit = null;
    var cuePotted = false;
    var spinY = shot.spinY || 0;
    var lastT = 0;

    function moving() {
      for (var k = 0; k < balls.length; k++) {
        var b = balls[k];
        if (b.active && (b.vx * b.vx + b.vy * b.vy) > 4e-4) return true;
      }
      return false;
    }

    while (t < 6) {
      /* 移动 + 摩擦 */
      for (i = 0; i < balls.length; i++) {
        var b = balls[i];
        if (!b.active) continue;
        var sp = hypot(b.vx, b.vy);
        if (sp < 0.006) { b.vx = 0; b.vy = 0; continue; }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        var nsp = Math.max(0, sp - decel * dt);
        var kk = nsp / sp;
        b.vx *= kk; b.vy *= kk;
      }
      /* 球-球碰撞 */
      for (i = 0; i < balls.length; i++) {
        var a = balls[i];
        if (!a.active) continue;
        for (j = i + 1; j < balls.length; j++) {
          var c = balls[j];
          if (!c.active) continue;
          var dx = c.x - a.x, dy = c.y - a.y;
          var d2 = dx * dx + dy * dy;
          if (d2 >= 4 * R * R || d2 < 1e-12) continue;
          var d = Math.sqrt(d2);
          var nx = dx / d, ny = dy / d;
          var vn = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
          if (vn <= 0) {
            var push = (2 * R - d) * 0.5;
            a.x -= nx * push; a.y -= ny * push;
            c.x += nx * push; c.y += ny * push;
            continue;
          }
          var imp = (1 + e) * vn * 0.5;
          if (a === cue || c === cue) {
            var pre = hypot(cue.vx, cue.vy);
            if (!firstHit) firstHit = (a === cue ? c.id : a.id);
            if (pre > 0.01 && spinY !== 0) {
              var pdx = cue.vx / pre, pdy = cue.vy / pre;
              cue.vx += pdx * spinY * pre * 0.55;
              cue.vy += pdy * spinY * pre * 0.55;
            }
          }
          a.vx -= imp * nx; a.vy -= imp * ny;
          c.vx += imp * nx; c.vy += imp * ny;
        }
      }
      /* 库边 */
      for (i = 0; i < balls.length; i++) {
        var bb = balls[i];
        if (!bb.active) continue;
        if (bb.x < R) { bb.x = R; if (bb.vx < 0) bb.vx = -bb.vx * pc.cushionRestitution; }
        else if (bb.x > info.W - R) { bb.x = info.W - R; if (bb.vx > 0) bb.vx = -bb.vx * pc.cushionRestitution; }
        if (bb.y < R) { bb.y = R; if (bb.vy < 0) bb.vy = -bb.vy * pc.cushionRestitution; }
        else if (bb.y > info.H - R) { bb.y = info.H - R; if (bb.vy > 0) bb.vy = -bb.vy * pc.cushionRestitution; }
      }
      /* 落袋 */
      for (i = 0; i < balls.length; i++) {
        var pb = balls[i];
        if (!pb.active) continue;
        for (j = 0; j < info.pockets.length; j++) {
          var pk = info.pockets[j];
          if (dist(pb.x, pb.y, pk.x, pk.y) < PR * 0.92) {
            pb.active = false;
            pb.pocketIndex = pk.index;
            if (pb === cue) cuePotted = true;
            break;
          }
        }
      }
      t += dt;
      lastT = t;
      if (!moving()) break;
    }

    var target = null;
    for (i = 0; i < balls.length; i++) {
      if (balls[i].id === shot.targetId) { target = balls[i]; break; }
    }
    var eight = null;
    for (i = 0; i < balls.length; i++) if (balls[i].number === 8) { eight = balls[i]; break; }
    return {
      verified: false,
      potted: !!(target && !target.active),
      pottedPocket: target ? target.pocketIndex : null,
      cuePotted: cuePotted,
      eightPotted: !!(eight && !eight.active),
      cueEnd: cue.active ? { x: cue.x, y: cue.y } : null,
      firstHit: firstHit,
      completed: true,
      simSeconds: lastT,
      eventCount: 0
    };
  }

  /* ============================ 自由球摆放 ============================ */

  function validCueSpot(world, x, y, info, balls, extraClearance) {
    var clear = extraClearance != null ? extraClearance : 0.008;
    if (!insideTable(x, y, info, clear)) return false;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (!isActive(b)) continue;
      if (b.id === 'cue' || b.number === 0) continue;
      if (dist(x, y, b.x, b.y) < 2 * info.R + 0.006) return false;
    }
    for (var j = 0; j < info.pockets.length; j++) {
      var p = info.pockets[j];
      if (dist(x, y, p.x, p.y) < info.PR + info.R * 1.6) return false;
    }
    return true;
  }

  /* 寻找能形成简单直球的摆放点 */
  function findPlacements(world, opts, info, legal, prof, cueId) {
    var R = info.R;
    var balls = activeBalls(world);
    var tol = 2 * R * 0.98;
    var out = [];
    var offsets = [0.34, 0.48, 0.66, 0.88, 1.15];
    for (var ti = 0; ti < legal.length; ti++) {
      var t = legal[ti];
      if (!isActive(t)) continue;
      for (var pi = 0; pi < info.pockets.length; pi++) {
        var p = info.pockets[pi];
        var aim = aimPointOf(p, info);
        var dxp = aim.x - t.x, dyp = aim.y - t.y;
        var dtp = hypot(dxp, dyp);
        if (dtp < R * 2) continue;
        var ux = dxp / dtp, uy = dyp / dtp;
        var gx = t.x - ux * 2 * R, gy = t.y - uy * 2 * R;
        if (!insideTable(gx, gy, info, 0)) continue;
        if (pathBlocked(balls, t.x, t.y, aim.x, aim.y, tol, ignoreMap([t.id, cueId]))) continue;
        for (var oi = 0; oi < offsets.length; oi++) {
          var off = offsets[oi];
          var cx = gx - ux * off, cy = gy - uy * off;
          if (!validCueSpot(world, cx, cy, info, balls)) continue;
          if (!insideTable(gx, gy, info, 0)) continue;
          if (pathBlocked(balls, cx, cy, gx, gy, tol, ignoreMap([cueId, t.id]))) continue;
          var dcg = off;
          var q = potQuality(0, dcg, dtp, prof);
          var nextPos = positionValue(world, { x: gx, y: gy }, remainingAfter(legal, t.id), info, prof, cueId);
          var score = q * 100 + nextPos * 20 - off * 3;
          out.push({
            x: cx, y: cy,
            targetId: t.id,
            pocketIndex: p.index,
            angle: Math.atan2(gy - cy, gx - cx),
            power: estimatePower(dcg, dtp, 0, info),
            quality: q,
            score: score
          });
        }
      }
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }

  function remainingAfter(legal, pottedId) {
    var out = [];
    for (var i = 0; i < legal.length; i++) {
      if (legal[i].id !== pottedId) out.push(legal[i]);
    }
    return out;
  }

  /* 自由球兜底：网格扫描一个合法空位 */
  function fallbackSpot(world, info) {
    var balls = activeBalls(world);
    var best = null;
    var bestScore = -Infinity;
    var nx = 22, ny = 11;
    for (var ix = 1; ix < nx; ix++) {
      for (var iy = 1; iy < ny; iy++) {
        var x = info.W * ix / nx;
        var y = info.H * iy / ny;
        if (!validCueSpot(world, x, y, info, balls, 0.01)) continue;
        var dmin = Infinity;
        for (var i = 0; i < balls.length; i++) {
          if (!isActive(balls[i]) || balls[i].id === 'cue') continue;
          dmin = Math.min(dmin, dist(x, y, balls[i].x, balls[i].y));
        }
        var score = Math.min(dmin, 0.8) - 0.15 * (Math.abs(y - info.H / 2) + Math.abs(x - info.W * 0.28));
        if (score > bestScore) { bestScore = score; best = { x: x, y: y }; }
      }
    }
    return best;
  }

  /* ============================ 安全球 ============================ */

  function opponentTargets(world, opts, legal) {
    var legalIds = {};
    for (var i = 0; i < legal.length; i++) legalIds[legal[i].id] = 1;
    var out = [];
    var balls = activeBalls(world);
    for (var j = 0; j < balls.length; j++) {
      var b = balls[j];
      if (b.number === 0 || b.id === 'cue') continue;
      if (legalIds[b.id]) continue;
      out.push(b);
    }
    if (!out.length) {
      for (var k = 0; k < balls.length; k++) {
        var b2 = balls[k];
        if (b2.number === 0 || b2.id === 'cue') continue;
        if (b2.number === 8) continue;
        out.push(b2);
      }
    }
    return out;
  }

  function chooseSafety(world, opts, info, legal, cuePos, cueId, prof, deadline) {
    var R = info.R;
    var balls = activeBalls(world);
    var tol = 2 * R * 0.98;
    var opp = opponentTargets(world, opts, legal);
    var best = null;
    var pool = [];
    var i;
    for (i = 0; i < legal.length; i++) {
      var t = legal[i];
      if (!isActive(t)) continue;
      var dx = t.x - cuePos.x, dy = t.y - cuePos.y;
      var d = hypot(dx, dy);
      if (d < 2 * R * 1.05) continue;
      var u = unit(dx, dy);
      if (!u) continue;
      var gx = t.x - u.x * 2 * R, gy = t.y - u.y * 2 * R;
      if (!insideTable(gx, gy, info, 0)) continue;
      if (pathBlocked(balls, cuePos.x, cuePos.y, gx, gy, tol, ignoreMap([cueId, t.id]))) continue;
      var power = clamp(0.11 + 0.11 * d, 0.13, 0.46);
      var shot = { angle: Math.atan2(u.y, u.x), power: power, spinX: 0, spinY: 0, targetId: t.id };
      var res = analyticRollout(world, shot, info, cueId);
      if (res && res.cuePotted) continue;
      var cueEnd = res && res.cueEnd ? res.cueEnd : { x: gx, y: gy };
      var threat = bestNextPot(world, cueEnd, opp, info, prof, cueId);
      var edge = Math.min(cueEnd.x - R, info.W - R - cueEnd.x, cueEnd.y - R, info.H - R - cueEnd.y);
      var nearRail = clamp(1 - edge / 0.25, 0, 1);
      var score = -threat * 100 + nearRail * 16 + (1 / (1 + d)) * 12;
      pool.push({ score: score, shot: shot, cueEnd: cueEnd, targetId: t.id });
    }

    // 高手档：把几何评分最高的几个安全球用真实物理试打一遍，
    // 用“对手下一步真实位置”重新评分，避免几何估算偏差。
    if (prof.twoPly && pool.length > 1 && deadline && now() < deadline - 20) {
      pool.sort(function (a, b) { return b.score - a.score; });
      var topN = Math.min(pool.length, 4);
      for (i = 0; i < topN; i++) {
        if (now() > deadline - 12) break;
        var cand = pool[i];
        var sim = simulate(world, cueId, cand.shot, info, null, deadline);
        if (!sim || !sim.verified || sim.cuePotted) continue;
        var realEnd = sim.cueEnd || cand.cueEnd;
        var realThreat = bestNextPot(sim.world, realEnd, opp, info, prof, cueId);
        var edge2 = Math.min(realEnd.x - R, info.W - R - realEnd.x, realEnd.y - R, info.H - R - realEnd.y);
        var nearRail2 = clamp(1 - edge2 / 0.25, 0, 1);
        var sc2 = -realThreat * 100 + nearRail2 * 16;
        if (sc2 > cand.score) { cand.score = sc2; cand.cueEnd = realEnd; }
      }
      pool.sort(function (a, b) { return b.score - a.score; });
    }

    if (!pool.length) return null;
    var winner = pool[0];
    return {
      score: winner.score,
      angle: winner.shot.angle,
      power: winner.shot.power,
      spinX: 0,
      spinY: 0,
      ballId: winner.targetId,
      targetId: winner.targetId,
      pocketIndex: null,
      confidence: 0.18,
      plan: 'safety',
      placement: null
    };
  }

  /* ============================ 决策主流程 ============================ */

  function seedFromWorld(world, opts, prof) {
    var seed = 2166136261;
    function mix(n) {
      seed ^= Math.round((n * 100000) | 0);
      seed = Math.imul(seed, 16777619) >>> 0;
    }
    var balls = (world && world.balls) || [];
    for (var i = 0; i < balls.length; i++) mix(balls[i].number + 1), mix(balls[i].x), mix(balls[i].y);
    mix(opts && opts.ballInHand ? 7 : 3);
    mix(prof && prof.sims ? prof.sims : 3);
    return seed >>> 0;
  }

  function chooseShot(world, opts) {
    var t0 = now();
    opts = opts || {};

    var result = {
      angle: 0, power: 0.35, spinX: 0, spinY: 0,
      ballId: null, pocketIndex: null, confidence: 0,
      plan: 'safety', placement: null
    };

    if (!world || !world.balls) return result;

    var info = tableInfo();
    var difficulty = opts.difficulty || 'normal';
    var prof = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    var cueId = opts.cueBallId || 'cue';
    var cue = findBall(world, cueId);
    var legal = legalTargets(world, opts);

    if (!legal.length) return result;
    if (!cue && !opts.ballInHand) {
      result.ballId = legal[0].id;
      var fb = unit(legal[0].x - info.W * 0.5, legal[0].y - info.H * 0.5);
      result.angle = fb ? Math.atan2(fb.y, fb.x) : 0;
      return result;
    }

    var eightLegal = false;
    for (var ei = 0; ei < legal.length; ei++) if (legal[ei].number === 8) eightLegal = true;

    // 球杆系数：出杆时 power/spin 会被乘上球杆属性，模拟必须用同一套换算
    var cuePower = (opts && opts.cuePower) > 0 ? opts.cuePower : 1;
    var cueSpin = (opts && opts.cueSpin) > 0 ? opts.cueSpin : 1;
    var maxTime = opts.maxTimeMs || 300;
    var hardDeadline = t0 + clamp(maxTime, 60, 300);
    var softBudget = prof.budget || 85;
    var softDeadline = t0 + Math.min(hardDeadline - t0, softBudget);
    // 角度/力度微调单独设截止：否则低档位也会把整个 250ms 预算跑满，
    // 出现「陪练比高手还慢」的体感。
    var refineDeadline = Math.min(hardDeadline, t0 + Math.round(softBudget * 1.25));

    var rng = makeRng(seedFromWorld(world, opts, prof));
    var cuePosStart = cue ? { x: cue.x, y: cue.y } : { x: info.W * 0.25, y: info.H / 2 };
    var placementPos = null;

    /* ---------- 自由球：先找能简单进球的摆放点 ---------- */
    if (opts.ballInHand) {
      var places = findPlacements(world, opts, info, legal, prof, cueId);
      var tried = 0;
      var chosenPlace = null;
      for (var qi = 0; qi < places.length && tried < 2; qi++) {
        var pl = places[qi];
        var shotP = { angle: pl.angle, power: pl.power, spinX: 0, spinY: aiSpinY(null), targetId: pl.targetId };
        var simP = null;
        if (tried < 2 && now() < softDeadline) {
          simP = simulate(world, cueId, shotP, info, { x: pl.x, y: pl.y }, hardDeadline);
          tried++;
        }
        if (simP && simP.verified) {
          if (simP.potted && !simP.cuePotted && (!simP.firstHit || simP.firstHit === pl.targetId)) {
            chosenPlace = { place: pl, res: simP };
            break;
          }
        } else if (!chosenPlace) {
          chosenPlace = { place: pl, res: null };
          break;
        }
      }
      if (!chosenPlace && places.length) chosenPlace = { place: places[0], res: null };
      if (chosenPlace) {
        placementPos = { x: chosenPlace.place.x, y: chosenPlace.place.y };
        var placeRes = chosenPlace.res;
        var potted = placeRes ? placeRes.potted : true;
        result.angle = chosenPlace.place.angle;
        result.power = clamp(chosenPlace.place.power / cuePower, 0.03, 1);
        result.spinX = 0;
        result.spinY = clamp(aiSpinY(null) / cueSpin, -1, 1);
        result.ballId = chosenPlace.place.targetId;
        result.pocketIndex = chosenPlace.place.pocketIndex;
        result.placement = placementPos;
        result.plan = 'pot';
        result.confidence = clamp(
          (potted ? chosenPlace.place.quality : chosenPlace.place.quality * 0.6) * prof.conf, 0.05, 0.97
        );
        return finishShot(result, prof, rng);
      }
      /* 找不到进球点：用兜底空位 + 安全球 */
      placementPos = fallbackSpot(world, info) || cuePosStart;
      var safe = chooseSafety(world, opts, info, legal, placementPos, cueId, prof, hardDeadline);
      if (safe) {
        safe.placement = placementPos;
        return finishShot(safe, prof, rng);
      }
      result.placement = placementPos;
      return finishShot(result, prof, rng);
    }

    var cuePos = cuePosStart;

    /* ---------- 候选：每个合法目标球 × 6 袋 ---------- */
    var cands = buildCandidates(world, opts, info, legal, prof, cuePos, cueId, eightLegal);

    if (!cands.length) {
      var safety = chooseSafety(world, opts, info, legal, cuePos, cueId, prof, hardDeadline);
      if (safety) return finishShot(safety, prof, rng);
      /* 终极兜底：朝最近合法球方向轻推 */
      var near = null, nearD = Infinity;
      for (var ni = 0; ni < legal.length; ni++) {
        var dd = dist(cuePos.x, cuePos.y, legal[ni].x, legal[ni].y);
        if (dd < nearD) { nearD = dd; near = legal[ni]; }
      }
      if (near) {
        result.angle = Math.atan2(near.y - cuePos.y, near.x - cuePos.x);
        result.power = 0.3;
        result.ballId = near.id;
      }
      return finishShot(result, prof, rng);
    }

    var remaining = legal.slice();
    var options = [];
    var simBudget = prof.sims;
    var consider = Math.min(cands.length, prof.consider);

    for (var ci = 0; ci < consider; ci++) {
      var cand = cands[ci];
      var sim = null;
      if (simBudget > 0 && now() < softDeadline) {
        sim = simulate(world, cueId, cand, info, null, hardDeadline);
        if (sim && sim.verified) simBudget--;
      }
      /* 力度微调：模拟差一点到袋时补一档力度，避免目标球中途停住 */
      if (sim && sim.verified && !sim.potted && !sim.cuePotted && cand.quality >= 0.30 &&
        ci < 3 && simBudget > 0 && now() < softDeadline - 6) {
        var retry = {
          target: cand.target, targetId: cand.targetId, pocketIndex: cand.pocketIndex,
          pocket: cand.pocket, aimX: cand.aimX, aimY: cand.aimY,
          ghostX: cand.ghostX, ghostY: cand.ghostY,
          cut: cand.cut, dcg: cand.dcg, dtp: cand.dtp,
          angle: cand.angle, power: clamp(cand.power * 1.35, 0.08, 1),
          quality: cand.quality, eightLegal: cand.eightLegal, cuePos: cand.cuePos
        };
        var sim2 = simulate(world, cueId, retry, info, null, hardDeadline);
        if (sim2 && sim2.verified) {
          simBudget--;
          if (sim2.potted && !sim2.cuePotted) { sim = sim2; cand = retry; }
        }
      }
      var res = sim || analyticRollout(world, cand, info, cueId);
      if (!res) continue;
      var afterRemaining = remainingAfter(remaining, cand.targetId);
      var posVal = (res.cueEnd ? positionValue(res.world || world, res.cueEnd, afterRemaining, info, prof, cueId) : 0);
      var oppVal = 0;
      if (prof.twoPly && res && res.verified && res.cueEnd) {
        var oppT = opponentTargetIds(res.world || world, opts, cueId);
        if (oppT.length) oppVal = bestNextPot(res.world || world, res.cueEnd, oppT, info, prof, cueId);
      }
      var score = scoreCandidate(cand, res, posVal, prof, oppVal);
      options.push({ cand: cand, res: res, score: score, pos: posVal, opp: oppVal });
    }

    if (!options.length) {
      var s2 = chooseSafety(world, opts, info, legal, cuePos, cueId, prof, hardDeadline);
      if (s2) return finishShot(s2, prof, rng);
      return finishShot(result, prof, rng);
    }

    options.sort(function (a, b) { return b.score - a.score; });
    var best = options[0];

    /* 高手档：对最优候选做真实物理微调（角度 + 力度），把“差一点”变成“正好进”。
       几何瞄准存在 0.2~0.5° 系统偏差，这一步就是职业选手的练球修正。 */
    if (prof.refine && now() < hardDeadline - 40) {
      // 只对“几何上值得打”的前几个候选做微调，且优先救回那些模拟差一点没进的球
      // 顺序：① 已模拟进球的候选直接用；② 常规微调救回"差一点"的；
      // ③ 全部没进时用宽网格强制命中——高手不能放着能瞄的球改打安全球。
      var pool = options.slice(0, 4);
      var picked = null;
      for (var qi2 = 0; qi2 < pool.length; qi2++) {
        if (now() > hardDeadline - 25) break;
        var opt = pool[qi2];
        if (opt.res && opt.res.potted) { picked = opt; break; }
        if ((opt.cand.quality || 0) < 0.35) continue;
        var tuned2 = refineShot(world, cueId, opt.cand, info, prof, refineDeadline, remaining, false);
        if (tuned2) { picked = opt; picked.cand = Object.assign({}, opt.cand, { angle: tuned2.angle, power: tuned2.power }); picked.res = tuned2.res; picked.pos = tuned2.pos; picked.tuned = tuned2.hits; break; }
      }
      if (!picked && prof.aggressive) {
        for (var fi2 = 0; fi2 < Math.min(3, pool.length); fi2++) {
          if (now() > hardDeadline - 60) break;
          var fopt = pool[fi2];
          if ((fopt.cand.quality || 0) < 0.25) continue;
          var forced = refineShot(world, cueId, fopt.cand, info, prof, refineDeadline, remaining, true);
          if (forced) {
            picked = fopt;
            picked.cand = Object.assign({}, fopt.cand, { angle: forced.angle, power: forced.power });
            picked.res = forced.res; picked.pos = forced.pos; picked.tuned = forced.hits;
            break;
          }
        }
      }
      if (picked) best = picked;
    }

    /* ---------- 走位微调：normal / hard 尝试不同高低杆 ---------- */
    if (prof.spin && prof.spinTries > 0 && best.cand && best.res && best.res.verified &&
      best.res.potted && now() < t0 + 60) {
      var remaining2 = remainingAfter(remaining, best.cand.targetId);
      if (remaining2.length) {
        var bestPos = best.pos;
        var bestSpinY = 0;
        var spins = prof.spinTries >= 5 ? [0.45, -0.45, 0.75, -0.75, 0.95]
          : (prof.spinTries >= 3 ? [0.45, -0.45, 0.75] : [0.45, -0.45]);
        for (var si = 0; si < spins.length; si++) {
          if (now() > hardDeadline - 15) break;
          var spShot = {
            angle: best.cand.angle, power: best.cand.power,
            spinX: 0, spinY: spins[si], targetId: best.cand.targetId
          };
          var spRes = simulate(world, cueId, spShot, info, null, hardDeadline);
          if (!spRes || !spRes.verified || !spRes.potted || spRes.cuePotted) continue;
          if (spRes.firstHit && spRes.firstHit !== best.cand.targetId) continue;
          var spPos = positionValue(spRes.world, spRes.cueEnd, remaining2, info, prof, cueId);
          if (spPos > bestPos + (prof.spinGain || 0.06)) {
            bestPos = spPos;
            bestSpinY = spins[si];
            best.res = spRes;
            best.pos = spPos;
          }
        }
        if (bestSpinY !== 0) best.cand = best.cand;
        best.spinY = bestSpinY;
      }
    }

    // AI 默认用极轻中高杆，避免新的真实“中杆滑动”在短距离模拟中停在目标球前；
    // 人类玩家仍由真实击球点决定，中杆保持定杆。
    // 关键：试打与微调都用 AI_DEFAULT_SPIN_Y，实拍必须一致。
    // 之前 best.spinY 缺省是 0，会把“跟进”变成“中杆滑动”，球明显变短、停在袋口。
    var outSpinY = (best.spinY !== null && best.spinY !== undefined && Math.abs(best.spinY) > 1e-6)
      ? aiSpinY(best.spinY)
      : AI_DEFAULT_SPIN_Y;
    var plan = 'pot';
    if (!best.res || !best.res.verified) {
      // 没拿到可信的模拟结果时不能盲目进攻：几何上"看起来能进"不等于物理上能进
      // （路径擦库、目标球被挤偏等）。开着 refine 的档位再试一次，仍无解就打安全球。
      var retry = null;
      if (prof.refine && best.cand && (best.cand.quality || 0) >= 0.45 && now() < hardDeadline - 30) {
        retry = refineShot(world, cueId, best.cand, info, prof, refineDeadline, remaining, !!prof.aggressive);
      }
      if (retry) {
        best.cand = Object.assign({}, best.cand, { angle: retry.angle, power: retry.power });
        best.res = retry.res; best.pos = retry.pos;
        plan = 'pot';
      } else {
        plan = 'safety';
      }
    } else if (!best.res.potted) {
      plan = 'safety';
    }

    var c = best.cand;
    result.angle = c.angle;
    // 反算球杆系数：模拟里用原始功率，出杆时会被乘上 cuePower
    result.power = clamp(c.power / cuePower, 0.03, 1);
    result.spinX = 0;
    result.spinY = clamp(outSpinY / cueSpin, -1, 1);
    result.ballId = c.targetId;
    result.pocketIndex = c.pocketIndex;
    result.plan = plan;

    // 出口自检：用最终要出的参数（角度/力度/杆法）再模拟一次。
    // 关键：出杆前 finishShot 会叠加 ±powerErr 的力度噪声，
    // 所以自检必须按「最坏情况力度」验证，否则临界球会在噪声下翻转
    // （表现为「AI 觉得能进、实际停在袋口」）。
    if (plan === 'pot') {
      var worstPower = clamp(c.power * (1 - (prof.powerErr || 0)) , 0.03, 1);
      var finalRes = simulate(world, cueId, { angle: c.angle, power: worstPower, spinX: 0, spinY: outSpinY, targetId: c.targetId }, info, null, hardDeadline);
      var finalOk = !!(finalRes && finalRes.verified && finalRes.potted && !finalRes.cuePotted);
      if (!finalOk) {
        var fallbackRes = simulate(world, cueId, { angle: c.angle, power: c.power, spinX: 0, spinY: AI_DEFAULT_SPIN_Y, targetId: c.targetId }, info, null, hardDeadline);
        if (fallbackRes && fallbackRes.verified && fallbackRes.potted && !fallbackRes.cuePotted) {
          outSpinY = AI_DEFAULT_SPIN_Y;
          best.res = fallbackRes;
        } else if (prof.verify) {
          // 高手档：再做一次宽网格强制命中。绝不在"辅助线还指着这个球"的时候
          // 把 plan 改成 safety 却继续用进球角度出杆（这正是玩家看到的明显瞄偏）。
          var lastTry = refineShot(world, cueId, c, info, prof, refineDeadline, remaining, !!prof.aggressive);
          if (lastTry) {
            c = Object.assign({}, c, { angle: lastTry.angle, power: lastTry.power });
            result.angle = c.angle;
            result.power = clamp(c.power / cuePower, 0.03, 1);
            outSpinY = AI_DEFAULT_SPIN_Y;
            result.spinY = clamp(outSpinY / cueSpin, -1, 1);
            best.res = lastTry.res;
          } else {
            // 确实打不进：换成真正的安全球方案（用它自己的角度和力度），
            // 而不是沿用刚才那个进球候选的瞄准线。
            var safeShot = chooseSafety(world, opts, info, legal, cuePos, cueId, prof, hardDeadline);
            if (safeShot) {
              result.angle = safeShot.angle;
              result.power = clamp(safeShot.power / cuePower, 0.03, 1);
              result.spinY = clamp(AI_DEFAULT_SPIN_Y / cueSpin, -1, 1);
              result.ballId = safeShot.ballId || safeShot.targetId || c.targetId;
              result.pocketIndex = null;
            }
            plan = 'safety';
            outSpinY = AI_DEFAULT_SPIN_Y;
          }
        } else {
          plan = 'safety';
          outSpinY = AI_DEFAULT_SPIN_Y;
        }
      }
    }
    // plan 可能在自检里被改过，必须同步回 result（旧版漏了这一步）。
    result.plan = plan;
    result.spinY = clamp(outSpinY / cueSpin, -1, 1);

    var potP;
    if (best.res && best.res.verified) potP = best.res.potted ? 1 : c.quality * 0.45;
    else potP = c.quality * 0.85;
    result.confidence = clamp(potP * prof.conf * (1 - 0.25 * c.cut / Math.PI), 0.03, 0.98);

    return finishShot(result, prof, rng);
  }

  function scoreCandidate(cand, res, posVal, prof, oppVal) {
    var score = 0;
    var verified = !!res.verified;
    var potted = !!res.potted;
    if (verified) {
      score += potted ? 100 : -22;
      // 球好不好打必须主导：直线/近距离/低切角大幅加分
      score += cand.quality * 42;
      score -= cand.cut * 9;
    } else {
      score += cand.quality * 88;
    }
    if (potted) score += 18 * (1 - cand.cut / Math.max(0.2, prof.maxCut));
    if (res.cuePotted) score -= 165;
    if (res.eightPotted) score += cand.eightLegal ? 140 : -300;
    if (res.firstHit && res.firstHit !== cand.targetId) score -= 60;
    // 走位是次级收益：封顶后最多相当于 +26 分，无法压过“好打的球”
    score += Math.min(prof.position * 46, 34) * (potted ? posVal : 0.2 * posVal);
    // 两拍（仅高手档）：主要用来挑安全球——不进球的杆法尽量别把好打的位置留给对手。
    // 进球本身价值最高，所以对进球杆只做很轻的修正，避免“为了走位而不进球”。
    if (prof.twoPly && oppVal) score -= prof.twoPly * (potted ? 8 : 42) * oppVal;
    score -= cand.power * 2.5;
    return score;
  }

  /* 加入难度误差（easy 角度/力度误差更大），返回合法范围 */
  function finishShot(result, prof, rng) {
    var direct = result.plan === 'pot' && Math.abs(result.cut || 0) < 0.035;
    var angleErr = (direct && prof.aggressive) ? 0 : prof.angleErr * (1.2 - 0.4 * (result.confidence || 0));
    var angle = result.angle + (rng() * 2 - 1) * angleErr;
    var power = result.power * (1 + (rng() * 2 - 1) * prof.powerErr);
    result.angle = angle;
    result.power = clamp(power, 0.06, 1);
    result.spinX = clamp(result.spinX || 0, -1, 1);
    result.spinY = clamp(result.spinY || 0, -1, 1);
    if (result.plan !== 'pot') result.confidence = clamp(result.confidence, 0.02, 0.35);
    result.confidence = clamp(result.confidence, 0.02, 0.98);
    return result;
  }

  /* ============================ 调试 / 测试辅助 ============================ */

  /* 只做几何分析，不做试打；不修改 world */
  function analyze(world, opts) {
    opts = opts || {};
    var info = tableInfo();
    var prof = DIFFICULTY[opts.difficulty] || DIFFICULTY.normal;
    var cueId = opts.cueBallId || 'cue';
    var legal = legalTargets(world, opts);
    var eightLegal = false;
    for (var i = 0; i < legal.length; i++) if (legal[i].number === 8) eightLegal = true;
    var cue = findBall(world, cueId);
    var cuePos = cue ? { x: cue.x, y: cue.y } : { x: info.W * 0.25, y: info.H / 2 };
    var placements = [];
    if (opts.ballInHand) {
      placements = findPlacements(world, opts, info, legal, prof, cueId);
      if (placements.length) cuePos = { x: placements[0].x, y: placements[0].y };
    }
    var cands = buildCandidates(world, opts, info, legal, prof, cuePos, cueId, eightLegal);
    var summary = [];
    for (var c = 0; c < cands.length; c++) {
      var cd = cands[c];
      summary.push({
        targetId: cd.targetId,
        pocketIndex: cd.pocketIndex,
        cutDeg: Math.round(cd.cut * 180 / Math.PI),
        dcg: Math.round(cd.dcg * 1000) / 1000,
        dtp: Math.round(cd.dtp * 1000) / 1000,
        quality: Math.round(cd.quality * 1000) / 1000,
        power: Math.round(cd.power * 1000) / 1000,
        angle: Math.round(cd.angle * 1000000) / 1000000
      });
    }
    return {
      legal: legal.map(function (b) { return b.id; }),
      cuePos: cuePos,
      candidates: summary,
      placements: placements.slice(0, 3).map(function (p) {
        return { x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000, targetId: p.targetId, quality: Math.round(p.quality * 1000) / 1000 };
      }),
      table: { W: info.W, H: info.H, R: info.R, PR: info.PR }
    };
  }

  Pool.AI = {
    version: '1.1.0',
    chooseShot: chooseShot,
    analyze: analyze,
    difficulty: DIFFICULTY
  };
})();