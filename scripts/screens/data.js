/* ============================================================
 * 数据 —— 本次 IA 改动之一：原「同步」tab 降为二级页，这一格给「我的数据现在长什么样」。
 *
 * 本屏的灵魂是双视角：`我的全部数据`（Owner，含待确认）｜`Agent 能查到的`（只有已就绪）。
 * 同一个查询词在两个视角下的**结果差，就是数据治理的价值可视化**。
 * 等式：Owner 命中数 − Agent 命中数 ＝ excluded_count，由 mock 的同一份 items 计算保证。
 * ============================================================ */
(function (P) {
  "use strict";

  var ui = P.ui;
  var fmt = P.fmt;

  var STATE_LABEL = { ready: "已就绪", needs_review: "待确认", archived: "已归档" };
  var STATE_TONE = { ready: "primary", needs_review: "warning", archived: "neutral" };

  var SOURCE_GLYPH = {
    folder: "▤",
    wechat_visible_web: "✻",
    capture: "＋",
    rss: "◈"
  };

  P.SCREENS.data = {
    title: "数据",
    tab: "data",
    kind: "tab",
    api: ["GET /items", "POST /agent/search-preview", "GET /sources", "GET /dashboard"],
    reads: [
      "GET /items|body.total",
      "GET /items|body.items[0].title",
      "GET /items|body.items[0].state",
      "GET /items|body.facets.by_state.ready",
      "GET /items|body.facets.by_state.needs_review",
      "GET /items|body.facets.by_state.archived",
      "POST /agent/search-preview|body.count",
      "POST /agent/search-preview|body.excluded_count",
      "POST /agent/search-preview|body.excluded_reasons.needs_review",
      "POST /agent/search-preview|body.excluded_reasons.im_not_opted_in",
      "GET /sources|body.items[0].display_name"
    ],

    render: function (snap, route) {
      var isAgent = route.view === "agent";
      var q = route.query || "合同";
      var items = snap.get("GET /items");
      var preview = snap.get("POST /agent/search-preview");
      var sources = snap.get("GET /sources");

      var header = ui.BrandHeader({
        eyebrow: "私有数据库 · 本地治理",
        title: "数据",
        subtitle: "盒子里有什么，Agent 能看到什么",
        trailing:
          '<button type="button" class="btn btn--secondary btn--compact" data-sheet="capture" ' +
          'aria-label="采集一段文字或链接">＋</button>'
      });

      if (items.state === "loading") return header + ui.LoadingCards(3);

      if (items.state === "error") {
        return (
          header +
          ui.Notice({
            tone: "danger",
            title: "连不上你的盒子",
            message: items.detail + "。手机不保存你的数据副本，所以这里什么都不显示。",
            action: ui.Button({ label: "检查连接", tone: "secondary", compact: true, go: "/box/connection" }),
            apiKey: "GET /items"
          })
        );
      }

      var search =
        ui.Field({
          icon: "⌕",
          value: q,
          placeholder: "搜索标题、正文或标签",
          trailing: '<span class="t-dim">回车</span>'
        }).replace('class="field__input"', 'class="field__input" data-search-field="1"');

      var segmented = ui.Segmented({
        go: "/data",
        apiKey: isAgent ? "POST /agent/search-preview" : "GET /items",
        items: [
          { id: "owner", label: "我的全部数据", selected: !isAgent, count: items.state === "ok" ? undefined : undefined },
          { id: "agent", label: "Agent 能查到的", selected: isAgent }
        ]
      });

      /* ---- 刚装好 ---- */
      if (sources.state === "ok" && sources.body.items.length === 0) {
        return (
          header +
          ui.EmptyState({
            symbol: "▤",
            title: "盒子里还没有数据",
            message: "添加一个数据来源，或者直接从手机采集一段文字。",
            action: ui.Button({ label: "添加数据来源", sheet: "add-source" }),
            apiKey: "GET /sources"
          })
        );
      }

      /* ---- 状态分布：来自 facets，与今日页的计数同源 ---- */
      var f = items.body.facets.by_state;
      var distribution = ui.Card({
        quiet: true,
        flat: true,
        apiKey: "GET /items",
        body:
          '<div class="metric-grid">' +
          ui.Metric({ value: f.ready, label: "已就绪" }) +
          ui.Metric({ value: f.needs_review, label: "待确认" }) +
          ui.Metric({ value: f.archived, label: "已归档" }) +
          "</div>"
      });

      /* ---- 双视角差值带：整个原型最能说清「治理为什么值钱」的一句话 ---- */
      var band = "";
      if (isAgent && preview.state === "ok") {
        var p = preview.body;
        if (p.excluded_count > 0) {
          var reasons = [];
          if (p.excluded_reasons.needs_review) reasons.push(p.excluded_reasons.needs_review + " 条等你确认");
          if (p.excluded_reasons.im_not_opted_in) reasons.push(p.excluded_reasons.im_not_opted_in + " 条来自未开放给 Agent 的会话");
          if (p.excluded_reasons.knowledge_unconfirmed) reasons.push(p.excluded_reasons.knowledge_unconfirmed + " 条知识候选未确认");
          band = ui.Notice({
            tone: "warning",
            title: "Agent 能查到 " + p.count + " 条",
            message: "另有 " + p.excluded_count + " 条被挡在门外：" + reasons.join("、") + "。",
            action: ui.Button({ label: "去处理", tone: "secondary", compact: true, go: "/governance" }),
            apiKey: "POST /agent/search-preview"
          });
        } else {
          band = ui.Notice({
            title: "「" + q + "」这一组已经全部治理干净",
            message: "Owner 看到的 " + items.body.total + " 条，Agent 一条不少地也能查到。",
            apiKey: "POST /agent/search-preview"
          });
        }
      }

      /* ---- 结果列表 ---- */
      var list;
      if (!items.body.items.length) {
        if (isAgent) {
          var ownerSnapCount = preview.state === "ok" ? preview.body.excluded_count : 0;
          list = ownerSnapCount
            ? ui.EmptyState({
                symbol: "⛨",
                title: "Agent 查不到「" + q + "」",
                message: "但你的数据里有 " + ownerSnapCount + " 条匹配 —— 它们还没通过治理。",
                action: ui.Button({ label: "去治理", go: "/governance" }),
                apiKey: "POST /agent/search-preview"
              })
            : ui.EmptyState({ symbol: "⌕", title: "没有匹配「" + q + "」的内容", message: "换个词试试。" });
        } else {
          list = ui.EmptyState({
            symbol: "⌕",
            title: "没有匹配「" + q + "」的内容",
            message: "换个词，或者看看下面的来源里有没有你要的东西。"
          });
        }
      } else {
        list = ui.List(
          items.body.items.map(function (it) {
            return ui.Row({
              title: it.title,
              caption:
                (it.source_name || "未知来源") + " · " + fmt.rel(it.updated_at) +
                (it.category ? " · " + it.category : ""),
              trailing: ui.Pill({ label: STATE_LABEL[it.state] || it.state, tone: STATE_TONE[it.state] }),
              go: "/data/item/" + it.id
            });
          }),
          isAgent ? "POST /agent/search-preview" : "GET /items"
        );
      }

      var count =
        '<p class="t-dim">' +
        (isAgent ? "以 Agent 的身份预览：" : "你的视角：") +
        "「" + ui.esc(q) + "」命中 " + items.body.total + " 条" +
        (isAgent ? "（只含已就绪）" : "（含待确认，不含已归档）") +
        "</p>";

      /* ---- 来源摘要（一张卡，不是列表） ---- */
      var healthy = 0, attention = 0;
      sources.body.items.forEach(function (s) {
        if (s.status === "healthy") healthy++;
        else attention++;
      });
      var sourceCard = ui.Row({
        title: sources.body.items.length + " 个数据来源",
        caption: healthy + " 个正常" + (attention ? " · " + attention + " 个需要注意" : ""),
        lead: '<span class="dot ' + (attention ? "dot--warn" : "dot--ok") + '" aria-hidden="true"></span>',
        go: "/data/sources",
        apiKey: "GET /sources"
      });

      return (
        header +
        search +
        segmented +
        band +
        count +
        list +
        distribution +
        ui.SectionHeader({ title: "数据来源", caption: "配置一次，之后盒子自己跑" }) +
        ui.List([sourceCard])
      );
    }
  };

  /* ---------- 条目详情 ---------- */

  P.SCREENS["data/item"] = {
    title: "条目详情",
    heading: "条目",
    tab: "data",
    kind: "push",
    backLabel: "数据",
    api: ["GET /items/{item_id}", "PATCH /items/{item_id}"],
    reads: [
      "GET /items/{item_id}|body.title",
      "GET /items/{item_id}|body.text_content",
      "GET /items/{item_id}|body.sources[0].source_name",
      "GET /items/{item_id}|body.sources[0].first_seen_at"
    ],

    render: function (snap) {
      var res = snap.get("GET /items/{item_id}");
      if (res.state === "loading") return ui.LoadingCards(2);
      if (res.state === "error") {
        return ui.Notice({ tone: "danger", title: "取不到这条内容", message: res.detail });
      }
      if (res.state === "empty") {
        return ui.EmptyState({ title: "这条内容不在了", message: "可能已被归档。" });
      }

      var it = res.body;
      return (
        ui.Card({
          apiKey: "GET /items/{item_id}",
          body:
            '<div class="stack stack--snug">' +
            '<div class="row row--between row--top">' +
            '<p class="t-serif-lg grow">' + ui.esc(it.title) + "</p>" +
            ui.Pill({ label: STATE_LABEL[it.state] || it.state, tone: STATE_TONE[it.state] }) +
            "</div>" +
            '<div class="row row--wrap" style="gap:8px">' +
            (it.category ? ui.Chip(it.category, true) : "") +
            (it.tags || []).map(function (t) { return ui.Chip(t, false); }).join("") +
            "</div>" +
            '<p class="t-dim">v' + it.version + " · " + fmt.rel(it.updated_at) + "更新</p>" +
            "</div>"
        }) +
        ui.SectionHeader({ title: "内容" }) +
        ui.Card({ quiet: true, flat: true, body: '<p class="t-body">' + ui.esc(it.text_content) + "</p>" }) +
        ui.SectionHeader({
          title: "来源与证据",
          caption: it.sources.length > 1 ? "同一内容在多个位置发现，已合并" : "这条内容从哪来"
        }) +
        ui.List(
          it.sources.map(function (s) {
            return ui.Row({
              title: s.source_name || "未知来源",
              caption:
                (s.origin_uri || "—") +
                " · 首次发现 " + fmt.rel(s.first_seen_at) +
                " · 最近见到 " + fmt.rel(s.last_seen_at)
            });
          }),
          "GET /items/{item_id}"
        ) +
        '<div class="action-bar">' +
        ui.Button({ label: "编辑", apiKey: "PATCH /items/{item_id}", toast: "编辑表单与治理卡共用一套" }) +
        ui.Button({ label: "归档", tone: "danger", toast: "归档后 Agent 将查不到这条内容，可在已归档里找回" }) +
        "</div>" +
        '<p class="t-dim">有待处理的治理任务时，不能绕过任务直接把状态改成已就绪。</p>'
      );
    }
  };

  /* ---------- 数据来源列表 ---------- */

  P.SCREENS["data/sources"] = {
    title: "数据来源",
    heading: "数据来源",
    subtitle: "配置一次，之后由盒子调度、重试、增量判断",
    tab: "data",
    kind: "push",
    backLabel: "数据",
    api: ["GET /sources", "POST /sources"],
    reads: [
      "GET /sources|body.items[0].display_name",
      "GET /sources|body.items[0].item_count",
      "GET /sources|body.items[0].last_sync_at"
    ],

    render: function (snap) {
      var res = snap.get("GET /sources");
      if (res.state === "loading") return ui.LoadingCards(3);
      if (res.state === "error") {
        return ui.Notice({ tone: "danger", title: "取不到来源列表", message: res.detail });
      }
      if (res.state === "empty" || !res.body.items.length) {
        return ui.EmptyState({
          symbol: "▤",
          title: "还没有数据来源",
          message: "先加一个文件夹。盒子会扫描、去重、规范化，只把治理干净的数据开放给 Agent。",
          action: ui.Button({ label: "添加数据来源", sheet: "add-source" })
        });
      }

      var rows = res.body.items.map(function (s) {
        var tone = s.status === "error" ? "dot--bad" : s.status === "attention" ? "dot--warn" : "dot--ok";
        var label = s.status === "error" ? "失败" : s.status === "attention" ? "要看一眼" : "正常";
        return ui.Row({
          title: (SOURCE_GLYPH[s.kind] || "▤") + " " + s.display_name,
          caption:
            s.item_count + " 条" +
            (s.pending_count ? " · " + s.pending_count + " 待确认" : "") +
            " · " + (s.last_error ? "上次失败" : "同步于 " + fmt.rel(s.last_sync_at)),
          lead: '<span class="dot ' + tone + '" aria-hidden="true"></span>',
          trailing: ui.Pill({
            label: label,
            tone: s.status === "error" ? "danger" : s.status === "attention" ? "warning" : "primary"
          }),
          go: "/data/sources/" + s.id
        });
      });

      return (
        ui.List(rows, "GET /sources") +
        ui.Button({ label: "添加数据来源", block: true, sheet: "add-source", apiKey: "POST /sources" })
      );
    }
  };

  /* ---------- 来源详情：走 /data/sources/{source_id}，与列表同一个屏 key ---------- */

  function renderSourceDetail(snap) {
    var res = snap.get("GET /sources/{source_id}");
    if (res.state === "loading") return ui.LoadingCards(2);
    if (res.state === "error") {
      return ui.Notice({ tone: "danger", title: "取不到来源", message: res.detail });
    }
    if (res.state === "empty") {
      return ui.EmptyState({ title: "这个来源不在了", message: "可能已被删除。" });
    }

    var s = res.body;
    var failing = s.status === "error";
    var obs = snap.get("GET /sources/{source_id}/observer-status");
    var gaps = snap.get("GET /sources/{source_id}/coverage-gaps");

    var statusCard = ui.Card({
      apiKey: "GET /sources/{source_id}",
      body:
        '<div class="stack stack--snug">' +
        '<div class="row row--between row--top">' +
        '<p class="t-serif-lg grow">' + ui.esc(s.display_name) + "</p>" +
        ui.Pill({
          label: failing ? "失败" : s.status === "attention" ? "要看一眼" : "正常",
          tone: failing ? "danger" : s.status === "attention" ? "warning" : "primary"
        }) +
        "</div>" +
        (failing
          ? '<p class="t-body">' + ui.esc(s.last_error) + "</p>" +
            '<p class="t-muted">这次失败没有改变已有数据。已连续失败 ' +
            s.consecutive_failures + " 次，下次自动重试在 " + fmt.ahead(s.next_run_at) + "。</p>"
          : '<p class="t-muted">上次同步 ' + fmt.rel(s.last_sync_at) +
            "，下次 " + fmt.ahead(s.next_run_at) + "。</p>") +
        '<div class="metric-grid">' +
        ui.Metric({ value: s.item_count, label: "条数据" }) +
        ui.Metric({ value: s.pending_count, label: "待确认" }) +
        ui.Metric({ value: s.schedule, label: "频率" }) +
        "</div></div>"
    });

    var config = ui.Card({
      quiet: true,
      flat: true,
      body:
        '<div class="stack stack--tight">' +
        '<p class="t-label">配置（在盒子上改）</p>' +
        '<p class="t-mono">' + ui.esc(s.config.path || "（无路径，由观察器提供）") + "</p>" +
        (s.config.extensions
          ? '<p class="t-dim">只收 ' + s.config.extensions.join("、") + "；其它格式计为跳过，不建条目</p>"
          : "") +
        "</div>"
    });

    var observer = "";
    if (obs.state === "ok" && obs.body) {
      var degraded = obs.body.state !== "active";
      observer =
        ui.SectionHeader({ title: "观察器", caption: "只看你已登录会话里真实渲染过的消息" }) +
        ui.Card({
          apiKey: "GET /sources/{source_id}/observer-status",
          body:
            '<div class="stack stack--snug">' +
            '<div class="row row--between">' +
            ui.Dot(degraded ? "warn" : "ok", degraded ? "解析器落后" : "运行中") +
            ui.Pill({
              label: "缺口 " + obs.body.open_gap_count,
              tone: obs.body.open_gap_count ? "warning" : "neutral"
            }) +
            "</div>" +
            '<p class="t-muted">' + ui.esc(obs.body.coverage_notice) + "</p>" +
            '<p class="t-dim">扩展 v' + obs.body.extension_version +
            " · 解析器 v" + obs.body.parser_version +
            " · 心跳 " + fmt.rel(obs.body.last_heartbeat_at) + "</p>" +
            (gaps.state === "ok" && gaps.body.items.length
              ? ui.Notice({
                  tone: "warning",
                  title: "这段时间的消息不完整",
                  message:
                    fmt.clock(gaps.body.items[0].started_at) + "–" +
                    fmt.clock(gaps.body.items[0].ended_at) +
                    "：" + gaps.body.items[0].reason + "。不要把它当成完整聊天历史。",
                  apiKey: "GET /sources/{source_id}/coverage-gaps"
                })
              : "") +
            "</div>"
        });
    }

    return (
      statusCard +
      config +
      observer +
      '<div class="action-bar">' +
      ui.Button({
        label: "立即同步",
        apiKey: "POST /sources/{source_id}/sync",
        toast: failing ? "同步失败：权限被拒绝（EACCES）" : "已开始同步"
      }) +
      ui.Button({ label: "暂停", tone: "secondary", toast: "已暂停，不再自动同步" }) +
      "</div>" +
      ui.Button({ label: "删除来源", tone: "danger", block: true, toast: "需要二次确认" }) +
      '<p class="t-dim">删除来源不会删除盒子上的原文件。已经治理好的数据会保留，' +
      "但失去最后一个来源的条目会进入治理收件箱等你决定。</p>"
    );
  }

  /* /data/sources 与 /data/sources/{source_id} 是同一个屏 key，靠 param 分岔 */
  var listRender = P.SCREENS["data/sources"].render;
  var listApi = P.SCREENS["data/sources"].api;
  var listReads = P.SCREENS["data/sources"].reads;

  P.SCREENS["data/sources"] = {
    title: "数据来源",
    heading: function (route) { return route.param ? "来源" : "数据来源"; },
    subtitle: function (route) {
      return route.param ? "它现在健不健康、还会不会自己好起来" : "配置一次，之后由盒子调度、重试、增量判断";
    },
    backLabel: "数据",
    tab: "data",
    kind: "push",
    api: listApi.concat([
      "GET /sources/{source_id}",
      "POST /sources/{source_id}/sync",
      "GET /sources/{source_id}/observer-status",
      "GET /sources/{source_id}/coverage-gaps"
    ]),
    reads: listReads.concat([
      "GET /sources/{source_id}|body.display_name",
      "GET /sources/{source_id}|body.item_count",
      "GET /sources/{source_id}|body.next_run_at"
    ]),
    render: function (snap, route) {
      if (route.param) return renderSourceDetail(snap);
      return listRender(snap, route);
    }
  };
})((window.Pocket = window.Pocket || {}));
