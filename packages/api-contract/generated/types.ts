/** Generated-shape TypeScript declarations derived from openapi.yaml. */
export type AnalysisStatus = "queued" | "running" | "completed" | "failed";
export type ApiMeta = { requestId: string };
export type ApiSuccess<T> = { ok: true; data: T; meta: ApiMeta };
export type ApiFailure = { ok: false; error: { code: string; message: string; details?: unknown }; meta: ApiMeta };
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;
export type AnalysisInput = { imageData: string; filename: string; mimeType: string; size: number };
export type AnalysisJob<T = unknown> = { jobId: string; status: AnalysisStatus; result: T | null; error: string | null; createdAt?: string; startedAt?: string; completedAt?: string };
export type Product = { id: number; brand: string; name: string; type: string; price: string; tone: string; shade: string; region: string; color: string; url: string; categoryId: string; undertone: string; finish: string; skinTags: string[] };
export type Tutorial = { platform: string; creator: string; title: string; tags: string; url: string; productIds: number[] };
export type StateOperation =
  | { operation: "toggleSavedProduct"; productId: number }
  | { operation: "updateSettings"; settings: Record<string, unknown> }
  | { operation: "addFeedback"; feedback: Record<string, unknown> };
export type AnalysisResult = Record<string, unknown> | null;
export type StateSettings = {
  displayName?: string;
  email?: string;
  region?: string;
  language?: string;
  skinProfile?: string;
  undertone?: string;
  savePhotosForThreeDays?: boolean;
  personalizedTutorials?: boolean;
  [key: string]: unknown;
};
export type StateSnapshot = {
  version: number;
  revision: number;
  authenticated?: boolean;
  user?: Record<string, unknown>;
  savedProductIds: number[];
  analyses: Record<string, unknown>[];
  photos?: Record<string, unknown>[];
  feedback: Record<string, unknown>[];
  settings: StateSettings;
};
export type RecommendationItem = { productId: number; score: number; reason: string; caveat: string };
export type RecommendationResponse = { items: RecommendationItem[]; ruleVersion: number; modelVersion: string; fallback: boolean; cached: boolean; degraded?: string };
