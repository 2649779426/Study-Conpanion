# 参赛 Demo 验证记录

验证日期：2026-11-05（北京时间）。环境：Windows / Node.js 24.21.0 / pnpm 10.22.0。

## 第五轮：晓妍三场景预置素材（最新，review 语气词待听核）

按 `../_codex/brief_demo_r5.md` 执行。初始 `git status --short` 为空，分支 `fix/competition-demo`，没有中断遗留改动。保持晓妍-青春和客户已确认的带货小悦；不开浏览器、不 push、不输出凭据。

- 三条种子按简报逐字更新。逐场景比较旧种子原文，只有完全相等才迁移；用户编辑过的内容（包括空格或标点变化）、标题及其他设置保留。迁移回归先观察到两个失败再修复。
- opening、review 各创建一次语音任务和一次视频任务，均成功，无重试。reminder 直接复用第四轮样片，源文件和预置文件 SHA-256 相同。没有生成 acceptance 或其他场景，没有查询实际账单金额。
- 生成脚本只允许显式指定 opening/review，从 seed.ts 读取原文，核对指定形象和音色；请求前落盘尝试状态，已有文件/尝试记录或其他失败/未完成记录时停止，避免重复计费。
- MP4、抽取的 PCM WAV、0.5 秒的 720×1280 JPG 已全部替换。三张封面已目视确认晓妍形象。`acceptance.*` 三个文件 SHA-256 均保持不变。
- `PRESET_AVATAR` 同步实际形象和音色。新增三场景匹配测试先红后绿；DOM 测试同步第五轮预期，并继续覆盖旧文昊配置不匹配、配置请求失败时回退和禁止生成。

### 转写逐字对照

使用 faster-whisper `large-v3`、CPU `int8`、`language=zh`、`vad_filter=False`，设置 `PYTHONIOENCODING=utf-8`，使用本机已有模型缓存。原始转写未被手工改写；忽略标点/空格后的差异如下，其余文字与种子一致：

| 场景 | 初次转写差异 | 结论 |
| --- | --- | --- |
| opening | 「督学」识别为「读学」 | 仅这一处同音/近音字识别差异，领域词上下文及局部复核仍保留该结果 |
| reminder | 「马原」识别为「马员」，「四十」写成「40」 | 属简报允许的同音识别差异和等价数字写法 |
| review | 「今天辛苦啦」识别为「今天辛苦了」 | 全片、加领域词及局部复核均存在；约 0.54–0.72 秒，待实际听核，不能宣称逐字验收通过 |

review 的 ASR 差异无法单靠转写判断是识别误差还是实际发音差异，已向用户询问实际听感。没有擅自修改种子迎合识别结果，也没有重新生成。工程替换和检查已完成，严格话术验收保留这一项未确认。

完整文本、时间段及逐字对照位于仓库外 `../_codex/sample/{scene}_r5_transcript.json`、`r5_asr_recheck.json`、`r5_transcript_comparison.json`；生成尝试记录在 `{opening,review}_r5_generation.json`。

### ffprobe

| 场景 | 时长 | 视频 | 音频 | 封面 |
| --- | --- | --- | --- | --- |
| opening | 8.680 秒 | 1080×1920 / H.264 / yuv420p | AAC / 48kHz / 单声道 | 720×1280 |
| reminder | 8.200 秒 | 1080×1920 / H.264 / yuv420p | AAC / 48kHz / 单声道 | 720×1280 |
| review | 8.840 秒 | 1080×1920 / H.264 / yuv420p | AAC / 48kHz / 单声道 | 720×1280 |

完整探测及样片/预置 SHA-256 在 `../_codex/sample/r5_ffprobe.json`。平台整数时长与本地 ffprobe 时长不同，以上采用实际文件结果。

### 工程与生产验收

| 命令 | 结果 |
| --- | --- |
| `pnpm lint` | 退出 0，无错误、无告警 |
| `pnpm exec tsc --noEmit` | 退出 0，无类型错误 |
| `pnpm test` | 退出 0，7 个文件 69 项全部通过 |
| `pnpm build` | 退出 0，编译/类型检查成功，8/8 静态页面生成 |

