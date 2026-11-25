// Product type ke hisaab se size/quantity options
// Cosmetic -> ml/g, Shoe -> numeric, baaki -> S/M/L/XL, accessories -> none
export function sizeOptions(product) {
  const catTitle = (product?.category?.title || product?.category || "").toString().toLowerCase();
  const prodTitle = (product?.title || "").toLowerCase();
  const prodDesc = (product?.description || "").toLowerCase();
  const blob = `${catTitle} ${prodTitle} ${prodDesc}`;

  const noSizeKeywords = ["watch", "bag", "belt", "cap", "wallet", "sunglass", "accessories", "jewellery", "phone", "earphone", "headphone"];
  if (noSizeKeywords.some((k) => blob.includes(k))) return [];

  const cosmeticKeywords = [
    "cream", "lotion", "serum", "shampoo", "conditioner", "sunscreen", "spf",
    "moisturizer", "moisturiser", "foundation", "lipstick", "mascara", "blush",
    "primer", "cleanser", "toner", "facewash", "face wash", "bodywash",
    "body wash", "soap", "faceoil", "face oil", "hair oil", "hairoil", "gel",
    "cosmetic", "skincare", "skin care", "haircare", "hair care", "makeup",
    "make up", "lip balm", "lipbalm", "scrub", "essence", "mist",
    "concealer", "eyeliner", "kajal", "nail", "perfume", "fragrance",
    "deodorant", "body lotion", "underarm", "face pack", "facewash",
  ];
  const isCosmetic = cosmeticKeywords.some((k) => blob.includes(k));

  if (isCosmetic) {
    // Powder/solid type cheezein grams mein (lipstick, kajal, powder etc.), liquids ml mein
    const gramsKeywords = [
      "powder", "compact", "blush", "eyeshadow", "soap", "balm", "butter",
      "lipstick", "lip stick", "lip tint", "lip stain", "lip gloss",
      "kajal", "eyeliner", "eye pencil", "highlighter", "nail polish",
    ];
    if (gramsKeywords.some((k) => blob.includes(k))) {
      return ["10 g", "20 g", "40 g", "60 g"];
    }
    return ["30 ml", "50 ml", "100 ml", "150 ml", "250 ml", "500 ml"];
  }

  const shoeKeywords = ["shoe", "shoes", "sneaker", "boot", "sandal", "footwear"];
  if (shoeKeywords.some((k) => blob.includes(k))) return ["7", "8", "9", "10", "11", "12"];

  return ["S", "M", "L", "XL"];
}

// Default selected size — clothes: M, shoes: 9, cosmetic: beech wala volume/weight
export function defaultSize(sizes) {
  if (!sizes?.length) return "Free";
  if (sizes.includes("M")) return "M";
  if (sizes.includes("9")) return "9";
  if (sizes.some((s) => s.includes("ml") || s.includes(" g"))) {
    return sizes[Math.min(2, sizes.length - 1)];
  }
  return sizes[0];
}
