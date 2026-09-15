import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import Stripe from "stripe";
import multer from "multer";
import path from "path";
import {fileURLToPath} from "url";

dotenv.config();
const app=express(), upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024}});
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const ai=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;
const stripe=process.env.STRIPE_SECRET_KEY?new Stripe(process.env.STRIPE_SECRET_KEY):null;

app.use(express.json({limit:"1mb"}));
app.use(express.static(path.join(__dirname,"public")));

app.post("/api/analyze",upload.single("photo"),async(req,res)=>{
 try{
  if(!ai)return res.status(503).json({error:"Add OPENAI_API_KEY to .env first."});
  const {description="",purchasePrice="0",marketplace="eBay"}=req.body;
  const content=[{type:"text",text:`You are FlipSmart AI, a careful resale research assistant. Analyze the item for a reseller. Do not claim live marketplace access. Return JSON with: item_identification, visible_condition, missing_information, estimated_resale_low, estimated_resale_high, estimated_fees, estimated_shipping, estimated_net_profit, confidence, risks, buy_decision, listing_title, listing_description, research_steps. Money values must be numbers. Purchase price: ${purchasePrice}. Marketplace: ${marketplace}. Description: ${description}.` }];
  if(req.file)content.push({type:"image_url",image_url:{url:`data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`}});
  const out=await ai.chat.completions.create({model:"gpt-4o-mini",response_format:{type:"json_object"},messages:[{role:"system",content:"Return only valid JSON."},{role:"user",content}]});
  res.json(JSON.parse(out.choices[0].message.content));
 }catch(e){console.error(e);res.status(500).json({error:"AI analysis failed."});}
});

app.post("/api/create-checkout",async(req,res)=>{
 try{
  if(!stripe||!process.env.STRIPE_PRICE_ID)return res.status(503).json({error:"Stripe is not configured yet."});
  const session=await stripe.checkout.sessions.create({mode:"subscription",line_items:[{price:process.env.STRIPE_PRICE_ID,quantity:1}],success_url:`${process.env.APP_URL}/?success=1`,cancel_url:`${process.env.APP_URL}/?cancelled=1`});
  res.json({url:session.url});
 }catch(e){res.status(500).json({error:"Could not create checkout session."});}
});
app.listen(process.env.PORT||3000,()=>console.log("FlipSmart AI running"));
