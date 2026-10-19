<template>
  <div>
    <div class="toolbar">
      <div class="section-title">我参与的项目</div>
      <div class="toolbar-actions">
        <el-button @click="openProjectDialog()">
          <el-icon><Plus /></el-icon>
          新增项目
        </el-button>
        <el-button type="primary" @click="openIssueDialog()">
          <el-icon><Plus /></el-icon>
          新增任务
        </el-button>
      </div>
    </div>

    <div class="cards">
      <div
        v-for="project in projects"
        :key="project.id"
        class="card panel"
        :class="{ active: selectedId === project.id }"
        @click="selectedId = project.id"
      >
        <div class="card-head">
          <span class="badge" :style="{ background: `${project.color}14`, color: project.color }">{{ project.identifier }}</span>
          <div class="card-tools">
            <span class="members">{{ project.member_count }} 人</span>
            <el-icon class="edit-icon" title="编辑项目" @click.stop="openProjectDialog(project)"><Edit /></el-icon>
          </div>
        </div>
        <div class="name">{{ project.name }}</div>
        <div class="progress-row">
          <div class="bar">
            <div
              class="bar-inner"
              :style="{ width: `${project.my_total ? (project.my_done / project.my_total) * 100 : 0}%`, background: project.color }"
            />
          </div>
          <span class="ratio">{{ project.my_done }}/{{ project.my_total }}</span>
        </div>
        <div class="meta">
          <span>我的任务 {{ project.my_open }} 个未完成</span>
          <span class="view" :style="{ color: project.color }">查看任务 →</span>
        </div>
      </div>
    </div>

    <div class="panel task-panel">
      <div class="panel-head">
        <div class="panel-title">
          {{ currentProject?.name || "全部项目" }} · 我的任务
        </div>
        <span class="muted count">{{ tasks.length }} 个任务</span>
      </div>
      <el-table v-loading="loading" :data="tasks" empty-text="该项目下没有分配给你的任务">
        <el-table-column label="任务" min-width="260">
          <template #default="{ row }">
            <span :class="{ done: row.state === 'done' }">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" :type="priorityMeta(row.priority).type">{{ priorityMeta(row.priority).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="截止日期" width="130">
          <template #default="{ row }">
            <span :class="{ overdue: isOverdue(row) }">{{ row.due_date }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="150">
          <template #default="{ row }">
            <el-select :model-value="row.state" size="small" style="width: 118px" @change="(value) => changeState(row, value)">
              <el-option label="待开始" value="todo" />
              <el-option label="进行中" value="in_progress" />
              <el-option label="已完成" value="done" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-button link type="primary" @click="openIssueDialog(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="projectDialogVisible"
      :title="editingProjectId ? '编辑项目' : '新增项目'"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form ref="projectFormRef" :model="projectForm" :rules="projectRules" label-width="88px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="projectForm.name" maxlength="50" placeholder="如：数据中心二期建设" />
        </el-form-item>
        <el-form-item label="项目标识" prop="identifier">
          <el-input v-model="projectForm.identifier" maxlength="10" placeholder="如：DC2" @input="normalizeIdentifier" />
          <div class="form-hint">任务编号前缀，2~10 位字母或数字，字母开头</div>
        </el-form-item>
        <el-form-item label="主题色">
          <el-color-picker v-model="projectForm.color" :predefine="presetColors" />
          <span class="form-hint inline">用于项目卡片与图表配色</span>
        </el-form-item>
        <el-form-item label="项目说明">
          <el-input
            v-model="projectForm.description"
            type="textarea"
            :rows="2"
            maxlength="120"
            show-word-limit
            placeholder="一句话说明项目范围（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="projectDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="projectSubmitting" @click="submitProject">
          {{ editingProjectId ? "保存修改" : "创建项目" }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="issueDialogVisible"
      :title="editingIssueId ? '编辑任务' : '新增任务'"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form ref="issueFormRef" :model="issueForm" :rules="issueRules" label-width="88px">
        <el-form-item label="所属项目" prop="project_id">
          <el-select
            v-model="issueForm.project_id"
            placeholder="选择项目"
            style="width: 100%"
            :disabled="Boolean(editingIssueId)"
          >
            <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
          <div v-if="editingIssueId" class="form-hint">任务不支持跨项目移动，如需迁移请在新项目下新建</div>
        </el-form-item>
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="issueForm.name" maxlength="80" placeholder="如：完成交换机固件升级" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="issueForm.priority">
            <el-radio-button value="high">高</el-radio-button>
            <el-radio-button value="medium">中</el-radio-button>
            <el-radio-button value="low">低</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker
            v-model="issueForm.due_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item :label="editingIssueId ? '状态' : '初始状态'">
          <el-select v-model="issueForm.state" style="width: 100%">
            <el-option label="待开始" value="todo" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="done" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务说明">
          <el-input
            v-model="issueForm.description"
            type="textarea"
            :rows="2"
            maxlength="120"
            show-word-limit
            placeholder="补充背景、验收标准（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="issueDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="issueSubmitting" @click="submitIssue">
          {{ editingIssueId ? "保存修改" : "创建任务" }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { addIssue, addProject, editIssue, editProject, listMyIssues, listProjects, updateIssueState } from "@/api/issue";
import { toISODate } from "@/utils/date";

const projects = ref([]);
const tasks = ref([]);
const selectedId = ref("");
const loading = ref(false);

const currentProject = computed(() => projects.value.find((p) => p.id === selectedId.value) || null);

const presetColors = ["#2563eb", "#0f766e", "#7c3aed", "#d97706", "#dc2626", "#0891b2"];

const projectDialogVisible = ref(false);
const projectSubmitting = ref(false);
const projectFormRef = ref();
const editingProjectId = ref("");
const projectForm = reactive({ name: "", identifier: "", color: "#2563eb", description: "" });
const projectRules = {
  name: [{ required: true, message: "请输入项目名称", trigger: "blur" }],
  identifier: [
    { required: true, message: "请输入项目标识", trigger: "blur" },
    {
      pattern: /^[A-Z][A-Z0-9]{1,9}$/,
      message: "2~10 位字母或数字，且以字母开头",
      trigger: "blur",
    },
  ],
};

const issueDialogVisible = ref(false);
const issueSubmitting = ref(false);
const issueFormRef = ref();
const editingIssueId = ref("");
const issueForm = reactive({
  project_id: "",
  name: "",
  priority: "medium",
  due_date: "",
  state: "todo",
  description: "",
});
const issueRules = {
  project_id: [{ required: true, message: "请选择所属项目", trigger: "change" }],
  name: [{ required: true, message: "请输入任务名称", trigger: "blur" }],
};

function priorityMeta(priority) {
  return (
    {
      high: { label: "高", type: "danger" },
      medium: { label: "中", type: "warning" },
      low: { label: "低", type: "info" },
    }[priority] || { label: "中", type: "warning" }
  );
}

function isOverdue(row) {
  if (!row.due_date || row.state === "done") return false;
  return row.due_date < toISODate(new Date());
}

async function refreshProjects() {
  projects.value = await listProjects();
}

async function load() {
  loading.value = true;
  try {
    await refreshProjects();
    if (!selectedId.value && projects.value.length) selectedId.value = projects.value[0].id;
    tasks.value = await listMyIssues(selectedId.value || undefined);
  } catch (error) {
    ElMessage.error(error.message || "加载项目失败");
  } finally {
    loading.value = false;
  }
}

function openProjectDialog(project = null) {
  editingProjectId.value = project?.id || "";
  Object.assign(projectForm, {
    name: project?.name || "",
    identifier: project?.identifier || "",
    color: project?.color || "#2563eb",
    description: project?.description || "",
  });
  projectDialogVisible.value = true;
  nextTick(() => projectFormRef.value?.clearValidate());
}

function normalizeIdentifier(value) {
  projectForm.identifier = (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

async function submitProject() {
  try {
    await projectFormRef.value.validate();
  } catch {
    return;
  }
  projectSubmitting.value = true;
  try {
    if (editingProjectId.value) {
      const updated = await editProject(editingProjectId.value, { ...projectForm });
      projectDialogVisible.value = false;
      await refreshProjects();
      ElMessage.success(`项目「${updated.name}」已保存`);
    } else {
      const created = await addProject({ ...projectForm });
      projectDialogVisible.value = false;
      await refreshProjects();
      selectedId.value = created.id;
      ElMessage.success(`项目「${created.name}」已创建`);
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || error.message || "保存项目失败");
  } finally {
    projectSubmitting.value = false;
  }
}

function openIssueDialog(issue = null) {
  if (!projects.value.length) {
    ElMessage.warning("还没有项目，请先新增项目");
    return;
  }
  editingIssueId.value = issue?.id || "";
  Object.assign(issueForm, {
    project_id: issue?.project_id || selectedId.value || projects.value[0].id,
    name: issue?.name || "",
    priority: issue?.priority || "medium",
    due_date: issue?.due_date || "",
    state: issue?.state || "todo",
    description: issue?.description || "",
  });
  issueDialogVisible.value = true;
  nextTick(() => issueFormRef.value?.clearValidate());
}

async function submitIssue() {
  try {
    await issueFormRef.value.validate();
  } catch {
    return;
  }
  issueSubmitting.value = true;
  try {
    const payload = { ...issueForm };
    const saved = editingIssueId.value
      ? await editIssue(issueForm.project_id, editingIssueId.value, payload)
      : await addIssue(issueForm.project_id, payload);
    issueDialogVisible.value = false;
    await refreshProjects();
    selectedId.value = saved.project_id || issueForm.project_id;
    tasks.value = await listMyIssues(selectedId.value);
    ElMessage.success(`任务「${saved.name}」已${editingIssueId.value ? "保存" : "创建"}`);
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || error.message || "保存任务失败");
  } finally {
    issueSubmitting.value = false;
  }
}

watch(selectedId, async (value) => {
  if (!value) return;
  loading.value = true;
  try {
    tasks.value = await listMyIssues(value);
  } finally {
    loading.value = false;
  }
});

async function changeState(row, value) {
  try {
    await updateIssueState(row.project_id, row.id, value);
    row.state = value;
    projects.value = await listProjects();
    ElMessage.success("任务状态已更新");
  } catch (error) {
    ElMessage.error(error.message || "更新失败");
  }
}

onMounted(load);
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
}

.section-title {
  font-size: 14px;
  color: #4b5563;
}

.form-hint {
  font-size: 12px;
  color: #9aa3af;
  line-height: 1.6;
  margin-top: 2px;
}

.form-hint.inline {
  margin: 0 0 0 12px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.card {
  padding: 16px 18px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.card:hover {
  border-color: #c7d6ef;
}

.card.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.15);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.4px;
}

.card-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.edit-icon {
  color: #a9b4c4;
  cursor: pointer;
  font-size: 14px;
  transition: color 0.15s ease;
}

.edit-icon:hover {
  color: var(--brand);
}

.members {
  font-size: 12px;
  color: #9aa3af;
}

.name {
  font-size: 15px;
  font-weight: 500;
  margin: 12px 0 14px;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #eef2f7;
  overflow: hidden;
}

.bar-inner {
  height: 100%;
  border-radius: 3px;
}

.ratio {
  font-size: 12px;
  color: #6b7280;
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  font-size: 12px;
  color: #6b7280;
}

.view {
  font-size: 12px;
}

.task-panel {
  margin-bottom: 8px;
}

.count {
  font-size: 12px;
}

.done {
  color: #9aa3af;
  text-decoration: line-through;
}

.overdue {
  color: #dc2626;
}
</style>
