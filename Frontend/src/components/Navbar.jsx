import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import axios from "axios";

export default function Navbar() {
  const { cartCount, wishlistCount } = useCart();
  const [userImage, setUserImage] = useState("");
  const [userName, setUserName] = useState("User");
  const location = useLocation();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);
  const searchTimer = useRef(null);

  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) return;

    axios
      .get("http://localhost:3000/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setUserImage(res.data.image || "");
        setUserName(res.data.name || "User");
        localStorage.setItem("userImage", res.data.image || "");
        localStorage.setItem("userName", res.data.name || "");
      })
      .catch(() => {});
  }, [token, location.pathname]);

  // Live product search with debounce
  useEffect(() => {
    const term = searchTerm.trim();
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (term.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await axios.get("http://localhost:3000/product", {
          params: { q: term },
        });
        const list = res.data.products || res.data || [];
        setSearchResults(Array.isArray(list) ? list.slice(0, 6) : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer.current);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const goToResults = () => {
    const term = searchTerm.trim();
    if (!term) return;
    setShowResults(false);
    setSearchTerm("");
    navigate(`/shop?search=${encodeURIComponent(term)}`);
  };

  const openProduct = (id) => {
    setShowResults(false);
    setSearchTerm("");
    navigate(`/product/${id}`);
  };

  const productPrice = (p) =>
    Math.round((Number(p.price) || 0) * (1 - (Number(p.discount) || 0) / 100));

  const productImage = (p) =>
    p.images?.[0]?.url || p.image || "https://via.placeholder.com/100";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("userImage");
    localStorage.removeItem("userName");
    window.location.href = "/login";
  };

  return (
    <nav className="bg-white border-b sticky top-0 z-[150] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-red-900">
          Shop
        </Link>

        {/* Global Search */}
        <div ref={searchRef} className="relative flex-1 max-w-md mx-4 hidden sm:block">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goToResults();
                if (e.key === "Escape") setShowResults(false);
              }}
              placeholder="Search products, brands and more..."
              className="w-full pl-4 pr-10 py-2 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-900/20 focus:border-red-900 focus:bg-white transition"
            />
            <button
              type="button"
              onClick={goToResults}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-red-900 text-white flex items-center justify-center hover:bg-red-800 transition"
              aria-label="Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {showResults && searchTerm.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-[200] overflow-hidden">
              {searching ? (
                <p className="px-4 py-3 text-sm text-gray-400">Searching...</p>
              ) : searchResults.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-500">
                  No products found for "{searchTerm.trim()}"
                </p>
              ) : (
                <ul>
                  {searchResults.map((p) => (
                    <li key={p._id}>
                      <button
                        type="button"
                        onClick={() => openProduct(p._id)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-red-50 text-left transition"
                      >
                        <img
                          src={productImage(p)}
                          alt=""
                          className="w-11 h-11 rounded-lg object-cover bg-gray-100 shrink-0"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-gray-900 truncate">
                            {p.title}
                          </span>
                          <span className="block text-xs text-red-900 font-semibold">
                            ₹{productPrice(p)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={goToResults}
                className="w-full px-4 py-2.5 text-sm font-semibold text-red-900 bg-red-50 hover:bg-red-100 border-t border-gray-100 transition"
              >
                View all results for "{searchTerm.trim()}"
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6 text-red-900 font-medium">
          <Link to="/">Home</Link>
          <Link to="/shop">Shop</Link>
          <Link to="/colors">Colors</Link>
          <Link to="/contact">Contact</Link>
        </div>

        <div className="flex items-center gap-4">
          {/* Wishlist */}
          <Link to="/wishlist" className="relative text-red-900">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            {wishlistCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-900 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link
            to={token ? "/orders" : "/login"}
            className="text-red-900"
            title="My Orders"
            aria-label="My Orders"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </Link>

          {/* Cart */}
          <Link to="/cart" className="relative text-red-900">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-900 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Account Dropdown with Hover & Smooth Animation */}
          {token ? (
            <div className="relative group py-2">
              <button className="w-9 z-[160] h-9 rounded-full overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                {userImage ? (
                  <img
                    src={userImage}
                    alt="account"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-red-900 text-sm font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>

              {/* Animated Hover Dropdown Menu */}
              <div className="absolute right-0 top-full w-52 bg-white border border-gray-100 rounded-xl shadow-xl py-2 z-50 opacity-0 invisible translate-y-2 scale-95 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:scale-100 transition-all duration-200 ease-out origin-top-right">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100"
                >
                  {userImage ? (
                    <img
                      src={userImage}
                      alt="profile"
                      className="w-10 h-10 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-900 text-white flex items-center justify-center font-bold">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-red-900 truncate max-w-[110px]">{userName}</p>
                    <p className="text-xs text-gray-500">View profile</p>
                  </div>
                </Link>

                <Link
                  to="/orders"
                  className="block px-4 py-2.5 text-sm text-red-900 font-medium hover:bg-red-50 transition-colors"
                >
                  My Orders
                </Link>

                {role === "admin" && (
                  <Link
                    to="/admin"
                    className="block px-4 py-2.5 text-sm text-red-900 font-medium hover:bg-red-50 transition-colors"
                  >
                    Admin Panel
                  </Link>
                )}

                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 font-medium hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="relative group py-2">
              <button className="w-9 h-9 rounded-full border border-gray-300 bg-gray-100 flex items-center justify-center text-red-900 transition-transform duration-200 group-hover:scale-105">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </button>

              {/* Animated Hover Dropdown Menu */}
              <div className="absolute right-0 top-full w-40 bg-white border border-gray-100 rounded-xl shadow-xl py-2 z-50 opacity-0 invisible translate-y-2 scale-95 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:scale-100 transition-all duration-200 ease-out origin-top-right">
                <Link
                  to="/login"
                  className="block px-4 py-2 text-sm text-red-900 font-medium hover:bg-red-50 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block px-4 py-2 text-sm text-red-900 font-medium hover:bg-red-50 transition-colors"
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}