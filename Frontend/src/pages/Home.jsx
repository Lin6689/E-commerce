import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [openCat, setOpenCat] = useState(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Fetch categories dynamically from backend with recursive support for 3 levels
  useEffect(() => {
    axios
      .get("http://localhost:3000/categories")
      .then((res) => {
        const raw = res.data.categories || res.data || [];
        
        // Recursive function to collect children at any depth
        const getChildren = (parentId) => {
          return raw
            .filter((c) => {
              if (!c.parent) return false;
              const pid = c.parent._id ? c.parent._id.toString() : c.parent.toString();
              return pid === parentId.toString();
            })
            .map((sub) => ({
              ...sub,
              subcategories: getChildren(sub._id),
            }));
        };

        const main = raw.filter((c) => !c.parent);
        const sortedMain = main.sort((a, b) => {
          if (a.title?.toLowerCase() === "popular") return -1;
          if (b.title?.toLowerCase() === "popular") return 1;
          return 0;
        });
        const structured = main.map((m) => ({
          ...m,
          subcategories: getChildren(m._id),
        }));

        setCategories(structured);
      })
      .catch(console.error);
  }, []);

  const openMenu = (cat, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
    setOpenCat(cat);
  };

  return (
    <div className="bg-[#FAF8F6] text-slate-950 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ========== CATEGORY BAR ========== */}
      <div
        className="bg-white border-b border-gray-200 shadow-sm sticky top-16 z-[100]"
        onMouseLeave={() => setOpenCat(null)}
      >
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-12 min-w-max py-3">
            {categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/shop?category=${encodeURIComponent(cat.title)}`}
                onMouseEnter={(e) => openMenu(cat, e)}
                className="text-sm font-semibold text-gray-800 hover:text-red-900 whitespace-nowrap shrink-0 flex items-center gap-1"
              >
                {cat.title}
                {cat.subcategories?.length > 0 && (
                  <span className="text-xs">▾</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ===== SUB-CATEGORY FLYOUT DROPDOWN (MULTI-LEVEL FIXED) ===== */}
      {openCat?.subcategories?.length > 0 && (
        <div
          className="fixed z-[200] w-26 bg-white border border-gray-200 rounded-xl shadow-xl py-2"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={() => setOpenCat(openCat)}
          onMouseLeave={() => setOpenCat(null)}
        >
          {openCat.subcategories.map((sub) => {
            // 🔍 Smart Check: Agar yehi subcategory kisi aur parent ke andar bhi hai (jaise Popular mein), toh original wali ka title utha lo
            const originalCat = categories
              .flatMap((c) => c.subcategories || [])
              .find((s) => s.title === sub.title && s._id !== sub._id);

            const targetTitle = originalCat ? originalCat.title : sub.title;

            return (
              <div key={sub._id || sub.title} className="relative group/sub px-4 py-2 hover:bg-red-50">
                <Link
                  to={`/shop?category=${encodeURIComponent(targetTitle)}`}
                  className="text-xs text-gray-700 group-hover/sub:text-red-900 whitespace-nowrap flex items-center justify-between gap-4"
                >
                  <span>{sub.title}</span>
                  {sub.subcategories?.length > 0 && <span className="text-[10px]"></span>}
                </Link>

                {/* 3rd Level Sub-subcategory Flyout Menu with Hover Bridge Fix */}
                {sub.subcategories?.length > 0 && (
                  <div className="absolute left-full top-0 hidden group-hover/sub:block pl-1 -ml-1">
                    <div className="w-36 bg-white border border-gray-200 rounded-xl shadow-xl py-2">
                      {sub.subcategories.map((nestedSub) => {
                        const originalNested = categories
                          .flatMap((c) => c.subcategories || [])
                          .flatMap((sc) => sc.subcategories || [])
                          .find((ns) => ns.title === nestedSub.title && ns._id !== nestedSub._id);

                        const targetNestedTitle = originalNested ? originalNested.title : nestedSub.title;

                        return (
                          <Link
                            key={nestedSub._id || nestedSub.title}
                            to={`/shop?category=${encodeURIComponent(targetNestedTitle)}`}
                            className="block px-4 py-2 text-xs text-gray-700 hover:bg-red-50 hover:text-red-900 whitespace-nowrap "
                          >
                            {nestedSub.title}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========== HERO SECTION ========== */}
      <section className="relative z-0 h-[65vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=900&fit=crop"
            alt="Hero Background"
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-slate-950/65"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
          <div className="max-w-2xl text-white">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 font-['Playfair_Display',serif]">
              Elevate Your Everyday Style
            </h1>
            <p className="text-lg md:text-xl text-slate-200 mb-10 max-w-xl font-light leading-relaxed">
              Discover premium quality products crafted for modern living.
              Free shipping on orders over $50. Easy returns within 30 days.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/shop"
                className="bg-white text-slate-950 font-bold px-8 py-4 rounded-xl hover:bg-slate-100 transition shadow-lg shadow-black/10 tracking-wide text-sm"
              >
                Explore Collections
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CATEGORY SHOWCASE ========== */}
      <section className="py-24 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 -mt-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            {
              name: "Footwear",
              category: "footwear",
              image:
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTo95fpcH6sGw6jua2L3JVRaNi1VtADD14HIBqi6_uQw7wCZKmDSid0-rnr&s=10",
            },
            {
              name: "Accessories",
              image:
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNZ374du3YxH2M9r5BvQjqBzRaA8Npjx6wUo59ATCpiQSO8tJxTUo0miE&s=10",
            },
            {
              name: "Shirts",
              image:
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSGxT4zI5IsBVRGI2F13qLVjF_B1SvJqEguavca33P_FfDyroWOfOu0pigq&s=10",
            },
            {
              name: "Pants",
              image:
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQlauzz6mVKktm4IvvS0KuOszOh4NycgfuIZT-74BEIyg&s=10",
            },
            {
              name: "Jackets",
              image:
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcShYPWUgpp3qqkrdMNLIZfSfoKC1o4PkfGzPlUVoB0KDXJC4KtdAGUcsQNN&s=10",
            },
          ].map((cat) => (
            <Link
              key={cat.name}
              to={`/shop?category=${encodeURIComponent(cat.category || cat.name)}`}
              className="group relative rounded-2xl overflow-hidden h-80 shadow-sm hover:shadow-xl border border-slate-200/80 transition-all duration-300 bg-white"
            >
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-white text-xl font-bold mb-1 tracking-tight font-['Playfair_Display',serif]">
                  {cat.name}
                </h3>
                <span className="text-slate-300 text-xs font-semibold tracking-wider uppercase group-hover:underline">
                  Shop Now →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ========== PROMO BANNER ========== */}
      <section className="pb-24 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
          <div className="grid md:grid-cols-2 items-stretch min-h-[400px]">
            <div className="p-10 md:p-16 flex flex-col justify-center">
              <h2 className="text-3xl text-red-900 md:text-4xl font-extrabold tracking-tight mb-4 font-['Playfair_Display',serif]">
                Get 25% Off on Your First Order
              </h2>
              <p className="text-red-900 mb-8 max-w-md font-light leading-relaxed">
                Sign up today and enjoy exclusive discounts, early access to
                sales, and priority shipping options.
              </p>
            </div>

            <div className="hidden md:block h-full min-h-[400px]">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQcTFuK3uBsQ5cPa0T05sAjhEq-qY38uAvGhW_jefe7JD4SG_TR0xfTIUA&s=10"
                alt="Promo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========== WHY CHOOSE US ========== */}
      <section className="py-24 bg-white/60 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl text-red-900 font-extrabold tracking-tight mb-3 font-['Playfair_Display',serif]">
              Why Shop With Us
            </h2>
            <p className="text-red-900 font-light">
              We make shopping simple, secure, and enjoyable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "Premium Quality",
                desc: "Handpicked products from trusted brands worldwide.",
              },
              {
                title: "Fast Delivery",
                desc: "Get your orders delivered within 2-4 business days.",
              },
              {
                title: "24/7 Support",
                desc: "Our team is always ready to help you with anything.",
              },
              {
                title: "Best Prices",
                desc: "Competitive pricing with regular exclusive deals.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-slate-50 p-8 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition text-center group"
              >
                <h3 className="font-bold text-red-900 text-lg mb-2 font-['Playfair_Display',serif]">
                  {item.title}
                </h3>
                <p className="text-red-900 text-sm font-light">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== NEWSLETTER ========== */}
      <section className="py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl text-red-900 font-extrabold tracking-tight mb-3 font-['Playfair_Display',serif]">
            Stay in the Loop
          </h2>
          <p className="text-red-900 mb-8 font-light">
            Subscribe to get exclusive offers, new arrivals, and style
            inspiration delivered to your inbox.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-5 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 transition shadow-sm"
            />
            <button
              type="submit"
              className="bg-slate-900 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-slate-800 transition shadow-sm text-sm tracking-wide"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}