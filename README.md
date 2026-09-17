# RescueRoute Fremont | Food Recovery Prototype

A Fremont-focused prototype that demonstrates how local food donors, nonprofits, and volunteer drivers can coordinate time-sensitive surplus food before it becomes waste.

## How it works

A donor posts surplus food in under a minute → a nonprofit claims the listing that fits its capacity → a volunteer driver accepts the short local route, confirms pickup, and confirms delivery → the impact dashboard updates. A rule-based demo parser turns plain descriptions into consistent tags, and a transparent heuristic fit score ranks nearby demo organizations.

## Prototype limitations

- All restaurants, nonprofits, drivers, donations, routes, and metrics are **fictional demo data**.
- The parser and fit score are deterministic demo rules, not AI, safety checks, or legal/compliance validation.
- Donors must confirm food is appropriate for donation; organizations must follow applicable food-safety rules.
- The app organizes donation records that *may* support reporting efforts — it does not guarantee SB 1383 compliance. Good Samaritan notes are general information, not legal advice.
- Demo state persists in the browser via localStorage only; there are no accounts or backend.

## Stack

Next.js (App Router, static export-friendly) · React · TypeScript · Tailwind CSS v4 · localStorage persistence. No backend, database, API keys, or paid services.

## Local setup

```bash
npm install
npm run dev     # open http://localhost:3000
npm run lint
npm run build
npm run start   # serve the production build locally
```

## Deployment

Deploys as-is on Vercel Hobby: import the repo, no environment variables required.
