// routes/adScheduleRoutes.js
import express from 'express';
import {
  createAdSchedule,
  getAdSchedules,
  getAdScheduleById,
  updateAdSchedule,
  deleteAdSchedule,
  toggleScheduleStatus,
  getSchedulesForTV,
  getSchedulesForAd,
  bulkCreateSchedules,
  getSchedulesForTVByTVCode,
  createAdScheduleByLocations,
  getTVsCountByLocations,
  createAdScheduleByExcel
} from '../controllers/adScheduleController.js';

const router = express.Router();

// Create a new ad schedule
router.post('/schedules', createAdSchedule);
router.post('/schedules-by-location', createAdScheduleByLocations);
router.post('/schedules-by-excel', createAdScheduleByExcel);
router.get('/schedules-by-location', getTVsCountByLocations);

// Bulk create ad schedules
router.post('/schedules/bulk', bulkCreateSchedules);

// Get all ad schedules with filtering and pagination
router.get('/schedules', getAdSchedules);

// Get specific ad schedule by ID
router.get('/schedules/:id', getAdScheduleById);

// Update ad schedule
router.put('/schedules/:id', updateAdSchedule);

// Delete ad schedule
router.delete('/schedules/:id', deleteAdSchedule);

// Toggle schedule status
router.patch('/schedules/:id/toggle-status', toggleScheduleStatus);

// Get schedules for a specific TV
router.get('/tvs/:tvId/schedules', getSchedulesForTV);
router.get('/tvs/tv-code/:tvCode/schedules', getSchedulesForTVByTVCode);

// Get schedules for a specific ad
router.get('/ads/:adId/schedules', getSchedulesForAd);

export default router;