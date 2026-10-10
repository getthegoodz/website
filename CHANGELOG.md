# Changelog

Every change to the live site gets an entry here, in the same commit as the change: what changed,
why, and how it was verified. Newest first. History from before this file started lives in
`git log` and the pull requests.

## 2026-10-10: Style guides and style check

**Pages:** none. No live page, stylesheet or script that a page loads was changed. **Requested by:**
Chris.

**What changed**
- **Style guides** in `docs/style/`: one per customer-facing section (marketing pages, order flow,
  Shopify store), measured from the live site, plus a README with the style test every change
  must pass and a list of cross-section inconsistencies for Chris and Mike to decide on. Tap pages
  are deferred to a later fourth guide.
- **`scripts/style-check.py`**: checks colors, fonts, order-flow corner radii, section-specific
  button classes and page setup against the guides. It reports problems on the lines a change
  touched, lists older problems separately, and always exits successfully (warns, never blocks).
- **`.github/workflows/style-check.yml`**: runs the check on every push. Warnings show on the
  commit; on `main` the full list is kept in one GitHub issue, "Style drift to fix later".
- **`CLAUDE.md`**: working rule that every visual change passes the style test.

**Why:** the three sections look deliberately different, and new changes should match the section
they're in. The check records drift for a later fix instead of blocking work.

**Style check:** passed (this change touches no page). 89 existing problems logged for later.

**Verified (2026-10-10)**
- `git diff main` contains only new files under `docs/style/`, the new script and workflow, and
  edits to `CLAUDE.md` and this file.
- Check run locally: 0 problems in this change, 89 across the site, exit code 0. A test edit to
  `order.html` (off-palette color, unknown font, 5px radius, a marketing button class) plus an
  unassigned new page produced exactly those 6 warnings; the test edits were reverted.
- Preview deployment (`style-guides`): all 15 root pages plus `style.css` and `style-warm.css`
  are byte-identical to production; the guides serve at `/docs/style/*.md` and nothing links to
  them. The style-check workflow ran in GitHub (0 in this change, 89 site-wide, run passed, no
  issue created off `main`). The automated smoke test passed 7/7 against the preview.

## 2026-10-10: Order builder pricing table, profit calculator, sample offer

**Page:** `/order` (`order.html`). **Requested by:** Chris.

**What changed**
- **Pricing table:** "Price" renamed "Price per Unit". The Est. profit column is removed, so every
  dollar figure in the table is something the buyer pays (buyers were confusing profit with the
  order total). Price per unit now leads visually; order total is lighter, and the full total is
  still shown in bold in the Summary.
- **Profit Calculator:** now a single sentence tied to the selected row: "Sell your run of [qty]
  Goodz at $[price] each and make [$profit] in estimated profit." It updates live as the row or
  price changes, and shows a below-cost message instead of a zero or negative figure. Heading reads
  "$ Profit Calculator"; the resale price input is a white box; the profit figure matches the
  input's size.
- **Discount tags:** larger and higher contrast. The selected row's tag turns solid green, with a
  brief pop when a quantity is clicked (disabled for reduced-motion users).
- **Sample offer:** the one-line "Try a sample first" link, which sent people back to `/custom`,
  is now a bordered box styled like the Summary panel that links straight to the $5 sample product.

**Not changed:** tracking calls, GTM tags and triggers, the order details handed to the artwork
step, checkout code, and the order API.

**Verified (2026-10-10)**
- Old and new page run side by side on the same scripted customer path: identical dataLayer
  events (17 of 17, names and payloads), identical order details handed to `/artwork-upload`,
  identical prices and summary, no JavaScript errors.
- Live GTM container (version 18) audited: nothing reads the changed elements.
- New sample link: the shop page returns 200, and GA4's cross-domain linker decorates the identical
  link already live on `/custom`.
- `scripts/smoke-test.py --deep` passed 8/8 against production.
- Preview deployment (`order-pricing-polish`): the served `/order` is byte-identical to the tested
  file; `smoke-test.py --deep` passed 8/8 against the preview, including a real Shopify cart
  created through the preview's order API; the automated smoke-test workflow passed on the deploy.
