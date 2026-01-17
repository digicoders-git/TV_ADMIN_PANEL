import mongoose from "mongoose";
import { Advertiser } from "../models/Advertiser.js";
import { City } from "../models/City.js";
import { State } from "../models/State.js";
import { Country } from "../models/Country.js";

// Helper function to validate location hierarchy
const validateLocationHierarchy = async (cityId, stateId, countryId) => {
  const errors = [];
  
  // Agar koi bhi location field nahi di gayi hai, toh validation skip
  if (!cityId && !stateId && !countryId) {
    return errors;
  }
  
  // Agar city di gayi hai, tabhi state aur country validate karein
  if (cityId) {
    const city = await City.findById(cityId);
    if (!city) {
      errors.push("Referenced city does not exist");
    } else {
      if (stateId && city.state.toString() !== stateId.toString()) {
        errors.push("State does not match the city's state");
      }
      if (countryId && city.country.toString() !== countryId.toString()) {
        errors.push("Country does not match the city's country");
      }
    }
  } else {
    // Agar city nahi di gayi lekin state ya country di gayi hai
    if (stateId) {
      errors.push("State provided but city is missing");
    }
    if (countryId) {
      errors.push("Country provided but city is missing");
    }
  }
  
  return errors;
};

// Create a new advertiser
export const createAdvertiser = async (req, res) => {
  try {
    const {
      name,
      companyName,
      email,
      phone,
      city,
      state,
      country,
      street,
      postalCode,
      website,
      isActive
    } = req.body;

    // Required field validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required fields"
      });
    }

    // Check for duplicate email
    const existingAdvertiser = await Advertiser.findOne({ email });
    if (existingAdvertiser) {
      return res.status(400).json({
        success: false,
        message: "Advertiser with this email already exists"
      });
    }

    // Validate location hierarchy if provided
    if (city || state || country) {
      const hierarchyErrors = await validateLocationHierarchy(city, state, country);
      if (hierarchyErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: hierarchyErrors.join(", ")
        });
      }
    }

    // Create advertiser
    const advertiser = await Advertiser.create({
      name,
      companyName,
      email,
      phone,
      city: city || null,
      state: state || null,
      country: country || null,
      street,
      postalCode,
      website,
      isActive: isActive !== undefined ? isActive : true
    });

    const populatedAdvertiser = await Advertiser.findById(advertiser._id)
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name');

    res.status(201).json({
      success: true,
      message: "Advertiser created successfully",
      data: populatedAdvertiser
    });
  } catch (error) {
    console.error("Error creating advertiser:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get all advertisers with filtering options
export const getAdvertisers = async (req, res) => {
  try {
    const { 
      city, 
      state, 
      country, 
      isActive, 
      search,
      page = 1,
      limit = 10
    } = req.query;
    
    let query = {};
    
    // Filter by location
    if (city) query.city = city;
    if (state) query.state = state;
    if (country) query.country = country;
    
    // Filter by active status
    if (isActive === "true") query.isActive = true;
    if (isActive === "false") query.isActive = false;
    
    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const advertisers = await Advertiser.find(query)
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Advertiser.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: "Advertisers fetched successfully",
      data: {
        advertisers,
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total
        }
      }
    });
  } catch (error) {
    console.error("Error fetching advertisers:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get advertiser by ID
export const getAdvertiserById = async (req, res) => {
  try {
    const advertiser = await Advertiser.findById(req.params.id)
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name');
    
    if (!advertiser) {
      return res.status(404).json({
        success: false,
        message: "Advertiser not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Advertiser fetched successfully",
      data: advertiser
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid advertiser ID"
      });
    }
    console.error("Error fetching advertiser by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Update advertiser
export const updateAdvertiser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const advertiser = await Advertiser.findById(id);
    if (!advertiser) {
      return res.status(404).json({
        success: false,
        message: "Advertiser not found"
      });
    }
    
    // Check for duplicate email if updating
    if (updateData.email && updateData.email !== advertiser.email) {
      const existingAdvertiser = await Advertiser.findOne({ 
        email: updateData.email,
        _id: { $ne: id }
      });
      if (existingAdvertiser) {
        return res.status(400).json({
          success: false,
          message: "Advertiser with this email already exists"
        });
      }
    }
    
    // Validate location hierarchy if updating location fields
    const locationFields = ['city', 'state', 'country'];
    const isUpdatingLocation = locationFields.some(field => field in updateData);
    
    if (isUpdatingLocation) {
      const hierarchyErrors = await validateLocationHierarchy(
        updateData.city || advertiser.city,
        updateData.state || advertiser.state,
        updateData.country || advertiser.country
      );
      
      if (hierarchyErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: hierarchyErrors.join(", ")
        });
      }
    }
    
    // Update fields
    const allowedFields = [
      'name', 'companyName', 'email', 'phone', 'city', 'state', 'country',
      'street', 'postalCode', 'website', 'isActive'
    ];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        advertiser[field] = updateData[field];
      }
    });

    advertiser.updatedAt = Date.now();
    
    const updatedAdvertiser = await advertiser.save();
    const populatedAdvertiser = await Advertiser.findById(updatedAdvertiser._id)
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name');

    res.status(200).json({
      success: true,
      message: "Advertiser updated successfully",
      data: populatedAdvertiser
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid advertiser ID"
      });
    }
    console.error("Error updating advertiser:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Delete advertiser
export const deleteAdvertiser = async (req, res) => {
  try {
    const advertiser = await Advertiser.findById(req.params.id);
    
    if (!advertiser) {
      return res.status(404).json({
        success: false,
        message: "Advertiser not found"
      });
    }
    
    await advertiser.deleteOne();
    
    res.status(200).json({
      success: true,
      message: "Advertiser deleted successfully"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid advertiser ID"
      });
    }
    console.error("Error deleting advertiser:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Toggle advertiser active status
export const toggleAdvertiserStatus = async (req, res) => {
  try {
    const advertiser = await Advertiser.findById(req.params.id);
    
    if (!advertiser) {
      return res.status(404).json({
        success: false,
        message: "Advertiser not found"
      });
    }
    
    advertiser.isActive = !advertiser.isActive;
    advertiser.updatedAt = Date.now();
    await advertiser.save();
    
    res.status(200).json({
      success: true,
      message: `Advertiser ${advertiser.isActive ? "activated" : "deactivated"} successfully`,
      data: advertiser
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid advertiser ID"
      });
    }
    console.error("Error toggling advertiser status:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get advertiser count
export const getAdvertiserCount = async (req, res) => {
  try {
    const { city, state, country, isActive } = req.query;
    
    let query = {};
    
    if (city) query.city = city;
    if (state) query.state = state;
    if (country) query.country = country;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const count = await Advertiser.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: "Advertiser count fetched successfully",
      data: { count }
    });
  } catch (error) {
    console.error("Error getting advertiser count:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get advertisers by city
export const getAdvertisersByCity = async (req, res) => {
  try {
    const { cityId } = req.params;
    const { isActive, page = 1, limit = 10 } = req.query;
    
    let query = { city: cityId };
    
    if (isActive === "true") query.isActive = true;
    if (isActive === "false") query.isActive = false;
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const advertisers = await Advertiser.find(query)
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Advertiser.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: "Advertisers fetched successfully by city",
      data: {
        advertisers,
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total
        }
      }
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid city ID"
      });
    }
    console.error("Error fetching advertisers by city:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get advertisers by state
export const getAdvertisersByState = async (req, res) => {
  try {
    const { stateId } = req.params;
    const { isActive, page = 1, limit = 10 } = req.query;
    
    let query = { state: stateId };
    
    if (isActive === "true") query.isActive = true;
    if (isActive === "false") query.isActive = false;
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const advertisers = await Advertiser.find(query)
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Advertiser.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: "Advertisers fetched successfully by state",
      data: {
        advertisers,
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total
        }
      }
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid state ID"
      });
    }
    console.error("Error fetching advertisers by state:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get advertisers by country
export const getAdvertisersByCountry = async (req, res) => {
  try {
    const { countryId } = req.params;
    const { isActive, page = 1, limit = 10 } = req.query;
    
    let query = { country: countryId };
    
    if (isActive === "true") query.isActive = true;
    if (isActive === "false") query.isActive = false;
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const advertisers = await Advertiser.find(query)
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Advertiser.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: "Advertisers fetched successfully by country",
      data: {
        advertisers,
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total
        }
      }
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid country ID"
      });
    }
    console.error("Error fetching advertisers by country:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get active advertisers only
export const getActiveAdvertisers = async (req, res) => {
  try {
    const { 
      city, 
      state, 
      country, 
      search,
      page = 1,
      limit = 10
    } = req.query;
    
    let query = { isActive: true };
    
    // Filter by location
    if (city) query.city = city;
    if (state) query.state = state;
    if (country) query.country = country;
    
    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const advertisers = await Advertiser.find(query)
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Advertiser.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: "Active advertisers fetched successfully",
      data: {
        advertisers,
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total
        }
      }
    });
  } catch (error) {
    console.error("Error fetching active advertisers:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get advertisers with ads count (for dashboard)
export const getAdvertisersWithStats = async (req, res) => {
  try {
    const { 
      isActive,
      page = 1,
      limit = 10
    } = req.query;
    
    let query = {};
    
    if (isActive === "true") query.isActive = true;
    if (isActive === "false") query.isActive = false;
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const advertisers = await Advertiser.find(query)
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    // Get ads count for each advertiser
    const advertisersWithStats = await Promise.all(
      advertisers.map(async (advertiser) => {
        const adsCount = await mongoose.model('Ad').countDocuments({ 
          advertiser: advertiser.name,
          isActive: true 
        });
        return {
          ...advertiser.toObject(),
          adsCount
        };
      })
    );
    
    const total = await Advertiser.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: "Advertisers with stats fetched successfully",
      data: {
        advertisers: advertisersWithStats,
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total
        }
      }
    });
  } catch (error) {
    console.error("Error fetching advertisers with stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};