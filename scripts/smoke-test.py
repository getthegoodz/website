#!/usr/bin/env python3
"""Money-path smoke test for getthegoodz.com.

Checks the custom-order funnel end to end without creating anything:
key pages serve with their guard code present, the order API is alive and
validating, and the Cloudinary upload preset accepts uploads.

Usage:
    python3 scripts/smoke-test.py                       # against production
    python3 scripts/smoke-test.py https://<preview-url> # against a preview
    python3 scripts/smoke-test.py --deep                # + real Shopify cart probe

--deep POSTs a minimal valid order to the API and expects a checkoutUrl.
This creates one throwaway Shopify cart (no order, no email) — proves the
Storefront token, variant ID, and cartCreate mutation are all alive. Use
after deploys that touch the API or its env vars; skip for routine runs.

Exit code 0 = all pass, 1 = something failed. Run before merging anything
that touches order.html, artwork-upload.html, or api/custom-goodz-order.js.
No dependencies beyond the Python 3 standard library.
"""
import json
import sys
import urllib.request
import urllib.error
import uuid

DEFAULT_BASE = "https://getthegoodz.com"

# Marker strings are the load-bearing guard code added in the July 2026
# checkout-bug fixes. If a marker disappears, either the fix regressed or
# this list needs updating alongside the code — both worth a loud failure.
PAGE_CHECKS = [
    ("/", ["Goodz"]),
    ("/custom", ["10 MB", "PNG or JPEG"]),
    ("/order", ["option-card", "openBackLightbox"]),
    ("/artwork-upload", [
        "checkArtworkFileSize",   # 10MB pick-time gate
        "MAX_UPLOAD_PX",          # downscale before upload
        "MIN_PRINT_PX",           # 300 DPI print floor
        "handleStep1Click",       # custom-back flow rail
        "AbortController",        # fetch timeouts (upload + checkout)
        "review-assurance",       # quality bullets on review
    ]),
]

results = []


def check(name, ok, detail=""):
    results.append(ok)
    mark = "PASS" if ok else "FAIL"
    print(f"  [{mark}] {name}" + (f" — {detail}" if detail else ""))


def fetch(url, data=None, headers=None, method=None):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:  # DNS, timeout, TLS...
        return None, str(e)


def main():
    args = [a for a in sys.argv[1:]]
    deep = "--deep" in args
    args = [a for a in args if a != "--deep"]
    base = (args[0].rstrip("/") if args else DEFAULT_BASE)

    print(f"Smoke test against {base}\n")

    print("Pages + guard code:")
    for path, markers in PAGE_CHECKS:
        status, body = fetch(base + path)
        if status != 200:
            check(f"GET {path}", False, f"status {status}")
            continue
        missing = [m for m in markers if m not in body]
        check(f"GET {path}", not missing,
              f"missing markers: {missing}" if missing else f"200, {len(markers)} markers")

    print("\nStatic assets:")
    status, body = fetch(base + "/templates/Goodz_Standard_back.png")
    check("standard back image", status == 200 and len(body) > 10000,
          f"status {status}, {len(body)} bytes")

    print("\nOrder API (validation probe — creates nothing):")
    status, body = fetch(
        base + "/api/custom-goodz-order",
        data=json.dumps({"units": 0}).encode(),
        headers={"Content-Type": "application/json"},
    )
    ok = status == 400 and "units" in body
    check("POST units:0 rejected with 400", ok, f"status {status}")

    print("\nCloudinary upload preset (invalid-file probe — stores nothing):")
    boundary = uuid.uuid4().hex
    parts = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; "
        f"filename=\"probe.png\"\r\nContent-Type: image/png\r\n\r\nnot-a-real-image\r\n"
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"upload_preset\"\r\n\r\n"
        f"goodz_uploads\r\n--{boundary}--\r\n"
    ).encode()
    status, body = fetch(
        "https://api.cloudinary.com/v1_1/dg6kjrhid/image/upload",
        data=parts,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    # A live preset rejects the garbage FILE ("Invalid image file...").
    # A broken/disabled preset errors about the PRESET instead.
    body_l = body.lower()
    preset_broken = "preset" in body_l and ("not found" in body_l or "disabled" in body_l)
    check("preset alive (rejects invalid file, not the preset)",
          status == 400 and not preset_broken, f"status {status}")

    if deep:
        print("\nDeep probe (creates one throwaway Shopify cart):")
        payload = {"units": 50, "sleeve": "no", "keychainHole": "none",
                   "backDesign": "standard", "musicType": "url",
                   "musicUrl": "https://example.com/smoke-test"}
        status, body = fetch(
            base + "/api/custom-goodz-order",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )
        ok = False
        try:
            ok = status == 200 and "checkoutUrl" in json.loads(body)
        except Exception:
            pass
        check("cartCreate returns checkoutUrl", ok, f"status {status}")

    print()
    if all(results):
        print(f"ALL {len(results)} CHECKS PASSED")
        return 0
    print(f"{results.count(False)} OF {len(results)} CHECKS FAILED")
    return 1


if __name__ == "__main__":
    sys.exit(main())
