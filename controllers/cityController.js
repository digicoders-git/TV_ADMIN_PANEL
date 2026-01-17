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


export const createCity = async (req, res) => {
  try {
    const { name, state, country } = req.body;

    if (!name || !state || !country) {
      return res.status(400).json({
        success: false,
        message: "Name, state and country are required"
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

    // Check if city already exists in this state
    const cityExists = await City.findOne({ name, state });
    if (cityExists) {
      return res.status(400).json({
        success: false,
        message: "City already exists in this state"
      });
    }

    const cityId = await getNextSequenceValue("cityId")


    const city = await City.create({
      cityId,
      name,
      state,
      country,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });

    res.status(201).json({
      success: true,
      message: "City created successfully",
      data: city
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getCities = async (req, res) => {
  try {
    const { state, country, activeOnly, search } = req.query;
    
    let query = {};
    
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
    
    const cities = await City.find(query)
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      message: "Cities fetched successfully",
      data: cities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getActiveCities = async (req, res) => {
  try {
    const { state, country } = req.query;
    
    let query = { isActive: true };
    
    if (state) {
      query.state = state;
    }
    
    if (country) {
      query.country = country;
    }
    
    const cities = await City.find(query)
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      message: "Active cities fetched successfully",
      data: cities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getCityById = async (req, res) => {
  try {
    const city = await City.findById(req.params.id)
      .populate('state', 'name')
      .populate('country', 'name');
    
    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "City fetched successfully",
      data: city
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid city ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const updateCity = async (req, res) => {
  try {
    const { name, state, country, isActive } = req.body;
    
    const city = await City.findById(req.params.id);
    
    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found"
      });
    }
    
    if (name) {
      // Check if new name already exists in the same state
      const cityExists = await City.findOne({ 
        name, 
        state: state || city.state,
        _id: { $ne: city._id }
      });
      
      if (cityExists) {
        return res.status(400).json({
          success: false,
          message: "City with this name already exists in the state"
        });
      }
      
      city.name = name;
    }
    
    if (state || country) {
      // If changing state or country, validate the new references
      const newState = state || city.state;
      const newCountry = country || city.country;

      // Validate country exists if changing
      if (country) {
        const countryExists = await Country.findById(newCountry);
        if (!countryExists) {
          return res.status(404).json({
            success: false,
            message: "Country not found"
          });
        }
        city.country = newCountry;
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
        city.state = newState;
      }
    }
    
    if (isActive !== undefined) {
      city.isActive = isActive;
    }
    
    const updatedCity = await city.save();
    
    res.status(200).json({
      success: true,
      message: "City updated successfully",
      data: updatedCity
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid city ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const deleteCity = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);
    
    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found"
      });
    }
    
    await city.deleteOne();
    
    res.status(200).json({
      success: true,
      message: "City deleted successfully"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid city ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const toggleCityStatus = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);
    
    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found"
      });
    }
    
    city.isActive = !city.isActive;
    await city.save();
    
    res.status(200).json({
      success: true,
      message: `City ${city.isActive ? "activated" : "deactivated"} successfully`,
      data: city
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid city ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};