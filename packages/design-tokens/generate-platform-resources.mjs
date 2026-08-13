import { mkdir, readFile, writeFile } from "node:fs/promises";

const source = JSON.parse(await readFile(new URL("tokens.json", import.meta.url), "utf8"));
const groups = ["color", "space", "radius", "typography"];
const camel = (value) => value.replace(/(^|[-_])(\w)/g, (_, __, letter) => letter.toUpperCase());
const cssName = (value) => value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const hexToArgb = (value) => `0xFF${value.slice(1).toUpperCase()}`;
const colors = Object.entries(source.color);
const dimensions = groups.filter((group) => group !== "color").flatMap((group) => Object.entries(source[group]).map(([name, token]) => [group, name, token]));

const css = `/* Generated from packages/design-tokens/tokens.json. Do not edit. */\n:root {\n${groups.flatMap((group) => Object.entries(source[group]).map(([name, token]) => { const prefix = group === "color" ? "" : group === "typography" ? "type-" : `${group}-`; return `  --veylumi-${prefix}${cssName(name)}: ${token.$value}${token.$type === "dimension" ? "px" : ""};`; })).join("\n")}\n}\n`;
const android = `// Generated from packages/design-tokens/tokens.json. Do not edit.\npackage com.veylumi\n\nimport androidx.compose.ui.graphics.Color\nimport androidx.compose.ui.unit.dp\n\nobject DesignTokens {\n${colors.map(([name, token]) => `    val ${camel(name)} = Color(${hexToArgb(token.$value)})`).join("\n")}\n${dimensions.map(([group, name, token]) => `    val ${camel(group)}${camel(name)} = ${token.$value}.dp`).join("\n")}\n}\n`;
const ios = `// Generated from packages/design-tokens/tokens.json. Do not edit.\nimport SwiftUI\n\nenum DesignTokens {\n${colors.map(([name, token]) => `    static let ${name} = Color(hex: ${hexToArgb(token.$value)})`).join("\n")}\n${dimensions.map(([group, name, token]) => `    static let ${group}${camel(name)}: CGFloat = ${token.$value}`).join("\n")}\n}\n\nextension Color {\n    init(hex: UInt) { self.init(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255, opacity: 1) }\n}\n`;

const outputs = [
  ["../../apps/web/app/generated-tokens.css", css],
  ["../../apps/android/app/src/main/java/com/veylumi/DesignTokens.kt", android],
  ["../../apps/ios/Veylumi/DesignTokens.swift", ios],
];
for (const [relativePath, contents] of outputs) { const destination = new URL(relativePath, import.meta.url); await mkdir(new URL(".", destination), { recursive: true }); await writeFile(destination, contents); }
