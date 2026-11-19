/* Calculatorly — stage 1 tool engines (33 tools).
   Loaded after assets/js/calculatorly.js; each entry fills the
   shared ENGINES registry. Helpers (fmtNum, tax tables, ...) come
   from the core file, which is why this file has no helpers. */
ENGINES["age"] = {
      compute: function (v) {
        var dobRaw = (v.dob || "").trim(), asofRaw = (v.asof || "").trim();
        if (dobRaw === "" || asofRaw === "") {
          return { state: "empty", message: "Pick your date of birth and the date to measure to, and your exact age appears here \u2014 no button to press." };
        }
        var dob = parseDate(dobRaw), asof = parseDate(asofRaw);
        if (!dob || !asof) return { state: "invalid", message: "One of the dates is not a real calendar date. Pick both dates from the calendar boxes." };
        if (dob < new Date(Date.UTC(1900, 0, 1))) return { state: "invalid", message: "The date of birth must be in 1900 or later. Please pick a later date." };
        if (asof < dob) return { state: "invalid", message: "The date of birth is after the date you are measuring to. Pick a birth date on or before that date." };
        var y = asof.getUTCFullYear() - dob.getUTCFullYear();
        var m = asof.getUTCMonth() - dob.getUTCMonth();
        var d = asof.getUTCDate() - dob.getUTCDate();
        if (d < 0) {
          m--;
          var prev = new Date(Date.UTC(asof.getUTCFullYear(), asof.getUTCMonth(), 0));
          d += prev.getUTCDate();
        }
        if (m < 0) { y--; m += 12; }
        var totalDays = Math.round((asof - dob) / 86400000);
        return { state: "ok", value: y, years: y, months: m, days: d, totalDays: totalDays, totalMonths: y * 12 + m, totalWeeks: Math.floor(totalDays / 7) };
      },
      format: function (r) {
        return r.years + (r.years === 1 ? " year, " : " years, ") + r.months + (r.months === 1 ? " month, " : " months, ") + r.days + (r.days === 1 ? " day" : " days");
      },
      render: function (ctx, r) {
        var text = r.years + (r.years === 1 ? " year, " : " years, ") + r.months + (r.months === 1 ? " month, " : " months, ") + r.days + (r.days === 1 ? " day" : " days");
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: text,
          sentenceText: "Your age is " + text + " \u2014 that is " + fmtNum(r.totalDays, 0) + " days in total."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, r.years)));
        ctx.legendA.textContent = "Age: " + text;
        ctx.legendB.textContent = "Total days lived: " + fmtNum(r.totalDays, 0);
        ctx.bar.setAttribute("aria-label", "Bar showing age in years " + r.years + " on a scale to 100");
        renderTable(ctx.breakBody, [
          ["Age (your result)", text],
          ["Total months", fmtNum(r.totalMonths, 0)],
          ["Total weeks", fmtNum(r.totalWeeks, 0)],
          ["Total days", fmtNum(r.totalDays, 0)]
        ]);
      }
    };
ENGINES["auto-loan"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "price", label: "Car price", min: 0 }, { id: "deposit", label: "Deposit", min: 0 }, { id: "rate", label: "Interest rate", min: 0, max: 100 }, { id: "years", label: "Term in years", min: 0, allowZero: false, max: 10 }],
          "Type the car price, deposit, interest rate and term and the monthly payment appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var price = g.values.price, deposit = g.values.deposit, rate = g.values.rate, years = g.values.years;
        if (deposit > price) {
          return { state: "invalid", message: "The deposit cannot be more than the car price. Please lower the deposit or raise the price." };
        }
        var borrowed = price - deposit;
        var pay = monthlyPayment(borrowed, rate, years);
        var total = pay * years * 12;
        return { state: "ok", value: pay, price: price, deposit: deposit, borrowed: borrowed, rate: rate, years: years, total: total, interest: total - borrowed };
      },
      format: function (r) { return fmtNum(r.value, 2); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 2),
          sentenceText: "Your monthly payment is " + fmtNum(r.value, 2) + " for borrowing " + fmtNum(r.borrowed, 2) +
            " (a car priced at " + fmtNum(r.price, 2) + " less a deposit of " + fmtNum(r.deposit, 2) + ") over " +
            fmtNum(r.years, 0) + " years at " + fmtNum(r.rate, 2) + "% a year, in your own currency."
        });
        renderBar(ctx.bar, r.total > 0 ? r.interest / r.total * 100 : 0);
        ctx.legendA.textContent = "Total interest: " + fmtNum(r.interest, 2);
        ctx.legendB.textContent = "Amount borrowed: " + fmtNum(r.borrowed, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing total interest " + fmtNum(r.interest, 2) + " out of the total paid " + fmtNum(r.total, 2));
        renderTable(ctx.breakBody, [
          ["Car price", fmtNum(r.price, 2)],
          ["Deposit", "\u2212" + fmtNum(r.deposit, 2)],
          ["Amount borrowed", fmtNum(r.borrowed, 2)],
          ["Monthly payment (your result)", fmtNum(r.value, 2)],
          ["Total interest", fmtNum(r.interest, 2)],
          ["Total paid over " + fmtNum(r.years, 0) + " years", fmtNum(r.total, 2)]
        ]);
      }
    };
ENGINES["bmi"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "weight", label: "Weight", min: 0 }, { id: "height", label: "Height", min: 0 }],
          "Type your weight and height and your BMI appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var w = g.values.weight, h = g.values.height;
        var units = v.units || "metric";
        if (units === "metric") {
          if (h < 50 || h > 250) return { state: "invalid", message: "Height in centimetres must be between 50 and 250. Please enter a height in that range." };
          if (w < 10 || w > 400) return { state: "invalid", message: "Weight in kilograms must be between 10 and 400. Please enter a weight in that range." };
        } else {
          if (h < 20 || h > 100) return { state: "invalid", message: "Height in inches must be between 20 and 100. Please enter a height in that range." };
          if (w < 22 || w > 880) return { state: "invalid", message: "Weight in pounds must be between 22 and 880. Please enter a weight in that range." };
        }
        var bmi = (units === "metric") ? w / Math.pow(h / 100, 2) : 703 * w / (h * h);
        var cat = (bmi < 18.5) ? "underweight" : (bmi < 25) ? "a healthy weight" : (bmi < 30) ? "overweight" : "obesity";
        var hm = (units === "metric") ? h / 100 : h * 0.0254;
        var low = 18.5 * hm * hm, high = 24.9 * hm * hm;
        var unitW = (units === "metric") ? " kg" : " lb";
        return { state: "ok", value: bmi, weight: w, height: h, units: units, cat: cat,
                 low: (units === "metric") ? low : low * 2.20462, high: (units === "metric") ? high : high * 2.20462, unitW: unitW };
      },
      format: function (r) { return fmtNum(r.value, 1); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 1),
          sentenceText: "Your BMI is " + fmtNum(r.value, 1) + " (" + r.cat + "). BMI is a guide only \u2014 it does not measure body fat, muscle or health on its own."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, r.value / 40 * 100)));
        ctx.legendA.textContent = "Your BMI: " + fmtNum(r.value, 1);
        ctx.legendB.textContent = "Healthy weight for your height: " + fmtNum(r.low, 1) + " to " + fmtNum(r.high, 1) + r.unitW;
        ctx.bar.setAttribute("aria-label", "Bar showing your BMI " + fmtNum(r.value, 1) + " on a scale to 40");
        renderTable(ctx.breakBody, [
          ["Weight", fmtNum(r.weight, 1) + r.unitW],
          ["Height", fmtNum(r.height, 1) + (r.units === "metric" ? " cm" : " in")],
          ["BMI (your result)", fmtNum(r.value, 1)],
          ["Category", r.cat],
          ["Healthy weight range for your height", fmtNum(r.low, 1) + " to " + fmtNum(r.high, 1) + r.unitW]
        ]);
      }
    };
