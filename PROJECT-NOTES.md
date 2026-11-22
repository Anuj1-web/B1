# Little Info — Project Notes

Paste this file into a new chat (or add it to a Claude Project) so work can continue without re-explaining anything.
Last updated: 22 Nov 2026. Current asset version: `?v=9`.

---

## 1. What the site is
A free study hub (static website): video lessons, notes, revision sheets, articles, links, quizzes and timed tests.
Visitors browse and take tests without logging in. One admin manages everything from `#/admin`.

- **Hosting:** static files (GitHub Pages style, `.nojekyll` present). No build step.
- **Backend:** Supabase project **"Education library"**
  - Project ID: `qhqukohdvafmfavukknu`
  - URL: `https://qhqukohdvafmfavukknu.supabase.co`
  - The public (anon) key and URL are in `js/core.js` (`CFG`). Never put the service-role key in the site.
- **Storage bucket:** `content` (public read). Admin-only upload / read / update / delete.

## 2. Repo layout (`b1/`)
```
index.html            page shell; loads scripts with ?v=N (bump N on every release to beat caching)
css/style.css         all styles (later "UPDATE v3" and video/upload blocks are appended at the end)
js/core.js            config, Supabase client `sb`, helpers ($, e, q, toast, ls), link parsing (yt, embedOf, mediaOf, thumbOf)
js/site.js            home page, category page, item viewer, cards (card, aCard)
js/browse.js          exam page, folder page, tiles, breadcrumbs
js/search.js          site-wide + scoped search (sbar, searchAll, wireSearch)
js/engine.js          quiz/test engine: full screen, palette, submit/quit, result, review mode, ask() dialog
js/app.js             router (hash routes), lazy loader need(...)
js/ui.js              header/menu/footer/misc UI
js/admin.js           admin shell, storage-cleanup helpers, categories + content tabs
js/admin-exams.js     Exams & Folders tab
js/admin-tests.js     Quizzes & Tests tab (assessments, sections, questions)
js/hub.js             public Tests hub page of one exam (banner, tab switch, section chips, test cards)  [lazy]
js/admin-hub.js       admin Tests Hub manager (exam defaults, tabs, sections, tests, presets)  [lazy]
js/admin-library.js   admin Library import (bridge connection, preview/edit, publish Full / Sectional, upload)  [lazy]
README.md
```
Load order (index.html): core → site → browse → search → app → ui. Admin files, hub.js and engine.js are lazy-loaded by `need()` (in `app.js` / `browse.js`, with `?v=N`).
Not part of the app (old copies, safe to delete): `css/*.js`, `index (22).html`, `download`. `admin.html`, `typing.html`, `results.html` are a separate typing-test project.

## 3. Routes (hash based)
`#/` home · `#/c/<slug>` category · `#/x/<examId>` exam (tests categories → Tests hub) · `#/f/<folderId>` folder · `#/i/<itemId>` content viewer · `#/exam/<assessmentId>` quiz/test intro and run · `#/saved` · `#/admin`

## 4. Content model
Category → Exam → Folders (nested, "batch / chapter") → Items and Assessments (quizzes / tests).
- **items:** `type` is one of video, youtube, pdf, article, link (others may exist). Columns used: `url`, `thumbnail_url`, `title`, `description`, `category_id`, `folder_id`, `duration`, `is_published`, `created_at`, `sort_order`, `tags`.
  - `type='youtube'` is also used for Vimeo and Google Drive embeds ("online video link").
  - Items inside folders also carry the category's `category_id`.
