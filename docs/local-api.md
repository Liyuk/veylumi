# Veylumi 本地 API 与存储

开发阶段可以运行：

```bash
npm run api:local
```

服务默认监听 `127.0.0.1:8787`，数据文件默认写入 `.data/veylumi.json`，不会提交到仓库。当前提供：

- `GET /health`：健康检查。
- `GET /api/state`：读取本地状态快照。
- `POST /api/state`：写入完整状态快照。
- `POST /api/analyze`：接收本地图片 Data URL，立即返回 `202 { jobId, status: "queued" }`，不会同步阻塞等待 Codex；不会把图片二进制写入 JSON 数据库。
- `GET /api/analyze/:jobId`：读取异步任务状态。状态为 `queued`、`running`、`completed` 或 `failed`；完成后返回 `provider`、结构化分析、8 步妆容计划、风格/色彩/肤况结果和可选 `previewImageUrl`。
- `GET /api/analyze/:jobId/events`：Server-Sent Events 完成通知；发送状态变化，进入 `completed` 或 `failed` 后关闭连接。前端连接失败会自动回退轮询。
- `POST /api/analyze/:jobId/preview`：删除该任务生成的预览文件；只接受服务自己生成的 `/generated/<filename>` 路径。

默认 `VEYLUMI_MODE=demo` 只适合本机联调。非 Demo 模式应配置 `VEYLUMI_ALLOWED_ORIGIN`、`VEYLUMI_API_TOKEN` 和 `VEYLUMI_ADMIN_TOKEN`；客户端联调时可通过 `NEXT_PUBLIC_VEYLUMI_API_TOKEN` 发送 Bearer token。这个 token 只是部署边界保护，不等同于多租户身份系统，正式上线仍应放在有登录、租户隔离和反向代理鉴权的服务后面。

上传接口服务端会再次校验 Data URL 的 MIME、文件签名和 10MB 大小上限；不能只依赖浏览器的 `accept` 属性。队列默认单并发，可用 `VEYLUMI_ANALYSIS_MAX_CONCURRENT` 调整；当前 JSON 队列适合单进程本地运行，不适合多实例生产部署。

设置 `VEYLUMI_AI_PROVIDER=local-mock` 可切回零延迟固定 fixture，用于完整链路模拟。默认 provider 是 `codex`，服务端通过本机 Codex CLI 执行。照片级 AFTER 使用 `gpt-image-2`：设置 `VEYLUMI_IMAGE_PROVIDER=openai` 和 `OPENAI_API_KEY` 后，Server 会先完成 Codex JSON 分析，再调用 `/v1/images/edits`，把原图和 `previewPrompt` 交给图像编辑模型，最后把 PNG 写入 `public/generated/` 并返回 `previewImageUrl`。没有 `OPENAI_API_KEY` 时，Demo 模式会返回明确标记的 SVG 本地模拟预览；非 Demo 模式会失败并要求配置 key。未启用图像 provider 时，Server 也返回非照片级 SVG 分析预览，并在页面显示免责声明。

照片级本地联调示例：

```bash
OPENAI_API_KEY=... \
VEYLUMI_AI_PROVIDER=codex \
VEYLUMI_IMAGE_PROVIDER=openai \
VEYLUMI_IMAGE_MODEL=gpt-image-2 \
npm run api:local
```

无 key 的本地模拟：

```bash
VEYLUMI_AI_PROVIDER=local-mock \
VEYLUMI_IMAGE_PROVIDER=openai \
npm run api:local
```

建议客户端为每次用户提交生成唯一 `Idempotency-Key` 请求头。重复提交同一 key 会返回已有任务，不会重复启动 Codex。任务状态、结果和重试次数保存于 `VEYLUMI_ANALYSIS_QUEUE_FILE` 指定的 JSON 文件，默认是 `.data/analysis-jobs.json`；本地服务重启会恢复 `queued/running` 任务。任务完成或失败后，队列文件只保留文件名、MIME 和大小等输入摘要，不继续保留图片 Data URL。

`server/local-repository.mjs` 是存储边界。页面通过 `app/server-api.ts` 读取和写入 Server API；API 不可用时页面会显示连接错误，不回退到浏览器存储。以后替换 SQLite、Postgres 或 Cloudflare D1 时，只需替换 Repository 实现。

照片二进制不应写入这个 JSON 数据库；生产实现需要对象存储、到期任务和不可恢复删除，数据库只保存 asset metadata、retention 和 expiresAt。

本地完整运行需要两个终端：

```bash
npm run api:local
npm run dev
```
