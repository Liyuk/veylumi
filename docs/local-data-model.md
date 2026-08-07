# Veylumi 本地数据模型

当前 MVP 使用本地 Server API 加 JSON repository 作为轻量数据库。页面不使用浏览器 `localStorage`；数据结构按未来 D1/R2 拆分设计，方便后续替换服务端 repository。

## 顶层结构

```ts
{
  version: 1,
  authenticated: boolean,
  user: MockUser,
  savedProductIds: number[],
  analyses: AnalysisRecord[],
  photos: PhotoAsset[],
  feedback: RecommendationFeedback[]
}
```

## 记录职责

- `user`：本地 mock 登录账号。正式版对应用户表和 ChatGPT 授权身份。
- `analyses`：分析报告、创建时间、用户 ID、结果摘要和照片资源 ID。
- `photos`：照片元数据、保存策略、到期时间和删除时间。当前不把原图写入数据库；页面只在当前会话中使用预览 Data URL。
- `savedProductIds`：收藏商品 ID。正式版迁移为用户商品收藏关系表。
- `feedback`：用户对推荐结果的快速反馈（偏黄、偏深、偏干、偏油、不适合）。正式版迁移为推荐反馈事件表，用于复盘和个性化排序。

## 照片生命周期

- 默认策略为 `immediate`，分析完成后立即标记 `deletedAt`。
- 用户选择保存时改为 `3d`，`expiresAt` 设置为当前时间加 72 小时。
- 每次应用启动都会执行一次过期清理，将到期资源标记为删除。
- 云端版本需要将这一步替换为 R2 删除和定时任务，并增加失败重试与审计日志。

## 当前边界

本地 Demo 的 AI 分析、人脸检测和预览生成均有明确的 Mock/浏览器能力降级提示。接入真实模型时，页面只需要替换分析 repository，不改变上述数据结构。
