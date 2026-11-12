import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">404 — Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        The requested URL or operational screen does not exist in the Department Digital Hub.
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
