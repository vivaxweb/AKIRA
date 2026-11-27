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

  // If on root, login, or public error pages, render without sidebar shell
  const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/404" || pathname === "/403";
  if (isPublicPage) {
    return <>{children}</>;
  }

  // If user is not authenticated yet, do not render sidebar shell
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  const navItems = getNavItemsForRole(user?.role);

  // Format active page title for topbar breadcrumb
  const currentNav = navItems.find(
    (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );

  return (
    <div className="min-h-screen flex font-sans antialiased text-slate-800">
      {/* --- Sidebar Desktop (Frosted Glassmorphism) --- */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-white/75 bg-white/65 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-white/60 gap-3.5">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-cyan-500/25 border border-white/40">
            E
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-base tracking-tight text-slate-900 leading-none">
              EduSync
            </h1>
            <p className="text-[11px] font-semibold text-slate-500 mt-1 tracking-wide">
              Academic Hub
            </p>
          </div>
        </div>

        {/* User Profile Summary (Frosted Card) */}
        <div className="p-3 mx-3 my-2.5 rounded-2xl bg-white/50 border border-white/80 shadow-2xs backdrop-blur-md flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
            {user?.first_name?.[0] || "U"}
            {user?.last_name?.[0] || ""}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate leading-tight">
              {user?.full_name || "Account"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge
                variant={
                  user?.role === "HOD" || user?.role === "PRINCIPAL"
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
              <span className="text-[10px] text-slate-500 font-medium">AY 26-27</span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map((item, idx) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            const isFirstInSection = idx === 0 || item.section !== navItems[idx - 1].section;

            return (
              <React.Fragment key={item.href}>
                {isFirstInSection && (
                  <div className="pt-3 pb-1 px-3 first:pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {item.section}
                    </span>
                  </div>
                )}
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2 text-xs rounded-xl transition-all group",
                    isActive
                      ? "bg-white/85 backdrop-blur-md text-slate-900 font-bold shadow-xs border-l-4 border-cyan-500"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/45 font-medium"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-cyan-600" : "text-slate-400 group-hover:text-slate-700"
                    )}
                  />
                  <span className="truncate">{item.title}</span>
                  {item.badge && !isActive && (
                    <span className="ml-auto text-[9px] bg-cyan-50 text-cyan-700 border border-cyan-200/60 px-1.5 py-0.2 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </React.Fragment>
            );
          })}
        </nav>

        {/* System Status & Logout */}
        <div className="p-3 border-t border-white/60 space-y-2">
          <div className="flex items-center justify-between px-2 text-[10px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              Live Connected
            </span>
            <span className="font-mono text-slate-400">v2.0 Glass</span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-white/60 rounded-xl border border-transparent hover:border-white/80 transition-all shadow-2xs"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-400" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Top Frosted Navbar */}
        <header className="sticky top-0 z-20 h-16 border-b border-white/70 bg-white/55 backdrop-blur-xl px-4 md:px-8 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-white/60"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-extrabold tracking-widest bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent uppercase shrink-0">
                EduSync
              </span>
              <span className="text-slate-300 shrink-0">/</span>
              <span className="text-xs font-bold text-slate-800 truncate max-w-[130px] sm:max-w-xs md:max-w-none">
                {currentNav?.title || "Academic Hub"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* AI Assistant Quick Launcher */}
            <Link
              href="/assistant"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-white/70 hover:bg-white/95 border border-white/90 rounded-xl shadow-xs backdrop-blur-md transition-all hover:scale-[1.02]"
              title="EduSync AI Assistant"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
              <span>Ask EduSync</span>
            </Link>

            {/* Notifications link */}
            <Link
              href="/communication/notices"
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-xl border border-transparent hover:border-white/80 transition-all"
              title="Notices & Announcements"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-white shadow-xs" />
            </Link>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl bg-white/50 hover:bg-white/80 border border-white/80 text-slate-700 text-xs font-medium shadow-2xs transition-all"
              >
                <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.first_name?.[0] || "U"}
                </div>
                <span className="hidden sm:inline font-bold">{user?.first_name || "Account"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/90 bg-white/85 backdrop-blur-2xl shadow-xl shadow-indigo-500/10 py-1.5 z-50 text-xs">
                    <div className="px-4 py-2.5 border-b border-white/60">
                      <p className="font-bold text-slate-900 truncate">{user?.full_name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <Link
                      href="/assistant"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-indigo-700 hover:bg-white/60 font-semibold"
                    >
                      <Sparkles className="h-4 w-4 text-cyan-500" />
                      <span>EduSync AI Assistant</span>
                    </Link>
                    <div className="border-t border-white/60 my-1" />
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50/60 font-semibold"
                    >
                      <LogOut className="h-4 w-4 text-rose-500" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-white/70 bg-white/80 backdrop-blur-2xl p-3 space-y-1 shadow-lg">
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
                    "flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl",
                    isActive
                      ? "bg-white text-slate-900 font-bold border-l-4 border-cyan-500 shadow-xs"
                      : "text-slate-700 hover:bg-white/60"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-cyan-600" : "text-slate-400")} />
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
