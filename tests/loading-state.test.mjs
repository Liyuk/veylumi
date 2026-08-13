import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("upload enters processing state before the asynchronous analysis request", () => {
  const source = fs.readFileSync("apps/web/app/page.tsx", "utf8");
  const uploadStart = source.indexOf("async function handleUpload");
  const requestStart = source.indexOf("startPhotoAnalysis(file)", uploadStart);
  const loadingState = source.indexOf("setProcessing(true)", uploadStart);
  assert.ok(uploadStart >= 0, "upload handler should exist");
  assert.ok(requestStart >= 0, "upload should submit an analysis request");
  assert.ok(loadingState >= 0, "upload should enter processing state");
  assert.ok(loadingState < requestStart, "processing state must be visible before request/SSE waiting begins");
});
