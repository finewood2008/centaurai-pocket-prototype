/* ============================================================
 * 今日 —— product-spec.md §3.1：首页必须在一个请求内回答四个问题，
 * 并且**只提供一个主行动**。
 *
 * 现有 App 放了两张同级 action card（清理收件箱 + 快速采集），违反这一条；
 * 这里把采集降级为品牌头右上角的 +。
 * ============================================================ */
(function (P) {
  "use strict";

  var ui = P.ui;
  var fmt = P.fmt;

  var KIND_LABEL = {
    duplicate: "疑似重复",
    classify: "智能分类",
    quality: "质量补全",
    normalize: "格式规范",
    deletion: "源文件已删除",
    review: "需要确认",
    knowledge: "新知识候选",
    source: "新信源"
  };

  P.SCREENS.today = {
    title: "今日",
    tab: "today",
    kind: "tab",
    api: [
      "GET /dashboard",
      "GET /governance/inbox/summary",
      "GET /box/status",
      "GET /sources"
    ],
    reads: [
      "GET /dashboard|body.ready_items",
      "GET /dashboard|body.quality_score",
      "GET /dashboard|body.items.needs_review",
      "GET /dashboard|body.sync.discovered_today",
      "GET /dashboard|body.sync.deduplicated_today",
      "GET /dashboard|body.sources.healthy",
      "GET /dashboard|body.sources.total",
      "GET /dashboard|body.next_task.title",
      "GET /dashboard|body.next_task.kind",
      "GET /dashboard|body.recent_activity[0].message",
      "GET /governance/inbox/summary|body.pending_total",
      "GET /governance/inbox/summary|body.by_queue.governance",
      "GET /box/status|body.display_name"
    ],

    render: function (snap, route) {
      var dash = snap.get("GET /dashboard");
      var summary = snap.get("GET /governance/inbox/summary");
      var box = snap.get("GET /box/status");

      var header = ui.BrandHeader({
        eyebrow: "半人马AI · POCKET",
        title: "今日",
        subtitle: fmt.date(fmt.now) + " · " + (box.state === "ok" ? box.body.display_name : "未连接"),
        trailing:
          '<button type="button" class="btn btn--secondary btn--compact" data-sheet="capture" ' +
          'aria-label="采集一段文字或链接">＋</button>'
      });

      /* ---- 加载态：骨架，不闪空数字 ---- */
      if (dash.state === "loading") {
        return header + ui.LoadingCards(3);
      }

      /* ---- 盒子连不上：整页接管，一个数字都不显示 ---- */
      if (dash.state === "error") {
        return (
          header +
          ui.Notice({
            tone: "danger",
            title: "连不上你的盒子",
            message:
              dash.detail +
              "。最近一次连接成功是 " + fmt.rel(dash.last_success_at) +
              "。这里不显示任何数字，避免把旧数据当成现状。",
            apiKey: "GET /dashboard"
          }) +
          ui.Card({
            body:
              '<div class="stack stack--snug">' +
              '<p class="t-body">你的数据都在盒子上，手机只是它的控制台 —— 连不上时不会有任何数据丢失。</p>' +
              '<div class="action-bar">' +
              ui.Button({ label: "重试", go: "/today" }) +
              ui.Button({ label: "检查连接", tone: "secondary", go: "/box/connection" }) +
              "</div></div>"
          })
        );
      }

      var d = dash.body;
      var s = summary.body;

      /* ---- 刚装好、还没有来源 ---- */
      if (d.sources.total === 0) {
        return (
          header +
          ui.EmptyState({
            symbol: "▤",
            title: "你的底座还是空的",
            message:
              "加一个文件夹，盒子会开始扫描、去重、规范化，" +
              "只把治理干净的数据开放给 Agent。",
            action: ui.Button({ label: "添加第一个数据来源", sheet: "add-source" }),
            apiKey: "GET /sources"
          })
        );
      }

      /* ---- Hero：一次答完四问 ---- */
      var hero = ui.Card({
        hero: true,
        apiKey: "GET /dashboard",
        body:
          '<div class="stack stack--snug">' +
          '<div class="row row--between row--top">' +
          '<div class="grow">' +
          '<div class="t-num">' + d.ready_items + "</div>" +
          '<p class="t-muted">条已治理完成，个人 Agent 现在能查到</p>' +
          "</div>" +
          ui.Pill({ label: "治理度 " + fmt.pct(d.quality_score), tone: "primary" }) +
          "</div>" +
          ui.Progress(d.quality_score) +
          '<p class="t-dim">治理度＝已就绪 ÷（已就绪＋待确认），不含已归档</p>' +
          '<div class="metric-grid">' +
          ui.Metric({
            value: d.sources.healthy + "/" + d.sources.total,
            label: d.sources.attention ? "来源要看 " + d.sources.attention : "来源正常"
          }) +
          ui.Metric({ value: "+" + d.sync.discovered_today, label: "今天新增" }) +
          ui.Metric({ value: s.pending_total, label: "等你判断" }) +
          "</div>" +
          '<p class="t-dim">今天去重 ' + d.sync.deduplicated_today +
          " 条 · 已处理 " + d.processed_today +
          " 条 · 上次同步 " + fmt.rel(d.last_sync_at) + "</p>" +
          "</div>"
      });

      /* ---- 唯一主行动 ---- */
      var action;
      if (s.pending_total === 0) {
        action = ui.EmptyState({
          symbol: "✓",
          title: "今天没有需要你判断的事",
          message:
            "盒子会继续自动同步和去重。有需要你拿主意的，会出现在这里。",
          action: ui.Button({ label: "看看 Agent 能查到什么", tone: "secondary", go: "/data", view: "agent" }),
          apiKey: "GET /governance/inbox/summary"
        });
      } else {
        var nt = d.next_task;
        action = ui.Card({
          apiKey: "GET /governance/tasks/next",
          body:
            '<div class="stack stack--snug">' +
            ui.Button({ label: "处理下一条", block: true, go: "/governance" }) +
            '<div class="row" style="gap:8px">' +
            ui.Pill({ label: KIND_LABEL[nt.kind] || nt.kind, tone: nt.kind === "deletion" ? "danger" : "violet" }) +
            '<span class="t-muted grow" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
            ui.esc(nt.title) +
            "</span></div>" +
            '<p class="t-dim">还有 ' + s.pending_total + " 条：治理任务 " + s.by_queue.governance +
            " · 知识候选 " + (s.by_queue.knowledge_candidates || 0) +
            " · 信源候选 " + (s.by_queue.reliable_source_candidates || 0) + "</p>" +
            "</div>"
        });
      }

      /* ---- 异常带：最多两条，按严重度 ---- */
      var alerts = [];
      var sources = snap.get("GET /sources");
      if (sources.state === "ok") {
        sources.body.items.forEach(function (src) {
          if (alerts.length >= 2) return;
          if (src.status === "error") {
            alerts.push(
              ui.Notice({
                tone: "danger",
                title: src.display_name + " 同步失败",
                message: src.last_error + "。这次失败没有改变已有数据。",
                action: ui.Button({ label: "查看", tone: "secondary", compact: true, go: "/data/sources/" + src.id }),
                apiKey: "GET /sources"
              })
            );
          } else if (src.status === "attention") {
            var notice = src.kind === "wechat_visible_web"
              ? "观察器只记录你已登录会话里真实渲染过的消息，有覆盖缺口待补。"
              : "这个来源需要你看一眼。";
            alerts.push(
              ui.Notice({
                tone: "warning",
                title: src.display_name + " 需要注意",
                message: notice,
                action: ui.Button({ label: "查看", tone: "secondary", compact: true, go: "/data/sources/" + src.id }),
                apiKey: "GET /sources"
              })
            );
          }
        });
      }

      /* ---- 最近活动 ---- */
      var activity = d.recent_activity.length
        ? ui.SectionHeader({
            title: "最近活动",
            action: ui.Button({ label: "全部", tone: "ghost", compact: true, toast: "活动全览属 P1，本次原型未画" })
          }) +
          ui.List(
            d.recent_activity.slice(0, 3).map(function (a) {
              return ui.Row({
                title: a.message,
                caption: fmt.rel(a.created_at),
                lead: '<span class="dot dot--primary" aria-hidden="true"></span>'
              });
            }),
            "GET /dashboard"
          )
        : "";

      return header + hero + action + alerts.join("") + activity;
    }
  };
})((window.Pocket = window.Pocket || {}));
