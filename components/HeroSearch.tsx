"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProviderBadge } from "@/components/ProviderBadge";
import { campgrounds as campgroundsApi, type Campground } from "@/lib/api";

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Campground[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentQuery = useRef("");

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      currentQuery.current = query;
      setLoading(true);
      try {
        const data = await campgroundsApi.search({ q: query, limit: 6 });
        if (currentQuery.current !== query) return;
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        // ignore
      } finally {
        if (currentQuery.current === query) setLoading(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const go = (q: string) => {
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") go(query);
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={containerRef} className="mx-auto mt-10 w-full max-w-md">
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Input */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          {loading && (
            <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-white/40" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search parks, campgrounds…"
            className="w-full rounded-lg border border-white bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/60"
          />

          {/* Dropdown */}
          {open && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
              {results.map((cg) => (
                <button
                  key={cg.id}
                  onMouseDown={() => go(cg.name)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary"
                >
                  <MapPin size={13} className="shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{cg.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {cg.park_name} · {cg.state_province}
                    </p>
                  </div>
                  <ProviderBadge provider={cg.provider as never} />
                </button>
              ))}
              <div
                className="flex cursor-pointer items-center gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                onMouseDown={() => go(query)}
              >
                <Search size={11} />
                See all results for &ldquo;{query}&rdquo;
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={() => go(query)}
          className="shrink-0 bg-white px-6 py-3 text-sm font-semibold hover:bg-white/90"
          style={{ color: "var(--primary)" }}
        >
          Search
        </Button>
      </div>
    </div>
  );
}
