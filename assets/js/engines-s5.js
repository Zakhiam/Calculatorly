/* Stage 5 engines: New Zealand, Ireland, Germany and Singapore
   take-home pay and income tax (8 tools). 2026 tables, last checked
   11 November 2026. Helpers live in calculatorly.js. */

ENGINES["take-home-pay-nz"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }],
          "Type the yearly salary and the take-home pay appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var salary = g.values.salary;
        var tax = nzTax(salary);
        var acc = nzAcc(salary);
        var take = cents(salary - tax - acc);
        return { state: "ok", value: take, salary: salary, tax: tax, acc: acc, monthly: take / 12 };
      },
      format: function (r) { return fmtMoney("NZD", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("NZD", r.value),
          sentenceText: "Your take-home pay is " + fmtMoney("NZD", r.value) + " a year (" + fmtMoney("NZD", r.monthly) +
            " a month) from a salary of " + fmtMoney("NZD", r.salary) + " after income tax and the ACC earners' levy."
        });
        renderBar(ctx.bar, r.salary > 0 ? r.value / r.salary * 100 : 0);
        ctx.legendA.textContent = "Take-home pay: " + fmtMoney("NZD", r.value);
        ctx.legendB.textContent = "Income tax and ACC levy taken off: " + fmtMoney("NZD", r.salary - r.value);
        ctx.bar.setAttribute("aria-label", "Bar showing take-home pay " + fmtMoney("NZD", r.value) + " out of the salary " + fmtMoney("NZD", r.salary));
        renderTable(ctx.breakBody, [
          ["Gross salary", fmtMoney("NZD", r.salary)],
          ["Income tax", "\u2212" + fmtMoney("NZD", r.tax)],
          ["ACC earners' levy", "\u2212" + fmtMoney("NZD", r.acc)],
          ["Take-home pay a year (your result)", fmtMoney("NZD", r.value)],
          ["Take-home pay a month", fmtMoney("NZD", r.monthly)]
        ]);
      }
    };

ENGINES["income-tax-nz"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }],
          "Type the yearly salary and the income tax appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var salary = g.values.salary;
        var tax = nzTax(salary);
        return { state: "ok", value: tax, salary: salary, monthly: tax / 12, eff: salary > 0 ? tax / salary * 100 : 0 };
      },
      format: function (r) { return fmtMoney("NZD", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("NZD", r.value),
          sentenceText: "Your income tax is " + fmtMoney("NZD", r.value) + " a year on a salary of " + fmtMoney("NZD", r.salary) +
            ", worked out with no deductions claimed. The ACC levy is not included."
        });
        renderBar(ctx.bar, r.salary > 0 ? r.value / r.salary * 100 : 0);
        ctx.legendA.textContent = "Income tax: " + fmtMoney("NZD", r.value);
        ctx.legendB.textContent = "Lowest rate: 10.5% to NZ$15,600";
        ctx.bar.setAttribute("aria-label", "Bar showing income tax " + fmtMoney("NZD", r.value) + " out of the salary " + fmtMoney("NZD", r.salary));
        renderTable(ctx.breakBody, [
          ["Gross salary", fmtMoney("NZD", r.salary)],
          ["Lowest tax rate", "10.5% to NZ$15,600"],
          ["Income tax (your result)", fmtMoney("NZD", r.value)],
          ["Income tax a month", fmtMoney("NZD", r.monthly)],
          ["Effective tax rate", fmtPct(r.eff)]
        ]);
      }
    };

ENGINES["take-home-pay-ie"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }],
          "Type the yearly salary and the take-home pay appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var salary = g.values.salary;
        var tax = ieTax(salary);
        var usc = ieUsc(salary);
        var prsi = iePrsi(salary);
        var take = cents(salary - tax - usc - prsi);
        return { state: "ok", value: take, salary: salary, tax: tax, usc: usc, prsi: prsi, monthly: take / 12 };
      },
      format: function (r) { return fmtMoney("EUR", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("EUR", r.value),
          sentenceText: "Your take-home pay is " + fmtMoney("EUR", r.value) + " a year (" + fmtMoney("EUR", r.monthly) +
            " a month) from a salary of " + fmtMoney("EUR", r.salary) + " after income tax, the Universal Social Charge and PRSI."
        });
        renderBar(ctx.bar, r.salary > 0 ? r.value / r.salary * 100 : 0);
        ctx.legendA.textContent = "Take-home pay: " + fmtMoney("EUR", r.value);
        ctx.legendB.textContent = "Income tax, USC and PRSI taken off: " + fmtMoney("EUR", r.salary - r.value);
        ctx.bar.setAttribute("aria-label", "Bar showing take-home pay " + fmtMoney("EUR", r.value) + " out of the salary " + fmtMoney("EUR", r.salary));
        renderTable(ctx.breakBody, [
          ["Gross salary", fmtMoney("EUR", r.salary)],
          ["Income tax", "\u2212" + fmtMoney("EUR", r.tax)],
          ["Universal Social Charge (USC)", "\u2212" + fmtMoney("EUR", r.usc)],
          ["PRSI", "\u2212" + fmtMoney("EUR", r.prsi)],
          ["Take-home pay a year (your result)", fmtMoney("EUR", r.value)],
          ["Take-home pay a month", fmtMoney("EUR", r.monthly)]
        ]);
      }
    };

