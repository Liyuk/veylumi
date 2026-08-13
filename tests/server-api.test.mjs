import test from "node:test";
import assert from "node:assert/strict";
import { createAnalysisWaiter } from "../services/api/server/wait-analysis.mjs";

test("waiter resolves on terminal event from SSE", async () => {
  let listener;
  const waiter = createAnalysisWaiter({
    get: async () => ({ jobId: "job_1", status: "queued", error: null, result: null }),
    hasEventSource: () => true,
    createEventSource: () => ({ close() {}, addEventListener(type, cb) { if (type === "analysis") listener = cb; }, onError() {} }),
    setTimeout: () => 1,
    clearTimeout: () => {},
  });
  const promise = waiter.wait("job_1");
  // 等 createEventSource 注册完成（一个 microtask）
  await new Promise((resolve) => setTimeout(resolve, 0));
  listener({ data: JSON.stringify({ jobId: "job_1", status: "completed", error: null, result: null }) });
  const job = await promise;
  assert.equal(job.status, "completed");
});

test("waiter falls back to polling when EventSource is unavailable", async () => {
  const waiter = createAnalysisWaiter({
    get: async () => ({ jobId: "job_1", status: "completed", error: null, result: null }),
    hasEventSource: () => false,
  });
  const job = await waiter.wait("job_1");
  assert.equal(job.status, "completed");
});

test("waiter returns failed with deadline message on poll timeout", async () => {
  let now = 0;
  const waiter = createAnalysisWaiter({
    get: async () => ({ jobId: "job_1", status: "running", error: null, result: null }),
    hasEventSource: () => false,
    now: () => now,
    pollIntervalMs: 1,
    pollDeadlineMs: 100,
    setTimeout: (fn) => { now += 200; fn(); return 1; },
  });
  const job = await waiter.wait("job_1");
  assert.equal(job.status, "failed");
  assert.match(job.error ?? "", /超时/);
});

test("waiter polls through intermediate states to completion", async () => {
  const states = ["queued", "running", "completed"];
  let call = 0;
  const waiter = createAnalysisWaiter({
    get: async () => ({ jobId: "job_1", status: states[Math.min(call++, states.length - 1)], error: null, result: null }),
    hasEventSource: () => false,
    setTimeout: (fn) => { fn(); return 1; },
  });
  const job = await waiter.wait("job_1");
  assert.equal(job.status, "completed");
});
