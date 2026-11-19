/* Calculatorly — stage 4 tool engines (23 tools).
   Loaded after assets/js/calculatorly.js; each entry fills the
   shared ENGINES registry. Helpers (fmtNum, tax tables, ...) come
   from the core file, which is why this file has no helpers. */
ENGINES["annuity"] = {
      computeInputs: function (inputs) {
        var c = collectNums(inputs, [{ id: "p" }, { id: "r" }, { id: "y" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        if (v.p < 0) return { state: "error", message: "The lump sum cannot be below zero." };
        if (v.y < 1 || v.y > 50) return { state: "error", message: "The years of payments must be between 1 and 50." };
        if (v.r < 0 || v.r > 100) return { state: "error", message: "The yearly interest rate must be between 0% and 100%." };
        var pay = loanPaymentYears(v.p, v.r, v.y);
        return { state: "ok", value: pay, p: v.p, r: v.r, y: v.y,
                 total: pay * v.y * 12, interest: pay * v.y * 12 - v.p };
      },
      format: function (r) { return fmtMoney("USD", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("USD", r.value),
          sentenceText: "A lump sum of " + fmtMoney("USD", r.p) + " at " + fmtNum(r.r, 2) + "% a year paid over " + r.y + " " + pluralWord(r.y, "year", "years") + " gives " + fmtMoney("USD", r.value) + " a month."
        });
        renderBar(ctx.bar, r.total > 0 ? r.p / r.total * 100 : 0);
        ctx.legendA.textContent = "Lump sum: " + fmtMoney("USD", r.p);
        ctx.legendB.textContent = "Interest part: " + fmtMoney("USD", r.interest);
        ctx.bar.setAttribute("aria-label", "Bar showing the lump sum as a share of the total income");
        renderTable(ctx.breakBody, [
          ["Monthly income", fmtMoney("USD", r.value)],
          ["Months", String(Math.round(r.y * 12))],
          ["Lump sum", fmtMoney("USD", r.p)],
          ["Total income", fmtMoney("USD", r.total)],
          ["Interest part", fmtMoney("USD", r.interest)]
        ]);
      }
    };
ENGINES["binary-hex"] = {
      computeInputs: function (inputs) {
        var val = (inputs.val === null || inputs.val === undefined) ? "" : String(inputs.val).trim();
        if (val === "") return { state: "empty" };
        var frm = parseInt((inputs.frm || "10").trim(), 10);
        if ([2, 8, 10, 16].indexOf(frm) === -1) return { state: "error", message: "Pick a base from the list: binary, octal, decimal or hexadecimal." };
        var re = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^[0-9]+$/, 16: /^[0-9a-fA-F]+$/ }[frm];
        var name = { 2: "binary", 8: "octal", 10: "decimal", 16: "hexadecimal" }[frm];
        var digits = { 2: "0 and 1 only", 8: "0 to 7 only", 10: "0 to 9 only", 16: "0-9 and A-F only" }[frm];
        if (!re.test(val)) return { state: "error", message: "That is not a " + name + " number: " + name + " digits are " + digits + "." };
        if (val.length > 64) return { state: "error", message: "That number has more than 64 digits. Type a number with up to 64 digits." };
        var value = parseInt(val, frm);
        if (!isFinite(value)) return { state: "limit" };
        if (value > LIMIT) return { state: "limit" };
        return { state: "ok", value: value, frm: frm };
      },
      format: function (r) {
        return r.value.toString(10) + " in decimal = " + r.value.toString(2) + " in binary, " + r.value.toString(8) + " in octal, " + r.value.toString(16).toUpperCase() + " in hexadecimal";
      },
      render: function (ctx, r) {
        var b = r.value.toString(2), o = r.value.toString(8),
            dd = r.value.toString(10), h = r.value.toString(16).toUpperCase();
        var names = { 2: "binary", 8: "octal", 10: "decimal", 16: "hexadecimal" };
        var shown = (r.frm === 10) ? dd : { 2: b, 8: o, 16: h }[r.frm];
        var ones = 0;
        for (var i = 0; i < b.length; i++) if (b[i] === "1") ones++;
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: dd + " in decimal = " + b + " in binary, " + o + " in octal, " + h + " in hexadecimal",
          sentenceText: shown + " in " + names[r.frm] + " is " + b + " in binary, " + o + " in octal and " + h + " in hexadecimal."
        });
        renderBar(ctx.bar, b.length ? ones / b.length * 100 : 0);
        ctx.legendA.textContent = "Ones in the binary form: " + ones + " of " + b.length + " bits";
        ctx.legendB.textContent = "Share of 1 bits in the binary form";
        ctx.bar.setAttribute("aria-label", "Bar showing the share of 1 bits in the binary form");
        renderTable(ctx.breakBody, [
          ["Binary", b],
          ["Octal", o],
          ["Decimal", dd],
          ["Hexadecimal", h],
          ["Number of 1 bits", String(ones)]
        ]);
      }
    };
