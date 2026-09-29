# ISM6427c — Boca Weather

A live weather app with a personal greeting for Autumn Roney. It defaults to **Florida Atlantic University, Boca Raton, FL** and gets its data from the free [Open-Meteo](https://open-meteo.com/) API, which needs no API key, account or payment.

## Features
- Current conditions: temperature, feels-like, humidity, wind, precipitation, UV, pressure, sunrise and sunset
- Forecast for the next 24 hours and the next 7 days
- A greeting based on the time of day
- **Light / Dark / System** themes, with your choice remembered
- °F / °C toggle
- City search (Open-Meteo geocoding), "My location" (browser geolocation) and a one-tap button back to FAU
- Refreshes every 10 minutes and whenever you come back to the tab
- Responsive layout for phone, tablet and desktop

## Run locally
It's a plain static site (HTML, CSS and JS) with no build step. Open `index.html` in a browser, or run:

```sh
python3 -m http.server 8000
```

## Deploy to Netlify
`netlify.toml` is already set up: the publish directory is the repo root and there's no build command.
1. In Netlify, choose **Add new site → Import an existing project** and pick this GitHub repo.
2. Set the branch to deploy to `main`. Leave the build command empty and the publish directory as `.`.
3. Click **Deploy**. Every push to `main` redeploys the site automatically.

You can also drag and drop the folder onto https://app.netlify.com/drop.
