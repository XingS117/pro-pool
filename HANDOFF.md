# HANDOFF · 一杆入袋 / PRO POOL

> 交接时间：2026-11-25。接手请先读本文件 + `docs/CONTRACT.md` + `docs/DEPLOY-internal.md`。
> 当前状态：PC/移动端网页版已上线；在线双人对战 v1 已上线；微信小游戏目录存在但**本轮不维护**。

## 1. 项目目标与硬约束

- 免费、无广告、无账号；可离线双击打开。游戏名「一杆入袋」，play URL `https://www.xingshuwen.com/games/pool/`。
- **物理/手感/音效是已调好的资产，未经用户明确确认不得改动**：固定子步 1/600、CCD、滚动/滑动摩擦、spin、袋口 jaw、力度/角度/蓄力曲线、WebAudio 音效。相关测试：`physics*.test.js`、`jitter_check.js`、`ball_positions`、`cue_points`、`spin_points_ui.test.js`、`ghost_ball.test.js`。
- 反回归红线（踩过坑）：不在 render loop 用 `ctx.getImageData`；不恢复径向环+jaw clamp（会抖）；不在 `enterBallInHand` 调 `ensureCueSafe(true)`；AI sim/执行不可分叉（`AI_DEFAULT_SPIN_Y=0.10`）；`plan=safety` 不可保留 pot angle。
- 用户语言：中文。简洁直接，不做免责/长篇解释。

## 2. 目录与运行

- 工作目录：`C:\Users\shuwe\Desktop\dsh\台球`（当前 `main` 与 `origin/main` 同步）。
- 公开库：`D:\Sven\10-项目\网站\pro-pool-oss`（同样已同步）。私有开发库 `XingS117/pro-pool-dev`；公开库 `XingS117/pro-pool`。
- 单文件产物：`dist/pro-pool.html`（内联全部 CSS/JS，零网络请求）。构建：`node scripts/build-standalone.mjs`。
- 网页部署：`node 推广/deploy-pool-game.mjs`（复用 `D:/Sven/60-备份/敏感凭据/腾讯云.txt` 中的 RSA key 与服务器 IPv4）。
- 信令服务器：`server/pool-ws.mjs`（Node 22，`ws` 在 `server/node_modules`）。部署：`node scripts/deploy-pool-ws.mjs`；远端 `/opt/pool-ws/`，systemd `pool-ws`，nginx 主站 `/pool-ws/` 反代 `127.0.0.1:8787`，wss 走 443。**改完服务器代码必须 `sudo systemctl restart pool-ws`**——`enable --now` 对已 active 服务不重载（踩过坑）。
- 全量回归：`node tests/run_all.mjs`（29 个 node/py 套件，含 3 浏览器跨引擎确定性、在线协议/双端/浏览器实景）。当前全绿。

## 3. 代码结构（经典 script，无打包器）

- 加载顺序（`index.html`）：`config.js → physics.js → renderer.js → audio.js → ai.js → levels.js → game.js → net.js → main.js`。构建脚本 `EXPECTED_MODULE_ORDER` 必须同步；构建静态校验禁止网络 API，**仅对 `js/net.js` 开 WebSocket 白名单**。
- `js/physics.js`：确定性物理；`PhysicsWorld.clone/export` 可用。
- `js/game.js`：`window.Pool.Game`。在线关键扩展：`exportState()/applyState()`（完整局面快照）、`onLocalShot/onStateSettled/onGroupAssigned/onCuePlaced/onGameOver/onPauseChange` 钩子、`applyRemoteShot()`、`onlineSeat`、`freeBallSeat`（全局归属）、`_suppressNet`、`_onlinePaused`。
- `js/net.js`：`window.Pool.Net`——connect/createRoom/joinRoom/rejoin/sendShot/swap/stateSync/groupAssigned/cuePlaced/gameResult/turnTimeout/pauseState/forceResume/rematch；自动重连（断线后 800ms 用座位码 rejoin，非主动关闭时）。
- `js/main.js`：`online` 状态对象 + 在线 UI；对战条按 `online.mySeat` 把本机显示到 card-0（"我"）、对手 card-1；toast 在显示层按第一视角二次校正（"轮到"用 activePlayer、"自由球"用 1-activePlayer）。
- `server/pool-ws.mjs`：内存房间（4 位数字房间号 + 8 位座位码），**服务器不跑物理**。权威项：turn/version、45 秒杆计时（`TURN_TIMEOUT_MS`，`POOL_WS_TURN_MS` 可配）、暂停/重连/再来一局超时、房间串行锁 `busy`（`POOL_WS_NO_BUSY=1` 仅供协议测试）。
- `css/style.css`：手机竖屏 media 覆盖较多；改布局优先在末尾加 scoped override，避免与既有规则互相覆盖。

