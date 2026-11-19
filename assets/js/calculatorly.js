/* Calculatorly — shared core JavaScript for the whole site.
 Helpers, tax tables, and the page wiring (wireTool/wireSearch).
 The tool engines live in assets/js/engines-s1.js .. engines-s4.js,
 one file per stage, loaded after this one; they fill the ENGINES
 registry below. Split because one file with all 104 engines is
 266 KB and would break the 150 KB per-page limit in Section 11:
 each tool page loads this core plus only its own stage file.
 Rules: textContent only (never innerHTML with user data), no eval(),
 no cookies, no localStorage, no external JS libraries. */
"use strict";

var LIMIT = 1000000000000; /* 1 trillion, stated on the tool pages */

/* ---------- helpers (used by every tool page) ---------- */

/* Round half-up to the given number of decimal places. */
function roundHalfUp(value, decimals) {
  var d = Math.pow(10, decimals);
  var sign = value < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(value) * d + 1e-9) / d;
}

/* Format a number with thousands separators and 2 decimal places. */
function fmtNum(value, decimals) {
  var dec = (typeof decimals === "number") ? decimals : 2;
  var rounded = roundHalfUp(value, dec);
  return rounded.toLocaleString("en-US", {
    minimumFractionDigits: dec, maximumFractionDigits: dec
  });
}

/* Format money: currency is one of GBP, USD, AUD, CAD, EUR, NZD, SGD. */
function fmtMoney(currency, value) {
  var symbols = { GBP: "\u00A3", USD: "$", AUD: "A$", CAD: "C$", EUR: "\u20AC", NZD: "NZ$", SGD: "S$" };
  var symbol = symbols[currency] || "$";
  return symbol + fmtNum(value, 2);
}

/* Read one number input. Returns {ok:true, value} or
   {ok:false, error:"empty"|"limit"|"nan"} — never throws, never NaN out. */
function readNum(input, opts) {
  var o = opts || {};
  var raw = (input.value || "").trim();
  if (raw === "") return { ok: false, error: "empty" };
  var value = Number(raw);
  if (!isFinite(value)) return { ok: false, error: "nan" };
  var min = (typeof o.min === "number") ? o.min : -LIMIT;
  var max = (typeof o.max === "number") ? o.max : LIMIT;
  if (value < min || value > max) return { ok: false, error: "limit" };
  return { ok: true, value: value };
}

/* Show or hide a result. When valid is false the stamp is hidden, the
   result line shows an em dash, and the message is shown instead.
   When valid is true the stamp is pressed onto the result box. */
function setResult(o) {
  if (!o.valid) {
    if (o.stampEl) o.stampEl.hidden = true;
    if (o.resultEl) o.resultEl.textContent = "\u2014";
    if (o.sentenceEl) o.sentenceEl.textContent = "";
    if (o.msgEl) {
      o.msgEl.hidden = false;
      o.msgEl.textContent = o.message || "";
      o.msgEl.className = o.isError ? "msg error" : "msg";
    }
    return;
  }
  if (o.stampEl) o.stampEl.hidden = false;
  if (o.msgEl) o.msgEl.hidden = true;
  if (o.resultEl) o.resultEl.textContent = o.resultText || "";
  if (o.sentenceEl) o.sentenceEl.textContent = o.sentenceText || "";
}

/* Move the coloured segment of a bar to pct (clamped 0-100). */
function renderBar(barEl, pct) {
  if (!barEl) return;
  var seg = barEl.querySelector(".seg-a");
  if (!seg) return;
  var p = Math.max(0, Math.min(100, pct));
  seg.style.width = (Math.round(p * 100) / 100) + "%";
}

/* Fill a <tbody> with rows of [label, value]. textContent only. */
function renderTable(tbody, rows) {
  if (!tbody) return;
  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
  rows.forEach(function (row) {
    var tr = document.createElement("tr");
    var tdLabel = document.createElement("td");
    tdLabel.textContent = row[0];
    var tdValue = document.createElement("td");
    tdValue.className = "num";
    tdValue.textContent = row[1];
    tr.appendChild(tdLabel);
    tr.appendChild(tdValue);
    tbody.appendChild(tr);
  });
}

/* ---------- shared state checks ---------- */

var EMPTY_MSG = "Type both numbers and the answer appears here \u2014 no button to press.";
var LIMIT_MSG = "That number is above the limit of 1,000,000,000,000 (one trillion). Please enter a smaller number.";
var ZERO_MSG = "This sum cannot be worked out: it divides by zero, and dividing by zero has no answer. Change the zero to any other number.";

/* Returns {state:"ok", a, b} or {state:"empty"|"limit"} for two raw values. */
function baseState(aRaw, bRaw) {
  if (aRaw === "" || bRaw === "" || aRaw === null || bRaw === null) return { state: "empty" };
  var a = Number(aRaw), b = Number(bRaw);
  if (!isFinite(a) || !isFinite(b)) return { state: "empty" };
  if (Math.abs(a) > LIMIT || Math.abs(b) > LIMIT) return { state: "limit" };
  return { state: "ok", a: a, b: b };
}

function fmtPct(value) { return fmtNum(value, 2) + "%"; }

/* Format a scientific result: half-up to 10 decimals, trailing zeros cut. */
function fmtSci(value) {
  var r = roundHalfUp(value, 10);
  var s = r.toFixed(10);
  s = s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  if (s === "-0") s = "0";
  return s;
}

/* Read and check several number fields at once.
   specs: [{id, label, min, max, allowZero}] — min/max are inclusive.
   emptyMsg: the message shown when any field is blank.
   Returns {ok:true, values:{id:value}} or {ok:false, state, message}. */
