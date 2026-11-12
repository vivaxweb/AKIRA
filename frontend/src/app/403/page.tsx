import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">403 — Access Restricted</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        Your current role does not have authorization to access this module or resource. Permissions are enforced on the backend.
      </p>
      <div className="mt-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
