import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "glass";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

    const variants = {
      primary:
        "bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:from-cyan-600 hover:via-sky-600 hover:to-indigo-700 text-white shadow-md shadow-cyan-500/20 border border-white/20",
      secondary:
        "bg-white/70 hover:bg-white/95 text-slate-800 border border-white/80 backdrop-blur-md shadow-2xs",
      outline:
        "border border-white/80 bg-white/40 backdrop-blur-md text-slate-800 hover:bg-white/70",
      danger:
        "bg-rose-500 hover:bg-rose-600 text-white shadow-sm border border-rose-300",
      ghost:
        "text-slate-700 hover:bg-white/50 backdrop-blur-sm",
      glass:
        "bg-white/70 hover:bg-white/95 text-slate-800 border border-white/80 backdrop-blur-xl shadow-xs hover:shadow-md hover:border-white",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-9 px-4 text-xs",
      lg: "h-11 px-6 text-sm",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
