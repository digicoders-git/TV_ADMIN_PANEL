// models/Ad.js
import mongoose from "mongoose";

const adSchema = new mongoose.Schema({
    adId: {
    type: String,
    required: [true, "Ad ID is required."],
    unique: true,
    trim: true,
    index: true
  },
  title: {
    type: String,
    required: [true, "Ad title is required"],
    trim: true,
    maxlength: [100, "Title cannot exceed 100 characters"]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"]
  },
  advertiser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Advertiser",
    required: [true, "Advertiser is required"]
  },
  
  // Video details
  videoUrl: {
    type: String,
    required: [true, "Video URL is required"]
  },
  cloudinaryPublicId: {
    type: String,
    required: [true, "Cloudinary public ID is required"]
  },
  duration: {
    type: Number, // in seconds
    required: [true, "Video duration is required"]
  },
  videoFormat: {
    type: String,
    required: true
  },
  videoSize: {
    type: Number, // in bytes
    required: true
  },

  categories: [{
    type: String,
    trim: true
  }],
  
  // status: {
  //   type: String,
  //   enum: ["draft", "pending", "approved", "rejected", "active", "completed", "paused"],
  //   default: "draft"
  // },
  isActive:{
    type:Boolean,
    default:true
  }
}, {
  timestamps: true
});

// Index for better query performance
adSchema.index({ advertiser: 1, status: 1 });

export const Ad = mongoose.model("Ad", adSchema);