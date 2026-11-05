# The Little Info

Educational site (videos, notes, revision sheets, quizzes, tests) on Supabase. Plain HTML/CSS/JS, no build step.

## Structure students see
Category → Exam → Folders (batch / chapter / test group … any depth) → content rows.

## Files
- `index.html` – page shell
- `css/style.css` – styles (rows on mobile, cards on desktop)
- `js/core.js` – Supabase URL + publishable key, helpers, lazy loader
- `js/site.js` – home, category page, content viewer
- `js/browse.js` – exam & folder pages, breadcrumbs
- `js/app.js` – router and mobile menu
- `js/ui.js` – scroll progress, back-to-top, card glow/tilt, footer year
- `js/admin.js` – admin shell, categories, content (`#/admin`, lazy-loaded)
- `js/admin-exams.js` – exams & folders manager (lazy-loaded)
- `js/admin-tests.js` – quiz/test builder (lazy-loaded)
- `js/engine.js` – quiz & test engine at `#/exam/<id>` (lazy-loaded)

Likes: visitors can like/save for themselves, but no counts are shown publicly and the database does not expose them to visitors (admin only).

Host on GitHub Pages / Netlify. In Supabase → Authentication → URL configuration, add your site URL.
