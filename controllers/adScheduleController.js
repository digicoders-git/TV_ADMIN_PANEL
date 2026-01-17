// controllers/adScheduleController.js
import mongoose from "mongoose";
import { AdSchedule } from "../models/AdSchedule.js";
import { Ad } from "../models/Ad.js";
import { TV } from "../models/TV.js";


export const createAdSchedule = async (req, res) => {
  try {
    const { ad, tvs, validFrom, validTo, repeatInADay, priority, isActive } = req.body;

    console.log("👉 Incoming Body:", req.body);

    // Validate ad
    if (!mongoose.Types.ObjectId.isValid(ad)) {
      return res.status(400).json({ success: false, message: "❌ Invalid ad ID" });
    }

    // Validate all TVs
    const validatedTvs = [];
    for (const item of tvs) {
      if (!mongoose.Types.ObjectId.isValid(item.tv)) {
        console.log("❌ Invalid TV ID skipped:", item.tv);
        continue;
      }
      validatedTvs.push({
        tv: new mongoose.Types.ObjectId(item.tv),
        playTimes: item.playTimes || []
      });
    }

    if (validatedTvs.length === 0) {
      return res.status(400).json({ success: false, message: "❌ No valid TVs provided" });
    }

    // Create ONE schedule with all TVs inside `tvs` array
    const schedule = new AdSchedule({
      ad: new mongoose.Types.ObjectId(ad),
      tvs: validatedTvs,
      validFrom,
      validTo,
      repeatInADay,
      priority,
      isActive,
      scheduledByLocations: { stores: [], zones: [], cities: [], states: [], countries: [] }
    });

    console.log("✅ Prepared Schedule (before save):", JSON.stringify(schedule, null, 2));

    await schedule.save();

    console.log("✅ Saved Schedule:", schedule);

    res.status(201).json({
      success: true,
      message: "AdSchedule created successfully",
      data: schedule
    });

  } catch (error) {
    console.error("❌ Error creating ad schedule:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get all ad schedules with filtering and pagination
// export const getAdSchedules = async (req, res) => {
//   try {
//     const {
//       // page = 1,
//       // limit = 10,
//       ad,
//       tv,
//       status,
//       startDate,
//       endDate,
//       sortBy = 'createdAt',
//       sortOrder = 'desc'
//     } = req.query;

//     // Build filter object
//     const filter = {};

//     if (ad) filter.ad = ad;
//     if (tv) filter.tvs = tv;
//     if (status !== undefined) filter.isActive = status === 'true';

//     // Date range filter
//     if (startDate || endDate) {
//       filter.validFrom = {};
//       if (startDate) filter.validFrom.$gte = new Date(startDate);
//       if (endDate) filter.validFrom.$lte = new Date(endDate);
//     }

//     // Sort options
//     const sortOptions = {};
//     sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

//     const options = {
//       // page: parseInt(page),
//       // limit: parseInt(limit),
//       sort: sortOptions,
//       populate: [
//         { path: 'ad', model: 'Ad' },
//         {
//           path: 'tvs.tv', // populate the nested tv field
//           model: 'TV',
//           populate: [
//             { path: 'store', model: 'Store' },
//             { path: 'zone', model: 'Zone' },
//             { path: 'city', model: 'City' },
//             { path: 'state', model: 'State' },
//             { path: 'country', model: 'Country' }
//           ]
//         },
//         {
//           path: 'scheduledByLocations.stores',
//           model: 'Store'
//         },
//         {
//           path: 'scheduledByLocations.zones',
//           model: 'Zone'
//         },
//         {
//           path: 'scheduledByLocations.cities',
//           model: 'City'
//         },
//         {
//           path: 'scheduledByLocations.states',
//           model: 'State'
//         },
//         {
//           path: 'scheduledByLocations.countries',
//           model: 'Country'
//         }
//       ]
//     };


//     // Using mongoose-paginate-v2 (you might need to install it)
//     const schedules = await AdSchedule.paginate(filter, options);
//     console.log(schedules.length)
//     res.status(200).json({
//       success: true,
//       data: schedules
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error fetching ad schedules",
//       error: error.message
//     });
//   }
// };

export const getAdSchedules = async (req, res) => {
  try {
    const {
      ad,
      tv,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (ad) filter.ad = ad;
    if (tv) filter.tvs = tv;
    if (status !== undefined) filter.isActive = status === 'true';

    // Date range filter
    if (startDate || endDate) {
      filter.validFrom = {};
      if (startDate) filter.validFrom.$gte = new Date(startDate);
      if (endDate) filter.validFrom.$lte = new Date(endDate);
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // 🔹 Fetch all schedules without pagination
    const schedules = await AdSchedule.find(filter)
      .populate([
        { path: 'ad', model: 'Ad' },
        {
          path: 'tvs.tv',
          model: 'TV',
          populate: [
            { path: 'store', model: 'Store' },
            { path: 'zone', model: 'Zone' },
            { path: 'city', model: 'City' },
            { path: 'state', model: 'State' },
            { path: 'country', model: 'Country' }
          ]
        },
        { path: 'scheduledByLocations.stores', model: 'Store' },
        { path: 'scheduledByLocations.zones', model: 'Zone' },
        { path: 'scheduledByLocations.cities', model: 'City' },
        { path: 'scheduledByLocations.states', model: 'State' },
        { path: 'scheduledByLocations.countries', model: 'Country' }
      ])
      .sort(sortOptions);

    res.status(200).json({
      success: true,
      data: schedules
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching ad schedules",
      error: error.message
    });
  }
};


// Get specific ad schedule by ID
export const getAdScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await AdSchedule.findById(id)
      .populate('ad')
      .populate({
        path: 'tvs',
        populate: [
          { path: 'store', model: 'Store' },
          { path: 'zone', model: 'Zone' },
          { path: 'city', model: 'City' },
          { path: 'state', model: 'State' },
          { path: 'country', model: 'Country' }
        ]
      });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Ad schedule not found"
      });
    }

    res.status(200).json({
      success: true,
      data: schedule
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching ad schedule",
      error: error.message
    });
  }
};