ENGINES["bmr"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "weight", label: "Weight in kilograms", min: 30, max: 300 }, { id: "height", label: "Height in centimetres", min: 100, max: 250 }, { id: "age", label: "Age in years", min: 10, max: 100 }],
          "Type your weight, height, age and sex and your resting burn appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var w = g.values.weight, h = g.values.height, age = g.values.age;
        var sex = v.sex || "male";
        var bmr = 10 * w + 6.25 * h - 5 * age + (sex === "female" ? -161 : 5);
        return { state: "ok", value: Math.round(bmr), weight: w, height: h, age: age, sex: sex, bmr: Math.round(bmr) };
      },
      format: function (r) { return fmtNum(r.value, 0); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 0),
          sentenceText: "Your basal metabolic rate (BMR) is about " + fmtNum(r.value, 0) + " calories a day \u2014 what your body burns at complete rest. Moving around and exercise burn more on top of this."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, r.value / 3000 * 100)));
        ctx.legendA.textContent = "BMR: " + fmtNum(r.value, 0) + " calories a day";
        ctx.legendB.textContent = "Daily need with light activity: " + fmtNum(Math.round(r.value * 1.375), 0) + " calories";
        ctx.bar.setAttribute("aria-label", "Bar showing BMR " + fmtNum(r.value, 0) + " on a scale to 3,000");
        renderTable(ctx.breakBody, [
          ["BMR at rest (your result)", fmtNum(r.value, 0) + " calories a day"],
          ["Daily need, little exercise (BMR \u00d7 1.2)", fmtNum(Math.round(r.value * 1.2), 0) + " calories a day"],
          ["Daily need, light exercise (BMR \u00d7 1.375)", fmtNum(Math.round(r.value * 1.375), 0) + " calories a day"],
          ["Daily need, moderate exercise (BMR \u00d7 1.55)", fmtNum(Math.round(r.value * 1.55), 0) + " calories a day"]
        ]);
      }
    };
ENGINES["calorie-tdee"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "weight", label: "Weight in kilograms", min: 30, max: 300 }, { id: "height", label: "Height in centimetres", min: 100, max: 250 }, { id: "age", label: "Age in years", min: 10, max: 100 }],
          "Type your weight, height, age and activity level and your daily calories appear here \u2014 no button to press.");
        if (!g.ok) return g;
        var w = g.values.weight, h = g.values.height, age = g.values.age;
        var sex = v.sex || "male";
        var act = Number(v.activity) || 1.55;
        var bmr = 10 * w + 6.25 * h - 5 * age + (sex === "female" ? -161 : 5);
        var tdee = Math.round(bmr * act);
        return { state: "ok", value: tdee, weight: w, height: h, age: age, sex: sex, act: act, bmr: Math.round(bmr) };
      },
      format: function (r) { return fmtNum(r.value, 0); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 0),
          sentenceText: "Your daily calorie need (TDEE) is about " + fmtNum(r.value, 0) + " calories a day. That is your resting burn of " +
            fmtNum(r.bmr, 0) + " calories times an activity factor of " + r.act + ". It is a guide only, not a diet plan."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, r.value / 4000 * 100)));
        ctx.legendA.textContent = "Daily calories (TDEE): " + fmtNum(r.value, 0);
        ctx.legendB.textContent = "Resting burn (BMR): " + fmtNum(r.bmr, 0);
        ctx.bar.setAttribute("aria-label", "Bar showing daily calories " + fmtNum(r.value, 0) + " on a scale to 4,000");
        renderTable(ctx.breakBody, [
          ["Resting burn (BMR)", fmtNum(r.bmr, 0) + " calories a day"],
          ["Activity factor", String(r.act)],
          ["Daily calories, TDEE (your result)", fmtNum(r.value, 0) + " calories a day"],
          ["To lose about half a kilogram a week", fmtNum(r.value - 500, 0) + " calories a day"],
          ["To gain weight slowly", fmtNum(r.value + 500, 0) + " calories a day"]
        ]);
      }
    };
ENGINES["compound-interest"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "principal", label: "Starting amount", min: 0 }, { id: "rate", label: "Yearly interest rate", min: 0, max: 100 }, { id: "years", label: "Years", min: 0, allowZero: false, max: 100 }],
          "Type the starting amount, yearly rate and years and the future value appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var p = g.values.principal, rate = g.values.rate, years = g.values.years;
        var n = Number(v.times) || 12;
        var fv = p * Math.pow(1 + rate / 100 / n, n * years);
        var eff = (Math.pow(1 + rate / 100 / n, n) - 1) * 100;
        return { state: "ok", value: fv, principal: p, rate: rate, years: years, n: n, interest: fv - p, eff: eff };
      },
      format: function (r) { return fmtNum(r.value, 2); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 2),
          sentenceText: fmtNum(r.principal, 2) + " grows to " + fmtNum(r.value, 2) + " in " + fmtNum(r.years, 0) +
            " years at " + fmtNum(r.rate, 2) + "% a year, compounded " + (r.n === 1 ? "once a year" : r.n + " times a year") + ", in your own currency."
        });
        renderBar(ctx.bar, r.value > 0 ? r.interest / r.value * 100 : 0);
        ctx.legendA.textContent = "Interest earned: " + fmtNum(r.interest, 2);
        ctx.legendB.textContent = "Starting amount: " + fmtNum(r.principal, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing interest earned " + fmtNum(r.interest, 2) + " out of the future value " + fmtNum(r.value, 2));
        renderTable(ctx.breakBody, [
          ["Starting amount", fmtNum(r.principal, 2)],
          ["Interest earned", fmtNum(r.interest, 2)],
          ["Future value (your result)", fmtNum(r.value, 2)],
          ["Effective yearly rate", fmtPct(r.eff)]
        ]);
      }
    };
ENGINES["date"] = {
      compute: function (v) {
        var startRaw = (v.start || "").trim(), secondRaw = (v.second || "").trim();
        if (startRaw === "" || secondRaw === "") {
          return { state: "empty", message: "Pick the two dates and type the number of days, and the answer appears here \u2014 no button to press." };
        }
        var start = parseDate(startRaw), second = parseDate(secondRaw);
        if (!start || !second) return { state: "invalid", message: "One of the dates is not a real calendar date. Pick both dates from the calendar boxes." };
        if (start.getUTCFullYear() < 1900 || start.getUTCFullYear() > 2100 || second.getUTCFullYear() < 1900 || second.getUTCFullYear() > 2100) {
          return { state: "invalid", message: "Both dates must be between 1900 and 2100. Please pick dates inside that range." };
        }
        var g = readNums(v, [{ id: "days", label: "Number of days", min: 0, max: 36500 }],
          "Type the number of days as well, and the answer appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var days = g.values.days;
        var between = Math.round(Math.abs(second - start) / 86400000);
        var dir = v.direction || "after";
        var shifted = new Date(start.getTime() + (dir === "before" ? -days : days) * 86400000);
        var other = new Date(start.getTime() + (dir === "before" ? days : -days) * 86400000);
        return { state: "ok", value: between, start: start, second: second, days: days, dir: dir, shifted: shifted, other: other };
      },
      format: function (r) { return r.value + (r.value === 1 ? " day" : " days"); },
      render: function (ctx, r) {
        var betweenText = r.value + (r.value === 1 ? " day" : " days");
        var shiftLabel = (r.dir === "before" ? fmtNum(r.days, 0) + " days before " : fmtNum(r.days, 0) + " days after ");
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: betweenText,
          sentenceText: "There are " + betweenText + " between " + fmtDateLong(r.start) + " and " + fmtDateLong(r.second) + ". " +
            shiftLabel + fmtDateLong(r.start) + " is " + fmtDateLong(r.shifted) + "."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, r.value / 365 * 100)));
        ctx.legendA.textContent = "Days between the dates: " + betweenText;
        ctx.legendB.textContent = shiftLabel + fmtDateLong(r.start) + ": " + fmtDateLong(r.shifted);
        ctx.bar.setAttribute("aria-label", "Bar showing " + betweenText + " on a scale to one year");
        renderTable(ctx.breakBody, [
          ["Days between the two dates (your result)", betweenText],
          [fmtNum(r.days, 0) + " days after " + fmtDateLong(r.start), fmtDateLong(new Date(r.start.getTime() + r.days * 86400000))],
          [fmtNum(r.days, 0) + " days before " + fmtDateLong(r.start), fmtDateLong(new Date(r.start.getTime() - r.days * 86400000))]
        ]);
      }
    };
