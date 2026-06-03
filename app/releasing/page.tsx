"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ProviderBadge } from "@/components/ProviderBadge";
import { AuthModal } from "@/components/AuthModal";
import { WatchModal } from "@/components/WatchModal";
import { campgrounds as campgroundsApi, type ReleasingCampground, type Campground } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, ExternalLink, Zap, Loader2 } from "lucide-react";

const DROP_WINDOWS = [
  {
    provider: "recreation.gov" as const,
    time: "4:00 PM ET",
    rule: "180 days in advance",
    note: "Busiest release window. Sites at Yosemite, Grand Canyon, Yellowstone.",
  },
  {
    provider: "reservecalifornia" as const,
    time: "8:00 AM PT",
    rule: "6 months in advance",
    note: "California state parks. Big Sur, Pfeiffer, Malibu Creek.",
  },
  {
    provider: "bc-parks" as const,
    time: "7:00 AM PT",
    rule: "4 months in advance",
    note: "BC provincial parks. Garibaldi, Goldstream, Cape Scott.",
  },
  {
    provider: "goingtoccamp" as const,
    time: "8:00 AM ET",
    rule: "5 months in advance",
    note: "Ontario, Manitoba, Nova Scotia parks.",
  },
];

// Providers with accelerated scan during drop windows
const FAST_SCAN_PROVIDERS = new Set(["recreation.gov", "reservecalifornia"]);

function formatDate(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// Convert ReleasingCampground → Campground shape for WatchModal
function toWatchable(r: ReleasingCampground): Campground {
  return {
    id: r.id,
    name: r.name,
    park_name: r.park_name,
    state_province: r.state_province,
    country: "",
    provider: r.provider,
    lat: r.lat,
    lng: r.lng,
    total_sites: r.total_sites,
    last_scanned_at: null,
  };
}

export default function ReleasingPage() {
  const router = useRouter();
  const [releases, setReleases] = useState<ReleasingCampground[]>([]);
  const [loading, setLoading]   = useState(true);
  const [watching, setWatching] = useState<Campground | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    campgroundsApi.releasingToday()
      .then(setReleases)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <div className="border-b border-border bg-background">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="inline-block size-2 rounded-full pulse-dot"
                style={{ backgroundColor: "var(--releasing)" }}
              />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Live · {todayLabel()}
              </span>
            </div>
            <h1
              className="text-3xl font-semibold text-foreground sm:text-4xl"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Today&apos;s Releases
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Campsites becoming bookable today as the reservation window opens.
              We scan on an accelerated schedule during each drop window.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          {/* Drop window schedule */}
          <section className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock size={13} />
              Drop windows — today
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {DROP_WINDOWS.map((w) => (
                <div
                  key={w.provider}
                  className="flex gap-4 rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex flex-col items-start gap-2">
                    <ProviderBadge provider={w.provider} />
                    <div>
                      <p className="text-lg font-semibold tabular-nums text-foreground">
                        {w.time}
                      </p>
                      <p className="text-xs text-muted-foreground">{w.rule}</p>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {w.note}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Releasing sites list */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <CalendarDays size={13} />
                Sites releasing today
                {!loading && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {releases.length}
                  </Badge>
                )}
              </h2>
              {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
            </div>

            <div className="flex flex-col gap-2">
              {releases.map((r) => (
                <div
                  key={r.id}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Pulsing dot */}
                  <div className="flex shrink-0 flex-col items-center gap-1.5">
                    <span
                      className="inline-block size-2.5 rounded-full pulse-dot"
                      style={{ backgroundColor: "var(--releasing)" }}
                    />
                  </div>

                  {/* Main info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {r.park_name} — {r.name}
                      </p>
                      {FAST_SCAN_PROVIDERS.has(r.provider) && (
                        <span
                          className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: "var(--kestrel-amber-bg)",
                            color: "var(--kestrel-amber)",
                          }}
                        >
                          <Zap size={10} />
                          Fast scan
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-xs text-muted-foreground">{r.state_province}</span>
                      {r.total_sites && (
                        <span className="text-xs text-muted-foreground">{r.total_sites} sites</span>
                      )}
                      <span className="text-xs text-muted-foreground">Drops at {r.drop_time}</span>
                      <span className="text-xs text-muted-foreground">
                        Window opens for{" "}
                        <span className="font-medium text-foreground">
                          {formatDate(r.release_campsite_date)}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Provider + action */}
                  <div className="flex shrink-0 items-center gap-3">
                    <ProviderBadge provider={r.provider as never} className="hidden sm:inline-flex" />
                    <button
                      onClick={() => setWatching(toWatchable(r))}
                      className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-secondary"
                    >
                      Set alert
                      <ExternalLink size={11} />
                    </button>
                  </div>
                </div>
              ))}

              {!loading && releases.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-20 text-center">
                  <CalendarDays size={32} className="text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No campgrounds tracked yet</p>
                  <p className="text-xs text-muted-foreground/70">
                    Add campgrounds to start seeing releases here.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* How it works callout */}
          <div
            className="mt-10 rounded-xl p-5"
            style={{ backgroundColor: "var(--secondary)" }}
          >
            <h3 className="mb-1 text-sm font-semibold text-foreground">
              How drop windows work
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Each reservation system releases availability exactly N months/days before
              the campsite date. For example, Recreation.gov releases sites 180 days in
              advance at 4:00 PM ET. On that day, Kestrel switches to 2-minute scans so
              you&apos;re alerted the moment inventory appears — often within seconds of the drop.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-xs text-muted-foreground sm:px-6">
          Data refreshed automatically. Release times are approximate and may vary by park.
        </div>
      </footer>

      {watching && (
        <WatchModal
          campground={watching}
          onClose={() => setWatching(null)}
          onAuthRequired={() => { setWatching(null); setShowAuth(true); }}
          onSuccess={() => { setWatching(null); router.push("/alerts"); }}
        />
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
    </>
  );
}
