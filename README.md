# Goodz Site Migration (Webflow -> static hosting)

Goal: move `getthegoodz.com` off Webflow incrementally.

## Scope for current phase
- Migrate static marketing pages first.
- Keep Shopify links unchanged for now (`shop.getthegoodz.com`).
- Preserve existing content/SEO structure while reducing Webflow lock-in.

## Current status (2026-03-17)
- Captured source snapshots from Webflow export pages.
- Established `static-pages/` working copy.
- Added newly captured static pages from live site:
  - `about.html`
  - `faq.html`
  - `contact.html`
  - `privacy.html`
  - `terms.html`
- Existing pages retained:
  - `index.html`
  - `custom.html`
  - `artist-goodz.html`
  - `support.html`

## Notes
- Current files still include Webflow runtime/scripts and externally hosted CSS/assets.
- Shopify buy/shop links are intentionally unchanged in this phase.

## Next steps
1. Remove Webflow JS dependencies where possible (starting with nav/accordion behavior alternatives).
2. Mirror CSS/assets locally (or via controlled CDN) to remove Webflow hosting dependency.
3. Validate analytics tags, forms, and SEO metadata parity.
4. Smoke-test page rendering and internal link integrity across all static pages.

## Sprint update (2026-03-17 afternoon)
- Added `vercel.json` at project root with clean routing for migrated static pages.
- Promoted current page snapshots to repo root HTML files for immediate static-host compatibility on Vercel.
  - `/`, `/about`, `/custom`, `/artist-goodz`, `/faq`, `/support`, `/contact`, `/privacy`, `/terms`
  - Compatibility aliases preserved: `/privacy-policy` -> `privacy.html`, `/terms-of-service` -> `terms.html`
- This means we can deploy the migration project to Vercel now and keep URL structure stable while we progressively remove Webflow dependencies.