ENGINES["discount"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "price", label: "Price", min: 0 }, { id: "pct", label: "Discount", min: 0, max: 100 }],
          "Type the price and the discount percent and the sale price appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var price = g.values.price, pct = g.values.pct;
        var saved = price * pct / 100;
        return { state: "ok", value: price - saved, price: price, pct: pct, saved: saved };
      },
      format: function (r) { return fmtNum(r.value, 2); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 2),
          sentenceText: "The sale price is " + fmtNum(r.value, 2) + " after saving " + fmtNum(r.saved, 2) +
            " (" + fmtNum(r.pct, 2) + "% off the price of " + fmtNum(r.price, 2) + ")."
        });
        renderBar(ctx.bar, r.price > 0 ? r.value / r.price * 100 : 0);
        ctx.legendA.textContent = "Sale price: " + fmtNum(r.value, 2);
        ctx.legendB.textContent = "You save: " + fmtNum(r.saved, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing the sale price " + fmtNum(r.value, 2) + " out of the full price " + fmtNum(r.price, 2));
        renderTable(ctx.breakBody, [
          ["Full price", fmtNum(r.price, 2)],
          ["Discount (" + fmtNum(r.pct, 2) + "%)", "\u2212" + fmtNum(r.saved, 2)],
          ["You save", fmtNum(r.saved, 2)],
          ["Sale price (your result)", fmtNum(r.value, 2)]
        ]);
      }
    };
ENGINES["fraction"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "n1", label: "First top number", min: -LIMIT, max: LIMIT }, { id: "d1", label: "First bottom number", min: -LIMIT, max: LIMIT }, { id: "n2", label: "Second top number", min: -LIMIT, max: LIMIT }, { id: "d2", label: "Second bottom number", min: -LIMIT, max: LIMIT }],
          "Type both fractions and pick the operation, and the answer appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var n1 = g.values.n1, d1 = g.values.d1, n2 = g.values.n2, d2 = g.values.d2;
        if (d1 === 0 || d2 === 0) return { state: "invalid", message: "A fraction cannot have zero on the bottom. Change any zero bottom number to another number." };
        if (!Number.isInteger(n1) || !Number.isInteger(d1) || !Number.isInteger(n2) || !Number.isInteger(d2)) {
          return { state: "invalid", message: "Fractions need whole numbers on the top and bottom. Type whole numbers, for example 1 over 2." };
        }
        var op = v.op || "add";
        var num, den;
        if (op === "add") { num = n1 * d2 + n2 * d1; den = d1 * d2; }
        else if (op === "subtract") { num = n1 * d2 - n2 * d1; den = d1 * d2; }
        else if (op === "multiply") { num = n1 * n2; den = d1 * d2; }
        else {
          if (n2 === 0) return { state: "invalid", message: "You cannot divide by a fraction worth zero. Change the second fraction to one that is not zero." };
          num = n1 * d2; den = d1 * n2;
        }
        if (den < 0) { num = -num; den = -den; }
        var a = Math.abs(num), b = Math.abs(den);
        while (b !== 0) { var t = a % b; a = b; b = t; }
        var gcd = a || 1;
        num = num / gcd; den = den / gcd;
        var dec = num / den;
        return { state: "ok", value: dec, num: num, den: den, n1: n1, d1: d1, n2: n2, d2: d2, op: op };
      },
      format: function (r) { return (r.den === 1) ? String(r.num) : r.num + "/" + r.den; },
      render: function (ctx, r) {
        var opSym = { add: "+", subtract: "\u2212", multiply: "\u00d7", divide: "\u00f7" }[r.op] || "+";
        var frac = (r.den === 1) ? String(r.num) : r.num + "/" + r.den;
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: frac,
          sentenceText: r.n1 + "/" + r.d1 + " " + opSym + " " + r.n2 + "/" + r.d2 + " = " + frac + " (about " + fmtNum(r.value, 2) + " as a decimal)."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, Math.abs(r.value) * 100)));
        ctx.legendA.textContent = "Answer: " + frac;
        ctx.legendB.textContent = "As a decimal: " + fmtNum(r.value, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing the answer " + frac + " as a share of 1");
        renderTable(ctx.breakBody, [
          ["First fraction", r.n1 + "/" + r.d1],
          ["Second fraction", r.n2 + "/" + r.d2],
          ["Answer as a fraction (your result)", frac],
          ["Answer as a decimal", fmtNum(r.value, 2)]
        ]);
      }
    };
ENGINES["income-tax-au"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }],
          "Type the yearly salary and the income tax appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var salary = g.values.salary;
        var tax = auTax(salary);
        return { state: "ok", value: tax, salary: salary, taxable: salary, monthly: tax / 12, eff: salary > 0 ? tax / salary * 100 : 0 };
      },
      format: function (r) { return fmtMoney("AUD", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("AUD", r.value),
          sentenceText: "Your income tax is " + fmtMoney("AUD", r.value) + " a year on a salary of " + fmtMoney("AUD", r.salary) +
            ", worked out with no deductions or offsets claimed. The Medicare levy is not included."
        });
        renderBar(ctx.bar, r.salary > 0 ? r.value / r.salary * 100 : 0);
        ctx.legendA.textContent = "Income tax: " + fmtMoney("AUD", r.value);
        ctx.legendB.textContent = "Tax-free threshold: A$18,200";
        ctx.bar.setAttribute("aria-label", "Bar showing income tax " + fmtMoney("AUD", r.value) + " out of the salary " + fmtMoney("AUD", r.salary));
        renderTable(ctx.breakBody, [
          ["Gross salary", fmtMoney("AUD", r.salary)],
          ["Tax-free threshold", "A$18,200"],
          ["Income tax (your result)", fmtMoney("AUD", r.value)],
          ["Income tax a month", fmtMoney("AUD", r.monthly)],
          ["Effective tax rate", fmtPct(r.eff)]
        ]);
      }
    };
ENGINES["income-tax-ca"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }],
          "Type the yearly salary and the federal income tax appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var salary = g.values.salary;
        var gross = cents(marginalTax(salary, CA_BRACKETS));
        var bpa = cents(caBpa(salary));
        var credit = cents(bpa * 0.14);
        var tax = caFederalTax(salary);
        return { state: "ok", value: tax, salary: salary, gross: gross, bpa: bpa, credit: credit, monthly: tax / 12, eff: salary > 0 ? tax / salary * 100 : 0 };
      },
      format: function (r) { return fmtMoney("CAD", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("CAD", r.value),
          sentenceText: "Your federal income tax is " + fmtMoney("CAD", r.value) + " a year on a salary of " + fmtMoney("CAD", r.salary) +
            ", after the basic personal amount credit of " + fmtMoney("CAD", r.credit) + ". Provincial tax is not included."
        });
        renderBar(ctx.bar, r.salary > 0 ? r.value / r.salary * 100 : 0);
        ctx.legendA.textContent = "Federal income tax: " + fmtMoney("CAD", r.value);
        ctx.legendB.textContent = "Basic personal amount: " + fmtMoney("CAD", r.bpa);
        ctx.bar.setAttribute("aria-label", "Bar showing federal income tax " + fmtMoney("CAD", r.value) + " out of the salary " + fmtMoney("CAD", r.salary));
        renderTable(ctx.breakBody, [
          ["Gross salary", fmtMoney("CAD", r.salary)],
          ["Tax on the brackets, before credits", fmtMoney("CAD", r.gross)],
          ["Basic personal amount", fmtMoney("CAD", r.bpa)],
          ["Credit at 14% (basic personal amount \u00d7 14%)", "\u2212" + fmtMoney("CAD", r.credit)],
          ["Federal income tax (your result)", fmtMoney("CAD", r.value)],
          ["Federal tax a month", fmtMoney("CAD", r.monthly)],
          ["Effective tax rate", fmtPct(r.eff)]
        ]);
      }
    };
