const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  pickupLocation: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
    address: { type: String },
  },
  deliveryLocation: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
    },
    address: { type: String },
  },
  status: {
    type: String,
    enum: [
      "CREATED",
      "SEARCHING_RIDER",
      "RIDER_ASSIGNED",
      "RIDER_PICKED_UP",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ],
    default: "CREATED",
  },
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);