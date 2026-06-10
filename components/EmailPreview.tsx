import Image from "next/image";

export function EmailPreview() {
  return (
    <div className="mx-auto w-full max-w-sm">
      {/* Email client chrome */}
      <div className="overflow-hidden rounded-2xl border border-border shadow-2xl">

        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-4 py-3 backdrop-blur-sm">
          <div className="flex gap-1.5">
            <div className="size-3 rounded-full bg-red-400/70" />
            <div className="size-3 rounded-full bg-yellow-400/70" />
            <div className="size-3 rounded-full bg-green-400/70" />
          </div>
          <div className="flex-1 text-center text-xs text-muted-foreground">Mail</div>
        </div>

        {/* Subject line */}
        <div className="border-b border-border bg-card px-4 py-3">
          <p className="text-xs font-semibold text-foreground">
            🏕️ 2 sites available — Upper Pines, Yosemite
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">noreply@kestrel-camp.com → you</p>
        </div>

        {/* Email body — faithful replica of actual template */}
        <div style={{ background: "#f9f9f8", padding: "24px 16px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
          <div style={{ maxWidth: 360, margin: "0 auto" }}>

            {/* Logo */}
            <div style={{ paddingBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Image src="/icon.png" alt="Kestrel" width={20} height={20} style={{ borderRadius: 5 }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.3px" }}>Kestrel</span>
            </div>

            {/* Card */}
            <div style={{ background: "#ffffff", border: "1px solid #e5e5e3", borderRadius: 12, padding: 24 }}>

              {/* Status pill */}
              <div style={{ display: "inline-block", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 999, padding: "3px 10px", marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#16a34a" }}>● Available now</span>
              </div>

              {/* Campground */}
              <div style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.3 }}>
                Upper Pines Campground
              </div>
              <div style={{ margin: "0 0 20px", fontSize: 13, color: "#6b7280" }}>
                Yosemite National Park · CA
              </div>

              {/* Details */}
              <div style={{ background: "#f9f9f8", borderRadius: 8, padding: "12px 14px", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>Dates</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>Aug 10 → Aug 13</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>Available</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#16a34a" }}>2 sites open</span>
                </div>
              </div>

              {/* CTA */}
              <div style={{ display: "block", background: "#1a1a1a", color: "#ffffff", textAlign: "center", fontSize: 13, fontWeight: 600, padding: "11px 20px", borderRadius: 8 }}>
                Book now →
              </div>
            </div>

            {/* Footer */}
            <div style={{ paddingTop: 16, textAlign: "center", fontSize: 11, color: "#9ca3af" }}>
              You&apos;re receiving this because you set a Kestrel alert.<br />
              <span style={{ color: "#9ca3af" }}>Manage alerts</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
