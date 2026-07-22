/* First/last-touch attribution capture for Custom Goodz orders.
 *
 * Why this exists: the order builder creates the Shopify cart server-side via
 * the Storefront API, so Shopify only ever observes the checkout hop. Orders
 * arrive with no UTMs and `customerJourneySummary` shows a single moment
 * (referrer: getthegoodz.com). That made the 2026-07-21 order unattributable.
 *
 * This stashes the original campaign params in localStorage (not session, the
 * Custom Goodz purchase is considered and can span days) so placeOrder() can
 * attach them to the cart, stamping the real source onto the order in admin.
 *
 * Pure instrumentation: everything is wrapped so it can never block checkout.
 */
(function () {
  'use strict';

  var KEY = 'goodzAttribution';
  var PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'fbclid', 'gclid', 'ttclid', 'msclkid'
  ];

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* private mode, ignore */ }
  }

  try {
    var qs = new URLSearchParams(window.location.search);
    var touch = {};
    var hasParams = false;

    PARAMS.forEach(function (p) {
      var v = qs.get(p);
      if (v) { touch[p] = String(v).slice(0, 255); hasParams = true; }
    });

    var ref = document.referrer || '';
    var isInternal = ref && ref.indexOf(window.location.hostname) !== -1;

    // Only record a touch when there's something worth recording: campaign
    // params, or an external referrer. Internal page-to-page navigation must
    // not overwrite the real source.
    if (!hasParams && (isInternal || !ref)) return;

    touch.landing_page = window.location.pathname;
    touch.referrer = ref.slice(0, 255);
    touch.ts = new Date().toISOString();

    var store = read();
    if (!store.first) store.first = touch;  // first touch wins, never overwritten
    store.last = touch;                     // last touch always refreshed
    save(store);
  } catch (e) {
    /* never let attribution break a page */
  }
})();
