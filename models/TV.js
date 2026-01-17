import mongoose from "mongoose";


const tvSchema = new mongoose.Schema({
  // Identification
  tvId: {
    type: String,
    required: [true, "TV ID is required"],
    unique: true,
    trim: true,
    index: true
  },
  tvName:{
    type:String
  },
  // Location References
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: [true, "Store reference is required"],
    validate: {
      validator: async function(storeId) {
        const store = await mongoose.model("Store").findById(storeId);
        return !!store;
      },
      message: "Referenced store does not exist"
    }
  },
  zone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Zone",
    required: [true, "Zone reference is required"],
    validate: {
      validator: async function(zoneId) {
        const zone = await mongoose.model("Zone").findById(zoneId);
        return !!zone;
      },
      message: "Referenced zone does not exist"
    }
  },
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "City",
    required: [true, "City reference is required"],
    validate: {
      validator: async function(cityId) {
        const city = await mongoose.model("City").findById(cityId);
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
        const state = await mongoose.model("State").findById(stateId);
        return !!state;
      },
      message: "Referenced state does not exist"
    }
  },
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Country",
    required: [true, "Country reference is required"],
    validate: {
      validator: async function(countryId) {
        const country = await mongoose.model("Country").findById(countryId);
        return !!country;
      },
      message: "Referenced country does not exist"
    }
  },

  // Physical Location
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 &&
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: "Invalid coordinates format"
      }
    },
    address: {
      type: String,
      trim: true
    },
    floor: {
      type: String,
      trim: true
    },
    installationNotes: {
      type: String,
      trim: true
    }
  },

  // Hardware Information
  screenSize: {
    type: String,
    enum: ['32 inch', '42 inch', '55 inch', '65 inch', '75 inch', '85 inch', 'other'],
    required: [true, "Screen size is required"]
  },
  resolution: {
    type: String,
    enum: ['HD', 'Full HD', '2K', '4K', '8K', 'other'],
    required: [true, "Resolution is required"]
  },
  manufacturer: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  serialNumber: {
    type: String,
    trim: true,
  },
  macAddress: {
    type: String,
  },
  
  // Status Information
  status: {
    type: String,
    enum: ["online", "offline", "maintenance"],
    default: "offline"
  },
  lastSyncTime: {
    type: Date
  },
  lastSyncedAd:{ type: mongoose.Schema.Types.ObjectId, ref: "Ad" },
  firmwareVersion: {
    type: String,
  },

  ipAddress: {
    type: String,
    // validate: {
    //   validator: function(v) {
    //     return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v);
    //   },
    //   message: props => `${props.value} is not a valid IP address!`
    // }
  },

  isActive:{
    type:Boolean,
    default:true
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
  
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
tvSchema.index({ location: '2dsphere' });
tvSchema.index({ store: 1 });
tvSchema.index({ zone: 1 });
tvSchema.index({ city: 1 });
tvSchema.index({ state: 1 });
tvSchema.index({ country: 1 });
tvSchema.index({ status: 1 });

// Middleware to validate geographical hierarchy
tvSchema.pre('save', async function(next) {
  try {
    // Validate city belongs to state
    const city = await mongoose.model("City").findById(this.city);
    if (!city || String(city.state) !== String(this.state)) {
      throw new Error("City does not belong to the specified state");
    }

    // Validate state belongs to country
    const state = await mongoose.model("State").findById(this.state);
    if (!state || String(state.country) !== String(this.country)) {
      throw new Error("State does not belong to the specified country");
    }

    // Validate zone belongs to store (if needed)
    const store = await mongoose.model("Store").findById(this.store);
    if (!store || String(store.zone) !== String(this.zone)) {
      throw new Error("Store does not belong to the specified zone");
    }

    this.updatedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

export const TV =  mongoose.model("TV", tvSchema);

