import { randomUUID } from "node:crypto";
import { renderPreviewSvg } from "./preview-svg.mjs";
import { createPreviewStore } from "./preview-store.mjs";

const previewStore = createPreviewStore();

function imageDataToBuffer(imageData) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(imageData ?? "");
  if (!match) throw new Error("需要提供有效的图片 Data URL");
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}

function extensionForMime(mimeType) {
  return mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpeg";
}

function buildEditPrompt(analysis) {
  const preview = analysis.previewPrompt?.prompt ?? analysis.direction ?? "natural makeup";
  return [
    "Edit the provided face photo into a photorealistic AFTER makeup preview.",
    "Preserve the exact person, identity, facial structure, pose, camera angle, crop, hair, background, expression, and natural skin texture.",
    `Apply only this makeup direction: ${preview}`,
    "Change makeup only: sheer even complexion, eye definition, blush, highlight, brows, and lip color as appropriate.",
    "Do not reshape the face, change age, ethnicity, hair, clothing, lighting setup, or background.",
    "No text, border, watermark, collage, illustration, cartoon, or synthetic facial features.",
  ].join(" ");
}

export async function generatePhotorealisticPreview({ imageData, analysis, jobId }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    if ((process.env.VEYLUMI_MODE ?? "demo") === "demo") return generateMockPhotorealisticPreview({ analysis, jobId });
    throw new Error("生产模式需要设置 OPENAI_API_KEY；未生成模拟预览");
  }
  const { mimeType, buffer } = imageDataToBuffer(imageData);
  const form = new FormData();
  const model = process.env.VEYLUMI_IMAGE_MODEL ?? "gpt-image-2";
  form.append("model", model);
  form.append("image", new Blob([buffer], { type: mimeType }), `input.${extensionForMime(mimeType)}`);
  form.append("prompt", buildEditPrompt(analysis));
  form.append("quality", process.env.VEYLUMI_IMAGE_QUALITY ?? "high");
  form.append("size", process.env.VEYLUMI_IMAGE_SIZE ?? "1024x1024");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.VEYLUMI_IMAGE_TIMEOUT_MS ?? 180000));
  let response;
  let payload;
  try {
    response = await fetch(process.env.VEYLUMI_IMAGE_API_URL ?? "https://api.openai.com/v1/images/edits", { method: "POST", headers: { authorization: `Bearer ${apiKey}` }, body: form, signal: controller.signal });
    payload = await response.json().catch(() => ({}));
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("照片级试妆图像模型超时");
    throw new Error(`照片级试妆网络请求失败：${error instanceof Error ? error.message : "未知错误"}`);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new Error(`照片级试妆 API 失败（${response.status}）：${payload.error?.message ?? "未知错误"}`);
  const encoded = payload.data?.[0]?.b64_json;
  if (typeof encoded !== "string" || !encoded) throw new Error("照片级试妆 API 未返回图片数据");
  const { previewImageUrl } = await previewStore.write(jobId ?? `img_${randomUUID()}`, Buffer.from(encoded, "base64"), "png");
  return { imageProvider: "openai", imageModel: model, previewImageUrl, previewDisclosure: "OpenAI 图像编辑生成，仍需人工核验，不是身份保持保证" };
}

export async function generateMockPhotorealisticPreview({ analysis, jobId }) {
  const { previewImageUrl } = await previewStore.write(jobId ?? `mock_${randomUUID()}`, Buffer.from(renderPreviewSvg(analysis), "utf8"), "svg");
  return { imageProvider: "openai-mock", imageModel: "gpt-image-2-mock", previewImageUrl, previewDisclosure: "本地模拟预览，不调用 OpenAI，也不是实际试妆保证" };
}

export async function deleteGeneratedPreview(previewImageUrl) {
  const match = /^\/api\/analyze\/([A-Za-z0-9_-]+)\/preview$/.exec(String(previewImageUrl ?? ""));
  if (!match) return false;
  return previewStore.delete(match[1]);
}

export { buildEditPrompt };
