# getthegoodz.com

Production source for the live **getthegoodz.com** website. Mostly-static: root `*.html` marketing
pages, `static-pages/` for the NFC "tapped" flow and branded album pages, and `api/*` serverless
functions. Hosted on Vercel.

Live since June 2026 (this redesign replaced the prior Webflow site).

## Deploy

Hosted on Vercel via the GitHub integration. **Push to `main` → auto-deploys to getthegoodz.com.**
Push any other branch to get an isolated preview URL. Full working and deploy guide, including the
Vercel team/project and preview-URL pattern, is in [`CLAUDE.md`](./CLAUDE.md).

Do not run `vercel link` or `vercel --prod`; deploys go through the GitHub integration, and local
`.vercel*` folders are gitignored and not authoritative.

## Layout

- Root `*.html` — marketing pages (served via `cleanUrls`).
- `static-pages/` — NFC tapped flow and branded album/landing pages (routed by `vercel.json`).
- `api/*` — serverless functions.
- `vercel.json` — routing and rewrites.
