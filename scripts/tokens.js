/* tokens.js —— 需要在 JS 里用到的少量常量。色值一律不在这里，只在 styles/tokens.css。 */
(function (P) {
  "use strict";

  /* 底部 tab：今日 / 治理 / 数据 / 盒子
     对 origin/main 的 今日 / 治理 / 同步 / 设置 改了两处：
       同步 → 数据（配置源是一次性动作，/items 与检索当前完全没有界面）
       设置 → 盒子（那一格装的是「我和我那台盒子之间的连接与边界」）
     不加第 5 个 tab：数据治理是有限游戏，IA 必须收敛。 */
  P.TABS = [
    { id: "today", path: "/today", label: "今日", glyph: "⌂" },
    { id: "governance", path: "/governance", label: "治理", glyph: "⛨" },
    { id: "data", path: "/data", label: "数据", glyph: "▤" },
    { id: "box", path: "/box", label: "盒子", glyph: "▣" }
  ];

  P.SCENARIOS = [
    { id: "normal", label: "正常" },
    { id: "loading", label: "加载中" },
    { id: "empty", label: "空态（刚装好）" },
    { id: "error-offline", label: "盒子连不上" },
    { id: "error-sync-failed", label: "数据源同步失败" },
    { id: "backlog", label: "治理任务堆积（147）" },
    { id: "observer-degraded", label: "观察器降级" }
  ];

  P.SCREENS = {};
  P.SHEETS = {};
})((window.Pocket = window.Pocket || {}));
