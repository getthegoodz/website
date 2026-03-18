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
  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();
  const company = String(body.company || '').trim(); // honeypot
  const turnstileToken = String(body.turnstileToken || '').trim();

  if (company) {
    // Silent success for bots
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: true }));
  }

  if (!firstName || !lastName || !email || !message) {
    return badRequest(res, 400, 'Please complete all required fields.');
  }
  if (!validEmail(email)) {
    return badRequest(res, 400, 'Please enter a valid email address.');
  }
  if (message.length < 10) {
    return badRequest(res, 400, 'Please include a bit more detail in your message.');
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
    subject: `New Goodz contact form message from ${firstName} ${lastName}`,
    text: [
      `Name: ${firstName} ${lastName}`,
      `Email: ${email}`,
      `IP: ${ip}`,
      '',
      'Message:',
      message,
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
