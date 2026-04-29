// lib/axios.ts
import { useAuthStore } from "@/stores/auth.store";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/canvas",
  "/uploadimage",
  "/history",
  "/create",
  "/profile",
  "/change-password",
  "/settings",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

api.interceptors.request.use((config) => {
  // Access the state outside of a React component
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const shouldForceRelogin =
      error?.response?.status === 401 &&
      (error?.response?.data?.forceRelogin === true ||
        error?.response?.data?.clearToken === true);
    const skipAuthRedirect = Boolean((error?.config as any)?.skipAuthRedirect);

    if (shouldForceRelogin) {
      useAuthStore.getState().logout();

      if (
        typeof window !== "undefined" &&
        !skipAuthRedirect &&
        window.location.pathname !== "/login" &&
        isProtectedPath(window.location.pathname)
      ) {
        const message =
          typeof error?.response?.data?.message === "string"
            ? error.response.data.message
            : "Session expired. Please login again.";
        window.location.replace(`/login?reason=${encodeURIComponent(message)}`);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
