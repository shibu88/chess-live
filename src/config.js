// Build-time site configuration (set per Netlify site via env vars).
//
// The default build is the full "Home" app. A single-tournament build (e.g. the
// World Chess Championship site) sets these at build time:
//   VITE_SITE_NAME="World Chess Championship"
//   VITE_DEFAULT_TOUR="qfkdt8mn"
// which renames the header/title and makes `#/` land on that tournament.

export const SITE_NAME = import.meta.env.VITE_SITE_NAME || 'Home';
export const DEFAULT_TOUR = import.meta.env.VITE_DEFAULT_TOUR || '';
