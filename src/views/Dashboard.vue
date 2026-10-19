<template>
  <div>
    <div class="welcome panel">
      <div>
        <div class="hello">{{ greeting }}，{{ auth.displayName }}</div>
        <div class="sub">
          本周 {{ weekLabel(CURRENT_WEEK) }}（{{ weekRange(CURRENT_WEEK) }}）· 截止时间 {{ deadlineLabel }}
        </div>
      </div>
      <el-button type="primary" @click="goReport">
        {{ currentReport ? "查看本周周报" : "去填写周报" }}
      </el-button>
    </div>

    <div class="stats">
      <div v-for="card in cards" :key="card.label" class="stat panel">
        <div class="stat-label">{{ card.label }}</div>
        <div class="stat-value" :style="{ color: card.color }">{{ card.value }}</div>
        <div class="stat-hint">{{ card.hint }}</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">我的任务</div>
        <div class="head-tools">
          <el-select v-model="projectFilter" size="small" style="width: 160px" placeholder="全部项目" clearable>
            <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
          <el-button size="small" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>
      <el-table v-loading="loading" :data="filteredIssues" empty-text="没有分配给你的任务">
        <el-table-column label="任务" min-width="240">
          <template #default="{ row }">
            <span class="issue-name" :class="{ done: row.state === 'done' }">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="所属项目" min-width="150">
          <template #default="{ row }">
            <span class="project">
              <span class="dot" :style="{ background: row.project?.color }" />
              {{ row.project?.name || "—" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" :type="priorityMeta(row.priority).type">
              {{ priorityMeta(row.priority).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="截止日期" width="130">
          <template #default="{ row }">
            <span :class="{ overdue: isOverdue(row) }">{{ row.due_date }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="150">
          <template #default="{ row }">
            <el-select
              :model-value="row.state"
              size="small"
              style="width: 118px"
              @change="(value) => changeState(row, value)"
            >
              <el-option label="待开始" value="todo" />
              <el-option label="进行中" value="in_progress" />
              <el-option label="已完成" value="done" />
            </el-select>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { listMyIssues, listProjects, updateIssueState } from "@/api/issue";
import { getCurrentWeekReport } from "@/api/report";
import { useAuthStore } from "@/stores/auth";
import { CURRENT_WEEK } from "@/mock/db";
import { deadlineOf, formatDateTime, toISODate, weekLabel, weekRange } from "@/utils/date";

const router = useRouter();
const auth = useAuthStore();

const projects = ref([]);
const issues = ref([]);
const currentReport = ref(null);
const loading = ref(false);
const projectFilter = ref("");

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了";
  if (hour < 12) return "早上好";
  if (hour < 18) return "下午好";
  return "晚上好";
});

const deadlineLabel = computed(() => {
  const d = deadlineOf(CURRENT_WEEK);
  return `${toISODate(d)} 10:00`;
});

const filteredIssues = computed(() =>
  projectFilter.value ? issues.value.filter((i) => i.project_id === projectFilter.value) : issues.value,
);

const openIssues = computed(() => issues.value.filter((i) => i.state !== "done"));
const overdueIssues = computed(() => issues.value.filter((i) => isOverdue(i)));

const cards = computed(() => [
  {
    label: "本周周报",
    value: currentReport.value ? (currentReport.value.status === "submitted" ? "已提交" : "草稿") : "未提交",
    hint: currentReport.value?.submitted_at ? `提交于 ${formatDateTime(currentReport.value.submitted_at)}` : `截止 ${deadlineLabel.value}`,
    color: currentReport.value?.status === "submitted" ? "#16a34a" : "#dc2626",
  },
  {
    label: "进行中的任务",
    value: String(openIssues.value.length),
    hint: `全部任务 ${issues.value.length} 个`,
    color: "#2563eb",
  },
  {
    label: "最近周报工时",
    value: currentReport.value ? `${currentReport.value.hours_total} h` : "—",
    hint: currentReport.value ? `${currentReport.value.item_count} 条工作条目` : "填写后自动汇总",
    color: "#0f766e",
  },
  {
    label: "已逾期任务",
    value: String(overdueIssues.value.length),
    hint: overdueIssues.value.length ? "需要尽快处理或调整时间" : "暂无逾期",
    color: overdueIssues.value.length ? "#dc2626" : "#16a34a",
  },
]);

function priorityMeta(priority) {
  return {
    high: { label: "高", type: "danger" },
    medium: { label: "中", type: "warning" },
    low: { label: "低", type: "info" },
  }[priority] || { label: "中", type: "warning" };
}

function isOverdue(row) {
  if (!row.due_date || row.state === "done") return false;
  return row.due_date < toISODate(new Date());
}

async function load() {
  loading.value = true;
  try {
    const [projectList, issueList, report] = await Promise.all([listProjects(), listMyIssues(), getCurrentWeekReport()]);
    projects.value = projectList;
    issues.value = issueList;
    currentReport.value = report;
  } catch (error) {
    ElMessage.error(error.message || "加载工作台失败");
  } finally {
    loading.value = false;
  }
}

async function changeState(row, value) {
  try {
    await updateIssueState(row.project_id, row.id, value);
    row.state = value;
    ElMessage.success(`已更新为「${{ todo: "待开始", in_progress: "进行中", done: "已完成" }[value]}」`);
  } catch (error) {
    ElMessage.error(error.message || "更新失败");
    await load();
  }
}

function goReport() {
  if (currentReport.value) router.push({ name: "report-edit", params: { id: currentReport.value.id } });
  else router.push({ name: "report-new" });
}

onMounted(load);
</script>

<style scoped>
.welcome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  margin-bottom: 16px;
}

.hello {
  font-size: 17px;
  font-weight: 500;
}

.sub {
  font-size: 12px;
  color: #6b7280;
  margin-top: 6px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.stat {
  padding: 18px 20px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.stat-value {
  font-size: 24px;
  font-weight: 500;
  margin: 8px 0 4px;
  letter-spacing: 0.5px;
}

.stat-hint {
  font-size: 12px;
  color: #9aa3af;
}

.head-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.issue-name.done {
  color: #9aa3af;
  text-decoration: line-through;
}

.project {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.overdue {
  color: #dc2626;
}
</style>
