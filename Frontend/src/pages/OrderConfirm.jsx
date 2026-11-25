import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

export default function OrderConfirm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const orderIds = location.state?.orderIds || [id];
  const productIds = location.state?.productIds || [];

  useEffect(() => {
    const token = localStorage.getItem("token");

    Promise.all(
      orderIds.map((orderId) =>
        axios
          .get(`http://localhost:3000/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => res.data)
          .catch(() => null)
      )
    ).then((results) => {
      setOrders(results.filter(Boolean));
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading...</div>;
  }

  const grandTotal = orders.reduce((sum, o) => sum + (o.price || 0), 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-green-600 mb-4">
        Order Confirmed ✅
      </h1>

      <div className="bg-gray-50 p-4 rounded-xl mb-6 text-left space-y-4 border">
        {orders.map((order, idx) => (
          <div key={order._id || idx} className="border-b pb-3 last:border-none">
            <p className="text-xs text-gray-400 font-mono">Order ID: {order._id}</p>
            <p className="font-semibold text-gray-900">
              {order.product?.title || "Product"}
            </p>
            <div className="flex justify-between text-sm text-gray-600 mt-1">
              <span>Size: {order.size || "-"} | Qty: {order.quantity || 1}</span>
              <span className="font-bold text-red-900">₹{order.price}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-left text-sm mb-6 space-y-1 bg-white p-4 rounded-lg border">
        <p><b>Payment:</b> {orders[0]?.payment}</p>
        <p><b>Phone:</b> {orders[0]?.phone}</p>
        <p><b>Address:</b> {orders[0]?.address}</p>
        <p className="text-xl font-bold text-red-900 mt-2">Grand Total: ₹{grandTotal}</p>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Status: {orders[0]?.status || "Placed"}. You can follow packing and shipping from My Orders.
      </p>

      <div className="mb-6 space-y-3">
        <button
          onClick={() => navigate("/orders")}
          className="w-full py-3 bg-red-900 text-white rounded-lg font-medium shadow hover:bg-red-800 transition"
        >
          Track your order
        </button>
       
      </div>

      <div className="flex gap-4 justify-center">
        <Link to="/shop" className="px-6 py-2 bg-red-900 text-white rounded-lg">
          Continue Shopping
        </Link>
        <Link to="/orders" className="px-6 py-2 border border-red-900 text-red-900 rounded-lg">
          My Orders
        </Link>
      </div>
    </div>
  );
}