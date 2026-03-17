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

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initFaq();
  });
})();
