/* ============================================================
 * 治理 —— 单卡专注（product-spec.md §3.4 要求每次展示一张卡片）
 *
 * 这一格收编三条 owner 判断队列：治理任务 / IM 知识候选 / 官方信源候选。
 * dashboard.pending_tasks 只数了第一条，所以首页的数字取自 inbox/summary（契约 E）。
 * ============================================================ */
(function (P) {
  "use strict";

  var ui = P.ui;
  var fmt = P.fmt;

  var KIND = {
    duplicate: { label: "疑似重复", tone: "violet" },
    classify: { label: "智能分类", tone: "primary" },
    quality: { label: "质量补全", tone: "violet" },
    normalize: { label: "格式规范", tone: "primary" },
    deletion: { label: "源文件已删除", tone: "danger" },
    review: { label: "需要确认", tone: "warning" },
    knowledge: { label: "新知识候选", tone: "primary" },
    source: { label: "新信源", tone: "violet" }
  };

  var QUEUE_LABEL = {
    governance: "治理任务",
    knowledge_candidates: "知识候选",
    reliable_source_candidates: "信源候选"
  };

  function confidencePill(c) {
    if (c === undefined || c === null) return "";
    var pct = Math.round(c * 100);
    var tone = pct >= 85 ? "primary" : pct >= 65 ? "violet" : "warning";
    return ui.Pill({ label: "把握 " + pct + "%", tone: tone });
  }

  /* deletion 卡语义相反、误点代价最高，文案单独一套 */
  function deletionCard(t) {
    return ui.Card({
      apiKey: "GET /governance/tasks?status=pending",
      body:
        '<div class="stack stack--snug">' +
        '<div class="row row--wrap" style="gap:8px">' +
        ui.Pill({ label: KIND.deletion.label, tone: "danger" }) +
        ui.Pill({ label: t.source_name }) +
        "</div>" +
        '<p class="t-serif-lg">这条内容的来源已经消失</p>' +
        '<p class="t-body t-strong">' + ui.esc(t.title) + "</p>" +
        '<p class="t-muted">' + ui.esc(t.source_name) +
        " 完成了一次完整扫描，没有再找到它。盒子没有自动删除，等你决定。</p>" +
        '<div class="card card--quiet card--flat"><p class="t-muted">' +
        ui.esc(t.preview) + "</p></div>" +
        '<div class="action-bar">' +
        ui.Button({ label: "归档", tone: "danger", apiKey: "POST /governance/tasks/{task_id}/apply", toast: "已归档，可撤销" }) +
        ui.Button({ label: "继续保留", tone: "secondary", apiKey: "POST /governance/tasks/{task_id}/skip", toast: "已保留，状态不变" }) +
        "</div>" +
        '<p class="t-dim">保留后状态不变。原本已就绪的仍可被 Agent 查到；原本待确认的仍然不开放。</p>' +
        "</div>"
    });
  }

  function normalCard(t) {
    var k = KIND[t.kind] || { label: t.kind, tone: "neutral" };
    var diff =
      t.diff_before && t.diff_after
        ? ui.Diff({ before: t.diff_before, after: t.diff_after })
        : "";

    return ui.Card({
      apiKey: "GET /governance/tasks?status=pending",
      body:
        '<div class="stack stack--snug">' +
        /* ① 问题是什么 */
        '<div class="row row--wrap" style="gap:8px">' +
        ui.Pill({ label: k.label, tone: k.tone }) +
        ui.Pill({ label: QUEUE_LABEL[t.queue] || t.queue }) +
        "</div>" +
        '<p class="t-serif-lg">' + ui.esc(t.title) + "</p>" +
        /* ② 为什么这样判断 */
        '<div class="card card--quiet card--flat"><div class="stack stack--tight">' +
        '<p class="t-muted">' + ui.esc(t.reason) + "</p>" +
        '<div class="row" style="gap:8px">' + confidencePill(t.confidence) +
        ui.Pill({ label: "来自 " + t.source_name }) + "</div>" +
        "</div></div>" +
        /* ③ 建议操作与效果 */
        '<p class="t-body t-strong">建议：' + ui.esc(t.suggestion) + "</p>" +
        '<p class="t-muted">' + ui.esc(t.effect) + "</p>" +
        /* ④ 最小必要对比：只显示变化的字段 */
        diff +
        '<div class="action-bar">' +
        ui.Button({ label: "接受", apiKey: "POST /governance/tasks/{task_id}/apply", toast: "已接受，可撤销" }) +
        ui.Button({ label: "编辑后接受", tone: "secondary", go: "/governance/edit/" + t.id }) +
        "</div>" +
        ui.Button({
          label: "跳过",
          tone: "ghost",
          block: true,
          apiKey: "POST /governance/tasks/{task_id}/skip",
          toast: "已跳过，稍后还会出现"
        }) +
        "</div>"
    });
  }

  P.SCREENS.governance = {
    title: "治理",
    tab: "governance",
    kind: "tab",
    api: [
      "GET /governance/tasks?status=pending",
      "GET /governance/inbox/summary",
      "GET /governance/tasks/next"
    ],
    reads: [
      "GET /governance/inbox/summary|body.pending_total",
      "GET /governance/inbox/summary|body.by_queue.governance",
      "GET /governance/inbox/summary|body.applied_today",
      "GET /governance/tasks?status=pending|body.items[0].title",
      "GET /governance/tasks?status=pending|body.items[0].reason",
      "GET /governance/tasks?status=pending|body.items[0].suggestion",
      "GET /governance/tasks?status=pending|body.items[0].effect"
    ],

    render: function (snap) {
      var list = snap.get("GET /governance/tasks?status=pending");
      var summary = snap.get("GET /governance/inbox/summary");

      var header = ui.BrandHeader({
        eyebrow: "有限游戏 · 目标是清零",
        title: "治理",
        subtitle: "每次一张卡，只做需要你判断的那一下",
        trailing:
          '<button type="button" class="btn btn--secondary btn--compact" data-go="/governance/all">列表</button>'
      });

      if (list.state === "loading") {
        return header + ui.LoadingCards(1);
      }

      if (list.state === "error") {
        return (
          header +
          ui.Notice({
            tone: "danger",
            title: "暂时取不到治理卡片",
            message: list.detail + "。你已经处理过的判断不会丢。",
            action: ui.Button({ label: "重试", tone: "secondary", compact: true, go: "/governance" }),
            apiKey: "GET /governance/tasks?status=pending"
          })
        );
      }

      var items = list.body.items;
      if (!items.length) {
        var ready = snap.get("GET /dashboard");
        return (
          header +
          ui.EmptyState({
            symbol: "✓",
            title: "收件箱清空了",
            message:
              (ready.state === "ok" ? ready.body.ready_items : 0) +
              " 条数据已经可以被 Agent 查询。盒子会继续自动同步，有需要你判断的会再出现。",
            action: ui.Button({ label: "看看 Agent 能查到什么", tone: "secondary", go: "/data", view: "agent" }),
            apiKey: "GET /governance/inbox/summary"
          })
        );
      }

      var t = items[0];
      var s = summary.body;
      var progress = ui.Card({
        quiet: true,
        flat: true,
        apiKey: "GET /governance/inbox/summary",
        body:
          '<div class="stack stack--tight">' +
          '<div class="row row--between">' +
          '<span class="t-body t-strong">还剩 ' + s.pending_total + " 条</span>" +
          '<span class="t-muted">今天已处理 ' + s.applied_today + " 条</span>" +
          "</div>" +
          ui.Progress(
            Math.round((s.applied_today / (s.applied_today + s.pending_total)) * 100)
          ) +
          "</div>"
      });

      var card = t.kind === "deletion" ? deletionCard(t) : normalCard(t);

      var why =
        t.queue === "reliable_source_candidates"
          ? ui.Notice({
              tone: "warning",
              title: "接受这条会新建一个数据来源",
              message: "确认完会直接带你去这个来源的详情页，而不是回到下一张卡。",
              apiKey: "GET /reliable-source-candidates?status=pending"
            })
          : "";

      return header + progress + card + why;
    }
  };

  /* ---------- 全部待办列表 ---------- */

  P.SCREENS["governance/all"] = {
    title: "全部待办",
    heading: "全部待办",
    subtitle: "三条队列合在一起，按代价排序",
    tab: "governance",
    kind: "push",
    backLabel: "治理",
    api: ["GET /governance/tasks?status=pending", "GET /governance/inbox/summary"],
    reads: [
      "GET /governance/inbox/summary|body.by_queue.governance",
      "GET /governance/tasks?status=pending|body.total"
    ],

    render: function (snap) {
      var list = snap.get("GET /governance/tasks?status=pending");
      var summary = snap.get("GET /governance/inbox/summary");

      if (list.state === "loading") return ui.LoadingCards(4);
      if (list.state === "error") {
        return ui.Notice({ tone: "danger", title: "取不到列表", message: list.detail });
      }
      if (!list.body.items.length) {
        return ui.EmptyState({ title: "没有待办", message: "三条队列都清空了。" });
      }

      var s = summary.body;
      var queues = ui.Card({
        quiet: true,
        flat: true,
        apiKey: "GET /governance/inbox/summary",
        body:
          '<div class="metric-grid">' +
          ui.Metric({ value: s.by_queue.governance || 0, label: "治理任务" }) +
          ui.Metric({ value: s.by_queue.knowledge_candidates || 0, label: "知识候选" }) +
          ui.Metric({ value: s.by_queue.reliable_source_candidates || 0, label: "信源候选" }) +
          "</div>"
      });

      var rows = list.body.items.map(function (t) {
        var k = KIND[t.kind] || { label: t.kind, tone: "neutral" };
        return ui.Row({
          title: t.title,
          caption: (QUEUE_LABEL[t.queue] || t.queue) + " · " + fmt.rel(t.created_at),
          trailing: ui.Pill({ label: k.label, tone: k.tone }),
          go: "/governance"
        });
      });

      var more =
        list.body.total > list.body.items.length
          ? '<p class="t-dim">只显示了前 ' + list.body.items.length +
            " 条，共 " + list.body.total + " 条 —— 原型不做分页。</p>"
          : "";

      return queues + ui.List(rows, "GET /governance/tasks?status=pending") + more;
    }
  };

  /* ---------- 编辑后接受 ---------- */

  P.SCREENS["governance/edit"] = {
    title: "编辑后接受",
    heading: "编辑后接受",
    tab: "governance",
    kind: "push",
    backLabel: "治理",
    api: ["GET /governance/tasks?status=pending", "POST /governance/tasks/{task_id}/apply"],
    reads: ["GET /governance/tasks?status=pending|body.items[0].preview"],

    render: function (snap, route) {
      var list = snap.get("GET /governance/tasks?status=pending");
      if (list.state !== "ok" || !list.body.items.length) {
        return ui.Notice({ tone: "danger", title: "这条待办已经不在了", message: "可能已被处理。回到治理看下一条。" });
      }
      var t = null;
      list.body.items.forEach(function (x) { if (x.id === route.param) t = x; });
      if (!t) t = list.body.items[0];

      var after = t.diff_after || [];
      var titleVal = after[0] ? after[0].replace(/^标题：/, "") : t.title;
      var catVal = after[1] ? after[1].replace(/^分类：/, "") : "";
      var tagsVal = after[2] ? after[2].replace(/^标签：/, "").split(" · ") : [];

      return (
        ui.Card({
          quiet: true,
          flat: true,
          apiKey: "GET /governance/tasks?status=pending",
          body:
            '<div class="stack stack--tight">' +
            '<p class="t-label">原内容</p>' +
            '<p class="t-muted">' + ui.esc(t.preview) + "</p>" +
            "</div>"
        }) +
        ui.SectionHeader({ title: "改成这样", caption: "已按建议预填，可以直接改" }) +
        ui.Field({ value: titleVal, placeholder: "标题" }) +
        ui.Field({ value: catVal, placeholder: "分类" }) +
        '<div class="row row--wrap" style="gap:8px">' +
        tagsVal.map(function (t2) { return ui.Chip(t2, true); }).join("") +
        ui.Chip("＋ 加标签", false) +
        "</div>" +
        ui.Card({
          body:
            '<div class="stack stack--tight">' +
            '<p class="t-muted">保存后这条进入已就绪，个人 Agent 可以查询到它。</p>' +
            '<p class="t-dim">标题为空时不能保存 —— 进入已就绪前必须填写标题。</p>' +
            "</div>"
        }) +
        '<div class="action-bar">' +
        ui.Button({
          label: "接受并保存",
          apiKey: "POST /governance/tasks/{task_id}/apply",
          toast: "已保存并接受"
        }) +
        ui.Button({ label: "取消", tone: "secondary", back: true }) +
        "</div>"
      );
    }
  };
})((window.Pocket = window.Pocket || {}));
