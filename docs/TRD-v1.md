# Veylumi V1 TRD

版本：V1.0  
状态：执行中  
目标：先支持本地运行，再平滑迁移到 Cloudflare D1/R2 与真实视觉模型。

## 1. 技术原则

- 页面、领域模型、推荐规则和 AI provider 解耦。
- GPT 负责解释和编排，不独自承担测量、校验和商品匹配。
- 所有模型结果使用结构化 JSON，并记录 provider、版本和置信度。
- 本地 repository 与未来 D1/R2 repository 使用同一接口。
- 默认不保存原图；任何保存都必须有明确 retention。
- 所有推荐都要能解释来源，不使用黑箱排序作为唯一依据。

## 2. 分层架构

```text
UI / Radix Themes
  ↓
Application hooks / use-case functions
  ↓
Domain contracts
  ├─ PhotoInspectionService
  ├─ AnalysisService
  ├─ RecommendationService
  ├─ TutorialService
  ├─ FeedbackService
  └─ AuthService
  ↓
Repository interfaces
  ├─ LocalStorageRepository（当前）
  ├─ D1Repository（后续）
  └─ R2PhotoRepository（后续）
```

## 3. 当前本地实现

- React client + Vinext。
- `app/server-api.ts` 是页面唯一的数据访问入口，所有状态通过 Server API 读写。
- 本地开发 API 使用 `.data/veylumi.json`；未来可替换 SQLite/D1/Postgres repository。
- 当前原图不写入数据库；仅当前会话使用预览 Data URL，数据库存照片元数据。
- 启动时执行过期照片清理。
- Mock AI provider 返回稳定、可替换的结构化结果。

## 4. 领域模型

### User

```ts
type User = {
  id: string;
  displayName: string;
  email: string;
  market: "CN" | "US" | "other";
  createdAt: string;
};
```

### PhotoAsset

```ts
type PhotoAsset = {
  id: string;
  analysisId: string;
  name: string;
  mimeType: string;
  size: number;
  inspection: {
    faceCount: number | null;
    isFrontFacing: boolean | null;
    quality: "pass" | "warn" | "fail";
    warnings: string[];
  };
  retention: "immediate" | "3d";
  expiresAt: string;
  createdAt: string;
  deletedAt: string | null;
};
```

### AnalysisRecord

```ts
type AnalysisRecord = {
  id: string;
  userId: string;
  status: "queued" | "inspecting" | "analyzing" | "complete" | "failed";
  inputPhotoId: string;
  context: {
    market: "CN" | "US";
    skinSelfDescription?: "dry" | "oily" | "combination" | "normal" | "unknown";
    occasion?: string;
  };
  result: BeautyAnalysisResult;
  createdAt: string;
  completedAt: string | null;
};
```

### BeautyAnalysisResult

```ts
type BeautyAnalysisResult = {
  faceShape: Observation;
  complexion: Observation;
  visibleSkinCondition: Observation;
  makeupDirection: Observation;
  limitations: string[];
};

type Observation = {
  value: string;
  confidence: number;
  reasons: string[];
};
```

### MakeupStep

```ts
type MakeupStep = {
  id: string;
  order: number;
  area: "base" | "brow" | "eye" | "cheek" | "lip";
  title: string;
  action: string;
  amount: string;
  texture: string;
  avoid: string;
  productCategoryIds: string[];
  tutorialIds: string[];
};
```

### Product / Shade / Tutorial

```ts
type Product = {
  id: string;
  brandId: string;
  name: string;
  category: string;
  market: ("CN" | "US")[];
  skinTags: string[];
  finishTags: string[];
  retailerLinks: RetailerLink[];
  verifiedAt: string;
};

type Shade = {
  id: string;
  productId: string;
  name: string;
  normalizedColor: { l: number; a: number; b: number } | null;
  depth: number | null;
  undertone: "cool" | "neutral" | "warm" | "unknown";
};

type Tutorial = {
  id: string;
  platform: "youtube" | "xiaohongshu" | "douyin" | "instagram";
  url: string;
  creator: string;
  language: string;
  market: ("CN" | "US")[];
  tags: string[];
  stepIds: string[];
  productIds: string[];
  verifiedAt: string;
};
```

## 5. 推荐算法 V1

V1 采用可解释加权规则，不使用不可审计的端到端排序：

```text
score =
  0.30 * shadeDistance
  + 0.20 * undertoneMatch
  + 0.15 * skinCompatibility
  + 0.15 * finishMatch
  + 0.10 * marketAvailability
  + 0.10 * linkFreshness
```

输出必须包含：

- score
- matchedAttributes
- caveats
- sourceProduct/shade（如有）
- retailer link

没有标准化色值的产品只能作为“方向参考”，不能显示为高精度色号匹配。

## 6. AI Provider 契约

```ts
interface AnalysisProvider {
  inspectPhoto(input: PhotoInput): Promise<PhotoInspection>;
  analyzeBeauty(input: BeautyAnalysisInput): Promise<BeautyAnalysisResult>;
  generatePreview?(input: PreviewInput): Promise<PreviewResult>;
}
```

实现顺序：

1. `MockAnalysisProvider`
2. 浏览器/服务端人脸检测 provider
3. 真实视觉模型 provider
4. GPT 文本组织 provider
5. 图片生成 provider

## 7. 本地 API/Use-case 契约

即使当前不启动后端，也按以下 use case 组织：

- `auth.signInDemo()`
- `auth.signOut()`
- `analysis.create(input)`
- `analysis.retry(id)`
- `analysis.list(userId)`
- `analysis.get(id)`
- `photo.setRetention(id, retention)`
- `photo.purgeExpired()`
- `catalog.findShadeAlternatives(input)`
- `catalog.listProducts(filters)`
- `tutorials.list(filters)`
- `favorites.toggle(userId, productId)`
- `feedback.create(input)`

## 8. 迁移到云端

- D1：User、Analysis、Observation、MakeupStep、Product、Shade、Tutorial、Favorite、Feedback、AuditLog。
- R2：原图和生成图；对象 key 必须包含 userId/analysisId，不能使用可猜测路径。
- Queue/Cron：清理到期照片、验证商品链接、刷新教程状态。
- Worker API：鉴权、上传签名 URL、分析任务、历史查询和删除。
- 真实 GPT key 只能在服务端使用，不能进入浏览器 bundle。

## 9. 安全和隐私

- 不在客户端保存真实授权 token。
- 图片输入严格限制 MIME、大小和数量。
- 原图默认立即删除。
- 用户可主动删除历史和照片。
- 反馈不能包含诊断性医疗结论。
- 记录 AI provider 和提示词版本，支持结果追溯。
- 日志不得写入原图和完整个人敏感信息。

## 10. 可观测性

记录以下事件：

- `analysis_started`
- `photo_rejected`
- `analysis_completed`
- `product_viewed`
- `tutorial_opened`
- `product_saved`
- `recommendation_feedback_submitted`
- `photo_deleted`

## 11. 验证计划

- 单元：local-db、过期清理、推荐评分、过滤器。
- 组件：登录/退出、上传失败、报告、收藏、反馈。
- 浏览器：桌面和移动端、刷新持久化、页面切换、退出恢复。
- 安全：非法图片、超大图片、过期资源、空推荐、失效链接。
