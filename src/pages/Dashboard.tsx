import { useAuthStore } from "../stores/auth.store";
// Assuming you are using Lucide or similar for quick icons
import { LogOut, User, LayoutDashboard } from "lucide-react";

const Dashboard = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
      {/* Header */}
      <header className="h-16 border-b border-[var(--color-header-border)] bg-[var(--color-header-bg)] flex items-center justify-between px-8">
        <div className="flex items-center gap-2 font-semibold text-[var(--color-primary)]">
          <LayoutDashboard size={20} />
          <span>Workspace</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--color-muted-foreground)] hidden sm:block">
            {user?.email}
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)] hover:opacity-90 transition-opacity text-sm font-medium"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Simple Welcome Card */}
        <div className="w-full max-w-md p-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <User size={48} />
            </div>

            <div>
              <h1 className="text-2xl font-serif font-bold text-[var(--color-card-foreground)]">
                Welcome back, {user?.name || "User"}!
              </h1>
              <p className="mt-2 text-[var(--color-muted-foreground)]">
                You are currently logged into the temporary dashboard. Full
                features are coming soon.
              </p>
            </div>

            <div className="w-full pt-6 mt-6 border-t border-[var(--color-border)]">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-[var(--color-secondary)]">
                  <p className="text-[var(--color-muted-foreground)]">Status</p>
                  <p className="font-mono text-[var(--color-primary)]">
                    Active
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--color-secondary)]">
                  <p className="text-[var(--color-muted-foreground)]">Role</p>
                  <p className="font-mono text-[var(--color-primary)]">Admin</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Status Bar */}
      <footer className="p-4 text-center border-t border-[var(--color-border)] bg-[var(--color-muted)]">
        <p className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-widest">
          System v1.0.0-alpha
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
