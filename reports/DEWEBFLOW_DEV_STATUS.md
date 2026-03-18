# De-Webflow Dev Status (local-only, no prod push)

## What was done

- Created dev branch: `dev/dewebflow-hardening`.
- Added audit script: `scripts/audit_webflow_runtime.py`.
- Added shadow-build script: `scripts/build_dewebflow_shadow.py`.
- Generated a full de-Webflow **shadow copy** of pages at:
  - `static-pages-dev/`

## Current shadow results

- Total shadow HTML files: 77
- Files with Webflow JS runtime references: 0
- Files with reCAPTCHA script refs: 0
- Files with `/assets/site.js`: 77

## Important

- This work is local/dev branch only.
- Nothing from this hardening pass has been pushed to production.

## Recommended next steps (when Mike is back)

1. Stand up a preview route map for `static-pages-dev` pages (non-prod domain only).
2. Run page-family QA in this order:
   - legal/static pages
   - landing pages
   - handle pages
   - tapped flow pages last
3. For each family, verify:
   - page renders
   - nav works
   - footer form works with Turnstile
   - no console fatal errors
4. Promote family-by-family to main only after pass.