// Update ad schedule

export const updateAdSchedule = async (req, res) => {
  console.log("Request Body:", req.body);

  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if schedule exists
    const existingSchedule = await AdSchedule.findById(id);
    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: "Ad schedule not found"
      });
    }

    // Prepare update object with only provided fields
    const updateObject = {};

    if (updateData.ad !== undefined) updateObject.ad = updateData.ad;
    if (updateData.validFrom !== undefined) updateObject.validFrom = updateData.validFrom;
    if (updateData.validTo !== undefined) updateObject.validTo = updateData.validTo;
    if (updateData.repeatInADay !== undefined) updateObject.repeatInADay = updateData.repeatInADay;
    if (updateData.priority !== undefined) updateObject.priority = updateData.priority;
    if (updateData.isActive !== undefined) updateObject.isActive = updateData.isActive;

    // Handle TVs update separately
    if (updateData.tvs !== undefined) {
      // Validate TVs if being updated
      const tvIds = updateData.tvs.map(item => item.tv);
      
      // Check if all TV IDs are valid
      const invalidTvIds = tvIds.filter(tvId => !mongoose.Types.ObjectId.isValid(tvId));
      if (invalidTvIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid TV IDs: ${invalidTvIds.join(', ')}`
        });
      }

      // Check if TVs exist
      const tvExists = await TV.find({ _id: { $in: tvIds } });
      if (tvExists.length !== tvIds.length) {
        const foundTvIds = tvExists.map(tv => tv._id.toString());
        const missingTvIds = tvIds.filter(tvId => !foundTvIds.includes(tvId));
        return res.status(404).json({
          success: false,
          message: `TVs not found: ${missingTvIds.join(', ')}`
        });
      }

      // Format TVs correctly for the schema
      updateObject.tvs = updateData.tvs.map(item => ({
        tv: new mongoose.Types.ObjectId(item.tv),
        playTimes: item.playTimes || []
      }));
    }

    // Validate Ad if being updated
    if (updateData.ad) {
      const adExists = await Ad.findById(updateData.ad);
      if (!adExists) {
        return res.status(404).json({
          success: false,
          message: "Ad not found"
        });
      }

      // Check if ad is already scheduled in another schedule (due to unique constraint)
      if (updateData.ad !== existingSchedule.ad.toString()) {
        const existingAdSchedule = await AdSchedule.findOne({ 
          ad: updateData.ad,
          _id: { $ne: id } // Exclude current schedule
        });
        if (existingAdSchedule) {
          return res.status(400).json({
            success: false,
            message: "This ad is already scheduled in another schedule"
          });
        }
      }
    }

    console.log("Update Object:", updateObject);

    // Update only the provided fields
    const updatedSchedule = await AdSchedule.findByIdAndUpdate(
      id,
      { $set: updateObject },
      { new: true, runValidators: true }
    ).populate('ad tvs.tv'); // Populate the TV details within the tvs array

    res.status(200).json({
      success: true,
      message: "Ad schedule updated successfully",
      data: updatedSchedule
    });

  } catch (error) {
    console.error("Update Error:", error);

    // Handle duplicate key error (unique constraint on ad field)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This ad is already scheduled in another schedule"
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.message
      });
    }

    // Handle CastError (invalid ObjectId)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating ad schedule",
      error: error.message
    });
  }
};

// Delete ad schedule
export const deleteAdSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSchedule = await AdSchedule.findByIdAndDelete(id);

    if (!deletedSchedule) {
      return res.status(404).json({
        success: false,
        message: "Ad schedule not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Ad schedule deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting ad schedule",
      error: error.message
    });
  }
};

// Toggle schedule status (active/inactive)
export const toggleScheduleStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await AdSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Ad schedule not found"
      });
    }

    schedule.isActive = !schedule.isActive;
    await schedule.save();

    res.status(200).json({
      success: true,
      message: `Schedule ${schedule.isActive ? 'activated' : 'deactivated'} successfully`,
      data: schedule
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error toggling schedule status",
      error: error.message
    });
  }
};

// Get schedules for a specific TV
export const getSchedulesForTV = async (req, res) => {
  try {
    const { tvId } = req.params;
    const { date } = req.query;

    // Validate TV exists
    const tv = await TV.findById(tvId);
    if (!tv) {
      return res.status(404).json({
        success: false,
        message: "TV not found"
      });
    }

    let dateFilter = {};
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      dateFilter = {
        validFrom: { $lt: nextDay },
        validTo: { $gt: targetDate }
      };
    }

    const schedules = await AdSchedule.find({
      "tvs.tv": tv._id,   //  Correct query
      isActive: true,
      ...dateFilter
    })
      .populate("ad")
      .select("-repeatInADay -priority")
      .sort({ createdAt: -1, validFrom: 1 });


    res.status(200).json({
      success: true,
      data: schedules
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching schedules for TV",
      error: error.message
    });
  }
};


// export const getSchedulesForTVByTVCode = async (req, res) => {
//   try {
//     const { tvCode } = req.params;
//     const { date } = req.query;

//     // 🔍 Find TV by code
//     const tv = await TV.findOne({ tvId: tvCode });
//     if (!tv) {
//       return res.status(404).json({
//         success: false,
//         message: "TV not found",
//       });
//     }

//     // 📅 Determine target date (India timezone)
//     const todayInIndia = new Date().toLocaleString("en-US", {
//       timeZone: "Asia/Kolkata",
//     });
//     let targetDate = date ? new Date(date) : new Date(todayInIndia);
//     targetDate.setHours(0, 0, 0, 0); // start of the day

//     // End of the day
//     const endOfDay = new Date(targetDate);
//     endOfDay.setHours(23, 59, 59, 999);

//     // 🔹 Filter schedules valid for the target day
//     const schedules = await AdSchedule.find({
//       "tvs.tv": tv._id,
//       isActive: true,
//       validFrom: { $lte: endOfDay },
//       validTo: { $gte: targetDate },
//     })
//       .populate("ad")
//       .select("-repeatInADay -priority")
//       .sort({ validFrom: 1, createdAt: -1 });
      
// const indiaDateString = targetDate.toLocaleDateString("en-CA", {
//   timeZone: "Asia/Kolkata",
// }); // "2025-09-16T00:00:00"

// return res.status(200).json({
//   success: true,
//   date: indiaDateString,
//   data: schedules,
// });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Error fetching schedules for TV",
//       error: error.message,
//     });
//   }
// };


export const getSchedulesForTVByTVCode = async (req, res) => {
  try {
    const { tvCode } = req.params;
    const { date } = req.query;

    // 🔍 Find TV by code
    const tv = await TV.findOne({ tvId: tvCode });
    if (!tv) {
      return res.status(404).json({
        success: false,
        message: "TV not found",
      });
    }

    // 📅 Determine target date (India timezone)
    const todayInIndia = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    let targetDate = date ? new Date(date) : new Date(todayInIndia);
    targetDate.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 🔹 Fetch schedules for this TV
    const schedules = await AdSchedule.find({
      "tvs.tv": tv._id,
      isActive: true,
      validFrom: { $lte: endOfDay },
      validTo: { $gte: targetDate },
    })
      .populate("ad")
      .select("-repeatInADay -priority")
      .sort({ validFrom: 1, createdAt: -1 })
      .lean(); // plain objects for manipulation

    // 🎯 Filter playTimes only for this TV
    const formattedSchedules = schedules.map((schedule) => {
      const tvEntry = schedule.tvs.find(
        (t) => t.tv.toString() === tv._id.toString()
      );

      return {
        _id: schedule._id,
        ad: schedule.ad,
        playTimes: tvEntry ? tvEntry.playTimes : [],
        validFrom: schedule.validFrom,
        validTo: schedule.validTo,
        isActive: schedule.isActive,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      };
    });

    const indiaDateString = targetDate.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    return res.status(200).json({
      success: true,
      date: indiaDateString,
      data: {tv,formattedSchedules},
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching schedules for TV",
      error: error.message,
    });
  }
};


export const getSchedulesForAd = async (req, res) => {
  try {
    const { adId } = req.params;

    // Validate ad exists
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Ad not found"
      });
    }

    const schedules = await AdSchedule.find({ ad: adId })
      .populate({
        path: 'tvs',
        populate: [
          { path: 'store', model: 'Store' },
          { path: 'zone', model: 'Zone' },
          { path: 'city', model: 'City' },
          { path: 'state', model: 'State' },
          { path: 'country', model: 'Country' }
        ]
      })
      .sort({ validFrom: -1 });

    res.status(200).json({
      success: true,
      data: schedules
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching schedules for ad",
      error: error.message
    });
  }
};

// Helper function to check scheduling conflicts
const checkSchedulingConflicts = async (tvs, validFrom, validTo, excludeScheduleId = null) => {
  const conflictFilter = {
    tvs: { $in: tvs },
    isActive: true,
    $or: [
      { validFrom: { $lt: validTo, $gte: validFrom } },
      { validTo: { $gt: validFrom, $lte: validTo } },
      { validFrom: { $lte: validFrom }, validTo: { $gte: validTo } }
    ]
  };

  if (excludeScheduleId) {
    conflictFilter._id = { $ne: excludeScheduleId };
  }

  const conflictingSchedules = await AdSchedule.find(conflictFilter)
    .populate('ad', 'title')
    .populate('tvs', 'tvId tvName');

  return {
    hasConflicts: conflictingSchedules.length > 0,
    conflicts: conflictingSchedules
  };
};

// Bulk create schedules
export const bulkCreateSchedules = async (req, res) => {
  try {
    const { schedules } = req.body;

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Schedules array is required"
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const scheduleData of schedules) {
      try {
        const newSchedule = new AdSchedule(scheduleData);
        const savedSchedule = await newSchedule.save();
        await savedSchedule.populate('ad tvs');
        results.successful.push(savedSchedule);
      } catch (error) {
        results.failed.push({
          data: scheduleData,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Created ${results.successful.length} schedules, ${results.failed.length} failed`,
      data: results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error in bulk creation",
      error: error.message
    });
  }
};

