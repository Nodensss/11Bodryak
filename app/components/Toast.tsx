"use client";

import type { ToastState } from "@/lib/types";

type ToastProps = {
  toast: ToastState | null;
};

export default function Toast({ toast }: ToastProps) {
  if (!toast) {
    return null;
  }

  const isError = toast.tone === "error";

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 max-w-sm animate-fade-in-up">
      <div
        className={`flex items-center gap-2.5 rounded-2xl border px-5 py-3.5 shadow-lg backdrop-blur ${
          isError
            ? "border-rose-200 bg-rose-50/95 text-rose-800"
            : "border-emerald-200 bg-emerald-50/95 text-emerald-800"
        }`}
      >
        <span className="text-base">{isError ? "✕" : "✓"}</span>
        <p className="text-sm font-semibold">{toast.message}</p>
      </div>
    </div>
  );
}
