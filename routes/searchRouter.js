const express = require("express");
const auth = require("../auth/userAuth");
const router = express.Router();

const controller = require("../controllers/searchController");

router.get("/", auth.isLoggedIn, controller.getSearchedProducts);
router.get("/search", auth.isLoggedIn, controller.searchProduct);

module.exports = router;
