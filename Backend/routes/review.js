const express = require("express");
const Review = require("../models/review");
const User = require("../models/User");
const { auth } = require("../middleware/auth");
const router = express.Router();

// 📍 All reviews fetch karne ka route
router.get("/", async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📍 One product ke reviews fetch karne ka route
router.get("/:productId", async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId }).sort({
      createdAt: -1,
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📍 Add review route (login required, one review per user per product)
router.post("/", auth, async (req, res) => {
  try {
    const { product, rating, comment, userName } = req.body;

    const ratingNum = Number(rating);
    if (!product || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: "Valid product and rating (1-5) are required" });
    }

    const existing = await Review.findOne({ product, user: req.user.userId });
    if (existing) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }

    let name = (userName || "").trim();
    if (!name) {
      const user = await User.findById(req.user.userId).select("name");
      name = user?.name || "Customer";
    }

    const review = await Review.create({
      product,
      user: req.user.userId,
      rating: ratingNum,
      comment: (comment || "").trim(),
      userName: name,
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
