/**
 * POST /api/custom-goodz-order
 *
 * Builds a Shopify cart for the Custom Goodz order flow and returns the
 * checkout URL. Called from artwork-upload.html on "Proceed to Checkout".
 *
 * Pricing model: a single Custom Goodz variant priced at $3.44/unit. The
 * Shopify "custom-goodz-pricing" Product Discount Function applies tier
 * discounts based on cart line quantity (defined in
 * ~/Projects/Goodz/custom-goodz/extensions/custom-goodz-pricing/src/run.ts).
 * This file used to map quantity tiers to 7 different variant IDs; that
 * pattern is gone.
 *
 * Required env vars:
 *   SHOPIFY_STORE_DOMAIN              e.g. goodz-dev-store-1.myshopify.com
 *   SHOPIFY_STOREFRONT_TOKEN          Storefront API access token for that store
 *   SHOPIFY_CUSTOM_GOODZ_VARIANT_ID   Full GID of the single Custom Goodz variant
 *
 * Optional env vars:
 *   SHOPIFY_API_VERSION   defaults to 2026-07
 */

// .trim() guards against trailing newlines/whitespace in env var values
// (e.g. when set via `echo "..." | vercel env add`).
const STORE_DOMAIN = (process.env.SHOPIFY_STORE_DOMAIN || 'goodz-dev-store-1.myshopify.com').trim();
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN?.trim();
const VARIANT_ID = (
  process.env.SHOPIFY_CUSTOM_GOODZ_VARIANT_ID ||
  'gid://shopify/ProductVariant/45053177036897' // dev store default
).trim();
const API_VERSION = (process.env.SHOPIFY_API_VERSION || '2026-07').trim();

async function shopifyGraphQL(query, variables = {}) {
  if (!STOREFRONT_TOKEN) {
    throw new Error('SHOPIFY_STOREFRONT_TOKEN env var is not set');
  }
  const res = await fetch(`https://${STORE_DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

module.exports = async (req, res) => {
  // CORS for the static frontend at getthegoodz.com / GitHub Pages preview.
  // Tighten this if/when we lock down origins.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const {
      units,           // exact number of units (e.g. 137)
      sleeve,          // 'yes' or 'no'
      keychainHole,    // 'none' | 'top-left' | 'top-right'
      backDesign,      // 'standard' | 'custom'
      albumArtUrl,     // Cloudinary URL for front artwork
      backArtUrl,      // Cloudinary URL for back artwork (if backDesign === 'custom')
      musicType,       // 'url' or 'csv'
      musicUrl,        // when musicType === 'url'
      csvUrl,          // when musicType === 'csv'
      csvCount,        // when musicType === 'csv': number of codes in the CSV
      buyerEmail,      // optional, attaches to cart
      attribution,     // optional, { first, last } touch captured client-side
    } = req.body || {};

    const unitsInt = parseInt(units, 10);
    if (!Number.isFinite(unitsInt) || unitsInt < 1) {
      res.status(400).json({ error: 'units is required and must be >= 1' });
      return;
    }

    // No CSV validation by design: we do NOT require a Bandcamp code CSV,
    // nor that its count match the units ordered, nor that codes be unique.
    // Removing this friction lets customers submit and pay immediately; we
    // reconcile the actual codes with them after checkout. Whatever count
    // was uploaded is still recorded on the order as _csv_code_count below.

    // Line attributes ride on the cart line and appear on the order line item
    // in admin. Keys with a leading underscore are hidden from the customer
    // during checkout (Shopify convention) and only visible to the merchant.
    const lineAttributes = [
      { key: 'sleeve', value: sleeve === 'yes' ? 'yes' : 'no' },
      { key: 'keychainHole', value: keychainHole || 'none' },
      { key: 'backDesign', value: backDesign || 'standard' },
      { key: 'source', value: 'site-draft' },
    ];
    if (albumArtUrl) {
      lineAttributes.push({ key: '_album_art_url', value: albumArtUrl });
    }
    if (backArtUrl) {
      lineAttributes.push({ key: '_back_art_url', value: backArtUrl });
    }
    if (musicType === 'url' && musicUrl) {
      lineAttributes.push({ key: 'music_url', value: musicUrl });
    } else if (musicType === 'csv' && csvUrl) {
      lineAttributes.push({ key: '_csv_url', value: csvUrl });
      if (csvCount != null) lineAttributes.push({ key: '_csv_code_count', value: String(csvCount) });
    }

    // Attribution. The cart is created here, server-side, so Shopify only ever
    // observes the checkout hop: orders arrive with no UTMs and
    // customerJourneySummary shows a single moment (referrer getthegoodz.com).
    // Stamping the client-captured touch onto the order makes the real traffic
    // source permanently visible in admin. Defensive throughout — attribution
    // must never be able to break cart creation.
    try {
      const clip = (v) => String(v).slice(0, 255);
      const TOUCH_KEYS = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'fbclid', 'gclid', 'ttclid', 'msclkid',
      ];
      const first = attribution && attribution.first;
      const last = attribution && attribution.last;

      if (first && typeof first === 'object') {
        for (const k of TOUCH_KEYS) {
          if (first[k]) lineAttributes.push({ key: `_${k}`, value: clip(first[k]) });
        }
        if (first.landing_page) lineAttributes.push({ key: '_landing_page', value: clip(first.landing_page) });
        if (first.referrer) lineAttributes.push({ key: '_referrer', value: clip(first.referrer) });
        if (first.ts) lineAttributes.push({ key: '_first_touch_at', value: clip(first.ts) });
      }
      // Only record last touch when it differs, so single-session orders stay tidy.
      if (last && first && last.ts !== first.ts) {
        if (last.utm_source) lineAttributes.push({ key: '_last_utm_source', value: clip(last.utm_source) });
        if (last.utm_campaign) lineAttributes.push({ key: '_last_utm_campaign', value: clip(last.utm_campaign) });
        if (last.ts) lineAttributes.push({ key: '_last_touch_at', value: clip(last.ts) });
      }
    } catch (e) {
      // Attribution is instrumentation only; never fail the order over it.
    }

    // Cart-level attributes mirror the line-level ones for visibility in the
    // order timeline; the Admin Block extension reads from line items.
    const cartAttributes = lineAttributes.map((a) => ({ ...a }));

    const cartInput = {
      lines: [
        {
          merchandiseId: VARIANT_ID,
          quantity: unitsInt,
          attributes: lineAttributes,
        },
      ],
      attributes: cartAttributes,
    };
    if (buyerEmail) cartInput.buyerIdentity = { email: buyerEmail };

    const data = await shopifyGraphQL(
      `
      mutation CartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
            totalQuantity
            cost {
              subtotalAmount { amount currencyCode }
              totalAmount { amount currencyCode }
            }
          }
          userErrors { field message }
        }
      }
    `,
      { input: cartInput },
    );

    const { cart, userErrors } = data.cartCreate;

    if (userErrors && userErrors.length > 0) {
      res.status(400).json({ error: userErrors[0].message, userErrors });
      return;
    }

    res.status(200).json({
      checkoutUrl: cart.checkoutUrl,
      cartId: cart.id,
      totalQuantity: cart.totalQuantity,
      subtotalAmount: cart.cost.subtotalAmount.amount,
      totalAmount: cart.cost.totalAmount.amount,
      currencyCode: cart.cost.totalAmount.currencyCode,
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