- **assessments:** kind quiz/test, `mode` (mixed / single_timer / sectional_timer), `pass_percent`, `negative_marking`, `duration_minutes`, `folder_id`, `category_id`. **New:** `exam_id` (a test can hang straight under an exam), `tab_id`, `section_name`, `is_free`, `exam_date`, `shift`, `languages`, `syllabus`, `source_key` (`lib:<CODE>:<testkey>[:<section>]`, unique per exam, used to find / replace library-published tests), `question_count`, `total_marks` (both kept by triggers on `questions`). Published = live.
- **exams:** also `code`, `tagline`, `theme` (indigo / purple / teal / rose / amber / slate), `languages`, `default_full_minutes`, `default_sectional_minutes` (null = proportional to question count), `default_marks`, `default_negative`. (There is **no default pass mark** any more: `assessments.pass_percent` is null unless the admin types one on a hand-made test; `exam_presets.pass_percent` and `exams.default_pass_percent` were dropped.) A before-insert trigger fills the defaults from `exam_presets`; an after-insert trigger creates the 5 default tabs.
- **exam_tabs** (`exam_id`, `key`, `label`, `sort_order`, `is_visible`): the Full / Sectional / PYQ / AI / Topic switch. Visible tabs only show once they hold a live test. **exam_presets**: admin-editable defaults by exam keyword (`match_words`), with a `verified` flag. CGL and CHSL are verified (60 min full, 15 min sectional, −0.5, 2 marks); NTPC, ALP, Group D, GD, CPO are from memory.
- **questions / question_keys:** questions are public; correct answers live in `question_keys` (not readable by visitors). **New on questions:** `images` (extra pictures; `image_url` stays the first), `option_images` (jsonb array of 4 URLs/nulls), `passage`, `passage_image_url`, `qbank_uid`. `question` may be `''` when the whole question is a picture; options may then be `''` too. Text supports `[b]…[/b] [i]…[/i] [u]…[/u]`. **New on question_keys:** `solution_image_url`, `explanation_hi`. **Hindi:** `questions.question_hi`, `options_hi` (jsonb, 4 items; a blank item falls back to the English option), `passage_hi`; English stays in the original columns.
- **sections, attempts, item_likes, admins, categories, exams, folders** also exist. RLS is enabled on every table.

### Database functions (RPC)
`submit_attempt` (grades a test, returns score + per-question review with correct index, `explanation`, `explanation_hi` and `solution_image`; `pass` is null when the test has no pass mark), `check_answer` (quiz; also returns `explanation_hi`), `check_answer` (quiz instant check), `claim_first_admin` (works once, while no admin exists), `is_admin()` (used by policies), `exam_preset_for(name)` (best matching preset), `copy_exam` (also copies exam settings + tabs).

