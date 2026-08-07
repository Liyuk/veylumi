export type SkinProfile = "dry" | "oily" | "combination" | "normal" | "unknown";

export type CatalogProduct = {
  id: number;
  brand: string;
  name: string;
  type: string;
  price: string;
  tone: string;
  shade: string;
  skin: string;
  region: string;
  latest: boolean;
  color: string;
  url: string;
  categoryId: string;
  undertone: "cool" | "neutral" | "warm" | "unknown";
  finish: string;
  skinTags: SkinProfile[];
  shadeDepth: number | null;
};

export type MakeupPlanStep = {
  id: string;
  order: number;
  area: "base" | "brow" | "eye" | "cheek" | "lip";
  title: string;
  action: string;
  amount: string;
  texture: string;
  avoid: string;
  productCategoryIds: string[];
  tutorialIds: string[];
};

export type TutorialLink = {
  platform: "YouTube" | "小红书" | "抖音" | "Instagram";
  creator: string;
  title: string;
  tags: string;
  url: string;
  stepIds: string[];
  productIds: number[];
};

export type RecommendationContext = {
  undertone: "cool" | "neutral" | "warm" | "unknown";
  skin: SkinProfile;
  region: "日韩" | "欧美" | "全部品牌";
  categoryId?: string;
};

export type ProductMatch = {
  product: CatalogProduct;
  score: number;
  reason: string;
  caveat: string;
};

export type BeautyStyleMatch = { id: string; name: string; score: number; why: string; colors: string[] };
export type ColorProfile = { season: string; palette: string[]; bestColors: string[]; avoidColors: string[] };
export type SkinObservation = { summary: string; areas: string[]; caveat: string };
export type PreviewPrompt = { prompt: string; negativePrompt: string; preserveIdentity: boolean; disclosure: string };

export function matchProduct(product: CatalogProduct, context: RecommendationContext): ProductMatch {
  let score = 48;
  const reasons: string[] = [];
  if (context.undertone !== "unknown" && product.undertone === context.undertone) { score += 20; reasons.push("undertone 接近"); }
  if (context.skin !== "unknown" && product.skinTags.includes(context.skin)) { score += 15; reasons.push("肤质标签匹配"); }
  if (context.region === "全部品牌" || product.region === context.region) { score += 10; reasons.push("市场可购买"); }
  if (!context.categoryId || product.categoryId === context.categoryId) { score += 7; reasons.push("品类匹配"); }
  return { product, score: Math.min(score, 99), reason: reasons.join(" · ") || "基于妆容方向的参考推荐", caveat: "色号会受光线、底妆和质地影响，建议购买前查看官方试色或线下试用。" };
}

export function rankProducts(products: CatalogProduct[], context: RecommendationContext): ProductMatch[] {
  return products.map((product) => matchProduct(product, context)).sort((a, b) => b.score - a.score);
}

// 教程按肤质匹配度排序：与当前肤质标签命中的优先。当前无人工精选深链，
// 链接为搜索入口，UI 已明示"搜索入口"以免误导为特定教程。
export function rankTutorials(tutorials: TutorialLink[], context: RecommendationContext, catalogProducts: CatalogProduct[] = []): TutorialLink[] {
  const skinPriority = (tutorial: TutorialLink): number => {
    const relatedProducts = catalogProducts.filter((p) => tutorial.productIds.includes(p.id));
    const matched = relatedProducts.filter((p) => context.skin !== "unknown" && p.skinTags.includes(context.skin)).length;
    return matched;
  };
  return [...tutorials].sort((a, b) => skinPriority(b) - skinPriority(a));
}

export const makeupPlan: MakeupPlanStep[] = [
  { id: "prep", order: 1, area: "base", title: "妆前准备：修眉、保湿与隔离", action: "修掉眉心、眉尾和上眼皮杂毛；全脸保湿，鼻翼、唇周和面中薄涂隔离。", amount: "保湿适量，隔离半颗黄豆", texture: "轻薄乳液或凝霜", avoid: "不要在 T 区叠加过多油润产品。", productCategoryIds: ["primer"], tutorialIds: ["tutorial-korean-daily"] },
  { id: "conceal", order: 2, area: "base", title: "遮瑕系统：先修色，再增加覆盖", action: "黑眼圈、泪沟、泛红先点涂液体遮瑕，再用膏状遮瑕补局部；边缘拍开。", amount: "点点点，再拍成面", texture: "液体遮瑕 + 膏状遮瑕", avoid: "不要把遮瑕厚堆在黑眼圈中心。", productCategoryIds: ["concealer"], tutorialIds: ["tutorial-oily-base"] },
  { id: "foundation", order: 3, area: "base", title: "粉底统一肤色", action: "脸颊、鼻翼、太阳穴、额头和人中点涂，刷子铺色后用湿润粉扑垂直拍匀。", amount: "薄层，局部叠加", texture: "自然光泽或中等遮瑕", avoid: "不要来回擦，也不要用粉底覆盖黑眼圈中心。", productCategoryIds: ["base"], tutorialIds: ["tutorial-oily-base"] },
  { id: "highlight", order: 4, area: "base", title: "提亮与立体塑形", action: "泪沟下倒三角、法令纹、嘴角下方、山根和额头中心提亮；颧骨后侧和脸侧轻修容。", amount: "少量分区", texture: "提亮液 + 液体修容", avoid: "高光区域不要再叠深色修容。", productCategoryIds: ["base"], tutorialIds: ["tutorial-korean-daily"] },
  { id: "set", order: 5, area: "base", title: "八点定妆", action: "按上眼皮、眉毛、眼下、鼻翼、脸颊、下巴、额头、脸侧顺序拍打定妆。", amount: "每区拍打 15–20 次", texture: "散粉或蜜粉饼", avoid: "不要扫掉底妆；睫毛根和侧脸避免结块。", productCategoryIds: ["base"], tutorialIds: ["tutorial-oily-base"] },
  { id: "sculpt", order: 6, area: "base", title: "骨相修饰与鼻影", action: "沿山根、鼻梁和鼻头菱形晕染鼻影，颧骨后侧、下颌线和咬肌轻轻收窄。", amount: "少量多次", texture: "哑光修容粉 + 柔和高光", avoid: "不要画硬边，正面提亮要和侧面收窄自然衔接。", productCategoryIds: ["base"], tutorialIds: ["tutorial-korean-daily"] },
  { id: "eye", order: 7, area: "eye", title: "六模块眼妆", action: "双眼皮贴贴近睫毛根；上眼影由浅到深，下眼影后 2/3 加深；眼线平拉，夹睫毛并完成睫毛根提亮。", amount: "眼尾逐层加深", texture: "低饱和哑光、细闪", avoid: "眉下留白约 7–8mm，避免黑色大面积晕染。", productCategoryIds: ["eye"], tutorialIds: ["tutorial-korean-daily"] },
  { id: "finish", order: 8, area: "lip", title: "腮红、高光与渐变唇完成妆面", action: "腮红放在外眼角下方约 2cm 向外扩散；山根、鼻头、眉尾下方提亮；口红内深外浅。", amount: "薄层叠加", texture: "自然光泽或柔雾", avoid: "避免腮红过低、唇色过冷或高饱和。", productCategoryIds: ["blush", "lip"], tutorialIds: ["tutorial-milktea"] },
];
