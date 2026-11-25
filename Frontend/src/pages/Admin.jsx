import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const PICKUP_SLOTS = [
  "Morning (9 AM - 12 PM)",
  "Afternoon (12 PM - 4 PM)",
  "Evening (4 PM - 8 PM)",
];

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

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Admin pickup scheduler for return/exchange requests
function PickupScheduler({ order, headers, onDone }) {
  const req = order.returnRequest || {};
  const [date, setDate] = useState(
    req.pickupDate ? new Date(req.pickupDate).toISOString().slice(0, 10) : ""
  );
  const [slot, setSlot] = useState(req.pickupSlot || "");
  const [address, setAddress] = useState(req.pickupAddress || order.address || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!date || !slot) {
      alert("Choose a pickup date and time slot");
      return;
    }
    try {
      setBusy(true);
      await axios.put(
        `http://localhost:3000/orders/${order._id}/pickup`,
        { pickupDate: date, pickupSlot: slot, pickupAddress: address },
        { headers }
      );
      onDone();
    } catch (err) {
      alert(err.response?.data?.message || "Could not schedule pickup");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5 space-y-2">
      <p className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide">
        Pickup schedule
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          min={todayInputValue()}
          max={maxPickupInputValue()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded-md p-1.5 text-xs bg-white"
        />
        <select
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          className="border rounded-md p-1.5 text-xs bg-white"
        >
          <option value="">Time slot</option>
          {PICKUP_SLOTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Pickup address"
        className="w-full border rounded-md p-1.5 text-xs bg-white"
      />
      <button
        onClick={save}
        disabled={busy}
        className="w-full bg-indigo-600 text-white text-xs font-semibold py-1.5 rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? "Saving..." : req.pickupDate ? "Reschedule pickup" : "Schedule pickup"}
      </button>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState("product");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [parentCategory, setParentCategory] = useState("");

  // product form
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [ratingMap, setRatingMap] = useState({});
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState([]);
  const [keptImages, setKeptImages] = useState([]);
  const [editProductId, setEditProductId] = useState(null);
  const [discount, setDiscount] = useState("");
  const [stock, setStock] = useState(10);

  // category form
  const [catTitle, setCatTitle] = useState("");
  const [editCategoryId, setEditCategoryId] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      const p = await axios.get("http://localhost:3000/product");
      const c = await axios.get("http://localhost:3000/categories");
      
      const fetchedProducts = p.data.products || p.data;
      const sortedProducts = [...fetchedProducts].sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return b._id.localeCompare(a._id);
      });
      setProducts(sortedProducts);

      setCategories(c.data.categories || c.data);

      try {
        const u = await axios.get("http://localhost:3000/users", { headers });
        setUsers(u.data.users || u.data || []);
      } catch (err) {
        console.log("Users endpoint not available or unauthorized");
      }

      try {
        const o = await axios.get("http://localhost:3000/orders", { headers });
        const fetchedOrders = o.data.orders || o.data || [];
        
        const sortedOrders = [...fetchedOrders].sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          return b._id.localeCompare(a._id);
        });

        setOrders(sortedOrders);
      } catch (err) {
        console.log("Orders endpoint not available or unauthorized");
      }

      // 🚀 FIXED: Reviews mapping loop error resolved here
      const r = await axios.get("http://localhost:3000/reviews");
      const list = Array.isArray(r.data) ? r.data : [];
      const map = {};

      list.forEach((rev) => {
        const pid = typeof rev.product === "object" 
          ? rev.product?._id?.toString() || rev.product?.toString() 
          : rev.product;
          
        if (pid) {
          if (!map[pid]) map[pid] = [];
          map[pid].push(rev.rating);
        }
      });

      const avg = {};
      Object.keys(map).forEach((id) => {
        const sum = map[id].reduce((a, b) => a + b, 0);
        avg[id] = (sum / map[id].length).toFixed(1);
      });

      setRatingMap(avg);
    } catch (err) {
      console.error("Load error:", err);
      setRatingMap({});
    }
  };

  useEffect(() => {
    if (localStorage.getItem("role") !== "admin") {
      window.location.href = "/login";
      return;
    }
    load();
  }, []);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const blockBack = () => {
      window.history.forward();
    };

    window.addEventListener("popstate", blockBack);

    return () => {
      window.removeEventListener("popstate", blockBack);
    };
  }, []);

  // ===== CATEGORY =====
  const saveCategory = async () => {
    const payload = {
      title: catTitle,
      parent: parentCategory || null,
    };

    if (editCategoryId) {
      await axios.put(
        `http://localhost:3000/categories/${editCategoryId}`,
        payload,
        { headers }
      );
      alert("Category updated successfully!");
    } else {
      await axios.post(
        "http://localhost:3000/categories",
        payload,
        { headers }
      );
      alert("Category created successfully!");
    }
    setCatTitle("");
    setParentCategory("");
    setEditCategoryId(null);
    load();
  };

  const startEditCategory = (c) => {
    setEditCategoryId(c._id);
    setCatTitle(c.title);
    setParentCategory(c.parent?._id || c.parent || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteCategory = async (id) => {
    await axios.delete(`http://localhost:3000/categories/${id}`, { headers });
    alert("Category deleted successfully!");
    load();
  };

  // ===== PRODUCT =====
  const saveProduct = async () => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("price", price);
    formData.append("discount", discount || 0);
    formData.append("description", description);
    formData.append("stock", stock || 0);
    if (category) formData.append("category", category);
    images.forEach((img) => formData.append("images", img));

    if (editProductId) {
      // Edit mode: purani images mein se jo remove ki wo exclude, baaki keep
      formData.append("keepImages", JSON.stringify(keptImages));
      await axios.put(
        `http://localhost:3000/product/${editProductId}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Product updated successfully!");
    } else {
      await axios.post("http://localhost:3000/product", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Product created successfully!");
    }

    setTitle("");
    setPrice("");
    setDiscount("");
    setDescription("");
    setCategory("");
    setImages([]);
    setKeptImages([]);
    setEditProductId(null);
    load();
  };

  const startEditProduct = (p) => {
    setEditProductId(p._id);
    setTitle(p.title || "");
    setPrice(p.price || "");
    setDiscount(p.discount || "");
    setDescription(p.description || "");
    setCategory(p.category?._id || p.category || "");
    setStock(p.stock ?? 10);
    setImages([]);
    setKeptImages(p.images || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteProduct = async (id) => {
    await axios.delete(`http://localhost:3000/product/${id}`, { headers });
    alert("Product deleted successfully!");
    load();
  };

  // ===== USERS MANAGEMENT =====
  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`http://localhost:3000/users/${id}`, { headers });
      load();
    } catch (err) {
      alert("Failed to delete user. Check backend API route.");
    }
  };
  // ===== ORDERS MANAGEMENT =====
  const updateOrderStatus = async (id, status) => {
    try {
      await axios.put(
        `http://localhost:3000/orders/${id}/status`,
        { status },
        { headers }
      );
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Could not update order status");
    }
  };

  const updateReturnStatus = async (id, status) => {
    try {
      await axios.put(
        `http://localhost:3000/orders/${id}/return-status`,
        { status },
        { headers }
      );
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Could not update return status");
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      await axios.delete(`http://localhost:3000/orders/${id}`, { headers });
      load(); // Data reload karega taaki list update ho jaye
    } catch (err) {
      alert("Failed to delete order.");
    }
  };

  // Category tree order: parent -> uski subcategories -> sub-subcategories
  const orderedCategories = useMemo(() => {
    const byId = {};
    categories.forEach((c) => {
      byId[c._id] = { ...c, children: [] };
    });
    const roots = [];
    categories.forEach((c) => {
      const pid = c.parent?._id || c.parent || null;
      const pidStr = pid?.toString?.() || pid;
      if (pidStr && byId[pidStr]) byId[pidStr].children.push(byId[c._id]);
      else roots.push(byId[c._id]);
    });
    roots.sort((a, b) => {
      if (a.title?.toLowerCase() === "popular") return -1;
      if (b.title?.toLowerCase() === "popular") return 1;
      return (a.title || "").localeCompare(b.title || "");
    });
    const out = [];
    const walk = (nodes) => nodes.forEach((n) => { out.push(n); walk(n.children); });
    walk(roots);
    return out;
  }, [categories]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    window.location.replace("/login");
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{scrollbar-width:none}`}</style>
      <div className="w-64 bg-neutral-900 text-white p-6 flex flex-col justify-between h-screen sticky top-0">
        <div>
          <h2 className="text-2xl font-bold mb-8 text-indigo-400 tracking-wide">Admin Portal</h2>

          <div className="space-y-2">
            <button
              onClick={() => setTab("product")}
              className={`block w-full text-left px-4 py-3 rounded-xl font-medium transition ${
                tab === "product" ? "bg-indigo-600 text-white shadow-lg" : "hover:bg-neutral-800 text-gray-300"
              }`}
            >
              📦 Products
            </button>

            <button
              onClick={() => setTab("category")}
              className={`block w-full text-left px-4 py-3 rounded-xl font-medium transition ${
                tab === "category" ? "bg-indigo-600 text-white shadow-lg" : "hover:bg-neutral-800 text-gray-300"
              }`}
            >
              🏷️ Categories
            </button>

            <button
              onClick={() => setTab("users")}
              className={`block w-full text-left px-4 py-3 rounded-xl font-medium transition ${
                tab === "users" ? "bg-indigo-600 text-white shadow-lg" : "hover:bg-neutral-800 text-gray-300"
              }`}
            >
              👥 Users Management
            </button>

            <button
              onClick={() => setTab("orders")}
              className={`block w-full text-left px-4 py-3 rounded-xl font-medium transition ${
                tab === "orders" ? "bg-indigo-600 text-white shadow-lg" : "hover:bg-neutral-800 text-gray-300"
              }`}
            >
              🛍️ All Orders
            </button>
          </div>
        </div>

        <button
          onClick={logout}
          className="block w-full text-left px-4 py-3 rounded-xl text-red-400 hover:bg-neutral-800 font-semibold transition"
        >
          🚪 Logout
        </button>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        {tab === "category" ? (
          <div>
            <h1 className="text-2xl font-bold mb-6 text-neutral-800">
              {editCategoryId ? "Edit Category" : "Create Category"}
            </h1>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Form — right side on desktop */}
            <div className="flex flex-col gap-4 lg:w-96 shrink-0 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 lg:order-2">
              <input
                className="border p-3 rounded-xl focus:outline-none focus:border-indigo-600"
                value={catTitle}
                onChange={(e) => setCatTitle(e.target.value)}
                placeholder="Category name"
              />

              <select
                className="border p-3 rounded-xl bg-white focus:outline-none focus:border-indigo-600"
                value={parentCategory}
                onChange={(e) => setParentCategory(e.target.value)}
              >
                <option value="">None (Make this a Main Category)</option>
                {categories
                  .filter((c) => c._id !== editCategoryId)
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                    </option>
                  ))}
              </select>

              <button
                onClick={saveCategory}
                className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
              >
                {editCategoryId ? "Update Category" : "Add Category"}
              </button>
            </div>

            {/* Table — left side, takes remaining space */}
            <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto lg:order-1">
  <table className="w-full border-collapse">
    <thead>
      <tr className="bg-gray-100 text-left text-gray-700 text-sm">
        <th className="p-4 border-b">Category</th>
        <th className="p-4 border-b">Type</th>
        <th className="p-4 border-b">Parent</th>
        <th className="p-4 border-b">Edit</th>
        <th className="p-4 border-b">Delete</th>
      </tr>
    </thead>
    <tbody>
      {orderedCategories.map((c) => {
          const parentId = c.parent?._id || c.parent || null;
          const parentObj = categories.find(
            (item) => item._id === parentId || item._id === parentId?._id
          );

          // Parent ka parent = nested sub
          const grandParentId = parentObj
            ? parentObj.parent?._id || parentObj.parent
            : null;

          let type = "Main";
          let indent = "";

          if (parentId && !grandParentId) {
            type = "Sub";
            indent = "pl-6";
          } else if (parentId && grandParentId) {
            type = "Sub-Sub";
            indent = "pl-12";
          }

          return (
            <tr key={c._id} className="border-b hover:bg-gray-50 text-sm">
              <td className={`p-4 font-medium text-gray-900 ${indent}`}>
                {type !== "Main" && (
                  <span className="text-gray-400 mr-2">↳</span>
                )}
                {c.title}
              </td>

              <td className="p-4">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    type === "Main"
                      ? "bg-indigo-100 text-indigo-800"
                      : type === "Sub"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-pink-100 text-pink-800"
                  }`}
                >
                  {type}
                </span>
              </td>

              <td className="p-4 text-gray-500">
                {parentObj ? parentObj.title : "—"}
              </td>

              <td className="p-4">
                <button
                  className="text-blue-600 font-semibold hover:underline"
                  onClick={() => startEditCategory(c)}
                >
                  Edit
                </button>
              </td>

              <td className="p-4">
                <button
                  className="text-red-600 font-semibold hover:underline"
                  onClick={() => deleteCategory(c._id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          );
        })}
    </tbody>
  </table>
