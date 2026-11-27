import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";

// --- Badge ---
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-white/60 text-slate-800 border-white/80 shadow-2xs",
    success: "bg-emerald-50/80 text-emerald-800 border-emerald-200/80 shadow-2xs",
    warning: "bg-amber-50/80 text-amber-800 border-amber-200/80 shadow-2xs",
    danger: "bg-rose-50/80 text-rose-800 border-rose-200/80 shadow-2xs",
    info: "bg-cyan-50/80 text-cyan-800 border-cyan-200/80 shadow-2xs",
    outline: "border-white/80 text-slate-700 bg-white/40",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl border px-2.5 py-0.5 text-xs font-semibold tracking-wide backdrop-blur-md",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// --- Card (Frosted Glassmorphic) ---
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/85 bg-white/70 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col space-y-1.5", className)} {...props}>{children}</div>;
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-bold text-slate-900 leading-snug", className)} {...props}>{children}</h3>;
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-slate-500 leading-relaxed", className)} {...props}>{children}</p>;
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("pt-0", className)} {...props}>{children}</div>;
}

// --- Skeleton ---
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-white/50 backdrop-blur-md border border-white/60", className)}
      {...props}
    />
  );
}

// --- EmptyState ---
export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-white/50 backdrop-blur-md border border-white/70">
      <div className="mb-3 rounded-2xl bg-white/80 border border-white/90 p-3.5 text-slate-400 shadow-xs">
        {icon || <Inbox className="h-6 w-6 text-cyan-600" />}
      </div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-xs text-slate-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// --- ProgressBar ---
export interface ProgressBarProps {
  value: number; // 0 to 100
  label?: string;
  className?: string;
  variant?: "primary" | "success" | "warning" | "danger";
}

export function ProgressBar({ value, label, className, variant = "primary" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const variants = {
    primary: "bg-gradient-to-r from-cyan-500 to-indigo-600",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
  };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-slate-600 font-medium">
          <span>{label}</span>
          <span className="font-semibold">{Math.round(clamped)}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/60 border border-white/80 p-0.5">
        <div
          className={cn("h-full rounded-full transition-all duration-300", variants[variant])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

// --- Pagination ---
export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  totalCount?: number;
}

export function Pagination({ page, totalPages, onPageChange, totalCount }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-white/60 px-4 py-3 sm:px-6">
      <div className="text-xs text-slate-600">
        Page <span className="font-semibold">{page}</span> of{" "}
        <span className="font-semibold">{totalPages}</span>
        {totalCount !== undefined && ` (${totalCount} total items)`}
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center rounded-xl border border-white/80 bg-white/70 backdrop-blur-md px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-white/95 disabled:opacity-40 transition-all shadow-2xs"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Prev
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center rounded-xl border border-white/80 bg-white/70 backdrop-blur-md px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-white/95 disabled:opacity-40 transition-all shadow-2xs"
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </div>
  );
}
