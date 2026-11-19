# Calculatorly — Pass/Fail table (merged site, 11 November 2026)

Every row was tested live in Node with a DOM shim running the merged
core + the tool’s stage engine file against the built page: the tool’s
known-answer tests, the static first paint against the live JS result,
the stamp hiding on clear and on over-limit input, and 0 console errors.
Real result is the live result at the page’s field defaults.
Two tools paint an empty result box by design (see notes at the bottom).

| Tool | Verdict | Test done | Real result | Pass/Fail |
| --- | --- | --- | --- | --- |
| Percentage of a Number Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 20.00 | Pass |
| What Percent Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 25.00% | Pass |
| Percentage Increase/Decrease Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | +25.00% | Pass |
| Discount Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 60.00 | Pass |
| VAT Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 120.00 | Pass |
| Mortgage Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | £1,169.18 | Pass |
| Loan Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 198.01 | Pass |
| Auto Loan Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 469.70 | Pass |
| Compound Interest Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 1,647.01 | Pass |
| Simple Interest Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 1,150.00 | Pass |
| Interest Rate APY Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 5.12% | Pass |
| Savings Goal Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 150.83 | Pass |
| Retirement Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 261,128.76 | Pass |
| Salary to Hourly Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 25.00 | Pass |
| US Take-Home Pay Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $50,390.00 | Pass |
| UK Take-Home Pay Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | £28,719.60 | Pass |
| Australia Take-Home Pay Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | A$63,880.00 | Pass |
| Canada Take-Home Pay Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | C$56,677.45 | Pass |
| US Income Tax Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $5,020.00 | Pass |
| UK Income Tax Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | £4,486.00 | Pass |
| Australia Income Tax Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | A$14,520.00 | Pass |
| Canada Income Tax Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | C$8,242.73 | Pass |
| BMI Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 22.9 | Pass |
| Calorie TDEE Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 2,556 | Pass |
| BMR Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 1,649 | Pass |
| Age Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 36 years, 4 months, 27 days | Pass |
| Date Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 30 days | Pass |
| Time Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 8 hours 15 minutes | Pass |
| Scientific Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 14 | Pass |
| Fraction Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 5/6 | Pass |
| Standard Deviation Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 2.0000 | Pass |
| Tip and Bill Split Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 23.00 | Pass |
| Sales Tax Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 108.00 | Pass |
| Amortization Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $1,073.64 | Pass |
| Rent vs Buy Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | Renting is cheaper by $34,604.63 | Pass |
| House Affordability Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $341,841.20 | Pass |
| Down Payment Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $60,000.00 | Pass |
| Refinance Comparison Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | Save $256.96 a month | Pass |
| Loan Comparison Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | Loan A costs $553.88 more in total interest | Pass |
| Credit Card Payoff Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 33 months, $1,522.10 interest | Pass |
| Debt Payoff Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | Snowball: 11 months, $614.09 interest. Avalanche: 11 months, $584.66 interest. | Pass |
| Budget 50/30/20 Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | Needs $2,000.00, Wants $1,200.00, Savings $800.00 | Pass |
| Inflation Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $134.39 | Pass |
| Currency Converter Calculator | Browser-partial | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 127.00 | Pass |
| Body Fat Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 18.4% | Pass |
| Ideal Weight Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 56.7–76.3 kg | Pass |
| Macro Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | Protein 150 g, Carbs 200 g, Fat 67 g | Pass |
| Pace Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 5:00 min/km, 8:03 min/mile | Pass |
| Pregnancy Due Date Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 10 May 2027 | Pass |
| GPA Grade Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 3.70 | Pass |
| Unit Converter Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 32.8084 ft | Pass |
| Tip Tax Discount Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $111.78 | Pass |
| Unit Price Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | Pack B is better value | Pass |
| Fuel vs EV Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | Petrol: $1,000.00 a year, Electric: $450.00 a year | Pass |
| Job Offer Comparison Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | Offer B is better by $3,000.00 | Pass |
| Australia Salary Sacrifice Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | A$3,200.00 | Pass |
| UK Salary Sacrifice Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | £2,100.00 | Pass |
| Overtime Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $187.50 | Pass |
| PTO Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 12.50 days | Pass |
| Freelance Rate Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $60.00 per hour | Pass |
| Invoice Late Payment Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $32.88 | Pass |
| Shift Pay Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $280.00 | Pass |
| Parental Leave Pay Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $13,846.15 | Pass |
| Redundancy Pay Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | £7,200.00 | Pass |
| Fixed vs Variable Mortgage Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | Variable is cheaper by $25,196.07 | Pass |
| Salary Country Comparison Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | USA: $50,390.00 | Pass |
| Sales Tax by State Calculator | Browser-partial | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $7.25 | Pass |
| Mortgage Overpayment Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $25,381.91 | Pass |
| Savings vs Loan Payoff Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | Paying the loan wins by $383.77 | Pass |
| Water Intake Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 2.9 litres | Pass |
| Sleep Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 23:15 | Pass |
| Steps to Calories Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 400 calories | Pass |
| Pregnancy Planner Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 11 November 2026 | Pass |
| Business Days Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 5 business days | Pass |
| Countdown Calculator | Browser-real | 5/5 live tests; JS fills a live result on load (changes every second); static paint empty by design; stamp hides on clear/over-limit; 0 console errors | Live: 51 days, 0 hours, 0 minutes, 0 seconds (11 Nov 2026 to 1 Jan 2027); changes every second | Pass |
| Working Days Between Dates Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 4 working days | Pass |
| Password Strength Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | Strong (72 bits) | Pass |
| Concrete Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 0.99 m³ | Pass |
| Paint Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 7.33 litres | Pass |
| Tile Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 147 tiles | Pass |
| Subnet Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 192.168.1.0/24 | Pass |
| Student Loan Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $318.20 | Pass |
| College Cost Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $64,000.00 | Pass |
| Pension 401(k) IRA Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | £166,451.73 | Pass |
| Annuity Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $659.96 | Pass |
| Present Value Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $613.91 | Pass |
| Future Value Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $1,628.89 | Pass |
| IRR Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 8.8963% | Pass |
| ROI Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 25.00% | Pass |
| Margin Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 33.33% margin | Pass |
| Commission Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | $500.00 | Pass |
| Payback Period Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 2 years, 6 months | Pass |
| Z-Score Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 1.0000 | Pass |
| Confidence Interval Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 48.0400 to 51.9600 | Pass |
| Sample Size Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 278 | Pass |
| Quadratic Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | x = 3.0000, x = 2.0000 | Pass |
| Slope Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 2.0000 | Pass |
| Log Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 2.0000000000 | Pass |
| Exponent Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 1,024.0000 | Pass |
| Binary Hex Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 255 in decimal = 11111111 in binary, 377 in octal, FF in hexadecimal | Pass |
| Roman Numerals Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 2,026 = MMXXVI | Pass |
| Dice Random Calculator | Browser-real | 5/5 live tests (range checks); JS rolls on load; static paint empty by design; stamp hides on clear/over-limit; 0 console errors | Live: Total N (random roll of 2 six-sided dice at defaults) | Pass |
| Time Zone Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 09:00 | Pass |
| Time Card Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | 37.50 hours | Pass |

