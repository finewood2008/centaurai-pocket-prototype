/* ============================================================
 * endpoints.js —— 接口登记表
 *
 * 这份表是本原型的核心交付物之一：它把「盒子上跑的数据治理程序要提供什么」
 * 逐条钉住。字段对齐 centaurai-pocket/docs/api-contract.md。
 *
 * status:
 *   "ready"    —— 契约已存在，手机端可直接调
 *   "proposed" —— 本原型逼出来的新接口，待盒子程序提供
 *   "change"   —— 已存在但必须改（认证依赖 / 字段补充）
 *
 * auth: owner | agent | device | collector | owner_or_device
 * MOCK 与 ENDPOINTS 共用同一套 key —— 写错一个字 selfCheck() 立刻报错。
 * ============================================================ */
(function (P) {
  "use strict";

  P.ENDPOINTS = {
    /* ---------- 健康与盒子自述 ---------- */
    "GET /health": {
      method: "GET",
      path: "/api/v1/health",
      auth: "owner",
      status: "ready",
      doc: "api-contract.md · 公共健康检查",
      note: "只有 status/service/version 三个字段，撑不起「盒子」tab 顶卡。"
    },
    "GET /box/status": {
      method: "GET",
      path: "/api/v1/box/status",
      auth: "owner_or_device",
      status: "proposed",
      returns:
        "box_id / display_name / version / platform / started_at / server_time / " +
        "storage{data_root_label,used_bytes,free_bytes} / scheduler{running,next_run_at} / " +
        "backup{last_backup_at,status} / capabilities[]",
      note:
        "契约 A。capabilities 让「新增来源」页按盒子实际能力灰掉未启用类型，而不是前端硬编码。" +
        "box_id 另有关键用途：离线队列的 profileId 必须由它派生，否则切私有网络会把同一台盒子判成两个 profile。"
    },

    /* ---------- 今日 ---------- */
    "GET /dashboard": {
      method: "GET",
      path: "/api/v1/dashboard",
      auth: "owner_or_device",
      status: "ready",
      doc: "api-contract.md · 今日概览",
      returns:
        "items{total,ready,needs_review} / sources{total,healthy,attention} / " +
        "sync{discovered_today,deduplicated_today} / pending_tasks / ready_items / " +
        "quality_score / processed_today / last_sync_at / next_task / recent_activity[]",
      note:
        "quality_score = ready/(ready+needs_review)，不含 archived/inbox —— 文案不能说成「整体质量」。" +
        "discovered_today 是新内容代际数，不是更新数。pending_tasks 只数了治理任务一条队列（见契约 E）。"
    },

    /* ---------- 治理 ---------- */
    "GET /governance/inbox/summary": {
      method: "GET",
      path: "/api/v1/governance/inbox/summary",
      auth: "owner_or_device",
      status: "proposed",
      returns:
        "pending_total / by_queue{governance,knowledge_candidates,reliable_source_candidates} / " +
        "by_kind{...} / oldest_pending_at / applied_today / skipped_today",
      note:
        "契约 E。盒子里实际有三条 owner 判断队列，dashboard.pending_tasks 只数了第一条；" +
        "没有这个汇总，今日页「几项等你判断」就是个兑现不了的承诺。"
    },
    "GET /governance/tasks/next": {
      method: "GET",
      path: "/api/v1/governance/tasks/next?queue=all",
      auth: "owner_or_device",
      status: "proposed",
      returns: "单个 task DTO，队列清空时 204 No Content",
      note:
        "契约 F。apply 的响应已带 next_task，但冷启动和「跳过后继续」没有入口。" +
        "排序建议 deletion > review > 其他，同级按 created_at —— 现在 dashboard.next_task 只按时间排，" +
        "代价最高的 deletion 卡不会被优先推出。"
    },
    "GET /governance/tasks?status=pending": {
      method: "GET",
      path: "/api/v1/governance/tasks?status=pending&limit=20",
      auth: "owner_or_device",
      status: "ready",
      doc: "api-contract.md · 治理任务",
      returns:
        "id/kind/status/title/preview/source_name/suggestion/reason/confidence/" +
        "proposal{patch}/item{state,category,tags,updated_at}/created_at"
    },
    "POST /governance/tasks/{task_id}/apply": {
      method: "POST",
      path: "/api/v1/governance/tasks/{task_id}/apply",
      auth: "owner_or_device",
      headers: ["Idempotency-Key"],
      body: { patch: { title: "…", category: "…", tags: ["…"], state: "ready" } },
      status: "ready",
      returns: "当前任务 + next_task（一次往返翻到下一张卡）",
      errors: [{ code: 409, when: "任务已不是 pending" }],
      note: 'kind:"deletion" 的 apply 无论传什么 state 都只进 archived。'
    },
    "POST /governance/tasks/{task_id}/skip": {
      method: "POST",
      path: "/api/v1/governance/tasks/{task_id}/skip",
      auth: "owner_or_device",
      headers: ["Idempotency-Key"],
      status: "ready"
    },
    "POST /governance/tasks/{task_id}/undo": {
      method: "POST",
      path: "/api/v1/governance/tasks/{task_id}/undo",
      auth: "owner",
      status: "change",
      note:
        "契约 I：这条现在是 require_owner，而同组的列表与 apply/skip 是 require_secretary_access。" +
        "后果——配对设备能接受一张治理卡却撤销不了，直接打破 product-spec §3.4。" +
        "建议统一为 require_owner_or_device。"
    },
    "GET /knowledge/candidates?status=provisional": {
      method: "GET",
      path: "/api/v1/knowledge/candidates?status=provisional",
      auth: "owner",
      status: "ready",
      doc: "api-contract.md · IM 会话与知识候选",
      note: "第二条 owner 判断队列。confirm/dismiss 落地；需并入统一待办（契约 E）。"
    },
    "GET /reliable-source-candidates?status=pending": {
      method: "GET",
      path: "/api/v1/reliable-source-candidates?status=pending",
      auth: "owner",
      status: "ready",
      doc: "api-contract.md · 官方 RSS/Atom 可靠信源",
      note:
        "第三条 owner 判断队列。confirm 需要 If-Match + {expected_version,schedule}，" +
        "且会**创建一个 source** —— 所以这张卡接受后应跳来源详情，不是回到下一张卡。"
    },

    /* ---------- 数据 ---------- */
    "GET /items": {
      method: "GET",
      path: "/api/v1/items?state=&query=&tags=&category=&source_id=&limit=&offset=",
      auth: "owner",
      status: "change",
      doc: "api-contract.md · 条目",
      returns:
        "items[]{id,title,state,category,tags,preview,origin_uri,file_name,version,updated_at} / " +
        "total / limit / offset ＋ 待补 facets{by_state,by_category,by_tag}",
      note:
        "契约 G：现状 query 是三个 LIKE %x%，数据量一大就慢，而 product-spec §6 承诺了 FTS5；" +
        "另缺 tags/category/source_id 筛选与 facets。契约 I：整个 /items* 是 require_owner，" +
        "配对设备调不通 —— 意味着「数据」tab 对配对设备整体不可用。"
    },
    "GET /items/{item_id}": {
      method: "GET",
      path: "/api/v1/items/{item_id}",
      auth: "owner",
      status: "change",
      returns:
        "条目全字段 + text_content + sources[]{source_id,source_name,origin_uri," +
        "source_modified_at,first_seen_at,last_seen_at}",
      note: "同 /items 的认证问题（契约 I）。"
    },
    "PATCH /items/{item_id}": {
      method: "PATCH",
      path: "/api/v1/items/{item_id}",
      auth: "owner",
      status: "change",
      body: { title: "…", category: "…", tags: ["…"], state: "archived" },
      note: "只有 title/category/tags/state 可写。有 pending 任务时不能绕过任务直接进 ready，UI 要挡住。"
    },
    "POST /agent/search-preview": {
      method: "POST",
      path: "/api/v1/agent/search-preview",
      auth: "owner",
      status: "proposed",
      body: { query: "…", limit: 20 },
      returns:
        "与 /agent/search 完全一致的 results[]/count/visibility，额外回 " +
        "excluded_count 与 excluded_reasons{needs_review,im_not_opted_in,knowledge_unconfirmed,archived}",
      note:
        "契约 C，最关键的一条。现状 /agent/search 是 require_agent（main.py:1352），Owner token 调不通，" +
        "GET /agent/token 又只回 prefix —— 所以「Agent 能查到什么」这一屏今天根本渲染不出来，" +
        "除非把 Agent token 明文存进手机（那会让一个只读凭据同时存在两处）。" +
        "硬约束：结果集必须与 Agent 走 /agent/search 拿到的完全一致，否则预览是假的；" +
        "excluded_* 只回计数与原因，不回被挡内容的正文。"
    },
    "GET /sources": {
      method: "GET",
      path: "/api/v1/sources",
      auth: "owner_or_device",
      status: "change",
      doc: "api-contract.md · 数据源",
      returns:
        "id/kind/type/display_name/config/schedule/enabled/status/item_count/" +
        "pending_count/last_sync_at/last_error ＋ 待补 next_run_at/consecutive_failures/last_run_id",
      note: "契约 H：缺 next_run_at 等字段时，来源详情只能说「上次失败了」，答不了「它还会不会自己好起来」。"
    },
    "GET /sources/{source_id}": {
      method: "GET",
      path: "/api/v1/sources/{source_id}",
      auth: "owner_or_device",
      status: "ready"
    },
    "POST /sources": {
      method: "POST",
      path: "/api/v1/sources",
      auth: "owner",
      status: "ready",
      body: { kind: "folder", display_name: "…", config: { path: "/…" }, schedule: "hourly" }
    },
    "POST /sources/{source_id}/sync": {
      method: "POST",
      path: "/api/v1/sources/{source_id}/sync",
      auth: "owner",
      headers: ["Idempotency-Key"],
      status: "ready",
      errors: [
        { code: 409, when: "来源已暂停，或同来源已有未超时的运行" },
        { code: 502, when: "运行内部失败：先落 sync_run=failed，不推进 last_sync_at" }
      ]
    },
    "GET /sources/{source_id}/observer-status": {
      method: "GET",
      path: "/api/v1/sources/{source_id}/observer-status",
      auth: "owner",
      status: "ready",
      returns: "state/extension_version/parser_version/last_heartbeat_at/open_gap_count/coverage_notice/paused"
    },
    "GET /sources/{source_id}/coverage-gaps": {
      method: "GET",
      path: "/api/v1/sources/{source_id}/coverage-gaps",
      auth: "owner",
      status: "ready",
      note: "网页观察结果不得被描述为官方完整历史 —— 缺口要在界面上说出来。"
    },
    "POST /captures": {
      method: "POST",
      path: "/api/v1/captures",
      auth: "owner_or_device",
      headers: ["Idempotency-Key"],
      status: "ready",
      body: { title: "…", url: "…", text: "…" },
      returns: "{id, item_id, task_id, status, deduplicated}",
      note:
        "响应字段已在服务端实现但 api-contract.md 没写，需补文档。" +
        "deduplicated:true 时文案应是「这条你已经存过了，已合并」。"
    },

    /* ---------- 盒子：设备与配对 ---------- */
    "GET /mobile/devices": {
      method: "GET",
      path: "/api/v1/mobile/devices",
      auth: "owner",
      status: "ready",
      returns: "device_id/display_name/platform/app_version/status/last_seen_at/created_at/revoked_at"
    },
    "DELETE /mobile/devices/{device_id}": {
      method: "DELETE",
      path: "/api/v1/mobile/devices/{device_id}",
      auth: "owner",
      status: "ready",
      note: "接入私有网络后，这一个动作要变成三件事：撤会话 + 踢出网络 + 使该节点入网码失效。"
    },
    "POST /mobile/pairings": {
      method: "POST",
      path: "/api/v1/mobile/pairings",
      auth: "owner",
      status: "ready",
      returns: "{code, expires_at}",
      note: "配对链路后端完整实现、UI 全无。现有 App 让用户手打 Owner token —— 本原型把它降为高级选项。"
    },
    "POST /mobile/pairings/claim": {
      method: "POST",
      path: "/api/v1/mobile/pairings/claim",
      auth: "device",
      status: "ready",
      body: { code: "482913", device_name: "嘉木的 iPhone", platform: "ios" },
      returns: "设备会话 + refresh token（手机只拿短期可撤销的会话，不接触长期 Owner token）"
    },

    /* ---------- 盒子：谁能用我的数据 ---------- */
    "GET /agent/token": {
      method: "GET",
      path: "/api/v1/agent/token",
      auth: "owner",
      status: "ready",
      returns: "{prefix, mode: generated|environment}",
      note: "只回前缀，不回全量 token。"
    },
    "POST /agent/token/rotate": {
      method: "POST",
      path: "/api/v1/agent/token/rotate",
      auth: "owner",
      status: "ready",
      returns: "一次性完整 token（只显示这一次）",
      errors: [{ code: 409, when: "mode=environment：凭据由盒子环境变量托管，不能在手机上轮换" }]
    },
    "GET /agent/clients": {
      method: "GET",
      path: "/api/v1/agent/clients",
      auth: "owner",
      status: "proposed",
      returns: "items[]{client_id,name,kind:rest|mcp,token_prefix,mode,created_at,last_used_at,call_count_7d,revoked}",
      note: "契约 D。MVP 单 token 时只有一个元素也成立 —— 底座必须能回答「谁在读我的数据」。"
    },
    "GET /agent/access-log": {
      method: "GET",
      path: "/api/v1/agent/access-log?limit=50",
      auth: "owner",
      status: "proposed",
      returns: "items[]{at,client_id,kind,result_count,visibility,query_length}",
      note:
        "契约 D。**不落原始 query 文本**，只记长度与命中数 —— 否则访问日志本身成了新的隐私面。" +
        "这是必须由产品拍板的取舍，原型里就把这句话写在页面上。"
    },
    "POST /api/v1/mcp": {
      method: "POST",
      path: "/api/v1/mcp",
      auth: "agent",
      status: "ready",
      doc: "api-contract.md · Agent › MCP",
      note: "JSON-RPC 工具协议，是 REST 之外的第二个 Agent 出口。页面只展示接入配置，不实际调用。"
    },
    "GET /im/conversations": {
      method: "GET",
      path: "/api/v1/im/conversations?agent_enabled=true",
      auth: "owner",
      status: "change",
      returns: "会话列表 ＋ 待补 policy{agent_enabled,retention_days} 与 ?agent_enabled 筛选",
      note: "契约 K。没有它，「已开放给 Agent 的会话」要 N+1 次请求才能拉全。"
    },

    /* ---------- 盒子：私有网络（自研，代码尚未到位） ---------- */
    "GET /network/status": {
      method: "GET",
      path: "/api/v1/network/status",
      auth: "owner_or_device",
      status: "proposed",
      returns:
        "mode:private_mesh|lan|manual / state:connected|degraded|offline|not_provisioned / " +
        "node_id/node_name/address/latency_ms/path:direct|relayed/last_handshake_at / " +
        "nodes[]{node_id,name,platform,state,address,last_seen_at,is_current}",
      note: "契约 B。刻意与 /mobile/pairings 同构（一次性码＋有效期＋撤销），将来两条链路可以合流成一次配对。"
    },
    "POST /network/enrollments": {
      method: "POST",
      path: "/api/v1/network/enrollments",
      auth: "owner",
      status: "proposed",
      returns: "{enrollment_id, code, expires_at}"
    },
    "DELETE /network/nodes/{node_id}": {
      method: "DELETE",
      path: "/api/v1/network/nodes/{node_id}",
      auth: "owner",
      status: "proposed",
      returns: "204"
    }
  };

  P.endpointCount = function () {
    var ready = 0, proposed = 0, change = 0;
    Object.keys(P.ENDPOINTS).forEach(function (k) {
      var s = P.ENDPOINTS[k].status;
      if (s === "proposed") proposed++;
      else if (s === "change") change++;
      else ready++;
    });
    return { ready: ready, proposed: proposed, change: change };
  };
})((window.Pocket = window.Pocket || {}));
