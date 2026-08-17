/* ============================================================
 * 首次配对入网
 *
 * 配对链路（/mobile/pairings → claim → sessions/refresh）后端已完整实现、UI 全无；
 * 现有 App 让用户手打 Owner token。这里把配对码入网作为默认路径，
 * Owner token 降为高级选项。
 * ============================================================ */
(function (P) {
  "use strict";

  var ui = P.ui;
  var fmt = P.fmt;

  P.SCREENS["onboarding/pair"] = {
    title: "连接你的盒子",
    tab: null,
    kind: "tab",
    chrome: "full",
    api: ["POST /mobile/pairings", "POST /mobile/pairings/claim"],
    reads: ["POST /mobile/pairings|body.code", "POST /mobile/pairings|body.expires_at"],

    render: function (snap) {
      var pairing = snap.get("POST /mobile/pairings");
      var expired = false;

      var header = ui.BrandHeader({
        eyebrow: "第一步",
        title: "先把手机连上你的盒子",
        subtitle: "数据、治理和检索全部发生在你自己的盒子上。手机只是它的控制台，不保存你的数据副本。"
      });

      if (pairing.state === "loading") {
        return header + ui.LoadingCards(2);
      }

      if (pairing.state === "error") {
        return (
          header +
          ui.Notice({
            tone: "danger",
            title: "连不上任何盒子",
            message: pairing.detail + "。确认盒子已开机、并和手机在同一个网络里。",
            action: ui.Button({ label: "重试", tone: "secondary", compact: true, go: "/onboarding/pair" }),
            apiKey: "POST /mobile/pairings"
          }) +
          ui.Button({ label: "手动填写地址和 Owner token", tone: "ghost", block: true, go: "/box/connection" })
        );
      }

      var code = pairing.state === "ok" ? pairing.body.code : "";

      return (
        header +
        ui.Card({
          apiKey: "POST /mobile/pairings",
          body:
            '<div class="stack stack--loose">' +
            ui.Step(1, '<p class="t-body">在盒子上打开 Pocket，点「配对手机」。</p>') +
            ui.Step(
              2,
              '<div class="stack stack--snug">' +
              '<p class="t-body">输入盒子上显示的 6 位配对码。</p>' +
              ui.CodeBoxes(code, 6) +
              '<p class="t-dim">' +
              (expired ? "这个配对码已经过期，请在盒子上重新生成一个。" : "有效期到 " + fmt.clock(pairing.body.expires_at) + "，过期后重新生成即可。") +
              "</p></div>"
            ) +
            ui.Step(3, ui.Field({ value: "嘉木的 iPhone", placeholder: "给这台手机起个名字" })) +
            "</div>"
        }) +
        ui.Button({
          label: "连接",
          block: true,
          apiKey: "POST /mobile/pairings/claim",
          toast: "已连接：这台手机拿到短期、可撤销的设备会话",
          go: "/today"
        }) +
        ui.Notice({
          title: "手机不接触长期凭据",
          message: "配对拿到的是短期设备会话，可以在「我的设备」里随时撤销。长期 Owner token 只留在盒子上。",
          apiKey: "POST /mobile/pairings/claim"
        }) +
        ui.Button({ label: "手动填写地址和 Owner token", tone: "ghost", block: true, go: "/box/connection" }) +
        '<p class="t-dim">配对码错误时提示「配对码不对，请检查后重试」；过期时提示重新生成。</p>'
      );
    }
  };
})((window.Pocket = window.Pocket || {}));
