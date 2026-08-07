import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

function read(relativePath) {
  return fs.readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

test("server has an explicit Codex analysis to image-edit provider boundary", () => {
  const source = read("../server/local-api.mjs");
  assert.match(source, /generatePhotorealisticPreview/);
  assert.match(source, /VEYLUMI_IMAGE_PROVIDER/);
  assert.match(source, /analyzeWithLocalCodex/);
});

test("Ollama generation is no longer exposed as an image provider", () => {
  const source = read("../server/local-api.mjs");
  assert.doesNotMatch(source, /ollama/i);
});

test("image provider uses the photo edit endpoint and preserves input fidelity", () => {
  const source = read("../server/image-edit-provider.mjs");
  assert.match(source, /\/v1\/images\/edits/);
  assert.match(source, /gpt-image-2/);
  assert.match(source, /b64_json/);
});

test("local OpenAI mode has an explicit mock path without an API key", () => {
  const source = read("../server/image-edit-provider.mjs");
  assert.match(source, /generateMockPhotorealisticPreview/);
  assert.match(source, /OPENAI_API_KEY/);
  assert.match(source, /VEYLUMI_MODE/);
});

test("generated previews are stored privately through the preview store", () => {
  const source = read("../server/image-edit-provider.mjs");
  assert.match(source, /previewStore\.write/);
  assert.match(source, /preview-store\.mjs/);
  const store = read("../server/preview-store.mjs");
  assert.match(store, /\/api\/analyze\/\$\{jobId\}\/preview/);
});

test("preview files are no longer written into the public web root", () => {
  const source = read("../server/image-edit-provider.mjs");
  assert.doesNotMatch(source, /public\/generated/);
  assert.doesNotMatch(source, /\/generated\//);
});
