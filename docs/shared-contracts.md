# 跨端共享边界

Web、Android 与 iOS 共用服务端 REST API，但不共用 UI 代码。共享内容必须从下列包读取，应用层不得复制这些值或规则。

| 包 | 唯一来源 | 使用方 |
| --- | --- | --- |
| `packages/api-contract` | OpenAPI、错误 envelope、状态 operation、API fixtures | API 服务与三端客户端 |
| `packages/catalog` | 商品与教程目录 | API 与 Web；移动端从 API 读取 |
| `packages/client-contract` | API 地址、上传限制、轮询限制 | Web、Android、iOS |
| `packages/recommendation-contract` | 候选资格、基础评分权重与不变量 | `packages/domain` 及未来原生排序实现 |
| `packages/i18n` | 语义 key 与中文/英文翻译 | 三端生成的平台资源 |
| `packages/design-tokens` | 颜色、间距、圆角、排版 token | 三端生成的平台资源 |
| `packages/ui-spec` | 组件语义、可访问性和交互下限 | 三端 UI 实现 |

## 状态写入

`/api/state` 是唯一的状态资源。新功能使用 `PATCH` 并携带一个 `operation`：`toggleSavedProduct`、`updateSettings` 或 `addFeedback`。每次写入必须带 `If-Match` revision；收到 `409` 后重新读取状态并用相同 operation 重试。

保留 `POST /api/state` 仅供迁移期的完整快照客户端兼容，不应用于新的局部操作。

## 推荐规则

`packages/recommendation-contract/rules.json` 定义所有平台都必须遵守的候选资格、基础评分与推荐理由。客户端可以根据其交互特点重新排序**基础评分相同**的候选项（例如移动端优先展示易购买项），但不能：

- 改变资格判断或基础分数；
- 让低分候选越过高分候选；
- 显示与共享匹配理由不一致的推荐。

规则版本变更时，必须同时更新 fixtures 与三端的契约验证。
