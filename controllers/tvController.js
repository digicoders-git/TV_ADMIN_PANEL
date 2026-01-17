import mongoose from "mongoose";
import { Store } from "../models/Store.js";
import { Zone } from "../models/Zone.js";
import { City } from "../models/City.js";
import { State } from "../models/State.js";
import { Country } from "../models/Country.js";
import { TV } from "../models/TV.js";
import { Counter } from "../models/Counter.js";

// Helper function for validation
const validateHierarchy = async (country, state, city, zone, store) => {
  const errors = [];
  
  if (state) {
    const stateDoc = await State.findById(state);
    if (!stateDoc || String(stateDoc.country) !== String(country)) {
      errors.push("State does not belong to the specified country");
    }
  }

  if (city) {
    const cityDoc = await City.findById(city);
    if (!cityDoc || String(cityDoc.state) !== String(state)) {
      errors.push("City does not belong to the specified state");
    }
  }

  if (zone) {
    const zoneDoc = await Zone.findById(zone);
    if (!zoneDoc || String(zoneDoc.city) !== String(city)) {
      errors.push("Zone does not belong to the specified city");
    }
  }

  if (store) {
    const storeDoc = await Store.findById(store);
    if (!storeDoc || String(storeDoc.zone) !== String(zone)) {
      errors.push("Store does not belong to the specified zone");
    }
  }

  return errors;
};


// Helper function to get next sequential ID
const getNextSequenceValue = async (sequenceName) => {
    const sequenceDocument = await Counter.findOneAndUpdate(
        { name: sequenceName },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
    );
    return sequenceDocument.value;
};



