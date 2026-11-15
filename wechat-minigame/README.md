# 即刻开球 PRO POOL · 微信小游戏版

复用网页版核心（物理/AI/规则/渲染/音效），通过 adapter.js 映射 wx API，mg-main.js 提供 canvas UI。

## 在微信开发者工具中运行
1. 下载并安装「微信开发者工具」，选择「小游戏」项目。
2. 导入本目录 wechat-minigame/（project.config.json 已设 compileType=game）。
3. 将 project.config.json 的 appid 从 touristappid 改为你注册的小游戏 AppID（测试可先用测试号）。
4. 编译即可在模拟器/真机预览。

## 重新生成核心 bundle
修改网页版 js/ 后执行：node scripts/build-minigame.mjs（拼接 config/physics/renderer/audio/ai/levels/game，不含 DOM 主程序 main.js）。

## v1 范围（利于一次过审）
- 单人挑战（三档 AI）/ 双人对战
- 拖动瞄准 + 虚影母球 + 力度条 + 出杆
- 11 击球点预设面板
- 自由球拖动摆放、犯规/胜负判定
- 首屏隐私弹窗、分享卡片
- 暂不含：关卡/商店/广告（后续版本再加，减少首审变量）

## 上架前必须本人实名的环节（材料已备于 软著申请/）
1. 微信公众平台注册小游戏（个人主体，类目=游戏）→ AppID。
2. 软著：中国版权保护中心个人实名 → 提交 软著申请/ 内 PDF 与身份证明。
3. 小程序备案（工信部）。
4. 后台配置隐私协议链接（可用 https://xings117.github.io/pro-pool/privacy.html）、适龄提示 8+。
5. 上传代码 → 体验版真机测试 → 提审（附软著/自审报告/隐私链接）。
