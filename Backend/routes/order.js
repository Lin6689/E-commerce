const express = require("express");
const Order = require("../models/Order");
const Product = require("../models/product");
const Review = require("../models/review");
const { auth, isAdmin } = require("../middleware/auth");
const upload = require("../middleware/upload");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

const ORDER_STATUSES = [
  "Placed",
  "Confirmed",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const CANCELLABLE = ["Placed", "Confirmed", "Packed"];
const RETURN_WINDOW_DAYS = 7;
const SHIP_DAYS = 2;
const DELIVERY_DAYS = 5;
const PICKUP_SLOTS = [
  "Morning (9 AM - 12 PM)",
  "Afternoon (12 PM - 4 PM)",
  "Evening (4 PM - 8 PM)",
];
const PICKUP_WINDOW_DAYS = 15;
const FINAL_RETURN_STATUSES = ["Picked up", "Refunded", "Exchanged", "Rejected"];

function parsePickupDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const max = new Date(today);
  max.setDate(max.getDate() + PICKUP_WINDOW_DAYS);
  if (date < today || date > max) return undefined;
  return date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function customerCancelled(order) {
  if (order.cancelledBy === "customer") return true;
  return (order.statusHistory || []).some(
    (event) =>
      event.status === "Cancelled" &&
      /customer/i.test(event.note || "")
  );
}

function deliveredOn(order) {
  if (order.deliveredAt) return new Date(order.deliveredAt);
  const hit = (order.statusHistory || []).find((event) => event.status === "Delivered");
  if (hit?.at) return new Date(hit.at);
  if (order.status === "Delivered") return new Date(order.updatedAt || order.createdAt);
  return null;
}

function withSchedule(order) {
  const obj = typeof order.toObject === "function" ? order.toObject() : { ...order };
  const created = obj.createdAt ? new Date(obj.createdAt) : new Date();
  if (!obj.expectedShipDate) obj.expectedShipDate = addDays(created, SHIP_DAYS);
  if (!obj.expectedDeliveryDate) obj.expectedDeliveryDate = addDays(created, DELIVERY_DAYS);
  obj.cancelledByCustomer = customerCancelled(obj);
  const delivered = deliveredOn(obj);
  obj.returnWindowEnds = delivered ? addDays(delivered, RETURN_WINDOW_DAYS) : null;
  obj.returnWindowDays = RETURN_WINDOW_DAYS;
  return obj;
}

async function restoreStock(order) {
  if (order.stockRestored) return;
  // Stock tabhi wapas karo jab actually deduct hua ho (shipped ke baad)
  if (order.stockDeducted) {
    const product = await Product.findById(order.product);
    if (product) {
      product.stock = (product.stock || 0) + (order.quantity || 1);
      await product.save();
    }
  }
  order.stockRestored = true;
}

async function deductStock(order) {
  if (order.stockDeducted) return;
  const product = await Product.findById(order.product);
  if (product) {
    product.stock = Math.max(0, (product.stock || 0) - (order.quantity || 1));
    await product.save();
  }
  order.stockDeducted = true;
}

const router = express.Router();

// 📍 Store ke saare orders fetch karne ka route (Admin ke liye - Rating & Status ke sath)
router.get("/", auth, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("product")
      .populate("user", "name email");

    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        let rating = "—";
        try {
          if (order.product) {
            const pId = order.product._id || order.product;
            
            // 🚀 Flexible query: String ya ObjectId dono se search karega
            const rev = await Review.findOne({
              $or: [
                { product: pId },
                { product: pId.toString() }
              ]
            }).sort({ createdAt: -1 });

            if (rev && rev.rating) {
              rating = `⭐ ${rev.rating}`;
            }
          }
        } catch (rErr) {
          console.log("Review lookup failed:", rErr.message);
        }

        return {
          ...withSchedule(order),
          rating,
          status: order.status || "Placed",
        };
      })
    );

    res.json({ orders: ordersWithDetails });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});
