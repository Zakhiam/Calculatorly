/* Calculatorly — stage 2 tool engines (21 tools).
   Loaded after assets/js/calculatorly.js; each entry fills the
   shared ENGINES registry. Helpers (fmtNum, tax tables, ...) come
   from the core file, which is why this file has no helpers. */
ENGINES["amortization"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [{ id: "amount", label: "Loan amount" }, { id: "rate", label: "Yearly interest rate" }, { id: "years", label: "Loan term" }]);
        if (!r.ok) return r;
        if (r.values.years === 0) return { state: "zero", message: "The loan term cannot be zero years." };
        var s = amortSchedule(r.values.amount, r.values.rate, r.values.years);
        return { state: "ok", amount: r.values.amount, rate: r.values.rate, years: r.values.years, payment: s.payment, totalInterest: s.totalInterest, yearly: s.yearly, first: s.first };
      },
      format: function (r) { return money(r.payment); },
      render: function (ctx, r) {
        var n = r.years * 12, total = r.payment * n;
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: money(r.payment),
          sentenceText: "Your monthly payment is " + money(r.payment) + ". Over " + r.years + " years you pay " + money(total) + " in total, of which " + money(r.totalInterest) + " is interest."
        });
        renderBar(ctx.bar, total > 0 ? r.amount / total * 100 : 0);
        ctx.legendA.textContent = "Loan amount: " + money(r.amount);
        ctx.legendB.textContent = "Total interest: " + money(r.totalInterest);
        ctx.bar.setAttribute("aria-label", "Bar showing the loan amount " + money(r.amount) + " out of the total paid " + money(total));
        var rows = [["Monthly payment", money(r.payment)], ["Total paid over " + r.years + " years", money(total)], ["Total interest", money(r.totalInterest)]];
        r.yearly.forEach(function (y) {
          rows.push(["Year " + y.year + " \u2014 interest", money(y.interest)]);
          rows.push(["Year " + y.year + " \u2014 principal", money(y.principal)]);
          rows.push(["Year " + y.year + " \u2014 balance at end of year", money(y.balance)]);
        });
        r.first.forEach(function (m) {
          rows.push(["Month " + m.month + " payment", money(r.payment) + " (interest " + money(m.interest) + ", principal " + money(m.principal) + ", balance " + money(m.balance) + ")"]);
        });
        renderTable(ctx.breakBody, rows);
      }
    };
ENGINES["body-fat"] = {
      compute: function (inputs) {
        var sex = String(inputs.sex || "");
        if (sex !== "male" && sex !== "female") return { state: "invalid", message: "Choose male or female." };
        var r = readAll(inputs, [
          { id: "age", label: "Age", min: 10, max: 100 },
          { id: "height", label: "Height", min: 100, max: 250 },
          { id: "waist", label: "Waist", min: 40, max: 200 },
          { id: "neck", label: "Neck", min: 10, max: 100 },
          { id: "hip", label: "Hip", min: 0, max: 200 }]);
        if (!r.ok) return r;
        if (r.values.waist <= r.values.neck) return { state: "invalid", message: "Waist must be larger than the neck for this formula \u2014 check your measurements." };
        var v, cat;
        if (sex === "male") {
          v = 495 / (1.0324 - 0.19077 * Math.log10(r.values.waist - r.values.neck) + 0.15456 * Math.log10(r.values.height)) - 450;
          cat = v < 6 ? "Essential fat" : v < 14 ? "Athletes" : v < 18 ? "Fitness" : v < 25 ? "Average" : "Obese";
        } else {
          v = 495 / (1.29579 - 0.35004 * Math.log10(r.values.waist + r.values.hip - r.values.neck) + 0.22100 * Math.log10(r.values.height)) - 450;
          cat = v < 14 ? "Essential fat" : v < 21 ? "Athletes" : v < 25 ? "Fitness" : v < 32 ? "Average" : "Obese";
        }
        if (sex === "female" && r.values.waist + r.values.hip - r.values.neck <= 0) return { state: "invalid", message: "Waist plus hip must be larger than the neck for this formula \u2014 check your measurements." };
        return { state: "ok", sex: sex, height: r.values.height, waist: r.values.waist, neck: r.values.neck, hip: r.values.hip, value: v, category: cat };
      },
      format: function (r) { return fmtNum(r.value, 1) + "%"; },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.value, 1) + "%",
          sentenceText: "Body fat about " + fmtNum(r.value, 1) + "% (US Navy method). Category: " + r.category + "."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, r.value)));
        ctx.legendA.textContent = "Your body fat: " + fmtNum(r.value, 1) + "%";
        ctx.legendB.textContent = "Category: " + r.category;
        ctx.bar.setAttribute("aria-label", "Bar showing body fat " + fmtNum(r.value, 1) + "%");
        renderTable(ctx.breakBody, [
          ["Body fat percent (your result)", fmtNum(r.value, 1) + "%"],
          ["Category", r.category],
          ["Waist minus neck", fmtNum(r.waist - r.neck, 2) + " cm"],
          ["Height", fmtNum(r.height, 2) + " cm"]
        ]);
      }
    };
ENGINES["budget-50-30-20"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [{ id: "income", label: "Monthly income" }]);
        if (!r.ok) return r;
        return { state: "ok", income: r.values.income, needs: r.values.income * 0.5, wants: r.values.income * 0.3, savings: r.values.income * 0.2 };
      },
      format: function (r) { return "Needs " + money(r.needs) + ", Wants " + money(r.wants) + ", Savings " + money(r.savings); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "50% for needs, 30% for wants and 20% for savings, from " + money(r.income) + " a month after tax."
        });
        renderBar(ctx.bar, 50);
        ctx.legendA.textContent = "Needs (50%): " + money(r.needs);
        ctx.legendB.textContent = "Wants (30%) and savings (20%): " + money(r.wants + r.savings);
        ctx.bar.setAttribute("aria-label", "Bar showing needs at 50% of income");
        renderTable(ctx.breakBody, [
          ["Monthly income after tax", money(r.income)],
          ["Needs (50%)", money(r.needs)],
          ["Wants (30%)", money(r.wants)],
          ["Savings (20%)", money(r.savings)]
        ]);
      }
    };