function readNums(vals, specs, emptyMsg) {
  var values = {};
  var i, spec, raw, v;
  for (i = 0; i < specs.length; i++) {
    spec = specs[i];
    raw = (vals[spec.id] === undefined || vals[spec.id] === null) ? "" : String(vals[spec.id]).trim();
    if (raw === "") return { ok: false, state: "empty", message: emptyMsg };
  }
  for (i = 0; i < specs.length; i++) {
    spec = specs[i];
    raw = String(vals[spec.id]).trim();
    v = Number(raw);
    if (!isFinite(v)) {
      return { ok: false, state: "invalid",
               message: "\u201C" + spec.label + "\u201D is not a number. Type digits only, for example 100 or 12.5." };
    }
    if (Math.abs(v) > LIMIT) return { ok: false, state: "limit" };
    if (spec.min !== undefined && v < spec.min) {
      return { ok: false, state: "invalid",
               message: "\u201C" + spec.label + "\u201D cannot be below " + fmtNum(spec.min, 2) + ". Please enter a larger number." };
    }
    if (spec.max !== undefined && v > spec.max) {
      return { ok: false, state: "invalid",
               message: "\u201C" + spec.label + "\u201D cannot be above " + fmtNum(spec.max, 2) + ". Please enter a smaller number." };
    }
    if (spec.allowZero === false && v === 0) {
      return { ok: false, state: "invalid",
               message: "\u201C" + spec.label + "\u201D cannot be zero for this sum. Please enter a number above zero." };
    }
    values[spec.id] = v;
  }
  return { ok: true, values: values };
}

/* Evaluate a maths expression without eval(): numbers, + - * / ^ %,
   brackets, sin cos tan asin acos atan log ln sqrt abs, pi and e.
   Angles are in degrees. % after a number means percent (50% is 0.5).
   Throws an Error with a plain message when the sum cannot be read. */
function evalExpr(src) {
  var tokens = [], i = 0, n = src.length;
  while (i < n) {
    var ch = src[i];
    if (ch === " " || ch === "\t") { i++; continue; }
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      var j = i;
      while (j < n && ((src[j] >= "0" && src[j] <= "9") || src[j] === ".")) j++;
      var num = Number(src.slice(i, j));
      if (!isFinite(num)) throw new Error("that number is too large to read");
      tokens.push({ t: "num", v: num }); i = j; continue;
    }
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) {
      var k = i;
      while (k < n && ((src[k] >= "a" && src[k] <= "z") || (src[k] >= "A" && src[k] <= "Z"))) k++;
      tokens.push({ t: "id", v: src.slice(i, k).toLowerCase() }); i = k; continue;
    }
    if ("+-*/^%()".indexOf(ch) !== -1) { tokens.push({ t: "op", v: ch }); i++; continue; }
    throw new Error("it has a character that is not a number, a bracket or a known sign");
  }
  tokens.push({ t: "end" });
  var pos = 0;
  function peek() { return tokens[pos]; }
  function next() { return tokens[pos++]; }
  function parseExpr() {
    var v = parseTerm();
    while (peek().t === "op" && (peek().v === "+" || peek().v === "-")) {
      var op = next().v; var r = parseTerm();
      v = (op === "+") ? v + r : v - r;
    }
    return v;
  }
  function parseTerm() {
    var v = parseFactor();
    while (peek().t === "op" && (peek().v === "*" || peek().v === "/")) {
      var op = next().v; var r = parseFactor();
      if (op === "*") v = v * r;
      else { if (r === 0) throw new Error("it divides by zero"); v = v / r; }
    }
    return v;
  }
  function parseFactor() {
    var v = parseUnary();
    while (peek().t === "op" && peek().v === "%") { next(); v = v / 100; }
    return v;
  }
  function parseUnary() {
    if (peek().t === "op" && peek().v === "-") { next(); return -parseUnary(); }
    if (peek().t === "op" && peek().v === "+") { next(); return parseUnary(); }
    return parsePower();
  }
  function parsePower() {
    var base = parsePrimary();
    if (peek().t === "op" && peek().v === "^") {
      next();
      var exp = parseUnary();
      base = Math.pow(base, exp);
    }
    return base;
  }
  function parsePrimary() {
    var tok = next();
    if (tok.t === "num") return tok.v;
    if (tok.t === "id") {
      if (tok.v === "pi") return Math.PI;
      if (tok.v === "e") return Math.E;
      var fns = { sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1, log: 1, ln: 1, sqrt: 1, abs: 1 };
      if (!fns[tok.v]) throw new Error("it uses a word that is not a known function (try sin, cos, log, ln or sqrt)");
      if (peek().t !== "op" || peek().v !== "(") throw new Error("a function needs brackets, for example sin(30)");
      next();
      var arg = parseExpr();
      if (peek().t !== "op" || peek().v !== ")") throw new Error("a closing bracket is missing");
      next();
      if (tok.v === "sin") return Math.sin(arg * Math.PI / 180);
      if (tok.v === "cos") return Math.cos(arg * Math.PI / 180);
      if (tok.v === "tan") return Math.tan(arg * Math.PI / 180);
      if (tok.v === "asin") return Math.asin(arg) * 180 / Math.PI;
      if (tok.v === "acos") return Math.acos(arg) * 180 / Math.PI;
      if (tok.v === "atan") return Math.atan(arg) * 180 / Math.PI;
      if (tok.v === "log") { if (arg <= 0) throw new Error("log needs a number above zero"); return Math.log10 ? Math.log10(arg) : Math.log(arg) / Math.LN10; }
      if (tok.v === "ln") { if (arg <= 0) throw new Error("ln needs a number above zero"); return Math.log(arg); }
      if (tok.v === "sqrt") { if (arg < 0) throw new Error("a square root needs a number of zero or more"); return Math.sqrt(arg); }
      return Math.abs(arg);
    }
    if (tok.t === "op" && tok.v === "(") {
      var v = parseExpr();
      if (peek().t !== "op" || peek().v !== ")") throw new Error("a closing bracket is missing");
      next();
      return v;
    }
    throw new Error("it cannot be read as a sum");
  }
  var out = parseExpr();
  if (peek().t !== "end") throw new Error("there is extra text after the end of the sum");
  return out;
}

/* Parse a YYYY-MM-DD date as UTC midnight. Returns a Date or null. */
function parseDate(raw) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw || "").trim());
  if (!m) return null;
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  return d;
}

function fmtDateUTC(d) {
  var y = d.getUTCFullYear();
  var mo = ("0" + (d.getUTCMonth() + 1)).slice(-2);
  var da = ("0" + d.getUTCDate()).slice(-2);
  return y + "-" + mo + "-" + da;
}

