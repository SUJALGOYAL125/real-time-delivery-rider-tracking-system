require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const riderRoutes = require("./routes/riderRoutes");
const { initSocket } = require("./config/socket");
const { connectRedis } = require("./config/redis");

const app = express();
const server = http.createServer(app);

// Helmet sets ~15 security-related HTTP headers automatically
// (e.g., prevents clickjacking, disables browser MIME-sniffing).
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
}));

connectDB();
connectRedis();
initSocket(server);

app.use(express.json());

// Strict limiter for auth — prevents brute-force login/registration attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many attempts, please try again later" },
});

// A looser general limiter for everything else.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests, please try again later" },
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/orders", generalLimiter, orderRoutes);
app.use("/api/riders", generalLimiter, riderRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));