// Place order
router.post("/", auth, async (req, res) => {
  try {
    const product = await Product.findById(req.body.product);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const qty = Number(req.body.quantity) || 1;

    // Stock check rakho par deduction nahi — wo shipped hone pe hoga
    if (product.stock < qty) {
      return res.status(400).json({ message: "Not enough stock" });
    }

    const placedAt = new Date();
    const order = await Order.create({
      ...req.body,
      status: "Placed",
      statusHistory: [
        { status: "Placed", note: "Order placed", at: placedAt },
      ],
      expectedShipDate: addDays(placedAt, SHIP_DAYS),
      expectedDeliveryDate: addDays(placedAt, DELIVERY_DAYS),
      user: req.user.userId,
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// My orders
router.get("/my", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.userId })
      .populate("product", "title price images image")
      .sort({ createdAt: -1 });
    res.json(orders.map(withSchedule));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin updates shipping status. Customer tracking reads this same field.
router.put("/:id/status", auth, isAdmin, async (req, res) => {
  try {
    const nextStatus = req.body.status;
    if (!ORDER_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (customerCancelled(order)) {
      return res.status(400).json({
        message: "This order was cancelled by the customer and cannot be changed",
      });
    }

    if (nextStatus === "Cancelled" && order.status !== "Cancelled") {
      await restoreStock(order);
      order.cancelledBy = "admin";
    }

    const now = new Date();

    if (nextStatus === "Delivered" && !order.deliveredAt) {
      order.deliveredAt = now;
    }

    // Admin ne ship kiya toh tabhi stock kam karo
    if (nextStatus === "Shipped" && order.status !== "Shipped") {
      await deductStock(order);
    }

    // Admin ne ship early/late mark kiya toh expected dates usi hisaab se update karo
    if (nextStatus === "Shipped" && order.status !== "Shipped") {
      order.shippedAt = now;
      // Delivery ship date + (delivery - ship) days ke hisaab se recalulate
      order.expectedDeliveryDate = addDays(now, DELIVERY_DAYS - SHIP_DAYS);
    }

    if (nextStatus === "Out for Delivery") {
      order.expectedDeliveryDate = now;
    }

    order.status = nextStatus;
    order.statusHistory.push({
      status: nextStatus,
      note: "Updated by admin",
      at: new Date(),
    });
    await order.save();

    const populated = await Order.findById(order._id).populate("product");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Customer can cancel only before the order is shipped.
router.put("/:id/cancel", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.user.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: "You can only cancel your own order" });
    }

    if (!CANCELLABLE.includes(order.status)) {
      return res.status(400).json({
        message: "This order can no longer be cancelled because it has already been shipped",
      });
    }

    await restoreStock(order);
    order.status = "Cancelled";
    order.cancelledBy = "customer";
    order.statusHistory.push({
      status: "Cancelled",
      note: "Cancelled by customer",
      at: new Date(),
    });
    await order.save();

    const populated = await Order.findById(order._id).populate(
      "product",
      "title price images image"
    );
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/:id/return", auth, upload.array("images", 5), async (req, res) => {
  try {
    const type = req.body.type;
    const reason = (req.body.reason || "").trim();
    if (!["return", "exchange"].includes(type)) {
      return res.status(400).json({ message: "Choose return or exchange" });
    }
    if (!reason) {
      return res.status(400).json({ message: "Please add a reason" });
    }

    // Har return/exchange request pe photo compulsory hai
    const images = [];
    for (const file of req.files || []) {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "returns",
        });
        images.push({ url: result.secure_url, public_id: result.public_id });
      } finally {
        try { fs.unlinkSync(file.path); } catch {}
      }
    }
    if (images.length === 0) {
      return res.status(400).json({
        message: "Photo required — attach a photo of the item to submit a return or exchange request",
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.user.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: "You can only request this on your own order" });
    }
    if (order.status !== "Delivered") {
      return res.status(400).json({ message: "Return and exchange open after delivery" });
    }

    const delivered = deliveredOn(order);
    const windowEnds = delivered ? addDays(delivered, RETURN_WINDOW_DAYS) : null;
    if (!windowEnds || Date.now() > windowEnds.getTime()) {
      return res.status(400).json({
        message: `The ${RETURN_WINDOW_DAYS}-day return and exchange window has closed`,
      });
    }

    const current = order.returnRequest?.status || "";
    if (current && current !== "Rejected") {
      return res.status(400).json({ message: "A return or exchange request is already open" });
    }

    // Exchange ho toh customer ka chosen replacement size/product save karo
    const exchangeSize = type === "exchange" ? (req.body.exchangeSize || "").trim() : "";
    let exchangeProduct = null;
    let exchangeProductTitle = "";
    if (type === "exchange" && req.body.exchangeProduct) {
      const ep = await Product.findById(req.body.exchangeProduct);
      if (!ep) {
        return res.status(400).json({ message: "Selected exchange product not found" });
      }
      exchangeProduct = ep._id;
      exchangeProductTitle = ep.title;
    }

    order.returnRequest = {
      requestType: type,
      reason,
      status: "Requested",
      requestedAt: new Date(),
      pickupAddress: order.address || "",
      exchangeSize,
      exchangeProduct,
      exchangeProductTitle,
      images,
    };
    order.statusHistory.push({
      status: "Delivered",
      note: `${type === "exchange" ? "Exchange" : "Return"} requested: ${reason}`,
      at: new Date(),
    });
    await order.save();

    const populated = await Order.findById(order._id).populate(
      "product",
      "title price images image"
    );
    res.json(withSchedule(populated));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id/return-status", auth, isAdmin, async (req, res) => {
  try {
    const next = req.body.status;
    const allowed = ["Requested", "Approved", "Picked up", "Refunded", "Exchanged", "Rejected"];
    if (!allowed.includes(next)) {
      return res.status(400).json({ message: "Invalid return status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order || !order.returnRequest?.requestType) {
      return res.status(404).json({ message: "No return or exchange request on this order" });
    }

    if ((next === "Refunded" || next === "Exchanged") && !order.stockRestored) {
      await restoreStock(order);
    }

    if (next === "Picked up" && !order.returnRequest.pickedUpAt) {
      order.returnRequest.pickedUpAt = new Date();
    }

    order.returnRequest.status = next;
    order.statusHistory.push({
      status: order.status,
      note: `${order.returnRequest.requestType === "exchange" ? "Exchange" : "Return"} ${next}`,
      at: new Date(),
    });
    await order.save();

    const populated = await Order.findById(order._id).populate("product");
    res.json(withSchedule(populated));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Schedule or reschedule the pickup for an approved return/exchange.
// Customers can schedule once approved; admin can schedule any open request.
router.put("/:id/pickup", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order || !order.returnRequest?.requestType) {
      return res.status(404).json({ message: "No return or exchange request on this order" });
    }

    const isOwner = order.user.toString() === req.user.userId.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only schedule pickup on your own order" });
    }

    const status = order.returnRequest.status || "";
    if (FINAL_RETURN_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Pickup can no longer be scheduled for this request" });
    }
    if (!isOwner && status !== "Requested" && status !== "Approved") {
      return res.status(400).json({ message: "Pickup cannot be scheduled in the current stage" });
    }
    if (isOwner && status !== "Approved") {
      return res.status(400).json({ message: "Pickup can be scheduled after the request is approved" });
    }

    const pickupSlot = (req.body.pickupSlot || "").trim();
    if (!PICKUP_SLOTS.includes(pickupSlot)) {
      return res.status(400).json({ message: "Choose a valid pickup time slot" });
    }
    const pickupDate = parsePickupDate(req.body.pickupDate);
    if (!pickupDate) {
      return res.status(400).json({
        message: `Choose a pickup date within the next ${PICKUP_WINDOW_DAYS} days`,
      });
    }
    const pickupAddress = (req.body.pickupAddress || order.returnRequest.pickupAddress || order.address || "").trim();
    if (!pickupAddress) {
      return res.status(400).json({ message: "Pickup address is required" });
    }

    order.returnRequest.pickupDate = pickupDate;
    order.returnRequest.pickupSlot = pickupSlot;
    order.returnRequest.pickupAddress = pickupAddress;
    order.statusHistory.push({
      status: order.status,
      note: `Pickup scheduled for ${pickupDate.toDateString()} (${pickupSlot})`,
      at: new Date(),
    });
    await order.save();

    const populated = await Order.findById(order._id).populate(
      "product",
      "title price images image"
    );
    res.json(withSchedule(populated));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Single order
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "product",
      "title price images image"
    );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(withSchedule(order));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Delete order (Admin ke liye)
router.delete("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;