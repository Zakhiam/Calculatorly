# Calculatorly — Build Plan (Merged site, 11 November 2026)

## What this is

Calculatorly.online — a static calculator website. Free calculators that show
every step: the formula, a worked example, and a chart or table drawn from the
visitor's own numbers. English only. No sign-up, no login, no data collected.

This folder is the MERGE of the four stage builds (calculatorly-p1 .. p4)
into one working site. The stage copies and the original infrastructure
copy were read-only inputs; this folder is the only merged output.
Nothing is deployed; no DNS change.

## Pages

- Home (`index.html`) — brand, one-line purpose, debounced search (250 ms),
  7 hub cards listing all 112 tools, featured tools (all 112, live).
- 7 hub pages — `money/`, `salary/`, `health/`, `math/`, `date-time/`,
  `home-diy/`, `everyday/` — each lists all its tools with a one-line
  description, a short intro, and 4–5 FAQs (with FAQPage JSON-LD).
- Tool pages — one per tool, from `tools.json` via `build.py`. All 112 are
  live. No tool is pending; nothing is listed as "Not live yet" anywhere.
- Legal pages — `about/`, `contact/`, `privacy/`, `terms/`, `disclaimer/`.
- `404.html`, `robots.txt`, `sitemap.xml` (118 live URLs), `_headers`.

## Files

| File | What it is |
| --- | --- |
| `tools.json` | The inventory contract: 112 tools (stages 33 / 21 / 27 / 23 / 8), each with stage, hub, slug, title, description, keyword, verdict, rounding, limit, blurb, input→output, method, and a full `content` block. Stage 3's 26 bar-table tools got their `initial` (static paint) blocks generated from the merged live engines during the merge; Countdown has none by design. Stage 5's 8 bar-table tools got their `initial` blocks generated from the new live engines the same way. |
| `build.py` | The generator (P4's base + P1/P2/P3 ports). Renders every complete tool page from one template, plus home, hubs, legal, 404, robots, headers and sitemap. Validates everything before writing and fails loudly. Run: `python3 build.py`. |
| `assets/css/khata.css` | The one shared stylesheet (Khata design): P1's select + keypad rules on top of the base. |
| `assets/js/calculatorly.js` | The shared core (about 41 KB): helpers, tax tables, page wiring. No engines — see below. |
| `assets/js/engines-s1.js` … `engines-s4.js` | The tool engines, one file per stage (33 / 21 / 27 / 23). Each tool page loads the core plus only its own stage file. |
| `verdict-table.md` | One row per tool (112): verdict, input→output, method, limit. Unchanged by the merge. |
| `pass-fail-table.md` | One row per tool (112): verdict, test done, real result, Pass/Fail. All Pass. |
| `PLAN.md` | This file. |
| `README.md` | How to run, build and add a tool. |

## Why the JavaScript is split (5 files, not 1)

One file with all 112 engines is 266 KB. The rulebook (§11) caps each page
at 150 KB including the JS it loads, so a single shared file cannot work:
every page would be about 300 KB. The merge therefore splits the code into
the shared core (`calculatorly.js`, helpers + wiring + empty `ENGINES`
registry) and one engine file per stage. Each tool page loads the core plus
only its own stage file; the largest built page is 145,718 bytes. Home, hub,
legal and 404 pages load the core only. The engines themselves are the stage
builders' verified code, moved unchanged; the core exposes helpers as
top-level functions (no IIFE) so the stage files can use them. The CSP in
`_headers` still allows only `script-src 'self'`.

## Merge decisions worth remembering

- Helpers: P1's file is the base (tax tables, `evalExpr`, date/time parsing,
  `readNums`, keypad). Ported in: P2's unit tables, P3's sales-tax table,
  P4's pension data. Shared helpers verified identical across copies and
  kept once; `EMPTY_MSG` uses P1's wording; `renderBar` uses P2's version
  (width rounded to 2 dp); `fmtPct` turned out identical everywhere.
- `fmtDate` (P2, full month names) is the one date formatter; P4's
  abbreviated months live on as `MONTH_NAMES_SHORT`, used only by the
  time-zone tool's `fmtDayFromParts`. P3's `MONTHS` was dropped.
- `parseDate`/`parseTime`: P1's versions (most permissive-correct).
  `loanPayment` is P3's (principal, decimal rate, months); P4's is renamed
  `loanPaymentYears` (principal, rate percent, years) with its two call
  sites updated.
- `ukTax` defaults its tax-code argument to 1257, so P3 engines calling
  `ukTax(gross)` work; P1 callers pass their own code.
- Tax helpers: P1's 2026 versions win everywhere. P3's `usTax`/`caTax`
  were rewritten to call P1's `usFederalTax(gross, "single")` /
  `caFederalTax(gross)`; the salary-country-comparison engine's `usFica(s)`
  and `caCpp(s)` call sites now use `.total` (P1's versions return
  objects). Canada 2026 brackets were re-verified by search
  (14% to $58,523, BPA $16,452, CPP 5.95% to $74,600, CPP2 4% to $85,000,
  EI 1.63% to $68,900).
- `wireTool` (merged): `config.fields` is an array of id strings; `ctx`
  carries both `inputs` and `fields` (same map), `inA`/`inB`, `rerender`,
  and supports `engine.init(ctx)` and `config.keypad`; compute resolves to
  `engine.computeInputs ? computeInputs(vals) : engine.compute(vals)`.
  The three percentage engines are P1's `compute(vals)` versions.
