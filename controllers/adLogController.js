import mongoose from "mongoose";
import { TV } from "../models/TV.js";
import AdLog from "../models/AdLog.js";
import { Ad } from "../models/Ad.js";


// Create new AdLog
export const createAdLog = async (req, res) => {
  try {
    const { adId, adTitle, tvId, startTime, endTime, playTimes, playTime, completed, remark } = req.body;

    const tv = await TV.findOne({ tvId: tvId })


    //  Check duplicate log by tv + startTime + endTime
    const existingLog = await AdLog.findOne({
      adId,
      tvId: tv._id,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    });

    if (existingLog) {
      return res.status(200).json({ success: true, message: "The Log Already has been Saved" });
    }

    const newLog = new AdLog({
      adId,
      adTitle,
      tvId: tv._id,
      playTimes,
      playTime,
      startTime,
      endTime,
      completed,
      remark,
    });

    const savedLog = await newLog.save();
    tv.lastSyncTime = Date.now()
    tv.lastSyncedAd = adId
    await tv.save();

    return res.status(201).json({ success: true, data: savedLog });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createAdLogInBulk = async (req, res) => {
  try {
    const { logs = [] } = req.body; //  array of logs from client

    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Logs array is required"
      });
    }

    const savedLogs = [];

    for (const log of logs) {
      const { adId, adTitle, tvId, startTime, endTime, playTimes, playTime, completed, remark } = log;

      //  Check TV exists
      const tv = await TV.findOne({ tvId: tvId });
      if (!tv) continue;

      //  Check duplicate log by tv + startTime + endTime
      const existingLog = await AdLog.findOne({
        adId,
        tvId: tv._id,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      });

      if (existingLog) {
        continue; // skip duplicate
      }

      // ✅ Create new log
      const newLog = new AdLog({
        adId,
        adTitle,
        tvId: tv._id,
        playTimes,
        playTime,
        startTime,
        endTime,
        completed,
        remark,
      });

      const savedLog = await newLog.save();
      savedLogs.push(savedLog);

      //  update TV info
      tv.lastSyncTime = Date.now();
      tv.lastSyncedAd = adId;
      await tv.save();
    }

    return res.status(201).json({
      success: true,
      count: savedLogs.length,
      data: savedLogs,
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};




// Single API for complete ad logs management with filters, pagination, and stats

export const getAdLogs = async (req, res) => {
  try {
    const {
      // Filter parameters
      completed,
      adId,
      tvId,
      adTitle,
      startDate,
      endDate,
      remark,
      playTime,
      completionStatus, // New filter: all, completed, uncompleted, interrupted, not_played

      // Pagination
      page = 1,
      limit = 10,

      // Sort
      sortBy = "createdAt",
      sortOrder = "desc",

      // Search
      search,

      // Stats required
      includeStats = "true",

      // Additional options
      includeDurationAnalysis = "true"
    } = req.query;

    // Build main filter for logs
    const filter = {};

    // Basic filters
    if (completed !== undefined) filter.completed = completed === "true";

    if (adId && mongoose.Types.ObjectId.isValid(adId)) {
      filter.adId = adId;
    }
    if (tvId && mongoose.Types.ObjectId.isValid(tvId)) {
      filter.tvId = tvId;
    }

    // Text filters
    if (adTitle) filter.adTitle = { $regex: adTitle, $options: "i" };
    if (remark) filter.remark = { $regex: remark, $options: "i" };
    if (playTime) filter.playTime = playTime;

    // Date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Global search
    if (search) {
      filter.$or = [
        { adTitle: { $regex: search, $options: "i" } },
        { remark: { $regex: search, $options: "i" } },
        { playTime: { $regex: search, $options: "i" } },
        { "adId.title": { $regex: search, $options: "i" } }
      ];
    }

    // Pagination setup
    const pageNum = Math.max(1, parseInt(page, 10));
    // console.log(limit)
    let limitNum;
    if (limit === "all") {
      limitNum = null;
    } else {
      limitNum = parseInt(limit, 10) || 10;
    }

    const skip = limitNum ? (pageNum - 1) * limitNum : 0;


    // Sort setup
    const sortOptions = {};
    const allowedSortFields = [
      "createdAt", "updatedAt", "startTime", "endTime",
      "repeatCount", "adTitle", "actualDuration", "completionPercentage",
      "playDuration"
    ];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    sortOptions[safeSortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute queries in parallel for better performance
    const [logs, totalCount, stats] = await Promise.all([
      // Get paginated logs with enhanced data
      AdLog.find(filter)
        .populate("adId", "title advertiser status videoUrl duration categories adId")
        .populate("tvId", "tvName store zone city state country location screenSize tvId")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean()
        .then(logs => enhanceLogsWithCompleteAnalytics(logs, includeDurationAnalysis === "true")),

      // Get total count
      AdLog.countDocuments(filter),

      // Get enhanced statistics if requested
      includeStats === "true" ? getComprehensiveStatistics(filter) : Promise.resolve(null)
    ]);

    // Apply completion status filter after analytics enhancement
    let filteredLogs = logs;
    if (completionStatus && completionStatus !== 'all') {
      filteredLogs = logs.filter(log => {
        switch (completionStatus) {
          case 'completed':
            return log.enhancedCompletion.status === 'completed';
          case 'uncompleted':
            return log.enhancedCompletion.status === 'uncompleted';
          case 'interrupted':
            return log.timing.wasInterrupted;
          case 'not_played':
            return log.timing.actualDuration === 0;
          default:
            return true;
        }
      });
    }

    // Calculate pagination info based on filtered logs
    const filteredCount = completionStatus ? filteredLogs.length : totalCount;
    const totalPages = Math.ceil(filteredCount / limitNum);

    // Prepare complete response
    const response = {
      success: true,
      data: {
        logs: filteredLogs,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount: filteredCount,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
          limit: limitNum,
          originalTotalCount: totalCount // For reference
        },
        stats: includeStats === "true" ? await getComprehensiveStatistics(filter) : null,
        analytics: includeDurationAnalysis === "true" ? getOverallAnalytics(filteredLogs) : null,
        filters: {
          current: {
            ...filter,
            completionStatus: completionStatus || 'all'
          },
          available: getAvailableFilters()
        }
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error in getAdLogs:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { error: error.message })
    });
  }
};

// Enhanced function to add complete analytics to each log

function enhanceLogsWithCompleteAnalytics(logs, includeDurationAnalysis = true) {
  return logs.map(log => {
    // Calculate actual play duration in seconds from startTime and endTime
    const startTime = new Date(log.startTime);
    const endTime = new Date(log.endTime);
    const actualDuration = Math.max(0, (endTime - startTime) / 1000); // in seconds

    // Get expected duration from ad
    const expectedDuration = log.adId?.duration || 0;

    // Determine completion status based on actual play duration
    const completionPercentage = expectedDuration > 0 ?
      Math.min(100, (actualDuration / expectedDuration) * 100) :
      (actualDuration > 0 ? 100 : 0);

    const isActuallyCompleted = completionPercentage >= 90;
    const wasInterrupted = actualDuration > 0 && actualDuration < expectedDuration * 0.9;

    // Analyze remark for additional insights
    const remarkAnalysis = analyzeRemark(log.remark);

    // Enhanced log object
    const enhancedLog = {
      ...log,
      // Play duration information (always included)
      playDuration: {
        seconds: parseFloat(actualDuration.toFixed(3)),
        minutes: parseFloat((actualDuration / 60).toFixed(2)),
        formatted: formatDuration(actualDuration),
        startTime: log.startTime,
        endTime: log.endTime
      },
      // Enhanced completion status
      enhancedCompletion: {
        original: log.completed,
        calculated: isActuallyCompleted,
        status: isActuallyCompleted ? "completed" : "uncompleted",
        reason: getCompletionReason(actualDuration, expectedDuration),
        percentage: parseFloat(completionPercentage.toFixed(1))
      }
    };

    // Include detailed timing analysis if requested
    if (includeDurationAnalysis) {
      enhancedLog.timing = {
        actualDuration: parseFloat(actualDuration.toFixed(3)),
        expectedDuration: parseFloat(expectedDuration.toFixed(3)),
        completionPercentage: parseFloat(completionPercentage.toFixed(1)),
        isFullyCompleted: isActuallyCompleted,
        wasInterrupted: wasInterrupted,
        durationDifference: parseFloat((expectedDuration - actualDuration).toFixed(3)),
        efficiency: expectedDuration > 0 ? parseFloat((actualDuration / expectedDuration).toFixed(3)) : 0
      };

      enhancedLog.remarkAnalysis = remarkAnalysis;
    }

    return enhancedLog;
  });
}

// Helper function to format duration for display
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds.toFixed(1)} sec`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} min ${remainingSeconds.toFixed(0)} sec`;
  }
}