ENGINES["income-tax-uk"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }, { id: "code", label: "Tax code number", min: 0, max: 9999 }],
          "Type the yearly salary and tax code number and the income tax appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var salary = g.values.salary, code = g.values.code;
        var pa = code * 10;
        if (salary > 100000) pa = Math.max(0, pa - (salary - 100000) / 2);
        var taxable = Math.max(0, salary - pa);
        var tax = ukTax(salary, code);
        return { state: "ok", value: tax, salary: salary, code: code, pa: cents(pa), taxable: cents(taxable), monthly: tax / 12, eff: salary > 0 ? tax / salary * 100 : 0 };
      },
      format: function (r) { return fmtMoney("GBP", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("GBP", r.value),
          sentenceText: "Your income tax is " + fmtMoney("GBP", r.value) + " a year on a salary of " + fmtMoney("GBP", r.salary) +
            ", after a personal allowance of " + fmtMoney("GBP", r.pa) + " on tax code " + fmtNum(r.code, 0) + "L. National Insurance is not included."
        });
        renderBar(ctx.bar, r.salary > 0 ? r.value / r.salary * 100 : 0);
        ctx.legendA.textContent = "Income tax: " + fmtMoney("GBP", r.value);
        ctx.legendB.textContent = "Taxable income: " + fmtMoney("GBP", r.taxable);
        ctx.bar.setAttribute("aria-label", "Bar showing income tax " + fmtMoney("GBP", r.value) + " out of the salary " + fmtMoney("GBP", r.salary));
        renderTable(ctx.breakBody, [
          ["Gross salary", fmtMoney("GBP", r.salary)],
          ["Personal allowance", "\u2212" + fmtMoney("GBP", r.pa)],
          ["Taxable income", fmtMoney("GBP", r.taxable)],
          ["Income tax (your result)", fmtMoney("GBP", r.value)],
          ["Income tax a month", fmtMoney("GBP", r.monthly)],
          ["Effective tax rate", fmtPct(r.eff)]
        ]);
      }
    };
ENGINES["income-tax-us"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }],
          "Type the yearly salary and pick a filing status and the federal income tax appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var salary = g.values.salary;
        var status = v.status || "single";
        var ded = US_STD_DED[status] || US_STD_DED.single;
        var taxable = Math.max(0, salary - ded);
        var tax = usFederalTax(salary, status);
        return { state: "ok", value: tax, salary: salary, status: status, ded: ded, taxable: taxable, monthly: tax / 12, eff: salary > 0 ? tax / salary * 100 : 0 };
      },
      format: function (r) { return fmtMoney("USD", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("USD", r.value),
          sentenceText: "Your federal income tax is " + fmtMoney("USD", r.value) + " a year on a salary of " + fmtMoney("USD", r.salary) +
            ", after the " + fmtMoney("USD", r.ded) + " standard deduction. State tax and FICA are not included."
        });
        renderBar(ctx.bar, r.salary > 0 ? r.value / r.salary * 100 : 0);
        ctx.legendA.textContent = "Federal income tax: " + fmtMoney("USD", r.value);
        ctx.legendB.textContent = "Taxable income: " + fmtMoney("USD", r.taxable);
        ctx.bar.setAttribute("aria-label", "Bar showing federal income tax " + fmtMoney("USD", r.value) + " out of the salary " + fmtMoney("USD", r.salary));
        renderTable(ctx.breakBody, [
          ["Gross salary", fmtMoney("USD", r.salary)],
          ["Standard deduction", "\u2212" + fmtMoney("USD", r.ded)],
          ["Taxable income", fmtMoney("USD", r.taxable)],
          ["Federal income tax (your result)", fmtMoney("USD", r.value)],
          ["Federal tax a month", fmtMoney("USD", r.monthly)],
          ["Effective tax rate", fmtPct(r.eff)]
        ]);
      }
    };
ENGINES["interest-rate-apy"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "rate", label: "Nominal yearly rate", min: 0, max: 100 }],
          "Type the nominal yearly rate and the yearly yield appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var rate = g.values.rate;
        var n = Number(v.times) || 12;
        var apy = (Math.pow(1 + rate / 100 / n, n) - 1) * 100;
        return { state: "ok", value: apy, rate: rate, n: n, grown: 100 * (1 + apy / 100) };
      },
      format: function (r) { return fmtPct(r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtPct(r.value),
          sentenceText: "The yearly yield (APY) is " + fmtPct(r.value) + " for a nominal rate of " + fmtNum(r.rate, 2) +
            "% a year compounded " + (r.n === 1 ? "once a year" : r.n + " times a year") + "."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, r.value)));
        ctx.legendA.textContent = "APY: " + fmtPct(r.value);
        ctx.legendB.textContent = "Nominal rate: " + fmtPct(r.rate);
        ctx.bar.setAttribute("aria-label", "Bar showing the yearly yield " + fmtPct(r.value));
        renderTable(ctx.breakBody, [
          ["Nominal yearly rate", fmtPct(r.rate)],
          ["Times compounded a year", String(r.n)],
          ["Yearly yield, APY (your result)", fmtPct(r.value)],
          ["What 100 grows to in one year", fmtNum(r.grown, 2)]
        ]);
      }
    };
ENGINES["loan"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "loan", label: "Loan amount", min: 0 }, { id: "rate", label: "Interest rate", min: 0, max: 100 }, { id: "years", label: "Term in years", min: 0, allowZero: false, max: 50 }],
          "Type the loan amount, interest rate and term and the monthly payment appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var loan = g.values.loan, rate = g.values.rate, years = g.values.years;
        var pay = monthlyPayment(loan, rate, years);
        var total = pay * years * 12;
        return { state: "ok", value: pay, loan: loan, rate: rate, years: years, total: total, interest: total - loan };
      },
      format: function (r) { return fmtNum(r.value, 2); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 2),
          sentenceText: "Your monthly payment is " + fmtNum(r.value, 2) + " for a loan of " + fmtNum(r.loan, 2) +
            " over " + fmtNum(r.years, 0) + " years at " + fmtNum(r.rate, 2) + "% a year, in your own currency."
        });
        renderBar(ctx.bar, r.total > 0 ? r.interest / r.total * 100 : 0);
        ctx.legendA.textContent = "Total interest: " + fmtNum(r.interest, 2);
        ctx.legendB.textContent = "Amount borrowed: " + fmtNum(r.loan, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing total interest " + fmtNum(r.interest, 2) + " out of the total paid " + fmtNum(r.total, 2));
        renderTable(ctx.breakBody, [
          ["Amount borrowed", fmtNum(r.loan, 2)],
          ["Monthly payment (your result)", fmtNum(r.value, 2)],
          ["Total interest", fmtNum(r.interest, 2)],
          ["Total paid over " + fmtNum(r.years, 0) + " years", fmtNum(r.total, 2)]
        ]);
      }
    };