生产运行 `pnpm start --port 3125`，curl 检查 `/`、`/plan`、`/checkin`、`/admin`、`/review`、`/api/chanjing/status` 和 `/videos/{opening,reminder,review,acceptance}.{mp4,jpg}`，共 14 项全部 HTTP 200。生产状态接口的公开形象/音色 ID 确认为晓妍/带货小悦。保留原 `output: standalone` 配置，`next start` 给出原有入口提示，实际请求均成功。

仅停止核验过的本轮 3125 进程；完整启动进程链（39656/31724/26948/28588/31704/26656/15964）残留 0、3125 监听 0、本轮 Python 转写进程残留 0。主动停止服务导致启动会话非零退出，不影响此前构建和 HTTP 成功结果。四项检查输出及 HTTP 明细在仓库外 `../_codex/sample/r5_*.log`、`r5_checks.json`、`r5_http.json`。

## 第三轮：学习回顾与成果可视化（历史）

按 `../_codex/brief_demo_r3.md` 执行，分支 `fix/competition-demo`，初始工作区干净。本轮不开浏览器，不调用语音/视频生成接口，不输出凭据，不 push。

| 命令 | 结果 | 输出摘要 |
| --- | --- | --- |
| `pnpm install` | 退出 0 | Lockfile is up to date / Already up to date |
| `pnpm lint` | 退出 0 | 无错误、无告警 |
| `pnpm exec tsc --noEmit` | 退出 0 | 无类型错误 |
| `pnpm test` | 退出 0 | 7 文件，62 项通过（原 47 项 + 本轮 15 项） |
| `pnpm build` | 退出 0 | Next.js 16.4.5 编译、TypeScript、9/9 静态页面生成成功，新增 `/review` |

- 专注测试：暂停续上与不足一秒余量、分钟向下取整、重复开始不重置、切换单任务、序列化刷新恢复、跨北京时间午夜拆天且不重复结算、提交打卡与换模板前结算、保留任务标题及科目秒数/计划快照。
- 成果测试：14 天零值补齐及区间边界、打卡完成率、各科按秒计算占比、零数据、本周一至今天对比完整上周的增减/百分比/零基数、未完成科目、纯专注日期回顾、加练/精简快照。
- 样例测试：载入幂等、断签、跳过已有真实数据日期、保留今天及活动计时、清除只删 sample。所有示例打卡及专注记录均带 `sample: true`。
- happy-dom 集成共 16 项：原功能回归、新增首页开始/打卡暂停/刷新续计/单任务切换/结束/复盘实际摘要；首页、打卡、成果三页醒目样例标签与清除；成果空态/14 日图点击/SVG 占比/时间线/浏览器朗读与离页停止；后台载入及重置清空计时和样例。
- 独立只读代码审查通过：需求符合度、实现质量均未发现确证问题，报告在 `../_codex/r3-review-report.md`。

构建成功后实际 `pnpm start --port 3125`，curl 检查以下路径全部 200：`/`、`/plan`、`/checkin`、`/admin`、`/review`、`/api/chanjing/status`、`/lesson.png`。状态接口 `configured=true`，仅读取布尔值。保留原有 standalone 配置，next start 有入口提示，但服务正常响应。未调用 broadcast 生成端点。

验收服务 PID 36460 按命令行 `next start --port 3125` 及父进程确认后停止；此次完整进程链 9484/26668/32820/16460/23848/35268/36460 残留数 0，3125 监听数 0，没有停止其他进程。

数字人候选：脚本 `scripts/chanjing-list-avatars.mjs` 仅调用 `/access_token` 和分页 `/list_common_dp`，每页 20、ID 去重并限 200。接口报告总数 2741，本轮导出前 200 个，保存 name/id/gender/figure 类型、宽高及预览字段；封面位于 `figures[].cover`，下载 200 张并用 ffmpeg 拼出中文姓名联系表。`../_codex/avatars/avatars.json`、`contact.jpg` 和 `REPORT.md` 为真实只读结果，已目视查看联系表。最初只检查顶层字段而误判无封面，已复核嵌套字段及分页并修正。测试联系表 `test-contact.jpg` 单独命名，不作为真实候选结果。

