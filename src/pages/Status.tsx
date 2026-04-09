import { useEffect, useRef } from "react";
import { useStatusStore } from "@/stores/status.store";
import type {
  DatabaseCheck,
  EnvCheck,
  EnvVar,
  ServerCheck,
} from "@/stores/status.store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({
  status,
}: {
  status: "ok" | "error" | "degraded" | string;
}) {
  const map = {
    ok: {
      dot: "bg-emerald-400",
      text: "text-emerald-400",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/20",
      label: "Operational",
    },
    degraded: {
      dot: "bg-amber-400",
      text: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-400/20",
      label: "Degraded",
    },
    error: {
      dot: "bg-red-500",
      text: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      label: "Error",
    },
  } as const;

  const style = map[status as keyof typeof map] ?? map.error;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border font-mono ${style.bg} ${style.border} ${style.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${style.dot}`} />
      {style.label}
    </span>
  );
}

function SectionHeader({
  title,
  icon,
}: {
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-[--color-primary]">{icon}</span>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-[--color-muted-foreground] font-mono">
        {title}
      </h2>
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[--color-border] last:border-0">
      <span className="text-xs text-[--color-muted-foreground]">{label}</span>
      <span
        className={`text-xs text-[--color-foreground] ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function ServerCard({ data }: { data: ServerCheck }) {
  return (
    <div className="rounded-xl border border-[--color-border] bg-[--color-card] p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <SectionHeader
          title="Server"
          icon={
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
              <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
              <line x1="6" x2="6.01" y1="6" y2="6" />
              <line x1="6" x2="6.01" y1="18" y2="18" />
            </svg>
          }
        />
        <StatusBadge status={data.status} />
      </div>

      <div>
        <MetaRow
          label="Environment"
          value={<span className="capitalize">{data.environment}</span>}
        />
        <MetaRow label="Uptime" value={data.uptime} mono />
        {data.node_version && (
          <MetaRow label="Node.js" value={data.node_version} mono />
        )}
        {data.platform && (
          <MetaRow label="Platform" value={data.platform} mono />
        )}
        {data.hostname && (
          <MetaRow label="Hostname" value={data.hostname} mono />
        )}
      </div>

      {data.memory && (
        <div className="rounded-lg bg-[--color-muted] p-3 grid grid-cols-3 gap-2 text-center">
          {[
            { label: "RSS", value: data.memory.rss_mb },
            { label: "Heap used", value: data.memory.heap_used_mb },
            { label: "Heap total", value: data.memory.heap_total_mb },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[--color-muted-foreground] uppercase tracking-wider">
                {label}
              </span>
              <span className="text-sm font-mono text-[--color-foreground]">
                {value}
                <span className="text-[10px] text-[--color-muted-foreground] ml-0.5">
                  MB
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DatabaseCard({ data }: { data: DatabaseCheck }) {
  return (
    <div className="rounded-xl border border-[--color-border] bg-[--color-card] p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <SectionHeader
          title="Database"
          icon={
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5V19A9 3 0 0 0 21 19V5" />
              <path d="M3 12A9 3 0 0 0 21 12" />
            </svg>
          }
        />
        <StatusBadge status={data.status} />
      </div>

      <div>
        <MetaRow
          label="Connection"
          value={<span className="capitalize">{data.connection}</span>}
        />
        {data.host && <MetaRow label="Host" value={data.host} mono />}
        {data.port && <MetaRow label="Port" value={String(data.port)} mono />}
        {data.db_name && <MetaRow label="Database" value={data.db_name} mono />}
        <MetaRow
          label="Ready state"
          value={
            <span className="font-mono">
              {data.ready_state ?? "—"}{" "}
              <span className="text-[--color-muted-foreground]">
                (
                {["disconnected", "connected", "connecting", "disconnecting"][
                  data.ready_state ?? 0
                ] ?? "unknown"}
                )
              </span>
            </span>
          }
        />
      </div>
    </div>
  );
}

function EnvCard({ data }: { data: EnvCheck }) {
  const loaded = data.variables.filter((v: EnvVar) => v.loaded).length;
  const total = data.variables.length;

  return (
    <div className="rounded-xl border border-[--color-border] bg-[--color-card] p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <SectionHeader
          title="Environment"
          icon={
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
        />
        <StatusBadge status={data.status} />
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[10px] text-[--color-muted-foreground] mb-1.5 font-mono">
          <span>Variables loaded</span>
          <span>
            {loaded} / {total}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[--color-muted] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${(loaded / total) * 100}%`,
              background:
                loaded === total ? "hsl(152 76% 48%)" : "hsl(38 92% 50%)",
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {data.variables.map((v: EnvVar) => (
          <div
            key={v.key}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-[--color-muted]"
          >
            <span className="text-xs font-mono text-[--color-foreground]">
              {v.key}
            </span>
            {v.loaded ? (
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                set
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-mono text-red-400">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                missing
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[--color-border] bg-[--color-card] p-5 space-y-3"
        >
          <div className="h-4 w-24 rounded bg-[--color-muted]" />
          <div className="h-px bg-[--color-border]" />
          {[1, 2, 3, 4].map((j) => (
            <div key={j} className="flex justify-between">
              <div className="h-3 w-20 rounded bg-[--color-muted]" />
              <div className="h-3 w-16 rounded bg-[--color-muted]" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Status() {
  const { data, loading, error, lastFetched, fetch } = useStatusStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch();
    intervalRef.current = setInterval(fetch, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetch]);

  const overallStatus = data?.status ?? (error ? "error" : "ok");

  const overallStyle = {
    ok: {
      bar: "bg-emerald-500",
      glow: "shadow-[0_0_24px_hsl(152_76%_48%/0.15)]",
    },
    degraded: {
      bar: "bg-amber-400",
      glow: "shadow-[0_0_24px_hsl(38_92%_50%/0.15)]",
    },
    error: { bar: "bg-red-500", glow: "shadow-[0_0_24px_hsl(0_72%_51%/0.15)]" },
  }[overallStatus] ?? { bar: "bg-red-500", glow: "" };

  return (
    <div className="min-h-screen bg-[--color-background] px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[--color-foreground] tracking-tight">
              System Status
            </h1>
            <p className="text-sm text-[--color-muted-foreground] mt-0.5">
              Real-time health of all services
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastFetched && (
              <span className="text-[10px] font-mono text-[--color-muted-foreground]">
                Updated {lastFetched.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetch}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                border border-[--color-border] bg-[--color-secondary] text-[--color-secondary-foreground]
                hover:bg-[--color-accent] hover:text-[--color-accent-foreground]
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors duration-150"
            >
              <svg
                className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Overall status banner */}
        {data && (
          <div
            className={`rounded-xl border border-[--color-border] bg-[--color-card] px-5 py-4 flex items-center justify-between ${overallStyle.glow}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-8 rounded-full ${overallStyle.bar}`} />
              <div>
                <p className="text-sm font-medium text-[--color-foreground]">
                  {overallStatus === "ok"
                    ? "All systems operational"
                    : overallStatus === "degraded"
                    ? "Some systems degraded"
                    : "System error detected"}
                </p>
                <p className="text-[11px] text-[--color-muted-foreground] font-mono mt-0.5">
                  {new Date(data.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
            <StatusBadge status={overallStatus} />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 flex items-center gap-3">
            <svg
              className="w-4 h-4 text-red-400 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-400">
                Failed to fetch status
              </p>
              <p className="text-xs text-red-400/70 font-mono mt-0.5">
                {error}
              </p>
            </div>
            <button
              onClick={fetch}
              className="ml-auto text-xs text-red-400 underline underline-offset-2 hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        {/* Cards */}
        {loading && !data ? (
          <Skeleton />
        ) : data ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ServerCard data={data.checks.server} />
            <DatabaseCard data={data.checks.database} />
            <EnvCard data={data.checks.env} />
          </div>
        ) : null}

        {/* Footer */}
        <p className="text-center text-[10px] font-mono text-[--color-muted-foreground]">
          Auto-refreshes every 30 seconds
        </p>
      </div>
    </div>
  );
}
