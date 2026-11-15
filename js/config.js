/* 即刻开球 — 全局配置（Lead 维护）
 *
 * 明文依赖表（单文件内分层，改动前先看这里）：
 *   config.js  ── 无依赖，提供 CONFIG / BALL_COLORS / UTIL
 *   physics.js ── config.js（表尺寸、物理常数）
 *   renderer.js── config.js（表尺寸、袋口、球色、cues[].visual）
 *   audio.js   ── 无依赖（WebAudio + 内嵌采样）
 *   ai.js      ── config.js + physics.js（clone 试打）
 *   levels.js  ── config.js（坐标单位与表尺寸约定）
 *   game.js    ── config/physics/audio/ai/levels + CONFIG.economy
 *   main.js    ── 全部模块（输入、HUD、屏幕、commandMap、insets）
 *
 * 约定：米制坐标，原点在台呢左上角，x 向右(2.54)，y 向下(1.27)，
 * 角度 0 = +x，单位弧度。物理层与渲染层共用此约定。
 */
(function () {
  var Pool = (window.Pool = window.Pool || {});

  var W = 2.54;
  var H = 1.27;
  var R = 0.028575;
  var PR = 0.052;

  var pockets = [
    { x: 0, y: 0, radius: PR, corner: true, index: 0 },
    { x: W * 0.5, y: 0, radius: PR, corner: false, index: 1 },
    { x: W, y: 0, radius: PR, corner: true, index: 2 },
    { x: 0, y: H, radius: PR, corner: true, index: 3 },
    { x: W * 0.5, y: H, radius: PR, corner: false, index: 4 },
    { x: W, y: H, radius: PR, corner: true, index: 5 }
  ];

  var BALL_COLORS = {
    1: '#f2c230', 2: '#1f5bb5', 3: '#cf3a2b', 4: '#6b3f9e',
    5: '#e5852b', 6: '#2b8a57', 7: '#8a2f3d', 8: '#191919',
    9: '#f2c230', 10: '#1f5bb5', 11: '#cf3a2b', 12: '#6b3f9e',
    13: '#e5852b', 14: '#2b8a57', 15: '#8a2f3d'
  };

  var CUES = [
    {
      id: 'oak', name: '经典橡木', en: 'CLASSIC OAK', price: 0, starsRequired: 0,
      power: 1.0, spin: 1.0, aim: 1.0, role: '均衡型',
      desc: '均衡的入门杆：力量、旋转与辅助线都在基准，适合先练手感。',
      colors: { butt: '#6b3a22', wrap: '#24150f', shaft: '#d8b98e', accent: '#c9a24a', tip: '#4a78a6' },
      pattern: 'oak'
    },
    {
      id: 'maple', name: '枫木猎手', en: 'MAPLE HUNTER', price: 600, starsRequired: 0,
      power: 1.10, spin: 0.95, aim: 0.98, role: '力量型',
      desc: '轻快枫木前节：出杆速度 +10%，适合大力开球与长台，但旋转略弱。',
      colors: { butt: '#b87a3e', wrap: '#3a2015', shaft: '#efd9b5', accent: '#d8b25e', tip: '#4a8fc6' },
      pattern: 'maple'
    },
    {
      id: 'carbon', name: '碳纤黑刃', en: 'CARBON EDGE', price: 1500, starsRequired: 8,
      power: 0.98, spin: 1.20, aim: 1.02, role: '旋转型',
      desc: '低形变碳纤维前节：旋转 +20%，高低杆/塞更明显，适合走位与缩杆。',
      colors: { butt: '#1b1d20', wrap: '#0c0d0f', shaft: '#2a2d31', accent: '#7d8794', tip: '#4a78a6' },
      pattern: 'carbon'
    },
    {
      id: 'rosewood', name: '玫瑰木典藏', en: 'ROSEWOOD HERITAGE', price: 2800, starsRequired: 16,
      power: 1.05, spin: 1.08, aim: 1.12, role: '控制型',
      desc: '老料玫瑰木：辅助线更长、旋转稳定，适合需要精细走位的球局。',
      colors: { butt: '#5c201f', wrap: '#1b0e0d', shaft: '#e6cba0', accent: '#d4af62', tip: '#4a78a6' },
      pattern: 'rosewood'
    },
    {
      id: 'gold', name: '鎏金冠军', en: 'GOLD CHAMPION', price: 5000, starsRequired: 28,
      power: 1.15, spin: 1.15, aim: 1.16, role: '全能型',
      desc: '冠军限定：力量、旋转、辅助线三项都强，没有明显短板。',
      colors: { butt: '#2a1b10', wrap: '#0f0b08', shaft: '#f0d49a', accent: '#e7bf5f', tip: '#4a78a6' },
      pattern: 'gold'
    },
    {
      id: 'rod', name: '远投钓竿', en: 'LONG CAST ROD', price: 3200, starsRequired: 20,
      power: 0.98, spin: 0.94, aim: 1.24, role: '远瞄型', shape: 'rod',
      desc: '异形长竿：辅助线最长、袋口黏滞窗口最大，力量与旋转略低，适合远台薄球。',
      colors: { butt: '#183c4a', wrap: '#0b1c24', shaft: '#b9d8d2', accent: '#6fb7c7', tip: '#4a78a6' },
      pattern: 'carbon'
    },
    {
      id: 'pistol', name: '裁决之枪', en: 'JUDGEMENT PISTOL', price: 4200, starsRequired: 24,
      power: 1.24, spin: 0.90, aim: 1.05, role: '爆发型', shape: 'pistol',
      desc: '枪式短促发力：出杆最猛，适合开球和强攻，但旋转与走位控制较弱。',
      colors: { butt: '#22262b', wrap: '#0c0f12', shaft: '#8f989f', accent: '#c7a45a', tip: '#4a78a6' },
      pattern: 'carbon'
    },
    {
      id: 'wand', name: '星辉魔杖', en: 'STARLIGHT WAND', price: 5200, starsRequired: 30,
      power: 0.94, spin: 1.30, aim: 1.18, role: '旋转型', shape: 'wand',
      desc: '星辉杖身：旋转最强、辅助线强，力量偏小；适合高杆/低杆/塞的精细走位。',
      colors: { butt: '#3a1d54', wrap: '#160b24', shaft: '#d9c7ef', accent: '#e3b85f', tip: '#6a8fd0' },
      pattern: 'gold'
    },
    {
      id: 'golf', name: '果岭推杆', en: 'GREEN PUTTER', price: 6500, starsRequired: 36,
      power: 1.02, spin: 0.88, aim: 1.30, role: '控制型', shape: 'golf',
      desc: '高尔夫异形杆：辅助线与袋口黏滞最强，适合把每一杆都送到袋口；旋转较弱。',
      colors: { butt: '#1d3b2c', wrap: '#0b1711', shaft: '#d7d9d4', accent: '#b7c4a4', tip: '#4a78a6' },
      pattern: 'carbon'
    }
  ];


  /* 球杆视觉形象：只描述「造型语言」，不复制任何第三方具体造型。
   * renderer._drawCue / main.cueArt 共用这一份数据，保证商店与对局一致。
   * profile    : 杆身轮廓  classic 传统 / taper 渐收 / faceted 切面 / 异形轮廓
   * joint      : 接环      single 单环 / double 双环 / none 无
   * wrapStyle  : 握把纹理  linen 亚麻 / leather 皮革 / rings 环纹 / knurl 滚花
   * accentShape: 装饰母题  diamond 菱 / chevron 人字 / dot 点 / star 星 / none
   * tipRing    : 杆头金属环
   */
  var CUE_VISUALS = {
    oak:      { profile: 'classic', joint: 'single', wrapStyle: 'linen',   accentShape: 'dot',     tipRing: true },
    maple:    { profile: 'taper',   joint: 'double', wrapStyle: 'rings',   accentShape: 'chevron', tipRing: true },
    carbon:   { profile: 'faceted', joint: 'single', wrapStyle: 'knurl',   accentShape: 'diamond', tipRing: false },
    rosewood: { profile: 'classic', joint: 'double', wrapStyle: 'leather', accentShape: 'diamond', tipRing: true },
    gold:     { profile: 'faceted', joint: 'double', wrapStyle: 'leather', accentShape: 'star',    tipRing: true },
    rod:      { profile: 'rod',     joint: 'none',   wrapStyle: 'rings',   accentShape: 'none',    tipRing: false },
    pistol:   { profile: 'pistol',  joint: 'none',   wrapStyle: 'knurl',   accentShape: 'chevron', tipRing: false },
    wand:     { profile: 'wand',    joint: 'none',   wrapStyle: 'leather', accentShape: 'star',    tipRing: false },
    golf:     { profile: 'golf',    joint: 'none',   wrapStyle: 'knurl',   accentShape: 'none',    tipRing: false }
  };
  for (var vi = 0; vi < CUES.length; vi++) {
    CUES[vi].visual = CUE_VISUALS[CUES[vi].id] || CUE_VISUALS.oak;
  }

  Pool.CONFIG = {
    table: { width: W, height: H, ballRadius: R, pocketRadius: PR, railWidth: 0.095 },
    pockets: pockets,
    physics: {
      maxShotSpeed: 7.6,
      ballRestitution: 0.95,
      cushionRestitution: 0.76,
      ballFriction: 0.06,
      cushionFriction: 0.2,
      rollingDecel: 0.36,
      slidingDecel: 2.6,
      spinDecay: 1.9,
      substep: 1 / 600,
      stopSpeed: 0.012
    },
    cues: CUES,
    // 关卡首通直接奖励的球杆（不占用金币/星星购买）
    levelRewardCues: {
      l4: 'maple',
      l8: 'carbon',
      l12: 'gold'
    },
    // 金币经济：只用于游戏内购买球杆，不接任何支付/广告/红包。
    // 负数表示扣除；金币下限 minCoins，永不为负。
    economy: {
      matchWin:  { easy: 80,  normal: 140, hard: 240 }, // AI 对局胜利
      matchLoss: { easy: 30,  normal: 45,  hard: 70  }, // AI 对局失败（扣）
      pvpWin: 60,                                       // 本地双人：胜者 +，败者不扣
      levelWinRepeatRate: 0.30,                          // 关卡重复通关 = rewardCoins × 0.30
      levelLoss: 40,                                     // 关卡失败（扣）
      minCoins: 0
    },
    settings: {
      chargeTime: 1.15,
      minPower: 0.06,
      maxChargePower: 1,
      aimSensitivity: 1,
      keyboardAngleStep: 0.00035,      // 0.0201°
      keyboardAngleStepFine: 0.000077, // 0.0044° = 0.00035 × 0.22
      cueLength: 1.45,
      cueGap: 0.035,
      cameraShake: true
    }
  };

  Pool.BALL_COLORS = BALL_COLORS;

  Pool.UTIL = {
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    easeOutCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    easeInOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    clamp01: function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; },
    angleDiff: function (a, b) {
      var d = (a - b) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      return d;
    },
    formatTime: function (s) {
      var m = Math.floor(s / 60); var ss = Math.floor(s % 60);
      return m + ':' + (ss < 10 ? '0' : '') + ss;
    }
  };
})();