ENGINES["credit-card-payoff"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [{ id: "balance", label: "Card balance" }, { id: "rate", label: "Yearly interest rate" }, { id: "payment", label: "Monthly payment" }]);
        if (!r.ok) return r;
        if (r.values.payment === 0) return { state: "invalid", message: "The monthly payment must be more than $0.00." };
        var firstInterest = r.values.balance * r.values.rate / 100 / 12;
        var res = cardPayoff(r.values.balance, r.values.rate, r.values.payment);
        if (!res) return { state: "invalid", message: "Your payment of " + money(r.values.payment) + " does not cover the monthly interest of " + money(firstInterest) + ", so the balance never falls." };
        return { state: "ok", balance: r.values.balance, rate: r.values.rate, payment: r.values.payment, months: res.months, interest: res.interest, totalPaid: res.totalPaid, lastPayment: res.lastPayment, firstInterest: firstInterest };
      },
      format: function (r) { return r.months + " months, " + money(r.interest) + " interest"; },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "Total paid " + money(r.totalPaid) + " over " + r.months + " months. First month's interest " + money(r.firstInterest) + "."
        });
        renderBar(ctx.bar, r.totalPaid > 0 ? r.balance / r.totalPaid * 100 : 0);
        ctx.legendA.textContent = "Card balance: " + money(r.balance);
        ctx.legendB.textContent = "Total interest: " + money(r.interest);
        ctx.bar.setAttribute("aria-label", "Bar showing the card balance " + money(r.balance) + " out of the total paid " + money(r.totalPaid));
        renderTable(ctx.breakBody, [
          ["Months to clear the card", r.months + " months"],
          ["Total paid", money(r.totalPaid)],
          ["Total interest (your result)", money(r.interest)],
          ["First month's interest", money(r.firstInterest)],
          ["Last payment", money(r.lastPayment)]
        ]);
      }
    };
ENGINES["currency-converter"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [{ id: "amount", label: "Amount" }, { id: "rate", label: "Exchange rate" }]);
        if (!r.ok) return r;
        return { state: "ok", amount: r.values.amount, rate: r.values.rate, converted: r.values.amount * r.values.rate };
      },
      format: function (r) { return fmtNum(r.converted, 2); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.converted, 2),
          sentenceText: fmtNum(r.amount, 2) + " at a rate of " + fmtNum(r.rate, 2) + " converts to " + fmtNum(r.converted, 2) + ". This site does not fetch live rates \u2014 the rate is the one you typed."
        });
        renderBar(ctx.bar, r.rate === 0 ? 0 : (r.rate >= 1 ? 100 / r.rate : r.rate * 100));
        ctx.legendA.textContent = "Amount: " + fmtNum(r.amount, 2);
        ctx.legendB.textContent = "Converted amount: " + fmtNum(r.converted, 2);
        ctx.bar.setAttribute("aria-label", "Bar showing the amount " + fmtNum(r.amount, 2) + " against the converted amount " + fmtNum(r.converted, 2));
        renderTable(ctx.breakBody, [
          ["Amount to convert", fmtNum(r.amount, 2)],
          ["Exchange rate (typed by you)", fmtNum(r.rate, 2)],
          ["Converted amount (your result)", fmtNum(r.converted, 2)],
          ["Reverse rate", r.rate > 0 ? fmtNum(1 / r.rate, 4) : "\u2014"],
          ["Same amount at a rate of 1.00", fmtNum(r.amount, 2)]
        ]);
      }
    };
ENGINES["debt-payoff"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [{ id: "payment", label: "Total monthly payment" }, { id: "balance1", label: "Debt 1 balance" }, { id: "rate1", label: "Debt 1 yearly rate" }, { id: "balance2", label: "Debt 2 balance" }, { id: "rate2", label: "Debt 2 yearly rate" }, { id: "balance3", label: "Debt 3 balance" }, { id: "rate3", label: "Debt 3 yearly rate" }]);
        if (!r.ok) return r;
        if (r.values.payment === 0) return { state: "invalid", message: "The monthly payment must be more than $0.00." };
        var debts = [];
        [1, 2, 3].forEach(function (i) {
          if (r.values["balance" + i] > 0) debts.push({ balance: r.values["balance" + i], rate: r.values["rate" + i], label: "Debt " + i });
        });
        if (!debts.length) return { state: "invalid", message: "Add at least one debt with a balance above $0.00." };
        var firstInterest = 0, total = 0;
        debts.forEach(function (d) { firstInterest += d.balance * d.rate / 100 / 12; total += d.balance; });
        if (r.values.payment <= firstInterest) return { state: "invalid", message: "Your payment of " + money(r.values.payment) + " does not cover the monthly interest of " + money(firstInterest) + ", so the debts never fall." };
        var snowOrder = debts.map(function (d, i) { return i; }).sort(function (a, b) { return debts[a].balance - debts[b].balance; });
        var avalOrder = debts.map(function (d, i) { return i; }).sort(function (a, b) { return debts[b].rate - debts[a].rate; });
        var snow = debtSim(r.values.payment, debts, snowOrder);
        var aval = debtSim(r.values.payment, debts, avalOrder);
        if (!snow || !aval) return { state: "invalid", message: "This payment never clears the debts." };
        var orderText = function (order) { return order.map(function (i) { return debts[i].label; }).join(", "); };
        return { state: "ok", payment: r.values.payment, total: total, snow: snow, aval: aval, snowOrder: orderText(snowOrder), avalOrder: orderText(avalOrder) };
      },
      format: function (r) {
        return "Snowball: " + r.snow.months + " months, " + money(r.snow.interest) + " interest. Avalanche: " + r.aval.months + " months, " + money(r.aval.interest) + " interest.";
      },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "Total debt " + money(r.total) + ". Snowball order: " + r.snowOrder + ". Avalanche order: " + r.avalOrder + "."
        });
        renderBar(ctx.bar, (r.total + r.aval.interest) > 0 ? r.total / (r.total + r.aval.interest) * 100 : 0);
        ctx.legendA.textContent = "Total debt: " + money(r.total);
        ctx.legendB.textContent = "Avalanche interest: " + money(r.aval.interest);
        ctx.bar.setAttribute("aria-label", "Bar showing the total debt " + money(r.total) + " out of debt plus avalanche interest");
        renderTable(ctx.breakBody, [
          ["Total debt", money(r.total)],
          ["Monthly payment", money(r.payment)],
          ["Snowball months", r.snow.months + " months"],
          ["Snowball interest", money(r.snow.interest)],
          ["Avalanche months", r.aval.months + " months"],
          ["Avalanche interest", money(r.aval.interest)],
          ["Snowball order", r.snowOrder],
          ["Avalanche order", r.avalOrder]
        ]);
      }
    };