## Notes

- Countdown: the answer changes every second, so no static paint can match
  the live result. The page paints an empty result box and the shared JS
  fills it the moment the page loads.
- Dice Random: the dice are rolled at random in the browser, so no
  precomputed roll can match the live result. Same empty-paint treatment.
- Pregnancy Due Date and Pregnancy Planner paint a static result that is
  correct on the build day (11 November 2026) and includes how far along the
  pregnancy is today; the shared JS recomputes it live on every load, so
  the visitor always sees the current figure after the page loads.
- Salary Country Comparison was recomputed to the 2026 tables (USA 2026 IRS
  single, standard deduction $16,100; Canada 2026 CRA federal, CPP 5.95% to
  $74,600, CPP2 4% to $85,000, EI 1.63% to $68,900). All 5 of its live tests
  pass with the new figures; the worked example, Quick answer and formula
  source on the page carry the same 2026 figures.
- No tool was left pending and none was removed. Verdicts are unchanged from
  verdict-table.md (102 Browser-real, 2 Browser-partial: Currency Converter
  and Sales Tax by State).
| New Zealand Take-Home Pay Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | NZ$62,322.50 | Pass |
| New Zealand Income Tax Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | NZ$16,277.50 | Pass |
| Ireland Take-Home Pay Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | €39,667.18 | Pass |
| Ireland Income Tax Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | €7,200.00 | Pass |
| Germany Take-Home Pay Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | €37,988.96 | Pass |
| Germany Income Tax Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | €9,321.04 | Pass |
| Singapore Take-Home Pay Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | S$46,890.00 | Pass |
| Singapore Income Tax Calculator | Browser-real | 5/5 live tests; static paint == JS result; stamp hides on clear and over-limit; 0 console errors | S$1,110.00 | Pass |
