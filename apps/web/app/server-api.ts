import { LocalDb } from "./local-db";
import { createAnalysisWaiter } from "../../../services/api/server/wait-analysis.mjs";
import type { AnalysisJob as ContractAnalysisJob, ApiFailure as ContractApiFailure, ApiMeta as ContractApiMeta, ApiSuccess as ContractApiSuccess, RecommendationResponse, StateOperation } from "../../../packages/api-contract/generated/types";
import { platformContract } from "../../../packages/client-contract/generated";

const API_BASE = process.env.NEXT_PUBLIC_VEYLUMI_API_URL ?? platformContract.api.defaultWebUrl;
let apiToken: string | null = null;
let writeQueue: Promise<LocalDb> = Promise.resolve({ version: 1, revision: 0 } as LocalDb);

export type LocalAnalysisPayload = {
  provider: "local-mock" | "codex-local";
  model: string;
  traceId: string;
  inspection: { faceCount: number; isHumanPhoto: boolean; isFrontal: boolean; quality: "pass" | "warn" | "fail"; reasons: string[]; confidence: number };
  analysis: { faceShape: string; undertone: string; skinCondition: string; direction: string; confidence: number; caveats: string[] };
  input: { filename: string; mimeType: string; size: number };
  previewImageUrl?: string | null;
  imageProvider?: string;
  imageModel?: string;
  previewDisclosure?: string;
};
export type AnalysisJob<T = LocalAnalysisPayload> = ContractAnalysisJob<T>;
export type ApiMeta = ContractApiMeta;
export type ApiSuccess<T> = ContractApiSuccess<T>;
export type ApiFailure = ContractApiFailure;

export class ServerApiError extends Error {
  readonly code: string;
  readonly requestId: string;
  readonly status: number;
  constructor(message: string, code: string, requestId: string, status: number) { super(message); this.name = "ServerApiError"; this.code = code; this.requestId = requestId; this.status = status; }
}

// demo 模式下服务端使用进程级随机 token，通过 /api/bootstrap 匿名获取；非 demo 返回 404，回退到构建期注入的 env token。
async function resolveToken(): Promise<string | null> {
  if (apiToken) return apiToken;
  const envToken = process.env.NEXT_PUBLIC_VEYLUMI_API_TOKEN;
  if (envToken) { apiToken = envToken; return apiToken; }
  try {
    const response = await fetch(`${API_BASE}/api/bootstrap`, { cache: "no-store" });
    if (response.ok) {
      const envelope = await response.json() as { ok?: boolean; data?: { token?: string } };
      apiToken = envelope.data?.token ?? null;
    }
  } catch { /* API 不可用时交由后续请求报错 */ }
  return apiToken;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await resolveToken();
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) }, cache: "no-store" });
  const envelope = await response.json() as ApiSuccess<T> | ApiFailure;
  if (!response.ok || !envelope.ok) { const error = envelope as ApiFailure; throw new ServerApiError(error.error?.message ?? `Server API request failed: ${response.status}`, error.error?.code ?? "API_HTTP_ERROR", error.meta?.requestId ?? response.headers.get("x-request-id") ?? "unknown", response.status); }
  return envelope.data;
}

export function fetchDb(): Promise<LocalDb> {
  return request<LocalDb>("/api/state");
}

export function fetchRecommendations(): Promise<RecommendationResponse> {
  return request<RecommendationResponse>("/api/recommendations?limit=3");
}

// 带乐观锁的整库保存：If-Match 携带当前 revision，服务端不匹配返回 409。
// 冲突时拉取服务端最新状态，按集合做并集 merge 后再写。
export function saveDb(db: LocalDb): Promise<LocalDb> {
  const attempt = (candidate: LocalDb): Promise<LocalDb> =>
    request<LocalDb>("/api/state", { method: "POST", body: JSON.stringify(candidate), headers: { "if-match": String(candidate.revision) } });
  const run = writeQueue
    .catch(() => undefined)
    .then(() => attempt(db))
    .catch(async (error: unknown) => {
      if (error instanceof ServerApiError && error.status === 409) {
        const remote = await fetchDb();
        const merged = mergeDb(remote, db);
        return attempt(merged);
      }
      throw error;
    });
  writeQueue = run;
  return writeQueue;
}

// 高频小改动使用同一 state 资源上的命名 operation；整库 POST 仍仅为旧客户端兼容保留。
export async function applyStateOperation(operation: StateOperation, revision: number): Promise<LocalDb> {
  const attempt = (expectedRevision: number) => request<LocalDb>("/api/state", { method: "PATCH", body: JSON.stringify(operation), headers: { "if-match": String(expectedRevision) } });
  try { return await attempt(revision); }
  catch (error) {
    if (error instanceof ServerApiError && error.status === 409) return attempt((await fetchDb()).revision);
    throw error;
  }
}

