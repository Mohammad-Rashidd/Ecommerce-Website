const express = require("express");
const router = express.Router();
const auth = require("../auth/adminAuth");
const controller = require("../controllers/couponController");

router.get("/", auth.isLoggedIn, controller.renderCouponPage);
router.get("/new-coupon", auth.isLoggedIn, controller.renderNewCoupon);
router.post("/create-coupon", auth.isLoggedIn, controller.createNewCoupon);
router.get("/edit_coupon/:id", auth.isLoggedIn, controller.renderEditCoupon);
router.post("/edit-coupon/:id", auth.isLoggedIn, controller.updateCoupon);
router.get("/delete-coupon/:id", auth.isLoggedIn, controller.deleteCoupen);

module.exports = router;
