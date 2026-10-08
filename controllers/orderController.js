const Order = require("../models/Order");
const Rider = require("../models/Rider");
const { getIO } = require("../config/socket");

exports.createOrder = async (req, res) => {
  try {
    const { pickupLocation, deliveryLocation } = req.body;

    if (!pickupLocation?.coordinates || !deliveryLocation?.coordinates) {
      return res.status(400).json({ error: "Pickup and delivery locations are required" });
    }

    const order = new Order({
      customerId: req.user.userId,
      pickupLocation: {
        type: "Point",
        coordinates: pickupLocation.coordinates,
        address: pickupLocation.address,
      },
      deliveryLocation: {
        type: "Point",
        coordinates: deliveryLocation.coordinates,
        address: deliveryLocation.address,
      },
      status: "CREATED",
    });

    await order.save();

    order.status = "SEARCHING_RIDER";
    await order.save();

    // Notify nearby available riders. Wrapped in its own try/catch so a
    // notification failure never makes a successfully-saved order look failed.
    try {
      const nearbyRiders = await Rider.find({
        isAvailable: true,
        isOnline: true,
        currentLocation: {
          $near: {
            $geometry: { type: "Point", coordinates: pickupLocation.coordinates },
            $maxDistance: 5000,
          },
        },
      });

      const io = getIO();
      nearbyRiders.forEach((rider) => {
        io.to(`rider:${rider.userId}`).emit("delivery:new", {
          orderId: order._id,
          pickupLocation: order.pickupLocation,
          deliveryLocation: order.deliveryLocation,
        });
      });
    } catch (err) {
      console.error("Failed to notify riders:", err.message);
    }

    res.status(201).json({ order });
  } catch (err) {
    res.status(500).json({ error: "Failed to create order", details: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.user.userId }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders", details: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Ownership check: a customer can only view their own order.
    if (order.customerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized to view this order" });
    }

    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch order", details: err.message });
  }
};