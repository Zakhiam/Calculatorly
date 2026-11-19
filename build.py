#!/usr/bin/env python3
"""Calculatorly static-site generator.

Reads tools.json and renders every complete tool page from ONE template, plus
the home page, 7 hub pages, 5 legal pages, 404, robots.txt, _headers and
sitemap.xml. Tools whose content is still pending are NOT written as live
pages (a thin page would break the rulebook); they are listed as plain text
on the home and hub pages until their stage builder completes them.

Validation (fails loudly, exit 1, nothing written on failure):
  title < 60 chars, description < 160 chars, exactly 1 <h1> per page,
  Quick answer 40-60 words, 4-8 FAQs per tool page, every JSON-LD block
  parses as valid JSON, page size (own HTML + shared CSS + shared JS)
  under 150 KB, no forbidden words, no Roman Urdu words, and every
  internal link resolves to a real file in the output.

No inline scripts anywhere: tool logic lives in assets/js/calculatorly.js
(the shared core: helpers, tax tables, page wiring) plus one stage engine
file per stage (assets/js/engines-s1.js .. engines-s5.js), and each tool
page carries only a <script type="application/json"> config block, so the
CSP in _headers can stay strict (script-src 'self'). The split exists
because one file with all 112 engines is 266 KB: each tool page loads the
core plus only its own stage file, so every page stays under the 150 KB
limit in Section 11. Home, hub, legal and 404 pages load the core only.
"""
import hashlib
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = "https://calculatorly.online"
TODAY = "2026-11-11"

FORBIDDEN = ["phase", "ad space", "basic version", "later server version",
             "for basic use", "lorem"]
ROMAN_URDU = ["hai", "nahi", "nahin", "kya", "ka", "ki", "ke", "aur", "mein",
              "aap", "tum", "yeh", "woh", "kar", "karo", "chahiye", "theek",
              "acha", "bhai", "jaan", "mera", "meri", "tumhara", "kaisa",
              "kitna", "kab", "kahan", "kyun", "matlab", "bilkul", "zaroor",
              "shukriya", "salam"]

# Exact inventory required by the task: (hub, slug-name) per stage.
EXPECTED = {
 1: [("math", "percentage-of-a-number"), ("math", "what-percent"),
     ("math", "percentage-increase-decrease"), ("money", "discount"),
     ("money", "vat"), ("money", "mortgage"), ("money", "loan"),
     ("money", "auto-loan"), ("money", "compound-interest"),
     ("money", "simple-interest"), ("money", "interest-rate-apy"),
     ("money", "savings-goal"), ("money", "retirement"),
     ("salary", "salary-to-hourly"), ("salary", "take-home-pay-us"),
     ("salary", "take-home-pay-uk"), ("salary", "take-home-pay-au"),
     ("salary", "take-home-pay-ca"), ("salary", "income-tax-us"),
     ("salary", "income-tax-uk"), ("salary", "income-tax-au"),
     ("salary", "income-tax-ca"), ("health", "bmi"),
     ("health", "calorie-tdee"), ("health", "bmr"), ("date-time", "age"),
     ("date-time", "date"), ("date-time", "time"), ("math", "scientific"),
     ("math", "fraction"), ("math", "standard-deviation"),
     ("everyday", "tip-and-bill-split"), ("money", "sales-tax")],
 2: [("money", "amortization"), ("money", "rent-vs-buy"),
     ("money", "house-affordability"), ("money", "down-payment"),
     ("money", "refinance-comparison"), ("money", "loan-comparison"),
     ("money", "credit-card-payoff"), ("money", "debt-payoff"),
     ("money", "budget-50-30-20"), ("money", "inflation"),
     ("money", "currency-converter"), ("health", "body-fat"),
     ("health", "ideal-weight"), ("health", "macro"), ("health", "pace"),
     ("health", "pregnancy-due-date"), ("math", "gpa-grade"),
     ("everyday", "unit-converter"), ("everyday", "tip-tax-discount"),
     ("everyday", "unit-price"), ("money", "fuel-vs-ev")],
 3: [("salary", "job-offer-comparison"), ("salary", "salary-sacrifice-au"),
     ("salary", "salary-sacrifice-uk"), ("salary", "overtime"),
     ("salary", "pto"), ("salary", "freelance-rate"),
     ("salary", "invoice-late-payment"), ("salary", "shift-pay"),
     ("salary", "parental-leave-pay"), ("salary", "redundancy-pay"),
     ("money", "fixed-vs-variable-mortgage"),
     ("salary", "salary-country-comparison"),
     ("money", "sales-tax-by-state"), ("money", "mortgage-overpayment"),
     ("money", "savings-vs-loan-payoff"), ("health", "water-intake"),
     ("health", "sleep"), ("health", "steps-to-calories"),
     ("health", "pregnancy-planner"), ("date-time", "business-days"),
     ("date-time", "countdown"), ("date-time", "working-days-between"),
     ("everyday", "password-strength"), ("home-diy", "concrete"),
     ("home-diy", "paint"), ("home-diy", "tile"), ("everyday", "subnet")],
 4: [("money", "student-loan"), ("money", "college-cost"),
     ("money", "pension-401k-ira"), ("money", "annuity"),
     ("money", "present-value"), ("money", "future-value"),
     ("money", "irr"), ("money", "roi"), ("money", "margin"),
     ("money", "commission"), ("money", "payback-period"),
     ("math", "z-score"), ("math", "confidence-interval"),
     ("math", "sample-size"), ("math", "quadratic"), ("math", "slope"),
     ("math", "log"), ("math", "exponent"), ("math", "binary-hex"),
     ("math", "roman-numerals"), ("math", "dice-random"),
     ("date-time", "time-zone"), ("date-time", "time-card")],
 5: [("salary", "take-home-pay-nz"), ("salary", "take-home-pay-ie"),
     ("salary", "take-home-pay-de"), ("salary", "take-home-pay-sg"),
     ("salary", "income-tax-nz"), ("salary", "income-tax-ie"),
     ("salary", "income-tax-de"), ("salary", "income-tax-sg")],
}

NEVER_BUILD = ["Love Calculator", "Bra Size", "Golf Handicap", "BAC",
               "Anorexic BMI", "Wind Chill", "Horsepower"]

HUB_INTROS = {
 "money": "Money tools that show the full working: monthly payments, total interest, and what each number means, so you can check the answer yourself.",
 "salary": "Salary and tax tools, one page per country. Each country page uses its own currency, tax year and official source, and says so on the page.",
 "health": "Health tools that work from the numbers you type. They give a guide only — they are not medical advice and they never replace a doctor.",
 "math": "Maths tools with the formula in words and symbols, a worked example, and a bar and table drawn from your own numbers.",
 "date-time": "Date and time tools: ages, dates, working days and countdowns, with the working shown step by step.",
 "home-diy": "Home and DIY tools: concrete, paint and tile amounts from the measurements you type, with waste allowed for.",
 "everyday": "Everyday tools for small jobs: splitting a bill, comparing pack prices, converting units, and checking a password.",
}

HUB_FAQS = {
 "money": [
  ("Are the money calculators free?", "Yes. Every calculator on this site is free, with no sign-up and no payment at any step."),
  ("Do the money tools use live interest rates?", "No. Where a rate is needed, you enter your own rate, and the page says so. This site does not fetch live rates."),
  ("Are the answers exact?", "The answers follow the formula shown on the page, rounded as the page states. They are estimates for planning, not professional financial advice."),
  ("Is anything I type sent anywhere?", "No. Every calculation runs in your browser on your own device. The numbers you type are not sent anywhere and are not stored."),
  ("Which money tool should I start with?", "Start with the tool that matches your question: Mortgage for a monthly home loan payment, Discount for a sale price, or Budget 50/30/20 for a monthly plan.")],
 "salary": [
  ("Why is there a separate page for each country?", "Tax rules, tax years, currencies and official sources are different in the UK, USA, Australia and Canada, so each country gets its own page with its own figures."),
  ("Which tax year do the salary pages use?", "Each country page states its tax year, its official source and the date it was last checked, on the page itself."),
  ("Are the salary answers exact?", "No. They are estimates from the rates shown on the page, for planning only. They are not professional tax advice. Check the official source before acting on a figure."),
  ("What currency does each page use?", "UK pages use pounds (£), USA pages use dollars ($), Australia pages use Australian dollars (A$) and Canada pages use Canadian dollars (C$)."),
  ("Do I need to sign up to use a salary calculator?", "No. There is no sign-up anywhere on this site, and nothing you type is sent anywhere.")],
 "health": [
  ("Are the health calculators medical advice?", "No. They are general guides only, worked out from the numbers you type. They never replace advice from a doctor or another health professional."),
  ("Can I use metric or imperial units?", "Yes. Health tools accept both systems where it matters — kilograms and pounds, centimetres and inches — so you can work in the units you know."),
  ("Is my health information stored?", "No. The calculation runs in your browser on your own device. Nothing you type is sent anywhere or stored."),
  ("Are the health tools free?", "Yes. Every calculator on this site is free, with no sign-up.")],
 "math": [
  ("How are the maths answers rounded?", "Each page states its one rounding rule, and uses the same rule in the answer, the bar and the table, so the figures always agree."),
  ("Do the maths tools show their working?", "Yes. Every maths page shows the formula in words and symbols, a worked example with real numbers, and a bar and table drawn from your numbers."),
  ("Are the maths calculators free?", "Yes. Every calculator on this site is free, with no sign-up and no payment at any step."),
  ("What if I type a number that is too large?", "The page shows a clear message instead of a result. The limit is written on each tool page.")],
 "date-time": [
  ("Do date tools count weekends?", "Tools that count working days skip Saturdays and Sundays. The page says which days it counts."),
  ("Can I count days between past dates?", "Yes. Date tools work with past and future dates inside the range written on each page."),
  ("Are the date calculators free?", "Yes. Every calculator on this site is free, with no sign-up."),
  ("Is anything I type sent anywhere?", "No. Every calculation runs in your browser on your own device. The numbers you type are not sent anywhere and are not stored.")],
 "home-diy": [
  ("Do the DIY tools allow for waste?", "Yes. Each DIY page states its waste allowance, and the amount shown includes it, so you buy enough material."),
  ("Which units can I use?", "DIY tools work in metric and imperial units where it matters — metres and feet, litres and gallons — so you can use the units on your plans."),
  ("Are the DIY calculators free?", "Yes. Every calculator on this site is free, with no sign-up."),
  ("Are the amounts exact?", "They are estimates from the measurements you type, for planning a job. Measure twice and check the product label before you buy.")],
 "everyday": [
  ("Are the everyday calculators free?", "Yes. Every calculator on this site is free, with no sign-up and no payment at any step."),
  ("Is anything I type sent anywhere?", "No. Every calculation runs in your browser on your own device. The numbers you type are not sent anywhere and are not stored."),
  ("Does the password checker store my password?", "No. The password is checked in your browser only. It is never sent, stored or logged anywhere."),
  ("Can I use these tools on my phone?", "Yes. Every page is built mobile-first and works at 360 pixels wide, with no sideways scrolling.")],
}

LEGAL = {
 "about": ("About Calculatorly",
   "Free calculators that show every step.",
   [("What Calculatorly is",
     "Calculatorly is a free calculator website. Every tool has its own page, with the formula, a worked example, and a chart or table drawn from the numbers you type — not just an empty box and an answer."),
    ("How it works",
     "Type your numbers and the answer appears as you type. There is no Calculate button to press, no sign-up, and no payment at any step. Every calculation runs in your browser on your own device, so the numbers you type are not sent anywhere."),
    ("What you will find here",
     "The site is organised into 7 hubs: Money, Salary and Tax, Health and Fitness, Math, Date and Time, Home and DIY, and Everyday. Salary and tax tools have a separate page for each country — the UK, USA, Australia and Canada — each with its own currency, tax year and official source."),
    ("A note on the domain",
     "The domain calculatorly.online has been bought by the owner. Hosting is a separate matter and is not included with the domain."),
    ("What this site is not",
     "Calculatorly gives estimates for planning. It is not professional financial, tax, legal or medical advice, and it never claims a live rate, a ranking, or a result it cannot show you.")]),
 "contact": ("Contact Calculatorly",
   "How to reach the owner of this site.",
   [("Contact email",
     "Email the owner at Calculatorly9@gmail.com."),
    ("What to write about",
     "Write in if a calculator gives a wrong answer, a page does not work on your phone, or a tax rate on a country page looks out of date. Please name the page and the numbers you typed, so the fault can be checked."),
    ("What happens next",
     "There is no sign-up and no account on this site, so a message by email is the only way to reach the owner. Do not send passwords, card details or other private information by email.")]),
 "privacy": ("Privacy Policy",
   "What this site collects: nothing.",
   [("No tracking cookies",
     "This site sets no tracking cookies. It uses no analytics at the time of writing, and no advertising code is installed yet."),
    ("No login, no accounts",
     "There is no login and no sign-up on this site, so there is no account, no password and no profile to store."),
    ("No data collected",
     "The numbers you type into a calculator are worked out in your browser on your own device. They are not sent to any server, not stored, and not shared with anyone."),
    ("Fonts",
     "The site loads its two fonts, Bitter and IBM Plex Mono, from Google Fonts. When your browser fetches those font files, Google receives a normal web request for them, as it does on any site that uses Google Fonts. No other third-party service is loaded."),
    ("Changes",
     "If analytics or advertising is ever added, this page will be updated first, and will name exactly what was added.")]),
 "terms": ("Terms of Use",
   "The rules for using this free site.",
   [("Free use",
     "Every calculator on this site is free to use, with no sign-up and no payment. You may use the tools for your own planning as often as you like."),
    ("Estimates only",
     "Every result is an estimate worked out from the numbers you type and the formula shown on the page. Results are not professional financial, tax, legal or medical advice."),
    ("Your responsibility",
     "Check any figure that matters — a tax amount, a loan payment, a health result — against the official source named on the page, or against a qualified professional, before you act on it."),
    ("The site as it is",
     "The site is provided as it is, without any promise that every page will always be available or free of error. If a page is wrong, tell the owner through the Contact page so it can be fixed."),
    ("Fair use",
     "Do not use the site in a way that breaks the law, harms other visitors, or tries to copy the site wholesale and present it as your own.")]),
 "disclaimer": ("Disclaimer",
   "Read this before you act on any result.",
   [("Estimates only",
     "Every calculator on this site gives an estimate only. It is not professional advice of any kind — not financial, not tax, not legal and not medical."),
    ("Tax and salary pages are snapshots",
     "Tax, salary and rate pages use the rates and thresholds shown on the page, with the tax year, the official source and the date last checked written on the page. Rates change, so a page can go out of date. Always check the official source — HMRC for the UK, the IRS for the USA, the ATO for Australia, the CRA for Canada — before acting on a figure."),
    ("Health pages are guides only",
     "Health results are general guides worked out from the numbers you type. They are not a diagnosis and never replace advice from a doctor or another health professional."),
    ("Check before you act",
     "If a decision costs money or affects your health, check the result with a qualified professional. The owner of this site is not liable for loss from acting on an estimate.")]),
}