// 冲突合并：集合按 id 去重做并集，savedProductIds 取并集，settings/用户取较新的本地值。
export function mergeDb(remote: LocalDb, local: LocalDb): LocalDb {
  // 集合按 id 合并，以 local（本次写入方）为准：同 id 记录 local 胜出，
  // 避免 409 重试时服务端旧值把用户刚做的修改回滚。
  const byId = <T extends { id: string }>(a: T[], b: T[]) => {
    const map = new Map<string, T>();
    for (const item of [...a, ...b]) map.set(item.id, item);
    return [...map.values()];
  };
  return {
    ...remote,
    revision: remote.revision,
    authenticated: local.authenticated,
    user: local.user,
    settings: local.settings,
    savedProductIds: [...new Set([...(remote.savedProductIds ?? []), ...(local.savedProductIds ?? [])])],
    analyses: byId(remote.analyses ?? [], local.analyses ?? []),
    photos: byId(remote.photos ?? [], local.photos ?? []),
    feedback: byId(remote.feedback ?? [], local.feedback ?? []),
  };
}

export async function startPhotoAnalysis(file: File): Promise<AnalysisJob<never> & { notifications?: { sseUrl: string } }> {
  const imageData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("无法读取图片"));
    reader.onerror = () => reject(reader.error ?? new Error("无法读取图片"));
    reader.readAsDataURL(file);
  });
  const idempotencyKey = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${file.name}:${file.size}:${file.lastModified}`;
  return request<AnalysisJob<never> & { notifications?: { sseUrl: string } }>("/api/analyze", { method: "POST", headers: { "idempotency-key": idempotencyKey }, body: JSON.stringify({ imageData, filename: file.name, mimeType: file.type, size: file.size }) });
}

export function getPhotoAnalysis(jobId: string): Promise<AnalysisJob<LocalAnalysisPayload>> {
  return request<AnalysisJob<LocalAnalysisPayload>>(`/api/analyze/${encodeURIComponent(jobId)}`);
}

// 预览文件私有化后，前端用 fetch+blob 生成 objectURL 展示；返回 revoke 以便生命周期管理。
export async function fetchPreviewImage(jobId: string): Promise<{ url: string; revoke: () => void } | null> {
  const token = await resolveToken();
  try {
    const response = await fetch(`${API_BASE}/api/analyze/${encodeURIComponent(jobId)}/preview`, { headers: token ? { authorization: `Bearer ${token}` } : {}, cache: "no-store" });
    if (!response.ok) return null;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return { url, revoke: () => URL.revokeObjectURL(url) };
  } catch { return null; }
}

export function deletePhotoPreview(jobId: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/api/analyze/${encodeURIComponent(jobId)}/preview`, { method: "POST", body: "{}" });
}

export async function waitForPhotoAnalysis(jobId: string): Promise<AnalysisJob<LocalAnalysisPayload>> {
  const { wait } = createAnalysisWaiter({
    get: getPhotoAnalysis,
    createEventSource: (id) => {
      // EventSource 无法携带 Authorization 头（SSE 端点要求鉴权），
      // 改用 fetch 流式读取 SSE，带上 Bearer token。
      let controller: AbortController | null = null;
      let closed = false;
      const listeners = new Map<string, (event: { data: string }) => void>();
      void (async () => {
        const token = await resolveToken();
        controller = new AbortController();
        try {
          const response = await fetch(`${API_BASE}/api/analyze/${encodeURIComponent(id)}/events`, { headers: token ? { authorization: `Bearer ${token}` } : {}, signal: controller.signal, cache: "no-store" });
          if (!response.ok || !response.body) return;
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          for (;;) {
            const { done, value } = await reader.read();
            if (done || closed) break;
            buffer += decoder.decode(value, { stream: true });
            let boundary = buffer.indexOf("\n\n");
            while (boundary >= 0) {
              const frame = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
              if (dataLine && listeners.has("analysis")) listeners.get("analysis")!({ data: dataLine.slice(5).trim() });
              boundary = buffer.indexOf("\n\n");
            }
          }
        } catch { /* onError 由等待器触发轮询降级 */ }
      })();
      return {
        close: () => { closed = true; controller?.abort(); },
        addEventListener: (type, cb) => { listeners.set(type, cb); },
        onError: () => { /* fetch 失败时由轮询兜底，不额外触发 */ },
      };
    },
  });
  return wait(jobId) as Promise<AnalysisJob<LocalAnalysisPayload>>;
}
