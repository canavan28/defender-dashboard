# Defender Executive Dashboard

React + Vite frontend for the Defender Technology Executive Operations dashboard.
Deployed on Vercel. Connects to the Railway API proxy for all AutoTask data.

## Setup

1. Clone this repo
2. Copy `.env.example` to `.env` and fill in your Railway URL and API key
3. `npm install`
4. `npm run dev`

## Vercel Deployment

1. Push to GitHub
2. Connect repo in Vercel → New Project → Import from GitHub
3. Add environment variables in Vercel → Settings → Environment Variables:
   - `VITE_API_URL` → your Railway service URL
   - `VITE_API_KEY` → must match `API_KEY` in Railway
4. Vercel auto-deploys on every push to main

## Adding a New Module

1. Create `src/modules/YourModule.jsx`
2. Add a new tab string to `NavTabs.jsx`
3. Import and render it in `App.jsx`
4. Add the API route to the Railway backend if needed
