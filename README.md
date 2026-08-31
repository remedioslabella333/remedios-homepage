# REMEDIOS.NET — 个人主页

一个「旧互联网 + 8-bit 游戏 UI」风格的个人主页，采用 **Cloudflare Pages + Workers + D1** 架构：

- **前端**：静态站点（`frontend/`），部署到 Cloudflare Pages
- **后端**：Cloudflare Worker（`backend/`），对外提供公开 API 与管理 API
- **数据库**：Cloudflare D1（SQLite 兼容），仅通过 migration 管理 schema 与种子数据

## 目录结构

```
.
├── frontend/                 # 前端静态站点（Pages 输出目录）
│   ├── index.html
│   ├── css/style.css
│   ├── js/                   # api.js / terminal.js / status.js / music.js
│   └── assets/
│       ├── images/           # 头像、轮播、卡比像素图（不再内嵌 base64）
│       └── music/            # 预留音频目录（pixel-room-loop.wav 暂不提供）
├── backend/                  # Cloudflare Worker
│   ├── wrangler.jsonc
│   ├── package.json
│   ├── migrations/           # D1 migration（001_init.sql / 002_seed.sql）
│   ├── src/
│   │   ├── index.js          # 路由入口
│   │   ├── routes/           # 公开 / 管理路由
│   │   ├── services/         # 业务查询（prepared statement 绑定参数）
│   │   └── utils/            # response / cors / auth / validation
│   ├── test/                 # Vitest 单元 + 集成测试
│   └── vitest.config.js
└── .gitignore
```

## 本地开发

> 需要 Node.js 18+ 与 npm。Wrangler 会读取 `backend/.dev.vars` 注入本地环境变量（该文件已被 `.gitignore` 忽略）。

```bash
# 1. 安装后端依赖
cd backend
npm install

# 2. 配置本地 Secret（仅本地，切勿提交）
#    backend/.dev.vars 内容示例：
#    ADMIN_TOKEN=your-local-admin-token

# 3. 应用本地 D1 migration（创建表 + 种子数据）
npm run db:migrate:local

# 4. 启动本地 Worker（监听 http://127.0.0.1:8787）
npm run dev

# 5. 另开终端，在项目根目录启动前端静态服务（http://localhost:8000）
cd ..
python -m http.server 8000 --directory frontend
# 或使用 npx serve frontend
```

浏览器打开 `http://localhost:8000`，前端会自动把本地请求指向 `http://localhost:8787`（见 `frontend/js/api.js` 中的 `API_BASE_URL`）。

### 运行测试

```bash
cd backend
npm test        # vitest run（单元测试 + 基于 Miniflare 的 API 集成测试）
```

## API

所有响应统一走 `{ success: true, data }` 或 `{ success: false, error: { code, message } }` 信封。

### 公开接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查（含 D1 连通性） |
| GET | `/api/status` | 状态流（仅 `is_active = 1`） |
| GET | `/api/comments/home?limit=` | 首页弹幕评论（按权重随机抽样，`limit` 1–50） |
| GET | `/api/friends` | 友链（仅 `is_active = 1`） |
| GET | `/api/posts?page=&limit=&category=&search=` | 归档文章（分页 / 分类 / 标题描述标签搜索） |
| POST | `/api/guestbook` | 提交留言（写入 `pending`，含 honeypot 与基础限流） |
| POST | `/api/events` | 匿名事件埋点（仅允许白名单事件，失败静默降级） |

### 管理接口（需 `Authorization: Bearer <ADMIN_TOKEN>`）

所有 `/api/admin/*` 在路由分发前做常量时间校验，未授权统一 `401`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/admin/status` | 列出 status（含隐藏） |
| POST | `/api/admin/status` | 新建 status |
| PUT | `/api/admin/status/:id` | 更新 status |
| DELETE | `/api/admin/status/:id` | 删除 status |
| GET | `/api/admin/comments` · POST/PUT/DELETE `/api/admin/comments` | 同上，管理 comments |
| GET | `/api/admin/friends` · POST/PUT/DELETE `/api/admin/friends` | 同上，管理 friends |
| GET | `/api/admin/posts` · POST/PUT/DELETE `/api/admin/posts` | 同上，管理 posts |
| GET | `/api/admin/guestbook?status=pending\|approved\|rejected` | 审核列表 |
| PUT | `/api/admin/guestbook/:id` | 审核：`{ "status": "approved" | "rejected" | "pending" }` |

### Admin 调用示例

```bash
# 列表全部 status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://remedios-api.<SUBZONE>.workers.dev/api/admin/status"

