import type { PropsWithChildren } from "react";
import { ActivitySquare, Milk, ScanSearch } from "lucide-react";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-farm-radial text-slateInk">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <header className="mb-6 overflow-hidden rounded-[2rem] border border-white/55 bg-pastureDark/95 text-cream shadow-panel">
          <div className="noise-grid absolute inset-0 opacity-20" />
          <div className="relative flex flex-col gap-6 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cream/80">
                Dairy 4.0 MLOps Platform
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Precision livestock monitoring for dairy operations.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-cream/80 sm:text-base">
                Simulate bolus telemetry, route it through pre-trained inference services, and review health, production,
                and vision outputs in one control plane.
              </p>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-3 lg:max-w-2xl">
              <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-sm">
                <div className="mb-2 flex items-center gap-2 text-cream/80">
                  <ScanSearch className="h-4 w-4" /> Live validation
                </div>
                <p className="font-semibold text-cream">Backend-first contracts</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-sm">
                <div className="mb-2 flex items-center gap-2 text-cream/80">
                  <Milk className="h-4 w-4" /> Production drift
                </div>
                <p className="font-semibold text-cream">Sliding forecast view</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-sm">
                <div className="mb-2 flex items-center gap-2 text-cream/80">
                  <ActivitySquare className="h-4 w-4" /> Health score
                </div>
                <p className="font-semibold text-cream">Coded for model drop-in</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
