import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCircles } from "@/hooks/use-circles";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Copy, Sparkles, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/circles")({
  component: CirclesPage,
});

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function CirclesPage() {
  const circles = useCircles();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  async function createCircle() {
    if (!name.trim()) return toast.error("Give your circle a name");
    setCreating(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("circles").insert({
      name: name.trim(),
      join_code: randomCode(),
      created_by: u.user!.id,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("Circle created");
    setName("");
    qc.invalidateQueries({ queryKey: ["circles"] });
  }

  async function joinCircle() {
    if (code.trim().length < 4) return toast.error("Enter a join code");
    setJoining(true);
    const { error } = await supabase.rpc("join_circle_by_code", { _code: code.trim().toUpperCase() });
    setJoining(false);
    if (error) return toast.error(error.message);
    toast.success("Joined! 🎉");
    setCode("");
    qc.invalidateQueries({ queryKey: ["circles"] });
  }

  async function leave(id: string) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("circle_members").delete().eq("circle_id", id).eq("user_id", u.user!.id);
    if (error) return toast.error(error.message);
    toast.success("Left circle");
    qc.invalidateQueries({ queryKey: ["circles"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Your <span className="text-gradient-sunset">circles</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">Tiny groups of people you share with.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card-soft p-5 shadow-soft">
          <div className="mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h2 className="font-display text-lg font-semibold">Create a circle</h2></div>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Best friends" className="w-full rounded-2xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <button onClick={createCircle} disabled={creating} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-sunset px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
          </button>
        </div>

        <div className="rounded-3xl border border-border bg-card-soft p-5 shadow-soft">
          <div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><h2 className="font-display text-lg font-semibold">Join with code</h2></div>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="6-character code" className="w-full rounded-2xl border border-border bg-input px-4 py-2.5 text-center text-lg tracking-[0.4em] outline-none focus:border-primary" />
          <button onClick={joinCircle} disabled={joining} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-secondary px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {circles.isLoading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />}
        {circles.data?.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-3xl border border-border bg-card-soft p-4 shadow-soft">
            <div>
              <p className="font-display text-lg font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.member_count ?? 1} member{(c.member_count ?? 1) > 1 ? "s" : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { navigator.clipboard.writeText(c.join_code); toast.success("Code copied"); }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-mono tracking-widest hover:border-primary/40">
                <Copy className="h-3 w-3" /> {c.join_code}
              </button>
              <button onClick={() => leave(c.id)} title="Leave" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {circles.data && circles.data.length === 0 && (
          <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No circles yet. Create one or join with a code.</p>
        )}
      </div>
    </div>
  );
}
