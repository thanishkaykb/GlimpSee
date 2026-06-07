import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/gimpsee-logo.png";
import { Camera, Heart, Users, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
  }, []);

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <img src={logo} alt="GlimpSee" width={36} height={36} className="rounded-xl shadow-glow" />
          <span className="font-display text-2xl font-bold">GlimpSee</span>
        </div>
        <Link
          to={authed ? "/feed" : "/auth"}
          className="rounded-full border border-border bg-card-soft px-5 py-2 text-sm font-medium hover:border-primary/50 transition"
        >
          {authed ? "Open app" : "Sign in"}
        </Link>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pt-12 pb-24 text-center">
        <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-sunset shadow-glow animate-pulse-glow">
          <img src={logo} alt="" width={96} height={96} className="rounded-full" />
        </div>
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card-soft px-4 py-1.5 text-xs uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Real moments. Just for your people.
        </p>
        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
          A glowing window<br />
          <span className="text-gradient-sunset">into your day.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Send a photo to your inner circle and watch it appear on their feed in seconds. No likes, no algorithm — just the people you love.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            to={authed ? "/feed" : "/auth"}
            className="group inline-flex items-center gap-2 rounded-full bg-sunset px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02]"
          >
            {authed ? "Open GlimpSee" : "Get started"}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <a href="#how" className="rounded-full border border-border bg-card-soft px-7 py-3.5 text-base font-medium hover:border-primary/40">
            How it works
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="how" className="relative mx-auto max-w-6xl px-6 pb-32">
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { icon: Users, title: "Tiny circles", desc: "Invite only the people who matter. Private by default." },
            { icon: Camera, title: "Capture & send", desc: "One tap to share a real moment to everyone in your circle." },
            { icon: Heart, title: "Soft reactions", desc: "Tap an emoji to say hi back. No counts, no pressure." },
          ].map((f, i) => (
            <div key={i} className="rounded-3xl border border-border bg-card-soft p-6 shadow-soft animate-float-in" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sunset shadow-glow">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-2xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl border border-border bg-card-soft p-8 text-center shadow-soft">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Secure by design</p>
          <h2 className="mt-3 font-display text-3xl font-semibold">Your photos. Your circle. <span className="text-gradient-sunset">Nobody else.</span></h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            Verified email or phone sign-in. Photos live in a private vault, encrypted at rest, served only via short-lived signed links to people you've explicitly invited.
          </p>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        Made with <Heart className="inline h-3 w-3 text-primary" /> for close friends
      </footer>
    </div>
  );
}
// trigger 1780728866572036487
