/* ============================================================
 * #/wall —— 同文档内的联览墙
 *
 * 与 wall.html 的区别：那份用 iframe，这份把每屏的 render() 直接渲进一个
 * 390×844 的 .mini-device 里再整体缩放。因为**不依赖任何外部文件**，
 * 单文件打包版（dist/）才能带上联览。
 *
 * 屏的 render() 都是纯函数（snap, route）→ HTML 字符串，所以这里能按需
 * 给每个格子造一份自己的 route 与快照 —— 条目详情、来源详情这类带 param 的
 * 格子因此显示的是真的那一条，不是兜底的第一条。
 * ============================================================ */
(function (P) {
  "use strict";

  var ui = P.ui;

  var CELLS = [
    { key: "today", label: "今日" },
    { key: "governance", label: "治理 · 单卡" },
    { key: "data", label: "数据 · 我的视角" },
    { key: "data", view: "agent", label: "数据 · Agent 视角" },
    { key: "box", label: "盒子" },
    { key: "box/access", label: "谁能用我的数据" },
    { key: "box/network", label: "私有网络（占位）" },
    { key: "onboarding/pair", label: "首次配对" },
    { key: "governance/all", label: "全部待办" },
    { key: "governance/edit", param: "gt-9001", label: "编辑后接受" },
    { key: "data/item", param: "it-3301", label: "条目详情" },
    { key: "data/sources", label: "数据来源" },
    { key: "data/sources", param: "src-folder-2", label: "来源详情" },
    { key: "data/sources", param: "src-wechat-1", label: "观察器来源" },
    { key: "box/devices", label: "我的设备" },
    { key: "box/access/agent", label: "Agent 凭据" },
    { key: "box/connection", label: "连接配置" },
    { key: "data/sources", sheet: "add-source", label: "新增来源" },
    { key: "data", sheet: "capture", label: "采集" },
    { key: "kitchen-sink", label: "基元" }
  ];

  /* 每个格子底部那条静态 tab bar，只为观感，不可点 */
  function miniTabbar(activeTab) {
    return (
      '<div class="mini-tabbar" aria-hidden="true">' +
      P.TABS.map(function (t) {
        return (
          '<div class="mini-tabbar__item' +
          (t.id === activeTab ? " mini-tabbar__item--on" : "") +
          '"><span class="mini-tabbar__glyph">' + t.glyph + "</span>" +
          '<span class="mini-tabbar__label">' + t.label + "</span></div>"
        );
      }).join("") +
      "</div>"
    );
  }

  function cellPath(c) {
    return "/" + c.key + (c.param ? "/" + c.param : "");
  }

  function cellApis(c) {
    var def = P.SCREENS[c.key] || {};
    var keys = (def.api || []).slice(0, 2);
    if (c.sheet && P.SHEETS[c.sheet]) keys = (P.SHEETS[c.sheet].api || []).slice(0, 2);
    return keys
      .map(function (k) {
        var d = P.ENDPOINTS[k];
        if (!d) return k;
        return d.method + " " + d.path.split("?")[0] + (d.status === "proposed" ? "（待提供）" : d.status === "change" ? "（需改）" : "");
      })
      .join(" · ");
  }

  P.SCREENS.wall = {
    title: "联览",
    tab: null,
    kind: "tab",
    chrome: "wall",
    api: [],
    reads: [],

    render: function (snap, route) {
      var head =
        '<header class="wall-head">' +
        '<img class="wall-head__mark" src="assets/centaur-logo.png" alt="半人马AI" />' +
        "<div>" +
        '<h1 class="wall-head__title">CentaurAI Pocket · 个人数据治理 APP</h1>' +
        '<p class="wall-head__note">' +
        "一屏看完整个产品。每一格都是原型本体，点进去可以真的用。" +
        "上面切场景会同时改所有格子 —— 「盒子连不上」时四个 tab 必须同时表现为连不上。" +
        "打开「接口视图」，这面墙就是一张「产品 × 接口」全景图。" +
        "</p></div></header>";

      var cells = CELLS.map(function (c, i) {
        /* 每格造一份自己的 route，再据此取快照 —— 带 param 的格子才会显示对的那一条 */
        var r = {
          path: cellPath(c),
          key: c.key,
          param: c.param || null,
          tab: (P.SCREENS[c.key] || {}).tab || null,
          scenario: route.scenario,
          view: c.view || "owner",
          query: "",
          api: route.api,
          sheet: c.sheet || null,
          frame: false,
          tools: false
        };
        var s = P.data(route.scenario, r);
        var def = P.SCREENS[c.key];
        var inner = "";

        if (def.kind === "push") {
          var heading = typeof def.heading === "function" ? def.heading(r) : def.heading || def.title;
          var subtitle = typeof def.subtitle === "function" ? def.subtitle(r) : def.subtitle;
          inner += ui.BackBar({ title: heading, subtitle: subtitle, label: def.backLabel });
        }
        inner += def.render(s, r);

        var sheetLayer = "";
        if (c.sheet && P.SHEETS[c.sheet]) {
          var sh = P.SHEETS[c.sheet];
          sheetLayer =
            '<div class="mini-sheet">' +
            '<div class="sheet__grabber"><span></span></div>' +
            '<div class="sheet__head"><span class="sheet__title">' + ui.esc(sh.title) + "</span>" +
            '<span class="sheet__close">关闭</span></div>' +
            '<div class="mini-stage mini-stage--sheet">' + sh.render(s, r) + "</div>" +
            "</div>";
        }

        var go = c.view
          ? ' data-go="' + cellPath(c) + '" data-view="' + c.view + '"'
          : c.sheet
            ? ' data-go="' + cellPath(c) + '" data-sheet="' + c.sheet + '"'
            : ' data-go="' + cellPath(c) + '"';

        /* 注意：这里必须用 div，不能用 span/button 包块级内容 ——
           <span> 遇到块级子元素会被解析器提前闭合，屏内容会被抬出缩放容器，
           整面墙就变成一堆没缩放的碎片。 */
        return (
          '<div class="wall-cell">' +
          '<div class="wall-cell__viewport" role="button" tabindex="0"' + go +
          ' aria-label="打开' + ui.esc(c.label) + '">' +
          '<div class="mini-device" data-mini="' + i + '">' +
          '<div class="mini-stage">' + inner + "</div>" +
          (P.SCREENS[c.key].chrome ? "" : miniTabbar(r.tab)) +
          sheetLayer +
          "</div></div>" +
          '<div class="wall-cell__label">' + ui.esc(c.label) + "</div>" +
          '<div class="wall-cell__api">' + ui.esc(cellApis(c) || "—") + "</div>" +
          "</div>"
        );
      });

      return head + '<div class="wall-grid">' + cells.join("") + "</div>";
    }
  };

  /* 渲染后按格子实际宽度缩放 —— 用 transform 不用 zoom，保住 390 这个前提 */
  P.scaleWall = function () {
    var vps = document.querySelectorAll(".wall-cell__viewport");
    Array.prototype.forEach.call(vps, function (vp) {
      var mini = vp.querySelector(".mini-device");
      if (mini) mini.style.transform = "scale(" + vp.clientWidth / 390 + ")";
    });
  };

  window.addEventListener("resize", function () {
    if (P.route && P.route.key === "wall") P.scaleWall();
  });
})((window.Pocket = window.Pocket || {}));