// Improved remark analysis function
function analyzeRemark(remark) {
  if (!remark) return { type: "unknown", summary: "No remark provided" };

  const analysis = {
    type: "information",
    summary: remark,
    details: {}
  };

  // Check for play count remarks
  const playCountMatch = remark.match(/Today total plays on TV (\d+): (\d+)/);
  if (playCountMatch) {
    analysis.type = "play_time_summary";
    analysis.details = {
      tvNumber: parseInt(playCountMatch[1]),
      totalPlays: parseInt(playCountMatch[2]),
      context: "repeat_count_for_this_play_time"
    };
    analysis.summary = `TV ${playCountMatch[1]} played ${playCountMatch[2]} times today`;
    return analysis;
  }

  // Check for repeat update remarks
  if (remark.includes("Repeat updated")) {
    analysis.type = "repeat_update";
    analysis.details.isRepeatUpdate = true;

    const repeatPlayMatch = remark.match(/TV (\d+): (\d+)/);
    if (repeatPlayMatch) {
      analysis.details.tvNumber = parseInt(repeatPlayMatch[1]);
      analysis.details.totalPlays = parseInt(repeatPlayMatch[2]);
      analysis.summary = `Repeat updated - TV ${repeatPlayMatch[1]} total plays: ${repeatPlayMatch[2]}`;
    }
    return analysis;
  }

  // Check for playback errors
  if (remark.includes("Playback failed") || remark.includes("error") || remark.includes("MediaCodec")) {
    analysis.type = "error";
    analysis.details = {
      hasError: true,
      errorType: remark.includes("MediaCodec") ? "media_decoder_error" : "playback_error",
      severity: "high"
    };
    analysis.summary = "Playback error occurred";
    return analysis;
  }

  return analysis;
}

// Improved completion reason function
function getCompletionReason(actualDuration, expectedDuration) {
  if (actualDuration === 0) {
    return "not_played";
  }

  if (actualDuration >= expectedDuration * 0.9) {
    return "played_fully";
  }

  if (actualDuration >= expectedDuration * 0.5) {
    return "partially_played";
  }

  if (actualDuration >= expectedDuration * 0.1) {
    return "briefly_played";
  }

  return "stopped_immediately";
}

