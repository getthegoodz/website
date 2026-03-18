#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SRC_DIRS = [ROOT, ROOT / "static-pages"]
DEST_ROOT = ROOT / "static-pages-dev"


def transform_html(t: str) -> str:
    # Remove Webflow runtime JS chunks
    t = re.sub(r'<script[^>]+webflow(?:\.schunk)?\.[^\"\']+\.js[^>]*></script>', '', t, flags=re.I)
    # Remove legacy recaptcha script includes
    t = re.sub(r'<script[^>]+recaptcha/api\.js[^>]*></script>', '', t, flags=re.I)
    # Neutralize recaptcha containers (site.js injects Turnstile)
    t = re.sub(r'<div([^>]*?)class="([^"]*?)w-form-formrecaptcha([^"]*?)"([^>]*)></div>', '<div class="w-form-formrecaptcha"></div>', t, flags=re.I)
    t = re.sub(r'<div([^>]*?)class="([^"]*?)g-recaptcha([^"]*?)"([^>]*)></div>', '<div class="w-form-formrecaptcha"></div>', t, flags=re.I)
    t = re.sub(r'\sdata-sitekey="[^"]*"', '', t, flags=re.I)
    # Remove jquery includes
    t = re.sub(r'<script[^>]+jquery[^>]*></script>', '', t, flags=re.I)

    # Ensure site.js is present once
    if '/assets/site.js' not in t:
        t = t.replace('</body>', '<script src="/assets/site.js"></script></body>')

    # Strip obvious webflow page/site ids to reduce coupling
    t = re.sub(r'\sdata-wf-page="[^"]*"', '', t)
    t = re.sub(r'\sdata-wf-site="[^"]*"', '', t)

    return t


def main():
    DEST_ROOT.mkdir(parents=True, exist_ok=True)
    count = 0

    files = [*ROOT.glob('*.html'), *(ROOT / 'static-pages').rglob('*.html')]
    for src in files:
        rel = src.relative_to(ROOT)
        out = DEST_ROOT / rel
        out.parent.mkdir(parents=True, exist_ok=True)

        txt = src.read_text(errors='ignore')
        out.write_text(transform_html(txt))
        count += 1

    print(f"Built de-Webflow shadow set: {count} files -> {DEST_ROOT}")


if __name__ == '__main__':
    main()
