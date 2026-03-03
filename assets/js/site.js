(function () {
  'use strict';

  document.getElementById('year').textContent = new Date().getFullYear();

  const toggle = document.getElementById('theme-toggle');
  const html   = document.documentElement;

  // Default is dark (set on <html>); override only if user explicitly chose light
  if (localStorage.getItem('theme') === 'light') {
    html.classList.remove('dark');
    toggle.textContent = '[☾]';
  }

  toggle.addEventListener('click', function () {
    html.classList.toggle('dark');
    const isDark = html.classList.contains('dark');
    toggle.textContent = isDark ? '[☀]' : '[☾]';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
})();