// Comprehensive statistics function
async function getComprehensiveStatistics(filter) {
  try {
    const logs = await AdLog.find(filter)
      .populate("adId", "duration")
      .lean();

    const enhancedLogs = enhanceLogsWithCompleteAnalytics(logs, true);

    const stats = {
      totalLogs: enhancedLogs.length,
      completedLogs: enhancedLogs.filter(log => log.enhancedCompletion.status === 'completed').length,
      uncompletedLogs: enhancedLogs.filter(log => log.enhancedCompletion.status === 'uncompleted').length,

      // Duration statistics
      totalExpectedDuration: enhancedLogs.reduce((sum, log) => sum + (log.adId?.duration || 0), 0),
      totalActualDuration: enhancedLogs.reduce((sum, log) => sum + log.playDuration.seconds, 0),

      // Completion breakdown
      completionBreakdown: {
        fully_played: enhancedLogs.filter(log => log.timing?.isFullyCompleted).length,
        interrupted: enhancedLogs.filter(log => log.timing?.wasInterrupted).length,
        not_played: enhancedLogs.filter(log => log.playDuration.seconds === 0).length
      },

      // Performance metrics
      averageCompletionRate: enhancedLogs.length > 0 ?
        enhancedLogs.reduce((sum, log) => sum + log.enhancedCompletion.percentage, 0) / enhancedLogs.length : 0,

      // Remark analysis
      remarkAnalysis: {
        daily_summaries: enhancedLogs.filter(log => log.remarkAnalysis?.type === 'play_time_summary').length,
        repeat_updates: enhancedLogs.filter(log => log.remarkAnalysis?.type === 'repeat_update').length,
        errors: enhancedLogs.filter(log => log.remarkAnalysis?.type === 'error').length
      }
    };

    // Calculate derived metrics
    stats.completionRate = stats.totalLogs > 0 ?
      parseFloat(((stats.completedLogs / stats.totalLogs) * 100).toFixed(2)) : 0;

    stats.efficiencyRate = stats.totalExpectedDuration > 0 ?
      parseFloat(((stats.totalActualDuration / stats.totalExpectedDuration) * 100).toFixed(2)) : 0;

    stats.averagePlayDuration = stats.totalLogs > 0 ?
      parseFloat((stats.totalActualDuration / stats.totalLogs).toFixed(2)) : 0;

    return stats;

  } catch (error) {
    console.error("Error calculating comprehensive statistics:", error);
    return null;
  }
}

// Get overall analytics from logs
function getOverallAnalytics(logs) {
  if (logs.length === 0) return null;

  return {
    totalPlayTime: {
      seconds: parseFloat(logs.reduce((sum, log) => sum + log.playDuration.seconds, 0).toFixed(2)),
      minutes: parseFloat((logs.reduce((sum, log) => sum + log.playDuration.seconds, 0) / 60).toFixed(2)),
      hours: parseFloat((logs.reduce((sum, log) => sum + log.playDuration.seconds, 0) / 3600).toFixed(2))
    },
    averagePlayTime: {
      seconds: parseFloat((logs.reduce((sum, log) => sum + log.playDuration.seconds, 0) / logs.length).toFixed(2))
    },
    performance: {
      successRate: parseFloat(((logs.filter(log => log.enhancedCompletion.status === 'completed').length / logs.length) * 100).toFixed(2)),
      interruptionRate: parseFloat(((logs.filter(log => log.timing?.wasInterrupted).length / logs.length) * 100).toFixed(2))
    }
  };
}

// Helper function for available filters info
function getAvailableFilters() {
  return {
    completed: "boolean (true/false)",
    adId: "ObjectId",
    tvId: "ObjectId",
    adTitle: "string (case-insensitive search)",
    remark: "string (case-insensitive search)",
    playTime: "string (exact match)",
    startDate: "ISO date (filter from date)",
    endDate: "ISO date (filter to date)",
    completionStatus: "string (all, completed, uncompleted, interrupted, not_played)",
    search: "string (searches adTitle, remark, playTime)",
    page: "number (default: 1)",
    limit: "number (default: 10, max: 100)",
    sortBy: "string (createdAt, updatedAt, startTime, endTime, repeatCount, adTitle, actualDuration, completionPercentage, playDuration)",
    sortOrder: "string (asc/desc)",
    includeStats: "boolean (true/false)",
    includeDurationAnalysis: "boolean (true/false)"
  };
}

// // Get detailed logs and analytics for a specific TV
// export const getTVLogsAnalysis = async (req, res) => {
//   console.log("hii")
//   try {
//     const { tvId } = req.params;
//     const isExistTV = await TV.findById(tvId)
//     if (!isExistTV) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid TV ID"
//       });
//     }
//     const {
//       // Time period filters
//       period = "daily", // daily, weekly, monthly, custom
//       startDate,
//       endDate,
//       specificDate, // For single day analysis

//       // Additional filters
//       adId,
//       completionStatus,

//       // Pagination
//       page = 1,
//       limit = 10,

//       // Analysis options
//       includeHourlyBreakdown = "true",
//       includeAdPerformance = "true",
//       includeComparativeAnalysis = "true"
//     } = req.query;

//     // Validate TV ID
//     if (!mongoose.Types.ObjectId.isValid(tvId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid TV ID"
//       });
//     }

//     // Build date filter based on period
//     const dateFilter = buildDateFilter(period, startDate, endDate, specificDate);

//     // Main filter for TV logs
//     const filter = {
//       tvId: new mongoose.Types.ObjectId(tvId),
//       createdAt: dateFilter
//     };

//     // Additional filters
//     if (adId && mongoose.Types.ObjectId.isValid(adId)) {
//       filter.adId = new mongoose.Types.ObjectId(adId);
//     }

//     // Execute queries in parallel
//     const [logs, tvDetails, totalCount] = await Promise.all([
//       // Get enhanced logs
//       AdLog.find(filter)
//         .populate("adId", "title advertiser duration categories adId")
//         .populate("tvId", "tvName store zone city state country location screenSize")
//         .sort({ createdAt: -1 })
//         .skip((page - 1) * limit)
//         .limit(parseInt(limit))
//         .lean()
//         .then(logs => enhanceLogsWithCompleteAnalytics(logs, true)),

//       // Get TV details
//       TV.findById(tvId).lean(),


//       // Total count
//       AdLog.countDocuments(filter)
//     ]);

//     // Apply completion status filter if needed
//     let filteredLogs = logs;
//     if (completionStatus && completionStatus !== 'all') {
//       filteredLogs = applyCompletionFilter(logs, completionStatus);
//     }

