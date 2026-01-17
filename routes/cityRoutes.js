// routes/cityRoutes.js
import express from "express";
import {
  createCity,
  getCities,
  getActiveCities,
  getCityById,
  updateCity,
  deleteCity,
  toggleCityStatus
} from "../controllers/cityController.js";

const router = express.Router();

router.post("/", createCity);
router.get("/", getCities);
router.get("/active", getActiveCities);
router.get("/:id", getCityById);
router.put("/:id", updateCity);
router.delete("/:id", deleteCity);
router.patch("/:id/toggle-status", toggleCityStatus);

export default router;
