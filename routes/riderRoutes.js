const express = require("express");
const router = express.Router();
const riderController = require("../controllers/riderController");
const authenticate = require("../middleware/auth");
const authorize = require("../middleware/role");

router.post("/setup", authenticate, authorize("rider"), riderController.setupRiderProfile);
router.patch("/availability", authenticate, authorize("rider"), riderController.updateAvailability);
router.get("/nearby", authenticate, riderController.findNearbyRiders);
router.post("/orders/:orderId/accept", authenticate, authorize("rider"), riderController.acceptOrder);

module.exports = router;