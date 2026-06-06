import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCircles } from "@/hooks/use-circles";
import { Camera, Upload, RotateCcw, Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/capture")({
  component: CapturePage,
});

function CapturePage() {
  const navigate = useNavigate();
  const circles = useCircles();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [caption, setCaption] = useState("");
  const [circleIds, setCircleIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        stream?.getTracks().forEach((t) => t.stop());
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (e: any) {
        setCamError("Camera unavailable. You can still upload a photo.");
      }
    }
    if (!preview) start();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing, preview]);

  useEffect(() => () => { stream?.getTracks().forEach((t) => t.stop()); }, [stream]);

  useEffect(() => {
    if (circles.data && circles.data.length && circleIds.size === 0) {
      setCircleIds(new Set([circles.data[0].id]));
    }
  }, [circles.data, circleIds.size]);

  function snap() {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    const size = Math.min(v.videoWidth, v.videoHeight);
    c.width = size; c.height = size;
    const ctx = c.getContext("2d")!;
    const sx = (v.videoWidth - size) / 2, sy = (v.videoHeight - size) / 2;
    if (facing === "user") { ctx.translate(size, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, sx, sy, size, size, 0, 0, size, size);
    c.toBlob((b) => {
      if (!b) return;
      setBlob(b);
      setPreview(URL.createObjectURL(b));
      stream?.getTracks().forEach((t) => t.stop());
      setStream(null);
    }, "image/jpeg", 0.9);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBlob(f);
    setPreview(URL.createObjectURL(f));
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }

  function retake() {
    setPreview(null); setBlob(null);
  }

  async function send() {
    if (!blob) return;
    if (circleIds.size === 0) return toast.error("Pick a circle to share to");
    setSending(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const ts = Date.now();
      for (const cid of Array.from(circleIds)) {
        const path = `${cid}/${uid}/${ts}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: upErr } = await supabase.storage.from("photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw upErr;
        const { error: pErr } = await supabase.from("posts").insert({ circle_id: cid, author_id: uid, storage_path: path, caption: caption || null });
        if (pErr) throw pErr;
      }
      toast.success("Sent ✨");
      navigate({ to: "/feed" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-bold">Capture <span className="text-gradient-sunset">a moment</span></h1>

      <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-black shadow-soft">
        {preview ? (
          <img src={preview} alt="preview" className="h-full w-full object-cover" />
        ) : camError ? (
          <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">{camError}</div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover ${facing === "user" ? "scale-x-[-1]" : ""}`} />
        )}
        <canvas ref={canvasRef} className="hidden" />
        {preview && (
          <button onClick={retake} className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {!preview ? (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => fileRef.current?.click()} className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card-soft">
            <Upload className="h-5 w-5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          <button onClick={snap} disabled={!stream}
            className="h-20 w-20 rounded-full bg-sunset shadow-glow ring-4 ring-background animate-pulse-glow disabled:opacity-50">
            <Camera className="mx-auto h-7 w-7 text-primary-foreground" />
          </button>
          <button onClick={() => setFacing(facing === "user" ? "environment" : "user")} className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card-soft">
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="space-y-4 rounded-3xl border border-border bg-card-soft p-4 shadow-soft">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={140}
            placeholder="Add a caption (optional)"
            className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Send to</p>
            <div className="flex flex-wrap gap-2">
              {circles.data?.map((c) => {
                const on = circleIds.has(c.id);
                return (
                  <button key={c.id}
                    onClick={() => {
                      const n = new Set(circleIds);
                      on ? n.delete(c.id) : n.add(c.id);
                      setCircleIds(n);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-primary bg-sunset text-primary-foreground shadow-glow" : "border-border bg-secondary/40"}`}>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={send} disabled={sending || circleIds.size === 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sunset px-4 py-3.5 text-base font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send moment
          </button>
        </div>
      )}
    </div>
  );
}
