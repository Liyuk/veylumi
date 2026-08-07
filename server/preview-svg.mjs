export function escapeXml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" }[character]));
}

// 非照片级 SVG 分析预览：由分析结果生成，保留身份、不调用任何图像模型。
export function renderPreviewSvg(analysis) {
  const colors = analysis.colorProfile?.palette?.slice(0, 5) ?? ["#d79b83", "#a85f58", "#e7b99e", "#6e4036", "#f3d4b8"];
  const direction = escapeXml(analysis.direction);
  const season = escapeXml(analysis.colorProfile?.season ?? "Beauty direction");
  const steps = (analysis.makeupPlan ?? []).slice(0, 4).map((step) => escapeXml(step.title)).join(" · ");
  const swatches = colors.map((color, index) => `<circle cx="${92 + index * 34}" cy="332" r="12" fill="${escapeXml(color)}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" role="img" aria-labelledby="title description">
  <title id="title">Veylumi Codex beauty preview</title><desc id="description">Non-photorealistic preview based on the analyzed makeup direction.</desc>
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7ede6"/><stop offset="1" stop-color="#e4c1b0"/></linearGradient><radialGradient id="glow"><stop stop-color="#fff8f1"/><stop offset="1" stop-color="#e0a895"/></radialGradient></defs>
  <rect width="640" height="420" rx="28" fill="url(#bg)"/><circle cx="190" cy="190" r="120" fill="#f2d2c1" opacity=".7"/>
  <path d="M190 84c-53 0-83 48-83 108 0 74 38 119 83 119s83-45 83-119c0-60-30-108-83-108Z" fill="url(#glow)" stroke="#9f6657" stroke-width="4"/>
  <path d="M128 164c17-20 35-28 55-24M197 140c20-4 39 4 55 24" fill="none" stroke="#6e4036" stroke-width="8" stroke-linecap="round"/>
  <path d="M143 190c15 11 29 11 44 0M197 190c15 11 29 11 44 0" fill="none" stroke="#a85f58" stroke-width="5" stroke-linecap="round"/>
  <path d="M157 234c22 17 44 17 66 0" fill="none" stroke="#a85f58" stroke-width="7" stroke-linecap="round"/>
  <text x="360" y="72" font-family="Arial,sans-serif" font-size="15" letter-spacing="2" fill="#76564d">CODEX BEAUTY PREVIEW</text>
  <text x="360" y="116" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="#3d2c29">${direction}</text>
  <text x="360" y="156" font-family="Arial,sans-serif" font-size="16" fill="#76564d">${season}</text>
  <text x="360" y="205" font-family="Arial,sans-serif" font-size="14" fill="#76564d">${steps}</text>
  <line x1="360" y1="246" x2="574" y2="246" stroke="#c29382"/>
  ${swatches}
  <text x="360" y="378" font-family="Arial,sans-serif" font-size="13" fill="#76564d">非照片级试妆预览 · 保留身份 · 由分析结果生成</text>
</svg>`;
}