</div>
            </div>
          </div>
        ) : tab === "users" ? (
          <div>
            <h1 className="text-2xl font-bold mb-6 text-neutral-800">Registered Users ({users.length})</h1>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left text-gray-700 text-sm">
                    <th className="p-4 border-b">Name</th>
                    <th className="p-4 border-b">Email</th>
                    <th className="p-4 border-b">Role</th>
                    <th className="p-4 border-b">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-500">No users found or API route missing.</td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u._id} className="border-b hover:bg-gray-50 text-sm">
                        <td className="p-4 font-medium text-gray-900">{u.name || u.userName || "Customer"}</td>
                        <td className="p-4 text-gray-600">{u.email}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                            {u.role || "user"}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            className="text-red-600 font-semibold hover:underline"
                            onClick={() => deleteUser(u._id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
       ) : tab === "orders" ? (
          /* ===== ORDERS TAB CONTENT ===== */
          <div>
            <h1 className="text-2xl font-bold mb-6 text-neutral-800">Store Orders ({orders.length})</h1>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto hide-scrollbar">
              <table className="w-full min-w-[1600px] border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left text-gray-700 text-sm">
                    <th className="p-4 border-b">Order ID</th>
                    <th className="p-4 border-b">Product</th>
                    <th className="p-4 border-b">Qty & Size</th>
                    <th className="p-4 border-b">Total Price</th>
                    <th className="p-4 border-b">Payment</th>
                    <th className="p-4 border-b">Phone</th>
                    <th className="p-4 border-b">Customer</th>
                    <th className="p-4 border-b">Email</th>
                    <th className="p-4 border-b">Address</th>
                    <th className="p-4 border-b">Status</th>
                    <th className="p-4 border-b">Rating</th>
                    <th className="p-4 border-b">Action</th> {/* 👈 Naya Action Column */}
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="p-8 text-center text-gray-500">No orders placed yet.</td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o._id} className="border-b hover:bg-gray-50 text-sm">
                        <td className="p-4 font-mono text-xs text-gray-500">{o._id}</td>
                        <td className="p-4 font-medium text-gray-900">{o.product?.title || "Product item"}</td>
                        <td className="p-4 text-gray-700">Size: {o.size || "M"} | Qty: {o.quantity || 1}</td>
                        <td className="p-4 font-bold text-red-900">₹{o.price}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold">
                            {o.payment || "COD"}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600">{o.phone || "—"}</td>
                        <td className="p-4">
                          <p className="font-medium text-gray-900">{o.user?.name || "—"}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{o.user?._id || ""}</p>
                        </td>
                        <td className="p-4 text-gray-600 text-xs">{o.user?.email || "—"}</td>
                        <td className="p-4 text-gray-600 text-xs max-w-[220px]">
                          <span className="line-clamp-2" title={o.address || ""}>{o.address || "—"}</span>
                        </td>
                        <td className="p-4">
                          {o.cancelledByCustomer || o.cancelledBy === "customer" ? (
                            <span className="inline-flex px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-800">
                              Order cancelled by customer
                            </span>
                          ) : (
                            <select
                              value={o.status || "Placed"}
                              onChange={(e) => updateOrderStatus(o._id, e.target.value)}
                              className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold bg-white"
                            >
                              {[
                                "Placed",
                                "Confirmed",
                                "Packed",
                                "Shipped",
                                "Out for Delivery",
                                "Delivered",
                                "Cancelled",
                              ].map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          )}
                          {o.returnRequest?.requestType && (
                            <div className="mt-2">
                              <p className="text-[11px] text-gray-500 mb-1">
                                {o.returnRequest.requestType === "exchange" ? "Exchange" : "Return"} request
                                {o.returnRequest.reason ? ` · ${o.returnRequest.reason}` : ""}
                                {(o.returnRequest.exchangeSize || o.returnRequest.exchangeProductTitle) && (
                                  <span className="block text-indigo-600 font-semibold mt-0.5">
                                    Replace with: {o.returnRequest.exchangeProductTitle || "same item"}
                                    {o.returnRequest.exchangeSize ? ` · Size ${o.returnRequest.exchangeSize}` : ""}
                                  </span>
                                )}
                              </p>
                              <select
                                value={o.returnRequest.status || "Requested"}
                                onChange={(e) => updateReturnStatus(o._id, e.target.value)}
                                className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold bg-white"
                              >
                                {["Requested", "Approved", "Picked up", "Refunded", "Exchanged", "Rejected"].map(
                                  (status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  )
                                )}
                              </select>
                              {o.returnRequest.pickupDate && (
                                <p className="text-[11px] text-gray-500 mt-1">
                                  Pickup: {formatDate(o.returnRequest.pickupDate)}
                                  {o.returnRequest.pickupSlot ? ` · ${o.returnRequest.pickupSlot}` : ""}
                                  {o.returnRequest.pickedUpAt
                                    ? ` · Picked up ${formatDate(o.returnRequest.pickedUpAt)}`
                                    : ""}
                                </p>
                              )}
                              {o.returnRequest.images?.length > 0 && (
                                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                  {o.returnRequest.images.map((img, i) => (
                                    <a key={i} href={img.url} target="_blank" rel="noreferrer" title="View photo">
                                      <img
                                        src={img.url}
                                        alt={`Attachment ${i + 1}`}
                                        className="w-12 h-12 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition"
                                      />
                                    </a>
                                  ))}
                                </div>
                              )}
                              {["Requested", "Approved"].includes(o.returnRequest.status) && (
                                <PickupScheduler order={o} headers={headers} onDone={load} />
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-semibold text-amber-600">
                          {o.rating || "—"}
                        </td>
                        <td className="p-4">
                          {/* 👈 Delete Button */}
                          <button
                            onClick={() => deleteOrder(o._id)}
                            className="text-red-600 font-semibold hover:underline text-xs bg-red-50 px-3 py-1.5 rounded-lg border border-red-200"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold mb-6 text-neutral-800">
              {editProductId ? "Edit Product" : "Create Product"}
            </h1>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  className="border p-3 rounded-xl focus:outline-none focus:border-indigo-600 text-sm"
                  placeholder="Product Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <input
                  className="border p-3 rounded-xl focus:outline-none focus:border-indigo-600 text-sm"
                  placeholder="Price (₹)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <input
                  className="border p-3 rounded-xl focus:outline-none focus:border-indigo-600 text-sm"
                  placeholder="Discount %"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
                <input
                  className="border p-3 rounded-xl focus:outline-none focus:border-indigo-600 text-sm"
                  placeholder="Stock quantity"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </div>

              <textarea
                className="border p-3 rounded-xl w-full mb-4 focus:outline-none focus:border-indigo-600 text-sm"
                placeholder="Product Description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <select
                className="border p-3 rounded-xl w-full mb-4 bg-white focus:outline-none focus:border-indigo-600 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">
                  Product Images (up to 5){editProductId ? " — add more or remove existing" : ""}
                </label>
                {editProductId && keptImages.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap mb-2">
                    {keptImages.map((img, i) => (
                      <div key={img.public_id || i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setKeptImages((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  onChange={(e) => setImages((prev) => [...prev, ...Array.from(e.target.files || [])].slice(0, 5))}
                />
                {images.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {images.map((img, i) => (
                      <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border-2 border-indigo-300">
                        <img src={URL.createObjectURL(img)} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveProduct}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
                >
                  {editProductId ? "Update Product" : "Add Product"}
                </button>
                {editProductId && (
                  <button
                    onClick={() => {
                      setEditProductId(null);
                      setTitle(""); setPrice(""); setDiscount(""); setDescription("");
                      setCategory(""); setImages([]); setKeptImages([]);
                    }}
                    className="px-6 py-3 rounded-xl font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left text-gray-700 text-sm">
                    <th className="p-4 border-b">Image</th>
                    <th className="p-4 border-b">Title</th>
                    <th className="p-4 border-b">Price</th>
                    <th className="p-4 border-b">Discount</th>
                    <th className="p-4 border-b">Stock</th>
                    <th className="p-4 border-b">Rating</th>
                    <th className="p-4 border-b">Edit</th>
                    <th className="p-4 border-b">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p._id} className="border-b hover:bg-gray-50 text-sm">
                      <td className="p-4">
                        <img
                          src={p.images?.[0]?.url || "https://via.placeholder.com/60"}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                        />
                      </td>
                      <td className="p-4 font-medium text-gray-900">{p.title}</td>
                      <td className="p-4 font-semibold text-gray-800">₹{p.price}</td>
                      <td className="p-4 text-gray-600">
                        {p.discount ? `${p.discount}%` : "—"}
                      </td>
                      <td className="p-4 text-gray-600">{p.stock ?? 0}</td>
                      <td className="p-4 text-amber-600 font-semibold">
                        {ratingMap[p._id] ? `⭐ ${ratingMap[p._id]}` : "—"}
                      </td>
                      <td className="p-4">
                        <button
                          className="text-blue-600 font-semibold hover:underline"
                          onClick={() => startEditProduct(p)}
                        >
                          Edit
                        </button>
                      </td>
                      <td className="p-4">
                        <button
                          className="text-red-600 font-semibold hover:underline"
                          onClick={() => deleteProduct(p._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}