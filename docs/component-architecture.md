# Veylumi 组件边界

页面组件只负责组合业务状态和布局，不直接重复定义通用视觉模式。

## 基础组件

`apps/web/app/components/ui.tsx` 负责跨页面复用的展示与交互组件：

- `ProductLikeButton`：商品收藏状态、标签和统一点击区域。
- `Metric`：面部分析指标。
- `PlanStep`：妆容步骤行。
- `CheckItem`：上传前检查项。
- `TutorialCard`：教程入口卡片。

`apps/web/app/components/beauty.tsx` 负责美妆领域展示组件：

- `MatchedProductRow`：分析报告中的推荐商品行。
- `CatalogCard`：商品发现页卡片。
- `CatalogFilters`：参考色号、肤质和市场筛选。
- `TutorialGrid`、`CatalogNotice`：教程入口与商品数据说明。

`apps/web/app/catalog-data.ts` 只存放本地商品、教程和示例历史数据，不包含 JSX 或页面状态。

## 页面层

`apps/web/app/page.tsx` 只保留：

- 页面路由状态和本地数据库状态；
- 上传、人脸检查、保留周期、反馈等用例；
- `Overview`、`AnalyzePage`、`LibraryPage`、`HistoryPage`、`SavedPage` 的页面编排。

## 领域层

`packages/domain/analysis.ts` 负责商品匹配、妆容步骤和教程关联，不依赖 React 或 CSS。

## 约束

- 图标只使用 `@radix-ui/react-icons`，不在页面中直接绘制第二套 icon。
- 图标尺寸分为 14px 内容图标、16px 标准图标、20px 强调图标；图标按钮最小点击区域为 32px。
- 商品、教程、分析报告的卡片结构必须通过组件复用，避免在各页面复制收藏、外链和状态逻辑。
- 页面组件不得直接保存商品推荐规则；推荐规则必须留在领域层。
- 旧版页面实现只允许作为迁移参考，不得重新接入主路由。
