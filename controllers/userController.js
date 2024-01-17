const UserModel = require("../models/userModel");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Banner = require("../models/bannerModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const flash = require("connect-flash");
require("dotenv").config();
const mongoose = require("mongoose");

const generateOTP = (length) => {
  let OTP = "";
  const digits = "0123456789";

  for (let i = 0; i < length; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }

  return OTP;
};
let otpStorage = {};

module.exports = {
  renderLandingPage: async (req, res) => {
    try {
      const products = await Product.find({ isDeleted: false });

      if (!products) {
        console.log("Products not found");
      }

      let banners = await Banner.find({ banner_status: true });

      banners[0] = {
        new: "active",
        image: {
          filename: banners[0].image.filename,
        },
        reference: banners[0].reference,
      };

      res.render("home", { products, banners });
    } catch (error) {
      req.flash("error", "An error occurred while fetching products");
      res.redirect("/");
    }
  },

  showSignup: (req, res) => {
    try {
      res.render("user/signup", { messages: req.flash() });
    } catch (error) {
      req.flash("error", "An error occurred while rendering the signup page");
      res.redirect("/");
    }
  },

  showLogin: (req, res) => {
    try {
      res.render("user/login", { messages: req.flash() });
    } catch (error) {
      req.flash("error", "An error occurred while rendering the login page");
      res.redirect("/");
    }
  },

  registerUser: async (req, res) => {
    try {
      const { username, email, phone, password, confirmpassword } = req.body;

      const emailValidate = /^\S+@\S+\.\S+$/;
      const phoneValidate = /^\d{10}$/;
      const passwordValidate = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;

      if (!username || !email || !phone || !password || !confirmpassword) {
        req.flash("error", "All fields are required");
        return res.redirect("/signup");
      }

      if (!emailValidate.test(email)) {
        req.flash("error", "Invalid email address");
        return res.redirect("/signup");
      }

      if (!phoneValidate.test(phone)) {
        req.flash("error", "Invalid phone number (should be 10 digits)");
        return res.redirect("/signup");
      }

      if (password !== confirmpassword) {
        req.flash("error", "Password and confirm password do not match");
        return res.redirect("/signup");
      }

      if (!passwordValidate.test(password)) {
        req.flash(
          "error",
          "Password must be at least 8 characters long and include one uppercase letter, one lowercase letter, and one digit"
        );
        return res.redirect("/signup");
      }

      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        req.flash("error", "Email is already in use");
        return res.redirect("/signup");
      }

      const otpLength = 6;
      const otp = generateOTP(otpLength);

      otpStorage[email] = { otp, username, phone, password };

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      await transporter.sendMail({
        from: "achivallithode3@gmail.com",
        to: email,
        subject: "Registration OTP",
        text: `Your OTP for registration is ${otp}`,
      });

      res.redirect(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      req.flash("error", `Error signing up: ${error.message}`);
      return res.redirect("/signup");
    }
  },

  loginUser: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await UserModel.findOne({ email });

      if (!user) {
        req.flash("error", "Invalid email");
        return res.redirect("/login");
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        req.flash("error", "Invalid  password");
        return res.redirect("/login");
      }

      req.session.user_id = user._id;
      return res.redirect("/userhome");
    } catch (error) {
      req.flash("error", "An error occurred");
      return res.redirect("/login");
    }
  },

  showForgotPasswordPage: (req, res) => {
    try {
      res.render("user/forgot", { messages: req.flash() });
    } catch (error) {
      req.flash("error", "An error occurred");
      res.redirect("/forgot");
    }
  },

  sendResetPasswordOTP: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await UserModel.findOne({ email });
      if (!user) {
        req.flash("error", "User not found");
        return res.redirect("/forgot");
      }

      const otpLength = 6;
      const otp = generateOTP(otpLength);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const mailOptions = {
        from: "achivallithode3@gmail.com",
        to: email,
        subject: "Password Reset OTP",
        text: `Your OTP for password reset is: ${otp}`,
      };

      transporter.sendMail(mailOptions, async (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
          req.flash("error", "Error sending mail");
          return res.redirect("/forgot");
        }

        console.log("Email sent:", info.response);

        user.resetPasswordOTP = otp;
        await user.save();

        console.log(user);
        req.flash("success", "Otp sended successfully");
        res.redirect(`/reset?email=${email}`);
      });
    } catch (error) {
      req.flash("error", "Error sending OTP");
      return res.redirect("/forgot");
    }
  },

  showResetPasswordPage: async (req, res) => {
    try {
      const { email } = req.query;

      if (!email) {
        req.flash("error", "Email is required to reset the password");
        return res.redirect("/forgot");
      }

      const user = await UserModel.findOne({ email });

      if (!user) {
        req.flash("error", "User not found");
        return res.redirect("/forgot");
      }

      res.render("user/reset", {
        email,
        messages: req.flash(),
      });
    } catch (error) {
      req.flash("error", "Error rendering reset password page");
      return res.redirect("/forgot");
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      const user = await UserModel.findOne({ email });
      if (user.blocked) {
        req.flash("error", "Your account has been blocked");
        return res.redirect("/login");
      }

      if (!user) {
        req.flash("error", "User not found");
        return res.redirect(`/reset?email=${email}`);
      }

      if (!user.resetPasswordOTP) {
        req.flash("error", "No OTP generated");
        return res.redirect(`/reset?email=${email}`);
      }

      if (user.resetPasswordOTP !== otp) {
        req.flash("error", "Invalid OTP");
        return res.redirect(`/reset?email=${email}`);
      }

      const validatepass = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
      if (!validatepass.test(newPassword)) {
        req.flash(
          "error",
          "Password must be at least 8 characters long and include one uppercase letter, one lowercase letter, and one digit"
        );
        return res.redirect(`/reset?email=${email}`);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      user.resetPasswordOTP = null;
      await user.save();

      req.flash("success", "Password reset successfully");
      return res.redirect("/login");
    } catch (error) {
      req.flash("error", "Error resetting password");
      return res.redirect(`/reset?email=${email}`);
    }
  },

  showVerifyEmailPage: (req, res) => {
    const { email } = req.query;

    if (email) {
      res.render("user/verifyEmail", { email, messages: req.flash() });
    } else {
      res.send("Invalid request");
    }
    try {
      const { email } = req.query;

      if (email) {
        res.render("user/verifyEmail", { email, messages: req.flash() });
      } else {
        res.send("Invalid request");
      }
    } catch (error) {
      req.flash("error", "An error occurred");
      res.redirect("/login");
    }
  },

  VerifyEmail: async (req, res) => {
    const { email, otp } = req.body;
    try {
      const storedData = otpStorage[email];

      if (!storedData) {
        console.log("User data not found");
        res.send("User data not found");
        return;
      }

      if (otp == storedData.otp) {
        const hashedPassword = await bcrypt.hash(storedData.password, 10);
        const newUser = new UserModel({
          email,
          username: storedData.username,
          password: hashedPassword,
          phone: storedData.phone,
        });

        await newUser.save();

        delete otpStorage[email];
        req.flash("success", "Registration successful");
        res.redirect("/login");
      } else {
        req.flash("error", "Invalid OTP");
        return res.redirect(`/verify-email?email=${email}`);
      }
    } catch (error) {
      req.flash("error", "Internal Server Error");
      return res.redirect(`/verify-email?email=${email}`);
    }
  },

  getUserHomePage: async (req, res) => {
    try {
      const page = req.query.page || 1;
      const limit = 12;

      const category = req.query.category;
      const filter = { isDeleted: false };
      if (category) {
        filter.category = category;
      }

      const search = req.query.search;
      if (search) {
        filter.name = { $regex: new RegExp(search, "i") };
      }

      const products = await Product.find(filter)
        .skip((page - 1) * limit)
        .limit(limit);

      const totalProductsCount = await Product.countDocuments(filter);
      const totalPages = Math.ceil(totalProductsCount / limit);

      let banners = await Banner.find({ banner_status: true });

      banners[0] = {
        new: "active",
        image: {
          filename: banners[0].image.filename,
        },
        reference: banners[0].reference,
      };
      const categories = await Category.find({ isDeleted: false });
      res.render("user/userHome", {
        products,
        categories,
        banners,
        totalPages,
        currentPage: page,
        messages: req.flash(),
      });
    } catch (error) {
      req.flash("error", "An error occurred while loading the page");
      return res.redirect("/login");
    }
  },

  productDetailPage: async (req, res) => {
    try {
      const productId = req.params.productId;

      const product = await Product.findById(productId);

      if (!product) {
        req.flash("error", "Product not found");
        return res.redirect("/userHome");
      }

      const userId = req.session.user_id;
      if (!userId) {
        return res.redirect("/login");
      }

      const product_id = new mongoose.Types.ObjectId(productId);
      const user1 = await UserModel.findOne({
        _id: userId,
        "wishlist.product_id": product_id,
      });

      if (user1) {
        product.wish = false;
      } else {
        product.wish = true;
      }

      const categories = await Category.find({ isDeleted: false });
      res.render("user/productDetails", { product, categories });
    } catch (error) {
      req.flash("error", "An error occurred");
      return res.redirect("/login");
    }
  },

  addWishlist: async (req, res) => {
    try {
      const product_id = req.params.id;
      const user_id = req.session.user_id;

      const user = await UserModel.findOne({
        _id: user_id,
        "wishlist.product_id": product_id,
      });

      if (user) {
        const wishlist = {
          $pull: {
            wishlist: {
              product_id: product_id,
            },
          },
        };

        const updateWishlist = await UserModel.findOneAndUpdate(
          { _id: user_id },
          wishlist,
          { new: true }
        );

        if (updateWishlist) {
          res.json({
            success: false,
          });
        }
      } else {
        const wishlist = {
          $push: {
            wishlist: {
              product_id: product_id,
            },
          },
        };

        const updateWishlist = await UserModel.findOneAndUpdate(
          { _id: user_id },
          wishlist,
          { new: true }
        );

        if (updateWishlist) {
          res.json({
            success: true,
          });
        }
      }
    } catch (error) {
      req.flash("error", "An error occurred while updating wishlist");
      return res.redirect("/userHome");
    }
  },

  filter: async (req, res) => {
    try {
      const { from, to, category, minPrice, maxPrice } = req.body;
      const page = req.query.page || 1;
      const limit = 12;

      const filterConditions = {
        isDeleted: false,
      };

      if (from && to) {
        filterConditions.createdAt = {
          $gte: new Date(from),
          $lte: new Date(to),
        };
      }

      if (category) {
        const categoryObject = await Category.findOne({ name: category });
        if (categoryObject) {
          filterConditions.category = categoryObject._id;
        }
      }

      if (minPrice) {
        filterConditions.price = { $gte: parseFloat(minPrice) };
      }

      if (maxPrice) {
        if (filterConditions.price) {
          filterConditions.price.$lte = parseFloat(maxPrice);
        } else {
          filterConditions.price = { $lte: parseFloat(maxPrice) };
        }
      }

      const totalProductsCount = await Product.countDocuments(filterConditions);
      const totalPages = Math.ceil(totalProductsCount / limit);

      const filteredProducts = await Product.find(filterConditions)
        .skip((page - 1) * limit)
        .limit(limit);

      const categories = await Category.find({ isDeleted: false });
      let banners = await Banner.find({ banner_status: true });

      banners[0] = {
        new: "active",
        image: {
          filename: banners[0].image.filename,
        },
        reference: banners[0].reference,
      };

      res.render("user/userHome", {
        products: filteredProducts,
        categories,
        totalPages,
        currentPage: page,
        banners,
        messages: req.flash(),
      });
    } catch (error) {
      req.flash("error", "An error occurred while filtering products");
      return res.redirect("/userHome");
    }
  },

  userLogout: async (req, res) => {
    try {
      req.session.user_id = null;
      req.flash("success", "Logout successful");
      res.redirect("/login");
    } catch (error) {
      req.flash("error", error);
      return res.redirect("/userHome");
    }
  },
};
