// routes/statisticsRoutes.js
import express from "express";
import {
  getDashboardStats,
} from "../controllers/statisticsController.js";

const router = express.Router();

router.get("/", getDashboardStats);

export default router;