- `build.py` (merged): P4's base + P1's `bar-table`/`initial` support and
  keypad emission, P2's `bar` chart + `initial_result_bar` (+ yearly
  amortisation table) and `fmt2` with a decimals argument, P3's password
  field rendering. Legal-page anchor ids use `hashlib.md5`, not Python's
  randomised `hash()`, so rebuilds are byte-identical (verified).
  The `initial_result` select-default trap is avoided: no field default is
  parsed as a float before the chart dispatch.
- Static paint: stage 1 tools carry their own `initial` blocks; stage 2
  uses P2's Python mirrors; stage 4 uses P4's Python mirrors; stage 3's
  26 bar-table tools got `initial` blocks generated by running the merged
  engines at field defaults. Countdown and Dice Random paint empty by
  design (time-dependent / random) and the JS fills them on load.
- Hub pages now carry FAQPage JSON-LD for their visible FAQs, and the
  stale "Not live yet" sentences were removed from the home and hub pages
  (all 112 tools are live).
- Fix after the merge, 11 Nov 2026: `ukTax` 40% band top corrected from
  £112,570 to £125,140 of taxable income (allowance taper); three test
  expectations in `tools.json` corrected (£120,000 tax £39,432.00,
  take-home £76,157.40, huge take-home £530,000,011,785.87) and one stale
  example note on Salary Country Comparison fixed (USA $50,390.00).

## Libraries

None, except Google Fonts (Bitter + IBM Plex Mono, loaded by a `<link>` in
`<head>`). No JavaScript libraries at all, so there is no SRI issue and no
CDN library that can fail and fake a result.

## Design

Khata (ledger) — final. Desk `#22281C`, paper `#D7DDC0` (final shade, never
darker), paper-deep `#CBD3AF`, ink `#23281D`, ink-soft `#3E4633`,
red `#A83A28`. Red margin line, ruled lines, punched holes. Per-hub accent
only, via a class on `<body>`: Money green `#2F5D2A`, Salary teal `#1F4E4A`,
Health teal-green `#2F5D4A`, Math ink blue `#2B3A55`, Date and Time
plum-brown `#5A3A2B`, Home and DIY terracotta `#7A4A22`, Everyday
slate `#3D4A3D`. No purple/blue gradients, no glass cards, no generic hero.
Mobile-first: 360–390 px, no horizontal scroll, no overlap, no cut-off text.

## Risks

- **Tax and salary pages go stale.** Every country page states its tax
  year, official source (HMRC / IRS / ATO / CRA) and last-checked date, and
  must be re-tested when rates change. All are on 2026 tables, last checked
  11 November 2026.
- **Fake live rates.** Currency Converter is Browser-partial: the visitor
  enters their own exchange rate; the site never fetches live rates.
  Sales Tax by State is Browser-partial: state/province base rates only.
- **Contact method missing.** The owner has not supplied a contact email.
  The Contact page carries a marked placeholder instead of an invented
  address. This is an open item, not a finished page.
- **Hosting target unconfirmed.** Nothing is deployed. No DNS change.
- **No live-browser check yet.** All verification in the merge was done in
  Node with a DOM shim plus an independent check from disk (see Tests).
  A real-browser pass (Chrome, mobile 360 px) is still owed before deploy.
- **Pregnancy static paint goes stale.** Pregnancy Due Date and Pregnancy
  Planner paint a static result correct on the build day (11 November 2026)
  that includes how far along the pregnancy is today; the JS recomputes it
  live on every load, so visitors always see the current figure after load,
  but the static HTML itself ages by a day at a time.

## Tests

- `python3 build.py` — BUILD OK: 118 pages, largest 145,718 bytes (limit
  153,600). Validates before writing: titles < 60, descriptions < 160,
  exactly 1 H1 per page, Quick answer 40–60 words, 4–8 FAQs per tool page,
  every JSON-LD block parses, FAQ JSON-LD identical to visible FAQ text,
  page size under 150 KB, no forbidden words, no Roman Urdu words,
  0 broken internal links, content-block validation for complete tools.
- `node --check` on all 5 JS files — all pass.
- DOM-shim test (`/tmp/domtest_merged.js`, kept outside the site folder):
  1,723 checks, all Pass — every tool's 5 live known-answer tests (520 in
  total), static first paint == JS result on every page except Countdown
  and Dice Random (empty by design, JS fills on load), stamp hide/show on
  clear and on over-limit input, keypad 2+2=4 on the scientific tool,
  0 console errors.
- Independent structural check (`/tmp/verify_merged.py`, does not reuse
  `build.py`): 118 HTML pages re-checked from disk — 1 H1 per page,
  title/meta lengths, JSON-LD parses and FAQ text == visible text,
  0 broken internal links, sitemap == live files exactly (118 URLs),
  all pages < 150 KB, no forbidden words, no Roman Urdu — 0 failures.
- Rebuild determinism: two consecutive `python3 build.py` runs produce
  byte-identical output.

## Rulebook §10 — what does not apply (static site, no login/database/server)

- SQL injection defences — N/A: no database, no queries, no server.
- Password hashing — N/A: no login, no passwords, no accounts.
- Environment variables / secrets — N/A: no server, no secrets in the build.
- Server-side authorisation — N/A: no server, no protected actions.
- Database indexes — N/A: no database.
- What does apply and is done: input validation with clear errors, never
  `NaN` and never a fake result; `textContent` only, never `innerHTML` with
  user data; no `eval()`; no tracking cookies; no `localStorage`; no
  external JS libraries; a strict Content Security Policy in `_headers`
  (`script-src 'self'`, no inline scripts at all — tool logic lives in the
  shared JS files and each tool page carries only a JSON config block).
