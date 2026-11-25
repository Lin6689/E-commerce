import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useCart } from "../context/CartContext";

export default function Buy() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { cart, handleRemoveFromCart } = useCart();

  const fromCart = location.state?.fromCart === true;

  const [product, setProduct] = useState(null);
  const [payment, setPayment] = useState("COD");
  const [phone, setPhone] = useState("");
  const [savedAddress, setSavedAddress] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [addressMode, setAddressMode] = useState("saved");
  const [size, setSize] = useState(location.state?.size || "M");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("http://localhost:3000/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((user) => {
        const saved = [user.address, user.city, user.pincode]
          .map((part) => (part || "").trim())
          .filter(Boolean)
          .join(", ");
        setSavedAddress(saved);
        setPhone((user.phone || "").replace(/\D/g, "").slice(0, 10));
        setAddressMode(saved ? "saved" : "new");
      })
      .catch(() => setAddressMode("new"));
  }, []);

  useEffect(() => {
    if (fromCart) return;
    fetch(`http://localhost:3000/product/${id}`)
      .then((res) => res.json())
      .then((data) => setProduct(data.data || data));
  }, [id, fromCart]);

  const items = fromCart
    ? cart
    : product
    ? [{ ...product, size, quantity: location.state?.quantity || 1 }]
    : [];

  const placeOrder = async () => {
    if (!phone || phone.length !== 10) {
      alert("Enter valid 10 digit phone number");
      return;
    }

    const address = addressMode === "saved" ? savedAddress : newAddress;
    if (!address.trim()) {
      alert(
        addressMode === "saved"
          ? "Save an address in your profile, or add one for this delivery"
          : "Enter a delivery address"
      );
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    if (items.length === 0) {
      alert("No items to order");
      return;
    }

    try {
      const orderIds = [];
      const productIds = [];

      for (const item of items) {
        const productId = item._id || item.id;
        const price = item.price || 0;
        const discount = item.discount || 0;
        const unit = Math.round(price * (1 - discount / 100));
        const qty = item.quantity || 1;
        const itemSize = item.size || size || "M";

        const res = await axios.post(
          "http://localhost:3000/orders",
          {
            product: productId,
            size: itemSize,
            quantity: qty,
            price: unit * qty,
            payment,
            phone,
            address,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const createdId = res.data._id || res.data.order?._id;
        if (createdId) orderIds.push(createdId);
        productIds.push(productId);
        
        handleRemoveFromCart(productId, itemSize);
      }

      // 🚀 Saari order IDs aur product IDs ko state mein bhej rahe hain
      navigate(`/order-confirm/${orderIds[0]}`, {
        state: { orderIds, productIds },
      });
    } catch (err) {
      console.error(err);
      alert("Failed to place order");
    }
  };

  if (!fromCart && !product) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (fromCart && cart.length === 0) {
    return <div className="p-10 text-center text-gray-500">Cart is empty</div>;
  }

  const total = items.reduce((sum, item) => {
    const price = item.price || 0;
    const discount = item.discount || 0;
    const unit = Math.round(price * (1 - discount / 100));
    return sum + unit * (item.quantity || 1);
  }, 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {items.map((item) => {
        const price = item.price || 0;
        const discount = item.discount || 0;
        const unit = Math.round(price * (1 - discount / 100));
        const qty = item.quantity || 1;
        return (
          <div
            key={`${item._id || item.id}-${item.size}`}
            className="border-b py-3 mb-2"
          >
            <p className="font-medium">{item.title}</p>
            <p className="text-red-900 font-bold">₹{unit * qty}</p>
            <p className="text-sm text-gray-500">
              Size: {item.size || size} × {qty}
            </p>
          </div>
        );
      })}

      <p className="text-lg font-bold mb-6">Total: ₹{total}</p>

      <label className="block text-sm mb-1">Phone</label>
      <input
        className="border p-2 rounded w-full mb-4"
        value={phone}
        onChange={(e) =>
          setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
        }
        placeholder="10 digit phone"
        maxLength={10}
      />

      <p className="block text-sm font-medium mb-2">Delivery address</p>

      {savedAddress ? (
        <button
          type="button"
          onClick={() => setAddressMode("saved")}
          className={`w-full text-left border rounded-xl p-3 mb-3 ${
            addressMode === "saved"
              ? "border-red-900 bg-red-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <span className="flex items-start gap-3">
            <span
              className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                addressMode === "saved" ? "border-red-900" : "border-gray-300"
              }`}
            >
              {addressMode === "saved" && (
                <span className="w-2 h-2 rounded-full bg-red-900" />
              )}
            </span>
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-red-900">
                Saved address
              </span>
              <span className="block text-sm text-gray-800 mt-1">{savedAddress}</span>
            </span>
          </span>
        </button>
      ) : (
        <p className="text-sm text-gray-500 mb-3">
          No address saved on your profile yet. Add one below for this order, or save it from Profile for next time.
        </p>
      )}

      {addressMode === "saved" ? (
        <button
          type="button"
          onClick={() => setAddressMode("new")}
          className="w-full mb-4 border border-dashed border-red-900 text-red-900 rounded-xl py-2.5 text-sm font-semibold hover:bg-red-50"
        >
          + Deliver to a different address
        </button>
      ) : (
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Address for this delivery
          </label>
          <textarea
            className="border p-2 rounded-xl w-full"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="House, street, city, pincode"
            rows={3}
          />
          {savedAddress && (
            <button
              type="button"
              onClick={() => setAddressMode("saved")}
              className="mt-2 text-sm font-semibold text-red-900"
            >
              Use saved address instead
            </button>
          )}
        </div>
      )}

      <label className="block text-sm mb-1">Payment</label>
      <select
        className="border p-2 rounded w-full mb-6"
        value={payment}
        onChange={(e) => setPayment(e.target.value)}
      >
        <option value="COD">Cash on Delivery</option>
        <option value="UPI">UPI</option>
        <option value="Card">Card</option>
      </select>

      <button
        onClick={placeOrder}
        className="w-full bg-red-900 text-white py-3 rounded-lg font-medium"
      >
        Place Order
      </button>
    </div>
  );
}