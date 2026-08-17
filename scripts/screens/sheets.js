/* ============================================================
 * sheet / modal：新增来源、采集
 * 两者在 App 里都是 presentation:"modal"（slide_from_bottom）
 * ============================================================ */
(function (P) {
  "use strict";

  var ui = P.ui;

  var KIND_ROWS = [
    { id: "folder", cap: "folder", title: "▤ 本机或挂载文件夹", caption: "盒子可访问的绝对路径，按频率自动扫描" },
    { id: "wechat_visible_web", cap: "wechat_visible_web", title: "✻ 个人微信（网页观察）", caption: "只记录你已登录会话里真实渲染过的消息，不是完整聊天历史" },
    { id: "rss", cap: "rss", title: "◈ 官方 RSS / Atom 信源", caption: "官方原文抓取，先进候选再由你确认" },
    { id: "recording", cap: "recording", title: "◉ 录音（需要盒子支持）", caption: "盒子还没装转写模块" },
    { id: "database_export", cap: "database_export", title: "⇄ 个人记忆库导出（需要盒子支持）", caption: "导入后要重新计算指纹、重新过一遍质量门" }
  ];

  P.SHEETS["add-source"] = {
    title: "添加数据来源",
    api: ["GET /box/status", "POST /sources"],
    reads: ["GET /box/status|body.capabilities"],

    render: function (snap) {
      var box = snap.get("GET /box/status");
      var caps = box.state === "ok" ? box.body.capabilities : [];

      var rows = KIND_ROWS.map(function (k) {
        var enabled = caps.indexOf(k.cap) >= 0;
        return ui.Row({
          title: k.title,
          caption: k.caption,
          trailing: enabled ? "" : ui.Pill({ label: "未启用", tone: "neutral" }),
          toast: enabled ? "选择了：" + k.title : "盒子没有报告这项能力，接口一到位就自动亮起"
        });
      });

      return (
        '<p class="t-muted">类型列表按盒子上报的 capabilities 决定灰不灰 —— 不是前端硬编码。</p>' +
        ui.List(rows, "GET /box/status") +
        ui.SectionHeader({ title: "文件夹来源要填的四项" }) +
        ui.Field({ value: "工作文件夹", placeholder: "显示名称" }) +
        ui.Field({ value: "/srv/pocket/工作文件夹", placeholder: "盒子上可访问的绝对路径" }) +
        ui.Field({ value: "每小时", placeholder: "同步频率" }) +
        ui.Button({ label: "添加并开始首次扫描", block: true, apiKey: "POST /sources", toast: "已添加，首次扫描已排队" }) +
        '<p class="t-dim">调度、重试、内容指纹增量判断和失效来源清理都在盒子上做。手机不承担长期拉取任务。</p>'
      );
    }
  };

  P.SHEETS.capture = {
    title: "采集一段文字或链接",
    api: ["POST /captures"],
    reads: ["POST /captures|body.deduplicated", "POST /captures|body.item_id"],

    render: function () {
      return (
        ui.Field({ placeholder: "标题（可留空，盒子会补）" }) +
        ui.Field({ placeholder: "来源链接（可选）" }) +
        ui.Field({ multiline: true, placeholder: "粘贴正文或写几句" }) +
        ui.Button({ label: "存入盒子", block: true, apiKey: "POST /captures", toast: "已存入，正在排队治理" }) +
        ui.Notice({
          title: "重复内容会被合并",
          message: "同样的文字与链接组合已经存过时，会提示「这条你已经存过了，已合并」，不会多出一条。",
          apiKey: "POST /captures"
        }) +
        '<p class="t-dim">网络不可达时先写本机离线队列，恢复后自动补交；只有写队列本身失败才会报错。</p>'
      );
    }
  };
})((window.Pocket = window.Pocket || {}));
