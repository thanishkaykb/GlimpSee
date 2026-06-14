import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Home, Users, User as UserIcon, LogOut, Calendar, Sparkles, Loader2 } from "lucide-react";
import logo from "@/assets/gimpsee-logo.png";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const loc = useLocation();

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  const tabs: { to: "/feed" | "/capture" | "/memories" | "/circles" | "/profile"; icon: typeof Home; label: string }[] = [
    { to: "/feed", icon: Home, label: "Feed" },
    { to: "/capture", icon: Camera, label: "Capture" },
    { to: "/memories", icon: Calendar, label: "Memories" },
    { to: "/circles", icon: Users, label: "Circles" },
    { to: "/profile", icon: UserIcon, label: "Profile" },
  ];

  return (
    <div className="min-h-screen pb-[7.5rem]" style={{ paddingBottom: "calc(7.5rem + env(safe-area-inset-bottom))" }}>
      <NameGate />
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-5">
          <Link to="/feed" className="flex min-w-0 items-center gap-2">
            <img src={logo} alt="" width={32} height={32} className="shrink-0 rounded-lg shadow-glow" />
            <span className="truncate font-display text-xl font-bold">GlimpSee</span>
          </Link>
          <button onClick={signOut} aria-label="Sign out" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border hover:border-primary/50">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5">
        <Outlet />
      </main>

      <nav
        className="fixed bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-full border border-border bg-card-soft px-1.5 py-1.5 shadow-glow sm:bottom-4 sm:px-2 sm:py-2"
        style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-0.5 sm:gap-1">
          {tabs.map((t) => {
            const active = loc.pathname === t.to || (t.to === "/feed" && loc.pathname === "/");
            return (
              <Link key={t.to} to={t.to} aria-label={t.label}
                className={`flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium transition sm:h-12 sm:px-4 ${active ? "bg-sunset text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
                <t.icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function NameGate() {
  const [needs, setNeeds] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUid(u.user.id);
      // Ensure profile row exists (in case trigger missed an existing user)
      await supabase.from("profiles").upsert({ id: u.user.id }, { onConflict: "id" });
      const { data } = await supabase.from("profiles").select("display_name").eq("id", u.user.id).maybeSingle();
      if (!data?.display_name) setNeeds(true);
    })();
  }, []);

  async function save() {
    const n = name.trim();
    if (n.length < 2) return toast.error("Please enter your name");
    if (!uid) return;
    setSaving(true);
    const { error } = await supabase.from("profiles")
      .update({ display_name: n, updated_at: new Date().toISOString() })
      .eq("id", uid);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Welcome, ${n}!`);
    setNeeds(false);
  }

  if (!needs) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card-soft p-6 shadow-glow animate-float-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sunset shadow-glow">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>
        <h2 className="text-center font-display text-2xl font-bold">What should we call you?</h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">This is how friends will see you on GlimpSee.</p>
        <input
          autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
          placeholder="Your name"
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="mt-5 w-full rounded-2xl border border-border bg-input px-4 py-3 text-base outline-none focus:border-primary" />
        <button onClick={save} disabled={saving}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-sunset px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Continue
        </button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">You can change this anytime in your profile.</p>
      </div>
    </div>
  );
}