ENGINES["mortgage"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "loan", label: "Loan amount", min: 0 }, { id: "rate", label: "Interest rate", min: 0, max: 100 }, { id: "years", label: "Term in years", min: 0, allowZero: false, max: 50 }],
          "Type the loan amount, interest rate and term and the monthly payment appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var loan = g.values.loan, rate = g.values.rate, years = g.values.years;
        var pay = monthlyPayment(loan, rate, years);
        var n = years * 12;
        var total = pay * n;
        return { state: "ok", value: pay, loan: loan, rate: rate, years: years, total: total, interest: total - loan, country: v.country || "uk" };
      },
      format: function (r) {
        var sym = { uk: "\u00A3", us: "$", au: "A$", ca: "C$" }[r.country] || "\u00A3";
        return sym + fmtNum(r.value, 2);
      },
      render: function (ctx, r) {
        var cur = { uk: "GBP", us: "USD", au: "AUD", ca: "CAD" }[r.country] || "GBP";
        var note = {
          uk: "United Kingdom \u2014 payment in pounds (\u00A3). Lender fees and insurance are not included.",
          us: "USA \u2014 payment in dollars ($). Taxes, insurance and lender fees are not included.",
          au: "Australia \u2014 payment in Australian dollars (A$). Lender fees and insurance are not included.",
          ca: "Canada \u2014 payment in Canadian dollars (C$). Taxes, insurance and lender fees are not included."
        }[r.country] || "";
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney(cur, r.value),
          sentenceText: "Your monthly payment is " + fmtMoney(cur, r.value) + " for a loan of " + fmtMoney(cur, r.loan) +
            " over " + fmtNum(r.years, 0) + " years at " + fmtNum(r.rate, 2) + "% a year."
        });
        renderBar(ctx.bar, r.total > 0 ? r.interest / r.total * 100 : 0);
        ctx.legendA.textContent = "Total interest: " + fmtMoney(cur, r.interest);
        ctx.legendB.textContent = note;
        ctx.bar.setAttribute("aria-label", "Bar showing total interest " + fmtMoney(cur, r.interest) + " out of the total paid " + fmtMoney(cur, r.total));
        renderTable(ctx.breakBody, [
          ["Loan amount", fmtMoney(cur, r.loan)],
          ["Monthly payment (your result)", fmtMoney(cur, r.value)],
          ["Total interest", fmtMoney(cur, r.interest)],
          ["Total paid over " + fmtNum(r.years, 0) + " years", fmtMoney(cur, r.total)]
        ]);
      }
    };
ENGINES["percentage-increase-decrease"] = {
      compute: function (v) {
        var s = baseState(v.a, v.b);
        if (s.state !== "ok") return s;
        if (s.a === 0) return { state: "zero" };
        return { state: "ok", value: ((s.b - s.a) / s.a) * 100, a: s.a, b: s.b };
      },
      format: function (r) {
        var w = r.value > 0 ? " increase" : (r.value < 0 ? " decrease" : " no change");
        return (r.value >= 0 ? "+" : "") + fmtPct(r.value) + w;
      },
      render: function (ctx, r) {
        var diff = r.b - r.a;
        var word = r.value > 0 ? "an increase" : (r.value < 0 ? "a decrease" : "no change");
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: (r.value >= 0 ? "+" : "") + fmtPct(r.value),
          sentenceText: "From " + fmtNum(r.a, 2) + " to " + fmtNum(r.b, 2) + " is " + word + " of " + fmtNum(Math.abs(r.value), 2) + "%."
        });
        var maxV = Math.max(Math.abs(r.a), Math.abs(r.b));
        renderBar(ctx.bar, maxV > 0 ? Math.abs(r.b) / maxV * 100 : 0);
        ctx.legendA.textContent = "New value: " + fmtNum(r.b, 2);
        ctx.legendB.textContent = "Measured against the larger of the two values";
        ctx.bar.setAttribute("aria-label", "Bar showing the new value " + fmtNum(r.b, 2) + " against the old value " + fmtNum(r.a, 2));
        renderTable(ctx.breakBody, [
          ["Old value", fmtNum(r.a, 2)],
          ["New value", fmtNum(r.b, 2)],
          ["Difference (" + fmtNum(r.b, 2) + " \u2212 " + fmtNum(r.a, 2) + ")", fmtNum(diff, 2)],
          ["Change (your result)", (r.value >= 0 ? "+" : "") + fmtPct(r.value)]
        ]);
      }
    };
ENGINES["percentage-of-a-number"] = {
      compute: function (v) {
        var s = baseState(v.a, v.b);
        if (s.state !== "ok") return s;
        return { state: "ok", value: (s.a / 100) * s.b, a: s.a, b: s.b };
      },
      format: function (r) { return fmtNum(r.value, 2); },
      render: function (ctx, r) {
        var part = r.value, rest = r.b - part;
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(part, 2),
          sentenceText: fmtNum(r.a, 2) + "% of " + fmtNum(r.b, 2) + " is " + fmtNum(part, 2) + "."
        });
        var share = Math.abs(r.b) > 0 ? Math.max(0, Math.min(100, Math.abs(part) / Math.abs(r.b) * 100)) : 0;
        renderBar(ctx.bar, share);
        ctx.legendA.textContent = "Your result: " + fmtNum(part, 2);
        ctx.legendB.textContent = "The rest: " + fmtNum(rest, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing " + fmtNum(part, 2) + " out of " + fmtNum(r.b, 2));
        renderTable(ctx.breakBody, [
          ["1% of " + fmtNum(r.b, 2), fmtNum(r.b / 100, 2)],
          ["10% of " + fmtNum(r.b, 2), fmtNum(r.b / 10, 2)],
          [fmtNum(r.a, 2) + "% of " + fmtNum(r.b, 2) + " (your result)", fmtNum(part, 2)],
          ["What is left (" + fmtNum(r.b, 2) + " \u2212 " + fmtNum(part, 2) + ")", fmtNum(rest, 2)],
          ["Whole number", fmtNum(r.b, 2)]
        ]);
      }
    };
ENGINES["retirement"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "current", label: "Current savings", min: 0 }, { id: "monthly", label: "Monthly saving", min: 0 }, { id: "rate", label: "Yearly growth rate you expect", min: 0, max: 100 }, { id: "years", label: "Years until retirement", min: 0, allowZero: false, max: 80 }],
          "Type your current savings, monthly saving, expected yearly growth and years, and the projection appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var cur = g.values.current, mon = g.values.monthly, rate = g.values.rate, years = g.values.years;
        var r = rate / 100 / 12, n = years * 12;
        var growth = Math.pow(1 + r, n);
        var fv = (r === 0) ? cur + mon * n : cur * growth + mon * (growth - 1) / r;
        var paid = cur + mon * n;
        return { state: "ok", value: fv, current: cur, monthly: mon, rate: rate, years: years, paid: paid, growth: fv - paid };
      },
      format: function (r) { return fmtNum(r.value, 2); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 2),
          sentenceText: "Your savings could be worth " + fmtNum(r.value, 2) + " in " + fmtNum(r.years, 0) +
            " years if they grow at " + fmtNum(r.rate, 2) + "% a year and you save " + fmtNum(r.monthly, 2) +
            " a month, in your own currency. The growth rate is your own assumption, not a promise."
        });
        renderBar(ctx.bar, r.value > 0 ? r.growth / r.value * 100 : 0);
        ctx.legendA.textContent = "Growth: " + fmtNum(r.growth, 2);
        ctx.legendB.textContent = "What you pay in: " + fmtNum(r.paid, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing growth " + fmtNum(r.growth, 2) + " out of the projected pot " + fmtNum(r.value, 2));
        renderTable(ctx.breakBody, [
          ["Current savings", fmtNum(r.current, 2)],
          ["Monthly saving", fmtNum(r.monthly, 2)],
          ["Total you pay in", fmtNum(r.paid, 2)],
          ["Growth at " + fmtNum(r.rate, 2) + "% a year", fmtNum(r.growth, 2)],
          ["Projected pot (your result)", fmtNum(r.value, 2)]
        ]);
      }
    };
ENGINES["salary-to-hourly"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }, { id: "hours", label: "Hours per week", min: 0, allowZero: false, max: 168 }, { id: "weeks", label: "Weeks worked a year", min: 0, allowZero: false, max: 52 }],
          "Type the yearly salary, hours per week and weeks a year and the hourly rate appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var s = g.values.salary, h = g.values.hours, w = g.values.weeks;
        var hoursYear = h * w;
        return { state: "ok", value: s / hoursYear, salary: s, hours: h, weeks: w, hoursYear: hoursYear };
      },
      format: function (r) { return fmtNum(r.value, 2); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 2),
          sentenceText: "Your hourly rate is " + fmtNum(r.value, 2) + " for a yearly salary of " + fmtNum(r.salary, 2) +
            " at " + fmtNum(r.hours, 0) + " hours a week for " + fmtNum(r.weeks, 0) + " weeks a year, in your own currency."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, r.value)));
        ctx.legendA.textContent = "Hourly rate: " + fmtNum(r.value, 2);
        ctx.legendB.textContent = "Hours a year: " + fmtNum(r.hoursYear, 0);
        ctx.bar.setAttribute("aria-label", "Bar showing the hourly rate " + fmtNum(r.value, 2));
        renderTable(ctx.breakBody, [
          ["Yearly salary", fmtNum(r.salary, 2)],
          ["Hours per week", fmtNum(r.hours, 0)],
          ["Weeks a year", fmtNum(r.weeks, 0)],
          ["Hours a year", fmtNum(r.hoursYear, 0)],
          ["Hourly rate (your result)", fmtNum(r.value, 2)]
        ]);
      }
    };
