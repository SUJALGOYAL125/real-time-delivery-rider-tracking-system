const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Order = require("../models/Order");
const LocationHistory = require("../models/LocationHistory");
const { redisClient } = require("./redis");

let io;

const lastFlushTime = {};
const FLUSH_INTERVAL_MS = 15000;

// NEW: track the last time each rider sent a location update.
const lastLocationUpdate = {};
const MIN_UPDATE_INTERVAL_MS = 1000; // don't accept more than 1 update/second per rider

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL || "http://localhost:5173" },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token provided"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { userId: decoded.userId, role: decoded.role };
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id} (user ${socket.user.userId}, role ${socket.user.role})`);

    socket.on("rider:join-delivery", async ({ orderId }) => {
      const order = await Order.findById(orderId);
      if (!order) return socket.emit("error", { error: "Order not found" });

      const isRider = order.riderId && order.riderId.toString() === socket.user.userId;
      const isCustomer = order.customerId.toString() === socket.user.userId;

      if (!isRider && !isCustomer) {
        return socket.emit("error", { error: "Not authorized for this delivery" });
      }

      socket.join(`delivery:${orderId}`);
      socket.currentOrderId = orderId;

      if (isCustomer) {
        const cached = await redisClient.get(`rider:${order.riderId}:location`);
        if (cached) socket.emit("location:update", JSON.parse(cached));
      }
    });

    socket.on("rider:location", async (data) => {
      const { orderId, latitude, longitude, timestamp } = data;

      if (socket.user.role !== "rider") {
        return socket.emit("error", { error: "Only riders can send location updates" });
      }
      if (socket.currentOrderId !== orderId) {
        return socket.emit("error", { error: "Not joined to this delivery" });
      }
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return socket.emit("error", { error: "Invalid coordinates" });
      }
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return socket.emit("error", { error: "Coordinates out of range" });
      }

      // NEW: rate limit — silently drop updates that come in too fast.
      // No error sent back, since this is an expected, routine throttle,
      // not a client mistake worth alarming the rider about.
      const now = Date.now();
      const lastUpdate = lastLocationUpdate[socket.user.userId] || 0;
      if (now - lastUpdate < MIN_UPDATE_INTERVAL_MS) {
        return;
      }
      lastLocationUpdate[socket.user.userId] = now;

      const locationPayload = { latitude, longitude, timestamp: timestamp || Date.now() };

      await redisClient.set(
        `rider:${socket.user.userId}:location`,
        JSON.stringify(locationPayload),
        { EX: 60 }
      );

      socket.to(`delivery:${orderId}`).emit("location:update", locationPayload);

      if (!lastFlushTime[orderId] || now - lastFlushTime[orderId] >= FLUSH_INTERVAL_MS) {
        lastFlushTime[orderId] = now;
        await LocationHistory.create({ riderId: socket.user.userId, orderId, latitude, longitude });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Clean up this rider's rate-limit entry to avoid an ever-growing object
      // (minor, but matters at scale with many riders connecting/disconnecting).
      delete lastLocationUpdate[socket.user.userId];
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

module.exports = { initSocket, getIO };