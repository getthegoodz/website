// Resolve a tapped Goodz target URL into a normalized render contract.
//
//   GET /api/resolve-tap?url=<encoded music or web url>
//   -> { provider, providerName, accent, tier, title, artist, artworkUrl,
//        embedUrl, openUrl }
//
// tier 1 = inline player + art (Spotify, Apple, YouTube, SoundCloud, Deezer, Tidal)
// tier 2 = art + "Open in X" button, no inline player (Qobuz, Amazon, Pandora, Bandcamp)
// tier 3 = generic: whatever og: data we can scrape, else a branded default
//
// Everything resolves server-side so the browser never hits a CORS wall and no
// API secrets are exposed. The single tapped page renders purely from this JSON.

const FETCH_TIMEOUT_MS = 7000;
const UA =
  'Mozilla/5.0 (compatible; GoodzTapBot/1.0; +https://getthegoodz.com)';

// Provider brand metadata. accent drives the CTA color on the page.
const BRAND = {
  spotify:    { name: 'Spotify',       accent: '#1DB954' },
  apple:      { name: 'Apple Music',   accent: '#FA243C' },
  youtube:    { name: 'YouTube',       accent: '#FF0000' },
  soundcloud: { name: 'SoundCloud',    accent: '#FF5500' },
  deezer:     { name: 'Deezer',        accent: '#A238FF' },
  tidal:      { name: 'TIDAL',         accent: '#111111' },
  qobuz:      { name: 'Qobuz',         accent: '#0070EF' },
  amazon:     { name: 'Amazon Music',  accent: '#00A8E1' },
  pandora:    { name: 'Pandora',       accent: '#3668FF' },
  bandcamp:   { name: 'Bandcamp',      accent: '#629AA9' },
  generic:    { name: 'the link',      accent: '#FEC850' },
};

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  // Edge-cache: playlist art/metadata is stable; repeat taps should be instant.
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.end(JSON.stringify(obj));
}

// Reject anything that isn't a public http(s) URL (basic SSRF guard for the
// generic og-scrape path, which fetches a user-supplied URL).
function parsePublicUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const h = u.hostname.toLowerCase();
  if (
    h === 'localhost' ||
    h.endsWith('.local') ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h === '[::1]' ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)
  ) return null;
  return u;
}

function withTimeout(ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t) };
}

async function fetchJson(url) {
  const t = withTimeout(FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: t.signal, headers: { 'User-Agent': UA } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; } finally { t.done(); }
}

// Fetch a page's HTML (first ~200KB) with a browser-ish UA.
async function fetchHtml(url) {
  const t = withTimeout(FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: t.signal, headers: { 'User-Agent': UA } });
    if (!r.ok) return '';
    return (await r.text()).slice(0, 200000);
  } catch { return ''; } finally { t.done(); }
}

// Parse og:/twitter: meta from raw HTML.
function parseOg(html) {
  const meta = (prop) => {
    const re = new RegExp(
      '<meta[^>]+(?:property|name)=["\']' + prop +
        '["\'][^>]+content=["\']([^"\']+)["\']', 'i');
    const m = html.match(re) ||
      html.match(new RegExp(
        '<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']' +
          prop + '["\']', 'i'));
    return m ? decodeEntities(m[1]) : '';
  };
  return {
    image: meta('og:image') || meta('twitter:image'),
    title: meta('og:title') || meta('twitter:title'),
    siteName: meta('og:site_name'),
    description: meta('og:description'),
  };
}

async function fetchOg(url) { return parseOg(await fetchHtml(url)); }

// Bandcamp has no oEmbed; the release id lives in the bc-page-properties meta.
// Build an EmbeddedPlayer iframe URL from it (album shows a tracklist).
function extractBandcampEmbed(html) {
  const m = html.match(/bc-page-properties"\s+content="([^"]+)"/i);
  if (!m) return null;
  let props;
  try { props = JSON.parse(decodeEntities(m[1])); } catch { return null; }
  if (!props.item_id) return null;
  const kind = props.item_type === 't' ? 'track' : 'album';
  return {
    embedUrl: 'https://bandcamp.com/EmbeddedPlayer/' + kind + '=' + props.item_id +
      '/size=large/bgcol=0a0a0a/linkcol=ffffff/tracklist=' +
      (kind === 'album' ? 'true' : 'false') + '/transparent=true/',
    embedHeight: kind === 'album' ? 470 : 120,
  };
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
}

function srcFromOembedHtml(html) {
  if (!html) return '';
  const m = html.match(/src=["']([^"']+)["']/i);
  return m ? decodeEntities(m[1]) : '';
}

function detectProvider(u) {
  const h = u.hostname.toLowerCase().replace(/^www\./, '');
  if (h.endsWith('spotify.com')) return 'spotify';
  if (h.endsWith('music.apple.com') || h.endsWith('itunes.apple.com')) return 'apple';
  if (h.endsWith('youtube.com') || h === 'youtu.be' || h.endsWith('music.youtube.com')) return 'youtube';
  if (h.endsWith('soundcloud.com')) return 'soundcloud';
  if (h.endsWith('deezer.com')) return 'deezer';
  if (h.endsWith('tidal.com')) return 'tidal';
  if (h.endsWith('qobuz.com')) return 'qobuz';
  if (h.includes('music.amazon.')) return 'amazon';
  if (h.endsWith('pandora.com')) return 'pandora';
  if (h.endsWith('bandcamp.com')) return 'bandcamp';
  return 'generic';
}

function base(provider, tier, openUrl, extra) {
  const b = BRAND[provider] || BRAND.generic;
  return {
    provider,
    providerName: b.name,
    accent: b.accent,
    tier,
    title: '',
    artist: '',
    artworkUrl: '',
    embedUrl: '',
    embedHeight: 0,
    openUrl,
    ...extra,
  };
}

// ── Tier 1 resolvers ────────────────────────────────────────────────

async function resolveSpotify(u) {
  const m = u.href.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|artist|show|episode)\/([A-Za-z0-9]+)/);
  const embedUrl = m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : '';
  const o = await fetchJson(`https://open.spotify.com/oembed?url=${encodeURIComponent(u.href)}`);
  return base('spotify', 1, u.href, {
    title: o?.title || '',
    artworkUrl: o?.thumbnail_url || '',
    embedUrl: embedUrl || srcFromOembedHtml(o?.html),
  });
}