ENGINES["sales-tax"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "price", label: "Price before tax", min: 0 }, { id: "rate", label: "Sales tax rate", min: 0, max: 100 }],
          "Type the price and the sales tax rate and the total to pay appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var price = g.values.price, rate = g.values.rate;
        var tax = price * rate / 100;
        return { state: "ok", value: price + tax, price: price, rate: rate, tax: tax };
      },
      format: function (r) { return fmtNum(r.value, 2); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 2),
          sentenceText: "The total to pay is " + fmtNum(r.value, 2) + ": the price of " + fmtNum(r.price, 2) + " plus sales tax of " +
            fmtNum(r.tax, 2) + " at " + fmtNum(r.rate, 2) + "%, in your own currency."
        });
        renderBar(ctx.bar, r.value > 0 ? r.tax / r.value * 100 : 0);
        ctx.legendA.textContent = "Sales tax: " + fmtNum(r.tax, 2);
        ctx.legendB.textContent = "Price before tax: " + fmtNum(r.price, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing sales tax " + fmtNum(r.tax, 2) + " out of the total " + fmtNum(r.value, 2));
        renderTable(ctx.breakBody, [
          ["Price before tax", fmtNum(r.price, 2)],
          ["Sales tax rate", fmtNum(r.rate, 2) + "%"],
          ["Sales tax", fmtNum(r.tax, 2)],
          ["Total to pay (your result)", fmtNum(r.value, 2)]
        ]);
      }
    };
ENGINES["savings-goal"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "target", label: "Target amount", min: 0, allowZero: false }, { id: "years", label: "Years to save", min: 0, allowZero: false, max: 100 }, { id: "rate", label: "Yearly interest rate", min: 0, max: 100 }],
          "Type the target, the years and the yearly rate and the monthly amount appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var target = g.values.target, years = g.values.years, rate = g.values.rate;
        var r = rate / 100 / 12, n = years * 12;
        var pmt = (r === 0) ? target / n : target * r / (Math.pow(1 + r, n) - 1);
        var paid = pmt * n;
        return { state: "ok", value: pmt, target: target, years: years, rate: rate, months: n, paid: paid, interest: target - paid };
      },
      format: function (r) { return fmtNum(r.value, 2); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 2),
          sentenceText: "Save " + fmtNum(r.value, 2) + " a month for " + fmtNum(r.months, 0) + " months to reach " +
            fmtNum(r.target, 2) + " in " + fmtNum(r.years, 0) + " years at " + fmtNum(r.rate, 2) + "% a year, in your own currency."
        });
        renderBar(ctx.bar, r.target > 0 ? r.paid / r.target * 100 : 0);
        ctx.legendA.textContent = "You pay in: " + fmtNum(r.paid, 2);
        ctx.legendB.textContent = "Interest adds: " + fmtNum(r.interest, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing what you pay in " + fmtNum(r.paid, 2) + " out of the target " + fmtNum(r.target, 2));
        renderTable(ctx.breakBody, [
          ["Target amount", fmtNum(r.target, 2)],
          ["Monthly saving (your result)", fmtNum(r.value, 2)],
          ["Months of saving", fmtNum(r.months, 0)],
          ["Total you pay in", fmtNum(r.paid, 2)],
          ["Interest earned on the way", fmtNum(r.interest, 2)]
        ]);
      }
    };
ENGINES["scientific"] = {
      compute: function (v) {
        var raw = (v.expr || "").trim();
        if (raw === "") {
          return { state: "empty", message: "Type a sum, or tap the keys below, and the answer appears here \u2014 no button to press." };
        }
        if (raw.length > 200) return { state: "invalid", message: "That sum is too long. Keep it under 200 characters." };
        var value;
        try { value = evalExpr(raw); } catch (e) {
          return { state: "invalid", message: "That sum cannot be worked out: " + (e && e.message ? e.message : "check the brackets and symbols.") + " Angles are in degrees, and % means percent (50% is 0.5)." };
        }
        if (!isFinite(value)) return { state: "invalid", message: "That sum is too large to show as a number. Try smaller numbers." };
        return { state: "ok", value: value, expr: raw };
      },
      format: function (r) { return fmtSci(r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtSci(r.value),
          sentenceText: r.expr + " = " + fmtSci(r.value) + ". Angles are in degrees, and the answer is rounded half-up to 10 decimal places."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, Math.abs(r.value))));
        ctx.legendA.textContent = "Answer: " + fmtSci(r.value);
        ctx.legendB.textContent = "Sum: " + r.expr;
        ctx.bar.setAttribute("aria-label", "Bar showing the answer " + fmtSci(r.value));
        renderTable(ctx.breakBody, [
          ["Sum", r.expr],
          ["Answer (your result)", fmtSci(r.value)],
          ["Answer to 2 decimal places", fmtNum(r.value, 2)]
        ]);
      }
    };
ENGINES["simple-interest"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "principal", label: "Starting amount", min: 0 }, { id: "rate", label: "Yearly interest rate", min: 0, max: 100 }, { id: "years", label: "Years", min: 0, allowZero: false, max: 100 }],
          "Type the starting amount, yearly rate and years and the total appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var p = g.values.principal, rate = g.values.rate, years = g.values.years;
        var interest = p * rate / 100 * years;
        return { state: "ok", value: p + interest, principal: p, rate: rate, years: years, interest: interest };
      },
      format: function (r) { return fmtNum(r.value, 2); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 2),
          sentenceText: "The total is " + fmtNum(r.value, 2) + ": " + fmtNum(r.principal, 2) + " plus " + fmtNum(r.interest, 2) +
            " of simple interest at " + fmtNum(r.rate, 2) + "% a year for " + fmtNum(r.years, 0) + " years, in your own currency."
        });
        renderBar(ctx.bar, r.value > 0 ? r.interest / r.value * 100 : 0);
        ctx.legendA.textContent = "Interest earned: " + fmtNum(r.interest, 2);
        ctx.legendB.textContent = "Starting amount: " + fmtNum(r.principal, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing interest " + fmtNum(r.interest, 2) + " out of the total " + fmtNum(r.value, 2));
        renderTable(ctx.breakBody, [
          ["Starting amount", fmtNum(r.principal, 2)],
          ["Simple interest", fmtNum(r.interest, 2)],
          ["Total amount (your result)", fmtNum(r.value, 2)]
        ]);
      }
    };
ENGINES["standard-deviation"] = {
      compute: function (v) {
        var raw = (v.list || "").trim();
        if (raw === "") {
          return { state: "empty", message: "Type at least two numbers, separated by commas, and the standard deviation appears here \u2014 no button to press." };
        }
        var parts = raw.split(/[\s,;]+/).filter(function (s) { return s !== ""; });
        if (parts.length < 2) return { state: "invalid", message: "Standard deviation needs at least two numbers. Type two or more numbers, separated by commas." };
        var nums = [];
        for (var i = 0; i < parts.length; i++) {
          var x = Number(parts[i]);
          if (!isFinite(x)) return { state: "invalid", message: "\u201C" + parts[i] + "\u201D is not a number. Type numbers only, separated by commas." };
          if (Math.abs(x) > LIMIT) return { state: "limit" };
          nums.push(x);
        }
        var sum = 0, j;
        for (j = 0; j < nums.length; j++) sum += nums[j];
        var mean = sum / nums.length;
        var sq = 0;
        for (j = 0; j < nums.length; j++) sq += Math.pow(nums[j] - mean, 2);
        var variance = sq / nums.length;
        var sd = Math.sqrt(variance);
        return { state: "ok", value: sd, nums: nums, mean: mean, variance: variance };
      },
      format: function (r) { return fmtNum(r.value, 4); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 4),
          sentenceText: "The standard deviation of your " + r.nums.length + " numbers is " + fmtNum(r.value, 4) +
            " (population standard deviation, worked out from the mean of " + fmtNum(r.mean, 4) + ")."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, r.value)));
        ctx.legendA.textContent = "Standard deviation: " + fmtNum(r.value, 4);
        ctx.legendB.textContent = "Mean: " + fmtNum(r.mean, 4);
        ctx.bar.setAttribute("aria-label", "Bar showing the standard deviation " + fmtNum(r.value, 4));
        renderTable(ctx.breakBody, [
          ["How many numbers", String(r.nums.length)],
          ["Mean", fmtNum(r.mean, 4)],
          ["Variance", fmtNum(r.variance, 4)],
          ["Standard deviation (your result)", fmtNum(r.value, 4)]
        ]);
      }
    };
