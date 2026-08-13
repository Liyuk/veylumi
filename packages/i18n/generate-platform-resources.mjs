import { mkdir, readFile, writeFile } from "node:fs/promises";

const locales = ["zh-CN", "en-US"];
const xmlEscape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "\\\"").replaceAll("'", "\\'");
const stringsEscape = (value) => value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n");

const resources = await Promise.all(locales.map(async (locale) => [locale, JSON.parse(await readFile(new URL(`locales/${locale}.json`, import.meta.url), "utf8"))]));
const [defaultLocale, defaultMessages] = resources[0];
const expectedKeys = Object.keys(defaultMessages).sort();
for (const [locale, messages] of resources) {
  const keys = Object.keys(messages).sort();
  if (keys.join("\n") !== expectedKeys.join("\n")) throw new Error(`${locale} does not match ${defaultLocale} translation keys`);
}

for (const [locale, messages] of resources) {
  const androidDirectory = locale === "en-US" ? "values-en" : "values";
  const androidPath = new URL(`../../apps/android/app/src/main/res/${androidDirectory}/strings.xml`, import.meta.url);
  await mkdir(new URL(".", androidPath), { recursive: true });
  const xml = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${expectedKeys.map((key) => `  <string name="${key.replaceAll(".", "_")}">${xmlEscape(messages[key])}</string>`).join("\n")}\n</resources>\n`;
  await writeFile(androidPath, xml);

  const iosDirectory = locale === "en-US" ? "en.lproj" : "zh-Hans.lproj";
  const iosPath = new URL(`../../apps/ios/Veylumi/Resources/${iosDirectory}/Localizable.strings`, import.meta.url);
  await mkdir(new URL(".", iosPath), { recursive: true });
  await writeFile(iosPath, expectedKeys.map((key) => `\"${key}\" = \"${stringsEscape(messages[key])}\";`).join("\n") + "\n");
}
