#!/usr/bin/env python3
"""Style check for getthegoodz.com: warns, never blocks.

Compares the customer-facing pages against the style guides in docs/style/
(colors, fonts, corner radii, which button classes belong to which section,
and which fonts/stylesheets each page loads).

Two lists come out of every run:
  - "In this change": problems on lines you added or edited, relative to
    --base (default: where your branch left origin/main, plus uncommitted
    edits). These are what the style test asks you to look at.
  - "All drift": every problem on the site today, including old ones. On
    main, the workflow copies this into the GitHub issue
    "Style drift to fix later".

Usage:
    python3 scripts/style-check.py                 # check your change
    python3 scripts/style-check.py --all           # also print every known problem
    python3 scripts/style-check.py --base <ref>    # compare against another commit
    python3 scripts/style-check.py --report f.md   # write the full drift list as markdown

Always exits 0. Tap pages (static-pages/), the old Bandcamp Builder
(custom-goodz/) and other internal pages are not checked yet; see
docs/style/README.md. No dependencies beyond the Python 3 standard library.
"""
import argparse
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GUIDE = "docs/style/"

# ── Sections ────────────────────────────────────────────────────────────────
MARKETING = [
    "index.html", "custom.html", "mixtape.html", "about.html", "support.html",
    "contact.html", "apply.html", "privacy.html", "privacy-policy.html",
    "terms.html", "terms-of-service.html",
]
ORDER = ["order.html", "artwork-upload.html"]
SHARED_CSS = ["style.css", "style-warm.css"]          # loaded by both sections
LEGACY = ["faq.html", "artist-goodz.html"]             # still on the Webflow stylesheet

# Status message colors (order-flow.md), allowed in every section.
STATUS = {
    "f0fdf4", "bbf7d0", "166534",   # success
    "eff6ff", "bfdbfe", "1e40af",   # info
    "fef2f2", "fecaca", "dc2626",   # error
    "fffbeb", "fde68a", "92400e",   # warning
}

MARKETING_TOKENS = {
    "ffc852": "--amber", "e6b044": "--amber-dark", "8a5a00": "--amber-ink",
    "0e0c0a": "--black", "2a2520": "--black-border", "efefe2": "--white",
    "e4e4d6": "--off-white", "1a1510": "--text", "6b6354": "--text-light",
    "9a8e7e": "--text-lighter", "2e2a1e": "--border", "cdc8b2": "--border-inner",
}
ORDER_TOKENS = {
    "ffc852": "--yellow", "0e0c0a": "--black", "efefe2": "--cream",
    "e4e4d6": "--off-white", "cdc8b2": "--border", "1a1510": "--text",
    "6b6354": "--muted", "2e7d4e": "--profit-green", "edf5ee": "--profit-tint",
    "fff4d6": "--yellow-light",
}

SECTIONS = {
    "marketing": {
        "guide": GUIDE + "marketing.md",
        "palette": set(MARKETING_TOKENS) | {"ffffff"} | STATUS,
        "tokens": MARKETING_TOKENS,
        "shorthand": {"cdc8b2": "1px solid #cdc8b2", "2e2a1e": "2px solid #2e2a1e"},
        "fonts": {"poppins", "dm sans", "inter"},
        "radii": None,  # not standardized in the marketing guide
        "foreign_classes": {"step-btn", "step-btn-primary", "step-btn-back", "option-card"},
    },
    "order": {
        "guide": GUIDE + "order-flow.md",
        "palette": set(ORDER_TOKENS) | {
            "ffffff", "e6b044",               # yellow hover
            "b8b0a0", "b0a898",               # stepper
            "22663c", "bfe0c7",               # discount text, green border
        } | STATUS,
        "tokens": ORDER_TOKENS,
        "fonts": {"poppins", "dm sans"},
        "radii": {"0", "4px", "6px", "8px", "10px", "12px", "14px", "50%"},
        "foreign_classes": {"btn", "btn-amber", "btn-ghost", "btn-yellow", "btn-white", "btn-black"},
    },
}
SECTIONS["shared"] = dict(SECTIONS["marketing"], foreign_classes=set())

GENERIC_FONTS = {
    "sans-serif", "serif", "monospace", "system-ui", "-apple-system",
    "blinkmacsystemfont", "inherit", "initial", "unset", "segoe ui", "helvetica",
    "arial", "roboto", "ui-sans-serif",
}

HEX_RE = re.compile(r"#([0-9a-fA-F]{3,8})\b")
RGB_RE = re.compile(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)")
DECL_RE = re.compile(r"([\w-]+)\s*:\s*([^;{}]+)")
CLASS_RE = re.compile(r'class="([^"]*)"')
STYLE_ATTR_RE = re.compile(r'style="([^"]*)"')


def section_of(path):
    if path in MARKETING:
        return "marketing"
    if path in ORDER:
        return "order"
    if path in SHARED_CSS:
        return "shared"
    return None


def norm_hex(h):
    h = h.lower()
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h[:3])
    elif len(h) in (6, 8):
        h = h[:6]
    else:
        return None
    return h


