const domain = '56457c.myshopify.com';
const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN || 'fa32d84d9672194e7338e4a1ca4b3ed1';
const apiVersion = '2025-10';

// Variant map: quantity range -> variant ID
const VARIANT_MAP = {
  '50-99':    { variantId: 'gid://shopify/ProductVariant/51673297256744', price: 3.44 },
  '100-199':  { variantId: 'gid://shopify/ProductVariant/51673309643048', price: 3.32 },
  '200-499':  { variantId: 'gid://shopify/ProductVariant/51673310265640', price: 3.06 },
  '500-999':  { variantId: 'gid://shopify/ProductVariant/51673311215912', price: 3.00 },
  '1000-1999':{ variantId: 'gid://shopify/ProductVariant/51673311314216', price: 2.72 },
  '2000-2999':{ variantId: 'gid://shopify/ProductVariant/51673311346984', price: 2.62 },
  '3000+':    { variantId: 'gid://shopify/ProductVariant/51673311510824', price: 2.52 },
};

function getTier(units) {
  if (units < 50)  return '50-99';
  if (units < 100)  return '100-199';
  if (units < 200)  return '200-499';
  if (units < 500)  return '500-999';
  if (units < 1000) return '1000-1999';
  if (units < 2000) return '2000-2999';
  return '3000+';
}

async function shopifyGraphQL(query, variables = {}) {
  const res = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': storefrontToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

module.exports = async (req, res) => {
  // CORS headers for Vercel
  res.setHeader('Access-Control-Allow-CORS', '*');
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
      units,          // exact number of units (e.g. 76)
      sleeve,         // 'yes' or 'no'
      albumArtUrl,    // Cloudinary URL for uploaded album art
      musicType,      // 'url' or 'csv'
      musicUrl,       // if musicType === 'url': the URL
      csvUrl,         // if musicType === 'csv': Cloudinary URL for uploaded CSV
      csvCount,       // if musicType === 'csv': number of codes in the CSV
      buyerEmail,     // optional, for cart email attribute
    } = req.body || {};

    if (!units || units < 1) {
      res.status(400).json({ error: 'units is required and must be >= 1' });
      return;
    }

    const tier = getTier(units);
    const variant = VARIANT_MAP[tier];

    // Build line item attributes
    // sleeve: 'yes' | 'no' | 'card'
    // 'card' = card only, no sleeve — same as 'no' for fulfillment, but tracked as 'card'
    const isSleeve = sleeve === 'yes';
    const isCardOnly = sleeve === 'card';
    const lineAttributes = [
      { key: 'intended_units', value: String(units) },
      { key: 'sleeve', value: isSleeve ? 'yes' : (isCardOnly ? 'card_only' : 'no') },
    ];
    if (albumArtUrl) {
      // Underscore prefix = admin-only, not shown to customer on checkout
      const isDataUrl = albumArtUrl.startsWith('data:');
      lineAttributes.push({ key: '_album_art_url', value: isDataUrl ? '[uploaded - see order]' : albumArtUrl });
    }
    if (musicType === 'url' && musicUrl) {
      lineAttributes.push({ key: 'music_url', value: musicUrl });
    } else if (musicType === 'csv' && csvUrl) {
      // Underscore prefix = admin-only
      lineAttributes.push({ key: '_csv_url', value: csvUrl });
      if (csvCount) lineAttributes.push({ key: '_csv_code_count', value: String(csvCount) });
    }
    lineAttributes.push({ key: 'source', value: 'custom-goodz-configurator' });

    // Build cart attributes (mirrors line attributes for order visibility)
    const cartAttributes = [
      { key: 'intended_units', value: String(units) },
      { key: 'sleeve', value: isSleeve ? 'yes' : (isCardOnly ? 'card_only' : 'no') },
      { key: 'source', value: 'custom-goodz-configurator' },
    ];
    if (albumArtUrl) {
      const isDataUrl = albumArtUrl.startsWith('data:');
      cartAttributes.push({ key: '_album_art_url', value: isDataUrl ? '[uploaded - see order]' : albumArtUrl });
    }
    if (musicType === 'url' && musicUrl) {
      cartAttributes.push({ key: 'music_url', value: musicUrl });
    } else if (musicType === 'csv' && csvUrl) {
      cartAttributes.push({ key: '_csv_url', value: csvUrl });
      if (csvCount) cartAttributes.push({ key: '_csv_code_count', value: String(csvCount) });
    }

    const cartInput = {
      lines: [{
        quantity: parseInt(units, 10),
        merchandiseId: variant.variantId,
        attributes: lineAttributes,
      }],
      attributes: cartAttributes,
    };

    if (buyerEmail) {
      cartInput.email = buyerEmail;
    }

    const data = await shopifyGraphQL(`
      mutation CartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
            totalQuantity
            cost {
              totalAmount { amount currencyCode }
            }
          }
          userErrors { field message }
        }
      }
    `, { input: cartInput });

    const { cart, userErrors } = data.cartCreate;

    if (userErrors && userErrors.length > 0) {
      res.status(400).json({ error: userErrors[0].message });
      return;
    }

    res.status(200).json({
      checkoutUrl: cart.checkoutUrl,
      cartId: cart.id,
      totalQuantity: cart.totalQuantity,
      totalAmount: cart.cost.totalAmount.amount,
      tier,
      variantId: variant.variantId,
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};