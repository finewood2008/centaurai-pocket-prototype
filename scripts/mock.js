/* ============================================================
 * mock.js —— 场景快照
 *
 * 两条组织原则：
 *  1) 存 wire 格式（snake_case），按端点字符串做 key。将来把 Pocket.data().get(key)
 *     换成 fetch 就是一个函数的事，normalize 层可从 apps/mobile/src/lib/api.ts 原样抄；
 *     接口浮层也能直接展示后端该返回什么。
 *  2) **每个场景只有一份 world，所有端点响应都是它的计算视图。**
 *     数据 tab 双视角的全部说服力在于「Owner 命中数 − Agent 命中数 ＝ excluded_count」
 *     这个等式；两边各写一份 mock，等式当场就不成立。dashboard 的计数同理，
 *     必须与 items 列表算得出的数一致。
 *
 * 场景是整份快照，不是按资源开关 —— 盒子连不上时四个 tab 必须同时表现为连不上。
 * 全程不用 Math.random，保证截图可复现。
 * ============================================================ */
(function (P) {
  "use strict";

  var NOW = "2026-08-17T09:41:00Z";

  /* ---------- 手写的重点条目（界面上会被真正读到的那些） ---------- */
  var FEATURED = [
    {
      id: "it-3301", title: "供应商合同-明远科技-2026 续签版.docx", state: "ready",
      category: "合同", tags: ["合同", "明远科技", "2026"], source_id: "src-folder-1",
      preview: "甲方：杭州明远科技有限公司。服务期自 2026 年 9 月 1 日起十二个月，年度服务费…",
      file_name: "供应商合同-明远科技-2026 续签版.docx", updated_at: "2026-08-16T11:20:00Z"
    },
    {
      id: "it-3302", title: "合同评审意见-法务回复.md", state: "ready",
      category: "合同", tags: ["合同", "法务"], source_id: "src-folder-1",
      preview: "第 7.2 条违约金比例建议下调至 3%；第 11 条争议解决地建议改为杭州仲裁委…",
      file_name: "合同评审意见-法务回复.md", updated_at: "2026-08-15T03:12:00Z"
    },
    {
      id: "it-3303", title: "框架合同-云枢数据-已盖章扫描件.pdf", state: "ready",
      category: "合同", tags: ["合同", "云枢数据"], source_id: "src-folder-1",
      preview: "（扫描件，已 OCR）框架采购合同，编号 YS-2026-0431，签署日期 2026 年 7 月 3 日…",
      file_name: "框架合同-云枢数据-已盖章扫描件.pdf", updated_at: "2026-08-11T07:45:00Z"
    },
    {
      id: "it-3304", title: "合同台账-2026H1.xlsx", state: "ready",
      category: "台账", tags: ["合同", "台账"], source_id: "src-folder-2",
      preview: "共 34 份在执行合同，其中 6 份将在 90 天内到期。到期提醒列已按签署日 +12 个月推算…",
      file_name: "合同台账-2026H1.xlsx", updated_at: "2026-08-14T22:03:00Z"
    },
    {
      id: "it-3305", title: "会议记录-合同条款拉通-0812.md", state: "ready",
      category: "会议", tags: ["合同", "会议"], source_id: "src-folder-2",
      preview: "参会：嘉木、法务、采购。结论：违约金按 3% 定稿，付款节点改为验收后 30 日…",
      file_name: "会议记录-合同条款拉通-0812.md", updated_at: "2026-08-12T09:30:00Z"
    },
    {
      id: "it-3306", title: "合同模板-技术服务类-v4.docx", state: "ready",
      category: "模板", tags: ["合同", "模板"], source_id: "src-folder-1",
      preview: "本模板适用于技术服务采购。第 9 条数据条款为不可删改项…",
      file_name: "合同模板-技术服务类-v4.docx", updated_at: "2026-07-28T01:15:00Z"
    },
    {
      id: "it-3307", title: "明远科技-合同附件三-报价明细.xlsx", state: "needs_review",
      category: "", tags: [], source_id: "src-folder-1",
      preview: "报价明细共 18 行，含实施人日与年度维保。表头在第 3 行，前两行是公司抬头…",
      file_name: "明远科技-合同附件三-报价明细.xlsx", updated_at: "2026-08-16T13:02:00Z"
    },
    {
      id: "it-3308", title: "扫描件_20260816_141233.pdf", state: "needs_review",
      category: "", tags: [], source_id: "src-folder-1",
      preview: "（OCR 结果）……合同变更确认单……变更事项：交付节点顺延十四日……",
      file_name: "扫描件_20260816_141233.pdf", updated_at: "2026-08-16T14:12:00Z"
    },
    {
      id: "it-3309", title: "微信 · 明远王工：合同这版可以了", state: "ready",
      category: "往来", tags: ["合同", "明远科技"], source_id: "src-wechat-1",
      im_opted_in: false,
      preview: "王工：合同这版可以了，我这边走签批，大概三天。你那边把附件三的报价再核一遍…",
      file_name: "", updated_at: "2026-08-16T15:48:00Z"
    },
    {
      id: "it-3310", title: "剪藏 · 数据合规新规要点（含合同条款影响）", state: "ready",
      category: "剪藏", tags: ["合规", "剪藏"], source_id: "src-capture",
      preview: "要点三：委托处理需在合同中明确处理目的、期限与删除义务，原有模板需增补…",
      origin_uri: "https://example.com/posts/data-compliance-2026", updated_at: "2026-08-10T06:20:00Z"
    },
    {
      id: "it-3311", title: "年度预算-2026-终版.xlsx", state: "ready",
      category: "财务", tags: ["预算"], source_id: "src-folder-2",
      preview: "研发投入占比 46%，市场 12%。Q3 起硬件采购单列…",
      file_name: "年度预算-2026-终版.xlsx", updated_at: "2026-08-09T02:41:00Z"
    },
    {
      id: "it-3312", title: "客户回访记录-云枢-0805.md", state: "ready",
      category: "往来", tags: ["云枢数据"], source_id: "src-folder-2",
      preview: "对方关注点仍是数据不出内网。已确认下一步做一次现场部署演示…",
      file_name: "客户回访记录-云枢-0805.md", updated_at: "2026-08-05T08:00:00Z"
    }
  ];

  /* ---------- 填充条目：让 world 里真的存在那么多条，计数才不是编的 ---------- */
  var FILLER_TITLES = [
    "周报-研发-第{n}周.md", "发票-{n}月-服务费.pdf", "会议记录-例会-0{n}.md",
    "产品需求-数据来源接入-v{n}.md", "客户名单-华东-{n}.xlsx", "招聘-面试记录-{n}.md",
    "供应商资质-{n}.pdf", "报销单-{n}.xlsx", "培训材料-第{n}讲.pptx", "调研笔记-{n}.md"
  ];
  var FILLER_CATEGORIES = ["周报", "财务", "会议", "产品", "客户", "人事"];

  function filler(count, state, startId) {
    var out = [];
    for (var i = 0; i < count; i++) {
      var t = FILLER_TITLES[i % FILLER_TITLES.length].replace("{n}", String((i % 12) + 1));
      out.push({
        id: "it-" + (startId + i),
        title: t,
        state: state,
        category: state === "needs_review" ? "" : FILLER_CATEGORIES[i % FILLER_CATEGORIES.length],
        tags: state === "needs_review" ? [] : [FILLER_CATEGORIES[i % FILLER_CATEGORIES.length]],
        preview: "（示例内容）这条来自文件夹来源的自动同步，已完成指纹、去重与规范化。",
        file_name: t,
        source_id: i % 3 === 0 ? "src-folder-2" : "src-folder-1",
        updated_at: "2026-08-0" + ((i % 8) + 1) + "T04:00:00Z"
      });
    }
    return out;
  }

  /* 126 条 = ready 108 + needs_review 12 + archived 6
     FEATURED 里已有 ready 9、needs_review 2 */
  function allItems() {
    return FEATURED.concat(
      filler(99, "ready", 4000),
      filler(10, "needs_review", 5000),
      filler(6, "archived", 6000)
    );
  }

  var GOV_TASKS = [
    {
      id: "gt-9001", queue: "governance", kind: "duplicate", status: "pending",
      title: "明远科技-合同附件三-报价明细.xlsx", source_name: "工作文件夹",
      preview: "报价明细共 18 行，含实施人日与年度维保。表头在第 3 行，前两行是公司抬头…",
      reason: "与「附件三-报价明细（1）.xlsx」内容指纹一致，只有文件名不同。",
      confidence: 0.94, item_id: "it-3307",
      suggestion: "合并为一条，保留较早的那份路径作为来源。",
      effect: "接受后：这条进入 ready，Agent 立刻能查到。",
      diff_before: ["标题：明远科技-合同附件三-报价明细.xlsx", "分类：（空）", "标签：（无）"],
      diff_after: ["标题：明远科技 · 合同附件三 报价明细", "分类：合同", "标签：合同 · 明远科技"],
      created_at: "2026-08-16T13:05:00Z"
    },
    {
      id: "gt-9002", queue: "governance", kind: "deletion", status: "pending",
      title: "旧版合同模板-技术服务类-v3.docx", source_name: "工作文件夹",
      preview: "本模板适用于技术服务采购。第 9 条数据条款…（v3，已被 v4 取代）",
      reason: "工作文件夹完成了一次完整扫描，没有再找到它。",
      confidence: 1,
      item_id: "it-4102",
      suggestion: "归档这条内容。",
      effect: "归档后 Agent 查不到它，可以在已归档里找回。",
      created_at: "2026-08-16T02:10:00Z"
    },
    {
      id: "gt-9003", queue: "governance", kind: "classify", status: "pending",
      title: "扫描件_20260816_141233.pdf", source_name: "工作文件夹",
      preview: "（OCR 结果）……合同变更确认单……变更事项：交付节点顺延十四日……",
      reason: "OCR 文本里出现「合同变更确认单」「变更事项」，与合同类文档特征一致。",
      confidence: 0.78, item_id: "it-3308",
      suggestion: "分类为「合同」，标题改为「合同变更确认单-0816」。",
      effect: "接受后：这条进入 ready，Agent 立刻能查到。",
      diff_before: ["标题：扫描件_20260816_141233.pdf", "分类：（空）"],
      diff_after: ["标题：合同变更确认单-0816", "分类：合同"],
      created_at: "2026-08-16T14:20:00Z"
    },
    {
      id: "gt-9004", queue: "governance", kind: "quality", status: "pending",
      title: "发票-8月-服务费.pdf", source_name: "工作文件夹",
      preview: "（扫描件）增值税专用发票，金额 46,800.00…",
      reason: "缺少日期与对方主体，检索时很难被找到。",
      confidence: 0.62, item_id: "it-4005",
      suggestion: "补上开票日期 2026-08-14 与开票方「明远科技」。",
      effect: "接受后：这条进入 ready，Agent 立刻能查到。",
      diff_before: ["标签：（无）"],
      diff_after: ["标签：发票 · 明远科技 · 2026-08"],
      created_at: "2026-08-15T05:00:00Z"
    },
    {
      id: "kc-7001", queue: "knowledge_candidates", kind: "knowledge", status: "pending",
      title: "「违约金按 3% 定稿」——来自与法务的会话", source_name: "个人微信（网页观察）",
      preview: "法务：那就按 3% 定稿，我这边同步改模板。",
      reason: "措辞明确、可核验，且与会议记录中的结论一致。",
      confidence: 0.71,
      suggestion: "记为一条决定，附消息级证据。",
      effect: "确认后：这条决定进入知识层，Agent 引用时会带原始消息出处。",
      created_at: "2026-08-12T10:02:00Z"
    },
    {
      id: "kc-7002", queue: "knowledge_candidates", kind: "knowledge", status: "pending",
      title: "「附件三报价需重新核对」——待确认的承诺", source_name: "个人微信（网页观察）",
      preview: "王工：你那边把附件三的报价再核一遍。",
      reason: "是一条指向本人的待办，但没有明确时间。",
      confidence: 0.55,
      suggestion: "记为待办，时间留空。",
      effect: "确认后：进入知识层；不确认则保持私有，Agent 读不到。",
      created_at: "2026-08-16T15:50:00Z"
    },
    {
      id: "rc-5001", queue: "reliable_source_candidates", kind: "source", status: "pending",
      title: "国家数据局 · 政策发布（RSS）", source_name: "官方信源候选",
      preview: "https://www.example.gov.cn/zcfb/rss.xml —— 每周 2~5 条，均为官方原文。",
      reason: "域名与主办单位一致，内容为一手政策原文。",
      confidence: 0.88,
      suggestion: "加为可靠信源，按每日一次抓取。",
      effect: "接受后会**新建一个数据来源** —— 确认完会直接带你去这个来源的详情页。",
      created_at: "2026-08-14T00:30:00Z"
    }
  ];

  var SOURCES = [
    {
      id: "src-folder-1", kind: "folder", display_name: "工作文件夹", status: "healthy",
      config: { path: "/srv/pocket/工作文件夹", recursive: true, extensions: [".md", ".pdf", ".docx", ".xlsx"] },
      schedule: "每小时", enabled: true, item_count: 78, pending_count: 3,
      last_sync_at: "2026-08-17T09:12:00Z", last_error: null, next_run_at: "2026-08-17T10:12:00Z",
      consecutive_failures: 0
    },
    {
      id: "src-folder-2", kind: "folder", display_name: "NAS · 家庭与财务", status: "healthy",
      config: { path: "/mnt/nas/家庭文档", recursive: true, extensions: [".md", ".pdf", ".xlsx"] },
      schedule: "每 6 小时", enabled: true, item_count: 41, pending_count: 1,
      last_sync_at: "2026-08-17T06:00:00Z", last_error: null, next_run_at: "2026-08-17T12:00:00Z",
      consecutive_failures: 0
    },
    {
      id: "src-wechat-1", kind: "wechat_visible_web", display_name: "个人微信（网页观察）",
      status: "attention", config: {}, schedule: "持续", enabled: true,
      item_count: 6, pending_count: 2, last_sync_at: "2026-08-17T09:38:00Z",
      last_error: null, next_run_at: null, consecutive_failures: 0,
      observer: {
        state: "active", extension_version: "0.4.2", parser_version: "12",
        last_heartbeat_at: "2026-08-17T09:38:00Z", open_gap_count: 1,
        coverage_notice: "只记录你已登录会话里真实渲染过的消息，不是完整聊天历史。",
        paused: false
      }
    },
    {
      id: "src-capture", kind: "capture", display_name: "手机采集（文字与链接）", status: "healthy",
      config: {}, schedule: "即时", enabled: true, item_count: 1, pending_count: 0,
      last_sync_at: "2026-08-10T06:20:00Z", last_error: null, next_run_at: null,
      consecutive_failures: 0
    }
  ];

  var ACTIVITY = [
    { kind: "sync", message: "工作文件夹完成同步：新增 4 条，去重 2 条", created_at: "2026-08-17T09:12:00Z" },
    { kind: "governance", message: "你接受了「合同台账-2026H1.xlsx」的分类建议", created_at: "2026-08-17T08:50:00Z" },
    { kind: "agent", message: "个人 Agent 检索了 3 次，命中 11 条", created_at: "2026-08-17T08:20:00Z" },
    { kind: "capture", message: "从手机存入一条链接：数据合规新规要点", created_at: "2026-08-16T21:04:00Z" },
    { kind: "observer", message: "微信观察器心跳正常，有 1 段覆盖缺口待补", created_at: "2026-08-16T19:30:00Z" }
  ];

  function baseWorld() {
    return {
      state: "ok",
      box: {
        box_id: "box_7f3a91",
        display_name: "嘉木的记忆盒子",
        version: "0.6.2",
        platform: "Ubuntu 24.04 · 迷你主机",
        started_at: "2026-08-09T01:20:00Z",
        server_time: NOW,
        timezone: "Asia/Shanghai",
        storage: { data_root_label: "/srv/pocket", used_bytes: 41231237120, free_bytes: 418103296000 },
        scheduler: { running: true, next_run_at: "2026-08-17T10:12:00Z" },
        backup: { last_backup_at: "2026-08-17T03:00:00Z", status: "ok" },
        capabilities: ["folder", "wechat_visible_web", "rss", "mcp", "capture"]
      },
      network: {
        mode: "manual",
        state: "not_provisioned",
        node_id: null,
        node_name: "嘉木的 iPhone",
        address: "10.66.0.12",
        latency_ms: null,
        path: null,
        last_handshake_at: null,
        nodes: [
          { node_id: "nd-1", name: "嘉木的记忆盒子", platform: "linux", state: "offline", address: "10.66.0.1", last_seen_at: null, is_current: false },
          { node_id: "nd-2", name: "嘉木的 iPhone", platform: "ios", state: "offline", address: "10.66.0.12", last_seen_at: null, is_current: true }
        ]
      },
      connection: { mode: "manual", address: "https://192.168.6.107:8443", owner_token_suffix: "…7c2f" },
      items: allItems(),
      sources: SOURCES.map(function (s) { return JSON.parse(JSON.stringify(s)); }),
      tasks: GOV_TASKS.map(function (t) { return JSON.parse(JSON.stringify(t)); }),
      activity: ACTIVITY,
      devices: [
        { device_id: "dv-1", display_name: "嘉木的 iPhone", platform: "ios", app_version: "0.6.2", status: "active", last_seen_at: NOW, created_at: "2026-08-09T02:00:00Z" },
        { device_id: "dv-2", display_name: "iPad · 书房", platform: "ipados", app_version: "0.6.1", status: "active", last_seen_at: "2026-08-15T22:10:00Z", created_at: "2026-08-12T10:00:00Z" }
      ],
      agent_token: { prefix: "cp_live_1a2b", mode: "generated", last_used_at: "2026-08-17T08:20:00Z" },
      agent_clients: [
        { client_id: "cl-1", name: "个人 Agent（REST）", kind: "rest", token_prefix: "cp_live_1a2b", mode: "generated", created_at: "2026-08-09T02:10:00Z", last_used_at: "2026-08-17T08:20:00Z", call_count_7d: 63, revoked: false },
        { client_id: "cl-2", name: "Claude Code（MCP）", kind: "mcp", token_prefix: "cp_live_1a2b", mode: "generated", created_at: "2026-08-11T05:30:00Z", last_used_at: "2026-08-16T23:02:00Z", call_count_7d: 18, revoked: false }
      ],
      access_log: [
        { at: "2026-08-17T08:20:00Z", client_id: "cl-1", kind: "rest", result_count: 4, visibility: "ready", query_length: 6 },
        { at: "2026-08-17T07:55:00Z", client_id: "cl-2", kind: "mcp", result_count: 7, visibility: "ready", query_length: 11 },
        { at: "2026-08-16T23:02:00Z", client_id: "cl-2", kind: "mcp", result_count: 0, visibility: "ready", query_length: 9 }
      ],
      conversations: [
        { conversation_id: "cv-1", title: "明远王工", source_name: "个人微信（网页观察）", message_count: 214, policy: { agent_enabled: true, retention_days: 365 } },
        { conversation_id: "cv-2", title: "法务 · 周律", source_name: "个人微信（网页观察）", message_count: 88, policy: { agent_enabled: true, retention_days: 365 } },
        { conversation_id: "cv-3", title: "家人群", source_name: "个人微信（网页观察）", message_count: 1204, policy: { agent_enabled: false, retention_days: 90 } }
      ],
      downstream: [
        { id: "ds-1", name: "个人记忆库 · centaurAI-database", state: "not_connected", note: "跑在同一台盒子上的另一个应用。它从这里读取已治理的数据，不能修改。" }
      ],
      queue: { pending: 0 },
      processed_today: 18
    };
  }

  /* ---------- 场景变换 ---------- */
  var SCENARIO = {
    normal: function (w) { return w; },

    loading: function (w) { w.state = "loading"; return w; },

    "error-offline": function (w) {
      w.state = "error";
      w.detail = "无法连接你的盒子：Network request failed";
      w.last_success_at = "2026-08-17T09:12:00Z";
      return w;
    },

    empty: function (w) {
      w.items = [];
      w.sources = [];
      w.tasks = [];
      w.activity = [];
      w.conversations = [];
      w.agent_clients = [];
      w.access_log = [];
      w.processed_today = 0;
      w.box.capabilities = ["folder", "capture"];
      return w;
    },

    "error-sync-failed": function (w) {
      w.sources[1].status = "error";
      w.sources[1].last_error = "扫描中断：/mnt/nas/家庭文档 权限被拒绝（EACCES）";
      w.sources[1].last_error_at = "2026-08-17T06:00:00Z";
      w.sources[1].consecutive_failures = 3;
      w.sources[1].next_run_at = "2026-08-17T12:00:00Z";
      w.syncFailed = true;
      return w;
    },

    backlog: function (w) {
      /* 147 条待办：把四张治理卡按模板放大，world 里真的有那么多条 */
      var extra = [];
      for (var i = 0; i < 140; i++) {
        var base = GOV_TASKS[i % 4];
        var clone = JSON.parse(JSON.stringify(base));
        clone.id = "gt-" + (9100 + i);
        clone.created_at = "2026-08-1" + (i % 7) + "T03:00:00Z";
        extra.push(clone);
      }
      w.tasks = w.tasks.concat(extra);
      /* 待办堆积意味着更多条目卡在 needs_review：把 40 条 ready 改判 */
      var moved = 0;
      w.items.forEach(function (it) {
        if (moved < 40 && it.state === "ready" && it.id.indexOf("it-4") === 0) {
          it.state = "needs_review";
          it.category = "";
          it.tags = [];
          moved++;
        }
      });
      return w;
    },

    "observer-degraded": function (w) {
      var s = w.sources[2];
      s.status = "attention";
      s.observer.state = "parser_degraded";
      s.observer.open_gap_count = 6;
      s.observer.coverage_notice =
        "解析器版本落后，最近 6 段对话未能可靠识别 —— 这段时间的消息不完整。";
      s.observer.last_heartbeat_at = "2026-08-17T09:38:00Z";
      return w;
    }
  };

  /* ---------- 计算视图 ---------- */

  function countStates(items) {
    var c = { total: items.length, ready: 0, needs_review: 0, archived: 0 };
    items.forEach(function (it) {
      if (it.state === "ready") c.ready++;
      else if (it.state === "needs_review") c.needs_review++;
      else if (it.state === "archived") c.archived++;
    });
    return c;
  }

  var KIND_ORDER = { deletion: 0, review: 1, knowledge: 2, classify: 3, duplicate: 4, quality: 5, source: 6 };

  function sortedPending(tasks) {
    return tasks
      .filter(function (t) { return t.status === "pending"; })
      .slice()
      .sort(function (a, b) {
        var ka = KIND_ORDER[a.kind] === undefined ? 9 : KIND_ORDER[a.kind];
        var kb = KIND_ORDER[b.kind] === undefined ? 9 : KIND_ORDER[b.kind];
        if (ka !== kb) return ka - kb;
        return a.created_at < b.created_at ? -1 : 1;
      });
  }

  function matches(item, q) {
    if (!q) return true;
    var hay = (item.title + " " + item.preview + " " + (item.tags || []).join(" ") + " " + (item.category || ""));
    return hay.indexOf(q) >= 0;
  }

  function sourceById(w, id) {
    var found = null;
    w.sources.forEach(function (s) { if (s.id === id) found = s; });
    return found;
  }

  function itemVisibleToAgent(w, it) {
    if (it.state !== "ready") return false;
    if (it.im_opted_in === false) return false;
    return true;
  }

  function toWireItem(w, it) {
    var src = sourceById(w, it.source_id);
    return {
      id: it.id,
      title: it.title,
      state: it.state,
      category: it.category || null,
      tags: it.tags || [],
      preview: it.preview,
      origin_uri: it.origin_uri || (it.file_name ? "file://" + it.file_name : null),
      file_name: it.file_name || null,
      source_id: it.source_id,
      source_name: src ? src.display_name : null,
      version: 3,
      updated_at: it.updated_at
    };
  }

  function build(w, route) {
    var counts = countStates(w.items);
    var pending = sortedPending(w.tasks);
    var byQueue = { governance: 0, knowledge_candidates: 0, reliable_source_candidates: 0 };
    pending.forEach(function (t) { byQueue[t.queue] = (byQueue[t.queue] || 0) + 1; });

    var healthy = 0, attention = 0;
    w.sources.forEach(function (s) {
      if (s.status === "healthy") healthy++;
      else attention++;
    });

    var query = (route && route.query) || "合同";
    var ownerHits = w.items.filter(function (it) {
      return it.state !== "archived" && matches(it, query);
    });
    var agentHits = ownerHits.filter(function (it) { return itemVisibleToAgent(w, it); });
    var excluded = { needs_review: 0, im_not_opted_in: 0, knowledge_unconfirmed: 0, archived: 0 };
    ownerHits.forEach(function (it) {
      if (it.state === "needs_review") excluded.needs_review++;
      else if (it.im_opted_in === false) excluded.im_not_opted_in++;
    });
    w.items.forEach(function (it) {
      if (it.state === "archived" && matches(it, query)) excluded.archived++;
    });

    var next = pending.length ? pending[0] : null;
    var qualityDen = counts.ready + counts.needs_review;
    var quality = qualityDen ? Math.round((counts.ready / qualityDen) * 100) : 0;

    /* 列表就是「当前查询词 × 当前视角」的命中集 —— 与 search-preview 同一个计算，
       这样 Owner 命中数 − Agent 命中数 ＝ excluded_count 这个等式永远成立。 */
    var listItems = (route && route.view === "agent") ? agentHits : ownerHits;

    var out = {};

    out["GET /health"] = { state: "ok", body: { status: "ok", service: "centaur-pocket-api", version: w.box.version } };
    out["GET /box/status"] = { state: "ok", body: w.box };

    out["GET /dashboard"] = {
      state: "ok",
      body: {
        items: { total: counts.total, ready: counts.ready, needs_review: counts.needs_review },
        sources: { total: w.sources.length, healthy: healthy, attention: attention },
        sync: {
          discovered_today: w.sources.length ? 6 : 0,
          deduplicated_today: w.sources.length ? 2 : 0
        },
        pending_tasks: byQueue.governance,
        ready_items: counts.ready,
        quality_score: quality,
        processed_today: w.processed_today,
        last_sync_at: w.sources.length ? w.sources[0].last_sync_at : null,
        next_task: next ? taskDto(next) : null,
        recent_activity: w.activity
      }
    };

    out["GET /governance/inbox/summary"] = {
      state: "ok",
      body: {
        pending_total: pending.length,
        by_queue: byQueue,
        by_kind: pending.reduce(function (acc, t) {
          acc[t.kind] = (acc[t.kind] || 0) + 1;
          return acc;
        }, {}),
        oldest_pending_at: pending.length ? pending[pending.length - 1].created_at : null,
        applied_today: w.processed_today,
        skipped_today: 2
      }
    };

    out["GET /governance/tasks/next"] = next
      ? { state: "ok", body: taskDto(next) }
      : { state: "empty", status: 204, body: null };

    out["GET /governance/tasks?status=pending"] = {
      state: pending.length ? "ok" : "empty",
      body: { items: pending.slice(0, 20).map(taskDto), total: pending.length, limit: 20, offset: 0 }
    };

    out["POST /governance/tasks/{task_id}/apply"] = {
      state: "ok",
      body: {
        task: next ? Object.assign({}, taskDto(next), { status: "applied" }) : null,
        next_task: pending.length > 1 ? taskDto(pending[1]) : null
      }
    };
    out["POST /governance/tasks/{task_id}/skip"] = {
      state: "ok",
      body: { task: next ? Object.assign({}, taskDto(next), { status: "skipped" }) : null, next_task: pending.length > 1 ? taskDto(pending[1]) : null }
    };
    out["POST /governance/tasks/{task_id}/undo"] = { state: "ok", body: { task: next ? taskDto(next) : null } };

    out["GET /knowledge/candidates?status=provisional"] = {
      state: byQueue.knowledge_candidates ? "ok" : "empty",
      body: { items: pending.filter(function (t) { return t.queue === "knowledge_candidates"; }).map(taskDto) }
    };
    out["GET /reliable-source-candidates?status=pending"] = {
      state: byQueue.reliable_source_candidates ? "ok" : "empty",
      body: { items: pending.filter(function (t) { return t.queue === "reliable_source_candidates"; }).map(taskDto) }
    };

    out["GET /items"] = {
      state: listItems.length ? "ok" : "empty",
      body: {
        items: listItems.slice(0, 30).map(function (it) { return toWireItem(w, it); }),
        total: listItems.length,
        limit: 30,
        offset: 0,
        facets: {
          by_state: { ready: counts.ready, needs_review: counts.needs_review, archived: counts.archived },
          by_category: categoryFacets(w.items),
          by_tag: tagFacets(w.items)
        }
      }
    };

    var detailItem = null;
    if (route && route.param) {
      w.items.forEach(function (it) { if (it.id === route.param) detailItem = it; });
    }
    if (!detailItem) detailItem = w.items.length ? w.items[0] : null;
    out["GET /items/{item_id}"] = detailItem
      ? {
          state: "ok",
          body: Object.assign(toWireItem(w, detailItem), {
            text_content: detailItem.preview,
            sources: [
              {
                source_id: detailItem.source_id,
                source_name: (sourceById(w, detailItem.source_id) || {}).display_name || null,
                origin_uri: detailItem.origin_uri || (detailItem.file_name ? "file://" + detailItem.file_name : null),
                first_seen_at: "2026-08-11T07:45:00Z",
                last_seen_at: detailItem.updated_at,
                source_modified_at: detailItem.updated_at
              }
            ]
          })
        }
      : { state: "empty", body: null };
    out["PATCH /items/{item_id}"] = { state: "ok", body: detailItem ? toWireItem(w, detailItem) : null };

    out["POST /agent/search-preview"] = {
      state: "ok",
      body: {
        query: query,
        results: agentHits.slice(0, 20).map(function (it) { return toWireItem(w, it); }),
        count: agentHits.length,
        visibility: "ready",
        excluded_count: ownerHits.length - agentHits.length,
        excluded_reasons: excluded
      }
    };

    out["GET /sources"] = {
      state: w.sources.length ? "ok" : "empty",
      body: { items: w.sources.map(sourceDto), total: w.sources.length }
    };

    var detailSource = (route && route.param && sourceById(w, route.param)) || w.sources[0] || null;
    out["GET /sources/{source_id}"] = detailSource
      ? { state: "ok", body: sourceDto(detailSource) }
      : { state: "empty", body: null };
    out["POST /sources"] = { state: "ok", body: { id: "src-new", status: "healthy" } };
    out["POST /sources/{source_id}/sync"] = w.syncFailed
      ? {
          state: "error",
          status: 502,
          detail: "同步运行失败",
          body: { sync_run: { status: "failed", error: "权限被拒绝（EACCES）", finished_at: "2026-08-17T06:00:00Z" } }
        }
      : { state: "ok", body: { sync_run: { status: "succeeded", imported_count: 4, duplicate_count: 2, skipped_count: 1 } } };

    var obs = detailSource && detailSource.observer ? detailSource.observer : (w.sources[2] && w.sources[2].observer) || null;
    out["GET /sources/{source_id}/observer-status"] = obs
      ? { state: "ok", body: obs }
      : { state: "empty", body: null };
    out["GET /sources/{source_id}/coverage-gaps"] = {
      state: "ok",
      body: {
        items: obs && obs.open_gap_count
          ? [{ gap_id: "gp-1", started_at: "2026-08-16T18:00:00Z", ended_at: "2026-08-16T19:20:00Z", reason: "解析器版本落后" }]
          : []
      }
    };

    out["POST /captures"] = {
      state: "ok",
      body: { id: "cap-1", item_id: "it-9999", task_id: "gt-9999", status: "queued", deduplicated: false }
    };

    out["GET /mobile/devices"] = {
      state: w.devices.length ? "ok" : "empty",
      body: { items: w.devices }
    };
    out["DELETE /mobile/devices/{device_id}"] = { state: "ok", body: null };
    out["POST /mobile/pairings"] = { state: "ok", body: { code: "482913", expires_at: "2026-08-17T09:51:00Z" } };
    out["POST /mobile/pairings/claim"] = { state: "ok", body: { device_id: "dv-1", session_expires_at: "2026-08-17T19:41:00Z" } };

    out["GET /agent/token"] = { state: "ok", body: w.agent_token };
    out["POST /agent/token/rotate"] = { state: "ok", body: { token: "cp_live_9f4c7e21b8a3d5", prefix: "cp_live_9f4c" } };
    out["GET /agent/clients"] = {
      state: w.agent_clients.length ? "ok" : "empty",
      body: { items: w.agent_clients }
    };
    out["GET /agent/access-log"] = {
      state: w.access_log.length ? "ok" : "empty",
      body: { items: w.access_log }
    };
    out["POST /api/v1/mcp"] = {
      state: "ok",
      body: { jsonrpc: "2.0", result: { tools: [{ name: "knowledge_retrieve", description: "检索已治理的个人数据（只读，仅 ready）" }] } }
    };
    out["GET /im/conversations"] = {
      state: w.conversations.length ? "ok" : "empty",
      body: { items: w.conversations }
    };

    out["GET /network/status"] = { state: "ok", body: w.network };
    out["POST /network/enrollments"] = { state: "ok", body: { enrollment_id: "en-1", code: "704 118", expires_at: "2026-08-17T09:51:00Z" } };
    out["DELETE /network/nodes/{node_id}"] = { state: "ok", body: null };

    /* 非端点的界面状态，屏幕直接读 world */
    out.__world = w;
    return out;
  }

  function taskDto(t) {
    return {
      id: t.id,
      queue: t.queue,
      kind: t.kind,
      status: t.status,
      title: t.title,
      preview: t.preview,
      source_name: t.source_name,
      reason: t.reason,
      confidence: t.confidence,
      suggestion: t.suggestion,
      effect: t.effect,
      item_id: t.item_id || null,
      proposal: t.diff_after ? { patch: { title: t.diff_after[0] } } : null,
      diff_before: t.diff_before || null,
      diff_after: t.diff_after || null,
      created_at: t.created_at
    };
  }

  function sourceDto(s) {
    return {
      id: s.id,
      kind: s.kind,
      display_name: s.display_name,
      status: s.status,
      config: s.config,
      schedule: s.schedule,
      enabled: s.enabled,
      item_count: s.item_count,
      pending_count: s.pending_count,
      last_sync_at: s.last_sync_at,
      last_error: s.last_error || null,
      last_error_at: s.last_error_at || null,
      next_run_at: s.next_run_at || null,
      consecutive_failures: s.consecutive_failures || 0
    };
  }

  function categoryFacets(items) {
    var m = {};
    items.forEach(function (it) {
      if (it.category) m[it.category] = (m[it.category] || 0) + 1;
    });
    return Object.keys(m)
      .map(function (k) { return { name: k, count: m[k] }; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 6);
  }

  function tagFacets(items) {
    var m = {};
    items.forEach(function (it) {
      (it.tags || []).forEach(function (t) { m[t] = (m[t] || 0) + 1; });
    });
    return Object.keys(m)
      .map(function (k) { return { name: k, count: m[k] }; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 8);
  }

  /* ---------- 对外：Pocket.data(scenario, route) ---------- */
  P.data = function (scenario, route) {
    var name = SCENARIO[scenario] ? scenario : "normal";
    var w = SCENARIO[name](baseWorld());
    var responses = build(w, route);

    return {
      scenario: name,
      world: w,
      get: function (key) {
        if (w.state === "loading") return { state: "loading" };
        if (w.state === "error") {
          return {
            state: "error",
            status: null,
            detail: w.detail,
            last_success_at: w.last_success_at
          };
        }
        var r = responses[key];
        if (!r) {
          return { state: "error", status: 500, detail: "mock 未定义：" + key };
        }
        return r;
      },
      /* selfCheck ⑥ 用：不受 loading/error 影响地取到 normal 结构 */
      raw: function (key) { return responses[key]; }
    };
  };

  P.MOCK_KEYS = Object.keys(build(baseWorld(), null)).filter(function (k) {
    return k.indexOf("__") !== 0;
  });
})((window.Pocket = window.Pocket || {}));
