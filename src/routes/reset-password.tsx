import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import logo from "@/assets/gimpsee-logo.png";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasRecoveryLink = useMemo(() => {
    if (typeof window === "undefined") return false;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const search = new URLSearchParams(window.location.search);
    return hash.get("type") === "recovery" || search.get("type") === "recovery" || hash.has("access_token");
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session) || hasRecoveryLink);
    });
  }, [hasRecoveryLink]);

  async function savePassword() {
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSaved(true);
    toast.success("Password updated");
    setTimeout(() => navigate({ to: "/auth", replace: true }), 1200);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={logo} alt="GlimpSee" width={72} height={72} className="mx-auto rounded-2xl shadow-glow" />
          <h1 className="mt-5 font-display text-4xl font-bold">Reset your <span className="text-gradient-sunset">password</span></h1>
          <p className="mt-2 text-sm text-muted-foreground">Use the verified email link to set a new GlimpSee password.</p>
        </div>

        <div className="rounded-3xl border border-border bg-card-soft p-6 shadow-soft animate-float-in">
          {!ready ? (
            <div className="space-y-4 text-center">
              <KeyRound className="mx-auto h-8 w-8 text-primary" />
              <p className="text-sm text-muted-foreground">Open this page from the password reset link sent to your email.</p>
              <Link to="/auth" className="inline-flex rounded-2xl border border-border bg-secondary px-4 py-2 text-sm font-semibold hover:border-primary/50">
                Back to sign in
              </Link>
            </div>
          ) : saved ? (
            <div className="space-y-3 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <p className="text-sm text-muted-foreground">Your password was changed. Redirecting to sign in…</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); savePassword(); }} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground">New password</label>
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="mt-2 w-full rounded-2xl border border-border bg-input px-4 py-3 text-base outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="mt-2 w-full rounded-2xl border border-border bg-input px-4 py-3 text-base outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sunset px-4 py-3 text-base font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Set new password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}