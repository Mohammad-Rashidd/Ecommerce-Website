const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: Number,
    },
    password: {
      type: String,
      required: true,
    },
    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
    wishlist: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
      },
    ],
    user_wallet: {
      type: Number,
      required: true,
      default: 0,
    },
    wallet_history: [
      {
        amount: {
          type: Number,
        },
        status: {
          type: String,
          enum: ["Debit", "Credit"],
        },
        time: {
          type: Date,
        },
      },
    ],
    blocked: {
      type: Boolean,
      default: false,
    },
    resetPasswordOTP: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;
