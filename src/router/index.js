import { createRouter, createWebHashHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const routes = [
  {
    path: "/login",
    name: "login",
    component: () => import("@/views/Login.vue"),
    meta: { public: true },
  },
  {
    path: "/",
    component: () => import("@/layouts/MainLayout.vue"),
    redirect: "/dashboard",
    children: [
      { path: "dashboard", name: "dashboard", component: () => import("@/views/Dashboard.vue"), meta: { title: "工作台" } },
      { path: "reports", name: "reports", component: () => import("@/views/MyReports.vue"), meta: { title: "我的周报" } },
      { path: "reports/new", name: "report-new", component: () => import("@/views/ReportEdit.vue"), meta: { title: "新建周报" } },
      { path: "reports/:id", name: "report-edit", component: () => import("@/views/ReportEdit.vue"), meta: { title: "编辑周报" } },
      { path: "projects", name: "projects", component: () => import("@/views/Projects.vue"), meta: { title: "项目管理" } },
      {
        path: "admin/stats",
        name: "stats",
        component: () => import("@/views/admin/StatsBoard.vue"),
        meta: { title: "统计看板", requiresAdmin: true },
      },
    ],
  },
  { path: "/:pathMatch(.*)*", redirect: "/dashboard" },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.public) {
    return auth.isLoggedIn && to.name === "login" ? { name: "dashboard" } : true;
  }
  if (!auth.isLoggedIn) return { name: "login", query: { redirect: to.fullPath } };
  if (to.meta.requiresAdmin && !auth.isAdmin) return { name: "dashboard" };
  return true;
});

export default router;
