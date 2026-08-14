import { rankCandidates } from "../../../packages/recommendation-contract/engine.mjs";

const undertoneMap = new Map([["暖", "warm"], ["冷", "cool"], ["中性", "neutral"], ["warm", "warm"], ["cool", "cool"], ["neutral", "neutral"]]);
const skinMap = new Map([["干", "dry"], ["油", "oily"], ["混合", "combination"], ["中性", "normal"], ["dry", "dry"], ["oily", "oily"], ["combination", "combination"], ["normal", "normal"]]);
function mapped(value, map) { return [...map].find(([needle]) => String(value ?? "").toLowerCase().includes(needle))?.[1] ?? "unknown"; }

export function contextFromState(state, requestedCategoryId = null) {
  return { undertone: mapped(state.settings?.undertone, undertoneMap), skin: mapped(state.settings?.skinProfile, skinMap), region: state.settings?.region === "中国大陆" ? "全部品牌" : (state.settings?.region ?? "全部品牌"), categoryId: requestedCategoryId };
}

export function createRecommendationGateway({ url = process.env.VEYLUMI_RECOMMENDATION_URL ?? null, token = process.env.VEYLUMI_RECOMMENDATION_TOKEN ?? null, timeoutMs = Number(process.env.VEYLUMI_RECOMMENDATION_TIMEOUT_MS ?? 700), cacheTtlMs = Number(process.env.VEYLUMI_RECOMMENDATION_CACHE_TTL_MS ?? 30_000), fetchImpl = fetch } = {}) {
  const cache = new Map();
  const metrics = { remoteRequests: 0, cachedRequests: 0, fallbackRequests: 0, totalRemoteDurationMs: 0, lastHealth: url && token ? "unknown" : "unconfigured", lastCheckedAt: null, modelVersion: null, ruleVersion: null };
  async function rank({ state, products, categoryId, limit }) {
    const context = contextFromState(state, categoryId);
    const payload = { context, products, limit, signals: { savedProductIds: state.savedProductIds ?? [], feedbackCount: state.feedback?.length ?? 0 } };
    const key = JSON.stringify({ revision: state.revision, categoryId, limit });
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) { metrics.cachedRequests += 1; return { ...cached.value, cached: true }; }
    if (!url || !token) { metrics.fallbackRequests += 1; return { ...rankCandidates({ ...payload, fallback: true }), degraded: "recommendation-service-unconfigured", cached: false }; }
    try {
      const started = performance.now();
      const response = await fetchImpl(`${url.replace(/\/$/, "")}/v1/rank`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(timeoutMs) });
      const body = await response.json();
      if (!response.ok || !body.ok || !body.data) throw new Error("invalid recommendation response");
      metrics.remoteRequests += 1; metrics.totalRemoteDurationMs += performance.now() - started; metrics.lastHealth = "healthy"; metrics.lastCheckedAt = new Date().toISOString(); metrics.modelVersion = body.data.modelVersion; metrics.ruleVersion = body.data.ruleVersion;
      const value = { ...body.data, fallback: false, cached: false };
      cache.set(key, { value, expiresAt: Date.now() + cacheTtlMs });
      return value;
    } catch { metrics.fallbackRequests += 1; metrics.lastHealth = "degraded"; metrics.lastCheckedAt = new Date().toISOString(); return { ...rankCandidates({ ...payload, fallback: true }), degraded: "recommendation-service-unavailable", cached: false }; }
  }
  function getMetrics() { return { status: metrics.lastHealth, remoteRequests: metrics.remoteRequests, cachedRequests: metrics.cachedRequests, fallbackRequests: metrics.fallbackRequests, averageRemoteDurationMs: metrics.remoteRequests ? Math.round(metrics.totalRemoteDurationMs / metrics.remoteRequests) : 0, lastCheckedAt: metrics.lastCheckedAt, modelVersion: metrics.modelVersion, ruleVersion: metrics.ruleVersion }; }
  return { rank, getMetrics };
}
