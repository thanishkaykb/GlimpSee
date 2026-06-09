# GlimpSee

Share moments with your inner circle. Photos + short videos, end-to-end private circles.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. In **Project Settings → Environment Variables** add the values from your local `.env` file:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
4. Leave **Framework Preset = Other**. The included `vercel.json` sets:
   - Build command: `bun run build`
   - Output directory: `dist/client`
   - SPA rewrites so refresh/deep links do not 404
5. Click **Deploy**.

Do not commit `.env`; it is intentionally ignored. Add those variables in Vercel instead.

## Local dev

```bash
bun install
bun run dev
```
