import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const logFile = process.env.VEYLUMI_LOG_FILE ?? path.resolve(".data/logs.jsonl");
const counters = { totalRequests: 0, successRequests: 0, errorRequests: 0, totalDurationMs: 0, byStatus: {}, byCode: {}, byRoute: {}, lastRequestAt: null };
let writeQueue = Promise.resolve();

function increment(bucket, key) { bucket[key] = (bucket[key] ?? 0) + 1; }

export function recordRequest({ requestId, method, route, status, durationMs, errorCode = null }) {
  counters.totalRequests += 1;
  counters.totalDurationMs += durationMs;
  counters.lastRequestAt = new Date().toISOString();
  if (status >= 200 && status < 400) counters.successRequests += 1;
  else counters.errorRequests += 1;
  increment(counters.byStatus, String(status));
  increment(counters.byRoute, route);
  if (errorCode) increment(counters.byCode, errorCode);
  const entry = { timestamp: counters.lastRequestAt, level: status >= 500 ? "error" : status >= 400 ? "warn" : "info", event: "http.request", requestId, method, route, status, durationMs, errorCode };
  console.log(JSON.stringify(entry));
  writeQueue = writeQueue.then(async () => { await mkdir(path.dirname(logFile), { recursive: true }); await appendFile(logFile, `${JSON.stringify(entry)}\n`, "utf8"); }).catch(() => undefined);
}

export function getMetrics() {
  return { ...counters, averageDurationMs: counters.totalRequests ? Math.round(counters.totalDurationMs / counters.totalRequests) : 0, uptimeSeconds: Math.round(process.uptime()) };
}

export async function getRecentLogs(limit = 100) {
  try { const text = await readFile(logFile, "utf8"); return text.trim().split("\n").filter(Boolean).slice(-Math.min(Math.max(limit, 1), 500)).reverse().map((line) => JSON.parse(line)); }
  catch { return []; }
}
