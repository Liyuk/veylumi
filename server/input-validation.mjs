const MIME_SIGNATURES = {
  "image/jpeg": (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  "image/png": (buffer) => buffer.length >= 8 && Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).equals(buffer.subarray(0, 8)),
  "image/webp": (buffer) => buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP",
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_REQUEST_BYTES = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 256_000;

export function validateImageInput(input = {}, { maxBytes = MAX_IMAGE_BYTES } = {}) {
  const imageData = typeof input.imageData === "string" ? input.imageData : "";
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(imageData);
  if (!match) throw new Error("只支持有效的 JPG、PNG 或 WEBP 图片");
  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > maxBytes) throw new Error("图片不能超过 10MB");
  if (!MIME_SIGNATURES[mimeType](buffer)) throw new Error("图片内容与文件类型不匹配");
  return {
    ...input,
    imageData,
    mimeType,
    size: buffer.length,
    filename: typeof input.filename === "string" && input.filename ? input.filename.slice(0, 160) : "upload",
  };
}
