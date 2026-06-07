"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { auth as authApi, type User } from "@/lib/api";
import { getToken } from "@/lib/auth-store";
import { Loader2, Check, Settings, Bell, MessageSquare, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

function Label({ htmlFor, className, children }: { htmlFor?: string; className?: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className={className}>{children}</label>;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/");
      return;
    }
    authApi.me(token).then((u) => {
      setUser(u);
      setNotifyEmail(u.notify_email);
      setNotifySms(u.notify_sms);
      setPhone(u.phone ?? "");
      setLoading(false);
    }).catch(() => {
      router.push("/");
    });
  }, [router]);

  async function handleSave() {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await authApi.updateSettings(token, {
        notify_email: notifyEmail,
        notify_sms: notifySms,
        phone: phone,
      });
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="flex items-center gap-2 mb-8">
          <Settings size={22} className="text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>

        {/* Account info */}
        <div className="rounded-xl border bg-card p-5 mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Account</p>
          <p className="font-medium">{user?.email}</p>
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
            {user?.tier} plan
          </span>
        </div>

        {/* Notification preferences */}
        <div className="rounded-xl border bg-card p-5 space-y-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notifications</p>

          {/* Email toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-muted-foreground" />
              <div>
                <Label htmlFor="notify-email" className="font-medium">Email alerts</Label>
                <p className="text-xs text-muted-foreground">Get emailed when a site opens</p>
              </div>
            </div>
            <Switch
              id="notify-email"
              checked={notifyEmail}
              onCheckedChange={setNotifyEmail}
            />
          </div>

          {/* SMS toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare size={18} className="text-muted-foreground" />
              <div>
                <Label htmlFor="notify-sms" className="font-medium">SMS alerts</Label>
                <p className="text-xs text-muted-foreground">Get a text message when a site opens</p>
              </div>
            </div>
            <Switch
              id="notify-sms"
              checked={notifySms}
              onCheckedChange={setNotifySms}
            />
          </div>

          {/* Phone number */}
          {notifySms && (
            <div className="pt-1">
              <Label htmlFor="phone" className="text-sm font-medium mb-1.5 block">
                Phone number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Include country code, e.g. +1 for US
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Loader2 size={14} className="animate-spin mr-1.5" /> Saving…</>
            ) : saved ? (
              <><Check size={14} className="mr-1.5" /> Saved</>
            ) : (
              <>
                <Bell size={14} className="mr-1.5" />
                Save preferences
              </>
            )}
          </Button>
        </div>
      </main>
    </>
  );
}
