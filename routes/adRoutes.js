// routes/adRoutes.js
import express from "express";
import { upload } from "../middlewares/cloudinary.js";
import {
  createAd,
  getAds,
  getAdById,
  updateAd,
  deleteAd,
  toggleAdStatus,
  getAdCount,
  getAdsByAdvertiser,
  getAdsByCategory,
  getUnscheduledAds
} from "../controllers/adCountroller.js";

const router = express.Router();

router.post("/", upload.single("video"), createAd);
router.get("/", getAds);
router.get("/unscheduled", getUnscheduledAds);

// GET /api/ads/count - Get ad count with filters
router.get("/count", getAdCount);

// GET /api/ads/:id - Get ad by ID
router.get("/:id", getAdById);

// POST /api/ads - Create new ad

// PUT /api/ads/:id - Update ad
router.put("/:id", upload.single("video"), updateAd);

// DELETE /api/ads/:id - Delete ad
router.delete("/:id", deleteAd);

// PATCH /api/ads/:id/toggle - Toggle ad status
router.patch("/:id/toggle", toggleAdStatus);

// GET /api/ads/advertiser/:advertiser - Get ads by advertiser
router.get("/advertiser/:advertiser", getAdsByAdvertiser);

// GET /api/ads/category/:category - Get ads by category
router.get("/category/:category", getAdsByCategory);

export default router;