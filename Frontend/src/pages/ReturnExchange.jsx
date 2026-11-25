import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";

const PICKUP_SLOTS = [
  "Morning (9 AM - 12 PM)",
  "Afternoon (12 PM - 4 PM)",
  "Evening (4 PM - 8 PM)",
];

const FLOW_BASE = ["Requested", "Approved", "Pickup Scheduled", "Picked up"];
const FINAL_STATUSES = ["Picked up", "Refunded", "Exchanged", "Rejected"];
const MAX_PHOTOS = 5;

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function todayInputValue() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function maxPickupInputValue() {
  const d = new Date();
  d.setDate(d.getDate() + 15);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function sizeOptions(product) {
  const catTitle = (product?.category?.title || product?.category || "").toString().toLowerCase();
  const prodTitle = (product?.title || "").toLowerCase();
  const prodDesc = (product?.description || "").toLowerCase();
  const shoeKeywords = ["shoe", "shoes", "sneaker", "boot", "sandal", "footwear"];
  const noSizeKeywords = ["watch", "bag", "belt", "cap", "wallet", "sunglass", "accessories", "jewellery"];
  const blob = `${catTitle} ${prodTitle} ${prodDesc}`;
  if (noSizeKeywords.some((keyword) => blob.includes(keyword))) return [];
  if (shoeKeywords.some((keyword) => blob.includes(keyword))) return ["7", "8", "9", "10", "11", "12"];
  return ["S", "M", "L", "XL"];
}

function statusBadgeClass(status) {
  if (status === "Refunded" || status === "Exchanged" || status === "Picked up")
    return "bg-green-100 text-green-800";
  if (status === "Rejected") return "bg-red-100 text-red-800";
  if (status === "Approved") return "bg-blue-100 text-blue-800";
  return "bg-amber-100 text-amber-800";
}

export default function ReturnExchange() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Request form state
  const [reqType, setReqType] = useState(
    searchParams.get("type") === "exchange" ? "exchange" : "return"
  );
  const [reason, setReason] = useState("");
  const [exchangeSize, setExchangeSize] = useState("");
  const [photos, setPhotos] = useState([]); // [{ file, preview }]

  // Pickup scheduling state
  const [pickDate, setPickDate] = useState("");
  const [pickSlot, setPickSlot] = useState("");
  const [pickAddress, setPickAddress] = useState("");
  const [showScheduler, setShowScheduler] = useState(false);
  const schedulerRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };

  const load = () => {
    axios
      .get(`http://localhost:3000/orders/${orderId}`, { headers })
      .then((res) => {
        setOrder(res.data);
        setError("");
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load this order");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Exchange sirf same product ke andar hota hai (size change)

  const request = order?.returnRequest || {};
  const hasActiveRequest = !!request.requestType && request.status !== "Rejected";
  const status = request.status || "";
  const isFinal = FINAL_STATUSES.includes(status);

  const canRequest = useMemo(() => {
    if (!order) return false;
    if (order.status !== "Delivered") return false;
    if (!order.returnWindowEnds) return false;
    if (new Date(order.returnWindowEnds).getTime() < Date.now()) return false;
    return !hasActiveRequest;
  }, [order, hasActiveRequest]);

  const canSchedule =
    hasActiveRequest &&
    !isFinal &&
    (status === "Approved" || (role === "admin" && (status === "Requested" || status === "Approved")));

  const photoRequired = true;

  const addPhotos = (files) => {
    const incoming = Array.from(files || []).filter((f) => f.type.startsWith("image/"));
    setPhotos((prev) => {
      const remaining = MAX_PHOTOS - prev.length;
      const next = [...prev];
      for (const file of incoming.slice(0, Math.max(0, remaining))) {
        next.push({ file, preview: URL.createObjectURL(file) });
      }
      return next;
    });
  };

  const removePhoto = (index) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const submitRequest = async () => {
    if (!reason.trim()) {
      alert("Please add a reason for your request");
      return;
    }
    if (photos.length === 0) {
      alert("Photo required — attach a photo of the item to submit a return or exchange request");
      return;
    }
    try {
      setBusy(true);
      const formData = new FormData();
      formData.append("type", reqType);
      formData.append("reason", reason.trim());
      if (reqType === "exchange" && exchangeSize) {
        formData.append("exchangeSize", exchangeSize);
      }
      photos.forEach((p) => formData.append("images", p.file));

      await axios.post(`http://localhost:3000/orders/${orderId}/return`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      setReason("");
      setExchangeSize("");
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Could not submit request");
    } finally {
      setBusy(false);
    }
  };

  const schedulePickup = async () => {
    if (!pickDate || !pickSlot) {
      alert("Choose a pickup date and time slot");
      return;
    }
    try {
      setBusy(true);
      await axios.put(
        `http://localhost:3000/orders/${orderId}/pickup`,
        {
          pickupDate: pickDate,
          pickupSlot: pickSlot,
          pickupAddress: pickAddress || request.pickupAddress || order.address,
        },
        { headers }
      );
      setShowScheduler(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Could not schedule pickup");
    } finally {
      setBusy(false);
    }
  };

  const openScheduler = () => {
    setPickDate(request.pickupDate ? new Date(request.pickupDate).toISOString().slice(0, 10) : "");
    setPickSlot(request.pickupSlot || "");
    setPickAddress(request.pickupAddress || order?.address || "");
    setShowScheduler(true);
    // Form ke paas automatically scroll karo
    setTimeout(() => {
      schedulerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  if (!token) return null;

  if (loading) {
    return <div className="text-center py-24 text-gray-500">Loading return details...</div>;
  }

  if (error || !order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <p className="text-gray-500 mb-4">{error || "Order not found"}</p>
        <Link to="/orders" className="text-red-900 font-semibold">
          Back to My Orders
        </Link>
      </div>
    );
  }

  const image =
    order.product?.images?.[0]?.url || order.product?.image || "https://via.placeholder.com/120";
  const price = Math.round((Number(order.price) || 0) / (order.quantity || 1));
  const exchangeSizes = sizeOptions(order.product || {});

  // Timeline progress — return ka aakhri step "Refunded", exchange ka "Exchanged"
  const finalLabel = request.requestType === "exchange" ? "Exchanged" : "Refunded";
  const FLOW = [...FLOW_BASE, finalLabel];
  const pickupScheduled = !!request.pickupDate || ["Picked up", "Refunded", "Exchanged"].includes(status);
  const stepState = (label) => {
    if (label === "Requested") return "done";
    if (label === "Approved")
      return ["Approved", "Picked up", "Refunded", "Exchanged"].includes(status) ? "done" : "current";
    if (label === "Pickup Scheduled")
      return pickupScheduled ? "done" : status === "Approved" ? "current" : "todo";
    if (label === "Picked up")
      return ["Picked up", "Refunded", "Exchanged"].includes(status) ? "done" : "todo";
    if (label === finalLabel)
      return status === finalLabel ? "done" : status === "Picked up" ? "current" : "todo";
    return "todo";
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link to="/orders" className="text-sm text-gray-500 hover:text-gray-800">
        ← Back to My Orders
      </Link>

      <div className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-red-950">Return & Exchange</h1>
          <p className="text-sm text-gray-500 mt-1 font-mono">Order {order._id}</p>
        </div>
        {hasActiveRequest && (
          <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${statusBadgeClass(status)}`}>
            {status}
          </span>
        )}
      </div>

      {/* Order summary */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex gap-4">
          <img src={image} alt="" className="w-20 h-20 rounded-xl object-cover bg-gray-100" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 text-lg">
              {order.product?.title || "Product"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Size {order.size || "—"} · Qty {order.quantity || 1} · ₹{price} each
            </p>
            <p className="text-sm text-gray-500">Order total: ₹{order.price}</p>
            {order.address && (
              <p className="text-xs text-gray-400 mt-2">Delivery address: {order.address}</p>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm border-t pt-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-400">Order placed</p>
            <p className="font-semibold text-gray-900 mt-0.5">{formatDate(order.createdAt)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-400">Delivered</p>
            <p className="font-semibold text-gray-900 mt-0.5">
              {order.status === "Delivered" ? formatDate(order.deliveredAt || order.expectedDeliveryDate) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-400">Return window ends</p>
            <p className="font-semibold text-gray-900 mt-0.5">{formatDate(order.returnWindowEnds)}</p>
          </div>
        </div>
      </div>

      {order.status !== "Delivered" ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-gray-500">
            Return and exchange requests open only after your order is delivered.
            Current status: <span className="font-semibold">{order.status}</span>
          </p>
        </div>
      ) : !canRequest && !hasActiveRequest ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-gray-500">
            {order.returnWindowEnds && new Date(order.returnWindowEnds).getTime() < Date.now()
              ? `The 7-day return and exchange window closed on ${formatDate(order.returnWindowEnds)}.`
              : "This order is not eligible for return or exchange."}
          </p>
        </div>
      ) : hasActiveRequest ? (
        <>
          {/* Status timeline */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-5">
              {request.requestType === "exchange" ? "Exchange" : "Return"} request progress
            </h2>
            <ol className="space-y-0">
              {FLOW.map((label, i) => {
                const state = stepState(label);
                const isLast = i === FLOW.length - 1;
                return (
                  <li key={label} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          state === "done"
                            ? "bg-red-900 text-white"
                            : state === "current"
                            ? "bg-red-100 text-red-900 border-2 border-red-900"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {state === "done" ? "✓" : i + 1}
                      </span>
                      {!isLast && (
                        <span
                          className={`w-0.5 flex-1 my-1 ${
                            FLOW.slice(i + 1).some((l) => stepState(l) === "done")
                              ? "bg-red-900"
                              : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                    <div className={`pb-6 ${isLast ? "" : ""}`}>
                      <p
                        className={`font-semibold text-sm ${
                          state === "todo" ? "text-gray-400" : "text-gray-900"
                        }`}
                      >
                        {label}
                      </p>
                      {label === "Requested" && request.requestedAt && (
                        <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(request.requestedAt)}</p>
                      )}
                      {label === "Pickup Scheduled" && request.pickupDate && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(request.pickupDate)} · {request.pickupSlot}
                        </p>
                      )}
                      {label === "Picked up" && request.pickedUpAt && (
                        <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(request.pickedUpAt)}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {status === "Refunded" && (
              <div className="mt-2 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
                Refund has been processed for this order.
              </div>
            )}
            {status === "Exchanged" && (
              <div className="mt-2 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
                Your exchange has been completed.
              </div>
            )}
            {status === "Rejected" && (
              <div className="mt-2 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
                This request was rejected. You can submit a new request below if the window is still open.
              </div>
            )}
          </div>

          {/* Pickup details */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Pickup details</h2>
              {canSchedule && !showScheduler && (
                <button
                  onClick={openScheduler}
                  className="text-sm font-semibold text-red-900 border border-red-900 rounded-lg px-3 py-1.5 hover:bg-red-50 transition"
                >
                  {request.pickupDate ? "Reschedule pickup" : "Schedule pickup"}
                </button>
              )}
            </div>

            {request.pickupDate ? (
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Pickup date</p>
                  <p className="font-semibold text-gray-900 mt-1">{formatDate(request.pickupDate)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Time slot</p>
                  <p className="font-semibold text-gray-900 mt-1">{request.pickupSlot || "—"}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 sm:col-span-1">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Pickup address</p>
                  <p className="font-semibold text-gray-900 mt-1 break-words">
                    {request.pickupAddress || order.address || "—"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {status === "Approved"
                  ? "Your request is approved. Schedule a pickup date and time ."
                  : status === "Requested"
                  ? "Pickup scheduling opens after your request is approved by our team."
                  : "No pickup scheduled yet."}
              </p>
            )}

            {request.reason && (
              <div className="mt-4 border-t pt-4">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Reason</p>
                <p className="text-sm text-gray-700 mt-1">{request.reason}</p>
              </div>
            )}

            {request.requestType === "exchange" && (request.exchangeSize || request.exchangeProductTitle) && (
              <div className="mt-4 border-t pt-4">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Replacing with</p>
                <p className="text-sm text-gray-700 mt-1">
                  {request.exchangeProductTitle || "Same product"}
                  {request.exchangeSize ? ` · Size ${request.exchangeSize}` : ""}
                </p>
              </div>
            )}

            {request.images?.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">Attached photos</p>
                <div className="flex flex-wrap gap-2">
                  {request.images.map((img, i) => (
                    <a key={i} href={img.url} target="_blank" rel="noreferrer">
                      <img
                        src={img.url}
                        alt={`Attachment ${i + 1}`}
                        className="w-20 h-20 rounded-xl object-cover border border-gray-200 hover:opacity-80 transition"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {showScheduler && canSchedule && (
              <div ref={schedulerRef} className="mt-5 border rounded-xl p-4 bg-red-50/40 scroll-mt-24">
                <p className="text-sm font-semibold text-gray-900 mb-3">Choose pickup slot</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Date <span className="text-gray-400 font-normal">(within 15 days)</span>
                    </label>
                    <input
                      type="date"
                      min={todayInputValue()}
                      max={maxPickupInputValue()}
                      value={pickDate}
                      onChange={(e) => setPickDate(e.target.value)}
                      className="w-full border rounded-lg p-2.5 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Time slot</label>
                    <select
                      value={pickSlot}
                      onChange={(e) => setPickSlot(e.target.value)}
                      className="w-full border rounded-lg p-2.5 text-sm bg-white"
                    >
                      <option value="">Select a slot</option>
                      {PICKUP_SLOTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Pickup address</label>
                  <textarea
                    rows={2}
                    value={pickAddress}
                    onChange={(e) => setPickAddress(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm bg-white"
                    placeholder="House, street, city, pincode"
                  />
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={schedulePickup}
                    disabled={busy}
                    className="bg-red-900 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-red-950 disabled:opacity-50 transition"
                  >
                    Confirm pickup
                  </button>
                  <button onClick={() => setShowScheduler(false)} className="text-sm text-gray-500">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Pickup help — delivery boy unavailable / user not home */}
            {hasActiveRequest && !isFinal && request.pickupDate && (
              <div className="mt-5 border-t pt-5">
                <p className="text-sm font-semibold text-gray-800 mb-3">Having trouble receiving the pickup?</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={openScheduler}
                    className="text-left border border-gray-200 rounded-xl p-3.5 hover:border-red-900 hover:bg-red-50/50 transition"
                  >
                    <p className="text-lg mb-1">📅</p>
                    <p className="text-sm font-semibold text-gray-900">Reschedule pickup</p>
                    <p className="text-xs text-gray-500 mt-1">Pick a new date & slot within 15 days</p>
                  </button>
                  <div className="border border-gray-200 rounded-xl p-3.5">
                    <p className="text-lg mb-1">🏪</p>
                    <p className="text-sm font-semibold text-gray-900">Drop at pickup center</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Can't wait at home? Drop the packed item at our nearest pickup center with the QR code sent to your phone.
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-3.5">
                    <p className="text-lg mb-1">📞</p>
                    <p className="text-sm font-semibold text-gray-900">Boy didn't come?</p>
                    <p className="text-xs text-gray-500 mt-1">
                      No worries — your slot auto-reschedules. Tap "Reschedule" above to choose another slot, or contact support.
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-blue-50 border border-blue-100 p-3.5 text-xs text-blue-900 leading-relaxed">
                  <p className="font-semibold mb-1">Before the pickup day:</p>
                  <p>• Pack the item in its original box with tags attached.</p>
                  <p>• Keep the item ready 30 minutes before your slot.</p>
                  <p>• Our delivery partner will verify the order ID before collecting.</p>
                  <p>• If you're unavailable, reschedule instead of refusing — refusal may delay your refund/exchange.</p>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ===== New request form ===== */
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 text-lg mb-1">
            {request.status === "Rejected" ? "Submit a new request" : "Request a return or exchange"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Our pickup partner will collect the item from your address. Keep the item in its original
            packaging with tags attached.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            {[
              { value: "return", title: "Return", desc: "Get a refund to your original payment method" },
              { value: "exchange", title: "Exchange", desc: "Swap for a different size or variant" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setReqType(opt.value)}
                className={`text-left border rounded-xl p-4 transition ${
                  reqType === opt.value
                    ? "border-red-900 bg-red-50 ring-1 ring-red-900"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-semibold text-gray-900">{opt.title}</p>
                <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              reqType === "exchange"
                ? "e.g. Wrong size — need size L, or item is defective..."
                : "e.g. Wrong size, damaged item, changed mind..."
            }
            className="w-full border rounded-xl p-3 text-sm mb-5 focus:outline-none focus:border-red-900"
          />

          {reqType === "exchange" && (
            <div className="mb-5 border border-gray-200 rounded-xl p-4 bg-gray-50/60">
              <p className="text-sm font-semibold text-gray-800">What would you like instead?</p>
              <p className="text-xs text-gray-500 mt-0.5 mb-4">
                Optional — helps us pick the right replacement faster.
              </p>

              {exchangeSizes.length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">
                    Same item — choose new size
                    {order.size ? ` (you ordered: ${order.size})` : ""}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {exchangeSizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setExchangeSize(exchangeSize === s ? "" : s)}
                        className={`min-w-[48px] h-10 px-4 rounded-lg text-sm font-bold border-2 transition ${
                          exchangeSize === s
                            ? "bg-red-900 text-white border-red-900"
                            : "bg-white text-gray-700 border-gray-200 hover:border-red-900"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {exchangeSizes.length === 0 && (
                <p className="text-xs text-gray-500">
                  This item doesn't have sizes — exchange will be arranged manually by our team.
                </p>
              )}
            </div>
          )}

          {/* Photo upload — defective/wrong-size pe compulsory */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Photos{" "}
                {photoRequired ? (
                  <span className="text-red-600 font-semibold">(required)</span>
                ) : (
                  <span className="text-gray-400 font-normal">(optional)</span>
                )}
              </label>
              <span className="text-xs text-gray-400">{photos.length}/{MAX_PHOTOS}</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {photos.map((p, i) => (
                <div key={p.preview} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                  <img src={p.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-black/80"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {photos.length < MAX_PHOTOS && (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-red-900 hover:bg-red-50/50 transition text-gray-400 hover:text-red-900">
                  <span className="text-2xl leading-none">+</span>
                  <span className="text-[10px] font-semibold mt-1">Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addPhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Attach photos of the defective, wrong-size or damaged item so our team can review faster.
            </p>
          </div>

          <p className="text-sm text-gray-500 rounded-xl bg-gray-50 border border-gray-100 p-3 mb-6">
            Once our team approves your request, you can choose a pickup date and time slot here.
            Pickup is available within 15 days.
          </p>

          <button
            onClick={submitRequest}
            disabled={busy}
            className="w-full bg-red-900 text-white py-3 rounded-xl font-semibold hover:bg-red-950 disabled:opacity-50 transition"
          >
            {busy ? "Submitting..." : `Submit ${reqType} request`}
          </button>
        </div>
      )}

      {/* Policy */}
      <div className="mt-6 rounded-2xl bg-stone-50 border border-gray-100 p-5 text-sm text-gray-600 space-y-1">
        <p className="font-semibold text-gray-900">Return & exchange policy</p>
        <p>• Requests must be made within {order.returnWindowDays || 7} days of delivery.</p>
        <p>• Item must be unused, with original tags and packaging.</p>
        <p>• Pickup is scheduled in 3-hour slots: morning, afternoon, or evening.</p>
        <p>• Refunds are processed 3-5 business days after we receive the item.</p>
      </div>
    </div>
  );
}
