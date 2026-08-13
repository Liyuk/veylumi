import test from "node:test";
import assert from "node:assert/strict";
import { MAX_REQUEST_BYTES, validateImageInput } from "../services/api/server/input-validation.mjs";

const jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

test("validates image magic bytes and normalizes byte size", () => {
  const result = validateImageInput({ imageData: jpeg, filename: "face.jpg", mimeType: "text/plain", size: 1 });
  assert.equal(result.mimeType, "image/jpeg");
  assert.equal(result.size, 10);
});

test("rejects spoofed, unsupported and oversized image input", () => {
  assert.throws(() => validateImageInput({ imageData: "data:image/png;base64,/9j/4AAQSkZJRg==" }), /类型不匹配/);
  assert.throws(() => validateImageInput({ imageData: "data:image/svg+xml;base64,PHN2Zy8+" }), /只支持/);
  assert.ok(MAX_REQUEST_BYTES > 10 * 1024 * 1024);
});

test("request sizing leaves room for base64 overhead", () => {
  assert.ok(MAX_REQUEST_BYTES >= 14_000_000);
});
