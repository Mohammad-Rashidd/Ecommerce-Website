const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const mongoose = require("mongoose");
const UserModel = require("../models/userModel");
const Return = require("../models/returnModel");
const fs = require("fs");
const ejs = require("ejs");
const pdf = require("pdf-creator-node");

module.exports = {
  renderOrders: async (req, res) => {
    try {
      const userId = req.session.user_id;
      const user_id = new mongoose.Types.ObjectId(userId);

      let orderDetails = await Order.aggregate([
        {
          $match: {
            user_id: user_id,
          },
        },
        {
          $project: {
            _id: 1,
            items: 1,
            address: 1,
            payment_method: 1,
            status: 1,
            createdAt: 1,
          },
        },
      ]);
      orderDetails = orderDetails.reverse();

      res.render("user/order", { orderDetails });
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  renderOrderDetails: async (req, res) => {
    try {
      const order_id = new mongoose.Types.ObjectId(req.params.id);
      let orderDetails = await Order.aggregate([
        {
          $match: {
            _id: order_id,
          },
        },
        {
          $unwind: "$items",
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
          $unwind: "$products",
        },
      ]);

      for (const order of orderDetails) {
        switch (order.items.status) {
          case "confirmed":
            order.items.track = 15;
            order.items.ordered = true;
            order.items.delivered = false;
            order.items.cancelled = false;
            order.items.shipped = false;
            order.items.outdelivery = false;
            order.items.return = false;
            order.items.inReturn = false;
            order.items.needHelp = true;
            break;
          case "Shipped":
            order.items.track = 38;
            order.items.ordered = true;
            order.items.delivered = false;
            order.items.cancelled = false;
            order.items.shipped = true;
            order.items.outdelivery = false;
            order.items.return = false;
            order.items.inReturn = false;
            order.items.needHelp = true;
            break;
          case "Out for Delivery":
            order.items.track = 65;
            order.items.ordered = true;
            order.items.delivered = false;
            order.items.cancelled = false;
            order.items.shipped = true;
            order.items.outdelivery = true;
            order.items.return = false;
            order.items.inReturn = false;
            order.items.needHelp = true;
            break;
          case "Delivered":
            order.items.track = 100;
            order.items.ordered = false;
            order.items.cancelled = false;
            order.items.shipped = true;
            order.items.delivered = true;
            order.items.outdelivery = true;
            order.items.return = true;
            order.items.inReturn = false;
            order.items.needHelp = false;
            break;
          case "cancelled":
            order.items.track = 0;
            order.items.ordered = false;
            order.items.cancelled = true;
            order.items.delivered = false;
            order.items.shipped = false;
            order.items.outdelivery = false;
            order.items.return = false;
            order.items.inReturn = false;
            order.items.needHelp = true;
            break;
          default:
            order.items.track = 0;
            order.items.pending = true;
            order.items.inReturn = false;
        }
      }

      const isInReturn = await Return.findOne({ order_id: order_id });
      if (isInReturn) {
        for (const order of orderDetails) {
          const orderProductId = (await order.items.product_id).toString();
          const returnProductId = (await isInReturn.product_id).toString();

          if (orderProductId === returnProductId) {
            order.items.inReturn = true;
            order.items.return = false;
            order.items.needHelp = false;
            order.items.status = isInReturn.status;
          }
        }
      }
      res.render("user/order-details", { orderDetails });
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  cancelOrder: async (req, res) => {
    try {
      const user_id = req.session.user_id;
      const product_id = new mongoose.Types.ObjectId(req.params.product_id);
      const order_id = new mongoose.Types.ObjectId(req.params.order_id);
      const user = await UserModel.findById(user_id);

      const checkCoupen = await Order.aggregate([
        {
          $match: {
            coupon: { $exists: true },
            _id: order_id,
            "items.product_id": product_id,
          },
        },
      ]);
      if (checkCoupen.length > 0) {
        res.json({
          success: false,
        });
      } else {
        const updateOrder = await Order.updateOne(
          {
            _id: order_id,
            "items.product_id": product_id,
          },
          {
            $set: {
              "items.$.status": "cancelled",
              "items.$.cancelled_on": new Date(),
            },
          }
        );

        if (updateOrder) {
          const order = await Order.findById({ _id: order_id });

          if (
            order.payment_method === "Online Payment" ||
            order.payment_method === "wallet"
          ) {
            const price = await Order.aggregate([
              {
                $match: {
                  _id: order_id,
                  "items.product_id": product_id,
                },
              },
              {
                $unwind: { path: "$items" },
              },
              {
                $match: {
                  "items.product_id": new mongoose.Types.ObjectId(product_id),
                },
              },
              {
                $project: {
                  _id: 0,
                  price: "$items.price",
                },
              },
            ]);

            const wallet = price[0].price;

            const updateWallet = await UserModel.findByIdAndUpdate(
              { _id: user_id },
              {
                $set: {
                  user_wallet: parseFloat(user.user_wallet) + parseInt(wallet),
                },
              }
            );

            const newHistoryItem = {
              amount: parseInt(wallet),
              status: "Credit",
              time: Date.now(),
            };

            const MarkWallet = await UserModel.findByIdAndUpdate(
              { _id: user_id },
              { $push: { wallet_history: newHistoryItem } }
            );
          }

          const quantity = await Order.aggregate([
            {
              $match: {
                _id: order_id,
                "items.product_id": product_id,
              },
            },
            {
              $unwind: { path: "$items" },
            },
            {
              $match: {
                "items.product_id": product_id,
              },
            },
            {
              $project: {
                _id: 0,
                quantity: "$items.quantity",
              },
            },
          ]);

          const count = quantity[0].quantity;
          const updateStock = await Product.updateOne(
            { _id: product_id },
            { $inc: { stock: count } }
          );

          res.json({
            success: true,
          });
        }
      }
    } catch (error) {
      res.json({
        success: false,
        error:
          "An error occurred while cancelling the order. Please try again.",
      });
    }
  },

  cancelAllOrder: async (req, res) => {
    try {
      const user_id = req.session.user_id;
      const user = await UserModel.findById(user_id);
      const order_id = req.params.order_id;

      const updateOrder = await Order.updateOne(
        { _id: order_id },
        {
          $set: {
            "items.$[elem].status": "cancelled",
            "items.$[elem].cancelled_on": new Date(),
            status: "cancelled",
          },
        },
        {
          arrayFilters: [{ "elem.status": { $ne: "cancelled" } }],
        }
      );

      if (updateOrder) {
        const order = await Order.findById({ _id: order_id });

        const items = await Order.find({ _id: order_id }, { _id: 0, items: 1 });

        const arrayItem = items[0].items;
        for (const item of arrayItem) {
          const product_id = item.product_id;
          const Quantity = item.quantity;
          await Product.findByIdAndUpdate(
            { _id: product_id },
            { $inc: { stock: Quantity } }
          );
        }

        if (
          order.payment_method === "Online Payment" ||
          order.payment_method === "wallet"
        ) {
          const price = await Order.aggregate([
            {
              $match: {
                _id: new mongoose.Types.ObjectId(order_id),
              },
            },
            {
              $project: {
                _id: 0,
                total_amount: 1,
              },
            },
          ]);

          const wallet = price[0].total_amount;

          const updateWallet = await UserModel.findByIdAndUpdate(
            { _id: user_id },
            {
              $set: {
                user_wallet: parseFloat(user.user_wallet) + parseInt(wallet),
              },
            }
          );

          const newHistoryItem = {
            amount: parseInt(wallet),
            status: "Credit",
            time: Date.now(),
          };

          const marckWallet = await UserModel.findByIdAndUpdate(
            { _id: user_id },
            { $push: { wallet_history: newHistoryItem } }
          );
        }
        res.json({
          success: true,
        });
      }
    } catch (error) {
      res.json({
        success: false,
        error:
          "An error occurred while cancelling the order. Please try again.",
      });
    }
  },

  returnOrder: async (req, res) => {
    try {
      const orderId = req.query.order_id;
      const product_id = req.query.product_id;
      const user_id = req.session.user_id;
      const returnDetails = {
        order_id: orderId,
        product_id: product_id,
        user_id: user_id,
      };
      res.render("user/return", { returnDetails });
    } catch (error) {
      res.json({
        success: false,
        error:
          "An error occurred while processing the return request. Please try again.",
      });
    }
  },

  orderReturn: async (req, res) => {
    try {
      const user_id = new mongoose.Types.ObjectId(req.session.user_id);
      const retrn = new Return({
        order_id: req.body.order_id,
        user_id: user_id,
        product_id: req.body.product_id,
        reason: req.body.reason,
        status: "pending",
        comment: req.body.comment,
      });
      retrn.save().then((retrn) => {
        console.log("Return request saved:", retrn);
      });
      res.json({
        success: true,
      });
    } catch (error) {
      res.json({
        success: false,
        error:
          "An error occurred while processing the return request. Please try again.",
      });
    }
  },

  getInvoice: async (req, res) => {
    try {
      const product_id = new mongoose.Types.ObjectId(req.query.productId);

      const order_id = new mongoose.Types.ObjectId(req.query.orderId);

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
            "user.email": 1,
            "user.phone": 1,
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
      order.forEach((obj) => {
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

      const productIdToFind = req.query.productId;

      const showOrder = order.find(
        (order) => order.items.product_id.toString() === productIdToFind
      );

      function generateRandomInvoiceId() {
        const id = showOrder.items.product_id.toString().slice(3, 10);
        const invoiceId = `INV-${id}`;
        return invoiceId;
      }
      const randomInvoiceId = generateRandomInvoiceId();
      showOrder.invoiceId = randomInvoiceId;

      const html = fs.readFileSync("./views/pdf/invoice.ejs", "utf8");
      const renderedHtml = ejs.render(html, { showOrder });

      const options = {
        format: "A4",
        orientation: "landscape",
        border: "600mm",
        header: {
          height: "10mm",
          contents: '<div style="text-align: center;">INVOICE</div>',
        },
      };

      const document = {
        html: renderedHtml,
        data: {
          showOrder: showOrder,
        },
        path: "./invoice.pdf",
        type: "",
      };

      pdf
        .create(document, options)
        .then(() => {
          const pdfStream = fs.createReadStream("invoice.pdf");
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename=invoice.pdf`
          );
          pdfStream.pipe(res);
          setTimeout(() => {
            fs.unlink("./invoice.pdf", (err) => {
              if (err) {
                throw new Error(err.message);
              }
            });
          }, 5000);
        })
        .catch((error) => {
          console.error("this is the error", error);
          res.send("Error generating the PDF");
        });
    } catch (error) {
      res.json({
        success: false,
        error:
          "An error occurred while processing the invoice request. Please try again.",
      });
    }
  },
};
