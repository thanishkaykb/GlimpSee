import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Mail, Phone, ArrowLeft, Loader2, KeyRound } from "lucide-react";
import logo from "@/assets/gimpsee-logo.png";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type Mode = "choose" | "email" | "phone" | "verify-email" | "verify-phone";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("choose");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/feed", replace: true });
    });
  }, [navigate]);

  async function sendEmailOtp() {
    if (!email.includes("@")) return toast.error("Enter a valid email");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/feed` },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email for a 6-digit code");
    setMode("verify-email");
  }

  async function verifyEmail() {
    if (code.length < 6) return toast.error("Enter the 6-digit code");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome!");
    navigate({ to: "/feed", replace: true });
  }

  async function sendPhoneOtp() {
    if (!phone.startsWith("+") || phone.length < 8) return toast.error("Use international format e.g. +14155550100");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("sms") || error.message.toLowerCase().includes("provider")) {
        toast.error("Phone sign-in needs an SMS provider configured. Try email for now.");
      } else toast.error(error.message);
      return;
    }
    toast.success("Code sent via SMS");
    setMode("verify-phone");
  }

  async function verifyPhone() {
    if (code.length < 6) return toast.error("Enter the 6-digit code");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: "sms" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome!");
    navigate({ to: "/feed", replace: true });
  }

  async function googleSignIn() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/feed` });
    if (result.error) {
      setLoading(false);
      toast.error("Couldn't start Google sign-in");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/feed", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={logo} alt="GlimpSee" width={72} height={72} className="mx-auto rounded-2xl shadow-glow" />
          <h1 className="mt-5 font-display text-4xl font-bold">Welcome to <span className="text-gradient-sunset">GlimpSee</span></h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to share moments with your circle.</p>
        </div>

        <div className="rounded-3xl border border-border bg-card-soft p-6 shadow-soft animate-float-in">
          {mode !== "choose" && (
            <button onClick={() => { setMode("choose"); setCode(""); }} className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
          )}

          {mode === "choose" && (
            <div className="space-y-3">
              <button
                onClick={googleSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
              >
                <GoogleIcon /> Continue with Google
              </button>
              <button
                onClick={() => setMode("email")}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-medium hover:border-primary/50"
              >
                <Mail className="h-4 w-4" /> Continue with email
              </button>
              <button
                onClick={() => setMode("phone")}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-medium hover:border-primary/50"
              >
                <Phone className="h-4 w-4" /> Continue with phone
              </button>
              <p className="pt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
                We'll send a one-time code to verify it's really you.
              </p>
              <button
                type="button"
                onClick={async () => {
                  const target = window.prompt("Enter your account email for a reset link");
                  if (!target) return;
                  if (!target.includes("@")) return toast.error("Enter a valid email");
                  setLoading(true);
                  const { error } = await supabase.auth.resetPasswordForEmail(target, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  setLoading(false);
                  if (error) return toast.error(error.message);
                  toast.success("Password reset link sent");
                }}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 pt-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                <KeyRound className="h-3.5 w-3.5" /> Forgot password?
              </button>
            </div>
          )}

          {mode === "email" && (
            <form onSubmit={(e) => { e.preventDefault(); sendEmailOtp(); }} className="space-y-4">
              <label className="block text-xs uppercase tracking-widest text-muted-foreground">Email</label>
              <input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-base outline-none focus:border-primary" />
              <SubmitBtn loading={loading}>Send code</SubmitBtn>
            </form>
          )}

          {mode === "phone" && (
            <form onSubmit={(e) => { e.preventDefault(); sendPhoneOtp(); }} className="space-y-4">
              <label className="block text-xs uppercase tracking-widest text-muted-foreground">Phone</label>
              <input type="tel" autoFocus value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 415 555 0100"
                className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-base outline-none focus:border-primary" />
              <p className="text-[11px] text-muted-foreground">Use international format with country code.</p>
              <SubmitBtn loading={loading}>Send SMS code</SubmitBtn>
            </form>
          )}

          {(mode === "verify-email" || mode === "verify-phone") && (
            <form onSubmit={(e) => { e.preventDefault(); mode === "verify-email" ? verifyEmail() : verifyPhone(); }} className="space-y-4">
              <label className="block text-xs uppercase tracking-widest text-muted-foreground">6-digit code</label>
              <input inputMode="numeric" autoFocus value={code} maxLength={6}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-primary" />
              <SubmitBtn loading={loading}>Verify & continue</SubmitBtn>
              <button type="button" onClick={() => mode === "verify-email" ? sendEmailOtp() : sendPhoneOtp()}
                className="w-full text-xs text-muted-foreground hover:text-foreground">
                Resend code
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmitBtn({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sunset px-4 py-3 text-base font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:opacity-60">
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}{children}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.3 9.14 5.38 12 5.38Z"/></svg>
  );
}
