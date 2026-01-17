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


export const createState = async (req, res) => {
    try {
        const { name, country } = req.body;

        if (!name || !country) {
            return res.status(400).json({
                success: false,
                message: "Name and country are required"
            });
        }

        // Check if country exists
        const countryExists = await Country.findById(country);
        if (!countryExists) {
            return res.status(404).json({
                success: false,
                message: "Country not found"
            });
        }

        // Check if state already exists in this country
        const stateExists = await State.findOne({ name, country });
        if (stateExists) {
            return res.status(400).json({
                success: false,
                message: "State already exists in this country"
            });
        }

        const stateId = await getNextSequenceValue("stateId")


        const state = await State.create({
            stateId,
            name,
            country,
            isActive: req.body.isActive || true
        });

        res.status(201).json({
            success: true,
            message: "State created successfully",
            data: state
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

export const getStates = async (req, res) => {
    try {
        const { country, activeOnly } = req.query;

        let query = {};

        if (country) {
            query.country = country;
        }

        if (activeOnly === 'true') {
            query.isActive = true;
        }

        if (activeOnly === 'false') {
            query.isActive = false;
        }


        const states = await State.find(query).populate('country', 'name').sort({ name: 1 });

        res.status(200).json({
            success: true,
            message: "States fetched successfully",
            data: states
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

export const getActiveStates = async (req, res) => {
    try {
        const { country } = req.query;

        let query = { isActive: true };

        if (country) {
            query.country = country;
        }

        const states = await State.find(query).populate('country', 'name').sort({ name: 1 });

        res.status(200).json({
            success: true,
            message: "Active states fetched successfully",
            data: states
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

export const getStateById = async (req, res) => {
    try {
        const state = await State.findById(req.params.id).populate('country', 'name');

        if (!state) {
            return res.status(404).json({
                success: false,
                message: "State not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "State fetched successfully",
            data: state
        });
    } catch (error) {
        if (error.kind === "ObjectId") {
            return res.status(404).json({
                success: false,
                message: "Invalid state ID"
            });
        }
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

export const updateState = async (req, res) => {
    try {
        const { name, country, isActive } = req.body;

        const state = await State.findById(req.params.id);

        if (!state) {
            return res.status(404).json({
                success: false,
                message: "State not found"
            });
        }

        if (name) {
            // Check if new name already exists in the same country
            const stateExists = await State.findOne({
                name,
                country: country || state.country,
                _id: { $ne: req.params.id }
            });

            if (stateExists) {
                return res.status(400).json({
                    success: false,
                    message: "State with this name already exists in the country"
                });
            }

            state.name = name;
        }

        if (country) {
            // Check if new country exists
            const countryExists = await Country.findById(country);
            if (!countryExists) {
                return res.status(404).json({
                    success: false,
                    message: "Country not found"
                });
            }
            state.country = country;
        }

        if (typeof isActive !== 'undefined') {
            state.isActive = isActive;
        }

        const updatedState = await state.save();

        res.status(200).json({
            success: true,
            message: "State updated successfully",
            data: updatedState
        });
    } catch (error) {
        if (error.kind === "ObjectId") {
            return res.status(404).json({
                success: false,
                message: "Invalid state ID"
            });
        }
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

export const deleteState = async (req, res) => {
    try {
        const state = await State.findById(req.params.id);

        if (!state) {
            return res.status(404).json({
                success: false,
                message: "State not found"
            });
        }

        await state.deleteOne();

        res.status(200).json({
            success: true,
            message: "State deleted successfully"
        });
    } catch (error) {
        if (error.kind === "ObjectId") {
            return res.status(404).json({
                success: false,
                message: "Invalid state ID"
            });
        }
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

export const toggleStateStatus = async (req, res) => {
    try {
        const state = await State.findById(req.params.id);

        if (!state) {
            return res.status(404).json({
                success: false,
                message: "State not found"
            });
        }

        state.isActive = !state.isActive;
        await state.save();

        res.status(200).json({
            success: true,
            message: `State ${state.isActive ? "activated" : "deactivated"} successfully`,
            data: state
        });
    } catch (error) {
        if (error.kind === "ObjectId") {
            return res.status(404).json({
                success: false,
                message: "Invalid state ID"
            });
        }
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};