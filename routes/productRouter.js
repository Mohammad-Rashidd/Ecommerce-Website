const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
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

router.get("/", auth.isLoggedIn, productController.allProductsPage);
router.get(
  "/addproduct",
  auth.isLoggedIn,
  disableCache,
  productController.addproductpage
);
router.post("/addproduct", productController.addProduct);
router.get(
  "/editproduct/:id",
  auth.isLoggedIn,
  productController.editProductPage
);
router.post("/editproduct/:id", auth.isLoggedIn, productController.editProduct);
router.get(
  "/deleteproduct/:id",
  auth.isLoggedIn,
  productController.deleteProduct
);

module.exports = router;
