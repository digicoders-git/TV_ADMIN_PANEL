import { Counter } from "../models/Counter.js";
import { TV } from "../models/TV.js";

export const initializeCounter = async () => {
  try {
    const lastTV = await TV.findOne().sort({ tvId: -1 });
    const lastId = lastTV ? parseInt(lastTV.tvId) : 0;

    await Counter.findOneAndUpdate(
      { name: "tvId" },
      { $setOnInsert: { value: lastId } }, // sirf agar counter missing ho to set kare
      { upsert: true }
    );

    console.log(`Counter is aligned with last TV ID: ${lastId}`);
  } catch (error) {
    console.error("Error initializing counter:", error);
  }
};
