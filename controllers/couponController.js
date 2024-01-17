const Coupon = require("../models/couponModel");
const mongoose = require("mongoose");

module.exports = {
  renderCouponPage: async (req, res) => {
    try {
      const coupons = await Coupon.find({ is_delete: false });

      const formattedCoupons = coupons.map((data) => {
        const formattedStartDate = new Date(
          data.start_date
        ).toLocaleDateString();
        const formattedExpDate = new Date(data.exp_date).toLocaleDateString();

        return {
          ...data.toObject(),
          start_date: formattedStartDate,
          exp_date: formattedExpDate,
        };
      });

      res.render("coupon/allCoupon", { formattedCoupons });
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  renderNewCoupon: async (req, res) => {
    try {
      res.render("coupon/newCoupon");
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  createNewCoupon: async (req, res) => {
    try {
      const coupon = new Coupon({
        coupon_code: req.body.coupon_code,
        discount: req.body.discount,
        start_date: req.body.start_date,
        exp_date: req.body.exp_date,
        max_count: req.body.max_count,
        min_amount: req.body.min_amount,
        used_count: req.body.used_count,
        description: req.body.description,
      });

      const createCoupon = await coupon.save();

      if (createCoupon) {
        res.json({ success: true });
      }
    } catch (error) {
      res.json({ success: false, error: "Internal Server Error" });
    }
  },

  renderEditCoupon: async (req, res) => {
    try {
      let coupon = await Coupon.findById(req.params.id);

      coupon = coupon.toObject();

      function formatDateToDDMMYYYY(dateString) {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
      }
      coupon.start_date = formatDateToDDMMYYYY(coupon.start_date);
      coupon.exp_date = formatDateToDDMMYYYY(coupon.exp_date);
      res.render("coupon/editCoupon", { coupon });
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  updateCoupon: async (req, res) => {
    try {
      const id = req.params.id;
      const data = req.body;
      const coupon = await Coupon.findByIdAndUpdate({ _id: id }, data, {
        new: true,
      });

      if (coupon) {
        res.json({
          success: true,
        });
      }
    } catch (error) {
      res.json({ success: false, error: "Internal Server Error" });
    }
  },

  deleteCoupen: async (req, res) => {
    try {
      const id = new mongoose.Types.ObjectId(req.params.id);
      const coupon = await Coupon.updateOne({ _id: id }, { is_delete: true });

      if (coupon) {
        res.json({
          success: true,
        });
      }
    } catch (error) {
      res.json({ success: false, error: "Internal Server Error" });
    }
  },
};
