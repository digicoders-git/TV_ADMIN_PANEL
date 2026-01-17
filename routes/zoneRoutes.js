// routes/zoneRoutes.js
import express from "express";
import {
  createZone,
  getZones,
  getActiveZones,
  getZoneById,
  updateZone,
  deleteZone,
  toggleZoneStatus
} from "../controllers/zoneController.js";

const router = express.Router();

router.post("/", createZone);
router.get("/", getZones);
router.get("/active", getActiveZones);
router.get("/:id", getZoneById);
router.put("/:id", updateZone);
router.delete("/:id", deleteZone);
router.patch("/:id/toggle-status", toggleZoneStatus);

export default router;