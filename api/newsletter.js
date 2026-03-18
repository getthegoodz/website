const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 8;
const ipHits = new Map();

function getIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) return xf.split(',')[0].trim();
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
  if (!secret) return { ok: false };
  if (!token) return { ok: false };

  const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  const data = await resp.json();
  return { ok: !!data.success };
}

function validEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
}

function reply(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed' });

  const ip = getIp(req);
  if (!checkRate(ip)) return reply(res, 429, { error: 'Too many requests. Try later.' });

  const body = req.body || {};
  const email = String(body.email || '').trim();
  const company = String(body.company || '').trim();
  const token = String(body.turnstileToken || '').trim();
  const page = String(body.page || '').trim();

  if (company) return reply(res, 200, { ok: true });
  if (!validEmail(email)) return reply(res, 400, { error: 'Please enter a valid email address.' });

  const captcha = await verifyTurnstile(token, ip);
  if (!captcha.ok) return reply(res, 400, { error: 'Captcha verification failed. Please retry.' });

  const resendKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;
  if (!resendKey || !toEmail || !fromEmail) return reply(res, 500, { error: 'Email service not configured.' });

  const payload = {
    from: fromEmail,
    to: [toEmail],
    reply_to: email,
    subject: `Goodz footer signup: ${email}`,
    text: [
      'Footer signup captured (newsletter currently paused).',
      `Email: ${email}`,
      `Page: ${page || 'unknown'}`,
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
    return reply(res, 502, { error: `Email send failed (${sendResp.status}). ${txt.slice(0, 140)}` });
  }

  return reply(res, 200, { ok: true });
};
