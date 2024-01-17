const express = require("express");
const router = express.Router();
const auth = require("../auth/adminAuth");
const controller = require("../controllers/salesController");

router.get("/", auth.isLoggedIn, controller.renderSalesReport);

router.post("/filter", auth.isLoggedIn, controller.filterData);

module.exports = router;
