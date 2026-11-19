/* Calculatorly — stage 3 tool engines (27 tools).
   Loaded after assets/js/calculatorly.js; each entry fills the
   shared ENGINES registry. Helpers (fmtNum, tax tables, ...) come
   from the core file, which is why this file has no helpers. */
ENGINES["business-days"] = {
    compute: function (vals) {
      var d = needDates(vals, ["start", "end"]);
      if (!d.ok) return d;
      var s = d.values.start, e = d.values.end;
      if (s.getTime() > e.getTime()) return { state: "range", message: "The start date is after the end date." };
      var total = daysBetween(s, e) + 1;
      var business = businessDaysBetween(s, e);
      return { state: "ok", start: s, end: e, total: total,
        business: business, weekend: total - business };
    },
    format: function (r) { return r.business + (r.business === 1 ? " business day" : " business days"); },
    render: function (ctx, r) {
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: "From " + fmtDate(r.start) + " to " + fmtDate(r.end) + " there are " + r.total + " days in total, " + r.weekend + " of them weekend days, leaving " + r.business + " business days."
      });
      renderBar(ctx.bar, r.total > 0 ? r.business / r.total * 100 : 0);
      ctx.legendA.textContent = "Business days: " + r.business;
      ctx.legendB.textContent = "Weekend days: " + r.weekend;
      ctx.bar.setAttribute("aria-label", "Bar showing the business days out of the total days");
      renderTable(ctx.breakBody, [
        ["Start date", fmtDate(r.start)],
        ["End date", fmtDate(r.end)],
        ["Total days (both ends counted)", "" + r.total],
        ["Weekend days", "" + r.weekend],
        ["Business days (your result)", "" + r.business]
      ]);
    }
  };
ENGINES["concrete"] = {
    compute: function (vals) {
      var n = needNums(vals, [["length", { min: 0, rangeMsg: "Lengths must be more than zero." }],
        ["width", { min: 0, rangeMsg: "Lengths must be more than zero." }],
        ["depth", { min: 0, rangeMsg: "Lengths must be more than zero." }],
        ["waste", { min: 0, max: 100, rangeMsg: "Waste must be between 0% and 100%." }]]);
      if (!n.ok) return n;
      var v = n.values;
      if (v.length === 0 || v.width === 0 || v.depth === 0) return { state: "range", message: "Lengths must be more than zero." };
      var vol = v.length * v.width * v.depth;
      var withWaste = vol * (1 + v.waste / 100);
      return { state: "ok", vol: vol, withWaste: withWaste,
        bags: Math.ceil(withWaste / 0.0125 - 1e-9), weight: withWaste * 2400 };
    },
    format: function (r) { return fmtNum(r.withWaste, 2) + " m³"; },
    render: function (ctx, r) {
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: "The slab needs " + fmtNum(r.withWaste, 2) + " m³ of concrete with waste included, which is " + r.bags + " bags of 25 kg and weighs " + fmtNum(r.weight, 2) + " kg."
      });
      renderBar(ctx.bar, Math.min(100, r.withWaste / 5 * 100));
      ctx.legendA.textContent = "Volume to order: " + fmtNum(r.withWaste, 2) + " m³";
      ctx.legendB.textContent = "Volume without waste: " + fmtNum(r.vol, 2) + " m³";
      ctx.bar.setAttribute("aria-label", "Bar showing the volume to order out of 5 cubic metres");
      renderTable(ctx.breakBody, [
        ["Volume without waste", fmtNum(r.vol, 2) + " m³"],
        ["Volume with waste (your result)", fmtNum(r.withWaste, 2) + " m³"],
        ["25 kg bags needed", "" + r.bags],
        ["Weight of the concrete", fmtNum(r.weight, 2) + " kg"]
      ]);
    }
  };
ENGINES["countdown"] = {
    compute: function (vals) {
      var t = dateField(vals, "target");
      if (!t.ok) return t;
      var target = t.value;
      var fromRaw = vals.from == null ? "" : String(vals.from).trim();
      var from, fromMidnight;
      if (fromRaw === "") {
        var now = new Date();
        from = now;
        fromMidnight = false;
      } else {
        var f = parseDate(fromRaw);
        if (!f) return { ok: false, state: "invalid", message: "That date is not valid. Use the date picker." };
        from = f;
        fromMidnight = true;
      }
      var diffMs = target.getTime() - from.getTime();
      if (diffMs < 0) return { state: "range", message: "The target date is in the past." };
      var totalSec = Math.floor(diffMs / 1000);
      var days = Math.floor(totalSec / 86400);
      var hours = Math.floor((totalSec % 86400) / 3600);
      var minutes = Math.floor((totalSec % 3600) / 60);
      var seconds = totalSec % 60;
      return { state: "ok", target: target, days: days, hours: hours,
        minutes: minutes, seconds: seconds, fromMidnight: fromMidnight };
    },
    format: function (r) {
      return r.days + " days, " + r.hours + " hours, " + r.minutes + " minutes, " + r.seconds + " seconds";
    },
    render: function (ctx, r) {
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: "Until " + fmtDate(r.target) + " there are " + r.days + " days, " + r.hours + " hours, " + r.minutes + " minutes and " + r.seconds + " seconds left. Refresh the page to update the count."
      });
      renderBar(ctx.bar, Math.min(100, r.days / 365 * 100));
      ctx.legendA.textContent = "Days left: " + r.days;
      ctx.legendB.textContent = "Target date: " + fmtDate(r.target);
      ctx.bar.setAttribute("aria-label", "Bar showing the days left out of a year");
      renderTable(ctx.breakBody, [
        ["Target date", fmtDate(r.target)],
        ["Days left", "" + r.days],
        ["Weeks left", fmtNum(r.days / 7, 2)],
        ["Hours left in total", fmtNum(r.days * 24 + r.hours, 0)],
        ["Time left (your result)", this.format(r)]
      ]);
    }
  };
