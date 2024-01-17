const express = require("express");
const router = express.Router();
const controller = require("../controllers/cartController");
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

router.get("/", auth.isLoggedIn, controller.renderCart);
router.get("/add-to-cart/:id", auth.isLoggedIn, controller.addToCart);
router.get("/add-quantity/:id", auth.isLoggedIn, controller.incrementQuantity);
router.get(
  "/minus-quantity/:id",
  auth.isLoggedIn,
  controller.decrementQuantity
);
router.get(
  "/remove-from-cart/:id",
  auth.isLoggedIn,
  controller.removeProductFromCart
);
router.get(
  "/checkout",
  auth.isLoggedIn,
  controller.verifyOrder,
  controller.renderCheckout
);
router.post("/place-order", auth.isLoggedIn, controller.placeOrder);
router.post("/verify-payment", auth.isLoggedIn, controller.verifyPaymenet);
router.get("/order-success", auth.isLoggedIn, controller.orderSuccess);

module.exports = router;
