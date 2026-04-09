import { create } from "zustand";
import api from "@/lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServerCheck {
  status: "ok" | "error";
  uptime: string;
  environment: string;
  node_version?: string;
  memory?: {
    rss_mb: string;
    heap_used_mb: string;
    heap_total_mb: string;
  };
  platform?: string;
  hostname?: string;
}

export interface DatabaseCheck {
  status: "ok" | "error";
  connection: string;
  ready_state?: number;
  host?: string;
  port?: number;
  db_name?: string;
}

export interface EnvVar {
  key: string;
  loaded: boolean;
}

export interface EnvCheck {
  status: "ok" | "error";
  variables: EnvVar[];
}

export interface AllStatusResponse {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  checks: {
    server: ServerCheck;
    database: DatabaseCheck;
    env: EnvCheck;
  };
}

interface StatusState {
  data: AllStatusResponse | null;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  fetch: () => Promise<void>;
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStatusStore = create<StatusState>((set) => ({
  data: null,
  loading: false,
  error: null,
  lastFetched: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get<AllStatusResponse>("/status/all");
      set({ data, loading: false, lastFetched: new Date() });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch status";
      set({ error: message, loading: false });
    }
  },

  reset: () => set({ data: null, error: null, lastFetched: null }),
}));
