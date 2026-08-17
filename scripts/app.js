/* ============================================================
 * app.js —— hash 路由 + 渲染循环 + 自检
 *
 * tab／二级页／sheet／mock 场景／接口视图全部编码进 URL：
 *   #/data?scenario=backlog&view=agent&api=1
 * 这样每一屏都可深链、可分享、可截图、可复现 —— 截图脚本靠 goto 穷举，不靠点击。
 * ============================================================ */
(function (P) {
  "use strict";

  var ui = P.ui;

  function parseHash() {
    var raw = location.hash.slice(1) || "/today";
    var i = raw.indexOf("?");
    var path = i < 0 ? raw : raw.slice(0, i);
    var q = new URLSearchParams(i < 0 ? "" : raw.slice(i + 1));
    var seg = path.split("/").filter(Boolean);

    var hit = resolveScreen(seg);
    var tabIds = P.TABS.map(function (t) { return t.id; });
    var def = P.SCREENS[hit.key] || {};

    return {
      path: "/" + seg.join("/"),
      key: hit.key,
      param: hit.param,
      tab: def.tab || (tabIds.indexOf(seg[0]) >= 0 ? seg[0] : null),
      scenario: q.get("scenario") || "normal",
      view: q.get("view") || "owner",
      query: q.get("query") || "",
      api: q.get("api") === "1",
      sheet: q.get("sheet") || null,
      frame: q.get("frame") !== "0",
      tools: q.get("tools") !== "0"
    };
  }

  function resolveScreen(seg) {
    for (var n = seg.length; n >= 1; n--) {
      var key = seg.slice(0, n).join("/");
      if (P.SCREENS[key]) return { key: key, param: seg[n] || null };
    }
    return { key: "today", param: null };
  }

  function buildHash(path, o) {
    var q = new URLSearchParams();
    if (o.scenario && o.scenario !== "normal") q.set("scenario", o.scenario);
    if (o.view && o.view !== "owner") q.set("view", o.view);
    if (o.query) q.set("query", o.query);
    if (o.api) q.set("api", "1");
    if (o.sheet) q.set("sheet", o.sheet);
    if (!o.frame) q.set("frame", "0");
    if (!o.tools) q.set("tools", "0");
    var s = q.toString();
    return "#" + path + (s ? "?" + s : "");
  }

  P.go = function (path, opts) {
    var r = P.route || parseHash();
    var next = {
      scenario: r.scenario,
      view: r.view,
      query: r.query,
      api: r.api,
      sheet: null,
      frame: r.frame,
      tools: r.tools
    };
    Object.keys(opts || {}).forEach(function (k) { next[k] = opts[k]; });
    location.hash = buildHash(path || r.path, next);
  };

  P.back = function () {
    if (history.length > 1) history.back();
    else P.go("/today");
  };

  P.toast = function (message, actionLabel) {
    var slot = document.getElementById("toast-slot");
    slot.innerHTML =
      '<div class="toast" role="status">' +
      "<span>" + ui.esc(message) + "</span>" +
      (actionLabel ? '<span class="toast__action">' + ui.esc(actionLabel) + "</span>" : "") +
      "</div>";
    if (P._toastTimer) clearTimeout(P._toastTimer);
    P._toastTimer = setTimeout(function () { slot.innerHTML = ""; }, 2600);
  };

  /* ---------- tab bar ---------- */

  function renderTabbar(route, snap) {
    var bar = document.getElementById("tabbar");
    var def = P.SCREENS[route.key] || {};
    /* chrome 非空（full / wall）的屏都不套手机底栏 */
    if (def.chrome) {
      bar.hidden = true;
      document.querySelector(".home-indicator").hidden = true;
      return;
    }
    bar.hidden = false;
    document.querySelector(".home-indicator").hidden = false;

    var summary = snap.get("GET /governance/inbox/summary");
    var pending = summary.state === "ok" && summary.body ? summary.body.pending_total : 0;

    bar.innerHTML = P.TABS.map(function (t) {
      var current = route.tab === t.id;
      var badge =
        t.id === "governance" && pending
          ? '<span class="tabbar__badge">' + (pending > 99 ? "99+" : pending) + "</span>"
          : "";
      return (
        '<button type="button" class="tabbar__item"' +
        (current ? ' aria-current="page"' : "") +
        ' data-go="' + t.path + '">' +
        '<span class="tabbar__glyph" aria-hidden="true">' + t.glyph + "</span>" +
        badge +
        '<span class="tabbar__label">' + t.label + "</span>" +
        "</button>"
      );
    }).join("");
  }

  /* ---------- 渲染 ---------- */

  function render() {
    var route = (P.route = parseHash());
    var body = document.body;
    body.dataset.tab = route.tab || "";
    body.dataset.scenario = route.scenario;
    body.dataset.api = route.api ? "1" : "0";
    body.dataset.sheet = route.sheet || "";
    body.dataset.frame = route.frame ? "1" : "0";
    body.dataset.tools = route.tools ? "1" : "0";
    body.dataset.rendered = "0";
    body.dataset.chrome = (P.SCREENS[route.key] || {}).chrome || "";

    var snap = P.data(route.scenario, route);
    var def = P.SCREENS[route.key] || P.SCREENS.today;

    var head = "";
    if (def.kind === "push") {
      var heading = typeof def.heading === "function" ? def.heading(route) : def.heading || def.title;
      var subtitle = typeof def.subtitle === "function" ? def.subtitle(route) : def.subtitle;
      head = ui.BackBar({ title: heading, subtitle: subtitle, label: def.backLabel });
    }

    var stage = document.getElementById("stage");
    stage.innerHTML = head + def.render(snap, route);
    stage.scrollTop = 0;

    var sheetEl = document.getElementById("sheet");
    if (route.sheet && P.SHEETS[route.sheet]) {
      var s = P.SHEETS[route.sheet];
      sheetEl.hidden = false;
      sheetEl.innerHTML =
        '<div class="sheet__grabber"><span></span></div>' +
        '<div class="sheet__head"><span class="sheet__title">' + ui.esc(s.title) + "</span>" +
        '<button type="button" class="sheet__close" data-close-sheet="1">关闭</button></div>' +
        '<div class="sheet__body">' + s.render(snap, route) + "</div>";
    } else {
      sheetEl.hidden = true;
      sheetEl.innerHTML = "";
    }

    renderTabbar(route, snap);
    document.getElementById("api-card").hidden = true;

    if (route.key === "wall" && P.scaleWall) P.scaleWall();
    if (P.paintApiBadges) P.paintApiBadges();
    if (P.syncDevtools) P.syncDevtools(route);
    selfCheck(route, snap, def);
    if (route.sheet && P.SHEETS[route.sheet]) {
      selfCheck(route, snap, Object.assign({ title: "sheet:" + route.sheet }, P.SHEETS[route.sheet]));
    }

    document.title = (def.title || "Pocket") + " · CentaurAI Pocket";
    body.dataset.rendered = "1";
  }

  P.render = render;

  /* ---------- 自检：七条断言，全部走 console.error，截图脚本会因此失败 ---------- */

  function resolvePath(obj, path) {
    var cur = obj;
    var parts = path.split(".");
    for (var i = 0; i < parts.length; i++) {
      if (cur === null || cur === undefined) return undefined;
      var p = parts[i];
      var m = p.match(/^(\w+)\[(\d+)\]$/);
      if (m) {
        cur = cur[m[1]];
        if (!Array.isArray(cur)) return undefined;
        cur = cur[Number(m[2])];
      } else {
        cur = cur[p];
      }
    }
    return cur;
  }

  function selfCheck(route, snap, def) {
    var errs = [];

    /* ② SCREENS[].api 的 key 必须同时在 ENDPOINTS 与 mock 里 */
    (def.api || []).forEach(function (k) {
      if (!P.ENDPOINTS[k]) errs.push("屏「" + def.title + "」声明了未登记的端点：" + k);
      if (P.MOCK_KEYS.indexOf(k) < 0) errs.push("屏「" + def.title + "」的端点没有 mock：" + k);
    });

    /* ③ 反向：mock 不得造出 ENDPOINTS 里没有的接口 */
    if (!P._mockChecked) {
      P._mockChecked = true;
      P.MOCK_KEYS.forEach(function (k) {
        if (!P.ENDPOINTS[k]) errs.push("mock 造出了未登记的端点：" + k);
      });
      Object.keys(P.ENDPOINTS).forEach(function (k) {
        if (P.MOCK_KEYS.indexOf(k) < 0) errs.push("已登记端点缺少 mock：" + k);
      });
    }

    /* ⑥ reads：屏声明自己真正读到的字段路径，断言它们在**参照快照**里不是 undefined。
       专门堵「mock 漏字段」——渲染出空白、没有报错、截图看着还挺像。
       断言只对 normal 打，因为 empty/backlog 这些场景的字段缺失是刻意的。 */
    var ref = P.data("normal", route);
    (def.reads || []).forEach(function (spec) {
      var idx = spec.indexOf("|");
      var key = spec.slice(0, idx);
      var path = spec.slice(idx + 1);
      var res = ref.raw(key);
      if (!res) {
        errs.push("reads 指向没有 mock 的端点：" + key);
        return;
      }
      if (resolvePath(res, path) === undefined) {
        errs.push("屏「" + def.title + "」在 normal 场景读不到字段：" + key + " → " + path);
      }
    });

    /* ④⑤ 布局断言在下一帧量，避免读到未布局的 0 */
    requestAnimationFrame(function () {
      var stage = document.getElementById("stage");
      /* 用 stage 的实际内容宽（clientWidth 减自身左右内边距），不写死 390 ——
         否则换个视口宽度、或者到了联览墙那种整窗布局上，会整片误报 */
      var scs = getComputedStyle(stage);
      var maxW =
        stage.clientWidth - parseFloat(scs.paddingLeft) - parseFloat(scs.paddingRight);
      Array.prototype.forEach.call(stage.querySelectorAll("*"), function (el) {
        /* 联览墙的格子是刻意缩放并裁切的预览面，不参与手机屏的几何断言 */
        if (el.closest(".mini-device")) return;
        if (el.scrollWidth > maxW + 1 && !el.closest(".api-card__pre") && !el.closest(".diff")) {
          if (getComputedStyle(el).overflowX === "visible") {
            console.error("[selfCheck] 横向溢出：", el.className || el.tagName, el.scrollWidth);
          }
        }
      });
      Array.prototype.forEach.call(
        stage.querySelectorAll("button.btn, .tabbar__item, .list__row, .backbar, .segmented__item"),
        function (el) {
          if (el.closest(".mini-device")) return;
          if (el.offsetHeight > 0 && el.offsetHeight < 32) {
            console.error("[selfCheck] 触控目标过小：", el.className, el.offsetHeight);
          }
        }
      );

      /* ⑦ 纵向静默裁切：overflow:hidden 的容器被压小后会吞掉内容且不报任何错。
         这是本原型踩过的真实坑（flex 子元素默认可收缩 + .list 的 overflow:hidden）。 */
      Array.prototype.forEach.call(stage.querySelectorAll("*"), function (el) {
        if (el.closest(".mini-device")) return;
        var cs = getComputedStyle(el);
        if (cs.overflowY !== "hidden") return;
        if (el.scrollHeight > el.clientHeight + 1) {
          console.error(
            "[selfCheck] 内容被纵向裁掉：",
            el.className || el.tagName,
            el.clientHeight + " < " + el.scrollHeight
          );
        }
      });
    });

    errs.forEach(function (e) { console.error("[selfCheck] " + e); });
  }

  /* ---------- 事件委托 ---------- */

  document.addEventListener("click", function (e) {
    var t = e.target;

    var badge = t.closest(".api-badge");
    if (badge) {
      e.preventDefault();
      e.stopPropagation();
      if (P.openApiCard) P.openApiCard(badge.dataset.key);
      return;
    }

    if (t.closest("#api-card") && !t.closest(".api-card__panel")) {
      document.getElementById("api-card").hidden = true;
      return;
    }
    var apiClose = t.closest("[data-close-api]");
    if (apiClose) {
      document.getElementById("api-card").hidden = true;
      return;
    }

    var el = t.closest("[data-go],[data-back],[data-sheet],[data-close-sheet],[data-toast],[data-view],[data-query]");
    if (!el) return;
    e.preventDefault();

    if (el.dataset.back === "1") { P.back(); return; }
    if (el.dataset.closeSheet === "1") { P.go(P.route.path, { sheet: null }); return; }
    if (el.dataset.toast) { P.toast(el.dataset.toast); return; }

    var opts = {};
    if (el.dataset.sheet) opts.sheet = el.dataset.sheet;
    if (el.dataset.view) opts.view = el.dataset.view;
    if (el.dataset.query !== undefined && el.dataset.query !== null) opts.query = el.dataset.query;
    P.go(el.dataset.go || P.route.path, opts);
  });

  document.addEventListener("submit", function (e) { e.preventDefault(); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.classList.contains("field__input") && e.target.dataset.searchField) {
      e.preventDefault();
      P.go(P.route.path, { query: e.target.value });
    }
  });

  window.addEventListener("hashchange", render);
  document.addEventListener("DOMContentLoaded", render);
  if (document.readyState !== "loading") render();
})((window.Pocket = window.Pocket || {}));
