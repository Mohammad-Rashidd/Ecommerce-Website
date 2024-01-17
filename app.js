require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const path = require("path");
const bcrypt = require("bcrypt");
const fs = require("fs");
const multer = require("multer");
const nodemailer = require("nodemailer");
const sharp = require("sharp");
const flash = require("connect-flash");
const Swal = require("sweetalert2");
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
const productRouter = require("./routes/productRouter");
const categoryRouter = require("./routes/categoryRouter");
const cartRouter = require("./routes/cartRouter");
const accountRouter = require("./routes/accountRouter");
const orderRouter = require("./routes/orderRouter");
const couponRouter = require("./routes/couponRouter");
const notificationRouter = require("./routes/notificationRouter");
const searchRouter = require("./routes/searchRouter");
const salesRouter = require("./routes/salesRouter");
const bannerRouter = require("./routes/bannerRouter");
const connectMongoDb = require("./db/connect");
const app = express();

(async () => {
  try {
    await connectMongoDb();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
})();

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(logger("dev"));
app.use(flash());
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));

app.use("/", userRouter);
app.use("/cart", cartRouter);
app.use("/my-account", accountRouter);
app.use("/orders", orderRouter);
app.use("/products", searchRouter);

app.use("/admin", adminRouter);
app.use("/admin/products", productRouter);
app.use("/admin/categories", categoryRouter);
app.use("/admin/coupons", couponRouter);
app.use("/admin/notifications", notificationRouter);
app.use("/admin/sales-report", salesRouter);
app.use("/admin/banners", bannerRouter);

const port = process.env.PORT || 4001;

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