function fmtDateLong(d) {
  var months = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
  return d.getUTCDate() + " " + months[d.getUTCMonth()] + " " + d.getUTCFullYear();
}

/* Parse an HH:MM time into minutes after midnight. Returns a number or null. */
function parseTime(raw) {
  var m = /^(\d{1,2}):(\d{2})$/.exec(String(raw || "").trim());
  if (!m) return null;
  var h = +m[1], mi = +m[2];
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return h * 60 + mi;
}

function fmtClock(mins) {
  mins = ((mins % 1440) + 1440) % 1440;
  var h = Math.floor(mins / 60), mi = mins % 60;
  return ("0" + h).slice(-2) + ":" + ("0" + mi).slice(-2);
}

function fmtDuration(mins) {
  var neg = mins < 0;
  var a = Math.abs(mins);
  var h = Math.floor(a / 60), mi = a % 60;
  var s = h + (h === 1 ? " hour " : " hours ") + mi + (mi === 1 ? " minute" : " minutes");
  return (neg ? "minus " : "") + s;
}

/* Marginal tax on an amount, from [upperLimit, rate] bands. */
function marginalTax(amount, bands) {
  var tax = 0, prev = 0, i, top, rate, slice;
  for (i = 0; i < bands.length; i++) {
    top = bands[i][0]; rate = bands[i][1];
    if (amount <= prev) break;
    slice = Math.min(amount, top) - prev;
    tax += slice * rate;
    prev = top;
  }
  return tax;
}

/* Round one money line to cents first, then use the rounded lines. */
function cents(v) { return roundHalfUp(v, 2); }

/* ---------- tool engines: one per tool key ----------
   Each engine: compute(aRaw, bRaw) -> {state, value} and
   render(ctx, r) fills result, sentence, bar and table. */

var MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function fmtDate(d) {
  return d.getUTCDate() + " " + MONTH_NAMES[d.getUTCMonth()] + " " + d.getUTCFullYear();
}

function numVal(raw, opts) {
  var o = opts || {};
  var label = o.label || "This number";
  var s = (raw === null || raw === undefined) ? "" : String(raw).trim();
  if (s === "") return { ok: false, state: "empty" };
  var value = Number(s);
  if (!isFinite(value)) return { ok: false, state: "invalid", message: label + " must be a number. Type digits only, for example 100." };
  if (Math.abs(value) > LIMIT) return { ok: false, state: "limit" };
  var min = (typeof o.min === "number") ? o.min : 0;
  var max = (typeof o.max === "number") ? o.max : LIMIT;
  if (value < min) return { ok: false, state: "invalid", message: label + " cannot be less than " + fmtNum(min, 2) + "." };
  if (value > max) return { ok: false, state: "invalid", message: label + " cannot be more than " + fmtNum(max, 2) + "." };
  return { ok: true, value: value };
}

function readAll(inputs, specs) {
  var values = {};
  for (var i = 0; i < specs.length; i++) {
    var spec = specs[i];
    var r = numVal(inputs[spec.id], spec);
    if (!r.ok) return r;
    values[spec.id] = r.value;
  }
  return { ok: true, values: values };
}

function fmtPace(minPerUnit) {
  var sec = Math.floor(minPerUnit * 60 + 0.5);
  var mm = Math.floor(sec / 60), ss = sec % 60;
  return mm + ":" + (ss < 10 ? "0" + ss : "" + ss);
}

function money(value) { return fmtMoney("USD", value); }

function payMonthly(P, annualPct, n) {
  var r = annualPct / 100 / 12;
  if (r === 0) return P / n;
  return P * r / (1 - Math.pow(1 + r, -n));
}

function amortSchedule(P, annualPct, years) {
  var r = annualPct / 100 / 12;
  var n = years * 12;
  var p = payMonthly(P, annualPct, n);
  var bal = P, totI = 0, yi = 0, yp = 0;
  var yearly = [], first = [];
  for (var m = 1; m <= n; m++) {
    var i = bal * r, pr = p - i;
    bal -= pr; totI += i; yi += i; yp += pr;
    if (m <= 12) first.push({ month: m, interest: i, principal: pr, balance: bal });
    if (m % 12 === 0) { yearly.push({ year: m / 12, interest: yi, principal: yp, balance: bal }); yi = 0; yp = 0; }
  }
  return { payment: p, totalInterest: totI, yearly: yearly, first: first };
}

function cardPayoff(bal, annualPct, pmt) {
  var r = annualPct / 100 / 12;
  if (pmt <= bal * r) return null;
  var b = bal, months = 0, tot = 0, last = 0;
  while (b > 0.005 && months < 1200) {
    var i = b * r;
    var p = Math.min(pmt, b + i);
    b = b + i - p; tot += p; last = p; months++;
  }
  if (b > 0.005) return null;
  return { months: months, interest: tot - bal, totalPaid: tot, lastPayment: last };
}

function debtSim(pmt, debts, order) {
  var ds = debts.map(function (d) { return { balance: d.balance, rate: d.rate }; });
  var init = 0, i;
  for (i = 0; i < ds.length; i++) init += ds[i].balance;
  var months = 0, tot = 0;
  var anyLeft = function () {
    for (var j = 0; j < ds.length; j++) if (ds[j].balance > 0.005) return true;
    return false;
  };
  while (anyLeft() && months < 1200) {
    for (i = 0; i < ds.length; i++) {
      if (ds[i].balance > 0) ds[i].balance += ds[i].balance * ds[i].rate / 100 / 12;
    }
    var rem = pmt;
    for (var k = 0; k < order.length; k++) {
      if (rem <= 0) break;
      var d = ds[order[k]];
      if (d.balance > 0) {
        var p = Math.min(rem, d.balance);
        d.balance -= p; rem -= p; tot += p;
      }
    }
    months++;
  }
  if (anyLeft()) return null;
  return { months: months, interest: tot - init };
}

function convertOneUnit(value, from, to, category) {
  if (category === "temperature") {
    var c;
    if (from === "\u00B0C") c = value;
    else if (from === "\u00B0F") c = (value - 32) * 5 / 9;
    else c = value - 273.15;
    if (to === "\u00B0C") return c;
    if (to === "\u00B0F") return c * 9 / 5 + 32;
    return c + 273.15;
  }
  var factors = UNIT_FACTORS[category];
  return value * factors[from] / factors[to];
}