ENGINES["income-tax-ie"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }],
          "Type the yearly salary and the income tax appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var salary = g.values.salary;
        var tax = ieTax(salary);
        return { state: "ok", value: tax, salary: salary, monthly: tax / 12, eff: salary > 0 ? tax / salary * 100 : 0 };
      },
      format: function (r) { return fmtMoney("EUR", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("EUR", r.value),
          sentenceText: "Your income tax is " + fmtMoney("EUR", r.value) + " a year on a salary of " + fmtMoney("EUR", r.salary) +
            ", worked out with the standard tax credits. The Universal Social Charge and PRSI are not included."
        });
        renderBar(ctx.bar, r.salary > 0 ? r.value / r.salary * 100 : 0);
        ctx.legendA.textContent = "Income tax: " + fmtMoney("EUR", r.value);
        ctx.legendB.textContent = "Tax credits: €4,000.00";
        ctx.bar.setAttribute("aria-label", "Bar showing income tax " + fmtMoney("EUR", r.value) + " out of the salary " + fmtMoney("EUR", r.salary));
        renderTable(ctx.breakBody, [
          ["Gross salary", fmtMoney("EUR", r.salary)],
          ["Tax credits", "€4,000.00"],
          ["Income tax (your result)", fmtMoney("EUR", r.value)],
          ["Income tax a month", fmtMoney("EUR", r.monthly)],
          ["Effective tax rate", fmtPct(r.eff)]
        ]);
      }
    };

ENGINES["take-home-pay-de"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }],
          "Type the yearly salary and the take-home pay appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var salary = g.values.salary;
        var tax = deIncomeTax(salary);
        var soli = deSoli(tax);
        var soc = deSocial(salary);
        var take = cents(salary - tax - soli - soc.total);
        return { state: "ok", value: take, salary: salary, tax: tax, soli: soli, soc: soc, monthly: take / 12 };
      },
      format: function (r) { return fmtMoney("EUR", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("EUR", r.value),
          sentenceText: "Your take-home pay is " + fmtMoney("EUR", r.value) + " a year (" + fmtMoney("EUR", r.monthly) +
            " a month) from a salary of " + fmtMoney("EUR", r.salary) + " after income tax, the solidarity surcharge and social insurance, in tax class I."
        });
        renderBar(ctx.bar, r.salary > 0 ? r.value / r.salary * 100 : 0);
        ctx.legendA.textContent = "Take-home pay: " + fmtMoney("EUR", r.value);
        ctx.legendB.textContent = "Income tax, surcharge and social insurance taken off: " + fmtMoney("EUR", r.salary - r.value);
        ctx.bar.setAttribute("aria-label", "Bar showing take-home pay " + fmtMoney("EUR", r.value) + " out of the salary " + fmtMoney("EUR", r.salary));
        renderTable(ctx.breakBody, [
          ["Gross salary", fmtMoney("EUR", r.salary)],
          ["Income tax", "\u2212" + fmtMoney("EUR", r.tax)],
          ["Solidarity surcharge", "\u2212" + fmtMoney("EUR", r.soli)],
          ["Social insurance", "\u2212" + fmtMoney("EUR", r.soc.total)],
          ["Take-home pay a year (your result)", fmtMoney("EUR", r.value)],
          ["Take-home pay a month", fmtMoney("EUR", r.monthly)]
        ]);
      }
    };

