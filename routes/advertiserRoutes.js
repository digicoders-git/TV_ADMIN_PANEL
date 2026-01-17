// routes/advertiserRoutes.js
import express from "express";
import {
  createAdvertiser,
  getAdvertisers,
  getAdvertiserById,
  updateAdvertiser,
  deleteAdvertiser,
  toggleAdvertiserStatus,
  getAdvertiserCount,
  getAdvertisersByCity,
  getAdvertisersByState,
  getAdvertisersByCountry,
  getActiveAdvertisers,
  getAdvertisersWithStats
} from "../controllers/advertiserController.js";
import { adminOrEmployeeOnly, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect, adminOrEmployeeOnly)

// Basic CRUD operations
router.post("/", createAdvertiser);
router.get("/", getAdvertisers);
router.get("/count", getAdvertiserCount);
router.get("/:id", getAdvertiserById);
router.put("/:id", updateAdvertiser);
router.delete("/:id", deleteAdvertiser);
router.patch("/:id/toggle-status", toggleAdvertiserStatus);

// Geographical filtering
router.get("/city/:cityId", getAdvertisersByCity);
router.get("/state/:stateId", getAdvertisersByState);
router.get("/country/:countryId", getAdvertisersByCountry);

// Special endpoints
router.get("/public/active", getActiveAdvertisers); // Public endpoint for active advertisers
router.get("/dashboard/stats", getAdvertisersWithStats); // For admin dashboard with stats

export default router;