var UNIT_FACTORS = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.34, yd: 0.9144, ft: 0.3048, in: 0.0254 },
  weight: { kg: 1, g: 0.001, lb: 0.453592, oz: 0.0283495, t: 1000 },
  volume: { L: 1, mL: 0.001, gal: 3.78541, pt: 0.473176, cup: 0.236588, "fl oz": 0.0295735 },
  area: { "m\u00B2": 1, "km\u00B2": 1000000, ha: 10000, acre: 4046.86, "ft\u00B2": 0.092903, "mi\u00B2": 2589988.11 },
  speed: { "km/h": 1, mph: 1.60934, "m/s": 3.6, kn: 1.852 }
};

var UNIT_OPTIONS = {
  length: [["m", "Metres (m)"], ["km", "Kilometres (km)"], ["cm", "Centimetres (cm)"], ["mm", "Millimetres (mm)"], ["mi", "Miles (mi)"], ["yd", "Yards (yd)"], ["ft", "Feet (ft)"], ["in", "Inches (in)"]],
  weight: [["kg", "Kilograms (kg)"], ["g", "Grams (g)"], ["lb", "Pounds (lb)"], ["oz", "Ounces (oz)"], ["t", "Tonnes (t)"]],
  volume: [["L", "Litres (L)"], ["mL", "Millilitres (mL)"], ["gal", "Gallons (US)"], ["pt", "Pints (US)"], ["cup", "Cups (US)"], ["fl oz", "Fluid ounces (US)"]],
  temperature: [["\u00B0C", "Celsius (\u00B0C)"], ["\u00B0F", "Fahrenheit (\u00B0F)"], ["K", "Kelvin (K)"]],
  area: [["m\u00B2", "Square metres (m\u00B2)"], ["km\u00B2", "Square kilometres (km\u00B2)"], ["ha", "Hectares (ha)"], ["acre", "Acres"], ["ft\u00B2", "Square feet (ft\u00B2)"], ["mi\u00B2", "Square miles (mi\u00B2)"]],
  speed: [["km/h", "Kilometres per hour (km/h)"], ["mph", "Miles per hour (mph)"], ["m/s", "Metres per second (m/s)"], ["kn", "Knots (kn)"]]
};

function numField(vals, id, opts) {
  var o = opts || {};
  var raw = vals[id] == null ? "" : String(vals[id]).trim();
  if (raw === "") return { ok: false, state: "empty" };
  var v = Number(raw);
  if (!isFinite(v)) return { ok: false, state: "invalid", message: "That is not a number. Type digits only." };
  if (Math.abs(v) > LIMIT) return { ok: false, state: "limit" };
  if (typeof o.min === "number" && v < o.min) return { ok: false, state: "range", message: o.rangeMsg || "That number is outside the range for this tool." };
  if (typeof o.max === "number" && v > o.max) return { ok: false, state: "range", message: o.rangeMsg || "That number is outside the range for this tool." };
  return { ok: true, value: v };
}

function needNums(vals, spec) {
  var out = {};
  for (var i = 0; i < spec.length; i++) {
    var r = numField(vals, spec[i][0], spec[i][1] || {});
    if (!r.ok) return r;
    out[spec[i][0]] = r.value;
  }
  return { ok: true, values: out };
}

function dateField(vals, id) {
  var raw = vals[id] == null ? "" : String(vals[id]).trim();
  if (raw === "") return { ok: false, state: "empty" };
  var d = parseDate(raw);
  if (!d) return { ok: false, state: "invalid", message: "That date is not valid. Use the date picker." };
  return { ok: true, value: d };
}

function needDates(vals, ids) {
  var out = {};
  for (var i = 0; i < ids.length; i++) {
    var r = dateField(vals, ids[i]);
    if (!r.ok) return r;
    out[ids[i]] = r.value;
  }
  return { ok: true, values: out };
}

function fmtTime(mins) {
  var m = ((mins % 1440) + 1440) % 1440;
  var h = Math.floor(m / 60), mm = m % 60;
  return (h < 10 ? "0" + h : "" + h) + ":" + (mm < 10 ? "0" + mm : "" + mm);
}

function wholeHalfUp(v) { return Math.round(v + 1e-9); }

function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }

function daysBetween(a, b) { return Math.round((b.getTime() - a.getTime()) / 86400000); }

function businessDaysBetween(a, b) {
  var n = 0, d = new Date(a.getTime());
  while (d.getTime() <= b.getTime()) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) n++;
    d = addDays(d, 1);
  }
  return n;
}

function simLoan(principal, annualRate, monthlyPay) {
  var r = annualRate / 12, bal = principal, months = 0, interest = 0;
  while (bal > 0.005 && months < 1200) {
    var i = bal * r;
    interest += i;
    months++;
    var pay = Math.min(monthlyPay, bal + i);
    bal = bal + i - pay;
  }
  return { months: months, interest: interest };
}

function crackTimeText(sec) {
  if (!isFinite(sec)) return "Longer than the age of the universe";
  if (sec < 1) return "Less than a second";
  if (sec < 60) return "About " + wholeHalfUp(sec) + " seconds";
  if (sec < 3600) return "About " + wholeHalfUp(sec / 60) + " minutes";
  if (sec < 86400) return "About " + wholeHalfUp(sec / 3600) + " hours";
  if (sec < 31557600) return "About " + wholeHalfUp(sec / 86400) + " days";
  if (sec < 31557600 * 100) return "About " + wholeHalfUp(sec / 31557600) + " years";
  return "About " + fmtNum(sec / 31557600, 0) + " years";
}

function ipText(v) {
  return ((v >>> 24) & 255) + "." + ((v >>> 16) & 255) + "." + ((v >>> 8) & 255) + "." + (v & 255);
}

