const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
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

router.get("/", auth.isLoggedIn, categoryController.allCategoriesPage);
router.get("/addcategory", auth.isLoggedIn, categoryController.addCategoryPage);
router.post("/addcategory", auth.isLoggedIn, categoryController.addCategory);
router.get(
  "/editcategory/:id",
  auth.isLoggedIn,
  categoryController.editCategoryPage
);
router.post(
  "/editcategory/:id",
  auth.isLoggedIn,
  categoryController.editCategory
);
router.get(
  "/deletecategory/:id",
  auth.isLoggedIn,
  categoryController.deleteCategory
);

module.exports = router;
