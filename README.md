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

## Update v8 — Tests hub + library import
- **Tests categories** (`kind = tests`): opening an exam shows a banner, a tab switch (Full Test / Sectional / PYQ / AI Generated / Topic-wise …), section chips and one horizontal card per test (`js/hub.js`). Exams that have no tests yet still show their folders.
- **Admin → Tests Hub** (`js/admin-hub.js`): exam banner + defaults (time, marks, negative marking), tabs (rename, order, live ✓, add / delete), section list with test counts and a live ✓, every test (tab, minutes, free, live ✓, questions, delete) and editable exam **presets**.
- **Admin → Library import** (`js/admin-library.js`): reads the Test-wise question library on the admin's PC through the read-only **Website Bridge** (`qbank_bridge.py`), previews / edits every question with its pictures, then publishes the test as one Full test and / or one Sectional test per section. Pictures are uploaded once (compressed to WebP), and everything is undone if anything fails.
- Questions can have several pictures, picture options, a passage, a solution picture and **bold / italic / underline** (`[b] [i] [u]` tags). Pictures are shown in the test window, quiz and review.
- Database: migrations `tests_hub_upgrade_v1` and `tests_hub_marks_defaults` (exam presets, `exam_tabs`, new columns on `exams`, `assessments`, `questions`, `question_keys`, counters kept by triggers, `submit_attempt` returns the solution picture).
- 🧹 *Clean unused files* now walks every folder of the bucket and checks all picture columns.
- New files: `js/hub.js`, `js/admin-hub.js`, `js/admin-library.js`.

## Update v9
- Quizzes and Tests category pages: gradient header + horizontal strips (exams / quizzes); phones get the same strips stacked.
- Question text: bold / italic / underline and the library's maths markup (fractions, roots, overlines, powers) are drawn properly.
- Hindi: language picker on the instructions page and a language dropdown in the test, quiz and review windows (Noto Sans Devanagari).
- Pictures are preloaded so questions open without a gap.
- No default pass mark any more (migration `no_pass_marks_and_hindi`).