var SALES_RATES = {
  al: ["Alabama", 4], ak: ["Alaska", 0], az: ["Arizona", 5.6], ar: ["Arkansas", 6.5],
  ca: ["California", 7.25], co: ["Colorado", 2.9], ct: ["Connecticut", 6.35],
  de: ["Delaware", 0], dc: ["District of Columbia", 6], fl: ["Florida", 6],
  ga: ["Georgia", 4], hi: ["Hawaii", 4], id: ["Idaho", 6], il: ["Illinois", 6.25],
  "in": ["Indiana", 7], ia: ["Iowa", 6], ks: ["Kansas", 6.5], ky: ["Kentucky", 6],
  la: ["Louisiana", 4.45], me: ["Maine", 5.5], md: ["Maryland", 6],
  ma: ["Massachusetts", 6.25], mi: ["Michigan", 6], mn: ["Minnesota", 6.875],
  ms: ["Mississippi", 7], mo: ["Missouri", 4.225], mt: ["Montana", 0],
  ne: ["Nebraska", 5.5], nv: ["Nevada", 6.85], nh: ["New Hampshire", 0],
  nj: ["New Jersey", 6.625], nm: ["New Mexico", 4.875], ny: ["New York", 4],
  nc: ["North Carolina", 4.75], nd: ["North Dakota", 5], oh: ["Ohio", 5.75],
  ok: ["Oklahoma", 4.5], or: ["Oregon", 0], pa: ["Pennsylvania", 6],
  ri: ["Rhode Island", 7], sc: ["South Carolina", 6], sd: ["South Dakota", 4.2],
  tn: ["Tennessee", 7], tx: ["Texas", 6.25], ut: ["Utah", 6.1], vt: ["Vermont", 6],
  va: ["Virginia", 5.3], wa: ["Washington", 6.5], wv: ["West Virginia", 6],
  wi: ["Wisconsin", 5], wy: ["Wyoming", 4],
  ab: ["Alberta, Canada", 5], bc: ["British Columbia, Canada", 12],
  mb: ["Manitoba, Canada", 12], nb: ["New Brunswick, Canada", 15],
  nl: ["Newfoundland and Labrador, Canada", 15], ns: ["Nova Scotia, Canada", 15],
  nt: ["Northwest Territories, Canada", 5], nu: ["Nunavut, Canada", 5],
  on: ["Ontario, Canada", 13], pe: ["Prince Edward Island, Canada", 15],
  qc: ["Quebec, Canada", 14.975], sk: ["Saskatchewan, Canada", 11],
  yt: ["Yukon, Canada", 5]
};

function loanPayment(principal, annualRate, months) {
  var r = annualRate / 12;
  if (r === 0) return principal / months;
  return principal * r / (1 - Math.pow(1 + r, -months));
}

/* P3's single-filer helpers, rewritten to the 2026 tables (P1 wins):
   standard deduction $16,100 and the 2026 single brackets; Canada 2026
   federal brackets with the $16,452 basic personal amount. */
function usTax(gross) { return usFederalTax(gross, "single"); }
function caTax(gross) { return caFederalTax(gross); }

var MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDayFromParts(p) {
  return (+p.day) + " " + MONTH_NAMES_SHORT[(+p.month) - 1] + " " + p.year;
}

function readRaw(raw, opts) {
  var o = opts || {};
  var r = (raw === null || raw === undefined) ? "" : String(raw).trim();
  if (r === "") return { ok: false, error: "empty" };
  var value = Number(r);
  if (!isFinite(value)) return { ok: false, error: "nan" };
  var min = (typeof o.min === "number") ? o.min : -LIMIT;
  var max = (typeof o.max === "number") ? o.max : LIMIT;
  if (value < min || value > max) return { ok: false, error: "limit" };
  return { ok: true, value: value };
}

function collectNums(inputs, spec) {
  var vals = {};
  for (var i = 0; i < spec.length; i++) {
    var s = spec[i];
    var r = readRaw(inputs[s.id], { min: s.min, max: s.max });
    if (!r.ok) return { state: (r.error === "limit") ? "limit" : "empty" };
    vals[s.id] = r.value;
  }
  return { state: "ok", vals: vals };
}

function pluralWord(n, one, many) { return n === 1 ? one : many; }

function tzParts(tz, ms) {
  var dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  var p = {};
  dtf.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
  return p;
}

function tzOffsetMinutes(tz, ms) {
  var p = tzParts(tz, ms);
  var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
  return (asUTC - ms) / 60000;
}

function wallToUtc(y, mo, d, h, mi, tz) {
  var guess = Date.UTC(y, mo - 1, d, h, mi);
  var off = tzOffsetMinutes(tz, guess);
  var utc = guess - off * 60000;
  var off2 = tzOffsetMinutes(tz, utc);
  if (off2 !== off) utc = guess - off2 * 60000;
  return utc;
}

function fmtDiffMinutes(minutes) {
  if (minutes === 0) return "the same time";
  var ahead = minutes > 0;
  var m = Math.abs(minutes);
  var h = Math.floor(m / 60), mm = m % 60;
  var parts = [];
  if (h) parts.push(h + " " + pluralWord(h, "hour", "hours"));
  if (mm) parts.push(mm + " " + pluralWord(mm, "minute", "minutes"));
  return parts.join(" ") + (ahead ? " ahead" : " behind");
}

function parseHHMM(raw) {
  var m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec((raw || "").trim());
  if (!m) return null;
  return { h: +m[1], m: +m[2] };
}

function secureRandomInt(n) {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) return null;
  var arr = new Uint32Array(1);
  var max = Math.floor(4294967296 / n) * n;
  var x;
  do { crypto.getRandomValues(arr); x = arr[0]; } while (x >= max);
  return x % n;
}

function toRoman(n) {
  var out = "";
  ROMAN_TABLE.forEach(function (pair) {
    while (n >= pair[0]) { out += pair[1]; n -= pair[0]; }
  });
  return out;
}

function fromRoman(s) {
  var vals = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  var total = 0, prev = 0;
  for (var i = s.length - 1; i >= 0; i--) {
    var cur = vals[s[i]];
    total = (cur < prev) ? total - cur : total + cur;
    prev = Math.max(prev, cur);
  }
  return total;
}

function romanRows(n) {
  var out = [];
  [[Math.floor(n / 1000) * 1000, "Thousands"],
   [Math.floor(n / 100) % 10 * 100, "Hundreds"],
   [Math.floor(n / 10) % 10 * 10, "Tens"],
   [n % 10, "Ones"]].forEach(function (pair) {
    out.push([pair[1], (pair[0] ? toRoman(pair[0]) : "\u2014") + " (" + fmtNum(pair[0], 0) + ")"]);
  });
  return out;
}

