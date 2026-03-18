(function () {
  var turnstileCfgPromise = null;
  var turnstileScriptPromise = null;

  function getTurnstileConfig() {
    if (!turnstileCfgPromise) {
      turnstileCfgPromise = fetch('/api/public-config')
        .then(function (r) { return r.json(); })
        .catch(function () { return {}; });
    }
    return turnstileCfgPromise;
  }

  function ensureTurnstileScript() {
    if (window.turnstile) return Promise.resolve();
    if (turnstileScriptPromise) return turnstileScriptPromise;

    turnstileScriptPromise = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-turnstile="1"]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      s.async = true;
      s.defer = true;
      s.setAttribute('data-turnstile', '1');
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Turnstile script failed to load')); };
      document.head.appendChild(s);
    });

    return turnstileScriptPromise;
  }

  function stripLegacyRecaptcha() {
    document.querySelectorAll('script[src*="recaptcha/api.js"], script[src*="recaptcha.net/recaptcha/api.js"]').forEach(function (s) {
      s.remove();
    });
  }

  function initNav() {
    var navs = document.querySelectorAll('.w-nav');
    navs.forEach(function (nav) {
      var button = nav.querySelector('.w-nav-button');
      var menu = nav.querySelector('.w-nav-menu');
      if (!button || !menu) return;

      if (!button.hasAttribute('aria-label')) {
        button.setAttribute('aria-label', 'Toggle navigation menu');
      }
      button.setAttribute('role', 'button');
      button.setAttribute('tabindex', '0');
      button.setAttribute('aria-expanded', 'false');

      function setOpen(open) {
        nav.classList.toggle('is-open', open);
        menu.classList.toggle('is-open', open);
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
      }

      button.addEventListener('click', function () {
        setOpen(!nav.classList.contains('is-open'));
      });

      button.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen(!nav.classList.contains('is-open'));
        }
      });

      menu.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          setOpen(false);
        });
      });
    });
  }

  function initFaq() {
    var accordions = document.querySelectorAll('.faq3_accordion');
    accordions.forEach(function (acc) {
      var question = acc.querySelector('.faq3_question');
      var answer = acc.querySelector('.faq3_answer');
      if (!question || !answer) return;

      question.setAttribute('role', 'button');
      question.setAttribute('tabindex', '0');
      question.setAttribute('aria-expanded', 'false');
      answer.style.height = '0px';

      function setOpen(open) {
        acc.classList.toggle('is-open', open);
        question.setAttribute('aria-expanded', open ? 'true' : 'false');
        answer.style.height = open ? answer.scrollHeight + 'px' : '0px';
      }

      function toggle() {
        setOpen(!acc.classList.contains('is-open'));
      }

      question.addEventListener('click', toggle);
      question.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });

      window.addEventListener('resize', function () {
        if (acc.classList.contains('is-open')) {
          answer.style.height = answer.scrollHeight + 'px';
        }
      });
    });
  }

  function attachTurnstile(form, container, onToken) {
    return Promise.all([getTurnstileConfig(), ensureTurnstileScript()])
      .then(function (vals) {
        var cfg = vals[0] || {};
        if (!cfg.turnstileSiteKey || !window.turnstile) return;

        container.classList.remove('g-recaptcha', 'g-recaptcha-error', 'g-recaptcha-disabled');
        container.classList.add('cf-turnstile');
        container.removeAttribute('data-sitekey');
        container.innerHTML = '';

        window.turnstile.render(container, {
          sitekey: cfg.turnstileSiteKey,
          callback: function (token) { onToken(token || ''); },
          'error-callback': function () { onToken(''); },
          'expired-callback': function () { onToken(''); }
        });
      })
      .catch(function () {});
  }

  function setupMessages(form, successText, errorText) {
    var formBlock = form.closest('.w-form') || form.parentElement;
    var done = formBlock ? formBlock.querySelector('.w-form-done') : null;
    var fail = formBlock ? formBlock.querySelector('.w-form-fail') : null;

    function setMessage(ok, text) {
      if (done) done.style.display = ok ? 'block' : 'none';
      if (fail) fail.style.display = ok ? 'none' : 'block';
      var target = ok ? done : fail;
      if (!target) return;
      var msg = target.querySelector('div');
      if (msg) msg.textContent = text || (ok ? successText : errorText);
    }

    return setMessage;
  }

  function initContactForm() {
    var form = document.getElementById('email-form');
    if (!form) return;

    var turnstileToken = '';
    var turnstileContainer = document.getElementById('turnstile-container') || form.querySelector('.w-form-formrecaptcha');
    if (turnstileContainer) {
      turnstileContainer.id = turnstileContainer.id || 'turnstile-container';
      attachTurnstile(form, turnstileContainer, function (token) { turnstileToken = token; });
    }

    var submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');
    var setMessage = setupMessages(
      form,
      'Thanks. Your message has been sent to the Goodz team.',
      'Could not send. Please try again.'
    );

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      setMessage(false, '');

      var firstName = (form.querySelector('[name="First-name"]') || {}).value || '';
      var lastName = (form.querySelector('[name="Last-name"]') || {}).value || '';
      var email = (form.querySelector('[name="Email---Contact-Form"]') || {}).value || '';
      var message = (form.querySelector('[name="Message---Contact-Form"]') || {}).value || '';
      var company = (form.querySelector('[name="company"]') || {}).value || '';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.value = 'Sending...';
      }

      try {
        var res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: firstName,
            lastName: lastName,
            email: email,
            message: message,
            company: company,
            turnstileToken: turnstileToken
          })
        });

        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.error || 'Submission failed');

        form.reset();
        if (window.turnstile && turnstileContainer) {
          try { window.turnstile.reset(turnstileContainer); } catch (_e) {}
        }
        turnstileToken = '';
        setMessage(true);
      } catch (err) {
        setMessage(false, (err && err.message) ? err.message : 'Could not send. Please try again.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.value = 'Submit';
        }
      }
    });
  }

  function initNewsletterForms() {
    var forms = document.querySelectorAll('form[id="Newsletter-Form"], form[name="wf-form-Newsletter-Email"]');
    forms.forEach(function (form, idx) {
      var turnstileToken = '';
      var submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');
      var emailInput = form.querySelector('input[type="email"]');
      if (!emailInput) return;

      var honeypot = form.querySelector('input[name="company"]');
      if (!honeypot) {
        honeypot = document.createElement('input');
        honeypot.type = 'text';
        honeypot.name = 'company';
        honeypot.autocomplete = 'off';
        honeypot.tabIndex = -1;
        honeypot.style.position = 'absolute';
        honeypot.style.left = '-9999px';
        honeypot.style.opacity = '0';
        honeypot.style.pointerEvents = 'none';
        form.appendChild(honeypot);
      }

      var captchaContainer = form.querySelector('.w-form-formrecaptcha');
      if (!captchaContainer) {
        captchaContainer = document.createElement('div');
        form.insertBefore(captchaContainer, submitBtn || null);
      }
      captchaContainer.id = captchaContainer.id || ('newsletter-turnstile-' + idx);

      attachTurnstile(form, captchaContainer, function (token) { turnstileToken = token; });

      var setMessage = setupMessages(
        form,
        'Thanks. We got your email and will follow up directly.',
        'Could not submit. Please try again.'
      );

      form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.value = 'Sending...';
        }

        try {
          var res = await fetch('/api/newsletter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: emailInput.value || '',
              company: honeypot.value || '',
              turnstileToken: turnstileToken,
              page: window.location.pathname
            })
          });

          var data = await res.json().catch(function () { return {}; });
          if (!res.ok) throw new Error(data.error || 'Submission failed');

          form.reset();
          if (window.turnstile && captchaContainer) {
            try { window.turnstile.reset(captchaContainer); } catch (_e) {}
          }
          turnstileToken = '';
          setMessage(true);
        } catch (err) {
          setMessage(false, (err && err.message) ? err.message : 'Could not submit. Please try again.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.value = 'Subscribe';
          }
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    stripLegacyRecaptcha();
    initNav();
    initFaq();
    initContactForm();
    initNewsletterForms();
  });
})();