ENGINES["down-payment"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [{ id: "price", label: "Home price" }, { id: "percent", label: "Deposit percent", max: 100 }]);
        if (!r.ok) return r;
        return { state: "ok", price: r.values.price, percent: r.values.percent, deposit: r.values.price * r.values.percent / 100, loan: r.values.price * (1 - r.values.percent / 100) };
      },
      format: function (r) { return money(r.deposit); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: money(r.deposit),
          sentenceText: "Deposit " + money(r.deposit) + " on a " + money(r.price) + " home leaves a loan of " + money(r.loan) + "."
        });
        renderBar(ctx.bar, r.percent);
        ctx.legendA.textContent = "Deposit: " + money(r.deposit);
        ctx.legendB.textContent = "Loan left to borrow: " + money(r.loan);
        ctx.bar.setAttribute("aria-label", "Bar showing the deposit " + money(r.deposit) + " out of the home price " + money(r.price));
        renderTable(ctx.breakBody, [
          ["Home price", money(r.price)],
          ["Deposit percent", fmtNum(r.percent, 2) + "%"],
          ["Deposit (your result)", money(r.deposit)],
          ["Loan left to borrow", money(r.loan)],
          ["Deposit at 5%", money(r.price * 0.05)],
          ["Deposit at 10%", money(r.price * 0.10)],
          ["Deposit at 20%", money(r.price * 0.20)]
        ]);
      }
    };
ENGINES["fuel-vs-ev"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [{ id: "miles", label: "Miles driven in a year" }, { id: "mpg", label: "Miles per gallon" }, { id: "fuel_price", label: "Petrol price per gallon" }, { id: "kwh_per_mile", label: "kWh used per mile" }, { id: "elec_price", label: "Electricity price per kWh" }]);
        if (!r.ok) return r;
        if (r.values.mpg === 0) return { state: "zero", message: "Miles per gallon cannot be zero \u2014 the sum divides by it." };
        var petrol = r.values.miles / r.values.mpg * r.values.fuel_price;
        var ev = r.values.miles * r.values.kwh_per_mile * r.values.elec_price;
        return { state: "ok", miles: r.values.miles, petrol: petrol, ev: ev };
      },
      format: function (r) { return "Petrol: " + money(r.petrol) + " a year, Electric: " + money(r.ev) + " a year"; },
      render: function (ctx, r) {
        var diff = Math.abs(r.petrol - r.ev);
        var sentence;
        if (r.miles === 0) sentence = "With 0 miles a year, both cost $0.00 a year.";
        else if (r.petrol < r.ev) sentence = "Petrol costs " + money(diff) + " less a year. Petrol is " + money(r.petrol / r.miles) + " per mile; electric is " + money(r.ev / r.miles) + " per mile.";
        else if (r.ev < r.petrol) sentence = "Electric costs " + money(diff) + " less a year. Petrol is " + money(r.petrol / r.miles) + " per mile; electric is " + money(r.ev / r.miles) + " per mile.";
        else sentence = "Both cost the same a year.";
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: sentence
        });
        var cheaper = Math.min(r.petrol, r.ev), dearer = Math.max(r.petrol, r.ev);
        renderBar(ctx.bar, dearer > 0 ? cheaper / dearer * 100 : 0);
        ctx.legendA.textContent = "Petrol: " + money(r.petrol) + " a year";
        ctx.legendB.textContent = "Electric: " + money(r.ev) + " a year";
        ctx.bar.setAttribute("aria-label", "Bar showing the cheaper yearly cost against the dearest");
        renderTable(ctx.breakBody, [
          ["Petrol cost per year", money(r.petrol)],
          ["Electric cost per year", money(r.ev)],
          ["Difference per year", money(diff)],
          ["Petrol cost per mile", r.miles > 0 ? money(r.petrol / r.miles) : "\u2014"],
          ["Electric cost per mile", r.miles > 0 ? money(r.ev / r.miles) : "\u2014"]
        ]);
      }
    };
