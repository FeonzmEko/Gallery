# 🏛️ Personal Archive 个人数字档案馆

> 一个属于个人的、长期可维护、低运作成本、兼备强扩展性的数字档案馆与记忆长廊。  
> 默认公开只读展览（个人数字名片/公开时光轴），安全管理员写保护；融合响应式 Web、PWA 移动端独立窗口、发生时间（`occurred_at`）时间轴、瀑布流媒体灯箱、前端 WebP 压缩直传与 Leaflet 开源足迹地图。

[![Tests](https://img.shields.io/badge/tests-183%20passed-success)](https://github.com/FeonzmEko/Gallery)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/cloudflare-workers%20%2B%20d1%20%2B%20r2-orange)](https://workers.cloudflare.com/)
[![Vue 3](https://img.shields.io/badge/vue-3.5-brightgreen)](https://vuejs.org/)
[![PWA](https://img.shields.io/badge/pwa-standalone%20app%20shell-purple)](https://web.dev/explore/progressive-web-apps)

---

## ✨ 核心特性

- **访问控制模型（Public Read + Admin Write）**：
  - **默认公开只读**：访客无需登录即可浏览全站公开时间线、画廊与足迹；公开 API 内建标准 CDN 缓存头（`Cache-Control: public, max-age=60`）。
  - **管理员安全修改**：内容新增、编辑、删除与媒体上传强制校验管理员身份；支持单条标记为私密（`private`），敏感记忆仅自己可见。
  - **暗门登录快捷键**：支持全局快捷键 `Ctrl + Shift + L`（Mac: `Cmd + Shift + L`）或点击页脚暗门图标调起暗色毛玻璃登录弹窗。
- **全局发生时间轴（`occurred_at`）**：
  - 严格以记忆实际发生的时间排序，而非数据创建时间；支持跨年甚至十年前的旧照片、旅行记忆精准“历史归位”补录，支持流式游标向上/向下翻阅。
- **媒体长廊、旅行合集与单图批注抽屉**：
  - 支持「全部影像 / 旅行合集」切换；合集（如《青海湖》）以 `< 100KB` WebP 缩略图配合锁定 `aspect-ratio` 展开高流畅度瀑布流长卷，支持全屏灯箱预览（键盘左右箭头切图、ESC 逐层退出、手势缩放）；
  - 每张照片支持单图批注角标与非打断式侧边/底部留言抽屉（`PhotoCommentDrawer`），展示高清大图与完整二进制 EXIF 拍摄参数，管理员留言自动高亮为「策展人注」；关闭抽屉原地保留浏览进度。
- **自适应卷宗观展、随机抽卷与夜间暖墨模式**：
  - 卷宗详情弹窗按图片比例自动切换**竖图左图右文宽版**与**横图加宽版**，支持点击直达全屏看图室；
  - 首页提供克制的「随机抽一卷」与「关于馆主」展签，支持「夜间暖墨模式」护眼主题切换、Workers `HTMLRewriter` 动态 Open Graph 社交分享卡片与管理员一键全量 JSON 备份导出。
- **零服务端额外计算开销的直传体系**：
  - 前端浏览器 Canvas 离线预压缩原图，自动生成 `< 100KB` WebP 缩略图；
  - 结合存储适配层签发短时预签名凭证，客户端直接并发 PUT 上传至 Cloudflare R2，不经过 Worker 中转，无体积与流量损耗。
- **开源免费旅行足迹地图**：
  - 旅行模块采用 **Leaflet + OpenStreetMap (OSM)** 免费矢量瓦片，支持打卡点标记与航迹 Polyline 连线，**零商业 API Key、零按量账单**。
- **PWA 移动端沉浸体验**：
  - 通过 Service Worker 预缓存核心静态 App Shell，支持离线秒开；
  - 手机端可一键“添加到主屏幕”，以独立全屏窗口运行，自适应移动端底部 5 键导航与安全区（`pb-safe`）。
- **极强的高扩展性底座（多云存储 + 国内 CDN）**：
  - 存储抽象层 `StoragePort` 完全解耦，未来若需国内网络提速，可无缝平滑切换至阿里云 OSS、腾讯云 COS、七牛云或自建 MinIO 并绑定专属 CDN 域名；
  - 预留可插拔 `CommentPort` 契约，支持未来无侵入挂载独立评论或第三方互动系统。

---

## 🏗️ 架构与目录结构

本项目基于 **pnpm Monorepo + 务实整洁分层（Pragmatic Clean Architecture）** 组织：

```text
personal-archive/
├── apps/
│   └── web/                              # Vue 3 + Vite + Pinia + Tailwind + PWA 前端
│       ├── public/                       # Manifest 与 PWA 基础图标
│       └── src/
│           ├── app/                      # 路由配置、全局布局（DefaultLayout）与状态
│           ├── shared/                   # 强类型 API 客户端、LeafletMap 组件、WebP 压缩工具
│           ├── features/                 # timeline、media、auth 核心视图组件
│           └── pages/                    # 时间线、媒体长廊、日记、旅行与 404 页面
├── workers/
│   └── api/                              # Cloudflare Worker 唯一部署入口（Composition Root）
│       ├── src/                          # Hono 实例、依赖注入装配容器（bootstrap）与 RBAC 中间件
│       └── wrangler.jsonc                # Workers Static Assets 统一部署与绑定配置
├── modules/                              # 自治后端业务领域模块
│   ├── core/                             # @archive/module-core：认证、Entry 索引、时间线检索
│   ├── media/                            # @archive/module-media：StoragePort 适配、预签名直传、元数据
│   ├── journal/                          # @archive/module-journal：Markdown 随想日记、中英文精准分词字数
│   ├── travel/                           # @archive/module-travel：旅行路线、Haversine 测距与 GeoJSON
│   └── comment/                          # @archive/module-comment：评论契约与匿名防刷哈希
├── packages/                             # 跨模块共享基础设施与通用契约
│   ├── contracts/                        # @archive/contracts：纯 TypeScript Ports / DTO / AppError / 事件
│   ├── shared/                           # @archive/shared：UUIDv7/ULID、Cursor 复合游标编解码、UTC 日期
│   ├── database/                         # @archive/database：D1 Drizzle ORM、AtomicBatch、统一迁移
│   └── ui/                               # @archive/ui：无业务基础设计令牌与 UI 组件库
├── docs/                                 # 架构设计与加速指南
│   ├── architecture.md                   # 系统总体架构设计说明（v1.1）
│   └── deployment-and-cdn-guide.md       # 国内 CDN（EdgeOne/DCDN）与多对象存储配置手册
└── tasks.md                              # 24 项任务开发与进度验收看板（100% 完成）
```

---

## 🚀 快速上手与本地开发

### 环境要求
- Node.js `>= 20.0.0`
- pnpm `>= 10.0.0`

### 1. 安装依赖
```bash
pnpm install
```

### 2. 常用开发命令

| 命令 | 说明 |
| :--- | :--- |
| `pnpm dev:web` | 启动前端本地开发热更新服务器（默认 `http://localhost:5173`） |
| `pnpm dev:api` | 启动本地 Cloudflare Worker 模拟运行环境 |
| `pnpm test` | 运行全工作区 **183 项自动化测试套件**（Vitest） |
| `pnpm typecheck` | 执行全工作区 11 个子项目 TypeScript 严格类型检查 |
| `pnpm build` | 全量构建前端产物与各子包产物 |
| `pnpm db:generate` | 基于 Drizzle Schema 自动生成线性 SQL 迁移文件 |
| `pnpm db:seed` | 执行初始管理员账号与示例数据注入 |

---

## 🌐 生产部署与上线指南

本项目已配置 Cloudflare Workers 的 **Static Assets** 模式：前端编译产物与后端 Hono API 在单次部署中合并交付，免去多平台运维烦恼。

### 步骤 1：登录 Cloudflare CLI
```bash
pnpm wrangler login
```

### 步骤 2：创建云端 D1 数据库与 R2 存储桶
```bash
# 1. 创建 D1 数据库
pnpm wrangler d1 create personal_archive_db
# 记录终端输出的 database_id

# 2. 创建 R2 存储桶
pnpm wrangler r2 bucket create personal-archive-media
```

### 步骤 3：配置 `workers/api/wrangler.jsonc`
编辑 `workers/api/wrangler.jsonc`，将你的 `database_id` 与 R2 相关信息填入：
```jsonc
{
  "name": "personal-archive",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "personal_archive_db",
      "database_id": "填入你的实际 database_id",
      "migrations_dir": "../../packages/database/migrations"
    }
  ],
  "r2_buckets": [
    {
      "binding": "MEDIA_BUCKET",
      "bucket_name": "personal-archive-media"
    }
  ]
}
```

### 步骤 4：执行云端数据库初始迁移
```bash
pnpm db:migrate:remote
```

### 步骤 5：一键构建并部署
```bash
pnpm deploy
```
*终端将输出分配给你的生产访问域名（如 `https://personal-archive.<subdomain>.workers.dev`）。你可以在 Cloudflare 仪表盘中随时绑定个人独立域名。*

---

## 📱 日常使用与操作指南

### 1. 管理员登录
- 全站默认对访客公开展示只读视图；
- 管理员可通过快捷键 **`Ctrl + Shift + L`**（Mac: **`Cmd + Shift + L`**）或点击页脚的小圆点唤起登录窗口；
- 登录成功后，右下角将显露浮动操作按钮 `+`，并解锁上传、新建与修改权限。

### 2. 批量照片上传
- 点击右下角 `+` 或导航栏中的“上传照片”；
- 拖入单张或多张照片，浏览器将在本地 Canvas 自动压缩 WebP 并解析 EXIF 拍摄参数（相机、光圈、ISO、快门），同时并发直传底层 R2 存储桶；
- 支持为照片归类、设定公开或私密权限；在相册中点击任何照片可呼出全屏灯箱查看原图与完整拍摄参数。

### 3. 足迹记录与日记
- **旅行足迹**：在地图上搜索或点击坐标添加足迹点，Leaflet 自动计算两点间大圆距离（Haversine）并绘制航线；
- **随想日记**：支持 Markdown 格式撰写，自动统计中英文字数，可标记当天的心情与天气标签。

### 4. 移动端 PWA 安装
- 在手机浏览器（iOS Safari 或 Android Chrome）打开网站，点击菜单中的 **“添加到主屏幕”**；
- 手机桌面即可生成独立档案馆 App，拥有原生 App 般的独立窗口与流畅手势。

---

## 🇨🇳 国内 CDN 加速方案（可选扩展）

针对国内网络访问 Cloudflare 边缘节点可能出现的延迟，项目已在架构层完全解耦：
- 静态资产与公开 GET API 均携带标准 `Cache-Control` 标头；
- 详细反向代理配置、DNS 解析配置与阿里云 OSS / 腾讯云 COS 对象存储平滑切换，请参阅专题文档：  
  👉 **[国内 CDN 加速与多存储切换指南 (docs/deployment-and-cdn-guide.md)](file:///d:/code/Gallery/docs/deployment-and-cdn-guide.md)**

---

## 📄 开源与开发记录

- 架构设计基准文档：[docs/architecture.md](file:///d:/code/Gallery/docs/architecture.md)
- 详细开发过程与工单进度看板：[tasks.md](file:///d:/code/Gallery/tasks.md)
- 协议：[MIT License](LICENSE)
