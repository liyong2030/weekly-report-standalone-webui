# weekly-report-standalone-webui · Plane 周报前端 Lite 版

面向普通成员的极简工作台：**填周报、管自己的任务**。独立部署，不修改 Plane 前端代码。

Plane 自带的工作台信息密度偏高，非项目管理者上手成本大。这个前端只保留三个动作——写周报、看自己负责的任务、维护项目任务，并给管理员一个统计看板。后端复用 Plane 现有接口（登录、项目、任务），只有周报这一块需要自研接口。

> 当前版本：**v0.1.0（前端完成，后端待接入）**，默认以 Mock 数据运行，可直接体验完整交互。

---

## 功能

| 模块 | 说明 |
|---|---|
| 登录 | 独立登录页；演示模式任意邮箱 + 6 位以上密码即可进入，可切换管理员视图 |
| 工作台 | 本周周报状态、进行中任务、最近工时、逾期任务四张指标卡；我的任务列表可直接改状态 |
| 我的周报 | 周报列表（周次 / 起始日 / 状态 / 模板 / 提交时间 / 操作），底部显示本周截止时间 |
| 新建 / 编辑周报 | 条目动态行：项目 → 关联任务 → 工作内容 → 类别 → 工时 → 进度；三段文字总结；保存草稿 / 提交 / 撤回修改 |
| 项目管理 | 项目卡片（成员数、我的完成度）+ 任务表；支持新增 / 编辑项目与任务 |
| 统计看板（管理员） | 提交率、按时率、人均工时、任务关联率；双折线趋势图；未提交名单；成员明细；CSV 导出 |

周口径统一按 **ISO 周一**，截止时间为**次周一 10:00**，逾期提交标记「已提交 · 逾期」而非拒绝。

---

## 技术栈

| 项 | 选型 |
|---|---|
| 框架 | Vue 3.5（`<script setup>`） |
| 构建 | Vite 6 |
| UI | Element Plus 2.14（中文 locale） |
| 状态 | Pinia |
| 路由 | vue-router 4（hash 模式） |
| 请求 | axios（`withCredentials`，自动带 CSRF 头） |
| 图表 | 原生 SVG（无额外图表依赖） |

---

## 快速开始

前置：**Node ≥ 20**、**pnpm ≥ 9**。

```bash
pnpm install
pnpm dev
```

打开 <http://127.0.0.1:5180>，用 `test1@demo.com` / `123456` 登录（已预填）。

勾选「以管理员身份登录」可以看到侧边栏多出的**统计看板**。

> pnpm 12 默认拦截依赖的构建脚本，`package.json` 里的 `pnpm.onlyBuiltDependencies` 已放行 `esbuild`、`vue-demi`，删掉会导致 Vite 无法启动。

---

## 构建与部署

```bash
pnpm build      # 产出 dist/index.html（单文件，约 1.6MB / gzip 470KB）
pnpm preview    # 本地预览构建结果
```

构建配置了 `vite-plugin-singlefile`，**JS 与 CSS 全部内联**，`dist/index.html` 双击即可打开，无需静态服务器。适合发演示包；正式部署仍建议走正常静态托管。

生产要求**同域部署**：SPA、`/auth`、`/api` 必须在同一域名下，登录 session cookie 才能自动携带。

```nginx
server {
  listen 443 ssl;
  server_name report.example.com;
  root /opt/report-web/dist;

  location /auth/ { proxy_pass http://127.0.0.1:8000; }
  location /api/  { proxy_pass http://127.0.0.1:8000; }
  location /      { try_files $uri /index.html; }
}
```

开发期由 `vite.config.js` 的 proxy 承担同样职责（`/api`、`/auth` → `http://localhost:8000`），与生产逻辑一致。

---

## 数据模式：Mock 与真实后端

默认 **Mock**，数据存在 `localStorage`（键 `report-web-mock-v3`），新建的周报、项目、任务刷新后仍在。

| 变量 | 默认值 | 说明 |
|---|---|---|
| `VITE_USE_MOCK` | `true` | 设为 `false` 走真实 HTTP 请求 |
| `VITE_WORKSPACE_SLUG` | `demo` | 真实模式下 Plane 工作区 slug |

