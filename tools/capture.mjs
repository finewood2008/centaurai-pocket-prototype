/* ============================================================
 * capture.mjs —— 390×844 逐屏截图
 *
 * 跑法（新目录没有 node_modules，playwright 指向秘书仓库那份）：
 *   NODE_PATH=/home/user/centaur-executive-os-prototype/node_modules \
 *   node tools/capture.mjs
 *
 * 三件事：
 *  1) 自己起 python3 -m http.server，跑完关掉；
 *  2) **不做「屏 × 场景」笛卡尔积** —— 每屏只截它自己有差别的那几个场景，
 *     否则 output/ 里一堆逐字节相同的重复图，看起来像覆盖了实际没覆盖的东西；
 *  3) 收集 console error 与 pageerror，有任何一条就整体非零退出 ——
 *     selfCheck() 的七条断言因此成为真正的门禁。
 * ============================================================ */

import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(
  "file:///home/user/centaur-executive-os-prototype/node_modules/"
);
const { chromium } = require("playwright");

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, "output");
const PORT = Number(process.env.PORT || 8792);
const BASE = `http://127.0.0.1:${PORT}`;

/* 本机装的是 chromium-1234，不要照抄别处硬编码的 1228 */
const EXECUTABLE =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  "/home/user/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";

/* 每屏声明自己要截的场景。normal 之外只列真正有差别的。 */
const SHOTS = [
  { name: "01-今日", hash: "#/today", scenarios: ["normal", "loading", "empty", "error-offline", "backlog"] },
  { name: "02-治理-单卡", hash: "#/governance", scenarios: ["normal", "loading", "empty", "backlog", "error-offline"] },
  { name: "03-治理-全部待办", hash: "#/governance/all", scenarios: ["normal", "backlog"] },
  { name: "04-治理-编辑后接受", hash: "#/governance/edit/gt-9001", scenarios: ["normal", "empty"] },
  { name: "05-数据-我的视角", hash: "#/data", scenarios: ["normal", "empty", "error-offline"] },
  { name: "06-数据-Agent视角", hash: "#/data", query: "view=agent", scenarios: ["normal", "backlog", "empty", "error-offline"] },
  { name: "07-数据-条目详情", hash: "#/data/item/it-3301", scenarios: ["normal", "error-offline"] },
  { name: "08-数据-来源列表", hash: "#/data/sources", scenarios: ["normal", "empty", "error-sync-failed"] },
  { name: "09-数据-来源详情", hash: "#/data/sources/src-folder-2", scenarios: ["normal", "error-sync-failed"] },
  { name: "10-数据-观察器来源", hash: "#/data/sources/src-wechat-1", scenarios: ["normal", "observer-degraded"] },
  { name: "11-盒子", hash: "#/box", scenarios: ["normal", "error-offline"] },
  { name: "12-盒子-私有网络", hash: "#/box/network", scenarios: ["normal", "error-offline"] },
  { name: "13-盒子-我的设备", hash: "#/box/devices", scenarios: ["normal", "empty"] },
  { name: "14-盒子-谁能用我的数据", hash: "#/box/access", scenarios: ["normal", "empty", "error-offline"] },
  { name: "15-盒子-Agent凭据", hash: "#/box/access/agent", scenarios: ["normal", "error-offline"] },
  { name: "16-盒子-连接配置", hash: "#/box/connection", scenarios: ["normal", "error-offline"] },
  { name: "17-首次配对", hash: "#/onboarding/pair", scenarios: ["normal", "error-offline"] },
  /* sheet 是父屏上的 ?sheet= 参数，不是独立 hash */
  { name: "18-新增来源", hash: "#/data/sources", query: "sheet=add-source", scenarios: ["normal", "empty"] },
  { name: "19-采集", hash: "#/data", query: "sheet=capture", scenarios: ["normal"] },
  { name: "20-基元", hash: "#/kitchen-sink", scenarios: ["normal"] }
];

/* 接口视图单独一遍：这是给后端评审看的「产品 × 接口」全景 */
const API_SHOTS = SHOTS.filter((s) => s.scenarios.includes("normal"));

function url(shot, scenario, extra = "") {
  const q = ["scenario=" + scenario, "frame=0", "tools=0", shot.query, extra]
    .filter(Boolean)
    .join("&");
  return `${BASE}/index.html${shot.hash}?${q}`;
}

async function waitForServer(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${BASE}/index.html`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("本地静态服务器没起来");
}

const problems = [];

const server = spawn(
  "python3",
  ["-m", "http.server", String(PORT), "--bind", "127.0.0.1", "--directory", ROOT],
  { stdio: "ignore" }
);

try {
  await waitForServer();
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({
    executablePath: EXECUTABLE,
    args: ["--lang=zh-CN", "--font-render-hinting=none"]
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: "zh-CN"
  });

  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`[console] ${page.url()} :: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`[pageerror] ${page.url()} :: ${e.message}`));

  let count = 0;

  for (const shot of SHOTS) {
    for (const scenario of shot.scenarios) {
      const dir = path.join(OUT, scenario);
      await mkdir(dir, { recursive: true });
      await page.goto(url(shot, scenario), { waitUntil: "load" });
      /* 关掉转场，避免截到中间帧 */
      await page.addStyleTag({
        content: "*,*::before,*::after{transition:none!important;animation:none!important}"
      });
      await page.waitForFunction(() => document.body.dataset.rendered === "1");
      await page.screenshot({ path: path.join(dir, `${shot.name}.png`) });
      await page.screenshot({ path: path.join(dir, `${shot.name}-full.png`), fullPage: true });
      count += 2;
    }
  }

  const apiDir = path.join(OUT, "api");
  await mkdir(apiDir, { recursive: true });
  for (const shot of API_SHOTS) {
    await page.goto(url(shot, "normal", "api=1"), { waitUntil: "load" });
    await page.addStyleTag({
      content: "*,*::before,*::after{transition:none!important;animation:none!important}"
    });
    await page.waitForFunction(() => document.body.dataset.rendered === "1");
    await page.screenshot({ path: path.join(apiDir, `${shot.name}.png`), fullPage: true });
    count++;
  }

  /* 联览墙 */
  await page.setViewportSize({ width: 1680, height: 1200 });
  await page.goto(`${BASE}/wall.html`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "00-联览.png"), fullPage: true });
  count++;

  await browser.close();
  console.log(`已输出 ${count} 张图到 ${OUT}`);
} finally {
  server.kill();
}

if (problems.length) {
  console.error(`\n有 ${problems.length} 条页面报错，截图不可信：`);
  [...new Set(problems)].slice(0, 30).forEach((p) => console.error("  " + p));
  process.exit(1);
}
console.log("页面无 console error / pageerror —— selfCheck 七条断言全绿。");