//     // Generate comprehensive TV analytics
//     const tvAnalytics = await generateTVAnalytics({
//       tvId,
//       logs: filteredLogs,
//       dateFilter,
//       includeHourlyBreakdown: includeHourlyBreakdown === "true",
//       includeAdPerformance: includeAdPerformance === "true",
//       includeComparativeAnalysis: includeComparativeAnalysis === "true"
//     });

//     const response = {
//       success: true,
//       data: {
//         tvDetails,
//         period: {
//           type: period,
//           startDate: dateFilter.$gte,
//           endDate: dateFilter.$lte
//         },
//         logs: filteredLogs,
//         analytics: tvAnalytics,
//         pagination: {
//           currentPage: parseInt(page),
//           totalPages: Math.ceil(totalCount / limit),
//           limit,
//           totalCount,
//           hasNextPage: page * limit < totalCount,
//           hasPrevPage: page > 1
//         }
//       }
//     };

//     return res.status(200).json(response);

//   } catch (error) {
//     console.error("Error in getTVLogsAnalysis:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message
//     });
//   }
// };

// // Get detailed logs and analytics for a specific Ad
// export const getAdLogsAnalysis = async (req, res) => {
//   try {
//     const { adId } = req.params;
//     const isExistAd = await Ad.findById(adId)
//     if (!isExistAd) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid Ad ID"
//       });
//     }

//     const {
//       // Time period filters
//       period = "daily",
//       startDate,
//       endDate,
//       specificDate,

//       // Additional filters
//       tvId,
//       completionStatus,

//       // Pagination
//       page = 1,
//       limit = 10,

//       // Analysis options
//       includeTVPerformance = "true",
//       includeGeographicalAnalysis = "true",
//       includeTimeAnalysis = "true"
//     } = req.query;

//     // Validate Ad ID
//     if (!mongoose.Types.ObjectId.isValid(adId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid Ad ID"
//       });
//     }

//     // Build date filter
//     const dateFilter = buildDateFilter(period, startDate, endDate, specificDate);

//     // Main filter for Ad logs
//     const filter = {
//       adId: new mongoose.Types.ObjectId(adId),
//       createdAt: dateFilter
//     };

//     if (tvId && mongoose.Types.ObjectId.isValid(tvId)) {
//       filter.tvId = new mongoose.Types.ObjectId(tvId);
//     }

//     const [logs, adDetails, totalCount] = await Promise.all([
//       AdLog.find(filter)
//         .populate("adId", "title advertiser duration categories adId budget")
//         .populate({
//           path: "adId",
//           select: "title advertiser duration categories adId budget",
//           populate: [
//             { path: "advertiser", select: "name companyName email phone website" },
//           ]
//         })
//         .populate({
//           path: "tvId",
//           select: "tvId tvName store zone city state country location",
//           populate: [
//             { path: "store", select: "name zone" },
//             { path: "zone", select: "name city" },
//             { path: "city", select: "name state" },
//             { path: "state", select: "name country" },
//             { path: "country", select: "name" },
//           ]
//         })
//         .sort({ createdAt: -1 })
//         .skip((page - 1) * limit)
//         .limit(parseInt(limit))
//         .lean()
//         .then(logs => enhanceLogsWithCompleteAnalytics(logs, true)),

//       Ad.findById(adId).lean(),
//       AdLog.countDocuments(filter)
//     ]);

//     // Apply completion filter
//     let filteredLogs = logs;
//     if (completionStatus && completionStatus !== 'all') {
//       filteredLogs = applyCompletionFilter(logs, completionStatus);
//     }

//     // Generate ad analytics
//     const adAnalytics = await generateAdAnalytics({
//       adId,
//       logs: filteredLogs,
//       dateFilter,
//       includeTVPerformance: includeTVPerformance === "true",
//       includeGeographicalAnalysis: includeGeographicalAnalysis === "true",
//       includeTimeAnalysis: includeTimeAnalysis === "true"
//     });

//     const response = {
//       success: true,
//       data: {
//         adDetails,
//         period: {
//           type: period,
//           startDate: dateFilter.$gte,
//           endDate: dateFilter.$lte
//         },
//         logs: filteredLogs,
//         analytics: adAnalytics,
//         pagination: {
//           currentPage: parseInt(page),
//           totalPages: Math.ceil(totalCount / limit),
//           totalCount,
//           limit,
//           hasNextPage: page * limit < totalCount,
//           hasPrevPage: page > 1
//         }
//       }
//     };

//     return res.status(200).json(response);

//   } catch (error) {
//     console.error("Error in getAdLogsAnalysis:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: "this is our err " + error + error.message
//     });
//   }
// };