ENGINES["fixed-vs-variable-mortgage"] = {
    compute: function (vals) {
      var n = needNums(vals, [["loan", { min: 0, rangeMsg: "Amounts cannot be negative." }],
        ["fixed_rate", { min: 0, max: 100, rangeMsg: "Rates must be between 0% and 100%." }],
        ["variable_rate", { min: 0, max: 100, rangeMsg: "Rates must be between 0% and 100%." }],
        ["term", { min: 1, max: 50, rangeMsg: "The term must be between 1 and 50 years." }]]);
      if (!n.ok) return n;
      var v = n.values;
      var months = Math.round(v.term * 12);
      var fPay = loanPayment(v.loan, v.fixed_rate / 100, months);
      var vPay = loanPayment(v.loan, v.variable_rate / 100, months);
      return { state: "ok", loan: v.loan, months: months,
        fixedPay: fPay, varPay: vPay,
        fixedTotal: fPay * months, varTotal: vPay * months };
    },
    format: function (r) {
      if (Math.abs(r.fixedTotal - r.varTotal) < 0.005) return "Both loans cost the same: $" + fmtNum(r.fixedTotal, 2) + " in total.";
      if (r.fixedTotal < r.varTotal) return "Fixed is cheaper by $" + fmtNum(r.varTotal - r.fixedTotal, 2);
      return "Variable is cheaper by $" + fmtNum(r.fixedTotal - r.varTotal, 2);
    },
    render: function (ctx, r) {
      var cheaper = Math.min(r.fixedTotal, r.varTotal);
      var dearer = Math.max(r.fixedTotal, r.varTotal);
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: "Fixed costs " + fmtMoney("USD", r.fixedTotal) + " in total and variable costs " + fmtMoney("USD", r.varTotal) + " in total over " + r.months + " months, if the variable rate never moves."
      });
      renderBar(ctx.bar, dearer > 0 ? cheaper / dearer * 100 : 0);
      ctx.legendA.textContent = "Fixed total: " + fmtMoney("USD", r.fixedTotal);
      ctx.legendB.textContent = "Variable total: " + fmtMoney("USD", r.varTotal);
      ctx.bar.setAttribute("aria-label", "Bar showing the cheaper total out of the dearer total");
      renderTable(ctx.breakBody, [
        ["Fixed monthly payment", fmtMoney("USD", r.fixedPay)],
        ["Variable monthly payment", fmtMoney("USD", r.varPay)],
        ["Fixed total cost", fmtMoney("USD", r.fixedTotal)],
        ["Variable total cost", fmtMoney("USD", r.varTotal)],
        ["Difference (your result)", fmtMoney("USD", Math.abs(r.fixedTotal - r.varTotal))]
      ]);
    }
  };
ENGINES["freelance-rate"] = {
      compute: function (vals) {
        var n = needNums(vals, [["salary", { min: 0, rangeMsg: "Amounts cannot be negative." }],
          ["costs", { min: 0, rangeMsg: "Amounts cannot be negative." }],
          ["hours", { min: 0, rangeMsg: "Amounts cannot be negative." }]]);
        if (!n.ok) return n;
        var v = n.values;
        if (v.hours === 0) return { state: "zero" };
        var total = v.salary + v.costs;
        return { state: "ok", salary: v.salary, costs: v.costs, hours: v.hours,
          total: total, rate: total / v.hours };
      },
      format: function (r) { return fmtMoney("USD", r.rate) + " per hour"; },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "To cover " + fmtMoney("USD", r.total) + " over " + fmtNum(r.hours, 2) + " billable hours, charge " + fmtMoney("USD", r.rate) + " an hour."
        });
        renderBar(ctx.bar, r.total > 0 ? r.salary / r.total * 100 : 0);
        ctx.legendA.textContent = "Target income: " + fmtMoney("USD", r.salary);
        ctx.legendB.textContent = "Business costs: " + fmtMoney("USD", r.costs);
        ctx.bar.setAttribute("aria-label", "Bar showing the target income out of the yearly total to cover");
        renderTable(ctx.breakBody, [
          ["Target yearly income", fmtMoney("USD", r.salary)],
          ["Yearly business costs", fmtMoney("USD", r.costs)],
          ["Yearly total to cover", fmtMoney("USD", r.total)],
          ["Billable hours", fmtNum(r.hours, 2)],
          ["Hourly rate (your result)", fmtMoney("USD", r.rate) + " per hour"]
        ]);
      }
    };
ENGINES["invoice-late-payment"] = {
      compute: function (vals) {
        var n = needNums(vals, [["amount", { min: 0, rangeMsg: "Amounts cannot be negative." }],
          ["rate", { min: 0, rangeMsg: "Amounts cannot be negative." }]]);
        if (!n.ok) return n;
        var d = needDates(vals, ["due", "paid"]);
        if (!d.ok) return d;
        var v = n.values;
        var days = daysBetween(d.values.due, d.values.paid);
        if (days < 0) return { state: "range", message: "The payment date is before the due date, so no late interest is owed." };
        var interest = v.amount * (v.rate / 100) * days / 365;
        return { state: "ok", amount: v.amount, rate: v.rate, days: days, interest: interest };
      },
      format: function (r) { return fmtMoney("USD", r.interest); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "A " + fmtMoney("USD", r.amount) + " invoice at " + fmtNum(r.rate, 2) + "% a year, paid " + r.days + " days late, owes " + fmtMoney("USD", r.interest) + " in interest."
        });
        renderBar(ctx.bar, Math.min(100, r.days / 365 * 100));
        ctx.legendA.textContent = "Days late: " + r.days;
        ctx.legendB.textContent = "Interest: " + fmtMoney("USD", r.interest);
        ctx.bar.setAttribute("aria-label", "Bar showing the days late out of a year");
        renderTable(ctx.breakBody, [
          ["Invoice amount", fmtMoney("USD", r.amount)],
          ["Yearly interest rate", fmtNum(r.rate, 2) + "%"],
          ["Days late", "" + r.days],
          ["Interest owed (your result)", fmtMoney("USD", r.interest)],
          ["Total to pay (invoice + interest)", fmtMoney("USD", r.amount + r.interest)]
        ]);
      }
    };
ENGINES["job-offer-comparison"] = {
      compute: function (vals) {
        var n = needNums(vals, [["a_salary", { min: 0, rangeMsg: "Amounts cannot be negative." }],
          ["a_bonus", { min: 0, rangeMsg: "Amounts cannot be negative." }],
          ["a_benefits", { min: 0, rangeMsg: "Amounts cannot be negative." }],
          ["b_salary", { min: 0, rangeMsg: "Amounts cannot be negative." }],
          ["b_bonus", { min: 0, rangeMsg: "Amounts cannot be negative." }],
          ["b_benefits", { min: 0, rangeMsg: "Amounts cannot be negative." }]]);
        if (!n.ok) return n;
        var v = n.values;
        var at = v.a_salary + v.a_bonus + v.a_benefits;
        var bt = v.b_salary + v.b_bonus + v.b_benefits;
        return { state: "ok", aTotal: at, bTotal: bt, a: v, b: v };
      },
      format: function (r) {
        if (Math.abs(r.aTotal - r.bTotal) < 0.005) return "Both offers are equal: $" + fmtNum(r.aTotal, 2) + " each.";
        if (r.aTotal > r.bTotal) return "Offer A is better by $" + fmtNum(r.aTotal - r.bTotal, 2);
        return "Offer B is better by $" + fmtNum(r.bTotal - r.aTotal, 2);
      },
      render: function (ctx, r) {
        var better = Math.max(r.aTotal, r.bTotal);
        var total = r.aTotal + r.bTotal;
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "Offer A is worth $" + fmtNum(r.aTotal, 2) + " a year and Offer B is worth $" + fmtNum(r.bTotal, 2) + " a year."
        });
        renderBar(ctx.bar, total > 0 ? better / total * 100 : 0);
        ctx.legendA.textContent = "Offer A total: $" + fmtNum(r.aTotal, 2);
        ctx.legendB.textContent = "Offer B total: $" + fmtNum(r.bTotal, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing the better offer out of the two totals");
        renderTable(ctx.breakBody, [
          ["Offer A: salary", fmtMoney("USD", r.a.a_salary)],
          ["Offer A: bonus + benefits", fmtMoney("USD", r.a.a_bonus + r.a.a_benefits)],
          ["Offer A total (your result)", fmtMoney("USD", r.aTotal)],
          ["Offer B: salary", fmtMoney("USD", r.b.b_salary)],
          ["Offer B: bonus + benefits", fmtMoney("USD", r.b.b_bonus + r.b.b_benefits)],
          ["Offer B total", fmtMoney("USD", r.bTotal)],
          ["Difference", fmtMoney("USD", Math.abs(r.aTotal - r.bTotal))]
        ]);
      }
    };
