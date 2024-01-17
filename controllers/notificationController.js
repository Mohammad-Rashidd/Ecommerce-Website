const Return = require("../models/returnModel");
const mongoose = require("mongoose");

module.exports = {
  getNotifications: async (req, res) => {
    try {
      const returns = await Return.aggregate([
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
          $lookup: {
            from: "products",
            localField: "product_id",
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
            "user._id": 1,
            "user.username": 1,
            "product.name": 1,
            order_id: 1,
            status: 1,
            comment: 1,
            reason: 1,
          },
        },
      ]);

      for (let request of returns) {
        if (request.status !== "pending") {
          request.return = true;
        } else {
          request.return = false;
        }
      }

      res.render("admin/notification", { returns });
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  aproveRequest: async (req, res) => {
    try {
      const return_id = req.params.id;
      const approvedReturn = await Return.findByIdAndUpdate(
        { _id: return_id },
        { $set: { status: "approved" } },
        { new: true }
      );

      if (approvedReturn) {
        res.json({
          success: true,
        });
      } else {
        res.json({
          success: false,
          error: "Failed to approve return request",
        });
      }
    } catch (error) {
      res.json({
        success: false,
        error: "Internal Server Error",
      });
    }
  },

  declineRequest: async (req, res) => {
    try {
      const return_id = req.params.id;
      const declinedReturn = await Return.findByIdAndUpdate(
        { _id: return_id },
        { $set: { status: "declined" } },
        { new: true }
      );

      if (declinedReturn) {
        res.json({
          success: true,
        });
      } else {
        res.json({
          success: false,
          error: "Failed to decline return request",
        });
      }
    } catch (error) {
      res.json({
        success: false,
        error: "Internal Server Error",
      });
    }
  },
};