// Get detailed logs and analytics for a specific TV
export const getTVLogsAnalysis = async (req, res) => {
  try {
    const { tvId } = req.params;
    const isExistTV = await TV.findById(tvId)
    if (!isExistTV) {
      return res.status(400).json({
        success: false,
        message: "Invalid TV ID"
      });
    }
    
    const {
      // Time period filters
      period = "daily", // daily, weekly, monthly, custom
      startDate,
      endDate,
      specificDate, // For single day analysis

      // Additional filters
      adId,
      completionStatus,

      // Pagination
      page = 1,
      limit = 10,

      // Analysis options
      includeHourlyBreakdown = "true",
      includeAdPerformance = "true",
      includeComparativeAnalysis = "true"
    } = req.query;

    // Validate TV ID
    if (!mongoose.Types.ObjectId.isValid(tvId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid TV ID"
      });
    }

    // Build date filter based on period
    const dateFilter = buildDateFilter(period, startDate, endDate, specificDate);

    // Main filter for TV logs
    const filter = {
      tvId: new mongoose.Types.ObjectId(tvId),
      createdAt: dateFilter
    };

    // Additional filters
    if (adId && mongoose.Types.ObjectId.isValid(adId)) {
      filter.adId = new mongoose.Types.ObjectId(adId);
    }

    // Pagination setup
    const pageNum = Math.max(1, parseInt(page, 10));
    let limitNum;
    if (limit === "all") {
      limitNum = null;
    } else {
      limitNum = parseInt(limit, 10) || 10;
    }
    const skip = limitNum ? (pageNum - 1) * limitNum : 0;

    // First get all logs to apply completion filter and get accurate count
    let allLogs = await AdLog.find(filter)
      .populate("adId", "title advertiser duration categories adId")
      .populate("tvId", "tvName store zone city state country location screenSize")
      .sort({ createdAt: -1 })
      .lean()
      .then(logs => enhanceLogsWithCompleteAnalytics(logs, true));

    // Apply completion status filter if needed
    let filteredLogs = allLogs;
    if (completionStatus && completionStatus !== 'all') {
      filteredLogs = applyCompletionFilter(allLogs, completionStatus);
    }

    // Get total count after filtering
    const totalCount = filteredLogs.length;

    // Apply pagination to filtered logs
    const paginatedLogs = limitNum ? 
      filteredLogs.slice(skip, skip + limitNum) : 
      filteredLogs;

    // Get TV details
    const tvDetails = await TV.findById(tvId).lean();

    // Generate comprehensive TV analytics
    const tvAnalytics = await generateTVAnalytics({
      tvId,
      logs: filteredLogs, // Use filtered logs for analytics
      dateFilter,
      includeHourlyBreakdown: includeHourlyBreakdown === "true",
      includeAdPerformance: includeAdPerformance === "true",
      includeComparativeAnalysis: includeComparativeAnalysis === "true"
    });

    const response = {
      success: true,
      data: {
        tvDetails,
        period: {
          type: period,
          startDate: dateFilter.$gte,
          endDate: dateFilter.$lte
        },
        logs: paginatedLogs,
        analytics: tvAnalytics,
        pagination: {
          currentPage: pageNum,
          totalPages: limitNum ? Math.ceil(totalCount / limitNum) : 1,
          totalCount,
          limit: limitNum,
          hasNextPage: limitNum ? (pageNum * limitNum) < totalCount : false,
          hasPrevPage: pageNum > 1
        }
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error in getTVLogsAnalysis:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get detailed logs and analytics for a specific Ad
export const getAdLogsAnalysis = async (req, res) => {
  try {
    const { adId } = req.params;
    const isExistAd = await Ad.findById(adId)
    if (!isExistAd) {
      return res.status(400).json({
        success: false,
        message: "Invalid Ad ID"
      });
    }

    const {
      // Time period filters
      period = "daily",
      startDate,
      endDate,
      specificDate,

      // Additional filters
      tvId,
      completionStatus,

      // Pagination
      page = 1,
      limit = 10,

      // Analysis options
      includeTVPerformance = "true",
      includeGeographicalAnalysis = "true",
      includeTimeAnalysis = "true"
    } = req.query;

    // Validate Ad ID
    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Ad ID"
      });
    }

    // Build date filter
    const dateFilter = buildDateFilter(period, startDate, endDate, specificDate);

    // Main filter for Ad logs
    const filter = {
      adId: new mongoose.Types.ObjectId(adId),
      createdAt: dateFilter
    };

    if (tvId && mongoose.Types.ObjectId.isValid(tvId)) {
      filter.tvId = new mongoose.Types.ObjectId(tvId);
    }

    // Pagination setup
    const pageNum = Math.max(1, parseInt(page, 10));
    let limitNum;
    if (limit === "all") {
      limitNum = null;
    } else {
      limitNum = parseInt(limit, 10) || 10;
    }
    const skip = limitNum ? (pageNum - 1) * limitNum : 0;

    // First get all logs to apply completion filter
    let allLogs = await AdLog.find(filter)
      .populate("adId", "title advertiser duration categories adId budget")
      .populate({
        path: "adId",
        select: "title advertiser duration categories adId budget",
        populate: [
          { path: "advertiser", select: "name companyName email phone website" },
        ]
      })
      .populate({
        path: "tvId",
        select: "tvId tvName store zone city state country location",
        populate: [
          { path: "store", select: "name zone" },
          { path: "zone", select: "name city" },
          { path: "city", select: "name state" },
          { path: "state", select: "name country" },
          { path: "country", select: "name" },
        ]
      })
      .sort({ createdAt: -1 })
      .lean()
      .then(logs => enhanceLogsWithCompleteAnalytics(logs, true));

    // Apply completion filter
    let filteredLogs = allLogs;
    if (completionStatus && completionStatus !== 'all') {
      filteredLogs = applyCompletionFilter(allLogs, completionStatus);
    }

    // Get total count after filtering
    const totalCount = filteredLogs.length;

    // Apply pagination to filtered logs
    const paginatedLogs = limitNum ? 
      filteredLogs.slice(skip, skip + limitNum) : 
      filteredLogs;

    // Get ad details
    const adDetails = await Ad.findById(adId).lean();

    // Generate ad analytics
    const adAnalytics = await generateAdAnalytics({
      adId,
      logs: filteredLogs, // Use filtered logs for analytics
      dateFilter,
      includeTVPerformance: includeTVPerformance === "true",
      includeGeographicalAnalysis: includeGeographicalAnalysis === "true",
      includeTimeAnalysis: includeTimeAnalysis === "true"
    });

    const response = {
      success: true,
      data: {
        adDetails,
        period: {
          type: period,
          startDate: dateFilter.$gte,
          endDate: dateFilter.$lte
        },
        logs: paginatedLogs,
        analytics: adAnalytics,
        pagination: {
          currentPage: pageNum,
          totalPages: limitNum ? Math.ceil(totalCount / limitNum) : 1,
          totalCount,
          limit: limitNum,
          hasNextPage: limitNum ? (pageNum * limitNum) < totalCount : false,
          hasPrevPage: pageNum > 1
        }
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error in getAdLogsAnalysis:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: "this is our err " + error + error.message
    });
  }
};

