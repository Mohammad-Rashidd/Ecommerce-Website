const UserModel = require("../models/userModel");
const Product = require("../models/productModel");
const Address = require("../models/addressModel");
const Order = require("../models/orderModel");
const Coupon = require("../models/couponModel");
const Payment = require("../models/paymentModel");
const mongoose = require("mongoose");
require("dotenv").config();
const flash = require("connect-flash");

const Razorpay = require("razorpay");
const crypto = require("crypto");

var instance = new Razorpay({
  key_id: "rzp_test_0LOos3cYiJvhRq",
  key_secret: process.env.RAZ_SECRET_KEY,
});

const createRazOrder = (orderId, total) => {
  return new Promise((resolve, reject) => {
    const options = {
      amount: total * 100,
      currency: "INR",
      receipt: orderId.toString(),
    };
    instance.orders.create(options, function (err, order) {
      if (err) {
        console.log(err);
      }
      resolve(order);
    });
  });
};

const addProductToCart = async (userID, productId) => {
  try {
    const user = await UserModel.findOne({
      _id: userID,
      "cart.product": productId,
    });
    if (user) {
      return false;
    } else {
      const cart = {
        $push: {
          cart: {
            product: productId,
            quantity: 1,
          },
        },
      };

      const updatedCart = await UserModel.findByIdAndUpdate(
        { _id: userID },
        cart,
        {
          new: true,
        }
      );
      console.log("update", updatedCart);
      return updatedCart;
    }
  } catch (error) {
    throw error;
  }
};

