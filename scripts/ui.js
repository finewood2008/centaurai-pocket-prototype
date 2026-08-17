/* ============================================================
 * ui.js —— apps/mobile/src/components/ui.tsx 的字符串渲染版
 * 组件名与参数刻意与 RN 侧一致，方便逐条对照。
 * ============================================================ */
(function (P) {
  "use strict";

  function esc(v) {
    if (v === null || v === undefined) return "";
    return String(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* data-api="…" 属性片段；标在真正依赖这个端点的节点上 */
  function api(key) {
    return key ? ' data-api="' + esc(key) + '"' : "";
  }

  /* [data-go] 由 app.js 的事件委托接管，模板里不写 onclick */
  function goAttrs(opts) {
    var o = opts || {};
    var out = "";
    if (o.go) out += ' data-go="' + esc(o.go) + '"';
    if (o.sheet) out += ' data-sheet="' + esc(o.sheet) + '"';
    if (o.closeSheet) out += ' data-close-sheet="1"';
    if (o.back) out += ' data-back="1"';
    if (o.toast) out += ' data-toast="' + esc(o.toast) + '"';
    if (o.view) out += ' data-view="' + esc(o.view) + '"';
    if (o.query) out += ' data-query="' + esc(o.query) + '"';
    return out;
  }

  var ui = {
    esc: esc,
    api: api,

    BrandHeader: function (o) {
      return (
        '<header class="brand-header">' +
        '<div class="brand-header__lead">' +
        '<img class="brand-mark" src="assets/centaur-logo.png" alt="半人马AI" />' +
        '<div class="brand-header__copy">' +
        (o.eyebrow ? '<span class="eyebrow">' + esc(o.eyebrow) + "</span>" : "") +
        '<h1 class="screen-title">' + esc(o.title) + "</h1>" +
        (o.subtitle ? '<p class="screen-subtitle">' + esc(o.subtitle) + "</p>" : "") +
        "</div></div>" +
        (o.trailing || "") +
        "</header>"
      );
    },

    BackBar: function (o) {
      return (
        '<button type="button" class="backbar" data-back="1">' +
        '<span class="backbar__chevron" aria-hidden="true">‹</span>' +
        esc(o.label || "返回") +
        "</button>" +
        '<div class="stack stack--tight">' +
        '<h1 class="screen-title">' + esc(o.title) + "</h1>" +
        (o.subtitle ? '<p class="screen-subtitle">' + esc(o.subtitle) + "</p>" : "") +
        "</div>"
      );
    },

    SectionHeader: function (o) {
      return (
        '<div class="section-header"' + api(o.apiKey) + ">" +
        '<div class="section-header__copy">' +
        '<h2 class="section-title">' + esc(o.title) + "</h2>" +
        (o.caption ? '<p class="section-caption">' + esc(o.caption) + "</p>" : "") +
        "</div>" +
        (o.action || "") +
        "</div>"
      );
    },

    Pill: function (o) {
      var tone = o.tone && o.tone !== "neutral" ? " pill--" + o.tone : "";
      return '<span class="pill' + tone + '">' + esc(o.label) + "</span>";
    },

    Notice: function (o) {
      var tone = o.tone && o.tone !== "primary" ? " notice--" + o.tone : "";
      var glyph = o.tone === "danger" ? "!" : o.tone === "warning" ? "↻" : "·";
      return (
        '<div class="notice' + tone + '"' + api(o.apiKey) + ">" +
        '<span class="notice__icon" aria-hidden="true">' + glyph + "</span>" +
        '<div class="notice__copy">' +
        '<p class="notice__title">' + esc(o.title) + "</p>" +
        '<p class="notice__message">' + esc(o.message) + "</p>" +
        "</div>" +
        (o.action || "") +
        "</div>"
      );
    },

    EmptyState: function (o) {
      return (
        '<div class="empty"' + api(o.apiKey) + ">" +
        '<span class="empty__icon" aria-hidden="true">' + esc(o.symbol || "✓") + "</span>" +
        '<p class="empty__title">' + esc(o.title) + "</p>" +
        '<p class="empty__message">' + esc(o.message) + "</p>" +
        (o.action || "") +
        "</div>"
      );
    },

    Button: function (o) {
      var cls = "btn";
      if (o.tone && o.tone !== "primary") cls += " btn--" + o.tone;
      if (o.compact) cls += " btn--compact";
      if (o.block) cls += " btn--block";
      if (o.disabled) cls += " btn--disabled";
      return (
        '<button type="button" class="' + cls + '"' +
        api(o.apiKey) +
        goAttrs(o) +
        (o.disabled ? " disabled" : "") +
        ">" +
        (o.icon ? '<span class="btn__icon" aria-hidden="true">' + esc(o.icon) + "</span>" : "") +
        esc(o.label) +
        "</button>"
      );
    },

    LoadingCards: function (count) {
      var n = count || 3;
      var out = '<div class="loading-list">';
      for (var i = 0; i < n; i++) {
        out +=
          '<div class="loading-card">' +
          '<div class="skeleton skeleton--short"></div>' +
          '<div class="skeleton skeleton--long"></div>' +
          '<div class="skeleton skeleton--medium"></div>' +
          "</div>";
      }
      return out + "</div>";
    },

    /* ---------- 屏幕层复用件 ---------- */

    Row: function (o) {
      var attrs = o.go || o.sheet || o.toast ? goAttrs(o) : "";
      var tag = attrs ? "button" : "div";
      var typeAttr = attrs ? ' type="button"' : "";
      return (
        "<" + tag + ' class="list__row"' + typeAttr + attrs + api(o.apiKey) + ">" +
        (o.lead || "") +
        '<span class="grow">' +
        '<span class="t-body t-strong" style="display:block">' + esc(o.title) + "</span>" +
        (o.caption ? '<span class="t-muted" style="display:block">' + esc(o.caption) + "</span>" : "") +
        "</span>" +
        (o.trailing || "") +
        (attrs ? '<span class="list__chevron" aria-hidden="true">›</span>' : "") +
        "</" + tag + ">"
      );
    },

    List: function (rows, apiKey) {
      return '<div class="list"' + api(apiKey) + ">" + rows.join("") + "</div>";
    },

    Metric: function (o) {
      return (
        '<div class="metric">' +
        '<div class="metric__value">' + esc(o.value) + "</div>" +
        '<div class="metric__label">' + esc(o.label) + "</div>" +
        "</div>"
      );
    },

    Progress: function (pct, gold) {
      var v = Math.max(0, Math.min(100, Number(pct) || 0));
      return (
        '<div class="progress" role="progressbar" aria-valuenow="' + v +
        '" aria-valuemin="0" aria-valuemax="100">' +
        '<div class="progress__fill' + (gold ? " progress__fill--gold" : "") +
        '" style="width:' + v + '%"></div></div>'
      );
    },

    Dot: function (tone, label) {
      return (
        '<span class="row" style="gap:6px">' +
        '<span class="dot dot--' + esc(tone) + '" aria-hidden="true"></span>' +
        '<span class="t-muted">' + esc(label) + "</span></span>"
      );
    },

    Segmented: function (o) {
      var items = o.items
        .map(function (it) {
          return (
            '<button type="button" class="segmented__item" role="tab" aria-selected="' +
            (it.selected ? "true" : "false") + '"' +
            goAttrs({ go: o.go, view: it.id }) +
            ">" + esc(it.label) +
            (it.count === undefined ? "" : ' <span class="t-dim">' + esc(it.count) + "</span>") +
            "</button>"
          );
        })
        .join("");
      return '<div class="segmented" role="tablist"' + api(o.apiKey) + ">" + items + "</div>";
    },

    Field: function (o) {
      if (o.multiline) {
        return (
          '<label class="field field--textarea">' +
          '<textarea class="field__input" placeholder="' + esc(o.placeholder || "") + '"' +
          (o.readonly ? " readonly" : "") + ">" + esc(o.value || "") + "</textarea></label>"
        );
      }
      return (
        '<label class="field">' +
        (o.icon ? '<span class="field__icon" aria-hidden="true">' + esc(o.icon) + "</span>" : "") +
        '<input class="field__input" type="' + esc(o.type || "text") +
        '" placeholder="' + esc(o.placeholder || "") +
        '" value="' + esc(o.value || "") + '"' +
        (o.readonly ? " readonly" : "") + " />" +
        (o.trailing || "") +
        "</label>"
      );
    },

    Chip: function (label, on) {
      return '<span class="chip' + (on ? " chip--on" : "") + '">' + esc(label) + "</span>";
    },

    Diff: function (o) {
      return (
        '<div class="diff">' +
        '<div class="diff__col"><div class="diff__head">现在</div>' +
        o.before.map(function (v) { return '<div class="diff__val">' + esc(v) + "</div>"; }).join("") +
        "</div>" +
        '<div class="diff__col diff__col--after"><div class="diff__head">接受后</div>' +
        o.after.map(function (v) { return '<div class="diff__val">' + esc(v) + "</div>"; }).join("") +
        "</div></div>"
      );
    },

    PreviewBanner: function (text) {
      return '<div class="preview-banner">' + esc(text) + "</div>";
    },

    Card: function (o) {
      var cls = "card";
      if (o.hero) cls += " card--hero";
      if (o.quiet) cls += " card--quiet";
      if (o.flat) cls += " card--flat";
      return '<section class="' + cls + '"' + api(o.apiKey) + ">" + o.body + "</section>";
    },

    Step: function (no, body) {
      return (
        '<div class="step"><span class="step__no">' + esc(no) + "</span>" +
        '<div class="grow">' + body + "</div></div>"
      );
    },

    CodeBoxes: function (code, len) {
      var n = len || 6;
      var out = '<div class="code-boxes">';
      for (var i = 0; i < n; i++) {
        var ch = code && code[i] ? code[i] : "";
        out += '<span class="code-box' + (ch ? " code-box--filled" : "") + '">' + esc(ch) + "</span>";
      }
      return out + "</div>";
    }
  };

  /* ---------- 格式化：一律相对固定的 NOW，保证截图可复现 ---------- */
  var NOW_MS = Date.parse("2026-08-17T09:41:00Z");

  P.fmt = {
    now: "2026-08-17T09:41:00Z",

    rel: function (iso) {
      if (!iso) return "从未";
      var d = Date.parse(iso);
      var min = Math.round((NOW_MS - d) / 60000);
      if (min < 1) return "刚刚";
      if (min < 60) return min + " 分钟前";
      var h = Math.round(min / 60);
      if (h < 24) return h + " 小时前";
      var day = Math.round(h / 24);
      if (day === 1) return "昨天";
      if (day < 30) return day + " 天前";
      return iso.slice(0, 10);
    },

    ahead: function (iso) {
      if (!iso) return "无计划";
      var min = Math.round((Date.parse(iso) - NOW_MS) / 60000);
      if (min <= 0) return "即将开始";
      if (min < 60) return min + " 分钟后";
      var h = Math.round(min / 60);
      if (h < 24) return h + " 小时后";
      return iso.slice(0, 10);
    },

    clock: function (iso) {
      if (!iso) return "—";
      return iso.slice(11, 16);
    },

    date: function (iso) {
      if (!iso) return "—";
      return Number(iso.slice(5, 7)) + " 月 " + Number(iso.slice(8, 10)) + " 日";
    },

    gb: function (bytes) {
      if (!bytes) return "0 GB";
      var g = bytes / 1073741824;
      return (g >= 100 ? Math.round(g) : g.toFixed(1)) + " GB";
    },

    /* 指标格里用的短版：去掉「后」「前」，避免 19px 的值在 110px 宽的格子里折行 */
    aheadShort: function (iso) {
      return P.fmt.ahead(iso).replace(/后$/, "");
    },

    relShort: function (iso) {
      return P.fmt.rel(iso).replace(/前$/, "");
    },

    pct: function (n) {
      return Math.round(Number(n) || 0) + "%";
    }
  };

  P.ui = ui;
})((window.Pocket = window.Pocket || {}));