// Updated generateAdAnalytics function with all required functions
async function generateAdAnalytics({ adId, logs, dateFilter, includeTVPerformance, includeGeographicalAnalysis, includeTimeAnalysis }) {

  const analytics = {
    summary: {
      totalPlays: logs.length,
      uniqueTVs: calculateReach(logs), // Now this function exists
      totalReach: calculateReach(logs),
      totalPlayDuration: {
        seconds: logs.reduce((sum, log) => sum + log.playDuration.seconds, 0),
        hours: parseFloat((logs.reduce((sum, log) => sum + log.playDuration.seconds, 0) / 3600).toFixed(2))
      },
      completionRate: logs.length > 0 ?
        parseFloat(((logs.filter(log => log.enhancedCompletion.status === 'completed').length / logs.length) * 100).toFixed(2)) : 0
    },
    performanceMetrics: {
      engagementRate: calculateEngagementRate(logs), // Now this function exists
      avgCompletionPercentage: logs.length > 0 ?
        parseFloat((logs.reduce((sum, log) => sum + log.enhancedCompletion.percentage, 0) / logs.length).toFixed(2)) : 0,
      costPerView: calculateCostPerView(logs) // Now this function exists
    }
  };

  // TV performance analysis
  if (includeTVPerformance) {
    analytics.tvPerformance = getTVPerformanceAnalysis(logs);
  }

  // Geographical analysis
  if (includeGeographicalAnalysis) {
    analytics.geographicalAnalysis = getGeographicalAnalysis(logs);
  }

  // Time analysis
  if (includeTimeAnalysis) {
    analytics.timeAnalysis = getTimeAnalysis(logs);
  }

  // Performance trends
  analytics.performanceTrends = getPerformanceTrends(logs, dateFilter);

  return analytics;
}

// Build date filter based on period
function buildDateFilter(period, startDate, endDate, specificDate) {
  const filter = {};

  const now = new Date();

  switch (period) {
    case "today":
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      filter.$gte = todayStart;
      filter.$lte = now;
      break;

    case "yesterday":
      const yesterdayStart = new Date(now);
      yesterdayStart.setDate(now.getDate() - 1);
      yesterdayStart.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterdayStart);
      yesterdayEnd.setHours(23, 59, 59, 999);
      filter.$gte = yesterdayStart;
      filter.$lte = yesterdayEnd;
      break;

    case "weekly":
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      filter.$gte = weekStart;
      filter.$lte = now;
      break;

    case "monthly":
      const monthStart = new Date(now);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      filter.$gte = monthStart;
      filter.$lte = now;
      break;

    case "custom":
      if (startDate) filter.$gte = new Date(startDate);
      if (endDate) filter.$lte = new Date(endDate);
      break;

    case "specific":
      if (specificDate) {
        const specific = new Date(specificDate);
        const specificStart = new Date(specific);
        specificStart.setHours(0, 0, 0, 0);
        const specificEnd = new Date(specific);
        specificEnd.setHours(23, 59, 59, 999);
        filter.$gte = specificStart;
        filter.$lte = specificEnd;
      }
      break;

    default: // daily - last 24 hours
      const dailyStart = new Date(now);
      dailyStart.setDate(now.getDate() - 1);
      filter.$gte = dailyStart;
      filter.$lte = now;
  }

  return filter;
}

// Generate comprehensive TV analytics
async function generateTVAnalytics({ tvId, logs, dateFilter, includeHourlyBreakdown, includeAdPerformance, includeComparativeAnalysis }) {

  const analytics = {
    summary: {
      totalPlays: logs.length,
      totalPlayDuration: {
        seconds: logs.reduce((sum, log) => sum + log.playDuration.seconds, 0),
        hours: parseFloat((logs.reduce((sum, log) => sum + log.playDuration.seconds, 0) / 3600).toFixed(2))
      },
      completedPlays: logs.filter(log => log.enhancedCompletion.status === 'completed').length,
      completionRate: logs.length > 0 ?
        parseFloat(((logs.filter(log => log.enhancedCompletion.status === 'completed').length / logs.length) * 100).toFixed(2)) : 0,
      averagePlayDuration: logs.length > 0 ?
        parseFloat((logs.reduce((sum, log) => sum + log.playDuration.seconds, 0) / logs.length).toFixed(2)) : 0
    },
    performanceMetrics: {
      successRate: logs.length > 0 ?
        parseFloat(((logs.filter(log => log.enhancedCompletion.status === 'completed').length / logs.length) * 100).toFixed(2)) : 0,
      interruptionRate: logs.length > 0 ?
        parseFloat(((logs.filter(log => log.timing?.wasInterrupted).length / logs.length) * 100).toFixed(2)) : 0,
      efficiency: logs.length > 0 ?
        parseFloat((logs.reduce((sum, log) => sum + log.timing?.efficiency, 0) / logs.length).toFixed(3)) : 0
    }
  };

  // Hourly breakdown
  if (includeHourlyBreakdown) {
    analytics.hourlyBreakdown = getHourlyBreakdown(logs);
  }

  // Ad performance analysis
  if (includeAdPerformance) {
    analytics.adPerformance = getAdPerformanceAnalysis(logs);
  }

  // Comparative analysis (vs other TVs)
  if (includeComparativeAnalysis) {
    analytics.comparativeAnalysis = await getComparativeTVAnalysis(tvId, dateFilter);
  }

  // Daily trends
  analytics.dailyTrends = getDailyTrends(logs, dateFilter);

  return analytics;
}


// Get geographical analysis
function getGeographicalAnalysis(logs) {
  const locationMap = {};

  logs.forEach(log => {
    const locationKey = `${log.tvId?.city || 'Unknown'}-${log.tvId?.state || 'Unknown'}`;
    if (!locationMap[locationKey]) {
      locationMap[locationKey] = {
        city: log.tvId?.city,
        state: log.tvId?.state,
        country: log.tvId?.country,
        plays: 0,
        uniqueTVs: new Set(),
        totalDuration: 0
      };
    }

    locationMap[locationKey].plays++;
    locationMap[locationKey].uniqueTVs.add(log.tvId?._id.toString());
    locationMap[locationKey].totalDuration += log.playDuration.seconds;
  });

  // Convert Set to count
  Object.values(locationMap).forEach(location => {
    location.uniqueTVCount = location.uniqueTVs.size;
    delete location.uniqueTVs;
    location.averageDuration = location.plays > 0 ? location.totalDuration / location.plays : 0;
  });

  return Object.values(locationMap).sort((a, b) => b.plays - a.plays);
}

