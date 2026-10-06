const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const authenticate = require("../middleware/auth");
const authorize = require("../middleware/role");

router.post("/", authenticate, authorize("customer"), orderController.createOrder);
router.get("/", authenticate, authorize("customer"), orderController.getMyOrders);
router.get("/:id", authenticate, orderController.getOrderById);

module.exports = router;