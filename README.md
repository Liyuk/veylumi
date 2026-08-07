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