// Apply completion filter
function applyCompletionFilter(logs, completionStatus) {
  return logs.filter(log => {
    switch (completionStatus) {
      case 'completed':
        return log.enhancedCompletion.status === 'completed';
      case 'uncompleted':
        return log.enhancedCompletion.status === 'uncompleted';
      case 'interrupted':
        return log.timing?.wasInterrupted;
      case 'not_played':
        return log.playDuration.seconds === 0;
      default:
        return true;
    }
  });
}

// Get hourly breakdown of plays
function getHourlyBreakdown(logs) {
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    hourLabel: `${i}:00 - ${i + 1}:00`,
    plays: 0,
    totalDuration: 0,
    completedPlays: 0
  }));

  logs.forEach(log => {
    const hour = new Date(log.startTime).getHours();
    hourlyData[hour].plays++;
    hourlyData[hour].totalDuration += log.playDuration.seconds;
    if (log.enhancedCompletion.status === 'completed') {
      hourlyData[hour].completedPlays++;
    }
  });

  // Calculate averages
  hourlyData.forEach(hour => {
    hour.averageDuration = hour.plays > 0 ? hour.totalDuration / hour.plays : 0;
    hour.completionRate = hour.plays > 0 ? (hour.completedPlays / hour.plays) * 100 : 0;
  });

  return hourlyData;
}

// Get ad performance analysis
function getAdPerformanceAnalysis(logs) {
  const adMap = {};

  logs.forEach(log => {
    const adId = log.adId?._id.toString();
    if (!adMap[adId]) {
      adMap[adId] = {
        adId: log.adId?._id,
        adTitle: log.adId?.title,
        plays: 0,
        totalDuration: 0,
        completedPlays: 0,
        averageCompletion: 0
      };
    }

    adMap[adId].plays++;
    adMap[adId].totalDuration += log.playDuration.seconds;
    if (log.enhancedCompletion.status === 'completed') {
      adMap[adId].completedPlays++;
    }
  });

  // Calculate metrics
  Object.values(adMap).forEach(ad => {
    ad.averageDuration = ad.plays > 0 ? ad.totalDuration / ad.plays : 0;
    ad.completionRate = ad.plays > 0 ? (ad.completedPlays / ad.plays) * 100 : 0;
    ad.efficiency = ad.plays > 0 ? (ad.totalDuration / (ad.plays * (logs[0]?.adId?.duration || 0))) * 100 : 0;
  });

  return Object.values(adMap).sort((a, b) => b.plays - a.plays);
}

// Calculate reach (unique TVs)
function calculateReach(logs) {
  const uniqueTVs = new Set();
  logs.forEach(log => {
    if (log.tvId && log.tvId._id) {
      uniqueTVs.add(log.tvId._id.toString());
    }
  });
  return uniqueTVs.size;
}

// Calculate engagement rate
function calculateEngagementRate(logs) {
  if (logs.length === 0) return 0;

  const engagedPlays = logs.filter(log =>
    log.enhancedCompletion.percentage >= 50
  ).length;

  return parseFloat(((engagedPlays / logs.length) * 100).toFixed(2));
}

// Calculate cost per view (assuming ad has budget field)
function calculateCostPerView(logs) {
  if (logs.length === 0) return 0;

  // Get ad budget from first log (assuming all logs are for same ad)
  const adBudget = logs[0]?.adId?.budget || 0;
  return parseFloat((adBudget / logs.length).toFixed(2));
}

// Get daily trends
function getDailyTrends(logs, dateFilter) {
  const dailyData = {};
  const currentDate = new Date(dateFilter.$gte);
  const endDate = new Date(dateFilter.$lte || new Date());

  // Initialize all dates in range
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyData[dateKey] = {
      date: dateKey,
      plays: 0,
      totalDuration: 0,
      completedPlays: 0,
      uniqueAds: new Set(),
      uniqueTVs: new Set()
    };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Populate with actual data
  logs.forEach(log => {
    const logDate = new Date(log.createdAt).toISOString().split('T')[0];
    if (dailyData[logDate]) {
      dailyData[logDate].plays++;
      dailyData[logDate].totalDuration += log.playDuration.seconds;

      if (log.enhancedCompletion.status === 'completed') {
        dailyData[logDate].completedPlays++;
      }

      if (log.adId && log.adId._id) {
        dailyData[logDate].uniqueAds.add(log.adId._id.toString());
      }

      if (log.tvId && log.tvId._id) {
        dailyData[logDate].uniqueTVs.add(log.tvId._id.toString());
      }
    }
  });

  // Calculate derived metrics
  Object.values(dailyData).forEach(day => {
    day.averageDuration = day.plays > 0 ? day.totalDuration / day.plays : 0;
    day.completionRate = day.plays > 0 ? (day.completedPlays / day.plays) * 100 : 0;
    day.uniqueAdCount = day.uniqueAds.size;
    day.uniqueTVCount = day.uniqueTVs.size;
    delete day.uniqueAds;
    delete day.uniqueTVs;
  });

  return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
}

