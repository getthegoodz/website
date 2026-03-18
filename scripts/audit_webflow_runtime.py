#!/usr/bin/env python3
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
TARGETS = [ROOT] + [ROOT / "static-pages"]


def scan_file(path: Path):
    t = path.read_text(errors="ignore")
    return {
        "path": str(path.relative_to(ROOT)),
        "webflow_js": bool(re.search(r"webflow(?:\.schunk)?\.[^\"']+\.js", t, re.I)),
        "jquery": bool(re.search(r"jquery(?:[-.]\d+)?(?:\.min)?\.js", t, re.I)),
        "recaptcha": bool(re.search(r"recaptcha/api\.js|g-recaptcha|w-form-formrecaptcha", t, re.I)),
        "site_js": "/assets/site.js" in t,
        "forms": "<form" in t.lower(),
    }


def main():
    files = sorted(set([*ROOT.glob("*.html"), *(ROOT / "static-pages").rglob("*.html")]))
    rows = [scan_file(p) for p in files]

    summary = {
        "total_html_files": len(rows),
        "with_webflow_js": sum(1 for r in rows if r["webflow_js"]),
        "with_jquery": sum(1 for r in rows if r["jquery"]),
        "with_recaptcha_markup_or_script": sum(1 for r in rows if r["recaptcha"]),
        "with_site_js": sum(1 for r in rows if r["site_js"]),
        "with_forms": sum(1 for r in rows if r["forms"]),
        "rows": rows,
    }

    out_dir = ROOT / "reports"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "webflow-runtime-audit.json").write_text(json.dumps(summary, indent=2))

    md = []
    md.append("# Webflow Runtime Audit")
    md.append("")
    md.append(f"- Total HTML files: **{summary['total_html_files']}**")
    md.append(f"- Files with Webflow JS: **{summary['with_webflow_js']}**")
    md.append(f"- Files with jQuery script refs: **{summary['with_jquery']}**")
    md.append(f"- Files with reCAPTCHA markup/script refs: **{summary['with_recaptcha_markup_or_script']}**")
    md.append(f"- Files already loading /assets/site.js: **{summary['with_site_js']}**")
    md.append("")
    md.append("## Files still loading Webflow JS")
    for r in rows:
        if r["webflow_js"]:
            md.append(f"- `{r['path']}`")

    (out_dir / "webflow-runtime-audit.md").write_text("\n".join(md) + "\n")
    print("Wrote reports/webflow-runtime-audit.json and .md")


if __name__ == "__main__":
    main()
