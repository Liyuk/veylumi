// 可注入的异步等待器：把 fetch / EventSource / setTimeout 全部参数化，便于单元测试
// SSE 完成通知、onerror 回退、轮询 deadline 命中这三条路径，而不依赖真实浏览器。
// 纯 JS 实现，供 server-api.ts 与 node:test 共同引用。
export function createAnalysisWaiter({
  get,
  hasEventSource = () => typeof EventSource !== "undefined",
  createEventSource,
  setTimeout = (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout = (handle) => window.clearTimeout(handle),
  now = () => Date.now(),
  pollIntervalMs = 1500,
  sseFallbackMs = 4000,
  pollDeadlineMs = 180_000,
} = {}) {
  async function poll(jobId) {
    const deadline = now() + pollDeadlineMs;
    let job = await get(jobId);
    while (job.status === "queued" || job.status === "running") {
      if (now() >= deadline) return { ...job, status: "failed", error: "分析任务等待超时，请稍后重试" };
      await new Promise((resolve) => setTimeout(() => resolve(undefined), pollIntervalMs));
      job = await get(jobId);
    }
    return job;
  }

  async function wait(jobId) {
    const initial = await get(jobId);
    if (initial.status === "completed" || initial.status === "failed") return initial;
    if (hasEventSource() && createEventSource) {
      try {
        return await new Promise((resolve, reject) => {
          const source = createEventSource(jobId);
          let settled = false;
          let fallback;
          const cleanup = () => { source.close(); if (fallback !== undefined) clearTimeout(fallback); };
          fallback = setTimeout(() => { if (settled) return; settled = true; cleanup(); void poll(jobId).then(resolve, reject); }, sseFallbackMs);
          source.addEventListener("analysis", (event) => {
            const next = JSON.parse(event.data);
            if (next.status === "completed" || next.status === "failed") { if (settled) return; settled = true; cleanup(); resolve(next); }
          });
          if (typeof source.onError === "function") {
            source.onError(() => { if (settled) return; settled = true; cleanup(); void poll(jobId).then(resolve, reject); });
          }
        });
      } catch { /* Polling below is the compatibility fallback. */ }
    }
    return poll(jobId);
  }

  return { wait, poll };
}
