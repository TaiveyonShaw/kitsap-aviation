(function () {
  var nav = document.querySelector('.site-nav');
  if (!nav) return;
  var toggle = nav.querySelector('.nav-toggle');
  var label = nav.querySelector('.nav-toggle-label');
  var icon = nav.querySelector('.nav-toggle-icon');
  var menu = document.getElementById('nav-menu');
  if (!toggle || !menu) return;
  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Close' : 'Menu';
    icon.textContent = open ? '×' : '☰';
  }
  nav.classList.add('nav-ready');
  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { setOpen(false); });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
  document.addEventListener('click', function (event) {
    if (!nav.contains(event.target)) setOpen(false);
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', function () {
    var focusInMenu = menu.contains(document.activeElement);
    setOpen(false);
    if (window.matchMedia('(max-width: 900px)').matches && focusInMenu) toggle.focus();
  });
})();
