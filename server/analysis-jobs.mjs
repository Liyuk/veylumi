import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const terminalStatuses = new Set(["completed", "failed"]);

function publicJob(job) {
  if (!job) return null;
  const safeJob = { ...job };
  delete safeJob.input;
  return safeJob;
}

function now() { return new Date().toISOString(); }
function inputSummary(input = {}) { return { filename: input.filename ?? "upload", mimeType: input.mimeType ?? "unknown", size: Number(input.size ?? 0) }; }
function publicError(error) {
  const message = error instanceof Error ? error.message : "分析任务失败";
  if (/OPENAI_API_KEY|OpenAI API|API 失败|网络请求|Codex CLI|stderr|超时|连接失败|schema|Upstream/i.test(message)) return "分析服务暂时不可用，请稍后重试";
  return message.slice(0, 240);
}

export function createAnalysisQueue({ filePath = path.resolve(".data/analysis-jobs.json"), runner, maxAttempts = 3, retryDelayMs = 250, maxConcurrent = 1 } = {}) {
  const jobs = new Map();
  // 完整图片输入只保存在内存：排队/运行阶段不把 base64 落盘（隐私），重启后依赖输入的任务直接失败。
  const memoryInputs = new Map();
  const subscribers = new Map();
  const waiting = [];
  let active = 0;
  let writeQueue = Promise.resolve();

  function enqueueWrite(task) {
    writeQueue = writeQueue.catch(() => undefined).then(task).catch((error) => console.error("[analysis-jobs] 持久化失败", error));
    return writeQueue;
  }

  async function persist() {
    const payload = JSON.stringify({ version: 1, jobs: [...jobs.values()] }, null, 2);
    return enqueueWrite(async () => {
      await mkdir(path.dirname(filePath), { recursive: true });
      const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
      await writeFile(temporaryPath, payload, "utf8");
      await rename(temporaryPath, filePath);
    });
  }

  function emit(job) {
    for (const listener of subscribers.get(job.jobId) ?? []) listener(publicJob(job));
    if (terminalStatuses.has(job.status)) subscribers.delete(job.jobId);
  }

  async function update(jobId, changes) {
    const current = jobs.get(jobId);
    if (!current) return null;
    const next = { ...current, ...changes, updatedAt: now() };
    jobs.set(jobId, next);
    await persist();
    emit(next);
    return next;
  }

  async function execute(jobId) {
    const job = jobs.get(jobId);
    if (!job || terminalStatuses.has(job.status)) return;
    const input = memoryInputs.get(jobId) ?? null;
    if (!input) {
      await update(jobId, { status: "failed", completedAt: now(), error: "服务重启后图片输入已不可用，请重新上传", input: inputSummary(job.input) });
      return;
    }
    await update(jobId, { status: "running", startedAt: job.startedAt ?? now(), attempts: job.attempts + 1, nextAttemptAt: null, error: null });
    try {
      const result = await runner(input, { jobId });
      await update(jobId, { status: "completed", completedAt: now(), result, error: null, input: inputSummary(input) });
      memoryInputs.delete(jobId);
    } catch (error) {
      const message = publicError(error);
      const latest = jobs.get(jobId);
      if (latest && latest.attempts < latest.maxAttempts) {
        const nextAttemptAt = new Date(Date.now() + retryDelayMs).toISOString();
        await update(jobId, { status: "queued", error: message, nextAttemptAt });
        schedule(jobId, retryDelayMs);
      } else {
        await update(jobId, { status: "failed", completedAt: now(), error: message, input: inputSummary(input) });
        memoryInputs.delete(jobId);
      }
    }
  }

  function schedule(jobId, delay = 0) {
    setTimeout(() => {
      if (active >= maxConcurrent) { waiting.push(jobId); return; }
      active += 1;
      void execute(jobId).finally(() => {
        active -= 1;
        const next = waiting.shift();
        if (next) schedule(next);
      });
    }, delay);
  }

  const ready = (async () => {
    try {
      const saved = JSON.parse(await readFile(filePath, "utf8"));
      for (const savedJob of Array.isArray(saved.jobs) ? saved.jobs : []) {
        let recovered = savedJob;
        if (savedJob.status === "running" || savedJob.status === "queued") {
          // 恢复后内存没有原图，无法重跑图片分析 → 直接失败，避免静默重跑。
          recovered = { ...savedJob, status: "failed", completedAt: now(), error: "服务重启后图片输入已不可用，请重新上传" };
        }
        jobs.set(recovered.jobId, recovered);
      }
    } catch { /* First run has no queue file. */ }
  })();

  return {
    ready,
    async create(input, { idempotencyKey = null } = {}) {
      await ready;
      if (idempotencyKey) {
        const existing = [...jobs.values()].find((job) => job.idempotencyKey === idempotencyKey);
        if (existing) return { ...publicJob(existing), replayed: true };
      }
      const job = {
        jobId: `job_${randomUUID()}`,
        idempotencyKey,
        status: "queued",
        attempts: 0,
        maxAttempts,
        createdAt: now(),
        updatedAt: now(),
        startedAt: null,
        completedAt: null,
        nextAttemptAt: null,
        result: null,
        error: null,
        input: inputSummary(input),
      };
      jobs.set(job.jobId, job);
      memoryInputs.set(job.jobId, input);
      await persist();
      emit(job);
      schedule(job.jobId);
      return publicJob(job);
    },
    get(jobId) { return publicJob(jobs.get(jobId)) ?? null; },
    flush() { return writeQueue; },
    subscribe(jobId, listener) {
      if (!jobs.has(jobId)) return () => {};
      const listeners = subscribers.get(jobId) ?? new Set();
      listeners.add(listener);
      subscribers.set(jobId, listeners);
      return () => { listeners.delete(listener); if (!listeners.size) subscribers.delete(jobId); };
    },
    async clearPreview(jobId) {
      const current = jobs.get(jobId);
      if (!current || !current.result) return null;
      return update(jobId, { result: { ...current.result, previewImageUrl: null, imageProvider: null, imageModel: null, previewDisclosure: null } });
    },
  };
}