async function resolveYouTube(u) {
  // Normalize music.youtube.com → youtube.com so oEmbed resolves.
  const canonical = u.href.replace('music.youtube.com', 'www.youtube.com');
  const o = await fetchJson(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(canonical)}`);
  return base('youtube', 1, u.href, {
    title: o?.title || '',
    artist: o?.author_name || '',
    artworkUrl: o?.thumbnail_url || '',
    embedUrl: srcFromOembedHtml(o?.html),
  });
}

async function resolveSoundCloud(u) {
  const o = await fetchJson(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(u.href)}`);
  return base('soundcloud', 1, u.href, {
    title: o?.title || '',
    artist: o?.author_name || '',
    artworkUrl: o?.thumbnail_url || '',
    embedUrl: srcFromOembedHtml(o?.html),
  });
}

async function resolveDeezer(u) {
  const o = await fetchJson(`https://api.deezer.com/oembed?format=json&url=${encodeURIComponent(u.href)}`);
  return base('deezer', 1, u.href, {
    title: o?.title || '',
    artworkUrl: o?.thumbnail_url || '',
    embedUrl: srcFromOembedHtml(o?.html),
  });
}

async function resolveTidal(u) {
  // Tidal oEmbed returns a player but no art/title; pull art from og:.
  const [o, og] = await Promise.all([
    fetchJson(`https://oembed.tidal.com/?url=${encodeURIComponent(u.href)}`),
    fetchOg(u.href),
  ]);
  return base('tidal', 1, u.href, {
    title: og.title || o?.title || '',
    artworkUrl: og.image || o?.thumbnail_url || '',
    embedUrl: srcFromOembedHtml(o?.html),
  });
}

async function resolveApple(u) {
  // No public oEmbed; embed.music.apple.com renders an inline player. Art/title
  // from og: on the original page.
  const embedUrl = u.href.replace(/music\.apple\.com/, 'embed.music.apple.com');
  const og = await fetchOg(u.href);
  return base('apple', 1, u.href, {
    title: og.title || '',
    artworkUrl: og.image || '',
    embedUrl,
  });
}

// ── Tier 2 / generic ────────────────────────────────────────────────

async function resolveTier2(provider, u) {
  const og = await fetchOg(u.href);
  return base(provider, 2, u.href, {
    title: og.title || '',
    artworkUrl: og.image || '',
  });
}

// Bandcamp album/track stream link → inline player + art (tier 1).
// (The separate download-code Bandcamp flow is a different page, not this.)
async function resolveBandcamp(u) {
  const html = await fetchHtml(u.href);
  const og = parseOg(html);
  const emb = extractBandcampEmbed(html);
  return base('bandcamp', emb ? 1 : 2, u.href, {
    title: og.title || '',
    artworkUrl: og.image || '',
    embedUrl: emb ? emb.embedUrl : '',
    embedHeight: emb ? emb.embedHeight : 0,
  });
}

async function resolveGeneric(u) {
  const html = await fetchHtml(u.href);
  const og = parseOg(html);
  // A custom-domain Bandcamp page identifies via og:site_name.
  if ((og.siteName || '').toLowerCase() === 'bandcamp') {
    const emb = extractBandcampEmbed(html);
    return base('bandcamp', emb ? 1 : 2, u.href, {
      title: og.title || '',
      artworkUrl: og.image || '',
      embedUrl: emb ? emb.embedUrl : '',
      embedHeight: emb ? emb.embedHeight : 0,
    });
  }
  const hasArt = Boolean(og.image);
  return base('generic', hasArt ? 2 : 3, u.href, {
    title: og.title || '',
    artworkUrl: og.image || '',
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { error: 'method_not_allowed' });
  }
  const raw = (req.query && req.query.url) ||
    new URL(req.url, 'http://x').searchParams.get('url') || '';
  const u = parsePublicUrl(raw);
  if (!u) return send(res, 400, base('generic', 3, '', { error: 'invalid_url' }));

  const provider = detectProvider(u);
  try {
    let out;
    switch (provider) {
      case 'spotify':    out = await resolveSpotify(u); break;
      case 'youtube':    out = await resolveYouTube(u); break;
      case 'soundcloud': out = await resolveSoundCloud(u); break;
      case 'deezer':     out = await resolveDeezer(u); break;
      case 'tidal':      out = await resolveTidal(u); break;
      case 'apple':      out = await resolveApple(u); break;
      case 'bandcamp':   out = await resolveBandcamp(u); break;
      case 'qobuz':
      case 'amazon':
      case 'pandora':    out = await resolveTier2(provider, u); break;
      default:           out = await resolveGeneric(u); break;
    }
    return send(res, 200, out);
  } catch (e) {
    // Never dead-end: fall back to a branded default that still opens the link.
    return send(res, 200, base(provider, 3, u.href, {}));
  }
};