# 新建友链
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"示例站","url":"https://example.com","tag":"design","sort_order":0}' \
  "https://remedios-api.<SUBZONE>.workers.dev/api/admin/friends"

# 审核留言（guestbook id=1 通过）
curl -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}' \
  "https://remedios-api.<SUBZONE>.workers.dev/api/admin/guestbook/1"
```

## 部署

### 1. 登录 Wrangler

```bash
cd backend
npx wrangler login
```

### 2. 创建 D1 数据库并填充 ID

```bash
npx wrangler d1 create remedios-homepage-db
```

把返回的 `database_id` 填入 `backend/wrangler.jsonc` 的 `d1_databases[0].database_id`（替换占位符 `REPLACE_AFTER_CLOUDFLARE_D1_CREATE`）。

### 3. 应用远程 migration 与种子数据

```bash
npm run db:migrate:remote
```

### 4. 设置管理 Token（Worker Secret）

```bash
npx wrangler secret put ADMIN_TOKEN
```

> Token 只以 Secret 形式存在于 Cloudflare，**绝不写入 Git / 前端 / README / `.dev.vars` 外的地方**。前端代码不含任何 Token，管理页面未内置登录入口。

### 5. 部署 Worker

```bash
npm run deploy
```

### 6. 部署前端到 Pages

在 Cloudflare Dashboard 新建 Pages 项目，连接本仓库（公开 GitHub 仓库），构建配置：

- **输出目录**：`frontend`（无需构建命令，纯静态）

### 7. 配置 CORS

取得 Pages 域名（如 `https://remedios-homepage.pages.dev`）后，把它加入 `backend/wrangler.jsonc` 的 `vars.ALLOWED_ORIGINS`（逗号分隔），重新 `npm run deploy`。

同时替换前端 `frontend/js/api.js` 中 `API_BASE_URL` 的占位符 `REPLACE_WITH_ACCOUNT`，填入你的 Worker 子域（`remedios-api.<你的子域>.workers.dev`）。

## 安全边界（务必遵守）

- `ADMIN_TOKEN`：仅存于 Worker Secret，常量时间 SHA-256 比较，`/api/admin/*` 统一前置鉴权。
- CORS：`ALLOWED_ORIGINS` 精确匹配，无 wildcard；预检 `OPTIONS` 返回 204。
- 动态内容渲染：前端一律使用 `createElement` / `textContent`，**不使用未转义的 `innerHTML` 注入用户数据**（防 XSS）。
- 限流：留言接口通过 `rate_limits` 表做单向 SHA-256 哈希限流（每窗口 5 次），**不存储原始 IP**。
- 输入校验：所有写接口统一长度 / 类型 / URL（仅 `http/https`）/ ISO 日期 / 标签白名单校验；SQL 一律 prepared statement 绑定参数。
- 隐藏数据不泄漏：公开接口只返回 `is_visible/is_active = 1` 与已发布、有 `published_at` 的记录。

## 音乐说明

`frontend/assets/music/pixel-room-loop.wav` 目前**有意留空**（`.gitignore` 已忽略 `.wav`）。播放器控件保留，缺失资源时会显示未就绪状态（`NO AUDIO`），页面不会白屏、不会自动播放。后续放入真实音频文件即可启用播放 / 暂停 / 进度。

## 占位符清单（部署前需替换）

| 文件 | 占位符 | 替换为 |
| --- | --- | --- |
| `backend/wrangler.jsonc` | `REPLACE_AFTER_CLOUDFLARE_D1_CREATE` | `wrangler d1 create` 返回的 `database_id` |
| `frontend/js/api.js` | `REPLACE_WITH_ACCOUNT` | Worker 子域（`remedios-api.<子域>.workers.dev`） |
| `backend/wrangler.jsonc` → `vars.ALLOWED_ORIGINS` | - | 加入 Pages 正式域名 |