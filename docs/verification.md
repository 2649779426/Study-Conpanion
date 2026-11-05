# 参赛 Demo 验证记录

验证日期：2026-11-05（北京时间）。环境：Windows / Node.js 24.21.0 / pnpm 10.22.0。

## 最终检查

| 命令 | 结果 | 输出摘要 |
| --- | --- | --- |
| `pnpm lint` | 退出 0 | 无错误、无告警 |
| `pnpm exec tsc --noEmit` | 退出 0 | 无类型错误 |
| `pnpm test` | 退出 0 | 5 个测试文件，32 项全部通过 |
| `pnpm build` | 成功 | Next.js 16.4.5 编译、类型检查、静态页面生成均完成；随后 `&& pnpm start --port 3124` 实际启动 |

测试覆盖北京时间 UTC+8 零点/跨年、同日打卡覆盖、连续与断签、跨日任务重置、旧模板迁移、加练精简不累加、称呼替换、场景与最终文案选片、提醒每日去重、未完成条件、手动触发、真实消息去重、异步视频下载/失败/并发/重载、API 无凭据响应及本地视频 Range。DOM 集成用 happy-dom 验证后台选中条目保持、重置确认、跨页调度和真实新文案朗读，不启动浏览器。

## 生产 HTTP 冒烟

3123 端口在验收前已被其他进程占用，因此保留该进程，选择空闲的 3124。实际执行 `pnpm build && pnpm start --port 3124`，用 curl 检查：

| 请求 | HTTP |
| --- | --- |
| `GET /` | 200 |
| `GET /plan` | 200 |
| `GET /checkin` | 200 |
| `GET /admin` | 200 |
| `GET /api/chanjing/status` | 200，`configured=false` |
| `POST /api/chanjing/broadcast`（无凭据） | 503 |
| `GET /api/chanjing/broadcast?id=missing` | 404 |
| `GET /videos/opening.mp4`，`Range: bytes=0-31` | 206 |

现有配置使用 `output: standalone`，Next 在 `next start` 时给出应使用 standalone 入口的提示；上述指定的启动命令仍完成实际运行和所有 HTTP 检查，未为消除提示更改原有输出配置。

验收服务 PID 332 已按确认过的命令行（Next start，端口 3124）停止，启动会话退出；再次检查 3124 无监听、无遗留 Next 服务。没有打开浏览器，没有停止原有 3123 服务或其他任务的 Node 进程。主动停止服务的退出码不影响已经成功完成的 build 和 HTTP 检查。

## 资源与验证边界

- 用 `rg --fixed-strings` 检查 src/scripts 中的图片引用后，经 `git rm` 移除 34 张无引用图片。
- `public/videos/acceptance.*`、三个真实预生成视频及原始 WAV 全部保留。
- 没有蝉镜凭据，未运行真实生成、扣费或上游验收脚本。数字人异步协议使用 mock fetch 测试，上游真实生成与最终听感需要有凭据的环境复核，界面明确禁用而不伪造完成。
- 按简报未打开浏览器，未做真人视觉/听感验收；进行了实际生产 HTTP 检查和 DOM 交互测试。
- 原有 PNG 素材未附完整作者和许可记录，README 如实说明来源尚不可核实。
