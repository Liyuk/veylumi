import rules from "./rules.json" with { type: "json" };

const allowedUndertones = new Set(["cool", "neutral", "warm", "unknown"]);
const allowedSkin = new Set(["dry", "oily", "combination", "normal", "unknown"]);

function safeContext(value = {}) {
  return {
    undertone: allowedUndertones.has(value.undertone) ? value.undertone : "unknown",
    skin: allowedSkin.has(value.skin) ? value.skin : "unknown",
    region: typeof value.region === "string" && value.region ? value.region : "全部品牌",
    categoryId: typeof value.categoryId === "string" && value.categoryId ? value.categoryId : null,
  };
}

export function rankCandidates({ context, products, limit = 12, fallback = false } = {}) {
  const normalized = safeContext(context);
  const boundedLimit = Math.max(1, Math.min(Number.isInteger(limit) ? limit : 12, 50));
  const items = (Array.isArray(products) ? products : [])
    .filter((product) => product && Number.isInteger(product.id))
    .filter((product) => normalized.region === "全部品牌" || product.region === normalized.region)
    .filter((product) => !normalized.categoryId || product.categoryId === normalized.categoryId)
    .map((product) => {
      let score = rules.weights.base;
      const reasons = [];
      if (normalized.undertone !== "unknown" && product.undertone === normalized.undertone) { score += rules.weights.undertone; reasons.push("undertone match"); }
      if (normalized.skin !== "unknown" && Array.isArray(product.skinTags) && product.skinTags.includes(normalized.skin)) { score += rules.weights.skin; reasons.push("skin match"); }
      if (normalized.region === "全部品牌" || product.region === normalized.region) { score += rules.weights.region; reasons.push("region available"); }
      if (!normalized.categoryId || product.categoryId === normalized.categoryId) { score += rules.weights.category; reasons.push("category match"); }
      return { productId: product.id, score: Math.min(score, rules.weights.max), reason: reasons.join(" · ") || "catalog recommendation", caveat: "Shade and finish should be verified before purchase." };
    })
    .sort((left, right) => right.score - left.score || left.productId - right.productId)
    .slice(0, boundedLimit);
  return { items, ruleVersion: rules.version, modelVersion: "rules-v1", fallback: Boolean(fallback) };
}
