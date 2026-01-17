import mongoose from "mongoose";

const countrySchema = mongoose.Schema({
  countryId:{
        type: String,
    required: [true, "Country ID is required"],
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export const Country = mongoose.model("Country", countrySchema);