import express from 'express';
import {
  createTV,
  getTVs,
  getTVById,
  updateTV,
  deleteTV,
  updateTVStatus,
  getTVCount,
  getTVsByStore,
  toggleTVStatus,
  getTVsByZone,
  getTVsByCity,
  getTVsByState,
  getTVsByCountry,
  getActiveTVs,
  validateTV,
  toggleLogInOutTV,
  getTVCompleteDetails
} from '../controllers/tvController.js';

const router = express.Router();

// TV CRUD Routes
router.post('/', createTV);              // Create a new TV
router.post('/validate', validateTV);              
router.patch('/log-in-out/toggle', toggleLogInOutTV);              
router.get('/', getTVs);                // Get all TVs (with filters)
router.get('/active', getActiveTVs);
router.get('/count', getTVCount);       // Get count of TVs
router.get('/complete/:tvCode', getTVCompleteDetails); // Complete TV details by tvCode
router.get('/:id', getTVById);          // Get a specific TV
router.put('/:id', updateTV);           // Update TV details
router.patch('/:id', updateTV);         // Alternative update TV (partial update)
router.delete('/:id', deleteTV);        // Delete a TV

// Status Management Routes
router.patch('/:id/status', updateTVStatus);  // Update TV status
router.patch('/:id/toggle-status', toggleTVStatus); // Toggle active/inactive status


// New routes for geographical filtering
router.get('/store/:storeId', getTVsByStore); 
router.get('/zone/:zoneId', getTVsByZone);
router.get('/city/:cityId', getTVsByCity);
router.get('/state/:stateId', getTVsByState);
router.get('/country/:countryId', getTVsByCountry);

export default router;