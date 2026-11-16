# 一杆入袋 PRO POOL · 微信小游戏版

> **AppID 已填入**：`wxc7a231a0939ab1ea`（project.config.json）
> **入口文件**：`game.js`（微信开发者工具约定固定命名，不可改名）
> **导入包**：`dist/pro-pool-wechat-minigame.zip`（498 KB，可直接「导入项目」）

## 一、在微信开发者工具中导入（3 步）

1. 下载安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)（稳定版即可）。
2. 打开工具 → **「导入项目」** → 目录选本文件夹（或解压 zip 后的目录）→ **项目类型选「小游戏」**。
   - AppID 已填好，工具会自动识别；若提示「AppID 不属于当前登录账号」，请用注册该小游戏的管理员微信扫码登录工具。
3. 点「编译」即可在模拟器运行；点「预览」生成二维码用手机真机测试。

## 二、工程结构

| 文件 | 作用 |
|---|---|
| `game.js` | **入口**（固定命名），加载 mg-main.js |
| `game.json` | 设备方向（竖屏）、状态栏、网络超时配置 |
| `project.config.json` | AppID、compileType=game、基础库 3.4.0 |
| `adapter.js` | 把浏览器 API 映射到 wx API（Canvas/WebAudio/atob/存储/DOM 桩/rAF/盒模型） |
| `core.js` | 核心 bundle，由 `node scripts/build-minigame.mjs` 从网页版 js/ 自动生成（446KB） |
| `mg-main.js` | Canvas UI（主菜单/对局/击球点面板/结算）、触控、力度条、分享卡片、首屏隐私弹窗 |
| `icon-512.png` | 后台上传的头像候选 |
| `元数据.md` | 名称/简介/二级类目/适龄提示，后台填写直接抄 |

## 三、宿主兼容要点（已验证）

- 主线程 2D Canvas 不支持 `ctx.createImageData`：台呢纹理改为「优先 ImageData、不可用则纯绘制降级」。
- canvas 无 DOM 盒模型：适配层注入 `getBoundingClientRect`。
- 无 `document.body.classList` / `window.matchMedia` / `atob` / `localStorage` / `rAF`：适配层逐一补齐。
- 回归保障：`node tests/mg_runtime.test.js` 在 Node 中模拟 wx 运行时，14 项断言覆盖 game.js 入口加载、映射、分享与触摸响应。

## 四、提审前后台配置（本人操作）

| 项 | 值 | 位置 |
|---|---|---|
| 名称 | 一杆入袋 | 设置 → 基本设置 |
| 简介 | 见 `元数据.md` | 设置 → 基本设置 |
| 头像 | 上传 `icon-512.png` | 设置 → 基本设置 |
| 二级类目 | **休闲**（个人主体不可选角色/牌类/文化互动） | 首页 → 小程序类目 → 去补充 |
| 隐私协议 | `https://xingshuwen.com/games/pool/privacy.html` | 设置 → 服务内容声明 → 用户隐私保护指引 |
| 适龄提示 | **8+**（文案见 `软著申请/适龄提示.md`） | 设置 → 适龄提示 |
| 小程序备案 | 工信部备案，后台发起 | 设置 → 基本设置 → 备案 |
| 软著证书 | 下证后上传 | 设置 → 基本设置 / 资质管理 |

## 五、上传与提审

1. 开发者工具点「上传」→ 填版本号（如 `1.0.0`）与项目备注 → 需管理员微信扫码确认。
2. 后台 → 版本管理 → 开发版本 → 选为「体验版」，用本人 + 至少 1 台他人设备真机测试。
3. 提交审核：附软著、自审报告、隐私链接、演示截图/录屏。
4. 审核通过后点「发布」。

## 六、v1 范围（刻意收敛，降低首审变量）

- 单人挑战（三档 AI）/ 双人对战
- 拖动瞄准 + 虚影母球 + 力度条 + 出杆
- 11 击球点预设面板
- 自由球拖动摆放、犯规/胜负判定
- 首屏隐私弹窗、分享卡片
- **暂不含**：关卡 / 商店 / 广告

## 七、重新生成核心 bundle

修改网页版 `js/` 后执行：
```bash
node scripts/build-minigame.mjs
```
拼接 config/physics/renderer/audio/ai/levels/game，不含 DOM 主程序 main.js。改完记得重跑 `node tests/mg_runtime.test.js`。
