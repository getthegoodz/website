# getthegoodz/website — working & deploy guide

This repo is the **production source for the live site at getthegoodz.com**. It is a mostly-static
site: root `*.html` marketing pages, `static-pages/` for the NFC "tapped" flow and branded album
pages, and `api/*` serverless functions.

## Deploy: push to `main` = live

- Hosting is **Vercel, git-integrated**. A push to `main` auto-deploys production to getthegoodz.com
  in ~1-2 minutes. There is no manual deploy step.
- **Vercel team (slug):** `mikerosenthals-projects`
- **Vercel project:** `goodz-website`
- **Production branch:** `main`
- You do **not** need a Vercel account or login. Do **NOT** run `vercel link` or `vercel --prod` —
  deploys run through the GitHub integration, not any local `.vercel` folder. Any local `.vercel*`
  is gitignored and irrelevant to how the site ships.

## Preview any branch before going live

Push any non-`main` branch and Vercel builds an isolated preview (production stays untouched):

```
https://goodz-website-git-<branch>-mikerosenthals-projects.vercel.app
```

Branch names are sanitized (slashes and odd characters become hyphens). Very long branch names
fall back to a hashed host, `goodz-website-<hash>-mikerosenthals-projects.vercel.app` (that hashed
form is also the deployment's `url` in the Vercel dashboard).

## Site layout

- Root `*.html` — marketing pages, served via `cleanUrls` (`/about`, `/faq`, `/contact`, etc.).
- `static-pages/` — NFC tapped flow (`tapped*.html`) and branded album/landing pages, routed by
  `vercel.json` rewrites.
- `api/*` — live serverless functions.
- `vercel.json` — routing and rewrites. Do not change the `/tapped` rewrite unless you mean to.

## Working rules

- `git pull` before you start and before you push. This repo is edited from multiple machines.
- Never force-push or rewrite history on `main`.
- If a push to `main` is rejected, someone pushed first: `git pull --rebase`, then push again.