ENGINES["gpa-grade"] = {
      compute: function (inputs) {
        var points = { A: 4, B: 3, C: 2, D: 1, F: 0 };
        var courses = [];
        for (var i = 1; i <= 4; i++) {
          var grade = String(inputs["grade" + i] || "");
          var cr = numVal(inputs["credits" + i], { label: "Course " + i + " credit hours", min: 0, max: 10 });
          if (!cr.ok) return cr;
          if (grade !== "" && !(grade in points)) return { state: "invalid", message: "Course " + i + " grade must be A, B, C, D or F." };
          if (grade === "" && cr.value > 0) return { state: "invalid", message: "Course " + i + " has credits but no grade \u2014 choose a grade or set the credits to 0." };
          if (grade !== "" && cr.value === 0) return { state: "invalid", message: "Course " + i + " has a grade but 0 credits \u2014 type the credit hours." };
          if (grade !== "") courses.push({ grade: grade, credits: cr.value, points: points[grade] * cr.value });
        }
        if (!courses.length) return { state: "invalid", message: "Add at least one course with a grade and credits." };
        var tp = 0, tc = 0;
        courses.forEach(function (c) { tp += c.points; tc += c.credits; });
        return { state: "ok", courses: courses, totalPoints: tp, totalCredits: tc, gpa: tp / tc };
      },
      format: function (r) { return fmtNum(r.gpa, 2); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.gpa, 2),
          sentenceText: "Total grade points " + fmtNum(r.totalPoints, 2) + " over " + r.totalCredits + " credits."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, r.gpa / 4 * 100)));
        ctx.legendA.textContent = "Your GPA: " + fmtNum(r.gpa, 2);
        ctx.legendB.textContent = "Top of the scale: 4.00";
        ctx.bar.setAttribute("aria-label", "Bar showing GPA " + fmtNum(r.gpa, 2) + " out of 4.00");
        var rows = [["Total credits", "" + r.totalCredits], ["Total grade points", fmtNum(r.totalPoints, 2)], ["GPA (your result)", fmtNum(r.gpa, 2)]];
        r.courses.forEach(function (c, i) {
          rows.push(["Course " + (i + 1) + " (" + c.grade + ", " + c.credits + " credits)", fmtNum(c.points, 2) + " points"]);
        });
        renderTable(ctx.breakBody, rows);
      }
    };
ENGINES["house-affordability"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [{ id: "income", label: "Yearly income" }, { id: "deposit", label: "Deposit" }, { id: "debts", label: "Other monthly debt payments" }, { id: "rate", label: "Mortgage rate" }, { id: "years", label: "Mortgage term" }]);
        if (!r.ok) return r;
        if (r.values.years === 0) return { state: "zero", message: "The mortgage term cannot be zero years." };
        var mp = r.values.income / 12 * 0.28 - r.values.debts;
        if (mp <= 0) return { state: "invalid", message: "With these debts, no monthly payment fits the 28% rule \u2014 the largest payment is $0.00 or less. Lower your debts or raise your income." };
        var rr = r.values.rate / 100 / 12, n = r.values.years * 12;
        var loan = rr === 0 ? mp * n : mp * (1 - Math.pow(1 + rr, -n)) / rr;
        return { state: "ok", income: r.values.income, deposit: r.values.deposit, debts: r.values.debts, rate: r.values.rate, years: r.values.years, payment: mp, loan: loan, price: loan + r.values.deposit };
      },
      format: function (r) { return money(r.price); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: money(r.price),
          sentenceText: "Largest monthly payment " + money(r.payment) + " supports a loan of " + money(r.loan) + "; with your " + money(r.deposit) + " deposit the highest price is " + money(r.price) + "."
        });
        renderBar(ctx.bar, r.price > 0 ? r.loan / r.price * 100 : 0);
        ctx.legendA.textContent = "Largest loan: " + money(r.loan);
        ctx.legendB.textContent = "Deposit: " + money(r.deposit);
        ctx.bar.setAttribute("aria-label", "Bar showing the largest loan " + money(r.loan) + " out of the highest price " + money(r.price));
        renderTable(ctx.breakBody, [
          ["Monthly income", money(r.income / 12)],
          ["28% of monthly income", money(r.income / 12 * 0.28)],
          ["Largest monthly payment (after debts)", money(r.payment)],
          ["Largest loan", money(r.loan)],
          ["Deposit", money(r.deposit)],
          ["Highest home price", money(r.price)]
        ]);
      }
    };
ENGINES["ideal-weight"] = {
      compute: function (inputs) {
        var sex = String(inputs.sex || "");
        if (sex !== "male" && sex !== "female") return { state: "invalid", message: "Choose male or female." };
        var r = readAll(inputs, [{ id: "height", label: "Height", min: 100, max: 250 }]);
        if (!r.ok) return r;
        var m = r.values.height / 100;
        var lo = 18.5 * m * m, hi = 24.9 * m * m;
        var inch = r.values.height / 2.54;
        var devine = (sex === "male" ? 50 : 45.5) + 2.3 * Math.max(0, inch - 60);
        return { state: "ok", sex: sex, height: r.values.height, low: lo, high: hi, devine: devine };
      },
      format: function (r) { return fmtNum(r.low, 1) + "\u2013" + fmtNum(r.high, 1) + " kg"; },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "Healthy range " + fmtNum(r.low, 1) + "\u2013" + fmtNum(r.high, 1) + " kg (" + fmtNum(r.low * 2.20462, 1) + "\u2013" + fmtNum(r.high * 2.20462, 1) + " lb). Devine ideal: " + fmtNum(r.devine, 1) + " kg."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, (r.devine - r.low) / (r.high - r.low) * 100)));
        ctx.legendA.textContent = "Healthy range: " + fmtNum(r.low, 1) + "\u2013" + fmtNum(r.high, 1) + " kg";
        ctx.legendB.textContent = "Devine ideal: " + fmtNum(r.devine, 1) + " kg";
        ctx.bar.setAttribute("aria-label", "Bar showing the Devine ideal weight inside the healthy range");
        renderTable(ctx.breakBody, [
          ["Lowest healthy weight", fmtNum(r.low, 1) + " kg"],
          ["Highest healthy weight", fmtNum(r.high, 1) + " kg"],
          ["Lowest healthy weight", fmtNum(r.low * 2.20462, 1) + " lb"],
          ["Highest healthy weight", fmtNum(r.high * 2.20462, 1) + " lb"],
          ["Devine ideal weight", fmtNum(r.devine, 1) + " kg"]
        ]);
      }
    };
