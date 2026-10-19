<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        <el-icon class="brand-icon"><Grid /></el-icon>
        <span>团队任务</span>
      </div>
      <nav class="nav">
        <router-link
          v-for="item in menus"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="sidebar-foot">
        <span class="dot" />
        <span>{{ auth.isAdmin ? "管理视图已启用" : "标准成员视图" }}</span>
      </div>
    </aside>

    <div class="body">
      <header class="topbar">
        <div class="topbar-title">{{ pageTitle }}</div>
        <div class="topbar-right">
          <span class="user">{{ auth.displayName }}（{{ auth.roleLabel }}）</span>
          <a class="logout" @click="handleLogout">退出登录</a>
        </div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const menus = computed(() => {
  const items = [
    { path: "/dashboard", label: "工作台", icon: "Monitor" },
    { path: "/reports", label: "我的周报", icon: "Document" },
    { path: "/projects", label: "项目管理", icon: "Folder" },
  ];
  if (auth.isAdmin) items.push({ path: "/admin/stats", label: "统计看板", icon: "DataLine" });
  return items;
});

const pageTitle = computed(() => route.meta.title || "");

const isActive = (path) => route.path === path || route.path.startsWith(`${path}/`);

async function handleLogout() {
  await auth.logout();
  ElMessage.success("已退出登录");
  router.push({ name: "login" });
}
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 208px;
  flex: 0 0 208px;
  background: var(--sidebar);
  display: flex;
  flex-direction: column;
}

.brand {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  color: #fff;
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.brand-icon {
  font-size: 19px;
}

.nav {
  padding-top: 8px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 46px;
  padding: 0 20px;
  color: #97a7bd;
  font-size: 14px;
  border-left: 3px solid transparent;
  transition: background 0.15s ease, color 0.15s ease;
}

.nav-item:hover {
  color: #dbeafe;
  background: rgba(59, 130, 246, 0.08);
}

.nav-item.active {
  background: var(--sidebar-active);
  color: #dbeafe;
  border-left-color: #3b82f6;
}

.sidebar-foot {
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  color: #6b7f99;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34d399;
}

.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--page-bg);
}

.topbar {
  height: 60px;
  flex: 0 0 60px;
  background: #fff;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.topbar-title {
  font-size: 14px;
  color: #9aa3af;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.user {
  font-size: 13px;
  color: #4b5563;
}

.logout {
  font-size: 13px;
  color: #dc2626;
  cursor: pointer;
}

.content {
  flex: 1;
  overflow: auto;
  padding: 20px 24px 28px;
}
</style>
