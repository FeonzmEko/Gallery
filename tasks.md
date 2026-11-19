# Personal Archive 个人数字档案馆 · 开发任务清单与实时进度看板

> **更新时间**：2026-11-19 17:38  
> **文档基准**：[docs/architecture.md](file:///d:/code/Gallery/docs/architecture.md) (v1.1 正式版)  
> **状态标记**：`[ ]` 待办 | `[/]` 进行中 | `[x]` 已完成并验收 | `[!]` 阻塞 | `[-]` 跳过  
> **铁律**：本文件是过程工单而非陈述性文档。未运行验证的代码与功能严禁提前勾选 `[x]`；未实测条目标记“待验证”；遇阻如实标记 `[!]`。

---

## 0. 总体进度仪表盘

- **总体进度**：[████████████░░░░] 50% (12/24)
- **当前活动任务**：M3 (Web前端与PWA) + M5 (日记与旅行扩展) 多代理并行推进中
- **阻塞项**：无
- **里程碑分布**：
  | 里程碑 | 内容摘要 | 任务数 | 完成数 | 状态 |
  | :--- | :--- | :---: | :---: | :---: |
  | **M0** | Monorepo 工程骨架与共享契约层 | 4 | 4 | 已完成 |
  | **M1** | 数据库公共模型、统一迁移与存储抽象 | 4 | 4 | 已完成 |
  | **M2** | 核心业务模块（Core / Media）与 API 组装 | 4 | 4 | 已完成 |
  | **M3** | Web 应用基础骨架、PWA 移动端与权限控制 | 4 | 0 | 进行中 |
  | **M4** | 全局时间线、媒体长廊灯箱与直传体验 | 4 | 0 | 待办 |
  | **M5** | Phase 2 扩展（日记/旅行）与 Leaflet 免费地图 | 2 | 0 | 进行中 |
  | **M6** | 高扩展性（国内CDN/多存储/评论）验证与交付 | 2 | 0 | 待办 |

---

## 1. 目标与范围边界

### 1.1 核心目标
构建一个属于个人的、长期可维护、低成本运作且具备极强扩展性的数字档案馆：
- **访问控制**：全站默认**公开只读浏览**，无需登录即可访问公开时间线与图文；**内容修改/新增/删除强制管理员权限**，支持单条私密（`private`）隐藏。
- **用户体验**：响应式 Web + PWA 移动端独立窗口；全局发生时间（`occurred_at`）时间轴；瀑布流长廊与 EXIF 灯箱；前端 WebP 缩略图生成与 R2 直传；Leaflet + OSM 免费旅行足迹地图。
- **高扩展性底座**：存储层通过 `StoragePort` 抽象，未来可直接平滑切换至阿里云 OSS / 腾讯云 COS / MinIO 并挂载国内 CDN；评论系统通过 `CommentPort` 契约预留扩展点。

### 1.2 边界约束（明令不做的事项）
- **杜绝重型 DDD 样板代码**：采用务实整洁分层，避免过度封装导致初期个人开发心智过载。
- **不使用公开的 `r2.dev` 访问**：图片与媒体资源统一使用私有预签名直传/下载 URL 或 Worker 流代理。
- **不引入收费商业地图与商业图片处理服务**：地图采用 Leaflet + OSM，缩略图采用前端浏览器 Canvas/Worker 预压缩，保持零额外月费。
- **不强求重型离线双向同步**：PWA 仅通过 Service Worker 缓存 App Shell 静态骨架，不在此版本引入复杂的 IndexedDB 双向合并算法。

---

## 2. 目录规划与接口契约

### 2.1 规划目录树
```text
personal-archive/
├── apps/
│   └── web/                              # Vue 3 + Vite + Pinia + Tailwind + PWA
│       ├── public/manifest.webmanifest
│       └── src/
│           ├── app/                      # 路由、Pinia、全局布局
│           ├── shared/                   # API Client、LeafletMap、PWA 引导、WebP 生成器
│           └── features/                 # timeline / media / journal / travel / auth
├── workers/
│   └── api/                              # Cloudflare Worker 部署入口（Composition Root）
│       └── src/                          # Hono 应用、bootstrap 依赖装配、RBAC 守卫
├── modules/
│   ├── core/                             # @archive/module-core：用户/Entry/标签/检索/时间线
│   ├── media/                            # @archive/module-media：StoragePort 适配/元数据/预签名
│   ├── journal/                          # @archive/module-journal（Phase 2）
│   ├── travel/                           # @archive/module-travel（Phase 2，足迹与地点）
│   └── comment/                          # @archive/module-comment（Phase 3 预留契约）
├── packages/
│   ├── contracts/                        # @archive/contracts：Ports / DTO / 错误码 / 领域事件
│   ├── shared/                           # @archive/shared：ULID、UUIDv7、分页、日期工具
│   ├── database/                         # @archive/database：D1 Drizzle 统一迁移与 AtomicBatch
│   └── ui/                               # @archive/ui：无业务基础组件库
├── docs/                                 # 架构设计与接口文档
└── tasks.md                              # 本工单
```

### 2.2 核心接口契约规范（Port 抽象）
```typescript
// packages/contracts/src/ports/storage.port.ts
export interface StoragePort {
  generateUploadUrl(key: string, contentType: string, maxSizeBytes: number): Promise<{ uploadUrl: string; publicUrl: string }>;
  getDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

// packages/contracts/src/ports/auth.port.ts
export interface AuthPort {
  verifyToken(token: string): Promise<{ userId: string; role: 'admin' | 'owner' | 'guest' } | null>;
  createSession(userId: string): Promise<{ token: string; expiresAt: number }>;
}

// packages/contracts/src/ports/comment.port.ts (扩展预留)
export interface CommentPort {
  listComments(entryId: string, pagination: { cursor?: string; limit: number }): Promise<any>;
  createComment(entryId: string, data: any, ipHash: string): Promise<any>;
}
```

---

## 3. 分阶段开发任务

### M0 · Monorepo 工程骨架与共享契约层
- [x] M0-1 初始化 pnpm workspace 与根目录配置 [目标: `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `.gitignore`] [规范: docs/architecture.md#3] [验收: `pnpm -v` 与 `pnpm i` 正常解析工作区]
- [x] M0-2 搭建 `@archive/shared` 通用工具包 [目标: `packages/shared/src/index.ts`] [验收: UUIDv7/ULID 生成、Cursor 分页解析与日期格式化单元测试通过]
- [x] M0-3 搭建 `@archive/contracts` 契约定义包 [目标: `packages/contracts/src/index.ts`] [规范: docs/architecture.md#4.2] [验收: 导出 EntryType、Visibility、StoragePort、AuthPort、CommentPort 纯类型定义且无运行时框架依赖]
- [x] M0-4 搭建基础 UI 组件包 `@archive/ui` 骨架 [目标: `packages/ui/src/index.ts`] [验收: TypeScript 类型检查 `pnpm --filter @archive/ui build` 成功]

---

### M1 · 数据库公共模型、统一迁移与存储抽象
- [x] M1-1 搭建 `@archive/database` 并封装 D1 AtomicBatch [目标: `packages/database/src/client.ts`, `packages/database/src/batch.ts`] [规范: docs/architecture.md#1.2] [验收: 单元测试 12 项用例验证 batch 原子写入构造与 D1 语法兼容全部通过]
- [x] M1-2 编写 Core 与 Media 模块的 Drizzle Schema 定义 [目标: `modules/core/src/infrastructure/schema.ts`, `modules/media/src/infrastructure/schema.ts`] [规范: docs/architecture.md#5.2] [验收: 成功导出 users, entries, tags, entry_tags, entry_relations, search_index, media_assets, entry_media 及 Phase 3 comments，类型检查 0 报错]
- [x] M1-3 配置 Drizzle Kit 统揽扫描与线性迁移流水线 [目标: `packages/database/drizzle.config.ts`, `packages/database/migrations/`] [规范: docs/architecture.md#5.4] [验收: 运行 `pnpm db:generate` 成功在 migrations 目录生成完整初始迁移 SQL 文件，9 张表与全部关键索引健全无冗余]
- [x] M1-4 实现轻量级 S3 / R2 `StoragePort` 适配器 [目标: `modules/media/src/infrastructure/r2-storage.adapter.ts`] [规范: docs/architecture.md#1.2] [验收: 基于 `aws4fetch` 14 项单元测试通过预签名 PUT/GET 字符串生成、Content-Type Header 锁定、自定义 CDN 域名与元数据解析]

---

### M2 · 核心业务模块（Core / Media）与 API 组装
- [x] M2-1 实现 `@archive/module-core` 核心用例与 RBAC 中间件 [目标: `modules/core/src/`] [规范: docs/architecture.md#4.2-3] [验收: 单元测试覆盖访客只读过滤（仅 `public` & `published`）与 Admin 权限全量放行，10 项用例全部通过]
- [x] M2-2 实现 `@archive/module-media` 媒体授权与元数据登记服务 [目标: `modules/media/src/`] [规范: docs/architecture.md#5.2-6] [验收: 单元测试覆盖上传凭证签发、元数据写入与关联绑定校验，6 项用例全部通过]
- [x] M2-3 创建 `workers/api` 入口并完成依赖注入与路由装配 [目标: `workers/api/src/bootstrap.ts`, `workers/api/src/app.ts`, `workers/api/wrangler.jsonc`] [规范: docs/architecture.md#3] [验收: Hono 挂载 `/api/v1/entries`, `/api/v1/media`, `/api/v1/auth`, `/api/v1/tags`, `/api/health` 路由，CORS 与统一异常拦截完备]
- [x] M2-4 编写 Workers 集成测试与种子数据脚本 [目标: `workers/api/tests/api.spec.ts`, `packages/database/src/seed.ts`] [验收: `pnpm test` 5 项端到端 API 场景验证访客过滤与 Admin 写操作闭环全部通过，`pnpm db:seed` 成功生成初始 Admin 与示例数据]

---

### M3 · Web 应用基础骨架、PWA 移动端与权限控制
- [ ] M3-1 初始化 Vue 3 + Vite + Tailwind CSS 应用 [目标: `apps/web/vite.config.ts`, `apps/web/src/main.ts`] [规范: docs/architecture.md#3] [验收: `pnpm --filter @archive/web dev` 页面秒开无警告]
- [ ] M3-2 配置 PWA Manifest 与 Service Worker 离线 App Shell [目标: `apps/web/public/manifest.webmanifest`, `apps/web/src/shared/components/pwa/`] [规范: docs/architecture.md#1.2] [验收: Chrome DevTools 检查 Application > Manifest 解析正常，Service Worker 激活]
- [ ] M3-3 构建响应式 App Shell 布局与移动端底部导航 [目标: `apps/web/src/app/layouts/DefaultLayout.vue`] [验收: 桌面端宽屏侧边栏与手机视口底部 Tab 自适应切换]
- [ ] M3-4 实现强类型 API Client 与 Admin 登录鉴权状态管理 [目标: `apps/web/src/shared/api/client.ts`, `apps/web/src/features/auth/`] [规范: docs/architecture.md#4.2-3] [验收: 访客状态隐藏写操作入口，点击管理暗门登录后 Pinia 状态更新并显露管理按钮]

---

### M4 · 全局时间线、媒体长廊灯箱与直传体验
- [ ] M4-1 实现全局公共记忆时间线视图 [目标: `apps/web/src/features/timeline/`] [规范: docs/architecture.md#5.2-2] [验收: 按 `occurred_at` 倒序 Cursor 滚动加载、年份刻度筛选、类型与关键词过滤流畅交互]
- [ ] M4-2 实现媒体长廊网格与大图灯箱预览组件 [目标: `apps/web/src/features/media/`] [验收: 支持瀑布流自适应渲染、全屏灯箱缩放手势、键盘左右切换与 EXIF 信息抽屉]
- [ ] M4-3 实现前端浏览器 WebP 缩略图生成器 [目标: `apps/web/src/shared/utils/image-processor.ts`] [规范: docs/architecture.md#1.2] [验收: Canvas/Worker 离线处理原图生成 < 100KB WebP 缩略图，质量与体积符合预期]
- [ ] M4-4 实现多文件拖拽并发直传组件 [目标: `apps/web/src/features/media/components/MediaUploader.vue`] [验收: 选择多张照片后并发获取预签名 URL、直传 R2 并自动回填元数据入库]

---

### M5 · Phase 2 扩展（日记/旅行）与 Leaflet 免费地图
- [ ] M5-1 实现 `@archive/module-journal` 随想日记模块 [目标: `modules/journal/`, `apps/web/src/features/journal/`] [规范: docs/architecture.md#5.3] [验收: Markdown 实时编辑预览、心情/天气设置、与时间线卡片无缝联动]
- [ ] M5-2 实现 `@archive/module-travel` 旅行模块与 Leaflet + OSM 开源地图 [目标: `modules/travel/`, `apps/web/src/shared/components/map/LeafletMap.vue`] [规范: docs/architecture.md#1.2] [验收: 渲染 OpenStreetMap 免费瓦片，标记足迹点并绘制行程路线 Polyline，无需任何 API Key]

---

### M6 · 高扩展性（国内CDN/多存储/评论）验证与交付
- [ ] M6-1 验证多存储切换与国内 CDN 缓存策略 [目标: `docs/deployment-and-cdn-guide.md`] [规范: docs/architecture.md#1.2] [验收: 单元测试模拟通过 `StoragePort` 切换为 S3 兼容国内对象存储配置，公开接口包含标准 `Cache-Control` 头]
- [ ] M6-2 验证 `CommentPort` 契约与全流程 E2E 回归 [目标: `tests/e2e/workflow.spec.ts`] [规范: docs/architecture.md#4.2-5] [验收: 端到端测试跑通：访客只读浏览 -> Admin 登录 -> 快速上传补录历史 -> 时间线实时展现]

---

## 4. 验收门槛清单

- [ ] **代码静态检查**：`pnpm lint` 与 `pnpm typecheck` 全工作区 0 错误、0 警告；
- [ ] **模块依赖边界**：无越权跨模块导入（`modules/*` 互不引用内部代码）；
- [ ] **访客与管理权限**：未经认证调用写 API 100% 返回 401/403，访客查询仅能检索 `public` & `published` 数据；
- [ ] **移动端与 PWA**：手机端无水平溢出，添加到主屏幕可独立全屏启动；
- [ ] **离网与免费保证**：地图完全基于 Leaflet + OSM，不产生任何第三方地图商业计费；缩略图由前端完成转换，Worker 不产生额外计算费用。

---

## 5. 风险与应对预案

| 潜在风险 | 早期暴露途径 | 缓解与降级方案 |
| :--- | :--- | :--- |
| **Cloudflare 国内访问延迟** | 浏览器 Network 瀑布流监控 | 架构已内建 `StoragePort` 与 HTTP 缓存头，必要时可无缝挂载国内 CDN（如 EdgeOne）与国内对象存储 |
| **大批单反 RAW/超大图上传卡死前端** | 批量导入大图并发测试 | 前端图片处理 Worker 设置并发限制（如最大 3 并发）与分片阈值限制 |
| **D1 事务批量写入超限** | 极端多图批量关联测试 | `AtomicBatch` 封装按 50 语句自动分批执行，避免触发 D1 单批上限 |
| **未来需要开放评论防垃圾灌水** | `CommentPort` 接口验证 | 数据模型已预留 `ip_hash` 与 `status = 'pending'` 审核流，可无缝对接验证码与敏感词过滤 |
