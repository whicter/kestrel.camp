"use client";

import Link from "next/link";
import Image from "next/image";
import { Bell, Search, Menu, User, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";
import { getToken, clearToken } from "@/lib/auth-store";
import { auth as authApi, type User as UserType } from "@/lib/api";
import { useState, useEffect } from "react";

export function Navbar() {
  const [menuOpen, setMenuOpen]     = useState(false);
  const [showAuth, setShowAuth]     = useState(false);
  const [user, setUser]             = useState<UserType | null>(null);
  const [userMenuOpen, setUserMenu] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    authApi.me(token).then(setUser).catch(() => clearToken());
  }, []);

  const handleAuthSuccess = () => {
    setShowAuth(false);
    const token = getToken();
    if (token) authApi.me(token).then(setUser).catch(() => {});
  };

  const handleSignOut = () => {
    clearToken();
    setUser(null);
    setUserMenu(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.png" alt="Kestrel" width={32} height={32} className="rounded-lg" />
            <span className="font-heading text-xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Kestrel
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/search" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <Search size={15} /> Search
            </Link>
            <Link href="/releasing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Today&apos;s Releases
            </Link>
            <Link href="/alerts" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <Bell size={15} /> My Alerts
            </Link>
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setUserMenu(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <User size={14} />
                  {user.email.split("@")[0]}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card py-1 shadow-md">
                    <div className="border-b border-border px-3 py-2">
                      <p className="text-xs text-muted-foreground">Signed in as</p>
                      <p className="truncate text-sm font-medium text-foreground">{user.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setUserMenu(false)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      <Settings size={14} /> Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="hidden text-sm md:inline-flex" onClick={() => setShowAuth(true)}>
                  Sign in
                </Button>
                <Button size="sm" className="hidden bg-primary text-primary-foreground hover:bg-primary/90 md:inline-flex" onClick={() => setShowAuth(true)}>
                  Get started
                </Button>
              </>
            )}
            <button className="flex items-center md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
              <Menu size={20} className="text-foreground" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-b border-border bg-background px-4 pb-4 md:hidden">
            <nav className="flex flex-col gap-3 pt-3">
              <Link href="/search" className="text-sm font-medium text-foreground" onClick={() => setMenuOpen(false)}>Search</Link>
              <Link href="/releasing" className="text-sm font-medium text-foreground" onClick={() => setMenuOpen(false)}>Today&apos;s Releases</Link>
              <Link href="/alerts" className="text-sm font-medium text-foreground" onClick={() => setMenuOpen(false)}>My Alerts</Link>
              {user ? (
                <>
                  <Link href="/settings" className="flex items-center gap-2 text-sm font-medium text-foreground" onClick={() => setMenuOpen(false)}>
                    <Settings size={14} /> Settings
                  </Link>
                  <button onClick={handleSignOut} className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <LogOut size={14} /> Sign out
                  </button>
                </>
              ) : (
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setMenuOpen(false); setShowAuth(true); }}>Sign in</Button>
                  <Button size="sm" className="flex-1 bg-primary text-primary-foreground" onClick={() => { setMenuOpen(false); setShowAuth(true); }}>Get started</Button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />}
    </>
  );
}
