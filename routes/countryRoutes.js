import e from "express";
import {
  createCountry,
  getCountries,
  getActiveCountries,
  getCountryById,
  updateCountry,
  deleteCountry,
  toggleCountryStatus
} from "../controllers/countryController.js";
import { adminOrEmployeeOnly, protect } from "../middlewares/authMiddleware.js";

const router = e.Router();

// Public route
router.get('/active', getActiveCountries);

// Authenticated routes
router.use(protect);

router.post('/', adminOrEmployeeOnly, createCountry);
router.get('/', adminOrEmployeeOnly, getCountries);
router.get('/:id', adminOrEmployeeOnly, getCountryById);
router.put('/:id', adminOrEmployeeOnly, updateCountry);
router.delete('/:id', adminOrEmployeeOnly, deleteCountry);
router.patch('/:id/toggle-status', adminOrEmployeeOnly, toggleCountryStatus);

export default router;
