const express = require("express");
const router = express.Router();
const auth = require("../auth/adminAuth");
const controller = require("../controllers/notificationController");

router.get("/", auth.isLoggedIn, controller.getNotifications);

router.get("/approve/:id", auth.isLoggedIn, controller.aproveRequest);

router.get("/decline/:id", auth.isLoggedIn, controller.declineRequest);

module.exports = router;
