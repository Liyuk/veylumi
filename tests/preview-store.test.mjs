import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createPreviewStore } from "../services/api/server/preview-store.mjs";

test("preview store writes and reads files by job id", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "veylumi-preview-"));
  try {
    const store = createPreviewStore({ dir, ttlMs: 1000 });
    await store.write("job_abc", Buffer.from("<svg/>"), "svg");
    const file = await store.read("job_abc");
    assert.ok(file);
    assert.equal(file.buffer.toString(), "<svg/>");
    assert.equal(file.contentType, "image/svg+xml");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("preview store rejects path-traversal job ids", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "veylumi-preview-sec-"));
  try {
    const store = createPreviewStore({ dir });
    await assert.rejects(() => store.write("../escape", Buffer.from("x"), "svg"), /无效的 jobId/);
    assert.equal(await store.read("../escape"), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("preview store sweeps expired files by mtime", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "veylumi-preview-sweep-"));
  try {
    const store = createPreviewStore({ dir, ttlMs: 1000 });
    await store.write("job_old", Buffer.from("<svg/>"), "svg");
    await new Promise((resolve) => setTimeout(resolve, 10));
    const removed = await store.sweep(Date.now() + 5000);
    assert.equal(removed, 1);
    assert.equal(await store.read("job_old"), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("preview store delete removes the file and is idempotent", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "veylumi-preview-del-"));
  try {
    const store = createPreviewStore({ dir });
    await store.write("job_x", Buffer.from("<svg/>"), "svg");
    assert.equal(await store.delete("job_x"), true);
    assert.equal(await store.delete("job_x"), true);
    assert.equal(await store.read("job_x"), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
