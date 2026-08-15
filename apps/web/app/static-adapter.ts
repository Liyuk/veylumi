"use client";

// 纯静态版适配层（GitHub Pages 部署，无任何后端）。
//
// 契约与 server-api.ts 保持一致（页面只 import server-api，不直接 import 本文件）：
// 所有数据读写都落到浏览器 localStorage，分析结果使用与 API local-mock 相同的
// 结构化 fixture，推荐用与 API 网关相同的 rules 引擎 rankCandidates 生成。
// 这样静态版和 API 版看到的数据、分析和推荐保持同构，页面代码零改动。

import { LocalDb, emptyDb, makeId, purgeExpiredPhotos } from "./local-db";
import type { LocalAnalysisPayload } from "./server-api";
import type { AnalysisJob, RecommendationResponse, StateOperation } from "../../../packages/api-contract/generated/types";
import { rankCandidates as rawRankCandidates } from "../../../packages/recommendation-contract/engine.mjs";
import { products } from "./catalog-data";

// engine.mjs 没有类型声明，显式声明静态版用到的签名（与 API 网关调用方式同构）。
type RankContext = { undertone: string; skin: string; region: string; categoryId: string | null };
type RankInput = { context: RankContext; products: unknown[]; limit?: number; fallback?: boolean };
const rankCandidates = rawRankCandidates as unknown as (args: RankInput) => RecommendationResponse;

const DB_KEY = "veylumi.localdb.v1";

// 模式判定：?static=1 参数 > localStorage 记住的偏好 > 构建期 base 自动识别
// （GitHub Pages 子路径部署时 vite base=/veylumi/，说明这是静态部署）。
// 都没有时默认走 server-api 的真实 API，API 不可达再由 failover 切到静态版。
function buildBaseUrl(): string {
  try {
    return ((import.meta as { env?: Record<string, string> }).env?.BASE_URL ?? "/") || "/";
  } catch {
    return "/";
  }
}

export function isStaticMode(): boolean {
  if (typeof window === "undefined") return false;
  const override = new URLSearchParams(window.location.search).get("static");
  if (override !== null) return override !== "0" && override !== "false";
  try {
    if (window.localStorage.getItem("veylumi.static-mode") === "1") return true;
  } catch {
    // 存储不可用时忽略偏好。
  }
  return buildBaseUrl() !== "/";
}

function loadDb(): LocalDb {
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (!raw) return emptyDb();
    const parsed = JSON.parse(raw) as LocalDb;
    return purgeExpiredPhotos({ ...emptyDb(), ...parsed });
  } catch {
    return emptyDb();
  }
}

function saveDb(db: LocalDb): LocalDb {
  const persisted = { ...db, revision: db.revision + 1, version: 1 as const };
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(persisted));
  } catch {
    // 存储不可用（隐私模式/配额满）时退化为内存态，不阻断演示。
  }
  return persisted;
}

// 与 server-api 的乐观锁合并不同：静态版没有远端并发，本地值永远胜出，
// 因此不存在冲突合并这一环。

export async function staticFetchDb(): Promise<LocalDb> {
  return loadDb();
}

export async function staticSaveDb(db: LocalDb): Promise<LocalDb> {
  return saveDb(db);
}

export async function staticApplyStateOperation(operation: StateOperation, revision: number): Promise<LocalDb> {
  // 静态版无远端并发，乐观锁 revision 仅用于契约对齐，本地值永远胜出。
  void revision;
  const db = loadDb();
  let next: LocalDb = db;
  if (operation.operation === "toggleSavedProduct") {
    const wasSaved = db.savedProductIds.includes(operation.productId);
    next = { ...db, savedProductIds: wasSaved ? db.savedProductIds.filter((id) => id !== operation.productId) : [...db.savedProductIds, operation.productId] };
  } else if (operation.operation === "updateSettings") {
    next = { ...db, settings: { ...db.settings, ...operation.settings } };
  } else if (operation.operation === "addFeedback") {
    next = { ...db, feedback: [...db.feedback, operation.feedback as LocalDb["feedback"][number]] };
  }
  return saveDb(next);
}

