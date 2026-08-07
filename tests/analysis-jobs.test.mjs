import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createAnalysisQueue } from "../server/analysis-jobs.mjs";

test("analysis jobs are persisted, idempotent, retried, and non-blocking", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "veylumi-jobs-test-"));
  const filePath = path.join(directory, "jobs.json");
  let attempts = 0;
  const queue = createAnalysisQueue({ filePath, retryDelayMs: 1, maxAttempts: 3, runner: async (input) => { attempts += 1; if (attempts === 1) throw new Error("temporary Codex failure"); return { filename: input.filename, provider: "codex-local" }; } });
  await queue.ready;
  const startedAt = Date.now();
  const first = await queue.create({ filename: "face.jpeg" }, { idempotencyKey: "demo-face-1" });
  assert.equal(first.status, "queued");
  assert.ok(Date.now() - startedAt < 100);
  const replay = await queue.create({ filename: "different.jpeg" }, { idempotencyKey: "demo-face-1" });
  assert.equal(replay.jobId, first.jobId);
  assert.equal(replay.replayed, true);
  let completed;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    completed = queue.get(first.jobId);
    if (completed.status === "completed") break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(completed.status, "completed");
  assert.equal(completed.attempts, 2);
  assert.deepEqual(completed.result, { filename: "face.jpeg", provider: "codex-local" });
  await queue.flush();

  const recoveredQueue = createAnalysisQueue({ filePath, runner: async () => ({ recovered: true }) });
  await recoveredQueue.ready;
  assert.equal(recoveredQueue.get(first.jobId).status, "completed");
  await rm(directory, { recursive: true, force: true });
});

test("running jobs recover as queued after a process restart", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "veylumi-jobs-recovery-"));
  const filePath = path.join(directory, "jobs.json");
  const queue = createAnalysisQueue({ filePath, runner: async () => ({ ok: true }) });
  await queue.ready;
  const job = await queue.create({ filename: "face.jpeg" }, { idempotencyKey: "recovery" });
  await new Promise((resolve) => setTimeout(resolve, 5));
  const recovered = createAnalysisQueue({ filePath, runner: async () => ({ recovered: true }) });
  await recovered.ready;
  assert.equal(recovered.get(job.jobId).status, "completed");
  await rm(directory, { recursive: true, force: true });
});

test("analysis queue limits local provider concurrency", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "veylumi-jobs-concurrency-"));
  const filePath = path.join(directory, "jobs.json");
  let active = 0;
  let peak = 0;
  const queue = createAnalysisQueue({ filePath, maxConcurrent: 1, runner: async () => { active += 1; peak = Math.max(peak, active); await new Promise((resolve) => setTimeout(resolve, 10)); active -= 1; return { ok: true }; } });
  await queue.ready;
  const first = await queue.create({ filename: "one.jpeg" });
  const second = await queue.create({ filename: "two.jpeg" });
  for (let attempt = 0; attempt < 100; attempt += 1) { if ([first.jobId, second.jobId].every((id) => queue.get(id).status === "completed")) break; await new Promise((resolve) => setTimeout(resolve, 5)); }
  assert.equal(peak, 1);
  await queue.flush();
  await rm(directory, { recursive: true, force: true });
});

test("analysis jobs do not expose upstream provider details to clients", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "veylumi-jobs-error-"));
  const filePath = path.join(directory, "jobs.json");
  const queue = createAnalysisQueue({ filePath, maxAttempts: 1, runner: async () => { throw new Error("OpenAI API 401: secret-token-value"); } });
  await queue.ready;
  const job = await queue.create({ filename: "face.jpeg" });
  for (let attempt = 0; attempt < 50; attempt += 1) { if (queue.get(job.jobId).status === "failed") break; await new Promise((resolve) => setTimeout(resolve, 5)); }
  assert.equal(queue.get(job.jobId).error, "分析服务暂时不可用，请稍后重试");
  await queue.flush();
  await rm(directory, { recursive: true, force: true });
});