ENGINES["mortgage-overpayment"] = {
    compute: function (vals) {
      var n = needNums(vals, [["loan", { min: 0, rangeMsg: "Amounts cannot be negative." }],
        ["rate", { min: 0, max: 100, rangeMsg: "Rates must be between 0% and 100%." }],
        ["term", { min: 1, max: 50, rangeMsg: "The term must be between 1 and 50 years." }],
        ["extra", { min: 0, rangeMsg: "Amounts cannot be negative." }]]);
      if (!n.ok) return n;
      var v = n.values;
      var months = Math.round(v.term * 12);
      var basePay = loanPayment(v.loan, v.rate / 100, months);
      var base = simLoan(v.loan, v.rate / 100, basePay);
      var over = simLoan(v.loan, v.rate / 100, basePay + v.extra);
      return { state: "ok", loan: v.loan, rate: v.rate, term: v.term, extra: v.extra,
        basePay: basePay, baseMonths: base.months, baseInterest: base.interest,
        newMonths: over.months, newInterest: over.interest,
        saved: base.interest - over.interest, monthsSaved: base.months - over.months };
    },
    format: function (r) { return fmtMoney("USD", r.saved); },
    render: function (ctx, r) {
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: "Paying " + fmtMoney("USD", r.extra) + " extra a month saves " + fmtMoney("USD", r.saved) + " in interest and ends the loan " + r.monthsSaved + " months early."
      });
      renderBar(ctx.bar, r.baseInterest > 0 ? Math.min(100, r.saved / r.baseInterest * 100) : 0);
      ctx.legendA.textContent = "Interest saved: " + fmtMoney("USD", r.saved);
      ctx.legendB.textContent = "Interest without extra payments: " + fmtMoney("USD", r.baseInterest);
      ctx.bar.setAttribute("aria-label", "Bar showing the interest saved out of the interest without extra payments");
      renderTable(ctx.breakBody, [
        ["Normal monthly payment", fmtMoney("USD", r.basePay)],
        ["Months without extra payments", "" + r.baseMonths],
        ["Interest without extra payments", fmtMoney("USD", r.baseInterest)],
        ["Months with extra payments", "" + r.newMonths],
        ["Interest with extra payments", fmtMoney("USD", r.newInterest)],
        ["Interest saved (your result)", fmtMoney("USD", r.saved)],
        ["Months saved", "" + r.monthsSaved]
      ]);
    }
  };
ENGINES["overtime"] = {
      compute: function (vals) {
        var n = needNums(vals, [["rate", { min: 0, rangeMsg: "Amounts cannot be negative." }],
          ["hours", { min: 0, max: 168, rangeMsg: "Hours in a week must be between 0 and 168." }]]);
        if (!n.ok) return n;
        var v = n.values;
        var country = vals.country || "us";
        var otHours, pay;
        if (country === "au") {
          otHours = Math.max(0, v.hours - 38);
          pay = Math.min(otHours, 2) * 1.5 * v.rate + Math.max(0, otHours - 2) * 2 * v.rate;
        } else {
          otHours = Math.max(0, v.hours - 40);
          pay = otHours * 1.5 * v.rate;
        }
        return { state: "ok", country: country, rate: v.rate, hours: v.hours,
          otHours: otHours, pay: pay, ordinary: Math.min(v.hours, country === "au" ? 38 : 40) };
      },
      format: function (r) { return fmtMoney("USD", r.pay); },
      render: function (ctx, r) {
        var countryName = r.country === "au" ? "Australia" : "the USA";
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "In " + countryName + ", " + fmtNum(r.otHours, 2) + " overtime hours at " + fmtMoney("USD", r.rate) + " an hour pay " + fmtMoney("USD", r.pay) + "."
        });
        renderBar(ctx.bar, r.hours > 0 ? r.otHours / r.hours * 100 : 0);
        ctx.legendA.textContent = "Overtime hours: " + fmtNum(r.otHours, 2);
        ctx.legendB.textContent = "Ordinary hours: " + fmtNum(r.ordinary, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing overtime hours out of the hours worked");
        renderTable(ctx.breakBody, [
          ["Hourly rate", fmtMoney("USD", r.rate)],
          ["Total hours worked", fmtNum(r.hours, 2)],
          ["Ordinary hours", fmtNum(r.ordinary, 2)],
          ["Overtime hours", fmtNum(r.otHours, 2)],
          ["Overtime pay (your result)", fmtMoney("USD", r.pay)]
        ]);
      }
    };
ENGINES["paint"] = {
    compute: function (vals) {
      var n = needNums(vals, [["area", { min: 0, rangeMsg: "Amounts cannot be negative." }],
        ["coats", { min: 0, rangeMsg: "Amounts cannot be negative." }],
        ["coverage", { min: 0, rangeMsg: "Amounts cannot be negative." }],
        ["waste", { min: 0, max: 100, rangeMsg: "Waste must be between 0% and 100%." }]]);
      if (!n.ok) return n;
      var v = n.values;
      if (v.coverage === 0) return { state: "zero" };
      var litres = v.area * v.coats / v.coverage * (1 + v.waste / 100);
      return { state: "ok", area: v.area, coats: v.coats, coverage: v.coverage,
        litres: litres, perCoat: v.area / v.coverage,
        tins: Math.ceil(litres / 5 - 1e-9) };
    },
    format: function (r) { return fmtNum(r.litres, 2) + " litres"; },
    render: function (ctx, r) {
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: "For " + fmtNum(r.area, 2) + " m² with " + fmtNum(r.coats, 2) + " coats you need " + fmtNum(r.litres, 2) + " litres of paint, which is " + r.tins + " tins of 5 litres."
      });
      renderBar(ctx.bar, Math.min(100, r.litres / 20 * 100));
      ctx.legendA.textContent = "Paint needed: " + fmtNum(r.litres, 2) + " litres";
      ctx.legendB.textContent = "Tins of 5 litres: " + r.tins;
      ctx.bar.setAttribute("aria-label", "Bar showing the litres needed out of 20 litres");
      renderTable(ctx.breakBody, [
        ["Wall area", fmtNum(r.area, 2) + " m²"],
        ["Coats", fmtNum(r.coats, 2)],
        ["Paint for one coat", fmtNum(r.perCoat, 2) + " litres"],
        ["Paint needed (your result)", fmtNum(r.litres, 2) + " litres"],
        ["5-litre tins needed", "" + r.tins]
      ]);
    }
  };