FOOTER = """<footer class="site">
    <span class="fbrand">Calculatorly</span>
    <nav aria-label="Footer">
      <a href="{p}about/">About</a>
      <a href="{p}contact/">Contact</a>
      <a href="{p}privacy/">Privacy</a>
      <a href="{p}terms/">Terms</a>
      <a href="{p}disclaimer/">Disclaimer</a>
    </nav>
    <span>Calculatorly — free calculators, no sign-up. The domain calculatorly.online is bought; hosting is separate.</span>
    <div class="ad-slot" hidden aria-hidden="true"></div>
  </footer>"""


def esc(s):
    return html.escape(str(s), quote=True)


def fail(msg):
    print("BUILD FAILED: " + msg, file=sys.stderr)
    sys.exit(1)


def word_count(text):
    return len(text.split())


def check_text_clean(text, where):
    low = text.lower()
    for w in FORBIDDEN:
        if w in low:
            fail("forbidden wording %r in %s" % (w, where))
    words = set(re.findall(r"[a-z]+", low))
    bad = words & set(ROMAN_URDU)
    if bad:
        fail("Roman Urdu word(s) %s in %s" % (sorted(bad), where))


# ---------------------------------------------------------------- templates

def head_block(title, desc, canonical, prefix, extra_ld=""):
    return """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="color-scheme" content="light" />
<title>{title}</title>
<meta name="description" content="{desc}" />
<link rel="canonical" href="{canonical}" />
<link rel="icon" href="data:," />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bitter:ital,wght@0,400;0,600;0,700;0,800;1,400&amp;family=IBM+Plex+Mono:wght@500;600;700&amp;display=swap" rel="stylesheet" />
<link rel="stylesheet" href="{prefix}assets/css/khata.css" />
{extra_ld}</head>
""".format(title=esc(title), desc=esc(desc), canonical=esc(canonical),
           prefix=prefix, extra_ld=extra_ld)


def ld_block(obj):
    return ('<script type="application/ld+json">\n' +
            json.dumps(obj, ensure_ascii=False, separators=(",", ":")) +
            '\n</script>\n')


def masthead(prefix, crumbs_html, hub_name=None):
    hub_tag = ('<span class="hub-tag">Hub: %s</span>\n    ' % esc(hub_name)) if hub_name else ""
    return """<body{body_class}>
<div class="sheet">
  <header class="masthead">
    <div class="brand"><a href="{p}">Calculator<span class="ly">ly</span></a></div>
    <div class="domain mono">calculatorly.online</div>
    <div class="mast-note">Every calculator, worked out in full.</div>
  </header>
  <main>
    <nav class="crumbs" aria-label="Breadcrumb">
      <ol>
{crumbs}      </ol>
    </nav>
    {hub_tag}""".format(body_class="", p=prefix + "", crumbs=crumbs_html, hub_tag=hub_tag)


def page_shell(title, desc, canonical, prefix, body_class, crumbs_html,
               hub_name, body_html, extra_ld="", scripts=("calculatorly.js",)):
    bc = (' class="%s"' % body_class) if body_class else ""
    hub_tag = ('<span class="hub-tag">Hub: %s</span>\n    ' % esc(hub_name)) if hub_name else ""
    return (head_block(title, desc, canonical, prefix, extra_ld) +
            '<body%s>\n<div class="sheet">\n' % bc +
            '  <header class="masthead">\n'
            '    <div class="brand"><a href="' + prefix + '">Calculator<span class="ly">ly</span></a></div>\n'
            '    <div class="domain mono">calculatorly.online</div>\n'
            '    <div class="mast-note">Every calculator, worked out in full.</div>\n'
            '  </header>\n  <main>\n'
            '    <nav class="crumbs" aria-label="Breadcrumb">\n      <ol>\n' + crumbs_html + '      </ol>\n    </nav>\n'
            '    ' + hub_tag + body_html +
            '\n  </main>\n' + FOOTER.format(p=prefix) +
            '\n</div>\n' + ''.join('<script src="' + prefix + 'assets/js/' + s + '"></script>\n' for s in scripts) + '</body>\n</html>\n')


def crumb(name, href=None):
    if href:
        return '        <li><a href="%s">%s</a></li>\n' % (esc(href), esc(name))
    return '        <li aria-current="page">%s</li>\n' % esc(name)


# ---------------------------------------------------------------- tool pages

def fmt2(v, decimals=2):
    # Half-up to the given decimals, formatted like the shared JS fmtNum.
    import decimal
    q = decimal.Decimal("0.01") if decimals == 2 else decimal.Decimal("0.1") if decimals == 1 else decimal.Decimal("0.0001")
    d = decimal.Decimal(str(v)).quantize(q, rounding=decimal.ROUND_HALF_UP)
    return format(d, ",.%df" % decimals)


def _fmt(v, dec=2):
    import decimal
    d = decimal.Decimal(str(v)).quantize(decimal.Decimal(1).scaleb(-dec),
                                         rounding=decimal.ROUND_HALF_UP)
    return format(d, ",.%df" % dec)


def _money(v, sym="$"):
    return sym + _fmt(v, 2)


def _loan_pay(principal, rate_pct, years):
    import math
    n = years * 12
    r = rate_pct / 100.0 / 12.0
    if r == 0:
        return principal / n
    return principal * r / (1.0 - (1.0 + r) ** (-n))



def _yn(y):
    """Years for display: '10' not '10.0'."""
    return str(int(y)) if float(y) == int(float(y)) else str(y)

def _plural(n, one, many):
    return one if n == 1 else many


_PENSION_SYM = {"uk": "\u00a3", "us": "$", "au": "A$", "ca": "C$"}
_PENSION_NOTE = {
    "uk": "UK pensions: tax relief and yearly limits apply. Check the rules before you act.",
    "us": "USA 401(k) and IRA accounts have yearly contribution limits set by the IRS.",
    "au": "Australia super: employer payments and tax rules apply. Check the ATO rules.",
    "ca": "Canada RRSPs have yearly contribution room set by the CRA.",
}
_PENSION_NAME = {"uk": "UK pension", "us": "USA 401(k) / IRA",
                 "au": "Australia super", "ca": "Canada RRSP"}
_PENSION_PLACE = {"uk": "UK", "us": "USA", "au": "Australia", "ca": "Canada"}
_Z = {"90": 1.645, "95": 1.96, "99": 2.576}
_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _npv(rate, flows):
    return sum(cf / ((1.0 + rate) ** t) for t, cf in enumerate(flows))


def _irr(flows):
    grid = [-0.9, -0.5, -0.25, 0.0, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0, 100.0]
    vals = [_npv(r, flows) for r in grid]
    for i in range(len(grid) - 1):
        if vals[i] == 0:
            return grid[i] * 100.0
        if vals[i] * vals[i + 1] < 0:
            lo, hi, flo = grid[i], grid[i + 1], vals[i]
            for _ in range(200):
                mid = (lo + hi) / 2.0
                fm = _npv(mid, flows)
                if flo * fm <= 0:
                    hi = mid
                else:
                    lo, flo = mid, fm
            return (lo + hi) / 2.0 * 100.0
    return 0.0