ENGINES["income-tax-de"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }],
          "Type the yearly salary and the income tax appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var salary = g.values.salary;
        var tax = deIncomeTax(salary);
        return { state: "ok", value: tax, salary: salary, monthly: tax / 12, eff: salary > 0 ? tax / salary * 100 : 0 };
      },
      format: function (r) { return fmtMoney("EUR", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("EUR", r.value),
          sentenceText: "Your income tax is " + fmtMoney("EUR", r.value) + " a year on a salary of " + fmtMoney("EUR", r.salary) +
            ", worked out after the basic allowance and the work-expenses allowance. Social insurance and the solidarity surcharge are not included."
        });
        renderBar(ctx.bar, r.salary > 0 ? r.value / r.salary * 100 : 0);
        ctx.legendA.textContent = "Income tax: " + fmtMoney("EUR", r.value);
        ctx.legendB.textContent = "Tax-free allowance: €12,348";
        ctx.bar.setAttribute("aria-label", "Bar showing income tax " + fmtMoney("EUR", r.value) + " out of the salary " + fmtMoney("EUR", r.salary));
        renderTable(ctx.breakBody, [
          ["Gross salary", fmtMoney("EUR", r.salary)],
          ["Basic allowance (Grundfreibetrag)", "€12,348"],
          ["Income tax (your result)", fmtMoney("EUR", r.value)],
          ["Income tax a month", fmtMoney("EUR", r.monthly)],
          ["Effective tax rate", fmtPct(r.eff)]
        ]);
      }
    };

ENGINES["take-home-pay-sg"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }],
          "Type the yearly salary and the take-home pay appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var salary = g.values.salary;
        var cpf = sgCpf(salary);
        var tax = sgTax(salary);
        var take = cents(salary - cpf - tax);
        return { state: "ok", value: take, salary: salary, cpf: cpf, tax: tax, monthly: take / 12 };
      },
      format: function (r) { return fmtMoney("SGD", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("SGD", r.value),
          sentenceText: "Your take-home pay is " + fmtMoney("SGD", r.value) + " a year (" + fmtMoney("SGD", r.monthly) +
            " a month) from a salary of " + fmtMoney("SGD", r.salary) + " after your CPF contribution and income tax."
        });
        renderBar(ctx.bar, r.salary > 0 ? r.value / r.salary * 100 : 0);
        ctx.legendA.textContent = "Take-home pay: " + fmtMoney("SGD", r.value);
        ctx.legendB.textContent = "CPF and income tax taken off: " + fmtMoney("SGD", r.salary - r.value);
        ctx.bar.setAttribute("aria-label", "Bar showing take-home pay " + fmtMoney("SGD", r.value) + " out of the salary " + fmtMoney("SGD", r.salary));
        renderTable(ctx.breakBody, [
          ["Gross salary", fmtMoney("SGD", r.salary)],
          ["CPF contribution", "\u2212" + fmtMoney("SGD", r.cpf)],
          ["Income tax", "\u2212" + fmtMoney("SGD", r.tax)],
          ["Take-home pay a year (your result)", fmtMoney("SGD", r.value)],
          ["Take-home pay a month", fmtMoney("SGD", r.monthly)]
        ]);
      }
    };

ENGINES["income-tax-sg"] = {
      compute: function (v) {
        var g = readNums(v, [{ id: "salary", label: "Yearly salary", min: 0 }],
          "Type the yearly salary and the income tax appears here \u2014 no button to press.");
        if (!g.ok) return g;
        var salary = g.values.salary;
        var tax = sgTax(salary);
        return { state: "ok", value: tax, salary: salary, monthly: tax / 12, eff: salary > 0 ? tax / salary * 100 : 0 };
      },
      format: function (r) { return fmtMoney("SGD", r.value); },
      render: function (ctx, r) {
        setResult({
          resultEl: ctx.result, sentenceEl: ctx.sentence, msgEl: ctx.msg, stampEl: ctx.stamp,
          valid: true, resultText: fmtMoney("SGD", r.value),
          sentenceText: "Your income tax is " + fmtMoney("SGD", r.value) + " a year on a salary of " + fmtMoney("SGD", r.salary) +
            ", worked out on your chargeable income (salary less CPF). No other reliefs are claimed."
        });
        renderBar(ctx.bar, r.salary > 0 ? r.value / r.salary * 100 : 0);
        ctx.legendA.textContent = "Income tax: " + fmtMoney("SGD", r.value);
        ctx.legendB.textContent = "Tax-free band: 0% to S$20,000";
        ctx.bar.setAttribute("aria-label", "Bar showing income tax " + fmtMoney("SGD", r.value) + " out of the salary " + fmtMoney("SGD", r.salary));
        renderTable(ctx.breakBody, [
          ["Gross salary", fmtMoney("SGD", r.salary)],
          ["First band (0%)", "S$20,000"],
          ["Income tax (your result)", fmtMoney("SGD", r.value)],
          ["Income tax a month", fmtMoney("SGD", r.monthly)],
          ["Effective tax rate", fmtPct(r.eff)]
        ]);
      }
    };
