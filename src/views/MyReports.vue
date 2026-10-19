<template>
  <div class="panel">
    <div class="panel-head">
      <div class="panel-title">我的周报</div>
      <el-button type="primary" @click="createNew">新建周报</el-button>
    </div>

    <el-table v-loading="loading" :data="reports" empty-text="本周还没有周报，点击右上角新建" style="width: 100%">
      <el-table-column label="周次" min-width="140">
        <template #default="{ row }">
          <span class="week">{{ weekLabel(row.week_start) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="起始日" min-width="130">
        <template #default="{ row }">
          <span>{{ row.week_start }}</span>
          <span class="muted range">{{ weekRange(row.week_start) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" min-width="120">
        <template #default="{ row }">
          <el-tag :type="statusTag(row).type" size="small" effect="light">{{ statusTag(row).text }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="模板" min-width="110">
        <template #default="{ row }">
          <span class="muted">{{ row.template }}</span>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" min-width="150">
        <template #default="{ row }">
          <span :class="{ muted: !row.submitted_at }">{{ row.submitted_at ? formatDateTime(row.submitted_at) : "—" }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="170">
        <template #default="{ row }">
          <el-button link type="primary" @click="open(row)">{{ row.status === "submitted" ? "查看" : "编辑" }}</el-button>
          <el-button v-if="row.status !== 'submitted'" link type="primary" @click="submit(row)">提交</el-button>
          <el-button v-if="row.status !== 'submitted'" link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="foot">
      <span>
        本周 {{ weekLabel(CURRENT_WEEK) }}（{{ weekRange(CURRENT_WEEK) }}）
        <template v-if="currentSubmitted">已提交，提交后仍可撤回修改。</template>
        <template v-else>尚未提交，截止时间：{{ formatDateTime(deadlineText) }}。</template>
      </span>
      <span class="muted">共 {{ reports.length }} 份 · 累计工时 {{ totalHours }} h</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { listReports, removeReport, submitReportById } from "@/api/report";
import { CURRENT_WEEK } from "@/mock/db";
import { deadlineOf, formatDateTime, toISODate, weekLabel, weekRange } from "@/utils/date";

const router = useRouter();
const reports = ref([]);
const loading = ref(false);

const currentSubmitted = computed(() => reports.value.some((r) => r.week_start === CURRENT_WEEK && r.status === "submitted"));
const totalHours = computed(() => Math.round(reports.value.reduce((sum, r) => sum + (r.hours_total || 0), 0) * 10) / 10);
const deadlineText = computed(() => {
  const d = deadlineOf(CURRENT_WEEK);
  return toISODate(d) + ` ${`${d.getHours()}`.padStart(2, "0")}:00`;
});

function statusTag(row) {
  if (row.status === "submitted") {
    return row.is_late ? { type: "warning", text: "已提交 · 逾期" } : { type: "success", text: "已提交" };
  }
  if (row.status === "rejected") return { type: "danger", text: "已打回" };
  return { type: "info", text: "草稿" };
}

async function load() {
  loading.value = true;
  try {
    reports.value = await listReports();
  } catch (error) {
    ElMessage.error(error.message || "加载周报失败");
  } finally {
    loading.value = false;
  }
}

function createNew() {
  router.push({ name: "report-new" });
}

function open(row) {
  router.push({ name: "report-edit", params: { id: row.id } });
}

async function submit(row) {
  try {
    await submitReportById(row.id);
    ElMessage.success("已提交");
    await load();
  } catch (error) {
    ElMessage.error(error.message || "提交失败");
  }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(`确认删除 ${weekLabel(row.week_start)} 的周报？`, "删除确认", { type: "warning" });
    await removeReport(row.id);
    ElMessage.success("已删除");
    await load();
  } catch {
    /* 用户取消 */
  }
}

onMounted(load);
</script>

<style scoped>
.week {
  font-weight: 500;
}

.range {
  margin-left: 6px;
  font-size: 12px;
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: #6b7280;
  background: #fafbfd;
  border-radius: 0 0 8px 8px;
}
</style>
