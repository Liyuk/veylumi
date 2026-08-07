import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import Ajv from "ajv";
import { createPreviewStore } from "./preview-store.mjs";
import { renderPreviewSvg } from "./preview-svg.mjs";
import { normalizeMakeupPlan } from "./plan-normalize.mjs";

const previewStore = createPreviewStore();
const schemaPath = new URL("./local-analysis.schema.json", import.meta.url).pathname;
const analysisSchema = JSON.parse(readFileSync(schemaPath, "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
const validateAnalysis = ajv.compile(analysisSchema);

function runCodex(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.CODEX_BIN ?? "codex", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => { settled = true; child.kill("SIGTERM"); reject(new Error(`Codex CLI 超时（${timeoutMs}ms）`)); }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", (error) => { if (settled) return; settled = true; clearTimeout(timer); reject(error); });
    child.once("close", (code) => { if (settled) return; settled = true; clearTimeout(timer); if (code === 0) resolve({ stdout, stderr }); else reject(new Error(`Codex CLI 退出码 ${code}: ${stderr.slice(-1000)}`)); });
    child.stdin.end();
  });
}

function imageDataToBuffer(imageData) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(imageData ?? "");
  if (!match) throw new Error("需要提供有效的图片 Data URL");
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}

export async function analyzeWithLocalCodex({ imageData, filename, mimeType, size, jobId }) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "veylumi-codex-"));
  try {
    const inputPath = path.join(tempDir, path.basename(filename || "input.jpg"));
    const outputPath = path.join(tempDir, "analysis.json");
    const { buffer } = imageDataToBuffer(imageData);
    await writeFile(inputPath, buffer);
    const prompt = "Analyze the attached face image for a beauty app. Return only the requested JSON object. All user-facing strings must be in Chinese; IDs may remain ASCII. Keep previewPrompt.prompt and previewPrompt.negativePrompt in concise English for the image model, while previewPrompt.disclosure must be Chinese. Describe visible appearance without inferring identity, ethnicity, age, health, or personality. Use cautious caveats. Do not modify the repository or create files.";
    const args = ["exec", "--ephemeral", "--skip-git-repo-check", "-s", "workspace-write", "-C", tempDir, "-i", inputPath, "--output-schema", schemaPath, "-o", outputPath, prompt];
    await runCodex(args, Number(process.env.VEYLUMI_CODEX_TIMEOUT_MS ?? 120000));
    const analysis = JSON.parse(await readFile(outputPath, "utf8"));
    if (!validateAnalysis(analysis)) {
      throw new Error(`Codex 输出不符合 schema：${ajv.errorsText(validateAnalysis.errors)}`);
    }
    const normalized = { ...analysis, makeupPlan: normalizeMakeupPlan(analysis.makeupPlan), caveats: Array.isArray(analysis.caveats) ? analysis.caveats : [] };
    await writeFile(path.join(tempDir, "preview.svg"), renderPreviewSvg(normalized), "utf8");
    const { previewImageUrl } = await previewStore.write(jobId ?? `codex_${randomUUID()}`, Buffer.from(renderPreviewSvg(normalized), "utf8"), "svg");
    return { provider: "codex-local", model: process.env.VEYLUMI_CODEX_MODEL ?? "codex-default", traceId: `codex_${randomUUID()}`, inspection: { faceCount: 1, isHumanPhoto: true, isFrontal: true, quality: "pass", reasons: ["本地 Codex 已读取图片输入"], confidence: 90 }, analysis: normalized, previewImageUrl, input: { filename: filename ?? "upload", mimeType: mimeType ?? "image/jpeg", size: Number(size ?? buffer.length) } };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Codex CLI 调用失败";
    throw new Error(`本地 Codex 分析失败：${detail}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
