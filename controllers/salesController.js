const Order = require("../models/orderModel");

const sales_report = async () => {
  try {
    const salesReport = await Order.aggregate([
      {
        $match: {
          "items.status": "Delivered",
        },
      },
      {
        $unwind: "$items",
      },
      {
        $match: {
          "items.status": "Delivered",
        },
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
          from: "categories",
          localField: "product.category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: "$category",
      },
      {
        $project: {
          "product.name": 1,
          "user.username": 1,
          "items.delivered_on": 1,
          createdAt: 1,
          "items.quantity": 1,
          "items.price": 1,
          "category.name": 1,
          payment_method: 1,
        },
      },
    ]);

    return salesReport;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  renderSalesReport: async (req, res) => {
    try {
      const salesReport = await sales_report();
      salesReport.forEach((sales) => {
        sales.createdAt = sales.createdAt.toLocaleDateString();
        sales.items.delivered_on =
          sales.items.delivered_on.toLocaleDateString();
      });

      res.render("admin/salesReport", { salesReport });
    } catch (error) {
      req.flash("error", "Failed to fetch sales report");
      res.redirect("/admin/home");
    }
  },

  filterData: async (req, res) => {
    try {
      let salesReport = await sales_report();

      if (req.body.from !== "") {
        const inputDate = new Date(req.body.from);
        salesReport = salesReport.filter(
          (data) => data.items.delivered_on >= inputDate
        );
      }

      if (req.body.to !== "") {
        const inputDate = new Date(req.body.to);
        salesReport = salesReport.filter(
          (data) => data.items.delivered_on <= inputDate
        );
      }
      if (req.body.payment_method !== "") {
        if (req.body.payment_method === "COD") {
          salesReport = salesReport.filter((data) => {
            return data.payment_method === "COD";
          });
        } else if (req.body.payment_method === "Online Payment") {
          salesReport = salesReport.filter((data) => {
            return data.payment_method === "Online Payment";
          });
        }
      }

      salesReport.forEach((sales) => {
        sales.createdAt = sales.createdAt.toLocaleDateString();
        sales.items.delivered_on =
          sales.items.delivered_on.toLocaleDateString();
      });

      res.render("admin/salesReport", { salesReport });
    } catch (error) {
      req.flash("error", "Failed to filter sales report");
      res.redirect("/admin/home");
    }
  },
};