## 4. 在线对战协议与关键规则（务必保持第一视角语义）

- 房间：4 位纯数字 `0000-9999`；座位码重连；无 DB/账号。
- 出杆只传 `angle/power/spinX/spinY` +（自由球时）`cueX/cueY`；两端物理确定性已验证（8 例 × 16 球 × 5 字段 = 1280/1280 一致）。
- **权威状态广播**：每次结算后出杆方上报 `state_sync`（完整快照），对方强制对齐；重连用 `resume` 下发快照恢复，绝不重新开局。
- **服务器权威 45 秒限时**：客户端只显示倒计时，不再上报超时；服务器 `roomTick` 到点强制换手并广播 `turn_timeout`，带冷却防双触发；暂停冻结服务器时钟。
- 犯规自由球：`freeBallSeat` 全局归属，快照按座位重算 `ballInHand`；只有获球方能摆球，摆球位置经 `cue_placed` 同步。
- 暂停协同：甲暂停→乙显示遮罩+3 分钟倒计时+「恢复游戏」；乙可强制恢复；3 分钟超时判非暂停方胜。
- 再来一局：双方都点才 `start{rematch:true}`；请求方显示 3 分钟实时倒计时，超时 `room_closed` 全房断开。
- 金币：online 赢 +60 / 输 −30（`eco.pvpWin` 一半）；本地 pvp 共用存档谁赢都 +60。
- 换手/犯规文字必须站在第一视角：任何一端都看到「我/对手」「你的回合/对手回合」「轮到你/轮到对手」「你自由球/对手自由球」。

## 5. 当前已完成（最后几轮）

- 33+ 轮迭代汇总在 `docs/DEPLOY-internal.md` 顶部，按轮次倒序，每轮有根因与修复。
- 最近一轮：`60890f2` 服务器权威计时 + UI 清晰度（角度条上移、白球击球点、边框高亮、等待框对齐）。之前：`7554278` 第一视角文字/双向超时/输家扣金币；`c40c878` 对战条视角/超时换手/手机 UI。
- 线上验证：`wss://www.xingshuwen.com/pool-ws/` 建房/加入/转发实测通过；页面 HTTP 200；全量回归 0 失败。

## 6. 接手后优先做 / 已知待办

1. **用户仍在实测在线模式稳定性**：重点观察 45 秒超时换手、暂停恢复后计时、自由球超时、再来一局协商。用户报告过"偶尔不切"，已改服务器权威+冷却，仍需真人多局验证。
2. 手机 UI 仍可能需要细调：击球点弹窗 11 个按钮在极窄屏的换行、角度条离球台距离（用户要求"间距为之前一半"，已改但可再微调）。
3. `turnTime` 已从状态快照移除（本地显示用）；显示与服务器权威可能仍有亚秒偏差，若用户反馈数字跳动，优先查 `turn_sync.elapsed` 对齐逻辑。
4. 微信小游戏（`wechat-minigame/`）本轮明确不在范围，未维护；用户重新提出时再做。
5. `docs/DEPLOY.md` 是公开部署说明；`docs/DEPLOY-internal.md` 含内部凭据路径与部署记录，**不要进公开库**。
6. 每次改动后：`node tests/run_all.mjs` 必须全绿 → 构建 → 网页部署 → 服务器改动时强制 restart → 线上浏览器实测。

## 7. 常用验证脚本（在 tests/ 下）

- `full_match_sim.py`：两浏览器 AI 连打整局，逐杆比对两端全部状态（曾一次抓出 25 处分叉）。
- `real_scenario.py` / `screen_verify.py`：代入甲乙双方视角读屏幕文字（toast / VS 回合 / 对战条）。
- `timeout_bidir.py` / `foul_timeout_bug.py` / `timeout_verify.py`：超时换手方向、自由球超时、单次超时。
- `multi_verify.py` / `result_verify.py` / `pause_mechanism.py` / `three_features.py` / `auto_reconnect_verify.py`：金币、结果文案音效、暂停协同、自由球/读秒、断线自动重连。
- `net_server.test.mjs`（20 项协议）/ `net_e2e.test.mjs`（12 项双端一致）/ `cross_browser.test.py`（Chromium/Firefox/WebKit 确定性）。
- 临时压力测试脚本（短 `POOL_WS_TURN_MS`）验证连续 12 轮超时交替；如需复跑可重新写本地服务器测试，注意观察窗口必须 > 超时值但 < 2×超时值。