验证边界：未做浏览器视觉/真实语音听感验收；计时、展开/选择及语音调用使用 DOM 模拟验证，浏览器和系统实际声音取决于 Web Speech 支持。计时依据开始时间，页面关闭期间也会继续计算，离开前应暂停；未添加空闲检测。

## 第二轮返工验证（历史）

按 `../_codex/brief_demo_r2.md` 执行，分支 `fix/competition-demo`。未启动浏览器，使用真实 ffmpeg 抽帧、DOM 集成测试和生产 HTTP 验收。

| 命令 | 结果 | 输出摘要 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 退出 0 | Lockfile is up to date / Already up to date |
| `pnpm lint` | 退出 0 | 无错误、无告警 |
| `pnpm exec tsc --noEmit` | 退出 0 | 无类型错误 |
| `pnpm test` | 退出 0 | 5 文件，47 项通过 |
| `pnpm build` | 成功 | Next.js 16.4.5 编译、TypeScript、8/8 静态页面生成成功，随后 `&& pnpm start --port 3125` 启动 |

第二轮回归先观察失败再修复：十分钟窗口外仍触发、晚间首次打开排队补弹、缺失生成封面、JPG 路由 404、首页/打卡页重复播放器、后台缺少去首页操作。另捕获并修复首页开场计时与提醒竞争造成的关闭后重播。

- 调度覆盖：窗口前、起点、截止前一秒、截止点、晚间打开；错过记录去重与序列化重载保留已读；跨北京时间日界后重新触发；23:55 规则不绕回次日早晨；过窗队列及旧版无窗口自动队列不补播。
- 播放覆盖：预置及生成来源的 poster 匹配、生成后封面持久化及读取、ffmpeg 不可用时视频仍完成且不提供虚假封面、JPG 路由 MIME/404/扩展名校验、原视频 Range 行为不变。
- DOM 集成 10 项：原后台操作回归；首页/打卡页只保留一个视频、横幅及正确场景选片；compact 排队/下一条/去首页/关闭；21:15 首次仅两条已错过消息、真实未读数和打开清零；开场计时竞争不重播。
- 真实 ffmpeg 从 `public/videos/*.mp4` 的 0.5 秒处抽取 4 张 JPG，ffprobe 均为 720×1280；已查看 opening.jpg，确认白底真人画面。标准框使用 9:16 和 cover，紧凑框高 200px 并居中裁切，文案最多 3 行。桌面预留卡片右侧区域，窄屏卡片进入文档流；首页网格按内容高度起始对齐。

3125 验收前无监听，实际执行 `pnpm build && pnpm start --port 3125` 后用 curl 检查：

| 请求 | HTTP |
| --- | --- |
| `/`、`/plan`、`/checkin`、`/admin` | 全部 200 |
| `/api/chanjing/status` | 200，`configured=true` |
| `/videos/{opening,reminder,review,acceptance}.jpg` | 全部 200，`image/jpeg` |
| `/videos/opening.mp4`，`Range: bytes=0-31` | 206 |
| `/generated/<不存在的64位hash>.jpg` | 404 |
| `/api/chanjing/broadcast?id=missing` | 404 |

本轮本地配置状态已与第一轮不同，仅读取布尔状态，没有读取/输出凭据，没有发起真实生成任务；生成链路和无凭据 503 使用单测验证。没有进行浏览器视觉、出声或上游真实生成验收。原有 `output: standalone` 在 `next start` 时仍给出入口提示，实际服务可运行并完成全部 HTTP 检查。

验收服务 PID 39076 经命令行和父进程身份核验后停止。会话已退出；复查此次进程链（27636/30044/16904/25668/39076）残留数 0，3125 监听数 0。服务主动停止导致的退出码不影响此前成功构建和 HTTP 结果；未停止其他任务进程。

## 第一轮历史：最终检查

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
