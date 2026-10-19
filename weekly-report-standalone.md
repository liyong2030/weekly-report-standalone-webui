# Plane 周报功能设计方案 V2 —— 独立前端版

> 目标版本：Plane 1.4.2（preview @ 4345fb3）
> V1（`weekly-report-design.md`）的后端设计（§1 领域模型 ~ §5 后端实现、§7 提醒、§8 权限、§10 风险）**全部继续有效**，本文只写架构变更与新增部分。

## 0. 与 V1 的差异总览

| 决策点 | V1（嵌入 Plane） | V2（独立前端，已确认） |
|---|---|---|
| 前端形态 | 在 `apps/web` 注册新路由组 | **全新 Vue3 + Element Plus SPA**，与 Plane 仓库完全分离 |
| 上游侵入面 | 后端 4 文件 + 前端约 10 文件 | 后端 4 文件不变；**前端 0 文件** |
| 登录 | 复用 Plane 已登录会话 | 独立登录页，**打通 Plane 账号**（session 同域共享） |
| 管理看板 | 嵌入 Plane workspace 页 | 同一 SPA 内的管理视图（按角色显隐） |
| 「更新我的任务」 | 未涉及 | 直接调 Plane 现有 Issue API，零后端开发 |

## 1. 总体架构

```
浏览器
  │
  ▼
nginx（同域，如 report.example.com）
  ├── /                → report-web 静态文件（Vite 构建产物）
  ├── /auth/、/api/    → 反代 Plane 后端（8000）   ← 登录 + Issue 接口 + 周报接口全走这里
  │
  ▼
Plane Django（apps/api）
  ├── plane.weekly_report   ← 自研 app（V1 §2~§5 设计不变）
  └── plane.app / plane.api ← 现有代码零改动
```

**关键点：同域是整个方案的地基。** session cookie（`sessionid` + `csrftoken`）只在同域下自动携带，前端 SPA、Plane 登录接口、周报接口必须在同一域名下由 nginx 分发，不需要任何 token 同步代码。

## 2. 代码位置

```
D:\100-AI\teamPlan\
├── plane\              # Plane 仓库（只加 1 个 Django app，改 4 个上游文件）
│   └── apps\api\plane\weekly_report\
└── report-web\         # 新建独立前端工程（不在 plane 仓库内，彻底免 rebase）
```

`report-web` 不放进 plane 仓库的理由：plane 仓库保持只含上游代码 + weekly_report app，`git pull` 上游永远干净；前端工程自带独立 git。

## 3. report-web 工程设计

### 3.1 技术栈

| 项 | 选择 | 说明 |
|---|---|---|
| 构建 | Vite 6 + Vue 3.5 + TypeScript | 产物 < 1MB gzip |
| UI | Element Plus | 与你截图的风格一致 |
| 状态 | Pinia | 存当前用户、当前周 |
| 请求 | axios（`withCredentials: true`） | 自动带 session cookie |
| 图表 | ECharts（按需引入） | P1 趋势图用 |
| 路由 | vue-router 4 | 三个页面 + 登录页 + 管理视图 |

### 3.2 页面结构（对应截图）

```
src/
├── api/
│   ├── http.ts            # axios 实例：withCredentials + CSRF 头
│   ├── auth.ts            # 登录 / 登出 / 当前用户
│   ├── report.ts          # 周报 CRUD / submit / reopen（对应 V1 §3 契约）
│   ├── stats.ts           # 管理端统计
│   └── issues.ts          # Plane 现有 API：我的任务、更新状态
├── stores/
│   ├── auth.ts            # user + isAdmin（role>=20）
│   └── week.ts            # 当前选中周
├── layouts/MainLayout.vue # 左侧三栏导航 + 右上角用户/退出（还原截图）
├── views/
│   ├── Login.vue
│   ├── Dashboard.vue      # 工作台：本周概览 + 我负责的任务（可改状态）
│   ├── MyReports.vue      # 我的周报：周报列表（截图样式）
│   ├── ReportEdit.vue     # 新建/编辑周报：条目动态行 + 提交
│   ├── Projects.vue       # 项目管理：项目列表 + 各项目我的 issue
│   └── admin/
│       └── StatsBoard.vue# 统计看板（提交率/按时率/趋势/未交名单/CSV 导出）
└── router/index.ts        # 管理路由 meta.requiresAdmin
```