// 与 API 网关 contextFromState 相同的映射：settings → 推荐上下文。
function contextFromSettings(db: LocalDb) {
  const undertoneMap: Record<string, string> = { "暖": "warm", "冷": "cool", "中性": "neutral", "warm": "warm", "cool": "cool", "neutral": "neutral" };
  const skinMap: Record<string, string> = { "干": "dry", "油": "oily", "混合": "combination", "中性": "normal", "dry": "dry", "oily": "oily", "combination": "combination", "normal": "normal" };
  const mapped = (value: string, map: Record<string, string>) => {
    const entry = Object.entries(map).find(([needle]) => value.toLowerCase().includes(needle));
    return entry?.[1] ?? "unknown";
  };
  return {
    undertone: mapped(db.settings.undertone, undertoneMap),
    skin: mapped(db.settings.skinProfile, skinMap),
    region: db.settings.region === "中国大陆" ? "全部品牌" : db.settings.region,
    categoryId: null,
  };
}

export async function staticFetchRecommendations(): Promise<RecommendationResponse> {
  const db = loadDb();
  const ranked = rankCandidates({ context: contextFromSettings(db), products, limit: 3, fallback: true });
  return { ...ranked, cached: false };
}

// 与 services/api/server/local-ai.mjs 的 local-mock fixture 保持一致。
function fixtureResult() {
  const makeupPlan = [
    ["prep", "妆前准备：修眉、保湿与隔离", "修掉眉心、眉尾杂毛；全脸保湿，鼻翼、唇周和面中薄涂隔离。"],
    ["conceal", "遮瑕系统：先修色，再增加覆盖", "黑眼圈、泪沟和泛红先点涂液体遮瑕，再用膏状遮瑕补局部。"],
    ["foundation", "粉底统一肤色", "脸颊、鼻翼、太阳穴、额头和人中点涂，刷子铺色后用湿润粉扑垂直拍匀。"],
    ["highlight", "提亮与立体塑形", "泪沟下倒三角、法令纹、山根和额头中心提亮；颧骨后侧和脸侧轻修容。"],
    ["set", "八点定妆", "按上眼皮、眉毛、眼下、鼻翼、脸颊、下巴、额头、脸侧顺序拍打定妆。"],
    ["sculpt", "骨相修饰与鼻影", "沿山根、鼻梁和鼻头菱形晕染鼻影，颧骨后侧、下颌线和咬肌轻轻收窄。"],
    ["eye", "六模块眼妆", "双眼皮贴贴近睫毛根；上眼影由浅到深，下眼影后 2/3 加深；眼线平拉并完成睫毛。"],
    ["finish", "腮红、高光与渐变唇完成妆面", "腮红放在外眼角下方约 2cm 向外扩散；山根、鼻头提亮；口红内深外浅。"],
  ].map(([id, title, action], index) => ({ id, order: index + 1, area: index === 6 ? "eye" : index === 7 ? "lip" : "base", title, action, amount: index === 4 ? "每区拍打 15–20 次" : "少量多次", texture: "自然光泽、低饱和色彩", avoid: "避免厚重、硬边和高对比晕染。", productCategoryIds: index === 7 ? ["blush", "lip"] : index === 6 ? ["eye"] : ["base"], tutorialIds: ["tutorial-korean-daily"] }));
  return {
    faceShape: "椭圆偏长",
    undertone: "中性偏暖",
    skinCondition: "混合皮 · T 区轻微出油",
    direction: "柔和暖中性日常妆",
    confidence: 84,
    caveats: ["这是本地静态演示的模拟结果，不是医疗诊断或真实视觉模型结论。", "肤色和肤质判断会受到光线、相机和底妆影响。"],
    colorProfile: { season: "暖春与柔秋之间的暖中性倾向", palette: ["#D8947E", "#BA9277", "#86524B", "#E4BD9D"], bestColors: ["蜜桃", "奶茶棕", "暖玫瑰", "香槟色"], avoidColors: ["高饱和荧光粉", "偏蓝紫", "纯黑大面积"] },
    skinObservation: { summary: "照片条件下肤色整体均匀，T 区有轻微光泽，面颊纹理自然可见。", areas: ["T 区轻微出油", "鼻翼需要更薄的底妆", "眼下适合局部遮瑕"], caveat: "这是照片条件下的视觉观察，不是皮肤检测或医疗判断。" },
    styleMatches: [
      { id: "soft-warm-daily", name: "柔和暖中性日常妆", score: 92, why: "兼顾椭圆偏长比例与中性偏暖色彩，适合低对比、自然通勤场景。", colors: ["蜜桃", "奶茶棕", "暖玫瑰"] },
      { id: "korean-natural", name: "自然韩系妆", score: 88, why: "轻薄底妆和柔和眼尾能保留面部自然比例。", colors: ["米杏", "低饱和棕", "MLBB"] },
      { id: "milktea", name: "奶茶妆", score: 85, why: "低饱和暖色能和中性偏暖底色协调。", colors: ["奶茶", "焦糖", "玫瑰棕"] },
    ],
    makeupPlan,
    previewPrompt: { prompt: "Preserve identity, face shape, skin texture and natural asymmetry. Apply a soft warm-neutral daily makeup look with a light luminous base, gently defined brows, softly extended brown liner, peach-beige blush and muted rosewood lips.", negativePrompt: "Do not reshape the face, enlarge eyes, whiten skin, remove natural texture, change ethnicity, add logos or invent products.", preserveIdentity: true, disclosure: "AI preview, not a guarantee" },
  };
}

