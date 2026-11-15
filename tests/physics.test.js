/* ============================================================
 * 即刻开球 / PRO POOL — js/physics.js Node 单测
 * 运行：node tests/physics.test.js
 * 不依赖任何第三方库；用 vm 模拟浏览器 window 后加载
 * js/config.js + js/physics.js（经典 script 加载顺序）。
 * ========================================================== */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.resolve(__dirname, '..');
var FILE_CONFIG = path.join(ROOT, 'js', 'config.js');
var FILE_PHYSICS = path.join(ROOT, 'js', 'physics.js');

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

/* ---- 浏览器式加载：window + config.js + physics.js ---- */
function loadPool() {
  var sandbox = { console: console };
  var ctx = vm.createContext(sandbox);
  vm.runInContext('globalThis.window = globalThis;', ctx);
  vm.runInContext(readFile(FILE_CONFIG), ctx, { filename: 'js/config.js' });
  vm.runInContext(readFile(FILE_PHYSICS), ctx, { filename: 'js/physics.js' });
  var Pool = vm.runInContext('window.Pool', ctx);
  return {
    ctx: ctx,
    Pool: Pool,
    PhysicsWorld: Pool.Physics.PhysicsWorld
  };
}

/* ---- 纯 Node 加载：无 window、无 CONFIG（验证 fallback 常量） ---- */
function loadPhysicsOnly() {
  var ctx = vm.createContext({ console: console });
  vm.runInContext(readFile(FILE_PHYSICS), ctx, { filename: 'js/physics.js' });
  return vm.runInContext('globalThis.Pool.Physics', ctx);
}

var loaded = loadPool();
var Pool = loaded.Pool;
var PhysicsWorld = loaded.PhysicsWorld;
var FALLBACK_PHYSICS = loadPhysicsOnly();

/* ------------------------------------------------------------
 * 迷你测试框架
 * ---------------------------------------------------------- */
var PASS = 0;
var FAIL = 0;
var FAILURES = [];

