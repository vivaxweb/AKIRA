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
  Building2,
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* --- Sidebar Desktop --- */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-slate-200 bg-white">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-tight text-slate-900 leading-tight">
              Department Hub
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">CSE · TKIET 2026-27</p>
          </div>
        </div>

        {/* User preview */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
              {user?.first_name?.[0] || "U"}
              {user?.last_name?.[0] || ""}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.full_name || "Loading..."}
              </p>
              <div className="mt-0.5">
                <Badge variant="info" className="text-[10px] py-0 px-1.5">
                  {formatRole(user?.role)}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-indigo-600" : "text-slate-400")} />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout bottom */}
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 h-16 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:inline">
              TKIET Warananagar · CSE Department
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications link */}
            <Link
              href="/communication/notices"
              className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Notices & Announcements"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" />
            </Link>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 text-xs font-medium"
              >
                <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  {user?.first_name?.[0] || "U"}
                </div>
                <span className="hidden sm:inline font-semibold">{user?.first_name || "Account"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <div
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                  className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50 text-xs"
                >
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-semibold text-slate-900 truncate">{user?.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <Link
                    href="/settings/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                  >
                    <UserIcon className="h-4 w-4 text-slate-400" />
                    <span>Profile & Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 text-red-500" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg text-slate-700 hover:bg-slate-100"
                >
                  <Icon className="h-4 w-4 text-slate-400" />
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
