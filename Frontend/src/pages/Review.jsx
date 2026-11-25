import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

export default function Review() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const productIds = [
    ...new Set(
      (location.state?.productIds?.length
        ? location.state.productIds
        : [productId]
      ).filter(Boolean)
    ),
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [productDetails, setProductDetails] = useState(null);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const currentProductId = productIds[currentIndex];

  useEffect(() => {
    if (currentProductId) {
      axios
        .get(`http://localhost:3000/product/${currentProductId}`)
        .then((res) => setProductDetails(res.data.data || res.data))
        .catch(() => setProductDetails(null));
    }
  }, [currentProductId]);

  const submit = async () => {
    if (!currentProductId) {
      alert("No product selected for review");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      await axios.post(
        "http://localhost:3000/reviews",
        {
          product: currentProductId,
          rating: Number(rating),
          comment,
          userName: localStorage.getItem("userName") || "Customer",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Agar aur bhi products baaki hain, toh agle product par jao
      if (currentIndex < productIds.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setRating(5);
        setComment("");
        alert("Review saved! Please rate the next item.");
      } else {
        alert("All reviews submitted successfully!");
        navigate("/shop");
      }
    } catch (error) {
      console.error("Review submit error:", error);
      alert(error.response?.data?.message || "Failed to submit review");
    }
  };

  if (productIds.length === 0) {
    return (
      <div className="max-w-md mx-auto p-8 mt-10 text-center">
        <p className="text-gray-500 mb-4">No product selected for review.</p>
        <button
          onClick={() => navigate("/shop")}
          className="text-red-900 font-semibold"
        >
          Back to Shop
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-8 bg-white shadow rounded-xl mt-10 border border-gray-100">
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
        <p className="text-green-800 font-semibold text-sm">
          📦 Aapka order deliver ho chuka hai!
        </p>
        <p className="text-gray-600 text-xs mt-1">
          Item ({currentIndex + 1} of {productIds.length}): Please review share karein.
        </p>
      </div>

      <h1 className="text-xl font-bold mb-2 text-red-950">
        Rate Product: {productDetails?.title || "Item"}
      </h1>

      <label className="block text-sm font-medium mb-2 text-gray-700">Rating</label>
      <select
        className="border p-2.5 rounded-lg w-full mb-4 focus:outline-none focus:border-red-900"
        value={rating}
        onChange={(e) => setRating(e.target.value)}
      >
        <option value="5">5 ⭐ (Excellent)</option>
        <option value="4">4 ⭐ (Good)</option>
        <option value="3">3 ⭐ (Average)</option>
        <option value="2">2 ⭐ (Poor)</option>
        <option value="1">1 ⭐ (Terrible)</option>
      </select>

      <label className="block text-sm font-medium mb-2 text-gray-700">Your Feedback</label>
      <textarea
        className="border p-2.5 rounded-lg w-full mb-6 focus:outline-none focus:border-red-900"
        placeholder="Write your comment here..."
        rows={4}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      <button
        onClick={submit}
        className="w-full bg-red-900 text-white py-3 rounded-lg font-medium hover:bg-red-950 transition"
      >
        {currentIndex < productIds.length - 1 ? "Submit & Next Product" : "Submit All Reviews"}
      </button>
    </div>
  );
}