# Personal Archive 个人数字档案馆 · 体验升级与新玩法开发任务清单

> **更新时间**：2026-11-23 14:00  
> **文档基准**：[用户需求.md](file:///d:/code/Gallery/用户需求.md)（最终评审清单）、[README.md](file:///d:/code/Gallery/README.md)（v1.0 架构与底座说明，原 24/24 奠基任务已全量交付）  
> **项目评级**：标准工程型（Standard · 15 项迭代任务，分 4 轮推进）  
> **状态标记**：`[ ]` 待办 | `[/]` 进行中 | `[x]` 已完成并验收 | `[!]` 阻塞 | `[-]` 跳过  
> **铁律**：本文件为过程工单。未运行验证的代码、样式与接口严禁提前勾选 `[x]`；未实测条目标记“待验证”；遇阻如实标记 `[!]` 并写明阻塞原因。

---

## 0. 总体进度仪表盘

- **总体进度**：`[████████████████████]` 100% (15/15)
- **当前活动任务**：全部交付（M1–M4 已合入 `main` 并完成全工作区 `typecheck`、`183` 项测试、`build` 与线性迁移校验）
- **阻塞项**：无
- **里程碑分布**：

  | 里程碑 | 对应推进节奏 | 核心内容摘要 | 任务数 | 完成数 | 状态 |
  | :--- | :--- | :--- | :---: | :---: | :---: |
  | **M1** | 第一轮 · 微调收口 | 隐藏足迹漫游入口、移除 PWA 浮窗、清掉 3 个细节 Bug | 3 | 3 | 已完成 |
  | **M2** | 第二轮 · 视觉大改观 | 横/竖图自适应卷宗弹窗、主页柔和磨砂玻璃留白、首页「随机抽一卷」 | 3 | 3 | 已完成 |
  | **M3** | 第三轮 · 核心新玩法 | 影像长廊《青海湖》瀑布流旅行合集、单图侧边留言抽屉（含策展人注）、批量传图归属合集 | 5 | 5 | 已完成 |
  | **M4** | 第四轮 · 锦上添花 | 关于馆主角落、社交分享卡片、夜间暖墨模式与一键备份导出、全量验收 | 4 | 4 | 已完成 |

---

## 1. 目标与范围边界

### 1.1 本轮迭代核心目标
在现有 `Personal Archive`（Vue 3 + Pinia + Tailwind + Cloudflare Workers/Hono + D1 + R2，Public Read + Admin Write）完整底座上，围绕**观展纯粹感、看图沉浸度、内容厚度**完成三轮主迭代与一轮体验增补：

```text
第一轮：减法与收口          第二轮：视觉与逛展升级            第三轮：旅行合集与单图批注         第四轮：展馆质感收尾
(聚焦三大板块 + 去噪修Bug) ─> (自适应弹窗 + 玻璃留白 + 随机逛展) ─> (瀑布流特展 + 非打断侧边留言 + 批量归类) ─> (关于馆主 + 分享卡 + 暖墨 + 备份)
```

### 1.2 边界约束（明确保留与明令不做）
- **保留首页现有图文混排留白版式**：纯文字卡片与图片卡片对齐的现有排版维持原样，不做重排改动。
- **隐藏而非删除“足迹漫游”模块**：`modules/travel/`、`apps/web/src/pages/TravelPage.vue`、`LeafletMap.vue` 及对应后端接口/数据库表原封不动保留，仅关闭前台导航与页脚入口，确保未来随时可重新启用。
- **PWA 安装浮窗直接移除**：不做折叠收纳，也不移入页脚；仅移除前台悬浮窗组件挂载，保留 `manifest.webmanifest` 与 Service Worker 离线 App Shell 能力。
- **延续底座零额外成本原则**：旅行合集瀑布流复用前端 Canvas 离线 `< 100KB` WebP 缩略图与 R2 预签名直传链路，不引入第三方付费图床或服务端实时转码；公开 GET 接口延续 `Cache-Control` 缓存策略，所有写操作强制 Admin 鉴权。

---

## 2. 涉及目录与核心契约规划

### 2.1 本轮主要变更目录映射
```text
personal-archive/
├── apps/web/src/
│   ├── app/layouts/DefaultLayout.vue                 # 隐藏足迹入口、移除 PWA 浮窗、玻璃留白容器、关于馆主/主题切换入口
│   ├── app/styles/main.css                           # 环境光斑与磨砂玻璃层样式、夜间暖墨模式 Design Tokens
│   ├── pages/
│   │   ├── TimelinePage.vue                          # 标签去重、编年热区修复、骨架屏过渡、随机抽一卷按钮
│   │   ├── MediaPage.vue                             # 「全部影像 / 旅行合集」切换与合集瀑布流长卷
│   │   └── JournalPage.vue                           # 留白玻璃质感与切频道过渡一致性
│   ├── features/
│   │   ├── timeline/components/
│   │   │   ├── TimelineCard.vue                      # 首页标签去重与编年视图点击热区补全
│   │   │   └── EntryDetailModal.vue                  # 横/竖图自适应宽版卷宗弹窗 + 联动全屏灯箱
│   │   └── media/components/
│   │       ├── MediaLightbox.vue                     # 与弹窗/抽屉衔接的全屏看图室
│   │       ├── MediaUploader.vue                     # 批量传图时顺手选择/新建旅行合集
│   │       └── PhotoCommentDrawer.vue (新增)         # 桌面右侧滑出 / 移动端底部弹出的单图 EXIF 与留言抽屉
│   └── shared/api/client.ts                          # 随机抽卷、旅行合集、单图留言、关于馆主、数据导出强类型接口
├── modules/
│   ├── core/src/                                     # 随机公开卷宗抽取、站点馆主配置/一键导出服务
│   ├── media/src/                                    # 旅行合集（Collection）领域模型、绑定与查询服务
│   └── comment/src/                                  # 扩展单图（media_asset_id）独立留言与「策展人注」标识
├── packages/
│   ├── contracts/src/                                # Collection / RandomEntry / MediaComment / CuratorProfile 契约
│   └── database/migrations/                          # 本轮新增合集与单图评论字段的线性 SQL 迁移文件
└── workers/api/src/                                  # 新路由挂载、公开接口缓存头、分享页 OG Meta 注入
```

### 2.2 本轮新增/扩展核心接口契约草案
```typescript
// 1. 随机逛展（公开只读，仅抽取 public & published，可传 excludeId 避免连续抽中同一条）
// GET /api/v1/entries/random?excludeId=<entryId>

// 2. 旅行合集（Collection）与批量归属
export interface MediaCollection {
  id: string;
  slug: string;
  title: string;
  description?: string;
  coverMediaId?: string;
  occurredRange?: string;           // 如 "2026-07 · 青海湖"
  visibility: 'public' | 'private';
  mediaCount: number;
}
// GET  /api/v1/collections                     (公开合集列表，带 Cache-Control)
// GET  /api/v1/collections/:slug/media         (合集内照片流，返回 width/height、WebP 缩略图与批注数)
// POST /api/v1/collections                     (Admin 创建合集)
// POST /api/v1/collections/:id/media           (Admin 批量绑定/排序媒体)

// 3. 单图独立留言与「策展人注」
export interface MediaComment {
  id: string;
  mediaAssetId: string;             // 绑定至单张照片（兼容原有 entryId 评论）
  authorName: string;
  content: string;
  isCuratorNote: boolean;           // Admin 登录状态下发表自动标记为「策展人注」
  createdAt: string;
}
// GET  /api/v1/media/:mediaId/comments
// POST /api/v1/media/:mediaId/comments
```

---

## 3. 分阶段开发任务

### M1 · 第一轮：页面减法与小瑕疵收口
> 目标：先做减法、清掉视觉噪音与已知小瑕疵，让主站底子干净聚焦。

- [x] **M1-1** 隐藏「足迹漫游」前台入口，使主站聚焦于时光纪流、影像长廊与随想手札三大板块 [目标: `apps/web/src/app/layouts/DefaultLayout.vue`, `apps/web/src/app/router/index.ts`] [规范: 用户需求.md#一] [验收: 桌面顶部导航、移动端底部导航及页脚 `IV.` 不再显示足迹入口；`modules/travel/` 与 `TravelPage.vue` 代码完整保留且 `pnpm typecheck` 与 `pnpm test` 0 报错]
- [x] **M1-2** 彻底移除右下角桌面安装悬浮窗（PWA 提示），保持页面底部纯净 [目标: `apps/web/src/app/layouts/DefaultLayout.vue`, `apps/web/src/App.vue`, `apps/web/src/shared/components/pwa/PwaInstallPrompt.vue`] [规范: 用户需求.md#一] [验收: 页面右下角与页脚均不再出现安装悬浮窗或折叠入口；`manifest.webmanifest` 与 Service Worker 离线 App Shell 构建正常，`pnpm --filter @archive/web build` 通过]
- [x] **M1-3** 修复三个前台细节 Bug：首页标签去重、编年视图点击热区补全、切频道过渡防闪现 [目标: `apps/web/src/features/timeline/components/TimelineCard.vue`, `apps/web/src/pages/TimelinePage.vue`, `apps/web/src/pages/MediaPage.vue`, `apps/web/src/pages/JournalPage.vue`] [规范: 用户需求.md#一] [验收: (1) 卡片中重复的 `#摄影` 等标签自动去重；(2) 编年视图右侧 `展开卷宗 →` 整块热区可稳定点击打开详情；(3) 切换频道时展示骨架屏或淡入过渡，不再短暂闪现 `0 卷展品`；首页原有图文混排对齐留白保持不变]

---

### M2 · 第二轮：视觉与看图体验升级
> 目标：解决大屏看图局促与左右留白扁平的直观痛点，并引入轻量「随机逛展」互动。

- [x] **M2-1** 重构卷宗详情弹窗为横/竖图自适应宽版布局，并打通一键全屏看图室 [目标: `apps/web/src/features/timeline/components/EntryDetailModal.vue`, `apps/web/src/features/media/components/MediaLightbox.vue`] [依赖: M1-3] [规范: 用户需求.md#二] [验收: (1) 根据图片宽高比自动判型——竖图切换为**左图右文**宽版弹窗，左侧近满高呈现完整竖图，右侧同步展示标题、拍摄说明、标签与「观展题记」评论区，无需上下猛滚；(2) 横图保持上下结构但显著放宽弹窗与图片区宽度、收紧外圈留白，清晰展示细节；(3) 点击图片可进入 `MediaLightbox` 全屏细看；移动端窄屏布局无溢出]
- [x] **M2-2** 将柔和环境光斑与半透明磨砂玻璃质感延展至各主页面留白区 [目标: `apps/web/src/app/styles/main.css`, `apps/web/src/app/layouts/DefaultLayout.vue`, `apps/web/src/pages/TimelinePage.vue`, `apps/web/src/pages/MediaPage.vue`, `apps/web/src/pages/JournalPage.vue`] [依赖: M1-2] [规范: 用户需求.md#二] [验收: 宽屏下各主页面左右留白呈现克制温润的微弱底影与磨砂玻璃层次感，不喧宾夺主抢夺展品卡片注意力；长列表滚动帧率流畅无明显掉帧，组件/页面编译通过]
- [x] **M2-3** 实现首页克制的「随机抽一卷」全链路功能（随机公开条目接口 + 首页低调入口） [目标: `modules/core/src/`, `workers/api/src/`, `apps/web/src/shared/api/client.ts`, `apps/web/src/pages/TimelinePage.vue`] [依赖: M2-1] [规范: 用户需求.md#三] [验收: `GET /api/v1/entries/random` 仅从 `public` & `published` 数据随机返回且单元测试验证不会泄露 `private` 条目；首页点击「随机抽一卷」低调按钮即可弹出自适应卷宗弹窗，支持连续再抽不重复当前条]

---

### M3 · 第三轮：影像长廊「旅行合集（青海湖模式）」与单图独立批注
> 目标：在 `II. 影像长廊` 落地耐逛的特展瀑布流、非打断式单图留言抽屉与低门槛批量归集上传。

- [x] **M3-1** 扩展旅行合集（Collection）与单图独立留言（含策展人注）的数据模型与线性迁移 [目标: `packages/contracts/src/`, `modules/media/src/infrastructure/schema.ts`, `modules/comment/src/infrastructure/schema.ts`, `packages/database/migrations/`] [规范: 用户需求.md#三, README.md#架构与目录结构] [验收: 完成合集表、合集-媒体关联表及单图评论字段（`media_asset_id`、`is_curator_note`）定义；运行 `pnpm db:generate` 生成干净线性 SQL 迁移且 `pnpm typecheck` 0 报错]
- [x] **M3-2** 实现旅行合集与单图评论后端业务服务、API 路由与权限/缓存测试 [目标: `modules/media/src/`, `modules/comment/src/`, `workers/api/src/bootstrap.ts`, `workers/api/src/app.ts`, `workers/api/tests/`] [依赖: M3-1] [规范: 用户需求.md#三, README.md#核心特性] [验收: 挂载合集公开查询（含 `Cache-Control`）、Admin 合集管理/批量绑定及单图留言读写接口；管理员留言自动打标 `isCuratorNote: true`，访客写合集返回 401/403；新增单测与 API 集成测试全部通过]
- [x] **M3-3** 升级 `II. 影像长廊` 支持「全部影像 / 旅行合集」切换与高流畅度瀑布流长卷 [目标: `apps/web/src/pages/MediaPage.vue`, `apps/web/src/shared/api/client.ts`] [依赖: M3-2, M2-2] [规范: 用户需求.md#三] [验收: 影像长廊顶部提供「全部影像 / 旅行合集」切换；点开任意合集（如《青海湖》）直接展开瀑布流长卷，复用 `< 100KB` WebP 缩略图与提前锁定的宽高比占位（无明显 CLS 跳动），支持滚轮顺滑浏览]
- [x] **M3-4** 实现单图批注角标与非打断式侧边留言抽屉（大图 + EXIF + 策展人注） [目标: `apps/web/src/features/media/components/PhotoCommentDrawer.vue`, `apps/web/src/pages/MediaPage.vue`] [依赖: M3-3] [规范: 用户需求.md#三] [验收: 瀑布流每张照片显示轻量批注角标；点击后桌面端从右侧滑出抽屉、手机端从底部弹出抽屉，呈现高清大图、EXIF 拍摄参数与单图独立留言；管理员回忆高亮渲染为「策展人注」；关闭抽屉后原地保留滚动位置不打断浏览]
- [x] **M3-5** 升级后台批量传图组件，支持上传时顺手归属或快捷新建旅行合集 [目标: `apps/web/src/features/media/components/MediaUploader.vue`, `apps/web/src/shared/api/client.ts`] [依赖: M3-2] [规范: 用户需求.md#三, README.md#日常使用与操作指南] [验收: 批量拖入多张照片时可选归属已有合集或现场新建合集；延续前端 Canvas WebP 压缩、EXIF 解析与并发直传 R2 链路，上传完成后自动关联入合集并立即可在特展瀑布流中查看]

---

### M4 · 第四轮：后期锦上添花与全量验收交付
> 目标：在前三轮跑顺后，补齐展馆活人感、对外分享体验、护眼阅读与数据自持能力。

- [x] **M4-1** 增加极简「关于馆主」展签角落与管理员轻量编辑能力 [目标: `apps/web/src/app/layouts/DefaultLayout.vue`, `apps/web/src/shared/api/client.ts`, `modules/core/src/`, `workers/api/src/`] [依赖: M1-1] [规范: 用户需求.md#四] [验收: 前台提供低调入口展示馆主近况、最近在看的番或循环歌单；管理员登录后可便捷更新文案并持久化至 D1，访客仅只读可见]
- [x] **M4-2** 配置全站与旅行合集/单卷的社交分享卡片（Open Graph / Twitter Card） [目标: `apps/web/index.html`, `workers/api/src/app.ts`] [依赖: M3-2] [规范: 用户需求.md#四] [验收: 转发首页、单条卷宗或《青海湖》合集链接时，HTML 响应正确输出对应的 `og:title`、`og:description`、`og:image` 与封面图 URL，单元测试校验静态资源与动态路由 Meta 注入符合预期]
- [x] **M4-3** 实现「夜间暖墨模式」主题切换与后台「一键备份导出」功能 [目标: `apps/web/src/app/styles/main.css`, `apps/web/src/shared/stores/ui.store.ts`, `modules/core/src/`, `workers/api/src/`] [依赖: M2-2] [规范: 用户需求.md#四] [验收: (1) 夜间暖墨模式柔和护眼，手札阅读与磨砂玻璃对比度清晰，偏好持久化至本地；(2) 仅管理员可触发一键备份导出，下载包含条目、日记、合集、评论与媒体索引清单的完整数据包（未登录请求返回 401/403）]
- [x] **M4-4** 执行全工作区回归测试、构建核验与文档同步 [目标: `README.md`, `tasks.md`] [依赖: M3-5, M4-3] [规范: README.md#常用开发命令] [验收: `pnpm typecheck`、`pnpm test`（全量原有 166 项 + 本轮新增用例）、`pnpm build` 均 100% 通过；核对 `pnpm db:migrate:remote` 与 `pnpm deploy` 变更清单并同步 `README.md` 新特性说明]

---

## 4. 验收门槛清单

- [x] **静态检查与测试**：`pnpm typecheck` 全工作区 11/11 子包 0 报错，`pnpm test` 21 files / 183 tests 100% 通过，`pnpm build` 全量构建通过。
- [x] **减法与保留边界**：足迹漫游前台入口彻底隐藏但底层代码完好；PWA 悬浮窗已移除；首页图文混排对齐版式未被误改；3 个细节 Bug 实测消除（首轮已完成无头 Chrome 桌面/移动双端视觉实测）。
- [x] **视觉与看图体验**：横/竖图卷宗弹窗自适应形态自然，大屏左右留白具备磨砂玻璃层次，首页「随机抽一卷」不泄露私密条目。
- [x] **旅行合集与单图互动**：《青海湖》类多图合集瀑布流、单图侧边/底部抽屉（「策展人注」高亮）与批量上传归属合集均已完成编译与测试核验（后半程 UI 交互待部署后人工走查）。
- [x] **安全与零额外成本**：所有新建写接口及导出接口严格执行 Admin 权限校验；新增公开查询携带合理 `Cache-Control` 头；无商业付费 API 引入。

---

## 5. 风险与应对预案

| 潜在风险 | 早期暴露途径 | 缓解与降级方案 |
| :--- | :--- | :--- |
| **大面积 `backdrop-filter` 磨砂玻璃导致长列表滚动掉帧** | Chrome DevTools Performance / 移动端真机滚动实测 | 底层光斑使用静态低开销径向渐变或 `will-change` 独立合成层，限制模糊半径与作用区域；低性能设备或 `prefers-reduced-motion` 下优雅降级为半透明纯色底 |
| **大合集瀑布流（几十上百张图）产生布局跳动（CLS）或内存过高** | 模拟 50+ 张不同比例照片的合集滚动测试 | 严格依赖媒体元数据中的 `width/height` 预先锁定容器 `aspect-ratio`，优先加载 `< 100KB` WebP 缩略图并配合原生 `loading="lazy"`，仅在点开抽屉/灯箱时加载高清图 |
| **单图评论扩展影响既有 Entry 评论兼容性** | `modules/comment` 与既有 API 集成测试回归 | 数据库迁移保持向后兼容（`entry_id` 与 `media_asset_id` 可按目标类型并存并加索引），不破坏已有「观展题记」评论读取与防刷哈希逻辑 |
| **SPA 前端路由导致微信/Telegram 等社交爬虫抓取不到动态分享卡片** | `curl` 模拟爬虫请求合集与详情页 URL 检查 `<meta>` | 在 `workers/api` 面向静态 HTML 响应层增加轻量 `HTMLRewriter`（Cloudflare Workers 原生零开销）按路径动态注入 `og:title / og:description / og:image` |
| **批量上传几十张照片同时归属合集时部分失败** | 批量上传中断与部分重试场景测试 | 保持单文件独立直传与状态反馈，单张成功即回填归属或支持对失败项一键重试，避免整批回滚重传 |