ENGINES["parental-leave-pay"] = {
      compute: function (vals) {
        var n = needNums(vals, [["salary", { min: 0, rangeMsg: "Amounts cannot be negative." }],
          ["weeks", { min: 0, max: 52, rangeMsg: "Weeks of leave must be between 0 and 52." }],
          ["pay_rate", { min: 0, max: 100, rangeMsg: "Pay rate cannot be more than 100%." }]]);
        if (!n.ok) return n;
        var v = n.values;
        var weekly = v.salary / 52;
        var total = weekly * v.weeks * v.pay_rate / 100;
        return { state: "ok", salary: v.salary, weeks: v.weeks, payRate: v.pay_rate,
          weekly: weekly, total: total };
      },
      format: function (r) { return fmtMoney("USD", r.total); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "Weekly pay " + fmtMoney("USD", r.weekly) + " for " + fmtNum(r.weeks, 2) + " weeks at " + fmtNum(r.payRate, 2) + "% gives " + fmtMoney("USD", r.total) + " for the leave."
        });
        renderBar(ctx.bar, r.salary > 0 ? Math.min(100, r.total / r.salary * 100) : 0);
        ctx.legendA.textContent = "Leave pay: " + fmtMoney("USD", r.total);
        ctx.legendB.textContent = "Yearly salary: " + fmtMoney("USD", r.salary);
        ctx.bar.setAttribute("aria-label", "Bar showing the leave pay out of the yearly salary");
        renderTable(ctx.breakBody, [
          ["Yearly salary", fmtMoney("USD", r.salary)],
          ["Weekly pay", fmtMoney("USD", r.weekly)],
          ["Weeks of leave", fmtNum(r.weeks, 2)],
          ["Pay rate", fmtNum(r.payRate, 2) + "%"],
          ["Total leave pay (your result)", fmtMoney("USD", r.total)]
        ]);
      }
    };
ENGINES["password-strength"] = {
    compute: function (vals) {
      var pw = vals.password == null ? "" : String(vals.password);
      if (pw === "") return { ok: false, state: "empty" };
      if (pw.length > 128) return { state: "range", message: "That password is over 128 characters, which cannot be checked here." };
      var pool = 0, hasLower = false, hasUpper = false, hasDigit = false, hasSymbol = false;
      if (/[a-z]/.test(pw)) { pool += 26; hasLower = true; }
      if (/[A-Z]/.test(pw)) { pool += 26; hasUpper = true; }
      if (/[0-9]/.test(pw)) { pool += 10; hasDigit = true; }
      if (/[^a-zA-Z0-9]/.test(pw)) { pool += 33; hasSymbol = true; }
      var entropy = pw.length * Math.log(pool) / Math.log(2);
      var bits = wholeHalfUp(entropy);
      var band = entropy < 28 ? "Very weak" : (entropy < 36 ? "Weak" : (entropy < 60 ? "Fair" : (entropy < 80 ? "Strong" : "Very strong")));
      var crackSec = Math.pow(2, entropy - 1) / 10000000000;
      return { state: "ok", length: pw.length, pool: pool, bits: bits, band: band,
        crackSec: crackSec, hasLower: hasLower, hasUpper: hasUpper,
        hasDigit: hasDigit, hasSymbol: hasSymbol };
    },
    format: function (r) { return r.band + " (" + r.bits + " bits)"; },
    render: function (ctx, r) {
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: "This password is " + r.band + " with " + r.bits + " bits of entropy. It was checked only in your browser and was never sent anywhere."
      });
      renderBar(ctx.bar, Math.min(100, r.bits / 128 * 100));
      ctx.legendA.textContent = "Strength: " + r.band + " (" + r.bits + " bits)";
      ctx.legendB.textContent = "Length: " + r.length + " characters";
      ctx.bar.setAttribute("aria-label", "Bar showing the entropy out of 128 bits");
      renderTable(ctx.breakBody, [
        ["Password length", "" + r.length + " characters"],
        ["Lowercase letters (a-z)", r.hasLower ? "Yes (+26)" : "No"],
        ["Uppercase letters (A-Z)", r.hasUpper ? "Yes (+26)" : "No"],
        ["Digits (0-9)", r.hasDigit ? "Yes (+10)" : "No"],
        ["Symbols", r.hasSymbol ? "Yes (+33)" : "No"],
        ["Character set size", "" + r.pool],
        ["Entropy (your result)", r.bits + " bits"],
        ["Estimated time to crack", crackTimeText(r.crackSec)]
      ]);
    }
  };
ENGINES["pregnancy-planner"] = {
    compute: function (vals) {
      var d = needDates(vals, ["lmp"]);
      if (!d.ok) return d;
      var lmp = d.values.lmp;
      var now = new Date();
      var today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      if (lmp.getTime() > today.getTime()) return { state: "range", message: "The first day of the last period cannot be in the future." };
      var due = addDays(lmp, 280);
      return { state: "ok", lmp: lmp, due: due,
        t1end: addDays(lmp, 97), t2end: addDays(lmp, 195),
        scan12: addDays(lmp, 84), scan20: addDays(lmp, 140),
        fullTerm: addDays(lmp, 259),
        progress: Math.max(0, Math.min(100, daysBetween(lmp, today) / 280 * 100)) };
    },
    format: function (r) { return fmtDate(r.due); },
    render: function (ctx, r) {
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: "The estimated due date is " + fmtDate(r.due) + ", 280 days after the first day of the last period. This is an estimate only, not medical advice."
      });
      renderBar(ctx.bar, r.progress);
      ctx.legendA.textContent = "Due date: " + fmtDate(r.due);
      ctx.legendB.textContent = "First day of last period: " + fmtDate(r.lmp);
      ctx.bar.setAttribute("aria-label", "Bar showing the weeks passed out of 40 weeks");
      renderTable(ctx.breakBody, [
        ["First day of last period", fmtDate(r.lmp)],
        ["12-week scan (about)", fmtDate(r.scan12)],
        ["20-week scan (about)", fmtDate(r.scan20)],
        ["First trimester ends (13 weeks, 6 days)", fmtDate(r.t1end)],
        ["Second trimester ends (27 weeks, 6 days)", fmtDate(r.t2end)],
        ["Full term (37 weeks)", fmtDate(r.fullTerm)],
        ["Estimated due date (your result)", fmtDate(r.due)]
      ]);
    }
  };
ENGINES["pto"] = {
      compute: function (vals) {
        var n = needNums(vals, [["allowance", { min: 0, rangeMsg: "Amounts cannot be negative." }],
          ["worked", { min: 0, rangeMsg: "Amounts cannot be negative." }],
          ["year_days", { min: 0, rangeMsg: "Amounts cannot be negative." }]]);
        if (!n.ok) return n;
        var v = n.values;
        if (v.year_days === 0) return { state: "zero" };
        if (v.worked > v.year_days) return { state: "range", message: "Days worked cannot be more than the working days in the year." };
        var earned = v.allowance * v.worked / v.year_days;
        return { state: "ok", allowance: v.allowance, worked: v.worked,
          yearDays: v.year_days, earned: earned };
      },
      format: function (r) { return fmtNum(r.earned, 2) + " days"; },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "With " + fmtNum(r.worked, 2) + " of " + fmtNum(r.yearDays, 2) + " working days done, you have earned " + fmtNum(r.earned, 2) + " days of your " + fmtNum(r.allowance, 2) + "-day allowance."
        });
        renderBar(ctx.bar, r.allowance > 0 ? r.earned / r.allowance * 100 : 0);
        ctx.legendA.textContent = "Days earned: " + fmtNum(r.earned, 2);
        ctx.legendB.textContent = "Days still to earn: " + fmtNum(r.allowance - r.earned, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing the days earned out of the yearly allowance");
        renderTable(ctx.breakBody, [
          ["Yearly allowance", fmtNum(r.allowance, 2) + " days"],
          ["Working days done", fmtNum(r.worked, 2)],
          ["Working days in the year", fmtNum(r.yearDays, 2)],
          ["Days earned (your result)", fmtNum(r.earned, 2) + " days"],
          ["Days still to earn", fmtNum(r.allowance - r.earned, 2) + " days"]
        ]);
      }
    };
