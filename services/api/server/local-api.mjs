import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { createJsonRepository, ConflictError } from "./local-repository.mjs";
import { ApiError, ERROR_CODES, failure, success } from "./api-contract.mjs";
import { getMetrics, getRecentLogs, recordRequest } from "./observability.mjs";
import { analyzeLocalPhoto } from "./local-ai.mjs";
import { analyzeWithLocalCodex } from "./codex-provider.mjs";
import { deleteGeneratedPreview, generatePhotorealisticPreview } from "./image-edit-provider.mjs";
import { createAnalysisQueue } from "./analysis-jobs.mjs";
import { createPreviewStore } from "./preview-store.mjs";
import { MAX_REQUEST_BYTES, validateImageInput } from "./input-validation.mjs";
import { products, tutorials } from "./catalog.mjs";

// 可注入的 app 工厂：把配置、repository、队列、预览存储全部参数化，
// 便于测试用临时路径/内存依赖构造并直接驱动 handler。
export function createApp({
  mode = process.env.VEYLUMI_MODE ?? "demo",
  apiToken = mode === "demo" ? randomBytes(32).toString("hex") : (process.env.VEYLUMI_API_TOKEN ?? ""),
  adminToken = process.env.VEYLUMI_ADMIN_TOKEN ?? (mode === "demo" ? "local-admin" : null),
  allowedOrigins = new Set((process.env.VEYLUMI_ALLOWED_ORIGIN ?? (mode === "demo" ? "http://localhost:3000,http://127.0.0.1:3000" : "null")).split(",").map((value) => value.trim()).filter(Boolean)),
  repository = createJsonRepository(process.env.VEYLUMI_DB_FILE),
  previewStore = createPreviewStore(),
  queue = null,
  aiProvider = process.env.VEYLUMI_AI_PROVIDER ?? "codex",
  imageProvider = process.env.VEYLUMI_IMAGE_PROVIDER ?? null,
} = {}) {
  const analysisQueue = queue ?? createAnalysisQueue({
    filePath: process.env.VEYLUMI_ANALYSIS_QUEUE_FILE,
    maxAttempts: Number(process.env.VEYLUMI_ANALYSIS_MAX_ATTEMPTS ?? 3),
    retryDelayMs: Number(process.env.VEYLUMI_ANALYSIS_RETRY_DELAY_MS ?? 500),
    maxConcurrent: Number(process.env.VEYLUMI_ANALYSIS_MAX_CONCURRENT ?? 1),
    runner: async (payload, { jobId }) => {
      const result = aiProvider === "codex" ? await analyzeWithLocalCodex({ ...payload, jobId }) : await analyzeLocalPhoto({ ...payload, jobId });
      if (result.analysis && imageProvider === "openai") return { ...result, ...await generatePhotorealisticPreview({ imageData: payload.imageData, analysis: result.analysis, jobId }) };
      return result;
    },
  });

  async function migrateLegacyPreviews() {
    const state = await repository.snapshot();
    let changed = false;
    const nextAnalyses = (state.analyses ?? []).map((record) => {
      if (typeof record.previewImageUrl === "string" && record.previewImageUrl.startsWith("/generated/")) {
        changed = true;
        return { ...record, previewImageUrl: null, imageProvider: null, imageModel: null, previewDisclosure: null };
      }
      return record;
    });
    if (changed) await repository.replace({ ...state, analyses: nextAnalyses }, { skipConflict: true });
  }

  function corsOriginFor(origin) {
    if (!allowedOrigins.size) return "null";
    return origin && allowedOrigins.has(origin) ? origin : allowedOrigins.values().next().value;
  }

  function json(res, status, body, requestId, origin) {
    const headers = `content-type,authorization,idempotency-key,x-request-id,if-match${mode === "demo" ? ",x-admin-token" : ""}`;
    res.writeHead(status, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": corsOriginFor(origin), "access-control-allow-headers": headers, "access-control-allow-methods": "GET,POST,PATCH,OPTIONS", "vary": "Origin", "x-request-id": requestId });
    if (status === 204) return res.end();
    res.end(JSON.stringify(body));
  }

  async function readJson(req) {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) { chunks.push(chunk); total += chunk.length; if (total > MAX_REQUEST_BYTES) throw new ApiError(413, ERROR_CODES.PAYLOAD_TOO_LARGE, "图片请求不能超过 14MB"); }
    const body = Buffer.concat(chunks).toString("utf8");
    try { return JSON.parse(body || "{}"); } catch { throw new ApiError(400, ERROR_CODES.INVALID_JSON, "请求体不是有效 JSON"); }
  }

  function requireAdmin(req) {
    if (adminToken === null) throw new ApiError(500, ERROR_CODES.INTERNAL, "管理端未配置 VEYLUMI_ADMIN_TOKEN");
    if (req.headers["x-admin-token"] !== adminToken) throw new ApiError(401, ERROR_CODES.ADMIN_UNAUTHORIZED, "管理员令牌无效");
  }

  function requireApiAccess(req) {
    const supplied = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
    if (!apiToken || supplied !== `Bearer ${apiToken}`) throw new ApiError(401, ERROR_CODES.ADMIN_UNAUTHORIZED, "API 访问令牌无效");
  }

  function corsHeaders(res, origin) {
    res.setHeader("access-control-allow-origin", corsOriginFor(origin));
    res.setHeader("access-control-allow-headers", `content-type,authorization,idempotency-key,x-request-id,if-match${mode === "demo" ? ",x-admin-token" : ""}`);
    res.setHeader("access-control-allow-methods", "GET,POST,PATCH,OPTIONS");
    res.setHeader("vary", "Origin");
  }

  async function handle(req, url, res) {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.size && !allowedOrigins.has(origin)) throw new ApiError(403, ERROR_CODES.INVALID_STATE, "来源不被允许");
    if (req.method === "OPTIONS") { corsHeaders(res, origin); res.writeHead(204); res.end(); return null; }
    if (url.pathname === "/health" && req.method === "GET") return { status: 200, data: { service: "veylumi-local-api", status: "ok" } };
    if (url.pathname === "/api/bootstrap" && req.method === "GET") {
      if (mode !== "demo") throw new ApiError(404, ERROR_CODES.NOT_FOUND, "接口不存在");
      return { status: 200, data: { token: apiToken } };
    }
    if (url.pathname === "/api/state" && req.method === "GET") { requireApiAccess(req); return { status: 200, data: await repository.snapshot() }; }
    if (url.pathname === "/api/state" && req.method === "POST") {
      requireApiAccess(req);
      const expectedRevision = typeof req.headers["if-match"] === "string" ? Number(req.headers["if-match"]) : undefined;
      return { status: 200, data: await repository.replace(await readJson(req), { expectedRevision }) };
    }
    if (url.pathname === "/api/state" && req.method === "PATCH") {
      requireApiAccess(req);
      const expectedRevision = typeof req.headers["if-match"] === "string" ? Number(req.headers["if-match"]) : undefined;
      const command = await readJson(req);
      if (expectedRevision === undefined || Number.isNaN(expectedRevision)) throw new ApiError(400, ERROR_CODES.INVALID_STATE, "If-Match revision is required");
      const next = await repository.update((state) => {
        if (command.operation === "toggleSavedProduct" && Number.isInteger(command.productId)) return { ...state, savedProductIds: state.savedProductIds.includes(command.productId) ? state.savedProductIds.filter((id) => id !== command.productId) : [...state.savedProductIds, command.productId] };
        if (command.operation === "updateSettings" && command.settings && typeof command.settings === "object") return { ...state, settings: { ...state.settings, ...command.settings }, user: { ...state.user, displayName: command.settings.displayName ?? state.user.displayName, email: command.settings.email ?? state.user.email } };
        if (command.operation === "addFeedback" && typeof command.feedback === "object") return { ...state, feedback: [...state.feedback, { id: randomUUID(), createdAt: new Date().toISOString(), ...command.feedback }] };
        throw new ApiError(400, ERROR_CODES.INVALID_STATE, "Unsupported state operation");
      }, { expectedRevision });
      return { status: 200, data: next };
    }
    if (url.pathname === "/api/catalog/products" && req.method === "GET") { requireApiAccess(req); return { status: 200, data: products }; }
    if (url.pathname === "/api/catalog/tutorials" && req.method === "GET") { requireApiAccess(req); return { status: 200, data: tutorials }; }
    if (url.pathname === "/api/analyze" && req.method === "POST") {
      requireApiAccess(req);
      let input;
      try { input = validateImageInput(await readJson(req)); } catch (error) { throw new ApiError(400, ERROR_CODES.INVALID_JSON, error instanceof Error ? error.message : "图片格式无效"); }
      const idempotencyKey = typeof req.headers["idempotency-key"] === "string" ? req.headers["idempotency-key"] : input.idempotencyKey;
      const job = await analysisQueue.create(input, { idempotencyKey });
      return { status: job.replayed ? 200 : 202, data: { ...job, notifications: { sseUrl: `/api/analyze/${job.jobId}/events` } } };
    }
    const previewRoute = /^\/api\/analyze\/([^/]+)\/preview$/.exec(url.pathname);
    if (previewRoute) {
      requireApiAccess(req);
      if (req.method === "POST") {
        const job = analysisQueue.get(previewRoute[1]);
        const deleted = await deleteGeneratedPreview(job?.result?.previewImageUrl);
        if (deleted && job) await analysisQueue.clearPreview(previewRoute[1]);
        return { status: 200, data: { deleted } };
      }
      if (req.method === "GET") {
        const file = await previewStore.read(previewRoute[1]);
        if (!file) throw new ApiError(404, ERROR_CODES.NOT_FOUND, "预览文件不存在");
        corsHeaders(res, origin);
        res.writeHead(200, { "content-type": file.contentType, "cache-control": "private, max-age=3600" });
        res.end(file.buffer);
        return null;
      }
    }
    const analysisEvents = /^\/api\/analyze\/([^/]+)\/events$/.exec(url.pathname);
    if (analysisEvents && req.method === "GET") {
      requireApiAccess(req);
      const job = analysisQueue.get(analysisEvents[1]);
      if (!job) throw new ApiError(404, ERROR_CODES.NOT_FOUND, "分析任务不存在");
      corsHeaders(res, origin);
      res.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache", connection: "keep-alive" });
      const send = (next) => { try { res.write(`event: analysis\ndata: ${JSON.stringify(next)}\n\n`); } catch { /* connection closed */ } };
      send(job);
      if (["completed", "failed"].includes(job.status)) { res.end(); return null; }
      const unsubscribe = analysisQueue.subscribe(job.jobId, (next) => { send(next); if (["completed", "failed"].includes(next.status)) { unsubscribe(); res.end(); } });
      req.on("close", () => { unsubscribe(); res.destroy(); });
      return null;
    }
    const analysisJob = /^\/api\/analyze\/([^/]+)$/.exec(url.pathname);
    if (analysisJob && req.method === "GET") {
      requireApiAccess(req);
      const job = analysisQueue.get(analysisJob[1]);
      if (!job) throw new ApiError(404, ERROR_CODES.NOT_FOUND, "分析任务不存在");
      return { status: 200, data: job };
    }
    if (url.pathname === "/api/admin/metrics" && req.method === "GET") { requireAdmin(req); return { status: 200, data: getMetrics() }; }
    if (url.pathname === "/api/admin/logs" && req.method === "GET") { requireAdmin(req); return { status: 200, data: await getRecentLogs(Number(url.searchParams.get("limit") ?? 100)) }; }
    if (url.pathname.startsWith("/api/") && !["GET", "POST"].includes(req.method)) throw new ApiError(405, ERROR_CODES.METHOD_NOT_ALLOWED, "请求方法不支持");
    throw new ApiError(404, ERROR_CODES.NOT_FOUND, "接口不存在");
  }

  const server = createServer((req, res) => {
    const suppliedRequestId = typeof req.headers["x-request-id"] === "string" && /^[A-Za-z0-9._:-]{1,100}$/.test(req.headers["x-request-id"]) ? req.headers["x-request-id"] : null;
    const requestId = suppliedRequestId ?? randomUUID();
    const startedAt = performance.now();
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    let status = 500;
    let errorCode = null;
    const origin = req.headers.origin;
    void handle(req, url, res).then((result) => {
      if (result === null) { status = 200; return; }
      status = result.status;
      json(res, status, status === 204 ? null : success(result.data, requestId), requestId, origin);
    }).catch((error) => {
      const apiError = error instanceof ConflictError ? new ApiError(409, ERROR_CODES.CONFLICT, error.message) : error instanceof ApiError ? error : new ApiError(500, ERROR_CODES.INTERNAL, "服务内部错误");
      status = apiError.status; errorCode = apiError.code;
      if (res.headersSent || res.destroyed) { res.destroy(); return; }
      try { json(res, status, failure(apiError, requestId), requestId, origin); } catch { res.destroy(); }
    }).finally(() => {
      recordRequest({ requestId, method: req.method ?? "UNKNOWN", route: url.pathname, status, durationMs: Math.round(performance.now() - startedAt), errorCode });
    });
    req.on("error", () => res.destroy());
  });

  return {
    server,
    queue: analysisQueue,
    repository,
    previewStore,
    apiToken,
    adminToken,
    async start(port) {
      await analysisQueue.ready;
      await previewStore.sweep().catch(() => undefined);
      setInterval(() => void previewStore.sweep().catch(() => undefined), 3600_000).unref();
      await migrateLegacyPreviews().catch(() => undefined);
      await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
      return server;
    },
  };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const port = Number(process.env.VEYLUMI_API_PORT ?? 8787);
  const app = createApp();
  void app.start(port).then(() => console.log(`Veylumi local API listening on http://127.0.0.1:${port}`));
}
