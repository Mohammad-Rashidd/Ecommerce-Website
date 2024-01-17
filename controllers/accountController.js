const UserModel = require("../models/userModel");
const Product = require("../models/productModel");
const Address = require("../models/addressModel");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

module.exports = {
  renderMyAccount: async (req, res) => {
    try {
      const userId = req.session.user_id;
      const userData = await UserModel.findById(userId);
      res.render("myAccount/my-account", { userData });
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  renderEditPage: async (req, res) => {
    try {
      const userData = await UserModel.findById(req.params.id);
      res.render("myAccount/edit-user", { userData });
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  updateDetails: async (req, res) => {
    try {
      const id = req.params.id;
      const data = req.body;

      const update = await UserModel.findByIdAndUpdate({ _id: id }, data, {
        new: true,
      });

      res.json({
        success: true,
      });
    } catch (error) {
      res.json({
        success: false,
        error: "Internal Server Error",
      });
    }
  },

  verifyPass: async (req, res) => {
    try {
      const id = req.params.id;
      const user = await UserModel.findById({ _id: id });

      const checkPass = await bcrypt.compare(req.body.password, user.password);
      if (checkPass) {
        res.json({
          success: true,
        });
      } else {
        res.json({
          success: false,
          msg: "password does not matching!",
        });
      }
    } catch (error) {
      res.json({
        success: false,
        error: "Internal Server Error",
      });
    }
  },

  updatePass: async (req, res) => {
    try {
      const id = req.params.id;
      const password = req.body.user_password;
      const newPass = await bcrypt.hash(password, 10);
      const updatePass = await UserModel.updateOne(
        { _id: id },
        { password: newPass }
      );

      if (!updatePass) {
        req.flash("error", "Password not updated");
        res.json({
          success: false,
        });
      }

      req.flash("success", "Password Updated Successfully");
      res.json({
        success: true,
      });
    } catch (error) {
      res.json({
        success: false,
        error: "Internal Server Error",
      });
    }
  },

  renderAddress: async (req, res) => {
    try {
      const id = req.session.user_id;
      const userData = await UserModel.findById(id);

      const address = await Address.find({ user_id: id, isDeleted: false });
      res.render("myAccount/myAddress", { address, userData });
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  addAddress: async (req, res) => {
    try {
      const {
        address_name,
        phone,
        house_name,
        area_street,
        locality,
        town,
        state,
        pincode,
        landmark,
        alternate_phone,
        user_id,
        address_type,
      } = req.body;

      if (!address_name || !user_id) {
        throw new Error("address_name and user_id are required fields");
      }

      await Address.create({
        address_name,
        user_id,
        phone,
        house_name,
        area_street,
        locality,
        town,
        state,
        pincode,
        landmark,
        alternate_phone,
        address_type,
      });

      res.redirect("/my-account/my-address");
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  renderEditAddress: async (req, res) => {
    try {
      const id = req.params.id;
      const address = await Address.findOne({ _id: id });
      res.render("myAccount/editAddress", { address });
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  updateAddress: async (req, res) => {
    try {
      const id = req.params.id;
      const data = req.body;
      const updateAddress = await Address.findOneAndUpdate({ _id: id }, data, {
        new: true,
      });

      res.redirect("/my-account/my-address");
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  deleteAddress: async (req, res) => {
    try {
      const addressId = req.params.id;

      const product = await Address.findByIdAndUpdate(
        addressId,
        { isDeleted: true },
        { new: true }
      );
      res.json({
        status: true,
      });
    } catch (error) {
      res.json({
        status: false,
        error: "Internal Server Error",
      });
    }
  },

  add_new_address_checkout: async (req, res) => {
    try {
      const {
        address_name,
        phone,
        house_name,
        area_street,
        locality,
        town,
        state,
        pincode,
        landmark,
        alternate_phone,
        user_id,
        address_type,
      } = req.body;

      if (!address_name || !user_id) {
        throw new Error("address_name and user_id are required fields");
      }

      await Address.create({
        address_name,
        user_id,
        phone,
        house_name,
        area_street,
        locality,
        town,
        state,
        pincode,
        landmark,
        alternate_phone,
        address_type,
      });

      res.redirect("/cart/checkout");
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  renderWishlist: async (req, res) => {
    try {
      const userid = req.session.user_id;

      const user_id = new mongoose.Types.ObjectId(userid);
      const wishList = await UserModel.aggregate([
        { $match: { _id: user_id } },
        { $project: { wishlist: 1, _id: 0 } },
        { $unwind: { path: "$wishlist" } },
        {
          $lookup: {
            from: "products",
            localField: "wishlist.product_id",
            foreignField: "_id",
            as: "products",
          },
        },
        { $unwind: { path: "$products" } },
      ]);

      res.render("myAccount/wishlist", { wishList });
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  removeWishlist: async (req, res) => {
    try {
      const user_id = req.session.user_id;
      const product_id = req.params.id;
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

      if (!updateWishlist) {
        res.json({
          success: false,
        });
      }

      res.json({
        success: true,
      });
    } catch (error) {
      res.json({
        success: false,
        error: "Internal Server Error",
      });
    }
  },
};
