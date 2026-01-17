import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const adScheduleSchema = new mongoose.Schema({
  ad: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ad",
    required: true,
  },
  
  tvs: [
    {
      tv: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TV",
        required: true
      },
      playTimes: [
        {
          type: String
        }
      ]
    }
  ],

  scheduledByLocations: {
    stores: [{ type: mongoose.Schema.Types.ObjectId, ref: "Store" }],
    zones: [{ type: mongoose.Schema.Types.ObjectId, ref: "Zone" }],
    cities: [{ type: mongoose.Schema.Types.ObjectId, ref: "City" }],
    states: [{ type: mongoose.Schema.Types.ObjectId, ref: "State" }],
    countries: [{ type: mongoose.Schema.Types.ObjectId, ref: "Country" }]
  },
  validFrom: { type: Date, required: true },  // schedule start
  validTo: { type: Date, required: true },    // schedule end
  repeatInADay: { type: Number, default: 1 }, // ek din me kitni baar chalega
  priority: { type: Number, default: 1 },     // conflict resolve ke liye
  isActive: { type: Boolean, default: true }
}, { timestamps: true });


adScheduleSchema.plugin(mongoosePaginate);
export const AdSchedule = mongoose.model("AdSchedule", adScheduleSchema);
