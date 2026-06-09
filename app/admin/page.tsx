"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { auth, admin as adminApi, type AdminStats, type AdminUser } from "@/lib/api";
import { getToken } from "@/lib/auth-store";
import { Users, Tent, Bell, BellRing, Loader2, ShieldCheck } from "lucide-react";

const PROVIDER_LABELS: Record<string, string> = {
  "recreation_gov":    "Recreation.gov",
  "reserve_california": "ReserveCalifornia",
  "bc_parks":          "BC Parks",
  "parks_canada":      "Parks Canada",
  "usedirect":         "USEDirect",
  "going_to_camp":     "GoingToCamp",
  "reserve_america":   "ReserveAmerica",
};

function StatCard({ icon: Icon, label, value, sub }: {
  icon: typeof Users;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-muted-foreground">
        <Icon size={15} />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-semibold tabular-nums text-foreground">{value.toLocaleString()}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/"); return; }

    auth.me(token).then((me) => {
      if (!me.is_admin) { setForbidden(true); setLoading(false); return; }

      Promise.all([adminApi.stats(token), adminApi.users(token)])
        .then(([s, u]) => { setStats(s); setUsers(u); })
        .finally(() => setLoading(false));
    }).catch(() => { router.push("/"); });
  }, [router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex flex-1 items-center justify-center py-40">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </main>
      </>
    );
  }

  if (forbidden) {
    return (
      <>
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center gap-3 py-40 text-center">
          <ShieldCheck size={40} className="text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">Access denied</p>
          <p className="text-xs text-muted-foreground">This page is for admins only.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="border-b border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck size={15} className="text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Admin</span>
            </div>
            <h1 className="text-3xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Dashboard
            </h1>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-10">

          {/* Stat cards */}
          {stats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Users}   label="Users"           value={stats.total_users} />
              <StatCard icon={Tent}    label="Campgrounds"     value={stats.total_campgrounds} />
              <StatCard icon={Bell}    label="Active Alerts"   value={stats.active_alerts} />
              <StatCard icon={BellRing} label="Total Alerts"   value={stats.total_alerts} />
            </div>
          )}

          {/* Campgrounds by provider */}
          {stats && (
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Campgrounds by provider
              </h2>
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Provider</th>
                      <th className="px-5 py-3 font-medium text-right">Campgrounds</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.campgrounds_by_provider
                      .sort((a, b) => b.count - a.count)
                      .map((r) => (
                        <tr key={r.provider} className="border-b border-border last:border-0">
                          <td className="px-5 py-3 font-medium text-foreground">
                            {PROVIDER_LABELS[r.provider] ?? r.provider}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-foreground">
                            {r.count.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Users table */}
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Users ({users.length})
            </h2>
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Tier</th>
                    <th className="px-5 py-3 font-medium text-right">Alerts</th>
                    <th className="px-5 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 text-foreground">
                        <div className="flex items-center gap-2">
                          {u.email}
                          {u.is_admin && (
                            <Badge variant="secondary" className="text-xs">admin</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground capitalize">{u.tier}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-foreground">{u.alert_count}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