ENGINES["inflation"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [{ id: "amount", label: "Amount" }, { id: "years", label: "Years", max: 100 }, { id: "rate", label: "Yearly inflation rate" }]);
        if (!r.ok) return r;
        var adj = r.values.amount * Math.pow(1 + r.values.rate / 100, r.values.years);
        return { state: "ok", amount: r.values.amount, years: r.values.years, rate: r.values.rate, adjusted: adj };
      },
      format: function (r) { return money(r.adjusted); },
      render: function (ctx, r) {
        var rise = r.adjusted - r.amount;
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: money(r.adjusted),
          sentenceText: r.amount === 0 ? "An amount of $0.00 stays $0.00, whatever the rate." :
            money(r.amount) + " from " + r.years + " years ago at " + fmtNum(r.rate, 2) + "% a year is " + money(r.adjusted) + " today \u2014 a rise of " + money(rise) + " (" + fmtPct(rise / r.amount * 100) + ")."
        });
        renderBar(ctx.bar, r.adjusted > 0 ? r.amount / r.adjusted * 100 : 0);
        ctx.legendA.textContent = "Past amount: " + money(r.amount);
        ctx.legendB.textContent = "Today's amount: " + money(r.adjusted);
        ctx.bar.setAttribute("aria-label", "Bar showing the past amount " + money(r.amount) + " out of today's amount " + money(r.adjusted));
        renderTable(ctx.breakBody, [
          ["Amount in the past year", money(r.amount)],
          ["Amount in today's money (your result)", money(r.adjusted)],
          ["Rise in dollars", money(rise)],
          ["Rise in percent", r.amount === 0 ? "0.00%" : fmtPct(rise / r.amount * 100)],
          ["Same amount at 2% a year", money(r.amount * Math.pow(1.02, r.years))],
          ["Same amount at 5% a year", money(r.amount * Math.pow(1.05, r.years))]
        ]);
      }
    };
ENGINES["loan-comparison"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [{ id: "amount_a", label: "Loan A amount" }, { id: "rate_a", label: "Loan A rate" }, { id: "years_a", label: "Loan A term" }, { id: "amount_b", label: "Loan B amount" }, { id: "rate_b", label: "Loan B rate" }, { id: "years_b", label: "Loan B term" }]);
        if (!r.ok) return r;
        if (r.values.years_a === 0 || r.values.years_b === 0) return { state: "zero", message: "A loan term cannot be zero years." };
        var pa = payMonthly(r.values.amount_a, r.values.rate_a, r.values.years_a * 12);
        var pb = payMonthly(r.values.amount_b, r.values.rate_b, r.values.years_b * 12);
        var ia = pa * r.values.years_a * 12 - r.values.amount_a;
        var ib = pb * r.values.years_b * 12 - r.values.amount_b;
        return { state: "ok", pa: pa, ia: ia, pb: pb, ib: ib, ta: pa * r.values.years_a * 12, tb: pb * r.values.years_b * 12 };
      },
      format: function (r) {
        if (r.ia < r.ib) return "Loan A costs " + money(r.ib - r.ia) + " less in total interest";
        if (r.ib < r.ia) return "Loan A costs " + money(r.ia - r.ib) + " more in total interest";
        return "Both loans cost the same in total interest";
      },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "Loan A: " + money(r.pa) + " a month, " + money(r.ia) + " interest. Loan B: " + money(r.pb) + " a month, " + money(r.ib) + " interest."
        });
        var cheaper = Math.min(r.ia, r.ib), dearer = Math.max(r.ia, r.ib);
        renderBar(ctx.bar, dearer > 0 ? cheaper / dearer * 100 : 0);
        ctx.legendA.textContent = "Cheaper loan interest: " + money(cheaper);
        ctx.legendB.textContent = "Dearest loan interest: " + money(dearer);
        ctx.bar.setAttribute("aria-label", "Bar showing the cheaper total interest " + money(cheaper) + " against the dearest " + money(dearer));
        renderTable(ctx.breakBody, [
          ["Loan A monthly payment", money(r.pa)],
          ["Loan A total interest", money(r.ia)],
          ["Loan A total paid", money(r.ta)],
          ["Loan B monthly payment", money(r.pb)],
          ["Loan B total interest", money(r.ib)],
          ["Loan B total paid", money(r.tb)],
          ["Difference in total interest", money(Math.abs(r.ia - r.ib))]
        ]);
      }
    };
ENGINES["macro"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [
          { id: "calories", label: "Daily calories" },
          { id: "protein", label: "Protein percent", max: 100 },
          { id: "carbs", label: "Carbs percent", max: 100 },
          { id: "fat", label: "Fat percent", max: 100 }]);
        if (!r.ok) return r;
        var sum = r.values.protein + r.values.carbs + r.values.fat;
        if (sum !== 100) return { state: "invalid", message: "Protein, carbs and fat must add up to 100% \u2014 yours add up to " + fmtNum(sum, 2) + "%." };
        var pr = roundHalfUp(r.values.calories * r.values.protein / 100 / 4, 0);
        var ca = roundHalfUp(r.values.calories * r.values.carbs / 100 / 4, 0);
        var fa = roundHalfUp(r.values.calories * r.values.fat / 100 / 9, 0);
        return { state: "ok", calories: r.values.calories, protein: pr, carbs: ca, fat: fa };
      },
      format: function (r) { return "Protein " + r.protein + " g, Carbs " + r.carbs + " g, Fat " + r.fat + " g"; },
      render: function (ctx, r) {
        var kcalP = r.protein * 4, kcalC = r.carbs * 4, kcalF = r.fat * 9, total = kcalP + kcalC + kcalF;
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "Protein gives " + kcalP + " calories, carbs " + kcalC + " and fat " + kcalF + ", from the rounded grams."
        });
        renderBar(ctx.bar, total > 0 ? kcalP / total * 100 : 0);
        ctx.legendA.textContent = "Protein calories: " + kcalP;
        ctx.legendB.textContent = "Carbs and fat calories: " + (kcalC + kcalF);
        ctx.bar.setAttribute("aria-label", "Bar showing protein calories out of the total");
        renderTable(ctx.breakBody, [
          ["Protein", r.protein + " g (" + kcalP + " calories)"],
          ["Carbs", r.carbs + " g (" + kcalC + " calories)"],
          ["Fat", r.fat + " g (" + kcalF + " calories)"],
          ["Total from the rounded grams", total + " calories"]
        ]);
      }
    };
