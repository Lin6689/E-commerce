import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { sizeOptions, defaultSize } from "../utils/sizeOptions";

function Stars({ value, size = "text-lg" }) {
  const rounded = Math.round(value);
  return (
    <span className={`${size} tracking-tight`} aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rounded ? "text-amber-400" : "text-gray-300"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { handleAddToCart, handleToggleWishlist, wishlist } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [size, setSize] = useState("M");
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:3000/product/${id}`);
        const data = await res.json();
        const next = data.data || data.product || data;
        setProduct(next);
        const sizes = sizeOptions(next);
        setSize(defaultSize(sizes));
        setActiveImage(0);
        setQty(1);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`http://localhost:3000/reviews/${id}`)
      .then((res) => res.json())
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setReviews([]));
  }, [id]);

  useEffect(() => {
    const title = product?.category?.title;
    if (!title || !product?._id) {
      setRelated([]);
      return;
    }
    fetch(`http://localhost:3000/product?category=${encodeURIComponent(title)}`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.products || data || [];
        setRelated(list.filter((item) => item._id !== product._id).slice(0, 4));
      })
      .catch(() => setRelated([]));
  }, [product]);

  if (loading) {
    return <div className="text-center py-24 text-gray-500">Loading...</div>;
  }

  if (!product) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 mb-4">Product not found</p>
        <Link to="/shop" className="text-indigo-600 font-medium">
          Back to Shop
        </Link>
      </div>
    );
  }

  const name = product.title || product.name || "Product";
  const price = product.price || 0;
  const discount = product.discount || 0;
  const finalPrice = Math.round(price * (1 - discount / 100));
  const savings = price - finalPrice;
  const description = product.description || "No description available.";
  const images = (product.images || [])
    .map((img) => img?.url)
    .filter(Boolean);
  if (!images.length && product.image) images.push(product.image);
  if (!images.length) images.push("https://via.placeholder.com/800");
  const image = images[activeImage] || images[0];
  const productId = product._id || product.id;
  const stock = product.stock ?? 0;
  const categoryTitle = product.category?.title || "General";
  const wished = wishlist.some((item) => (item._id || item.id) === productId);
  const sizes = sizeOptions(product);

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 4);

  const addToCart = () => {
    const item = { ...product, size };
    for (let i = 0; i < qty; i += 1) handleAddToCart(item);
  };

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length
      : 0;

  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Number(r.rating) === star).length,
  }));

  const handleBuyNow = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    navigate(`/buy/${productId}`, { state: { size, finalPrice, quantity: qty } });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6 flex-wrap">
        <Link to="/" className="hover:text-red-900 transition">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-red-900 transition">Shop</Link>
        <span>/</span>
        <Link to={`/shop?category=${encodeURIComponent(categoryTitle)}`} className="hover:text-red-900 transition">
          {categoryTitle}
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium truncate max-w-[200px]">{name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-start">
        {/* ===== LEFT — Gallery ===== */}
        <div className="lg:sticky lg:top-24">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-stone-50 to-gray-100 border border-gray-100 shadow-sm">
            <img
              src={image}
              alt={name}
              className="w-full h-[380px] md:h-[540px] object-cover hover:scale-[1.03] transition duration-700"
            />
            {discount > 0 && (
              <span className="absolute top-4 left-4 bg-red-600 text-white text-sm font-bold px-3.5 py-1.5 rounded-full shadow-lg">
                {discount}% OFF
              </span>
            )}
            {stock < 1 && (
              <span className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
                <span className="bg-red-600 text-white font-bold px-6 py-3 rounded-2xl text-lg shadow-xl">
                  Out of Stock
                </span>
              </span>
            )}
            <button
              type="button"
              onClick={() => handleToggleWishlist(product)}
              className={`absolute top-4 right-4 w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition transform hover:scale-110 ${
                wished ? "bg-red-600 text-white" : "bg-white/90 text-gray-500 hover:text-red-600"
              }`}
              aria-label="Wishlist"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill={wished ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          {images.length > 1 && (
            <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
              {images.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 shrink-0 transition ${
                    activeImage === index
                      ? "border-red-900 shadow-md"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ===== RIGHT — Details ===== */}
        <div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.15em] text-red-700 bg-red-50 border border-red-100 px-3 py-1 rounded-full mb-3">
            {categoryTitle}
          </span>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 mb-3 leading-tight">
            {name}
          </h1>

          {/* Rating row */}
          <div className="flex items-center gap-3 mb-5">
            {reviews.length > 0 ? (
              <>
                <span className="bg-green-700 text-white text-sm font-bold px-2 py-0.5 rounded">
                  {avgRating.toFixed(1)}
                </span>
                <Stars value={avgRating} size="text-base" />
                <a href="#reviews" className="text-sm text-gray-500 hover:text-red-900 underline underline-offset-2">
                  {reviews.length} ratings
                </a>
              </>
            ) : (
              <span className="text-sm text-gray-400">No ratings yet — be the first to review</span>
            )}
          </div>

          {/* Price card */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50/60 border border-red-100 rounded-2xl p-5 mb-5">
            <div className="flex items-end gap-3 flex-wrap">
              <span className="text-4xl font-extrabold text-gray-900">₹{finalPrice}</span>
              {discount > 0 && (
                <>
                  <span className="text-lg text-gray-400 line-through mb-1">₹{price}</span>
                  <span className="text-green-700 font-bold text-sm bg-green-100 px-2 py-0.5 rounded-full mb-1">
                    Save ₹{savings} ({discount}%)
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">Inclusive of all taxes · Free shipping over ₹999</p>
          </div>

          <p className="text-gray-600 leading-relaxed mb-6">{description}</p>

          {/* Size selector */}
          {sizes.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-800 mb-2.5">
                {sizes.some((s) => s.includes("ml") || s.includes(" g"))
                  ? "Select volume / weight"
                  : sizes[0] === "7"
                  ? "Select shoe size"
                  : "Select size"}
                <span className="text-gray-400 font-normal ml-2">Size guide</span>
              </p>
              <div className="flex gap-2.5 flex-wrap">
                {sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`min-w-[52px] h-11 px-4 rounded-xl text-sm font-bold border-2 transition ${
                      size === s
                        ? "bg-red-900 text-white border-red-900 shadow-md shadow-red-900/20"
                        : "bg-white text-gray-700 border-gray-200 hover:border-red-900 hover:text-red-900"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <p className="text-sm font-semibold text-gray-800">Quantity</p>
            <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-10 h-10 text-lg font-bold hover:bg-gray-50 transition"
              >
                −
              </button>
              <span className="w-10 text-center font-bold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(stock || 1, q + 1))}
                className="w-10 h-10 text-lg font-bold hover:bg-gray-50 transition"
              >
                +
              </button>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {stock > 0 ? `${stock} in stock` : "Out of stock"}
            </span>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3 mb-7">
            <button
              onClick={addToCart}
              disabled={stock < 1}
              className="flex-1 min-w-[160px] px-8 py-4 rounded-2xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition shadow-lg shadow-gray-900/10 disabled:opacity-40"
            >
              Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              disabled={stock < 1}
              className="flex-1 min-w-[160px] px-8 py-4 rounded-2xl bg-red-700 text-white font-bold hover:bg-red-800 transition shadow-lg shadow-red-700/20 disabled:opacity-40"
            >
              Buy Now
            </button>
          </div>

          {/* Delivery / returns highlight cards */}
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
              <span className="text-xl">🚚</span>
              <div>
                <p className="font-bold text-gray-900 text-sm">
                  Delivery by {deliveryDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Ships in ~2 days · Free over ₹999</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
              <span className="text-xl">↩️</span>
              <div>
                <p className="font-bold text-gray-900 text-sm">7-day return & exchange</p>
                <p className="text-xs text-gray-500 mt-0.5">Pickup scheduled from My Orders</p>
              </div>
            </div>
          </div>

          {/* Service highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-7 text-center">
            {[
              ["✓", "Secure Payment"],
              ["✓", "Easy Returns"],
              ["✓", "24/7 Support"],
              ["✓", "COD Available"],
            ].map(([icon, label]) => (
              <div key={label} className="py-3 px-2 rounded-xl bg-stone-50 border border-gray-100">
                <p className="text-green-600 font-bold">{icon}</p>
                <p className="text-[11px] font-semibold text-gray-600 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Details table */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden text-sm">
            {[
              ["Category", categoryTitle],
              ["Availability", stock > 0 ? `In Stock (${stock} left)` : "Out of Stock"],
              
            ].map(([k, v], i) => (
              <div key={k} className={`grid grid-cols-3 ${i < 2 ? "border-b" : ""}`}>
                <p className="p-3.5 bg-gray-50 text-gray-500 font-medium">{k}</p>
                <p className="p-3.5 font-semibold text-gray-900 col-span-2 break-all">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Related products ===== */}
      {related.length > 0 && (
        <div className="mt-16">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl font-extrabold text-red-950">You may also like</h2>
            <Link to={`/shop?category=${encodeURIComponent(categoryTitle)}`} className="text-sm font-semibold text-red-900 hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((item) => {
              const img = item.images?.[0]?.url || item.image || "https://via.placeholder.com/300";
              const itemPrice = Math.round((item.price || 0) * (1 - (item.discount || 0) / 100));
              return (
                <Link
                  key={item._id}
                  to={`/product/${item._id}`}
                  className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="overflow-hidden">
                    <img
                      src={img}
                      alt={item.title}
                      className="h-44 w-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                  <div className="p-3.5">
                    <p className="text-sm font-semibold line-clamp-1 text-gray-900">{item.title}</p>
                    <p className="text-base font-extrabold text-red-900 mt-1">₹{itemPrice}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Reviews ===== */}
      <div id="reviews" className="mt-16 pt-10 border-t border-gray-100 scroll-mt-24">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-extrabold text-red-950">Customer Reviews</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="bg-green-700 text-white text-sm font-bold px-2 py-0.5 rounded">{avgRating.toFixed(1)}</span>
              <Stars value={avgRating} size="text-sm" />
              <span className="text-sm text-gray-400">({reviews.length})</span>
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-2xl p-12 text-center bg-gray-50/50">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-gray-500 font-medium">No reviews yet. Purchased this item? Share your experience!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Rating summary */}
            <div className="lg:col-span-1 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm h-fit">
              <p className="text-5xl font-extrabold text-gray-900">{avgRating.toFixed(1)}</p>
              <div className="mt-1 mb-3"><Stars value={avgRating} /></div>
              <p className="text-sm text-gray-500 mb-5">Based on {reviews.length} review{reviews.length > 1 ? "s" : ""}</p>
              <div className="space-y-2">
                {ratingDist.map(({ star, count }) => (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-7 text-gray-500 font-semibold">{star} ★</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-gray-400">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review cards */}
            <div className="lg:col-span-3">
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: "thin" }}>
                {reviews.map((r) => (
                  <div
                    key={r._id}
                    className="min-w-[280px] sm:min-w-[320px] max-w-[350px] flex-shrink-0 bg-white border border-gray-100 p-5 rounded-2xl shadow-sm snap-start hover:shadow-md transition"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-red-900 text-white flex items-center justify-center font-bold">
                        {(r.userName || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{r.userName || "User"}</p>
                        <p className="text-xs text-gray-400">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                        </p>
                      </div>
                      <span className="text-amber-500 text-sm">{"★".repeat(Math.min(5, Number(r.rating) || 0))}</span>
                    </div>
                    {r.comment && <p className="text-gray-600 text-sm leading-relaxed">{r.comment}</p>}
                  </div>
                ))}
              </div>
              {reviews.length > 2 && (
                <p className="text-xs text-gray-400 text-right mt-2">← Scroll horizontally to see more reviews →</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
