# Calculatorly

Free calculators that show every step: the formula, a worked example, and a
chart or table drawn from the visitor's own numbers. English only. No
sign-up, no login, nothing uploaded.

## Run it locally

```sh
cd ~/workspace/calculatorly-merged
python3 -m http.server 8000
# open http://localhost:8000/
```

## Build

```sh
python3 build.py        # renders all pages, validates, fails loudly
node --check assets/js/calculatorly.js
node --check assets/js/engines-s1.js assets/js/engines-s2.js assets/js/engines-s3.js assets/js/engines-s4.js
```

`build.py` reads `tools.json` and renders every tool whose `content_status`
is `complete` from one template, plus the home page, 7 hub pages, 5 legal
pages, 404, `robots.txt`, `_headers` and `sitemap.xml`. All 112 tools are
complete, so all 112 tool pages are built: 126 HTML pages in total
(home 1, hubs 7, legal 5, tools 112, 404 1), 126 URLs in `sitemap.xml`.

## JavaScript layout (why there are 5 files, not 1)

One file with all 112 engines is 266 KB and would break the 150 KB
per-page limit in Section 11 of the rulebook, so the code is split:

- `assets/js/calculatorly.js` — the shared core (about 41 KB): helpers,
  tax tables, page wiring (`wireTool`, `wireSearch`), and the empty
  `ENGINES` registry. Loaded by every page.
- `assets/js/engines-s1.js` … `engines-s5.js` — the tool engines, one file
  per stage (33 / 21 / 27 / 23 / 8 tools). Each tool page loads the core plus
  only its own stage file, so the largest page stays under 150 KB
  (largest built page: 150,672 bytes).

The split is mechanical: the engines are the same code the stage builders
verified, moved unchanged into stage files. The core exposes the helpers
as top-level functions (no IIFE) so the stage files can use them.

## Tool list

112 tools in 5 stages (33 / 21 / 27 / 23 / 8) across 7 hubs: Money (38), Salary
and Tax (28), Health and Fitness (12), Math (17), Date and Time (8),
Home and DIY (3), Everyday (6). See `tools.json` for the full contract and
`verdict-table.md` for the verdict of every tool (110 Browser-real,
2 Browser-partial: Currency Converter and Sales Tax by State).
`pass-fail-table.md` has one row per tool with its live test result.

## Tax tables (2026)

All salary and tax pages use the 2026 tables, last checked 11 November 2026:
UK 2026/27 HMRC, USA 2026 IRS (single standard deduction $16,100), Australia
2026–27 ATO, Canada 2026 CRA federal (14% to $58,523, BPA $16,452, CPP 5.95%
to $74,600, CPP2 4% to $85,000, EI 1.63% to $68,900). New Zealand
2026-27 IRD, Ireland 2026 Revenue, Germany 2026 BMF §32a, Singapore
YA2026 IRAS / CPF Board — see the tax tables in `calculatorly.js`. The Salary Country
Comparison page was recomputed to these tables during the merge; its worked
example, Quick answer, formula source and all 5 live tests carry the 2026
figures. See `pass-fail-table.md` for the reconciliation note.

**Fix after the merge, 11 November 2026:** the UK tax engine (`ukTax`) had
the 40% band top fixed at £112,570 of taxable income, which is only right
with the full £12,570 allowance. Once the allowance tapers (salary over
£100,000) the 40% band runs to £125,140 of taxable income — the additional
rate starts at total income £125,140. The band is now
`[[37700, 0.20], [125140, 0.40], [Infinity, 0.45]]`, verified against
GOV.UK and published UK tables (£120,000 now gives tax £39,432.00, not
£39,675.00; £125,140 gives £42,516.00). The three affected test expectations
in `tools.json` were corrected with it, plus one stale example note on the
Salary Country Comparison page (USA $50,338.50 → $50,390.00). US, AU and CA
engines were checked and are not affected.

## Limits

- Each page (own HTML + shared CSS + the JS files it loads) stays under
  150 KB.
- Numbers up to 1,000,000,000,000 unless a tool page states a tighter limit.
- Money and percentage results round half-up to 2 decimal places, as stated
  on each page.
- No live rates: the Currency Converter uses a rate the visitor enters, and
  Sales Tax by State covers state/province base rates only.
- Two tools paint an empty result box by design and the shared JS fills it
  on load: Countdown (the answer changes every second) and Dice Random
  (the dice are rolled at random). Pregnancy Due Date and Pregnancy Planner
  paint a static result correct on the build day; the JS recomputes it live
  on every load.

## How to add a new tool

1. Add one row to `tools.json` (stage, hub, slug, title, description,
   keyword, verdict, rounding, limit, blurb, input→output, method) and one
   row to `verdict-table.md`.
2. Add a full `content` block to that row: question, fields, how-to steps,
   Quick answer (40–60 words), formula, worked example, 4–8 FAQs specific
   to the tool, related tools, and 5 known-answer test cases. Bar-table
   tools also need a content `initial` block (the static first paint at
   field defaults), unless the result cannot be precomputed (countdown,
   dice) — see `build.py` `EMPTY_PAINT`.
3. Add its engine to `ENGINES` in that stage's `assets/js/engines-sN.js`,
   keyed by the tool slug without `-calculator`. Use the core helpers
   (`roundHalfUp`, `fmtNum`, `fmtMoney`, `readNum`, `setResult`,
   `renderBar`, `renderTable`) and `textContent` only — never `innerHTML`
   with user data. `compute(vals)` for most tools, `computeInputs(vals)`
   where the P4 style is used.
4. Set `content_status` to `complete`, run `python3 build.py`, and check the
   live tests pass (5 of 5) on the new page.
5. The tool then appears as a link on the home page and its hub page, and
   in `sitemap.xml`.

## Open items

- Hosting / deploy target not confirmed — nothing is deployed, no DNS change.

## New countries, 11 November 2026

8 new tools in stage 5 (New Zealand, Ireland, Germany, Singapore — take-home pay
and income tax each), built from the official 2026 tables (IRD, Revenue, BMF
§32a, IRAS / CPF Board), with the same 7-part pages, live tests and country
selector as the first four countries. Tool count 104 → 112; salary hub 20 → 28.

## Fixes, 11 November 2026 (audit follow-up)

- UK tax text corrected: `formula_source` on the two UK tax pages said "40% to
  £112,570"; it now says "40% to £125,140", matching the engine and the FAQ.
- Country selector added: take-home-pay, income-tax (UK/USA/AU/CA) and
  salary-sacrifice (UK/AU) pages now carry a prominent Country selector above
  the tool, wired in `calculatorly.js`, that takes the visitor to the same tool
  for another country. (Mortgage, Pension and Overtime already had one.)
- The word "phase" appears nowhere on the site: 0 occurrences in all 126 HTML
  pages. `build.py` keeps a forbidden-word guard that fails the build if it
  ever appears. "Phase" survives only in the build plan / prompt, where it
  describes the build order — never on a visitor-facing page.
- Live-browser check done 11 November 2026 in headless Chrome (desktop +
  mobile 360 px): see the audit report. The Contact page carries the owner's
  email Calculatorly9@gmail.com (the earlier "not supplied" note was stale).
