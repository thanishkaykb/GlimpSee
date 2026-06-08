# GlimpSee

Share moments with your inner circle. Photos + short videos, end-to-end private circles.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. In **Project Settings → Environment Variables** add (copy the values from `.env`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
4. Leave **Framework Preset = Other** (the included `vercel.json` handles the rest).
5. Click **Deploy**.

The build uses `NITRO_PRESET=vercel bun run build` which emits the Vercel
Build Output API at `.vercel/output/`, so no `outputDirectory` is needed.

## Local dev

```bash
bun install
bun run dev
```
