const express = require("express");
const router = express.Router();
const controller = require("../controllers/accountController");
const auth = require("../auth/userAuth");
const session = require("express-session");
require("dotenv").config();

router.use(
  session({
    secret: process.env.SESSIONSECRET,
    resave: false,
    saveUninitialized: true,
  })
);

const disableCache = (req, res, next) => {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  next();
};
router.use(disableCache);
router.get("/", auth.isLoggedIn, controller.renderMyAccount);
router.get("/edit-details/:id", auth.isLoggedIn, controller.renderEditPage);
router.post("/update-detail/:id", auth.isLoggedIn, controller.updateDetails);
router.post("/verify/:id", auth.isLoggedIn, controller.verifyPass);
router.post("/update_pass/:id", auth.isLoggedIn, controller.updatePass);
router.get("/my-address", auth.isLoggedIn, controller.renderAddress);
router.post("/my-address/new-address", auth.isLoggedIn, controller.addAddress);
router.get(
  "/my-address/edit-address/:id",
  auth.isLoggedIn,
  controller.renderEditAddress
);
router.post(
  "/my-address/update-address/:id",
  auth.isLoggedIn,
  controller.updateAddress
);
router.get(
  "/my-address/delete-address/:id",
  auth.isLoggedIn,
  controller.deleteAddress
);
router.post(
  "/checkout/new-address",
  auth.isLoggedIn,
  controller.add_new_address_checkout
);
router.get("/wishlist", auth.isLoggedIn, controller.renderWishlist);
router.get(
  "/remove-from-wishlist/:id",
  auth.isLoggedIn,
  controller.removeWishlist
);


module.exports = router;
