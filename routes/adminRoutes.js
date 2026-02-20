import express from "express";
import { loginAdmin, registerAdmin, getLiveMonitor } from "../controllers/adminController.js";

const router = express.Router()

router.post('/register', registerAdmin)
router.post('/login', loginAdmin)
router.get('/live-monitor', getLiveMonitor)

export default router;