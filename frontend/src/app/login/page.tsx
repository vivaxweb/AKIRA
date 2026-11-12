"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { Building2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const { error: toastError } = useToast();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    if (!email) {
      setFieldError("Please enter your email.");
      return;
    }
    if (!password) {
      setFieldError("Please enter your password.");
      return;
    }

    try {
      setIsLoading(true);
      await login(email, password);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string; code?: string };
      const msg = apiErr?.detail || "Invalid email or password. Please try again.";
      setFieldError(msg);
      toastError("Login failed", msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Demo@12345");
    setFieldError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm mb-4">
          <Building2 className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Department Digital Hub
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Computer Science & Engineering · TKIET Warananagar (2026-27)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 border border-slate-200 rounded-xl sm:px-10 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              placeholder="user@demo.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
              autoFocus
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
            />

            {fieldError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {fieldError}
              </div>
            )}

            <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
              Sign in to Portal
            </Button>
          </form>

          {/* Quick Demo Logins for Evaluator */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 text-center">
              Quick Demo Logins (Password: Demo@12345)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemo("hod@demo.local")}
                className="p-2 border border-slate-200 rounded-lg text-left hover:bg-slate-50 text-slate-700 transition-colors"
              >
                <div className="font-semibold text-slate-900">HOD</div>
                <div className="text-[10px] text-slate-500">hod@demo.local</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("principal@demo.local")}
                className="p-2 border border-slate-200 rounded-lg text-left hover:bg-slate-50 text-slate-700 transition-colors"
              >
                <div className="font-semibold text-slate-900">Principal</div>
                <div className="text-[10px] text-slate-500">principal@demo.local</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("faculty1@demo.local")}
                className="p-2 border border-slate-200 rounded-lg text-left hover:bg-slate-50 text-slate-700 transition-colors"
              >
                <div className="font-semibold text-slate-900">Faculty</div>
                <div className="text-[10px] text-slate-500">faculty1@demo.local</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("coordinator@demo.local")}
                className="p-2 border border-slate-200 rounded-lg text-left hover:bg-slate-50 text-slate-700 transition-colors"
              >
                <div className="font-semibold text-slate-900">Coordinator</div>
                <div className="text-[10px] text-slate-500">coordinator@demo.local</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("student01@demo.local")}
                className="col-span-2 p-2 border border-slate-200 rounded-lg text-left hover:bg-slate-50 text-slate-700 transition-colors"
              >
                <div className="font-semibold text-slate-900">Student 01</div>
                <div className="text-[10px] text-slate-500">student01@demo.local</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
