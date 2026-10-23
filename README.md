# Singapore Haze Readings

A standalone GitHub Pages site for NEA's five regional air-quality readings. The map is a schematic selection surface; its divisions are not official geographic boundaries.

## Run

```sh
npm install
npm run dev
```

## Data and cadence

The app requests daily history from data.gov.sg's NEA-backed `/v2/real-time/api/pm25` and `/psi` endpoints, following every pagination token. It includes every available published timestamp from 1 August 2026 onward, caches completed days in the browser, and loads selected date ranges with three concurrent requests. NEA publishes 1-hour PM₂.₅ and 24-hour PSI readings hourly. No 15-minute measurements are fabricated.

No API key is embedded in the client. If unauthenticated production access or browser CORS is restricted, the site needs a server-side collection job and static data files before publication.

## Deploy

The Vite base path is `/haze-readings/`, for a repository named `haze-readings` under `cyrahahaha`. See `.github/workflows/pages.yml`.