var PENSION_COUNTRIES = {
  uk: { code: "GBP", name: "UK pension", place: "UK",
        note: "UK pensions: tax relief and yearly limits apply. Check the rules before you act." },
  us: { code: "USD", name: "USA 401(k) / IRA", place: "USA",
        note: "USA 401(k) and IRA accounts have yearly contribution limits set by the IRS." },
  au: { code: "AUD", name: "Australia super", place: "Australia",
        note: "Australia super: employer payments and tax rules apply. Check the ATO rules." },
  ca: { code: "CAD", name: "Canada RRSP", place: "Canada",
        note: "Canada RRSPs have yearly contribution room set by the CRA." }
};

var ROMAN_TABLE = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
                   [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
                   [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];

var Z_VALUES = { "90": 1.645, "95": 1.96, "99": 2.576 };

/* P4's loan helper takes (principal, rate percent, years); the P3
   loanPayment above takes (principal, decimal rate, months). Both are
   kept under distinct names so neither engine changes behaviour. */
function loanPaymentYears(principal, ratePct, years) {
  var n = years * 12;
  var r = ratePct / 100 / 12;
  if (r === 0) return principal / n;
  return principal * r / (1 - Math.pow(1 + r, -n));
}

var ENGINES = {}; /* filled by the stage engine file loaded after this one */


/* ---------- verified tax figures (see each tool page for source + date) ----------
   UK 2026/27 (HMRC): personal allowance 12,570; 20% to 50,270; 40% to
   125,140; 45% above; allowance falls by 1 for every 2 over 100,000.
   NI Class 1 (employee): 8% on 12,570-50,270; 2% above.
   USA 2026 (IRS Rev. Proc. 2025-32): standard deduction single 16,100,
   married filing jointly 32,200, head of household 24,150. FICA 2026:
   Social Security 6.2% to a 184,500 wage base; Medicare 1.45% on all
   wages; extra 0.9% over 200,000 (single / head of household) or
   250,000 (married filing jointly).
   Australia 2026-27 (ATO): 0% to 18,200; 15% to 45,000; 30% to 135,000;
   37% to 190,000; 45% above. Medicare levy 2%; no levy under 28,011,
   then 10% of the amount over 28,011 until the full 2% applies at
   35,014. Superannuation Guarantee 12%, paid by the employer on top.
   Canada 2026 (CRA): 14% to 58,523; 20.5% to 117,045; 26% to 181,440;
   29% to 258,482; 33% above. Basic personal amount 16,452, falling
   evenly to 14,829 between 181,440 and 258,482 of net income. CPP
   5.95% on earnings from 3,500 to 74,600; CPP2 4% on 74,600-85,000;
   EI 1.63% on insurable earnings to 68,900. Quebec runs its own
   pension and parental plans, so these Canada pages do not cover it.
   New Zealand 2026-27 (IRD): 10.5% to 15,600; 17.5% to 53,500; 30% to
   78,100; 33% to 180,000; 39% above. ACC earners' levy 1.75% to 156,641.
   Ireland 2026 (Revenue): 20% to 44,000, 40% above, less 4,000 of tax
   credits (single employee). USC 0.5% to 12,012, 2% to 28,700, 3% to
   70,044, 8% above, none under 13,000. PRSI Class A 4.2%, none under
   18,304 a year. Germany 2026 (BMF, \u00A732a EStG): 12,348 tax-free,
   then the rate rises smoothly 14% to 42% (42% from 69,879, 45% above
   277,825); 1,230 work-expenses allowance; solidarity surcharge 5.5% of
   tax over 20,350; social insurance pension 9.3% and unemployment 1.3%
   to 101,400, health 8.75% and care 1.8% to 69,750. Singapore YA2026
   (IRAS, CPF Board): resident rates 0% to 20,000 up to 24% above
   1,000,000 on chargeable income (salary less CPF); CPF 20% to 96,000. */
var US_BRACKETS = {
  single: [[12400, 0.10], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]],
  mfj: [[24800, 0.10], [100800, 0.12], [211400, 0.22], [403550, 0.24], [512450, 0.32], [768700, 0.35], [Infinity, 0.37]],
  hoh: [[17700, 0.10], [67450, 0.12], [105700, 0.22], [201750, 0.24], [256200, 0.32], [640600, 0.35], [Infinity, 0.37]]
};
var US_STD_DED = { single: 16100, mfj: 32200, hoh: 24150 };
var US_FICA_EXTRA_OVER = { single: 200000, mfj: 250000, hoh: 200000 };
var AU_BRACKETS = [[18200, 0], [45000, 0.15], [135000, 0.30], [190000, 0.37], [Infinity, 0.45]];
var CA_BRACKETS = [[58523, 0.14], [117045, 0.205], [181440, 0.26], [258482, 0.29], [Infinity, 0.33]];

function usFederalTax(salary, status) {
  var ded = US_STD_DED[status] || US_STD_DED.single;
  var taxable = Math.max(0, salary - ded);
  return cents(marginalTax(taxable, US_BRACKETS[status] || US_BRACKETS.single));
}

function usFica(salary, status) {
  var ss = cents(0.062 * Math.min(salary, 184500));
  var med = cents(0.0145 * salary);
  var extra = cents(0.009 * Math.max(0, salary - (US_FICA_EXTRA_OVER[status] || 200000)));
  return { ss: ss, med: med, extra: extra, total: cents(ss + med + extra) };
}

function ukTax(salary, codeNum) {
  if (typeof codeNum !== "number") codeNum = 1257; /* P3 engines call ukTax(gross) with the standard 1257L code */
  var pa = codeNum * 10;
  if (salary > 100000) pa = Math.max(0, pa - (salary - 100000) / 2);
  var taxable = Math.max(0, salary - pa);
  return cents(marginalTax(taxable, [[37700, 0.20], [125140, 0.40], [Infinity, 0.45]]));
}

function ukNI(salary) {
  var ni = 0;
  if (salary > 12570) ni += 0.08 * (Math.min(salary, 50270) - 12570);
  if (salary > 50270) ni += 0.02 * (salary - 50270);
  return cents(ni);
}

