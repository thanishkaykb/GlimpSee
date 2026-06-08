import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCircles } from "@/hooks/use-circles";
import { Camera, Upload, RotateCcw, Send, X, Loader2, Video, Square } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/capture")({
  component: CapturePage,
});

const MAX_VIDEO_MS = 15000;

function CapturePage() {
  const navigate = useNavigate();
  const circles = useCircles();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordTimer = useRef<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [circleIds, setCircleIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        stream?.getTracks().forEach((t) => t.stop());
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: true,
        });
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch {
        setCamError("Camera unavailable. You can still upload a photo or video.");
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
      setMediaType("image");
      setPreview(URL.createObjectURL(b));
      stream?.getTracks().forEach((t) => t.stop());
      setStream(null);
    }, "image/jpeg", 0.9);
  }

  function pickMime() {
    const opts = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
    for (const o of opts) if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(o)) return o;
    return "";
  }

  function startRecording() {
    if (!stream) return;
    const mime = pickMime();
    let rec: MediaRecorder;
    try { rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); }
    catch { return toast.error("Recording not supported on this device"); }
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const b = new Blob(chunks, { type: mime || "video/webm" });
      setBlob(b);
      setMediaType("video");
      setPreview(URL.createObjectURL(b));
      setRecording(false);
      setRecordSec(0);
      stream?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
    recorderRef.current = rec;
    rec.start();
    setRecording(true);
    const started = Date.now();
    recordTimer.current = window.setInterval(() => {
      const elapsed = Date.now() - started;
      setRecordSec(Math.floor(elapsed / 1000));
      if (elapsed >= MAX_VIDEO_MS) stopRecording();
    }, 250);
  }

  function stopRecording() {
    if (recordTimer.current) { clearInterval(recordTimer.current); recordTimer.current = null; }
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) return toast.error("Files must be under 50MB");
    setBlob(f);
    setMediaType(f.type.startsWith("video/") ? "video" : "image");
    setPreview(URL.createObjectURL(f));
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }

  function retake() {
    setPreview(null); setBlob(null); setMediaType("image");
  }

  async function send() {
    if (!blob) return;
    if (circleIds.size === 0) return toast.error("Pick a circle to share to");
    setSending(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const ts = Date.now();
      const ext = mediaType === "video" ? (blob.type.includes("mp4") ? "mp4" : "webm") : "jpg";
      const contentType = mediaType === "video" ? (blob.type || "video/webm") : "image/jpeg";
      for (const cid of Array.from(circleIds)) {
        const path = `${cid}/${uid}/${ts}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("photos").upload(path, blob, { contentType, upsert: false });
        if (upErr) throw upErr;
        const { error: pErr } = await supabase.from("posts").insert({
          circle_id: cid, author_id: uid, storage_path: path, caption: caption || null, media_type: mediaType,
        });
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
          mediaType === "video"
            ? <video src={preview} controls playsInline className="h-full w-full object-cover" />
            : <img src={preview} alt="preview" className="h-full w-full object-cover" />
        ) : camError ? (
          <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">{camError}</div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover ${facing === "user" ? "scale-x-[-1]" : ""}`} />
        )}
        <canvas ref={canvasRef} className="hidden" />
        {recording && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-xs font-semibold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC {recordSec}s
          </div>
        )}
        {preview && (
          <button onClick={retake} className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {!preview ? (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => fileRef.current?.click()} title="Upload"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card-soft">
            <Upload className="h-5 w-5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={onFile} />

          {!recording ? (
            <>
              <button onClick={snap} disabled={!stream} title="Take photo"
                className="h-20 w-20 rounded-full bg-sunset shadow-glow ring-4 ring-background animate-pulse-glow disabled:opacity-50">
                <Camera className="mx-auto h-7 w-7 text-primary-foreground" />
              </button>
              <button onClick={startRecording} disabled={!stream} title="Record video"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-red-500/60 bg-card-soft text-red-500 disabled:opacity-50">
                <Video className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button onClick={stopRecording} title="Stop"
              className="h-20 w-20 rounded-full bg-red-600 shadow-glow ring-4 ring-background">
              <Square className="mx-auto h-6 w-6 fill-white text-white" />
            </button>
          )}

          <button onClick={() => setFacing(facing === "user" ? "environment" : "user")} title="Flip camera"
            disabled={recording}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card-soft disabled:opacity-50">
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
              {circles.data && circles.data.length === 0 && (
                <p className="text-xs text-muted-foreground">No circles yet. Create one first.</p>
              )}
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
