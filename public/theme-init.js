// Applies the saved (or OS) colour theme before first paint so there is no light flash.
// Kept as a file rather than inline: the site's CSP only allows scripts from 'self'.
(function () {
  try {
    var saved = localStorage.getItem('nuts_theme');
    var dark = saved === 'dark' || (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