function fixturePayload(filename: string, mimeType: string, size: number): LocalAnalysisPayload {
  const isImage = typeof mimeType === "string" && mimeType.startsWith("image/");
  return {
    provider: "local-mock",
    model: "veylumi-static-fixture-v1",
    traceId: `static_${makeId("trace")}`,
    inspection: {
      faceCount: 1,
      isHumanPhoto: true,
      isFrontal: true,
      quality: isImage && size > 0 ? "pass" : "warn",
      reasons: isImage && size > 0 ? ["检测到本地静态演示单人正脸样本"] : ["图片元数据不完整，使用降级模拟结果"],
      confidence: 96,
    },
    analysis: fixtureResult(),
    input: { filename, mimeType, size },
    previewImageUrl: null,
  };
}

const jobs = new Map<string, AnalysisJob<LocalAnalysisPayload>>();

export async function staticStartPhotoAnalysis(file: File): Promise<AnalysisJob<never> & { notifications?: { sseUrl: string } }> {
  const payload = fixturePayload(file.name, file.type, file.size);
  const job: AnalysisJob<LocalAnalysisPayload> = {
    jobId: makeId("analysis"),
    status: "completed",
    result: payload,
    error: null,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
  jobs.set(job.jobId, job);
  return job as unknown as AnalysisJob<never> & { notifications?: { sseUrl: string } };
}

export async function staticGetPhotoAnalysis(jobId: string): Promise<AnalysisJob<LocalAnalysisPayload>> {
  const job = jobs.get(jobId);
  if (!job) return { jobId, status: "failed", result: null, error: "analysis job not found", completedAt: new Date().toISOString() };
  return job;
}

// 静态版即时完成，模拟极短的「处理中」往返以便 UI 稳定进入报告页。
export async function staticWaitForPhotoAnalysis(jobId: string): Promise<AnalysisJob<LocalAnalysisPayload>> {
  await new Promise((resolve) => window.setTimeout(resolve, 60));
  return staticGetPhotoAnalysis(jobId);
}

// 静态版不上传照片到任何服务端，不生成服务端预览；页面会回退到本地上传的照片。
export async function staticFetchPreviewImage(): Promise<{ url: string; revoke: () => void } | null> {
  return null;
}

export async function staticDeletePhotoPreview(): Promise<{ deleted: boolean }> {
  return { deleted: true };
}
