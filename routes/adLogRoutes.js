// routes/adLogRoutes.js
import express from "express";
import { createAdLog, createAdLogInBulk, getAdLogs, getAdLogsAnalysis, getTVLogsAnalysis } from "../controllers/adLogController.js";

const router = express.Router();

router.post("/", createAdLog);
router.post("/create-in-bulk", createAdLogInBulk);
router.get("/", getAdLogs);
// TV-specific analytics
router.get('/tv/:tvId', getTVLogsAnalysis);
// AD-specific analytics
router.get('/ad/:adId', getAdLogsAnalysis);


export default router;