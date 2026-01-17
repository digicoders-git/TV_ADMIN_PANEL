import mongoose from "mongoose";

const advertiserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Advertiser name is required"],
    trim: true
  },
  companyName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    lowercase: true,
    trim: true,
    unique:true
  },
  phone: {
    type: String,
    trim: true,
    unique:true,
    required: [true, "Phone number is required"],
  },
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "City",
    validate: {
      validator: async function (cityId) {
        // Agar cityId null ya undefined hai to validation pass hogi
        if (!cityId) return true;

        // Agar cityId hai tabhi check karein ki woh exist karti hai ya nahi
        return await mongoose.model("City").exists({ _id: cityId });
      },
      message: "Referenced city does not exist"
    }
  },
  state: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "State",
    validate: {
      validator: async function (stateId) {
        // Agar city nahi hai ya state nahi hai, toh validation pass
        if (!this.city || !stateId) return true;

        const city = await mongoose.model("City").findById(this.city);
        return city && city.state.toString() === stateId.toString();
      },
      message: "State does not match the city's state"
    }
  },
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Country",
    validate: {
      validator: async function (countryId) {
        // Agar city nahi hai ya country nahi hai, toh validation pass
        if (!this.city || !countryId) return true;

        const city = await mongoose.model("City").findById(this.city);
        return city && city.country.toString() === countryId.toString();
      },
      message: "Country does not match the city's country"
    }
  },
  street: String,
  postalCode: String,
  website: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export const Advertiser = mongoose.model("Advertiser", advertiserSchema);
