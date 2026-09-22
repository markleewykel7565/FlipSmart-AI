# FlipSmart AI

A lightweight AI resale assistant that analyzes an item from a name and/or photo, estimates resale economics, and generates marketplace listing copy.

## What is included

- Responsive landing page
- AI item analysis
- Optional product-photo analysis
- Estimated resale range
- Recommended list price
- Fee/shipping/profit estimate
- Demand and risk fields
- AI-generated title, description and keywords
- Free daily usage limit
- Stripe monthly subscription checkout
- Render deployment configuration
- No database required for the MVP

## Run locally

1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Add your OpenAI API key.
4. For paid subscriptions, add a Stripe secret key and monthly Price ID.
5. Run:

```bash
npm install
npm start
```

Then open http://localhost:3000.

## Stripe setup

Create a recurring monthly Stripe Price (for example $9.99/month) and put its `price_...` ID into `STRIPE_PRICE_ID`.

Set `APP_URL` to your deployed URL, such as your Render service URL.

This MVP starts Checkout but does not yet persist subscription status. For a production release, add Stripe webhooks plus a database so paid users can be recognized across devices.

## Render

The included `render.yaml` is configured so Render runs `npm install` at the repository root and starts `node server.js`.

Set these environment variables in Render:

- OPENAI_API_KEY
- STRIPE_SECRET_KEY
- STRIPE_PRICE_ID
- APP_URL

## Revenue target

The $1,000/month goal is a business target, not a guarantee. At $9.99/month, about 101 active subscribers would equal roughly $1,009.99/month in gross subscription revenue before fees, taxes, refunds and other costs.

## Next production upgrades

- Supabase authentication/database
- Stripe webhook entitlement tracking
- Saved analyses
- Actual sold-comps data provider
- Email onboarding
- Referral program
- Programmatic SEO pages
- Admin analytics
- Abuse/rate-limit protection
