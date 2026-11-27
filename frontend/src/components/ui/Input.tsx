import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            "w-full rounded-xl border border-white/80 bg-white/65 backdrop-blur-md px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-2xs transition-all focus:border-cyan-400 focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 disabled:bg-white/30 disabled:text-slate-400",
            error && "border-rose-400 focus:border-rose-500 focus:ring-rose-400/20",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: Array<{ value: string | number; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, children, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            "w-full rounded-xl border border-white/80 bg-white/65 backdrop-blur-md px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-all focus:border-cyan-400 focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 disabled:bg-white/30 disabled:text-slate-400",
            error && "border-rose-400 focus:border-rose-500 focus:ring-rose-400/20",
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            "w-full rounded-xl border border-white/80 bg-white/65 backdrop-blur-md px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-2xs transition-all focus:border-cyan-400 focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 disabled:bg-white/30 disabled:text-slate-400",
            error && "border-rose-400 focus:border-rose-500 focus:ring-rose-400/20",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

