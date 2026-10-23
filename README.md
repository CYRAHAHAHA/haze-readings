# Singapore Haze Readings

A standalone GitHub Pages site for NEA's five regional air-quality readings. The single-screen map shows both current 1-hour PM₂.₅ and 24-hour PSI readings for each region. An hourly slider explores readings since 1 August 2026; selecting a region opens its history chart alongside the map. The map divisions are schematic, not official geographic boundaries.

## Run

```sh
npm install
npm run dev
```

## Data and cadence

The site bundles [src/readings.json](src/readings.json), a saved archive of NEA-backed readings from data.gov.sg's `/v2/real-time/api/pm25` and `/psi` endpoints. All map times and chart ranges read this file immediately in the browser. The browser does not call the API. NEA publishes 1-hour PM₂.₅ and 24-hour PSI readings hourly. No 15-minute measurements are fabricated.

Run `npm run update-data` to refresh the archive. The script follows pagination, spaces requests to respect the public rate limit, retries throttled responses, saves each completed day, and rechecks yesterday and today. The GitHub Pages workflow runs every 15 minutes and commits changed readings before rebuilding the site. If the API fails, the workflow fails rather than publishing an incomplete day as an empty gap. No API key is embedded in the client.

## Deploy

The Vite base path is `/haze-readings/`, for a repository named `haze-readings` under `cyrahahaha`. See `.github/workflows/pages.yml`.
