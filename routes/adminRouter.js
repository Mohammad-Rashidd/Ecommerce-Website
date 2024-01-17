const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
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

const auth = require("../auth/adminAuth");

router.get("/", auth.isLoggedOut, disableCache, adminController.adminLoginPage);
router.get(
  "/login",
  auth.isLoggedOut,
  disableCache,
  adminController.adminLoginPage
);
router.post("/login", adminController.adminLogin);
router.get("/home", auth.isLoggedIn, adminController.adminHomePage);
router.get("/allusers", auth.isLoggedIn, adminController.allusersPage);
router.get("/block/:id", adminController.blockUser);
router.get("/unblock/:id", adminController.unblockUser);
router.get("/orders", auth.isLoggedIn, adminController.allOrders);
router.get("/manage-order", auth.isLoggedIn, adminController.orderStatus);
router.post("/changeStatus/:id", adminController.updateStatus);
router.get("/dash", auth.isLoggedIn, adminController.renderDashboard);
router.get("/get-sales", auth.isLoggedIn, adminController.getGraphDetails);
router.get(
  "/logout",
  auth.isLoggedIn,
  disableCache,
  adminController.adminLogout
);

module.exports = router;
