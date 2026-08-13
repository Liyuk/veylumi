// AI 输出的妆容计划区域字段可能是英文自由文本（Complexion/Cheeks/High points/...），
// 与前端类型联合（base/brow/eye/cheek/lip）不一致。这里把自由 area 归一化到规范枚举，
// 并过滤掉产品目录中不存在的 category / tutorial 引用，防止类型约束被运行时数据违反。
const AREA_ALIASES = {
  "base": ["base", "complexion", "skin", "overall", "foundation", "prime", "prep", "preparation"],
  "brow": ["brow", "brows", "eyebrow", "eyebrows"],
  "eye": ["eye", "eyes", "eyeliner", "eyeshadow", "lash", "lashes", "eyelashes"],
  "cheek": ["cheek", "cheeks", "blush"],
  "lip": ["lip", "lips", "lipstick", "lip color", "lipcolor", "gradient lip", "gloss"],
};

export const KNOWN_CATEGORIES = new Set(["base", "primer", "concealer", "eye", "blush", "lip", "highlight", "setting"]);

export function normalizeArea(value) {
  const key = String(value ?? "").trim().toLowerCase();
  if (!key) return null;
  for (const [area, aliases] of Object.entries(AREA_ALIASES)) {
    if (aliases.includes(key)) return area;
  }
  // 兜底：包含关键字的自由文本。
  for (const [area, aliases] of Object.entries(AREA_ALIASES)) {
    if (aliases.some((alias) => alias.length > 2 && key.includes(alias))) return area;
  }
  return null;
}

// 把自由结构 plan 归一化为前端类型可接受的 plan；无法归一化的步骤丢弃。
export function normalizeMakeupPlan(plan, { categories = KNOWN_CATEGORIES, maxSteps = 8 } = {}) {
  if (!Array.isArray(plan)) return [];
  const steps = [];
  for (const step of plan) {
    if (!step || typeof step !== "object") continue;
    const area = normalizeArea(step.area);
    if (!area) continue;
    steps.push({
      id: typeof step.id === "string" ? step.id : `step_${steps.length}`,
      order: Number.isFinite(Number(step.order)) ? Number(step.order) : steps.length + 1,
      area,
      title: typeof step.title === "string" ? step.title : "妆容步骤",
      action: typeof step.action === "string" ? step.action : "",
      amount: typeof step.amount === "string" ? step.amount : "少量多次",
      texture: typeof step.texture === "string" ? step.texture : "自然光泽",
      avoid: typeof step.avoid === "string" ? step.avoid : "避免厚重。",
      productCategoryIds: Array.isArray(step.productCategoryIds) ? step.productCategoryIds.filter((id) => categories.has(id)).slice(0, 3) : [],
      tutorialIds: Array.isArray(step.tutorialIds) ? step.tutorialIds.slice(0, 3) : [],
    });
  }
  return steps.slice(0, maxSteps);
}
