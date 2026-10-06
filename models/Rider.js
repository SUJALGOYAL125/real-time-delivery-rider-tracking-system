const mongoose = require("mongoose");

const riderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  isAvailable: {
    type: Boolean,
    default: false,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  currentLocation: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0],
    },
  },
}, { timestamps: true });

// 2dsphere index — required for MongoDB geospatial queries like $near
riderSchema.index({ currentLocation: "2dsphere" });

module.exports = mongoose.model("Rider", riderSchema);