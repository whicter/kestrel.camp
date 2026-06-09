// Empty in production — requests go through Next.js rewrite → backend
// Set NEXT_PUBLIC_API_URL=http://localhost:8000 only for local dev without Next.js server
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  tier: string;
  is_admin: boolean;
  notify_email: boolean;
  notify_sms: boolean;
  phone: string | null;
}

export interface AdminStats {
  total_users: number;
  total_campgrounds: number;
  active_alerts: number;
  total_alerts: number;
  campgrounds_by_provider: { provider: string; count: number }[];
}

export interface AdminUser {
  id: string;
  email: string;
  tier: string;
  is_admin: boolean;
  alert_count: number;
  created_at: string;
}

export const auth = {
  register: (email: string, password: string) =>
    request<TokenResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: (token: string) => request<User>("/api/auth/me", {}, token),

  updateSettings: (
    token: string,
    data: { notify_email?: boolean; notify_sms?: boolean; phone?: string }
  ) =>
    request<User>(
      "/api/auth/me",
      { method: "PATCH", body: JSON.stringify(data) },
      token
    ),
};

// ── Campgrounds ──────────────────────────────────────────────────────────────

export interface Campground {
  id: string;
  name: string;
  park_name: string;
  state_province: string;
  country: string;
  provider: string;
  provider_id: string;
  provider_facility_id: string | null;
  lat: number | null;
  lng: number | null;
  total_sites: number | null;
  last_scanned_at: string | null;
}

export function providerUrl(provider: string, provider_id: string, facility_id?: string | null): string | null {
  switch (provider) {
    case "recreation.gov":
      return `https://www.recreation.gov/camping/campgrounds/${provider_id}`;
    case "reservecalifornia":
      return "https://www.reservecalifornia.com";
    default:
      return null;
  }
}

export interface ReleasingCampground {
  id: string;
  name: string;
  park_name: string;
  state_province: string;
  provider: string;
  provider_id: string;
  provider_facility_id: string | null;
  total_sites: number | null;
  drop_time: string;
  booking_window_days: number;
  release_campsite_date: string;
  lat: number | null;
  lng: number | null;
}

export const campgrounds = {
  search: (params: { q?: string; provider?: string; state?: string; lat?: number; lng?: number; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return request<Campground[]>(`/api/campgrounds${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => request<Campground>(`/api/campgrounds/${id}`),

  releasingToday: () => request<ReleasingCampground[]>("/api/campgrounds/releasing-today"),
};

// ── Alerts ───────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  campground_id: string;
  campground: {
    id: string;
    name: string;
    park_name: string;
    state_province: string;
    provider: string;
  };
  date_from: string;
  date_to: string;
  nights_min: number;
  site_type: string;
  status: "watching" | "triggered" | "paused" | "expired";
  scan_priority: string;
  triggered_at: string | null;
  created_at: string;
}

export const admin = {
  stats: (token: string) => request<AdminStats>("/api/admin/stats", {}, token),
  users: (token: string) => request<AdminUser[]>("/api/admin/users", {}, token),
};

export const alerts = {
  list: (token: string) => request<Alert[]>("/api/alerts", {}, token),

  create: (
    token: string,
    data: { campground_id: string; date_from: string; date_to: string; nights_min?: number }
  ) =>
    request<Alert>("/api/alerts", { method: "POST", body: JSON.stringify(data) }, token),

  update: (token: string, id: string, data: { status?: string }) =>
    request<Alert>(`/api/alerts/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  delete: (token: string, id: string) =>
    request<void>(`/api/alerts/${id}`, { method: "DELETE" }, token),
};
