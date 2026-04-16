import { useState } from "react";
import {
  Compass,
  PenSquare,
  User,
  History,
  Menu,
  BookOpen,
  Settings,
} from "lucide-react";
import { NavLink } from "./NavLink";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthStore } from "@/stores/auth.store";

const publicNavItems = [
  { to: "/explore", icon: Compass, label: "Explore" },
  { to: "/guide", icon: BookOpen, label: "Guide" },
];

const authOnlyNavItems = [
  { to: "/history", icon: History, label: "History" },
  { to: "/create", icon: PenSquare, label: "Create" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function TopNav() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const navItems = token
    ? [...publicNavItems, ...authOnlyNavItems]
    : publicNavItems;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-(--app-nav-height) items-center justify-between px-4">
        <Link
          to="/"
          className="font-serif text-lg font-semibold tracking-tight text-foreground"
        >
          Intuita
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <nav className="flex items-center gap-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeClassName="bg-accent text-foreground"
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          {!token && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/login">Log in</Link>
            </Button>
          )}
          <ThemeToggle compact />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          {!token && (
            <Button variant="outline" size="sm" className="mr-1" asChild>
              <Link to="/login">Log in</Link>
            </Button>
          )}
          <ThemeToggle compact />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {navItems.map(({ to, icon: Icon, label }) => (
                <DropdownMenuItem
                  key={to}
                  onClick={() => navigate(to)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
