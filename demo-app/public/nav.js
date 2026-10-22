// Shared header navigation
document.addEventListener('DOMContentLoaded', () => {
  const pages = ['login', 'dashboard', 'forms', 'alerts', 'frames', 'windows', 'table', 'interactions', 'waits', 'browser', 'downloads'];
  const header = document.createElement('header');
  header.innerHTML = '<strong>QA Demo App</strong>' + pages.map((p) => `<a href="/${p}.html" data-nav="${p}">${p[0].toUpperCase() + p.slice(1)}</a>`).join('');
  document.body.prepend(header);
});
