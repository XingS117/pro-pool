/* 即刻开球 / PRO POOL — 关卡数据（ai-levels-dev 维护）
 * 坐标单位米，原点在台呢左上角，x 向右 (2.54)，y 向下 (1.27)。
 * Pool.LEVELS = [ ... ]，完整摆球（不含母球）。
 *
 * 关卡机制（练习型关卡设计）：
 *   targets [] 本关必须打进的目标球号码（全色低号球 1..7）；
 *   blockers [] 干扰球号码（花色球 9..15），不能打进，进袋判失败；
 *   balls [] = targets + blockers 的完整摆球，供 physics/game 建世界。
 *   game.js 读取 targets / blockers；未提供 targets 时旧逻辑沿用 balls 全量（向后兼容）。
 *
 * 每关另含：goal（HUD 目标）、rules（辅助线/旋转说明与规则备注）。
 * 全部坐标经 tests/level_placements.test.js 结构校验，
 * 并由 tests/tmp_levels_solve.js 用 physics.js 逐目标实机验证「能打进且不先碰干扰球」。
 */
(function () {
  'use strict';

  var Pool = (window.Pool = window.Pool || {});

  Pool.LEVELS = [
    /* 01 ------------------------------------------------------------------ */
    {
      id: 'l1', name: '目标初体验', subtitle: 'FIRST POT', difficulty: 1,
      tip: '只打全色目标球：瞄准后轻推直线，白球别碰花色干扰球。',
      goal: { type: 'targets', total: 1, label: '打进 1 颗目标球' },
      rules: {
        guide: true,
        spin: false,
        guideText: '辅助线开启，可参考假想球与目标线路',
        spinText: '本关关闭旋转，专注力度与角度',
        summary: '辅助线开启 · 旋转关闭',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 1.27, y: 0.98 },
      targets: [1],
      blockers: [9],
      balls: [
        { number: 1, x: 1.2526, y: 0.4966 }, // target
        { number: 9, x: 0.7006, y: 0.7606 } // blocker
      ],
      ballInHand: true,
      maxShots: 10,
      par: 1,
      rewardCoins: 80,
      allowGuide: true,
      allowSpin: false
    },
    /* 02 ------------------------------------------------------------------ */
    {
      id: 'l2', name: '隔球直线', subtitle: 'THROUGH TRAFFIC', difficulty: 2,
      tip: '目标球旁边多了一颗花色球：路线被挤窄，出杆更要干净。',
      goal: { type: 'targets', total: 1, label: '打进 1 颗目标球' },
      rules: {
        guide: true,
        spin: false,
        guideText: '辅助线开启，可参考假想球与目标线路',
        spinText: '本关关闭旋转，专注力度与角度',
        summary: '辅助线开启 · 旋转关闭',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 0.55, y: 0.95 },
      targets: [1],
      blockers: [9],
      balls: [
        { number: 1, x: 0.8446, y: 0.4606 }, // target
        { number: 9, x: 1.4086, y: 0.6766 } // blocker
      ],
      ballInHand: true,
      maxShots: 12,
      par: 1,
      rewardCoins: 110,
      allowGuide: true,
      allowSpin: false
    },
    /* 03 ------------------------------------------------------------------ */
    {
      id: 'l3', name: '角度入门', subtitle: 'CUT SHOT', difficulty: 3,
      tip: '开始有角度：先找假想球，再把目标球稳稳送进袋口。',
      goal: { type: 'targets', total: 1, label: '打进 1 颗目标球' },
      rules: {
        guide: true,
        spin: false,
        guideText: '辅助线开启，可参考假想球与目标线路',
        spinText: '本关关闭旋转，专注力度与角度',
        summary: '辅助线开启 · 旋转关闭',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 0.4, y: 0.635 },
      targets: [1],
      blockers: [9],
      balls: [
        { number: 1, x: 1.8766, y: 0.4366 }, // target
        { number: 9, x: 1.2766, y: 0.6406 } // blocker
      ],
      ballInHand: false,
      maxShots: 12,
      par: 2,
      rewardCoins: 150,
      allowGuide: true,
      allowSpin: false
    },
    /* 04 ------------------------------------------------------------------ */
    {
      id: 'l4', name: '双目标', subtitle: 'TWO TARGETS', difficulty: 4,
      tip: '两颗目标球一上一下：分配好母球停点，别为走位碰到花色球。',
      goal: { type: 'targets', total: 2, label: '打进 2 颗目标球' },
      rules: {
        guide: true,
        spin: true,
        guideText: '辅助线开启，可参考假想球与目标线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线开启 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 0.45, y: 1 },
      targets: [1, 2],
      blockers: [9],
      balls: [
        { number: 1, x: 0.7006, y: 0.4486 }, // target
        { number: 2, x: 1.9606, y: 0.9406 }, // target
        { number: 9, x: 1.2766, y: 0.6406 } // blocker
      ],
      ballInHand: true,
      maxShots: 12,
      par: 2,
      rewardCoins: 180,
      allowGuide: true,
      allowSpin: true
    },
    /* 05 ------------------------------------------------------------------ */
    {
      id: 'l5', name: '花球拦路', subtitle: 'BLOCKERS', difficulty: 5,
      tip: '花色球挡住两侧袋口，只能走中袋：稳准薄，别把干扰球撞进袋。',
      goal: { type: 'targets', total: 2, label: '打进 2 颗目标球' },
      rules: {
        guide: true,
        spin: true,
        guideText: '辅助线开启，可参考假想球与目标线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线开启 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 0.7, y: 0.635 },
      targets: [1, 2],
      blockers: [9, 10],
      balls: [
        { number: 1, x: 1.8646, y: 0.7966 }, // target
        { number: 2, x: 1.8646, y: 0.4726 }, // target
        { number: 9, x: 1.3486, y: 1.1086 }, // blocker
        { number: 10, x: 1.3486, y: 0.1606 } // blocker
      ],
      ballInHand: false,
      maxShots: 12,
      par: 3,
      rewardCoins: 220,
      allowGuide: true,
      allowSpin: true
    },
    /* 06 ------------------------------------------------------------------ */
    {
      id: 'l6', name: '薄边切球', subtitle: 'THIN CUT', difficulty: 6,
      tip: '切角更大：瞄准点更薄、力度稍大，把目标球送进袋，出杆别抖。',
      goal: { type: 'targets', total: 2, label: '打进 2 颗目标球' },
      rules: {
        guide: true,
        spin: true,
        guideText: '辅助线开启，可参考假想球与目标线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线开启 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 0.8, y: 0.95 },
      targets: [1, 2],
      blockers: [9, 10],
      balls: [
        { number: 1, x: 1.8766, y: 0.7486 }, // target
        { number: 2, x: 1.4806, y: 0.7366 }, // target
        { number: 9, x: 1.3486, y: 0.1486 }, // blocker
        { number: 10, x: 0.7726, y: 0.3406 } // blocker
      ],
      ballInHand: false,
      maxShots: 14,
      par: 3,
      rewardCoins: 260,
      allowGuide: true,
      allowSpin: true
    },
    /* 07 ------------------------------------------------------------------ */
    {
      id: 'l7', name: '三球连线', subtitle: 'THREE BALLS', difficulty: 7,
      tip: '三颗目标球分散在不同角度：先打最稳的一颗，再处理贴库球。',
      goal: { type: 'targets', total: 3, label: '打进 3 颗目标球' },
      rules: {
        guide: true,
        spin: true,
        guideText: '辅助线开启，可参考假想球与目标线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线开启 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 0.45, y: 0.635 },
      targets: [1, 2, 3],
      blockers: [9, 10],
      balls: [
        { number: 1, x: 0.7846, y: 0.2686 }, // target
        { number: 2, x: 1.6486, y: 0.7126 }, // target
        { number: 3, x: 1.7446, y: 0.5566 }, // target
        { number: 9, x: 1.0606, y: 0.8446 }, // blocker
        { number: 10, x: 1.3486, y: 0.1246 } // blocker
      ],
      ballInHand: false,
      maxShots: 14,
      par: 4,
      rewardCoins: 290,
      allowGuide: true,
      allowSpin: true
    },
    /* 08 ------------------------------------------------------------------ */
    {
      id: 'l8', name: '密集干扰', subtitle: 'HEAVY TRAFFIC', difficulty: 8,
      tip: '干扰球更多、台面更堵：能直落就别翻袋，时刻注意母球走位。',
      goal: { type: 'targets', total: 3, label: '打进 3 颗目标球' },
      rules: {
        guide: true,
        spin: true,
        guideText: '辅助线开启，可参考假想球与目标线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线开启 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 1.27, y: 1 },
      targets: [1, 2, 3],
      blockers: [9, 10, 11],
      balls: [
        { number: 1, x: 0.7006, y: 0.3406 }, // target
        { number: 2, x: 0.7486, y: 0.9406 }, // target
        { number: 3, x: 1.8766, y: 0.7606 }, // target
        { number: 9, x: 1.3246, y: 0.5806 }, // blocker
        { number: 10, x: 1.0366, y: 0.4846 }, // blocker
        { number: 11, x: 1.4446, y: 0.6526 } // blocker
      ],
      ballInHand: false,
      maxShots: 18,
      par: 4,
      rewardCoins: 330,
      allowGuide: true,
      allowSpin: true
    },
    /* 09 ------------------------------------------------------------------ */
    {
      id: 'l9', name: '长台清点', subtitle: 'LONG TABLE', difficulty: 9,
      tip: '关闭辅助线：靠记忆判断线路，长台把目标球送进袋口，发力要平直。',
      goal: { type: 'targets', total: 3, label: '打进 3 颗目标球' },
      rules: {
        guide: false,
        spin: true,
        guideText: '本关关闭辅助线，靠手感判断线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线关闭 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 0.3, y: 0.635 },
      targets: [1, 2, 3],
      blockers: [10, 11, 12],
      balls: [
        { number: 1, x: 0.7726, y: 0.4486 }, // target
        { number: 2, x: 1.5406, y: 0.5686 }, // target
        { number: 3, x: 1.6246, y: 0.7006 }, // target
        { number: 10, x: 0.2806, y: 0.1006 }, // blocker
        { number: 11, x: 1.0726, y: 0.8446 }, // blocker
        { number: 12, x: 1.3246, y: 0.2566 } // blocker
      ],
      ballInHand: false,
      maxShots: 18,
      par: 5,
      rewardCoins: 370,
      allowGuide: false,
      allowSpin: true
    },
    /* 10 ------------------------------------------------------------------ */
    {
      id: 'l10', name: '组合出杆', subtitle: 'COMBINATION', difficulty: 10,
      tip: '组合与走位：用高低杆把母球送到下一颗目标球附近。',
      goal: { type: 'targets', total: 4, label: '打进 4 颗目标球' },
      rules: {
        guide: false,
        spin: true,
        guideText: '本关关闭辅助线，靠手感判断线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线关闭 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 1.27, y: 0.635 },
      targets: [1, 2, 3, 4],
      blockers: [9, 10, 11],
      balls: [
        { number: 1, x: 0.6166, y: 0.4846 }, // target
        { number: 2, x: 0.7126, y: 0.7006 }, // target
        { number: 3, x: 1.8286, y: 0.5686 }, // target
        { number: 4, x: 0.9046, y: 0.2566 }, // target
        { number: 9, x: 2.1406, y: 1.0846 }, // blocker
        { number: 10, x: 2.1886, y: 0.0886 }, // blocker
        { number: 11, x: 1.1566, y: 1.1086 } // blocker
      ],
      ballInHand: false,
      maxShots: 24,
      par: 5,
      rewardCoins: 410,
      allowGuide: false,
      allowSpin: true
    },
    /* 11 ------------------------------------------------------------------ */
    {
      id: 'l11', name: '四球挑战', subtitle: 'FOUR BALLS', difficulty: 11,
      tip: '四颗目标球 + 四颗干扰球：每一杆都要想好下一杆。',
      goal: { type: 'targets', total: 4, label: '打进 4 颗目标球' },
      rules: {
        guide: false,
        spin: true,
        guideText: '本关关闭辅助线，靠手感判断线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线关闭 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。'
      },
      cue: { x: 0.35, y: 0.9 },
      targets: [1, 2, 3, 4],
      blockers: [9, 10, 11, 12],
      balls: [
        { number: 1, x: 1.6246, y: 0.8326 }, // target
        { number: 2, x: 1.5166, y: 0.1006 }, // target
        { number: 3, x: 0.8206, y: 0.7006 }, // target
        { number: 4, x: 1.9606, y: 0.6046 }, // target
        { number: 9, x: 1.4086, y: 0.4966 }, // blocker
        { number: 10, x: 1.4926, y: 0.4006 }, // blocker
        { number: 11, x: 1.1086, y: 0.9526 }, // blocker
        { number: 12, x: 1.3726, y: 1.0726 } // blocker
      ],
      ballInHand: false,
      maxShots: 26,
      par: 6,
      rewardCoins: 460,
      allowGuide: false,
      allowSpin: true
    },
    /* 12 ------------------------------------------------------------------ */
    {
      id: 'l12', name: '终局清台', subtitle: 'FINAL RUN', difficulty: 12,
      tip: '终局：清光四颗目标球，别碰任何花色干扰球，稳住节奏收下挑战。',
      goal: { type: 'targets', total: 4, label: '打进 4 颗目标球' },
      rules: {
        guide: false,
        spin: true,
        guideText: '本关关闭辅助线，靠手感判断线路',
        spinText: '旋转开启，可用高低杆与侧旋控制母球走位',
        summary: '辅助线关闭 · 旋转开启',
        note: '只打目标球（全色球），花色干扰球进袋即失败。本模式不含八球分组与黑八顺序限制。'
      },
      cue: { x: 1.27, y: 1.05 },
      targets: [1, 2, 3, 4],
      blockers: [11, 12, 13, 14],
      balls: [
        { number: 1, x: 0.7966, y: 0.3886 }, // target
        { number: 2, x: 0.7486, y: 0.9406 }, // target
        { number: 3, x: 1.6486, y: 0.4126 }, // target
        { number: 4, x: 1.7686, y: 0.9286 }, // target
        { number: 11, x: 1.2406, y: 0.6166 }, // blocker
        { number: 12, x: 1.1686, y: 0.2446 }, // blocker
        { number: 13, x: 1.5766, y: 0.7126 }, // blocker
        { number: 14, x: 1.4446, y: 0.2206 } // blocker
      ],
      ballInHand: false,
      maxShots: 26,
      par: 6,
      rewardCoins: 500,
      allowGuide: false,
      allowSpin: true
    }
  ];
})();