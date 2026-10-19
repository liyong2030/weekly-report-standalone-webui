import { defineStore } from "pinia";
import http, { USE_MOCK } from "@/api/http";

const STORAGE_KEY = "report-web-user";

function restore() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore("auth", {
  state: () => ({ user: restore() }),
  getters: {
    isLoggedIn: (state) => Boolean(state.user),
    isAdmin: (state) => state.user?.role === "admin",
    roleLabel: (state) => (state.user?.role === "admin" ? "管理员" : "成员"),
    displayName: (state) => state.user?.display_name || "未登录",
  },
  actions: {
    async login({ email, password, asAdmin = false }) {
      if (USE_MOCK) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        if (!email || !password || password.length < 6) {
          throw new Error("邮箱或密码不正确（演示环境要求密码 6 位以上）");
        }
        const prefix = email.split("@")[0];
        this.user = {
          id: "user-demo",
          email,
          display_name: prefix,
          role: asAdmin ? "admin" : "member",
          workspace_slug: "demo",
        };
      } else {
        await http.post("/auth/sign-in/", { email, password });
        const { data } = await http.get("/api/users/me/");
        this.user = {
          id: data.id,
          email: data.email,
          display_name: data.display_name || data.email,
          role: data.is_admin ? "admin" : "member",
          workspace_slug: data.last_workspace_slug || "demo",
        };
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.user));
      return this.user;
    },
    async logout() {
      if (!USE_MOCK) {
        try {
          await http.delete("/auth/sign-out/");
        } catch {
          /* 后端不可达也允许本地登出 */
        }
      }
      this.user = null;
      sessionStorage.removeItem(STORAGE_KEY);
    },
  },
});
