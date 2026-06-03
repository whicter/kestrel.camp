import Link from "next/link";
import { Bell, Search, MapPin, Zap, Shield, TreePine, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { ProviderBadge } from "@/components/ProviderBadge";
import { AvailabilityDot } from "@/components/AvailabilityDot";

// Mock data for the demo cards
const MOCK_ALERTS = [
  {
    id: 1,
    park: "Yosemite Valley — Upper Pines",
    dates: "Jul 12 – Jul 15",
    status: "available" as const,
    provider: "recreation.gov" as const,
    sites: 3,
  },
  {
    id: 2,
    park: "Julia Pfeiffer Burns SP",
    dates: "Jul 18 – Jul 20",
    status: "releasing" as const,
    provider: "reservecalifornia" as const,
    sites: 1,
  },
  {
    id: 3,
    park: "Garibaldi Provincial Park",
    dates: "Aug 4 – Aug 7",
    status: "booked" as const,
    provider: "bc-parks" as const,
    sites: 0,
  },
];

const FEATURES = [
  {
    icon: Bell,
    title: "Instant alerts",
    desc: "Get notified within minutes when a site opens — not hours. We scan every 2 minutes for high-demand parks.",
  },
  {
    icon: Search,
    title: "All major systems",
    desc: "Recreation.gov, ReserveCalifornia, BC Parks, GoingToCamp, and more — one app, not five tabs.",
  },
  {
    icon: MapPin,
    title: "Map view",
    desc: "Browse campsites on an interactive map. See what's available near you or plan a road trip.",
  },
  {
    icon: Zap,
    title: "Drop window alerts",
    desc: "Parks release sites at specific times. We boost scan frequency before those windows so you're first in line.",
  },
  {
    icon: Shield,
    title: "Notification-only",
    desc: "We never auto-book. You stay in control — we just make sure you know the second a site opens.",
  },
  {
    icon: TreePine,
    title: "Canada & USA",
    desc: "Federal, state, and provincial parks across the US and Canada. Algonquin, Banff, Yosemite — all covered.",
  },
];

const PROVIDERS = [
  { id: "recreation.gov", label: "Recreation.gov" },
  { id: "reservecalifornia", label: "ReserveCalifornia" },
  { id: "bc-parks", label: "BC Parks" },
  { id: "parks-canada", label: "Parks Canada" },
  { id: "usedirect", label: "UseDirect" },
  { id: "goingtoccamp", label: "GoingToCamp" },
] as const;

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-background">
          {/* Subtle grid texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
            {/* Eyebrow */}
            <div className="mb-6 flex justify-center">
              <Badge
                className="gap-1.5 border border-border bg-secondary text-secondary-foreground"
                variant="secondary"
              >
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: "var(--available)" }}
                />
                Now scanning 12,000+ campgrounds
              </Badge>
            </div>

            {/* Headline */}
            <h1
              className="mx-auto max-w-3xl text-center text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Never miss a campsite{" "}
              <span
                className="italic"
                style={{ color: "var(--kestrel-amber)" }}
              >
                opening
              </span>{" "}
              again.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-center text-base leading-relaxed text-muted-foreground sm:text-lg">
              Kestrel watches campsite availability across Recreation.gov, California,
              BC Parks, and more. The moment a site opens, you&apos;ll know.
            </p>

            {/* Search bar CTA */}
            <div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search parks, campgrounds…"
                className="flex-1 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                className="shrink-0 bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
              >
                Search
              </Button>
            </div>

            {/* Quick links */}
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
              <Link
                href="/releasing"
                className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span
                  className="inline-block size-1.5 rounded-full pulse-dot"
                  style={{ backgroundColor: "var(--releasing)" }}
                />
                Today&apos;s releases
                <ChevronRight size={13} />
              </Link>
              <Link
                href="/search?region=california"
                className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                California parks
                <ChevronRight size={13} />
              </Link>
              <Link
                href="/search?region=bc"
                className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                BC Parks
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </section>

        {/* Live alert demo */}
        <section className="border-b border-border bg-secondary/40 py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Live activity
              </h2>
              <Link
                href="/alerts"
                className="flex items-center gap-1 text-sm font-medium text-foreground transition-colors hover:text-foreground/70"
              >
                View all <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MOCK_ALERTS.map((alert) => (
                <div
                  key={alert.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug text-foreground">
                      {alert.park}
                    </p>
                    <AvailabilityDot status={alert.status} size={9} className="mt-1 shrink-0" />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{alert.dates}</span>
                    <ProviderBadge provider={alert.provider} />
                  </div>

                  {alert.status === "available" && (
                    <div
                      className="rounded-md px-3 py-1.5 text-center text-xs font-medium"
                      style={{
                        backgroundColor: "var(--available-bg)",
                        color: "var(--available)",
                      }}
                    >
                      {alert.sites} site{alert.sites !== 1 ? "s" : ""} open — Book now
                    </div>
                  )}
                  {alert.status === "releasing" && (
                    <div
                      className="rounded-md px-3 py-1.5 text-center text-xs font-medium"
                      style={{
                        backgroundColor: "var(--releasing-bg)",
                        color: "var(--releasing)",
                      }}
                    >
                      Drops today at 8:00 AM PT
                    </div>
                  )}
                  {alert.status === "booked" && (
                    <div
                      className="rounded-md px-3 py-1.5 text-center text-xs font-medium"
                      style={{
                        backgroundColor: "var(--booked-bg)",
                        color: "var(--booked)",
                      }}
                    >
                      Watching — fully booked
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Supported providers */}
        <section className="border-b border-border py-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <p className="mb-6 text-center text-sm font-medium text-muted-foreground">
              Supports all major reservation systems
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {PROVIDERS.map((p) => (
                <ProviderBadge key={p.id} provider={p.id} />
              ))}
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2
              className="mb-12 text-center text-3xl font-semibold text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Built for serious campers
            </h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
                    <div
                      className="mb-4 flex size-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: "var(--secondary)" }}
                    >
                      <Icon size={20} style={{ color: "var(--primary)" }} />
                    </div>
                    <h3 className="mb-2 text-sm font-semibold text-foreground">
                      {f.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {f.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="border-t border-border bg-secondary/40 py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { stat: "12,000+", label: "Campgrounds tracked" },
                { stat: "6", label: "Reservation systems" },
                { stat: "2 min", label: "Scan frequency" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p
                    className="text-4xl font-semibold"
                    style={{ color: "var(--primary)", fontFamily: "var(--font-heading)" }}
                  >
                    {item.stat}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2
              className="text-3xl font-semibold text-foreground sm:text-4xl"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Your next campsite is{" "}
              <span className="italic" style={{ color: "var(--kestrel-amber)" }}>
                waiting
              </span>
              .
            </h2>
            <p className="mt-4 text-muted-foreground">
              Set up an alert in 30 seconds. We&apos;ll do the watching.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="min-w-40 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Get started — free
              </Button>
              <Button size="lg" variant="outline" className="min-w-40">
                Browse campgrounds
              </Button>
            </div>
            <p className="mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Star size={12} />
              No credit card required · Free tier available
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <span aria-hidden="true">🪶</span>
              <span
                className="font-semibold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Kestrel
              </span>
              <span className="text-xs text-muted-foreground">© 2025</span>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              {["About", "Privacy", "Terms", "Status"].map((item) => (
                <Link
                  key={item}
                  href="#"
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}
