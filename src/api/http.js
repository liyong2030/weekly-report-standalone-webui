import axios from "axios";

/** 默认走 Mock，联调时设 VITE_USE_MOCK=false 即切到真实 Plane 后端。 */
export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") !== "false";
export const WORKSPACE_SLUG = import.meta.env.VITE_WORKSPACE_SLUG || "demo";

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

const http = axios.create({
  withCredentials: true,
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  if (!["get", "head", "options"].includes((config.method || "get").toLowerCase())) {
    const token = readCookie("csrftoken");
    if (token) config.headers["X-CSRFToken"] = token;
  }
  return config;
});

export default http;
