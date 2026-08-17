/* ============================================================
 * bundle.mjs —— 把整个原型打成一个自包含 HTML 文件
 *
 *   node tools/bundle.mjs
 *   → dist/CentaurAI-Pocket-原型.html
 *
 * 做四件事：
 *  1) 所有 <link rel=stylesheet> 内联成 <style>；
 *  2) 所有 <script src> 内联成 <script>（`</script` 要转义，否则提前截断文档）；
 *  3) logo 换成 data URI —— HTML 的 favicon、CSS、JS 三处都要替；
 *  4) 落地页设成 #/wall（联览墙），别人打开先看到产品全貌。
 *
 * 打出来的文件不请求任何外部资源，双击即可打开，可以直接发给别人。
 * ============================================================ */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = path.join(ROOT, "dist");
const OUT_FILE = path.join(OUT_DIR, "CentaurAI-Pocket-原型.html");
const LOGO = "assets/centaur-logo.png";

const logoDataUri =
  "data:image/png;base64," + (await readFile(path.join(ROOT, LOGO))).toString("base64");

/* `</script` 出现在内联脚本里会提前关闭标签；`</style` 同理 */
function safeInline(code) {
  return code.replace(/<\/(script|style)/gi, "<\\/$1");
}

let html = await readFile(path.join(ROOT, "index.html"), "utf8");

/* 1) CSS */
const cssTags = [...html.matchAll(/[ \t]*<link rel="stylesheet" href="([^"]+)"\s*\/?>\n?/g)];
for (const m of cssTags) {
  const css = await readFile(path.join(ROOT, m[1]), "utf8");
  html = html.replace(
    m[0],
    `    <style>\n/* ===== ${m[1]} ===== */\n${safeInline(css)}\n    </style>\n`
  );
}

/* 2) JS —— 顺序必须与 index.html 一致：tokens → endpoints → mock → ui → screens → devtools → app */
const jsTags = [...html.matchAll(/[ \t]*<script src="([^"]+)"><\/script>\n?/g)];
for (const m of jsTags) {
  const js = await readFile(path.join(ROOT, m[1]), "utf8");
  html = html.replace(
    m[0],
    `    <script>\n/* ===== ${m[1]} ===== */\n${safeInline(js)}\n    </script>\n`
  );
}

/* 3) logo → data URI（此时 CSS/JS 已经内联进来，一次全局替换即可覆盖三处） */
html = html.split(LOGO).join(logoDataUri);

/* 4) 落地页 = 联览墙 */
html = html.replace(
  "    <script>\n/* ===== scripts/app.js ===== */",
  `    <script>
      /* 单文件版落地在联览墙：先看全貌，再点进任意一屏 */
      if (!location.hash) location.hash = "#/wall";
    </script>
    <script>
/* ===== scripts/app.js ===== */`
);

html = html.replace(
  "<title>CentaurAI Pocket · 高保真原型</title>",
  "<title>CentaurAI Pocket · 个人数据治理 APP · 高保真原型</title>"
);

/* 自检：不许残留任何会真的发出请求的引用。
   注意只查 src/href/url() 这类**资源属性** —— mock 数据里有 https://pocket.example.com
   这种当文本显示的地址，那是内容不是请求。 */
const leftovers = [
  ...[...html.matchAll(/<script src="[^"]+"/g)].map((m) => m[0]),
  ...[...html.matchAll(/<link rel="stylesheet"/g)].map((m) => m[0]),
  ...[...html.matchAll(/(?:src|href)="(?!data:|#)[^"]*(?:assets\/|https?:\/\/)[^"]*"/g)].map((m) => m[0]),
  ...[...html.matchAll(/url\(\s*['"]?(?!data:)https?:[^)]*\)/g)].map((m) => m[0]),
  ...[...html.matchAll(/@import[^;]+;/g)].map((m) => m[0])
];
if (leftovers.length) {
  console.error("打包后仍有外部引用，未自包含：");
  [...new Set(leftovers)].forEach((l) => console.error("  " + l));
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT_FILE, html, "utf8");
const size = (await stat(OUT_FILE)).size;
console.log(
  `已生成 ${OUT_FILE}\n单文件 ${(size / 1024).toFixed(0)} KB，零外部请求，双击即可打开。`
);
