"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { ProviderBadge } from "@/components/ProviderBadge";
import { AvailabilityDot } from "@/components/AvailabilityDot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell, BellRing, Eye, Pause, Play, Trash2, Plus,
  CalendarDays, Clock, ChevronRight, Zap, Loader2,
} from "lucide-react";
import { alerts as alertsApi, type Alert } from "@/lib/api";
import { getToken } from "@/lib/auth-store";

type AlertStatus = "watching" | "triggered" | "paused" | "expired";

const STATUS_CONFIG: Record<AlertStatus, { label: string; icon: typeof Bell; bg: string; text: string }> = {
  triggered: { label: "Available!", icon: BellRing, bg: "var(--available-bg)", text: "var(--available)" },
  watching:  { label: "Watching",   icon: Eye,     bg: "var(--watching-bg)",  text: "var(--watching)"  },
  paused:    { label: "Paused",     icon: Pause,   bg: "var(--booked-bg)",    text: "var(--booked)"    },
  expired:   { label: "Expired",    icon: Clock,   bg: "var(--booked-bg)",    text: "var(--muted-foreground)" },
};

const TAB_FILTERS: { label: string; value: AlertStatus | "all" }[] = [
  { label: "All",       value: "all"       },
  { label: "Active",    value: "watching"  },
  { label: "Triggered", value: "triggered" },
  { label: "Paused",    value: "paused"    },
];

function AlertStatusBadge({ status }: { status: AlertStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      <Icon size={11} />
      {config.label}
    </span>
  );
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AlertsPage() {
  const [tab, setTab] = useState<AlertStatus | "all">("all");
  const [alertList, setAlertList] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const data = await alertsApi.list(token);
      setAlertList(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePause = async (alert: Alert) => {
    const token = getToken();
    if (!token) return;
    const newStatus = alert.status === "paused" ? "watching" : "paused";
    try {
      const updated = await alertsApi.update(token, alert.id, { status: newStatus });
      setAlertList((prev) => prev.map((a) => (a.id === alert.id ? updated : a)));
    } catch {}
  };

  const deleteAlert = async (id: string) => {
    const token = getToken();
    if (!token) return;
    try {
      await alertsApi.delete(token, id);
      setAlertList((prev) => prev.filter((a) => a.id !== id));
    } catch {}
  };

  const filtered = tab === "all" ? alertList : alertList.filter((a) => a.status === tab);
  const triggeredCount = alertList.filter((a) => a.status === "triggered").length;
  const watchingCount  = alertList.filter((a) => a.status === "watching").length;

  return (
    <>
      <Navbar />
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-border bg-background">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                  My Alerts
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {watchingCount} watching · {triggeredCount} triggered
                </p>
              </div>
              <Button className="shrink-0 gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus size={15} /> New alert
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { label: "Active alerts", value: watchingCount + triggeredCount, color: "var(--primary)" },
                { label: "Sites found",   value: triggeredCount,                 color: "var(--available)" },
                { label: "Avg scan",      value: "2 min",                        color: "var(--kestrel-amber)" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-2xl font-semibold tabular-nums" style={{ color: s.color, fontFamily: "var(--font-heading)" }}>
                    {s.value}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
          {/* Tab bar */}
          <div className="mb-4 flex gap-1 rounded-lg border border-border bg-secondary/50 p-1">
            {TAB_FILTERS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                {t.value === "triggered" && triggeredCount > 0 && (
                  <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full text-xs text-white"
                    style={{ backgroundColor: "var(--available)" }}>
                    {triggeredCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Triggered banner */}
          {tab === "all" && triggeredCount > 0 && (
            <div className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ backgroundColor: "var(--available-bg)", border: "1px solid var(--available)" }}>
              <BellRing size={16} style={{ color: "var(--available)" }} />
              <p className="flex-1 text-sm font-medium" style={{ color: "var(--available)" }}>
                {triggeredCount} alert{triggeredCount > 1 ? "s" : ""} found available sites —{" "}
                <button className="underline underline-offset-2">Book now</button>
              </p>
            </div>
          )}

          {/* States */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" /> Loading alerts…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Sign in to see your alerts.
              </p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <Bell size={40} className="text-muted-foreground/30" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">No alerts yet</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Search for a campground and set up your first alert.
                </p>
              </div>
              <Button size="sm" className="mt-2 gap-2 bg-primary text-primary-foreground">
                <Plus size={14} /> Create alert
              </Button>
            </div>
          )}

          {/* Alert cards */}
          {!loading && !error && filtered.length > 0 && (
            <div className="flex flex-col gap-3">
              {filtered.map((alert) => (
                <div
                  key={alert.id}
                  className={`group rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md ${
                    alert.status === "triggered" ? "border-[var(--available)]" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-4 p-5">
                    <div className="mt-0.5 shrink-0">
                      <AvailabilityDot
                        status={alert.status === "triggered" || alert.status === "watching" ? "available" : "booked"}
                        size={9}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{alert.campground.name}</p>
                            <AlertStatusBadge status={alert.status} />
                            {alert.scan_priority === "fast" && (
                              <span className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium"
                                style={{ backgroundColor: "var(--kestrel-amber-bg)", color: "var(--kestrel-amber)" }}>
                                <Zap size={10} /> Fast
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{alert.campground.park_name}</p>
                        </div>
                        <ProviderBadge provider={alert.campground.provider as never} />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays size={11} />
                          {fmt(alert.date_from)} – {fmt(alert.date_to)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock size={11} />
                          Created {timeAgo(alert.created_at)}
                        </div>
                      </div>

                      {alert.status === "triggered" && alert.triggered_at && (
                        <div className="mt-3 flex items-center justify-between rounded-lg px-3 py-2"
                          style={{ backgroundColor: "var(--available-bg)" }}>
                          <span className="text-xs font-medium" style={{ color: "var(--available)" }}>
                            Site open · found {timeAgo(alert.triggered_at)}
                          </span>
                          <button className="flex items-center gap-1 text-xs font-semibold"
                            style={{ color: "var(--available)" }}>
                            Book now <ChevronRight size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {alert.status !== "expired" && (
                        <button
                          onClick={() => togglePause(alert)}
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          title={alert.status === "paused" ? "Resume" : "Pause"}
                        >
                          {alert.status === "paused" ? <Play size={14} /> : <Pause size={14} />}
                        </button>
                      )}
                      <button
                        onClick={() => deleteAlert(alert.id)}
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
