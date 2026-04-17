import {
  Bell,
  Moon,
  Globe,
  Shield,
  Trash2,
  HelpCircle,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";

interface SettingRow {
  icon: React.ElementType;
  label: string;
  description: string;
  destructive?: boolean;
}

const sections: { heading: string; items: SettingRow[] }[] = [
  {
    heading: "Preferences",
    items: [
      {
        icon: Bell,
        label: "Notifications",
        description: "Push & email alerts",
      },
      {
        icon: Moon,
        label: "Appearance",
        description: "Theme, font size, display",
      },
      { icon: Globe, label: "Language", description: "App display language" },
    ],
  },
  {
    heading: "Account",
    items: [
      {
        icon: Shield,
        label: "Privacy & Security",
        description: "Password, 2FA, sessions",
      },
      {
        icon: HelpCircle,
        label: "Help & Support",
        description: "FAQ, contact us",
      },
    ],
  },
  {
    heading: "Danger zone",
    items: [
      {
        icon: LogOut,
        label: "Log out",
        description: "Sign out of your account",
        destructive: true,
      },
      {
        icon: Trash2,
        label: "Delete account",
        description: "Permanently remove your data",
        destructive: true,
      },
    ],
  },
];

export default function Settings() {
  const { theme } = useThemeStore();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/explore", { replace: true });
  };

  return (
    <div className="container max-w-lg px-4 pb-12 pt-6">
      <h1 className="font-serif text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your account and preferences
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Theme
          </h2>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Appearance</p>
              <p className="text-xs text-muted-foreground">
                Current mode: {theme === "dark" ? "Dark" : "Light"}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.heading}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.heading}
            </h2>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {section.items.map((item, i) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={
                    item.label === "Log out" ? handleLogout : undefined
                  }
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent ${
                    i > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 shrink-0 ${
                      item.destructive
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        item.destructive
                          ? "text-destructive"
                          : "text-foreground"
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
