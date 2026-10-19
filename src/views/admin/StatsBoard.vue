<template>
  <div v-loading="loading">
    <div class="toolbar">
      <div class="filters">
        <el-select v-model="range" size="default" style="width: 150px" @change="load">
          <el-option label="近 6 周" :value="6" />
          <el-option label="近 4 周" :value="4" />
          <el-option label="近 8 周" :value="8" />
        </el-select>
        <span class="muted range-text" v-if="stats">
          统计区间 {{ stats.period.from }} ~ {{ stats.period.to }}（{{ stats.period.weeks }} 周）
        </span>
      </div>
      <div class="tools">
        <el-button :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" plain :disabled="!stats" @click="exportCsv(stats)">导出 CSV</el-button>
      </div>
    </div>

    <template v-if="stats">
      <div class="kpis">
        <div v-for="kpi in kpis" :key="kpi.label" class="kpi panel">
          <div class="kpi-label">{{ kpi.label }}</div>
          <div class="kpi-value">{{ kpi.value }}</div>
          <div class="kpi-hint">{{ kpi.hint }}</div>
        </div>
      </div>

      <el-alert
        v-if="stats.missing.length"
        type="warning"
        show-icon
        :closable="false"
        class="missing"
        :title="`本周未提交（${stats.missing.length} 人）：${stats.missing.join('、')}`"
      />

      <div class="panel chart-panel">
        <div class="panel-head">
          <div class="panel-title">提交趋势</div>
          <span class="muted small">分母为应提交成员数（role ≥ Member）</span>
        </div>
        <LineChart :labels="chartLabels" :series="chartSeries" />
      </div>

      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">成员明细（本周）</div>
          <span class="muted small">按提交时间排序</span>
        </div>
        <el-table :data="sortedMembers" empty-text="暂无数据">
          <el-table-column label="成员" min-width="140">
            <template #default="{ row }">
              <span class="member">
                <span class="avatar">{{ row.name.slice(0, 1) }}</span>
                {{ row.name }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag size="small" :type="row.submitted ? 'success' : 'info'" effect="light">
                {{ row.submitted ? "已提交" : "未提交" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="按时" width="100">
            <template #default="{ row }">
              <span v-if="!row.submitted" class="muted">—</span>
              <el-tag v-else size="small" :type="row.on_time ? 'success' : 'warning'" effect="plain">
                {{ row.on_time ? "按时" : "逾期" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="提交时间" min-width="160">
            <template #default="{ row }">
              <span :class="{ muted: !row.submitted_at }">{{ row.submitted_at || "—" }}</span>
            </template>
          </el-table-column>
          <el-table-column label="条目数" width="100">
            <template #default="{ row }">{{ row.submitted ? row.items : "—" }}</template>
          </el-table-column>
          <el-table-column label="工时" width="100">
            <template #default="{ row }">{{ row.submitted ? `${row.hours} h` : "—" }}</template>
          </el-table-column>
        </el-table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { exportCsv, getOverview } from "@/api/stats";
import LineChart from "@/components/LineChart.vue";
import { weekLabel } from "@/utils/date";

const loading = ref(false);
const stats = ref(null);
const range = ref(6);

const kpis = computed(() => {
  const s = stats.value;
  if (!s) return [];
  return [
    {
      label: "本周提交率",
      value: `${Math.round(s.submission_rate * 100)}%`,
      hint: `${s.submitted_reports} / ${s.expected_members} 人已提交`,
    },
    {
      label: "按时率",
      value: `${Math.round(s.on_time_rate * 100)}%`,
      hint: "逾期提交不计入",
    },
    {
      label: "人均工时",
      value: `${s.avg_hours_per_report} h`,
      hint: `人均 ${s.avg_items_per_report} 条工作条目`,
    },
    {
      label: "任务关联率",
      value: `${Math.round(s.issue_link_rate * 100)}%`,
      hint: "条目挂到项目任务的占比",
    },
  ];
});

const sortedMembers = computed(() => {
  if (!stats.value) return [];
  return [...stats.value.members].sort((a, b) => {
    if (a.submitted !== b.submitted) return a.submitted ? -1 : 1;
    return (b.hours || 0) - (a.hours || 0);
  });
});

const chartLabels = computed(() => (stats.value?.trend || []).map((t) => weekLabel(t.week_start).replace(" 第 ", "W").replace(" 周", "")));

const chartSeries = computed(() => {
  const trend = stats.value?.trend || [];
  return [
    {
      name: "提交率",
      color: "#2563eb",
      values: trend.map((t) => Math.round((t.submitted / t.expected) * 1000) / 10),
    },
    {
      name: "按时率",
      color: "#0f766e",
      values: trend.map((t) => Math.round((t.on_time / t.submitted) * 1000) / 10),
    },
  ];
});

async function load() {
  loading.value = true;
  try {
    stats.value = await getOverview({ weeks: range.value });
  } catch (error) {
    ElMessage.error(error.message || "加载统计失败");
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 14px;
}

.range-text {
  font-size: 12px;
}

.tools {
  display: flex;
  gap: 10px;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.kpi {
  padding: 18px 20px;
}

.kpi-label {
  font-size: 12px;
  color: #6b7280;
}

.kpi-value {
  font-size: 26px;
  font-weight: 500;
  margin: 8px 0 4px;
  color: #111827;
}

.kpi-hint {
  font-size: 12px;
  color: #9aa3af;
}

.missing {
  margin-bottom: 16px;
}

.chart-panel {
  margin-bottom: 16px;
}

.small {
  font-size: 12px;
}

.member {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #eef2f8;
  color: #64748b;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