function auTax(salary) { return cents(marginalTax(salary, AU_BRACKETS)); }

function auLevy(salary) {
  if (salary <= 28011) return 0;
  if (salary <= 35014) return cents(0.10 * (salary - 28011));
  return cents(0.02 * salary);
}

function caBpa(salary) {
  if (salary <= 181440) return 16452;
  if (salary >= 258482) return 14829;
  return 16452 - (salary - 181440) / (258482 - 181440) * (16452 - 14829);
}

function caFederalTax(salary) {
  var gross = marginalTax(salary, CA_BRACKETS);
  var credit = caBpa(salary) * 0.14;
  return cents(Math.max(0, gross - credit));
}

function caCpp(salary) {
  var cpp = cents(0.0595 * Math.max(0, Math.min(salary, 74600) - 3500));
  var cpp2 = cents(0.04 * Math.max(0, Math.min(salary, 85000) - 74600));
  return { cpp: cpp, cpp2: cpp2, total: cents(cpp + cpp2) };
}

function caEi(salary) { return cents(0.0163 * Math.min(salary, 68900)); }

var NZ_BRACKETS = [[15600, 0.105], [53500, 0.175], [78100, 0.30], [180000, 0.33], [Infinity, 0.39]];

function nzTax(salary) { return cents(marginalTax(salary, NZ_BRACKETS)); }

function nzAcc(salary) { return cents(0.0175 * Math.min(salary, 156641)); }

function ieTax(salary) {
  var gross = 0.20 * Math.min(salary, 44000) + 0.40 * Math.max(0, salary - 44000);
  return cents(Math.max(0, gross - 4000));
}

function ieUsc(salary) {
  if (salary <= 13000) return 0;
  var usc = 0.005 * Math.min(salary, 12012)
    + 0.02 * Math.max(0, Math.min(salary, 28700) - 12012)
    + 0.03 * Math.max(0, Math.min(salary, 70044) - 28700)
    + 0.08 * Math.max(0, salary - 70044);
  return cents(usc);
}

function iePrsi(salary) { return salary <= 18304 ? 0 : cents(0.042 * salary); }

/* Germany: marginal rate rises smoothly along the \u00A732a tariff, so the
   tax is the area under the marginal-rate curve. deMarginal(z) is the rate
   just above z (0.14 at the allowance, 0.24 at 17,799, 0.42 at 69,878). */
function deMarginal(z) {
  if (z < 12348) return 0;
  if (z <= 17799) return 0.14 + 0.10 * (z - 12348) / 5451;
  if (z <= 69878) return 0.24 + 0.18 * (z - 17799) / 52079;
  if (z <= 277825) return 0.42;
  return 0.45;
}

function deIncomeTax(salary) {
  var zve = Math.max(0, salary - 12348 - 1230);
  if (zve <= 12348) return 0;
  var pts = [12348, 17799, 69878, 277825], tax = 0;
  for (var i = 0; i < pts.length; i++) {
    var a = pts[i], b = (i + 1 < pts.length) ? pts[i + 1] : zve;
    if (zve <= a) break;
    if (b > zve) b = zve;
    tax += (deMarginal(a) + deMarginal(b)) / 2 * (b - a);
  }
  if (zve > 277825) tax += 0.45 * (zve - 277825);
  return cents(tax);
}

function deSoli(tax) {
  if (tax <= 20350) return 0;
  return cents(Math.min(0.055 * tax, 0.119 * (tax - 20350)));
}

function deSocial(salary) {
  var pen = cents(0.093 * Math.min(salary, 101400));
  var un = cents(0.013 * Math.min(salary, 101400));
  var hea = cents(0.0875 * Math.min(salary, 69750));
  var car = cents(0.018 * Math.min(salary, 69750));
  return { pen: pen, un: un, hea: hea, car: car, total: cents(pen + un + hea + car) };
}

var SG_BRACKETS = [[20000, 0], [30000, 0.02], [40000, 0.035], [80000, 0.07],
  [120000, 0.115], [160000, 0.15], [200000, 0.18], [240000, 0.19],
  [280000, 0.195], [320000, 0.20], [500000, 0.22], [1000000, 0.23], [Infinity, 0.24]];

function sgCpf(salary) { return salary <= 9000 ? 0 : cents(0.20 * Math.min(salary, 96000)); }

function sgTax(salary) {
  return cents(marginalTax(Math.max(0, salary - sgCpf(salary)), SG_BRACKETS));
}


/* Monthly loan payment from principal P, annual rate pct, years. */
function monthlyPayment(p, annualPct, years) {
  var r = annualPct / 100 / 12, n = years * 12;
  if (r === 0) return p / n;
  return p * r / (1 - Math.pow(1 + r, -n));
}

/* ---------- wire one tool page ---------- */

