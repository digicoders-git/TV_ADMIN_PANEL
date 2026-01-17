import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Store name is required"],
      trim: true
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: [true, "Zone reference is required"],
      validate: {
        validator: async function (zoneId) {
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
        validator: async function (cityId) {
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
        validator: async function (stateId) {
          const city = await mongoose.model("City").findById(this.city);
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
        validator: async function (countryId) {
          const city = await mongoose.model("City").findById(this.city);
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Ensure unique store names within the same zone
storeSchema.index({ name: 1, zone: 1 }, { unique: true });

// Auto-fill state & country from city before saving
storeSchema.pre("save", async function (next) {
  if (this.isModified("city")) {
    const city = await mongoose.model("City").findById(this.city);
    if (!city) {
      throw new Error("Referenced city not found");
    }
    this.state = city.state;
    this.country = city.country;
  }
  next();
});

export const Store = mongoose.model("Store", storeSchema);
