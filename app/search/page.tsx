"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ProviderBadge } from "@/components/ProviderBadge";
import { AuthModal } from "@/components/AuthModal";
import { WatchModal } from "@/components/WatchModal";
import { campgrounds as campgroundsApi, providerUrl, type Campground } from "@/lib/api";
import {
  Search, SlidersHorizontal, MapPin, ExternalLink,
  Map, List, Clock, Loader2, Bell, LocateFixed, Navigation, X,
} from "lucide-react";
import { CampgroundMap } from "@/components/CampgroundMap";

const PAGE_SIZE = 50;

const PROVIDERS = [
  { value: "recreation.gov",   label: "Recreation.gov" },
  { value: "reservecalifornia", label: "ReserveCalifornia" },
  { value: "bc-parks",         label: "BC Parks" },
  { value: "parks-canada",     label: "Parks Canada" },
  { value: "reserveamerica",   label: "ReserveAmerica" },
  { value: "usedirect",        label: "UseDirect" },
  { value: "goingtoccamp",     label: "GoingToCamp" },
];

export default function SearchPage() {
  const router = useRouter();
  const [view, setView]               = useState<"list" | "map">("map");
  const [query, setQuery]             = useState("");
  const [results, setResults]         = useState<Campground[]>([]);
  const [loading, setLoading]         = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const [offset, setOffset]           = useState(0);
  const [watching, setWatching]       = useState<Campground | null>(null);
  const [showAuth, setShowAuth]       = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating]       = useState(false);
  const [mapCenter, setMapCenter]     = useState<{ lat: number; lng: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterProvider, setFilterProvider] = useState("");
  const [filterState, setFilterState]       = useState("");
  const sentinelRef                   = useRef<HTMLDivElement>(null);
  const currentQuery                  = useRef("");
  const currentLocation               = useRef<{ lat: number; lng: number } | null>(null);
  const currentProvider               = useRef("");
  const currentState                  = useRef("");

  const activeFilterCount = (filterProvider ? 1 : 0) + (filterState ? 1 : 0);

  const search = useCallback(async (
    q: string,
    loc?: { lat: number; lng: number } | null,
    provider?: string,
    state?: string,
  ) => {
    const location = loc !== undefined ? loc : currentLocation.current;
    const prov = provider !== undefined ? provider : currentProvider.current;
    const st   = state    !== undefined ? state    : currentState.current;
    currentQuery.current    = q;
    currentProvider.current = prov;
    currentState.current    = st;
    setLoading(true);
    setHasMore(true);
    setOffset(0);
    try {
      const data = await campgroundsApi.search({
        q:        q || undefined,
        provider: prov || undefined,
        state:    st || undefined,
        lat:      location?.lat,
        lng:      location?.lng,
        limit:    PAGE_SIZE,
        offset:   0,
      });
      if (currentQuery.current !== q) return;
      setResults(data);
      setHasMore(data.length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextOffset = offset + PAGE_SIZE;
    try {
      const data = await campgroundsApi.search({
        q:        currentQuery.current || undefined,
        provider: currentProvider.current || undefined,
        state:    currentState.current || undefined,
        lat:      currentLocation.current?.lat,
        lng:      currentLocation.current?.lng,
        limit:    PAGE_SIZE,
        offset:   nextOffset,
      });
      setResults((prev) => [...prev, ...data]);
      setOffset(nextOffset);
      setHasMore(data.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, offset]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        currentLocation.current = loc;
        setUserLocation(loc);
        setLocating(false);
        search(currentQuery.current, loc);
      },
      () => setLocating(false),
      {
        enableHighAccuracy: false, // network-based, not GPS — near instant
        maximumAge: 60000,         // reuse cached position if < 1 min old
        timeout: 8000,
      }
    );
  }, [search]);

  // Initial load
  useEffect(() => { search(""); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search on query change
  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <>
      <Navbar />

      <div className="flex h-[calc(100vh-64px)] flex-col">
        {/* Search bar */}
        <div className="shrink-0 border-b border-border bg-background px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search parks, campgrounds, states…"
                className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <button
              onClick={requestLocation}
              title={userLocation ? "Sorted by distance" : "Sort by distance"}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                userLocation
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              {locating
                ? <Loader2 size={14} className="animate-spin" />
                : <LocateFixed size={14} />
              }
              <span className="hidden sm:inline">{userLocation ? "Nearby" : "Near me"}</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeFilterCount > 0
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:bg-secondary"
                }`}
              >
                <SlidersHorizontal size={14} />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {showFilters && (
                <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-border bg-card p-4 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filters</span>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={() => {
                          setFilterProvider("");
                          setFilterState("");
                          search(query, undefined, "", "");
                          setShowFilters(false);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-foreground">Provider</label>
                      <select
                        value={filterProvider}
                        onChange={(e) => {
                          setFilterProvider(e.target.value);
                          search(query, undefined, e.target.value, filterState);
                        }}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">All providers</option>
                        {PROVIDERS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-foreground">State / Province</label>
                      <input
                        type="text"
                        value={filterState}
                        onChange={(e) => setFilterState(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            search(query, undefined, filterProvider, filterState);
                            setShowFilters(false);
                          }
                        }}
                        placeholder="e.g. CA, BC, Ontario"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <button
                      onClick={() => {
                        search(query, undefined, filterProvider, filterState);
                        setShowFilters(false);
                      }}
                      className="w-full rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex rounded-lg border border-border bg-card p-0.5">
              {(["list", "map"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v === "list" ? <List size={13} /> : <Map size={13} />}
                  <span className="hidden sm:inline capitalize">{v}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Results */}
          <div className={`flex flex-col overflow-y-auto ${view === "map" ? "w-80 shrink-0 border-r border-border" : "w-full"}`}>
            <div className="flex items-center justify-between border-b border-border px-4 py-2 sm:px-6">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {loading && <Loader2 size={12} className="animate-spin" />}
                {results.length} campgrounds{hasMore && !loading ? "+" : ""}
              </span>
              {activeFilterCount > 0 && (
                <div className="flex items-center gap-1.5">
                  {filterProvider && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {PROVIDERS.find((p) => p.value === filterProvider)?.label}
                      <button onClick={() => { setFilterProvider(""); search(query, undefined, "", filterState); }}>
                        <X size={10} />
                      </button>
                    </span>
                  )}
                  {filterState && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {filterState}
                      <button onClick={() => { setFilterState(""); search(query, undefined, filterProvider, ""); }}>
                        <X size={10} />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col">
              {results.map((r) => {
                const extUrl = providerUrl(r.provider, r.provider_id);
                return (
                  <div
                    key={r.id}
                    onClick={() => setWatching(r)}
                    className="group cursor-pointer border-b border-border px-4 py-4 transition-colors hover:bg-secondary/50 sm:px-6"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {r.park_name} · {r.state_province}
                            </p>
                          </div>
                          {extUrl && (
                            <button
                              type="button"
                              title="View on booking site"
                              onClick={(e) => { e.stopPropagation(); window.open(extUrl, "_blank", "noopener,noreferrer"); }}
                              className="shrink-0 cursor-pointer rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            >
                              <ExternalLink size={13} />
                            </button>
                          )}
                        </div>

                        <div className="mt-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ProviderBadge provider={r.provider as never} />
                            {r.total_sites && (
                              <span className="text-xs text-muted-foreground">{r.total_sites} sites</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                            <Bell size={11} style={{ color: "var(--watching)" }} />
                            Watch
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="py-4 flex justify-center">
                {loadingMore && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
              </div>

              {!loading && results.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-20 text-center">
                  <Search size={32} className="text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No campgrounds found</p>
                </div>
              )}
            </div>
          </div>

          {/* Map panel */}
          {view === "map" && (
            <div className="relative flex flex-1 overflow-hidden">
              <CampgroundMap
                campgrounds={results}
                onSelect={(cg) => setWatching(cg)}
                onMoveEnd={(center) => setMapCenter(center)}
                flyToLocation={userLocation}
              />

              {/* Search this area button */}
              {mapCenter && (
                <div className="absolute left-1/2 top-4 -translate-x-1/2">
                  <button
                    onClick={() => {
                      currentLocation.current = mapCenter;
                      setUserLocation(null);  // GPS no longer active
                      setMapCenter(null);
                      search(currentQuery.current, mapCenter);
                    }}
                    className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground shadow-md transition-colors hover:bg-secondary"
                  >
                    <Navigation size={12} />
                    Search this area
                  </button>
                </div>
              )}

              <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-md">
                <Clock size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Scanning {results.length} campgrounds</span>
                <span className="inline-block size-1.5 rounded-full pulse-dot" style={{ backgroundColor: "var(--available)" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Watch modal */}
      {watching && (
        <WatchModal
          campground={watching}
          onClose={() => setWatching(null)}
          onAuthRequired={() => { setWatching(null); setShowAuth(true); }}
          onSuccess={() => { setWatching(null); router.push("/alerts"); }}
        />
      )}

      {/* Auth modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
    </>
  );
}
