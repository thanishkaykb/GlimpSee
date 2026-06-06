import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

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

      <p className="px-2 text-center text-[11px] leading-relaxed text-muted-foreground">
        Your photos are stored privately and only shared with people you've invited to your circles.
      </p>
    </div>
  );
}
