(() => {
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'darkbloom-map-settings-v1';
  const COLORSCALE = [
    [0, '#16a34a'],
    [0.17, '#16a34a'],
    [0.32, '#84cc16'],
    [0.53, '#eab308'],
    [0.74, '#f97316'],
    [1, '#ef4444']
  ];

  const els = {
    device: $('device'),
    deviceHint: $('device-hint'),
    country: $('country'),
    customPrice: $('custom-price'),
    price: $('price'),
    hours: $('hours'),
    hoursVal: $('hours-val'),
    util: $('util'),
    utilVal: $('util-val'),
    rate: $('rate'),
    hwcost: $('hwcost'),
    reset: $('reset'),
    rGross: $('r-gross'),
    rKwh: $('r-kwh'),
    rElec: $('r-elec'),
    rNet: $('r-net'),
    rBreakeven: $('r-breakeven'),
    paybackRow: $('payback-row'),
    rPayback: $('r-payback'),
    verdict: $('verdict'),
    assumptions: $('r-assumptions'),
    map: $('map'),
    mapBtns: Array.from(document.querySelectorAll('.map-btn'))
  };

  const state = {};

  function getDevice() {
    return DEVICES.find(d => d.id === state.deviceId) || DEVICES[0];
  }

  function countryPrice(code) {
    const c = ELECTRICITY.find(c => c.code === code);
    return c ? c.price : DEFAULTS.price;
  }

  function activePrice() {
    return state.customPrice ? Number(state.price) : countryPrice(state.countryCode);
  }

  function populateSelects() {
    DEVICES.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      els.device.appendChild(opt);
    });
    [...ELECTRICITY]
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.code;
        opt.textContent = `${c.name} ($${c.price.toFixed(3)}/kWh)`;
        els.country.appendChild(opt);
      });
  }

  function loadState() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      saved = {};
    }
    Object.assign(state, DEFAULTS, saved);
    if (!DEVICES.some(d => d.id === state.deviceId)) state.deviceId = DEFAULTS.deviceId;
    if (!ELECTRICITY.some(c => c.code === state.countryCode)) state.countryCode = DEFAULTS.countryCode;
    if (!MAP_VIEWS.includes(state.view)) state.view = DEFAULTS.view;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function syncControlsFromState() {
    els.device.value = state.deviceId;
    els.country.value = state.countryCode;
    els.customPrice.checked = !!state.customPrice;
    els.price.disabled = !state.customPrice;
    els.price.value = state.price;
    els.hours.value = state.hours;
    els.hoursVal.textContent = state.hours;
    els.util.value = state.util;
    els.utilVal.textContent = state.util;
    els.rate.value = state.rate;
    els.hwcost.value = state.hwcost == null ? '' : state.hwcost;
    updateDeviceHint();
    updateMapButtons();
  }

  function updateMapButtons() {
    els.mapBtns.forEach(b =>
      b.classList.toggle('active', b.dataset.scope === state.view)
    );
  }

  function updateDeviceHint() {
    const d = getDevice();
    els.deviceHint.textContent = `${d.hint} ~${d.wattsLoad} W under load, ~${d.wattsIdle} W idle.`;
  }

  function readControlsIntoState() {
    state.deviceId = els.device.value;
    state.countryCode = els.country.value;
    state.customPrice = els.customPrice.checked;
    state.price = Math.max(0, Number(els.price.value) || 0);
    state.hours = Number(els.hours.value);
    state.util = Number(els.util.value);
    state.rate = Math.max(0, Number(els.rate.value) || 0);
    const hc = Number(els.hwcost.value);
    state.hwcost = els.hwcost.value === '' || !Number.isFinite(hc) ? null : hc;
  }

  function computeModel() {
    const d = getDevice();
    const utilFrac = state.util / 100;
    const price = activePrice();
    const gross = CALC.monthlyGross(state.rate, state.hours, utilFrac);
    const kwh = CALC.monthlyEnergy(d.wattsLoad, d.wattsIdle, state.hours, utilFrac);
    const elecCost = kwh * price;
    const net = CALC.netProfit(gross, elecCost);
    return { device: d, price, gross, kwh, elecCost, net };
  }

  function render() {
    const m = computeModel();

    els.rGross.textContent = CALC.fmtUSD(m.gross);
    els.rKwh.textContent = m.kwh.toFixed(1) + ' kWh';
    els.rElec.textContent = '−' + CALC.fmtUSD(m.elecCost);
    els.rNet.textContent = CALC.fmtUSD(m.net);

    const be = CALC.breakEvenPrice(m.gross, m.kwh);
    els.rBreakeven.textContent = Number.isFinite(be)
      ? '$' + be.toFixed(3) + '/kWh'
      : 'n/a';

    const pb = CALC.paybackMonths(state.hwcost, m.net);
    if (pb != null) {
      els.paybackRow.hidden = false;
      els.rPayback.textContent =
        pb === Infinity ? 'never (net ≤ 0)' : pb.toFixed(1) + ' months';
    } else {
      els.paybackRow.hidden = true;
    }

    const v = CALC.verdict(state.hours === 0 ? null : m.net);
    if (state.hours === 0) {
      els.verdict.className = 'verdict neutral';
      els.verdict.textContent = 'Machine is off — no earnings, no cost.';
    } else {
      els.verdict.className = 'verdict ' + v.cls;
      els.verdict.textContent = v.label + ` Net ≈ ${CALC.fmtUSD(m.net)}/mo at ${m.price.toFixed(3)} $/kWh.`;
    }

    els.assumptions.innerHTML =
      '<li>Gross: $' + state.rate.toFixed(3) + '/h × ' + state.hours +
      ' h/day × ' + state.util + '% utilization × 30.44 days</li>' +
      '<li>Power: ' + m.device.wattsLoad + ' W while serving, ' +
      m.device.wattsIdle + ' W idle-on</li>' +
      '<li>Electricity: ' + (m.kwh / DAYS_PER_MONTH).toFixed(2) +
      ' kWh/day × $' + m.price.toFixed(3) + '/kWh' + (state.customPrice ? ' (custom)' : '') + '</li>';

    drawMapDebounced();
  }

  function baseGeoLayout(scope) {
    return {
      scope,
      bgcolor: '#1e293b',
      showland: true,
      landcolor: '#334155',
      showcountries: true,
      countrycolor: '#475569',
      countrywidth: 0.6,
      showcoastlines: false,
      showlakes: true,
      lakecolor: '#1e293b',
      showframe: true,
      framecolor: '#334155',
      framewidth: 1
    };
  }

  function drawMap() {
    if (!window.Plotly) return;
    const m = computeModel();
    let locations, z, customdata, hovertemplate, geo;

    if (state.view === 'usa') {
      locations = US_STATES.map(s => s.id);
      z = US_STATES.map(s => s.price);
      customdata = US_STATES.map(s => [
        s.name,
        CALC.fmtUSD(CALC.netProfit(m.gross, m.kwh * s.price))
      ]);
      hovertemplate =
        '<b>%{customdata[0]}</b><br>' +
        '$%{z:.3f}/kWh<br>' +
        'Est. net %{customdata[1]}/mo' +
        '<extra>Click to load</extra>';
      geo = baseGeoLayout('usa');
    } else {
      locations = ELECTRICITY.map(c => c.code);
      z = ELECTRICITY.map(c => c.price);
      customdata = ELECTRICITY.map(c => [
        c.name,
        CALC.fmtUSD(CALC.netProfit(m.gross, m.kwh * c.price))
      ]);
      hovertemplate =
        '<b>%{customdata[0]}</b><br>' +
        '$%{z:.3f}/kWh<br>' +
        'Est. net %{customdata[1]}/mo · ' + getDevice().name +
        '<extra>Click to load</extra>';
      geo = baseGeoLayout(state.view);
    }

    const trace = {
      type: 'choropleth',
      locationmode: state.view === 'usa' ? 'USA-states' : 'ISO-3',
      locations,
      z,
      zmin: 0,
      zmax: 0.47,
      customdata,
      hovertemplate,
      colorscale: COLORSCALE,
      showscale: true,
      colorbar: {
        title: { text: '$/kWh', font: { color: '#94a3b8', size: 12 } },
        thickness: 10,
        len: 0.75,
        x: 1.02,
        tickfont: { color: '#94a3b8', size: 11 },
        outlinewidth: 0
      },
      marker: {
        line: { color: '#0f172a', width: 0.7 }
      }
    };

    const layout = {
      paper_bgcolor: '#1e293b',
      plot_bgcolor: '#1e293b',
      margin: { l: 0, r: 0, t: 0, b: 0 },
      geo,
      dragmode: 'pan'
    };

    const config = {
      responsive: true,
      scrollZoom: true,
      displayModeBar: false
    };

    Plotly.react(els.map, [trace], layout, config).then(() => {
      attachClickHandlerOnce();
    });
  }

  let clickAttached = false;
  function attachClickHandlerOnce() {
    if (clickAttached) return;
    clickAttached = true;
    els.map.on('plotly_click', ev => {
      const pt = ev.points && ev.points[0];
      if (!pt || !pt.location) return;

      if (state.view === 'usa') {
        const st = US_STATES.find(s => s.id === pt.location);
        if (!st) return;
        state.customPrice = true;
        state.price = st.price;
        els.customPrice.checked = true;
        els.price.disabled = false;
        els.price.value = st.price;
      } else {
        const c = ELECTRICITY.find(x => x.code === pt.location);
        if (!c) return;
        state.countryCode = c.code;
        if (!state.customPrice) {
          state.price = c.price;
          els.price.value = c.price;
        }
        els.country.value = c.code;
      }

      saveState();
      render();
    });
  }

  let mapTimer = null;
  function drawMapDebounced() {
    clearTimeout(mapTimer);
    mapTimer = setTimeout(drawMap, 200);
  }

  function wireEvents() {
    els.device.addEventListener('change', () => {
      readControlsIntoState();
      const d = getDevice();
      state.rate = d.ratePerHour;
      els.rate.value = state.rate;
      updateDeviceHint();
      saveState();
      render();
    });

    els.country.addEventListener('change', () => {
      readControlsIntoState();
      if (!state.customPrice) {
        state.price = countryPrice(state.countryCode);
        els.price.value = state.price;
      }
      saveState();
      render();
    });

    els.customPrice.addEventListener('change', () => {
      readControlsIntoState();
      els.price.disabled = !state.customPrice;
      if (!state.customPrice) {
        state.price = countryPrice(state.countryCode);
        els.price.value = state.price;
      }
      saveState();
      render();
    });

    els.price.addEventListener('input', () => {
      if (!els.customPrice.checked) {
        els.customPrice.checked = true;
        els.price.disabled = false;
      }
      readControlsIntoState();
      saveState();
      render();
    });

    els.hours.addEventListener('input', () => {
      readControlsIntoState();
      els.hoursVal.textContent = state.hours;
      saveState();
      render();
    });

    els.util.addEventListener('input', () => {
      readControlsIntoState();
      els.utilVal.textContent = state.util;
      saveState();
      render();
    });

    els.rate.addEventListener('input', () => {
      readControlsIntoState();
      saveState();
      render();
    });

    els.hwcost.addEventListener('input', () => {
      readControlsIntoState();
      saveState();
      render();
    });

    els.reset.addEventListener('click', () => {
      Object.assign(state, DEFAULTS);
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      syncControlsFromState();
      render();
    });

    els.mapBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.view = btn.dataset.scope;
        updateMapButtons();
        saveState();
        drawMap();
      });
    });
  }

  function init() {
    populateSelects();
    loadState();
    syncControlsFromState();
    wireEvents();
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
