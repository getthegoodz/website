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

## Contributor setup (one-time, required)

Vercel on the Hobby plan can silently skip deploys for commits from unrecognized authors: the push
succeeds, the deploy never happens, and nothing tells you. This repo carries a pre-push guard
(`.githooks/pre-push`) that refuses pushes containing commits from identities not on the known-good
allowlist. There is no npm flow here, so wire it up manually after cloning:

```
git config core.hooksPath .githooks
```

New contributors should also author commits as the shared Goodz identity:

```
git config user.name "Goodz"
git config user.email "272060531+getthegoodz@users.noreply.github.com"
```

(Existing contributors already on the allowlist can keep their current identity.)

## Layout

- Root `*.html` — marketing pages (served via `cleanUrls`).
- `static-pages/` — NFC tapped flow and branded album/landing pages (routed by `vercel.json`).
- `api/*` — serverless functions.
- `vercel.json` — routing and rewrites.
