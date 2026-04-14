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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const navItems = [
  { to: "/explore", icon: Compass, label: "Explore" },
  { to: "/history", icon: History, label: "History" },
  { to: "/create", icon: PenSquare, label: "Create" },
  { to: "/guide", icon: BookOpen, label: "Guide" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function TopNav() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link
          to="/"
          className="font-serif text-lg font-semibold tracking-tight text-foreground"
        >
          Intuita
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
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

        {/* Mobile dropdown */}
        <div className="md:hidden">
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
