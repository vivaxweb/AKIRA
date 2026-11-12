"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getNavItemsForRole } from "@/lib/nav";
import { formatRole, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/CardsAndFeedback";
import {
  Bell,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  ChevronDown,
  Sparkles,
} from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  // If on login or public error pages, render without sidebar shell
  const isPublicPage = pathname === "/login" || pathname === "/404" || pathname === "/403";
  if (isPublicPage) {
    return <>{children}</>;
  }

  const navItems = getNavItemsForRole(user?.role);

  // Format active page title for topbar breadcrumb
  const currentNav = navItems.find(
    (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* --- Sidebar Desktop --- */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-slate-200/90 bg-white shadow-xs">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-200/90 gap-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-pink-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/25">
            A
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-base tracking-wider text-white leading-none">
                AKIRA
              </h1>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                HUB
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
              CSE · TKIET Warananagar
            </p>
          </div>
        </div>

        {/* User Card Preview */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
              {user?.first_name?.[0] || "U"}
              {user?.last_name?.[0] || ""}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-snug">
                {user?.full_name || "Loading..."}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge
                  variant={
                    user?.role === "HOD"
                      ? "info"
                      : user?.role === "PRINCIPAL"
                      ? "info"
                      : user?.role === "FACULTY"
                      ? "success"
                      : user?.role === "COORDINATOR"
                      ? "warning"
                      : "default"
                  }
                  className="text-[9px] py-0 px-1.5 font-bold"
                >
                  {formatRole(user?.role)}
                </Badge>
                <span className="text-[10px] text-slate-400 font-medium">AY 2026-27</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all",
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:bg-slate-100/90 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span className="truncate">{item.title}</span>
                {item.title === "AI Assistant" && !isActive && (
                  <span className="ml-auto text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-bold">
                    RAG
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* System Status & Logout */}
        <div className="p-3 border-t border-slate-200/80 bg-white space-y-2">
          <div className="flex items-center justify-between px-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
            <span className="font-mono">v2.0 · AKIRA</span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 h-16 border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-4 md:px-8 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-indigo-600 uppercase">
                AKIRA
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-slate-800">
                {currentNav?.title || "Department Digital Hub"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Assistant Quick Launcher */}
            <Link
              href="/assistant"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100/70 rounded-lg transition-colors"
              title="AKIRA AI Assistant"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Ask AKIRA</span>
            </Link>

            {/* Notifications link */}
            <Link
              href="/communication/notices"
              className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Notices & Announcements"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" />
            </Link>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 text-xs font-medium"
              >
                <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  {user?.first_name?.[0] || "U"}
                </div>
                <span className="hidden sm:inline font-semibold">{user?.first_name || "Account"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <div
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                  className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg z-50 text-xs"
                >
                  <div className="px-3.5 py-2.5 border-b border-slate-100">
                    <p className="font-bold text-slate-900 truncate">{user?.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    <div className="mt-1">
                      <Badge variant="info" className="text-[9px] py-0 px-1.5 font-bold">
                        {formatRole(user?.role)}
                      </Badge>
                    </div>
                  </div>
                  <Link
                    href="/settings/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    <UserIcon className="h-4 w-4 text-slate-400" />
                    <span>Profile & Settings</span>
                  </Link>
                  <Link
                    href="/assistant"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-indigo-700 hover:bg-indigo-50/60 font-medium"
                  >
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    <span>AKIRA AI Assistant</span>
                  </Link>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-rose-600 hover:bg-rose-50 font-medium"
                  >
                    <LogOut className="h-4 w-4 text-rose-500" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white p-3 space-y-1 shadow-md">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg",
                    isActive
                      ? "bg-indigo-600 text-white font-bold"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
