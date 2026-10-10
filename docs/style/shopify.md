# Shopify store style guide

**Applies to:** `shop.getthegoodz.com`: storefront, collection and product pages, cart.
Checkout is styled by Shopify and is out of scope.

**Where it lives:** the theme is **"Goodz site-draft restyle"** (Dawn-based, theme id
186923581736). It is edited in Shopify admin → Online Store → Themes → Customize, not in this
repo, so the automated style check can't see it. Check changes against this guide by eye.
Measured live on 2026-10-10.

## Colors

| Role | Value |
|---|---|
| Page background | `#f0efe1` (cream; the site uses `#efefe2`) |
| Body text | `rgba(0, 0, 0, 0.75)` |
| Headings | `#000` |
| Header | Black, with small uppercase nav links that mirror the site nav |
| Footer | `#000` (the site uses warm black `#0e0c0a`) |
| Primary button | `#ffc852` with black text |

## Typography

| Element | Spec |
|---|---|
| Page headings (h1, h2) | Poppins 900, 40px, uppercase, black |
| Product card titles | Poppins 900, 18px, uppercase |
| Body text | DM Sans, 16.8px |
| Prices | DM Sans 400: 18.9px on product pages, 13.65px on product cards |
| Buttons | Poppins 400, 15.75px, uppercase |

Fonts loaded by the theme: DM Sans and Poppins (plus JudgemeStar for review stars and
GTStandard-M from an app).

## Components

**Buttons**: 8px corners (the theme's `--buttons-radius` setting reads 6px; the rendered
buttons measure 8px). Primary is filled yellow. "Add to cart" on product cards is an outlined
button on cream.

**Product cards**: 16px corners.

**Inputs**: 6px corners (`--inputs-radius`).

**Email pop-up**: offers free shipping on orders over $30.

## Rules for theme edits

- Use the theme editor's color and typography settings rather than custom CSS where possible, so
  values stay in one place.
- Match the site's Poppins-headline / DM Sans-body pairing.
- New buttons follow the existing theme button (yellow fill, uppercase, Poppins).

## Known differences from the main site

These are listed in the README's "Decisions needed" for Chris and Mike to settle: button font and
weight, footer black, cream value, headline weight (900 vs 800) and button corners (8px vs 6px).
Don't "fix" one side to match the other without that decision.