module.exports = {
  renderCart: async (req, res) => {
    try {
      const userId = req.session.user_id;

      const userData = await UserModel.findById(userId).populate({
        path: "cart.product",
        model: "Product",
      });

      const cartList = userData.cart.map((cartItem) => {
        return {
          product: cartItem.product,
          quantity: cartItem.quantity,
          price: cartItem.product
            ? cartItem.product.price * cartItem.quantity
            : 0,
        };
      });

      const totalPrice = cartList.reduce((acc, item) => acc + item.price, 0);
      const cartCount = cartList.length;
      const errorFlash = req.flash("error");

      if (cartCount > 0) {
        res.render("user/cart", {
          cartList,
          cartCount,
          totalPrice,
          errorFlash,
        });
      } else {
        res.render("user/emptyCart");
      }
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  addToCart: async (req, res) => {
    try {
      const productId = req.params.id;
      const userID = req.session.user_id;

      const prod = await Product.findById(productId);

      if (prod.stock <= 0) {
        return res.json({ status: false, error: "Product Out of Stock" });
      }

      const updatedUser = await addProductToCart(userID, productId);

      if (updatedUser) {
        let cartCount = updatedUser.cart.length;
        res.json({
          status: true,
          count: cartCount,
        });
      } else {
        res.json({
          status: false,
        });
      }
    } catch (error) {
      res.json({ success: false, errorMsg: "Failed to add to cart" });
    }
  },

  incrementQuantity: async (req, res) => {
    try {
      const userID = req.session.user_id;

      const productId = req.params.id;
      const user = await UserModel.findOne({ _id: userID });
      const stock = await Product.findOne(
        { _id: productId },
        { stock: 1, _id: 0 }
      );
      const currentQuantity = user.cart.find(
        (item) => item.product == productId
      );

      const currentStock = stock.stock;

      const quantity = currentQuantity.quantity;

      if (quantity > currentStock - 1) {
        res.json({
          success: false,
        });
      } else {
        const updated = await UserModel.updateOne(
          {
            _id: userID,
            "cart.product": productId,
          },
          {
            $inc: {
              "cart.$.quantity": 1,
            },
          }
        );

        if (updated) {
          res.json({
            success: true,
          });
        }
      }
    } catch (error) {
      res.json({ success: false, errorMsg: "Failed to increment quantity" });
    }
  },

  decrementQuantity: async (req, res) => {
    try {
      const userID = req.session.user_id;

      const productId = req.params.id;

      const updated = await UserModel.updateOne(
        {
          _id: userID,
          "cart.product": productId,
        },
        {
          $inc: {
            "cart.$.quantity": -1,
          },
        }
      );
      if (updated) {
        res.json({
          success: true,
        });
      }
    } catch (error) {
      res.json({ success: false, errorMsg: "Failed to decrement quantity" });
    }
  },

  removeProductFromCart: async (req, res) => {
    try {
      const id = req.params.id;
      const userId = req.session.user_id;

      await UserModel.updateOne(
        { _id: userId },
        { $pull: { cart: { product: id } } }
      );
      res.json({
        status: true,
      });
    } catch (error) {
      res.json({
        success: false,
        errorMsg: "Failed to remove product from cart",
      });
    }
  },

  renderCheckout: async (req, res) => {
    try {
      const userId = req.session.user_id;

      const user = await UserModel.findById(userId);

      const userData = await UserModel.findById(userId).populate({
        path: "cart.product",
        model: "Product",
      });

      const address = await Address.find({ user_id: userId, isDeleted: false });

      const cart = userData.cart || [];

      const outOfStockProducts = cart.filter(
        (cartItem) => cartItem.product.stock <= 0
      );

      if (outOfStockProducts.length > 0) {
        const outOfStockProductNames = outOfStockProducts.map(
          (item) => item.product.name
        );
        req.flash(
          "error",
          `The following products are out of stock: ${outOfStockProductNames.join(
            ", "
          )}`
        );
        return res.redirect("/cart");
      }

      let totalAmount = 0;

      for (const cartItem of cart) {
        const productPrice = cartItem.product ? cartItem.product.price : 0;
        totalAmount += productPrice * cartItem.quantity;
      }

      let wallet;
      if (totalAmount <= user.user_wallet) {
        wallet = true;
      } else {
        wallet = false;
      }

      const user_id = user._id;

      const coupons = await Coupon.aggregate([
        {
          $match: {
            start_date: { $lte: new Date() },
            exp_date: { $gte: new Date() },
            is_delete: false,
            $expr: {
              $and: [
                { $ne: ["$max_count", "$used_count"] },
                { $not: { $in: [user_id, "$user_list"] } },
              ],
            },
          },
        },
      ]);

      function formatDateString(inputDateString) {
        const dateObject = new Date(inputDateString);

        const year = dateObject.getUTCFullYear();
        const month = String(dateObject.getUTCMonth() + 1).padStart(2, "0");
        const day = String(dateObject.getUTCDate()).padStart(2, "0");

        const formattedDate = `${day}-${month}-${year}`;
        return formattedDate;
      }

      coupons.forEach((e) => {
        e.exp_date = formatDateString(e.exp_date);
      });

      if (req.query.coupon) {
        const total = req.query.total;

        const coupon = await Coupon.findOne({ _id: req.query.coupon });

        if (coupon.min_amount >= total) {
          return res.json({
            success: false,
            min_amount: coupon.min_amount,
          });
        } else {
          let discount = coupon.discount;
          totalAmount = totalAmount - (totalAmount * discount) / 100;

          return res.json({
            success: true,
            total: totalAmount,
            coupon_id: coupon._id,
            discount: coupon.discount,
            coupon_code: coupon.coupon_code,
          });
        }
      }

      res.render("user/checkout", {
        userData,
        address,
        cart,
        totalAmount,
        wallet,
        coupons,
      });
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  placeOrder: async (req, res) => {
    try {
      const userid = req.session.user_id;
      const user_id = new mongoose.Types.ObjectId(userid);

      let status;
      if (
        req.body.payment_method === "COD" ||
        req.body.payment_method === "wallet"
      ) {
        status = "confirmed";
      } else {
        status = "pending";
      }

      let order;

      const cartList = await UserModel.aggregate([
        { $match: { _id: user_id } },
        { $project: { cart: 1, _id: 0 } },
        { $unwind: { path: "$cart" } },
        {
          $lookup: {
            from: "products",
            localField: "cart.product",
            foreignField: "_id",
            as: "prod_detail",
          },
        },
        { $unwind: { path: "$prod_detail" } },
        {
          $project: {
            prod_detail_id: 1,
            "prod_detail.price": 1,
            "prod_detail.stock": 1,
            cart: 1,
          },
        },
      ]);

      let items = [];
      const address = await Address.findOne({ _id: req.body.address });

      // for (let i = 0; i < cartList.length; i++) {
      //   if (cartList[i].prod_detail.stock <= 0) {
      //     return res.json({ success: false });
      //   }
      // }

      if (req.body.coupon != "") {
        const couponId = new mongoose.Types.ObjectId(req.body.coupon);

        if (status === "confirmed") {
          let coupon = await Coupon.findByIdAndUpdate(
            { _id: couponId },
            {
              $inc: { used_count: 1 },
              $push: { user_list: user_id },
            },
            {
              new: true,
            }
          );
        }

        let discount = req.body.discount;
        let coupon_code = req.body.coupon_code;

        for (let i = 0; i < cartList.length; i++) {
          items.push({
            product_id: cartList[i].cart.product,
            quantity: cartList[i].cart.quantity,
            price:
              parseInt(cartList[i].prod_detail.price) -
              (parseInt(cartList[i].prod_detail.price) * discount) / 100,
            status: status,
          });
        }

        order = {
          user_id: userid,
          items: items,
          address: address,
          payment_method: req.body.payment_method,
          total_amount: parseInt(req.body.price),
          status: status,
          coupon: {
            coupon_id: couponId,
            discount: discount,
            code: coupon_code,
          },
        };
      } else {
        for (let i = 0; i < cartList.length; i++) {
          items.push({
            product_id: cartList[i].cart.product,
            quantity: cartList[i].cart.quantity,
            price: parseInt(cartList[i].prod_detail.price),
            status: status,
          });
        }

        order = {
          user_id: userid,
          items: items,
          address: address,
          status: status,
          payment_method: req.body.payment_method,
          total_amount: parseInt(req.body.price),
        };
      }

      if (req.body.payment_method === "COD") {
        const createOrder = await Order.create(order);

        if (createOrder) {
          await UserModel.updateOne({ _id: user_id }, { $unset: { cart: "" } });

          for (let i = 0; i < items.length; i++) {
            await Product.updateOne(
              { _id: items[i].product_id },
              { $inc: { stock: -items[i].quantity } }
            );
          }
          req.session.order = {
            status: true,
          };
          res.json({
            success: true,
          });
        }
      } else if (req.body.payment_method === "wallet") {
        const createOrder = await Order.create(order);
        if (createOrder) {
          const user = await UserModel.findById(userid);

          await UserModel.updateOne({ _id: user_id }, { $unset: { cart: "" } });

          await UserModel.updateOne(
            { _id: user_id },
            {
              $set: {
                user_wallet:
                  parseInt(user.user_wallet) - parseInt(req.body.price),
              },
            }
          );

          const newHistoryItem = {
            amount: parseInt(req.body.price),
            status: "Debit",
            time: Date.now(),
          };

          const updatedUser = await UserModel.findByIdAndUpdate(
            { _id: user_id },
            { $push: { wallet_history: newHistoryItem } },
            { new: true }
          );

          for (let i = 0; i < items.length; i++) {
            await Product.updateOne(
              { _id: items[i].product_id },
              { $inc: { stock: -items[i].quantity } }
            );
          }
          req.session.order = {
            status: true,
          };
          res.json({
            success: true,
          });
        }
      } else {
        const createOrder = await Order.create(order);

        const total = parseInt(req.body.price);
        const orderId = createOrder._id;

        let user = await UserModel.findById(req.session.user_id);

        const Razorder = await createRazOrder(orderId, total).then(
          (order) => order
        );

        const timestamp = Razorder.created_at;
        const date = new Date(timestamp * 1000);

        const formattedDate = date.toISOString();
        console.log("razorrr", Razorder);
        const payment = new Payment({
          payment_id: Razorder.id,
          amount: parseInt(Razorder.amount) / 100,
          currency: Razorder.currency,
          order_id: orderId,
          status: Razorder.status,
          created_at: formattedDate,
        });

        await payment.save();

        res.json({
          status: true,
          order: Razorder,
          user,
        });
      }
    } catch (err) {
      res.send(err.message);
    }
  },

  verifyPaymenet: async (req, res) => {
    try {
      const hmac = crypto.createHmac("sha256", process.env.RAZ_SECRET_KEY);
      hmac.update(
        req.body.razorpay_order_id + "|" + req.body.razorpay_payment_id
      );
      const generatedSignature = hmac.digest("hex");
      const isSignatureValid =
        generatedSignature === req.body.razorpay_signature;

      if (isSignatureValid) {
        const user_id = req.session.user_id;
        const user = await UserModel.findById(user_id);

        const items = user.cart;

        for (let i = 0; i < items.length; i++) {
          await Product.updateOne(
            { _id: items[i].product },
            { $inc: { stock: -items[i].quantity } }
          );
        }

        await UserModel.updateOne({ _id: user_id }, { $unset: { cart: "" } });
        const paymentId = req.body.razorpay_order_id;

        const orderID = await Payment.findOne(
          { payment_id: paymentId },
          { _id: 0, order_id: 1 }
        );

        const order_id = orderID.order_id;

        const updateOrder = await Order.updateOne(
          { _id: order_id },
          { $set: { "items.$[].status": "confirmed", status: "confirmed" } }
        );

        let couponId = await Order.findOne(
          { _id: order_id },
          { coupon: 1, _id: 0 }
        );

        if (couponId) {
          couponId = couponId.coupon.coupon_id;
          if (couponId) {
            let updateCoupon = await Coupon.findByIdAndUpdate(
              { _id: couponId },
              {
                $inc: { used_count: 1 },
                $push: { user_list: user_id },
              },
              {
                new: true,
              }
            );
          }
        }

        req.session.order = {
          status: true,
        };
        res.json({
          success: true,
        });
      }
    } catch (error) {
      res.json({ success: false, errorMsg: "Failed to verify payment" });
    }
  },

  orderSuccess: async (req, res) => {
    try {
      const userId = req.session.user_id;
      const user_id = new mongoose.Types.ObjectId(userId);

      const order = await Order.aggregate([
        {
          $match: {
            user_id: user_id,
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $limit: 1,
        },
      ]);
      const order_id = order[0]._id;

      res.render("user/order-success", {
        order: order_id,
      });
    } catch (error) {
      res.render("error/errorPage");
    }
  },

  verifyOrder: (req, res, next) => {
    const order = req.session.order;
    if (order) {
      res.redirect("/");
    } else {
      next();
    }
  },
};
