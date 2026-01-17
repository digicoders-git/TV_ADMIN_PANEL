import mongoose from "mongoose";

const stateSchema = mongoose.Schema({
  stateId:{
        type: String,
    required: [true, "state ID is required"],
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: [true, "State name is required"],
    trim: true,
    unique: true,
  },
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Country",
    required: [true, "Country reference is required"],
    validate: {
      validator: async function(countryId) {
        const country = await mongoose.model('Country').findById(countryId);
        return !!country; // Returns true if country exists
      },
      message: "Referenced country does not exist"
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

export const State = mongoose.model("State", stateSchema);