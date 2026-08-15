// 静态产物后处理：把根绝对引用（/assets/...、/favicon.svg）补上 GitHub Pages
// 子路径前缀。
//
// 为什么需要：vinext 的 vite base 只改写了 HTML 里的 JS/CSS 资源引用和 RSC
// 数据里的组件路径，但（1）next/font 自托管字体由 vinext 的 google-fonts 插件
// 硬编码成 /assets/_vinext_fonts/...，（2）layout.tsx 的 metadata favicon 是
// /favicon.svg 绝对路径。GitHub Pages 项目子路径（/veylumi/）下两者都会 404，
// 因此构建完成后统一把未带前缀的 /assets/ 与 /favicon.svg 重写为带前缀版本。
//
// 只处理静态部署的产物目录（默认 apps/web/dist/client）。根域部署时把
// VEYLUMI_BASE_PATH 设为空，脚本不做任何改动。

import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const clientDir = resolve(process.env.VEYLUMI_STATIC_OUT_DIR ?? "apps/web/dist/client");
const basePath = (process.env.VEYLUMI_BASE_PATH ?? "/veylumi").replace(/\/+$/, "");
if (basePath === "") {
  console.log("[static-rewrite] base path is empty, skipping rewrite");
  process.exit(0);
}

const TEXT_EXTENSIONS = new Set([".html", ".js", ".css", ".json", ".rsc", ".svg", ".txt", ".map", ".mjs"]);

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const escapedBase = basePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// 负向断言：已带 basePath 前缀的 /assets/ 与 /favicon.svg 不再重复加前缀。
const RE_ASSETS = new RegExp(`(?<!${escapedBase})(\\/assets\\/)`, "g");
const RE_FAVICON = new RegExp(`(?<!${escapedBase})(\\/favicon\\.svg)`, "g");

async function main() {
  let rewritten = 0;
  for await (const file of walk(clientDir)) {
    const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext) || file.endsWith(".map")) continue;

    const original = await readFile(file, "utf8");
    const next = original
      .replace(RE_ASSETS, `${basePath}$1`)
      .replace(RE_FAVICON, `${basePath}$1`);

    if (next !== original) {
      await writeFile(file, next, "utf8");
      rewritten += 1;
    }
  }
  console.log(`[static-rewrite] prefixed ${rewritten} files under ${clientDir} with base "${basePath}"`);
}

main().catch((error) => {
  console.error("[static-rewrite] failed:", error);
  process.exit(1);
});
