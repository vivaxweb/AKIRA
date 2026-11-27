"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { Role } from "@/types";
import {
  GraduationCap,
  BookOpen,
  UserCheck,
  ShieldCheck,
  Building2,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
} from "lucide-react";

interface RoleOption {
  id: Role;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  email: string;
  placeholder: string;
  inputLabel: string;
  buttonText: string;
  badge: string;
}

const ROLES: RoleOption[] = [
  {
    id: "STUDENT",
    label: "Student Portal",
    shortLabel: "Student",
    icon: GraduationCap,
    email: "student01@demo.local",
    placeholder: "26MCA121 or student01@demo.local",
    inputLabel: "Roll Number or Email",
    buttonText: "Sign In as Student",
    badge: "Default",
  },
  {
    id: "FACULTY",
    label: "Faculty Guide Portal",
    shortLabel: "Faculty",
    icon: BookOpen,
    email: "amol_patil@tkietwarana.ac.in",
    placeholder: "amol_patil@tkietwarana.ac.in",
    inputLabel: "Faculty Email Address",
    buttonText: "Sign In as Faculty",
    badge: "Faculty",
  },
  {
    id: "COORDINATOR",
    label: "Class Coordinator Portal",
    shortLabel: "Coordinator",
    icon: UserCheck,
    email: "asphalle@tkietwarana.ac.in",
    placeholder: "asphalle@tkietwarana.ac.in",
    inputLabel: "Coordinator Email Address",
    buttonText: "Sign In as Coordinator",
    badge: "Coordinator",
  },
  {
    id: "HOD",
    label: "Head of Department (HOD)",
    shortLabel: "HOD",
    icon: ShieldCheck,
    email: "hodcse@tkietwarana.ac.in",
    placeholder: "hodcse@tkietwarana.ac.in",
    inputLabel: "HOD Official Email",
    buttonText: "Sign In as HOD",
    badge: "Admin",
  },
  {
    id: "PRINCIPAL",
    label: "Principal / Executive",
    shortLabel: "Principal",
    icon: Building2,
    email: "principal@demo.local",
    placeholder: "principal@demo.local",
    inputLabel: "Principal Email Address",
    buttonText: "Sign In as Principal",
    badge: "Executive",
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  // First view defaults to Student
  const [selectedRoleId, setSelectedRoleId] = React.useState<Role>("STUDENT");
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [identifier, setIdentifier] = React.useState("student01@demo.local");
  const [password, setPassword] = React.useState("Demo@12345");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const currentRole = ROLES.find((r) => r.id === selectedRoleId) || ROLES[0];
  const CurrentIcon = currentRole.icon;

  // Click outside to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRoleChange = (role: RoleOption) => {
    setSelectedRoleId(role.id);
    setIsDropdownOpen(false);
    setErrorMessage(null);
    setIdentifier(role.email);
    setPassword("Demo@12345");
  };

  const handleQuickDemoClick = (role: RoleOption) => {
    handleRoleChange(role);
    toastSuccess("Demo Loaded", `Loaded credentials for ${role.shortLabel}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanInput = identifier.trim();
    if (!cleanInput) {
      setErrorMessage(`Please enter your ${currentRole.inputLabel.toLowerCase()}.`);
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    try {
      setIsLoading(true);
      await login(cleanInput, password);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string; code?: string; message?: string };
      let msg = apiErr?.detail;
      if (!msg) {
        const errObj = err as { message?: string; name?: string };
        if (err instanceof TypeError || errObj?.message?.includes("fetch") || errObj?.name === "TypeError") {
          msg = "Backend server unreachable. Please make sure the Django backend is running at http://localhost:8000.";
        } else {
          msg = "Invalid login credentials. Please check your username and password.";
        }
      }
      setErrorMessage(msg);
      toastError("Login Failed", msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between py-8 px-4 sm:px-6 font-sans antialiased text-slate-800">
      {/* Top Subtle Brand Bar */}
      <div className="w-full max-w-md mx-auto text-center pt-2 sm:pt-6">
        {/* Luminous Gradient Logo */}
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 text-white shadow-xl shadow-cyan-500/25 mb-3 font-black text-2xl border border-white/50">
          E
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          EduSync
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 font-semibold">
          Academic Hub · TKIET Warananagar
        </p>
      </div>

      {/* Main Frosted Glass Login Card */}
      <div className="w-full max-w-[430px] mx-auto my-6">
        <div className="rounded-3xl border border-white/85 bg-white/70 backdrop-blur-2xl shadow-[0_16px_40px_rgb(0,0,0,0.06)] p-6 sm:p-8">
          
          {/* ----------------------------------------------------------- */}
          {/* ROLE DROPDOWN (Frosted Style)                               */}
          {/* ----------------------------------------------------------- */}
          <div className="mb-6 relative" ref={dropdownRef}>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Select Role / Portal
            </label>

            {/* Dropdown Trigger */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white/65 hover:bg-white/90 border border-white/85 rounded-2xl text-left transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-cyan-400/30 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-cyan-50 to-indigo-50 border border-cyan-100 text-cyan-700 flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <CurrentIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 truncate">
                    {currentRole.label}
                  </span>
                  <span className="block text-[11px] text-slate-500 font-medium truncate">
                    Role: {currentRole.shortLabel}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 flex-shrink-0 ml-2 ${
                  isDropdownOpen ? "rotate-180 text-cyan-600" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white/90 backdrop-blur-2xl border border-white/90 rounded-2xl shadow-xl shadow-indigo-500/10 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                {ROLES.map((role) => {
                  const ItemIcon = role.icon;
                  const isSelected = selectedRoleId === role.id;

                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleRoleChange(role)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-cyan-50/80 text-cyan-900 font-bold"
                          : "text-slate-700 hover:bg-white/60 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? "bg-cyan-600 text-white"
                              : "bg-white/80 border border-white/80 text-slate-600"
                          }`}
                        >
                          <ItemIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className="truncate">{role.label}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-cyan-600 flex-shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Roll Number / Email */}
            <div>
              <label
                htmlFor="login-identifier"
                className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider"
              >
                {currentRole.inputLabel}
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={isLoading}
                  placeholder={currentRole.placeholder}
                  autoComplete="username"
                  required
                  className="block w-full rounded-xl border border-white/85 bg-white/65 backdrop-blur-md pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-400 focus:bg-white/95 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 disabled:bg-white/30 disabled:text-slate-400 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Password
                </label>
                <span className="text-[11px] text-slate-500 font-medium">Demo: Demo@12345</span>
              </div>
              <div className="relative rounded-xl shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-xl border border-white/85 bg-white/65 backdrop-blur-md pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-400 focus:bg-white/95 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 disabled:bg-white/30 disabled:text-slate-400 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-0.5 text-xs text-slate-600 font-medium">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-white/80 text-cyan-600 focus:ring-cyan-400"
                />
                <span>Remember me</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Secure TLS</span>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50/90 border border-rose-200 text-xs text-rose-700 font-semibold leading-snug">
                {errorMessage}
              </div>
            )}

            {/* Submit Button (Luminous Gradient) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:from-cyan-600 hover:via-sky-600 hover:to-indigo-700 active:scale-[0.98] shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none border border-white/20"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>{currentRole.buttonText}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher Pills */}
          <div className="mt-6 pt-5 border-t border-white/60">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Quick Demo Fill
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleQuickDemoClick(role)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                    selectedRoleId === role.id
                      ? "bg-white text-cyan-900 border-white shadow-2xs"
                      : "bg-white/60 border-white/80 text-slate-600 hover:bg-white/90"
                  }`}
                >
                  {role.shortLabel}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 font-semibold pb-2">
        <span>CSE Department · Autonomous Institute · TKIET Warananagar</span>
      </div>
    </div>
  );
}
