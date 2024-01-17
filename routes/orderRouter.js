const express = require("express");
const router = express.Router();
const controller = require("../controllers/orderController");
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

router.get("/", auth.isLoggedIn, controller.renderOrders);
router.get(
  "/order-details/:id",
  auth.isLoggedIn,
  controller.renderOrderDetails
);
router.get(
  "/cancel_order/:product_id/:order_id",
  auth.isLoggedIn,
  controller.cancelOrder
);
router.get(
  "/cancel_all_order/:order_id",
  auth.isLoggedIn,
  controller.cancelAllOrder
);
router.get("/return-order", auth.isLoggedIn, controller.returnOrder);
router.post("/order-return", auth.isLoggedIn, controller.orderReturn);
router.get("/get-invoice", auth.isLoggedIn, controller.getInvoice);

module.exports = router;
