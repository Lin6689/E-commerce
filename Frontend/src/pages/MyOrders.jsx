import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const STEPS = [
  "Placed",
  "Confirmed",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
];

const CANCELLABLE = ["Placed", "Confirmed", "Packed"];
const RETURN_DAYS = 7;

function badgeClass(status) {
  if (status === "Delivered") return "bg-green-100 text-green-800";
  if (status === "Cancelled") return "bg-red-100 text-red-800";
  if (status === "Shipped" || status === "Out for Delivery") return "bg-blue-100 text-blue-800";
  if (status === "Packed" || status === "Confirmed") return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-800";
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function windowEnd(order) {
  if (order.returnWindowEnds) return new Date(order.returnWindowEnds);
  return null;
}

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState("");

  const token = localStorage.getItem("token");

  const load = () => {
    axios
      .get("http://localhost:3000/orders/my", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setOrders(res.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    load();
  }, []);

  const cancelOrder = async (id) => {
    if (!window.confirm("Cancel this order? Stock will be returned.")) return;
    try {
      setBusyId(id);
      await axios.put(
        `http://localhost:3000/orders/${id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Could not cancel this order");
    } finally {
      setBusyId("");
    }
  };

  if (loading) {
    return <div className="text-center py-24 text-gray-500">Loading your orders...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-red-950">My Orders</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-2xl">
          Track each order from packing to delivery. You can cancel until it ships.
          Returns and exchanges stay open for {RETURN_DAYS} days after delivery.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="border border-dashed rounded-2xl p-12 text-center bg-white">
          <p className="text-gray-500 mb-4">You have not placed any orders yet.</p>
          <Link to="/shop" className="text-red-900 font-semibold">
            Continue shopping
          </Link>
        </div>
      ) : (
        orders.map((order) => {
          const status = order.status || "Placed";
          const cancelled = status === "Cancelled";
          const stepIndex = STEPS.indexOf(status);
          const image =
            order.product?.images?.[0]?.url ||
            order.product?.image ||
            "https://via.placeholder.com/120";
          const history = order.statusHistory?.length
            ? order.statusHistory
            : [{ status, at: order.createdAt, note: "Order placed" }];
          const open = openId === order._id;
          const ends = windowEnd(order);
          const request = order.returnRequest || {};
          const requestOpen = request.status && request.status !== "Rejected";
          const canRequest =
            status === "Delivered" && ends && Date.now() <= ends.getTime() && !requestOpen;
          const windowClosed = status === "Delivered" && ends && Date.now() > ends.getTime() && !requestOpen;

          return (
            <article
              key={order._id}
              className="bg-white border border-gray-200 rounded-2xl mb-5 shadow-sm overflow-hidden"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-stone-50 border-b px-5 py-4 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Order placed</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{formatDate(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">
                    {order.shippedAt ? "Shipped on" : "Expected shipping"}
                  </p>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    {cancelled
                      ? "—"
                      : order.shippedAt
                      ? formatDate(order.shippedAt)
                      : formatDate(order.expectedShipDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">
                    {status === "Delivered" ? "Delivered" : "Expected delivery"}
                  </p>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    {cancelled
                      ? "—"
                      : status === "Delivered"
                      ? formatDate(order.deliveredAt || order.expectedDeliveryDate)
                      : formatDate(order.expectedDeliveryDate)}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Total</p>
                  <p className="font-semibold text-red-950 mt-0.5">₹{order.price}</p>
                </div>
              </div>

              <div className="p-5">
                <div className="flex gap-4">
                  <img src={image} alt="" className="w-24 h-24 rounded-xl object-cover bg-gray-100" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="font-semibold text-gray-900 text-lg">
                          {order.product?.title || "Product"}
                        </h2>
                        <p className="text-xs text-gray-400 font-mono mt-1">Order {order._id}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${badgeClass(status)}`}>
                        {cancelled && order.cancelledByCustomer ? "Cancelled by you" : status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Size {order.size || "—"} · Qty {order.quantity || 1} · {order.payment || "COD"}
                    </p>
                    {order.address && (
                      <p className="text-xs text-gray-500 mt-1">Ship to: {order.address}</p>
                    )}
                  </div>
                </div>

                {!cancelled && (
                  <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {STEPS.map((step, i) => {
                      const done = stepIndex >= i;
                      return (
                        <div key={step} className="text-center">
                          <div className={`h-1.5 rounded-full mb-2 ${done ? "bg-red-900" : "bg-gray-200"}`} />
                          <p className={`text-[10px] leading-tight ${done ? "text-red-900 font-semibold" : "text-gray-400"}`}>
                            {step}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  {cancelled ? (
                    <p>This order was cancelled. Return and exchange do not apply.</p>
                  ) : status !== "Delivered" ? (
                    <p>
                      Return and exchange open for {RETURN_DAYS} days after delivery. You can request either once the order is marked delivered.
                    </p>
                  ) : requestOpen ? (
                    <p>
                      {request.requestType === "exchange" ? "Exchange" : "Return"} request is{" "}
                      <span className="font-semibold text-gray-900">{request.status}</span>
                      {request.reason ? ` · ${request.reason}` : ""}.
                      {request.pickupDate
                        ? ` Pickup: ${formatDate(request.pickupDate)}${request.pickupSlot ? ` · ${request.pickupSlot}` : ""}.`
                        : ` Window closes ${formatDate(ends)}.`}
                    </p>
                  ) : windowClosed ? (
                    <p>The {RETURN_DAYS}-day return and exchange window closed on {formatDate(ends)}.</p>
                  ) : (
                    <p>
                      Return or exchange this item until {formatDate(ends)}. After that the {RETURN_DAYS}-day window closes.
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3 items-center">
                  <button
                    onClick={() => setOpenId(open ? null : order._id)}
                    className="text-sm font-semibold text-red-900"
                  >
                    {open ? "Hide updates" : "Track updates"}
                  </button>
                  {CANCELLABLE.includes(status) && (
                    <button
                      disabled={busyId === order._id}
                      onClick={() => cancelOrder(order._id)}
                      className="text-sm font-semibold text-red-600 disabled:opacity-50"
                    >
                      Cancel order
                    </button>
                  )}
                  {canRequest && (
                    <>
                      <Link
                        to={`/returns/${order._id}`}
                        className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:border-red-900 hover:text-red-900 transition"
                      >
                        Return
                      </Link>
                      <Link
                        to={`/returns/${order._id}?type=exchange`}
                        className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:border-red-900 hover:text-red-900 transition"
                      >
                        Exchange
                      </Link>
                    </>
                  )}
                  {requestOpen && (
                    <Link
                      to={`/returns/${order._id}`}
                      className="text-sm font-semibold text-red-900"
                    >
                      Track return & pickup →
                    </Link>
                  )}
                  {status === "Delivered" && order.product?._id && (
                    <Link to={`/review/${order.product._id}`} className="text-sm font-semibold text-amber-700">
                      Write a review
                    </Link>
                  )}
                  {order.product?._id && (
                    <Link to={`/product/${order.product._id}`} className="text-sm text-gray-500">
                      View product
                    </Link>
                  )}
                </div>

                {open && (
                  <ol className="mt-4 border-t pt-4 space-y-3">
                    {[...history].reverse().map((event, idx) => (
                      <li key={`${event.status}-${idx}`} className="flex gap-3 text-sm">
                        <span className="mt-1 w-2 h-2 rounded-full bg-red-900 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">{event.status}</p>
                          <p className="text-xs text-gray-500">
                            {event.note ? `${event.note} · ` : ""}
                            {event.at ? new Date(event.at).toLocaleString() : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
