const CALC = (() => {
  function energyKWhDay(wattsLoad, wattsIdle, hoursOn, utilFraction) {
    const serving = hoursOn * utilFraction;
    const idleOn = hoursOn - serving;
    return (serving * wattsLoad + idleOn * wattsIdle) / 1000;
  }

  function monthlyGross(ratePerHour, hoursOn, utilFraction) {
    return ratePerHour * hoursOn * utilFraction * DAYS_PER_MONTH;
  }

  function monthlyEnergy(wattsLoad, wattsIdle, hoursOn, utilFraction) {
    return energyKWhDay(wattsLoad, wattsIdle, hoursOn, utilFraction) * DAYS_PER_MONTH;
  }

  function netProfit(grossMonth, elecCostMonth) {
    return grossMonth - elecCostMonth;
  }

  function breakEvenPrice(grossMonth, kwhMonth) {
    if (!kwhMonth || kwhMonth <= 0) return Infinity;
    return grossMonth / kwhMonth;
  }

  function paybackMonths(hwCost, netPerMonth) {
    if (!hwCost || hwCost <= 0) return null;
    if (netPerMonth <= 0) return Infinity;
    return hwCost / netPerMonth;
  }

  function verdict(netPerMonth) {
    if (!Number.isFinite(netPerMonth)) {
      return { cls: 'neutral', label: 'Enter your details to see a verdict.' };
    }
    if (netPerMonth >= 15) {
      return { cls: 'good', label: 'Worth it — strong net margin at these assumptions.' };
    }
    if (netPerMonth >= 5) {
      return { cls: 'ok', label: 'Likely worth it — positive margin, modest upside.' };
    }
    if (netPerMonth > 0) {
      return { cls: 'marginal', label: 'Marginal — barely covers power; only worth it for a machine that runs anyway.' };
    }
    if (netPerMonth === 0) {
      return { cls: 'marginal', label: 'Break-even — you earn nothing after electricity.' };
    }
    return { cls: 'bad', label: 'Not worth it — electricity costs more than you earn. Consider fewer hours or a more efficient device.' };
  }

  function fmtUSD(v, digits = 2) {
    if (!Number.isFinite(v)) return '–';
    return '$' + v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  return {
    monthlyGross,
    monthlyEnergy,
    netProfit,
    breakEvenPrice,
    paybackMonths,
    verdict,
    fmtUSD
  };
})();
