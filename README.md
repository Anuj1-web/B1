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
- `js/search.js` – site-wide search (home) and scoped search (category / exam / folder pages)
- `js/app.js` – router and mobile menu
- `js/ui.js` – scroll progress, back-to-top, card glow/tilt, footer year
- `js/admin.js` – admin shell, categories, content (`#/admin`, lazy-loaded)
- `js/admin-exams.js` – exams & folders manager (lazy-loaded)
- `js/admin-tests.js` – quiz/test builder (lazy-loaded)
- `js/engine.js` – quiz & test engine at `#/exam/<id>` (lazy-loaded)

Likes: visitors can like/save for themselves, but no counts are shown publicly and the database does not expose them to visitors (admin only).

Host on GitHub Pages / Netlify. In Supabase → Authentication → URL configuration, add your site URL.

## Update v3
- Home “Fresh on the shelf”: 2 items on phones, up to 4 on larger screens.
- Tests open in full screen (Fullscreen API; on iPhone Safari add the site to the Home Screen for the same effect). Palette has **Quit test** + **Submit test**.
- Results: **Review your answers** opens a one-question-at-a-time review with a green / red / blank palette.
- Search on home and inside every category, exam and folder page; results replace the page content while searching.
- Footer is pinned to the bottom of the screen on short pages.
- Database: `search_trigram_indexes` migration (pg_trgm indexes on items / folders / exams / assessments).
