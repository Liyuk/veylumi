import test from "node:test";
import assert from "node:assert/strict";
import { normalizeArea, normalizeMakeupPlan } from "../server/plan-normalize.mjs";

test("normalizeArea maps free English labels to the canonical union", () => {
  assert.equal(normalizeArea("Complexion"), "base");
  assert.equal(normalizeArea("Cheeks"), "cheek");
  assert.equal(normalizeArea("High points"), null);
  assert.equal(normalizeArea("Face structure"), null);
  assert.equal(normalizeArea("Skin"), "base");
  assert.equal(normalizeArea("Overall"), "base");
  assert.equal(normalizeArea("lip color"), "lip");
  assert.equal(normalizeArea("brows"), "brow");
  assert.equal(normalizeArea(undefined), null);
});

test("normalizeMakeupPlan filters unmappable areas and unknown categories", () => {
  const plan = normalizeMakeupPlan([
    { id: "a", order: 1, area: "Complexion", title: "Base", productCategoryIds: ["base", "nonexistent"], tutorialIds: ["t1", "t2", "t3", "t4"] },
    { id: "b", order: 2, area: "Face structure", title: "Drop" },
    { id: "c", order: 3, area: "lips", title: "Lip", productCategoryIds: ["lip"] },
  ]);
  assert.equal(plan.length, 2);
  assert.equal(plan[0].area, "base");
  assert.deepEqual(plan[0].productCategoryIds, ["base"]);
  assert.ok(plan[0].tutorialIds.length <= 3);
  assert.equal(plan[1].area, "lip");
});

test("normalizeMakeupPlan caps steps and defaults missing fields", () => {
  const plan = normalizeMakeupPlan([{ area: "eye" }, { area: "eye" }, { area: "eye" }], { maxSteps: 2 });
  assert.equal(plan.length, 2);
  assert.equal(plan[0].title, "妆容步骤");
});
