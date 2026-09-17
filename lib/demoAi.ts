// Rule-based, clearly labeled DEMO parser. No external AI calls.
// Parses messy restaurant text into structured donation fields.

export interface ParsedDonation {
  title: string;
  meals: number;
  // "meals" only when the text explicitly states a prepared-meal count,
  // otherwise "items" (sandwiches, pastries, wraps…). Never invents meals.
  unit: "meals" | "items";
  pounds: number;
  category: string;
  dietaryTags: string[];
  allergens: string[];
  storage: "room" | "refrigerated" | "frozen";
  // Human-readable 12-hour deadline, or "" when no pickup time is stated.
  pickupDeadline: string;
}

// Countable food words. A number directly before one of these counts toward
// the total quantity (summed, so "10 sandwiches and 24 pastries" → 34).
const ITEM_WORDS =
  "meals?|servings?|wraps?|sandwich(?:es)?|boxes|boxed|lunches|pastries|pastry|muffins?|bagels?|croissants?|rolls?|buns?|cookies?|slices?|pieces?|portions?|plates?|containers?|trays?";

// Allergen families. `words` uses word boundaries so "egg" never matches
// inside "veggie". `free` detects free-from phrasing; a negated family is
// NEVER reported as present, even if an ingredient word also appears.
const ALLERGEN_FAMILIES: { key: string; words: RegExp; free: RegExp | null; tag: string | null }[] = [
  { key: "dairy", words: /\b(cheese|dairy|milk|yogurt|butter)\b/, free: /\b(dairy)[\s-]*free\b|\bno\s+dairy\b/, tag: "dairy-free" },
  { key: "wheat", words: /\b(wheat|breads?|wraps?|buns?|sandwich(?:es)?|pastries|pastry|flour)\b/, free: null, tag: null },
  { key: "gluten", words: /\bgluten\b/, free: /\b(gluten)[\s-]*free\b|\bno\s+gluten\b/, tag: "gluten-free" },
  { key: "nuts", words: /\b(peanuts?|almonds?|walnuts?|cashews?|pecans?|pistachios?|nuts?)\b/, free: /\b(nuts?)[\s-]*free\b|\bno\s+nuts?\b/, tag: "nut-free" },
  { key: "egg", words: /\beggs?\b/, free: /\b(eggs?)[\s-]*free\b|\bno\s+eggs?\b/, tag: null },
  { key: "soy", words: /\bsoy\b/, free: /\bno\s+soy\b/, tag: null },
  { key: "sesame", words: /\bsesame\b/, free: null, tag: null },
  { key: "fish", words: /\b(fish|tuna|salmon)\b/, free: null, tag: null },
  { key: "shellfish", words: /\bshellfish\b|\bshrimp\b/, free: null, tag: null },
];

function pushTag(list: string[], tag: string) {
  if (!list.includes(tag)) list.push(tag);
}

// Normalize to a human-readable 12-hour time ("8:45 PM"). Evening is assumed
// when am/pm is missing (closing-time demo context). Returns "" when the
// input carries no usable pickup time, so the UI keeps its current value.
function parseDeadline(t: string): string {
  const re = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/gi;
  let m: RegExpExecArray | null;
  let best: { h: number; min: string; ap: string | null; score: number; idx: number } | null = null;
  while ((m = re.exec(t)) !== null) {
    const h = parseInt(m[1], 10);
    if (h > 23) continue; // not a clock time
    let score = 0;
    if (m[2] !== undefined) score += 2; // has minutes, e.g. 8:45
    if (m[3] !== undefined) score += 2; // has am/pm
    const before = t.slice(Math.max(0, m.index - 14), m.index);
    if (/(pickup|pick up|\bby\b|before|until|deadline|closing|\bclose\b)/i.test(before)) score += 3;
    if (score === 0) continue; // bare quantity, not a time — never invent one
    if (!best || score > best.score || (score === best.score && m.index > best.idx)) {
      best = { h, min: m[2] ?? "00", ap: m[3] ?? null, score, idx: m.index };
    }
  }
  if (!best) return "";
  let h12: number;
  let ap: string;
  if (best.ap) {
    ap = best.ap.toUpperCase();
    h12 = best.h % 12 === 0 ? 12 : best.h % 12;
  } else if (best.h === 0) {
    h12 = 12;
    ap = "AM";
  } else if (best.h > 12) {
    h12 = best.h - 12;
    ap = "PM";
  } else {
    h12 = best.h;
    ap = "PM";
  }
  return `${h12}:${best.min} ${ap}`;
}

