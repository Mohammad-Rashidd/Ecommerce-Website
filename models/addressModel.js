const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const addressSchema = new mongoose.Schema(
  {
    user_id: {
      type: ObjectId,
      required: true,
    },
    address_name: {
      type: String,
      required: true,
    },
    address_type: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    pincode: {
      type: Number,
      required: true,
    },
    locality: {
      type: String,
      required: true,
    },
    house_name: {
      type: String,
      required: true,
    },
    area_street: {
      type: String,
      required: true,
    },
    town: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    alternate_phone: {
      type: String,
    },
    landmark: {
      type: String,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Address = mongoose.model("Address", addressSchema);

module.exports = Address;
