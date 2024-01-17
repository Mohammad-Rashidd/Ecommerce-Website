const UserModel = require("../models/userModel");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const mongoose = require("mongoose");
const path = require("path");
const flash = require("connect-flash");
const Swal = require("sweetalert2");

const predefinedAdminEmail = "rashid@gmail.com";
const predefinedAdminPassword = "12345";

module.exports = {
  adminLoginPage: (req, res) => {
    try {
      res.render("admin/login", { messages: req.flash() });
    } catch (error) {
      req.flash("error", "An error occurred");
      return res.redirect("/admin/login");
    }
  },

  adminLogin: (req, res) => {
    try {
      const { email, password } = req.body;

      if (
        email !== predefinedAdminEmail ||
        password !== predefinedAdminPassword
      ) {
        return res.json({
          success: false,
          errorMsg: "Invalid email or password",
        });
      }

      req.session.isAdminLoggedIn = true;
      return res.json({ success: true });
    } catch (error) {
      return res.json({ success: false, errorMsg: "An error occurred" });
    }
  },

  adminHomePage: (req, res) => {
    try {
      if (req.session.isAdminLoggedIn) {
        return res.render("admin/adminDashboard", { messages: req.flash() });
      } else {
        req.flash("error", "You must be logged in to access this page");
        return res.redirect("/admin/home");
      }
    } catch (error) {
      req.flash("error", "An error occurred");
      return res.redirect("/admin/home");
    }
  },

  adminLogout: (req, res) => {
    try {
      req.session.isAdminLoggedIn = false;
      req.flash("success", "Logout successful");
      return res.redirect("/admin/login");
    } catch (error) {
      req.flash("error", "An error occurred");
      return res.redirect("/admin/login");
    }
  },

  allusersPage: async (req, res) => {
    try {
      const users = await UserModel.find();
      res.render("admin/allUsers", { users });
    } catch (error) {
      req.flash("error", "Server Error");
      return res.redirect("/admin/home");
    }
  },

  blockUser: async (req, res) => {
    try {
      const userId = req.params.id;
      await UserModel.findByIdAndUpdate(userId, { blocked: true });
      res.redirect("/admin/allusers");
    } catch (error) {
      req.flash("error", "Error while blocking user");
      res.redirect("/admin/allusers");
    }
  },

  unblockUser: async (req, res) => {
    try {
      const userId = req.params.id;
      await UserModel.findByIdAndUpdate(userId, { blocked: false });
      res.redirect("/admin/allusers");
    } catch (error) {
      req.flash("error", "Error while Unblocking user");
      res.redirect("/admin/allusers");
    }
  },

  allOrders: async (req, res) => {
    try {
      let orderDetails = await Order.aggregate([
        {
          $project: {
            _id: 1,
            user_id: 1,
            items: 1,
            address: 1,
            payment_method: 1,
            status: 1,
            createdAt: 1,
          },
        },
        {
          $unwind: { path: "$items" },
        },
        {
          $lookup: {
            from: "products",
            localField: "items.product_id",
            foreignField: "_id",
            as: "products",
          },
        },
        {
          $unwind: { path: "$products" },
        },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "userName",
          },
        },
        {
          $unwind: { path: "$userName" },
        },
        {
          $project: {
            _id: 1,
            "userName.username": 1,
            "products.name": 1,
            items: 1,
            address: 1,
            payment_method: 1,
            status: 1,
            createdAt: 1,
          },
        },
      ]);

      orderDetails.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA;
      });

      orderDetails.forEach((obj) => {
        if (obj?.createdAt) {
          obj.createdAt = formatDate(obj.createdAt);
        }
      });

      function formatDate(date) {
        const options = {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        };
        return new Date(date).toLocaleDateString(undefined, options);
      }

      orderDetails.forEach((obj) => {
        if (obj.items && obj.items.quantity && obj.items.price) {
          obj.items.price = obj.items.quantity * obj.items.price;
        }
      });

      orderDetails.forEach((e) => {
        if (e.items.status === "cancelled") {
          e.items.cancelled = true;
          e.items.delivered = false;
          e.items.all = false;
        } else if (e.items.status === "Delivered") {
          e.items.cancelled = false;
          e.items.delivered = true;
          e.items.all = false;
        } else {
          e.items.all = true;
          e.items.cancelled = false;
          e.items.delivered = false;
        }
      });

      res.render("admin/allOrders", { orderDetails, messages: req.flash() });
    } catch (error) {
      req.flash("error", "Failed to fetch orders");
      return res.redirect("/admin/home");
    }
  },

  orderStatus: async (req, res) => {
    try {
      let product_id = new mongoose.Types.ObjectId(req.query.productId);
      let order_id = new mongoose.Types.ObjectId(req.query.orderId);
      let order = await Order.aggregate([
        {
          $match: {
            _id: order_id,
            "items.product_id": product_id,
          },
        },
        {
          $project: {
            _id: 1,
            user_id: 1,
            items: 1,
            address: 1,
            payment_method: 1,
            status: 1,
            createdAt: 1,
          },
        },
        {
          $unwind: { path: "$items" },
        },
        {
          $lookup: {
            from: "products",
            localField: "items.product_id",
            foreignField: "_id",
            as: "product",
          },
        },
        {
          $unwind: { path: "$product" },
        },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: { path: "$user" },
        },
        {
          $project: {
            _id: 1,
            "user.username": 1,
            "user._id": 1,
            "product.name": 1,
            items: 1,
            address: 1,
            payment_method: 1,
            status: 1,
            createdAt: 1,
          },
        },
      ]);

      order.forEach((obj) => {
        if (obj.items && obj.items.quantity && obj.items.price) {
          obj.items.price = obj.items.quantity * obj.items.price;
        }
      });

      let productIdToFind = req.query.productId;

      const showOrder = order.find(
        (order) => order.items.product_id.toString() === productIdToFind
      );

      if (showOrder.items.status === "Delivered") {
        showOrder.items.delivered = true;
        showOrder.items.pending = false;
        showOrder.items.out_forDelivery = false;
        showOrder.items.shipped = false;
        showOrder.items.confirmed = false;
      } else if (showOrder.items.status === "pending") {
        showOrder.items.delivered = false;
        showOrder.items.pending = true;
        showOrder.items.out_forDelivery = false;
        showOrder.items.shipped = false;
        showOrder.items.confirmed = false;
      } else if (showOrder.items.status === "confirmed") {
        showOrder.items.delivered = false;
        showOrder.items.pending = false;
        showOrder.items.out_forDelivery = false;
        showOrder.items.shipped = false;
        showOrder.items.confirmed = true;
      } else if (showOrder.items.status === "Shipped") {
        showOrder.items.delivered = false;
        showOrder.items.pending = false;
        showOrder.items.out_forDelivery = false;
        showOrder.items.shipped = true;
        showOrder.items.confirmed = false;
      } else if (showOrder.items.status === "Out for Delivery") {
        showOrder.items.delivered = false;
        showOrder.items.pending = false;
        showOrder.items.out_forDelivery = true;
        showOrder.items.shipped = false;
        showOrder.items.confirmed = false;
      }

      res.render("admin/orderStatus", { showOrder });
    } catch (error) {
      req.flash("error", "Failed to fetch order status");
      return res.redirect("/admin/home");
    }
  },

  updateStatus: async (req, res) => {
    try {
      let status = req.body.status;
      let order_id = req.params.id;
      let product_id = req.body.product_id;

      if (status === "Shipped") {
        const updateOrder = await Order.updateOne(
          {
            _id: order_id,
            "items.product_id": product_id,
          },
          {
            $set: {
              "items.$.status": status,
              "items.$.shipped_on": new Date(),
            },
          }
        );
        if (updateOrder) {
          req.flash("success", "Product status Updated Successfully");
          res.redirect("/admin/orders");
        }
      } else if (status === "Out for Delivery") {
        const updateOrder = await Order.updateOne(
          {
            _id: order_id,
            "items.product_id": product_id,
          },
          {
            $set: {
              "items.$.status": status,
              "items.$.out_for_delivery": new Date(),
            },
          }
        );
        if (updateOrder) {
          req.flash("success", "Product status Updated Successfully");
          res.redirect("/admin/orders");
        }
      } else if (status === "Delivered") {
        const updateOrder = await Order.updateOne(
          {
            _id: order_id,
            "items.product_id": product_id,
          },
          {
            $set: {
              "items.$.status": status,
              "items.$.delivered_on": new Date(),
            },
          }
        );
        if (updateOrder) {
          req.flash("success", "Product status Updated Successfully");
          res.redirect("/admin/orders");
        }
      } else {
        req.flash("error", "Product status Updated Failed");
        res.redirect("/admin/orders");
      }
    } catch (error) {
      req.flash("error", "Failed to update product status");
      return res.redirect("/admin/home");
    }
  },

  renderDashboard: async (req, res) => {
    try {
      let sales = await Order.aggregate([
        {
          $match: {
            "items.status": "Delivered",
          },
        },
      ]);

      let totalRevenue = 0;
      sales.forEach((sale) => {
        totalRevenue += sale.total_amount;
      });
      console.log("total revenue", totalRevenue);
      const currentYear = new Date().getFullYear();

      let yearsArray = [];
      for (let year = currentYear; year >= 2022; year--) {
        yearsArray.push(year);
      }

      const customers = (await UserModel.find()).length;
      const products = (await Product.find({ isDeleted: false })).length;

      let orders = await Order.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $unwind: "$items",
        },
        {
          $lookup: {
            from: "products",
            localField: "items.product_id",
            foreignField: "_id",
            as: "product",
          },
        },
        {
          $unwind: "$product",
        },
        {
          $project: {
            _id: 1,
            "user.username": 1,
            "product.name": 1,
            address: 1,
            items: 1,
            total_amount: 1,
            createdAt: 1,
            payment_method: 1,
          },
        },
      ]);

      const queryParams = req.query;

      if (queryParams.day !== undefined && queryParams.day !== "") {
        const day = new Date();
        orders = orders.filter((order) => {
          const orderDay = new Date(order.createdAt).setHours(0, 0, 0, 0);
          return orderDay >= day.setHours(0, 0, 0, 0);
        });
      }

      function getStartAndEndOfMonth() {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0
        );
        return { startOfMonth, endOfMonth };
      }

      if (queryParams.month !== undefined && queryParams.month !== "") {
        const { startOfMonth, endOfMonth } = getStartAndEndOfMonth();
        orders = orders.filter((order) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= startOfMonth && orderDate <= endOfMonth;
        });
      }

      function getStartAndEndOfWeek() {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        return { startOfWeek, endOfWeek };
      }

      if (queryParams.week !== undefined && queryParams.week !== "") {
        const { startOfWeek, endOfWeek } = getStartAndEndOfWeek();
        orders = orders.filter((order) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= startOfWeek && orderDate < endOfWeek;
        });
      }
      res.render("admin/adminDashboard", {
        customers,
        orders,
        products,
        totalRevenue,
        yearsArray,
      });
    } catch (error) {
      req.flash("error", "Failed to render dashboard");
      return res.redirect("/admin/home");
    }
  },

  getGraphDetails: async (req, res) => {
    try {
      const sales = await Order.aggregate([
        {
          $match: {
            "items.status": "Delivered",
          },
        },
      ]);
      const monthlyRevenue = Array(12).fill(0);
      let year = req.query.year;
      if (year) {
        year = parseInt(year);
      } else {
        year = new Date().getFullYear();
      }

      sales.forEach((sale) => {
        if (sale.items && sale.items.length > 0) {
          const saleYear = new Date(sale.createdAt).getFullYear();
          if (year === saleYear) {
            sale.items.forEach((item) => {
              const deliveredOn = new Date(item.delivered_on);
              const month = deliveredOn.getMonth();
              const totalAmount = sale.total_amount;
              monthlyRevenue[month] += totalAmount;
            });
          }
        }
      });
      res.json({
        success: true,
        data: monthlyRevenue,
      });
    } catch (error) {
      res.json({ success: false, errorMsg: "Failed to fetch graph details" });
    }
  },
};
