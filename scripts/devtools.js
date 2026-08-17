/* ============================================================
 * devtools.js —— 场景切换器 ＋ 接口视图浮层
 *
 * 接口标注的第三层：登记表（endpoints.js）→ DOM 上 data-api → 这里画角标与接口卡。
 * 角标按 auth 分色：Owner Claude 橙、Agent kraft 赭 —— 一眼看出这块数据谁能读。
 * 未登记的标注直接 console.error，截图脚本会因此失败：标注是有测试保护的产物。
 * ============================================================ */
(function (P) {
  "use strict";

  var ui = P.ui;

  P.paintApiBadges = function () {
    var nodes = document.querySelectorAll("#stage [data-api], #sheet [data-api], .mini-stage [data-api]");
    Array.prototype.forEach.call(nodes, function (el) {
      var key = el.getAttribute("data-api");
      var def = P.ENDPOINTS[key];
      if (!def) console.error("[api] 未登记的端点标注：" + key);
      if (el.querySelector(":scope > .api-badge")) return;

      var b = document.createElement("button");
      b.type = "button";
      b.className = "api-badge";
      b.dataset.key = key;
      if (def) {
        b.dataset.auth = def.auth;
        b.textContent = def.method + " " + def.path.split("?")[0];
        if (def.status === "proposed") b.textContent += " ·待提供";
        if (def.status === "change") b.textContent += " ·需改";
      } else {
        b.dataset.missing = "1";
        b.textContent = "未登记：" + key;
      }
      el.appendChild(b);
    });
  };

  var STATUS_LABEL = {
    ready: "契约已存在，可直接调",
    proposed: "待盒子程序提供（本原型逼出来的）",
    change: "已存在但必须改"
  };

  var AUTH_LABEL = {
    owner: "Owner token",
    owner_or_device: "Owner token 或已配对设备",
    agent: "Agent Bearer（与 Owner token 不可互换）",
    device: "配对设备会话",
    collector: "采集器 token"
  };

  P.openApiCard = function (key) {
    var def = P.ENDPOINTS[key];
    var card = document.getElementById("api-card");
    if (!def) {
      card.innerHTML =
        '<div class="api-card__panel"><p class="notice__title">未登记的端点</p>' +
        '<p class="t-muted">' + ui.esc(key) + '</p>' +
        '<button type="button" class="btn btn--secondary" data-close-api="1">关闭</button></div>';
      card.hidden = false;
      return;
    }

    var snap = P.data(P.route.scenario, P.route);
    var res = snap.raw(key);
    var rows = [];
    rows.push(["认证", AUTH_LABEL[def.auth] || def.auth]);
    rows.push(["状态", STATUS_LABEL[def.status] || def.status]);
    if (def.headers && def.headers.length) rows.push(["必需头", def.headers.join("、")]);
    if (def.returns) rows.push(["返回", def.returns]);
    if (def.errors && def.errors.length) {
      rows.push([
        "失败码",
        def.errors.map(function (e) { return e.code + "：" + e.when; }).join("；")
      ]);
    }
    if (def.doc) rows.push(["文档", def.doc]);

    var body =
      '<div class="row row--between"><span class="api-card__route">' +
      ui.esc(def.method + " " + def.path) + "</span></div>" +
      '<div class="api-card__grid">' +
      rows
        .map(function (r) {
          return (
            '<span class="api-card__key">' + ui.esc(r[0]) + "</span>" +
            '<span class="api-card__val">' + ui.esc(r[1]) + "</span>"
          );
        })
        .join("") +
      "</div>" +
      (def.note ? '<p class="t-muted">' + ui.esc(def.note) + "</p>" : "") +
      (def.body
        ? '<p class="t-label">请求体</p><pre class="api-card__pre">' +
          ui.esc(JSON.stringify(def.body, null, 2)) + "</pre>"
        : "") +
      '<p class="t-label">当前场景（' + ui.esc(P.route.scenario) + "）下的响应</p>" +
      '<pre class="api-card__pre">' + ui.esc(JSON.stringify(res, null, 2)) + "</pre>" +
      '<button type="button" class="btn btn--secondary btn--block" data-close-api="1">关闭</button>';

    card.innerHTML = '<div class="api-card__panel">' + body + "</div>";
    card.hidden = false;
  };

  /* ---------- 工具条 ---------- */

  P.syncDevtools = function (route) {
    var sel = document.querySelector("[data-scenario-select]");
    if (sel && !sel.dataset.filled) {
      sel.dataset.filled = "1";
      sel.innerHTML = P.SCENARIOS.map(function (s) {
        return '<option value="' + s.id + '">' + s.label + "</option>";
      }).join("");
      sel.addEventListener("change", function () {
        P.go(P.route.path, { scenario: sel.value });
      });
    }
    if (sel) sel.value = route.scenario;

    var toggle = document.querySelector("[data-api-toggle]");
    if (toggle && !toggle.dataset.bound) {
      toggle.dataset.bound = "1";
      toggle.addEventListener("change", function () {
        P.go(P.route.path, { api: toggle.checked });
      });
    }
    if (toggle) toggle.checked = route.api;
  };
})((window.Pocket = window.Pocket || {}));
