import { Counter } from "../models/Counter.js";
import { Country } from "../models/Country.js";

// Helper function to get next sequential ID
const getNextSequenceValue = async (sequenceName) => {
  const sequenceDocument = await Counter.findOneAndUpdate(
    { name: sequenceName },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.value;
};


export const createCountry = async (req, res) => {
  try {
    const { name } = req.body;
    const countryExists = await Country.findOne({ name });

    if (countryExists) {
      return res.status(400).json({
        success: false,
        message: "Country already exists"
      });
    }

    const countryId = await getNextSequenceValue("countryId")

    const country = await Country.create({ countryId, name });
    res.status(201).json({
      success: true,
      message: "Country created successfully",
      data: country
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getCountries = async (req, res) => {
  try {
    const countries = await Country.find({}).sort({ name: 1 });
    res.status(200).json({
      success: true,
      message: "Countries fetched successfully",
      data: countries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getActiveCountries = async (req, res) => {
  try {
    const countries = await Country.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({
      success: true,
      message: "Active countries fetched successfully",
      data: countries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getCountryById = async (req, res) => {
  try {
    const country = await Country.findById(req.params.id);

    if (!country) {
      return res.status(404).json({
        success: false,
        message: "Country not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Country fetched successfully",
      data: country
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid country ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const updateCountry = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    const country = await Country.findById(req.params.id);

    if (!country) {
      return res.status(404).json({
        success: false,
        message: "Country not found"
      });
    }

    if (name) {
      const nameExists = await Country.findOne({
        name,
        _id: { $ne: country._id }
      });
      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: "Country name already exists"
        });
      }
      country.name = name;
    }

    if (typeof isActive !== "undefined") {
      country.isActive = isActive;
    }

    const updatedCountry = await country.save();
    res.status(200).json({
      success: true,
      message: "Country updated successfully",
      data: updatedCountry
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid country ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const deleteCountry = async (req, res) => {
  try {
    const country = await Country.findById(req.params.id);
    if (!country) {
      return res.status(404).json({
        success: false,
        message: "Country not found"
      });
    }

    await country.deleteOne();
    res.status(200).json({
      success: true,
      message: "Country deleted successfully"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid country ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const toggleCountryStatus = async (req, res) => {
  try {
    const country = await Country.findById(req.params.id);
    if (!country) {
      return res.status(404).json({
        success: false,
        message: "Country not found"
      });
    }

    country.isActive = !country.isActive;
    await country.save();

    res.status(200).json({
      success: true,
      message: `Country ${country.isActive ? "activated" : "deactivated"} successfully`,
      data: country
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid country ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
