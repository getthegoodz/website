# Goodz style guides

Reference for how each customer-facing part of the site looks, so every future change matches
what is already there. **These guides describe the site; they do not change it.** Values were
measured from the live pages on 2026-10-10, not copied from memory.

## Which guide applies

| Section | Pages | Guide | How it's checked |
|---|---|---|---|
| **Marketing** | `/` `index.html`, `/custom`, `/mixtape`, `/about`, `/support`, `/contact`, `/apply`, privacy and terms pages | [marketing.md](marketing.md) | `scripts/style-check.py` + this checklist |
| **Order flow** | `/order` (`order.html`, Customize step) and `/artwork-upload` (`artwork-upload.html`: Music, Artwork, Review steps) | [order-flow.md](order-flow.md) | `scripts/style-check.py` + this checklist |
| **Shopify store** | `shop.getthegoodz.com`: storefront, product pages, cart | [shopify.md](shopify.md) | Checklist only (the theme lives in Shopify, not this repo) |

**Not covered yet (deferred):** the tap pages in `static-pages/` (the NFC tap flow, `/landing/*`,
`/handles/*`, album pages, 404). They are planned as a fourth guide once they are rebuilt; until
then they are excluded from the style check. Also excluded: internal or unlinked pages (the old
Bandcamp Builder at `/custom-goodz`, old page copies in `static-pages/`, test pages).

## The style test (required for every change, by anyone)

1. **Find the section** of every page you are changing (table above).
2. **Read that section's guide.** Match what is already on *that* page, not another section;
   the sections deliberately differ (for example, marketing buttons are uppercase, order-flow
   buttons are sentence case).
3. **Reuse existing classes and tokens** (`var(--…)`) instead of copying values. A new element
   should look like its nearest existing sibling on the same page.
4. **Run the check:** `python3 scripts/style-check.py` (it also runs automatically on every push).
   It **warns, never blocks.** It reports problems on the lines *your change* added or edited;
   older problems elsewhere are not your change's fault and are listed separately
   (`--all` prints them). On pushes the warnings appear on the commit in GitHub, and once a
   change reaches `main` the full list is kept in one GitHub issue, **"Style drift to fix later"**,
   so it gets fixed in a future pass.
5. **Record the result in the `CHANGELOG.md` entry:** `Style check: passed` or
   `Style check: N warnings (logged)`.

**What the check looks at:** colors outside the section's palette, colors written out where a
token exists, fonts the section doesn't use, order-flow corner radii, button classes borrowed from
the other section, missing font or stylesheet links, legacy pages, and new pages that haven't been
assigned a section. It can't judge layout, spacing or copy, so steps 2 and 3 still matter. New
`--` tokens aren't checked; add any new token to its guide in the same change.

For Shopify theme edits, steps 1–3 and 5 apply; check the result against [shopify.md](shopify.md)
by eye.

## Decisions needed (cross-section inconsistencies)

These differ between sections today. Each guide documents what exists; these are for Chris and
Mike to decide whether to unify:

1. **Button style differs in every section.** Marketing: Inter 700, uppercase, tracked.
   Order flow: DM Sans 700, sentence case. Shopify: Poppins 400, uppercase.
2. **Black:** the site uses warm black `#0e0c0a`; the Shopify footer uses pure black `#000`.
3. **Cream:** the site background is `#efefe2`; Shopify is `#f0efe1` (visually identical, but
   different values).
4. **Headline weight:** Poppins 800 on the site, 900 on Shopify.
5. **Button corners:** 6px on the site, 8px on Shopify.
6. **Legacy marketing pages:** `/faq` and `/artist-goodz` still use the old Webflow stylesheet,
   with different fonts and colors from every other page.
