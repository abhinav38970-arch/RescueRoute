// Rule-based, clearly labeled DEMO parser. No external AI calls.
// Parses messy restaurant text into structured donation fields.

export interface ParsedDonation {
  title: string;
  meals: number;
  pounds: number;
  category: string;
  dietaryTags: string[];
  allergens: string[];
  storage: "room" | "refrigerated" | "frozen";
  pickupDeadline: string;
}

const ALLERGEN_WORDS = [
  "dairy",
  "cheese",
  "milk",
  "wheat",
  "gluten",
  "nuts",
  "peanut",
  "egg",
  "soy",
  "sesame",
  "fish",
  "shellfish",
];

export function demoParse(input: string): ParsedDonation {
  const t = input.toLowerCase();

  // Meal count: first plausible number near meal-ish words, else first number, else 10
  let meals = 12;
  const mealMatch = t.match(/(\d{1,3})\s*(meals?|wraps?|sandwiches|sandwiche?s|boxes|boxed|pastries|muffins|bagels|lunches|trays?|servings?)/);
  const anyNum = t.match(/(\d{1,3})/);
  if (mealMatch) meals = Math.min(200, parseInt(mealMatch[1], 10));
  else if (anyNum) meals = Math.min(200, parseInt(anyNum[1], 10));

  // Pounds: explicit lbs, else estimate ~0.45 lb/meal
  let pounds = Math.round(meals * 0.45 * 10) / 10;
  const lbMatch = t.match(/(\d{1,3}(?:\.\d+)?)\s*(lbs?|pounds?)/);
  if (lbMatch) pounds = parseFloat(lbMatch[1]);

  // Category
  let category = "prepared meals";
  if (/pastry|pastries|muffin|bagel|bakery|bread|croissant/.test(t) && /wrap|sandwich|meal|box/.test(t))
    category = "prepared + baked";
  else if (/pastry|pastries|muffin|bagel|bakery|bread|croissant/.test(t))
    category = "baked goods";
  else if (/produce|fruit|vegetable|veggie|salad/.test(t) && !/wrap|meal|sandwich/.test(t))
    category = "produce";
  else if (/wrap|sandwich|meal|box|catering/.test(t)) category = "prepared meals";

  // Dietary tags
  const dietaryTags: string[] = [];
  if (/vegan/.test(t)) dietaryTags.push("vegan");
  else if (/veg(etable|gie|etarian)?\b|veggie|meatless/.test(t)) dietaryTags.push("vegetarian");
  if (/halal/.test(t)) dietaryTags.push("halal");
  if (/gluten-?free/.test(t)) dietaryTags.push("gluten-free");
  if (/nut-?free|no nuts/.test(t)) dietaryTags.push("nut-free");

  // Allergens
  const allergens = new Set<string>();
  if (/cheese|dairy|milk|yogurt|butter/.test(t)) allergens.add("dairy");
  if (/wheat|bread|wrap|bun|sandwich|pastry|flour/.test(t)) allergens.add("wheat");
  if (/gluten/.test(t)) allergens.add("gluten");
  if (/peanut|almond|walnut|cashew|nut(?!-free)/.test(t)) allergens.add("nuts");
  if (/egg/.test(t)) allergens.add("egg");
  if (/soy/.test(t)) allergens.add("soy");
  for (const w of ALLERGEN_WORDS) {
    if (t.includes(w) && !["cheese", "milk"].includes(w)) {
      // already covered above; keep explicit mentions
      if (["dairy", "wheat", "gluten", "nuts", "egg", "soy"].includes(w)) continue;
      allergens.add(w);
    }
  }

  // Storage
  let storage: ParsedDonation["storage"] = "room";
  if (/frozen|freezer|keep frozen/.test(t)) storage = "frozen";
  else if (/cold|chill|refrigerat|fridge|keep cold|keep them cold/.test(t))
    storage = "refrigerated";

  // Deadline: look for time like 8:45, 8:45pm
  let pickupDeadline = "8:30 PM";
  const timeMatch = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ?? "00";
    const ap = (timeMatch[3] ?? "pm").toUpperCase();
    pickupDeadline = `${h}:${m} ${ap}`;
  }

  // Title: first ~60 chars trimmed
  const title =
    input.trim().length > 64 ? input.trim().slice(0, 64).trim() + "…" : input.trim() || "Surplus food donation";

  return {
    title,
    meals,
    pounds,
    category,
    dietaryTags,
    allergens: [...allergens],
    storage,
    pickupDeadline,
  };
}

// Transparent smart-match scoring (rule-based, explainable).
export interface MatchResult {
  nonprofitId: string;
  score: number; // 0-100
  reasons: string[];
}

export function scoreMatch(
  donation: { meals: number; dietaryTags: string[]; allergens: string[]; storage: string; category: string },
  np: {
    id: string;
    acceptsPrepared: boolean;
    acceptsBaked: boolean;
    hasFridge: boolean;
    hasFreezer: boolean;
    dietarySupport: string[];
    maxMeals: number;
    distanceMiles: number;
  }
): MatchResult {
  let score = 50;
  const reasons: string[] = [];

  // Food-type fit (+/-20)
  const isBakedOnly = donation.category === "baked goods";
  const isPrepared = donation.category.includes("prepared");
  if (isBakedOnly && np.acceptsBaked) {
    score += 15;
    reasons.push("Accepts baked goods +15");
  } else if (isPrepared && np.acceptsPrepared) {
    score += 15;
    reasons.push("Accepts prepared meals +15");
  } else {
    score -= 20;
    reasons.push("Food type outside accepted list −20");
  }

  // Storage (+15 / −25)
  if (donation.storage === "refrigerated" && np.hasFridge) {
    score += 15;
    reasons.push("Has refrigeration +15");
  } else if (donation.storage === "refrigerated" && !np.hasFridge) {
    score -= 25;
    reasons.push("Needs refrigeration, site has none −25");
  } else if (donation.storage === "frozen" && np.hasFreezer) {
    score += 15;
    reasons.push("Has freezer +15");
  } else if (donation.storage === "frozen" && !np.hasFreezer) {
    score -= 25;
    reasons.push("Needs freezer, site has none −25");
  } else {
    score += 5;
    reasons.push("Room-temp OK +5");
  }

  // Dietary overlap (+10)
  const overlap = donation.dietaryTags.filter((d) =>
    np.dietarySupport.map((s) => s.toLowerCase()).includes(d.toLowerCase())
  );
  if (donation.dietaryTags.includes("vegan") && !np.dietarySupport.map((s) => s.toLowerCase()).includes("vegan")) {
    score -= 10;
    reasons.push("Vegan-only food vs non-vegan site −10");
  } else if (overlap.length > 0) {
    score += 10;
    reasons.push(`Dietary fit (${overlap.join(", ")}) +10`);
  }

  // Capacity (+5 / −15)
  if (donation.meals <= np.maxMeals) {
    score += 5;
    reasons.push(`Fits capacity (≤${np.maxMeals} meals) +5`);
  } else {
    score -= 15;
    reasons.push(`Over capacity (>${np.maxMeals} meals) −15`);
  }

  // Distance (+5 near / −5 far)
  if (np.distanceMiles <= 1.5) {
    score += 5;
    reasons.push(`Nearby (${np.distanceMiles} mi) +5`);
  } else if (np.distanceMiles > 2.5) {
    score -= 5;
    reasons.push(`Farther (${np.distanceMiles} mi) −5`);
  }

  return { nonprofitId: np.id, score: Math.max(0, Math.min(100, score)), reasons };
}
