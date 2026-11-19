# 🏛️ 设计方向批准凭据 (Direction Approved Gate)

- **审批时间**：2026-11-19 21:05
- **展示初稿**：
  1. 方案 A · 典雅记忆之书 (`design-demos/demo-editorial-archive.html` | `design-demos/screenshots/direction-a-editorial.png`)
  2. 方案 B · 白盒现代策展 (`design-demos/demo-cosmos-gallery.html` | `design-demos/screenshots/direction-b-cosmos.png`)
  3. 方案 C · 沉浸黑房长廊 (`design-demos/demo-cinema-darkroom.html` | `design-demos/screenshots/direction-c-cinema.png`)
- **用户选择原话**：
  > “想要方案 A 的纸质书卷感配色 + 方案 B 的 Bento 网格布局”
- **融合执行方案 (Hybrid Design Specification)**：
  - **色彩与材质 (来自方案 A)**：
    - 主背景：奶油纸底 `--bg-page: #F7F5F0` / `--bg-subtle: #EFECE4`
    - 卡片容器：纯白精装画框 `--bg-card: #FFFFFF`，微暖 1px 细线 `--border: #E5E1D8`，极柔和纸张阴影
    - 文字排印：深墨黑主字 `--text-main: #1D1C1A`，铅印灰次字 `--text-muted: #747169`，赤陶赭石强调色 `--accent-terracotta: #C25438`，橄榄绿足迹色 `--accent-olive: #4E6053`
    - 字型系统：标题与引文采用优雅衬线（Serif / Newsreader / Songti 优雅衬线栈），正文与 UI 采用现代无衬线（Inter / Plus Jakarta Sans / system-ui），时间戳与 EXIF 采用精致等宽字（JetBrains Mono / monospace）
  - **空间与布局 (来自方案 B)**：
    - 顶部导航：悬浮式奶油磨砂胶囊导航条（Pill Bar），带有 live 时钟、档案状态呼吸灯、暗门钥匙孔
    - 主体结构：现代多列自适应 Bento / Masonry 策展网格，将时间线事件、大画幅摄影、随想札记、旅行航迹以高低错落的展板形式编排
    - 微交互：卡片悬浮浮现半透明墨黑光学 HUD（相机型号、光圈、快门、ISO），支持快速筛选标签（全部 / 摄影 / 札记 / 足迹）
