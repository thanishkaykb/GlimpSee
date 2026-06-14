// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const backendUrl = "https://pcjcvdbhwnhvkeoljjth.supabase.co";
const backendPublishableKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InBjamN2ZGJod25odmtlb2xqanRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MjI0MDAsImV4cCI6MjA5NjI5ODQwMH0.STXx92IjNZRurbDpMCsGI5FEyg9BSgwjpQwO3vxnqtI";

export default defineConfig({
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(backendUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(backendPublishableKey),
      "process.env.SUPABASE_URL": JSON.stringify(backendUrl),
      "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(backendPublishableKey),
    },
  },
  nitro: {
    preset: "vercel",
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
