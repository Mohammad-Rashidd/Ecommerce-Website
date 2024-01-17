const express = require("express");
const auth = require("../auth/adminAuth");
const { upload } = require("../middlewares/upload");
const router = express.Router();

const controller = require("../controllers/bannerController");

router.get("/", auth.isLoggedIn, controller.renderBannerPage);

router.get("/new-banner", auth.isLoggedIn, controller.renderNewBannerPage);

router.post(
  "/create-banner",
  auth.isLoggedIn,
  upload.fields([{ name: "banner_image" }]),
  controller.createNewBanner
);

router.get("/edit_banner/:id", auth.isLoggedIn, controller.renderEditBanner);

router.post(
  "/edit-banner/:id",
  auth.isLoggedIn,
  upload.fields([{ name: "banner_image" }]),
  controller.updateBanner
);

router.get("/delete-banner", auth.isLoggedIn, controller.deleteBanner);

module.exports = router;
