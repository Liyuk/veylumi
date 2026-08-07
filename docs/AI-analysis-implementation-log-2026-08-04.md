# Veylumi AI 分析实现记录（2026-08-04）

这份记录给后续 Claude 修复和继续开发使用，描述当前代码真实状态，不等同于未来能力承诺。

## 已完成

- Server API 使用异步任务：`POST /api/analyze` 返回 `202 + jobId`，`GET /api/analyze/:jobId` 查询状态。
- provider 可切换：默认调用本机 Codex CLI，`VEYLUMI_AI_PROVIDER=local-mock` 用于零延迟联调。
- Codex 子进程通过 stdin 结束、独立临时目录和 JSON Schema 输出，避免同步调用挂起。
- 结构化结果已扩展为面部观察、色彩季型、肤况观察、3 个风格匹配、8 步妆容计划和 preview prompt。
- 报告页不再把所有用户写成韩式妆容；主标题使用最高分风格，韩系只是候选之一。
- 前端通过 SSE 等待完成通知，连接异常时回退轮询；完成后才写入历史，失败只提示重试，不创建完成记录。

## 参考文档到实现的映射

| 需求来源 | 当前落地 |
| --- | --- |
| `reference/01-makeup-course.md` | `app/v1-domain.ts` 与 local mock 共同提供 8 步：妆前、遮瑕、粉底、提亮、定妆、修容、眼妆、收尾 |
| `reference/02-ai-beauty-report.md` | 报告展示 face notes、风格适配、色板、肤况观察、8 步方案；AFTER 使用基于 Codex 分析结果生成的非照片级 SVG 预览 |
| `reference/03-visual-prompt-guidelines.md` | `previewPrompt` 要求保留身份和自然肤理，并带生成免责声明 |

## 实测结果

### local-mock

输入 `demo/face.jpeg`，返回：

- 状态：`queued → completed`
- 主方案：`柔和暖中性日常妆`
- 候选风格：3 个
- 教学步骤：8 个
- 预览图：无，`previewImageUrl: null`

### codex-local（真实复测）

输入 `demo/face.jpeg`，返回：

- 状态：`queued → running → completed`
- provider：`codex-local`
- 主方案文案：`Soft, balanced definition with warm, fresh color accents`
- 候选风格：3 个
- 教学步骤：8 个
- 预览图：`/generated/codex-708633ef-a75f-4875-a7c5-43d425278fa4.svg`
- 结果：真实 API 已完成，`previewImageUrl` 非空；浏览器页面 AFTER 已绑定该资源

## 本轮已补齐（2026-08-04 后续）

- `server/analysis-jobs.mjs` 改为 JSON 持久化队列，落盘任务状态、尝试次数、结果和恢复所需输入。
- 支持 `Idempotency-Key`，重复提交返回原任务，不重复执行。
- Codex/mock 临时失败最多自动重试 3 次，达到上限后进入 `failed`。
- 新增 `/api/analyze/:jobId/events` SSE 完成通知；前端优先使用 SSE，异常时回退轮询。
- 服务启动时将 `running` 恢复为 `queued`，继续执行未完成任务。
- 删除未被 Server API 使用的旧 `app/ai/provider.ts` 和 `app/ai/prompts.ts`，避免两套 AI provider 契约并存。
- Codex provider 不再要求 Codex 在结构化分析调用内同时写 preview 文件，避免分析 + 文件创作导致超时；Server 在拿到真实分析 JSON 后生成带免责声明的非照片级 `preview.svg`。
- 前端上传后立即显示 loading；轮询增加 3 分钟客户端截止时间，避免 worker 重试期间无限等待。
- 新增 `server/image-edit-provider.mjs`：配置 `VEYLUMI_IMAGE_PROVIDER=openai` 后，Codex 完成 JSON 分析，再通过图像编辑接口生成照片级 PNG；无 `OPENAI_API_KEY` 时显式失败，不伪造照片效果。
- Ollama 图像生成路径已移除：实测 `x/flux2-klein:4b` 无法稳定保持身份，继续保留会让本地配置产生不可靠的照片级预期。
- Codex 分析提示词补充中文文案约束：面向用户的分析字段和免责声明使用中文；仅图像模型使用的 `previewPrompt.prompt` 与 `negativePrompt` 保持英文。
- 照片级图像 provider 默认切换为 `gpt-image-2`；无 `OPENAI_API_KEY` 时返回带明确标记的本地 SVG 模拟预览，避免本地运行因为缺 key 失败或把占位图误称为真实试妆。

## 给后续修复的优先事项

1. 配置图像 API key 后完成真实两阶段 API 验收，并继续做身份保持、照片级试妆和质量评测。
2. 将本地 JSON 队列替换为 Redis/数据库队列，增加多实例锁、超时回收和持久化通知。
3. 将 Codex 的英文输出统一为中文用户文案，或在 schema 中增加 `locale` 并在服务端做可追踪的文案转换。
4. 继续补齐三庭五眼、眼型/唇形等局部字段和视觉标注图，但必须保留“照片条件下观察、非医疗判断”限制。
5. 不要把“结构化分析卡片”称为“照片级试妆”；真实试妆需要稳定的图像编辑/生成模型和身份保持评测。

## 浏览器端到端验收（2026-08-04）

- 前台 `/`：概览不再固定韩式妆容，显示“最适合你的妆容 / 分析后生成”；历史示例显示“柔和暖中性日常妆”。
- 前台上传 `demo/face.jpeg`：完成 `POST 202 → GET job → SSE events → POST /api/state`，报告显示主方案、3 个风格候选、色彩季型、肤况观察和 8 步计划。
- Admin `/admin`：显示 `/api/analyze`、任务查询、SSE、状态和错误率；实测当前实例错误率为 0%。
- 浏览器验收发现并修复 `Idempotency-Key` 未列入 CORS allow headers 的问题。
- 浏览器验收发现 vinext 开发环境下 `next/link` 触发 invalid hook call，Admin 返回前台已改为本地按钮导航；修复后浏览器控制台无新增 error。

## 验证命令

```bash
npm test
npm run lint
VEYLUMI_AI_PROVIDER=local-mock npm run api:local
```

真实 Codex 模式：

```bash
VEYLUMI_AI_PROVIDER=codex VEYLUMI_CODEX_TIMEOUT_MS=120000 npm run api:local
```
