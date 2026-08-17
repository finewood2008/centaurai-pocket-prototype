/* ============================================================
 * 盒子 —— 本次 IA 改动之二：原「设置」升级更名。
 *
 * 收纳规则：凡是关于「盒子本身、怎么到达它、谁被允许读它」的，都在这一格。
 * 私有网络与 Agent 授权因此是一级概念，不是躺在设置里的可选项。
 *
 * Pocket 不做云账号 —— 个人数据底座引入第三方身份中心等于在「私有」上开洞。
 * 所谓账号实际是三件事：对盒子的持有证明、本机设备身份、已授权设备与撤销。
 * ============================================================ */
(function (P) {
  "use strict";

  var ui = P.ui;
  var fmt = P.fmt;

  var NET_STATE = {
    connected: { label: "已连接", tone: "primary", dot: "ok" },
    degraded: { label: "降级中继", tone: "warning", dot: "warn" },
    offline: { label: "离线", tone: "danger", dot: "bad" },
    not_provisioned: { label: "未启用", tone: "neutral", dot: "" }
  };

  P.SCREENS.box = {
    title: "盒子",
    tab: "box",
    kind: "tab",
    api: [
      "GET /box/status",
      "GET /network/status",
      "GET /mobile/devices",
      "GET /agent/clients",
      "GET /governance/inbox/summary"
    ],
    reads: [
      "GET /box/status|body.display_name",
      "GET /box/status|body.version",
      "GET /box/status|body.storage.data_root_label",
      "GET /box/status|body.storage.free_bytes",
      "GET /box/status|body.scheduler.next_run_at",
      "GET /box/status|body.backup.last_backup_at",
      "GET /network/status|body.state",
      "GET /network/status|body.mode",
      "GET /mobile/devices|body.items[0].display_name",
      "GET /agent/clients|body.items"
    ],

    render: function (snap) {
      var box = snap.get("GET /box/status");
      var net = snap.get("GET /network/status");
      var devices = snap.get("GET /mobile/devices");
      var clients = snap.get("GET /agent/clients");
      var world = snap.world;

      var header = ui.BrandHeader({
        eyebrow: "私有网络 · 访问边界",
        title: "盒子",
        subtitle: "你和你那台盒子之间的连接与边界"
      });

      if (box.state === "loading") return header + ui.LoadingCards(3);

      if (box.state === "error") {
        return (
          header +
          ui.Notice({
            tone: "danger",
            title: "连不上你的盒子",
            message: box.detail + "。最近一次连接成功是 " + fmt.rel(box.last_success_at) + "。",
            apiKey: "GET /box/status"
          }) +
          ui.List([
            ui.Row({
              title: "连接配置",
              caption: "手动地址 · " + world.connection.address,
              go: "/box/connection"
            }),
            ui.Row({
              title: "私有网络",
              caption: "自研网络尚未接入",
              go: "/box/network",
              trailing: ui.Pill({ label: "预览", tone: "violet" })
            })
          ])
        );
      }

      var b = box.body;
      var ns = NET_STATE[net.body.state] || NET_STATE.not_provisioned;

      var boxCard = ui.Card({
        apiKey: "GET /box/status",
        body:
          '<div class="stack stack--snug">' +
          '<div class="row row--between row--top">' +
          '<div class="grow">' +
          '<p class="t-serif-lg">' + ui.esc(b.display_name) + "</p>" +
          '<p class="t-muted">' + ui.esc(b.platform) + " · v" + ui.esc(b.version) + "</p>" +
          "</div>" +
          ui.Pill({ label: "在线", tone: "primary" }) +
          "</div>" +
          '<div class="metric-grid">' +
          ui.Metric({ value: fmt.gb(b.storage.free_bytes), label: "可用空间" }) +
          ui.Metric({ value: fmt.aheadShort(b.scheduler.next_run_at), label: "下次同步" }) +
          ui.Metric({ value: fmt.relShort(b.backup.last_backup_at), label: "上次备份" }) +
          "</div>" +
          '<p class="t-dim">数据根 ' + ui.esc(b.storage.data_root_label) +
          " · 盒子标识 " + ui.esc(b.box_id) + "</p>" +
          ui.Button({ label: "检查连接", tone: "secondary", block: true, go: "/box/connection" }) +
          "</div>"
      });

      var thisDevice = devices.state === "ok" && devices.body.items.length ? devices.body.items[0] : null;
      var clientCount = clients.state === "ok" ? clients.body.items.length : 0;
      var openConversations = world.conversations.filter(function (c) { return c.policy.agent_enabled; }).length;

      var rows = ui.List(
        [
          ui.Row({
            title: "连接方式",
            caption: (net.body.mode === "private_mesh" ? "私有网络" : net.body.mode === "lan" ? "局域网直连" : "手动填写地址") +
              " · " + world.connection.address,
            go: "/box/connection",
            apiKey: "GET /network/status"
          }),
          ui.Row({
            title: "私有网络",
            caption: "自研组网，" + ns.label,
            trailing: ui.Pill({ label: "预览", tone: "violet" }),
            go: "/box/network"
          }),
          ui.Row({
            title: "我的设备",
            caption: (devices.state === "ok" ? devices.body.items.length : 0) + " 台已授权 · 这台是 " +
              (thisDevice ? thisDevice.display_name : "未登记"),
            go: "/box/devices",
            apiKey: "GET /mobile/devices"
          }),
          ui.Row({
            title: "谁能用我的数据",
            caption: clientCount + " 个凭据 · " + openConversations + " 个会话已开放",
            go: "/box/access",
            apiKey: "GET /agent/clients"
          })
        ],
        null
      );

      var minor = ui.List([
        ui.Row({ title: "数据维护与保留策略", caption: "预览删除范围后再执行", toast: "维护属 P1，本次原型未画" }),
        ui.Row({
          title: "离线队列",
          caption: world.queue.pending ? world.queue.pending + " 项等待同步" : "没有待同步的操作",
          toast: "离线队列属 P1，本次原型未画"
        }),
        ui.Row({ title: "关于与产品边界", caption: "Pocket 只做数据治理这一件事", toast: "关于属 P1，本次原型未画" })
      ]);

      var boundary = ui.Card({
        quiet: true,
        flat: true,
        body:
          '<div class="stack stack--tight">' +
          '<p class="t-body t-strong">CentaurAI Pocket 只做一件事：把你自己的数据治理干净。</p>' +
          '<p class="t-muted">AI 秘书、个人记忆库是跑在同一台盒子上的另外的应用。' +
          "它们从这里读数据，但不在这个 App 里。</p>" +
          "</div>"
      });

      return header + boxCard + rows + minor + boundary;
    }
  };

  /* ---------- 连接配置 ---------- */

  P.SCREENS["box/connection"] = {
    title: "连接配置",
    heading: "连接方式",
    subtitle: "私有网络接上后，第一项会成为默认",
    tab: "box",
    kind: "push",
    backLabel: "盒子",
    api: ["GET /network/status", "GET /box/status"],
    reads: ["GET /network/status|body.mode", "GET /network/status|body.nodes"],

    render: function (snap) {
      var net = snap.get("GET /network/status");
      var world = snap.world;
      var mode = net.state === "ok" ? net.body.mode : "manual";

      function option(id, label, caption, disabled) {
        var on = mode === id;
        return ui.Row({
          title: label,
          caption: caption,
          lead: '<span class="dot ' + (on ? "dot--primary" : "") + '" aria-hidden="true"></span>',
          trailing: on
            ? ui.Pill({ label: "当前", tone: "primary" })
            : disabled
              ? ui.Pill({ label: "未就绪", tone: "violet" })
              : "",
          toast: disabled ? "私有网络模块接入后可用" : "已切换（原型不真的切）"
        });
      }

      return (
        ui.List(
          [
            option("private_mesh", "私有网络（推荐）", "端到端加密直连，不经过任何第三方服务器", true),
            option("lan", "局域网直连", "同一个 Wi-Fi 下直接连盒子", true),
            option("manual", "手动填写地址", "现在唯一能用的方式", false)
          ],
          "GET /network/status"
        ) +
        ui.SectionHeader({ title: "手动地址", caption: "真机请填写盒子对手机开放的 HTTPS 地址" }) +
        ui.Field({ value: world.connection.address, placeholder: "https://pocket.example.com" }) +
        ui.Field({ value: "Owner token " + world.connection.owner_token_suffix, type: "text", readonly: true }) +
        '<div class="action-bar">' +
        ui.Button({ label: "测试连接", apiKey: "GET /box/status", toast: "连接正常" }) +
        ui.Button({ label: "改用配对码", tone: "secondary", go: "/onboarding/pair" }) +
        "</div>" +
        ui.Notice({
          title: "手打 Owner token 是高级路径",
          message: "推荐用配对码入网：手机只拿到短期、可撤销的设备会话，不接触长期 Owner token。",
          apiKey: "POST /mobile/pairings"
        }) +
        '<p class="t-dim">非回环地址的明文 HTTP 默认禁用。切到私有网络后地址会变成 10.66.0.x —— ' +
        "离线队列的连接标识必须由盒子标识派生，否则同一台盒子会被判成两个，队列里的操作会永久卡住。</p>"
      );
    }
  };

  /* ---------- 私有网络（占位） ---------- */

  P.SCREENS["box/network"] = {
    title: "私有网络",
    heading: "私有网络",
    subtitle: "自研组网，接上后这一屏的结构不用改",
    tab: "box",
    kind: "push",
    backLabel: "盒子",
    api: ["GET /network/status", "POST /network/enrollments", "DELETE /network/nodes/{node_id}"],
    reads: [
      "GET /network/status|body.state",
      "GET /network/status|body.nodes[0].name",
      "GET /network/status|body.nodes[0].address"
    ],

    render: function (snap) {
      var net = snap.get("GET /network/status");
      if (net.state === "loading") return ui.LoadingCards(2);
      if (net.state === "error") {
        return ui.Notice({ tone: "danger", title: "取不到网络状态", message: net.detail });
      }

      var n = net.body;
      var st = NET_STATE[n.state] || NET_STATE.not_provisioned;

      var statusCard = ui.Card({
        apiKey: "GET /network/status",
        body:
          '<div class="stack stack--snug">' +
          '<div class="row row--between">' +
          ui.Dot(st.dot || "", st.label) +
          ui.Pill({ label: n.mode === "private_mesh" ? "私有网络" : "尚未启用", tone: st.tone }) +
          "</div>" +
          '<p class="t-body">启用后，手机和盒子之间会建立端到端加密的直连，不经过任何第三方服务器。</p>' +
          "</div>"
      });

      var current = null;
      n.nodes.forEach(function (nd) { if (nd.is_current) current = nd; });

      var selfCard = ui.Card({
        quiet: true,
        flat: true,
        body:
          '<div class="stack stack--tight">' +
          '<p class="t-label">本机节点</p>' +
          '<p class="t-body t-strong">' + ui.esc(current ? current.name : "本机") + "</p>" +
          '<p class="t-mono">' + ui.esc(current ? current.address : "—") + "</p>" +
          '<p class="t-dim">最近握手 ' + fmt.rel(n.last_handshake_at) + "</p>" +
          "</div>"
      });

      var nodeRows = n.nodes.map(function (nd) {
        var s = NET_STATE[nd.state] || NET_STATE.offline;
        return ui.Row({
          title: nd.name + (nd.is_current ? "（这台）" : ""),
          caption: nd.address + " · " + (nd.platform === "linux" ? "盒子" : nd.platform) +
            " · " + (nd.last_seen_at ? fmt.rel(nd.last_seen_at) : "从未在线"),
          lead: '<span class="dot ' + (s.dot ? "dot--" + s.dot : "") + '" aria-hidden="true"></span>',
          trailing: ui.Pill({ label: s.label, tone: s.tone }),
          toast: "私有网络模块接入后可用"
        });
      });

      return (
        ui.PreviewBanner("预览 · 私有网络模块尚未接入，这一屏的数据是示例") +
        statusCard +
        selfCard +
        ui.SectionHeader({ title: "已入网设备", caption: "撤销后立即退网，且无法再访问盒子" }) +
        ui.List(nodeRows, "GET /network/status") +
        ui.Button({
          label: "生成入网码",
          block: true,
          apiKey: "POST /network/enrollments",
          toast: "私有网络模块接入后可用"
        }) +
        '<p class="t-dim">私有网络只在你自己的设备之间生效。盒子不需要公网 IP，也不会暴露端口。</p>' +
        ui.Notice({
          tone: "warning",
          title: "接入时这个按钮要和「设备配对」合流",
          message:
            "入网码刻意与配对码同构（一次性码＋有效期＋撤销），将来一次配对同时完成「设备可信」与「入网」；" +
            "撤销也要变成一个动作三件事：撤会话、踢出网络、使入网码失效。",
          apiKey: "DELETE /network/nodes/{node_id}"
        })
      );
    }
  };

  /* ---------- 我的设备 ---------- */

  P.SCREENS["box/devices"] = {
    title: "我的设备",
    heading: "我的设备",
    subtitle: "Pocket 不做云账号：账号＝持有证明＋设备身份＋可撤销",
    tab: "box",
    kind: "push",
    backLabel: "盒子",
    api: ["GET /mobile/devices", "DELETE /mobile/devices/{device_id}", "POST /mobile/pairings"],
    reads: [
      "GET /mobile/devices|body.items[0].display_name",
      "GET /mobile/devices|body.items[0].last_seen_at",
      "GET /mobile/devices|body.items[0].platform"
    ],

    render: function (snap) {
      var res = snap.get("GET /mobile/devices");
      if (res.state === "loading") return ui.LoadingCards(2);
      if (res.state === "error") {
        return ui.Notice({ tone: "danger", title: "取不到设备列表", message: res.detail });
      }
      if (res.state === "empty" || !res.body.items.length) {
        return ui.EmptyState({
          symbol: "▣",
          title: "还没有已授权的设备",
          message: "在盒子上生成一个配对码，这台手机就能拿到短期、可撤销的会话。",
          action: ui.Button({ label: "开始配对", go: "/onboarding/pair" })
        });
      }

      var rows = res.body.items.map(function (d, i) {
        return ui.Row({
          title: d.display_name + (i === 0 ? "（这台）" : ""),
          caption: d.platform + " · v" + d.app_version + " · 最近活跃 " + fmt.rel(d.last_seen_at),
          lead: '<span class="dot dot--ok" aria-hidden="true"></span>',
          trailing: ui.Button({
            label: "撤销",
            tone: "danger",
            compact: true,
            apiKey: "DELETE /mobile/devices/{device_id}",
            toast: "撤销后这台设备会立即失去访问权限，之后需要重新配对"
          })
        });
      });

      return (
        ui.List(rows, "GET /mobile/devices") +
        ui.Button({ label: "添加一台设备", block: true, apiKey: "POST /mobile/pairings", go: "/onboarding/pair" }) +
        ui.Notice({
          title: "手机不接触长期凭据",
          message: "配对拿到的是短期设备会话，可以随时撤销；长期 Owner token 只留在盒子上。",
          apiKey: "POST /mobile/pairings"
        })
      );
    }
  };

  /* ---------- 谁能用我的数据 ---------- */

  P.SCREENS["box/access"] = {
    title: "谁能用我的数据",
    heading: "谁能用我的数据",
    subtitle: "底座的出口：凭据、MCP、会话、下游应用",
    tab: "box",
    kind: "push",
    backLabel: "盒子",
    api: [
      "GET /agent/clients",
      "GET /agent/access-log",
      "GET /agent/token",
      "POST /api/v1/mcp",
      "GET /im/conversations",
      "GET /dashboard"
    ],
    reads: [
      "GET /agent/clients|body.items",
      "GET /agent/access-log|body.items",
      "GET /agent/token|body.prefix",
      "GET /im/conversations|body.items",
      "GET /dashboard|body.ready_items",
      "GET /dashboard|body.items.needs_review"
    ],

    render: function (snap) {
      var clients = snap.get("GET /agent/clients");
      var log = snap.get("GET /agent/access-log");
      var token = snap.get("GET /agent/token");
      var conv = snap.get("GET /im/conversations");
      var dash = snap.get("GET /dashboard");
      var world = snap.world;

      if (clients.state === "loading") return ui.LoadingCards(3);
      if (clients.state === "error") {
        return ui.Notice({ tone: "danger", title: "取不到授权信息", message: clients.detail });
      }

      var openConv = world.conversations.filter(function (c) { return c.policy.agent_enabled; });

      var head = ui.Card({
        apiKey: "GET /dashboard",
        body:
          '<div class="stack stack--tight">' +
          '<p class="t-body">' +
          (dash.state === "ok" ? dash.body.ready_items : 0) +
          " 条数据对已授权的应用开放。</p>" +
          '<p class="t-muted">待确认的 ' +
          (dash.state === "ok" ? dash.body.items.needs_review : 0) +
          " 条、以及未开放的会话，任何应用都读不到。</p>" +
          "</div>"
      });

      var tokenRow = ui.Row({
        title: "Agent 凭据",
        caption:
          (token.state === "ok" ? token.body.prefix + "…" : "—") +
          " · " + (token.state === "ok" && token.body.mode === "environment" ? "由盒子环境变量托管" : "盒子生成") +
          " · 最近使用 " + (token.state === "ok" ? fmt.rel(token.body.last_used_at) : "—"),
        go: "/box/access/agent",
        apiKey: "GET /agent/token"
      });

      var clientRows = clients.body.items.map(function (c) {
        return ui.Row({
          title: c.name,
          caption: "7 天内 " + c.call_count_7d + " 次 · 最近 " + fmt.rel(c.last_used_at),
          lead: '<span class="dot dot--primary" aria-hidden="true"></span>',
          trailing: ui.Pill({ label: c.kind === "mcp" ? "MCP" : "REST", tone: "violet" })
        });
      });

      var logRows = log.state === "ok"
        ? ui.List(
            log.body.items.slice(0, 3).map(function (r) {
              return ui.Row({
                title: (r.kind === "mcp" ? "MCP" : "REST") + " 检索，命中 " + r.result_count + " 条",
                caption: fmt.clock(r.at) + " · 查询词长度 " + r.query_length + " 字"
              });
            }),
            "GET /agent/access-log"
          )
        : "";

      return (
        head +
        ui.SectionHeader({ title: "凭据与客户端" }) +
        ui.List([tokenRow].concat(clientRows), "GET /agent/clients") +
        ui.SectionHeader({ title: "MCP 接入", caption: "REST 之外的第二个 Agent 出口" }) +
        ui.Card({
          apiKey: "POST /api/v1/mcp",
          body:
            '<div class="stack stack--tight">' +
            '<p class="t-mono">POST /api/v1/mcp</p>' +
            '<p class="t-muted">工具 knowledge_retrieve —— 只读，且只返回已就绪的数据。</p>' +
            ui.Button({ label: "复制接入配置", tone: "secondary", compact: true, toast: "已复制（原型不真的写剪贴板）" }) +
            "</div>"
        }) +
        ui.SectionHeader({
          title: "已开放的 IM 会话",
          caption: "每个新会话默认禁止 Agent 使用"
        }) +
        ui.List(
          world.conversations.map(function (c) {
            return ui.Row({
              title: c.title,
              caption: c.message_count + " 条消息 · 保留 " + c.policy.retention_days + " 天",
              trailing: ui.Pill({
                label: c.policy.agent_enabled ? "已开放" : "未开放",
                tone: c.policy.agent_enabled ? "primary" : "neutral"
              }),
              toast: "会话策略属 P1，本次原型未画"
            });
          }),
          "GET /im/conversations"
        ) +
        '<p class="t-dim">' + openConv.length + " / " + world.conversations.length +
        " 个会话对 Agent 开放。会话列表现在要 N+1 次请求才能拉全策略（契约 K）。</p>" +
        ui.SectionHeader({ title: "下游应用", caption: "跑在同一台盒子上、从这里读数据的应用" }) +
        ui.List(
          world.downstream.map(function (d) {
            return ui.Row({
              title: d.name,
              caption: d.note,
              trailing: ui.Pill({ label: "尚未接入", tone: "neutral" }),
              toast: "接入方式待定：按 isolation.md，只允许显式、版本化、默认关闭的适配器"
            });
          })
        ) +
        logRows +
        ui.Notice({
          tone: "warning",
          title: "访问日志不记录你查了什么",
          message:
            "只记查询词长度与命中数，不落原始查询文本 —— 否则日志本身就成了新的隐私面。" +
            "这是需要产品拍板的取舍。",
          apiKey: "GET /agent/access-log"
        }) +
        '<p class="t-dim">凭据只能读，不能改也不能删你的数据。</p>'
      );
    }
  };

  /* ---------- Agent 凭据与轮换 ---------- */

  P.SCREENS["box/access/agent"] = {
    title: "Agent 凭据",
    heading: "Agent 凭据",
    subtitle: "一个只读凭据，随时可轮换",
    tab: "box",
    kind: "push",
    backLabel: "谁能用我的数据",
    api: ["GET /agent/token", "POST /agent/token/rotate", "POST /agent/search-preview"],
    reads: ["GET /agent/token|body.prefix", "GET /agent/token|body.mode"],

    render: function (snap) {
      var token = snap.get("GET /agent/token");
      if (token.state === "loading") return ui.LoadingCards(2);
      if (token.state === "error") {
        return ui.Notice({ tone: "danger", title: "取不到凭据信息", message: token.detail });
      }

      var env = token.body.mode === "environment";

      return (
        ui.Card({
          apiKey: "GET /agent/token",
          body:
            '<div class="stack stack--snug">' +
            '<p class="t-label">当前凭据（只显示前缀）</p>' +
            '<p class="t-mono">' + ui.esc(token.body.prefix) + "••••••••</p>" +
            '<div class="row" style="gap:8px">' +
            ui.Pill({ label: env ? "环境变量托管" : "盒子生成", tone: env ? "violet" : "primary" }) +
            ui.Pill({ label: "只读" }) +
            "</div>" +
            '<p class="t-dim">最近使用 ' + fmt.rel(token.body.last_used_at) + "</p>" +
            "</div>"
        }) +
        ui.Button({
          label: "轮换凭据",
          block: true,
          tone: env ? "secondary" : "primary",
          disabled: env,
          apiKey: "POST /agent/token/rotate",
          toast: "轮换后旧凭据立即失效，新凭据只显示这一次"
        }) +
        (env
          ? '<p class="t-dim">这个凭据由盒子的环境变量托管，需要在盒子上修改并重启，不能在手机上轮换。</p>'
          : '<p class="t-dim">轮换后旧凭据立即失效，用它接入的应用需要重新填写。新凭据只显示这一次。</p>') +
        ui.Notice({
          tone: "warning",
          title: "「以 Agent 的身份预览」需要新接口",
          message:
            "/agent/search 只认 Agent Bearer，而这里只能拿到前缀 —— 手机没法用它去预览。" +
            "解法是让盒子提供 search-preview：Owner token 可调，结果集与 Agent 完全一致，" +
            "额外回被挡条数与原因，但不回被挡内容的正文。",
          apiKey: "POST /agent/search-preview"
        })
      );
    }
  };
})((window.Pocket = window.Pocket || {}));
