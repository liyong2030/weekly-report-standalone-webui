/**
 * 演示用内存数据源（Mock）。
 * 真实模式下这些函数会被 src/api/*.js 里的 HTTP 调用替代，接口契约与
 * plans/weekly-report-standalone.md 中的 /api/workspaces/{slug}/weekly-reports/ 保持一致。
 */
import { mondayOf, shiftWeeks, toISODate } from "../utils/date";

const STORAGE_KEY = "report-web-mock-v3";
export const CURRENT_WEEK = toISODate(mondayOf(new Date()));

const SEED_PROJECTS = [
  { id: "proj-cloud", name: "云平台建设项目", identifier: "CLOUD", color: "#2563eb", member_count: 12, description: "资源池、虚拟化与容器云的统一建设" },
  { id: "proj-idc", name: "数据中心搬迁", identifier: "IDC", color: "#0f766e", member_count: 9, description: "新机房落地、存量业务分批迁移" },
  { id: "proj-ops", name: "运维自动化", identifier: "OPS", color: "#7c3aed", member_count: 6, description: "巡检、发布、告警的自动化改造" },
];

const SEED_ISSUES = [
  { id: "is-1", project_id: "proj-cloud", name: "资源池配额接口联调", state: "in_progress", priority: "high", due_date: "2026-10-22" },
  { id: "is-2", project_id: "proj-cloud", name: "虚拟化集群扩容方案评审", state: "todo", priority: "medium", due_date: "2026-10-24" },
  { id: "is-3", project_id: "proj-cloud", name: "K8S 节点池弹性伸缩测试", state: "todo", priority: "high", due_date: "2026-10-28" },
  { id: "is-4", project_id: "proj-idc", name: "存储双活演练脚本准备", state: "in_progress", priority: "high", due_date: "2026-10-20" },
  { id: "is-5", project_id: "proj-idc", name: "机房走线图更新", state: "todo", priority: "low", due_date: "2026-10-16" },
  { id: "is-6", project_id: "proj-idc", name: "网络设备资产盘点", state: "done", priority: "low", due_date: "2026-10-15" },
  { id: "is-7", project_id: "proj-ops", name: "Ansible 巡检剧本重构", state: "in_progress", priority: "medium", due_date: "2026-10-25" },
  { id: "is-8", project_id: "proj-ops", name: "监控告警降噪规则", state: "done", priority: "medium", due_date: "2026-10-18" },
];

function seedReports() {
  return [
    {
      id: "wr-1005",
      week_start: shiftWeeks(CURRENT_WEEK, -2),
      status: "submitted",
      template: "标准周报",
      summary: "完成云平台资源池配额接口联调，存储双活演练脚本第一版评审通过。",
      next_plan: "推进 K8S 节点池弹性伸缩测试，完成存储双活演练。",
      blockers: "交换机端口扩容申请还在走流程，影响演练时间窗。",
      submitted_at: "2026-10-12 11:20",
      is_late: true,
      review_note: "",
      items: [
        { id: "it-1", project_id: "proj-cloud", issue_id: "is-1", title: "资源池配额接口联调", category: "feature", hours: 16, progress: 100 },
        { id: "it-2", project_id: "proj-idc", issue_id: "is-4", title: "存储双活演练脚本准备", category: "ops", hours: 14.5, progress: 80 },
        { id: "it-3", project_id: "proj-ops", issue_id: "is-8", title: "监控告警降噪规则梳理", category: "ops", hours: 8, progress: 60 },
      ],
    },
    {
      id: "wr-1012",
      week_start: shiftWeeks(CURRENT_WEEK, -1),
      status: "submitted",
      template: "标准周报",
      summary: "配额接口上线预发，P99 86ms；存储双活演练完成桌面推演。",
      next_plan: "本周完成弹性伸缩测试并输出报告。",
      blockers: "",
      submitted_at: "2026-10-19 09:05",
      is_late: false,
      review_note: "",
      items: [
        { id: "it-4", project_id: "proj-cloud", issue_id: "is-1", title: "配额接口上线预发并压测", category: "feature", hours: 20, progress: 100 },
        { id: "it-5", project_id: "proj-idc", issue_id: "is-4", title: "存储双活桌面推演", category: "ops", hours: 12, progress: 90 },
        { id: "it-6", project_id: "proj-ops", issue_id: "is-7", title: "巡检剧本模块拆分", category: "ops", hours: 6, progress: 40 },
        { id: "it-7", project_id: "proj-cloud", issue_id: null, title: "周例会技术方案评审", category: "other", hours: 3, progress: 100 },
      ],
    },
  ];
}

