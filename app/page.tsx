import Link from "next/link";
import Image from "next/image";
import { Bell, Search, MapPin, Zap, Shield, TreePine, ChevronRight, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { ProviderBadge } from "@/components/ProviderBadge";
import { AvailabilityDot } from "@/components/AvailabilityDot";

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

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Search a campground",
    desc: "Find any campground across Recreation.gov, ReserveCalifornia, BC Parks, and more — all in one place.",
  },
  {
    step: "2",
    title: "Set your dates & alert",
    desc: "Choose your dates and minimum nights. Kestrel starts watching immediately, scanning every 2 minutes.",
  },
  {
    step: "3",
    title: "Get notified instantly",
    desc: "The moment a site opens up, you get an email. Go book it before anyone else even knows it's available.",
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main className="flex-1">

        {/* ── Hero ── dark forest bg ───────────────────────────────────────── */}
        <section
          className="relative overflow-hidden"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {/* Dot-grid texture */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* Bottom fade to background */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-24"
            style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }}
          />

          <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36 text-center">

            {/* Icon */}
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-2xl blur-2xl opacity-50"
                  style={{ backgroundColor: "var(--kestrel-amber)" }}
                />
                <Image
                  src="/icon.png"
                  alt="Kestrel"
                  width={88}
                  height={88}
                  className="relative rounded-2xl shadow-2xl"
                  priority
                />
              </div>
            </div>

            {/* Eyebrow */}
            <div className="mb-5 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
                <span
                  className="inline-block size-1.5 rounded-full"
                  style={{ backgroundColor: "var(--available)" }}
                />
                Now scanning 12,000+ campgrounds
              </span>
            </div>

            {/* Headline */}
            <h1
              className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Never miss a campsite{" "}
              <span className="italic" style={{ color: "var(--kestrel-amber)" }}>
                opening
              </span>{" "}
              again.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
              Kestrel watches campsite availability across Recreation.gov, California,
              BC Parks, and more. The moment a site opens, you&apos;ll know.
            </p>

            {/* Search CTA */}
            <div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search parks, campgrounds…"
                className="flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/40"
              />
              <Button className="shrink-0 bg-white px-6 py-3 text-sm font-semibold hover:bg-white/90" style={{ color: "var(--primary)" }}>
                Search
              </Button>
            </div>

            {/* Quick links */}
            <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2">
              <Link href="/releasing" className="flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-white">
                <span className="inline-block size-1.5 rounded-full pulse-dot" style={{ backgroundColor: "var(--releasing)" }} />
                Today&apos;s releases
                <ChevronRight size={13} />
              </Link>
              <Link href="/search?region=california" className="flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-white">
                California parks <ChevronRight size={13} />
              </Link>
              <Link href="/search?region=bc" className="flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-white">
                BC Parks <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────────────────────── */}
        <section className="border-b border-border py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mb-4 flex justify-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">How it works</span>
            </div>
            <h2
              className="mb-12 text-center text-3xl font-semibold text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Up and running in 30 seconds
            </h2>

            <div className="grid gap-10 sm:grid-cols-3">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center">
                  <div
                    className="mb-5 flex size-14 items-center justify-center rounded-full text-xl font-bold text-primary-foreground shadow-md"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    {item.step}
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Live alert demo ───────────────────────────────────────────────── */}
        <section className="border-b border-border bg-secondary/40 py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Live activity
              </h2>
              <Link href="/alerts" className="flex items-center gap-1 text-sm font-medium text-foreground transition-colors hover:text-foreground/70">
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
                    <p className="text-sm font-medium leading-snug text-foreground">{alert.park}</p>
                    <AvailabilityDot status={alert.status} size={9} className="mt-1 shrink-0" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{alert.dates}</span>
                    <ProviderBadge provider={alert.provider} />
                  </div>
                  {alert.status === "available" && (
                    <div className="rounded-md px-3 py-1.5 text-center text-xs font-medium" style={{ backgroundColor: "var(--available-bg)", color: "var(--available)" }}>
                      {alert.sites} site{alert.sites !== 1 ? "s" : ""} open — Book now
                    </div>
                  )}
                  {alert.status === "releasing" && (
                    <div className="rounded-md px-3 py-1.5 text-center text-xs font-medium" style={{ backgroundColor: "var(--releasing-bg)", color: "var(--releasing)" }}>
                      Drops today at 8:00 AM PT
                    </div>
                  )}
                  {alert.status === "booked" && (
                    <div className="rounded-md px-3 py-1.5 text-center text-xs font-medium" style={{ backgroundColor: "var(--booked-bg)", color: "var(--booked)" }}>
                      Watching — fully booked
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Supported providers ───────────────────────────────────────────── */}
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

        {/* ── Features grid ─────────────────────────────────────────────────── */}
        <section className="py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mb-4 flex justify-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Features</span>
            </div>
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
                  <div key={f.title} className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                    <div
                      className="mb-4 flex size-11 items-center justify-center rounded-xl"
                      style={{ backgroundColor: "var(--secondary)" }}
                    >
                      <Icon size={20} style={{ color: "var(--primary)" }} />
                    </div>
                    <h3 className="mb-2 text-sm font-semibold text-foreground">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <section className="border-y border-border bg-secondary/40 py-16">
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

        {/* ── CTA — full-width dark band ─────────────────────────────────────── */}
        <section className="py-24" style={{ backgroundColor: "var(--primary)" }}>
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <Image
              src="/icon.png"
              alt="Kestrel"
              width={56}
              height={56}
              className="mx-auto mb-6 rounded-xl opacity-90"
            />
            <h2
              className="text-3xl font-semibold text-white sm:text-4xl"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Your next campsite is{" "}
              <span className="italic" style={{ color: "var(--kestrel-amber)" }}>
                waiting
              </span>
              .
            </h2>
            <p className="mt-4 text-white/70">
              Set up an alert in 30 seconds. We&apos;ll do the watching.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="min-w-44 bg-white font-semibold hover:bg-white/90"
                style={{ color: "var(--primary)" }}
              >
                Get started — free <ArrowRight size={16} />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="min-w-44 border border-white/20 text-white hover:bg-white/10"
              >
                Browse campgrounds
              </Button>
            </div>
            <p className="mt-5 flex items-center justify-center gap-1 text-xs text-white/40">
              <Star size={11} />
              No credit card required · Free tier available
            </p>
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Image src="/icon.png" alt="Kestrel" width={22} height={22} className="rounded-md" />
              <span className="font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                Kestrel
              </span>
              <span className="text-xs text-muted-foreground">© 2025</span>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              {["About", "Privacy", "Terms", "Status"].map((item) => (
                <Link key={item} href="#" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
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
