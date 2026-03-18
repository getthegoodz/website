(function () {
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

  function disableNewsletterForms() {
    var forms = document.querySelectorAll('form[id="Newsletter-Form"], form[name="wf-form-Newsletter-Email"]');
    forms.forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var block = form.closest('.w-form') || form.parentElement;
        if (!block) return;
        var done = block.querySelector('.w-form-done');
        var fail = block.querySelector('.w-form-fail');
        if (fail) fail.style.display = 'none';
        if (done) {
          done.style.display = 'block';
          var msg = done.querySelector('div');
          if (msg) msg.textContent = 'Newsletter is currently paused. Please use the contact page for inquiries.';
        }
      });
    });
  }

  function initContactForm() {
    var form = document.getElementById('email-form');
    if (!form) return;

    var turnstileToken = '';
    var turnstileContainer = document.getElementById('turnstile-container');

    if (turnstileContainer && window.fetch) {
      fetch('/api/public-config')
        .then(function (r) { return r.json(); })
        .then(function (cfg) {
          if (!cfg || !cfg.turnstileSiteKey || !window.turnstile) return;
          window.turnstile.render('#turnstile-container', {
            sitekey: cfg.turnstileSiteKey,
            callback: function (token) { turnstileToken = token || ''; },
            'error-callback': function () { turnstileToken = ''; },
            'expired-callback': function () { turnstileToken = ''; }
          });
        })
        .catch(function () {});
    }

    var submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');
    var formBlock = form.closest('.w-form') || form.parentElement;
    var done = formBlock ? formBlock.querySelector('.w-form-done') : null;
    var fail = formBlock ? formBlock.querySelector('.w-form-fail') : null;

    function setMessage(ok, text) {
      if (done) done.style.display = ok ? 'block' : 'none';
      if (fail) fail.style.display = ok ? 'none' : 'block';
      var target = ok ? done : fail;
      if (!target) return;
      var msg = target.querySelector('div');
      if (msg && text) msg.textContent = text;
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      setMessage(false, '');

      var firstName = (form.querySelector('[name="First-name"]') || {}).value || '';
      var lastName = (form.querySelector('[name="Last-name"]') || {}).value || '';
      var email = (form.querySelector('[name="Email---Contact-Form"]') || {}).value || '';
      var message = (form.querySelector('[name="Message---Contact-Form"]') || {}).value || '';
      var company = (form.querySelector('[name="company"]') || {}).value || '';

      // token is provided by Turnstile callback

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
        if (!res.ok) {
          throw new Error(data.error || 'Submission failed');
        }

        form.reset();
        if (window.turnstile) {
          try { window.turnstile.reset('#turnstile-container'); } catch (_e) {}
        }
        turnstileToken = '';
        setMessage(true, 'Thanks. Your message has been sent to the Goodz team.');
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

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initFaq();
    disableNewsletterForms();
    initContactForm();
  });
})();
