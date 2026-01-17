import mongoose from "mongoose";

const citySchema = mongoose.Schema({
  cityId: {
    type: String,
    required: [true, "City ID is required"],
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: [true, "City name is required"],
    trim: true,
    unique: true
  },
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Country",
    required: [true, "Country reference is required"]
  },
  state: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "State",
    required: [true, "State reference is required"],
    validate: {
      validator: async function (stateId) {
        // Validate that the state belongs to the specified country
        const state = await mongoose.model('State').findById(stateId);
        return state && state.country.toString() === this.country.toString();
      },
      message: "State does not belong to the specified country"
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for faster queries
citySchema.index({ name: 1, state: 1 }, { unique: true });

export const City = mongoose.model("City", citySchema);