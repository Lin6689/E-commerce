import { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ProductList from "../components/ProductList";
import { useCart } from "../context/CartContext";

export default function Shop() {
  const { handleAddToCart, handleToggleWishlist, wishlist } = useCart();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [colorFilter, setColorFilter] = useState("");
  const [ratingMap, setRatingMap] = useState({});
 const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Sort state
  const [sortOption, setSortOption] = useState(""); 
  const perPage = 12; 

  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: dir === "left" ? -250 : 250,
        behavior: "smooth",
      });
    }
  };

  // URL filters sync
  useEffect(() => {
    const categoryFromUrl = searchParams.get("category");
    const categoryIdFromUrl = searchParams.get("categoryId");
    const colorFromUrl = searchParams.get("color");

    setSelectedCategory(categoryFromUrl || categoryIdFromUrl || "All");
    setColorFilter(colorFromUrl ? colorFromUrl.toLowerCase() : "");
    setSearchTerm(searchParams.get("search") || "");
  }, [searchParams]);

  // Fetch categories once on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const catRes = await fetch("http://localhost:3000/categories");
        const catData = await catRes.json();
        setCategories(catData.categories || catData || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // Search ke liye debounce (har keystroke pe fetch na ho)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Products sirf URL se fetch karo. selectedCategory state se request mat banao,
  // warna All Products click pe purani category ki response list overwrite kar deti hai.
  // Search active ho toh category/color filter bypass karke SAARE products lao,
  // warna dusri category ka product search mein kabhi nahi aayega.
  useEffect(() => {
    let ignore = false;

    const fetchProducts = async () => {
      try {
        setLoading(true);

        const searching = debouncedSearch.length > 0;
        let productUrl = "http://localhost:3000/product";
        const categoryParam = (searchParams.get("category") || "").trim();
        const categoryIdParam = searchParams.get("categoryId");
        const colorParam = searchParams.get("color");
        const params = new URLSearchParams();

        const isAll =
          !categoryParam ||
          categoryParam === "All" ||
          categoryParam.toLowerCase() === "all products";

        if (!searching) {
          if (!isAll) {
            params.append("category", categoryParam);
          } else if (categoryIdParam) {
            params.append("categoryId", categoryIdParam);
          }

          if (colorParam) {
            params.append("color", colorParam);
          }
        }
        if (params.toString()) {
          productUrl += `?${params.toString()}`;
        }

        const res = await fetch(productUrl);
        const data = await res.json();
        if (!ignore) {
          setProducts(data.products || data || []);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      ignore = true;
    };
  }, [searchParams, debouncedSearch]);

  // Ratings fetch
  useEffect(() => {
    fetch("http://localhost:3000/reviews")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const map = {};

        list.forEach((r) => {
          const pid =
            typeof r.product === "object"
              ? r.product?._id?.toString?.() || ""
              : r.product?.toString?.() || "";
          if (!pid) return;
          if (!map[pid]) map[pid] = [];
          map[pid].push(Number(r.rating) || 0);
        });

        const avg = {};
        Object.keys(map).forEach((id) => {
          const sum = map[id].reduce((a, b) => a + b, 0);
          avg[id] = (sum / map[id].length).toFixed(1);
        });

        setRatingMap(avg);
      })
      .catch(() => setRatingMap({}));
  }, []);

  // Category id -> category map (parent chain ke liye)
  const categoryById = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      const id = c._id?.toString?.() || c._id;
      if (id) map[id] = c;
    });
    return map;
  }, [categories]);

  // Product ki category + saari parent category titles nikaalo
  const categoryTitlesFor = (item) => {
    const titles = [];
    const isObj = typeof item.category === "object" && item.category !== null;
    let id = isObj
      ? item.category._id?.toString?.() || item.category._id
      : item.category;
    id = id?.toString?.() || id;

    const direct = isObj ? item.category.title : categoryById[id]?.title;
    if (direct) titles.push(direct.toLowerCase());

    let guard = 0;
    while (id && guard < 5) {
      const c = categoryById[id];
      if (!c) break;
      const pid = (c.parent?._id || c.parent)?.toString?.() || null;
      if (!pid || pid === id) break;
      const parent = categoryById[pid];
      if (parent?.title) titles.push(parent.title.toLowerCase());
      id = pid;
    }
    return titles;
  };

  // Filter products (Search across title, description, and category names)
  const filteredProducts = products.filter((item) => {
    const search = searchTerm.toLowerCase().trim();

    const title = (item.title || "").toLowerCase();
    const description = (item.description || "").toLowerCase();
    const catTitles = categoryTitlesFor(item);

    const matchesSearch =
      !search ||
      title.includes(search) ||
      description.includes(search) ||
      catTitles.some((t) => t.includes(search));

    // Category filter API pe already lag chuka hai, child categories ke saath.
    // Yahan exact title match mat lagao, warna parent category (Popular, etc.)
    // ke products hide ho jate hain.
   // Search active ho toh color filter bypass (warna saari products pe search ho sake)
   const matchesColor =
    search ||
    !colorFilter ||
    title.toLowerCase().includes(colorFilter.toLowerCase()) ||
    description.toLowerCase().includes(colorFilter.toLowerCase());

   return matchesSearch && matchesColor;
  });

  const sellingPrice = (item) => {
    const price = Number(item.price) || 0;
    const discount = Number(item.discount) || 0;
    return Math.round(price * (1 - discount / 100));
  };

  // Sort by the price shown on the card, not the original MRP.
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    const idOf = (item) => item._id?.toString?.() || item._id || "";
    list.sort((a, b) => {
      if (sortOption === "price-low-to-high") {
        return sellingPrice(a) - sellingPrice(b) || (a.title || "").localeCompare(b.title || "");
      }
      if (sortOption === "price-high-to-low") {
        return sellingPrice(b) - sellingPrice(a) || (a.title || "").localeCompare(b.title || "");
      }
      if (sortOption === "discount-high-to-low") {
        return (Number(b.discount) || 0) - (Number(a.discount) || 0) || sellingPrice(a) - sellingPrice(b);
      }
      if (sortOption === "rating-high-to-low") {
        const ratingA = parseFloat(ratingMap[idOf(a)]) || 0;
        const ratingB = parseFloat(ratingMap[idOf(b)]) || 0;
        return ratingB - ratingA || sellingPrice(a) - sellingPrice(b);
      }
      return 0;
    });
    return list;
  }, [products, searchTerm, colorFilter, sortOption, ratingMap, categories]);

  // Pagination logic
  const totalPages = Math.ceil(sortedProducts.length / perPage) || 1;
  const start = (page - 1) * perPage;
  const pageProducts = sortedProducts.slice(start, start + perPage);

  // Reset to page 1 whenever filters or sorting change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCategory, colorFilter, sortOption]);

  return (
    <div className="w-full px-6 lg:px-12 py-8 text-red-900 bg-gradient-to-b from-gray-50/50 to-white min-h-screen">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-200/60 pb-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-red-950">Explore Collection</h1>
          <p className="text-sm text-gray-500 mt-1">Discover our exclusive range of handpicked products</p>
        </div>

        {/* Search and Sort Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-900/20 focus:border-red-900 transition-all"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-900 text-sm"
                aria-label="Clear search"
              >
                ✕
              </button>
            ) : (
              <span className="absolute right-3 top-2.5 text-gray-400 text-sm">🔍</span>
            )}
          </div>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-900/20 focus:border-red-900 transition-all cursor-pointer"
          >
            <option value="">Sort by: Relevance</option>
            <option value="price-low-to-high">Price: Low to High</option>
            <option value="price-high-to-low">Price: High to Low</option>
            <option value="discount-high-to-low">🔥 Most Discounted</option>
            <option value="rating-high-to-low">⭐ Highest Rated</option>
          </select>
        </div>
      </div>

     {/* Category Horizontal Scroller */}
<div className="relative flex items-center mb-10 bg-white p-3 rounded-2xl">
  <button
    onClick={() => scroll("left")}
    className="absolute left-2 z-10 bg-white border border-gray-200 rounded-full w-9 h-9 shadow-md flex items-center justify-center hover:bg-red-50 hover:text-red-900 transition"
  >
    ‹
  </button>

  <div
    ref={scrollRef}
    className="flex gap-3 overflow-x-auto mx-12 scroll-smooth py-1 px-1"
    style={{ scrollbarWidth: "none" }}
  >
    <button
      onClick={() => {
        setSearchParams({});
      }}
      className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap border transition-all ${
        selectedCategory === "All"
          ? "bg-red-900 text-white border-red-900 shadow-md shadow-red-900/20 scale-105"
          : "bg-gray-50 text-red-900 border-gray-200 hover:bg-red-50/50"
      }`}
    >
      All Products
    </button>

    {categories.map((cat) => (
      <button
        key={cat._id}
        onClick={() => {
          setSearchParams({ category: cat.title });
        }}
        className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap border transition-all ${
          selectedCategory === cat.title
            ? "bg-red-900 text-white border-red-900 shadow-md shadow-red-900/20 scale-105"
            : "bg-gray-50 text-red-900 border-gray-200 hover:bg-red-50/50"
        }`}
      >
        {cat.title}
      </button>
    ))}
  </div>

  <button
    onClick={() => scroll("right")}
    className="absolute right-2 z-10 bg-white border border-gray-200 rounded-full w-9 h-9 shadow-md flex items-center justify-center hover:bg-red-50 hover:text-red-900 transition"
  >
    ›
  </button>
</div>

      {/* Product Display Area */}
      {loading ? (
        <div className="text-center py-32 text-red-900 font-medium text-lg">Loading amazing products...</div>
      ) : pageProducts.length === 0 ? (
        <div className="text-center py-32 text-gray-500 font-medium text-lg bg-white rounded-3xl border border-dashed border-gray-200">
          {searchTerm.trim()
            ? `No products found for "${searchTerm.trim()}". Try a different keyword.`
            : "No products found matching your current filter."}
        </div>
      ) : (
        <div className="w-full">
          <ProductList
            products={pageProducts}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            wishlist={wishlist}
            ratingMap={ratingMap}
          />
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-12 mb-6">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition shadow-sm"
          >
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`min-w-[40px] h-10 px-3 py-2 rounded-xl text-sm font-bold border transition shadow-sm ${
                page === n
                  ? "bg-red-900 text-white border-red-900 shadow-md shadow-red-900/20"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {n}
            </button>
          ))}

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition shadow-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}