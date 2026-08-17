/* ============================================================
 * 基元展示页 —— 与 apps/mobile/src/components/ui.tsx 并排比对色/角/影
 * 不是产品的一屏，只在 #/kitchen-sink 出现。
 * ============================================================ */
(function (P) {
  "use strict";

  var ui = P.ui;

  P.SCREENS["kitchen-sink"] = {
    title: "基元",
    tab: null,
    kind: "tab",
    chrome: "full",
    api: [],
    reads: [],

    render: function () {
      return (
        ui.BrandHeader({
          eyebrow: "CLAUDE 官方配色",
          title: "基元",
          subtitle: "纸 #FAF9F5 · 墨 #141413 · Claude 橙 #D97757 · kraft #D4A27F"
        }) +
        ui.SectionHeader({ title: "SectionHeader", caption: "serif 18/24 ＋ sans 12/18" }) +
        ui.SectionHeader({
          title: "带动作的小节",
          caption: "右侧塞一个 compact 按钮",
          action: ui.Button({ label: "动作", tone: "secondary", compact: true, toast: "compact 36px" })
        }) +
        ui.SectionHeader({ title: "Pill", caption: "五个 tone，都必须带文字" }) +
        '<div class="row row--wrap" style="gap:8px">' +
        ui.Pill({ label: "neutral" }) +
        ui.Pill({ label: "primary Claude 橙", tone: "primary" }) +
        ui.Pill({ label: "warning kraft 赭", tone: "warning" }) +
        ui.Pill({ label: "danger", tone: "danger" }) +
        ui.Pill({ label: "violet 别名", tone: "violet" }) +
        ui.Pill({ label: "success", tone: "success" }) +
        "</div>" +
        ui.SectionHeader({ title: "Notice", caption: "radius 10 / padding 13" }) +
        ui.Notice({ title: "primary", message: "边框 primaryBorder，底色 primarySoft。" }) +
        ui.Notice({ tone: "warning", title: "warning", message: "边框用 kraft 赭、文字用 goldDark —— kraft 本身不承载文字。" }) +
        ui.Notice({ tone: "danger", title: "danger", message: "danger 在 dangerSoft 上是 4.67:1。" }) +
        ui.SectionHeader({ title: "EmptyState", caption: "radius 16 / padding 24" }) +
        ui.EmptyState({
          title: "空态标题用衬线",
          message: "正文无衬线、居中、13/20。图标是 48 的正圆，属形状不属容器。",
          action: ui.Button({ label: "主行动", toast: "44px 最小触控高" })
        }) +
        ui.SectionHeader({ title: "Button", caption: "44 / compact 36；radius 10 / compact 6" }) +
        '<div class="row row--wrap" style="gap:8px">' +
        ui.Button({ label: "primary", toast: "primaryDark 承白字 5.86:1" }) +
        ui.Button({ label: "secondary", tone: "secondary", toast: "surface ＋ border" }) +
        ui.Button({ label: "ghost", tone: "ghost", toast: "透明底，文字 textMuted" }) +
        ui.Button({ label: "danger", tone: "danger", toast: "dangerSoft ＋ danger 描边" }) +
        ui.Button({ label: "disabled", disabled: true }) +
        "</div>" +
        ui.SectionHeader({ title: "LoadingCards", caption: "136 高、三条骨架 28%/92%/60%" }) +
        ui.LoadingCards(2) +
        ui.SectionHeader({ title: "屏幕层复用件" }) +
        '<div class="metric-grid">' +
        ui.Metric({ value: "108", label: "已就绪" }) +
        ui.Metric({ value: "12", label: "待确认" }) +
        ui.Metric({ value: "6", label: "已归档" }) +
        "</div>" +
        ui.Progress(90) +
        ui.Segmented({
          go: "/kitchen-sink",
          items: [
            { id: "owner", label: "我的全部数据", selected: true },
            { id: "agent", label: "Agent 能查到的" }
          ]
        }) +
        ui.Field({ icon: "⌕", placeholder: "搜索标题、正文或标签" }) +
        '<div class="row row--wrap" style="gap:8px">' +
        ui.Chip("合同", true) + ui.Chip("明远科技", false) + ui.Chip("＋ 加标签", false) +
        "</div>" +
        ui.Diff({ before: ["分类：（空）"], after: ["分类：合同"] }) +
        ui.CodeBoxes("482913", 6) +
        ui.PreviewBanner("预览 · 尚未接入的模块用这条横幅") +
        ui.List([
          ui.Row({ title: "可点的行", caption: "带 chevron，56 最小高", toast: "list__row" }),
          ui.Row({ title: "不可点的行", caption: "没有 chevron" })
        ]) +
        ui.Button({ label: "弹一条 toast", block: true, tone: "secondary", toast: "toast 停在 tab bar 上方" })
      );
    }
  };
})((window.Pocket = window.Pocket || {}));
