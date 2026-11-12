"use client";

import * as React from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Global client error caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
        <AlertOctagon className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-xs text-slate-500 max-w-md font-mono bg-white p-3 rounded-lg border border-slate-200">
        {error.message || "An unexpected application error occurred."}
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => reset()} size="sm">
          <RotateCcw className="h-4 w-4 mr-1.5" /> Try again
        </Button>
      </div>
    </div>
  );
}
