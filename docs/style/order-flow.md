# Order flow style guide

**Applies to:** `/order` (`order.html`, the Customize step) and `/artwork-upload`
(`artwork-upload.html`: the Music, Artwork and Review steps). Measured on 2026-10-10.

**Stylesheets:** each page carries its own `:root` tokens and styles in its `<style>` block. Both
pages also load `style.css` and `style-warm.css` (for the shared nav and footer), but only
Poppins and DM Sans are loaded as fonts. The order flow is a calmer, tool-like
section: sentence-case buttons, smaller headings, white option cards on cream. It deliberately
does **not** use the marketing button (`.btn btn-amber`) or Inter, which is not loaded here.

## Colors: use the tokens

| Token | Value | Use |
|---|---|---|
| `--yellow` | `#ffc852` | Primary button, the selected option card, the current step marker |
| `--black` | `#0e0c0a` | Text on yellow, selected borders, completed step markers |
| `--cream` | `#efefe2` | Page background |
| `--off-white` | `#e4e4d6` | Panels: Summary, sample offer |
| `--border` | `#cdc8b2` | Default 1px and 1.5px borders |
| `--text` | `#1a1510` | Body text |
| `--muted` | `#6b6354` | Labels, secondary text, order totals in the pricing table |
| `--profit-green` | `#2e7d4e` | Profit figures and the selected discount badge **only** |
| `--profit-tint` | `#edf5ee` | Profit calculator and discount badge background |
| `--yellow-light` | `#fff4d6` | Soft highlight (`artwork-upload.html` only) |

**Status colors** (`artwork-upload.html`), used for upload and validation messages. Each is a
background / border / text set:

| Status | Background | Border | Text |
|---|---|---|---|
| Success | `#f0fdf4` | `#bbf7d0` | `#166534` |
| Info | `#eff6ff` | `#bfdbfe` | `#1e40af` |
| Error | `#fef2f2` | `#fecaca` | `#dc2626` |
| Warning | `#fffbeb` | `#fde68a` | `#92400e` |

### Color rules

- **Black borders mean "selected."** Unselected elements use `--border`. Don't add a black
  border to anything that isn't the current choice (this is why the sample offer box uses 1px
  `--border`).
- **Green is reserved for money the buyer saves or makes** (profit, discounts). Don't use it for
  success states; those use the status set above.
- **One yellow filled button per screen**: the step's forward action.

## Typography: two fonts

The order flow uses **Poppins** for the page title only, and **DM Sans** for everything else.

| Element | Class | Spec |
|---|---|---|
| Page title | `.order-intro-title` | Poppins 800, `1.65rem`, uppercase |
| Section label | `.option-section-label` | DM Sans 700, `0.82rem`, uppercase, +0.1em, `--muted` |
| Option title | `.option-card-title` | DM Sans 700, `0.95rem` |
| Option description | `.option-card-sub` | DM Sans `0.82rem`, `--muted`, line-height 1.45 |
| Body copy in panels | e.g. `.profit-calc-body`, `.sample-offer-body` | DM Sans `0.9rem` |
| Small caps label | `.profit-calc-label` | DM Sans 800, `0.66rem`, uppercase |

Inputs use a **16px** font so iPhones don't zoom in on focus. Keep it that way for new inputs.

## Components

**Option card** (`.option-card`): white, 1.5px `--border`, 12px corners. Selected: `--yellow`
background with a `--black` border.

**Panel** (Summary, `.sample-offer`): `--off-white`, 1px `--border`, 14px corners. New boxed
content on these pages should reuse this look.

**Pricing table** (`.pricing-grid`): 1px border, 10px corners. Per-unit price leads (700,
`1.06rem`, `--black`); the order total is secondary (400, `0.9rem`, `--muted`). Selected row:
`rgba(255,200,82,0.22)` background with a 3px black inset bar.

**Discount badge**: DM Sans 700 `0.74rem`, `#22663c` text on `--profit-tint`, `#b8dcc2` border,
4px corners. On the selected row it is solid `--profit-green` with white text and plays the
pop animation (disabled under `prefers-reduced-motion`).

**Profit calculator** (`.profit-calc`): `--profit-tint` background, 1px `#bfe0c7` border plus a
4px `--profit-green` left bar, 8px corners. Its input is white with a `#a9d3b5` border, 4px
corners, 16px text. The profit figure is 16px `--profit-green` 700.

**Buttons** (`.step-btn`): DM Sans 700 `0.9rem`, **sentence case**, 2px border, 6px corners,
padding `0.7rem 1.5rem`.
- `.step-btn-primary`: `--yellow` fill, `--black` border and text. The forward action ("Continue
  to Music").
- `.step-btn-back`: transparent with a `--black` border. Back and secondary actions (including
  the sample offer's link).

**Stepper** (`.order-stepper`, `.step-cell`, `.step-square`, `.step-cell-label`): 30px square
markers with 6px corners. Completed steps (`.done`) are solid `--black`; the current step
(`.active`) is `--yellow` with a `--black` border; future steps are outlined in `#b8b0a0` (1.5px).
Labels are `#b0a898`, turning `--black` for current and completed steps. The stepper is duplicated
in both pages; change both together.

## Layout

- Breakpoints: **860px** (the Summary moves below the options), 700px, 600px, 480px.
- When a size must change on phones, set it in `rem` inside each breakpoint. Don't use `em`,
  which compounds and overrides the phone sizes.
- Keep short phrases that must not wrap together in `<span class="nowrap">` (e.g. `1–3 days`).

## Copy conventions

- Buttons and labels in sentence case: "Continue to Music", "Order a sample".
- Money: `$2.25` per unit, totals with thousands separators (`$1,125.00` in the Summary).
- Ranges use an en dash: `1–3 days`.

## Known drift (logged by the style check, fix later)

- **Artwork page buttons inherit marketing styles.** `artwork-upload.html` names its buttons
  `.btn`, so `style.css`'s uppercase and letter-spacing leak in. Its buttons render uppercase,
  unlike `/order`'s sentence case. This is accidental; new buttons there should still be written
  to this guide.
- **Corner radii vary**: 3, 4, 6, 7, 8, 10, 12 and 14px all appear. Use the radius of the nearest
  matching component above rather than adding new ones.
- **Three near-identical green borders**: `#bfe0c7`, `#b8dcc2`, `#a9d3b5`. Use `#bfe0c7` for new
  work.
- **Hardcoded colors** that duplicate tokens (e.g. `#ffc852` written out instead of
  `var(--yellow)`).
