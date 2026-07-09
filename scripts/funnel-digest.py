#!/usr/bin/env python3
"""Weekly funnel-health digest for the Goodz custom-order flow.

Pulls the GA4 funnel for the last 7 days vs the prior 7 and flags the
failure signature that hid the June 2026 checkout bug for a month:
checkout attempts happening, purchases not, retry ratios climbing.

Usage:
    uv run --with google-analytics-data scripts/funnel-digest.py

Needs a GA service-account key (read access to property 415113115) at
$GOOGLE_APPLICATION_CREDENTIALS or ~/.config/goodz/ga-sa.json.
Exit code: 0 = healthy, 1 = ALERT (worth a look today), 2 = couldn't run.
"""
import os
import sys

os.environ.setdefault(
    "GOOGLE_APPLICATION_CREDENTIALS",
    os.path.expanduser("~/.config/goodz/ga-sa.json"),
)

PROPERTY = "properties/415113115"

FUNNEL = ["view_item", "add_to_cart", "begin_checkout", "purchase"]
# Diagnostics wired July 2026; invisible until the GTM custom-event
# forwarding gap is fixed — the digest says so until they appear.
DIAGNOSTIC = ["checkout_error", "artwork_upload_failed", "review_art_enlarged"]


def pull(client, start, end):
    from google.analytics.data_v1beta.types import (
        DateRange, Dimension, Metric, RunReportRequest,
    )
    resp = client.run_report(RunReportRequest(
        property=PROPERTY,
        date_ranges=[DateRange(start_date=start, end_date=end)],
        dimensions=[Dimension(name="eventName")],
        metrics=[Metric(name="eventCount"), Metric(name="totalUsers")],
    ))
    out = {}
    for row in resp.rows:
        name = row.dimension_values[0].value
        out[name] = (int(row.metric_values[0].value), int(row.metric_values[1].value))
    return out


def main():
    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
    except ImportError:
        print("Run via: uv run --with google-analytics-data scripts/funnel-digest.py")
        return 2

    try:
        client = BetaAnalyticsDataClient()
        this_week = pull(client, "7daysAgo", "yesterday")
        prior_week = pull(client, "14daysAgo", "8daysAgo")
    except Exception as e:
        print(f"DIGEST FAILED TO RUN: {e}")
        return 2

    alerts = []
    lines = ["Goodz funnel digest (last 7 days vs prior 7)", ""]

    for name in FUNNEL:
        ev, us = this_week.get(name, (0, 0))
        pev, pus = prior_week.get(name, (0, 0))
        lines.append(f"  {name:<16} {us:>4} users / {ev:>4} events   (prior: {pus}/{pev})")

    bc_ev, bc_us = this_week.get("begin_checkout", (0, 0))
    pu_ev, pu_us = this_week.get("purchase", (0, 0))

    # The June-bug signature, in order of loudness:
    if bc_us > 0 and pu_ev == 0:
        alerts.append(f"{bc_us} user(s) clicked checkout, ZERO purchases recorded")
    if bc_us > 0 and bc_ev / bc_us >= 2:
        alerts.append(f"retry ratio {bc_ev / bc_us:.1f} clicks/user — failure-loop signature")

    diag_seen = False
    for name in DIAGNOSTIC:
        ev, us = this_week.get(name, (0, 0))
        if name in this_week:
            diag_seen = True
        if ev > 0:
            lines.append(f"  {name:<24} {ev} events / {us} users")
            if name in ("checkout_error", "artwork_upload_failed"):
                alerts.append(f"{name}: {ev} in the last 7 days")
    if not diag_seen:
        lines.append("")
        lines.append("  (diagnostic events absent — GTM forwarding fix still pending;")
        lines.append("   purchase counts also unreliable until Shopify->GA4 is linked)")

    lines.append("")
    if alerts:
        lines.append("ALERT — worth a look today:")
        for a in alerts:
            lines.append(f"  !! {a}")
    else:
        lines.append("No failure signatures this week.")

    print("\n".join(lines))
    return 1 if alerts else 0


if __name__ == "__main__":
    sys.exit(main())