### 3.3 各页面的数据来源

| 页面 | 数据 | 调用 |
|---|---|---|
| 工作台 | 本周周报状态卡片 + 我负责的 issue（按状态分组） | `GET /api/workspaces/{slug}/weekly-reports/my/`；`GET /api/v1/workspaces/{slug}/projects/{pid}/issues/?assignee=me` |
| 我的周报 | 周报列表（周次/起始日/状态/提交时间/操作） | `GET .../weekly-reports/` |
| 周报编辑 | 条目行：项目下拉 + 关联 issue + 工时 + 进度 | `POST/PATCH .../weekly-reports/`、`POST .../submit/`；下拉数据 `GET /api/v1/workspaces/{slug}/projects/` |
| 项目管理 | 我参与的项目 + 我的任务看板 | Plane 现有 API，**含 issue 状态更新 `PATCH .../issues/{id}/`** |
| 统计看板 | V1 §3 的 stats 三接口 + CSV | 自研接口，Admin only |

> 「更新自己的任务」完全走 Plane 现有接口：普通 Member 有权更新 assignee 是自己的 issue，前端做一层轻看板（列 = issue 状态）即可，不自己建任务表。

## 4. 登录打通（唯一需要实测确认的环节）

流程：

1. SPA 登录页 → `POST /auth/sign-in/`（Plane 现有接口，email+password）。
2. Plane 返回 `Set-Cookie: sessionid`（同域，浏览器自动保存）。
3. `GET /api/users/me/`（Plane 现有）拿用户信息 + workspace 列表 → 从 `WorkspaceMember` 关系判定 `isAdmin`（role≥20）。
4. 之后所有 `/api/...` 请求自动携带 cookie；写操作带 `X-CSRFToken`（从 `csrftoken` cookie 读取）。
5. 登出调 Plane 的 `DELETE /auth/sign-out/`。

风险预案：若 Plane 对浏览器写接口强制 CSRF 且 SPA 拿不到 token，则在 `weekly_report` app 内加一个 10 行的 `auth/bootstrap` 端点（调 Django 的 `get_token` 返回 csrfToken），P0 第一天实测，不通过就走预案。

## 5. 部署（本地开发与生产同构）

本地开发免 nginx：Vite `server.proxy` 把 `/auth`、`/api` 代理到 `localhost:8000`，与生产同域逻辑一致。

生产 nginx 核心配置：

```nginx
server {
  listen 443 ssl;
  server_name report.example.com;
  root /opt/report-web/dist;

  location /auth/  { proxy_pass http://127.0.0.1:8000; }
  location /api/   { proxy_pass http://127.0.0.1:8000; }
  location /       { try_files $uri /index.html; }
}
```

## 6. 分期（修订版）

| 阶段 | 内容 | 预估 |
|---|---|---|
| **P0** | weekly_report app（模型+迁移+CRUD+submit，V1 §2~§5）；SPA 骨架+登录打通+我的周报列表+编辑提交 | 4~5 人日 |
| **P1** | 工作台（我的任务看板）+ 项目管理页；统计三接口 + 管理看板 + CSV | 3~4 人日 |
| **P2** | 周五提醒（V1 §7）+ 登录页引导文案 | 1 人日 |
| **P3** | 从 issue 活动预填周报草稿 | 可选 |

P0 验收链路：管理员在 Plane 建好账号 → 用户在独立界面登录 → 新建周报（挂 issue）→ 提交 → 列表出现「已提交」→ Admin 登录看到统计数字正确。

## 7. 新增风险（V1 §10 的 10 条之外）

1. **CSRF**（见 §4 预案）——同域方案下唯一的不确定点，P0 第一件事实测。
2. **cookie 安全属性**：生产必须 HTTPS（Plane 的 session 在 `SECURE=True` 下带 `Secure`），nginx 证书先备好。
3. **两套工程的路由前缀冲突**：Plane API 前缀是 `/api/`，SPA 自己不要再造 `/api/` 路由，前端路由用 `/#/` 或 `/app/` 前缀错开。
4. **CORS**：同域方案下不存在；如果开发期 Vite(3001) 直连 8000 跨域被拦，靠 Vite proxy 解决，不要去改 Plane 的 CORS 配置。
