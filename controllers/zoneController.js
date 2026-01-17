import { Zone } from "../models/Zone.js";
import { City } from "../models/City.js";
import { State } from "../models/State.js";
import { Country } from "../models/Country.js";
import { Counter } from "../models/Counter.js";

// Helper function to get next sequential ID
const getNextSequenceValue = async (sequenceName) => {
  const sequenceDocument = await Counter.findOneAndUpdate(
    { name: sequenceName },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.value;
};


export const createZone = async (req, res) => {
  try {
    const { name, city, state, country } = req.body;

    if (!name || !city || !state || !country) {
      return res.status(400).json({
        success: false,
        message: "Name, city, state and country are required"
      });
    }

    // Validate country exists
    const countryExists = await Country.findById(country);
    if (!countryExists) {
      return res.status(404).json({
        success: false,
        message: "Country not found"
      });
    }

    // Validate state exists and belongs to country
    const stateExists = await State.findOne({ _id: state, country });
    if (!stateExists) {
      return res.status(400).json({
        success: false,
        message: "State not found or doesn't belong to the specified country"
      });
    }

    // Validate city exists and belongs to state
    const cityExists = await City.findOne({ _id: city, state });
    if (!cityExists) {
      return res.status(400).json({
        success: false,
        message: "City not found or doesn't belong to the specified state"
      });
    }

    // Check if zone already exists in this city
    const zoneExists = await Zone.findOne({ name, city });
    if (zoneExists) {
      return res.status(400).json({
        success: false,
        message: "Zone already exists in this city"
      });
    }

    const zoneId = await getNextSequenceValue("zoneId")


    const zone = await Zone.create({
      zoneId,
      name,
      city,
      state,
      country,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });

    res.status(201).json({
      success: true,
      message: "Zone created successfully",
      data: zone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getZones = async (req, res) => {
  try {
    const { city, state, country, activeOnly, search } = req.query;
    
    let query = {};
    
    if (city) {
      query.city = city;
    }
    
    if (state) {
      query.state = state;
    }
    
    if (country) {
      query.country = country;
    }
    
    if (activeOnly === 'true') {
      query.isActive = true;
    }
    
    if (activeOnly === 'false') {
      query.isActive = false;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const zones = await Zone.find(query)
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      message: "Zones fetched successfully",
      data: zones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getActiveZones = async (req, res) => {
  try {
    const { city, state, country } = req.query;
    
    let query = { isActive: true };
    
    if (city) {
      query.city = city;
    }
    
    if (state) {
      query.state = state;
    }
    
    if (country) {
      query.country = country;
    }
    
    const zones = await Zone.find(query)
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      message: "Active zones fetched successfully",
      data: zones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getZoneById = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id)
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name');
    
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: "Zone not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Zone fetched successfully",
      data: zone
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid zone ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const updateZone = async (req, res) => {
  try {
    const { name, city, state, country, isActive } = req.body;
    
    const zone = await Zone.findById(req.params.id);
    
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: "Zone not found"
      });
    }
    
    if (name) {
      // Check if new name already exists in the same city
      const zoneExists = await Zone.findOne({ 
        name, 
        city: city || zone.city,
        _id: { $ne: zone._id }
      });
      
      if (zoneExists) {
        return res.status(400).json({
          success: false,
          message: "Zone with this name already exists in the city"
        });
      }
      
      zone.name = name;
    }
    
    if (city || state || country) {
      // If changing city, state or country, validate the new references
      const newCity = city || zone.city;
      const newState = state || zone.state;
      const newCountry = country || zone.country;

      // Validate country exists if changing
      if (country) {
        const countryExists = await Country.findById(newCountry);
        if (!countryExists) {
          return res.status(404).json({
            success: false,
            message: "Country not found"
          });
        }
        zone.country = newCountry;
      }

      // Validate state exists and belongs to country if changing
      if (state) {
        const stateExists = await State.findOne({ 
          _id: newState, 
          country: newCountry 
        });
        if (!stateExists) {
          return res.status(400).json({
            success: false,
            message: "State not found or doesn't belong to the specified country"
          });
        }
        zone.state = newState;
      }

      // Validate city exists and belongs to state if changing
      if (city) {
        const cityExists = await City.findOne({ 
          _id: newCity, 
          state: newState 
        });
        if (!cityExists) {
          return res.status(400).json({
            success: false,
            message: "City not found or doesn't belong to the specified state"
          });
        }
        zone.city = newCity;
      }
    }
    
    if (isActive !== undefined) {
      zone.isActive = isActive;
    }
    
    const updatedZone = await zone.save();
    
    res.status(200).json({
      success: true,
      message: "Zone updated successfully",
      data: updatedZone
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid zone ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const deleteZone = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id);
    
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: "Zone not found"
      });
    }
    
    // Check if there are any stores associated with this zone
    // const storesCount = await Store.countDocuments({ zone: zone._id });
    // if (storesCount > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Cannot delete zone with associated stores"
    //   });
    // }
    
    await zone.deleteOne();
    
    res.status(200).json({
      success: true,
      message: "Zone deleted successfully"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid zone ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const toggleZoneStatus = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id);
    
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: "Zone not found"
      });
    }
    
    zone.isActive = !zone.isActive;
    await zone.save();
    
    res.status(200).json({
      success: true,
      message: `Zone ${zone.isActive ? "activated" : "deactivated"} successfully`,
      data: zone
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid zone ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};