ENGINES["redundancy-pay"] = {
    compute: function (vals) {
      var n = needNums(vals, [["age", { min: 16, max: 100, rangeMsg: "Age must be between 16 and 100." }],
        ["years", { min: 0, max: 60, rangeMsg: "Years of service must be between 0 and 60." }],
        ["weekly_pay", { min: 0, rangeMsg: "Amounts cannot be negative." }]]);
      if (!n.ok) return n;
      var v = n.values;
      if (v.years < 2) return { state: "range", message: "Statutory redundancy pay needs at least 2 full years of service." };
      var yrs = Math.min(Math.floor(v.years), 20);
      var weeks = 0, under22 = 0, mid = 0, over41 = 0;
      for (var k = 0; k < yrs; k++) {
        var a = Math.floor(v.age) - k;
        if (a <= 22) { weeks += 0.5; under22++; }
        else if (a <= 41) { weeks += 1; mid++; }
        else { weeks += 1.5; over41++; }
      }
      var capped = Math.min(v.weekly_pay, 751);
      return { state: "ok", age: v.age, years: v.years, weeklyPay: v.weekly_pay,
        capped: capped, weeks: weeks, under22: under22, mid: mid, over41: over41,
        total: weeks * capped };
    },
    format: function (r) { return fmtMoney("GBP", r.total); },
    render: function (ctx, r) {
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: fmtNum(r.weeks, 2) + " weeks of pay at " + fmtMoney("GBP", r.capped) + " a week gives statutory redundancy pay of " + fmtMoney("GBP", r.total) + "."
      });
      renderBar(ctx.bar, Math.min(100, r.weeks / 30 * 100));
      ctx.legendA.textContent = "Weeks of pay: " + fmtNum(r.weeks, 2);
      ctx.legendB.textContent = "Most anyone can get: 30 weeks";
      ctx.bar.setAttribute("aria-label", "Bar showing the weeks of pay out of the 30-week maximum");
      renderTable(ctx.breakBody, [
        ["Years under 22 (0.5 week each)", "" + r.under22],
        ["Years aged 22 to 40 (1 week each)", "" + r.mid],
        ["Years aged 41 or over (1.5 weeks each)", "" + r.over41],
        ["Total weeks of pay", fmtNum(r.weeks, 2)],
        ["Weekly pay used (capped at £751.00)", fmtMoney("GBP", r.capped)],
        ["Statutory redundancy pay (your result)", fmtMoney("GBP", r.total)]
      ]);
    }
  };
ENGINES["salary-country-comparison"] = {
    compute: function (vals) {
      var n = needNums(vals, [["salary", { min: 0, rangeMsg: "Amounts cannot be negative." }]]);
      if (!n.ok) return n;
      var s = n.values.salary;
      var uk = s - ukTax(s) - ukNI(s);
      var us = s - usTax(s) - usFica(s).total;
      var au = s - auTax(s) - auLevy(s);
      var ca = s - caTax(s) - caCpp(s).total - caEi(s);
      var rows = [["UK", "£", uk], ["USA", "$", us], ["Australia", "A$", au], ["Canada", "C$", ca]];
      var best = rows[0];
      for (var i = 1; i < rows.length; i++) if (rows[i][2] > best[2]) best = rows[i];
      return { state: "ok", salary: s, uk: uk, us: us, au: au, ca: ca, best: best };
    },
    format: function (r) { return r.best[0] + ": " + r.best[1] + fmtNum(r.best[2], 2); },
    render: function (ctx, r) {
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: "On " + fmtNum(r.salary, 2) + " in each currency, the UK leaves £" + fmtNum(r.uk, 2) + ", the USA leaves $" + fmtNum(r.us, 2) + ", Australia leaves A$" + fmtNum(r.au, 2) + " and Canada leaves C$" + fmtNum(r.ca, 2) + ". This is an estimate only, not professional advice."
      });
      renderBar(ctx.bar, r.salary > 0 ? Math.min(100, r.best[2] / r.salary * 100) : 0);
      ctx.legendA.textContent = "Best take-home: " + r.best[0] + " " + r.best[1] + fmtNum(r.best[2], 2);
      ctx.legendB.textContent = "Gross salary: " + fmtNum(r.salary, 2) + " in each currency";
      ctx.bar.setAttribute("aria-label", "Bar showing the best take-home pay out of the gross salary");
      renderTable(ctx.breakBody, [
        ["UK take-home pay", "£" + fmtNum(r.uk, 2)],
        ["USA take-home pay", "$" + fmtNum(r.us, 2)],
        ["Australia take-home pay", "A$" + fmtNum(r.au, 2)],
        ["Canada take-home pay", "C$" + fmtNum(r.ca, 2)],
        ["Highest take-home (your result)", r.best[0] + ": " + r.best[1] + fmtNum(r.best[2], 2)]
      ]);
    }
  };
ENGINES["salary-sacrifice-au"] = {
      compute: function (vals) {
        var n = needNums(vals, [["salary", { min: 0, rangeMsg: "Amounts cannot be negative." }],
          ["sacrifice", { min: 0, rangeMsg: "Amounts cannot be negative." }]]);
        if (!n.ok) return n;
        var v = n.values;
        if (v.sacrifice > v.salary) return { state: "range", message: "The sacrificed amount cannot be more than the salary." };
        var before = auTax(v.salary) + auLevy(v.salary);
        var after = auTax(v.salary - v.sacrifice) + auLevy(v.salary - v.sacrifice);
        return { state: "ok", salary: v.salary, sacrifice: v.sacrifice,
          saved: before - after, taxBefore: before, taxAfter: after,
          takeBefore: v.salary - before, takeAfter: (v.salary - v.sacrifice) - after,
          superIn: v.sacrifice * 0.85 };
      },
      format: function (r) { return fmtMoney("AUD", r.saved); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "Sacrificing " + fmtMoney("AUD", r.sacrifice) + " saves " + fmtMoney("AUD", r.saved) + " in tax; take-home pay falls to " + fmtMoney("AUD", r.takeAfter) + " and " + fmtMoney("AUD", r.superIn) + " goes into super."
        });
        renderBar(ctx.bar, r.sacrifice > 0 ? Math.min(100, r.saved / r.sacrifice * 100) : 0);
        ctx.legendA.textContent = "Tax saved: " + fmtMoney("AUD", r.saved);
        ctx.legendB.textContent = "Sacrificed: " + fmtMoney("AUD", r.sacrifice);
        ctx.bar.setAttribute("aria-label", "Bar showing the tax saved out of the amount sacrificed");
        renderTable(ctx.breakBody, [
          ["Tax on the full salary", fmtMoney("AUD", r.taxBefore)],
          ["Tax after the sacrifice", fmtMoney("AUD", r.taxAfter)],
          ["Tax saved (your result)", fmtMoney("AUD", r.saved)],
          ["Take-home pay before", fmtMoney("AUD", r.takeBefore)],
          ["Take-home pay after", fmtMoney("AUD", r.takeAfter)],
          ["Amount into super (after 15% fund tax)", fmtMoney("AUD", r.superIn)]
        ]);
      }
    };
