import assert from "node:assert/strict";
import test from "node:test";
import { analyzeLocalPhoto } from "../server/local-ai.mjs";

test("local AI analyzes the demo face photo through the provider contract", async () => {
  const result = await analyzeLocalPhoto({ filename: "face.jpeg", mimeType: "image/jpeg", size: 12345 });

  assert.equal(result.provider, "local-mock");
  assert.equal(result.inspection.faceCount, 1);
  assert.equal(result.inspection.isFrontal, true);
  assert.equal(result.analysis.faceShape, "椭圆偏长");
  assert.equal(result.analysis.undertone, "中性偏暖");
  assert.equal(result.analysis.styleMatches[0].name, "柔和暖中性日常妆");
  assert.equal(result.analysis.makeupPlan.length, 8);
  assert.equal(result.analysis.previewPrompt.preserveIdentity, true);
  assert.ok(result.analysis.confidence >= 0 && result.analysis.confidence <= 100);
});
