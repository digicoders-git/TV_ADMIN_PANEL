import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from 'dotenv'

dotenv.config()

// Debug logs
// console.log("Cloudinary config:", {
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY ? "✅ loaded" : "❌ missing",
//   api_secret: process.env.CLOUDINARY_API_SECRET ? "✅ loaded" : "❌ missing"
// });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer storage for Cloudinary (video only)
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "tv_ads/videos",
    resource_type: "video",
    allowed_formats: ["mp4", "mov", "avi", "wmv", "flv", "webm"],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname.split(".")[0];
      return `video_ad_${originalName}_${timestamp}`;
    }
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const videoMimeTypes = [
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-ms-wmv",
    "video/x-flv",
    "video/webm"
  ];
  if (videoMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only video files are allowed! Supported formats: MP4, MOV, AVI, WMV, FLV, WEBM"
      ),
      false
    );
  }
};
console.log("hii chal")
const upload = multer({ storage, fileFilter });

export { cloudinary, upload };
