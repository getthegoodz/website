# Changelog

Every change to the live site gets an entry here, in the same commit as the change: what changed,
why, and how it was verified. Newest first. History from before this file started lives in
`git log` and the pull requests.

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
