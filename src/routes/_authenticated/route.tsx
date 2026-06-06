import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Home, Users, User as UserIcon, LogOut } from "lucide-react";
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

  const tabs: { to: "/feed" | "/capture" | "/circles" | "/profile"; icon: typeof Home; label: string }[] = [
    { to: "/feed", icon: Home, label: "Feed" },
    { to: "/capture", icon: Camera, label: "Capture" },
    { to: "/circles", icon: Users, label: "Circles" },
    { to: "/profile", icon: UserIcon, label: "Profile" },
  ];

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link to="/feed" className="flex items-center gap-2">
            <img src={logo} alt="" width={32} height={32} className="rounded-lg shadow-glow" />
            <span className="font-display text-xl font-bold">Gimpsee</span>
          </Link>
          <button onClick={signOut} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border hover:border-primary/50">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6">
        <Outlet />
      </main>

      <nav className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-border bg-card-soft px-2 py-2 shadow-glow">
        <div className="flex items-center gap-1">
          {tabs.map((t) => {
            const active = loc.pathname === t.to || (t.to === "/feed" && loc.pathname === "/");
            return (
              <Link key={t.to} to={t.to} className={`flex h-12 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${active ? "bg-sunset text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