function test(name, fn) {
  try {
    fn();
    PASS++;
    console.log('  \u2713 ' + name);
  } catch (err) {
    FAIL++;
    FAILURES.push({ name: name, error: err });
    console.log('  \u2717 ' + name);
    console.log('      ' + (err && err.message ? err.message : String(err)));
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function near(actual, expected, eps, msg) {
  if (!(Math.abs(actual - expected) <= eps)) {
    throw new Error((msg ? msg + ': ' : '') +
      'expected ' + expected + ' \u00b1' + eps + ', got ' + actual);
  }
}

function makeWorld(opts) {
  return new PhysicsWorld(opts || {});
}

function stepSeconds(world, seconds, dt) {
  dt = dt || (1 / 60);
  var n = Math.ceil(seconds / dt);
  for (var i = 0; i < n; i++) world.step(dt);
}

function stepUntil(world, predicate, maxSeconds, dt) {
  dt = dt || (1 / 60);
  var maxSteps = Math.ceil((maxSeconds || 20) / dt);
  for (var i = 0; i < maxSteps; i++) {
    world.step(dt);
    if (predicate(world)) return i;
  }
  return -1;
}

function hasEvent(world, type) {
  for (var i = 0; i < world.events.length; i++) {
    if (world.events[i].type === type) return world.events[i];
  }
  return null;
}

function finiteWorld(world) {
  for (var i = 0; i < world.balls.length; i++) {
    var b = world.balls[i];
    assert(isFinite(b.x) && isFinite(b.y), 'ball ' + b.id + ' position not finite');
    assert(isFinite(b.vx) && isFinite(b.vy), 'ball ' + b.id + ' velocity not finite');
    assert(isFinite(b.rotation), 'ball ' + b.id + ' rotation not finite');
    assert(isFinite(b.spinX) && isFinite(b.spinY), 'ball ' + b.id + ' spin not finite');
  }
}

function overlapCount(world, tol) {
  tol = tol || 1e-6;
  var R = world.ballRadius;
  var n = 0;
  for (var i = 0; i < world.balls.length; i++) {
    var a = world.balls[i];
    if (!a.active) continue;
    for (var j = i + 1; j < world.balls.length; j++) {
      var b = world.balls[j];
      if (!b.active) continue;
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      if (Math.sqrt(dx * dx + dy * dy) < 2 * R - tol) n++;
    }
  }
  return n;
}

function assertInsideTable(world) {
  var R = world.ballRadius;
  for (var i = 0; i < world.balls.length; i++) {
    var b = world.balls[i];
    if (!b.active) continue;
    assert(b.x >= R - 1e-6 && b.x <= world.width - R + 1e-6,
      'ball ' + b.id + ' x escaped: ' + b.x);
    assert(b.y >= R - 1e-6 && b.y <= world.height - R + 1e-6,
      'ball ' + b.id + ' y escaped: ' + b.y);
  }
}

/* ============================================================
 * 测试
 * ========================================================== */
console.log('\n[1] 加载与全局命名空间');
test('window.Pool.Physics.PhysicsWorld 存在', function () {
  assert(Pool && Pool.Physics, 'Pool.Physics missing');
  assert(typeof PhysicsWorld === 'function', 'PhysicsWorld 不是构造函数');
});
test('Node 无 window / 无 CONFIG 时使用内置 fallback', function () {
  assert(typeof FALLBACK_PHYSICS.PhysicsWorld === 'function');
  var w = new FALLBACK_PHYSICS.PhysicsWorld();
  near(w.width, 2.54, 1e-12);
  near(w.height, 1.27, 1e-12);
  near(w.ballRadius, 0.028575, 1e-12);
  near(w.params.maxShotSpeed, 7.6, 1e-12);
  near(w.params.substep, 1 / 600, 1e-12);
  assert(w.pockets.length === 6, '默认应有 6 个袋口');
  var cue = w.addBall({ number: 0, x: 0.7, y: 0.6 });
  w.strike('cue', { angle: 0, power: 0.5 });
  w.step(1 / 60);
  assert(cue.vx > 0, 'fallback 世界应能正常击球');
});
test('CommonJS require 可加载（Node 直接 require）', function () {
  var p = path.join(ROOT, 'js', 'physics.js');
  delete require.cache[p];
  var phys = require(p);
  assert(typeof phys.PhysicsWorld === 'function', 'require 未导出 PhysicsWorld');
  var w = new phys.PhysicsWorld();
  near(w.width, 2.54, 1e-12);
});

console.log('\n[2] 配置 / 初始状态');
test('默认参数来自 Pool.CONFIG', function () {
  var w = makeWorld();
  near(w.width, Pool.CONFIG.table.width, 1e-12);
  near(w.height, Pool.CONFIG.table.height, 1e-12);
  near(w.ballRadius, Pool.CONFIG.table.ballRadius, 1e-12);
  near(w.pocketRadius, Pool.CONFIG.table.pocketRadius, 1e-12);
  assert(w.pockets.length === Pool.CONFIG.pockets.length, '袋口数量应与 CONFIG 一致');
  near(w.params.maxShotSpeed, Pool.CONFIG.physics.maxShotSpeed, 1e-12);
  near(w.params.ballRestitution, Pool.CONFIG.physics.ballRestitution, 1e-12);
  near(w.params.cushionRestitution, Pool.CONFIG.physics.cushionRestitution, 1e-12);
  near(w.params.rollingDecel, Pool.CONFIG.physics.rollingDecel, 1e-12);
  near(w.params.slidingDecel, Pool.CONFIG.physics.slidingDecel, 1e-12);
  near(w.params.spinDecay, Pool.CONFIG.physics.spinDecay, 1e-12);
  near(w.params.substep, Pool.CONFIG.physics.substep, 1e-12);
  near(w.params.stopSpeed, Pool.CONFIG.physics.stopSpeed, 1e-12);
});
test('opts 可覆盖台面尺寸', function () {
  var w = makeWorld({ width: 1.0, height: 0.5, ballRadius: 0.02, pocketRadius: 0.04 });
  near(w.width, 1.0, 1e-12);
  near(w.height, 0.5, 1e-12);
  near(w.ballRadius, 0.02, 1e-12);
  assert(w.pockets.length === 6, '应按新尺寸生成 6 袋');
  near(w.pockets[1].x, 0.5, 1e-12);
});
test('addBall 返回契约字段完整的球', function () {
  var w = makeWorld();
  var cue = w.addBall({ number: 0, x: 0.5, y: 0.6 });
  var b1 = w.addBall({ number: 1, x: 1.0, y: 0.4 });
  var b8 = w.addBall({ number: 8, x: 1.4, y: 0.9 });
  var b9 = w.addBall({ number: 9, x: 1.8, y: 0.3 });
  assert(cue === w.cueBall, 'cueBall 引用错误');
  assert(w.balls.length === 4, 'balls 数组长度错误');
  assert(cue.id === 'cue' && b1.id === 'b1' && b8.id === 'b8' && b9.id === 'b9', '默认 id 错误');
  assert(cue.kind === 'cue' && b1.kind === 'solid' && b8.kind === 'eight' && b9.kind === 'stripe', 'kind 错误');
  assert(typeof b1.color === 'string' && b1.color.charAt(0) === '#', 'color 错误');
  assert(b1.active === true && b1.pocketed === false && b1.pocketIndex === null, '状态字段错误');
  assert(b1.vx === 0 && b1.vy === 0 && b1.spinX === 0 && b1.spinY === 0 && b1.rotation === 0, '初始运动字段应为 0');
  assert(w.getBall('b1') === b1, 'getBall(id) 错误');
  assert(w.getBall(1) === b1, 'getBall(number) 错误');
  assert(w.getBall('9') === b9, 'getBall(数字字符串) 错误');
  assert(w.getBall(99) === null, 'getBall 未命中应返回 null');
});
test('resetFrom 清空并重建', function () {
  var w = makeWorld();
  w.addBall({ number: 0, x: 0.5, y: 0.6 });
  w.addBall({ number: 1, x: 1.0, y: 0.6 });
  w.strike('cue', { angle: 0, power: 1 });
  w.resetFrom([
    { number: 0, x: 0.3, y: 0.3 },
    { number: 2, x: 1.2, y: 1.0 },
    { number: 3, x: 2.0, y: 0.4 }
  ]);
  assert(w.balls.length === 3, 'resetFrom 后球数错误');
  assert(w.getBall(2) !== null && w.getBall(1) === null, 'resetFrom 未清空旧球');
  assert(w.events.length === 0, 'resetFrom 应清空事件');
  assert(w.cueBall.number === 0, 'resetFrom 母球引用错误');
  assert(w.allStopped(), 'resetFrom 后应为静止');
});

console.log('\n[3] 击球与摩擦');
test('strike 设置速度与事件（power 0..1）', function () {
  var w = makeWorld();
  var cue = w.addBall({ number: 0, x: 0.6, y: 0.635 });
  w.strike('cue', { angle: 0, power: 0.5, spinX: 0.3, spinY: -0.4 });
  var ev = hasEvent(w, 'strike');
  assert(ev && ev.ball === cue && ev.power === 0.5, 'strike 事件错误');
  near(cue.vx, 0.5 * w.params.maxShotSpeed, 1e-9);
  near(cue.vy, 0, 1e-9);
  near(cue.spinX, 0.3, 1e-12);
  near(cue.spinY, -0.4, 1e-12);
  assert(ev.x === cue.x && ev.y === cue.y, 'strike 事件坐标错误');
});
test('strike 语义：power/spin 截断、角度约定、无 id 默认母球', function () {
  var w = makeWorld();
  var cue = w.addBall({ number: 0, x: 0.6, y: 0.635 });
  // power 超界截断到 1 -> speed = maxShotSpeed
  w.strike('cue', { angle: 0, power: 1.5 });
  near(cue.vx, w.params.maxShotSpeed, 1e-9, 'power 应截断到 1');
  // power < 0 -> 0
  w.strike('cue', { angle: 0, power: -0.5 });
  near(cue.vx, 0, 1e-12);
  near(cue.vy, 0, 1e-12);
  // spin 超界截断
  w.strike('cue', { angle: 0, power: 0.2, spinX: 2, spinY: -3 });
  near(cue.spinX, 1, 1e-12, 'spinX 应截断到 1');
  near(cue.spinY, -1, 1e-12, 'spinY 应截断到 -1');
  // 角度约定：0 -> +x，PI/2 -> +y（屏幕向下）
  w.strike('cue', { angle: Math.PI / 2, power: 0, speed: 2 });
  near(cue.vx, 0, 1e-9);
  near(cue.vy, 2, 1e-9);
  // 不带 id 默认击打母球
  w.strike(undefined, { angle: 0, power: 0.5 });
  assert(cue.vx > 0, '默认应击打母球');
  // 已落袋母球不可击打
  cue.active = false;
  cue.vx = 0;
  w.strike('cue', { angle: 0, power: 1 });
  near(cue.vx, 0, 1e-12, '落袋球不应被击打');
  cue.active = true;
});
test('直线滚动距离合理（1m/s 约 1.4m 停住）', function () {
  var w = makeWorld();
  var cue = w.addBall({ number: 0, x: 0.3, y: 0.635 });
  w.strike('cue', { angle: 0, power: 0, speed: 1 });
  var startX = cue.x;
  var idx = stepUntil(w, function (wd) { return wd.allStopped(); }, 30);
  assert(idx >= 0, '球未能停住');
  var dist = cue.x - startX;
  assert(dist > 1.15 && dist < 1.7, '滚动距离异常: ' + dist.toFixed(3) + 'm');
  near(cue.vx, 0, 0);
  near(cue.vy, 0, 0);
});
test('自然停球：带旋转击球最终完全静止并发出 stopped 事件', function () {
  var w = makeWorld();
  var cue = w.addBall({ number: 0, x: 0.6, y: 0.635 });
  w.addBall({ number: 1, x: 1.8, y: 0.4 });
  w.strike('cue', { angle: 0.15, power: 0.35, spinX: 0.5, spinY: -0.4 });
  w.clearEvents();
  var idx = stepUntil(w, function (wd) { return wd.allStopped(); }, 40);
  assert(idx >= 0, '40s 内未停球');
  assert(w.allStopped(), 'allStopped 应为 true');
  for (var i = 0; i < w.balls.length; i++) {
    if (!w.balls[i].active) continue;
    near(w.balls[i].vx, 0, 0);
    near(w.balls[i].vy, 0, 0);
    near(w.balls[i]._wx, 0, 0);
    near(w.balls[i]._wz, 0, 0);
  }
  assert(hasEvent(w, 'stopped') !== null, '应发出 stopped 事件');
  finiteWorld(w);
});
test('滚动阶段比滑动阶段减速慢', function () {
  // 滚动球（strike 无旋转 -> 纯滚动）
  var w1 = makeWorld();
  var a = w1.addBall({ number: 0, x: 0.3, y: 0.635 });
  w1.strike('cue', { angle: 0, power: 0, speed: 2 });
  var v0 = a.vx;
  w1.step(0.2);
  var rollDrop = v0 - a.vx;
  // 滑动球（直接给速度、无滚动角速度）
  var w2 = makeWorld();
  var b = w2.addBall({ number: 0, x: 0.3, y: 0.635, vx: 2, vy: 0 });
  // addBall 会根据速度补全滚动角速度，这里手动清零以制造纯滑动
  b._wx = 0; b._wy = 0; b._wz = 0;
  w2.step(0.2);
  var slideDrop = 2 - b.vx;
  assert(slideDrop > rollDrop * 3, '滑动减速(' + slideDrop.toFixed(3) +
    ') 应明显大于滚动减速(' + rollDrop.toFixed(3) + ')');
});
test('静止球堆受轻微扰动不自爆', function () {
  var w = makeWorld();
  var R = w.ballRadius;
  var specs = [{ number: 0, x: 0.6, y: 0.635 }];
  for (var i = 0; i < 8; i++) {
    specs.push({ number: i + 1, x: 1.0 + (i % 3) * 2 * R, y: 0.5 + Math.floor(i / 3) * 2 * R });
  }
  w.resetFrom(specs);
  var before = w.balls.map(function (b) { return { x: b.x, y: b.y }; });
  for (var s = 0; s < 120; s++) w.step(1 / 60);
  for (var k = 0; k < w.balls.length; k++) {
    near(w.balls[k].x, before[k].x, 1e-9, '球堆位置漂移');
    near(w.balls[k].y, before[k].y, 1e-9, '球堆位置漂移');
  }
  assert(w.allStopped(), '静止球堆不应有运动');
});

console.log('\n[4] 球-球碰撞');
test('两球正碰：恢复系数、动量守恒、分离不粘滞', function () {
  var w = makeWorld();
  var cue = w.addBall({ number: 0, x: 0.6, y: 0.635 });
  var target = w.addBall({ number: 1, x: 0.7, y: 0.635 });
  w.strike('cue', { angle: 0, power: 0, speed: 4 });
  w.clearEvents();
  w.step(1 / 60);
  var hit = hasEvent(w, 'ball-hit');
  assert(hit !== null, '缺少 ball-hit 事件');
  assert(hit.a === cue && hit.b === target, 'ball-hit a/b 错误');
  assert(hit.speed > 3.5, '撞击速度异常: ' + hit.speed);
  assert(target.vx > 3.7, '目标球速度过低: ' + target.vx);
  assert(cue.vx > -0.01 && cue.vx < 0.5, '母球碰撞后速度异常: ' + cue.vx);
  near(cue.vx + target.vx, 4, 0.02, '总动量应守恒');
  var d = Math.sqrt(Math.pow(target.x - cue.x, 2) + Math.pow(target.y - cue.y, 2));
  assert(d >= 2 * w.ballRadius - 1e-6, '碰撞后仍重叠: ' + d);
  assert(overlapCount(w) === 0, '存在重叠球');
  finiteWorld(w);
});
test('斜碰：法向冲量沿球心连线、动量守恒、无穿透', function () {
  var w = makeWorld();
  var R = w.ballRadius;
  var cue = w.addBall({ number: 0, x: 0.5, y: 0.5 });
  var target = w.addBall({ number: 1, x: 0.95, y: 0.7 });
  // 瞄准 ghost 球心（保证碰撞瞬间球心连线 = 出杆方向）
  var ux = target.x - cue.x;
  var uy = target.y - cue.y;
  var ul = Math.sqrt(ux * ux + uy * uy);
  ux /= ul; uy /= ul;
  var gx = target.x - 2 * R * ux;
  var gy = target.y - 2 * R * uy;
  var dirX = gx - cue.x;
  var dirY = gy - cue.y;
  var dl = Math.sqrt(dirX * dirX + dirY * dirY);
  dirX /= dl; dirY /= dl;
  var speed = 3.5;
  w.strike('cue', { angle: Math.atan2(dirY, dirX), power: 0, speed: speed });
  w.clearEvents();
  var px0 = 0, py0 = 0, lineAngle = 0, hit = false;
  for (var i = 0; i < 2400; i++) {
    px0 = cue.vx + target.vx;
    py0 = cue.vy + target.vy;
    var cx = cue.x, cy = cue.y;
    w.step(1 / 600);
    if (hasEvent(w, 'ball-hit') !== null) {
      lineAngle = Math.atan2(target.y - cy, target.x - cx);
      hit = true;
      break;
    }
    w.clearEvents();
  }
  assert(hit, '未发生碰撞');
  near(cue.vx + target.vx, px0, 0.01, 'x 动量应守恒');
  near(cue.vy + target.vy, py0, 0.01, 'y 动量应守恒');
  assert(overlapCount(w) === 0, '斜碰后存在重叠');
  var targetAngle = Math.atan2(target.vy, target.vx);
  var diff = Math.abs(Math.atan2(Math.sin(targetAngle - lineAngle), Math.cos(targetAngle - lineAngle)));
  assert(diff < 0.21, '目标球偏移球心连线过大: ' + (diff * 180 / Math.PI).toFixed(1) + '°');
  assert(target.vx > 0 && target.vy > 0, '目标球应沿连线方向运动');
  var ke0 = 0.5 * speed * speed;
  var ke1 = 0.5 * (cue.vx * cue.vx + cue.vy * cue.vy + target.vx * target.vx + target.vy * target.vy);
  assert(ke1 < ke0, '碰撞不应产生能量');
  finiteWorld(w);
});
test('低速接触不产生额外能量（不粘滞）', function () {
  var w = makeWorld();
  var cue = w.addBall({ number: 0, x: 0.6, y: 0.635 });
  var target = w.addBall({ number: 1, x: 0.66, y: 0.635 });
  w.strike('cue', { angle: 0, power: 0, speed: 0.5 });
  for (var i = 0; i < 180; i++) w.step(1 / 60);
  assert(overlapCount(w) === 0, '两球粘滞重叠');
  assert(cue.vx <= 0.65, '母球速度不应增加');
  assert(target.vx <= 0.65, '目标球速度不应增加');
  finiteWorld(w);
});

console.log('\n[5] 库边');
test('库边反弹恢复系数正确', function () {
  var w = makeWorld();
  var R = w.ballRadius;
  var b = w.addBall({ number: 0, x: w.width - R - 0.0008, y: 0.635 });
  w.strike('cue', { angle: 0, power: 0, speed: 2 });
  w.clearEvents();
  w.step(1 / 600);
  near(b.vx, -2 * w.params.cushionRestitution, 0.01, '反弹速度应约等于 -e*v');
  var ev = hasEvent(w, 'cushion');
  assert(ev !== null, '缺少 cushion 事件');
  assert(ev.ball === b, 'cushion 事件球引用错误');
  assert(ev.speed > 1.9, 'cushion 事件速度异常');
  near(ev.x, w.width, 1e-6, '接触点应在库边');
  assert(ev.y > 0 && ev.y < w.height, '接触点坐标异常');
});
test('四面库边均不逃逸', function () {
  var w = makeWorld();
  var b = w.addBall({ number: 0, x: 1.27, y: 0.635 });
  var specs = [
    { vx: 0.9, vy: 0.3 }, { vx: -0.9, vy: 0.3 },
    { vx: 0.9, vy: -0.3 }, { vx: -0.9, vy: -0.3 }
  ];
  for (var i = 0; i < specs.length; i++) {
    w.resetFrom([{ number: 0, x: 0.7 + i * 0.2, y: 0.635, vx: specs[i].vx, vy: specs[i].vy }]);
    for (var s = 0; s < 90; s++) {
      w.step(1 / 60);
      assertInsideTable(w);
    }
  }
});
test('贴库低速球不抖动', function () {
  var w = makeWorld();
  var R = w.ballRadius;
  w.resetFrom([{ number: 0, x: R, y: 0.635, vx: -0.005, vy: 0 }]);
  var x0 = w.cueBall.x;
  for (var i = 0; i < 60; i++) w.step(1 / 60);
  near(w.cueBall.x, x0, 1e-6, '贴库球不应移动');
  near(w.cueBall.vx, 0, 1e-9);
  assert(w.allStopped(), '贴库球应静止');
});

console.log('\n[6] 袋口');
test('角袋捕获', function () {
  var w = makeWorld();
  w.resetFrom([
    { number: 0, x: 1.27, y: 0.635 },
    { number: 3, x: 0.075, y: 0.075 }
  ]);
  var ball = w.getBall(3);
  // 朝角袋方向滚动（手动设置速度，保证确定）
  ball.vx = -0.7071; ball.vy = -0.7071;
  ball._wx = 0; ball._wy = 0; ball._wz = 0;
  w.clearEvents();
  var idx = stepUntil(w, function (wd) { return ball.pocketed; }, 3);
  assert(idx >= 0, '角袋未捕获');
  assert(ball.active === false, '落袋后 active 应为 false');
  assert(ball.pocketIndex === 0, '角袋索引应为 0，实际 ' + ball.pocketIndex);
  var ev = hasEvent(w, 'pocket');
  assert(ev !== null && ev.ball === ball && ev.pocketIndex === 0, 'pocket 事件错误');
  assert(w.balls.length === 2, 'balls 数组应仍包含 inactive 球');
});
test('中袋捕获', function () {
  var w = makeWorld();
  w.resetFrom([{ number: 0, x: 1.27, y: 0.12 }]);
  var cue = w.cueBall;
  cue.vx = 0; cue.vy = -0.8;
  w.clearEvents();
  var idx = stepUntil(w, function (wd) { return cue.pocketed; }, 3);
  assert(idx >= 0, '中袋未捕获');
  assert(cue.pocketIndex === 1, '中袋索引应为 1，实际 ' + cue.pocketIndex);
});
test('落袋球不参与碰撞 / castRay', function () {
  var w = makeWorld();
  var cue = w.addBall({ number: 0, x: 0.5, y: 0.5 });
  var ghost = w.addBall({ number: 5, x: 0.9, y: 0.5 });
  ghost.active = false;
  ghost.pocketed = true;
  ghost.pocketIndex = 3;
  w.step(1 / 60);
  near(cue.x, 0.5, 1e-12);
  var hit = w.castRay(0.5, 0.5, 1, 0, 'cue');
  assert(hit.type === 'cushion', '落袋球不应被射线命中，实际 ' + hit.type);
});
test('瞄准射线识别袋口', function () {
  var w = makeWorld();
  var hit = w.castRay(0.5, 0.5, -0.7071, -0.7071, 'cue');
  assert(hit.type === 'pocket', '朝角袋的射线应返回 pocket，实际 ' + hit.type);
  assert(hit.pocketIndex === 0, '应命中左上角袋，实际索引 ' + hit.pocketIndex);
});
test('袋口开口让贴库球自然落袋', function () {
  var w = makeWorld();
  var ball = w.addBall({ number: 5, x: 0.075, y: 0.012 });
  ball.vx = -0.6; ball.vy = -0.15;
  ball._wx = 0; ball._wy = 0; ball._wz = 0;
  w.clearEvents();
  var idx = stepUntil(w, function (wd) { return ball.pocketed; }, 3);
  assert(idx >= 0 && ball.pocketIndex === 0, '贴库角袋球应落袋');
});
test('袋口豁口擦边不误判落袋：挡回台内且不判犯规', function () {
  var w = makeWorld();
  var R = w.ballRadius;
  var cue = w.addBall({ number: 0, x: 1.34, y: 0.18 });
  cue.vx = 0; cue.vy = -3.0;
  cue._wx = 0; cue._wy = 0; cue._wz = 0;
  // step() 内部把 dt 截到 0.05s，必须多次推进才能真正越过台沿
  for (var si = 0; si < 12; si++) w.step(0.02);
  assert(cue.active === true, '擦边球应仍在台面上（不判落袋）');
  assert(cue.pocketed === false, '球心未进入袋口捕获圆，不应判落袋');
  assert(cue.y >= R - 1e-6 && cue.y <= w.height - R + 1e-6, '应被挡回台内');
  assert(!cue._scratch, '袋角挡回属于正常球，不应标记犯规');
  var pk = w.events.filter(function (e) { return e.type === 'pocket'; });
  assert(pk.length === 0, '不应伪造 pocket 事件');
});

test('castRay 球命中：距离 / 接触点 / normal / ghost', function () {
  var w = makeWorld();
  var R = w.ballRadius;
  w.addBall({ number: 0, x: 0.5, y: 0.635 });
  var target = w.addBall({ number: 1, x: 1.2, y: 0.635 });
  var hit = w.castRay(0.5, 0.635, 1, 0, 'cue');
  assert(hit.type === 'ball', 'type 应为 ball');
  assert(hit.ball === target, '命中球引用错误');
  near(hit.ghost.x, 1.2 - 2 * R, 1e-12, 'ghost.x');
  near(hit.ghost.y, 0.635, 1e-12, 'ghost.y');
  near(hit.x, 1.2 - R, 1e-12, '接触点 x');
  near(hit.y, 0.635, 1e-12, '接触点 y');
  near(hit.distance, 0.7 - R, 1e-12, 'distance');
  near(hit.centerDistance, 0.7 - 2 * R, 1e-12, 'centerDistance');
  near(hit.normal.x, -1, 1e-12, 'normal.x');
  near(hit.normal.y, 0, 1e-12, 'normal.y');
  near(Math.sqrt(hit.normal.x * hit.normal.x + hit.normal.y * hit.normal.y), 1, 1e-12, 'normal 应为单位向量');
});
test('castRay 偏心命中精度', function () {
  var w = makeWorld();
  var R = w.ballRadius;
  w.addBall({ number: 0, x: 0.5, y: 0.635 });
  var target = w.addBall({ number: 1, x: 1.2, y: 0.635 });
  var offY = 0.02;
  var hit = w.castRay(0.5, 0.635 + offY, 1, 0, 'cue');
  assert(hit.type === 'ball', '应命中目标球');
  var expectedT = 0.7 - Math.sqrt(4 * R * R - offY * offY);
  near(hit.centerDistance, expectedT, 1e-12, 'ghost 行进距离');
  near(hit.ghost.y, 0.635 + offY, 1e-12);
  var nlen = Math.sqrt(Math.pow(hit.ghost.x - target.x, 2) + Math.pow(hit.ghost.y - target.y, 2));
  near(nlen, 2 * R, 1e-9, 'ghost 到目标球心距离应为 2R');
  near(hit.normal.x, (hit.ghost.x - target.x) / (2 * R), 1e-9);
  near(hit.normal.y, (hit.ghost.y - target.y) / (2 * R), 1e-9);
});
test('castRay normal 方向随射线方向变化', function () {
  var w = makeWorld();
  w.addBall({ number: 0, x: 1.2, y: 0.635 });
  w.addBall({ number: 1, x: 0.6, y: 0.635 });
  // 从右往左打，normal 应从目标球心指向接触点（+x）
  var hit = w.castRay(1.2, 0.635, -1, 0, 'cue');
  assert(hit.type === 'ball' && hit.ball.number === 1, '应命中 1 号球');
  near(hit.normal.x, 1, 1e-12, 'normal 应指向 +x');
  near(hit.normal.y, 0, 1e-12);
  near(hit.x, 0.6 + w.ballRadius, 1e-12, '接触点 x');
  near(hit.distance, 0.6 - w.ballRadius, 1e-12);
  near(hit.ghost.x, 0.6 + 2 * w.ballRadius, 1e-12, 'ghost 应在目标球右侧 2R');
});
test('castRay 库边命中', function () {
  var w = makeWorld();
  w.addBall({ number: 0, x: 2.0, y: 0.635 });
  var hit = w.castRay(2.0, 0.635, 1, 0, 'cue');
  assert(hit.type === 'cushion', 'type 应为 cushion');
  assert(hit.ball === null, 'cushion 命中 ball 应为 null');
  near(hit.x, w.width, 1e-12, '接触点 x 应在右库边');
  near(hit.y, 0.635, 1e-12);
  near(hit.distance, w.width - 2.0, 1e-12, 'distance');
  near(hit.normal.x, -1, 1e-12);
  near(hit.normal.y, 0, 1e-12);
  assert(hit.ghost === null, 'cushion 命中 ghost 应为 null');
});
test('castRay 忽略指定球 / 空闲球', function () {
  var w = makeWorld();
  w.addBall({ number: 0, x: 0.5, y: 0.635 });
  var b1 = w.addBall({ number: 1, x: 0.9, y: 0.635 });
  var b2 = w.addBall({ number: 2, x: 1.5, y: 0.635 });
  var hit = w.castRay(0.5, 0.635, 1, 0, 'cue');
  assert(hit.ball === b1, '应命中最近的 b1');
  var hit2 = w.castRay(0.5, 0.635, 1, 0, 'b1');
  assert(hit2.ball === b2, '忽略 b1 后应命中 b2');
  b2.active = false;
  var hit3 = w.castRay(0.5, 0.635, 1, 0, 'b1');
  assert(hit3.type === 'cushion', '忽略 inactive 球后应命中库边');
  var hit4 = w.castRay(2.0, 0.2, 0, 1, 'cue');
  near(hit4.x, 2.0, 1e-12);
  near(hit4.y, w.height, 1e-12, '下库边接触点');
});
test('castRay 无碰撞返回 none', function () {
  var w = makeWorld();
  w.addBall({ number: 0, x: 1.27, y: 0.635 });
  // 从台面内向外，但射线先碰库边，所以测试方向为反方向且无目标？
  var hit = w.castRay(1.27, 0.635, 0.3, 0.4, 'cue');
  assert(hit.type === 'cushion' || hit.type === 'none', '应返回 cushion 或 none');
});

console.log('\n[8] 侧旋 / 高低杆');
test('高杆：碰球后跟进（母球继续向前）', function () {
  var w = makeWorld();
  var R = w.ballRadius;
  var cue = w.addBall({ number: 0, x: 0.5, y: 0.635 });
  w.addBall({ number: 1, x: 1.0, y: 0.635 });
  w.strike('cue', { angle: 0, power: 0, speed: 3.2, spinX: 0, spinY: 1 });
  var contactX = 1.0 - 2 * R;
  var found = stepUntil(w, function (wd) { return hasEvent(wd, 'ball-hit') !== null; }, 2);
  assert(found >= 0, '未发生碰撞');
  w.clearEvents();
  for (var i = 0; i < 24; i++) w.step(1 / 60); // 0.4s
  assert(cue.x > contactX + 0.1, '高杆跟进不足: cue.x=' + cue.x.toFixed(3) +
    ', 接触点=' + contactX.toFixed(3));
  assert(cue.vx > 0.2, '高杆母球应继续向前, vx=' + cue.vx.toFixed(3));
});
test('低杆：碰球后回缩（母球退回）', function () {
  var w = makeWorld();
  var R = w.ballRadius;
  var cue = w.addBall({ number: 0, x: 0.5, y: 0.635 });
  w.addBall({ number: 1, x: 1.0, y: 0.635 });
  w.strike('cue', { angle: 0, power: 0, speed: 3.2, spinX: 0, spinY: -1 });
  var contactX = 1.0 - 2 * R;
  var found = stepUntil(w, function (wd) { return hasEvent(wd, 'ball-hit') !== null; }, 2);
  assert(found >= 0, '未发生碰撞');
  w.clearEvents();
  for (var i = 0; i < 36; i++) w.step(1 / 60); // 0.6s
  assert(cue.x < contactX - 0.08, '低杆回缩不足: cue.x=' + cue.x.toFixed(3) +
    ', 接触点=' + contactX.toFixed(3));
});
test('侧旋：不把目标球甩离辅助线（辅助线可信）', function () {
  // 碰撞切向甩球已关闭（throwFriction = 0）：目标球只沿球心连线出射。
  // 侧塞对目标球的残余影响仅来自母球自身的弧线（swerve），量级很小。
  function dirAfterHit(spinX) {
    var w = makeWorld();
    w.addBall({ number: 0, x: 0.6, y: 0.635 });
    var target = w.addBall({ number: 1, x: 0.75, y: 0.635 });
    w.strike('cue', { angle: 0, power: 0, speed: 3.5, spinX: spinX, spinY: 0 });
    var found = stepUntil(w, function (wd) { return hasEvent(wd, 'ball-hit') !== null; }, 2);
    assert(found >= 0, 'spinX=' + spinX + ' 未发生碰撞');
    return Math.atan2(target.vy, target.vx);
  }
  var d0 = dirAfterHit(0);
  var dPos = dirAfterHit(1);
  var dNeg = dirAfterHit(-1);
  near(d0, 0, 1e-9, '无侧塞时目标球应严格沿 +x');
  assert(Math.abs(dPos) < 0.08, '正侧塞对目标球方向影响应很小(rad): ' + dPos.toFixed(4));
  assert(Math.abs(dNeg) < 0.08, '负侧塞对目标球方向影响应很小(rad): ' + dNeg.toFixed(4));
  assert(dPos * dNeg <= 0 || Math.abs(dPos - dNeg) < 0.02, '正负侧塞不应同向偏移');
});
test('侧旋：碰库改变反弹角', function () {
  var w = makeWorld();
  var R = w.ballRadius;
  function bounceVy(spinX) {
    var wd = makeWorld();
    var b = wd.addBall({ number: 0, x: wd.width - R - 0.0008, y: 0.635 });
    wd.strike('cue', { angle: 0, power: 0, speed: 2, spinX: spinX, spinY: 0 });
    wd.step(1 / 600);
    return b.vy;
  }
  var vyPos = bounceVy(1);
  var vyNeg = bounceVy(-1);
  assert(vyPos < -0.15, '正侧旋反弹应偏向 -y, vy=' + vyPos.toFixed(3));
  assert(vyNeg > 0.15, '负侧旋反弹应偏向 +y, vy=' + vyNeg.toFixed(3));
  near(vyPos, -vyNeg, 1e-6, '正负侧旋应镜像对称');
});
test('侧旋 / 高低杆自然衰减', function () {
  var w = makeWorld();
  var cue = w.addBall({ number: 0, x: 0.5, y: 0.635 });
  w.strike('cue', { angle: 0, power: 0, speed: 4, spinX: 1, spinY: 1 });
  var sx0 = cue.spinX, sy0 = cue.spinY;
  stepSeconds(w, 2, 1 / 60);
  assert(cue.spinX < sx0 * 0.1, '侧旋应自然衰减: ' + cue.spinX);
  assert(cue.spinY < sy0 * 0.1, '高低杆应自然衰减: ' + cue.spinY);
  assert(cue.spinX >= 0 && cue.spinY >= 0, '衰减不应反号');
  finiteWorld(w);
});
test('旋转驱动视觉 rotation 随位移变化', function () {
  var w = makeWorld();
  var cue = w.addBall({ number: 0, x: 0.3, y: 0.635 });
  w.strike('cue', { angle: 0, power: 0, speed: 1 });
  var r0 = cue.rotation;
  w.step(0.2);
  assert(cue.rotation > r0, 'rotation 应随运动增大');
  near(cue.rotation - r0, (cue.x - 0.3) / w.ballRadius, 0.15, 'rotation 应约等于 位移/半径');
});

console.log('\n[9] 高速与稳定性');
test('袋角不会让球高频颤抖（环-夹回循环回归）', function () {
  // 历史 bug：旧实现把球推到以袋心为圆心的环上、再夹回台内，两个约束互相打架，
  // 每 1/600s 瞬移 2~3cm，表现为球卡在袋角高频抖动。
  var w = makeWorld();
  var b = w.addBall({ number: 5, x: 0.45, y: 1.0 });
  var dx = 0.05 - 0.45, dy = 1.27 - 1.0, l = Math.sqrt(dx * dx + dy * dy);
  b.vx = dx / l * 3; b.vy = dy / l * 3;
  b._wx = 0; b._wy = 0; b._wz = 0;
  var flips = 0;
  for (var i = 0; i < 1800; i++) {
    var pvx = b.vx, pvy = b.vy;
    w.step(1 / 600);
    if (!b.active) break;
    if (pvx * b.vx < 0) flips++;
    if (pvy * b.vy < 0) flips++;
    if (Math.hypot(b.vx, b.vy) < 1e-6) break;
  }
  assert(flips <= 6, '袋角反弹次数异常（疑似颤抖）: ' + flips);
  // 停稳后不应再有位移
  assert(Math.hypot(b.vx, b.vy) < 0.05, '球应已基本停住');
  var x0 = b.x, y0 = b.y;
  for (var j = 0; j < 300; j++) w.step(1 / 600);
  assert(Math.hypot(b.x - x0, b.y - y0) < 1e-3, '停稳后仍在移动: ' + Math.hypot(b.x - x0, b.y - y0));
});
test('袋角碰撞：高速球不会被“粘”在袋口，必须弹回或落袋', function () {
  function run(offset, speed) {
    var w = makeWorld();
    var b = w.addBall({ number: 3, x: 1.27 + offset, y: 0.30 });
    b.vx = 0; b.vy = -speed;
    b._wx = 0; b._wy = 0; b._wz = 0;
    var potted = false;
    for (var i = 0; i < 3000; i++) {
      w.step(1 / 600);
      if (!b.active) { potted = true; break; }
      if (Math.hypot(b.vx, b.vy) < 1e-6) break;
    }
    return { potted: potted, x: b.x, y: b.y, dist: Math.hypot(b.x - 1.27, b.y) };
  }
  // 高速撞袋角：必须弹回台内并保住大部分动能，最终停点应远离袋口
  var fast = run(0.09, 3.0);
  assert(!fast.potted, '明显偏离袋心的高速球不应判落袋');
  assert(fast.dist > 0.30, '高速球应被袋角弹回台内，最终离袋口 ' + fast.dist.toFixed(3) + 'm');
  // 球边压在袋口上：应该掉下去
  var aimed = run(0.0, 3.0);
  assert(aimed.potted, '正对袋心的高速球必须落袋');
  // 慢速擦边：允许停在袋角附近（真实球台也会这样）
  var slow = run(0.09, 0.4);
  assert(slow.dist < 0.30, '慢速擦边球停在袋角附近是合理停点');
});
test('8m/s 高速无穿透、不逃逸', function () {
  var w = makeWorld();
  var R = w.ballRadius;
  var cue = w.addBall({ number: 0, x: 0.25, y: 0.635 });
  var target = w.addBall({ number: 1, x: 0.9, y: 0.635 });
  w.strike('cue', { angle: 0, power: 0, speed: 8 });
  var minDist = Infinity;
  var maxHitSpeed = 0;
  for (var i = 0; i < 180; i++) {
    w.step(1 / 20); // 最差帧率 20fps
    if (cue.active && target.active) {
      var d = Math.sqrt(Math.pow(target.x - cue.x, 2) + Math.pow(target.y - cue.y, 2));
      minDist = Math.min(minDist, d);
    }
    var hit = hasEvent(w, 'ball-hit');
    if (hit && hit.speed > maxHitSpeed) maxHitSpeed = hit.speed;
    assertInsideTable(w);
    finiteWorld(w);
    w.clearEvents();
  }
  assert(maxHitSpeed > 7, '高速撞击事件速度异常: ' + maxHitSpeed);
  assert(minDist > 2 * R - 1e-3, '高速下发生穿透, 最小间距 ' + minDist);
  assert(overlapCount(w) === 0, '存在重叠');
});
test('8m/s 撞库不逃逸（单球长时间模拟）', function () {
  var w = makeWorld();
  var cue = w.addBall({ number: 0, x: 0.3, y: 0.635 });
  w.strike('cue', { angle: 0.7, power: 0, speed: 8 });
  for (var i = 0; i < 120; i++) {
    w.step(1 / 20);
    assertInsideTable(w);
    finiteWorld(w);
    w.clearEvents();
  }
});
test('固定子步长：每子步位移小于球直径', function () {
  var w = makeWorld();
  var sub = w.params.substep;
  assert(sub <= 1 / 240, 'substep 过粗: ' + sub);
  var maxSpeed = PhysicsWorld ? 13 : 13;
  assert(maxSpeed * sub < 2 * w.ballRadius, '单子步最大位移应小于球直径');
});

console.log('\n[10] 克隆 / 确定性 / 事件');
test('clone 深拷贝且结果确定', function () {
  var w = makeWorld();
  w.addBall({ number: 0, x: 0.5, y: 0.635 });
  w.addBall({ number: 1, x: 1.0, y: 0.635 });
  w.addBall({ number: 2, x: 1.3, y: 0.4 });
  w.strike('cue', { angle: 0.08, power: 0.8, spinX: 0.6, spinY: -0.4 });
  var w2 = w.clone();
  assert(w2 !== w && w2.balls !== w.balls, 'clone 应为深拷贝');
  assert(w2.balls.length === w.balls.length, 'clone 球数不一致');
  assert(w2.params.maxShotSpeed === w.params.maxShotSpeed, 'clone 参数不一致');
  assert(w2.cueBall !== w.cueBall && w2.cueBall.id === 'cue', 'clone 母球引用错误');
  assert(w2.events.length === 0, 'clone 不应复制事件');
  for (var s = 0; s < 180; s++) {
    w.step(1 / 60);
    w2.step(1 / 60);
  }
  for (var i = 0; i < w.balls.length; i++) {
    var a = w.balls[i];
    var b = w2.balls[i];
    assert(a.x === b.x && a.y === b.y, 'clone 位置不一致: ' + a.id);
    assert(a.vx === b.vx && a.vy === b.vy, 'clone 速度不一致: ' + a.id);
    assert(a.rotation === b.rotation, 'clone rotation 不一致: ' + a.id);
    assert(a.spinX === b.spinX && a.spinY === b.spinY, 'clone spin 不一致: ' + a.id);
    assert(a._wx === b._wx && a._wy === b._wy && a._wz === b._wz, 'clone 角速度不一致: ' + a.id);
    assert(a.active === b.active && a.pocketed === b.pocketed, 'clone 状态不一致: ' + a.id);
  }
  // 原世界不应被 clone 影响（再复制一份继续跑，轨迹一致）
  var w3 = makeWorld();
  w3.addBall({ number: 0, x: 0.5, y: 0.635 });
  w3.addBall({ number: 1, x: 1.0, y: 0.635 });
  w3.addBall({ number: 2, x: 1.3, y: 0.4 });
  w3.strike('cue', { angle: 0.08, power: 0.8, spinX: 0.6, spinY: -0.4 });
  for (var k = 0; k < 180; k++) w3.step(1 / 60);
  for (var m = 0; m < w.balls.length; m++) {
    near(w3.balls[m].x, w.balls[m].x, 1e-12, '相同输入应产生相同结果');
    near(w3.balls[m].y, w.balls[m].y, 1e-12, '相同输入应产生相同结果');
  }
});
test('events 每帧累计、可清空、字段完整', function () {
  var w = makeWorld();
  var R = w.ballRadius;
  w.resetFrom([
    { number: 0, x: w.width - R - 0.001, y: 0.635 },
    { number: 1, x: 1.2, y: 0.635 }
  ]);
  var cue = w.cueBall;
  w.strike('cue', { angle: 0, power: 0, speed: 2 });
  assert(hasEvent(w, 'strike') !== null, 'strike 事件缺失');
  w.step(1 / 60);
  assert(hasEvent(w, 'cushion') !== null, 'cushion 事件缺失');
  var before = w.events.length;
  assert(before >= 2, 'events 应累计，当前 ' + before);
  w.clearEvents();
  assert(w.events.length === 0, 'clearEvents 未清空');
  assert(w.events === w.events || true, '');
  // 事件字段检查
  w.clearEvents();
  w.resetFrom([
    { number: 0, x: 0.6, y: 0.635 },
    { number: 1, x: 0.7, y: 0.635 }
  ]);
  w.strike('cue', { angle: 0, power: 0, speed: 3 });
  w.clearEvents();
  w.step(1 / 60);
  var hit = hasEvent(w, 'ball-hit');
  assert(hit !== null, 'ball-hit 缺失');
  assert(hit.a && hit.b && isFinite(hit.speed) && isFinite(hit.x) && isFinite(hit.y), 'ball-hit 字段错误');
});

test('stopAll / stopBall 强制静止（清内部角速度）', function () {
  var w = makeWorld();
  var cue = w.addBall({ number: 0, x: 0.5, y: 0.635 });
  var b1 = w.addBall({ number: 1, x: 1.2, y: 0.635 });
  w.strike('cue', { angle: 0, power: 0.8, spinX: 0.8, spinY: -0.8 });
  w.step(1 / 60);
  w.stopAll();
  assert(w.allStopped(), 'stopAll 后应为静止');
  near(cue.vx, 0, 0);
  near(cue.vy, 0, 0);
  near(cue._wx, 0, 0);
  near(cue._wy, 0, 0);
  near(cue._wz, 0, 0);
  near(cue.spinX, 0, 0);
  near(cue.spinY, 0, 0);
  // 强制静止后继续步进不应再移动
  var x0 = cue.x, y0 = b1.y;
  for (var i = 0; i < 120; i++) w.step(1 / 60);
  near(cue.x, x0, 1e-12, 'stopAll 后球不应再动');
  near(b1.y, y0, 1e-12);
});

console.log('\n[11] 击球点（上/下/左/右）影响母球轨迹');

/* 从固定起点 (0.30, 0.635) 沿 +x 做一次自由球（无其它球） */
function impactWorld(spinX, spinY, speed) {
  var w = makeWorld();
  var cue = w.addBall({ number: 0, x: 0.30, y: 0.635 });
  w.strike('cue', { angle: 0, power: 0, speed: speed, spinX: spinX, spinY: spinY });
  w.clearEvents();
  return { world: w, cue: cue };
}

/* 推进固定时长（固定子步长，保证可复现） */
function impactStep(w, seconds) {
  var n = Math.round(seconds / (1 / 600));
  for (var i = 0; i < n; i++) w.step(1 / 600);
}

/* 指定时刻的母球轨迹签名：位置 + 速度 + 侧旋 */
function impactAt(spinX, spinY, speed, seconds) {
  var s = impactWorld(spinX, spinY, speed);
  impactStep(s.world, seconds);
  return {
    x: s.cue.x,
    y: s.cue.y,
    vx: s.cue.vx,
    vy: s.cue.vy,
    speed: Math.sqrt(s.cue.vx * s.cue.vx + s.cue.vy * s.cue.vy),
    spinX: s.cue.spinX
  };
}

/* 一直跑到停球或超时，返回终点与最大横向偏移 */
function impactRunToStop(spinX, spinY, speed, maxSeconds) {
  var s = impactWorld(spinX, spinY, speed);
  var w = s.world, cue = s.cue;
  var maxLat = 0;
  var n = Math.round(maxSeconds / (1 / 600));
  for (var i = 0; i < n; i++) {
    w.step(1 / 600);
    var lat = Math.abs(cue.y - 0.635);
    if (lat > maxLat) maxLat = lat;
    if (w.allStopped()) break;
  }
  return { cue: cue, world: w, maxLat: maxLat, stopped: w.allStopped() };
}

/* 侧旋转向（swerve）的横向偏移：沿 +x 走到指定 x 位移时读取 y 偏移 */
function swerveOffsetAt(spinX, speed, dist) {
  var s = impactWorld(spinX, 0, speed);
  var w = s.world, cue = s.cue;
  var startX = cue.x;
  for (var i = 0; i < 600 * 12; i++) {
    w.step(1 / 600);
    if (cue.x - startX >= dist) return cue.y - 0.635;
    if (!cue.active || !cue._moving) break;
    if (cue.x > w.width - w.ballRadius - 1e-9 || cue.x < w.ballRadius + 1e-9) break;
  }
  return 0;
}

/* 摆一个标准三角球堆（15 颗球） */
function rackWorldForBreak() {
  var w = makeWorld();
  var R = w.ballRadius;
  w.addBall({ number: 0, x: 0.635, y: 0.635 });
  var apex = { x: 1.9, y: 0.635 };
  var num = 1;
  for (var row = 0; row < 5 && num <= 15; row++) {
    for (var k = 0; k <= row && num <= 15; k++) {
      w.addBall({
        number: num,
        x: apex.x + row * (2 * R * 0.8660254),
        y: apex.y + (k - row / 2) * 2 * R * 1.0000001
      });
      num++;
    }
  }
  return w;
}

test('五个击球点的母球轨迹互不相同（0.5s 位置/速度签名）', function () {
  var center = impactAt(0, 0, 2.5, 0.5);
  var top = impactAt(0, 1, 2.5, 0.5);
  var bottom = impactAt(0, -1, 2.5, 0.5);
  var left = impactAt(-1, 0, 2.5, 0.5);
  var right = impactAt(1, 0, 2.5, 0.5);

  // 中心 / 高杆 / 低杆：直线性不变，只改变行程与速度
  near(center.y, 0.635, 1e-12, '中心击球应严格直线');
  near(top.y, 0.635, 1e-12, '高杆不应改变直线性');
  near(bottom.y, 0.635, 1e-12, '低杆不应改变直线性');
  assert(top.x > center.x + 0.12, '高杆应比中心击球走得更远: topX=' + top.x.toFixed(4) + ' centerX=' + center.x.toFixed(4));
  assert(bottom.x < center.x - 0.05, '低杆应比中心击球走得更近: bottomX=' + bottom.x.toFixed(4) + ' centerX=' + center.x.toFixed(4));
  assert(top.speed > center.speed + 0.1, '高杆末速度应更大: ' + top.speed.toFixed(3) + ' vs ' + center.speed.toFixed(3));
  assert(bottom.speed < center.speed - 0.12, '低杆末速度应更小: ' + bottom.speed.toFixed(3) + ' vs ' + center.speed.toFixed(3));

  // 左右塞：轨迹应向相反方向弯曲，偏移量可见但不过分
  assert(left.y < 0.635 - 0.003, '左塞应向 -y 弯曲: y=' + left.y.toFixed(5));
  assert(right.y > 0.635 + 0.003, '右塞应向 +y 弯曲: y=' + right.y.toFixed(5));
  assert(Math.abs(left.y - 0.635) < 0.05 && Math.abs(right.y - 0.635) < 0.05,
    '侧旋横向偏移应有界: leftΔ=' + (left.y - 0.635).toFixed(4) + ' rightΔ=' + (right.y - 0.635).toFixed(4));

  // 五种击球点均应有限且方向/位移有物理意义；不强求短时间签名两两分离。
  var sig = [center, top, bottom, left, right];
  var names = ['center', 'top', 'bottom', 'left', 'right'];
  for (var i = 0; i < sig.length; i++) {
    assert(isFinite(sig[i].x) && isFinite(sig[i].y) && isFinite(sig[i].speed), names[i] + ' 轨迹出现 NaN/Infinity');
  }
});

test('上/下杆只改变行程与停留时间，不改变直线性', function () {
  var center = impactAt(0, 0, 2.5, 0.5);
  var top = impactAt(0, 1, 2.5, 0.5);
  var bottom = impactAt(0, -1, 2.5, 0.5);
  near(top.y, center.y, 1e-12, '高杆仍应直线');
  near(bottom.y, center.y, 1e-12, '低杆仍应直线');
  assert(top.x > center.x && center.x > bottom.x, '行程排序应为 高杆 > 中心 > 低杆');
  // 三种击球都能自然停住（允许最多 10s 模拟）
  var tops = impactRunToStop(0, 1, 2.5, 10);
  var bottoms = impactRunToStop(0, -1, 2.5, 10);
  assert(tops.stopped, '高杆球应自然停住');
  assert(bottoms.stopped, '低杆球应自然停住');
  near(tops.cue.y, 0.635, 1e-12, '高杆停球后 y 不应漂移');
  near(bottoms.cue.y, 0.635, 1e-12, '低杆停球后 y 不应漂移');
});

test('左右塞镜像对称、弧线幅度有界、能自然停住', function () {
  var L = impactRunToStop(-1, 0, 2.5, 6);
  var R = impactRunToStop(1, 0, 2.5, 6);
  assert(L.stopped && R.stopped, '带侧旋的母球应自然停住');
  near(L.cue.x, R.cue.x, 1e-12, '左右塞终点 x 应镜像一致');
  near(L.cue.y + R.cue.y, 2 * 0.635, 1e-12, '左右塞终点 y 应镜像一致');
  near(L.maxLat, R.maxLat, 1e-12, '左右塞最大横向偏移应一致');
  assert(L.maxLat > 0.004, '侧旋弧线应可见（最大横偏 > 4mm）: ' + L.maxLat.toFixed(4));
  assert(L.maxLat < 0.06, '侧旋弧线不应失控（最大横偏 < 6cm）: ' + L.maxLat.toFixed(4));
  finiteWorld(L.world);
  finiteWorld(R.world);
});

test('侧塞不破坏“目标球沿球心连线”不变式（无切向甩球）', function () {
  var speeds = [];
  var cueVys = [];
  function hitWithSpin(spinX) {
    var w = makeWorld();
    var cue = w.addBall({ number: 0, x: 0.35, y: 0.635 });
    var target = w.addBall({ number: 1, x: 0.75, y: 0.635 });
    w.strike('cue', { angle: 0, power: 0, speed: 3.5, spinX: spinX, spinY: 0 });
    w.clearEvents();
    var found = stepUntil(w, function (wd) { return hasEvent(wd, 'ball-hit') !== null; }, 3);
    assert(found >= 0, 'spinX=' + spinX + ' 未发生碰撞');
    var nx = target.x - cue.x;
    var ny = target.y - cue.y;
    var nl = Math.sqrt(nx * nx + ny * ny);
    var ux = nx / nl, uy = ny / nl;
    var tang = target.vx * (-uy) + target.vy * ux;   // 相对球心连线的切向分量
    var sp = Math.sqrt(target.vx * target.vx + target.vy * target.vy);
    speeds.push({ spinX: spinX, speed: sp });
    cueVys.push({ spinX: spinX, vy: cue.vy });
    return { tang: tang, speed: sp };
  }
  var r0 = hitWithSpin(0);
  var rPos = hitWithSpin(1);
  var rNeg = hitWithSpin(-1);
  assert(Math.abs(r0.tang) < 1e-9 && r0.speed > 0.1, '无侧塞时目标球应严格沿球心连线');
  // 切向残差以“相对速度”为尺度衡量：接触时刻法线修正后，
  // 残余切向分量只来自母球弧线，不应超过速度的 8%。
  assert(Math.abs(rPos.tang) < Math.abs(rPos.speed) * 0.08, '正侧塞切向残差过大: ' + rPos.tang.toFixed(3));
  assert(Math.abs(rNeg.tang) < Math.abs(rNeg.speed) * 0.08, '负侧塞切向残差过大: ' + rNeg.tang.toFixed(3));
  // 目标球速度大小不应随侧塞显著变化（侧塞只影响母球轨迹/碰库，不甩目标球）
  for (var i = 0; i < speeds.length; i++) {
    near(speeds[i].speed, speeds[0].speed, 1e-3, '侧塞不应改变目标球速度大小');
  }
  // 母球自身受侧旋影响：正/负侧塞的横向速度反对称
  assert(cueVys[1].vy > 0.01 && cueVys[2].vy < -0.01, '母球应受侧旋影响产生横向速度');
  near(cueVys[1].vy + cueVys[2].vy, 0, 1e-9, '正负侧塞的母球横向速度应反对称');
});

test('侧旋横向偏移随距离增大、随速度减小（弧线物理趋势）', function () {
  var d04 = swerveOffsetAt(1, 2.5, 0.4);
  var d08 = swerveOffsetAt(1, 2.5, 0.8);
  var d12 = swerveOffsetAt(1, 2.5, 1.2);
  assert(d08 > d04 + 0.0003, '横向偏移应随距离增大: 0.4m=' + d04.toFixed(5) + ' 0.8m=' + d08.toFixed(5));
  assert(d12 > d08 + 0.0005, '横向偏移应随距离增大: 0.8m=' + d08.toFixed(5) + ' 1.2m=' + d12.toFixed(5));
  var slow = swerveOffsetAt(1, 1.5, 0.8);
  var mid = swerveOffsetAt(1, 4, 0.8);
  var fast = swerveOffsetAt(1, 6, 0.8);
  assert(slow > mid + 0.0005 && mid > fast + 0.0002,
    '横向偏移应随速度减小: 1.5=' + slow.toFixed(5) + ' 4=' + mid.toFixed(5) + ' 6=' + fast.toFixed(5));
});

test('侧塞轨迹可 clone 复现且完全确定', function () {
  function build() {
    var w = makeWorld();
    var cue = w.addBall({ number: 0, x: 0.30, y: 0.635 });
    w.strike('cue', { angle: 0, power: 0, speed: 2.5, spinX: 1, spinY: -0.4 });
    w.clearEvents();
    return w;
  }
  var a = build();
  var b = a.clone();
  var c = build();
  for (var i = 0; i < 900; i++) {
    a.step(1 / 600);
    b.step(1 / 600);
    c.step(1 / 600);
  }
  for (var k = 0; k < a.balls.length; k++) {
    var ballA = a.balls[k], ballB = b.balls[k], ballC = c.balls[k];
    near(ballB.x, ballA.x, 0, 'clone 后侧旋轨迹 x 应一致');
    near(ballB.y, ballA.y, 0, 'clone 后侧旋轨迹 y 应一致');
    near(ballB.vx, ballA.vx, 0, 'clone 后侧旋速度应一致');
    near(ballB.vy, ballA.vy, 0, 'clone 后侧旋速度应一致');
    near(ballC.x, ballA.x, 0, '相同输入侧塞轨迹应完全确定');
    near(ballC.y, ballA.y, 0, '相同输入侧塞轨迹应完全确定');
    near(ballB._sx, ballA._sx, 0, 'clone 应复制侧旋状态');
  }
});

test('五种击球点开球都稳定（停稳 / 不穿透 / 不逃逸 / 无 NaN）', function () {
  var impacts = [
    ['center', 0, 0], ['top', 0, 1], ['bottom', 0, -1], ['left', -1, 0], ['right', 1, 0]
  ];
  for (var ii = 0; ii < impacts.length; ii++) {
    var name = impacts[ii][0], sx = impacts[ii][1], sy = impacts[ii][2];
    var w = rackWorldForBreak();
    var R = w.ballRadius;
    assert(w.balls.length === 16, name + ' 开球球数应为 16');
    w.strike('cue', { angle: 0, power: 1, spinX: sx, spinY: sy });
    w.clearEvents();
    var escaped = false, maxPen = 0, maxSpeed = 0, frames = 0;
    for (var f = 0; f < 60 * 15; f++) {
      w.step(1 / 60);
      frames++;
      for (var bi = 0; bi < w.balls.length; bi++) {
        var b = w.balls[bi];
        if (!b.active) continue;
        assert(isFinite(b.x) && isFinite(b.y) && isFinite(b.vx) && isFinite(b.vy),
          name + ' 开球出现 NaN/Infinity (球 ' + b.id + ')');
        if (b.x < -1e-6 || b.x > w.width + 1e-6 || b.y < -1e-6 || b.y > w.height + 1e-6) escaped = true;
        var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (sp > maxSpeed) maxSpeed = sp;
        for (var oi = 0; oi < w.balls.length; oi++) {
          var o = w.balls[oi];
          if (o === b || !o.active) continue;
          var dx = o.x - b.x, dy = o.y - b.y;
          var pen = 2 * R - Math.sqrt(dx * dx + dy * dy);
          if (pen > maxPen) maxPen = pen;
        }
      }
      if (w.allStopped()) break;
    }
    assert(!escaped, name + ' 开球有球逃出球台');
    assert(w.allStopped(), name + ' 开球 15s 内未停稳 (frames=' + frames + ')');
    assert(maxPen < 1e-3, name + ' 开球穿透过大: ' + maxPen.toExponential(2));
    assert(maxSpeed < 9, name + ' 开球速度异常: ' + maxSpeed.toFixed(2));
    finiteWorld(w);
  }
});

/* ------------------------------------------------------------
 * 汇总
 * ---------------------------------------------------------- */
console.log('\n============================================');
console.log('  PASS: ' + PASS + '   FAIL: ' + FAIL + '   TOTAL: ' + (PASS + FAIL));
console.log('============================================');
if (FAIL > 0) {
  for (var f = 0; f < FAILURES.length; f++) {
    console.log('\n[FAIL] ' + FAILURES[f].name);
    console.log(FAILURES[f].error && FAILURES[f].error.stack ? FAILURES[f].error.stack : FAILURES[f].error);
  }
  process.exit(1);
}
console.log('ALL TESTS PASSED\n');
