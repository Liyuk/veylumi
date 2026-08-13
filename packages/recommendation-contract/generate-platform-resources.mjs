import { mkdir, readFile, writeFile } from "node:fs/promises";

const rules = JSON.parse(await readFile(new URL("rules.json", import.meta.url), "utf8"));
const weights = rules.weights;
const ts = `/** Generated from packages/recommendation-contract/rules.json. */\nexport const recommendationRules = ${JSON.stringify(rules, null, 2)} as const;\n`;
const kotlin = `// Generated from packages/recommendation-contract/rules.json.\npackage com.veylumi\nobject RecommendationRules { const val base = ${weights.base}; const val undertone = ${weights.undertone}; const val skin = ${weights.skin}; const val region = ${weights.region}; const val category = ${weights.category}; const val max = ${weights.max}; const val tieRefinementOnly = true }\n`;
const swift = `// Generated from packages/recommendation-contract/rules.json.\nimport Foundation\nenum RecommendationRules { static let base = ${weights.base}; static let undertone = ${weights.undertone}; static let skin = ${weights.skin}; static let region = ${weights.region}; static let category = ${weights.category}; static let max = ${weights.max}; static let tieRefinementOnly = true }\n`;

for (const [path, data] of [["generated.ts", ts], ["../../apps/android/app/src/main/java/com/veylumi/RecommendationRules.kt", kotlin], ["../../apps/ios/Veylumi/RecommendationRules.swift", swift]]) {
  const destination = new URL(path, import.meta.url);
  await mkdir(new URL(".", destination), { recursive: true });
  await writeFile(destination, data);
}
