/* 微信小游戏入口文件（微信开发者工具约定固定命名为 game.js）
   实际逻辑在 mg-main.js；core.js 由 scripts/build-minigame.mjs 生成。 */

/* ---- 真机环境归一化（必须最先执行）----
   微信小游戏真机没有 BOM，没有 window 对象，全局对象是 GameGlobal；
   而开发者工具里内置了 window。若不补齐，adapter.js 第一句
   window.__MG_CANVAS 就会 ReferenceError: window is not defined，
   表现为「开发者工具能跑、真机打不开」。
   把 GameGlobal 挂到 window 上之后，后续所有模块裸写 window 都能正常解析。 */
if (typeof window === 'undefined' && typeof GameGlobal !== 'undefined') {
  GameGlobal.window = GameGlobal;
}

require('./mg-main.js');
