# GlimpSee

Share real-time photos with your closest circles.

## Tech

- TanStack Start (React 19, Vite 7) on Cloudflare Workers (nitro)
- Supabase (database, auth, storage, realtime)
- Tailwind v4

## Local dev

```bash
bun install
bun run dev
```

## Environment

The following env vars are required (auto-injected on Lovable Cloud):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `LOVABLE_API_KEY` (server only)

## Deploy

### Recommended: Lovable Publish
Click **Publish** in the Lovable editor for instant deployment with SSR on the edge.

### Vercel
A `vercel.json` is included. Add the env vars above in Vercel → Project Settings → Environment Variables, then deploy. The project builds as a Vite app served as static + edge SSR via the nitro preset.

> Note: This stack targets Cloudflare Workers by default. For full SSR on Vercel you may need to switch the nitro preset to `vercel-edge`. Static client output works out of the box.