ENGINES["college-cost"] = {
      computeInputs: function (inputs) {
        var c = collectNums(inputs, [{ id: "t" }, { id: "l" }, { id: "y" }, { id: "a" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        if (v.t < 0 || v.l < 0 || v.a < 0) return { state: "error", message: "The costs and the aid cannot be below zero." };
        if (v.y < 1 || v.y > 10) return { state: "error", message: "The years of study must be between 1 and 10." };
        if (v.t + v.l - v.a < 0) return { state: "error", message: "The financial aid is more than the yearly tuition plus living costs, so the total would be below zero. Check the aid figure." };
        var tt = v.t * v.y, lt = v.l * v.y, at = v.a * v.y;
        return { state: "ok", value: tt + lt - at, t: v.t, l: v.l, y: v.y, a: v.a,
                 tt: tt, lt: lt, at: at };
      },
      format: function (r) { return fmtMoney("USD", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("USD", r.value),
          sentenceText: "Tuition of " + fmtMoney("USD", r.t) + " a year and living costs of " + fmtMoney("USD", r.l) + " a year for " + r.y + " " + pluralWord(r.y, "year", "years") + ", less " + fmtMoney("USD", r.a) + " a year of aid, come to " + fmtMoney("USD", r.value) + " in total."
        });
        renderBar(ctx.bar, (r.tt + r.lt) > 0 ? r.tt / (r.tt + r.lt) * 100 : 0);
        ctx.legendA.textContent = "Tuition total: " + fmtMoney("USD", r.tt);
        ctx.legendB.textContent = "Living total: " + fmtMoney("USD", r.lt);
        ctx.bar.setAttribute("aria-label", "Bar showing tuition as a share of tuition plus living costs");
        renderTable(ctx.breakBody, [
          ["Tuition total", fmtMoney("USD", r.tt)],
          ["Living costs total", fmtMoney("USD", r.lt)],
          ["Aid total", fmtMoney("USD", r.at)],
          ["Total cost", fmtMoney("USD", r.value)]
        ]);
      }
    };
ENGINES["commission"] = {
      computeInputs: function (inputs) {
        var c = collectNums(inputs, [{ id: "s" }, { id: "r" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        if (v.s < 0) return { state: "error", message: "The total sales cannot be below zero." };
        if (v.r < 0 || v.r > 100) return { state: "error", message: "The commission rate must be between 0% and 100%." };
        return { state: "ok", value: v.s * v.r / 100, s: v.s, r: v.r };
      },
      format: function (r) { return fmtMoney("USD", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("USD", r.value),
          sentenceText: "Sales of " + fmtMoney("USD", r.s) + " at a commission rate of " + fmtNum(r.r, 2) + "% earn " + fmtMoney("USD", r.value) + " in commission."
        });
        renderBar(ctx.bar, r.r);
        ctx.legendA.textContent = "Commission: " + fmtMoney("USD", r.value);
        ctx.legendB.textContent = "Sales: " + fmtMoney("USD", r.s);
        ctx.bar.setAttribute("aria-label", "Bar showing the commission as a share of sales");
        renderTable(ctx.breakBody, [
          ["Total sales", fmtMoney("USD", r.s)],
          ["Commission rate", fmtNum(r.r, 2) + "%"],
          ["Commission earned", fmtMoney("USD", r.value)],
          ["Commission per $1,000 of sales", fmtMoney("USD", r.r * 10)]
        ]);
      }
    };
ENGINES["confidence-interval"] = {
      computeInputs: function (inputs) {
        var conf = (inputs.conf || "").trim();
        if (!Z_VALUES[conf]) return { state: "error", message: "Pick a confidence level from the list." };
        var c = collectNums(inputs, [{ id: "m" }, { id: "s" }, { id: "n" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        if (v.n < 2) return { state: "error", message: "The sample size must be at least 2. A sample of one cannot give a confidence interval." };
        if (v.n > 1000000) return { state: "error", message: "The sample size must be no more than 1,000,000." };
        if (v.s <= 0) return { state: "error", message: "The standard deviation must be above zero." };
        var z = Z_VALUES[conf];
        var se = v.s / Math.sqrt(v.n);
        var margin = z * se;
        return { state: "ok", value: margin, m: v.m, s: v.s, n: v.n, conf: conf,
                 lo: v.m - margin, hi: v.m + margin, se: se, margin: margin };
      },
      format: function (r) { return fmtNum(r.lo, 4) + " to " + fmtNum(r.hi, 4); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.lo, 4) + " to " + fmtNum(r.hi, 4),
          sentenceText: "With " + r.conf + "% confidence, the true mean lies between " + fmtNum(r.lo, 4) + " and " + fmtNum(r.hi, 4) + "."
        });
        renderBar(ctx.bar, r.m !== 0 ? Math.min(100, r.margin / Math.abs(r.m) * 100) : 0);
        ctx.legendA.textContent = "Margin of error: " + fmtNum(r.margin, 4);
        ctx.legendB.textContent = "Margin as a share of the mean";
        ctx.bar.setAttribute("aria-label", "Bar showing the margin of error as a share of the mean");
        renderTable(ctx.breakBody, [
          ["Sample mean", fmtNum(r.m, 4)],
          ["Standard error", fmtNum(r.se, 4)],
          ["Margin of error", fmtNum(r.margin, 4)],
          ["Lower limit", fmtNum(r.lo, 4)],
          ["Upper limit", fmtNum(r.hi, 4)]
        ]);
      }
    };
ENGINES["dice-random"] = {
      computeInputs: function (inputs) {
        var c = collectNums(inputs, [{ id: "d" }, { id: "s" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        if (v.d < 1 || v.d > 100) return { state: "error", message: "The number of dice must be between 1 and 100." };
        if (v.s < 2 || v.s > 100) return { state: "error", message: "The sides per die must be between 2 and 100." };
        var rolls = [];
        for (var i = 0; i < v.d; i++) {
          var roll = secureRandomInt(v.s);
          if (roll === null) return { state: "error", message: "Secure random numbers are not available in this browser, so no dice can be rolled." };
          rolls.push(roll + 1);
        }
        var total = 0;
        rolls.forEach(function (x) { total += x; });
        return { state: "ok", value: total, d: v.d, s: v.s, rolls: rolls, total: total };
      },
      format: function (r) { return "Total " + r.total; },
      render: function (ctx, r) {
        var mx = r.d * r.s;
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: "Total " + r.total,
          sentenceText: r.d + " " + pluralWord(r.d, "die", "dice") + " rolled " + r.rolls.join(" and ") + ", for a total of " + r.total + " out of a possible " + mx + "."
        });
        renderBar(ctx.bar, mx > 0 ? r.total / mx * 100 : 0);
        ctx.legendA.textContent = "Total: " + r.total;
        ctx.legendB.textContent = "Highest possible: " + mx;
        ctx.bar.setAttribute("aria-label", "Bar showing the total against the highest possible total");
        var rows = r.rolls.map(function (roll, i) { return ["Die " + (i + 1), String(roll)]; });
        rows.push(["Total", String(r.total)]);
        rows.push(["Lowest possible", String(r.d)]);
        rows.push(["Highest possible", String(mx)]);
        renderTable(ctx.breakBody, rows);
      }
    };
ENGINES["exponent"] = {
      computeInputs: function (inputs) {
        var c = collectNums(inputs, [{ id: "a" }, { id: "b" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        if (v.a === 0 && v.b <= 0) return { state: "error", message: "0 raised to a zero or negative power is not defined." };
        if (v.a < 0 && Math.floor(v.b) !== v.b) return { state: "error", message: "A negative base with a decimal exponent is not a real number." };
        var val = Math.pow(v.a, v.b);
        if (!isFinite(val)) return { state: "error", message: "The result is too large to show. Try a smaller base or exponent." };
        return { state: "ok", value: val, a: v.a, b: v.b };
      },
      format: function (r) { return fmtNum(r.value, 4); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 4),
          sentenceText: fmtNum(r.a, 2) + " raised to the power " + fmtNum(r.b, 2) + " is " + fmtNum(r.value, 4) + "."
        });
        renderBar(ctx.bar, r.value >= 0 ? Math.min(100, Math.abs(r.value)) : 0);
        ctx.legendA.textContent = "Result: " + fmtNum(r.value, 4);
        ctx.legendB.textContent = "Shown capped at 100";
        ctx.bar.setAttribute("aria-label", "Bar showing the result, capped at 100");
        renderTable(ctx.breakBody, [
          ["Base", fmtNum(r.a, 2)],
          ["Exponent", fmtNum(r.b, 2)],
          ["Result", fmtNum(r.value, 4)],
          ["Square of the base", fmtNum(r.a * r.a, 4)],
          ["Square root of the base", (r.a >= 0) ? fmtNum(Math.sqrt(r.a), 4) : "Not a real number"]
        ]);
      }
    };
ENGINES["future-value"] = {
      computeInputs: function (inputs) {
        var c = collectNums(inputs, [{ id: "p" }, { id: "r" }, { id: "y" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        if (v.p < 0) return { state: "error", message: "The amount today cannot be below zero." };
        if (v.r < 0 || v.r > 100) return { state: "error", message: "The growth rate must be between 0% and 100%." };
        if (v.y < 0 || v.y > 100) return { state: "error", message: "The years must be between 0 and 100." };
        var fv = v.p * Math.pow(1 + v.r / 100, v.y);
        if (!isFinite(fv)) return { state: "error", message: "The result is too large to show. Try a smaller amount, rate or number of years." };
        return { state: "ok", value: fv, p: v.p, r: v.r, y: v.y };
      },
      format: function (r) { return fmtMoney("USD", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("USD", r.value),
          sentenceText: fmtMoney("USD", r.p) + " at " + fmtNum(r.r, 2) + "% a year for " + r.y + " " + pluralWord(r.y, "year", "years") + " grows to " + fmtMoney("USD", r.value) + "."
        });
        renderBar(ctx.bar, r.value > 0 ? r.p / r.value * 100 : 0);
        ctx.legendA.textContent = "Starting amount: " + fmtMoney("USD", r.p);
        ctx.legendB.textContent = "Growth: " + fmtMoney("USD", r.value - r.p);
        ctx.bar.setAttribute("aria-label", "Bar showing the starting amount as a share of the future value");
        renderTable(ctx.breakBody, [
          ["Starting amount", fmtMoney("USD", r.p)],
          ["Growth", fmtMoney("USD", r.value - r.p)],
          ["Future value", fmtMoney("USD", r.value)],
          ["Years", String(r.y)]
        ]);
      }
    };
ENGINES["irr"] = {
      computeInputs: function (inputs) {
        var raw = (inputs.flows === null || inputs.flows === undefined) ? "" : String(inputs.flows).trim();
        if (raw === "") return { state: "empty" };
        var parts = raw.split(",");
        var flows = [];
        for (var i = 0; i < parts.length; i++) {
          var t = parts[i].trim();
          if (t === "") continue;
          var v = Number(t);
          if (!isFinite(v)) return { state: "error", message: "Each cash flow must be a number. Check the flow that reads “" + t + "”." };
          if (Math.abs(v) > LIMIT) return { state: "limit" };
          flows.push(v);
        }
        if (flows.length < 2) return { state: "error", message: "Type at least 2 cash flows: the money invested first, then the money coming back." };
        if (flows[0] >= 0) return { state: "error", message: "The first cash flow is the money invested, so enter it as a negative number." };
        var hasPos = false, hasNeg = false;
        flows.forEach(function (cf) { if (cf > 0) hasPos = true; if (cf < 0) hasNeg = true; });
        if (!hasPos || !hasNeg) return { state: "error", message: "The cash flows never change from negative to positive, so no internal rate of return exists." };
        function npv(rate) {
          var s = 0;
          for (var t = 0; t < flows.length; t++) s += flows[t] / Math.pow(1 + rate, t);
          return s;
        }
        var grid = [-0.9, -0.5, -0.25, 0, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
        var vals = grid.map(npv);
        for (var g = 0; g < grid.length - 1; g++) {
          if (vals[g] === 0) return { state: "ok", value: grid[g] * 100, flows: flows };
          if (vals[g] * vals[g + 1] < 0) {
            var lo = grid[g], hi = grid[g + 1], flo = vals[g];
            for (var k = 0; k < 200; k++) {
              var mid = (lo + hi) / 2, fm = npv(mid);
              if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; }
            }
            return { state: "ok", value: (lo + hi) / 2 * 100, flows: flows };
          }
        }
        return { state: "error", message: "No internal rate of return could be found for these cash flows." };
      },
      format: function (r) { return fmtNum(r.value, 4) + "%"; },
      render: function (ctx, r) {
        var totalIn = 0, totalOut = 0;
        r.flows.forEach(function (cf) { if (cf > 0) totalIn += cf; else totalOut -= cf; });
        var joined = r.flows.map(function (cf) { return fmtNum(cf, 2); }).join(", ");
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 4) + "%",
          sentenceText: "The cash flows " + joined + " give an internal rate of return of " + fmtNum(r.value, 4) + "% a year."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, r.value)));
        ctx.legendA.textContent = "Internal rate of return: " + fmtNum(r.value, 4) + "%";
        ctx.legendB.textContent = "Net gain: " + fmtMoney("USD", totalIn - totalOut);
        ctx.bar.setAttribute("aria-label", "Bar showing the rate of return, out of 100%");
        renderTable(ctx.breakBody, [
          ["Cash flows", joined],
          ["Money in", fmtMoney("USD", totalIn)],
          ["Money out", fmtMoney("USD", totalOut)],
          ["Net gain", fmtMoney("USD", totalIn - totalOut)],
          ["Internal rate of return", fmtNum(r.value, 4) + "%"]
        ]);
      }
    };
ENGINES["log"] = {
      computeInputs: function (inputs) {
        var c = collectNums(inputs, [{ id: "x" }, { id: "b" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        if (v.x <= 0) return { state: "error", message: "The number must be above zero: no power of a positive base can give zero or a negative number." };
        if (v.b <= 0) return { state: "error", message: "The base must be above zero." };
        if (v.b === 1) return { state: "error", message: "The base must not be 1: 1 raised to any power is always 1, so it can never give any other number." };
        return { state: "ok", value: Math.log(v.x) / Math.log(v.b), x: v.x, b: v.b };
      },
      format: function (r) { return fmtNum(r.value, 10); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 10),
          sentenceText: "The logarithm of " + fmtNum(r.x, 2) + " to base " + fmtNum(r.b, 2) + " is " + fmtNum(r.value, 10) + "."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, r.value / 10 * 100)));
        ctx.legendA.textContent = "Log result: " + fmtNum(r.value, 10);
        ctx.legendB.textContent = "Shown against 10";
        ctx.bar.setAttribute("aria-label", "Bar showing the log result against 10");
        renderTable(ctx.breakBody, [
          ["Number", fmtNum(r.x, 2)],
          ["Base", fmtNum(r.b, 2)],
          ["Natural log of the number", fmtNum(Math.log(r.x), 10)],
          ["Natural log of the base", fmtNum(Math.log(r.b), 10)],
          ["Log result", fmtNum(r.value, 10)]
        ]);
      }
    };
ENGINES["margin"] = {
      computeInputs: function (inputs) {
        var c = collectNums(inputs, [{ id: "c" }, { id: "p" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        if (v.c < 0 || v.p < 0) return { state: "error", message: "The cost and the selling price cannot be below zero." };
        if (v.p === 0) return { state: "zero", message: "The selling price is zero, so the margin cannot be worked out: the sum divides by the selling price, and dividing by zero has no answer." };
        var profit = v.p - v.c;
        return { state: "ok", value: profit / v.p * 100, c: v.c, p: v.p, profit: profit,
                 markup: (v.c !== 0) ? profit / v.c * 100 : null };
      },
      format: function (r) { return fmtNum(r.value, 2) + "% margin"; },
      render: function (ctx, r) {
        var sent = "Cost " + fmtMoney("USD", r.c) + " and price " + fmtMoney("USD", r.p) + " give a profit of " + fmtMoney("USD", r.profit) + ": a margin of " + fmtNum(r.value, 2) + "%";
        sent += (r.markup !== null) ? " and a markup of " + fmtNum(r.markup, 2) + "%."
                                     : ". The markup is not defined when the cost is zero.";
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 2) + "% margin",
          sentenceText: sent
        });
        renderBar(ctx.bar, r.p > 0 ? r.c / r.p * 100 : 0);
        ctx.legendA.textContent = "Cost: " + fmtMoney("USD", r.c);
        ctx.legendB.textContent = "Profit: " + fmtMoney("USD", r.profit);
        ctx.bar.setAttribute("aria-label", "Bar showing the cost as a share of the selling price");
        renderTable(ctx.breakBody, [
          ["Cost", fmtMoney("USD", r.c)],
          ["Selling price", fmtMoney("USD", r.p)],
          ["Profit", fmtMoney("USD", r.profit)],
          ["Margin", fmtNum(r.value, 2) + "%"],
          ["Markup", (r.markup !== null) ? fmtNum(r.markup, 2) + "%" : "Not defined (cost is zero)"]
        ]);
      }
    };
ENGINES["payback-period"] = {
      computeInputs: function (inputs) {
        var c = collectNums(inputs, [{ id: "i" }, { id: "c" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        if (v.i <= 0) return { state: "error", message: "The investment must be above zero." };
        if (v.c <= 0) return { state: "error", message: "The yearly cash flow must be above zero, or the investment never pays for itself." };
        var yrs = v.i / v.c;
        var whole = Math.floor(yrs);
        var months = Math.round((yrs - whole) * 12);
        if (months === 12) { whole += 1; months = 0; }
        var text = whole + " " + pluralWord(whole, "year", "years") + ", " + months + " " + pluralWord(months, "month", "months");
        return { state: "ok", value: yrs, i: v.i, c: v.c, whole: whole, months: months, text: text };
      },
      format: function (r) { return r.text; },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: r.text,
          sentenceText: "An investment of " + fmtMoney("USD", r.i) + " with " + fmtMoney("USD", r.c) + " coming back each year pays for itself in " + r.text + "."
        });
        renderBar(ctx.bar, Math.min(100, r.value / 10 * 100));
        ctx.legendA.textContent = "Payback time: " + r.text;
        ctx.legendB.textContent = "Shown against 10 years";
        ctx.bar.setAttribute("aria-label", "Bar showing the payback time against 10 years");
        renderTable(ctx.breakBody, [
          ["Investment", fmtMoney("USD", r.i)],
          ["Yearly cash flow", fmtMoney("USD", r.c)],
          ["Payback in years", fmtNum(r.value, 2)],
          ["Years", String(r.whole)],
          ["Months", String(r.months)]
        ]);
      }
    };
ENGINES["pension-401k-ira"] = {
      computeInputs: function (inputs) {
        var country = (inputs.country || "").trim();
        if (!PENSION_COUNTRIES[country]) return { state: "error", message: "Pick a country from the list." };
        var c = collectNums(inputs, [{ id: "m" }, { id: "g" }, { id: "y" }, { id: "b" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        if (v.m < 0 || v.b < 0) return { state: "error", message: "The monthly payment and the current savings cannot be below zero." };
        if (v.y < 1 || v.y > 60) return { state: "error", message: "The years until retirement must be between 1 and 60." };
        if (v.g < 0 || v.g > 30) return { state: "error", message: "The yearly growth must be between 0% and 30%." };
        var r = v.g / 100 / 12, n = v.y * 12;
        var fvPay = (r === 0) ? v.m * n : v.m * ((Math.pow(1 + r, n) - 1) / r);
        var fvBal = v.b * Math.pow(1 + r, n);
        var total = fvPay + fvBal;
        var paidIn = v.m * n + v.b;
        return { state: "ok", value: total, country: country, m: v.m, g: v.g, y: v.y,
                 b: v.b, n: n, paidIn: paidIn, growth: total - paidIn };
      },
      format: function (r) { return fmtMoney(PENSION_COUNTRIES[r.country].code, r.value); },
      render: function (ctx, r) {
        var info = PENSION_COUNTRIES[r.country];
        var sym = info.code;
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney(sym, r.value),
          sentenceText: "With a " + info.name + ", paying " + fmtMoney(sym, r.m) + " a month for " + r.y + " " + pluralWord(r.y, "year", "years") + " at " + fmtNum(r.g, 2) + "% yearly growth gives " + fmtMoney(sym, r.value) + "."
        });
        renderBar(ctx.bar, r.value > 0 ? r.paidIn / r.value * 100 : 0);
        ctx.legendA.textContent = "Paid in: " + fmtMoney(sym, r.paidIn);
        ctx.legendB.textContent = "Growth: " + fmtMoney(sym, r.growth);
        ctx.bar.setAttribute("aria-label", "Bar showing money paid in as a share of the projected value");
        renderTable(ctx.breakBody, [
          ["Monthly payment", fmtMoney(sym, r.m)],
          ["Months", String(Math.round(r.n))],
          ["Total paid in", fmtMoney(sym, r.paidIn)],
          ["Growth", fmtMoney(sym, r.growth)],
          ["Projected value", fmtMoney(sym, r.value)],
          ["Note for the " + info.place, info.note]
        ]);
      }
    };
ENGINES["present-value"] = {
      computeInputs: function (inputs) {
        var c = collectNums(inputs, [{ id: "f" }, { id: "r" }, { id: "y" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        if (v.f < 0) return { state: "error", message: "The future amount cannot be below zero." };
        if (v.r < 0 || v.r > 100) return { state: "error", message: "The discount rate must be between 0% and 100%." };
        if (v.y < 0 || v.y > 100) return { state: "error", message: "The years must be between 0 and 100." };
        var pv = v.f / Math.pow(1 + v.r / 100, v.y);
        return { state: "ok", value: pv, f: v.f, r: v.r, y: v.y };
      },
      format: function (r) { return fmtMoney("USD", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("USD", r.value),
          sentenceText: fmtMoney("USD", r.f) + " in " + r.y + " " + pluralWord(r.y, "year", "years") + " at a discount rate of " + fmtNum(r.r, 2) + "% a year is worth " + fmtMoney("USD", r.value) + " today."
        });
        renderBar(ctx.bar, r.f > 0 ? r.value / r.f * 100 : 0);
        ctx.legendA.textContent = "Present value: " + fmtMoney("USD", r.value);
        ctx.legendB.textContent = "Discount: " + fmtMoney("USD", r.f - r.value);
        ctx.bar.setAttribute("aria-label", "Bar showing the present value as a share of the future amount");
        renderTable(ctx.breakBody, [
          ["Future amount", fmtMoney("USD", r.f)],
          ["Discount", fmtMoney("USD", r.f - r.value)],
          ["Present value", fmtMoney("USD", r.value)],
          ["Years", String(r.y)]
        ]);
      }
    };
ENGINES["quadratic"] = {
      computeInputs: function (inputs) {
        var c = collectNums(inputs, [{ id: "a" }, { id: "b" }, { id: "c" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        if (v.a === 0) return { state: "error", message: "The first number (a) is zero, so this is not a quadratic equation. Type a value of a that is not zero." };
        var disc = v.b * v.b - 4 * v.a * v.c;
        if (disc < 0) return { state: "error", message: "No real roots: the discriminant is " + fmtNum(disc, 4) + ", which is below zero, so its square root is not a real number and the curve never crosses the x-axis." };
        if (disc === 0) {
          var root = -v.b / (2 * v.a);
          return { state: "ok", value: root, a: v.a, b: v.b, c: v.c, disc: disc,
                   repeated: true, r1: root, r2: root };
        }
        var sq = Math.sqrt(disc);
        return { state: "ok", value: (-v.b + sq) / (2 * v.a), a: v.a, b: v.b, c: v.c,
                 disc: disc, repeated: false,
                 r1: (-v.b + sq) / (2 * v.a), r2: (-v.b - sq) / (2 * v.a) };
      },
      format: function (r) {
        if (r.repeated) return "x = " + fmtNum(r.r1, 4) + " (repeated root)";
        return "x = " + fmtNum(r.r1, 4) + ", x = " + fmtNum(r.r2, 4);
      },
      render: function (ctx, r) {
        var sent, resultText;
        if (r.repeated) {
          resultText = "x = " + fmtNum(r.r1, 4) + " (repeated root)";
          sent = "For " + fmtNum(r.a, 2) + "x\u00b2 + " + fmtNum(r.b, 2) + "x + " + fmtNum(r.c, 2) + " = 0, the discriminant is 0, so there is one repeated root: x = " + fmtNum(r.r1, 4) + ".";
        } else {
          resultText = "x = " + fmtNum(r.r1, 4) + ", x = " + fmtNum(r.r2, 4);
          sent = "For " + fmtNum(r.a, 2) + "x\u00b2 + " + fmtNum(r.b, 2) + "x + " + fmtNum(r.c, 2) + " = 0, the roots are x = " + fmtNum(r.r1, 4) + " and x = " + fmtNum(r.r2, 4) + ".";
        }
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: resultText, sentenceText: sent
        });
        renderBar(ctx.bar, Math.min(100, Math.abs(r.disc)));
        ctx.legendA.textContent = "Discriminant: " + fmtNum(r.disc, 4);
        ctx.legendB.textContent = "Shown capped at 100";
        ctx.bar.setAttribute("aria-label", "Bar showing the discriminant, capped at 100");
        renderTable(ctx.breakBody, [
          ["a", fmtNum(r.a, 2)],
          ["b", fmtNum(r.b, 2)],
          ["c", fmtNum(r.c, 2)],
          ["Discriminant", fmtNum(r.disc, 4)],
          ["Root 1", fmtNum(r.r1, 4)],
          ["Root 2", r.repeated ? "Same root (repeated)" : fmtNum(r.r2, 4)]
        ]);
      }
    };
ENGINES["roi"] = {
      computeInputs: function (inputs) {
        var c = collectNums(inputs, [{ id: "c" }, { id: "v" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        if (v.c < 0 || v.v < 0) return { state: "error", message: "The amounts cannot be below zero." };
        if (v.c === 0) return { state: "zero", message: "The amount invested is zero, so the return cannot be worked out: the sum divides by the amount invested, and dividing by zero has no answer." };
        return { state: "ok", value: (v.v - v.c) / v.c * 100, c: v.c, v: v.v, gain: v.v - v.c };
      },
      format: function (r) { return fmtNum(r.value, 2) + "%"; },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 2) + "%",
          sentenceText: "Investing " + fmtMoney("USD", r.c) + " and receiving " + fmtMoney("USD", r.v) + " is a " + (r.gain >= 0 ? "gain" : "loss") + " of " + fmtMoney("USD", Math.abs(r.gain)) + ", a return of " + fmtNum(r.value, 2) + "%."
        });
        var mx = Math.max(r.c, r.v);
        renderBar(ctx.bar, mx > 0 ? r.v / mx * 100 : 0);
        ctx.legendA.textContent = "Received: " + fmtMoney("USD", r.v);
        ctx.legendB.textContent = "Invested: " + fmtMoney("USD", r.c);
        ctx.bar.setAttribute("aria-label", "Bar showing the amount received against the larger of the two amounts");
        renderTable(ctx.breakBody, [
          ["Amount invested", fmtMoney("USD", r.c)],
          ["Amount received", fmtMoney("USD", r.v)],
          ["Gain or loss", fmtMoney("USD", r.gain)],
          ["Return on investment", fmtNum(r.value, 2) + "%"]
        ]);
      }
    };
ENGINES["roman-numerals"] = {
      computeInputs: function (inputs) {
        var val = (inputs.val === null || inputs.val === undefined) ? "" : String(inputs.val).trim();
        if (val === "") return { state: "empty" };
        if (/^[0-9]+$/.test(val)) {
          var n = parseInt(val, 10);
          if (n < 1 || n > 3999) return { state: "error", message: "Roman numerals cover 1 to 3,999 only. Type a number in that range." };
          return { state: "ok", value: n, numeral: toRoman(n), fromNumeral: false };
        }
        if (/^[ivxlcdm]+$/i.test(val)) {
          var up = val.toUpperCase();
          var num = fromRoman(up);
          if (num < 1 || num > 3999 || toRoman(num) !== up) return { state: "error", message: "That is not a valid Roman numeral written the standard way. Use the letters I, V, X, L, C, D and M, with the subtraction rule — for example, IV for 4, not IIII." };
          return { state: "ok", value: num, numeral: up, fromNumeral: true };
        }
        return { state: "error", message: "Type a number from 1 to 3,999, or a Roman numeral using the letters I, V, X, L, C, D and M." };
      },
      format: function (r) {
        if (r.fromNumeral) return r.numeral + " = " + fmtNum(r.value, 0);
        return fmtNum(r.value, 0) + " = " + r.numeral;
      },
      render: function (ctx, r) {
        var resultText, sentenceText, rows;
        if (r.fromNumeral) {
          resultText = r.numeral + " = " + fmtNum(r.value, 0);
          sentenceText = r.numeral + " as a number is " + fmtNum(r.value, 0) + ".";
          rows = [["Roman numeral", r.numeral], ["Number", fmtNum(r.value, 0)]].concat(romanRows(r.value));
        } else {
          resultText = fmtNum(r.value, 0) + " = " + r.numeral;
          sentenceText = fmtNum(r.value, 0) + " in Roman numerals is " + r.numeral + ".";
          rows = [["Number", fmtNum(r.value, 0)], ["Roman numeral", r.numeral]].concat(romanRows(r.value));
        }
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: resultText, sentenceText: sentenceText
        });
        renderBar(ctx.bar, r.value / 3999 * 100);
        ctx.legendA.textContent = "Number: " + fmtNum(r.value, 0);
        ctx.legendB.textContent = "Shown against 3,999, the largest Roman numeral here";
        ctx.bar.setAttribute("aria-label", "Bar showing the number against 3,999");
        renderTable(ctx.breakBody, rows);
      }
    };
ENGINES["sample-size"] = {
      computeInputs: function (inputs) {
        var conf = (inputs.conf || "").trim();
        if (!Z_VALUES[conf]) return { state: "error", message: "Pick a confidence level from the list." };
        var c = collectNums(inputs, [{ id: "pop" }, { id: "e" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        if (v.pop < 10) return { state: "error", message: "The population must be at least 10." };
        if (v.pop > 1000000000) return { state: "error", message: "The population must be no more than 1,000,000,000." };
        if (v.e < 1 || v.e > 50) return { state: "error", message: "The margin of error must be between 1% and 50%." };
        var z = Z_VALUES[conf];
        var er = v.e / 100;
        var n0 = z * z * 0.25 / (er * er);
        var n = n0 / (1 + (n0 - 1) / v.pop);
        return { state: "ok", value: Math.ceil(n), pop: v.pop, conf: conf, e: v.e, n0: n0 };
      },
      format: function (r) { return String(r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: String(r.value),
          sentenceText: "Survey " + r.value + " " + pluralWord(r.value, "person", "people") + " out of a population of " + fmtNum(r.pop, 0) + " to get a " + r.conf + "% confidence level with a " + fmtNum(r.e, 2) + "% margin of error."
        });
        renderBar(ctx.bar, Math.min(100, r.value / r.pop * 100));
        ctx.legendA.textContent = "Sample needed: " + r.value + " people";
        ctx.legendB.textContent = "Sample as a share of the population";
        ctx.bar.setAttribute("aria-label", "Bar showing the sample as a share of the population");
        renderTable(ctx.breakBody, [
          ["Population", fmtNum(r.pop, 0)],
          ["Confidence level", r.conf + "%"],
          ["Margin of error", fmtNum(r.e, 2) + "%"],
          ["Unadjusted size", String(Math.ceil(r.n0))],
          ["Sample size needed", String(r.value)]
        ]);
      }
    };
ENGINES["slope"] = {
      computeInputs: function (inputs) {
        var c = collectNums(inputs, [{ id: "x1" }, { id: "y1" }, { id: "x2" }, { id: "y2" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        var dx = v.x2 - v.x1, dy = v.y2 - v.y1;
        if (dx === 0) return { state: "error", message: "The two points have the same x value, so the line is vertical and the slope is not defined." };
        var m = dy / dx;
        return { state: "ok", value: m, x1: v.x1, y1: v.y1, x2: v.x2, y2: v.y2,
                 dx: dx, dy: dy, b: v.y1 - m * v.x1 };
      },
      format: function (r) { return fmtNum(r.value, 4); },
      render: function (ctx, r) {
        var eq = "y = " + fmtNum(r.value, 4) + "x " + (r.b >= 0 ? "+" : "\u2212") + " " + fmtNum(Math.abs(r.b), 4);
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 4),
          sentenceText: "The line through (" + fmtNum(r.x1, 2) + ", " + fmtNum(r.y1, 2) + ") and (" + fmtNum(r.x2, 2) + ", " + fmtNum(r.y2, 2) + ") has a slope of " + fmtNum(r.value, 4) + " and the equation " + eq + "."
        });
        renderBar(ctx.bar, Math.min(100, Math.abs(r.value) / 10 * 100));
        ctx.legendA.textContent = "Slope: " + fmtNum(r.value, 4);
        ctx.legendB.textContent = "Shown against a slope of 10";
        ctx.bar.setAttribute("aria-label", "Bar showing the slope against 10");
        renderTable(ctx.breakBody, [
          ["Point 1", "(" + fmtNum(r.x1, 2) + ", " + fmtNum(r.y1, 2) + ")"],
          ["Point 2", "(" + fmtNum(r.x2, 2) + ", " + fmtNum(r.y2, 2) + ")"],
          ["Rise", fmtNum(r.dy, 2)],
          ["Run", fmtNum(r.dx, 2)],
          ["Slope", fmtNum(r.value, 4)],
          ["Y-intercept", fmtNum(r.b, 4)]
        ]);
      }
    };
ENGINES["student-loan"] = {
      computeInputs: function (inputs) {
        var c = collectNums(inputs, [{ id: "p" }, { id: "r" }, { id: "y" }]);
        if (c.state !== "ok") {
          if (c.state === "empty") return c;
          return { state: "limit" };
        }
        var v = c.vals;
        if (v.p < 0) return { state: "error", message: "The loan amount cannot be below zero." };
        if (v.y < 1 || v.y > 50) return { state: "error", message: "The loan term must be between 1 and 50 years." };
        if (v.r < 0 || v.r > 100) return { state: "error", message: "The yearly interest rate must be between 0% and 100%." };
        var pay = loanPaymentYears(v.p, v.r, v.y);
        return { state: "ok", value: pay, p: v.p, r: v.r, y: v.y,
                 total: pay * v.y * 12, interest: pay * v.y * 12 - v.p };
      },
      format: function (r) { return fmtMoney("USD", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("USD", r.value),
          sentenceText: "Borrowing " + fmtMoney("USD", r.p) + " at " + fmtNum(r.r, 2) + "% a year for " + r.y + " " + pluralWord(r.y, "year", "years") + " costs " + fmtMoney("USD", r.value) + " a month."
        });
        renderBar(ctx.bar, r.total > 0 ? r.p / r.total * 100 : 0);
        ctx.legendA.textContent = "Loan amount: " + fmtMoney("USD", r.p);
        ctx.legendB.textContent = "Interest: " + fmtMoney("USD", r.interest);
        ctx.bar.setAttribute("aria-label", "Bar showing the loan amount as a share of the total paid");
        renderTable(ctx.breakBody, [
          ["Monthly payment", fmtMoney("USD", r.value)],
          ["Months", String(Math.round(r.y * 12))],
          ["Loan amount", fmtMoney("USD", r.p)],
          ["Total paid", fmtMoney("USD", r.total)],
          ["Total interest", fmtMoney("USD", r.interest)]
        ]);
      }
    };
ENGINES["time-card"] = {
      computeInputs: function (inputs) {
        var days = [["Monday", "mon_in", "mon_out"], ["Tuesday", "tue_in", "tue_out"],
                    ["Wednesday", "wed_in", "wed_out"], ["Thursday", "thu_in", "thu_out"],
                    ["Friday", "fri_in", "fri_out"]];
        var parsed = [];
        for (var i = 0; i < days.length; i++) {
          var label = days[i][0];
          var inn = (inputs[days[i][1]] || "").trim();
          var out = (inputs[days[i][2]] || "").trim();
          if (inn === "" || out === "") return { state: "empty" };
          var pin = parseHHMM(inn), pout = parseHHMM(out);
          if (!pin) return { state: "error", message: "Type the clock-in time on " + label + " as HH:MM, with hours 00 to 23 and minutes 00 to 59." };
          if (!pout) return { state: "error", message: "Type the clock-out time on " + label + " as HH:MM, with hours 00 to 23 and minutes 00 to 59." };
          parsed.push({ label: label, inMin: pin.h * 60 + pin.m, outMin: pout.h * 60 + pout.m });
        }
        var c = collectNums(inputs, [{ id: "brk" }, { id: "rate" }]);
        if (c.state !== "ok") return c;
        var brk = c.vals.brk, rate = c.vals.rate;
        if (brk < 0 || brk > 480) return { state: "error", message: "The unpaid break must be between 0 and 480 minutes a day." };
        if (rate < 0) return { state: "error", message: "The hourly pay rate cannot be below zero." };
        var rows = [], totalMin = 0;
        for (var j = 0; j < parsed.length; j++) {
          var day = parsed[j];
          var mins;
          if (day.outMin === day.inMin) {
            mins = 0;
          } else if (day.outMin < day.inMin) {
            return { state: "error", message: "The clock-out time must be after the clock-in time on " + day.label + ". Shifts that run past midnight are not covered here." };
          } else {
            mins = day.outMin - day.inMin - brk;
            if (mins < 0) return { state: "error", message: "The break is longer than the shift on " + day.label + ". Shorten the break or check the times." };
          }
          totalMin += mins;
          rows.push([day.label, fmtNum(mins / 60, 2)]);
        }
        var totalH = totalMin / 60;
        var overtime = Math.max(0, totalH - 40);
        return { state: "ok", value: totalH, rows: rows, totalH: totalH,
                 overtime: overtime, rate: rate, pay: totalH * rate };
      },
      format: function (r) { return fmtNum(r.totalH, 2) + " hours"; },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.totalH, 2) + " hours",
          sentenceText: "This week: " + fmtNum(r.totalH, 2) + " hours in total, including " + fmtNum(r.overtime, 2) + " hours of overtime, at " + fmtMoney("USD", r.rate) + " an hour \u2014 pay " + fmtMoney("USD", r.pay) + "."
        });
        renderBar(ctx.bar, Math.min(100, r.totalH / 40 * 100));
        ctx.legendA.textContent = "Total hours: " + fmtNum(r.totalH, 2);
        ctx.legendB.textContent = "Hours against a 40-hour week";
        ctx.bar.setAttribute("aria-label", "Bar showing total hours against a 40-hour week");
        renderTable(ctx.breakBody, r.rows.concat([
          ["Total hours", fmtNum(r.totalH, 2)],
          ["Overtime hours", fmtNum(r.overtime, 2)],
          ["Hourly rate", fmtMoney("USD", r.rate)],
          ["Total pay", fmtMoney("USD", r.pay)]
        ]));
      }
    };
