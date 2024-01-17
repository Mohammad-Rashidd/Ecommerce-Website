const express = require("express");
const router = express.Router();
const controller = require("../controllers/userController");
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

const auth = require("../auth/userAuth");
router.get("/", auth.isLoggedOut, controller.renderLandingPage);
router.get("/signup", auth.isLoggedOut, disableCache, controller.showSignup);
router.post("/signup", controller.registerUser);
router.get("/login", auth.isLoggedOut, disableCache, controller.showLogin);
router.post("/login", controller.loginUser);
router.get("/forgot", controller.showForgotPasswordPage);
router.post("/forgot", controller.sendResetPasswordOTP);
router.get("/logout", auth.isLoggedIn, controller.userLogout);
router.get("/reset", controller.showResetPasswordPage);
router.post("/reset", controller.resetPassword);
router.get("/verify-email", controller.showVerifyEmailPage);
router.post("/verify-email", controller.VerifyEmail);
router.get(
  "/userhome",
  auth.isLoggedIn,
  disableCache,
  controller.getUserHomePage
);
router.get(
  "/product/:productId",
  auth.isLoggedIn,
  controller.productDetailPage
);
router.get(
  "/product/add-to-wishlist/:id",
  auth.isLoggedIn,
  controller.addWishlist
);
router.post("/filter", auth.isLoggedIn, controller.filter);
module.exports = router;