ENGINES["salary-sacrifice-uk"] = {
      compute: function (vals) {
        var n = needNums(vals, [["salary", { min: 0, rangeMsg: "Amounts cannot be negative." }],
          ["sacrifice", { min: 0, rangeMsg: "Amounts cannot be negative." }]]);
        if (!n.ok) return n;
        var v = n.values;
        if (v.sacrifice > v.salary) return { state: "range", message: "The sacrificed amount cannot be more than the salary." };
        var before = ukTax(v.salary) + ukNI(v.salary);
        var after = ukTax(v.salary - v.sacrifice) + ukNI(v.salary - v.sacrifice);
        return { state: "ok", salary: v.salary, sacrifice: v.sacrifice,
          saved: before - after, taxBefore: ukTax(v.salary), taxAfter: ukTax(v.salary - v.sacrifice),
          niBefore: ukNI(v.salary), niAfter: ukNI(v.salary - v.sacrifice),
          takeBefore: v.salary - before, takeAfter: (v.salary - v.sacrifice) - after };
      },
      format: function (r) { return fmtMoney("GBP", r.saved); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "Sacrificing " + fmtMoney("GBP", r.sacrifice) + " saves " + fmtMoney("GBP", r.saved) + " in tax and National Insurance; take-home pay falls to " + fmtMoney("GBP", r.takeAfter) + " and " + fmtMoney("GBP", r.sacrifice) + " goes into your pension."
        });
        renderBar(ctx.bar, r.sacrifice > 0 ? Math.min(100, r.saved / r.sacrifice * 100) : 0);
        ctx.legendA.textContent = "Tax and National Insurance saved: " + fmtMoney("GBP", r.saved);
        ctx.legendB.textContent = "Sacrificed: " + fmtMoney("GBP", r.sacrifice);
        ctx.bar.setAttribute("aria-label", "Bar showing the saving out of the amount sacrificed");
        renderTable(ctx.breakBody, [
          ["Income tax before", fmtMoney("GBP", r.taxBefore)],
          ["National Insurance before", fmtMoney("GBP", r.niBefore)],
          ["Income tax after", fmtMoney("GBP", r.taxAfter)],
          ["National Insurance after", fmtMoney("GBP", r.niAfter)],
          ["Total saved (your result)", fmtMoney("GBP", r.saved)],
          ["Take-home pay after", fmtMoney("GBP", r.takeAfter)],
          ["Amount into pension", fmtMoney("GBP", r.sacrifice)]
        ]);
      }
    };
ENGINES["sales-tax-by-state"] = {
    compute: function (vals) {
      var n = needNums(vals, [["price", { min: 0, rangeMsg: "Amounts cannot be negative." }]]);
      if (!n.ok) return n;
      var entry = SALES_RATES[vals.state] || ["Unknown", 0];
      var tax = n.values.price * entry[1] / 100;
      return { state: "ok", price: n.values.price, name: entry[0], rate: entry[1], tax: tax };
    },
    format: function (r) { return fmtMoney("USD", r.tax); },
    render: function (ctx, r) {
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: "On a " + fmtMoney("USD", r.price) + " purchase in " + r.name + " the base sales tax is " + fmtMoney("USD", r.tax) + ", so the total is " + fmtMoney("USD", r.price + r.tax) + ". County and city tax may add more."
      });
      renderBar(ctx.bar, (r.price + r.tax) > 0 ? r.tax / (r.price + r.tax) * 100 : 0);
      ctx.legendA.textContent = "Base sales tax: " + fmtMoney("USD", r.tax);
      ctx.legendB.textContent = "Price before tax: " + fmtMoney("USD", r.price);
      ctx.bar.setAttribute("aria-label", "Bar showing the base sales tax out of the total to pay");
      renderTable(ctx.breakBody, [
        ["Price before tax", fmtMoney("USD", r.price)],
        ["Base rate in " + r.name, fmtNum(r.rate, 3) + "%"],
        ["Base sales tax (your result)", fmtMoney("USD", r.tax)],
        ["Total to pay", fmtMoney("USD", r.price + r.tax)]
      ]);
    }
  };
ENGINES["savings-vs-loan-payoff"] = {
    compute: function (vals) {
      var n = needNums(vals, [["amount", { min: 0, rangeMsg: "Amounts cannot be negative." }],
        ["loan_rate", { min: 0, max: 100, rangeMsg: "Rates must be between 0% and 100%." }],
        ["savings_rate", { min: 0, max: 100, rangeMsg: "Rates must be between 0% and 100%." }],
        ["months", { min: 1, max: 600, rangeMsg: "Months must be between 1 and 600." }]]);
      if (!n.ok) return n;
      var v = n.values;
      var m = Math.round(v.months);
      var loanSaved = v.amount * (v.loan_rate / 100 / 12) * m * (m - 1) / 2;
      var iSav = v.savings_rate / 100 / 12;
      var savInt = iSav === 0 ? 0 : v.amount * (Math.pow(1 + iSav, m) - 1) / iSav - v.amount * m;
      return { state: "ok", amount: v.amount, months: m,
        loanSaved: loanSaved, savInt: savInt };
    },
    format: function (r) {
      if (Math.abs(r.loanSaved - r.savInt) < 0.005) return "Both choices are equal: $" + fmtNum(r.loanSaved, 2) + " gained either way.";
      if (r.loanSaved > r.savInt) return "Paying the loan wins by $" + fmtNum(r.loanSaved - r.savInt, 2);
      return "Saving wins by $" + fmtNum(r.savInt - r.loanSaved, 2);
    },
    render: function (ctx, r) {
      var winner = Math.max(r.loanSaved, r.savInt);
      var total = r.loanSaved + r.savInt;
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: "Over " + r.months + " months, paying the loan saves " + fmtMoney("USD", r.loanSaved) + " in interest and saving earns " + fmtMoney("USD", r.savInt) + " in interest."
      });
      renderBar(ctx.bar, total > 0 ? winner / total * 100 : 0);
      ctx.legendA.textContent = "Loan interest saved: " + fmtMoney("USD", r.loanSaved);
      ctx.legendB.textContent = "Savings interest earned: " + fmtMoney("USD", r.savInt);
      ctx.bar.setAttribute("aria-label", "Bar showing the winning choice out of the two gains");
      renderTable(ctx.breakBody, [
        ["Monthly amount", fmtMoney("USD", r.amount)],
        ["Months compared", "" + r.months],
        ["Loan interest saved", fmtMoney("USD", r.loanSaved)],
        ["Savings interest earned", fmtMoney("USD", r.savInt)],
        ["Winner (your result)", this.format(r)]
      ]);
    }
  };