ENGINES["time-zone"] = {
      computeInputs: function (inputs) {
        var dateRaw = (inputs.date || "").trim();
        var timeRaw = (inputs.time || "").trim();
        var fromTz = (inputs.frm || "").trim();
        var toTz = (inputs.to || "").trim();
        if (dateRaw === "" || timeRaw === "" || fromTz === "" || toTz === "") return { state: "empty" };
        var dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateRaw);
        if (!dm) return { state: "error", message: "Pick a valid date." };
        var y = +dm[1], mo = +dm[2], dd = +dm[3];
        var check = new Date(Date.UTC(y, mo - 1, dd));
        if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== dd)
          return { state: "error", message: "That date does not exist. Pick a real date." };
        if (y < 1900 || y > 2100) return { state: "error", message: "Dates must be between 1900 and 2100." };
        var tm = parseHHMM(timeRaw);
        if (!tm) return { state: "error", message: "Type the time as HH:MM, with hours 00 to 23 and minutes 00 to 59 — for example, 14:00." };
        var utc;
        try {
          utc = wallToUtc(y, mo, dd, tm.h, tm.m, fromTz);
        } catch (e) {
          return { state: "error", message: "That time zone is not known to this browser." };
        }
        var dstParts, srcParts;
        try {
          dstParts = tzParts(toTz, utc);
          srcParts = tzParts(fromTz, utc);
        } catch (e2) {
          return { state: "error", message: "That time zone is not known to this browser." };
        }
        var offFrom = tzOffsetMinutes(fromTz, utc);
        var offTo = tzOffsetMinutes(toTz, utc);
        var result = ("0" + ((+dstParts.hour) % 24)).slice(-2) + ":" + dstParts.minute;
        return { state: "ok", value: result, dateRaw: dateRaw, timeRaw: timeRaw,
                 fromTz: fromTz, toTz: toTz, srcDate: fmtDayFromParts(srcParts),
                 dstDate: fmtDayFromParts(dstParts), diff: offTo - offFrom,
                 hour: (+dstParts.hour) % 24, minute: +dstParts.minute };
      },
      format: function (r) { return r.value; },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: r.value,
          sentenceText: r.timeRaw + " on " + r.srcDate + " in " + r.fromTz + " is " + r.value + " on " + r.dstDate + " in " + r.toTz + " (" + fmtDiffMinutes(r.diff) + ")."
        });
        renderBar(ctx.bar, (r.hour + r.minute / 60) / 24 * 100);
        ctx.legendA.textContent = "Time in " + r.toTz + ": " + r.value;
        ctx.legendB.textContent = "Time of day in the new zone";
        ctx.bar.setAttribute("aria-label", "Bar showing the time of day in the new zone");
        renderTable(ctx.breakBody, [
          ["Date", r.srcDate],
          ["Time in " + r.fromTz, r.timeRaw],
          ["Time in " + r.toTz, r.value],
          ["Difference", fmtDiffMinutes(r.diff)]
        ]);
      }
    };
