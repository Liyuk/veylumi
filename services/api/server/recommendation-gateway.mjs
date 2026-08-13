import { rankCandidates } from "../../../packages/recommendation-contract/engine.mjs";

const undertoneMap = new Map([["暖", "warm"], ["冷", "cool"], ["中性", "neutral"], ["warm", "warm"], ["cool", "cool"], ["neutral", "neutral"]]);
const skinMap = new Map([["干", "dry"], ["油", "oily"], ["混合", "combination"], ["中性", "normal"], ["dry", "dry"], ["oily", "oily"], ["combination", "combination"], ["normal", "normal"]]);
function mapped(value, map) { return [...map].find(([needle]) => String(value ?? "").toLowerCase().includes(needle))?.[1] ?? "unknown"; }

export function contextFromState(state, requestedCategoryId = null) {
  return { undertone: mapped(state.settings?.undertone, undertoneMap), skin: mapped(state.settings?.skinProfile, skinMap), region: state.settings?.region === "中国大陆" ? "全部品牌" : (state.settings?.region ?? "全部品牌"), categoryId: requestedCategoryId };
}

export function createRecommendationGateway({ url = process.env.VEYLUMI_RECOMMENDATION_URL ?? null, token = process.env.VEYLUMI_RECOMMENDATION_TOKEN ?? null, timeoutMs = Number(process.env.VEYLUMI_RECOMMENDATION_TIMEOUT_MS ?? 700), cacheTtlMs = Number(process.env.VEYLUMI_RECOMMENDATION_CACHE_TTL_MS ?? 30_000), fetchImpl = fetch } = {}) {
  const cache = new Map();
  async function rank({ state, products, categoryId, limit }) {
    const context = contextFromState(state, categoryId);
    const payload = { context, products, limit, signals: { savedProductIds: state.savedProductIds ?? [], feedbackCount: state.feedback?.length ?? 0 } };
    const key = JSON.stringify({ revision: state.revision, categoryId, limit });
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return { ...cached.value, cached: true };
    if (!url || !token) return { ...rankCandidates({ ...payload, fallback: true }), degraded: "recommendation-service-unconfigured", cached: false };
    try {
      const response = await fetchImpl(`${url.replace(/\/$/, "")}/v1/rank`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(timeoutMs) });
      const body = await response.json();
      if (!response.ok || !body.ok || !body.data) throw new Error("invalid recommendation response");
      const value = { ...body.data, fallback: false, cached: false };
      cache.set(key, { value, expiresAt: Date.now() + cacheTtlMs });
      return value;
    } catch { return { ...rankCandidates({ ...payload, fallback: true }), degraded: "recommendation-service-unavailable", cached: false }; }
  }
  return { rank };
}
