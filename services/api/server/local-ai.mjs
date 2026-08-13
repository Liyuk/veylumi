import { randomUUID } from "node:crypto";

function localResult() {
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
    caveats: ["这是本地结构化模拟结果，不是医疗诊断或真实视觉模型结论。", "肤色和肤质判断会受到光线、相机和底妆影响。"],
    colorProfile: { season: "暖春与柔秋之间的暖中性倾向", palette: ["#D8947E", "#BA9277", "#86524B", "#E4BD9D"], bestColors: ["蜜桃", "奶茶棕", "暖玫瑰", "香槟色"], avoidColors: ["高饱和荧光粉", "偏蓝紫", "纯黑大面积"] },
    skinObservation: { summary: "照片条件下肤色整体均匀，T 区有轻微光泽，面颊纹理自然可见。", areas: ["T 区轻微出油", "鼻翼需要更薄的底妆", "眼下适合局部遮瑕"], caveat: "这是照片条件下的视觉观察，不是皮肤检测或医疗判断。" },
    styleMatches: [
      { id: "soft-warm-daily", name: "柔和暖中性日常妆", score: 92, why: "兼顾椭圆偏长比例与中性偏暖色彩，适合低对比、自然通勤场景。", colors: ["蜜桃", "奶茶棕", "暖玫瑰"] },
      { id: "korean-natural", name: "自然韩系妆", score: 88, why: "轻薄底妆和柔和眼尾能保留面部自然比例。", colors: ["米杏", "低饱和棕", "MLBB"] },
      { id: "milktea", name: "奶茶妆", score: 85, why: "低饱和暖色能和中性偏暖底色协调。", colors: ["奶茶", "焦糖", "玫瑰棕"] }
    ],
    makeupPlan,
    previewPrompt: { prompt: "Preserve identity, face shape, skin texture and natural asymmetry. Apply a soft warm-neutral daily makeup look with a light luminous base, gently defined brows, softly extended brown liner, peach-beige blush and muted rosewood lips.", negativePrompt: "Do not reshape the face, enlarge eyes, whiten skin, remove natural texture, change ethnicity, add logos or invent products.", preserveIdentity: true, disclosure: "AI preview, not a guarantee" },
  };
}

export async function analyzeLocalPhoto({ filename, mimeType, size }) {
  const isImage = typeof mimeType === "string" && mimeType.startsWith("image/");
  const result = localResult();
  return {
    provider: "local-mock",
    model: "veylumi-local-face-fixture-v1",
    traceId: `local_${randomUUID()}`,
    inspection: {
      faceCount: 1,
      isHumanPhoto: true,
      isFrontal: true,
      quality: isImage && size > 0 ? "pass" : "warn",
      reasons: isImage && size > 0 ? ["检测到本地 Demo 单人正脸样本"] : ["图片元数据不完整，使用降级模拟结果"],
      confidence: 96,
    },
    analysis: result,
    input: { filename: filename ?? "upload", mimeType: mimeType ?? "unknown", size: Number(size ?? 0) },
  };
}
