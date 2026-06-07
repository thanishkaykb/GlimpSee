import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCircles, signedPhotoUrl } from "@/hooks/use-circles";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, X, Download, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from "date-fns";

export const Route = createFileRoute("/_authenticated/memories")({
  component: MemoriesPage,
});

type Post = {
  id: string;
  circle_id: string;
  author_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
};

function MemoriesPage() {
  const circles = useCircles();
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [viewing, setViewing] = useState<{ post: Post; url: string } | null>(null);

  const circleIds = useMemo(() => (circles.data ?? []).map((c) => c.id), [circles.data]);

  const posts = useQuery({
    queryKey: ["memories", month.getFullYear(), month.getMonth(), circleIds.join(",")],
    enabled: circleIds.length > 0,
    queryFn: async (): Promise<Post[]> => {
      const from = startOfMonth(month).toISOString();
      const to = endOfMonth(month).toISOString();
      const { data, error } = await supabase
        .from("posts")
        .select("id, circle_id, author_id, storage_path, caption, created_at")
        .in("circle_id", circleIds)
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Post[];
    },
  });

  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }), [month]);
  const leadBlanks = getDay(startOfMonth(month));

  const postsByDay = useMemo(() => {
    const m: Record<string, Post[]> = {};
    (posts.data ?? []).forEach((p) => {
      const k = format(new Date(p.created_at), "yyyy-MM-dd");
      (m[k] ||= []).push(p);
    });
    return m;
  }, [posts.data]);

  const selectedPosts = selectedDay ? postsByDay[format(selectedDay, "yyyy-MM-dd")] ?? [] : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">
          <span className="text-gradient-sunset">Memories</span>
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth(subMonths(month, 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card-soft hover:border-primary/50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[8rem] text-center font-display text-lg font-semibold">{format(month, "MMMM yyyy")}</span>
          <button onClick={() => setMonth(addMonths(month, 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card-soft hover:border-primary/50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card-soft p-4 shadow-soft">
        <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: leadBlanks }).map((_, i) => <div key={`b${i}`} />)}
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const dayPosts = postsByDay[key] ?? [];
            const has = dayPosts.length > 0;
            const today = isSameDay(d, new Date());
            return (
              <button
                key={key}
                onClick={() => has && setSelectedDay(d)}
                disabled={!has}
                className={`relative aspect-square rounded-full border text-sm font-medium transition ${
                  has
                    ? "border-primary bg-sunset text-primary-foreground shadow-glow hover:scale-105 cursor-pointer"
                    : "border-border/40 bg-background/40 text-muted-foreground"
                } ${today ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
              >
                {d.getDate()}
                {has && (
                  <span className="absolute -bottom-1 -right-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-background px-1 text-[10px] font-bold text-primary border border-primary">
                    {dayPosts.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {posts.isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
      {circleIds.length === 0 && !circles.isLoading && (
        <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Join or create a circle to see your memories here.
        </div>
      )}

      {/* Day grid modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-float-in" onClick={() => setSelectedDay(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-border bg-card-soft p-5 shadow-glow">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{format(selectedDay, "EEEE")}</p>
                <h2 className="font-display text-2xl font-bold">{format(selectedDay, "MMMM d, yyyy")}</h2>
              </div>
              <button onClick={() => setSelectedDay(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {selectedPosts.map((p) => <DayThumb key={p.id} post={p} onOpen={(url) => setViewing({ post: p, url })} />)}
            </div>
          </div>
        </div>
      )}

      {/* Single photo viewer */}
      {viewing && (
        <PhotoViewer
          post={viewing.post}
          url={viewing.url}
          onClose={() => setViewing(null)}
          onDeleted={() => { setViewing(null); }}
        />
      )}
    </div>
  );
}

function DayThumb({ post, onOpen }: { post: Post; onOpen: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let c = false;
    signedPhotoUrl(post.storage_path).then((u) => !c && setUrl(u)).catch(() => {});
    return () => { c = true; };
  }, [post.storage_path]);
  return (
    <button onClick={() => url && onOpen(url)} className="group relative aspect-square overflow-hidden rounded-2xl bg-muted ring-1 ring-border transition hover:ring-primary">
      {url ? (
        <img src={url} alt={post.caption ?? ""} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
      ) : (
        <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      )}
    </button>
  );
}

function PhotoViewer({ post, url, onClose, onDeleted }: { post: Post; url: string; onClose: () => void; onDeleted: () => void }) {
  const qc = useQueryClient();
  const [me, setMe] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);

  const mine = me === post.author_id;

  async function download() {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `glimpsee-${format(new Date(post.created_at), "yyyy-MM-dd-HHmm")}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Download failed");
    }
  }

  async function del() {
    if (!confirm("Delete this moment forever?")) return;
    setDeleting(true);
    try {
      await supabase.storage.from("photos").remove([post.storage_path]);
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["memories"] });
      qc.invalidateQueries({ queryKey: ["posts", post.circle_id] });
      onDeleted();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg">
        <img src={url} alt={post.caption ?? ""} className="w-full rounded-2xl shadow-glow" />
        {post.caption && <p className="mt-3 text-center text-sm text-white/80">{post.caption}</p>}
        <p className="mt-1 text-center text-xs text-white/50">{format(new Date(post.created_at), "PPpp")}</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={download} className="inline-flex items-center gap-2 rounded-full bg-sunset px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
            <Download className="h-4 w-4" /> Download
          </button>
          {mine && (
            <button onClick={del} disabled={deleting} className="inline-flex items-center gap-2 rounded-full border border-destructive bg-destructive/20 px-4 py-2 text-sm font-semibold text-destructive">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
            </button>
          )}
          <button onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
