# Marketing pages style guide

**Applies to:** `index.html` (`/`), `custom.html`, `mixtape.html`, `about.html`, `support.html`,
`contact.html`, `apply.html`, `privacy.html`, `privacy-policy.html`, `terms.html`,
`terms-of-service.html`.

**Stylesheets:** every page loads `style.css` (base) then `style-warm.css` (the "warm skin").
The warm skin's values win; `style.css`'s own palette (amber `#E8A820`, black `#111`, white
`#fff`…) is overridden and must not be used directly. Page-specific styles live in each page's
`<style>` block. Measured live on 2026-10-10.

## Colors: use the tokens

| Token | Value | Use |
|---|---|---|
| `--black` | `#0e0c0a` | Hero, nav, CTA band and footer backgrounds; borders of featured modules |
| `--white` | `#efefe2` | **Cream**, despite the name: page background, and text on black |
| `--off-white` | `#e4e4d6` | Panels and modules on the cream page |
| `--amber` | `#ffc852` | Primary buttons; eyebrow text and icon on dark backgrounds |
| `--amber-dark` | `#e6b044` | Primary button hover |
| `--amber-ink` | `#8a5a00` | Amber glyphs on light backgrounds (the ✦ bullets) |
| `--text` | `#1a1510` | Body text and headings on cream |
| `--text-light` | `#6b6354` | Secondary text: feature lists, FAQ answers |
| `--text-lighter` | `#9a8e7e` | Tertiary text |
| `--border-inner` | `1px solid #cdc8b2` | Hairlines and dividers |
| `--border` | `2px solid #2e2a1e` | Heavy outlines |

The nav bar is frosted black: `rgba(14, 12, 10, 0.92)` with a blur. Pure white `#fff` appears only
inside small pills and badges. Shadows and overlays use black or white at partial opacity
(`rgba(0,0,0,…)`). Form success and error messages use the status colors listed in
[order-flow.md](order-flow.md#colors-use-the-tokens).

## Typography: three fonts, each with one job

| Role | Font | Spec |
|---|---|---|
| Headlines | **Poppins 800, uppercase** | Hero h1 `clamp(2.25rem, 4vw, 3.5rem)` (56px desktop), letter-spacing −0.01em; section h2 `2rem`; card headings ~1.5rem |
| Prices | **Poppins 800** | `1.5rem` to `2rem`, with the unit in small DM Sans: `$5 / 1 sample card` |
| Everything you read | **DM Sans** | Body `1rem`/1.5 in `--text`; hero subtitle `1.05rem`/1.8; feature lists `0.92rem` in `--text-light`; FAQ answers `0.875rem`/1.8; footer links `0.78rem` |
| Nav links | **DM Sans** | `0.78rem`, uppercase, letter-spacing 0.06em |
| Labels and actions | **Inter 700, uppercase** | Buttons `0.82rem` +0.06em; eyebrow labels `0.875rem` +0.2em; FAQ questions Inter 600 `0.92rem` (sentence case) |

Fonts are loaded by Poppins + Inter `<link>` tags in each page's `<head>`, and DM Sans by an
`@import` in `style-warm.css`. **A new marketing page must include both `<link>` tags and load
`style-warm.css`**, or text falls back to system fonts.

## Components

**Primary button**: `class="btn btn-amber"`. Amber background, black text, 2px amber border,
6px corners, padding `0.9rem 2rem`, Inter 700 `0.82rem` uppercase. Hover: `--amber-dark`.
Example: "Start Your Order →".

**Secondary button on dark**: `class="btn btn-ghost"`. Transparent, cream text, 2px border at
`rgba(255,255,255,0.35)`, which turns solid cream on hover. Example: "Try a Sample".

**Primary + secondary pairing:** wherever an order action sits next to a sample action (hero,
closing CTA band), the order gets `btn-amber` and the sample gets the outlined secondary.

**Eyebrow label**: `class="section-label"` (add `on-dark` on black). Inter 700 uppercase
`0.875rem` +0.2em, with a small square outline icon in front (1.5px border, same color as the
text). On cream it's `--text`; on black it's `--amber`.

**Featured module** (e.g. "Try One First" on `/custom`): 2px `--black` border, 14px corners,
`--off-white` background, photo panel divided by a 1px black line, optional pill badge (white,
1.5px black border, fully rounded, `0.6rem` 800 uppercase).

**Feature bullets**: `class="usp-list"`. A ✦ glyph in `--amber-ink`, text DM Sans `0.92rem` in
`--text-light`.

**Black bands**: page hero (`.page-hero`), closing CTA (`.cta-band`), footer. `--black`
background with cream text.

**FAQ accordion**: `.faq-item` / `.faq-q` / `.faq-a`, with a + icon.

## Layout

- Content max-width **1200px**. The page hero is a two-column grid with a 4rem gap.
- Breakpoints: **900px** (columns stack; **the hero visual is hidden on phones**), 700px, 600px.
- Photos are square-cornered unless they sit inside a rounded module.

## Copy conventions

- Write headings and button labels in Title Case in the markup; CSS uppercases them.
- Forward actions end with " →" ("Start Your Order →").
- Prices: `$3.50/unit`, `$5 / 1 sample card`. Ranges use an en dash: `1–3 days`.

## Known drift (logged by the style check, fix later)

- Hero subtitles (`#999`), nav links (`#888`) and footer links (`#d0d0d0`) use grays from the
  original palette instead of the warm tokens (`--text-lighter #9a8e7e`).
- Assorted original-palette grays and blacks remain, mostly in the shared `style.css` (`#2a2a2a`,
  `#222`, `#888`, `#999`, `#d0d0d0`, …), plus pure black `#000` in a few page styles.
- `/contact` and `/apply` form messages use their own green and red (`#1f7a3d`, `#b3261e`) instead
  of the status colors.
- `/custom` writes out `1px solid #cdc8b2` borders where `var(--border-inner)` exists.
- `.btn-yellow` duplicates `.btn-amber`.
- The sample button reads "Order Sample →" in the Try One First module but "Order Sample" (no
  arrow) in the closing CTA band.
- `/faq` and `/artist-goodz` still use the old Webflow stylesheet (see README "Decisions needed").
