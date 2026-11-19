# Personal Archive 个人数字档案馆 — 架构设计文档（v1.1 正式版）

> **文档状态**：已确认（Phase 1 项目初始化基线，已整合公开读/管理写权限、PWA移动端、免费地图、国内CDN加速与评论扩展架构）  
> **目标目录**：仓库根目录下的 `docs/architecture.md`

---

## 1. 技术方案合理性评估

整体方案定位清晰、技术选型高度契合“长期个人使用 + 默认公开展示 + 低运维成本 + 极强渐进扩展性”的目标。模块化单体（Modular Monolith）+ Cloudflare 全栈（Workers Static Assets + Hono + D1 + R2）在个人数字档案馆场景下具备极佳的性价比与工程可控性。

### 1.1 方案核心优势

- **部署与成本极简**：前后端通过 [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) 统一部署，静态资源访问不计入 Worker 调用额度，配合 D1 与 R2 免费/低价额度，几乎零固定运维成本。
- **默认公开浏览，安全管理修改**：支持访客免登录公开展览（个人数字名片/公开时间线），同时严格校验写操作（新增、编辑、删除、直传），仅凭 Admin 身份才可修改；敏感条目仍可单独置为 `private` 私密隐藏。
- **数据模型务实**：“统一内容索引（`entries`）+ 独立业务表”的混合模式既避免了 EAV/大 JSON 带来的查询与校验灾难，又能天然支撑全局时间线、统一标签和跨模块关联。
- **长期可迁移性强**：D1 本质为 SQLite（支持导出标准 SQL 文件，见 [Cloudflare D1 Release Notes](https://developers.cloudflare.com/d1/platform/release-notes/)），R2 兼容 S3 协议，配合适配层（Port/Adapter）可平滑迁移至自建 SQLite/PostgreSQL 与 MinIO/S3。

### 1.2 潜在风险与架构修正建议

| 风险/扩展维度 | 原方案潜在问题 | 建议的修正策略 |
| :--- | :--- | :--- |
| **访问控制与权限** | 若全站私密则缺乏展示价值；若无权限控制则无法防护恶意篡改。 | **默认公开浏览（Public Read）+ 管理员写保护（Admin Write）**：访客只读 `visibility = 'public'` 且 `status = 'published'` 的内容；所有写/改/删操作以及 `private` 条目访问必须携带 Admin Session/JWT 鉴权。 |
| **高扩展性：国内 CDN 访问加速** | Cloudflare 在国内部分地区解析较慢，若未来需要国内 CDN 加速，架构若与 Cloudflare 强耦合将难以拆分。 | **多级解耦与标准缓存控制**：<br>1. **资源层解耦**：媒体对象通过抽象的 `StoragePort`（S3 兼容协议）管理，未来可无缝切换至国内对象存储（阿里云 OSS、腾讯云 COS、七牛云 Kodo）或挂载国内 CDN 域名。<br>2. **路由与缓存**：静态页面与公开只读 API 配置标准 HTTP 缓存头（`Cache-Control: public, s-maxage=...`），可直接作为国内 CDN（如腾讯 EdgeOne / 阿里云 DCDN）的源站平滑接入。 |
| **高扩展性：未来评论权限开放** | 初期暂无评论需求，但未来若开放评论，传统硬编码会导致业务表大改。 | **预留可插拔 `CommentPort` 与模块扩展点**：在 `@archive/contracts` 预留评论模型接口，Phase 3 可直接以 `modules/comment` 原生模块挂载，或零代码嵌入三方自托管评论组件（如 Twikoo / Waline / Giscus），不侵入现有核心业务表。 |
| **移动端体验** | 仅做普通 Web 移动端适配在手机端沉浸感弱、无桌面图标。 | **引入 PWA（渐进式 Web 应用）**：通过 `vite-plugin-pwa` 生成 App Manifest 与 Service Worker 缓存 App Shell（静态骨架），支持手机“添加到主屏幕”以全屏独立 App 模式运行，离线浏览静态页面，并配置移动端专属底部导航栏。 |
| **地图服务选型** | 商用地图服务（如 Mapbox/Google Maps）存在账单风险或 API Key 限制。 | **采用轻量开源免费方案**：旅行轨迹与足迹地图采用 **Leaflet + OpenStreetMap (OSM) / CartoDB** 免费矢量瓦片，零 API Key、零费用、隐私安全。 |
| **分层过度设计** | 严格四层若套用重型 DDD，初期个人开发心智负担过重。 | 采用**务实的分层（Pragmatic Clean Architecture）**：`domain` 仅放纯 TypeScript 实体类型、校验规则和 Port 接口；`application` 放用例函数/服务；`infrastructure` 放 Drizzle/R2 实现；`presentation` 放 Hono 路由与 Zod Schema。 |
| **模块独立迁移文件冲突** | 每个模块各自维护独立 SQL 迁移目录易导致外键与执行顺序混乱。 | **Schema 分散归属，迁移统一线性管理**：各模块在内部维护 `schema.ts`，由 `packages/database` 下的 Drizzle Kit 统一扫描并生成线性 `migrations/` SQL。 |
| **D1 事务限制** | D1 不支持传统长事务，Drizzle `db.transaction()` 不可照搬。 | 跨表原子写入统一通过 D1 原生 `db.batch()` 封装，在 `packages/database` 提供 `AtomicBatch` 抽象接口。 |
| **缩略图生成限制** | Cloudflare Workers 不支持 Node.js 原生 C++ 图像处理库（如 `sharp`）。 | 采用**前端 Web Worker/Canvas 预生成 WebP 缩略图直传 R2**，原图与缩略图一并上传，零额外计算成本；预留 `ImageTransformPort` 应对未来服务端裁剪需求。 |

---

## 2. Cloudflare 当前技术栈兼容性检查

基于截至 2026 年的 Cloudflare 与 Drizzle 官方文档，对技术栈各组件兼容性及硬性边界核验如下：

| 技术组件 | 兼容状态 | 关键技术限制与配置要点 |
| :--- | :--- | :--- |
| **Workers Static Assets + Vue 3 SPA + Hono** | 完全兼容（官方推荐组合） | 官方已完整支持 [Vue on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/vue/) 与 [Hono on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/hono/) 融合部署。在 `wrangler.jsonc` 中配置 `assets.not_found_handling: "single-page-application"`（前端路由直接返回 `index.html` 不消耗 Worker 额度）与 `assets.run_worker_first: ["/api/*"]`（API 请求优先进入 Hono），详见 [SPA 路由文档](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/) 与 [Worker Script 路由文档](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)。 |
| **移动端 PWA（渐进式 Web 应用）** | 完全兼容 | 通过 `vite-plugin-pwa` 生成标准 Web App Manifest 与 Service Worker。静态资源由 Service Worker 预缓存实现秒开与 App Shell 离线常驻，支持移动端“添加到主屏幕”，以独立全屏窗口运行，屏蔽浏览器地址栏。 |
| **开源免费地图（Leaflet + OSM）** | 完全兼容 | 基于标准 `leaflet` 及 OpenStreetMap / CartoDB 瓦片服务，无鉴权 Token 依赖，无调用频次计费；支持轨迹 Polyline 绘制、坐标 Marker 聚合与经纬度自适应视野缩放。 |
| **国内 CDN 穿透与缓存适配** | 架构级兼容 | 前端 Static Assets 与公开 GET API（如全局时间线、单篇公开内容）响应设置标准 HTTP 缓存头（如 `Cache-Control: public, max-age=60, s-maxage=3600`），支持直接挂载腾讯云 EdgeOne / 阿里云 DCDN 进行国内加速；对象存储通过 `StoragePort` 抽象，未来可一键无缝切换至国内 S3 兼容对象存储。 |
| **Cloudflare D1 + Drizzle ORM** | 完全兼容（需适配 Batch） | Drizzle 通过 `drizzle-orm/d1` 原生支持 D1（[Drizzle D1 文档](https://orm.drizzle.team/docs/sqlite/connect-cloudflare-d1)），支持通过 [D1 HTTP API + Drizzle Kit](https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit) 或 `wrangler d1 migrations apply` 管理迁移。硬限制：单库最大 **500 MB（Free）/ 10 GB（Paid，不可扩容）**、单表最多 **100 列**、单次 Worker 调用最多 **50 次查询（Free）/ 1,000 次（Paid）**，但单次 `db.batch()` 仅计为 1 次查询；单库单线程执行；支持 **7 天（Free）/ 30 天（Paid）** Time Travel 恢复（[Cloudflare D1 Limits](https://developers.cloudflare.com/d1/platform/limits/)、[D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/)）。 |
| **Cloudflare R2（直传与大文件）** | 完全兼容（需配置 CORS） | 单次 `PUT` 最大 **5 GiB**（官方建议 ~100 MB 以下使用），分片上传（Multipart）最大 **5 TiB**（最多 10,000 片，除最后一片外每片需在 **5 MiB – 5 GiB** 且**分片大小必须一致**），未完成分片默认 7 天过期（[R2 Upload Objects](https://developers.cloudflare.com/r2/objects/upload-objects/)、[R2 Limits](https://developers.cloudflare.com/r2/platform/limits/)、[R2 Error Codes](https://developers.cloudflare.com/r2/api/error-codes/)）。浏览器直传需为 Bucket 配置 CORS，签发预签名 URL 时在 `aws4fetch` 中设置 `allHeaders: true` 锁定 `Content-Type`（[R2 Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)）。 |
| **缩略图与媒体访问权限** | 需结合前端/Worker 实现 | 严禁开启公开的 `r2.dev` 域名。私有媒体提供两种访问方式：① Worker 鉴权后返回短时效（如 5–15 分钟）预签名 GET URL；② 通过 `/api/v1/media/:id/content` 由 Worker 流式代理（支持 `Range` 音频拖动播放与私有缓存头）。如需服务端动态裁图，可接入 [Cloudflare Images Workers Binding](https://developers.cloudflare.com/images/optimization/binding/)。 |
| **pnpm Workspaces + TypeScript + Vite** | 完全兼容 | Wrangler 与 Vite 均良好支持 pnpm Workspace 内部包引用（`workspace:*`）。需在 `packages/*` 与 `modules/*` 中统一使用 ESM（`"type": "module"`）并配置 `exports` 字段，避免构建产物路径解析失败。 |

---

## 3. 最终项目目录结构

结合原草案与 pnpm Monorepo 依赖流向，最终目录结构如下（前后端职责分明，后端业务模块高度自治，前端按业务域镜像组织）：

```text
personal-archive/
├── apps/
│   └── web/                              # Vue 3 + Vite + Pinia + Tailwind 前端应用 (含 PWA 与 移动端适配)
│       ├── public/
│       │   ├── favicon.ico
│       │   ├── manifest.webmanifest      # PWA 清单文件（应用名称、主题色、图标、独立窗口模式）
│       │   └── icons/                    # PWA 高清图标 (192x192, 512x512 等)
│       ├── src/
│       │   ├── app/                      # 路由注册、全局布局、Pinia 初始化、模块菜单注册表
│       │   ├── shared/                   # API Client（强类型）、通用 Hooks、上传器、基础 UI
│       │   │   ├── components/
│       │   │   │   ├── map/              # Leaflet + OSM 开源地图组件（足迹渲染、轨迹连线）
│       │   │   │   └── pwa/              # PWA 安装引导与更新提醒组件
│       │   │   └── utils/
│       │   └── features/                 # 按业务域划分的前端模块（仅依赖 @archive/contracts）
│       │       ├── timeline/             # 公开/私密混合全局时间线、年份过滤器
│       │       ├── journal/
│       │       ├── travel/               # 旅行足迹与地图联动
│       │       ├── media/                # 照片/视频长廊灯箱
│       │       └── auth/                 # 管理员登录鉴权弹窗与状态控制
│       ├── index.html
│       └── vite.config.ts                # Vite 配置（含 vite-plugin-pwa 离线 App Shell 预缓存）
│
├── workers/
│   └── api/                              # Cloudflare Worker 唯一部署入口（Composition Root）
│       ├── src/
│       │   ├── index.ts                  # Worker fetch 入口
│       │   ├── app.ts                    # Hono 实例、全局中间件（CORS/鉴权守卫/缓存头控制/错误处理）
│       │   ├── bootstrap.ts              # 依赖注入容器（组装基础设施适配器与各业务模块）
│       │   └── env.ts                    # Cloudflare Bindings 类型定义（D1 / R2 / Secrets）
│       └── wrangler.jsonc                # 统一部署配置（含 Static Assets + dev/prod 环境隔离）
│
├── modules/                              # 后端业务与基础能力模块（每个目录为独立 Workspace 包）
│   ├── core/                             # @archive/module-core：认证、Entry 索引、标签、关系、搜索、时间线
│   ├── media/                            # @archive/module-media：S3/R2 适配、上传授权、元数据、缩略图、权限访问
│   ├── journal/                          # @archive/module-journal（Phase 2）
│   ├── travel/                           # @archive/module-travel（Phase 2，含地理轨迹）
│   ├── comment/                          # @archive/module-comment（Phase 3 预留：评论与互动扩展点）
│   ├── game/                             # @archive/module-game（Phase 3 预留）
│   ├── anime/                            # @archive/module-anime（Phase 3 预留）
│   ├── photography/                      # @archive/module-photography（Phase 3 预留）
│   └── music/                            # @archive/module-music（Phase 3 预留）
│
├── packages/                             # 跨应用/跨模块共享基础设施与契约层
│   ├── contracts/                        # @archive/contracts：模块公开接口（Ports）、DTO、事件定义、错误码
│   │   ├── ports/
│   │   │   ├── auth.port.ts              # 身份认证与 RBAC 权限（访客公开读 / 管理员写操作）
│   │   │   ├── storage.port.ts           # 存储抽象接口（屏蔽 R2 / 阿里云OSS / 腾讯云COS / AWS S3 / MinIO）
│   │   │   ├── comment.port.ts           # 评论抽象接口（未来可插拔原生表或三方 Waline/Twikoo）
│   │   │   └── search.port.ts            # 检索接口
│   ├── shared/                           # @archive/shared：纯工具函数（ULID/UUIDv7、分页、结果封装、日期）
│   ├── database/                         # @archive/database：D1/Drizzle 适配、AtomicBatch、统一迁移目录
│   │   ├── migrations/                   # Drizzle Kit 统一生成的线性 SQL 迁移文件
│   │   └── drizzle.config.ts             # 汇总扫描 packages/database 与 modules/*/schema.ts
│   └── ui/                               # @archive/ui：可复用无业务耦合的基础 UI 组件库
│
├── docs/
│   ├── architecture.md                   # 本文档（系统总体架构）
│   ├── database-design.md                # 数据库表结构与索引详设
│   ├── api-design.md                     # REST API 规范与错误码清单
│   └── module-specifications/            # 各业务模块独立规格说明
│
├── .github/workflows/                    # CI（typecheck/lint/test）与 CD（D1 migrate + wrangler deploy）
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

### 相对初稿的关键调整说明

1. **统一部署与国内 CDN 穿透友好**：`workers/api/wrangler.jsonc` 统一挂载静态资源与 Hono API。公开只读路由带有标准 `Cache-Control` 头，未来可直接将自选国内 CDN（如腾讯 EdgeOne/阿里云 DCDN）设在 Cloudflare 前方做双层加速。
2. **多厂商存储解耦（`StoragePort`）**：在 `@archive/contracts` 显式定义标准 S3 兼容的 `StoragePort`，无论底层使用 Cloudflare R2，还是未来由于网络速度需要挂载国内阿里云 OSS、腾讯云 COS，核心业务代码零改动。
3. **移动端 PWA 一等公民**：前端工程集成 `vite-plugin-pwa`，默认生成 Manifest 与 Service Worker 缓存，移动端可一键安装至手机桌面。
4. **轻量可插拔扩展（`CommentPort`）**：预留评论领域接口与数据模型契约，后续新增评论功能无需重构已有业务表。
5. **渐进式目录推进**：Phase 1 仅初始化 `core` 与 `media` 核心模块；Phase 2 再新增 `journal` 与 `travel`；保持代码库干净。

---

## 4. 模块依赖关系与通信方式

### 4.1 依赖方向与边界规则（强制）

系统严格遵循**单向无环依赖**原则，禁止同层业务模块之间直接互相导入内部代码：

| 依赖发起方 | 允许依赖 | 严禁依赖 |
| :--- | :--- | :--- |
| `apps/web` | `@archive/contracts`、`@archive/shared`、`@archive/ui` | 任何 `modules/*`、`@archive/database`、`workers/api` |
| `workers/api`（组装层） | 所有 `modules/*`、`packages/*`、Cloudflare Bindings | 直接编写业务规则或绕过模块 Service 操作业务表 |
| `modules/core`、`modules/media` | `@archive/contracts`、`@archive/shared`、`@archive/database`（仅自身表） | 任何具体业务模块（`travel`、`journal`、`game` 等） |
| 业务模块（`travel`、`journal` 等） | `@archive/contracts`、`@archive/shared`、`@archive/database`（仅自身表） | 其他业务模块的任意文件；`core`/`media` 的内部 Repository 或 Schema 实现 |
| `packages/contracts` | 仅依赖 `zod` 与 TypeScript 纯类型 | 任何基础设施库（Drizzle、Hono、Cloudflare SDK） |

### 4.2 跨模块通信与扩展性架构机制

在模块化单体内部，通信与扩展性采用**面向接口解耦（Port/Adapter）+ 进程内调用 + 轻量事件总线**机制，全部通过 `workers/api/src/bootstrap.ts` 组装：

1. **同步接口调用（Port Injection）**
   - 当 `travel` 创建一篇旅行档案时，不直接操作 `entries` 表，而是调用注入的 `EntryRegistryPort`（由 `core` 实现）创建统一内容索引，再在同一批原子操作或服务编排中写入 `trips` 表。
   - 当 `travel` 绑定照片时，调用注入的 `MediaServicePort`（由 `media` 实现）校验资源归属与状态，并建立 `entry_media` 关联。
2. **异步/解耦领域事件（In-Process Domain Event Bus）**
   - 在 `@archive/contracts` 定义轻量级同步/异步事件总线接口 `DomainEventBus`（在 Worker 中配合 `ctx.waitUntil()` 执行非关键后置任务）。
   - 典型事件流：
     - `entry.published` / `entry.updated` → `core` 搜索索引器自动更新 `entry_search_index`。
     - `entry.deleted` → `media` 监听并标记孤立媒体资源（延迟清理策略，防止误删），`core` 清理标签关联与关系记录。
3. **公开读与管理员写权限模型（Auth & RBAC）**
   - **访客只读（Public Read）**：默认公开访问。未经登录认证的访客在请求 `/api/v1/entries` 时，中间件自动注入过滤条件（仅返回 `visibility = 'public'` 且 `status = 'published'` 的公开内容）；前端默认不显示编辑、新增、删除与上传入口。
   - **管理员写保护（Admin Write）**：所有内容新建、更新、删除、状态流转和媒体直传接口均挂载 `AdminAuthGuard` 中间件，严格验证管理员身份（基于 HttpOnly Cookie Session 或 Bearer Token）；登录后管理员可穿透查看 `private`（私密）与 `draft`（草稿）条目。
   - **前端权限激活**：前端通过暗门或页脚入口调起轻量 Admin 登录弹窗，登录成功后 Pinia 状态树持久化登录态并动态展示浮动编辑按钮。
4. **多云与国内 CDN 加速适配机制（`StoragePort`）**
   - 在 `@archive/contracts/ports/storage.port.ts` 中定义存储抽象，与 Cloudflare R2 解耦：
     ```typescript
     export interface StoragePort {
       generateUploadUrl(key: string, contentType: string, maxSizeBytes: number): Promise<{ uploadUrl: string; publicUrl: string }>;
       getDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
       deleteObject(key: string): Promise<void>;
     }
     ```
   - **Phase 1 默认**：实现 `R2StorageAdapter`（基于 S3 API + `aws4fetch`）。
   - **国内 CDN 加速演进**：若未来因国内网络环境需提速，只需在 `Infrastructure` 实现 `S3CompatibleStorageAdapter`，通过配置项切换至阿里云 OSS、腾讯云 COS 或挂载国内 CDN 域名（如腾讯 EdgeOne / 阿里云 DCDN），无需改动任何业务模块逻辑。
5. **可插拔评论系统扩展机制（`CommentPort`）**
   - 在 `@archive/contracts/ports/comment.port.ts` 预留标准化能力契约：
     ```typescript
     export interface CommentPort {
       listComments(entryId: string, pagination: CursorPagination): Promise<PaginatedResult<CommentDto>>;
       createComment(entryId: string, dto: CreateCommentDto, ipHash: string): Promise<CommentDto>;
     }
     ```
   - **未来接入方式**：在 Phase 3 即可选择：① 启用原生 `modules/comment` 独立表（支持管理员后台审核/垃圾过滤）；或 ② 适配三方轻量自建服务（如 Twikoo / Waline / Giscus），核心档案主库不受影响。
6. **模块注册机制（Module Manifest）**
   - 每个模块导出统一的 `ArchiveModuleDefinition`：声明 `moduleId`（如 `'travel'`）、`entryType`（如 `'trip'`）、路由挂载函数 `mountRoutes(app, deps)`、以及可选的数据导出器 `exportData()`。
   - 新增业务模块时，只需在 `modules/` 新增包，并在 `workers/api/src/bootstrap.ts` 注册一行，**无需修改任何已有业务模块**。

---

## 5. 数据库公共模型及初始迁移方案

### 5.1 通用建模约定

- **主键规范**：统一使用 **UUIDv7** 或 **ULID**（26/36 字符 `TEXT`），兼具全局唯一性与时间有序性，支持前端或应用层提前生成 ID（方便配合 D1 `batch()` 一次写入主表与子表，无需往返查询自增 ID）。
- **时间字段**：统一使用 ISO-8601 UTC 字符串（`TEXT`，如 `2026-11-19T04:50:00.000Z`）或 Unix 毫秒时间戳（`INTEGER`）。推荐使用 **Unix 毫秒整数（`INTEGER`）**，在 SQLite 中索引体积更小、范围排序更快。
- **软删除**：核心内容与媒体表保留 `deleted_at INTEGER`（`NULL` 表示有效），兼顾误删恢复与后台延迟清理。

### 5.2 公共核心表结构设计（Phase 1 初始迁移）

以下公共表由 `core` 与 `media` 模块分别拥有其 Drizzle Schema 定义：

#### 1. `users`（用户与认证基础，归属 `core`）

| 字段 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | PK | 用户唯一 ID（初期单用户，预留多角色/访客扩展） |
| `email` | `TEXT` | UNIQUE, NOT NULL | 登录邮箱 |
| `display_name` | `TEXT` | NOT NULL | 显示名称 |
| `password_hash` | `TEXT` | NULL | 密码哈希（若启用 Cloudflare Access / Passkey 可为空） |
| `role` | `TEXT` | NOT NULL DEFAULT `'owner'` | `owner` / `viewer` |
| `created_at` | `INTEGER` | NOT NULL | 创建时间（ms） |
| `updated_at` | `INTEGER` | NOT NULL | 更新时间（ms） |

#### 2. `entries`（统一内容索引表，归属 `core`）

| 字段 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | PK | 全局内容 ID（UUIDv7/ULID） |
| `owner_id` | `TEXT` | NOT NULL, FK → `users.id` | 内容所有者 |
| `type` | `TEXT` | NOT NULL | 模块注册类型：`journal` / `trip` / `game` / `anime` / `photo` / `playlist` 等 |
| `slug` | `TEXT` | UNIQUE NULL | 可选自定义短链接（用于公开分享） |
| `title` | `TEXT` | NOT NULL | 标题 |
| `summary` | `TEXT` | NULL | 摘要/简述（用于时间线卡片与搜索展示） |
| `cover_media_id` | `TEXT` | NULL | 封面图 ID（逻辑关联 `media_assets.id`） |
| `occurred_at` | `INTEGER` | NOT NULL | **记忆发生时间**（用于个人时间线主排序，区别于创建时间） |
| `visibility` | `TEXT` | NOT NULL DEFAULT `'public'` | `public`（默认公开，访客可读） / `unlisted` / `private`（私密，仅 Admin 可见） |
| `status` | `TEXT` | NOT NULL DEFAULT `'published'` | `published`（默认发布） / `draft` / `archived` |
| `created_at` | `INTEGER` | NOT NULL | 记录创建时间 |
| `updated_at` | `INTEGER` | NOT NULL | 记录更新时间 |
| `deleted_at` | `INTEGER` | NULL | 软删除时间戳 |

> **关键索引与访客查询规则**：
> - `idx_entries_public_feed (visibility, status, deleted_at, occurred_at DESC)` — **核心访客查询索引**：快速拉取全站默认公开内容，过滤 `visibility = 'public' AND status = 'published' AND deleted_at IS NULL`。
> - `idx_entries_timeline (owner_id, deleted_at, status, occurred_at DESC)` — Admin 全量管理视图分页。
> - `idx_entries_type_time (type, visibility, status, occurred_at DESC)` — 按模块分类（旅行/随想/照片）筛选公开内容。

#### 3. `tags` 与 `entry_tags`（统一标签体系，归属 `core`）

- **`tags`**：`id (PK)`, `owner_id`, `name (NOT NULL)`, `slug (NOT NULL)`, `color (TEXT NULL)`, `created_at`。唯一索引：`(owner_id, slug)`。
- **`entry_tags`**：`entry_id (FK → entries.id ON DELETE CASCADE)`, `tag_id (FK → tags.id ON DELETE CASCADE)`, `created_at`。联合主键：`(entry_id, tag_id)`；反向索引：`(tag_id, entry_id)`。

#### 4. `entry_relations`（跨模块内容关联，归属 `core`）

用于表达如“某次旅行关联某张歌单”“某篇随想引用某部动漫”等双向/有向记忆网络：

| 字段 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | PK | 关联 ID |
| `source_entry_id` | `TEXT` | NOT NULL, FK → `entries.id` | 源内容 ID |
| `target_entry_id` | `TEXT` | NOT NULL, FK → `entries.id` | 目标内容 ID |
| `relation_type` | `TEXT` | NOT NULL | 如 `soundtrack` / `inspired_by` / `part_of` / `related` |
| `note` | `TEXT` | NULL | 关联说明 |
| `created_at` | `INTEGER` | NOT NULL | 创建时间 |

> **关键索引**：唯一索引 `(source_entry_id, target_entry_id, relation_type)`，反向索引 `(target_entry_id, relation_type)`。

#### 5. `entry_search_index`（轻量级跨模块检索表，归属 `core`）

- 字段：`entry_id (PK, FK → entries.id ON DELETE CASCADE)`, `type`, `visibility`, `title_normalized`, `tags_text`, `body_excerpt`, `updated_at`。
- 由各模块在写入/更新内容时通过 `EntryRegistryPort` 同步更新，保证 Phase 1–2 跨模块关键词搜索无需跨多张业务表 `JOIN`。

#### 6. `media_assets` 与 `entry_media`（统一媒体层，归属 `media`）

- **`media_assets`**：
  - `id (PK)`, `owner_id`, `storage_provider (TEXT DEFAULT 'r2')`, `bucket_key (UNIQUE NOT NULL)`（原文件 Key，如 `originals/2026/11/<id>.jpg`）
  - `thumb_key (TEXT NULL)`（缩略图 Key）、`preview_key (TEXT NULL)`（网页预览图 Key）
  - `mime_type`, `media_type`（`image` / `video` / `audio` / `document`）, `size_bytes`, `sha256`（用于去重与完整性校验）
  - `width`, `height`, `duration_ms`（视频/音频时长）
  - `upload_status`（`pending` / `uploaded` / `failed`）
  - `visibility`（`private` / `public`，默认继承或严格遵循绑定内容权限）
  - `original_filename`, `created_at`, `deleted_at`
- **`entry_media`**：
  - `id (PK)`, `entry_id`, `media_id (FK → media_assets.id)`, `role`（`cover` / `gallery` / `attachment` / `inline`）, `sort_order (INTEGER DEFAULT 0)`, `caption (TEXT NULL)`, `created_at`。
  - 索引：`(entry_id, role, sort_order)`、`(media_id)`。

### 5.3 业务模块与扩展表模式示例（Phase 2+ 与 Phase 3 预留）

业务表以 `entry_id` 作为主键或唯一外键与 `entries` 一对一关联，业务子表再关联业务主表，例如：
- `journal_entries`（Phase 2 随想）：`entry_id (PK)`, `content_markdown`, `word_count`, `mood`, `weather`
- `trips`（Phase 2 旅行）：`entry_id (PK)`, `start_date`, `end_date`, `country_code`, `city_summary`, `distance_km`
- `trip_locations`（Phase 2 旅行足迹点）：`id (PK)`, `trip_entry_id`, `name`, `latitude`, `longitude`, `visited_at`, `sort_order`, `notes`
- `comments`（Phase 3 评论系统预留表，归属 `comment` 模块）：
  - `id (PK)`: UUIDv7
  - `entry_id (NOT NULL, FK → entries.id ON DELETE CASCADE)`
  - `parent_id (NULL, 自引用回复)`
  - `author_name (NOT NULL)`: 评论者昵称
  - `author_email (NOT NULL)`: 邮箱（用于 Gravatar 头像与通知）
  - `author_url (NULL)`: 个人站点
  - `content (NOT NULL)`: Markdown/纯文本内容
  - `status (TEXT NOT NULL DEFAULT 'approved')`: `pending` / `approved` / `spam`
  - `ip_hash (NOT NULL)`: 匿名防刷散列
  - `user_agent (NULL)`
  - `created_at (INTEGER NOT NULL)`
  - 索引：`idx_comments_entry_time (entry_id, status, created_at ASC)`

### 5.4 初始迁移与备份方案

1. **迁移工作流**：
   - 在各模块内编写 Drizzle Schema（`modules/<name>/src/infrastructure/schema.ts`）。
   - 执行 `pnpm db:generate`（调用 `drizzle-kit generate`），在 `packages/database/migrations/` 生成带序号的 SQL 文件（如 `0000_init_core_and_media.sql`）。
   - 本地开发执行 `pnpm db:migrate:local`（`wrangler d1 migrations apply --local`）；CI/CD 发布前自动执行 `wrangler d1 migrations apply --remote`。
2. **环境隔离**：`wrangler.jsonc` 配置独立的 `dev` 与 `prod` D1 数据库实例和 R2 Bucket，本地开发使用 Wrangler 内置本地模拟器。
3. **备份与数据导出**：
   - 短期防误删：依赖 D1 Time Travel（7/30 天）与软删除。
   - 长期冷备与可迁移性：通过 GitHub Actions 定期执行 `wrangler d1 export` 导出完整 SQL 快照，并由 `core` 提供 `/api/v1/export` 导出标准 JSON + 媒体清单（Media Manifest），结合 `rclone` 同步 R2 原始文件到本地或 NAS。

---

## 6. 模块开发规范

### 6.1 单个模块的标准目录结构

每个业务模块（如 `modules/travel/`）必须遵守统一的内部结构：

```text
modules/travel/
├── package.json                  # name: "@archive/module-travel", exports 仅暴露 ./src/index.ts
├── tsconfig.json
└── src/
    ├── index.ts                  # 模块唯一公开出口（导出 ModuleDefinition 与公开 Service 工厂）
    ├── domain/
    │   ├── entities.ts           # 纯 TypeScript 领域实体与值类型
    │   ├── rules.ts              # 纯函数业务校验规则（无 IO）
    │   └── repository.port.ts    # 本模块所需持久化接口定义
    ├── application/
    │   ├── create-trip.usecase.ts
    │   ├── get-trip.usecase.ts
    │   └── travel.service.ts     # 用例编排，仅依赖本模块 Port 与 @archive/contracts 的外部 Port
    ├── infrastructure/
    │   ├── schema.ts             # 本模块专属 Drizzle 表定义
    │   └── d1-trip.repository.ts # Drizzle/D1 具体实现
    └── presentation/
        ├── schemas.ts            # Zod 请求/响应校验 Schema
        └── routes.ts             # Hono 子路由（挂载到 /api/v1/trips）
```

### 6.2 API 统一规范（`/api/v1`）

- **成功响应格式**：
  ```json
  {
    "success": true,
    "data": {},
    "meta": { "requestId": "req_01J...", "pagination": { "cursor": "...", "hasMore": true, "limit": 20 } }
  }
  ```
- **错误响应格式**：
  ```json
  {
    "success": false,
    "error": { "code": "MEDIA_TYPE_NOT_ALLOWED", "message": "不支持该文件类型", "details": [] },
    "meta": { "requestId": "req_01J..." }
  }
  ```
- **分页规范**：时间线与大列表统一使用 **Cursor（游标）分页**（基于 `occurred_at + id` 复合游标），避免深分页性能退化与插入导致的重复条目；后台管理小列表可兼容 `page/pageSize`。
- **统一异常**：各模块只抛出 `@archive/contracts` 中定义的标准领域异常（`AppError` 子类：`NotFoundError`、`ValidationError`、`ForbiddenError`、`ConflictError`），由 `workers/api` 全局 `onError` 中间件统一转换为 HTTP 状态码。

### 6.3 边界守卫与代码质量红线

- **静态边界检查**：在根目录配置 ESLint 规则（`no-restricted-imports` 或 `eslint-plugin-boundaries`），在 CI 中自动拦截跨模块深层导入（例如禁止 `import ... from '@archive/module-travel/src/infrastructure/...'`）。
- **新增模块标准 Checklist（6 步法）**：
  1. 在 `@archive/contracts` 补充新 `EntryType` 枚举值与对外 DTO（如有跨模块交互）。
  2. 在 `modules/<new-module>/` 按标准四层目录实现 Schema、Repository、UseCase、Hono Routes 与 `index.ts`。
  3. 运行 `pnpm db:generate` 生成增量 SQL 迁移并在本地验证。
  4. 在 `workers/api/src/bootstrap.ts` 注册模块实例并挂载 `/api/v1/<resource>` 路由。
  5. 在 `apps/web/src/features/<new-module>/` 添加前端页面与导航注册。
  6. 编写至少包含领域规则单元测试 + API 集成测试（基于 Vitest + Cloudflare Workers Pool）。

---

## 7. Phase 1 已确认实施基准（已定稿）

根据架构评审与需求反馈，以下核心决策已全部固化，作为 Phase 1 编码执行的标准基线：

1. **访问权限（Public Read + Admin Write）**：
   - 默认公开：全站内容默认 `visibility = 'public'`，任何访客均可自由浏览公开时间线与图文详情，无需登录。
   - 安全修改：内容的新增、编辑、删除以及媒体直传均强制依赖管理员权限；提供独立的 Admin 登录入口；支持在编辑时将特定敏感条目标记为 `visibility = 'private'`（仅管理员可见）。
2. **移动端与离线策略（PWA App Shell）**：
   - 引入 PWA 规范，配置 Manifest 与 Service Worker 缓存静态 App Shell。
   - 移动端支持一键“添加到主屏幕”，以独立全屏 Native-like 体验运行，屏蔽浏览器地址栏，并提供移动端底部导航交互。离线时保障前端界面骨架与已缓存静态资源正常展示。
3. **地图集成方案（Leaflet + OSM）**：
   - 旅行与足迹模块采用开源免费的 **Leaflet + OpenStreetMap (OSM) / CartoDB** 瓦片底图，完全零 API Key、零按量账单，轻量开箱即用。
4. **多云与国内 CDN 加速演进路线**：
   - 架构在 `@archive/contracts` 建立 `StoragePort` 接口，严格解耦底层存储。Phase 1 基于 Cloudflare R2，未来若需加速国内访问，可直接接入阿里云 OSS / 腾讯云 COS 或自建 MinIO，并配合腾讯 EdgeOne / 阿里云 DCDN 前置缓存。
5. **可插拔评论系统扩展路线**：
   - 架构建立 `CommentPort` 契约，并在数据模型中完成 `comments` 表的设计预留。未来开放评论时，可随时无缝挂载独立评论模块或无缝桥接三方评论系统（Waline / Twikoo）。
6. **缩略图与媒体直传**：
   - 前端 Web Worker / Canvas 在上传前自动生成低体积 WebP 缩略图与原图一并上传 R2，零服务端额外开销；列表渲染默认加载缩略图，秒开节省流量。
7. **时间线排序基准**：
   - 严格采用记忆发生时间（`occurred_at`）作为时间线主排序基准，完美支持跨年补录历史记忆。
