import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "../services/api/server/local-api.mjs";
import { createPreviewStore } from "../services/api/server/preview-store.mjs";

const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

async function setup() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "veylumi-api-test-"));
  const previewStore = createPreviewStore({ dir: path.join(dir, "preview") });
  const repository = { snapshot: async () => ({ version: 1, revision: 3, authenticated: true, user: {}, savedProductIds: [], analyses: [], photos: [], feedback: [], settings: {} }), replace: async () => ({ ok: true }) };
  const jobs = [];
  const byKey = new Map();
  const analysisQueue = {
    ready: Promise.resolve(),
    create: async (input, { idempotencyKey } = {}) => {
      if (idempotencyKey && byKey.has(idempotencyKey)) return { ...byKey.get(idempotencyKey), replayed: true };
      const job = { jobId: `job_${jobs.length}`, idempotencyKey, status: "queued", input };
      jobs.push(job); if (idempotencyKey) byKey.set(idempotencyKey, job);
      return job;
    },
    get: (jobId) => jobs.find((job) => job.jobId === jobId) ?? null,
    subscribe: () => () => {},
    clearPreview: async () => null,
  };
  const app = createApp({ repository, previewStore, queue: analysisQueue, aiProvider: "local-mock" });
  await app.start(0);
  const base = `http://127.0.0.1:${app.server.address().port}`;
  return { app, base, dir, token: app.apiToken };
}

test("health and bootstrap endpoints", async () => {
  const { app, base, token, dir } = await setup();
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    const bootstrap = await fetch(`${base}/api/bootstrap`);
    assert.equal(bootstrap.status, 200);
    assert.equal((await bootstrap.json()).data.token, token);
  } finally {
    app.server.close(); await rm(dir, { recursive: true, force: true });
  }
});

test("api access requires bearer token", async () => {
  const { app, base, dir } = await setup();
  try {
    const res = await fetch(`${base}/api/state`);
    assert.equal(res.status, 401);
  } finally {
    app.server.close(); await rm(dir, { recursive: true, force: true });
  }
});

test("catalog endpoints return authenticated shared product and tutorial data", async () => {
  const { app, base, token, dir } = await setup();
  try {
    const headers = { authorization: `Bearer ${token}` };
    const products = await fetch(`${base}/api/catalog/products`, { headers });
    const tutorials = await fetch(`${base}/api/catalog/tutorials`, { headers });
    assert.equal(products.status, 200);
    assert.equal(tutorials.status, 200);
    assert.ok((await products.json()).data.length > 0);
    assert.ok((await tutorials.json()).data.length > 0);
  } finally {
    app.server.close(); await rm(dir, { recursive: true, force: true });
  }
});

test("state POST with If-Match conflict is rejected", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "veylumi-repo-conflict-"));
  try {
    const repoFile = path.join(dir, "state.json");
    const { createJsonRepository } = await import("../services/api/server/local-repository.mjs");
    const repository = createJsonRepository(repoFile);
    await repository.replace({ version: 1, revision: 0, analyses: [] });
    const app = createApp({ repository, previewStore: createPreviewStore({ dir: path.join(dir, "p") }), queueOptions: { runner: async () => ({}) } });
    await app.start(0);
    const base = `http://127.0.0.1:${app.server.address().port}`;
    const token = app.apiToken;
    const get = await fetch(`${base}/api/state`, { headers: { authorization: `Bearer ${token}` } });
    const current = (await get.json()).data;
    // 用错误 revision 提交 → 409
    const conflict = await fetch(`${base}/api/state`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "if-match": "999" }, body: JSON.stringify(current) });
    assert.equal(conflict.status, 409);
    // 用正确 revision 提交 → 200
    const ok = await fetch(`${base}/api/state`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "if-match": String(current.revision) }, body: JSON.stringify(current) });
    assert.equal(ok.status, 200);
    app.server.close();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("state PATCH applies one named operation with revision protection", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "veylumi-state-patch-"));
  const { createJsonRepository } = await import("../services/api/server/local-repository.mjs");
  const app = createApp({ repository: createJsonRepository(path.join(dir, "state.json")), previewStore: createPreviewStore({ dir: path.join(dir, "preview") }), queueOptions: { runner: async () => ({}) } });
  await app.start(0);
  try {
    const base = `http://127.0.0.1:${app.server.address().port}`;
    const headers = { authorization: `Bearer ${app.apiToken}` };
    const before = (await (await fetch(`${base}/api/state`, { headers })).json()).data;
    const response = await fetch(`${base}/api/state`, { method: "PATCH", headers: { ...headers, "content-type": "application/json", "if-match": String(before.revision) }, body: JSON.stringify({ operation: "toggleSavedProduct", productId: 2 }) });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.ok(result.data.savedProductIds.includes(2));
  } finally { app.server.close(); await rm(dir, { recursive: true, force: true }); }
});

test("analyze returns 202 and idempotent replay returns 200", async () => {
  const { app, base, token, dir } = await setup();
  try {
    const submit = await fetch(`${base}/api/analyze`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "idempotency-key": "demo-key-1" }, body: JSON.stringify({ imageData: JPEG, filename: "face.jpg", mimeType: "image/jpeg", size: 10 }) });
    assert.equal(submit.status, 202);
    const first = (await submit.json()).data;
    const replay = await fetch(`${base}/api/analyze`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "idempotency-key": "demo-key-1" }, body: JSON.stringify({ imageData: JPEG, filename: "other.jpg", mimeType: "image/jpeg", size: 10 }) });
    assert.equal(replay.status, 200);
    const second = (await replay.json()).data;
    assert.equal(second.jobId, first.jobId);
  } finally {
    app.server.close(); await rm(dir, { recursive: true, force: true });
  }
});

test("preview GET requires auth and 404s unknown jobs", async () => {
  const { app, base, token, dir } = await setup();
  try {
    const noAuth = await fetch(`${base}/api/analyze/job_unknown/preview`);
    assert.equal(noAuth.status, 401);
    const withAuth = await fetch(`${base}/api/analyze/job_unknown/preview`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(withAuth.status, 404);
  } finally {
    app.server.close(); await rm(dir, { recursive: true, force: true });
  }
});

test("admin endpoints reject bad admin token", async () => {
  const { app, base, dir } = await setup();
  try {
    const res = await fetch(`${base}/api/admin/metrics`, { headers: { "x-admin-token": "wrong" } });
    assert.equal(res.status, 401);
  } finally {
    app.server.close(); await rm(dir, { recursive: true, force: true });
  }
});

test("unknown api route returns 404 and unsupported method 405", async () => {
  const { app, base, token, dir } = await setup();
  try {
    const notFound = await fetch(`${base}/api/nope`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(notFound.status, 404);
    const methodNotAllowed = await fetch(`${base}/api/state`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
    assert.equal(methodNotAllowed.status, 405);
  } finally {
    app.server.close(); await rm(dir, { recursive: true, force: true });
  }
});

test("cors rejects disallowed origin", async () => {
  const { app, base, token, dir } = await setup();
  try {
    const res = await fetch(`${base}/api/state`, { headers: { authorization: `Bearer ${token}`, origin: "http://evil.example.com" } });
    assert.equal(res.status, 403);
  } finally {
    app.server.close(); await rm(dir, { recursive: true, force: true });
  }
});
