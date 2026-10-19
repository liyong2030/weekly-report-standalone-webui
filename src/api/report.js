import http, { USE_MOCK, WORKSPACE_SLUG } from "./http";
import {
  deleteReport,
  fetchCurrentWeekReport,
  fetchReport,
  fetchReports,
  saveReport,
  submitReport,
} from "../mock/db";

const BASE = `/api/workspaces/${WORKSPACE_SLUG}/weekly-reports`;

export async function listReports() {
  if (USE_MOCK) return fetchReports();
  const { data } = await http.get(`${BASE}/`);
  return data.results ?? data;
}

export async function getReport(id) {
  if (USE_MOCK) return fetchReport(id);
  const { data } = await http.get(`${BASE}/${id}/`);
  return data;
}

export async function getCurrentWeekReport() {
  if (USE_MOCK) return fetchCurrentWeekReport();
  const response = await http.get(`${BASE}/my/`);
  return response.status === 204 ? null : response.data;
}

export async function upsertReport(payload) {
  if (USE_MOCK) return saveReport(payload);
  const { data } = payload.id
    ? await http.patch(`${BASE}/${payload.id}/`, payload)
    : await http.post(`${BASE}/`, payload);
  return data;
}

export async function submitReportById(id) {
  if (USE_MOCK) return submitReport(id);
  const { data } = await http.post(`${BASE}/${id}/submit/`, {});
  return data;
}

export async function removeReport(id) {
  if (USE_MOCK) return deleteReport(id);
  const { data } = await http.delete(`${BASE}/${id}/`);
  return data;
}
