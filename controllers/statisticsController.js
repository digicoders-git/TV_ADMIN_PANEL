// controllers/dashboardController.js
import mongoose from "mongoose";
import { Ad } from "../models/Ad.js";
import { AdSchedule } from "../models/AdSchedule.js";
import { Advertiser } from "../models/Advertiser.js";
import { City } from "../models/City.js";
import { Country } from "../models/Country.js";
import Employee from "../models/Employee.js";
import { State } from "../models/State.js";
import { Store } from "../models/Store.js";
import { TV } from "../models/TV.js";
import { Zone } from "../models/Zone.js";

export const getDashboardStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Execute all queries in parallel for better performance
    const [
      // Basic counts
      countryCount,
      stateCount,
      cityCount,
      zoneCount,
      storeCount,
      tvCount,
      adCount,
      employeeCount,
      advertiserCount,
      
      // TV status counts
      tvStatusCounts,
      
      // Ad status counts
      adStatusCounts,
      
      // Today's scheduled ads count
      todaysScheduledAdsCount,
      
      // Geographical hierarchy with counts
      countriesWithStats,
      statesWithStats,
      citiesWithStats,
      zonesWithStats,
      storesWithStats,
      
      // TV distribution
      tvsByCountry,
      tvsByState,
      tvsByCity,
      tvsByZone,
      tvsByStore,
      
      // FIXED: Accurate ads per TV calculation
      accurateAdsPerTV,
      
      // Advertiser stats
      advertisersWithAdCounts
    ] = await Promise.all([
      // Basic counts
      Country.countDocuments({ isActive: true }),
      State.countDocuments({ isActive: true }),
      City.countDocuments({ isActive: true }),
      Zone.countDocuments({ isActive: true }),
      Store.countDocuments({ isActive: true }),
      TV.countDocuments({ isActive: true }),
      Ad.countDocuments({ isActive: true }),
      Employee.countDocuments({ isBlocked: false }),
      Advertiser.countDocuments({ isActive: true }),
      
      // TV status counts
      TV.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Ad status counts
      Ad.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Today's scheduled ads
      AdSchedule.countDocuments({
        isActive: true,
        validFrom: { $lte: todayEnd },
        validTo: { $gte: todayStart }
      }),
      
      // Countries with state, city, zone, store, TV counts
      Country.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: "states",
            localField: "_id",
            foreignField: "country",
            as: "states"
          }
        },
        {
          $lookup: {
            from: "cities",
            localField: "_id",
            foreignField: "country",
            as: "cities"
          }
        },
        {
          $lookup: {
            from: "zones",
            localField: "_id",
            foreignField: "country",
            as: "zones"
          }
        },
        {
          $lookup: {
            from: "stores",
            localField: "_id",
            foreignField: "country",
            as: "stores"
          }
        },
        {
          $lookup: {
            from: "tvs",
            localField: "_id",
            foreignField: "country",
            as: "tvs"
          }
        },
        {
          $project: {
            name: 1,
            countryId: 1,
            stateCount: { $size: "$states" },
            cityCount: { $size: "$cities" },
            zoneCount: { $size: "$zones" },
            storeCount: { $size: "$stores" },
            tvCount: { $size: "$tvs" }
          }
        },
        { $sort: { tvCount: -1 } }
      ]),
      
      // States with counts
      State.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: "cities",
            localField: "_id",
            foreignField: "state",
            as: "cities"
          }
        },
        {
          $lookup: {
            from: "zones",
            localField: "_id",
            foreignField: "state",
            as: "zones"
          }
        },
        {
          $lookup: {
            from: "stores",
            localField: "_id",
            foreignField: "state",
            as: "stores"
          }
        },
        {
          $lookup: {
            from: "tvs",
            localField: "_id",
            foreignField: "state",
            as: "tvs"
          }
        },
        {
          $project: {
            name: 1,
            stateId: 1,
            country: 1,
            cityCount: { $size: "$cities" },
            zoneCount: { $size: "$zones" },
            storeCount: { $size: "$stores" },
            tvCount: { $size: "$tvs" }
          }
        },
        { $sort: { tvCount: -1 } }
      ]),
      
      // Cities with counts
      City.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: "zones",
            localField: "_id",
            foreignField: "city",
            as: "zones"
          }
        },
        {
          $lookup: {
            from: "stores",
            localField: "_id",
            foreignField: "city",
            as: "stores"
          }
        },
        {
          $lookup: {
            from: "tvs",
            localField: "_id",
            foreignField: "city",
            as: "tvs"
          }
        },
        {
          $project: {
            name: 1,
            cityId: 1,
            state: 1,
            country: 1,
            zoneCount: { $size: "$zones" },
            storeCount: { $size: "$stores" },
            tvCount: { $size: "$tvs" }
          }
        },
        { $sort: { tvCount: -1 } }
      ]),
      
      // Zones with counts
      Zone.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: "stores",
            localField: "_id",
            foreignField: "zone",
            as: "stores"
          }
        },
        {
          $lookup: {
            from: "tvs",
            localField: "_id",
            foreignField: "zone",
            as: "tvs"
          }
        },
        {
          $project: {
            name: 1,
            zoneId: 1,
            city: 1,
            state: 1,
            country: 1,
            storeCount: { $size: "$stores" },
            tvCount: { $size: "$tvs" }
          }
        },
        { $sort: { tvCount: -1 } }
      ]),
      
      // Stores with counts
      Store.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: "tvs",
            localField: "_id",
            foreignField: "store",
            as: "tvs"
          }
        },
        {
          $project: {
            name: 1,
            zone: 1,
            city: 1,
            state: 1,
            country: 1,
            tvCount: { $size: "$tvs" }
          }
        },
        { $sort: { tvCount: -1 } }
      ]),
      
      // TV distribution by country
      TV.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: "$country",
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: "countries",
            localField: "_id",
            foreignField: "_id",
            as: "countryInfo"
          }
        },
        {
          $project: {
            countryName: { $arrayElemAt: ["$countryInfo.name", 0] },
            countryId: { $arrayElemAt: ["$countryInfo.countryId", 0] },
            count: 1
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // TV distribution by state
      TV.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: "$state",
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: "states",
            localField: "_id",
            foreignField: "_id",
            as: "stateInfo"
          }
        },
        {
          $project: {
            stateName: { $arrayElemAt: ["$stateInfo.name", 0] },
            stateId: { $arrayElemAt: ["$stateInfo.stateId", 0] },
            count: 1
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // TV distribution by city
      TV.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: "$city",
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: "cities",
            localField: "_id",
            foreignField: "_id",
            as: "cityInfo"
          }
        },
        {
          $project: {
            cityName: { $arrayElemAt: ["$cityInfo.name", 0] },
            cityId: { $arrayElemAt: ["$cityInfo.cityId", 0] },
            count: 1
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // TV distribution by zone
      TV.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: "$zone",
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: "zones",
            localField: "_id",
            foreignField: "_id",
            as: "zoneInfo"
          }
        },
        {
          $project: {
            zoneName: { $arrayElemAt: ["$zoneInfo.name", 0] },
            zoneId: { $arrayElemAt: ["$zoneInfo.zoneId", 0] },
            count: 1
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // TV distribution by store
      TV.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: "$store",
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: "stores",
            localField: "_id",
            foreignField: "_id",
            as: "storeInfo"
          }
        },
        {
          $project: {
            storeName: { $arrayElemAt: ["$storeInfo.name", 0] },
            count: 1
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // ✅ FIXED: Accurate ads per TV calculation
      AdSchedule.aggregate([
        { 
          $match: { 
            isActive: true,
            validFrom: { $lte: todayEnd },
            validTo: { $gte: todayStart }
          } 
        },
        { $unwind: "$tvs" },
        {
          $group: {
            _id: "$tvs.tv",
            totalSchedules: { $sum: 1 },
            uniqueAds: { $addToSet: "$ad" }
          }
        },
        {
          $project: {
            totalSchedules: 1,
            uniqueAdCount: { $size: "$uniqueAds" }
          }
        },
        {
          $lookup: {
            from: "tvs",
            localField: "_id",
            foreignField: "_id",
            as: "tvInfo"
          }
        },
        {
          $project: {
            tvName: { $arrayElemAt: ["$tvInfo.tvName", 0] },
            tvId: { $arrayElemAt: ["$tvInfo.tvId", 0] },
            totalSchedules: 1,
            uniqueAdsCount: 1
          }
        },
        { $sort: { totalSchedules: -1 } }
      ]),
      
      // Advertisers with ad counts
      Advertiser.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: "ads",
            localField: "_id",
            foreignField: "advertiser",
            as: "ads"
          }
        },
        {
          $project: {
            name: 1,
            companyName: 1,
            email: 1,
            adCount: { $size: "$ads" }
          }
        },
        { $sort: { adCount: -1 } }
      ])
    ]);

    // Format TV status counts
    const tvStatusFormatted = {
      online: tvStatusCounts.find(item => item._id === 'online')?.count || 0,
      offline: tvStatusCounts.find(item => item._id === 'offline')?.count || 0,
      maintenance: tvStatusCounts.find(item => item._id === 'maintenance')?.count || 0
    };

    // Format Ad status counts
    const adStatusFormatted = {
      draft: adStatusCounts.find(item => item._id === 'draft')?.count || 0,
      pending: adStatusCounts.find(item => item._id === 'pending')?.count || 0,
      approved: adStatusCounts.find(item => item._id === 'approved')?.count || 0,
      rejected: adStatusCounts.find(item => item._id === 'rejected')?.count || 0,
      active: adStatusCounts.find(item => item._id === 'active')?.count || 0,
      completed: adStatusCounts.find(item => item._id === 'completed')?.count || 0,
      paused: adStatusCounts.find(item => item._id === 'paused')?.count || 0
    };

    // Prepare final response
    const dashboardStats = {
      summary: {
        totalCountries: countryCount,
        totalStates: stateCount,
        totalCities: cityCount,
        totalZones: zoneCount,
        totalStores: storeCount,
        totalTVs: tvCount,
        totalAds: adCount,
        totalEmployees: employeeCount,
        totalAdvertisers: advertiserCount,
        todaysScheduledAds: todaysScheduledAdsCount
      },
      tvStatus: tvStatusFormatted,
      adStatus: adStatusFormatted,
      geographicalHierarchy: {
        countries: countriesWithStats,
        states: statesWithStats,
        cities: citiesWithStats,
        zones: zonesWithStats,
        stores: storesWithStats
      },
      tvDistribution: {
        byCountry: tvsByCountry,
        byState: tvsByState,
        byCity: tvsByCity,
        byZone: tvsByZone,
        byStore: tvsByStore
      },
      adsPerTV: accurateAdsPerTV, // ✅ Now using accurate calculation
      advertisers: advertisersWithAdCounts,
      lastUpdated: new Date()
    };

    res.status(200).json({
      success: true,
      message: "Dashboard statistics retrieved successfully",
      data: dashboardStats
    });

  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving dashboard statistics",
      error: error.message
    });
  }
};