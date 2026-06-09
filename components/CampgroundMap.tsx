"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { Campground } from "@/lib/api";
import { MapPin } from "lucide-react";

interface Props {
  campgrounds: Campground[];
  onSelect?: (cg: Campground) => void;
  onMoveEnd?: (center: { lat: number; lng: number }) => void;
}

// Lazy-load mapbox-gl only on the client
let mapboxgl: typeof import("mapbox-gl") | null = null;

export function CampgroundMap({ campgrounds, onSelect, onMoveEnd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markersRef = useRef<import("mapbox-gl").Marker[]>([]);
  const userMovedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [noToken, setNoToken] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const initMap = useCallback(async () => {
    if (!containerRef.current || mapRef.current) return;
    if (!token) { setNoToken(true); return; }

    if (!mapboxgl) {
      mapboxgl = (await import("mapbox-gl")).default as unknown as typeof import("mapbox-gl");
      await import("mapbox-gl/dist/mapbox-gl.css");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mapboxgl as any).accessToken = token;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new (mapboxgl as any).Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-110, 44],
      zoom: 3.5,
    });

    map.on("load", () => setReady(true));

    // Track user-initiated moves
    map.on("dragstart", () => { userMovedRef.current = true; });
    map.on("zoomstart", (_e: unknown) => {
      // Only mark as user-moved for scroll/pinch zoom, not programmatic
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((_e as any)?.originalEvent) userMovedRef.current = true;
    });

    map.on("moveend", () => {
      if (!userMovedRef.current || !onMoveEnd) return;
      const center = map.getCenter();
      onMoveEnd({ lat: center.lat, lng: center.lng });
    });

    mapRef.current = map;
  }, [token, onMoveEnd]);

  useEffect(() => {
    initMap();
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [initMap]);

  // Update markers whenever campgrounds or ready state changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !mapboxgl) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const withCoords = campgrounds.filter((c) => c.lat && c.lng);

    withCoords.forEach((cg) => {
      const el = document.createElement("button");
      el.className = [
        "group flex items-center justify-center",
        "w-7 h-7 rounded-full border-2 border-white shadow-md",
        "bg-[var(--kestrel-forest)] hover:bg-[var(--kestrel-amber)]",
        "transition-colors cursor-pointer",
      ].join(" ");
      el.title = cg.name;

      const dot = document.createElement("span");
      dot.style.cssText = "width:8px;height:8px;border-radius:50%;background:white;display:block;";
      el.appendChild(dot);

      el.onclick = () => onSelect?.(cg);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker = new (mapboxgl as any).Marker(el)
        .setLngLat([cg.lng!, cg.lat!])
        .setPopup(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          new (mapboxgl as any).Popup({ offset: 18, closeButton: false })
            .setHTML(
              `<div style="font-family:system-ui;padding:4px 2px;">
                <p style="margin:0;font-size:13px;font-weight:600;">${cg.name}</p>
                <p style="margin:2px 0 0;font-size:11px;color:#666;">${cg.park_name} · ${cg.state_province}</p>
              </div>`
            )
        )
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Auto-fit bounds only if user hasn't manually moved the map
    if (!userMovedRef.current) {
      if (withCoords.length > 1) {
        const lngs = withCoords.map((c) => c.lng!);
        const lats = withCoords.map((c) => c.lat!);
        map.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 60, maxZoom: 9, duration: 500 }
        );
      } else if (withCoords.length === 1) {
        map.flyTo({ center: [withCoords[0].lng!, withCoords[0].lat!], zoom: 10 });
      }
    }
  }, [campgrounds, ready, onSelect]);

  if (noToken) {
    return (
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-muted">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="flex flex-col items-center gap-3 text-center">
          <MapPin size={40} className="text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">Map unavailable</p>
          <p className="max-w-xs text-xs text-muted-foreground/70">
            Add <code className="rounded bg-secondary px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code> to{" "}
            <code className="rounded bg-secondary px-1">.env.local</code>
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="flex-1 h-full w-full" />;
}
