import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCircles, signedPhotoUrl } from "@/hooks/use-circles";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Users, Plus, Loader2, Download, Trash2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
});

const EMOJIS = ["❤️", "😂", "🔥", "😮", "🥹", "👏"];

type Post = {
  id: string;
  circle_id: string;
  author_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
  reactions?: { id: string; emoji: string; user_id: string }[];
};

function FeedPage() {
  const circles = useCircles();
  const qc = useQueryClient();
  const [activeCircle, setActiveCircle] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCircle && circles.data && circles.data.length > 0) {
      setActiveCircle(circles.data[0].id);
    }
  }, [circles.data, activeCircle]);

  const posts = useQuery({
    queryKey: ["posts", activeCircle],
    enabled: !!activeCircle,
    queryFn: async (): Promise<Post[]> => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, circle_id, author_id, storage_path, caption, created_at, profiles:profiles!posts_author_id_fkey(display_name, avatar_url), reactions(id, emoji, user_id)")
        .eq("circle_id", activeCircle!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        // fallback without profile join (in case fk name differs)
        const { data: d2, error: e2 } = await supabase
          .from("posts").select("id, circle_id, author_id, storage_path, caption, created_at, reactions(id, emoji, user_id)")
          .eq("circle_id", activeCircle!).order("created_at", { ascending: false }).limit(50);
        if (e2) throw e2;
        return (d2 ?? []) as any;
      }
      return (data ?? []) as any;
    },
  });

  useEffect(() => {
    if (!activeCircle) return;
    const ch = supabase
      .channel(`feed:${activeCircle}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: `circle_id=eq.${activeCircle}` }, () => {
        qc.invalidateQueries({ queryKey: ["posts", activeCircle] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, () => {
        qc.invalidateQueries({ queryKey: ["posts", activeCircle] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeCircle, qc]);

  if (circles.isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!circles.data || circles.data.length === 0) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-3xl border border-border bg-card-soft p-8 text-center shadow-soft animate-float-in">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sunset shadow-glow">
          <Users className="h-7 w-7 text-primary-foreground" />
        </div>
        <h2 className="font-display text-2xl font-bold">Start your first circle</h2>
        <p className="mt-2 text-sm text-muted-foreground">Invite a few close friends and start sharing tiny moments.</p>
        <Link to="/circles" className="mt-6 inline-flex items-center gap-2 rounded-full bg-sunset px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4" /> Create a circle
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Circle selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {circles.data.map((c) => (
          <button key={c.id} onClick={() => setActiveCircle(c.id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${activeCircle === c.id ? "border-primary bg-sunset text-primary-foreground shadow-glow" : "border-border bg-card-soft text-muted-foreground hover:text-foreground"}`}>
            {c.name} <span className="opacity-60">· {c.member_count ?? 1}</span>
          </button>
        ))}
        <Link to="/circles" className="shrink-0 inline-flex items-center gap-1 rounded-full border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
          <Plus className="h-3 w-3" /> new
        </Link>
      </div>

      {/* Capture CTA */}
      <Link to="/capture" className="flex items-center justify-between rounded-3xl border border-border bg-card-soft p-4 shadow-soft transition hover:border-primary/50">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sunset shadow-glow">
            <Camera className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold">Share a moment</p>
            <p className="text-xs text-muted-foreground">Snap or upload a photo for your circle</p>
          </div>
        </div>
        <span className="text-sm text-primary">→</span>
      </Link>

      {/* Posts */}
      {posts.isLoading && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
      {posts.data && posts.data.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No moments yet in this circle. Be the first to share.
        </div>
      )}
      <div className="space-y-5">
        {posts.data?.map((p, i) => <PostCard key={p.id} post={p} delay={i * 60} />)}
      </div>
    </div>
  );
}

function PostCard({ post, delay }: { post: Post; delay: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const qc = useQueryClient();
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    signedPhotoUrl(post.storage_path).then((u) => !cancel && setUrl(u)).catch(() => {});
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    return () => { cancel = true; };
  }, [post.storage_path]);

  const grouped = useMemo(() => {
    const m: Record<string, number> = {};
    post.reactions?.forEach((r) => { m[r.emoji] = (m[r.emoji] ?? 0) + 1; });
    return m;
  }, [post.reactions]);

  async function react(emoji: string) {
    if (!me) return;
    const existing = post.reactions?.find((r) => r.user_id === me && r.emoji === emoji);
    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("reactions").insert({ post_id: post.id, emoji, user_id: me });
    }
    qc.invalidateQueries({ queryKey: ["posts", post.circle_id] });
  }

  const name = post.profiles?.display_name ?? "Someone";
  const initial = name.charAt(0).toUpperCase();
  const mine = me === post.author_id;

  async function download() {
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `glimpsee-${new Date(post.created_at).getTime()}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { toast.error("Download failed"); }
  }

  async function del() {
    if (!confirm("Delete this moment forever?")) return;
    try {
      await supabase.storage.from("photos").remove([post.storage_path]);
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["posts", post.circle_id] });
    } catch (e: any) { toast.error(e.message ?? "Failed to delete"); }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card-soft shadow-soft animate-float-in" style={{ animationDelay: `${delay}ms` }}>
      <header className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sunset font-display text-base font-bold text-primary-foreground shadow-glow">
            {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt={name} className="h-full w-full rounded-full object-cover" /> : initial}
          </div>
          <div>
            <p className="text-sm font-semibold">{name}</p>
            <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={download} title="Download" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/50">
            <Download className="h-4 w-4" />
          </button>
          {mine && (
            <button onClick={del} title="Delete" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-destructive hover:border-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="relative aspect-square bg-muted">
        {url ? (
          <img src={url} alt={post.caption ?? "Moment"} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        )}
      </div>

      {post.caption && <p className="px-4 pt-3 text-sm">{post.caption}</p>}

      <div className="flex flex-wrap items-center gap-2 p-4">
        {EMOJIS.map((e) => {
          const count = grouped[e] ?? 0;
          const mine = post.reactions?.some((r) => r.user_id === me && r.emoji === e);
          return (
            <button key={e} onClick={() => react(e)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${mine ? "border-primary bg-primary/15" : "border-border bg-secondary/40 hover:border-primary/40"}`}>
              <span className="mr-1">{e}</span>{count > 0 && <span className="text-xs text-muted-foreground">{count}</span>}
            </button>
          );
        })}
      </div>
    </article>
  );
}
