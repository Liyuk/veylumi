# Veylumi

Veylumi 是一个面向中国与美国用户的个性化美妆决策 Web App：从单人正脸照片开始，输出客观的面部/肤色观察、可执行的妆容方案、真实商品与色号、教程链接和历史记录。

## 产品范围

### V1：美妆闭环

- 用户登录、分析历史、商品收藏
- 只接受人类单人正脸照片，多人脸直接报错
- 肤色深度、undertone、脸型与可见肤质状态分析
- 妆容步骤、自然效果预览和具体注意事项
- 商品、色号、肤质、品牌市场与真实购买链接
- 图片默认不保存；用户主动同意时最多保存 3 天，到期删除

### V1.5：商品与内容发现

- 根据品牌/产品/色号寻找相近色号和替代产品
- 干皮、油皮、混合皮筛选
- 日韩/欧美品牌和中国/美国市场筛选
- 仅在有验证时间时标记“最新款”
- YouTube 官方搜索接入预留
- 小红书、抖音、Instagram 先使用公开直链或人工精选内容
- 博主/教程按平台、地区、语言、妆容风格和难度匹配

### V2：预留，不在当前 MVP 实现

- 身体信息建模
- 穿搭与配饰推荐
- 妆容和穿搭联动
- 虚拟试穿与更精细的视觉效果

V2 不会在 V1 中承诺精确尺码、版型或人体测量结果。

## Design system

项目采用 Radix Themes 作为交互组件和可访问性基础，Veylumi 品牌层独立维护在 `app/brand.css`，设计规则记录在 `docs/design-system.md`。品牌层负责色彩、排版、间距、圆角、阴影和美妆产品模式；Radix 负责主题能力与组件基础。

## 当前状态

当前仓库是可本地运行的前端 MVP：包含 mock 登录、本地历史记录、收藏、商品筛选、真实链接、教程入口、照片生命周期元数据和 V2 预留位。当前使用本地 Server API 加 JSON repository 作为轻量数据库，数据结构见 `docs/local-data-model.md`。AI 分析已支持本地 Codex/fixture；照片级 AFTER 默认接入 `gpt-image-2`，没有 API key 时自动使用明确标记的本地模拟预览（详见 `docs/local-api.md`）。预览文件私有化存储并带 TTL 清扫；demo 模式带进程级随机 token 鉴权与 Origin 白名单。真实 ChatGPT 认证、D1/R2、定时删除任务和正式商品数据同步仍需接入。

## 交付文档

- [**项目说明文档（含运行截图）**](docs/PROJECT.md)
- [V1 PRD](docs/PRD-v1.md)
- [V1 TRD](docs/TRD-v1.md)
- [本地数据模型](docs/local-data-model.md)
- [本地 API 与存储](docs/local-api.md)
- [产品小组竞品评审](docs/product-council-v1-review.md)
- [V2 预留范围](docs/V2-frozen.md)
- [组件边界与重构规则](docs/component-architecture.md)

## 本地运行

需要两个终端：先启动本地 Server API，再启动前端。

```bash
# 终端 1：本地 Server API（默认 http://127.0.0.1:8787）
npm run api:local

# 终端 2：前端（默认 http://localhost:3000）
npm run dev
```

`npm run api:local` 默认 demo 模式，AI 走本机 Codex CLI；切到零延迟 fixture：

```bash
VEYLUMI_AI_PROVIDER=local-mock VEYLUMI_IMAGE_PROVIDER=openai npm run api:local
```

更多环境变量见 [.env.example](.env.example) 与 [docs/local-api.md](docs/local-api.md)。

构建检查：

```bash
npm run build
npm run lint
npm run typecheck
```

## 纯静态版（GitHub Pages）

Veylumi 可以构建成**零后端、纯静态**的演示版本，部署到 GitHub Pages 等任何静态托管。

### 是什么

静态版把所有数据读写落到访问者的浏览器 **localStorage**：分析历史、收藏、设置都存在本地；分析结果使用与 API `local-mock` 相同的固定 fixture；推荐用与 API 网关相同的规则引擎生成。因此它**不需要 Cloudflare Worker、D1、R2 或任何后端进程**，任何人打开链接即可体验完整闭环（上传照片 → 分析报告 → 商品推荐 → 教程 → 历史）。

### 与完整版的区别

| | 本地完整版（`npm run dev` + `api:local`） | 静态版（GitHub Pages） |
| --- | --- | --- |
| 后端 | 本地 Server API（Codex / fixture 分析） | **无后端** |
| 数据存储 | 服务端 JSON repository | 访问者浏览器 localStorage |
| 照片上传 | 上传到本地 API，按策略保留/TTL 删除 | 仅在浏览器内处理，不上传 |
| 分析结果 | 真实 Codex 或 local-mock | 固定 fixture（顶部有「静态演示」徽标） |
| AFTER 预览 | gpt-image-2 或本地模拟 | 无生成预览，显示原图 |

### 本地构建与预览

```bash
# 构建静态产物（默认 base 前缀 /veylumi，适合 GitHub Pages 项目子路径）
npm run build:static

# 根域部署（或自定义域）时传空 base：
#   VEYLUMI_BASE_PATH="" npm run build:static

# 预览产物（在 apps/web/dist/client 起静态服务即可）
cd apps/web/dist/client && npx serve .
```

静态构建做了三件事：`output: "export"` 预渲染所有路由到 `apps/web/dist/client`；把资源引用改写成 `/veylumi/` 前缀（vite `base`）；用 `build/static-rewrite.mjs` 修正字体与 favicon 的根绝对引用。

### 部署到 GitHub Pages

仓库已带 [`.github/workflows/pages.yml`](.github/workflows/pages.yml)：push 到 `main` 自动构建静态版并发布到 `https://<owner>.github.io/veylumi/`。首次需要：

1. 打开仓库 **Settings → Pages**，把 Source 设为 **GitHub Actions**；
2. 推送后等待 workflow 完成，访问上面的地址。

> 注意：GitHub Pages 的 URL 是 `/<仓库名>` 子路径，前缀写死在构建配置里（`apps/web/next.config.ts` 的 vite `base` + `build/static-rewrite.mjs`）。如果换仓库名或想用根域部署，用 `VEYLUMI_BASE_PATH` 覆盖（见上）。

### 行为细节

- 页面右上角出现「静态演示」徽标表示当前是静态模式；`?static=1` 可强制指定，`?static=0` 强制走真实 API。
- 静态模式也会**自动降级**：本地 `npm run dev` 起前端但没起后端时，首次 API 请求失败会自动切到静态适配器，不会卡在错误屏。
- 静态版的 localStorage 数据与真实 API 数据互不相通，两者是独立的。
- 静态版**不包含** admin 运维页面的可用数据（它面向本地 API 的 metrics/logs）。
