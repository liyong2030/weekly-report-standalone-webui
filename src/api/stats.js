import http, { USE_MOCK, WORKSPACE_SLUG } from "./http";
import { fetchStats } from "../mock/db";

const BASE = `/api/workspaces/${WORKSPACE_SLUG}/weekly-reports`;

export async function getOverview(params = {}) {
  if (USE_MOCK) return fetchStats();
  const { data } = await http.get(`${BASE}/stats/overview/`, { params });
  return data;
}

export function exportCsv(stats) {
  const header = ["成员", "是否提交", "是否按时", "提交时间", "条目数", "工时"];
  const rows = (stats.members || []).map((m) => [
    m.name,
    m.submitted ? "已提交" : "未提交",
    m.on_time ? "按时" : "逾期",
    m.submitted_at || "",
    m.items,
    m.hours,
  ]);
  const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `周报统计-${stats.period?.to || ""}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