ENGINES["pace"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [{ id: "distance", label: "Distance" }, { id: "time", label: "Time" }]);
        if (!r.ok) return r;
        if (r.values.distance === 0) return { state: "zero", message: "The distance cannot be zero \u2014 a pace over zero distance has no answer." };
        var perKm = r.values.time / r.values.distance;
        return { state: "ok", distance: r.values.distance, time: r.values.time, perKm: perKm, perMile: perKm * 1.60934 };
      },
      format: function (r) { return fmtPace(r.perKm) + " min/km, " + fmtPace(r.perMile) + " min/mile"; },
      render: function (ctx, r) {
        var hours = r.time / 60;
        var kmh = hours > 0 ? r.distance / hours : 0;
        var mph = kmh / 1.60934;
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "Speed " + fmtNum(kmh, 2) + " km/h (" + fmtNum(mph, 2) + " mph) over " + fmtNum(r.distance, 2) + " km in " + fmtNum(r.time, 2) + " minutes."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, kmh / 20 * 100)));
        ctx.legendA.textContent = "Pace per km: " + fmtPace(r.perKm) + " min/km";
        ctx.legendB.textContent = "Pace per mile: " + fmtPace(r.perMile) + " min/mile";
        ctx.bar.setAttribute("aria-label", "Bar showing speed " + fmtNum(kmh, 2) + " km/h out of 20 km/h");
        renderTable(ctx.breakBody, [
          ["Pace per kilometre", fmtPace(r.perKm) + " min/km"],
          ["Pace per mile", fmtPace(r.perMile) + " min/mile"],
          ["Speed", fmtNum(kmh, 2) + " km/h"],
          ["Speed", fmtNum(mph, 2) + " mph"],
          ["Distance", fmtNum(r.distance, 2) + " km"],
          ["Time", fmtNum(r.time, 2) + " minutes"]
        ]);
      }
    };
ENGINES["pregnancy-due-date"] = {
      compute: function (inputs) {
        var raw = (inputs.lmp === null || inputs.lmp === undefined) ? "" : String(inputs.lmp).trim();
        if (raw === "") return { state: "empty" };
        var lmp = parseDate(raw);
        if (!lmp) return { state: "invalid", message: "Pick a valid date for the first day of your last period." };
        var now = new Date();
        var today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        if (lmp.getTime() > today.getTime()) return { state: "invalid", message: "The last period cannot start in the future." };
        var due = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
        var weeks = Math.floor((today.getTime() - lmp.getTime()) / (7 * 24 * 60 * 60 * 1000));
        var trimester = weeks > 40 ? "Past the due date" : weeks < 14 ? "First trimester (weeks 1\u201313)" : weeks < 28 ? "Second trimester (weeks 14\u201327)" : "Third trimester (weeks 28\u201340)";
        return { state: "ok", lmp: lmp, due: due, weeks: weeks, trimester: trimester };
      },
      format: function (r) { return fmtDate(r.due); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtDate(r.due),
          sentenceText: "That is 40 weeks from the first day of the last period. You are about " + r.weeks + " weeks pregnant today."
        });
        renderBar(ctx.bar, Math.max(0, Math.min(100, r.weeks / 40 * 100)));
        ctx.legendA.textContent = "Weeks pregnant: " + r.weeks;
        ctx.legendB.textContent = "Full pregnancy: 40 weeks";
        ctx.bar.setAttribute("aria-label", "Bar showing " + r.weeks + " weeks out of 40");
        renderTable(ctx.breakBody, [
          ["Estimated due date (your result)", fmtDate(r.due)],
          ["Week of pregnancy", r.weeks + " weeks"],
          ["Trimester", r.trimester],
          ["First day of last period", fmtDate(r.lmp)]
        ]);
      }
    };
ENGINES["refinance-comparison"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [{ id: "balance", label: "Loan balance" }, { id: "current_rate", label: "Current rate" }, { id: "new_rate", label: "New rate" }, { id: "years", label: "New loan term" }, { id: "costs", label: "Refinancing fees" }]);
        if (!r.ok) return r;
        if (r.values.years === 0) return { state: "zero", message: "The new loan term cannot be zero years." };
        var cp = payMonthly(r.values.balance, r.values.current_rate, r.values.years * 12);
        var np = payMonthly(r.values.balance, r.values.new_rate, r.values.years * 12);
        var s = cp - np;
        return { state: "ok", balance: r.values.balance, years: r.values.years, costs: r.values.costs, oldPayment: cp, newPayment: np, saving: s, breakEven: s > 0 ? Math.ceil(r.values.costs / s) : null };
      },
      format: function (r) {
        if (r.saving > 0) return "Save " + money(r.saving) + " a month";
        if (r.saving < 0) return "Costs " + money(-r.saving) + " more a month";
        return "No change in the monthly payment";
      },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: this.format(r),
          sentenceText: "Old payment " + money(r.oldPayment) + ", new payment " + money(r.newPayment) + ". " +
            (r.saving > 0 ? "The " + money(r.costs) + " fees pay for themselves in " + r.breakEven + " months." :
             r.saving < 0 ? "There is no break-even month \u2014 the new loan costs more every month." : "The payments are the same.")
        });
        renderBar(ctx.bar, r.saving > 0 && r.oldPayment > 0 ? r.saving / r.oldPayment * 100 : 0);
        ctx.legendA.textContent = "Monthly saving: " + money(Math.max(0, r.saving));
        ctx.legendB.textContent = "Old monthly payment: " + money(r.oldPayment);
        ctx.bar.setAttribute("aria-label", "Bar showing the monthly saving " + money(Math.max(0, r.saving)) + " against the old payment " + money(r.oldPayment));
        renderTable(ctx.breakBody, [
          ["Old monthly payment", money(r.oldPayment)],
          ["New monthly payment", money(r.newPayment)],
          ["Monthly saving (your result)", money(r.saving)],
          ["Refinancing fees", money(r.costs)],
          ["Break-even month", r.breakEven !== null ? r.breakEven + " months" : "No break-even month"],
          ["Saving over the full term (after fees)", money(r.saving * r.years * 12 - r.costs)]
        ]);
      }
    };
