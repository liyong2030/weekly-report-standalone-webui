<template>
  <div v-loading="loading">
    <div class="page-head">
      <div class="head-left">
        <a class="back" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回我的周报
        </a>
        <div class="title">
          {{ isNew ? "新建周报" : "编辑周报" }}
          <span class="week">{{ weekLabel(form.week_start) }}</span>
          <span class="muted range">{{ weekRange(form.week_start) }}</span>
        </div>
      </div>
      <div class="head-right">
        <el-tag v-if="form.status === 'submitted'" type="success" size="small">已提交</el-tag>
        <el-tag v-else-if="form.status === 'rejected'" type="danger" size="small">已打回</el-tag>
        <el-tag v-else type="info" size="small">草稿</el-tag>
      </div>
    </div>

    <el-alert
      v-if="form.status === 'rejected' && form.review_note"
      type="error"
      :closable="false"
      show-icon
      :title="`被退回：${form.review_note}`"
      class="alert"
    />

    <div class="panel section">
      <div class="section-head">
        <span class="section-title">本周工作条目</span>
        <div class="section-meta">
          <span>共 {{ form.items.length }} 条 · 合计 {{ totalHours }} h</span>
          <el-button size="small" :disabled="readonly" @click="addItem">
            <el-icon><Plus /></el-icon>
            添加条目
          </el-button>
        </div>
      </div>

      <div class="items">
        <div v-for="(item, index) in form.items" :key="item.id" class="item-row">
          <el-select v-model="item.project_id" placeholder="项目" class="w-project" :disabled="readonly" @change="onProjectChange(item)">
            <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>

          <el-select v-model="item.issue_id" placeholder="关联任务（可选）" class="w-issue" clearable :disabled="readonly" @change="(val) => onIssueChange(item, val)">
            <el-option v-for="issue in issuesOf(item.project_id)" :key="issue.id" :label="issue.name" :value="issue.id" />
          </el-select>

          <el-input v-model="item.title" placeholder="本周做了什么" class="w-title" :disabled="readonly" />

          <el-select v-model="item.category" class="w-category" :disabled="readonly">
            <el-option v-for="c in categories" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>

          <el-input-number v-model="item.hours" :min="0" :max="168" :step="0.5" :precision="1" controls-position="right" class="w-hours" :disabled="readonly" />

          <el-input-number v-model="item.progress" :min="0" :max="100" :step="10" controls-position="right" class="w-progress" :disabled="readonly" />

          <el-button link type="danger" :disabled="readonly" @click="removeItem(index)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>

        <div v-if="!form.items.length" class="empty-items">
          还没有条目。点击「添加条目」，把本周做的事拆成可统计的细项；关联任务后，项目维度的统计会自动汇总。
        </div>
      </div>
    </div>

    <div class="panel section">
      <div class="section-head">
        <span class="section-title">文字总结</span>
      </div>
      <div class="texts">
        <div class="text-block">
          <label>本周总结</label>
          <el-input v-model="form.summary" type="textarea" :rows="3" :disabled="readonly" placeholder="整体进展、关键结果、数据指标" />
        </div>
        <div class="text-block">
          <label>下周计划</label>
          <el-input v-model="form.next_plan" type="textarea" :rows="3" :disabled="readonly" placeholder="下周要推进的重点事项" />
        </div>
        <div class="text-block">
          <label>风险与阻塞</label>
          <el-input v-model="form.blockers" type="textarea" :rows="3" :disabled="readonly" placeholder="需要协调或决策的问题，没有可留空" />
        </div>
      </div>
    </div>

    <div class="actions">
      <el-button @click="goBack">取消</el-button>
      <el-button v-if="readonly" type="warning" plain @click="reopen">撤回修改</el-button>
      <template v-else>
        <el-button :loading="saving" @click="save(false)">保存草稿</el-button>
        <el-button type="primary" :loading="submitting" @click="save(true)">提交周报</el-button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { getReport, submitReportById, upsertReport } from "@/api/report";
import { listMyIssues, listProjects } from "@/api/issue";
import { CURRENT_WEEK } from "@/mock/db";
import { formatDateTime, weekLabel, weekRange } from "@/utils/date";

const route = useRoute();
const router = useRouter();

const reportId = computed(() => route.params.id || null);
const isNew = computed(() => !reportId.value);

const projects = ref([]);
const allIssues = ref([]);
const loading = ref(false);
const saving = ref(false);
const submitting = ref(false);

