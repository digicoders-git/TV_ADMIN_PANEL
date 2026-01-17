// routes/stateRoutes.js
import express from "express";
import {
  createState,
  getStates,
  getActiveStates,
  getStateById,
  updateState,
  deleteState,
  toggleStateStatus
} from "../controllers/stateController.js";

const router = express.Router();

router.post("/", createState);
router.get("/", getStates);
router.get("/active", getActiveStates);
router.get("/:id", getStateById);
router.put("/:id", updateState);
router.delete("/:id", deleteState);
router.patch("/:id/toggle-status", toggleStateStatus);

export default router;
