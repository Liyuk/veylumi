import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { renderPreviewSvg } from "../server/preview-svg.mjs";

test("Codex analysis is materialized into a labeled non-photorealistic preview SVG", () => {
  const svg = renderPreviewSvg({
    direction: "Soft natural beauty",
    colorProfile: { season: "Soft Spring", palette: ["#d79b83", "#a85f58"] },
    makeupPlan: [{ title: "Sheer even base" }],
  });
  assert.match(svg, /<svg/);
  assert.match(svg, /Soft natural beauty/);
  assert.match(svg, /Sheer even base/);
  assert.match(svg, /非照片级试妆预览/);
});

test("Codex prompt requests Chinese user-facing copy while keeping image prompt English", () => {
  const source = fs.readFileSync(fileURLToPath(new URL("../server/codex-provider.mjs", import.meta.url)), "utf8");
  assert.match(source, /user-facing strings.*Chinese/i);
  assert.match(source, /previewPrompt.*English/i);
});