export function demoParse(input: string): ParsedDonation {
  const t = input.toLowerCase();

  // Quantity: sum every number directly before a countable food word, so
  // "10 sandwiches and 24 pastries" → 34. Up to two describing words may sit
  // between ("10 vegetarian sandwiches"). Times can't match (":" is neither
  // whitespace nor a word), and commas block the gap ("feeds 20, pickup…").
  let meals = 12;
  const itemRe = new RegExp(`(\\d{1,3})((?:\\s+[a-z-]+){0,2})?\\s*(?:${ITEM_WORDS})\\b`, "g");
  let im: RegExpExecArray | null;
  let sum = 0;
  let foundItem = false;
  while ((im = itemRe.exec(t)) !== null) {
    sum += parseInt(im[1], 10);
    foundItem = true;
  }
  if (foundItem) {
    meals = Math.min(200, sum);
  } else {
    const anyNum = t.match(/(\d{1,3})/);
    if (anyNum) meals = Math.min(200, parseInt(anyNum[1], 10));
  }

  // Unit: "meals" only when the donor explicitly says so.
  const unit: "meals" | "items" = /\bmeals?\b/.test(t) ? "meals" : "items";

  // Pounds: explicit lbs, else estimate ~0.45 lb per item.
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

  // Dietary tags (word boundaries; free-from handled with allergens below).
  const dietaryTags: string[] = [];
  if (/\bvegan\b/.test(t)) dietaryTags.push("vegan");
  else if (/\bveg\b|\bveggie\b|vegetable|vegetarian|meatless/.test(t)) dietaryTags.push("vegetarian");
  if (/\bhalal\b/.test(t)) dietaryTags.push("halal");

  // Allergens: negation first — a negated family is never reported present.
  // A "gluten-free" note also suppresses the wheat inference, so the output
  // can't contradict the donor's free-from statement.
  const negated = new Set<string>();
  for (const fam of ALLERGEN_FAMILIES) {
    if (fam.free && fam.free.test(t)) {
      negated.add(fam.key);
      if (fam.tag) pushTag(dietaryTags, fam.tag);
    }
  }
  const allergens = new Set<string>();
  for (const fam of ALLERGEN_FAMILIES) {
    if (negated.has(fam.key)) continue;
    if (fam.key === "wheat" && negated.has("gluten")) continue;
    if (fam.words.test(t)) allergens.add(fam.key);
  }

  // Storage
  let storage: ParsedDonation["storage"] = "room";
  if (/frozen|freezer|keep frozen/.test(t)) storage = "frozen";
  else if (/cold|chill|refrigerat|fridge|keep cold|keep them cold/.test(t))
    storage = "refrigerated";

  // Deadline: best time-like match near pickup wording, else "" (unset).
  const pickupDeadline = parseDeadline(t);

  // Title: first ~60 chars trimmed
  const title =
    input.trim().length > 64 ? input.trim().slice(0, 64).trim() + "…" : input.trim() || "Surplus food donation";

  return {
    title,
    meals,
    unit,
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
    reasons.push(`Fits capacity (≤${np.maxMeals}) +5`);
  } else {
    score -= 15;
    reasons.push(`Over capacity (>${np.maxMeals}) −15`);
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