// Create ad schedules for multiple locations (stores, zones, cities, states, countries)

export const createAdScheduleByLocations = async (req, res) => {
  try {
    const {
      ad,
      stores = [],
      zones = [],
      cities = [],
      states = [],
      countries = [],
      validFrom,
      validTo,
      repeatInADay,
      priority,
      playTimes = []
    } = req.body;

    // Validate required fields
    if (!ad || !validFrom || !validTo) {
      return res.status(400).json({
        success: false,
        message: "ad, validFrom, and validTo are required fields"
      });
    }

    // Validate at least one location
    if (
      stores.length === 0 &&
      zones.length === 0 &&
      cities.length === 0 &&
      states.length === 0 &&
      countries.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one location (store, zone, city, state, or country) must be provided"
      });
    }

    // Validate ad exists
    const adExists = await Ad.findById(ad);
    if (!adExists) {
      return res.status(404).json({
        success: false,
        message: "Ad not found"
      });
    }

    // Check dates
    if (new Date(validFrom) > new Date(validTo)) {
      return res.status(400).json({
        success: false,
        message: "validFrom must be before or same as validTo"
      });
    }

    // Build query for TVs
    const tvQuery = { isActive: true, $or: [] };

    if (stores.length > 0) tvQuery.$or.push({ store: { $in: stores } });
    if (zones.length > 0) tvQuery.$or.push({ zone: { $in: zones } });
    if (cities.length > 0) tvQuery.$or.push({ city: { $in: cities } });
    if (states.length > 0) tvQuery.$or.push({ state: { $in: states } });
    if (countries.length > 0) tvQuery.$or.push({ country: { $in: countries } });

    if (tvQuery.$or.length === 0) delete tvQuery.$or;

    // Find TVs
    const matchingTVs = await TV.find(tvQuery).select('_id');
    if (matchingTVs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No TVs found in the specified locations"
      });
    }

    // Format TV objects with playTimes
    const tvsWithTimes = matchingTVs.map(tv => ({
      tv: tv._id,
      playTimes
    }));

    // Check if schedule exists already
    const existingSchedules = await AdSchedule.find({
      ad,
      "tvs.tv": { $in: matchingTVs.map(tv => tv._id) }
    });

    if (existingSchedules.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Schedule already exists for this ad on some TVs",
        conflictingTVs: existingSchedules
          .map(schedule => schedule.tvs.map(t => t.tv))
          .flat()
      });
    }

    // Create new schedule
    const newSchedule = new AdSchedule({
      ad,
      tvs: tvsWithTimes,
      validFrom: new Date(validFrom),
      validTo: new Date(validTo),
      repeatInADay: repeatInADay || 1,
      priority: priority || 1,
      isActive: true,
      scheduledByLocations: {
        stores,
        zones,
        cities,
        states,
        countries
      }
    });

    const savedSchedule = await newSchedule.save();
    await savedSchedule.populate('ad tvs.tv');

    res.status(201).json({
      success: true,
      message: `Ad schedule created successfully for ${tvsWithTimes.length} TVs`,
      data: {
        schedule: savedSchedule,
        tvCount: tvsWithTimes.length,
        locations: { stores, zones, cities, states, countries }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error creating ad schedule by locations",
      error: error.message
    });
  }
};