ENGINES["rent-vs-buy"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [{ id: "rent", label: "Monthly rent" }, { id: "price", label: "Home price" }, { id: "deposit", label: "Deposit" }, { id: "rate", label: "Mortgage rate" }, { id: "years", label: "Years to compare" }]);
        if (!r.ok) return r;
        if (r.values.years === 0) return { state: "zero", message: "The number of years cannot be zero." };
        if (r.values.deposit > r.values.price) return { state: "invalid", message: "The deposit cannot be more than the home price." };
        var loan = r.values.price - r.values.deposit;
        var mp = payMonthly(loan, r.values.rate, 360);
        var buy = r.values.deposit + mp * 12 * r.values.years;
        var rentT = r.values.rent * 12 * r.values.years;
        var be = r.values.rent > mp ? r.values.deposit / (12 * (r.values.rent - mp)) : null;
        return { state: "ok", rent: r.values.rent, price: r.values.price, deposit: r.values.deposit, rate: r.values.rate, years: r.values.years, payment: mp, buying: buy, renting: rentT, breakEven: be };
      },
      format: function (r) {
        if (r.buying < r.renting) return "Buying is cheaper by " + money(r.renting - r.buying);
        if (r.renting < r.buying) return "Renting is cheaper by " + money(r.buying - r.renting);
        return "Both cost the same";
      },
      render: function (ctx, r) {
        var cheaper = Math.min(r.buying, r.renting), dearer = Math.max(r.buying, r.renting);
        var verdict = this.format(r);
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: verdict,
          sentenceText: "Buying costs " + money(r.buying) + " over " + r.years + " years; renting costs " + money(r.renting) + ". " +
            (r.breakEven !== null ? "The two totals meet after about " + fmtNum(r.breakEven, 2) + " years." : "The rent is below the monthly mortgage payment, so the two totals never meet.")
        });
        renderBar(ctx.bar, dearer > 0 ? cheaper / dearer * 100 : 0);
        ctx.legendA.textContent = "Cheaper choice total: " + money(cheaper);
        ctx.legendB.textContent = "Dearest choice total: " + money(dearer);
        ctx.bar.setAttribute("aria-label", "Bar showing the cheaper total " + money(cheaper) + " against the dearest total " + money(dearer));
        renderTable(ctx.breakBody, [
          ["Monthly mortgage payment (30-year term)", money(r.payment)],
          ["Total cost of buying over " + r.years + " years", money(r.buying)],
          ["Total cost of renting over " + r.years + " years", money(r.renting)],
          ["Difference", money(Math.abs(r.buying - r.renting))],
          ["Break-even year", r.breakEven !== null ? "About " + fmtNum(r.breakEven, 2) + " years" : "No break-even year \u2014 the rent is below the mortgage payment"]
        ]);
      }
    };
ENGINES["tip-tax-discount"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [
          { id: "price", label: "Price" },
          { id: "discount", label: "Discount percent", max: 100 },
          { id: "tax", label: "Tax percent", max: 100 },
          { id: "tip", label: "Tip percent", max: 100 }]);
        if (!r.ok) return r;
        var discd = r.values.price * (1 - r.values.discount / 100);
        var taxAmt = discd * r.values.tax / 100;
        var sub = discd + taxAmt;
        var tipAmt = sub * r.values.tip / 100;
        return { state: "ok", price: r.values.price, discount: r.values.discount, discountAmount: r.values.price - discd, discounted: discd, taxAmount: taxAmt, tipAmount: tipAmt, total: sub + tipAmt };
      },
      format: function (r) { return money(r.total); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: money(r.total),
          sentenceText: "After a " + money(r.discountAmount) + " discount, " + money(r.taxAmount) + " tax and a " + money(r.tipAmount) + " tip, the total is " + money(r.total) + "."
        });
        renderBar(ctx.bar, r.price > 0 ? Math.max(0, Math.min(100, r.total / r.price * 100)) : 0);
        ctx.legendA.textContent = "Final total: " + money(r.total);
        ctx.legendB.textContent = "Price before discount: " + money(r.price);
        ctx.bar.setAttribute("aria-label", "Bar showing the final total " + money(r.total) + " against the starting price " + money(r.price));
        renderTable(ctx.breakBody, [
          ["Price before discount", money(r.price)],
          ["Discount (" + fmtNum(r.discount, 2) + "%)", "\u2212" + money(r.discountAmount)],
          ["Price after discount", money(r.discounted)],
          ["Tax", money(r.taxAmount)],
          ["Tip", money(r.tipAmount)],
          ["Final total (your result)", money(r.total)]
        ]);
      }
    };