class Finding:
    def __init__(self, path, line, rule, msg, guide):
        self.path, self.line, self.rule, self.msg, self.guide = path, line, rule, msg, guide

    def text(self):
        return f"{self.path}:{self.line}  [{self.rule}] {self.msg}  (see {self.guide})"


# ── Per-file checks ─────────────────────────────────────────────────────────
def css_lines(path, lines):
    """Yield (line_no, css_text, in_root) for the CSS in a file."""
    is_css = path.endswith(".css")
    in_style = is_css
    in_root = False
    for i, raw in enumerate(lines, 1):
        line = raw
        if not is_css:
            for attr in STYLE_ATTR_RE.findall(line):
                yield i, attr, False
            low = line.lower()
            if "<style" in low:
                in_style = True
                line = line[low.index("<style"):]
            if not in_style:
                continue
            if "</style>" in line.lower():
                yield i, line[: line.lower().index("</style>")], in_root
                in_style = False
                continue
        if ":root" in line and "{" in line:
            in_root = True
        yield i, line, in_root
        if in_root and "}" in line:
            in_root = False


def check_css(path, lines, sec, out):
    cfg = SECTIONS[sec]
    for n, text, in_root in css_lines(path, lines):
        if in_root:
            continue  # token definitions; the guides list them
        for prop, value in DECL_RE.findall(text):
            prop = prop.lower()
            for h in HEX_RE.findall(value):
                v = norm_hex(h)
                if v is None:
                    continue
                if v not in cfg["palette"]:
                    out.append(Finding(path, n, "off-palette-color",
                                       f"#{h} is not in the {sec} palette", cfg["guide"]))
                elif v in cfg["tokens"] and not path.endswith(".css"):
                    token = cfg["tokens"][v]
                    full = cfg.get("shorthand", {}).get(v)
                    if full:
                        # token is a whole border ("1px solid #cdc8b2"), not a color;
                        # only an exact match can be swapped for it
                        if " ".join(value.lower().split()) != full:
                            continue
                        hint = f"use {prop}: var({token}) (it includes width and style)"
                    else:
                        hint = f"use var({token})"
                    out.append(Finding(path, n, "hardcoded-token", f"#{h} written out; {hint}", cfg["guide"]))
            for r, g, b in RGB_RE.findall(value):
                v = "%02x%02x%02x" % (int(r), int(g), int(b))
                if v not in cfg["palette"] and v not in ("000000", "ffffff"):
                    out.append(Finding(path, n, "off-palette-color",
                                       f"rgb({r},{g},{b}) is not in the {sec} palette", cfg["guide"]))
            if prop == "font-family":
                for fam in value.split(","):
                    f = fam.strip().strip("'\"").lower()
                    if f and f not in cfg["fonts"] and f not in GENERIC_FONTS and not f.startswith("var("):
                        out.append(Finding(path, n, "font",
                                           f"font \"{fam.strip().strip(chr(39) + chr(34))}\" is not used in the {sec} section",
                                           cfg["guide"]))
            if prop == "border-radius" and cfg["radii"]:
                for part in value.split():
                    p = part.replace("!important", "").strip()
                    if p and not p.startswith("var(") and p not in cfg["radii"]:
                        out.append(Finding(path, n, "radius",
                                           f"corner radius {p} is not one of the guide's sizes", cfg["guide"]))


def check_markup(path, lines, sec, out):
    cfg = SECTIONS[sec]
    text = "".join(lines)
    for n, line in enumerate(lines, 1):
        for cls in CLASS_RE.findall(line):
            names = set(cls.split())
            for bad in sorted(names & cfg["foreign_classes"]):
                other = "order-flow" if sec == "marketing" else "marketing"
                out.append(Finding(path, n, "wrong-section-class",
                                   f'class "{bad}" belongs to the {other} section', cfg["guide"]))
            if sec == "marketing" and "btn-yellow" in names:
                out.append(Finding(path, n, "duplicate-class",
                                   'class "btn-yellow" duplicates "btn-amber"; use btn-amber', cfg["guide"]))
    head_line = next((i for i, l in enumerate(lines, 1) if "</head>" in l.lower()), 1)
    fonts_link = " ".join(l for l in lines if "fonts.googleapis.com" in l)
    if sec == "marketing":
        if "style-warm.css" not in text:
            out.append(Finding(path, head_line, "page-setup",
                               "marketing page does not load style-warm.css", cfg["guide"]))
        for fam in ("Poppins", "Inter"):
            if fam not in fonts_link:
                out.append(Finding(path, head_line, "page-setup",
                                   f"marketing page does not load the {fam} font", cfg["guide"]))
    if sec == "order":
        for fam, key in (("Poppins", "Poppins"), ("DM Sans", "DM+Sans")):
            if key not in fonts_link:
                out.append(Finding(path, head_line, "page-setup",
                                   f"order page does not load the {fam} font", cfg["guide"]))
        if "family=Inter" in fonts_link:
            out.append(Finding(path, head_line, "page-setup",
                               "order page loads Inter, which the order flow does not use", cfg["guide"]))


