// scripts/initializeAdCounter.js
import mongoose from "mongoose";
import { Ad } from "../models/Ad.js";
import { Counter } from "../models/Counter.js";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/yourdbname");
  const adCount = await Ad.countDocuments();
  await Counter.findOneAndUpdate(
    { name: "adId" },
    { $set: { value: adCount } },
    { upsert: true, new: true }
  );
  console.log(`Counter for adId initialized to ${adCount}`);
  mongoose.disconnect();
}

main().catch(console.error);