export const createTV = async (req, res) => {
  try {
    const {
      store,
      zone,
      city,
      state,
      country,
      macAddress,
      serialNumber,
      screenSize,
      resolution,
      manufacturer,
      model,
      ipAddress,
      location,
      isActive = true,
      status = 'offline'
    } = req.body;

    // Generate sequential TV ID
    const tvId = await getNextSequenceValue("tvId");

    // Generate TV Name (fallback agar manufacturer/model missing ho)
    const tvName = (manufacturer || model)
      ? `${manufacturer || ''} ${model || ''}`.trim()
      : `TV ${tvId}`;

    // Prepare location data (null if not provided)
    let locationData = null;
    if (location && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
      locationData = {
        type: 'Point',
        coordinates: location.coordinates,
        address: location.address || '',
        floor: location.floor || '',
        installationNotes: location.installationNotes || ''
      };
    }

    // Create TV document
    const tv = new TV({
      tvId,
      tvName,
      store,
      zone,
      city,
      state,
      country,
      macAddress,
      serialNumber,
      screenSize,
      resolution,
      manufacturer,
      model,
      ipAddress,
      location: locationData,
      isActive,
      status
    });

    await tv.save();

    // Populate references for response
    await tv.populate([
      { path: 'store', select: 'name' },
      { path: 'zone', select: 'name' },
      { path: 'city', select: 'name' },
      { path: 'state', select: 'name' },
      { path: 'country', select: 'name' }
    ]);

    res.status(201).json({
      success: true,
      message: 'TV created successfully',
      data: tv
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors
      });
    }

if (error.code === 11000) {
  console.log("Duplicate key error details:", error.keyValue);
  return res.status(400).json({
    success: false,
    message: `Duplicate key error: ${JSON.stringify(error.keyValue)}`
  });
}


    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const validateTV = async (req, res) => {
  try {
    const { tvCode } = req.query;
    if(!tvCode){
      return res.status(400).json({
        success: false,
        message: "tvCode not fond!, Please Provide tvCode"
      });
    }
    const tv = await TV.findOne({tvId:tvCode})
    if(!tv){
     return res.status(404).json({
        success: false,
        message: "TV not fond!, This is a InValid tvCode",
      });
    }


    return res.status(200).json({
      success: true,
      message: "This is a valid tvCode",
      tv
    });
  } catch (error) {
    console.error("Invalid tvCode:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const toggleLogInOutTV = async (req, res) => {
  try {
    const { tvCode } = req.query;

    // Agar tvCode nahi diya gaya
    if (!tvCode) {
      return res.status(400).json({
        success: false,
        message: "tvCode not found! Please provide a valid tvCode.",
      });
    }

    // TV search karo
    const tv = await TV.findOne({ tvId: tvCode });

    if (!tv) {
      return res.status(404).json({
        success: false,
        message: "TV not found! This is an invalid tvCode.",
      });
    }

    // Status toggle logic
    tv.status = tv.status === "online" ? "offline" : "online";
    await tv.save();

    return res.status(200).json({
      success: true,
      message: `You are now logged ${tv.status === "online" ? "in" : "out from"} your TV.`,
      tv,
    });
  } catch (error) {
    console.error("Error toggling TV login/logout:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while toggling TV status.",
      error: error.message,
    });
  }
};

export const getTVs = async (req, res) => {
  try {
    const { store, zone, city, state, country, status, search, isActive } = req.query;
    
    let query = {};
    
    if (store) query.store = store;
    if (zone) query.zone = zone;
    if (city) query.city = city;
    if (state) query.state = state;
    if (country) query.country = country;
    if (status) query.status = status;
    if (isActive === "true") query.isActive = true;
    if (isActive === "false") query.isActive = false;
    console.log(isActive)
    
    if (search) {
      query.$or = [
        { tvId: { $regex: search, $options: 'i' } },
        { macAddress: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
    }
    
    const tvs = await TV.find(query)
      .populate('store', 'name')
      .populate('zone', 'name')
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      message: "TVs fetched successfully",
      data: tvs
    });
  } catch (error) {
    console.error("Error fetching TVs:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getTVById = async (req, res) => {
  try {
    const tv = await TV.findById(req.params.id)
      .populate('store', 'name')
      .populate('zone', 'name')
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name');
    
    if (!tv) {
      return res.status(404).json({
        success: false,
        message: "TV not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "TV fetched successfully",
      data: tv
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid TV ID"
      });
    }
    console.error("Error fetching TV by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const updateTV = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const tv = await TV.findById(id);
    if (!tv) {
      return res.status(404).json({
        success: false,
        message: "TV not found"
      });
    }
    
    // Check for duplicates if updating unique fields
    if (updateData.tvId && updateData.tvId !== tv.tvId) {
      const existingTV = await TV.findOne({ tvId: updateData.tvId });
      if (existingTV) {
        return res.status(400).json({
          success: false,
          message: "TV with this ID already exists"
        });
      }
    }
    
    if (updateData.macAddress && updateData.macAddress !== tv.macAddress) {
      const existingMAC = await TV.findOne({ macAddress: updateData.macAddress });
      if (existingMAC) {
        return res.status(400).json({
          success: false,
          message: "MAC address already registered"
        });
      }
    }
    
    if (updateData.serialNumber && updateData.serialNumber !== tv.serialNumber) {
      const existingSerial = await TV.findOne({ serialNumber: updateData.serialNumber });
      if (existingSerial) {
        return res.status(400).json({
          success: false,
          message: "Serial number already registered"
        });
      }
    }
    
    // Validate hierarchy if location fields are being updated
    const locationUpdates = ['country', 'state', 'city', 'zone', 'store'].some(field => field in updateData);
    if (locationUpdates) {
      const hierarchyErrors = await validateHierarchy(
        updateData.country || tv.country,
        updateData.state || tv.state,
        updateData.city || tv.city,
        updateData.zone || tv.zone,
        updateData.store || tv.store
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
      'tvId', 'store', 'zone', 'city', 'state', 'country',
      'macAddress', 'serialNumber', 'screenSize', 'resolution',
      'manufacturer', 'model', 'ipAddress', 'location', 'status',
      'isActive', 'firmwareVersion', 'installationNotes'
    ];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        tv[field] = updateData[field];
      }
    });

    tv.updatedAt = Date.now();
    
    const updatedTV = await tv.save();
    const populatedTV = await TV.findById(updatedTV._id)
      .populate('store', 'name')
      .populate('zone', 'name')
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name');

    res.status(200).json({
      success: true,
      message: "TV updated successfully",
      data: populatedTV
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid TV ID"
      });
    }
    console.error("Error updating TV:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const deleteTV = async (req, res) => {
  try {
    const tv = await TV.findById(req.params.id);
    
    if (!tv) {
      return res.status(404).json({
        success: false,
        message: "TV not found"
      });
    }
    
    await tv.deleteOne();
    
    res.status(200).json({
      success: true,
      message: "TV deleted successfully"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid TV ID"
      });
    }
    console.error("Error deleting TV:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const updateTVStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["online", "offline", "maintenance"];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Valid status is required (${validStatuses.join('/')})`
      });
    }
    
    const tv = await TV.findById(req.params.id);
    if (!tv) {
      return res.status(404).json({
        success: false,
        message: "TV not found"
      });
    }
    
    tv.status = status;
    tv.updatedAt = Date.now();
    
    if (status === "online") {
      tv.lastSyncTime = new Date();
    }
    
    await tv.save();
    
    res.status(200).json({
      success: true,
      message: `Now your TV ${tv.status == "maintenance" ? "in Maintenance" : tv.status == "online" ? "is Online" : "is Offline"  }`,
      data: tv
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid TV ID"
      });
    }
    console.error("Error updating TV status:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getTVCount = async (req, res) => {
  try {
    const { store, zone, city, state, country, status, isActive } = req.query;
    
    let query = {};
    
    if (store) query.store = store;
    if (zone) query.zone = zone;
    if (city) query.city = city;
    if (state) query.state = state;
    if (country) query.country = country;
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const count = await TV.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: "TV count fetched successfully",
      data: { count }
    });
  } catch (error) {
    console.error("Error getting TV count:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Add this to your TV controller
export const getActiveTVs = async (req, res) => {
  try {
    const { store, zone, city, state, country, status } = req.query;
    
    let query = { isActive: true };
    
    if (store) query.store = store;
    if (zone) query.zone = zone;
    if (city) query.city = city;
    if (state) query.state = state;
    if (country) query.country = country;
    if (status) query.status = status;
    
    const tvs = await TV.find(query)
      .populate('store', 'name')
      .populate('zone', 'name')
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      message: "Active TVs fetched successfully",
      data: tvs
    });
  } catch (error) {
    console.error("Error fetching active TVs:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getTVsByStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { status, isActive } = req.query;
    
    let query = { store: storeId };
    
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const tvs = await TV.find(query)
      .populate('store', 'name')
      .populate('zone', 'name')
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      message: "TVs fetched successfully",
      data: tvs
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid store ID"
      });
    }
    console.error("Error fetching TVs by store:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const toggleTVStatus = async (req, res) => {
  console.log("chal rahia ")
  const tv = await TV.findById(req.params.id);
  console.log("hii",req.params.id,tv)
  
  try {
    if (!tv) {
      return res.status(404).json({
        success: false,
        message: "TV not found"
      });
    }
    
    tv.isActive = !tv.isActive;
    tv.updatedAt = Date.now();
    await tv.save();
    
    res.status(200).json({
      success: true,
      message: `TV ${tv.isActive ? "activated" : "deactivated"} successfully`,
      data: tv
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid TV ID"
      });
    }
    console.error("Error toggling TV status:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getTVsByZone = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const { status, isActive } = req.query;
    
    let query = { zone: zoneId };
    
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const tvs = await TV.find(query)
      .populate('store', 'name')
      .populate('zone', 'name')
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      message: "TVs fetched successfully by zone",
      data: tvs
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid zone ID"
      });
    }
    console.error("Error fetching TVs by zone:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getTVsByCity = async (req, res) => {
  try {
    const { cityId } = req.params;
    const { status, isActive } = req.query;
    
    let query = { city: cityId };
    
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const tvs = await TV.find(query)
      .populate('store', 'name')
      .populate('zone', 'name')
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      message: "TVs fetched successfully by city",
      data: tvs
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid city ID"
      });
    }
    console.error("Error fetching TVs by city:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getTVsByState = async (req, res) => {
  try {
    const { stateId } = req.params;
    const { status, isActive } = req.query;
    
    let query = { state: stateId };
    
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const tvs = await TV.find(query)
      .populate('store', 'name')
      .populate('zone', 'name')
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      message: "TVs fetched successfully by state",
      data: tvs
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid state ID"
      });
    }
    console.error("Error fetching TVs by state:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getTVsByCountry = async (req, res) => {
  try {
    const { countryId } = req.params;
    const { status, isActive } = req.query;
    
    let query = { country: countryId };
    
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const tvs = await TV.find(query)
      .populate('store', 'name')
      .populate('zone', 'name')
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      message: "TVs fetched successfully by country",
      data: tvs
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid country ID"
      });
    }
    console.error("Error fetching TVs by country:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