### Delete rules
Parent → child foreign keys are `ON DELETE CASCADE` (category → exams/items/assessments, exam → folders/exam_tabs/**assessments**, folder → items/assessments, assessment → questions/sections). Deleting a tab only sets its tests' `tab_id` to null (they show under “Other tests”).

### Migrations applied by us
- `search_trigram_indexes`: `pg_trgm` (in `extensions` schema) + GIN indexes on items.title, items.description, folders.name, exams.name, assessments.title, plus `items(created_at desc)`.

- `tests_hub_upgrade_v1`: exam_presets, exam_tabs, new columns, triggers (defaults, seed tabs, question counters), `submit_attempt`, `copy_exam`.
- `tests_hub_marks_defaults`: `marks_per_question` on presets, `default_marks` on exams.
- `no_pass_marks_and_hindi`: pass marks removed (all existing tests set to null), Hindi columns, `submit_attempt` / `check_answer` / `copy_exam` / `exam_fill_defaults` updated.

### Files that can be referenced (all columns are checked before any file is removed)
`items.url`, `items.thumbnail_url`, `exams.cover_url`, `questions.image_url`, `questions.images[]`, `questions.option_images[]`, `questions.passage_image_url`, `question_keys.solution_image_url`.

## 4b. Tests hub and the Website Bridge (v8)
**Student side.** In a category of kind `tests`, `#/x/<exam>` opens the hub: gradient banner (logo, name, tagline, count per tab), tab switch, section chips (only when ≥2 sections), search (when >8 tests), cards with Free tag, Qs / marks / minutes, languages, date + shift, Share, **Start Now** (or **Resume** if a test is in progress, plus “Best N%” kept on that device). Desktop = horizontal rows (mock101 style); phones = RRB-ALP style cards. 30 cards at a time + “Show more”. Exams with no tests yet fall back to their folders. The category page no longer lists hub tests as loose content.
**Admin → Tests Hub.** Exam page and defaults; tabs (rename, ↑↓, live ✓, add, delete); sections with test count and a live ✓ (ticks every test of that section); tests table (tab, minutes, Free, Live ✓, Questions editor, Preview, Delete; bulk live / hide / move / delete); presets.
**Admin → Library import.** Needs the bridge running on the admin's PC:
- `qbank_bridge.py` (also `python qbank_app.py --bridge`, or `start_bridge.bat`): read-only HTTP server on `127.0.0.1:8765`, secret token (`QuestionLibrary\bridge_token.txt`), allowed websites in `QuestionLibrary\bridge_origins.txt` (plus `http://localhost`). Add the site once: `python qbank_bridge.py --allow https://<name>.github.io` (an origin has no path); when moving to a domain add the new origin and delete the old line. `--list-origins`, `--new-token`, `--db`, `--port` exist. Library data comes from `tw_exams`, `tw_tests`, `tw_qs`, `questions`, `passages`; pictures are read from the vault folder (`meta.vault_dir`, default `QuestionLibrary\Figures`); option pictures are files named `…o1.png`–`…o4.png`; `has_img=1` means the whole question is a picture; style marks become `[b] [i] [u]`.
- Flow: connect (token) → pick library exam and test → preview / edit / leave out questions → choose website exam (auto-matched by code, or create new), tabs, Full and / or each section, times (from exam defaults; editable per row), marks, negative marking, section names on the site → **Publish live** or **Save as draft**.
- Publishing: pictures are uploaded once to `tests/<code>/<testkey>/` (WebP, ≤1100 px, 4 at a time, 3 tries); then assessment → sections → questions → keys. Tests already published from the same library test are taken off the site first and deleted only after the new ones succeed. **Any failure undoes everything** (new tests, a newly created exam, uploaded files) and restores the old versions. Library data is never changed.
- Defaults: full test = `single_timer` (or `sectional_timer` with per-section minutes); sectional tests = `mixed` with one timer. Full-test sort order = library test number; sectional = number × 100 + section index.
- Chrome may ask once to allow access to devices on the local network: choose Allow.

## 4c. v9 additions
- **Quizzes and Tests category pages** (`catStrips` in `site.js`): same gradient header as the exam hub (colour by category kind), then one horizontal strip per exam (logo, name, test count, languages, “2 Full Test · 12 Sectional”, View tests) or per quiz / loose test. Phones get the RRB-ALP style (same strips, stacked). Other categories are unchanged. Shared helpers live in `site.js`: `banner()`, `tcardHTML()`, `wireShare()`, `HIC`, `HUB_THEME`.
- **Question text** (`rich()` in `core.js`): understands `[b] [i] [u]`, plain `<b> <i> <u> <sub> <sup> <br>`, the library's invisible style marks, and the library's maths markup `\frac{a}{b}`, `\sqrt{x}`, `\sqrt[n]{x}`, `\overline{x}`, `x^{2}`, `x_{1}` (drawn as real fractions / roots with CSS + inline SVG, no external library). Anything else is escaped, unbalanced tags are closed. Used for questions, options, passages, explanations and the admin preview.
- **Hindi**: if a question has a Hindi version the test shows a language picker on the instructions page (default = last choice, kept in `li_lang`) and a dropdown in the test window, quiz and review. The choice stays until it is switched back; a question without a Hindi version shows English. Text is marked `lang="hi"` and uses Noto Sans Devanagari (Google Fonts link in `index.html`, Nirmala UI fallback). Bridge: uses `stem_hi, oa_hi … od_hi, sol_hi` (+ `passages.text_hi`) when the library has those columns; otherwise it splits text that holds both languages by script (line by line, or where the script changes inside a line: `Dog / कुत्ता`). A pure-Hindi sentence with an English word is not split. The qbank app itself has no Hindi columns today. Admin: preview shows both languages, the question editor (Library import and Tests Hub → Questions) has a “हिन्दी version” block. The published test's `languages` is “English, Hindi” only when Hindi exists.
- **Pictures** are fetched and decoded ahead of time (`preloadImgs` in `engine.js`, starts while the instructions are shown, 4 at a time, kept in `PRE`), so a question opens with its figure already there.
- No default pass mark: no “To pass” / “Passed” on test pages unless a hand-made test sets one.

## 5. Features built so far
**Home / browsing**
- "Fresh on the shelf": 4 newest items rendered; CSS shows 2 on phones (≤860px), up to 4 on larger screens.
- Footer pinned to the bottom (body is a 3-row grid: header / main / footer).

**Search**
- Home page: searches the whole site (exams, folders/chapters, items, quizzes/tests). While searching, the normal page content is hidden and only results show; clearing the box restores it.
- Category, exam and folder pages each have their own search box limited to that section.

**Tests (engine.js)**
- Test start requests browser full screen (iPhone Safari cannot; add to Home Screen for the same effect). A ⛶ button toggles it.
- Question palette has **Quit test** (discards the attempt) next to **Submit test**. In-page dialogs `ask()` are used instead of `confirm()` so full screen is not lost.
- Result page: score and stats, then **Try again / Review your answers / Back**.
- Review mode: one question at a time, correct answer ticked (✔), wrong pick marked (✕), explanation below, ← → navigation (and arrow keys), palette colours: green = correct, red = wrong, blank = not answered.

**Video / media**
- The link decides the player (a YouTube link saved under "Video file" still embeds). Supports YouTube (watch, youtu.be, shorts, live, embed, `t=` start), Vimeo, Google Drive.
- Uploaded files use `<video>` with `#t=0.1` first-frame trick, poster, error box + Download button, and a notice when the picture can't be decoded (usually H.265/HEVC).
- YouTube iframe sends `referrerpolicy="strict-origin-when-cross-origin"` and has a "Watch on YouTube" fallback link.
- YouTube items without a thumbnail use `https://i.ytimg.com/vi/<id>/hqdefault.jpg` automatically.

**Admin**
- Pasting a link auto-switches the Format dropdown; saving validates that a video link/file exists.
- File upload starts immediately with a persistent status line (uploading seconds, success, or the real error). Publish is disabled while uploading.
- After upload: duration is filled in, a poster thumbnail is generated from the video, and an H.265 warning is shown (non-blocking).
- `.mov` is stored with content-type `video/mp4`; uploads use `cacheControl: 31536000`.

## 6. Storage hygiene rules (admin.js)
- **Edit/replace:** new values are saved first; then old files are removed from the bucket (only if nothing else still references them, and only if they live in our bucket — external links are never touched).
- **Delete:** all files under the deleted thing (item; exam incl. cover; folder subtree; category; quiz incl. question images) are collected before deletion, then removed after.
- **Unsaved uploads** are removed on Cancel, tab switch, leaving the admin page, and on tab close/refresh (keepalive DELETE using the cached admin token; skipped while a save is in progress or when the page goes into bfcache).
- **🧹 Clean unused files** button (admin header): walks every folder of `content` (root, `covers/`, `questions/`, `thumbs/`, `tests/…`), compares with all referenced URLs read in bulk, ignores files newer than 10 minutes, asks before deleting.
- Upload paths: root for item files, `covers/` for exam covers, `questions/` for question images, `thumbs/` for auto thumbnails, `tests/<code>/<testkey>/` for library-imported pictures. Names are `<timestamp>-<sanitised-name>`, so a new file never overwrites an old one.
- A success toast "🗑 N old files removed from storage" confirms the cleanup ran. If it never appears, the browser is using cached old scripts.

## 7. Release / deployment checklist
1. Replace the changed files in the repo (keep the same folder structure).
2. Bump `?v=N` in `index.html`, in the `need('js/....js?v=N')` calls in `js/app.js` and the `need('js/hub.js?v=N')` call in `js/browse.js` (one `sed`: `s/?v=8/?v=9/g` on those three files).
3. Hard-refresh (Ctrl+Shift+R; on phone clear site data). GitHub Pages can cache for ~10 minutes.
4. Test: one YouTube link, one mp4 upload, one replace, one delete (look for the 🗑 toast), one test run + review. For v8 also: start the bridge, Library import → publish one test (Full + sections) → open the student page → run it → Tests Hub: toggle a tab / section / test.

## 8. Known limits / gotchas
- Supabase default per-file upload limit is 50 MB (standard upload). Bigger files need compression or a YouTube link (or resumable uploads + a raised limit).
- H.265/HEVC videos (common from phone cameras) can show a black picture in many browsers: convert to H.264 MP4 (HandBrake, preset "Fast 1080p30").
- Deleting rows via SQL does not delete the actual file in storage — use the Storage API / dashboard / the admin page.
- Native `confirm()` is used in admin forms; the test engine uses its own `ask()` dialog.
- `#/saved` and other short pages rely on the grid layout to keep the footer at the bottom.
- Search uses `ilike` queries; scope filtering for folders/exams uses folder-id lists.

- Tests imported from the library are managed in **Tests Hub**; the old *Quizzes & Tests* list only shows hand-made ones (`source_key is null`). Its question editor keeps picture options / whole-picture questions intact.
- The bridge allow-list must contain the site's exact origin (scheme + host, no path). A blocked site is printed in the bridge window with the command to fix it.
- Math written as LaTeX is not rendered (such questions come as pictures from the library).
- Students' attempts are removed together with a test that is replaced or deleted.

## 9. How we test (not part of the repo)
Headless Chromium (Playwright, Python) with a stubbed Supabase client: viewer cases (YouTube under wrong type, webm/mp4, 404 file), admin upload / replace / delete / leave-page / sweep flows with an in-memory bucket, test engine (full screen, quit, submit, review), search scopes, mobile vs desktop "fresh" counts, footer position. Real Supabase cannot be reached from the sandbox, so the live site still needs one manual check after each release. For v8 the in-memory stub also emulates triggers, cascades, storage and RLS-like visibility; the importer was run against the real bridge with a synthetic `library.db` (publish, replace, failure rollback, new exam, hub manager, sweep). The database part (triggers, unique key, `submit_attempt`, cascade) was verified on the real project inside a rolled-back transaction.

## 10. Change history (zips delivered)
1. `little-info-b1-updated.zip`: fresh shelf 2/4, full-screen tests, Quit + Submit, review mode, search everywhere, footer fix, trigram indexes.
2. `little-info-b1-storage-cleanup.zip` and `-v2`: remove old files from the bucket on edit/delete; cache-busting `?v=`; removal toast.
3. `little-info-b1-video-fix.zip`: link-driven player, YouTube/Vimeo/Drive, fallbacks, admin auto format, codec warning, poster + duration.
4. `little-info-b1-upload-fix.zip`: non-blocking upload with status line, leave-page cleanup, guarded saves, 🧹 Clean unused files (`?v=7`).

6. `little-info-b1-v9.zip` (`?v=9`): Quizzes / Tests category headers and strips, maths + formatting renderer, Hindi + language switch, no default pass mark, picture preloading.
5. `little-info-b1-tests-hub.zip` (+ `qbank_bridge.py`, patched `qbank_app.py`, `start_bridge.bat`): Tests hub, tabs, presets, Library import, picture / passage questions (`?v=8`).

## 11. Open ideas (not done)
- “N users” badge on test cards (needs a counts function; attempts are admin-only today).
- Bilingual (English / Hindi) questions per test; scheduled go-live (`live_at`).
- Verify the unverified presets (NTPC, ALP, Group D, GD, CPO) against the official notices.
- Resumable (TUS) uploads for videos over 50 MB.
- Progress percentage during upload (needs XHR/TUS instead of `supabase-js` upload).
- Auto-run the unused-files sweep on a schedule (would need an Edge Function).
