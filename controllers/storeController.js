import { Store } from "../models/Store.js";
import { Zone } from "../models/Zone.js";
import { City } from "../models/City.js";
import { State } from "../models/State.js";
import { Country } from "../models/Country.js";

export const createStore = async (req, res) => {
  try {
    const { name, zone, city, state, country } = req.body;

    if (!name || !zone || !city || !state || !country) {
      return res.status(400).json({
        success: false,
        message: "Name, zone, city, state and country are required"
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

    // Validate zone exists and belongs to the city
    const zoneExists = await Zone.findOne({ _id: zone, city });
    if (!zoneExists) {
      return res.status(400).json({
        success: false,
        message: "Zone not found or doesn't belong to the specified city"
      });
    }

    // Check if store already exists in this zone
    const storeExists = await Store.findOne({ name, zone });
    if (storeExists) {
      return res.status(400).json({
        success: false,
        message: "Store already exists in this zone"
      });
    }

    const store = await Store.create({
      name,
      zone,
      city,
      state,
      country,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });

    res.status(201).json({
      success: true,
      message: "Store created successfully",
      data: store
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getStores = async (req, res) => {
  try {
    const { zone, city, state, country, activeOnly, search } = req.query;
    
    let query = {};
    
    if (zone) {
      query.zone = zone;
    }
    
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
    
    const stores = await Store.find(query)
      .populate('zone', 'name')
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      message: "Stores fetched successfully",
      data: stores
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getActiveStores = async (req, res) => {
  try {
    const { zone, city, state, country, search} = req.query;
    
    let query = { isActive: true };
    
    if (zone) {
      query.zone = zone;
    }
    
    if (city) {
      query.city = city;
    }
    
    if (state) {
      query.state = state;
    }
    
    if (country) {
      query.country = country;
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const stores = await Store.find(query)
      .populate('zone', 'name')
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      message: "Active stores fetched successfully",
      data: stores
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getStoreById = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id)
      .populate('zone', 'name')
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name');
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Store fetched successfully",
      data: store
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid store ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getStoresByZone = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const { activeOnly } = req.query;
    
    let query = { zone: zoneId };
    
    if (activeOnly === 'true') {
      query.isActive = true;
    }
    
    if (activeOnly === 'false') {
      query.isActive = false;
    }
    
    const stores = await Store.find(query)
      .populate('zone', 'name')
      .populate('city', 'name')
      .populate('state', 'name')
      .populate('country', 'name')
      .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      message: "Stores fetched successfully",
      data: stores
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

export const updateStore = async (req, res) => {
  try {
    const { name, zone, city, state, country, isActive } = req.body;
    
    const store = await Store.findById(req.params.id);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }
    
    if (name || zone) {
      // Check if new name already exists in the same zone
      const storeExists = await Store.findOne({ 
        name: name || store.name, 
        zone: zone || store.zone,
        _id: { $ne: store._id }
      });
      
      if (storeExists) {
        return res.status(400).json({
          success: false,
          message: "Store with this name already exists in the zone"
        });
      }
    }
    
    if (name) {
      store.name = name;
    }
    
    if (zone || city || state || country) {
      // If changing zone, city, state or country, validate the new references
      const newZone = zone || store.zone;
      const newCity = city || store.city;
      const newState = state || store.state;
      const newCountry = country || store.country;

      // Validate country exists if changing
      if (country) {
        const countryExists = await Country.findById(newCountry);
        if (!countryExists) {
          return res.status(404).json({
            success: false,
            message: "Country not found"
          });
        }
        store.country = newCountry;
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
        store.state = newState;
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
        store.city = newCity;
      }

      // Validate zone exists and belongs to city if changing
      if (zone) {
        const zoneExists = await Zone.findOne({ 
          _id: newZone, 
          city: newCity 
        });
        if (!zoneExists) {
          return res.status(400).json({
            success: false,
            message: "Zone not found or doesn't belong to the specified city"
          });
        }
        store.zone = newZone;
      }
    }
    
    if (isActive !== undefined) {
      store.isActive = isActive;
    }
    
    const updatedStore = await store.save();
    
    res.status(200).json({
      success: true,
      message: "Store updated successfully",
      data: updatedStore
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid store ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const deleteStore = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }
    
    // Add any additional checks here if needed
    // For example, check if there are any orders associated with this store
    // const ordersCount = await Order.countDocuments({ store: store._id });
    // if (ordersCount > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Cannot delete store with associated orders"
    //   });
    // }
    
    await store.deleteOne();
    
    res.status(200).json({
      success: true,
      message: "Store deleted successfully"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid store ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const toggleStoreStatus = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }
    
    store.isActive = !store.isActive;
    await store.save();
    
    res.status(200).json({
      success: true,
      message: `Store ${store.isActive ? "activated" : "deactivated"} successfully`,
      data: store
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid store ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getStoreCount = async (req, res) => {
  try {
    const { zone, city, state, country, activeOnly } = req.query;
    
    let query = {};
    
    if (zone) {
      query.zone = zone;
    }
    
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
    
    const count = await Store.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: "Store count fetched successfully",
      data: { count }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};