ENGINES["shift-pay"] = {
      compute: function (vals) {
        var n = needNums(vals, [["day_hours", { min: 0, rangeMsg: "Hours cannot be negative." }],
          ["day_rate", { min: 0, rangeMsg: "Amounts cannot be negative." }],
          ["night_hours", { min: 0, rangeMsg: "Hours cannot be negative." }],
          ["night_rate", { min: 0, rangeMsg: "Amounts cannot be negative." }],
          ["weekend_hours", { min: 0, rangeMsg: "Hours cannot be negative." }],
          ["weekend_rate", { min: 0, rangeMsg: "Amounts cannot be negative." }]]);
        if (!n.ok) return n;
        var v = n.values;
        var day = v.day_hours * v.day_rate;
        var night = v.night_hours * v.night_rate;
        var wk = v.weekend_hours * v.weekend_rate;
        return { state: "ok", day: day, night: night, weekend: wk,
          total: day + night + wk, v: v };
      },
      format: function (r) { return fmtMoney("USD", r.total); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "Day pay " + fmtMoney("USD", r.day) + " + night pay " + fmtMoney("USD", r.night) + " + weekend pay " + fmtMoney("USD", r.weekend) + " = " + fmtMoney("USD", r.total) + " for the shift."
        });
        renderBar(ctx.bar, r.total > 0 ? r.day / r.total * 100 : 0);
        ctx.legendA.textContent = "Day pay: " + fmtMoney("USD", r.day);
        ctx.legendB.textContent = "Night + weekend pay: " + fmtMoney("USD", r.night + r.weekend);
        ctx.bar.setAttribute("aria-label", "Bar showing the day pay out of the total shift pay");
        renderTable(ctx.breakBody, [
          ["Day pay (" + fmtNum(r.v.day_hours, 2) + " hours)", fmtMoney("USD", r.day)],
          ["Night pay (" + fmtNum(r.v.night_hours, 2) + " hours)", fmtMoney("USD", r.night)],
          ["Weekend pay (" + fmtNum(r.v.weekend_hours, 2) + " hours)", fmtMoney("USD", r.weekend)],
          ["Total pay (your result)", fmtMoney("USD", r.total)]
        ]);
      }
    };
ENGINES["sleep"] = {
    compute: function (vals) {
      var raw = vals.wake == null ? "" : String(vals.wake).trim();
      if (raw === "") return { ok: false, state: "empty" };
      var wake = parseTime(raw);
      if (wake === null) return { ok: false, state: "invalid", message: "That wake time is not valid. Use hours and minutes." };
      var n = needNums(vals, [["fall_asleep", { min: 0, max: 120, rangeMsg: "Minutes to fall asleep must be between 0 and 120." }]]);
      if (!n.ok) return n;
      var fall = n.values.fall_asleep;
      var bed = {};
      [4, 5, 6].forEach(function (c) { bed[c] = fmtTime(wake - fall - c * 90); });
      return { state: "ok", wake: raw, fall: fall, bed: bed };
    },
    format: function (r) { return r.bed[5]; },
    render: function (ctx, r) {
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: "To wake at " + r.wake + " after 5 sleep cycles of 90 minutes, go to sleep at " + r.bed[5] + ". For 6 cycles go to sleep at " + r.bed[6] + ", and for 4 cycles at " + r.bed[4] + "."
      });
      renderBar(ctx.bar, 7.5 / 9 * 100);
      ctx.legendA.textContent = "Best bedtime (5 cycles, 7.5 hours): " + r.bed[5];
      ctx.legendB.textContent = "6 cycles (9 hours): " + r.bed[6] + "  |  4 cycles (6 hours): " + r.bed[4];
      ctx.bar.setAttribute("aria-label", "Bar showing 7.5 hours of sleep out of 9 hours");
      renderTable(ctx.breakBody, [
        ["Wake time", r.wake],
        ["Minutes to fall asleep", "" + Math.round(r.fall)],
        ["Bedtime for 6 cycles (9 hours)", r.bed[6]],
        ["Bedtime for 5 cycles (7.5 hours, your result)", r.bed[5]],
        ["Bedtime for 4 cycles (6 hours)", r.bed[4]]
      ]);
    }
  };
ENGINES["steps-to-calories"] = {
    compute: function (vals) {
      var n = needNums(vals, [["steps", { min: 0, max: 100000, rangeMsg: "Steps must be between 0 and 100,000 a day." }],
        ["weight", { min: 20, max: 300, rangeMsg: "Weight must be between 20 and 300 kg." }]]);
      if (!n.ok) return n;
      var v = n.values;
      var kcal = wholeHalfUp(v.steps * 0.04 * v.weight / 70);
      return { state: "ok", steps: v.steps, weight: v.weight, kcal: kcal };
    },
    format: function (r) { return r.kcal + " calories"; },
    render: function (ctx, r) {
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: fmtNum(r.steps, 0) + " steps at " + fmtNum(r.weight, 2) + " kg burn about " + r.kcal + " calories. This is a general guide only, not medical advice."
      });
      renderBar(ctx.bar, Math.min(100, r.steps / 10000 * 100));
      ctx.legendA.textContent = "Calories burned: " + r.kcal;
      ctx.legendB.textContent = "Steps: " + fmtNum(r.steps, 0);
      ctx.bar.setAttribute("aria-label", "Bar showing the steps out of 10,000 steps");
      renderTable(ctx.breakBody, [
        ["Steps", fmtNum(r.steps, 0)],
        ["Body weight", fmtNum(r.weight, 2) + " kg"],
        ["Calories for 5,000 steps", "" + wholeHalfUp(5000 * 0.04 * r.weight / 70)],
        ["Calories for 10,000 steps", "" + wholeHalfUp(10000 * 0.04 * r.weight / 70)],
        ["Calories for 15,000 steps", "" + wholeHalfUp(15000 * 0.04 * r.weight / 70)],
        ["Calories burned (your result)", r.kcal + " calories"]
      ]);
    }
  };
