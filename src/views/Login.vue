<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <div class="brand-mark">
          <el-icon><Grid /></el-icon>
        </div>
        <div>
          <div class="brand-name">团队任务</div>
          <div class="brand-sub">周报日志 · 项目任务</div>
        </div>
      </div>

      <el-form :model="form" label-position="top" @submit.prevent="handleSubmit">
        <el-form-item label="邮箱">
          <el-input v-model="form.email" size="large" placeholder="you@company.com" :prefix-icon="Message" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            size="large"
            type="password"
            show-password
            placeholder="Plane 账号密码"
            :prefix-icon="Lock"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <div class="row">
          <el-checkbox v-model="form.asAdmin">以管理员身份登录（查看统计看板）</el-checkbox>
        </div>

        <el-button type="primary" size="large" class="submit" :loading="loading" @click="handleSubmit">
          登 录
        </el-button>
      </el-form>

      <div class="hint">
        <el-icon><InfoFilled /></el-icon>
        <span>
          演示环境：任意邮箱 + 6 位以上密码即可进入；勾选管理员可看到「统计看板」。
          正式环境走 Plane 账号 session 登录，同一套账号体系。
        </span>
      </div>
    </div>
    <div class="footnote">report-web · v0.1.0 · 对接 Plane 1.4.2</div>
  </div>
</template>

<script setup>
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Lock, Message } from "@element-plus/icons-vue";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const form = reactive({ email: "test1@demo.com", password: "123456", asAdmin: false });
const loading = ref(false);

async function handleSubmit() {
  if (loading.value) return;
  loading.value = true;
  try {
    await auth.login(form);
    ElMessage.success(`欢迎，${auth.displayName}`);
    router.replace(route.query.redirect || "/dashboard");
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || error.message || "登录失败");
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #eef2f8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.login-card {
  width: 400px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid var(--border);
  padding: 32px 32px 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 26px;
}

.brand-mark {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--sidebar);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.brand-name {
  font-size: 17px;
  font-weight: 500;
}

.brand-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4px 0 20px;
}

.submit {
  width: 100%;
}

.hint {
  margin-top: 22px;
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.7;
  color: #6b7280;
  background: #f7f9fc;
  border: 1px solid #e8edf5;
  border-radius: 6px;
  padding: 10px 12px;
}

.hint .el-icon {
  margin-top: 2px;
  color: #93a3b8;
  flex: 0 0 auto;
}

.footnote {
  font-size: 12px;
  color: #9aa3af;
}
</style>