const categories = [
  { value: "feature", label: "功能开发" },
  { value: "bugfix", label: "问题修复" },
  { value: "ops", label: "运维保障" },
  { value: "research", label: "调研方案" },
  { value: "other", label: "其他" },
];

const form = reactive({
  id: null,
  week_start: CURRENT_WEEK,
  status: "draft",
  template: "标准周报",
  summary: "",
  next_plan: "",
  blockers: "",
  review_note: "",
  submitted_at: null,
  items: [],
});

const readonly = computed(() => form.status === "submitted");
const totalHours = computed(() => Math.round(form.items.reduce((sum, i) => sum + (Number(i.hours) || 0), 0) * 10) / 10);

const issuesOf = (projectId) => allIssues.value.filter((i) => i.project_id === projectId);

function newItem() {
  return {
    id: `it-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    project_id: projects.value[0]?.id || null,
    issue_id: null,
    title: "",
    category: "feature",
    hours: 8,
    progress: 50,
  };
}

function addItem() {
  form.items.push(newItem());
}

function removeItem(index) {
  form.items.splice(index, 1);
}

function onProjectChange(item) {
  item.issue_id = null;
}

function onIssueChange(item, issueId) {
  const issue = allIssues.value.find((i) => i.id === issueId);
  if (issue && !item.title) item.title = issue.name;
}

async function load() {
  loading.value = true;
  try {
    const [projectList, issueList] = await Promise.all([listProjects(), listMyIssues()]);
    projects.value = projectList;
    allIssues.value = issueList;

    if (reportId.value) {
      const report = await getReport(reportId.value);
      Object.assign(form, report);
      form.items = (report.items || []).map((item) => ({ ...item }));
    } else {
      form.items = [];
    }
  } catch (error) {
    ElMessage.error(error.message || "加载失败");
  } finally {
    loading.value = false;
  }
}

function validate() {
  if (!form.items.length && !form.summary.trim()) {
    ElMessage.warning("请至少填写一条工作条目或本周总结");
    return false;
  }
  const invalid = form.items.find((i) => !i.title.trim() || !i.project_id);
  if (invalid) {
    ElMessage.warning("每个条目都需要选择项目并填写工作内容");
    return false;
  }
  return true;
}

async function save(shouldSubmit) {
  if (!shouldSubmit && !form.items.length && !form.summary.trim()) {
    ElMessage.warning("内容为空，无法保存");
    return;
  }
  if (shouldSubmit && !validate()) return;

  saving.value = !shouldSubmit;
  submitting.value = shouldSubmit;
  try {
    const saved = await upsertReport({ ...form, id: form.id });
    form.id = saved.id;
    form.status = saved.status;
    if (shouldSubmit) {
      await submitReportById(saved.id);
      ElMessage.success("周报已提交");
    } else {
      ElMessage.success("草稿已保存");
    }
    router.push({ name: "reports" });
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || error.message || "保存失败");
  } finally {
    saving.value = false;
    submitting.value = false;
  }
}

async function reopen() {
  try {
    await upsertReport({ ...form, status: "draft" });
    form.status = "draft";
    ElMessage.success("已撤回为草稿，可继续修改");
  } catch (error) {
    ElMessage.error(error.message || "撤回失败");
  }
}

function goBack() {
  router.push({ name: "reports" });
}

onMounted(load);
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 14px;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  margin-bottom: 8px;
}

.back:hover {
  color: var(--brand);
}

.title {
  font-size: 18px;
  font-weight: 500;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.week {
  font-size: 14px;
  color: #374151;
}

.range {
  font-size: 12px;
}

.alert {
  margin-bottom: 14px;
}

.section {
  margin-bottom: 16px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}

.section-title {
  font-size: 14px;
  font-weight: 500;
}

.section-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: #6b7280;
}

.items {
  padding: 14px 20px 18px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.w-project {
  width: 150px;
}

.w-issue {
  width: 190px;
}

.w-title {
  flex: 1;
  min-width: 160px;
}

.w-category {
  width: 112px;
}

.w-hours {
  width: 104px;
}

.w-progress {
  width: 104px;
}

.empty-items {
  font-size: 13px;
  color: #9aa3af;
  background: #fafbfd;
  border: 1px dashed #e3e8f0;
  border-radius: 6px;
  padding: 22px;
  text-align: center;
  line-height: 1.8;
}

.texts {
  padding: 16px 20px 20px;
  display: grid;
  gap: 14px;
}

.text-block label {
  display: block;
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 6px;
}

.actions {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
}
</style>
