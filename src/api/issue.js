import http, { USE_MOCK, WORKSPACE_SLUG } from "./http";
import { createIssue, createProject, fetchIssues, fetchProjects, patchIssueState, updateIssue, updateProject } from "../mock/db";

/** 项目与任务全部走 Plane 现有接口，这里不新建资源。 */
export async function listProjects() {
  if (USE_MOCK) return fetchProjects();
  const { data } = await http.get(`/api/v1/workspaces/${WORKSPACE_SLUG}/projects/`);
  return data.results ?? data;
}

export async function addProject(payload) {
  if (USE_MOCK) return createProject(payload);
  const { data } = await http.post(`/api/v1/workspaces/${WORKSPACE_SLUG}/projects/`, {
    name: payload.name,
    identifier: payload.identifier,
    description: payload.description || "",
    project_lead: payload.project_lead || undefined,
  });
  return data;
}

export async function editProject(id, payload) {
  if (USE_MOCK) return updateProject(id, payload);
  const { data } = await http.patch(`/api/v1/workspaces/${WORKSPACE_SLUG}/projects/${id}/`, {
    name: payload.name,
    identifier: payload.identifier,
    description: payload.description || "",
  });
  return data;
}

/** 我的任务：assignee=me 过滤，Plane 的 issue 列表接口原生支持。 */
export async function listMyIssues(projectId) {
  if (USE_MOCK) return fetchIssues({ projectId });
  const base = projectId
    ? `/api/v1/workspaces/${WORKSPACE_SLUG}/projects/${projectId}/issues/`
    : `/api/v1/workspaces/${WORKSPACE_SLUG}/my-issues/`;
  const { data } = await http.get(base, { params: { assignee: "me" } });
  return data.results ?? data;
}

export async function updateIssueState(projectId, issueId, stateId) {
  if (USE_MOCK) return patchIssueState(issueId, stateId);
  const { data } = await http.patch(
    `/api/v1/workspaces/${WORKSPACE_SLUG}/projects/${projectId}/issues/${issueId}/`,
    { state: stateId },
  );
  return data;
}

export async function addIssue(projectId, payload) {
  if (USE_MOCK) return createIssue({ ...payload, project_id: projectId });
  const { data } = await http.post(
    `/api/v1/workspaces/${WORKSPACE_SLUG}/projects/${projectId}/issues/`,
    {
      name: payload.name,
      description_html: payload.description || "<p></p>",
      priority: payload.priority || "medium",
      target_date: payload.due_date || null,
      assignees: payload.assignees,
    },
  );
  return data;
}

export async function editIssue(projectId, issueId, payload) {
  if (USE_MOCK) return updateIssue(issueId, payload);
  const body = {
    name: payload.name,
    priority: payload.priority,
    target_date: payload.due_date || null,
  };
  if (payload.description !== undefined) body.description_html = payload.description || "<p></p>";
  if (payload.state) body.state = payload.state;
  const { data } = await http.patch(
    `/api/v1/workspaces/${WORKSPACE_SLUG}/projects/${projectId}/issues/${issueId}/`,
    body,
  );
  return data;
}
