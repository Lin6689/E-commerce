const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    size: {
      type: String,
      default: "",
    },
    quantity: {
      type: Number,
      default: 1,
    },
    price: {
      type: Number,
      required: true,
    },
    payment: {
      type: String,
      default: "COD", // COD | UPI | Card
    },
    phone: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "Placed",
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        note: { type: String, default: "" },
        at: { type: Date, default: Date.now },
      },
    ],
    stockRestored: {
      type: Boolean,
      default: false,
    },
    stockDeducted: {
      type: Boolean,
      default: false,
    },
    cancelledBy: {
      type: String,
      default: "",
    },
    expectedShipDate: {
      type: Date,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    shippedAt: {
      type: Date,
    },
    returnRequest: {
      requestType: { type: String, default: "" },
      reason: { type: String, default: "" },
      status: { type: String, default: "" },
      requestedAt: { type: Date },
      pickupDate: { type: Date },
      pickupSlot: { type: String, default: "" },
      pickupAddress: { type: String, default: "" },
      pickedUpAt: { type: Date },
      exchangeSize: { type: String, default: "" },
      exchangeProduct: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
      exchangeProductTitle: { type: String, default: "" },
      images: [{ url: String, public_id: String }],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);