function wireTool() {
  var configEl = document.getElementById("tool-config");
  if (!configEl) return;
  var config;
  try { config = JSON.parse(configEl.textContent); } catch (e) { return; }
  var engine = ENGINES[config.tool];
  if (!engine) return; /* engine is added by the stage builder for that tool */
  var fieldIds = config.fields || ["a", "b"];
  var inputs = {};
  fieldIds.forEach(function (id) { inputs[id] = document.getElementById("in-" + id); });
  /* P3 engines read ctx.fields, P2 engines read ctx.inputs: both are the
     same id -> element map. inA/inB are kept for the percentage tools. */
  var ctx = {
    inputs: inputs,
    fields: inputs,
    inA: inputs.a || null,
    inB: inputs.b || null,
    result: document.getElementById("result"),
    sentence: document.getElementById("sentence"),
    msg: document.getElementById("msg"),
    stamp: document.getElementById("stamp"),
    seg: null,
    bar: document.getElementById("bar"),
    legendA: document.getElementById("legend-a"),
    legendB: document.getElementById("legend-b"),
    breakBody: document.getElementById("break-body")
  };
  var anyField = false;
  fieldIds.forEach(function (id) { if (inputs[id]) anyField = true; });
  if (!anyField) return;

  function showState(state, message) {
    var msg;
    if (state === "empty") {
      msg = message || EMPTY_MSG;
      setResult({ resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp, valid: false, message: msg, isError: false });
    } else if (state === "limit") {
      setResult({ resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp, valid: false, message: LIMIT_MSG, isError: true });
    } else if (state === "zero") {
      setResult({ resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp, valid: false, message: ZERO_MSG, isError: true });
    } else { /* invalid, error, range */
      setResult({ resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp, valid: false, message: message || "That input cannot be worked out. Check the numbers and try again.", isError: true });
    }
    if (ctx.bar) renderBar(ctx.bar, 0);
    if (ctx.legendA) ctx.legendA.textContent = "No result yet";
    if (ctx.legendB) ctx.legendB.textContent = "\u2014";
    if (ctx.bar) ctx.bar.setAttribute("aria-label", "No result to draw yet");
    renderTable(ctx.breakBody, [["Fill in the boxes in the tool above", "\u2014"]]);
  }

  function collectVals() {
    var vals = {};
    fieldIds.forEach(function (id) {
      if (inputs[id]) vals[id] = inputs[id].value;
    });
    return vals;
  }

  /* P4 engines define computeInputs(vals); every other engine defines
     compute(vals). The three percentage engines use P1's compute(vals). */
  function compute(vals) {
    return engine.computeInputs ? engine.computeInputs(vals) : engine.compute(vals);
  }

  function render() {
    var r = compute(collectVals());
    if (r.state !== "ok") { showState(r.state, r.message); return; }
    engine.render(ctx, r);
  }
  ctx.rerender = render;

  fieldIds.forEach(function (id) {
    if (inputs[id]) {
      inputs[id].addEventListener("input", render);
      inputs[id].addEventListener("change", render);
    }
  });
  if (engine.init) engine.init(ctx);

  /* Scientific keypad: buttons append to the expression box. */
  if (config.keypad) {
    var exprEl = inputs.expr || document.getElementById("in-expr");
    var buttons = document.querySelectorAll(".keypad button");
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener("click", function () {
        if (!exprEl) return;
        var act = btn.getAttribute("data-act");
        if (act === "clear") { exprEl.value = ""; }
        else if (act === "back") { exprEl.value = exprEl.value.slice(0, -1); }
        else if (act === "equals") { /* falls through to render below */ }
        else if (act === "v") { exprEl.value = exprEl.value + (btn.getAttribute("data-v") || ""); }
        render();
      });
    });
  }

  render();
  runTests(config, engine);
}

/* ---------- live known-answer tests ---------- */

function runTests(config, engine) {
  var tests = config.tests || [];
  if (!tests.length) return;
  var rows = document.querySelectorAll("#test-body tr");
  var passed = 0;
  tests.forEach(function (t, i) {
    var row = rows[i];
    if (!row) return;
    var gotCell = row.querySelector("[data-got]");
    var chip = row.querySelector("[data-chip]");
    var vals = t.inputs ? t.inputs : { a: t.a, b: t.b };
    var r = engine.computeInputs ? engine.computeInputs(vals) : engine.compute(vals);
    var ok, gotText;
    if (t.expect_state) {
      ok = (r.state === t.expect_state);
      gotText = ok ? (t.expect_text || ("State: " + r.state)) : ("Unexpected state: " + r.state);
    } else {
      gotText = (r.state === "ok") ? engine.format(r) : ("No result (" + r.state + ")");
      ok = (gotText === t.expect);
    }
    if (gotCell) gotCell.textContent = gotText;
    if (chip) {
      chip.textContent = ok ? "PASS \u2713" : "FAIL \u2717";
      chip.className = "chip " + (ok ? "pass" : "fail");
    }
    if (ok) passed++;
  });
  var summary = document.getElementById("test-summary");
  if (summary) {
    summary.textContent = "Live test result on this load: " + passed + " of " + tests.length + " tests passed" +
      (passed === tests.length ? " \u2014 all Pass." : " \u2014 see the Fail rows above; this page is not finished until every row passes.");
  }
}

/* ---------- home page search (debounced 250 ms) ---------- */

function wireSearch() {
  var input = document.getElementById("tool-search");
  if (!input) return;
  var items = Array.prototype.slice.call(document.querySelectorAll("[data-tool-item]"));
  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-hub-section]"));
  var countEl = document.getElementById("search-count");
  var timer = null;
  function apply() {
    var q = input.value.trim().toLowerCase();
    var shown = 0;
    items.forEach(function (item) {
      var hit = !q || item.textContent.toLowerCase().indexOf(q) !== -1;
      item.hidden = !hit;
      if (hit) shown++;
    });
    sections.forEach(function (sec) {
      var anyVisible = sec.querySelectorAll("[data-tool-item]:not([hidden])").length > 0;
      sec.hidden = q ? !anyVisible : false;
    });
    if (countEl) {
      countEl.textContent = q ? (shown + (shown === 1 ? " tool matches " : " tools match ") + "\u201C" + input.value.trim() + "\u201D.") : "";
    }
  }
  input.addEventListener("input", function () {
    if (timer) clearTimeout(timer);
    timer = setTimeout(apply, 250);
  });
}

/* ---------- stacked table labels for small screens ---------- */

function labelStackedTables() {
  var tables = document.querySelectorAll("table.stackable");
  tables.forEach(function (tbl) {
    var heads = tbl.querySelectorAll("thead th");
    tbl.querySelectorAll("tbody tr").forEach(function (tr) {
      tr.querySelectorAll("td").forEach(function (td, i) {
        if (heads[i]) td.setAttribute("data-label", heads[i].textContent);
      });
    });
  });
}

/* Expose helpers for later tool engines (window.Calculatorly). */
window.Calculatorly = {
  roundHalfUp: roundHalfUp,
  fmtNum: fmtNum,
  fmtMoney: fmtMoney,
  readNum: readNum,
  setResult: setResult,
  renderBar: renderBar,
  renderTable: renderTable,
  LIMIT: LIMIT
};

function wireCountrySwitch() {
  var cs = document.getElementById("country-switch");
  if (cs) {
    cs.addEventListener("change", function () { window.location.href = cs.value; });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  wireTool();
  wireSearch();
  wireCountrySwitch();
  labelStackedTables();
});