// Get TVs count by locations (for preview before scheduling)
export const getTVsCountByLocations = async (req, res) => {
  
  try {
    const {
      stores = [],
      zones = [],
      cities = [],
      states = [],
      countries = []

    } = req.body;

    // Build query to find TVs in specified locations
    const tvQuery = {
      isActive: true,
      $or: []
    };

    if (stores.length > 0) {
      tvQuery.$or.push({ store: { $in: stores } });
    }
    if (zones.length > 0) {
      tvQuery.$or.push({ zone: { $in: zones } });
    }
    if (cities.length > 0) {
      tvQuery.$or.push({ city: { $in: cities } });
    }
    if (states.length > 0) {
      tvQuery.$or.push({ state: { $in: states } });
    }
    if (countries.length > 0) {
      tvQuery.$or.push({ country: { $in: countries } });
    }

    // If no OR conditions, remove the $or operator
    if (tvQuery.$or.length === 0) {
      delete tvQuery.$or;
    }

    // Get count of matching TVs
    const tvCount = await TV.countDocuments(tvQuery);

    // Get sample TVs for preview
    const sampleTVs = await TV.find(tvQuery)
      .select('tvId tvName store zone city state country')
      .populate('store', 'name')
      .populate('zone', 'name')
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        totalTVs: tvCount,
        sampleTVs,
        locations: {
          stores,
          zones,
          cities,
          states,
          countries
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error getting TVs count by locations",
      error: error.message
    });
  }
};