def scan():
    findings = []
    for path in MARKETING + ORDER + SHARED_CSS:
        full = os.path.join(ROOT, path)
        if not os.path.exists(full):
            continue
        with open(full, encoding="utf-8", errors="replace") as fh:
            lines = fh.readlines()
        sec = section_of(path)
        check_css(path, lines, sec, findings)
        if path.endswith(".html"):
            check_markup(path, lines, sec, findings)
    for path in LEGACY:
        if os.path.exists(os.path.join(ROOT, path)):
            findings.append(Finding(path, 1, "legacy-page",
                                    "still on the old Webflow stylesheet; rebuild on style-warm.css",
                                    GUIDE + "README.md"))
    known = set(MARKETING + ORDER + LEGACY)
    for name in sorted(os.listdir(ROOT)):
        if name.endswith(".html") and name not in known:
            findings.append(Finding(name, 1, "unassigned-page",
                                    "page is not in any style section; add it to scripts/style-check.py "
                                    "and the table in docs/style/README.md", GUIDE + "README.md"))
    findings.sort(key=lambda f: (f.path, f.line))
    return findings


# ── Which lines changed ─────────────────────────────────────────────────────
def git(*args):
    return subprocess.run(["git", "-C", ROOT, *args], capture_output=True, text=True)


def changed_lines(base):
    """{path: set(line numbers) or 'all'} changed since base, incl. uncommitted.
    Returns None if git can't answer (then every finding counts as in-change)."""
    if base is None:
        mb = git("merge-base", "origin/main", "HEAD")
        if mb.returncode != 0:
            return None
        base = mb.stdout.strip()
    diff = git("diff", "-U0", "--no-color", base, "--")
    if diff.returncode != 0:
        return None
    changes, path = {}, None
    for line in diff.stdout.splitlines():
        if line.startswith("+++ "):
            path = line[6:] if line.startswith("+++ b/") else None
        elif line.startswith("@@") and path:
            m = re.search(r"\+(\d+)(?:,(\d+))?", line)
            start, count = int(m.group(1)), int(m.group(2) or 1)
            changes.setdefault(path, set()).update(range(start, start + count))
    untracked = git("ls-files", "--others", "--exclude-standard")
    for p in untracked.stdout.splitlines():
        changes[p] = "all"
    return changes


def in_change(f, changes):
    if changes is None:
        return True
    lines = changes.get(f.path)
    if not lines:
        return False
    if lines == "all":
        return True
    # Page-level findings (line 1 / </head>) count whenever the file changed.
    if f.rule in ("page-setup", "legacy-page", "unassigned-page"):
        return True
    return f.line in lines


# ── Output ──────────────────────────────────────────────────────────────────
def markdown_report(findings):
    out = [f"**{len(findings)} known style problems** across the customer-facing site. "
           "Each is a deviation from the guides in `docs/style/`; none blocks a deploy. "
           "Fix them when you're next in that file.\n"]
    by_file = {}
    for f in findings:
        by_file.setdefault(f.path, []).append(f)
    for path in sorted(by_file):
        out.append(f"\n### `{path}` ({len(by_file[path])})\n")
        for f in by_file[path]:
            out.append(f"- line {f.line}: **{f.rule}**: {f.msg}")
    return "\n".join(out) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--base", help="commit to compare against (default: merge-base with origin/main)")
    ap.add_argument("--all", action="store_true", help="also print every known problem")
    ap.add_argument("--report", help="write the full drift list as markdown to this file")
    args = ap.parse_args()

    findings = scan()
    changes = changed_lines(args.base)
    mine = [f for f in findings if in_change(f, changes)]
    annotate = os.environ.get("GITHUB_ACTIONS") == "true"

    print("Goodz style check (warns only; never blocks)")
    if changes is None:
        print("(no git comparison available: showing every problem as part of this change)")
    if mine:
        print(f"\nIn this change: {len(mine)} warning(s)")
        for f in mine:
            print("  " + f.text())
            if annotate:
                print(f"::warning file={f.path},line={f.line},title=Style: {f.rule}::{f.msg} (see {f.guide})")
    else:
        print("\nIn this change: no style problems. Record 'Style check: passed' in CHANGELOG.md.")
    if mine:
        print(f"\nRecord 'Style check: {len(mine)} warnings (logged)' in CHANGELOG.md, "
              "or fix them first.")
    print(f"\nWhole site: {len(findings)} known problem(s) logged for a future fix"
          + (" (listed below)." if args.all else " (run with --all to list them)."))
    if args.all:
        for f in findings:
            print("  " + f.text())

    if args.report:
        with open(args.report, "w") as fh:
            fh.write(markdown_report(findings))
    gh_out = os.environ.get("GITHUB_OUTPUT")
    if gh_out:
        with open(gh_out, "a") as fh:
            fh.write(f"total={len(findings)}\nin_change={len(mine)}\n")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # a broken checker must never block a push
        print(f"style-check crashed (ignored): {e!r}")
        sys.exit(0)