const MEMBER_NAMES = ["张伟", "李静", "王磊", "陈晓", "刘洋", "赵敏", "周涛", "孙倩"];

function seedState() {
  return {
    projects: SEED_PROJECTS.map((p) => ({ ...p })),
    issues: SEED_ISSUES.map((i) => ({ ...i })),
    reports: seedReports(),
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* 忽略演示态存储损坏 */
  }
  return seedState();
}

let state = load();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 私密模式下不可写，保持内存态即可 */
  }
}

export function resetMock() {
  state = seedState();
  persist();
}

const delay = (ms = 160) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchProjects() {
  await delay(80);
  const projects = state.projects.map((p) => {
    const mine = state.issues.filter((i) => i.project_id === p.id);
    return {
      ...p,
      my_total: mine.length,
      my_done: mine.filter((i) => i.state === "done").length,
      my_open: mine.filter((i) => i.state !== "done").length,
    };
  });
  return projects;
}

export async function createProject(payload) {
  await delay(240);
  const name = (payload.name || "").trim();
  if (!name) throw new Error("项目名称不能为空");
  const identifier = (payload.identifier || "").trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]{1,9}$/.test(identifier)) throw new Error("项目标识需为 2~10 位字母或数字，且以字母开头");
  if (state.projects.some((p) => p.identifier === identifier)) throw new Error("项目标识已存在，请换一个");

  const project = {
    id: `proj-${Date.now()}`,
    name,
    identifier,
    color: payload.color || "#2563eb",
    member_count: payload.member_count || 1,
    description: (payload.description || "").trim(),
  };
  state.projects.push(project);
  persist();
  return project;
}

export async function createIssue(payload) {
  await delay(240);
  const name = (payload.name || "").trim();
  if (!name) throw new Error("任务名称不能为空");
  if (!payload.project_id) throw new Error("请选择所属项目");
  if (!state.projects.some((p) => p.id === payload.project_id)) throw new Error("项目不存在");

  const issue = {
    id: `is-${Date.now()}`,
    project_id: payload.project_id,
    name,
    state: payload.state || "todo",
    priority: payload.priority || "medium",
    due_date: payload.due_date || null,
    description: (payload.description || "").trim(),
  };
  state.issues.push(issue);
  persist();
  return { ...issue, project: state.projects.find((p) => p.id === issue.project_id) || null };
}

export async function updateProject(id, payload) {
  await delay(240);
  const project = state.projects.find((p) => p.id === id);
  if (!project) throw new Error("项目不存在");

  const name = (payload.name ?? project.name).trim();
  if (!name) throw new Error("项目名称不能为空");
  const identifier = (payload.identifier ?? project.identifier).trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]{1,9}$/.test(identifier)) throw new Error("项目标识需为 2~10 位字母或数字，且以字母开头");
  if (state.projects.some((p) => p.identifier === identifier && p.id !== id)) throw new Error("项目标识已存在，请换一个");

  Object.assign(project, {
    name,
    identifier,
    color: payload.color || project.color,
    description: (payload.description ?? project.description ?? "").trim(),
  });
  persist();
  return { ...project };
}

export async function updateIssue(id, payload) {
  await delay(240);
  const issue = state.issues.find((i) => i.id === id);
  if (!issue) throw new Error("任务不存在");

  const name = (payload.name ?? issue.name).trim();
  if (!name) throw new Error("任务名称不能为空");

  Object.assign(issue, {
    name,
    priority: payload.priority ?? issue.priority,
    due_date: payload.due_date || null,
    state: payload.state ?? issue.state,
    description: (payload.description ?? issue.description ?? "").trim(),
  });
  persist();
  return { ...issue, project: state.projects.find((p) => p.id === issue.project_id) || null };
}

export async function fetchIssues({ projectId } = {}) {
  await delay(80);
  const list = projectId ? state.issues.filter((i) => i.project_id === projectId) : state.issues;
  return list.map((i) => ({ ...i, project: state.projects.find((p) => p.id === i.project_id) || null }));
}

