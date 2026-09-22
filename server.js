import express from "express";
import OpenAI from "openai";
import Stripe from "stripe";
import crypto from "node:crypto";

const app = express();
const port = Number(process.env.PORT || 3000);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const FREE_ANALYSES_PER_DAY = Number(process.env.FREE_ANALYSES_PER_DAY || 3);
const APP_URL = process.env.APP_URL || "http://localhost:3000";

app.use(express.json({ limit: "8mb" }));
app.use(express.static("."));

const usage = new Map();

function getVisitorId(req) {
  const supplied = req.headers["x-visitor-id"];
  if (typeof supplied === "string" && supplied.length >= 16) return supplied.slice(0, 100);
  return crypto.randomUUID();
}

function usageKey(id) {
  return `${id}:${new Date().toISOString().slice(0, 10)}`;
}

function cleanJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned an invalid result.");
  return JSON.parse(match[0]);
}

app.get("/api/config", (req, res) => {
  res.json({
    stripeEnabled: Boolean(stripe && process.env.STRIPE_PRICE_ID),
    freeAnalysesPerDay: FREE_ANALYSES_PER_DAY
  });
});

app.post("/api/analyze", async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: "AI is not configured yet. Add OPENAI_API_KEY in your environment variables." });
    }

    const visitorId = getVisitorId(req);
    const key = usageKey(visitorId);
    const count = usage.get(key) || 0;

    if (count >= FREE_ANALYSES_PER_DAY) {
      return res.status(429).json({
        error: `Free limit reached (${FREE_ANALYSES_PER_DAY} analyses today). Upgrade to Pro for more analyses.`
      });
    }

    const { productName, purchasePrice, marketplace, imageData } = req.body || {};
    if (!productName && !imageData) {
      return res.status(400).json({ error: "Enter a product name or upload a product photo." });
    }

    const price = Number(purchasePrice || 0);
    const marketplaceName = marketplace || "eBay";

    const content = [
      {
        type: "input_text",
        text: `You are FlipSmart AI, a practical resale assistant.
Analyze this item for a U.S. reseller.

Product name: ${productName || "Identify from photo"}
Purchase price: $${Number.isFinite(price) ? price.toFixed(2) : "0.00"}
Target marketplace: ${marketplaceName}

Return ONLY valid JSON with these keys:
{
  "identifiedItem": "string",
  "conditionAssumption": "string",
  "estimatedResaleLow": number,
  "estimatedResaleHigh": number,
  "recommendedListPrice": number,
  "estimatedMarketplaceFees": number,
  "estimatedShipping": number,
  "estimatedProfit": number,
  "profitMarginPercent": number,
  "demand": "Low | Medium | High",
  "risk": "Low | Medium | High",
  "buyDecision": "Buy | Consider | Pass",
  "listingTitle": "string",
  "description": "string",
  "keywords": ["string", "string", "string", "string", "string"],
  "tips": ["string", "string", "string"]
}

Important: resale prices are estimates, not guarantees. If the photo does not provide enough evidence, say so in conditionAssumption and use conservative ranges. Calculate profit using recommendedListPrice minus purchase price, fees, and shipping.`
      }
    ];

    if (imageData) {
      content.push({
        type: "input_image",
        image_url: imageData
      });
    }

    const response = await openai.responses.create({
      model: MODEL,
      input: [{ role: "user", content }]
    });

    const result = cleanJson(response.output_text);
    usage.set(key, count + 1);

    res.json({
      ...result,
      analysesRemaining: Math.max(0, FREE_ANALYSES_PER_DAY - count - 1)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error?.message || "Analysis failed. Please try again." });
  }
});

app.post("/api/create-checkout", async (req, res) => {
  try {
    if (!stripe || !process.env.STRIPE_PRICE_ID) {
      return res.status(503).json({ error: "Stripe is not configured yet." });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${APP_URL}/?checkout=success`,
      cancel_url: `${APP_URL}/?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto"
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to start checkout." });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "FlipSmart AI" });
});

app.listen(port, () => {
  console.log(`FlipSmart AI running on port ${port}`);
});