ENGINES["take-home-pay-au"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }],
          "Type the yearly salary and the take-home pay appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var salary = g.values.salary;
        var tax = auTax(salary);
        var levy = auLevy(salary);
        var sup = cents(0.12 * salary);
        var take = cents(salary - tax - levy);
        return { state: "ok", value: take, salary: salary, tax: tax, levy: levy, sup: sup, monthly: take / 12 };
      },
      format: function (r) { return fmtMoney("AUD", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("AUD", r.value),
          sentenceText: "Your take-home pay is " + fmtMoney("AUD", r.value) + " a year (" + fmtMoney("AUD", r.monthly) +
            " a month) from a salary of " + fmtMoney("AUD", r.salary) + " after income tax and the Medicare levy. Your employer also pays " +
            fmtMoney("AUD", r.sup) + " of super on top of your salary \u2014 it is not taken out of your pay."
        });
        renderBar(ctx.bar, r.salary > 0 ? r.value / r.salary * 100 : 0);
        ctx.legendA.textContent = "Take-home pay: " + fmtMoney("AUD", r.value);
        ctx.legendB.textContent = "Tax and levy taken off: " + fmtMoney("AUD", r.salary - r.value);
        ctx.bar.setAttribute("aria-label", "Bar showing take-home pay " + fmtMoney("AUD", r.value) + " out of the salary " + fmtMoney("AUD", r.salary));
        renderTable(ctx.breakBody, [
          ["Gross salary", fmtMoney("AUD", r.salary)],
          ["Income tax", "\u2212" + fmtMoney("AUD", r.tax)],
          ["Medicare levy (2%)", "\u2212" + fmtMoney("AUD", r.levy)],
          ["Take-home pay a year (your result)", fmtMoney("AUD", r.value)],
          ["Take-home pay a month", fmtMoney("AUD", r.monthly)],
          ["Super paid by your employer (12%, on top)", fmtMoney("AUD", r.sup)]
        ]);
      }
    };
ENGINES["take-home-pay-ca"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }],
          "Type the yearly salary and the take-home pay appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var salary = g.values.salary;
        var fed = caFederalTax(salary);
        var cpp = caCpp(salary);
        var ei = caEi(salary);
        var take = cents(salary - fed - cpp.total - ei);
        return { state: "ok", value: take, salary: salary, fed: fed, cpp: cpp, ei: ei, monthly: take / 12 };
      },
      format: function (r) { return fmtMoney("CAD", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("CAD", r.value),
          sentenceText: "Your take-home pay is " + fmtMoney("CAD", r.value) + " a year (" + fmtMoney("CAD", r.monthly) +
            " a month) from a salary of " + fmtMoney("CAD", r.salary) + " after federal income tax, CPP and EI. Provincial tax is not included, and Quebec is not covered."
        });
        renderBar(ctx.bar, r.salary > 0 ? r.value / r.salary * 100 : 0);
        ctx.legendA.textContent = "Take-home pay: " + fmtMoney("CAD", r.value);
        ctx.legendB.textContent = "Federal tax, CPP and EI taken off: " + fmtMoney("CAD", r.salary - r.value);
        ctx.bar.setAttribute("aria-label", "Bar showing take-home pay " + fmtMoney("CAD", r.value) + " out of the salary " + fmtMoney("CAD", r.salary));
        renderTable(ctx.breakBody, [
          ["Gross salary", fmtMoney("CAD", r.salary)],
          ["Federal income tax", "\u2212" + fmtMoney("CAD", r.fed)],
          ["CPP", "\u2212" + fmtMoney("CAD", r.cpp.cpp)],
          ["CPP2 (second additional contribution)", "\u2212" + fmtMoney("CAD", r.cpp.cpp2)],
          ["Employment Insurance (EI)", "\u2212" + fmtMoney("CAD", r.ei)],
          ["Take-home pay a year (your result)", fmtMoney("CAD", r.value)],
          ["Take-home pay a month", fmtMoney("CAD", r.monthly)]
        ]);
      }
    };
ENGINES["take-home-pay-uk"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }, { id: "code", label: "Tax code number", min: 0, max: 9999 }],
          "Type the yearly salary and tax code number and the take-home pay appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var salary = g.values.salary, code = g.values.code;
        var tax = ukTax(salary, code);
        var ni = ukNI(salary);
        var take = cents(salary - tax - ni);
        return { state: "ok", value: take, salary: salary, code: code, tax: tax, ni: ni, monthly: take / 12 };
      },
      format: function (r) { return fmtMoney("GBP", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("GBP", r.value),
          sentenceText: "Your take-home pay is " + fmtMoney("GBP", r.value) + " a year (" + fmtMoney("GBP", r.monthly) +
            " a month) from a salary of " + fmtMoney("GBP", r.salary) + " after income tax and National Insurance, on tax code " + fmtNum(r.code, 0) + "L."
        });
        renderBar(ctx.bar, r.salary > 0 ? r.value / r.salary * 100 : 0);
        ctx.legendA.textContent = "Take-home pay: " + fmtMoney("GBP", r.value);
        ctx.legendB.textContent = "Tax and National Insurance taken off: " + fmtMoney("GBP", r.salary - r.value);
        ctx.bar.setAttribute("aria-label", "Bar showing take-home pay " + fmtMoney("GBP", r.value) + " out of the salary " + fmtMoney("GBP", r.salary));
        renderTable(ctx.breakBody, [
          ["Gross salary", fmtMoney("GBP", r.salary)],
          ["Income tax", "\u2212" + fmtMoney("GBP", r.tax)],
          ["National Insurance (Class 1)", "\u2212" + fmtMoney("GBP", r.ni)],
          ["Take-home pay a year (your result)", fmtMoney("GBP", r.value)],
          ["Take-home pay a month", fmtMoney("GBP", r.monthly)]
        ]);
      }
    };
ENGINES["take-home-pay-us"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }],
          "Type the yearly salary and pick a filing status and the take-home pay appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var salary = g.values.salary;
        var status = v.status || "single";
        var fed = usFederalTax(salary, status);
        var fica = usFica(salary, status);
        var take = cents(salary - fed - fica.total);
        return { state: "ok", value: take, salary: salary, status: status, fed: fed, fica: fica, monthly: take / 12 };
      },
      format: function (r) { return fmtMoney("USD", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("USD", r.value),
          sentenceText: "Your take-home pay is " + fmtMoney("USD", r.value) + " a year (" + fmtMoney("USD", r.monthly) +
            " a month) from a salary of " + fmtMoney("USD", r.salary) + " after federal income tax and FICA. State tax is not included."
        });
        renderBar(ctx.bar, r.salary > 0 ? r.value / r.salary * 100 : 0);
        ctx.legendA.textContent = "Take-home pay: " + fmtMoney("USD", r.value);
        ctx.legendB.textContent = "Tax and FICA taken off: " + fmtMoney("USD", r.salary - r.value);
        ctx.bar.setAttribute("aria-label", "Bar showing take-home pay " + fmtMoney("USD", r.value) + " out of the salary " + fmtMoney("USD", r.salary));
        renderTable(ctx.breakBody, [
          ["Gross salary", fmtMoney("USD", r.salary)],
          ["Federal income tax", "\u2212" + fmtMoney("USD", r.fed)],
          ["Social Security (6.2%)", "\u2212" + fmtMoney("USD", r.fica.ss)],
          ["Medicare (1.45% plus extra 0.9% if it applies)", "\u2212" + fmtMoney("USD", cents(r.fica.med + r.fica.extra))],
          ["Take-home pay a year (your result)", fmtMoney("USD", r.value)],
          ["Take-home pay a month", fmtMoney("USD", r.monthly)]
        ]);
      }
    };