export async function patchIssueState(id, issueState) {
  const target = state.issues.find((i) => i.id === id);
  if (!target) throw new Error("任务不存在");
  target.state = issueState;
  persist();
  await delay(80);
  return { ...target };
}

export async function fetchReports() {
  await delay(120);
  return [...state.reports].sort((a, b) => (a.week_start < b.week_start ? 1 : -1)).map(withTotals);
}

export async function fetchReport(id) {
  await delay(80);
  const report = state.reports.find((r) => r.id === id);
  if (!report) throw new Error("周报不存在");
  return withTotals(report);
}

export async function fetchCurrentWeekReport() {
  await delay(80);
  const report = state.reports.find((r) => r.week_start === CURRENT_WEEK);
  return report ? withTotals(report) : null;
}

export async function saveReport(payload) {
  await delay(180);
  const existing = payload.id ? state.reports.find((r) => r.id === payload.id) : null;
  const base = {
    template: "标准周报",
    summary: "",
    next_plan: "",
    blockers: "",
    items: [],
    ...payload,
  };
  if (existing) {
    const nextStatus = payload.status ?? (existing.status === "rejected" ? "draft" : existing.status);
    Object.assign(existing, base, { status: nextStatus });
    persist();
    return withTotals(existing);
  }
  const report = {
    ...base,
    id: `wr-${Date.now()}`,
    status: "draft",
    submitted_at: null,
    is_late: false,
    review_note: "",
  };
  state.reports.push(report);
  persist();
  return withTotals(report);
}

export async function submitReport(id) {
  await delay(220);
  const report = state.reports.find((r) => r.id === id);
  if (!report) throw new Error("周报不存在");
  const now = new Date();
  const deadline = new Date(`${report.week_start}T10:00:00`);
  deadline.setDate(deadline.getDate() + 7);
  report.status = "submitted";
  report.submitted_at = formatDbTime(now);
  report.is_late = now > deadline;
  persist();
  return withTotals(report);
}

export async function deleteReport(id) {
  await delay(120);
  state.reports = state.reports.filter((r) => r.id !== id);
  persist();
  return true;
}

export async function fetchStats() {
  await delay(220);
  const weeks = Array.from({ length: 6 }, (_, idx) => shiftWeeks(CURRENT_WEEK, idx - 5));
  const trend = weeks.map((week, wIdx) => {
    let submitted = 0;
    let onTime = 0;
    let hours = 0;
    MEMBER_NAMES.forEach((_, i) => {
      const isSubmitted = (i * 3 + wIdx) % 10 < 8;
      if (!isSubmitted) return;
      submitted += 1;
      if ((i + wIdx) % 4 !== 0) onTime += 1;
      hours += 30 + ((i * 7 + wIdx * 5) % 18);
    });
    return {
      week_start: week,
      expected: MEMBER_NAMES.length,
      submitted,
      on_time: onTime,
      hours: Math.round(hours * 10) / 10,
    };
  });

  const current = trend[trend.length - 1];
  const members = MEMBER_NAMES.map((name, i) => {
    const isSubmitted = (i * 3 + 5) % 10 < 8;
    return {
      name,
      submitted: isSubmitted,
      on_time: isSubmitted && (i + 5) % 4 !== 0,
      submitted_at: isSubmitted ? `2026-10-19 0${7 + (i % 3)}:${10 + i * 3}` : null,
      items: isSubmitted ? 3 + (i % 4) : 0,
      hours: isSubmitted ? 30 + ((i * 7 + 25) % 18) : 0,
    };
  });

  return {
    period: { from: trend[0].week_start, to: current.week_start, weeks: trend.length },
    expected_members: current.expected,
    submitted_reports: current.submitted,
    submission_rate: current.submitted / current.expected,
    on_time_rate: current.on_time / current.submitted,
    avg_items_per_report: 4.6,
    avg_hours_per_report: Math.round((current.hours / current.submitted) * 10) / 10,
    issue_link_rate: 0.63,
    trend,
    members,
    missing: members.filter((m) => !m.submitted).map((m) => m.name),
  };
}

function withTotals(report) {
  const items = report.items || [];
  const hours = items.reduce((sum, it) => sum + (Number(it.hours) || 0), 0);
  return {
    ...report,
    item_count: items.length,
    hours_total: Math.round(hours * 10) / 10,
    issue_count: items.filter((it) => it.issue_id).length,
  };
}

function formatDbTime(date) {
  const p = (n) => `${n}`.padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
}
