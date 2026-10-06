const Order = require("../models/Order");

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

    // Next phase will trigger nearby-rider search here.
    order.status = "SEARCHING_RIDER";
    await order.save();

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

    // Ownership check — a customer can only view their own order.
    // (Rider/admin access handled separately once those roles need it.)
    if (order.customerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized to view this order" });
    }

    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch order", details: err.message });
  }
};