// Get TV performance analysis
function getTVPerformanceAnalysis(logs) {
  const tvMap = {};

  logs.forEach(log => {
    const tvId = log.tvId?._id.toString();
    if (!tvMap[tvId]) {
      tvMap[tvId] = {
        tvId: log.tvId?._id,
        tvName: log.tvId?.tvName,
        location: `${log.tvId?.city || ''}, ${log.tvId?.state || ''}`,
        plays: 0,
        totalDuration: 0,
        completedPlays: 0,
        averageCompletion: 0
      };
    }

    tvMap[tvId].plays++;
    tvMap[tvId].totalDuration += log.playDuration.seconds;
    if (log.enhancedCompletion.status === 'completed') {
      tvMap[tvId].completedPlays++;
    }
    tvMap[tvId].averageCompletion += log.enhancedCompletion.percentage;
  });

  // Calculate averages
  Object.values(tvMap).forEach(tv => {
    tv.averageDuration = tv.plays > 0 ? tv.totalDuration / tv.plays : 0;
    tv.completionRate = tv.plays > 0 ? (tv.completedPlays / tv.plays) * 100 : 0;
    tv.averageCompletion = tv.plays > 0 ? tv.averageCompletion / tv.plays : 0;
  });

  return Object.values(tvMap).sort((a, b) => b.plays - a.plays);
}

// Get time analysis
function getTimeAnalysis(logs) {
  const timeSlots = {
    morning: { start: 6, end: 12, label: "Morning (6AM-12PM)", plays: 0, duration: 0 },
    afternoon: { start: 12, end: 18, label: "Afternoon (12PM-6PM)", plays: 0, duration: 0 },
    evening: { start: 18, end: 22, label: "Evening (6PM-10PM)", plays: 0, duration: 0 },
    night: { start: 22, end: 6, label: "Night (10PM-6AM)", plays: 0, duration: 0 }
  };

  logs.forEach(log => {
    const hour = new Date(log.startTime).getHours();

    for (const [slot, data] of Object.entries(timeSlots)) {
      if (slot === 'night') {
        if (hour >= data.start || hour < data.end) {
          data.plays++;
          data.duration += log.playDuration.seconds;
        }
      } else {
        if (hour >= data.start && hour < data.end) {
          data.plays++;
          data.duration += log.playDuration.seconds;
        }
      }
    }
  });

  // Calculate averages
  Object.values(timeSlots).forEach(slot => {
    slot.averageDuration = slot.plays > 0 ? slot.duration / slot.plays : 0;
    slot.percentage = logs.length > 0 ? (slot.plays / logs.length) * 100 : 0;
  });

  return timeSlots;
}

// Get performance trends
function getPerformanceTrends(logs, dateFilter) {
  const weeklyData = {};
  const currentDate = new Date(dateFilter.$gte);
  const endDate = new Date(dateFilter.$lte || new Date());

  // Group by week
  logs.forEach(log => {
    const logDate = new Date(log.createdAt);
    const weekStart = getWeekStartDate(logDate);
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        weekStart: weekKey,
        plays: 0,
        totalDuration: 0,
        completedPlays: 0,
        engagement: 0
      };
    }

    weeklyData[weekKey].plays++;
    weeklyData[weekKey].totalDuration += log.playDuration.seconds;
    if (log.enhancedCompletion.status === 'completed') {
      weeklyData[weekKey].completedPlays++;
    }
    weeklyData[weekKey].engagement += log.enhancedCompletion.percentage >= 50 ? 1 : 0;
  });

  // Calculate metrics
  Object.values(weeklyData).forEach(week => {
    week.averageDuration = week.plays > 0 ? week.totalDuration / week.plays : 0;
    week.completionRate = week.plays > 0 ? (week.completedPlays / week.plays) * 100 : 0;
    week.engagementRate = week.plays > 0 ? (week.engagement / week.plays) * 100 : 0;
  });

  return Object.values(weeklyData).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

// Helper to get week start date (Monday)
function getWeekStartDate(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(d.setDate(diff));
}

// Comparative TV analysis
async function getComparativeTVAnalysis(tvId, dateFilter) {
  try {
    // Get all TV logs for comparison
    const allTVLogs = await AdLog.find({ createdAt: dateFilter })
      .populate("adId", "duration")
      .populate("tvId", "tvName city state")
      .lean()
      .then(logs => enhanceLogsWithCompleteAnalytics(logs, true));

    // Group by TV
    const tvPerformance = {};
    allTVLogs.forEach(log => {
      const currentTVId = log.tvId?._id.toString();
      if (!tvPerformance[currentTVId]) {
        tvPerformance[currentTVId] = {
          tvId: log.tvId?._id,
          tvName: log.tvId?.tvName,
          location: `${log.tvId?.city || ''}, ${log.tvId?.state || ''}`,
          plays: 0,
          totalDuration: 0,
          completedPlays: 0
        };
      }

      tvPerformance[currentTVId].plays++;
      tvPerformance[currentTVId].totalDuration += log.playDuration.seconds;
      if (log.enhancedCompletion.status === 'completed') {
        tvPerformance[currentTVId].completedPlays++;
      }
    });

    // Calculate metrics
    Object.values(tvPerformance).forEach(tv => {
      tv.averageDuration = tv.plays > 0 ? tv.totalDuration / tv.plays : 0;
      tv.completionRate = tv.plays > 0 ? (tv.completedPlays / tv.plays) * 100 : 0;
    });

    const currentTVPerformance = tvPerformance[tvId];
    const allTVs = Object.values(tvPerformance).sort((a, b) => b.plays - a.plays);

    // Find current TV rank
    const currentTVRank = allTVs.findIndex(tv => tv.tvId.toString() === tvId) + 1;

    return {
      currentTV: currentTVPerformance,
      rank: currentTVRank,
      totalTVs: allTVs.length,
      topPerformers: allTVs.slice(0, 5), // Top 5 TVs
      averageMetrics: {
        avgPlays: allTVs.reduce((sum, tv) => sum + tv.plays, 0) / allTVs.length,
        avgCompletionRate: allTVs.reduce((sum, tv) => sum + tv.completionRate, 0) / allTVs.length,
        avgDuration: allTVs.reduce((sum, tv) => sum + tv.averageDuration, 0) / allTVs.length
      }
    };

  } catch (error) {
    console.error("Error in comparative analysis:", error);
    return null;
  }
}
