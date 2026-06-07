import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Mail, Phone, KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? null);
      setPhone(u.user.phone ?? null);
      const { data } = await supabase.from("profiles").select("display_name, username").eq("id", u.user.id).maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setUsername(data.username ?? "");
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles")
      .update({ display_name: displayName.trim() || null, username: username.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", u.user!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const initial = (displayName || email || "?").charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Your <span className="text-gradient-sunset">profile</span></h1>

      <div className="rounded-3xl border border-border bg-card-soft p-6 text-center shadow-soft">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-sunset font-display text-4xl font-bold text-primary-foreground shadow-glow">{initial}</div>
        <p className="mt-3 text-sm text-muted-foreground">{email ?? phone}</p>
      </div>

      <div className="space-y-4 rounded-3xl border border-border bg-card-soft p-5 shadow-soft">
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground">Display name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40}
            className="mt-2 w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground">Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} maxLength={20}
            className="mt-2 w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary" />
        </div>
        <button onClick={save} disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sunset px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
      </div>

      <div className="space-y-4 rounded-3xl border border-border bg-card-soft p-5 shadow-soft">
        <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /><h2 className="font-display text-lg font-semibold">Security</h2></div>

        {email && (
          <button
            onClick={async () => {
              setBusy(true);
              const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` });
              setBusy(false);
              if (error) return toast.error(error.message);
              toast.success("Reset link sent to " + email);
            }}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-semibold disabled:opacity-60">
            <Mail className="h-4 w-4" /> Email me a password reset link
          </button>
        )}

        <div className="space-y-2 rounded-2xl border border-border bg-background/40 p-3">
          <p className="text-xs text-muted-foreground">Reset via phone OTP</p>
          {!otpSent ? (
            <div className="flex gap-2">
              <input value={otpPhone} onChange={(e) => setOtpPhone(e.target.value)} placeholder="+15551234567"
                className="flex-1 rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary" />
              <button
                onClick={async () => {
                  if (!otpPhone.startsWith("+")) return toast.error("Use international format e.g. +15551234567");
                  setBusy(true);
                  const { error } = await supabase.auth.signInWithOtp({ phone: otpPhone });
                  setBusy(false);
                  if (error) return toast.error(error.message);
                  setOtpSent(true);
                  toast.success("Code sent");
                }}
                disabled={busy}
                className="rounded-xl bg-sunset px-3 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
                <Phone className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} maxLength={6} placeholder="6-digit code"
                className="w-full rounded-xl border border-border bg-input px-3 py-2 text-center tracking-[0.4em] outline-none focus:border-primary" />
              <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="New password (min 6 chars)"
                className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary" />
              <button
                onClick={async () => {
                  if (newPassword.length < 6) return toast.error("Password too short");
                  setBusy(true);
                  const v = await supabase.auth.verifyOtp({ phone: otpPhone, token: otpCode, type: "sms" });
                  if (v.error) { setBusy(false); return toast.error(v.error.message); }
                  const { error } = await supabase.auth.updateUser({ password: newPassword });
                  setBusy(false);
                  if (error) return toast.error(error.message);
                  toast.success("Password updated");
                  setOtpSent(false); setOtpCode(""); setNewPassword("");
                }}
                disabled={busy}
                className="w-full rounded-xl bg-sunset px-3 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
                Verify & set new password
              </button>
            </div>
          )}
        </div>

        <button
          onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 px-4 py-3 text-sm font-semibold text-destructive">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      <p className="px-2 text-center text-[11px] leading-relaxed text-muted-foreground">
        Your photos are stored privately and only shared with people you've invited to your circles.
      </p>
    </div>
  );
}
