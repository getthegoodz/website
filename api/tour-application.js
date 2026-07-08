const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5;

// Best-effort in-memory limiter (works per warm instance)
const ipHits = new Map();

function getIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) {
    return xf.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function checkRate(ip) {
  const now = Date.now();
  const arr = ipHits.get(ip) || [];
  const recent = arr.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  ipHits.set(ip, recent);
  return true;
}

async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, reason: 'Missing TURNSTILE_SECRET_KEY' };
  if (!token) return { ok: false, reason: 'Missing captcha token' };

  const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret,
      response: token,
      remoteip: ip,
    }),
  });

  const data = await resp.json();
  return { ok: !!data.success, reason: (data['error-codes'] || []).join(',') || 'verification_failed' };
}

function validEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
}

function badRequest(res, code, error) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error }));
}

const ROOM_SIZES = ['Under 100', '100-300', '300-700', '700+'];
const TAP_OPTIONS = [
  'My album (as download or stream)',
  'A link hub (Linktree etc.)',
  'Something fans can\'t get anywhere else',
  'Something else / No idea yet',
];
const POST_OPTIONS = ['Yes', 'Probably', 'Rather not'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return badRequest(res, 405, 'Method not allowed');
  }

  const ip = getIp(req);
  if (!checkRate(ip)) {
    return badRequest(res, 429, 'Too many requests. Please try again later.');
  }

  const body = req.body || {};
  const artistName = String(body.artistName || '').trim().slice(0, 256);
  const links = String(body.links || '').trim().slice(0, 2000);
  const shows = String(body.shows || '').trim().slice(0, 2000);
  const roomSize = String(body.roomSize || '').trim();
  const merch = String(body.merch || '').trim().slice(0, 2000);
  const tapOpen = String(body.tapOpen || '').trim();
  const wouldPost = String(body.wouldPost || '').trim();
  const email = String(body.email || '').trim().slice(0, 256);
  const company = String(body.company || '').trim(); // honeypot
  const turnstileToken = String(body.turnstileToken || '').trim();

  if (company) {
    // Silent success for bots
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: true }));
  }

  if (!artistName || !links || !shows || !merch || !email) {
    return badRequest(res, 400, 'Please complete all required fields.');
  }
  if (!validEmail(email)) {
    return badRequest(res, 400, 'Please enter a valid email address.');
  }
  if (roomSize && !ROOM_SIZES.includes(roomSize)) {
    return badRequest(res, 400, 'Invalid room size selection.');
  }
  if (tapOpen && !TAP_OPTIONS.includes(tapOpen)) {
    return badRequest(res, 400, 'Invalid tap selection.');
  }
  if (wouldPost && !POST_OPTIONS.includes(wouldPost)) {
    return badRequest(res, 400, 'Invalid posting selection.');
  }

  const captcha = await verifyTurnstile(turnstileToken, ip);
  if (!captcha.ok) {
    return badRequest(res, 400, 'Captcha verification failed. Please try again.');
  }

  const resendKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;

  if (!resendKey || !toEmail || !fromEmail) {
    return badRequest(res, 500, 'Email service is not configured.');
  }

  const payload = {
    from: fromEmail,
    to: [toEmail],
    reply_to: email,
    subject: `Tour 50-pack application: ${artistName}`,
    text: [
      `Artist / band: ${artistName}`,
      `Email: ${email}`,
      '',
      'Links:',
      links,
      '',
      `Shows this fall: ${shows}`,
      `Room size: ${roomSize || '(not answered)'}`,
      '',
      'Sells merch now / what sells best:',
      merch,
      '',
      `Tap would open: ${tapOpen || '(not answered)'}`,
      `Would post about them: ${wouldPost || '(not answered)'}`,
      '',
      `IP: ${ip}`,
    ].join('\n'),
  };

  const sendResp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!sendResp.ok) {
    const txt = await sendResp.text().catch(() => '');
    return badRequest(res, 502, `Email send failed (${sendResp.status}). ${txt.slice(0, 180)}`);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true }));
};
