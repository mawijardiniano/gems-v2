"use client";

import { useRouter } from "next/navigation";
import React from "react";

export default function NotAuthorizedContent() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/80">
        <div className="p-8 sm:p-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                Access denied
              </p>
              <h1 className="mt-4 text-4xl font-semibold text-slate-900">
                Unauthorized
              </h1>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
              403
            </div>
          </div>

          <p className="mt-6 text-slate-600 leading-7">
            You don’t have permission to view this page. Use the button below to
            return to the page you were on before.
          </p>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
            >
              Go back to previous page
            </button>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-800">Need help?</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              If you think this is wrong, refresh the app or contact your
              administrator for access.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
