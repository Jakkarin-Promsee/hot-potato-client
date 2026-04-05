import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/axios";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // ── Persisted data ──────────────────────
      user: null,
      token: null,

      // ── NOT persisted (but inside persist is fine) ──
      isLoading: false,
      error: null,

      // ── Functions ───────────────────────────
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        const res = await api.post("/auth/login", { email, password });
        set({ user: res.data.user, token: res.data.token, isLoading: false });
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null });
        const res = await api.post("/auth/register", { name, email, password });
        set({ user: res.data.user, token: res.data.token, isLoading: false });
      },

      logout: () => {
        set({ user: null, token: null });
      },
    }),
    {
      name: "auth-storage",
      // ✅ Only persist what matters
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    },
  ),
);