def _to_roman(n):
    table = [(1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
             (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
             (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]
    out = ""
    for v, s in table:
        while n >= v:
            out += s
            n -= v
    return out


def _roman_rows(n):
    parts = []
    th, rem = divmod(n, 1000)
    hu, rem = divmod(rem, 100)
    te, on = divmod(rem, 10)
    for val, name in ((th * 1000, "Thousands"), (hu * 100, "Hundreds"),
                      (te * 10, "Tens"), (on, "Ones")):
        parts.append((name, (_to_roman(val) if val else "\u2014") +
                      " (" + _fmt(val, 0) + ")"))
    return parts


def _fmt_date(dt):
    return "%d %s %d" % (dt.day, _MONTHS[dt.month - 1], dt.year)


def _fmt_diff(minutes):
    if minutes == 0:
        return "the same time"
    ahead = minutes > 0
    m = abs(minutes)
    h, mm = divmod(m, 60)
    parts = []
    if h:
        parts.append("%d %s" % (h, _plural(h, "hour", "hours")))
    if mm:
        parts.append("%d %s" % (mm, _plural(mm, "minute", "minutes")))
    return " ".join(parts) + (" ahead" if ahead else " behind")


def D(v, q="0.01"):
    import decimal
    return decimal.Decimal(str(v)).quantize(decimal.Decimal(q), rounding=decimal.ROUND_HALF_UP)


def _pay(P, annual_pct, n):
    r = annual_pct / 100.0 / 12.0
    if r == 0:
        return P / n
    return P * r / (1 - (1 + r) ** -n)


def _amort(P, annual_pct, years):
    r = annual_pct / 100.0 / 12.0
    n = years * 12
    pay = _pay(P, annual_pct, n)
    bal = P
    tot_i = 0.0
    yi = yp = 0.0
    yearly = []
    first = []
    for m in range(1, n + 1):
        i = bal * r
        pr = pay - i
        bal -= pr
        tot_i += i
        yi += i
        yp += pr
        if m <= 12:
            first.append((m, i, pr, bal))
        if m % 12 == 0:
            yearly.append((m // 12, yi, yp, bal))
            yi = yp = 0.0
    return pay, tot_i, yearly, first


def _card_payoff(bal, apr, pmt):
    r = apr / 100.0 / 12.0
    if pmt <= bal * r:
        return None
    b = bal
    months = 0
    tot = 0.0
    last = 0.0
    while b > 0.005 and months < 1200:
        i = b * r
        pp = min(pmt, b + i)
        b = b + i - pp
        tot += pp
        last = pp
        months += 1
    if b > 0.005:
        return None
    return months, tot - bal, tot, last


def _debt_sim(pmt, debts, order):
    ds = [list(d) for d in debts]
    init = sum(d[0] for d in debts)
    months = 0
    tot = 0.0
    while any(d[0] > 0.005 for d in ds) and months < 1200:
        for d in ds:
            if d[0] > 0:
                d[0] += d[0] * d[1] / 100.0 / 12.0
        rem = pmt
        for idx in order:
            if rem <= 0:
                break
            d = ds[idx]
            if d[0] > 0:
                pp = min(rem, d[0])
                d[0] -= pp
                rem -= pp
                tot += pp
        months += 1
    if any(d[0] > 0.005 for d in ds):
        return None
    return months, tot - init


def _pace_str(min_per_unit):
    sec = int(min_per_unit * 60 + 0.5)
    return "%d:%02d" % (sec // 60, sec % 60)


_MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July",
           "August", "September", "October", "November", "December"]


def _date_fmt(d):
    return "%d %s %d" % (d.day, _MONTHS_FULL[d.month - 1], d.year)


def initial_result_bar(tool):
    """Mirror of the shared-JS engines for the generic bar chart, for the
    static first paint. One branch per tool slug (without '-calculator')."""
    import datetime
    import math as _math
    c = tool["content"]
    slug = tool["slug"].replace("-calculator", "")
    vals = {}
    for f in c["fields"]:
        vals[f["id"]] = f["default"]
    num = lambda k: float(vals[k])

    if slug == "amortization":
        P, rate, yrs = num("amount"), num("rate"), int(num("years"))
        p, ti, yearly, first = _amort(P, rate, yrs)
        total = p * yrs * 12
        rows = [["Monthly payment", _money(p)],
                ["Total paid over %d years" % yrs, _money(total)],
                ["Total interest", _money(ti)]]
        for y, yi, yp, bal in yearly:
            rows += [["Year %d \u2014 interest" % y, _money(yi)],
                     ["Year %d \u2014 principal" % y, _money(yp)],
                     ["Year %d \u2014 balance at end of year" % y, _money(bal)]]
        for m, i, pr, bal in first:
            rows.append(["Month %d payment" % m,
                         "%s (interest %s, principal %s, balance %s)"
                         % (_money(p), _money(i), _money(pr), _money(bal))])
        return {"result": _money(p),
                "sentence": "Your monthly payment is %s. Over %d years you pay %s in total, of which %s is interest." % (_money(p), yrs, _money(total), _money(ti)),
                "share": P / total * 100 if total else 0,
                "legend_a": "Loan amount: " + _money(P),
                "legend_b": "Total interest: " + _money(ti),
                "bar_label": "Bar showing the loan amount %s out of the total paid %s" % (_money(P), _money(total)),
                "rows": rows}
    if slug == "rent-vs-buy":
        rent, price, dep, rate, yrs = num("rent"), num("price"), num("deposit"), num("rate"), int(num("years"))
        loan = price - dep
        mp = _pay(loan, rate, 360)
        buy = dep + mp * 12 * yrs
        rentt = rent * 12 * yrs
        be = dep / (12 * (rent - mp)) if rent > mp else None
        verdict = ("Buying is cheaper by %s" % _money(rentt - buy) if buy < rentt else
                   "Renting is cheaper by %s" % _money(buy - rentt) if rentt < buy else "Both cost the same")
        cheaper, dearer = min(buy, rentt), max(buy, rentt)
        return {"result": verdict,
                "sentence": "Buying costs %s over %d years; renting costs %s. %s" % (
                    _money(buy), yrs, _money(rentt),
                    "The two totals meet after about %s years." % fmt2(be) if be is not None else
                    "The rent is below the monthly mortgage payment, so the two totals never meet."),
                "share": cheaper / dearer * 100 if dearer else 0,
                "legend_a": "Cheaper choice total: " + _money(cheaper),
                "legend_b": "Dearest choice total: " + _money(dearer),
                "bar_label": "Bar showing the cheaper total %s against the dearest total %s" % (_money(cheaper), _money(dearer)),
                "rows": [["Monthly mortgage payment (30-year term)", _money(mp)],
                         ["Total cost of buying over %d years" % yrs, _money(buy)],
                         ["Total cost of renting over %d years" % yrs, _money(rentt)],
                         ["Difference", _money(abs(buy - rentt))],
                         ["Break-even year", "About %s years" % fmt2(be) if be is not None else "No break-even year \u2014 the rent is below the mortgage payment"]]}
    if slug == "house-affordability":
        inc, dep, debts, rate, yrs = num("income"), num("deposit"), num("debts"), num("rate"), int(num("years"))
        mp = inc / 12 * 0.28 - debts
        rr = rate / 100.0 / 12.0
        n = yrs * 12
        loan = mp * n if rr == 0 else mp * (1 - (1 + rr) ** -n) / rr
        price = loan + dep
        return {"result": _money(price),
                "sentence": "Largest monthly payment %s supports a loan of %s; with your %s deposit the highest price is %s." % (_money(mp), _money(loan), _money(dep), _money(price)),
                "share": loan / price * 100 if price else 0,
                "legend_a": "Largest loan: " + _money(loan),
                "legend_b": "Deposit: " + _money(dep),
                "bar_label": "Bar showing the largest loan %s out of the highest price %s" % (_money(loan), _money(price)),
                "rows": [["Monthly income", _money(inc / 12)],
                         ["28% of monthly income", _money(inc / 12 * 0.28)],
                         ["Largest monthly payment (after debts)", _money(mp)],
                         ["Largest loan", _money(loan)],
                         ["Deposit", _money(dep)],
                         ["Highest home price", _money(price)]]}
    if slug == "down-payment":
        price, pct = num("price"), num("percent")
        dep = price * pct / 100
        loan = price - dep
        return {"result": _money(dep),
                "sentence": "Deposit %s on a %s home leaves a loan of %s." % (_money(dep), _money(price), _money(loan)),
                "share": pct,
                "legend_a": "Deposit: " + _money(dep),
                "legend_b": "Loan left to borrow: " + _money(loan),
                "bar_label": "Bar showing the deposit %s out of the home price %s" % (_money(dep), _money(price)),
                "rows": [["Home price", _money(price)],
                         ["Deposit percent", fmt2(pct) + "%"],
                         ["Deposit (your result)", _money(dep)],
                         ["Loan left to borrow", _money(loan)],
                         ["Deposit at 5%", _money(price * 0.05)],
                         ["Deposit at 10%", _money(price * 0.10)],
                         ["Deposit at 20%", _money(price * 0.20)]]}
    if slug == "refinance-comparison":
        bal, cr, nr, yrs, costs = num("balance"), num("current_rate"), num("new_rate"), int(num("years")), num("costs")
        cp = _pay(bal, cr, yrs * 12)
        np_ = _pay(bal, nr, yrs * 12)
        s = cp - np_
        be = _math.ceil(costs / s) if s > 0 else None
        verdict = ("Save %s a month" % _money(s) if s > 0 else
                   "Costs %s more a month" % _money(-s) if s < 0 else "No change in the monthly payment")
        return {"result": verdict,
                "sentence": "Old payment %s, new payment %s. %s" % (
                    _money(cp), _money(np_),
                    "The %s fees pay for themselves in %d months." % (_money(costs), be) if s > 0 else
                    "There is no break-even month \u2014 the new loan costs more every month." if s < 0 else "The payments are the same."),
                "share": s / cp * 100 if s > 0 and cp else 0,
                "legend_a": "Monthly saving: " + _money(max(0, s)),
                "legend_b": "Old monthly payment: " + _money(cp),
                "bar_label": "Bar showing the monthly saving %s against the old payment %s" % (_money(max(0, s)), _money(cp)),
                "rows": [["Old monthly payment", _money(cp)],
                         ["New monthly payment", _money(np_)],
                         ["Monthly saving (your result)", _money(s)],
                         ["Refinancing fees", _money(costs)],
                         ["Break-even month", "%d months" % be if be is not None else "No break-even month"],
                         ["Saving over the full term (after fees)", _money(s * yrs * 12 - costs)]]}
    if slug == "loan-comparison":
        a, ra, ta, b, rb, tb = num("amount_a"), num("rate_a"), int(num("years_a")), num("amount_b"), num("rate_b"), int(num("years_b"))
        pa = _pay(a, ra, ta * 12)
        pb = _pay(b, rb, tb * 12)
        ia = pa * ta * 12 - a
        ib = pb * tb * 12 - b
        verdict = ("Loan A costs %s less in total interest" % _money(ib - ia) if ia < ib else
                   "Loan A costs %s more in total interest" % _money(ia - ib) if ib < ia else "Both loans cost the same in total interest")
        cheaper, dearer = min(ia, ib), max(ia, ib)
        return {"result": verdict,
                "sentence": "Loan A: %s a month, %s interest. Loan B: %s a month, %s interest." % (_money(pa), _money(ia), _money(pb), _money(ib)),
                "share": cheaper / dearer * 100 if dearer else 0,
                "legend_a": "Cheaper loan interest: " + _money(cheaper),
                "legend_b": "Dearest loan interest: " + _money(dearer),
                "bar_label": "Bar showing the cheaper total interest %s against the dearest %s" % (_money(cheaper), _money(dearer)),
                "rows": [["Loan A monthly payment", _money(pa)],
                         ["Loan A total interest", _money(ia)],
                         ["Loan A total paid", _money(pa * ta * 12)],
                         ["Loan B monthly payment", _money(pb)],
                         ["Loan B total interest", _money(ib)],
                         ["Loan B total paid", _money(pb * tb * 12)],
                         ["Difference in total interest", _money(abs(ia - ib))]]}
    if slug == "credit-card-payoff":
        bal, apr, pmt = num("balance"), num("rate"), num("payment")
        months, interest, total, last = _card_payoff(bal, apr, pmt)
        first_i = bal * apr / 100 / 12
        return {"result": "%d months, %s interest" % (months, _money(interest)),
                "sentence": "Total paid %s over %d months. First month's interest %s." % (_money(total), months, _money(first_i)),
                "share": bal / total * 100 if total else 0,
                "legend_a": "Card balance: " + _money(bal),
                "legend_b": "Total interest: " + _money(interest),
                "bar_label": "Bar showing the card balance %s out of the total paid %s" % (_money(bal), _money(total)),
                "rows": [["Months to clear the card", "%d months" % months],
                         ["Total paid", _money(total)],
                         ["Total interest (your result)", _money(interest)],
                         ["First month's interest", _money(first_i)],
                         ["Last payment", _money(last)]]}
    if slug == "debt-payoff":
        pmt = num("payment")
        debts = [(num("balance%d" % i), num("rate%d" % i), "Debt %d" % i) for i in (1, 2, 3) if num("balance%d" % i) > 0]
        total = sum(d[0] for d in debts)
        snow_order = sorted(range(len(debts)), key=lambda i: debts[i][0])
        aval_order = sorted(range(len(debts)), key=lambda i: -debts[i][1])
        ms, ints = _debt_sim(pmt, [(d[0], d[1]) for d in debts], snow_order)
        ma, inta = _debt_sim(pmt, [(d[0], d[1]) for d in debts], aval_order)
        snow_txt = ", ".join(debts[i][2] for i in snow_order)
        aval_txt = ", ".join(debts[i][2] for i in aval_order)
        return {"result": "Snowball: %d months, %s interest. Avalanche: %d months, %s interest." % (ms, _money(ints), ma, _money(inta)),
                "sentence": "Total debt %s. Snowball order: %s. Avalanche order: %s." % (_money(total), snow_txt, aval_txt),
                "share": total / (total + inta) * 100 if total + inta else 0,
                "legend_a": "Total debt: " + _money(total),
                "legend_b": "Avalanche interest: " + _money(inta),
                "bar_label": "Bar showing the total debt %s out of debt plus avalanche interest" % _money(total),
                "rows": [["Total debt", _money(total)],
                         ["Monthly payment", _money(pmt)],
                         ["Snowball months", "%d months" % ms],
                         ["Snowball interest", _money(ints)],
                         ["Avalanche months", "%d months" % ma],
                         ["Avalanche interest", _money(inta)],
                         ["Snowball order", snow_txt],
                         ["Avalanche order", aval_txt]]}
    if slug == "budget-50-30-20":
        inc = num("income")
        needs, wants, sav = inc * 0.5, inc * 0.3, inc * 0.2
        return {"result": "Needs %s, Wants %s, Savings %s" % (_money(needs), _money(wants), _money(sav)),
                "sentence": "50%% for needs, 30%% for wants and 20%% for savings, from %s a month after tax." % _money(inc),
                "share": 50,
                "legend_a": "Needs (50%): " + _money(needs),
                "legend_b": "Wants (30%) and savings (20%): " + _money(wants + sav),
                "bar_label": "Bar showing needs at 50% of income",
                "rows": [["Monthly income after tax", _money(inc)],
                         ["Needs (50%)", _money(needs)],
                         ["Wants (30%)", _money(wants)],
                         ["Savings (20%)", _money(sav)]]}
    if slug == "inflation":
        amount, yrs, rate = num("amount"), int(num("years")), num("rate")
        adj = amount * (1 + rate / 100) ** yrs
        rise = adj - amount
        return {"result": _money(adj),
                "sentence": "%s from %d years ago at %s%% a year is %s today \u2014 a rise of %s (%s)." % (
                    _money(amount), yrs, fmt2(rate), _money(adj), _money(rise),
                    fmt2(rise / amount * 100) + "%" if amount else "0.00%"),
                "share": amount / adj * 100 if adj else 0,
                "legend_a": "Past amount: " + _money(amount),
                "legend_b": "Today's amount: " + _money(adj),
                "bar_label": "Bar showing the past amount %s out of today's amount %s" % (_money(amount), _money(adj)),
                "rows": [["Amount in the past year", _money(amount)],
                         ["Amount in today's money (your result)", _money(adj)],
                         ["Rise in dollars", _money(rise)],
                         ["Rise in percent", fmt2(rise / amount * 100) + "%" if amount else "0.00%"],
                         ["Same amount at 2% a year", _money(amount * 1.02 ** yrs)],
                         ["Same amount at 5% a year", _money(amount * 1.05 ** yrs)]]}
    if slug == "currency-converter":
        amount, rate = num("amount"), num("rate")
        conv = amount * rate
        share = 0 if rate == 0 else (100 / rate if rate >= 1 else rate * 100)
        return {"result": fmt2(conv),
                "sentence": "%s at a rate of %s converts to %s. This site does not fetch live rates \u2014 the rate is the one you typed." % (fmt2(amount), fmt2(rate), fmt2(conv)),
                "share": share,
                "legend_a": "Amount: " + fmt2(amount),
                "legend_b": "Converted amount: " + fmt2(conv),
                "bar_label": "Bar showing the amount %s against the converted amount %s" % (fmt2(amount), fmt2(conv)),
                "rows": [["Amount to convert", fmt2(amount)],
                         ["Exchange rate (typed by you)", fmt2(rate)],
                         ["Converted amount (your result)", fmt2(conv)],
                         ["Reverse rate", fmt2(1 / rate, 4) if rate else "\u2014"],
                         ["Same amount at a rate of 1.00", fmt2(amount)]]}
    if slug == "body-fat":
        sex = vals["sex"]
        h, waist, neck, hip = num("height"), num("waist"), num("neck"), num("hip")
        if sex == "male":
            v = 495 / (1.0324 - 0.19077 * _math.log10(waist - neck) + 0.15456 * _math.log10(h)) - 450
            cat = ("Essential fat" if v < 6 else "Athletes" if v < 14 else "Fitness" if v < 18 else "Average" if v < 25 else "Obese")
        else:
            v = 495 / (1.29579 - 0.35004 * _math.log10(waist + hip - neck) + 0.22100 * _math.log10(h)) - 450
            cat = ("Essential fat" if v < 14 else "Athletes" if v < 21 else "Fitness" if v < 25 else "Average" if v < 32 else "Obese")
        return {"result": fmt2(v, 1) + "%",
                "sentence": "Body fat about %s%% (US Navy method). Category: %s." % (fmt2(v, 1), cat),
                "share": max(0.0, min(100.0, v)),
                "legend_a": "Your body fat: " + fmt2(v, 1) + "%",
                "legend_b": "Category: " + cat,
                "bar_label": "Bar showing body fat %s%%" % fmt2(v, 1),
                "rows": [["Body fat percent (your result)", fmt2(v, 1) + "%"],
                         ["Category", cat],
                         ["Waist minus neck", fmt2(waist - neck) + " cm"],
                         ["Height", fmt2(h) + " cm"]]}
    if slug == "ideal-weight":
        sex = vals["sex"]
        h = num("height")
        m = h / 100
        lo, hi = 18.5 * m * m, 24.9 * m * m
        inch = h / 2.54
        devine = (50 if sex == "male" else 45.5) + 2.3 * max(0, inch - 60)
        return {"result": "%s\u2013%s kg" % (fmt2(lo, 1), fmt2(hi, 1)),
                "sentence": "Healthy range %s\u2013%s kg (%s\u2013%s lb). Devine ideal: %s kg." % (
                    fmt2(lo, 1), fmt2(hi, 1), fmt2(lo * 2.20462, 1), fmt2(hi * 2.20462, 1), fmt2(devine, 1)),
                "share": max(0.0, min(100.0, (devine - lo) / (hi - lo) * 100)),
                "legend_a": "Healthy range: %s\u2013%s kg" % (fmt2(lo, 1), fmt2(hi, 1)),
                "legend_b": "Devine ideal: " + fmt2(devine, 1) + " kg",
                "bar_label": "Bar showing the Devine ideal weight inside the healthy range",
                "rows": [["Lowest healthy weight", fmt2(lo, 1) + " kg"],
                         ["Highest healthy weight", fmt2(hi, 1) + " kg"],
                         ["Lowest healthy weight", fmt2(lo * 2.20462, 1) + " lb"],
                         ["Highest healthy weight", fmt2(hi * 2.20462, 1) + " lb"],
                         ["Devine ideal weight", fmt2(devine, 1) + " kg"]]}
    if slug == "macro":
        cal, p, c_, f = num("calories"), num("protein"), num("carbs"), num("fat")
        pr = int(D(cal * p / 100 / 4, "1"))
        ca = int(D(cal * c_ / 100 / 4, "1"))
        fa = int(D(cal * f / 100 / 9, "1"))
        kp, kc, kf = pr * 4, ca * 4, fa * 9
        total = kp + kc + kf
        return {"result": "Protein %d g, Carbs %d g, Fat %d g" % (pr, ca, fa),
                "sentence": "Protein gives %d calories, carbs %d and fat %d, from the rounded grams." % (kp, kc, kf),
                "share": kp / total * 100 if total else 0,
                "legend_a": "Protein calories: %d" % kp,
                "legend_b": "Carbs and fat calories: %d" % (kc + kf),
                "bar_label": "Bar showing protein calories out of the total",
                "rows": [["Protein", "%d g (%d calories)" % (pr, kp)],
                         ["Carbs", "%d g (%d calories)" % (ca, kc)],
                         ["Fat", "%d g (%d calories)" % (fa, kf)],
                         ["Total from the rounded grams", "%d calories" % total]]}
    if slug == "pace":
        dist, mins = num("distance"), num("time")
        per_km = mins / dist
        per_mile = per_km * 1.60934
        hours = mins / 60
        kmh = dist / hours if hours else 0
        mph = kmh / 1.60934
        return {"result": "%s min/km, %s min/mile" % (_pace_str(per_km), _pace_str(per_mile)),
                "sentence": "Speed %s km/h (%s mph) over %s km in %s minutes." % (fmt2(kmh), fmt2(mph), fmt2(dist), fmt2(mins)),
                "share": max(0.0, min(100.0, kmh / 20 * 100)),
                "legend_a": "Pace per km: %s min/km" % _pace_str(per_km),
                "legend_b": "Pace per mile: %s min/mile" % _pace_str(per_mile),
                "bar_label": "Bar showing speed %s km/h out of 20 km/h" % fmt2(kmh),
                "rows": [["Pace per kilometre", "%s min/km" % _pace_str(per_km)],
                         ["Pace per mile", "%s min/mile" % _pace_str(per_mile)],
                         ["Speed", fmt2(kmh) + " km/h"],
                         ["Speed", fmt2(mph) + " mph"],
                         ["Distance", fmt2(dist) + " km"],
                         ["Time", fmt2(mins) + " minutes"]]}
    if slug == "pregnancy-due-date":
        y, mo, d = (int(x) for x in vals["lmp"].split("-"))
        lmp = datetime.date(y, mo, d)
        due = lmp + datetime.timedelta(days=280)
        today = datetime.date(*[int(x) for x in TODAY.split("-")])
        weeks = (today - lmp).days // 7
        tri = ("Past the due date" if weeks > 40 else "First trimester (weeks 1\u201313)" if weeks < 14 else
               "Second trimester (weeks 14\u201327)" if weeks < 28 else "Third trimester (weeks 28\u201340)")
        return {"result": _date_fmt(due),
                "sentence": "That is 40 weeks from the first day of the last period. You are about %d weeks pregnant today." % weeks,
                "share": max(0.0, min(100.0, weeks / 40 * 100)),
                "legend_a": "Weeks pregnant: %d" % weeks,
                "legend_b": "Full pregnancy: 40 weeks",
                "bar_label": "Bar showing %d weeks out of 40" % weeks,
                "rows": [["Estimated due date (your result)", _date_fmt(due)],
                         ["Week of pregnancy", "%d weeks" % weeks],
                         ["Trimester", tri],
                         ["First day of last period", _date_fmt(lmp)]]}
    if slug == "gpa-grade":
        pts_map = {"A": 4, "B": 3, "C": 2, "D": 1, "F": 0}
        courses = []
        for i in (1, 2, 3, 4):
            g = vals["grade%d" % i]
            cr = num("credits%d" % i)
            if g:
                courses.append((g, cr, pts_map[g] * cr))
        tp = sum(c[2] for c in courses)
        tc = sum(c[1] for c in courses)
        gpa = tp / tc
        rows = [["Total credits", "%d" % int(tc)],
                ["Total grade points", fmt2(tp)],
                ["GPA (your result)", fmt2(gpa)]]
        for j, (g, cr, pp) in enumerate(courses, 1):
            rows.append(["Course %d (%s, %d credits)" % (j, g, int(cr)), fmt2(pp) + " points"])
        return {"result": fmt2(gpa),
                "sentence": "Total grade points %s over %d credits." % (fmt2(tp), int(tc)),
                "share": max(0.0, min(100.0, gpa / 4 * 100)),
                "legend_a": "Your GPA: " + fmt2(gpa),
                "legend_b": "Top of the scale: 4.00",
                "bar_label": "Bar showing GPA %s out of 4.00" % fmt2(gpa),
                "rows": rows}
    if slug == "unit-converter":
        value = num("value")
        cat, frm, to = vals["category"], vals["from"], vals["to"]
        factors = {"length": {"m": 1, "km": 1000, "cm": 0.01, "mm": 0.001, "mi": 1609.34, "yd": 0.9144, "ft": 0.3048, "in": 0.0254},
                   "weight": {"kg": 1, "g": 0.001, "lb": 0.453592, "oz": 0.0283495, "t": 1000},
                   "volume": {"L": 1, "mL": 0.001, "gal": 3.78541, "pt": 0.473176, "cup": 0.236588, "fl oz": 0.0295735},
                   "area": {"m\u00b2": 1, "km\u00b2": 1000000, "ha": 10000, "acre": 4046.86, "ft\u00b2": 0.092903, "mi\u00b2": 2589988.11},
                   "speed": {"km/h": 1, "mph": 1.60934, "m/s": 3.6, "kn": 1.852}}
        if cat == "temperature":
            if frm == "\u00b0C":
                cval = value
            elif frm == "\u00b0F":
                cval = (value - 32) * 5 / 9
            else:
                cval = value - 273.15
            out = cval if to == "\u00b0C" else (cval * 9 / 5 + 32 if to == "\u00b0F" else cval + 273.15)
            rev = out and (1 if False else None)
            if to == "\u00b0C":
                rc = 1
            elif to == "\u00b0F":
                rc = (1 - 32) * 5 / 9
            else:
                rc = 1 - 273.15
            rev = rc if frm == "\u00b0C" else (rc * 9 / 5 + 32 if frm == "\u00b0F" else rc + 273.15)
            factor = None
        else:
            fac = factors[cat]
            out = value * fac[frm] / fac[to]
            factor = fac[frm] / fac[to]
            rev = fac[to] / fac[frm]
        share = 0 if value == 0 else max(0.0, min(100.0, abs(out / value) * 100))
        rows = [["Converted value (your result)", "%s %s" % (fmt2(out, 4), to)]]
        if factor is not None:
            rows.append(["Conversion factor", "1 %s = %s %s" % (frm, fmt2(factor, 4), to)])
        rows.append(["Reverse conversion", "1 %s = %s %s" % (to, fmt2(rev, 4), frm)])
        return {"result": "%s %s" % (fmt2(out, 4), to),
                "sentence": "%s %s is %s %s. The reverse is 1 %s = %s %s." % (fmt2(value), frm, fmt2(out, 4), to, to, fmt2(rev, 4), frm),
                "share": share,
                "legend_a": "Converted: %s %s" % (fmt2(out, 4), to),
                "legend_b": "Original: %s %s" % (fmt2(value), frm),
                "bar_label": "Bar showing the converted value %s %s" % (fmt2(out, 4), to),
                "rows": rows}
    if slug == "tip-tax-discount":
        price, disc, tax, tip = num("price"), num("discount"), num("tax"), num("tip")
        discd = price * (1 - disc / 100)
        tax_amt = discd * tax / 100
        sub = discd + tax_amt
        tip_amt = sub * tip / 100
        total = sub + tip_amt
        return {"result": _money(total),
                "sentence": "After a %s discount, %s tax and a %s tip, the total is %s." % (_money(price - discd), _money(tax_amt), _money(tip_amt), _money(total)),
                "share": max(0.0, min(100.0, total / price * 100)) if price else 0,
                "legend_a": "Final total: " + _money(total),
                "legend_b": "Price before discount: " + _money(price),
                "bar_label": "Bar showing the final total %s against the starting price %s" % (_money(total), _money(price)),
                "rows": [["Price before discount", _money(price)],
                         ["Discount (%s%%)" % fmt2(disc), "\u2212" + _money(price - discd)],
                         ["Price after discount", _money(discd)],
                         ["Tax", _money(tax_amt)],
                         ["Tip", _money(tip_amt)],
                         ["Final total (your result)", _money(total)]]}
    if slug == "unit-price":
        pa, sa, pb, sb = num("price_a"), num("size_a"), num("price_b"), num("size_b")
        ua, ub = pa / sa, pb / sb
        verdict = ("Pack A is better value" if ua < ub else "Pack B is better value" if ub < ua else "Both packs cost the same")
        detail = ("Pack A saves $%s per unit." % fmt2(ub - ua, 4) if ua < ub else
                  "Pack B saves $%s per unit." % fmt2(ua - ub, 4) if ub < ua else "Both packs cost the same per unit.")
        cheaper, dearer = min(ua, ub), max(ua, ub)
        return {"result": verdict,
                "sentence": "Pack A: $%s per unit. Pack B: $%s per unit. %s" % (fmt2(ua, 4), fmt2(ub, 4), detail),
                "share": cheaper / dearer * 100 if dearer else 0,
                "legend_a": "Cheaper pack: $%s per unit" % fmt2(cheaper, 4),
                "legend_b": "Dearest pack: $%s per unit" % fmt2(dearer, 4),
                "bar_label": "Bar showing the cheaper unit price against the dearest",
                "rows": [["Pack A unit price", "$%s per unit" % fmt2(ua, 4)],
                         ["Pack B unit price", "$%s per unit" % fmt2(ub, 4)],
                         ["Difference per unit", "$%s" % fmt2(abs(ua - ub), 4)],
                         ["Better value (your result)", verdict]]}
    if slug == "fuel-vs-ev":
        miles, mpg, fprice, kwhpm, eprice = num("miles"), num("mpg"), num("fuel_price"), num("kwh_per_mile"), num("elec_price")
        petrol = miles / mpg * fprice
        ev = miles * kwhpm * eprice
        diff = abs(petrol - ev)
        if miles == 0:
            sentence = "With 0 miles a year, both cost $0.00 a year."
        elif petrol < ev:
            sentence = "Petrol costs %s less a year. Petrol is %s per mile; electric is %s per mile." % (_money(diff), _money(petrol / miles), _money(ev / miles))
        elif ev < petrol:
            sentence = "Electric costs %s less a year. Petrol is %s per mile; electric is %s per mile." % (_money(diff), _money(petrol / miles), _money(ev / miles))
        else:
            sentence = "Both cost the same a year."
        cheaper, dearer = min(petrol, ev), max(petrol, ev)
        return {"result": "Petrol: %s a year, Electric: %s a year" % (_money(petrol), _money(ev)),
                "sentence": sentence,
                "share": cheaper / dearer * 100 if dearer else 0,
                "legend_a": "Petrol: %s a year" % _money(petrol),
                "legend_b": "Electric: %s a year" % _money(ev),
                "bar_label": "Bar showing the cheaper yearly cost against the dearest",
                "rows": [["Petrol cost per year", _money(petrol)],
                         ["Electric cost per year", _money(ev)],
                         ["Difference per year", _money(diff)],
                         ["Petrol cost per mile", _money(petrol / miles) if miles else "\u2014"],
                         ["Electric cost per mile", _money(ev / miles) if miles else "\u2014"]]}
    fail("initial_result_bar: no mirror for tool " + slug)


EMPTY_PAINT = {"result": "\u2014",
               "sentence": "Type your numbers above and the answer appears here.",
               "share": 0.0, "legend_a": "No result yet", "legend_b": "\u2014",
               "bar_label": "No result to draw yet",
               "rows": [("Type your numbers in the tool above", "\u2014")]}


def initial_result(tool):
    """Mirror of the shared-JS engines, for the static first paint."""
    import math
    import random
    c = tool["content"]
    d = {f["id"]: f["default"] for f in c["fields"]}
    chart = c["chart"]
    if chart == "bar":
        return initial_result_bar(tool)
    if chart == "bar-table":
        # P1's generic static paint: the tool's own precomputed "initial"
        # block, checked against the live engine by the DOM tests. Tools
        # without one paint empty and the shared JS fills the result on
        # load (countdown: the answer changes every second).
        init = c.get("initial")
        if init:
            for k in ("result", "sentence", "share", "legend_a", "legend_b", "bar_label", "rows"):
                if k not in init:
                    fail("tool %s: content.initial is missing %r" % (tool["slug"], k))
            return {"result": init["result"], "sentence": init["sentence"],
                    "share": float(init["share"]), "legend_a": init["legend_a"],
                    "legend_b": init["legend_b"], "bar_label": init["bar_label"],
                    "rows": [(r[0], r[1]) for r in init["rows"]]}
        return dict(EMPTY_PAINT)

    def num(key):
        return float(d[key])

    def res(result, sentence, share, legend_a, legend_b, bar_label, rows):
        return {"result": result, "sentence": sentence, "share": share,
                "legend_a": legend_a, "legend_b": legend_b,
                "bar_label": bar_label, "rows": rows}

    if chart == "percent-of":
        a = num("a")
        b = num("b")
        value = (a / 100.0) * b
        return res(_fmt(value),
                   "%s%% of %s is %s." % (_fmt(a), _fmt(b), _fmt(value)),
                   max(0.0, min(100.0, abs(value) / abs(b) * 100.0 if b else 0.0)),
                   "Your result: " + _fmt(value),
                   "The rest: " + _fmt(b - value),
                   "Bar showing %s out of %s" % (_fmt(value), _fmt(b)),
                   [("1% of " + _fmt(b), _fmt(b / 100.0)),
                    ("10% of " + _fmt(b), _fmt(b / 10.0)),
                    (_fmt(a) + "% of " + _fmt(b) + " (your result)", _fmt(value)),
                    ("What is left (" + _fmt(b) + " \u2212 " + _fmt(value) + ")", _fmt(b - value)),
                    ("Whole number", _fmt(b))])
    if chart == "what-percent":
        a = num("a")
        b = num("b")
        value = (a / b) * 100.0
        return res(_fmt(value) + "%",
                   "%s is %s%% of %s." % (_fmt(a), _fmt(value), _fmt(b)),
                   max(0.0, min(100.0, abs(value))),
                   "The part: %s (%s%%)" % (_fmt(a), _fmt(value)),
                   "The rest of the whole: " + _fmt(b - a),
                   "Bar showing %s as %s%% of %s" % (_fmt(a), _fmt(value), _fmt(b)),
                   [("Part", _fmt(a)),
                    ("Whole number", _fmt(b)),
                    ("Share (your result)", _fmt(value) + "%"),
                    ("Rest of the whole (" + _fmt(b) + " \u2212 " + _fmt(a) + ")", _fmt(b - a))])
    if chart == "change":
        a = num("a")
        b = num("b")
        value = ((b - a) / a) * 100.0
        word = "an increase" if value > 0 else ("a decrease" if value < 0 else "no change")
        return res(("+" if value >= 0 else "") + _fmt(value) + "%",
                   "From %s to %s is %s of %s%%." % (_fmt(a), _fmt(b), word, _fmt(abs(value))),
                   abs(b) / max(abs(a), abs(b)) * 100.0 if max(abs(a), abs(b)) else 0.0,
                   "New value: " + _fmt(b),
                   "Measured against the larger of the two values",
                   "Bar showing the new value %s against the old value %s" % (_fmt(b), _fmt(a)),
                   [("Old value", _fmt(a)),
                    ("New value", _fmt(b)),
                    ("Difference (" + _fmt(b) + " \u2212 " + _fmt(a) + ")", _fmt(b - a)),
                    ("Change (your result)", ("+" if value >= 0 else "") + _fmt(value) + "%")])

    # ---- stage 4 charts: one branch per chart kind ----
    if chart in ("loan", "annuity"):
        p, r, y = num("p"), num("r"), num("y")
        pay = _loan_pay(p, r, y)
        total = pay * y * 12
        interest = total - p
        if chart == "loan":
            return res(_money(pay),
                       "Borrowing %s at %s%% a year for %s %s costs %s a month."
                       % (_money(p), _fmt(r), _yn(y), _plural(y, "year", "years"), _money(pay)),
                       p / total * 100.0 if total else 0.0,
                       "Loan amount: " + _money(p),
                       "Interest: " + _money(interest),
                       "Bar showing the loan amount as a share of the total paid",
                       [("Monthly payment", _money(pay)),
                        ("Months", str(int(y * 12))),
                        ("Loan amount", _money(p)),
                        ("Total paid", _money(total)),
                        ("Total interest", _money(interest))])
        return res(_money(pay),
                   "A lump sum of %s at %s%% a year paid over %s %s gives %s a month."
                   % (_money(p), _fmt(r), _yn(y), _plural(y, "year", "years"), _money(pay)),
                   p / total * 100.0 if total else 0.0,
                   "Lump sum: " + _money(p),
                   "Interest part: " + _money(interest),
                   "Bar showing the lump sum as a share of the total income",
                   [("Monthly income", _money(pay)),
                    ("Months", str(int(y * 12))),
                    ("Lump sum", _money(p)),
                    ("Total income", _money(total)),
                    ("Interest part", _money(interest))])
    if chart == "college":
        t, l, y, a = num("t"), num("l"), num("y"), num("a")
        tt, lt, at = t * y, l * y, a * y
        total = tt + lt - at
        return res(_money(total),
                   "Tuition of %s a year and living costs of %s a year for %s %s, less %s a year of aid, come to %s in total."
                   % (_money(t), _money(l), _yn(y), _plural(y, "year", "years"), _money(a), _money(total)),
                   tt / (tt + lt) * 100.0 if (tt + lt) else 0.0,
                   "Tuition total: " + _money(tt),
                   "Living total: " + _money(lt),
                   "Bar showing tuition as a share of tuition plus living costs",
                   [("Tuition total", _money(tt)),
                    ("Living costs total", _money(lt)),
                    ("Aid total", _money(at)),
                    ("Total cost", _money(total))])
    if chart == "pension":
        country = d["country"]
        sym = _PENSION_SYM[country]
        m, g, y, b = num("m"), num("g"), num("y"), num("b")
        r = g / 100.0 / 12.0
        n = y * 12
        fv_pay = m * n if r == 0 else m * (((1.0 + r) ** n - 1.0) / r)
        fv_bal = b * ((1.0 + r) ** n)
        total = fv_pay + fv_bal
        paid_in = m * n + b
        growth = total - paid_in
        return res(_money(total, sym),
                   "With a %s, paying %s a month for %s %s at %s%% yearly growth gives %s."
                   % (_PENSION_NAME[country], _money(m, sym), _yn(y),
                      _plural(y, "year", "years"), _fmt(g), _money(total, sym)),
                   paid_in / total * 100.0 if total else 0.0,
                   "Paid in: " + _money(paid_in, sym),
                   "Growth: " + _money(growth, sym),
                   "Bar showing money paid in as a share of the projected value",
                   [("Monthly payment", _money(m, sym)),
                    ("Months", str(int(n))),
                    ("Total paid in", _money(paid_in, sym)),
                    ("Growth", _money(growth, sym)),
                    ("Projected value", _money(total, sym)),
                    ("Note for the " + _PENSION_PLACE[country], _PENSION_NOTE[country])])
    if chart == "present-value":
        f, r, y = num("f"), num("r"), num("y")
        pv = f / ((1.0 + r / 100.0) ** y)
        return res(_money(pv),
                   "%s in %s %s at a discount rate of %s%% a year is worth %s today."
                   % (_money(f), _yn(y), _plural(y, "year", "years"), _fmt(r), _money(pv)),
                   pv / f * 100.0 if f else 0.0,
                   "Present value: " + _money(pv),
                   "Discount: " + _money(f - pv),
                   "Bar showing the present value as a share of the future amount",
                   [("Future amount", _money(f)),
                    ("Discount", _money(f - pv)),
                    ("Present value", _money(pv)),
                    ("Years", _yn(y))])
    if chart == "future-value":
        p, r, y = num("p"), num("r"), num("y")
        fv = p * ((1.0 + r / 100.0) ** y)
        return res(_money(fv),
                   "%s at %s%% a year for %s %s grows to %s."
                   % (_money(p), _fmt(r), _yn(y), _plural(y, "year", "years"), _money(fv)),
                   p / fv * 100.0 if fv else 0.0,
                   "Starting amount: " + _money(p),
                   "Growth: " + _money(fv - p),
                   "Bar showing the starting amount as a share of the future value",
                   [("Starting amount", _money(p)),
                    ("Growth", _money(fv - p)),
                    ("Future value", _money(fv)),
                    ("Years", _yn(y))])
    if chart == "irr":
        flows = [float(x) for x in d["flows"].split(",")]
        v = _irr(flows)
        total_in = sum(cf for cf in flows if cf > 0)
        total_out = -sum(cf for cf in flows if cf < 0)
        net = total_in - total_out
        joined = ", ".join(_fmt(cf) for cf in flows)
        return res(_fmt(v, 4) + "%",
                   "The cash flows %s give an internal rate of return of %s a year."
                   % (joined, _fmt(v, 4) + "%"),
                   max(0.0, min(100.0, v)),
                   "Internal rate of return: " + _fmt(v, 4) + "%",
                   "Net gain: " + _money(net),
                   "Bar showing the rate of return, out of 100%",
                   [("Cash flows", joined),
                    ("Money in", _money(total_in)),
                    ("Money out", _money(total_out)),
                    ("Net gain", _money(net)),
                    ("Internal rate of return", _fmt(v, 4) + "%")])
    if chart == "roi":
        c, v = num("c"), num("v")
        roi = (v - c) / c * 100.0
        gain = v - c
        return res(_fmt(roi) + "%",
                   "Investing %s and receiving %s is a %s of %s, a return of %s."
                   % (_money(c), _money(v), "gain" if gain >= 0 else "loss",
                      _money(abs(gain)), _fmt(roi) + "%"),
                   v / max(c, v) * 100.0 if max(c, v) else 0.0,
                   "Received: " + _money(v),
                   "Invested: " + _money(c),
                   "Bar showing the amount received against the larger of the two amounts",
                   [("Amount invested", _money(c)),
                    ("Amount received", _money(v)),
                    ("Gain or loss", _money(gain)),
                    ("Return on investment", _fmt(roi) + "%")])
    if chart == "margin":
        c, p = num("c"), num("p")
        profit = p - c
        margin = profit / p * 100.0
        markup = profit / c * 100.0 if c != 0 else None
        sent = ("Cost %s and price %s give a profit of %s: a margin of %s"
                % (_money(c), _money(p), _money(profit), _fmt(margin) + "%"))
        sent += (" and a markup of %s." % (_fmt(markup) + "%") if markup is not None
                 else ". The markup is not defined when the cost is zero.")
        return res(_fmt(margin) + "% margin", sent,
                   c / p * 100.0 if p else 0.0,
                   "Cost: " + _money(c),
                   "Profit: " + _money(profit),
                   "Bar showing the cost as a share of the selling price",
                   [("Cost", _money(c)),
                    ("Selling price", _money(p)),
                    ("Profit", _money(profit)),
                    ("Margin", _fmt(margin) + "%"),
                    ("Markup", _fmt(markup) + "%" if markup is not None
                     else "Not defined (cost is zero)")])
    if chart == "commission":
        s, r = num("s"), num("r")
        comm = s * r / 100.0
        return res(_money(comm),
                   "Sales of %s at a commission rate of %s%% earn %s in commission."
                   % (_money(s), _fmt(r), _money(comm)),
                   r,
                   "Commission: " + _money(comm),
                   "Sales: " + _money(s),
                   "Bar showing the commission as a share of sales",
                   [("Total sales", _money(s)),
                    ("Commission rate", _fmt(r) + "%"),
                    ("Commission earned", _money(comm)),
                    ("Commission per $1,000 of sales", _money(r * 10))])
    if chart == "payback":
        inv, yearly = num("i"), num("c")
        yrs = inv / yearly
        whole = math.floor(yrs)
        months = int(round((yrs - whole) * 12))
        if months == 12:
            whole, months = whole + 1, 0
        txt = "%d %s, %d %s" % (whole, _plural(whole, "year", "years"),
                                months, _plural(months, "month", "months"))
        return res(txt,
                   "An investment of %s with %s coming back each year pays for itself in %s."
                   % (_money(inv), _money(yearly), txt),
                   min(100.0, yrs / 10.0 * 100.0),
                   "Payback time: " + txt,
                   "Shown against 10 years",
                   "Bar showing the payback time against 10 years",
                   [("Investment", _money(inv)),
                    ("Yearly cash flow", _money(yearly)),
                    ("Payback in years", _fmt(yrs)),
                    ("Years", str(whole)),
                    ("Months", str(months))])
    if chart == "z-score":
        v, m, s = num("v"), num("m"), num("s")
        z = (v - m) / s
        return res(_fmt(z, 4),
                   "A value of %s with a mean of %s and a standard deviation of %s has a z-score of %s."
                   % (_fmt(v), _fmt(m), _fmt(s), _fmt(z, 4)),
                   max(0.0, min(100.0, (z + 3.0) / 6.0 * 100.0)),
                   "Z-score: " + _fmt(z, 4),
                   "Shown on a scale from -3 to +3",
                   "Bar showing the z-score on a scale from -3 to +3",
                   [("Value", _fmt(v)),
                    ("Mean", _fmt(m)),
                    ("Standard deviation", _fmt(s)),
                    ("Difference from the mean", _fmt(v - m)),
                    ("Z-score", _fmt(z, 4))])
    if chart == "confidence-interval":
        m, s, n, conf = num("m"), num("s"), num("n"), d["conf"]
        z = _Z[conf]
        se = s / math.sqrt(n)
        margin = z * se
        lo, hi = m - margin, m + margin
        return res(_fmt(lo, 4) + " to " + _fmt(hi, 4),
                   "With %s%% confidence, the true mean lies between %s and %s."
                   % (conf, _fmt(lo, 4), _fmt(hi, 4)),
                   min(100.0, margin / abs(m) * 100.0) if m else 0.0,
                   "Margin of error: " + _fmt(margin, 4),
                   "Margin as a share of the mean",
                   "Bar showing the margin of error as a share of the mean",
                   [("Sample mean", _fmt(m, 4)),
                    ("Standard error", _fmt(se, 4)),
                    ("Margin of error", _fmt(margin, 4)),
                    ("Lower limit", _fmt(lo, 4)),
                    ("Upper limit", _fmt(hi, 4))])
    if chart == "sample-size":
        pop, conf, e = num("pop"), d["conf"], num("e")
        z = _Z[conf]
        er = e / 100.0
        n0 = z * z * 0.25 / (er * er)
        n = n0 / (1.0 + (n0 - 1.0) / pop)
        need = math.ceil(n)
        return res(str(need),
                   "Survey %s %s out of a population of %s to get a %s%% confidence level with a %s%% margin of error."
                   % (need, _plural(need, "person", "people"), _fmt(pop, 0), conf, _fmt(e)),
                   min(100.0, need / pop * 100.0),
                   "Sample needed: %s people" % need,
                   "Sample as a share of the population",
                   "Bar showing the sample as a share of the population",
                   [("Population", _fmt(pop, 0)),
                    ("Confidence level", conf + "%"),
                    ("Margin of error", _fmt(e) + "%"),
                    ("Unadjusted size", str(math.ceil(n0))),
                    ("Sample size needed", str(need))])
    if chart == "quadratic":
        a, b, cc = num("a"), num("b"), num("c")
        disc = b * b - 4 * a * cc
        if disc == 0:
            root = -b / (2 * a)
            result = "x = %s (repeated root)" % _fmt(root, 4)
            sent = ("For %sx\u00b2 + %sx + %s = 0, the discriminant is 0, so there is one repeated root: x = %s."
                    % (_fmt(a), _fmt(b), _fmt(cc), _fmt(root, 4)))
            rows = [("a", _fmt(a)), ("b", _fmt(b)), ("c", _fmt(cc)),
                    ("Discriminant", _fmt(disc, 4)), ("Root 1", _fmt(root, 4)),
                    ("Root 2", "Same root (repeated)")]
        else:
            sq = math.sqrt(disc)
            r1 = (-b + sq) / (2 * a)
            r2 = (-b - sq) / (2 * a)
            result = "x = %s, x = %s" % (_fmt(r1, 4), _fmt(r2, 4))
            sent = ("For %sx\u00b2 + %sx + %s = 0, the roots are x = %s and x = %s."
                    % (_fmt(a), _fmt(b), _fmt(cc), _fmt(r1, 4), _fmt(r2, 4)))
            rows = [("a", _fmt(a)), ("b", _fmt(b)), ("c", _fmt(cc)),
                    ("Discriminant", _fmt(disc, 4)), ("Root 1", _fmt(r1, 4)),
                    ("Root 2", _fmt(r2, 4))]
        return res(result, sent, min(100.0, abs(disc)),
                   "Discriminant: " + _fmt(disc, 4),
                   "Shown capped at 100",
                   "Bar showing the discriminant, capped at 100", rows)
    if chart == "slope":
        x1, y1, x2, y2 = num("x1"), num("y1"), num("x2"), num("y2")
        dx, dy = x2 - x1, y2 - y1
        m = dy / dx
        b = y1 - m * x1
        eq = "y = %sx %s %s" % (_fmt(m, 4), "+" if b >= 0 else "\u2212", _fmt(abs(b), 4))
        return res(_fmt(m, 4),
                   "The line through (%s, %s) and (%s, %s) has a slope of %s and the equation %s."
                   % (_fmt(x1), _fmt(y1), _fmt(x2), _fmt(y2), _fmt(m, 4), eq),
                   min(100.0, abs(m) / 10.0 * 100.0),
                   "Slope: " + _fmt(m, 4),
                   "Shown against a slope of 10",
                   "Bar showing the slope against 10",
                   [("Point 1", "(%s, %s)" % (_fmt(x1), _fmt(y1))),
                    ("Point 2", "(%s, %s)" % (_fmt(x2), _fmt(y2))),
                    ("Rise", _fmt(dy)),
                    ("Run", _fmt(dx)),
                    ("Slope", _fmt(m, 4)),
                    ("Y-intercept", _fmt(b, 4))])
    if chart == "log":
        x, base = num("x"), num("b")
        v = math.log(x) / math.log(base)
        return res(_fmt(v, 10),
                   "The logarithm of %s to base %s is %s."
                   % (_fmt(x), _fmt(base), _fmt(v, 10)),
                   max(0.0, min(100.0, v / 10.0 * 100.0)),
                   "Log result: " + _fmt(v, 10),
                   "Shown against 10",
                   "Bar showing the log result against 10",
                   [("Number", _fmt(x)),
                    ("Base", _fmt(base)),
                    ("Natural log of the number", _fmt(math.log(x), 10)),
                    ("Natural log of the base", _fmt(math.log(base), 10)),
                    ("Log result", _fmt(v, 10))])
    if chart == "exponent":
        base, exp = num("a"), num("b")
        v = base ** exp
        sq = base * base
        root = math.sqrt(base) if base >= 0 else None
        return res(_fmt(v, 4),
                   "%s raised to the power %s is %s."
                   % (_fmt(base), _fmt(exp), _fmt(v, 4)),
                   min(100.0, abs(v)) if v >= 0 else 0.0,
                   "Result: " + _fmt(v, 4),
                   "Shown capped at 100",
                   "Bar showing the result, capped at 100",
                   [("Base", _fmt(base)),
                    ("Exponent", _fmt(exp)),
                    ("Result", _fmt(v, 4)),
                    ("Square of the base", _fmt(sq, 4)),
                    ("Square root of the base",
                     _fmt(root, 4) if root is not None else "Not a real number")])
    if chart == "binary-hex":
        val = d["val"]
        frm = int(d["frm"])
        value = int(val, frm)
        b, o, dd, h = bin(value)[2:], oct(value)[2:], str(value), format(value, "X")
        names = {2: "binary", 8: "octal", 10: "decimal", 16: "hexadecimal"}
        shown = dd if frm == 10 else {2: b, 8: o, 16: h}[frm]
        ones = b.count("1")
        return res("%s in decimal = %s in binary, %s in octal, %s in hexadecimal" % (dd, b, o, h),
                   "%s in %s is %s in binary, %s in octal and %s in hexadecimal."
                   % (shown, names[frm], b, o, h),
                   ones / len(b) * 100.0 if b else 0.0,
                   "Ones in the binary form: %d of %d bits" % (ones, len(b)),
                   "Share of 1 bits in the binary form",
                   "Bar showing the share of 1 bits in the binary form",
                   [("Binary", b), ("Octal", o), ("Decimal", dd),
                    ("Hexadecimal", h), ("Number of 1 bits", str(ones))])
    if chart == "roman":
        val = d["val"]
        if val.isdigit():
            n = int(val)
            num = _to_roman(n)
            return res("%s = %s" % (_fmt(n, 0), num),
                       "%s in Roman numerals is %s." % (_fmt(n, 0), num),
                       n / 3999.0 * 100.0,
                       "Number: " + _fmt(n, 0),
                       "Shown against 3,999, the largest Roman numeral here",
                       "Bar showing the number against 3,999",
                       [("Number", _fmt(n, 0)), ("Roman numeral", num)] + _roman_rows(n))
        n = 0
        vals = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
        prev = 0
        for ch in reversed(val.upper()):
            cur = vals[ch]
            n = n - cur if cur < prev else n + cur
            prev = max(prev, cur)
        numeral = val.upper()
        return res("%s = %s" % (numeral, _fmt(n, 0)),
                   "%s as a number is %s." % (numeral, _fmt(n, 0)),
                   n / 3999.0 * 100.0,
                   "Number: " + _fmt(n, 0),
                   "Shown against 3,999, the largest Roman numeral here",
                   "Bar showing the number against 3,999",
                   [("Roman numeral", numeral), ("Number", _fmt(n, 0))] + _roman_rows(n))
    if chart == "dice":
        # No static paint: the dice are rolled at random in the
        # browser, so no precomputed roll could match the live
        # result. The shared JS fills the result on load.
        return dict(EMPTY_PAINT)
    if chart == "time-zone":
        from datetime import datetime
        from zoneinfo import ZoneInfo
        date_s, time_s = d["date"], d["time"]
        from_tz, to_tz = d["frm"], d["to"]
        y, mo, dd = (int(x) for x in date_s.split("-"))
        hh, mm = (int(x) for x in time_s.split(":"))
        src = datetime(y, mo, dd, hh, mm, tzinfo=ZoneInfo(from_tz))
        dst = src.astimezone(ZoneInfo(to_tz))
        diff = int(dst.utcoffset().total_seconds() // 60) - int(src.utcoffset().total_seconds() // 60)
        result = "%02d:%02d" % (dst.hour, dst.minute)
        return res(result,
                   "%s on %s in %s is %s on %s in %s (%s)."
                   % (time_s, _fmt_date(src), from_tz, result, _fmt_date(dst), to_tz, _fmt_diff(diff)),
                   (dst.hour + dst.minute / 60.0) / 24.0 * 100.0,
                   "Time in " + to_tz + ": " + result,
                   "Time of day in the new zone",
                   "Bar showing the time of day in the new zone",
                   [("Date", _fmt_date(src)),
                    ("Time in " + from_tz, time_s),
                    ("Time in " + to_tz, result),
                    ("Difference", _fmt_diff(diff))])
    if chart == "time-card":
        days = [("Monday", d["mon_in"], d["mon_out"]),
                ("Tuesday", d["tue_in"], d["tue_out"]),
                ("Wednesday", d["wed_in"], d["wed_out"]),
                ("Thursday", d["thu_in"], d["thu_out"]),
                ("Friday", d["fri_in"], d["fri_out"])]
        brk, rate = num("brk"), num("rate")
        rows, total_min = [], 0
        for label, inn, out in days:
            ih, im = (int(x) for x in inn.split(":"))
            oh, om = (int(x) for x in out.split(":"))
            if inn == out:
                mins = 0
            else:
                mins = (oh * 60 + om) - (ih * 60 + im) - brk
            total_min += mins
            rows.append((label, _fmt(mins / 60.0)))
        total_h = total_min / 60.0
        overtime = max(0.0, total_h - 40.0)
        pay = total_h * rate
        rows += [("Total hours", _fmt(total_h)),
                 ("Overtime hours", _fmt(overtime)),
                 ("Hourly rate", _money(rate)),
                 ("Total pay", _money(pay))]
        return res(_fmt(total_h) + " hours",
                   "This week: %s in total, including %s of overtime, at %s an hour \u2014 pay %s."
                   % (_fmt(total_h) + " hours", _fmt(overtime) + " hours", _money(rate), _money(pay)),
                   min(100.0, total_h / 40.0 * 100.0),
                   "Total hours: " + _fmt(total_h),
                   "Hours against a 40-hour week",
                   "Bar showing total hours against a 40-hour week",
                   rows)
    # Unknown chart kind: fail loudly rather than painting a wrong result.
    raise ValueError("unsupported chart kind %r for %s" % (chart, tool["slug"]))


# Country pages that share one tool across countries: (code, label) per tool
# family. The selector in render_tool links to the same tool for each country.
COUNTRY_PAGES = {
    "take-home-pay": [("uk", "United Kingdom (\u00a3)"), ("us", "USA ($)"),
                      ("au", "Australia (A$)"), ("ca", "Canada (C$)"),
                      ("nz", "New Zealand (NZ$)"), ("ie", "Ireland (\u20ac)"),
                      ("de", "Germany (\u20ac)"), ("sg", "Singapore (S$)")],
    "income-tax": [("uk", "United Kingdom (\u00a3)"), ("us", "USA ($)"),
                   ("au", "Australia (A$)"), ("ca", "Canada (C$)"),
                   ("nz", "New Zealand (NZ$)"), ("ie", "Ireland (\u20ac)"),
                   ("de", "Germany (\u20ac)"), ("sg", "Singapore (S$)")],
    "salary-sacrifice": [("uk", "United Kingdom (\u00a3)"), ("au", "Australia (A$)")],
}


def render_tool(tool, hubs, tools):
    c = tool["content"]
    hub = tool["hub"]
    hub_name = hubs[hub]
    url = SITE + tool["url"]
    title = tool["title"] + " | Calculatorly"
    init = initial_result(tool)
    faqs = c["faqs"]
    howto = c["howto"]

    ld = ""
    ld += ld_block({"@context": "https://schema.org", "@type": "WebApplication",
                    "name": tool["title"], "url": url,
                    "applicationCategory": "UtilitiesApplication",
                    "operatingSystem": "Any (web browser)",
                    "browserRequirements": "Requires JavaScript",
                    "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
                    "provider": {"@type": "Organization", "name": "Calculatorly",
                                 "url": SITE + "/"}})
    ld += ld_block({"@context": "https://schema.org", "@type": "BreadcrumbList",
                    "itemListElement": [
                        {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                        {"@type": "ListItem", "position": 2, "name": hub_name, "item": SITE + "/" + hub + "/"},
                        {"@type": "ListItem", "position": 3, "name": tool["title"], "item": url}]})
    ld += ld_block({"@context": "https://schema.org", "@type": "FAQPage",
                    "mainEntity": [{"@type": "Question", "name": q,
                                    "acceptedAnswer": {"@type": "Answer", "text": a}}
                                   for q, a in faqs]})
    ld += ld_block({"@context": "https://schema.org", "@type": "HowTo",
                    "name": "How to use the " + tool["title"],
                    "step": [{"@type": "HowToStep", "position": i + 1, "text": s}
                             for i, s in enumerate(howto)]})

    fields_html = ""
    for f in c["fields"]:
        fid = "in-" + f["id"]
        ftype = f.get("type", "number")
        if ftype == "select":
            opts = "".join('<option value="%s"%s>%s</option>'
                           % (esc(v), " selected" if str(v) == str(f["default"]) else "", esc(l))
                           for v, l in f["options"])
            fields_html += ('      <div class="field">\n'
                            '        <label for="%s">%s</label>\n'
                            '        <select id="%s">%s</select>\n'
                            '      </div>\n' % (fid, esc(f["label"]), fid, opts))
        elif ftype in ("date", "time", "text", "password"):
            fields_html += ('      <div class="field">\n'
                            '        <label for="%s">%s</label>\n'
                            '        <input id="%s" type="%s" value="%s" autocomplete="off" />\n'
                            '      </div>\n' % (fid, esc(f["label"]), fid, ftype, esc(f["default"])))
        else:
            fields_html += ('      <div class="field">\n'
                            '        <label for="%s">%s</label>\n'
                            '        <input id="%s" type="number" inputmode="decimal" step="any" value="%s" autocomplete="off" />\n'
                            '      </div>\n' % (fid, esc(f["label"]), fid, esc(f["default"])))
    keypad_html = ""
    if c.get("keypad"):
        keys = [("C", "clear", ""), ("back", "back", ""), ("(", "v", "("), (")", "v", ")"),
                ("sin(", "v", "sin("), ("cos(", "v", "cos("), ("tan(", "v", "tan("),
                ("log(", "v", "log("), ("ln(", "v", "ln("), ("sqrt(", "v", "sqrt("),
                ("^", "v", "^"), ("%", "v", "%"), ("7", "v", "7"), ("8", "v", "8"),
                ("9", "v", "9"), ("/", "v", "/"), ("4", "v", "4"), ("5", "v", "5"),
                ("6", "v", "6"), ("*", "v", "*"), ("1", "v", "1"), ("2", "v", "2"),
                ("3", "v", "3"), ("-", "v", "-"), ("0", "v", "0"), (".", "v", "."),
                ("pi", "v", "pi"), ("e", "v", "e"), ("+", "v", "+"), ("=", "equals", "")]
        btns = ""
        for label, act, val in keys:
            btns += ('          <button type="button" data-act="%s" data-v="%s">%s</button>\n'
                     % (act, esc(val), esc(label)))
        keypad_html = ('      <div class="keypad" aria-label="Calculator keys">\n%s      </div>\n' % btns)
    howto_html = "".join("        <li><strong>%s</strong></li>\n" % esc(s) for s in howto)
    # First phrase bold like the sample: keep whole step text, bold first clause.
    rows_html = "".join('            <tr><td>%s</td><td class="num">%s</td></tr>\n' % (esc(r[0]), esc(r[1]))
                         for r in init["rows"])
    faq_html = ""
    for q, a in faqs:
        faq_html += ('      <details>\n        <summary>%s</summary>\n        <p>%s</p>\n      </details>\n'
                     % (esc(q), esc(a)))
    hub_of = {t["slug"][:-len("-calculator")]: t["hub"] for t in tools}
    related_html = ""
    for rel in c["related"]:
        # 4-element: [hub, slug, name, desc] (stage 3); 3-element: [slug, name, desc].
        if len(rel) == 4:
            rhub, slug, name, desc = rel
        else:
            slug, name, desc = rel
            rhub = hub_of[slug]
        related_html += ('        <li><a href="%s">%s<span class="d">%s</span>'
                         '<span class="u mono">calculatorly.online/%s/%s-calculator/</span></a></li>\n'
                         % (SITE + "/" + rhub + "/" + slug + "-calculator/", esc(name), esc(desc), rhub, slug))
    test_rows = ""
    for i, t in enumerate(c["tests"], 1):
        expect = t.get("expect") or t.get("expect_text", "")
        test_rows += ('            <tr><td class="num" data-label="#">%d</td>'
                      '<td data-label="Test">%s</td>'
                      '<td class="num" data-label="Expected answer">%s</td>'
                      '<td class="num" data-got data-label="Calculator gave">\u2014</td>'
                      '<td data-label="Result"><span class="chip run" data-chip>RUNNING</span></td></tr>\n'
                      % (i, esc(t["label"]), esc(expect)))
    steps_html = ""
    for i, s in enumerate(c["example_steps"]):
        cls = ' class="ans"' if i == len(c["example_steps"]) - 1 else ""
        steps_html += '        <li%s>%s</li>\n' % (cls, esc(s))
    # Tool key in the shared JS registry is the slug without "-calculator".
    # The field ids let the shared JS wire every input on the page, not just
    # the first two, so tools with more fields (or select/text fields) work.
    config = {"tool": tool["slug"].replace("-calculator", ""),
              "chart": c["chart"], "tests": c["tests"],
              "fields": [f["id"] for f in c["fields"]]}
    if c.get("keypad"):
        config["keypad"] = True
    config_json = json.dumps(config, ensure_ascii=False)

    # Country selector (prompt Section 8): separate country pages for
    # take-home pay, income tax and salary sacrifice get a prominent selector
    # above the tool that takes the visitor to the same tool for another country.
    base = tool["slug"].replace("-calculator", "")
    prefix, _, code = base.rpartition("-")
    country_html = ""
    if prefix in COUNTRY_PAGES:
        opts = "".join('<option value="%s"%s>%s</option>'
                       % (SITE + "/salary/" + prefix + "-" + c2 + "-calculator/",
                          " selected" if c2 == code else "", label)
                       for c2, label in COUNTRY_PAGES[prefix])
        country_html = ('    <nav class="country-switch" aria-label="Choose your country">\n'
                        '      <label for="country-switch">Country</label>\n'
                        '      <select id="country-switch">%s</select>\n'
                        '      <p class="small">Each country has its own page, with its own currency, tax year and official source.</p>\n'
                        '    </nav>\n' % opts)

    body = """
    <h1>{h1}</h1>
{country}
    <section class="tool" aria-label="{tool} tool">
      <p class="tool-q">{question}</p>
      <div class="fields">
{fields}      </div>
{keypad}
      <div class="result-wrap" aria-live="polite">
        <div class="stamp" id="stamp" aria-hidden="true" hidden>Checked \u2713</div>
        <div class="result-label">Result</div>
        <div class="result" id="result">{result}</div>
        <div class="result-sentence" id="sentence">{sentence}</div>
        <p class="msg" id="msg" hidden></p>
      </div>
      <ol class="howto">
{howto}      </ol>
      <p class="limit-note"><strong>Limit:</strong> {limit} <strong>Rounding:</strong> every result uses one named default \u2014 {rounding} \u2014 in the answer, the bar and the table. The Checked stamp appears on the result box only while a valid result is showing.</p>
    </section>

    <section class="quick" aria-labelledby="quickH">
      <h2 id="quickH"><span class="no">2</span>Quick answer</h2>
      <p>{quick}</p>
    </section>

    <section class="part" aria-labelledby="formulaH">
      <h2 id="formulaH"><span class="no">3</span>The formula</h2>
      <p>{formula_intro}</p>
      <div class="formula-box">
        <strong>{formula_words}</strong>
        <span class="sym">{formula_symbol}</span>
      </div>
      <p class="small">{formula_source}</p>
    </section>

    <section class="part" aria-labelledby="exampleH">
      <h2 id="exampleH"><span class="no">4</span>{example_title}</h2>
      <ol class="steps">
{steps}      </ol>
      <p class="small">{example_note}</p>
    </section>

    <section class="part" aria-labelledby="chartH">
      <h2 id="chartH"><span class="no">5</span>Your result, drawn</h2>
      <p>This bar and table are drawn from the numbers you typed above. Change a number and they change with it.</p>
      <div class="bar" role="img" id="bar" aria-label="{bar_label}">
        <div class="seg-a" style="width:{share}%"></div>
        <div class="seg-b"></div>
      </div>
      <div class="bar-legend">
        <span><span class="swatch a"></span><span id="legend-a">{legend_a}</span></span>
        <span><span class="swatch b"></span><span id="legend-b">{legend_b}</span></span>
      </div>
      <div class="table-scroll">
        <table>
          <thead><tr><th scope="col">Part of your sum</th><th scope="col" class="num">Value</th></tr></thead>
          <tbody id="break-body">
{rows}          </tbody>
        </table>
      </div>
    </section>

    <section class="part" aria-labelledby="faqH">
      <h2 id="faqH"><span class="no">6</span>Questions about {faq_topic}</h2>
{faq_html}    </section>

    <section class="part" aria-labelledby="relatedH">
      <h2 id="relatedH"><span class="no">7</span>Related tools</h2>
      <p class="small">{related_intro}</p>
      <ul class="related">
{related}      </ul>
    </section>

    <section class="part" aria-labelledby="testsH">
      <h2 id="testsH">Known-answer test cases \u2014 run live on this page</h2>
      <p>Each test below is worked out by the same code as the calculator above, the moment this page loads, and marked Pass or Fail against its known answer. If a row ever shows Fail, the page is not finished.</p>
      <div class="table-scroll stack-wrap">
        <table class="stackable">
          <thead><tr><th scope="col">#</th><th scope="col">Test</th><th scope="col">Expected answer</th><th scope="col">Calculator gave</th><th scope="col">Result</th></tr></thead>
          <tbody id="test-body">
{test_rows}          </tbody>
        </table>
      </div>
      <p class="record-note" style="margin-top:12px" id="test-summary">Tests are running\u2026</p>
    </section>

    <section class="part" aria-labelledby="verdictH">
      <h2 id="verdictH">Build record \u2014 verdict for this tool</h2>
      <div class="table-scroll stack-wrap">
        <table class="stackable">
          <thead><tr><th scope="col">#</th><th scope="col">Tool</th><th scope="col">Verdict</th><th scope="col">Input \u2192 Output</th><th scope="col">Library / method</th><th scope="col">Limit or note shown on the page</th></tr></thead>
          <tbody>
            <tr>
              <td class="num" data-label="#">1</td>
              <td data-label="Tool">{h1}</td>
              <td data-label="Verdict"><strong>{verdict}</strong></td>
              <td data-label="Input \u2192 Output">{io}</td>
              <td data-label="Library / method">{method}</td>
              <td data-label="Limit or note shown on the page">{verdict_note}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="record-note" style="margin-top:12px"><strong>Plan for this tool:</strong> one page only, in the {hub_name} hub, built from the shared template with no libraries and no server. Security items that need a server (login, database, password rules) are N/A \u2014 this is a static page with no login and no stored data.</p>
    </section>
    <script type="application/json" id="tool-config">{config_json}</script>""".format(
        h1=esc(tool["title"]), tool=esc(tool["title"]), question=esc(c["question"]),
        fields=fields_html, keypad=keypad_html, result=esc(init["result"]), sentence=esc(init["sentence"]),
        howto=howto_html, limit=esc(tool["limit"]), rounding=esc(tool["rounding"]),
        quick=esc(c["quick_answer"]), formula_intro=esc(c["formula_intro"]),
        formula_words=esc(c["formula_words"]), formula_symbol=esc(c["formula_symbol"]),
        formula_source=esc(c["formula_source"]), example_title=esc(c["example_title"]),
        steps=steps_html, example_note=esc(c["example_note"]),
        bar_label=esc(init["bar_label"]), share=("%g" % round(init["share"], 2)),
        legend_a=esc(init["legend_a"]), legend_b=esc(init["legend_b"]),
        rows=rows_html, faq_topic=esc(tool["title"].replace(" Calculator", "").lower()),
        faq_html=faq_html, related=related_html, test_rows=test_rows,
        verdict=esc(tool["verdict"]), io=esc(tool["input_output"]),
        method=esc(tool["method"]), verdict_note=esc(tool["verdict_note"]),
        hub_name=esc(hub_name), config_json=config_json, country=country_html,
        related_intro=("The other two percentage jobs have their own pages \u2014 one job per page:"
                       if tool["slug"] in ("percentage-of-a-number-calculator", "what-percent-calculator",
                                           "percentage-increase-decrease-calculator")
                       else "More tools that go with this one \u2014 each with its own page, one job per page:"))

    crumbs = (crumb("Home", SITE + "/") + crumb(hub_name, SITE + "/" + hub + "/") +
              crumb(tool["title"]))
    return page_shell(title, tool["description"], url, "../../", "hub-" + hub,
                      crumbs, hub_name, body, extra_ld=ld,
                      scripts=("calculatorly.js", "engines-s%d.js" % tool["stage"]))


# ---------------------------------------------------------------- home / hubs

def tool_list_items(tools, prefix):
    out = ""
    for t in tools:
        if t["content_status"] == "complete":
            out += ('      <li data-tool-item><a href="%s">%s</a>'
                    '<span class="d">%s</span></li>\n'
                    % (prefix + t["url"].lstrip("/"), esc(t["title"]), esc(t["blurb"])))
        else:
            out += ('      <li data-tool-item class="pending"><span>%s</span>'
                    '<span class="tag">Not live yet</span>'
                    '<span class="d">%s</span></li>\n'
                    % (esc(t["title"]), esc(t["blurb"])))
    return out


def render_home(tools, hubs):
    by_hub = {h: [t for t in tools if t["hub"] == h] for h in hubs}
    featured = [t for t in tools if t["content_status"] == "complete"]
    feat_html = "".join(
        '        <li><a href="%s">%s<span class="d">%s</span></a></li>\n'
        % (t["url"], esc(t["title"]), esc(t["blurb"])) for t in featured)
    hub_cards = ""
    for h, name in hubs.items():
        hub_cards += ('    <section class="hub-card" data-hub-section aria-labelledby="hub-{h}">\n'
                      '      <span class="hub-count">{n} tools</span>\n'
                      '      <h2 id="hub-{h}"><a href="/{h}/">{name} Calculators</a></h2>\n'
                      '      <p class="small">{intro}</p>\n'
                      '      <ul class="tool-list">\n{items}      </ul>\n'
                      '    </section>\n'.format(
                          h=h, n=len(by_hub[h]), name=esc(name),
                          intro=esc(HUB_INTROS[h]),
                          items=tool_list_items(by_hub[h], "/")))
    body = """
    <h1>Calculatorly</h1>
    <p class="lede">Free calculators that show every step: the formula, a worked example and a full breakdown &mdash; no sign-up, nothing uploaded.</p>
    <div class="search-box">
      <label for="tool-search">Find a calculator</label>
      <input id="tool-search" type="search" placeholder="Try &ldquo;mortgage&rdquo;, &ldquo;BMI&rdquo; or &ldquo;percent&rdquo;" autocomplete="off" />
      <p class="search-count" id="search-count" aria-live="polite"></p>
    </div>

    <section class="part" aria-labelledby="featuredH">
      <h2 id="featuredH">Featured tools &mdash; live now</h2>
      <ul class="featured">
{feat}      </ul>
    </section>

{hub_cards}""".format(feat=feat_html, hub_cards=hub_cards)
    ld = ld_block({"@context": "https://schema.org", "@type": "WebSite",
                   "name": "Calculatorly", "url": SITE + "/",
                   "description": "Free calculators that show every step: the formula, a worked example and a full breakdown."})
    crumbs = crumb("Home")
    return page_shell("Calculatorly — Free Calculators That Show Every Step",
                      "Free calculators with the formula, a worked example and a full breakdown for every answer. No sign-up, nothing uploaded.",
                      SITE + "/", "", "", crumbs, None, body, extra_ld=ld)


def render_hub(hub, name, tools):
    items = tool_list_items(tools, "/")
    faq_html = ""
    for q, a in HUB_FAQS[hub]:
        faq_html += ('      <details>\n        <summary>%s</summary>\n        <p>%s</p>\n      </details>\n'
                     % (esc(q), esc(a)))
    body = """
    <h1>{name} Calculators</h1>
    <p class="lede">{intro}</p>
    <section class="part" aria-labelledby="toolsH">
      <h2 id="toolsH">All {name} tools ({n})</h2>
      <ul class="tool-list">
{items}      </ul>
    </section>
    <section class="part" aria-labelledby="faqH">
      <h2 id="faqH">Questions about {name} calculators</h2>
{faq}    </section>""".format(name=esc(name), intro=esc(HUB_INTROS[hub]),
                              n=len(tools), items=items, faq=faq_html)
    ld = ld_block({"@context": "https://schema.org", "@type": "BreadcrumbList",
                   "itemListElement": [
                       {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                       {"@type": "ListItem", "position": 2, "name": name + " Calculators",
                        "item": SITE + "/" + hub + "/"}]})
    ld += ld_block({"@context": "https://schema.org", "@type": "FAQPage",
                    "mainEntity": [{"@type": "Question", "name": q,
                                    "acceptedAnswer": {"@type": "Answer", "text": a}}
                                   for q, a in HUB_FAQS[hub]]})
    crumbs = crumb("Home", SITE + "/") + crumb(name + " Calculators")
    return page_shell(name + " Calculators | Calculatorly",
                      "Free %s calculators with the formula, a worked example and a full breakdown. No sign-up, nothing uploaded." % name.lower(),
                      SITE + "/" + hub + "/", "../", "hub-" + hub, crumbs, name, body,
                      extra_ld=ld)


def render_legal(slug, hubs):
    title, lede, sections = LEGAL[slug]
    secs = ""
    for h, p in sections:
        if slug == "contact" and "Calculatorly9@gmail.com" in p:
            p_html = esc(p).replace(
                "Calculatorly9@gmail.com",
                '<a href="mailto:Calculatorly9@gmail.com">Calculatorly9@gmail.com</a>')
        else:
            p_html = esc(p)
        secs += ('    <section class="part" aria-labelledby="s-{n}">\n'
                 '      <h2 id="s-{n}">{h}</h2>\n      <p>{p}</p>\n    </section>\n'
                 .format(n=int(hashlib.md5(h.encode("utf-8")).hexdigest(), 16) % 100000, h=esc(h), p=p_html))
    body = """
    <h1>{title}</h1>
    <p class="lede">{lede}</p>
{secs}""".format(title=esc(title), lede=esc(lede), secs=secs)
    ld = ld_block({"@context": "https://schema.org", "@type": "BreadcrumbList",
                   "itemListElement": [
                       {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                       {"@type": "ListItem", "position": 2, "name": title,
                        "item": SITE + "/" + slug + "/"}]})
    crumbs = crumb("Home", SITE + "/") + crumb(title)
    return page_shell(title + " | Calculatorly",
                      lede + " Calculatorly — free calculators, no sign-up.",
                      SITE + "/" + slug + "/", "../", "", crumbs, None, body,
                      extra_ld=ld)


def render_404(hubs):
    links = "".join('      <li><a href="/%s/">%s Calculators</a></li>\n'
                    % (h, esc(name)) for h, name in hubs.items())
    body = """
    <h1>Page not found</h1>
    <p class="lede">That page does not exist, or it has moved. The tools below are all live pages.</p>
    <section class="part" aria-labelledby="goH">
      <h2 id="goH">Where to go instead</h2>
      <ul class="tool-list">
        <li><a href="/">Calculatorly home</a><span class="d">All 7 hubs and the search box.</span></li>
{links}      </ul>
    </section>""".format(links=links)
    crumbs = crumb("Home", SITE + "/") + crumb("Page not found")
    return page_shell("Page Not Found | Calculatorly",
                      "That Calculatorly page does not exist. Go home or pick one of the 7 calculator hubs.",
                      SITE + "/404.html", "", "", crumbs, None, body)


# ---------------------------------------------------------------- validation

def validate_page(path, html_text, css_len, js_len, is_tool=False):
    m = re.search(r"<title>(.*?)</title>", html_text, re.S)
    if not m:
        fail(path + ": no <title>")
    title = html.unescape(m.group(1))
    if len(title) >= 60:
        fail("%s: title %d chars (>=60): %s" % (path, len(title), title))
    m = re.search(r'<meta name="description" content="(.*?)"', html_text, re.S)
    if not m:
        fail(path + ": no meta description")
    desc = html.unescape(m.group(1))
    if len(desc) >= 160:
        fail("%s: description %d chars (>=160)" % (path, len(desc)))
    if len(re.findall(r"<h1[ >]", html_text)) != 1:
        fail("%s: expected exactly 1 <h1>, found %d"
             % (path, len(re.findall(r"<h1[ >]", html_text))))
    for tag in re.findall(r"<script[^>]*>", html_text):
        if ('type="application/json"' in tag or 'type="application/ld+json"' in tag
                or 'src="' in tag):
            continue
        fail(path + ": inline or non-JSON script block found: " + tag)
    if "innerHTML" in html_text or "eval(" in html_text:
        fail(path + ": forbidden JS pattern in page")
    size = len(html_text.encode("utf-8")) + css_len + js_len
    if size >= 150 * 1024:
        fail("%s: page size %d bytes (>=150 KB)" % (path, size))
    check_text_clean(re.sub(r"<[^>]+>", " ", html_text), path)
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>',
                            html_text, re.S):
        try:
            json.loads(block)
        except ValueError as e:
            fail(path + ": JSON-LD does not parse: " + str(e))
    if is_tool:
        m = re.search(r'<section class="quick".*?<p>(.*?)</p>', html_text, re.S)
        if not m:
            fail(path + ": no Quick answer box")
        wc = word_count(re.sub(r"<[^>]+>", " ", html.unescape(m.group(1))))
        if not (40 <= wc <= 60):
            fail("%s: Quick answer %d words (need 40-60)" % (path, wc))
        n_faq = len(re.findall(r"<details>", html_text))
        if not (4 <= n_faq <= 8):
            fail("%s: %d FAQs (need 4-8)" % (path, n_faq))
        # JSON-LD FAQ text must be identical to the visible FAQ text.
        faq_ld = re.findall(r'"@type":"Question","name":"(.*?)","acceptedAnswer":\{"@type":"Answer","text":"(.*?)"\}\}',
                            html_text)
        visible = re.findall(r"<summary>(.*?)</summary>\s*<p>(.*?)</p>", html_text, re.S)
        visible = [(html.unescape(q), html.unescape(a)) for q, a in visible]
        ld_pairs = [(html.unescape(q), html.unescape(a)) for q, a in faq_ld]
        if sorted(ld_pairs) != sorted(visible):
            fail(path + ": FAQPage JSON-LD text differs from visible FAQ text")
    return size


def check_links(pages):
    """Every internal link must resolve to a file in the output set."""
    existing = set(pages.keys())
    # Non-page files that internal links may point at.
    existing |= {"assets/css/khata.css", "assets/js/calculatorly.js",
                 "assets/js/engines-s1.js", "assets/js/engines-s2.js",
                 "assets/js/engines-s3.js", "assets/js/engines-s4.js",
                 "assets/js/engines-s5.js",
                 "robots.txt", "sitemap.xml"}
    bad = []
    for path, text in pages.items():
        for href in re.findall(r'href="([^"]+)"', text):
            if href.startswith(("https://fonts.googleapis.com",
                                "https://fonts.gstatic.com", "mailto:", "#",
                                "data:")):
                continue
            if href.startswith(SITE):
                target = href[len(SITE):]
            elif href.startswith("/"):
                target = href
            else:
                # relative link: resolve against the page's directory
                base = os.path.dirname(path)
                target = os.path.normpath(os.path.join("/", base, href))
            if target == "/":
                target = "/index.html"
            elif target.endswith("/"):
                target += "index.html"
            elif "." not in os.path.basename(target):
                target += "/index.html"
            target = target.lstrip("/")
            if target not in existing:
                bad.append("%s -> %s (missing %s)" % (path, href, target))
    if bad:
        fail("broken internal links:\n  " + "\n  ".join(bad))


# ---------------------------------------------------------------- main

def main():
    with open(os.path.join(ROOT, "tools.json"), encoding="utf-8") as f:
        data = json.load(f)
    tools = data["tools"]
    hubs = data["hubs"]

    # --- inventory contract checks ---
    if len(tools) != 112:
        fail("tools.json has %d tools, need 112" % len(tools))
    seen = set()
    for t in tools:
        key = (t["hub"], t["slug"][:-len("-calculator")])
        if key in seen:
            fail("duplicate tool " + str(key))
        seen.add(key)
        if len(t["title"] + " | Calculatorly") >= 60:
            fail("title too long: " + t["title"])
        if len(t["description"]) >= 160:
            fail("description too long: " + t["title"])
        check_text_clean(t["title"] + " " + t["description"] + " " +
                         t["blurb"] + " " + t["limit"], "tools.json:" + t["slug"])
        if t["title"] in NEVER_BUILD or t["slug"] in NEVER_BUILD:
            fail("never-build tool present: " + t["slug"])
    for stage, items in EXPECTED.items():
        if len(items) != sum(1 for t in tools if t["stage"] == stage):
            fail("stage %d count mismatch" % stage)
        for hub, name in items:
            if (hub, name) not in seen:
                fail("missing tool %s/%s" % (hub, name))
    if seen != {(h, n) for items in EXPECTED.values() for h, n in items}:
        fail("inventory does not match the exact 112-tool list")
    verdicts = {}
    for t in tools:
        verdicts.setdefault(t["verdict"], []).append(t["slug"])
    if set(verdicts) - {"Browser-real", "Browser-partial"}:
        fail("bad verdicts: " + str(set(verdicts)))
    if verdicts.get("Browser-partial") != ["currency-converter-calculator",
                                           "sales-tax-by-state-calculator"]:
        fail("Browser-partial tools must be exactly currency-converter and sales-tax-by-state")


    # --- content-block validation for complete tools (adapted from stage 1) ---
    CHARTS = ("percent-of", "what-percent", "change", "bar-table", "bar",
              "loan", "annuity", "college", "pension", "present-value",
              "future-value", "irr", "roi", "margin", "commission", "payback",
              "z-score", "confidence-interval", "sample-size", "quadratic",
              "slope", "log", "exponent", "binary-hex", "roman", "dice",
              "time-zone", "time-card")
    EMPTY_PAINT_TOOLS = ("countdown-calculator", "dice-random-calculator")
    for t in tools:
        if t.get("content_status") != "complete":
            continue
        c = t.get("content") or {}
        where = "tools.json:" + t["slug"]
        for k in ("chart", "question", "fields", "howto", "quick_answer",
                  "formula_words", "formula_symbol", "formula_intro",
                  "formula_source", "example_title", "example_steps",
                  "example_note", "faqs", "related", "tests"):
            if k not in c or c[k] in ("", [], {}):
                fail("%s: content is missing %r" % (where, k))
        ids = [f["id"] for f in c["fields"]]
        if len(ids) != len(set(ids)) or not ids:
            fail(where + ": field ids must be unique and non-empty")
        for f in c["fields"]:
            if "label" not in f or "default" not in f:
                fail(where + ": field %r needs label and default" % f.get("id"))
            if f.get("type") == "select":
                if not f.get("options") or str(f["default"]) not in [str(v) for v, _ in f["options"]]:
                    fail(where + ": select field %r needs options covering its default" % f["id"])
            if f.get("type") == "date":
                # Empty default is allowed: it means "today" (countdown "from").
                if str(f["default"]) != "" and not re.match(r"^\d{4}-\d{2}-\d{2}$", str(f["default"])):
                    fail(where + ": date field %r needs a YYYY-MM-DD default" % f["id"])
            if f.get("type") == "time":
                if not re.match(r"^\d{2}:\d{2}$", str(f["default"])):
                    fail(where + ": time field %r needs an HH:MM default" % f["id"])
            check_text_clean(str(f["label"]) + " " + str(f["default"]), where)
        if not (3 <= len(c["tests"]) <= 5):
            fail(where + ": need 3-5 tests, found %d" % len(c["tests"]))
        for test in c["tests"]:
            if "label" not in test or ("expect" not in test and "expect_state" not in test):
                fail(where + ": test needs a label and expect/expect_state")
            if "inputs" in test:
                for k in test["inputs"]:
                    if k not in ids:
                        fail(where + ": test input %r is not a field" % k)
            check_text_clean(test["label"] + " " + str(test.get("expect", "")) +
                             " " + str(test.get("expect_text", "")), where)
        if not (1 <= len(c["related"]) <= 4):
            fail(where + ": need 1-4 related tools")
        for rel in c["related"]:
            if len(rel) not in (3, 4):
                fail(where + ": related entry must have 3 or 4 parts")
            slug = rel[1] if len(rel) == 4 else rel[0]
            if slug not in {x["slug"].replace("-calculator", "") for x in tools}:
                fail(where + ": related tool %r is not in the inventory" % slug)
        if c["chart"] not in CHARTS:
            fail(where + ": unknown chart kind %r" % c["chart"])
        if c["chart"] == "bar-table" and t["slug"] not in EMPTY_PAINT_TOOLS:
            if "initial" not in c:
                fail(where + ": bar-table tool needs content.initial")
        if "initial" in c:
            for k in ("result", "sentence", "share", "legend_a", "legend_b", "bar_label", "rows"):
                if k not in c["initial"]:
                    fail(where + ": content.initial is missing %r" % k)
        for txt in [c["question"], c["quick_answer"], c["formula_words"],
                    c["formula_symbol"], c["formula_intro"], c["formula_source"],
                    c["example_title"], c["example_note"]] + list(c["howto"]) + list(c["example_steps"]):
            check_text_clean(txt, where)
        for q, a in c["faqs"]:
            check_text_clean(q + " " + a, where)
        for rel in c["related"]:
            name, desc = rel[-2], rel[-1]
            check_text_clean(name + " " + desc, where)

    css_path = os.path.join(ROOT, "assets", "css", "khata.css")
    js_path = os.path.join(ROOT, "assets", "js", "calculatorly.js")
    css_len = os.path.getsize(css_path)
    js_core_len = os.path.getsize(js_path)
    js_stage_len = {st: os.path.getsize(os.path.join(ROOT, "assets", "js",
                                                     "engines-s%d.js" % st))
                    for st in (1, 2, 3, 4, 5)}
    js_len = js_core_len  # home, hub, legal and 404 pages load the core only

    pages = {}   # output path (site-root relative) -> html
    sizes = {}

    # --- tool pages: only tools with complete content ---
    built_tools = []
    for t in tools:
        if t.get("content_status") != "complete":
            continue
        out = "%s/%s/index.html" % (t["hub"], t["slug"])
        text = render_tool(t, hubs, tools)
        sizes[out] = validate_page(out, text, css_len,
                                   js_core_len + js_stage_len[t["stage"]], is_tool=True)
        pages[out] = text
        built_tools.append(t)

    # --- home, hubs, legal, 404 ---
    pages["index.html"] = render_home(tools, hubs)
    sizes["index.html"] = validate_page("index.html", pages["index.html"], css_len, js_len)
    for hub, name in hubs.items():
        out = "%s/index.html" % hub
        pages[out] = render_hub(hub, name, [t for t in tools if t["hub"] == hub])
        sizes[out] = validate_page(out, pages[out], css_len, js_len)
    for slug in LEGAL:
        out = "%s/index.html" % slug
        pages[out] = render_legal(slug, hubs)
        sizes[out] = validate_page(out, pages[out], css_len, js_len)
    pages["404.html"] = render_404(hubs)
    sizes["404.html"] = validate_page("404.html", pages["404.html"], css_len, js_len)

    check_links(pages)

    # --- write pages ---
    for out, text in pages.items():
        full = os.path.join(ROOT, out)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w", encoding="utf-8") as f:
            f.write(text)

    # --- robots.txt ---
    with open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8") as f:
        f.write("User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % SITE)

    # --- _headers (Cloudflare Pages / static hosting) ---
    with open(os.path.join(ROOT, "_headers"), "w", encoding="utf-8") as f:
        f.write("/*\n"
                "  Content-Security-Policy: default-src 'self'; script-src 'self'; "
                "style-src 'self' https://fonts.googleapis.com; "
                "font-src https://fonts.gstatic.com; img-src 'self' data:; "
                "object-src 'none'; base-uri 'self'; frame-ancestors 'none'\n"
                "  X-Content-Type-Options: nosniff\n"
                "  Referrer-Policy: strict-origin-when-cross-origin\n"
                "  Permissions-Policy: camera=(), microphone=(), geolocation=()\n")

    # --- sitemap.xml: exactly the live files ---
    urls = sorted(pages.keys())
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        loc = SITE + "/" + ("" if u == "index.html" else u.replace("index.html", ""))
        sm.append("  <url><loc>%s</loc><lastmod>%s</lastmod></url>" % (loc, TODAY))
    sm.append("</urlset>")
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write("\n".join(sm) + "\n")

    print("BUILD OK")
    print("  tools in inventory: %d (complete: %d, pending: %d)"
          % (len(tools), len(built_tools), len(tools) - len(built_tools)))
    print("  pages written: %d (home 1, hubs %d, legal %d, tools %d, 404 1)"
          % (len(pages), len(hubs), len(LEGAL), len(built_tools)))
    print("  largest page (HTML+CSS+JS): %d bytes; limit 153600"
          % max(sizes.values()))
    for out in sorted(sizes):
        print("    %-58s %6d bytes" % (out, sizes[out]))


if __name__ == "__main__":
    main()
