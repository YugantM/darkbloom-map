# darkbloom-map

**A public decision tool for Darkbloom compute providers.**
Should you give your Mac to the network? This page helps you answer that with
real numbers: an interactive, navigable world map of electricity prices and a
profit calculator for Apple Silicon devices with fully editable assumptions.

Live at: https://yugantm.github.io/darkbloom-map/

## What it does

- **Interactive net-profit map** — country-level choropleth of residential
  electricity prices (USD/kWh) with zoom, pan and continent quick-jump
  (World / US / North & South America / Europe / Asia / Africa / Oceania).
  Tooltips show the estimated net profit per month for your currently selected
  device and usage settings, and **clicking any region loads it into the
  calculator**. A dedicated US view drills down to state-level prices.
- **Profit calculator** — pick a device (Mac mini M4 … Mac Studio Ultra),
  country or state (or custom $/kWh), hours/day on, and share of time actually
  serving calls. You get monthly gross, energy use, electricity cost, net
  profit, break-even electricity price, hardware payback period, and a
  plain-language verdict.
- **Editable assumptions** — every number (watts, $/hour rates) lives in
  `js/data.js` / the UI. No black boxes; update as real payout data emerges.

## Run locally

Static site, no build step:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Pushed to `main` it serves automatically via GitHub Pages from the repo root.

## Editing data

- `js/data.js` → `ELECTRICITY` (ISO-3 code + approx. 2025–2026 residential price), `US_STATES` (state-level prices for the US map view), and `DEVICES` (wattage under load/idle, placeholder $/hour earning rate).
- `js/calc.js` → pure profit math (energy blend, break-even, verdicts).
- Prices are approximations (GlobalPetrolPrices, Eurostat, EIA); tariffs vary
  by region and plan — always override with your own bill via "Custom
  electricity price".

## Disclaimer

Independent community project, not affiliated with Darkbloom. Earnings rates
are editable placeholders until verified payout data is available — measure a
week of real earnings against your electricity bill before committing hardware.

## License

MIT
