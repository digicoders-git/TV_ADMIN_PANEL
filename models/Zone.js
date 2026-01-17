import mongoose from "mongoose";

const zoneSchema = mongoose.Schema({
  zoneId: {
    type: String,
    required: [true, "Zone ID is required"],
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: [true, "Zone name is required"],
    trim: true
  },
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "City",
    required: [true, "City reference is required"],
    validate: {
      validator: async function(cityId) {
        // Validate that the city exists
        const city = await mongoose.model('City').findById(cityId);
        return !!city;
      },
      message: "Referenced city does not exist"
    }
  },
  state: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "State",
    required: [true, "State reference is required"],
    validate: {
      validator: async function(stateId) {
        // Validate that the state exists and matches the city's state
        const city = await mongoose.model('City').findById(this.city);
        if (!city) return false;
        return city.state.toString() === stateId.toString();
      },
      message: "State does not match the city's state"
    }
  },
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Country",
    required: [true, "Country reference is required"],
    validate: {
      validator: async function(countryId) {
        // Validate that the country exists and matches the city's country
        const city = await mongoose.model('City').findById(this.city);
        if (!city) return false;
        return city.country.toString() === countryId.toString();
      },
      message: "Country does not match the city's country"
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


// Compound index to ensure unique zone names within a city
zoneSchema.index({ name: 1, city: 1 }, { unique: true });

// Pre-save hook to ensure data consistency
zoneSchema.pre('save', async function(next) {
  if (this.isModified('city')) {
    const city = await mongoose.model('City').findById(this.city);
    if (!city) {
      throw new Error('Referenced city not found');
    }
    this.state = city.state;
    this.country = city.country;
  }
  next();
});

export const Zone = mongoose.model("Zone", zoneSchema);