切真实后端：

```bash
# report-web/.env.local
VITE_USE_MOCK=false
VITE_WORKSPACE_SLUG=your-workspace
```

真实模式的依赖：

1. 一个运行中的 Plane 实例（开发验证基于 1.4.2）。
2. 自研的 `weekly_report` Django app，提供 `/api/workspaces/{slug}/weekly-reports/` 系列接口——**尚未实现**，接入前周报相关功能不可用。
3. 登录走 Plane 原生 `/auth/sign-in/`，会话 cookie 同域共享，不需要额外的 token 同步。

---

## 接口约定

### 周报（自研，待实现）

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/workspaces/{slug}/weekly-reports/` | 列表 |
| GET | `/api/workspaces/{slug}/weekly-reports/{id}/` | 详情 |
| POST / PATCH | 同上 | 新建 / 更新 |
| POST | `.../{id}/submit/` | 提交（写统计快照、判逾期） |
| GET | `.../my/` | 当前周我的周报，无则 204 |
| GET | `.../stats/overview/` | 管理端聚合（提交率 / 按时率 / 趋势 / 成员明细） |

### 项目与任务（Plane 原生，零改动）

| 能力 | Path |
|---|---|
| 项目列表 / 新建 / 修改 | `/api/v1/workspaces/{slug}/projects/` |
| 我的任务 | `/api/v1/workspaces/{slug}/my-issues/?assignee=me` |
| 任务列表 / 新建 / 修改 | `/api/v1/workspaces/{slug}/projects/{pid}/issues/` |

字段映射注意：`due_date` → `target_date`，`description` → `description_html`，改状态传 `state` 的 uuid。

---

## 目录结构

```
report-web/
├── src/
│   ├── api/            # http 实例 + 周报 / 任务 / 统计接口（Mock 与真实分支都在这里切）
│   ├── mock/           # 演示数据源，localStorage 持久化
│   ├── stores/         # auth（登录态、角色）
│   ├── router/         # hash 路由 + 登录/管理员守卫
│   ├── layouts/        # 侧边栏 + 顶栏骨架
│   ├── views/          # 登录 / 工作台 / 我的周报 / 周报编辑 / 项目管理 / admin 看板
│   ├── components/     # SVG 折线图
│   └── utils/          # ISO 周计算、时间格式化
├── vite.config.js      # 别名 @、开发代理、单文件构建
└── package.json
```

---

## 已知限制

- **后端未实现**：`VITE_USE_MOCK=false` 时周报接口会 404，需要先落地 `weekly_report` app。
- **周报条目冗余存任务标题**：任务改名后历史周报文字不回溯，接入真实后端时应改为只存 `issue_id` 展示时联查。
- **任务不支持跨项目移动**：编辑弹窗中「所属项目」只读。
- **CSRF 未实测**：Plane 写接口对浏览器会话有 CSRF 校验，独立 SPA 能否直接取到 token 需联调验证；兜底方案是后端加一个返回 csrf token 的 bootstrap 端点。
- **包体偏大**：Element Plus 全量引入，单文件产物 1.6MB；如需压缩可改按需引入。
- **数据重置**：升级时若 Mock 存储键变更（当前 `v3`），浏览器里的演示数据会回到初始状态。

---

## 路线图

| 阶段 | 内容 | 状态 |
|---|---|---|
| P0 | 前端骨架 + 登录 + 我的周报 + 周报编辑 | ✅ 完成（Mock） |
| P0 | `weekly_report` 后端 app（模型 / 迁移 / CRUD / 提交） | ⬜ 待开发 |
| P1 | 统计接口 + 看板接真实数据 + CSV | ⬜ 待接入 |
| P2 | 周五提醒（Celery beat 按 workspace 时区） | ⬜ 待开发 |

---

## 相关文档

- `plans/weekly-report-design.md`：后端领域模型、表结构、统计口径、风险清单
- `plans/weekly-report-standalone.md`：独立前端架构、登录打通、部署与分期

## License

本仓库为独立实现的前端代码。接入的 [Plane](https://github.com/makeplane/plane) 采用 **AGPL-3.0**，若分发包含 Plane 源码的仓库，请保留其版权头与许可证。
