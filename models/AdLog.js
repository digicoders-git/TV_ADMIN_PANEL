import mongoose from "mongoose";

const adLogSchema = new mongoose.Schema({
  adId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:"Ad",
  },
  adTitle: {
    type: String,
  },
  tvId: {
     type: mongoose.Schema.Types.ObjectId,
     ref:"TV",
  },
  startTime: {
    type: Date,
  },
  endTime: {
    type: Date,
  },
  playTimes: [
    {
      type: String,
    },
  ],
  playTime: {
    type: String,
  },
  repeatCount: {
    type: Number,
    default: 0,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  remark: {
    type: String,
  },
}, {
  timestamps: true, 
});

export default mongoose.model("AdLog", adLogSchema);