export const createAdScheduleByExcel = async (req, res) => {
  try {
    const { startDate, endDate, schedules } = req.body;

    // Step 1: prepare group by ad
    const adGroups = {};

    for (const sch of schedules) {
      // Resolve Ad
      const adDoc = await Ad.findOne({ adId: sch.ad });
      if (!adDoc) {
        console.warn(`⚠️ Ad not found for adId=${sch.ad}`);
        continue;
      }

      // Resolve TV
      const tvDoc = await TV.findOne({ tvId: sch.tv });
      if (!tvDoc) {
        console.warn(`⚠️ TV not found for tvId=${sch.tv}`);
        continue;
      }

      // Group by ad
      if (!adGroups[adDoc._id]) {
        adGroups[adDoc._id] = {
          ad: adDoc._id,
          tvs: [],
          validFrom: new Date(startDate),
          validTo: new Date(endDate),
          isActive: true,
        };
      }

      adGroups[adDoc._id].tvs.push({
        tv: tvDoc._id,
        playTimes: sch.playTimes || [],
      });
    }

    // Final formatted schedules
    const formattedSchedules = Object.values(adGroups);

    console.log("📌 Formatted AdSchedules:", JSON.stringify(formattedSchedules, null, 2));

    res.status(200).json({
      success: true,
      message: "Schedule data prepared successfully. Check console.",
      data: formattedSchedules,
    });

    // 🛑 Save karna baad me hoga:
    await AdSchedule.insertMany(formattedSchedules);

  } catch (error) {
    console.error("❌ Error preparing schedule:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};
