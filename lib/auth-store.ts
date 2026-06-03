"use client";

// Simple token store — localStorage + in-memory.
// Replace with next-auth or a proper session solution later.

const KEY = "kestrel_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setToken(token: string) {
  localStorage.setItem(KEY, token);
}

export function clearToken() {
  localStorage.removeItem(KEY);
}