ENGINES["z-score"] = {
      computeInputs: function (inputs) {
        var c = collectNums(inputs, [{ id: "v" }, { id: "m" }, { id: "s" }]);
        if (c.state !== "ok") return c;
        var v = c.vals;
        if (v.s < 0) return { state: "error", message: "The standard deviation cannot be below zero." };
        if (v.s === 0) return { state: "zero", message: "The standard deviation is zero, so the z-score cannot be worked out: the sum divides by the standard deviation, and dividing by zero has no answer." };
        return { state: "ok", value: (v.v - v.m) / v.s, v: v.v, m: v.m, s: v.s };
      },
      format: function (r) { return fmtNum(r.value, 4); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 4),
          sentenceText: "A value of " + fmtNum(r.v, 2) + " with a mean of " + fmtNum(r.m, 2) + " and a standard deviation of " + fmtNum(r.s, 2) + " has a z-score of " + fmtNum(r.value, 4) + "."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, (r.value + 3) / 6 * 100)));
        ctx.legendA.textContent = "Z-score: " + fmtNum(r.value, 4);
        ctx.legendB.textContent = "Shown on a scale from -3 to +3";
        ctx.bar.setAttribute("aria-label", "Bar showing the z-score on a scale from -3 to +3");
        renderTable(ctx.breakBody, [
          ["Value", fmtNum(r.v, 2)],
          ["Mean", fmtNum(r.m, 2)],
          ["Standard deviation", fmtNum(r.s, 2)],
          ["Difference from the mean", fmtNum(r.v - r.m, 2)],
          ["Z-score", fmtNum(r.value, 4)]
        ]);
      }
    };
