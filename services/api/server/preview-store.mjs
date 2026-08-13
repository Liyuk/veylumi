import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const JOB_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function previewContentType(ext) {
  return ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/svg+xml";
}

// 私有预览存储：生成的预览文件不再写入 web 根，而是落在 storage/preview/ 下，
// 只能通过带鉴权的 /api/analyze/:jobId/preview 端点读取，并按 TTL 过期清扫。
export function createPreviewStore({ dir = path.resolve("storage/preview"), ttlMs = Number(process.env.VEYLUMI_PREVIEW_TTL_MS ?? 3 * 24 * 60 * 60 * 1000) } = {}) {
  async function ensureDir() { await mkdir(dir, { recursive: true }); }

  async function write(jobId, buffer, ext) {
    if (!JOB_ID_PATTERN.test(String(jobId))) throw new Error("无效的 jobId");
    await ensureDir();
    await writeFile(path.join(dir, `${jobId}.${ext}`), buffer);
    return { previewImageUrl: `/api/analyze/${jobId}/preview`, ext };
  }

  async function read(jobId) {
    if (!JOB_ID_PATTERN.test(String(jobId))) return null;
    try {
      const buffer = await readFile(path.join(dir, `${jobId}.svg`));
      return { buffer, contentType: previewContentType("svg") };
    } catch { /* fall through */ }
    for (const ext of ["png", "jpeg", "webp"]) {
      try {
        const buffer = await readFile(path.join(dir, `${jobId}.${ext}`));
        return { buffer, contentType: previewContentType(ext) };
      } catch { /* try next */ }
    }
    return null;
  }

  async function deleteFile(jobId) {
    if (!JOB_ID_PATTERN.test(String(jobId))) return false;
    let removed = false;
    for (const ext of ["svg", "png", "jpeg", "webp"]) {
      try { await rm(path.join(dir, `${jobId}.${ext}`), { force: true }); removed = true; } catch { /* ignore */ }
    }
    return removed;
  }

  // 删除超过保留期的预览文件（按 mtime 判定），返回删除数量。
  async function sweep(now = Date.now()) {
    let removed = 0;
    try { await ensureDir(); } catch { return 0; }
    const names = await readdir(dir).catch(() => []);
    for (const name of names) {
      if (!/^[A-Za-z0-9_-]+\.(svg|png|jpeg|webp)$/.test(name)) continue;
      try {
        const info = await stat(path.join(dir, name));
        if (info.mtimeMs + ttlMs < now) { await rm(path.join(dir, name), { force: true }); removed += 1; }
      } catch { /* skip unreadable */ }
    }
    return removed;
  }

  return { write, read, delete: deleteFile, sweep, dir };
}