ENGINES["subnet"] = {
    compute: function (vals) {
      var raw = vals.ip == null ? "" : String(vals.ip).trim();
      if (raw === "") return { ok: false, state: "empty" };
      var parts = raw.split(".");
      if (parts.length !== 4) return { state: "invalid", message: "That is not a valid IPv4 address. Use four numbers from 0 to 255, separated by dots." };
      var nums = [];
      for (var i = 0; i < 4; i++) {
        if (!/^\d+$/.test(parts[i])) return { state: "invalid", message: "That is not a valid IPv4 address. Use four numbers from 0 to 255, separated by dots." };
        var p = Number(parts[i]);
        if (p < 0 || p > 255) return { state: "invalid", message: "That is not a valid IPv4 address. Use four numbers from 0 to 255, separated by dots." };
        nums.push(p);
      }
      var n = needNums(vals, [["prefix", { min: 0, max: 32, rangeMsg: "The prefix length must be from 0 to 32." }]]);
      if (!n.ok) return n;
      var prefix = Math.floor(n.values.prefix);
      var addr = ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
      var mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
      var network = (addr & mask) >>> 0;
      var broadcast = (network | (~mask >>> 0)) >>> 0;
      var hosts;
      if (prefix === 32) hosts = 1;
      else if (prefix === 31) hosts = 0;
      else hosts = Math.pow(2, 32 - prefix) - 2;
      return { state: "ok", ip: raw, prefix: prefix, addr: addr,
        network: network, broadcast: broadcast, mask: mask, hosts: hosts,
        first: hosts > 0 ? (network + 1) >>> 0 : network,
        last: hosts > 0 ? (broadcast - 1) >>> 0 : broadcast };
    },
    format: function (r) { return ipText(r.network) + "/" + r.prefix; },
    render: function (ctx, r) {
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: "Network " + ipText(r.network) + ", broadcast " + ipText(r.broadcast) + ", " + fmtNum(r.hosts, 0) + " usable hosts."
      });
      renderBar(ctx.bar, r.prefix / 32 * 100);
      ctx.legendA.textContent = "Network: " + ipText(r.network);
      ctx.legendB.textContent = "Broadcast: " + ipText(r.broadcast);
      ctx.bar.setAttribute("aria-label", "Bar showing the prefix length out of 32 bits");
      renderTable(ctx.breakBody, [
        ["Address given", r.ip],
        ["Subnet mask", ipText(r.mask)],
        ["Network address (your result)", ipText(r.network) + "/" + r.prefix],
        ["Broadcast address", ipText(r.broadcast)],
        ["First usable host", ipText(r.first)],
        ["Last usable host", ipText(r.last)],
        ["Usable hosts", fmtNum(r.hosts, 0)]
      ]);
    }
  };
ENGINES["tile"] = {
    compute: function (vals) {
      var n = needNums(vals, [["area", { min: 0, rangeMsg: "Amounts cannot be negative." }],
        ["tile_length", { min: 0, rangeMsg: "Lengths must be more than zero." }],
        ["tile_width", { min: 0, rangeMsg: "Lengths must be more than zero." }],
        ["waste", { min: 0, max: 100, rangeMsg: "Waste must be between 0% and 100%." }]]);
      if (!n.ok) return n;
      var v = n.values;
      if (v.tile_length === 0 || v.tile_width === 0) return { state: "zero" };
      var tileArea = v.tile_length * v.tile_width;
      var tiles = Math.ceil(v.area / tileArea * (1 + v.waste / 100) - 1e-9);
      return { state: "ok", area: v.area, tileArea: tileArea, tiles: tiles,
        boxes: Math.ceil(tiles / 10 - 1e-9) };
    },
    format: function (r) { return r.tiles + " tiles"; },
    render: function (ctx, r) {
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: "For " + fmtNum(r.area, 2) + " m² you need " + r.tiles + " tiles, which is " + r.boxes + " boxes of 10."
      });
      renderBar(ctx.bar, Math.min(100, r.tiles / 500 * 100));
      ctx.legendA.textContent = "Tiles needed: " + r.tiles;
      ctx.legendB.textContent = "Boxes of 10: " + r.boxes;
      ctx.bar.setAttribute("aria-label", "Bar showing the tiles needed out of 500 tiles");
      renderTable(ctx.breakBody, [
        ["Floor area", fmtNum(r.area, 2) + " m²"],
        ["Area of one tile", fmtNum(r.tileArea, 4) + " m²"],
        ["Tiles without waste", "" + Math.ceil(r.area / r.tileArea - 1e-9)],
        ["Tiles needed (your result)", "" + r.tiles],
        ["Boxes of 10 needed", "" + r.boxes]
      ]);
    }
  };
ENGINES["water-intake"] = {
    compute: function (vals) {
      var n = needNums(vals, [["weight", { min: 20, max: 300, rangeMsg: "Weight must be between 20 and 300 kg." }],
        ["activity", { min: 0, max: 5, rangeMsg: "Activity must be between 0 and 5 hours a day." }]]);
      if (!n.ok) return n;
      var v = n.values;
      var litres = v.weight * 0.035 + v.activity * 0.4;
      return { state: "ok", weight: v.weight, activity: v.activity, litres: litres,
        base: v.weight * 0.035, extra: v.activity * 0.4 };
    },
    format: function (r) { return fmtNum(r.litres, 1) + " litres"; },
    render: function (ctx, r) {
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: "At " + fmtNum(r.weight, 2) + " kg with " + fmtNum(r.activity, 2) + " active hours, aim for " + fmtNum(r.litres, 1) + " litres of water a day. This is a general guide only, not medical advice."
      });
      renderBar(ctx.bar, Math.min(100, r.litres / 4 * 100));
      ctx.legendA.textContent = "Daily intake: " + fmtNum(r.litres, 1) + " litres";
      ctx.legendB.textContent = "Guide: about 4 litres a day at most";
      ctx.bar.setAttribute("aria-label", "Bar showing the daily intake out of 4 litres");
      renderTable(ctx.breakBody, [
        ["Base amount (35 ml per kg)", fmtNum(r.base, 2) + " litres"],
        ["Extra for activity (400 ml per hour)", fmtNum(r.extra, 2) + " litres"],
        ["Daily water intake (your result)", fmtNum(r.litres, 1) + " litres"],
        ["In millilitres", fmtNum(r.litres * 1000, 0) + " ml"]
      ]);
    }
  };
ENGINES["working-days-between"] = {
    compute: function (vals) {
      var n = needNums(vals, [["holidays", { min: 0, rangeMsg: "Holidays cannot be negative." }]]);
      if (!n.ok) return n;
      var d = needDates(vals, ["start", "end"]);
      if (!d.ok) return d;
      var s = d.values.start, e = d.values.end;
      if (s.getTime() > e.getTime()) return { state: "range", message: "The start date is after the end date." };
      var total = daysBetween(s, e) + 1;
      var business = businessDaysBetween(s, e);
      var hol = Math.floor(n.values.holidays);
      if (hol > business) return { state: "range", message: "Holidays cannot be more than the business days in the range." };
      return { state: "ok", start: s, end: e, total: total, business: business,
        weekend: total - business, holidays: hol, working: business - hol };
    },
    format: function (r) { return r.working + (r.working === 1 ? " working day" : " working days"); },
    render: function (ctx, r) {
      setResult({
        resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
        valid: true, resultText: this.format(r),
        sentenceText: "From " + fmtDate(r.start) + " to " + fmtDate(r.end) + " there are " + r.business + " business days, and with " + r.holidays + " public holidays taken off there are " + r.working + " working days."
      });
      renderBar(ctx.bar, r.business > 0 ? r.working / r.business * 100 : 0);
      ctx.legendA.textContent = "Working days: " + r.working;
      ctx.legendB.textContent = "Business days before holidays: " + r.business;
      ctx.bar.setAttribute("aria-label", "Bar showing the working days out of the business days");
      renderTable(ctx.breakBody, [
        ["Start date", fmtDate(r.start)],
        ["End date", fmtDate(r.end)],
        ["Total days (both ends counted)", "" + r.total],
        ["Weekend days", "" + r.weekend],
        ["Business days", "" + r.business],
        ["Public holidays", "" + r.holidays],
        ["Working days (your result)", "" + r.working]
      ]);
    }
  };