ENGINES["time"] = {
      compute: function (v) {
        var startRaw = (v.start || "").trim(), endRaw = (v.end || "").trim();
        if (startRaw === "" || endRaw === "") {
          return { state: "empty", message: "Pick the start and end times and the time between them appears here \u2014 no button to press." };
        }
        var start = parseTime(startRaw), end = parseTime(endRaw);
        if (start === null || end === null) return { state: "invalid", message: "One of the times is not valid. Hours run 0 to 23 and minutes run 0 to 59." };
        var g = readNums(v, [{ id: "hours", label: "Hours to add or subtract", min: 0, max: 23 }, { id: "minutes", label: "Minutes to add or subtract", min: 0, max: 59 }],
          "Type the hours and minutes to add or subtract as well, and the answer appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var dur = end - start;
        if (dur < 0) dur += 1440; /* end time on the next day */
        var addMin = g.values.hours * 60 + g.values.minutes;
        var dir = v.direction || "add";
        var shifted = (dir === "subtract") ? start - addMin : start + addMin;
        return { state: "ok", value: dur, start: start, end: end, addMin: addMin, dir: dir, shifted: shifted };
      },
      format: function (r) { return fmtDuration(r.value); },
      render: function (ctx, r) {
        var durText = fmtDuration(r.value);
        var shiftLabel = (r.dir === "subtract" ? "minus " : "plus ") + fmtDuration(r.addMin);
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: durText,
          sentenceText: "The time between " + fmtClock(r.start) + " and " + fmtClock(r.end) + " is " + durText +
            ". " + fmtClock(r.start) + " " + shiftLabel + " is " + fmtClock(r.shifted) + "."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, r.value / 1440 * 100)));
        ctx.legendA.textContent = "Time between the two times: " + durText;
        ctx.legendB.textContent = fmtClock(r.start) + " " + shiftLabel + ": " + fmtClock(r.shifted);
        ctx.bar.setAttribute("aria-label", "Bar showing " + durText + " out of a full day");
        renderTable(ctx.breakBody, [
          ["Time between the two times (your result)", durText],
          [fmtClock(r.start) + " plus " + fmtDuration(r.addMin), fmtClock(r.start + r.addMin)],
          [fmtClock(r.start) + " minus " + fmtDuration(r.addMin), fmtClock(r.start - r.addMin)]
        ]);
      }
    };
ENGINES["tip-and-bill-split"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "bill", label: "Bill total", min: 0 }, { id: "tip", label: "Tip percent", min: 0, max: 100 }, { id: "people", label: "Number of people", min: 1, allowZero: false, max: 100 }],
          "Type the bill, the tip percent and the number of people and each share appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var bill = g.values.bill, tipPct = g.values.tip, people = g.values.people;
        var tipAmt = bill * tipPct / 100;
        var total = bill + tipAmt;
        var each = total / people;
        return { state: "ok", value: each, bill: bill, tipPct: tipPct, people: people, tipAmt: tipAmt, total: total, tipEach: tipAmt / people };
      },
      format: function (r) { return fmtNum(r.value, 2); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 2),
          sentenceText: "Each of the " + fmtNum(r.people, 0) + " people pays " + fmtNum(r.value, 2) + ": the bill of " + fmtNum(r.bill, 2) +
            " plus a tip of " + fmtNum(r.tipAmt, 2) + " (" + fmtNum(r.tipPct, 2) + "%) is " + fmtNum(r.total, 2) + " in total, in your own currency."
        });
        renderBar(ctx.bar, r.total > 0 ? r.tipAmt / r.total * 100 : 0);
        ctx.legendA.textContent = "Each person pays: " + fmtNum(r.value, 2);
        ctx.legendB.textContent = "Tip: " + fmtNum(r.tipAmt, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing the tip " + fmtNum(r.tipAmt, 2) + " out of the total " + fmtNum(r.total, 2));
        renderTable(ctx.breakBody, [
          ["Bill", fmtNum(r.bill, 2)],
          ["Tip (" + fmtNum(r.tipPct, 2) + "%)", fmtNum(r.tipAmt, 2)],
          ["Total to pay", fmtNum(r.total, 2)],
          ["Number of people", fmtNum(r.people, 0)],
          ["Each person pays (your result)", fmtNum(r.value, 2)],
          ["Tip per person", fmtNum(r.tipEach, 2)]
        ]);
      }
    };
ENGINES["vat"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "price", label: "Price", min: 0 }, { id: "rate", label: "VAT rate", min: 0, max: 100 }],
          "Type the price and the VAT rate and the answer appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var price = g.values.price, rate = g.values.rate;
        var mode = v.mode || "add";
        var net, vat, gross;
        if (mode === "remove") {
          gross = price; net = price / (1 + rate / 100); vat = gross - net;
          return { state: "ok", value: net, mode: mode, price: price, rate: rate, net: net, vat: vat, gross: gross };
        }
        net = price; vat = price * rate / 100; gross = net + vat;
        return { state: "ok", value: gross, mode: mode, price: price, rate: rate, net: net, vat: vat, gross: gross };
      },
      format: function (r) { return fmtNum(r.value, 2); },
      render: function (ctx, r) {
        var sentence = (r.mode === "remove")
          ? "The price without VAT is " + fmtNum(r.net, 2) + ": the VAT inside " + fmtNum(r.gross, 2) + " at " + fmtNum(r.rate, 2) + "% is " + fmtNum(r.vat, 2) + "."
          : "The price with VAT is " + fmtNum(r.gross, 2) + ": VAT of " + fmtNum(r.vat, 2) + " at " + fmtNum(r.rate, 2) + "% on " + fmtNum(r.net, 2) + ".";
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 2), sentenceText: sentence
        });
        renderBar(ctx.bar, r.gross > 0 ? r.vat / r.gross * 100 : 0);
        ctx.legendA.textContent = "VAT: " + fmtNum(r.vat, 2);
        ctx.legendB.textContent = "Net price: " + fmtNum(r.net, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing VAT " + fmtNum(r.vat, 2) + " out of the gross price " + fmtNum(r.gross, 2));
        renderTable(ctx.breakBody, [
          ["Net price (without VAT)", fmtNum(r.net, 2)],
          ["VAT at " + fmtNum(r.rate, 2) + "%", fmtNum(r.vat, 2)],
          ["Gross price (with VAT)", fmtNum(r.gross, 2)]
        ]);
      }
    };
ENGINES["what-percent"] = {
      compute: function (v) {
        var s = baseState(v.a, v.b);
        if (s.state !== "ok") return s;
        if (s.b === 0) return { state: "zero" };
        return { state: "ok", value: (s.a / s.b) * 100, a: s.a, b: s.b };
      },
      format: function (r) { return fmtPct(r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtPct(r.value),
          sentenceText: fmtNum(r.a, 2) + " is " + fmtPct(r.value) + " of " + fmtNum(r.b, 2) + "."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, Math.abs(r.value))));
        ctx.legendA.textContent = "The part: " + fmtNum(r.a, 2) + " (" + fmtPct(r.value) + ")";
        ctx.legendB.textContent = "The rest of the whole: " + fmtNum(r.b - r.a, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing " + fmtNum(r.a, 2) + " as " + fmtPct(r.value) + " of " + fmtNum(r.b, 2));
        renderTable(ctx.breakBody, [
          ["Part", fmtNum(r.a, 2)],
          ["Whole number", fmtNum(r.b, 2)],
          ["Share (your result)", fmtPct(r.value)],
          ["Rest of the whole (" + fmtNum(r.b, 2) + " \u2212 " + fmtNum(r.a, 2) + ")", fmtNum(r.b - r.a, 2)]
        ]);
      }
    };
