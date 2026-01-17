// routes/storeRoutes.js
import express from "express";
import {
  createStore,
  getStores,
  getActiveStores,
  getStoreById,
  getStoresByZone,
  updateStore,
  deleteStore,
  toggleStoreStatus,
  getStoreCount
} from "../controllers/storeController.js";

const router = express.Router();

router.post("/", createStore);
router.get("/", getStores);
router.get("/active", getActiveStores);
router.get("/count", getStoreCount);
router.get("/zone/:zoneId", getStoresByZone);
router.get("/:id", getStoreById);
router.put("/:id", updateStore);
router.delete("/:id", deleteStore);
router.patch("/:id/toggle-status", toggleStoreStatus);

export default router;