ENGINES["unit-converter"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [{ id: "value", label: "Value" }]);
        if (!r.ok) return r;
        var cat = String(inputs.category || "");
        var from = String(inputs.from || ""), to = String(inputs.to || "");
        if (cat !== "temperature" && !(cat in UNIT_FACTORS)) return { state: "invalid", message: "Choose what you are converting: length, weight, volume, temperature, area or speed." };
        if (cat === "temperature") {
          if (["\u00B0C", "\u00B0F", "K"].indexOf(from) === -1 || ["\u00B0C", "\u00B0F", "K"].indexOf(to) === -1) return { state: "invalid", message: "Choose a temperature unit: Celsius, Fahrenheit or Kelvin." };
          var c;
          if (from === "\u00B0C") c = r.values.value;
          else if (from === "\u00B0F") c = (r.values.value - 32) * 5 / 9;
          else c = r.values.value - 273.15;
          var out;
          if (to === "\u00B0C") out = c;
          else if (to === "\u00B0F") out = c * 9 / 5 + 32;
          else out = c + 273.15;
          return { state: "ok", value: r.values.value, category: cat, from: from, to: to, converted: out, factor: null };
        }
        var factors = UNIT_FACTORS[cat];
        if (!(from in factors) || !(to in factors)) return { state: "invalid", message: "Choose a from unit and a to unit for " + cat + "." };
        return { state: "ok", value: r.values.value, category: cat, from: from, to: to, converted: r.values.value * factors[from] / factors[to], factor: factors[from] / factors[to] };
      },
      format: function (r) { return fmtNum(r.converted, 4) + " " + r.to; },
      render: function (ctx, r) {
        var rev = convertOneUnit(1, r.to, r.from, r.category);
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtNum(r.converted, 4) + " " + r.to,
          sentenceText: fmtNum(r.value, 2) + " " + r.from + " is " + fmtNum(r.converted, 4) + " " + r.to + ". The reverse is 1 " + r.to + " = " + fmtNum(rev, 4) + " " + r.from + "."
        });
        var share = r.value !== 0 ? Math.abs(r.converted / r.value) * 100 : 0;
        renderBar(ctx.bar, Math.max(0, Math.min(100, share)));
        ctx.legendA.textContent = "Converted: " + fmtNum(r.converted, 4) + " " + r.to;
        ctx.legendB.textContent = "Original: " + fmtNum(r.value, 2) + " " + r.from;
        ctx.bar.setAttribute("aria-label", "Bar showing the converted value " + fmtNum(r.converted, 4) + " " + r.to);
        var rows = [["Converted value (your result)", fmtNum(r.converted, 4) + " " + r.to]];
        if (r.factor !== null) rows.push(["Conversion factor", "1 " + r.from + " = " + fmtNum(r.factor, 4) + " " + r.to]);
        rows.push(["Reverse conversion", "1 " + r.to + " = " + fmtNum(rev, 4) + " " + r.from]);
        renderTable(ctx.breakBody, rows);
      },
      init: function (ctx) {
        var catEl = ctx.inputs.category, fromEl = ctx.inputs.from, toEl = ctx.inputs.to;
        if (!catEl || !fromEl || !toEl) return;
        var fill = function (sel, units, keep) {
          while (sel.firstChild) sel.removeChild(sel.firstChild);
          units.forEach(function (u) {
            var o = document.createElement("option");
            o.value = u[0]; o.textContent = u[1];
            sel.appendChild(o);
          });
          var ok = false;
          units.forEach(function (u) { if (u[0] === keep) ok = true; });
          sel.value = ok ? keep : units[0][0];
        };
        var sync = function () {
          var units = UNIT_OPTIONS[catEl.value] || UNIT_OPTIONS.length;
          fill(fromEl, units, fromEl.value);
          fill(toEl, units, toEl.value);
        };
        catEl.addEventListener("change", function () { sync(); if (ctx.rerender) ctx.rerender(); });
        sync();
      }
    };
ENGINES["unit-price"] = {
      compute: function (inputs) {
        var r = readAll(inputs, [{ id: "price_a", label: "Pack A price" }, { id: "size_a", label: "Pack A size" }, { id: "price_b", label: "Pack B price" }, { id: "size_b", label: "Pack B size" }]);
        if (!r.ok) return r;
        if (r.values.size_a === 0 || r.values.size_b === 0) return { state: "zero", message: "A pack size cannot be zero \u2014 the sum divides by the size. Type a size above zero." };
        return { state: "ok", ua: r.values.price_a / r.values.size_a, ub: r.values.price_b / r.values.size_b };
      },
      format: function (r) {
        if (r.ua < r.ub) return "Pack A is better value";
        if (r.ub < r.ua) return "Pack B is better value";
        return "Both packs cost the same";
      },
      render: function (ctx, r) {
        var verdict = this.format(r);
        var detail = r.ua < r.ub ? "Pack A saves $" + fmtNum(r.ub - r.ua, 4) + " per unit." :
          r.ub < r.ua ? "Pack B saves $" + fmtNum(r.ua - r.ub, 4) + " per unit." : "Both packs cost the same per unit.";
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: verdict,
          sentenceText: "Pack A: $" + fmtNum(r.ua, 4) + " per unit. Pack B: $" + fmtNum(r.ub, 4) + " per unit. " + detail
        });
        var cheaper = Math.min(r.ua, r.ub), dearer = Math.max(r.ua, r.ub);
        renderBar(ctx.bar, dearer > 0 ? cheaper / dearer * 100 : 0);
        ctx.legendA.textContent = "Cheaper pack: $" + fmtNum(cheaper, 4) + " per unit";
        ctx.legendB.textContent = "Dearest pack: $" + fmtNum(dearer, 4) + " per unit";
        ctx.bar.setAttribute("aria-label", "Bar showing the cheaper unit price against the dearest");
        renderTable(ctx.breakBody, [
          ["Pack A unit price", "$" + fmtNum(r.ua, 4) + " per unit"],
          ["Pack B unit price", "$" + fmtNum(r.ub, 4) + " per unit"],
          ["Difference per unit", "$" + fmtNum(Math.abs(r.ua - r.ub), 4)],
          ["Better value (your result)", verdict]
        ]);
      }
    };
