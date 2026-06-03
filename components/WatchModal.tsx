"use client";

import { useState } from "react";
import { alerts as alertsApi, type Campground } from "@/lib/api";
import { getToken } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { ProviderBadge } from "@/components/ProviderBadge";
import { X, Loader2, CalendarDays } from "lucide-react";

interface WatchModalProps {
  campground: Campground;
  onClose: () => void;
  onSuccess: () => void;
  onAuthRequired: () => void;
}

export function WatchModal({ campground, onClose, onSuccess, onAuthRequired }: WatchModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo]     = useState(today);
  const [nights, setNights]     = useState(1);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) { onClose(); onAuthRequired(); return; }

    setError(null);
    setLoading(true);
    try {
      await alertsApi.create(token, {
        campground_id: campground.id,
        date_from: dateFrom,
        date_to: dateTo,
        nights_min: nights,
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create alert");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>

        <div className="mb-5">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays size={16} style={{ color: "var(--primary)" }} />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Alert</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            {campground.name}
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{campground.park_name}</span>
            <ProviderBadge provider={campground.provider as never} />
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">From</label>
              <input
                type="date"
                value={dateFrom}
                min={today}
                onChange={(e) => setDateFrom(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">To</label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(e) => setDateTo(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Minimum nights
            </label>
            <select
              value={nights}
              onChange={(e) => setNights(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>{n} night{n > 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading && <Loader2 size={14} className="mr-2 animate-spin" />}
            Start watching
          </Button>
        </form>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          We&apos;ll notify you instantly when a site opens.
        </p>
      </div>
    </div>
  );
}
