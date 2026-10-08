const Rider = require("../models/Rider");
const Order = require("../models/Order");
const { getIO } = require("../config/socket");

// Called once when a rider account is set up, or lazily on first use.
exports.setupRiderProfile = async (req, res) => {
  try {
    let rider = await Rider.findOne({ userId: req.user.userId });
    if (!rider) {
      rider = new Rider({ userId: req.user.userId });
      await rider.save();
    }
    res.json({ rider });
  } catch (err) {
    res.status(500).json({ error: "Failed to set up rider profile", details: err.message });
  }
};

// Rider goes online/offline and sets availability + current location.
exports.updateAvailability = async (req, res) => {
  try {
    const { isAvailable, isOnline, longitude, latitude } = req.body;

    const update = {};
    if (isAvailable !== undefined) update.isAvailable = isAvailable;
    if (isOnline !== undefined) update.isOnline = isOnline;
    if (longitude !== undefined && latitude !== undefined) {
      update.currentLocation = { type: "Point", coordinates: [longitude, latitude] };
    }

    const rider = await Rider.findOneAndUpdate(
      { userId: req.user.userId },
      update,
      { new: true, upsert: true }
    );

    res.json({ rider });
  } catch (err) {
    res.status(500).json({ error: "Failed to update availability", details: err.message });
  }
};

// Find available riders near a given pickup point, within maxDistance (meters).
exports.findNearbyRiders = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 5000 } = req.query;

    const riders = await Rider.find({
      isAvailable: true,
      isOnline: true,
      currentLocation: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: parseInt(maxDistance), // meters
        },
      },
    }).populate("userId", "name email");

    res.json({ riders });
  } catch (err) {
    res.status(500).json({ error: "Failed to find nearby riders", details: err.message });
  }
};

// THE CRITICAL FIX: atomic accept-order, preventing two riders
// from both successfully accepting the same order.
exports.acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const riderId = req.user.userId;

    const rider = await Rider.findOne({ userId: riderId });
    if (!rider || !rider.isAvailable) {
      return res.status(400).json({ error: "Rider is not available" });
    }

    // The key line: findOneAndUpdate with a condition on the CURRENT status.
    // This is atomic at the database level — if two riders hit this at the
    // same instant, only ONE of these operations will find a matching
    // document (status still "SEARCHING_RIDER") and succeed. The second
    // request will find nothing (since status already changed) and get null.
    const order = await Order.findOneAndUpdate(
      { _id: orderId, status: "SEARCHING_RIDER" },
      { riderId, status: "RIDER_ASSIGNED" },
      { new: true }
    );

    if (!order) {
      return res.status(409).json({ error: "Order no longer available" });
    }

    rider.isAvailable = false;
    await rider.save();

    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: "Failed to accept order", details: err.message });
  }
};


// Maps each status to the status that must come right before it.
// This enforces the order: ASSIGNED -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED
const PREVIOUS_STATUS = {
  RIDER_PICKED_UP: "RIDER_ASSIGNED",
  OUT_FOR_DELIVERY: "RIDER_PICKED_UP",
  DELIVERED: "OUT_FOR_DELIVERY",
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const requiredPrevious = PREVIOUS_STATUS[status];
    if (!requiredPrevious) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Same atomic pattern as acceptOrder: the conditions (this rider owns
    // the order, and it's in the expected previous status) are part of the
    // update itself, so skipping steps or editing someone else's order
    // simply matches nothing.
    const order = await Order.findOneAndUpdate(
      { _id: orderId, riderId: req.user.userId, status: requiredPrevious },
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(409).json({ error: "Invalid status transition, or not your order" });
    }

    // Delivery finished: free the rider up for new orders.
    if (status === "DELIVERED") {
      await Rider.findOneAndUpdate({ userId: req.user.userId }, { isAvailable: true });
    }

    // Push the new status to everyone in this delivery's room (the customer).
    getIO().to(`delivery:${orderId}`).emit("delivery:status", { status });

    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status", details: err.message });
  }
};