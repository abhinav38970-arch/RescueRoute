"use client";

import { useMemo, useState } from "react";
import { STATUS_FLOW, type Donation, type DonationStatus, type Nonprofit, type Role } from "@/lib/types";
import { DEMO_DONOR, DEMO_DRIVER_POOL, SEED_DONATIONS } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { demoParse, scoreMatch } from "@/lib/demoAi";
import RouteMap from "./components/RouteMap";

/* ---------------------------------- copy ---------------------------------- */

const SAMPLE_TEXT =
  "We have about 30 bean and cheese burritos left from the lunch rush, they have dairy and wheat, keep them warm, and they need to be picked up before 9 PM.";

const FEATURED_TEXT =
  "Sunrise Bakery has 10 vegetarian sandwiches and 24 pastries left, about 15 pounds total. Contains dairy and wheat, keep refrigerated, pickup before 8:25 PM through the back entrance.";


const HOW_STEPS = [
  { icon: "box", title: "Post surplus", text: "Share food before it becomes waste." },
  { icon: "heart", title: "Claim a match", text: "Recipients reserve what they can use." },
  { icon: "truck", title: "Deliver locally", text: "Volunteers complete the last mile." },
] as const;

const PROTOTYPE_NOTES = [
  "Prototype demo — all organizations and donations are fictional.",
  "Donors must confirm food is appropriate for donation.",
  "Organizations must follow applicable food-safety rules.",
  "RescueRoute organizes records; it is not legal advice and guarantees no regulatory compliance.",
];

const GUIDE_STEPS = [
  "Post sample food",
  "Claim best match",
  "Complete route",
  "Watch impact update",
];

// Default donor form values = the intended starting state. doReset restores
// every field from here so Reset Demo is fully predictable.
const DEFAULT_FORM = {
  rawText: SAMPLE_TEXT,
  title: "30 bean and cheese burritos",
  meals: 30,
  unit: "items" as const,
  pounds: 15,
  category: "prepared meals",
  dietary: "vegetarian",
  allergens: "dairy, wheat",
  storage: "room" as const,
  deadline: "9 PM",
  location: "Mario's Taqueria, Fremont (Demo)",
  notes: "",
};

/* --------------------------------- helpers --------------------------------- */

// Display names stay sentence case; underlying status values are untouched.
const DISPLAY_STATUS: Record<DonationStatus, string> = {
  Available: "Available",
  Claimed: "Claimed",
  "Driver Assigned": "Driver assigned",
  "Picked Up": "Picked up",
  Delivered: "Delivered",
};

function nextAction(d: Donation): string | null {
  switch (d.status) {
    case "Available":
      return "Claim donation";
    case "Claimed":
      return "Accept route";
    case "Driver Assigned":
      return "Confirm pickup";
    case "Picked Up":
      return "Confirm delivery";
    default:
      return null;
  }
}

type Urgency = { label: string; badge: string; dot: string };

function urgencyFor(d: Donation): Urgency {
  if (d.status === "Delivered")
    return { label: "Delivered", badge: "bg-forest-100 text-forest-800", dot: "bg-forest-500" };
  const m = d.pickupDeadline.toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  let hrs = 20.5;
  if (m) {
    const h = parseInt(m[1], 10) % 12;
    const min = parseInt(m[2] ?? "0", 10);
    hrs = h + min / 60 + ((m[3] ?? "pm") === "pm" ? 12 : 0);
  }
  if (hrs <= 19.5)
    return { label: `Urgent · by ${d.pickupDeadline}`, badge: "bg-red-100 text-red-800", dot: "bg-red-500" };
  if (hrs <= 20.75)
    return {
      label: `Time-sensitive · by ${d.pickupDeadline}`,
      badge: "bg-amber-100 text-amber-900",
      dot: "bg-amber-500",
    };
  return {
    label: `On track · by ${d.pickupDeadline}`,
    badge: "bg-forest-100 text-forest-800",
    dot: "bg-forest-500",
  };
}

// One short reason for the best fit (≤14 words). Only factors the scoring
// function truly uses: storage, food type, and distance.
function shortReason(d: Donation, np: Nonprofit): string {
  const storage =
    d.storage === "refrigerated" ? "Cold storage ready" : d.storage === "frozen" ? "Freezer ready" : "Room-temp OK";
  const food = d.category === "baked goods" ? "takes baked goods" : "takes prepared meals";
  return `${storage}, ${food}, ${np.distanceMiles} mi away.`;
}

// One short limitation or advantage for the other candidates.
function candidateNote(d: Donation, np: Nonprofit): string {
  if (d.storage === "refrigerated" && !np.hasFridge) return "No refrigeration on site.";
  if (d.storage === "frozen" && !np.hasFreezer) return "No freezer on site.";
  if (d.category === "baked goods" && !np.acceptsBaked) return "Doesn't take baked goods.";
  if (d.category.includes("prepared") && !np.acceptsPrepared) return "Doesn't take prepared meals.";
  if (d.meals > np.maxMeals) return `Over capacity (max ${np.maxMeals}).`;
  return `${np.distanceMiles} mi away · open until ${np.openUntil}.`;
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------------------------------- icons ---------------------------------- */

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
const P = {
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-12a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 15v-2a4 4 0 0 1 4-4h7",
  box: "M3 8l9-5 9 5v8l-9 5-9-5V8Zm0 0l9 5 9-5m-9 5v8",
  heart: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2",
  check: "M4 12.5 9.5 18 20 6.5",
  truck: "M2 6h12v10H2zM14 10h4l4 4v2h-8M6.5 19a1.8 1.8 0 1 0 0-.01M17.5 19a1.8 1.8 0 1 0 0-.01",
  store: "M4 9l1.5-5h13L20 9M4 9h16v11H4zM4 9v3a2.5 2.5 0 0 0 5 0V9m5 0v3a2.5 2.5 0 0 0 5 0V9",
  users: "M8 19v-1a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm11 9v-1a4 4 0 0 0-3-3.87M15.5 3.13a3.5 3.5 0 0 1 0 6.74",
  spark: "M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18",
  arrow: "M4 12h15m-6-7 7 7-7 7",
  refresh: "M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5",
  chev: "M6 9l6 6 6-6",
};

/* ---------------------------------- page ----------------------------------- */

export default function Home() {
  const { donations, nonprofits, addDonation, updateStatus, reset } = useStore();
  const [role, setRole] = useState<Role>("donor");

  // Donor form state (all fields preserved; progressively disclosed)
  const [rawText, setRawText] = useState(DEFAULT_FORM.rawText);
  const [title, setTitle] = useState(DEFAULT_FORM.title);
  const [meals, setMeals] = useState(DEFAULT_FORM.meals);
  const [unit, setUnit] = useState<"meals" | "items">(DEFAULT_FORM.unit);
  const [pounds, setPounds] = useState(DEFAULT_FORM.pounds);
  const [category, setCategory] = useState(DEFAULT_FORM.category);
  const [dietary, setDietary] = useState(DEFAULT_FORM.dietary);
  const [allergens, setAllergens] = useState(DEFAULT_FORM.allergens);
  const [storage, setStorage] = useState<"room" | "refrigerated" | "frozen">(DEFAULT_FORM.storage);
  const [deadline, setDeadline] = useState(DEFAULT_FORM.deadline);
  const [location, setLocation] = useState(DEFAULT_FORM.location);
  const [notes, setNotes] = useState(DEFAULT_FORM.notes);
  const [parsed, setParsed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [justPosted, setJustPosted] = useState<string | null>(null);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);

  // Nonprofit + volunteer focus state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastClaimedId, setLastClaimedId] = useState<string | null>(null);
  const [lastDeliveredId, setLastDeliveredId] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const impact = useMemo(() => {
    const delivered = donations.filter((d) => d.status === "Delivered");
    const lbs = delivered.reduce((s, d) => s + d.pounds, 0);
    return {
      lbs,
      // Every sandwich, pastry, wrap, or meal counts as one item.
      items: delivered.reduce((s, d) => s + d.meals, 0),
      deliveries: delivered.length,
      active: donations.filter((d) => d.status !== "Delivered").length,
      // Rough demo estimate of CO2e avoided: ~2.5 lbs per lb of food kept
      // out of landfill (FAO food-wastage footprint figure). Not certified.
      co2e: Math.round(lbs * 2.5 * 10) / 10,
    };
  }, [donations]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of donations.filter((x) => x.status === "Delivered")) {
      map.set(d.category, (map.get(d.category) ?? 0) + d.pounds);
    }
    const max = Math.max(1, ...map.values());
    return [...map.entries()].map(([cat, lbs]) => ({ cat, lbs, pct: Math.round((lbs / max) * 100) }));
  }, [donations]);

  const seedLbs = useMemo(() => SEED_DONATIONS.reduce((s, d) => s + d.pounds, 0), []);

  function rankedMatches(d: Donation) {
    return nonprofits
      .map((n) => ({ np: n, m: scoreMatch({ ...d, storage: d.storage }, n) }))
      .sort((a, b) => b.m.score - a.m.score);
  }

  function applyParse(text: string) {
    const p = demoParse(text);
    setTitle(p.title);
    setMeals(p.meals);
    setUnit(p.unit);
    setPounds(p.pounds);
    setCategory(p.category);
    setDietary(p.dietaryTags.join(", "));
    setAllergens(p.allergens.join(", "));
    setStorage(p.storage);
    // The parser returns "" when no pickup time is stated — always apply it
    // so a stale deadline from a previous parse can never carry over.
    setDeadline(p.pickupDeadline);
    setDeadlineError(null);
    setParsed(true);
    // Collapse the details after a complete parse, but keep them open when
    // no deadline was found so the empty Pickup-by field stays visible.
    setEditOpen(!p.pickupDeadline);
  }

  function handlePost() {
    // A donation record must never inherit a stale deadline or a silent
    // fallback — the donor explicitly provides the pickup time.
    if (!deadline.trim()) {
      setDeadlineError("Pickup deadline required — add a pickup time before posting.");
      return;
    }
    setDeadlineError(null);
    const d: Donation = {
      id: `don-${Date.now()}`,
      title: title.trim() || "Surplus food donation",
      description: rawText.trim(),
      meals: Math.max(1, meals || 1),
      unit,
      pounds: Math.max(0.5, pounds || 1),
      category,
      dietaryTags: dietary.split(",").map((s) => s.trim()).filter(Boolean),
      allergens: allergens.split(",").map((s) => s.trim()).filter(Boolean),
      storage,
      pickupDeadline: deadline.trim(),
      pickupLocation: location.trim() || "Fremont (Demo)",
      pickupNotes: notes.trim(),
      donorName: DEMO_DONOR,
      status: "Available",
      distanceMiles: 1.6,
      etaMinutes: 12,
      createdAt: new Date().toISOString(),
    };
    addDonation(d);
    setSelectedId(d.id);
    setJustPosted(d.title);
  }

  function handleAdvance(d: Donation, orgId?: string) {
    if (d.status === "Available") {
      const best = rankedMatches(d)[0];
      const org = nonprofits.find((n) => n.id === (orgId ?? best?.m.nonprofitId));
      updateStatus(d.id, "Claimed", { claimedByOrgId: org?.id, claimedByOrgName: org?.name });
      setLastClaimedId(d.id);
    } else if (d.status === "Claimed") {
      updateStatus(d.id, "Driver Assigned", { driverName: DEMO_DRIVER_POOL[0] });
      setLastDeliveredId(null);
    } else if (d.status === "Driver Assigned") {
      updateStatus(d.id, "Picked Up");
    } else if (d.status === "Picked Up") {
      updateStatus(d.id, "Delivered");
      setLastClaimedId(null);
      setLastDeliveredId(d.id);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 2400);
    }
  }

  function doReset() {
    reset();
    setRole("donor");
    setRawText(DEFAULT_FORM.rawText);
    setTitle(DEFAULT_FORM.title);
    setMeals(DEFAULT_FORM.meals);
    setUnit(DEFAULT_FORM.unit);
    setPounds(DEFAULT_FORM.pounds);
    setCategory(DEFAULT_FORM.category);
    setDietary(DEFAULT_FORM.dietary);
    setAllergens(DEFAULT_FORM.allergens);
    setStorage(DEFAULT_FORM.storage);
    setDeadline(DEFAULT_FORM.deadline);
    setLocation(DEFAULT_FORM.location);
    setNotes(DEFAULT_FORM.notes);
    setJustPosted(null);
    setLastClaimedId(null);
    setLastDeliveredId(null);
    setSelectedId(null);
    setParsed(false);
    setEditOpen(false);
    setFlash(false);
    setDeadlineError(null);
  }

  function loadFeatured() {
    doReset();
    setRawText(FEATURED_TEXT);
    applyParse(FEATURED_TEXT);
    setRole("donor");
    setTimeout(() => scrollTo("demo"), 60);
  }

  function pickRole(r: Role) {
    setRole(r);
    setJustPosted(null);
    setLastDeliveredId(null);
  }

  // One seed donation starts Delivered (an earlier fictional rescue) so the
  // dashboard is alive on first load — but it must not count as the user's
  // own demo progress in the stepper.
  const seedDeliveredIds = useMemo(
    () => new Set(SEED_DONATIONS.filter((d) => d.status === "Delivered").map((d) => d.id)),
    []
  );
  // Stepper state: done flags from the user's own demo progress, current from role.
  const stageDone = useMemo(() => {
    const st = donations.filter((d) => !seedDeliveredIds.has(d.id)).map((d) => d.status);
    return [
      st.some((s) => s !== "Available") || justPosted !== null,
      st.some((s) => s !== "Available"),
      st.some((s) => s === "Picked Up" || s === "Delivered"),
      st.some((s) => s === "Delivered"),
    ];
  }, [donations, justPosted, seedDeliveredIds]);
  const stageCurrent = role === "donor" ? 0 : role === "nonprofit" ? 1 : 2;
  const STEPS = ["Post food", "Claim match", "Deliver", "See impact"];

  const available = donations.filter((d) => d.status === "Available");
  const activeDonation = available.find((d) => d.id === selectedId) ?? available[0] ?? null;
  const lastClaimed = lastClaimedId ? donations.find((d) => d.id === lastClaimedId) ?? null : null;
  const lastDelivered = lastDeliveredId ? donations.find((d) => d.id === lastDeliveredId) ?? null : null;

  const routeOrder = (s: Donation["status"]) => STATUS_FLOW.indexOf(s);
  const activeRoute =
    [...donations]
      .filter((d) => d.status === "Claimed" || d.status === "Driver Assigned" || d.status === "Picked Up")
      .sort((a, b) => routeOrder(b.status) - routeOrder(a.status))[0] ?? null;
  const otherRoutes = donations.filter(
    (d) =>
      (d.status === "Claimed" || d.status === "Driver Assigned" || d.status === "Picked Up") &&
      d.id !== activeRoute?.id
  );
  const allDone = donations.length > 0 && donations.every((d) => d.status === "Delivered");

  const tags = dietary.split(",").map((s) => s.trim()).filter(Boolean);
  const allergenList = allergens.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-cream text-[#1f2923]">
      {/* ------------------------------- Header ------------------------------- */}
      <header className="sticky top-0 z-20 border-b border-forest-100 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2" aria-label="RescueRoute Fremont home">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-forest-700 text-cream">
              <Icon d={P.route} className="h-4 w-4" />
            </span>
            <span className="text-[15px] font-extrabold tracking-tight">RescueRoute Fremont</span>
          </button>
          <nav className="flex items-center gap-1 text-sm font-medium" aria-label="Sections">
            <button onClick={() => scrollTo("demo")} className="hidden rounded-full px-3 py-1.5 text-forest-900 hover:bg-forest-100 sm:block">
              Demo
            </button>
            <button onClick={() => scrollTo("how")} className="hidden rounded-full px-3 py-1.5 text-forest-900 hover:bg-forest-100 sm:block">
              How it works
            </button>
            <button onClick={doReset} className="inline-flex items-center gap-1.5 rounded-full border border-forest-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-forest-800 hover:bg-forest-50" aria-label="Reset demo">
              <Icon d={P.refresh} className="h-3.5 w-3.5" /> Reset
            </button>
          </nav>
        </div>
      </header>

      <main>
        {/* -------------------------------- Hero -------------------------------- */}
        <section className="relative overflow-hidden border-b border-forest-100">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-forest-100 opacity-70 blur-3xl" />
            <div className="absolute -left-24 top-48 h-64 w-64 rounded-full bg-ember-100 opacity-60 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-10 sm:pt-14">
            <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
              <div>
            <p className="inline-flex items-center rounded-full border border-forest-200 bg-white px-2.5 py-1 text-[11px] font-bold text-forest-800">
              Fremont-focused prototype
            </p>
            <h1 className="mt-3 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-forest-950 sm:text-5xl">
              Save surplus food. Deliver it locally.
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-[#43544a]">
              Match restaurant donations with nonprofits and volunteer drivers before good food becomes landfill methane.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button onClick={() => scrollTo("demo")} className="inline-flex items-center gap-2 rounded-2xl bg-forest-700 px-6 py-3 text-base font-bold text-white shadow-md transition hover:bg-forest-800">
                Start the demo <Icon d={P.arrow} className="h-5 w-5" />
              </button>
              <button onClick={() => scrollTo("how")} className="text-sm font-semibold text-forest-700 underline-offset-4 hover:underline">
                See how it works
              </button>
            </div>
            <p className="mt-3 text-[13px] text-[#5a6b60]">
              <button onClick={loadFeatured} className="font-semibold text-forest-700 underline-offset-4 hover:underline">
                Try the 90-second bakery scenario
              </button>{" "}
              · loads fictional demo data
            </p>

            {/* Icon-led role strip */}
            <div className="mt-7 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-forest-900 sm:gap-3" aria-label="Three roles: donor, nonprofit, volunteer">
              <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-forest-100">
                <Icon d={P.store} className="h-4 w-4 text-forest-700" /> Donor
              </span>
              <span className="text-sage-500" aria-hidden="true">→</span>
              <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-forest-100">
                <Icon d={P.users} className="h-4 w-4 text-forest-700" /> Nonprofit
              </span>
              <span className="text-sage-500" aria-hidden="true">→</span>
              <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-forest-100">
                <Icon d={P.truck} className="h-4 w-4 text-forest-700" /> Volunteer
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-[#5a6b60]">{seedLbs} lb listed in tonight&apos;s demo</p>
              </div>
              <div className="relative mx-auto w-full max-w-md lg:max-w-none">
                <div className="rotate-1 rounded-[1.75rem] border border-forest-100 bg-white p-2.5 shadow-xl">
                  <RouteMap pickup="Sunrise Bakery" dropoff="Demo Food Pantry" distanceMiles={2.4} etaMinutes={12} />
                </div>
                <div className="rm-float absolute -left-2 top-8 flex items-center gap-2 rounded-2xl border border-forest-100 bg-white/95 px-3 py-2 text-xs font-extrabold text-forest-900 shadow-lg backdrop-blur sm:-left-5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-forest-500" />
                  {impact.lbs} lb rescued
                </div>
                <div className="rm-float2 absolute -right-2 bottom-10 flex items-center gap-2 rounded-2xl border border-forest-100 bg-white/95 px-3 py-2 text-xs font-extrabold text-forest-900 shadow-lg backdrop-blur sm:-right-4">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-ember-500" />
                  &asymp;{impact.co2e} lb CO₂e avoided
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --------------------------------- Demo --------------------------------- */}
        <section id="demo" className="scroll-mt-20 border-b border-forest-100 bg-parchment/50">
          <div className="mx-auto max-w-3xl px-4 py-10">
            {/* Stepper */}
            <div className="rounded-3xl border border-forest-100 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="rounded-full bg-forest-700 px-2.5 py-0.5 text-[11px] font-bold text-white">Demo mode</span>
                <button onClick={doReset} className="text-xs font-semibold text-sage-500 hover:text-forest-700">
                  Reset
                </button>
              </div>
              <ol className="flex gap-1" aria-label="Demo progress">
                {STEPS.map((label, i) => {
                  const done = stageDone[i];
                  const current = i === stageCurrent;
                  const short = ["Post", "Claim", "Deliver", "Impact"][i];
                  const go = () => {
                    if (i === 0) pickRole("donor");
                    else if (i === 1) pickRole("nonprofit");
                    else if (i === 2) pickRole("volunteer");
                    else scrollTo("impact");
                  };
                  return (
                    <li key={label} className="flex min-w-0 flex-1">
                      <button
                        onClick={go}
                        aria-current={current ? "step" : undefined}
                        className={`flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 text-center text-[11px] font-bold transition sm:flex-row sm:gap-2 sm:whitespace-nowrap sm:px-2.5 sm:text-left sm:text-[13px] ${
                          current ? "bg-forest-700 text-white shadow" : done ? "text-forest-800 hover:bg-forest-50" : "text-[#5a6b60] hover:bg-forest-50"
                        }`}
                      >
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${
                          current ? "bg-white/20 text-white" : done ? "bg-forest-600 text-white" : "bg-forest-100 text-forest-700"
                        }`}>
                          {done && !current ? <Icon d={P.check} className="h-3.5 w-3.5" /> : i + 1}
                        </span>
                        <span className="sm:hidden">{short}</span>
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* ------------------------------- DONOR ------------------------------ */}
            {role === "donor" && (
              <div className="mt-5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold tracking-tight">Post surplus food</h2>
                  <span className="rounded-full bg-sage-100 px-2.5 py-0.5 text-[11px] font-bold text-forest-800">~1 minute</span>
                </div>
                <p className="mt-0.5 text-sm text-[#5a6b60]">Add only what a recipient needs to know.</p>

                {justPosted ? (
                  <div className="mt-4 rounded-3xl border border-forest-200 bg-white p-5 text-center shadow-sm" role="status">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest-600 text-white">
                      <Icon d={P.check} className="h-6 w-6" />
                    </span>
                    <h3 className="mt-3 font-extrabold">Donation posted</h3>
                    <p className="mt-1 text-sm text-[#5a6b60]">“{justPosted}”</p>
                    <div className="mt-2"><StatusPill status="Available" /></div>
                    <button onClick={() => pickRole("nonprofit")} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-forest-700 px-4 py-3 text-sm font-bold text-white hover:bg-forest-800">
                      View nonprofit matches <Icon d={P.arrow} className="h-4 w-4" />
                    </button>
                    <button onClick={() => setJustPosted(null)} className="mt-2 text-[13px] font-semibold text-sage-500 hover:text-forest-700">
                      Post another
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-3xl border border-forest-100 bg-white p-4 shadow-sm sm:p-5">
                    <label htmlFor="food-desc" className="text-sm font-bold">Describe the food</label>
                    <textarea
                      id="food-desc"
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      rows={3}
                      className="mt-1.5 w-full rounded-2xl border border-forest-100 bg-cream p-3 text-sm outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-200"
                    />
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <button onClick={() => applyParse(rawText)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-forest-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-forest-800 sm:flex-none sm:px-6">
                        <Icon d={P.spark} className="h-4 w-4" /> Organize details
                      </button>
                      <button onClick={() => setRawText(SAMPLE_TEXT)} className="text-[13px] font-semibold text-forest-700 underline-offset-4 hover:underline">
                        Try a sample
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-[#5a6b60]">Rule-based parser · no AI call</p>

                    {parsed && (
                      <div className="mt-4 rounded-2xl bg-forest-50 p-4 ring-1 ring-forest-100">
                        <p className="font-bold">{title || "Surplus food donation"}</p>
                        <p className="mt-0.5 text-[13px] text-[#5a6b60]">
                          {meals} {unit} · {pounds} lbs · {category}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Chip label={storage} tone="bg-white text-forest-900 ring-1 ring-forest-200" />
                          {deadline.trim() ? (
                            <Chip label={`by ${deadline}`} tone="bg-white text-forest-900 ring-1 ring-forest-200" />
                          ) : (
                            <Chip label="No pickup deadline provided" tone="bg-red-100 text-red-800" />
                          )}
                          {tags.map((t) => <Chip key={t} label={t} tone="bg-forest-100 text-forest-800" />)}
                          {allergenList.map((a) => <Chip key={a} label={`has ${a}`} tone="bg-ember-100 text-ember-700" />)}
                        </div>
                      </div>
                    )}

                    <details open={editOpen} onToggle={(e) => setEditOpen((e.target as HTMLDetailsElement).open)} className="mt-3 rounded-2xl bg-cream/70 ring-1 ring-forest-100">
                      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-forest-800 [&::-webkit-details-marker]:hidden">
                        <span className="inline-flex items-center gap-1.5">Edit details <Icon d={P.chev} className="h-4 w-4" /></span>
                      </summary>
                      <div className="space-y-4 px-4 pb-4">
                        <fieldset>
                          <legend className="text-xs font-extrabold uppercase tracking-wide text-sage-500">Food</legend>
                          <div className="mt-1.5 grid grid-cols-2 gap-2 text-sm">
                            <label className="col-span-2 font-medium">Title
                              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-forest-100 bg-white p-2.5 outline-none focus:border-forest-400" />
                            </label>
                            <label className="font-medium">Quantity
                              <input type="number" min={1} value={meals} onChange={(e) => setMeals(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-forest-100 bg-white p-2.5 outline-none focus:border-forest-400" />
                            </label>
                            <label className="font-medium">Unit
                              <select value={unit} onChange={(e) => setUnit(e.target.value as "meals" | "items")} className="mt-1 w-full rounded-xl border border-forest-100 bg-white p-2.5 outline-none focus:border-forest-400">
                                <option value="items">items</option>
                                <option value="meals">meals</option>
                              </select>
                            </label>
                            <label className="font-medium">Pounds
                              <input type="number" min={0.5} step={0.5} value={pounds} onChange={(e) => setPounds(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-forest-100 bg-white p-2.5 outline-none focus:border-forest-400" />
                            </label>
                            <label className="font-medium">Category
                              <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-forest-100 bg-white p-2.5 outline-none focus:border-forest-400">
                                <option>prepared meals</option><option>baked goods</option>
                                <option>prepared + baked</option><option>produce</option><option>packaged food</option>
                              </select>
                            </label>
                          </div>
                        </fieldset>
                        <fieldset>
                          <legend className="text-xs font-extrabold uppercase tracking-wide text-sage-500">Safety</legend>
                          <div className="mt-1.5 grid grid-cols-2 gap-2 text-sm">
                            <label className="font-medium">Dietary tags
                              <input value={dietary} onChange={(e) => setDietary(e.target.value)} placeholder="vegetarian, nut-free" className="mt-1 w-full rounded-xl border border-forest-100 bg-white p-2.5 outline-none focus:border-forest-400" />
                            </label>
                            <label className="font-medium">Allergens
                              <input value={allergens} onChange={(e) => setAllergens(e.target.value)} placeholder="dairy, wheat" className="mt-1 w-full rounded-xl border border-forest-100 bg-white p-2.5 outline-none focus:border-forest-400" />
                            </label>
                            <label className="col-span-2 font-medium">Storage
                              <select value={storage} onChange={(e) => setStorage(e.target.value as typeof storage)} className="mt-1 w-full rounded-xl border border-forest-100 bg-white p-2.5 outline-none focus:border-forest-400">
                                <option value="room">room temperature</option>
                                <option value="refrigerated">refrigerated</option>
                                <option value="frozen">frozen</option>
                              </select>
                            </label>
                          </div>
                        </fieldset>
                        <fieldset>
                          <legend className="text-xs font-extrabold uppercase tracking-wide text-sage-500">Pickup</legend>
                          <div className="mt-1.5 grid grid-cols-2 gap-2 text-sm">
                            <label className="font-medium">Pickup by
                              <input value={deadline} onChange={(e) => { setDeadline(e.target.value); if (e.target.value.trim()) setDeadlineError(null); }} aria-invalid={deadlineError ? true : undefined} aria-describedby={deadlineError ? "deadline-error" : undefined} className={`mt-1 w-full rounded-xl border bg-white p-2.5 outline-none focus:border-forest-400 ${deadlineError ? "border-red-400" : "border-forest-100"}`} />
                            </label>
                            <label className="font-medium">Pickup place
                              <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-xl border border-forest-100 bg-white p-2.5 outline-none focus:border-forest-400" />
                            </label>
                            <label className="col-span-2 font-medium">Notes
                              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Back entrance, ask for the manager…" className="mt-1 w-full rounded-xl border border-forest-100 bg-white p-2.5 outline-none focus:border-forest-400" />
                            </label>
                          </div>
                        </fieldset>
                      </div>
                    </details>

                    <button onClick={handlePost} className="mt-4 w-full rounded-2xl bg-forest-700 px-4 py-3.5 font-bold text-white shadow-md transition hover:bg-forest-800">
                      Post donation
                    </button>
                    {deadlineError && (
                      <p id="deadline-error" role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-800">
                        {deadlineError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ----------------------------- NONPROFIT ----------------------------- */}
            {role === "nonprofit" && (
              <div className="mt-5">
                <h2 className="text-xl font-extrabold tracking-tight">Available food</h2>
                <p className="mt-0.5 text-sm text-[#5a6b60]">Ranked by a transparent fit score.</p>
                <p className="mt-0.5 text-xs text-[#5a6b60]">Based on the prototype&apos;s food type, storage, diet, capacity, and distance.</p>

                {activeDonation && lastClaimed && lastClaimed.status !== "Available" && lastClaimed.status !== "Delivered" && (
                  <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-forest-200 bg-forest-50 px-3.5 py-2.5" role="status">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white">
                      <Icon d={P.check} className="h-4 w-4" />
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-forest-900">
                      Donation reserved · {lastClaimed.claimedByOrgName?.replace(" (Demo)", "")}
                    </p>
                    <button onClick={() => pickRole("volunteer")} className="shrink-0 rounded-xl bg-forest-700 px-3 py-1.5 text-[13px] font-bold text-white hover:bg-forest-800">
                      Assign a volunteer
                    </button>
                  </div>
                )}

                {!activeDonation ? (
                  lastClaimed ? (
                    <div className="mt-4 rounded-3xl border border-forest-200 bg-white p-5 text-center shadow-sm" role="status">
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest-600 text-white">
                        <Icon d={P.check} className="h-6 w-6" />
                      </span>
                      <h3 className="mt-3 font-extrabold">Donation reserved</h3>
                      <p className="mt-1 text-sm text-[#5a6b60]">“{lastClaimed.title}” · {lastClaimed.claimedByOrgName?.replace(" (Demo)", "")}</p>
                      <button onClick={() => pickRole("volunteer")} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-forest-700 px-4 py-3 text-sm font-bold text-white hover:bg-forest-800">
                        Assign a volunteer <Icon d={P.arrow} className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-3xl border border-forest-100 bg-white p-5 text-center shadow-sm">
                      <p className="text-sm text-[#5a6b60]">Nothing available right now.</p>
                      <button onClick={() => pickRole("donor")} className="mt-3 rounded-2xl bg-forest-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-forest-800">
                        Post a donation
                      </button>
                    </div>
                  )
                ) : (
                  <div className="mt-4">
                    {/* Active donation, compact */}
                    <div className="rounded-3xl border border-forest-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold leading-snug">{activeDonation.title}</p>
                          <p className="mt-0.5 text-[13px] text-[#5a6b60]">
                            {activeDonation.meals} {activeDonation.unit} · {activeDonation.pounds} lbs · {activeDonation.distanceMiles} mi away
                          </p>
                        </div>
                        <UrgencyChip d={activeDonation} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Chip label={activeDonation.storage} tone="bg-sage-100 text-forest-900" />
                        {activeDonation.dietaryTags.map((t) => <Chip key={t} label={t} tone="bg-forest-100 text-forest-800" />)}
                        {activeDonation.allergens.map((a) => <Chip key={a} label={`has ${a}`} tone="bg-ember-100 text-ember-700" />)}
                      </div>
                                            {available.length > 1 && (
                        <>
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-sage-500">Available donations</p>
                        <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Choose donation">
                          {available.map((d) => (
                            <button
                              key={d.id}
                              onClick={() => setSelectedId(d.id)}
                              aria-pressed={d.id === activeDonation.id}
                              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                                d.id === activeDonation.id ? "bg-forest-700 text-white" : "bg-cream text-forest-800 ring-1 ring-forest-100 hover:bg-forest-50"
                              }`}
                            >
                              {d.meals} {d.unit} · by {d.pickupDeadline}
                            </button>
                          ))}
                        </div>
                        </>
                      )}
<details className="mt-2">
                        <summary className="cursor-pointer list-none text-[13px] font-bold text-forest-700 [&::-webkit-details-marker]:hidden">
                          <span className="inline-flex items-center gap-1">View food details <Icon d={P.chev} className="h-3.5 w-3.5" /></span>
                        </summary>
                        <div className="mt-1.5 space-y-1 text-[13px] leading-relaxed text-[#43544a]">
                          <p>{activeDonation.description}</p>
                          <p>{activeDonation.pickupLocation}{activeDonation.pickupNotes ? ` · ${activeDonation.pickupNotes}` : ""}</p>
                          <p className="text-[#5a6b60]">{activeDonation.donorName}</p>
                        </div>
                      </details>
                    </div>

                    {/* Matches */}
                    {(() => {
                      const ranked = rankedMatches(activeDonation);
                      const [best, ...rest] = ranked;
                      return (
                        <div className="mt-3">
                          <div className="rounded-3xl border-2 border-forest-600 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="rounded-full bg-forest-700 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white">Best fit</span>
                              <span className="text-sm text-forest-800"><strong className="text-lg font-extrabold">{best.m.score}</strong> fit score</span>
                            </div>
                            <p className="mt-1.5 font-bold">{best.np.name.replace(" (Demo)", "")}</p>
                            <p className="mt-0.5 text-sm text-[#43544a]">{shortReason(activeDonation, best.np)}</p>
                            <button onClick={() => handleAdvance(activeDonation, best.np.id)} className="mt-3 w-full rounded-2xl bg-forest-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-forest-800">
                              Claim donation
                            </button>
                            <details className="mt-2">
                              <summary className="cursor-pointer list-none text-xs font-bold text-[#5a6b60] [&::-webkit-details-marker]:hidden">
                                <span className="inline-flex items-center gap-1">Why this match? <Icon d={P.chev} className="h-3.5 w-3.5" /></span>
                              </summary>
                              <p className="mt-1 text-xs leading-relaxed text-[#5a6b60]">Fit score from food type, storage, diet, capacity, and distance: {best.m.reasons.join(" · ")}</p>
                            </details>
                          </div>

                          {rest.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {rest.map(({ np, m }) => {
                                const recommended = m.score >= 70;
                                return (
                                <div key={np.id} className="flex items-center gap-2 rounded-2xl border border-forest-100 bg-white px-3 py-2.5 shadow-sm">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold">{np.name.replace(" (Demo)", "")} <span className="ml-1 rounded-full bg-cream px-1.5 py-0.5 text-[11px] font-extrabold text-forest-800 ring-1 ring-forest-100">Fit {m.score}</span></p>
                                    <p className="truncate text-xs text-[#5a6b60]">{candidateNote(activeDonation, np)}</p>
                                  </div>
                                  {recommended ? (
                                  <button onClick={() => handleAdvance(activeDonation, np.id)} className="shrink-0 rounded-xl px-3 py-2 text-[13px] font-bold text-forest-800 ring-1 ring-forest-200 transition hover:bg-forest-50" aria-label={`Claim as ${np.name}`}>
                                    Claim
                                  </button>
                                  ) : (
                                  <button disabled title="Fit score below 70 — not recommended for this donation" aria-label={`Not recommended: ${np.name}`} className="shrink-0 cursor-not-allowed rounded-xl px-3 py-2 text-[13px] font-bold text-[#9aa5a0] ring-1 ring-forest-100">
                                    Claim
                                  </button>
                                  )}
                                </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* ----------------------------- VOLUNTEER ----------------------------- */}
            {role === "volunteer" && (
              <div className="mt-5">
                {lastDelivered && (
                  <div className="animate-flash mb-4 rounded-3xl border border-forest-500 bg-white p-5 text-center shadow-sm" role="status">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest-600 text-white">
                      <Icon d={P.check} className="h-6 w-6" />
                    </span>
                    <h2 className="mt-3 text-xl font-extrabold tracking-tight">Rescue completed</h2>
                    <p className="mt-1 text-sm font-bold">“{lastDelivered.title}”</p>
                    <p className="mt-0.5 text-[13px] text-[#5a6b60]">
                      Delivered to {lastDelivered.claimedByOrgName?.replace(" (Demo)", "") ?? "recipient org"} · {lastDelivered.pounds} lbs · {lastDelivered.meals} {lastDelivered.unit} recorded
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold text-forest-800">
                      ≈{Math.round(lastDelivered.pounds * 2.5 * 10) / 10} lbs CO₂e kept out of the atmosphere (est.)
                    </p>
                    <button onClick={() => scrollTo("impact")} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-forest-700 px-4 py-3 text-sm font-bold text-white hover:bg-forest-800">
                      View impact <Icon d={P.arrow} className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {!activeRoute ? (
                  allDone ? (
                    <div className="rounded-3xl border border-forest-200 bg-white p-5 text-center shadow-sm" role="status">
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest-600 text-white">
                        <Icon d={P.check} className="h-6 w-6" />
                      </span>
                      <h2 className="mt-3 text-xl font-extrabold tracking-tight">Routes complete</h2>
                      <p className="mt-0.5 text-sm text-[#5a6b60]">All current rescue routes are complete.</p>
                      <button onClick={() => scrollTo("impact")} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-forest-700 px-4 py-3 text-sm font-bold text-white hover:bg-forest-800">
                        See the impact <Icon d={P.arrow} className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    !lastDelivered && (
                    <div className="rounded-3xl border border-forest-100 bg-white p-5 text-center shadow-sm">
                      <h2 className="text-xl font-extrabold tracking-tight">No route yet</h2>
                      <p className="mt-0.5 text-sm text-[#5a6b60]">Claim a donation first to create one.</p>
                      <button onClick={() => pickRole("nonprofit")} className="mt-4 w-full rounded-2xl bg-forest-700 px-4 py-3 text-sm font-bold text-white hover:bg-forest-800">
                        Find food to rescue
                      </button>
                    </div>
                    )
                  )
                ) : (
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight">
                      {activeRoute.status === "Claimed" ? "Rescue route available" : "Your rescue route"}
                    </h2>
                    <div className="mt-3 rounded-3xl border border-forest-100 bg-white p-4 shadow-sm sm:p-5">
                      {/* Route */}
                      <div className="rounded-2xl bg-forest-50 p-4 ring-1 ring-forest-100">
                        <div className="flex items-center justify-between gap-2 text-xs font-bold text-forest-800">
                          <span>{activeRoute.distanceMiles} mi · ~{activeRoute.etaMinutes} min</span>
                          <UrgencyChip d={activeRoute} />
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#5a6b60]">Route estimate · simulated distance and time</p>
                        <div className="mt-3">
                          <RouteMap pickup={activeRoute.pickupLocation} dropoff={activeRoute.claimedByOrgName?.replace(" (Demo)", "") ?? "Drop-off"} distanceMiles={activeRoute.distanceMiles} etaMinutes={activeRoute.etaMinutes} />
                        </div>
                        <div className="mt-3 flex items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-700 text-white"><Icon d={P.store} className="h-4 w-4" /></span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-extrabold uppercase tracking-wide text-sage-500">Pickup</p>
                            <p className="truncate text-sm font-bold">{activeRoute.pickupLocation}</p>
                          </div>
                        </div>
                        <div className="ml-[18px] border-l-2 border-dashed border-forest-300 py-1 pl-5" aria-hidden="true" />
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ember-500 text-white"><Icon d={P.heart} className="h-4 w-4" /></span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-extrabold uppercase tracking-wide text-sage-500">Drop-off</p>
                            <p className="truncate text-sm font-bold">{activeRoute.claimedByOrgName?.replace(" (Demo)", "") ?? "Claimed nonprofit"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Essentials */}
                      <p className="mt-3 text-sm font-bold">{activeRoute.title}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Chip label={`${activeRoute.meals} ${activeRoute.unit} · ${activeRoute.pounds} lbs`} tone="bg-cream text-forest-900 ring-1 ring-forest-100" />
                        <Chip label={activeRoute.storage} tone="bg-sage-100 text-forest-900" />
                        <Chip label={`by ${activeRoute.pickupDeadline}`} tone="bg-cream text-forest-900 ring-1 ring-forest-100" />
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer list-none text-[13px] font-bold text-forest-700 [&::-webkit-details-marker]:hidden">
                          <span className="inline-flex items-center gap-1">Route details <Icon d={P.chev} className="h-3.5 w-3.5" /></span>
                        </summary>
                        <div className="mt-1.5 space-y-1 text-[13px] leading-relaxed text-[#43544a]">
                          <p>{activeRoute.description}</p>
                          {activeRoute.pickupNotes && <p>Pickup note: {activeRoute.pickupNotes}</p>}
                          {activeRoute.dietaryTags.length > 0 && <p>Dietary: {activeRoute.dietaryTags.join(", ")}</p>}
                          {activeRoute.allergens.length > 0 && <p>Contains: {activeRoute.allergens.join(", ")}</p>}
                        </div>
                      </details>

                      {/* Progress */}
                      <ol className="mt-3 flex items-center gap-1" aria-label={`Progress: ${DISPLAY_STATUS[activeRoute.status]}`}>
                        {(["Claimed", "Driver Assigned", "Picked Up", "Delivered"] as DonationStatus[]).map((s, i, arr) => {
                          const reached = STATUS_FLOW.indexOf(activeRoute.status) >= STATUS_FLOW.indexOf(s);
                          const isNext = STATUS_FLOW.indexOf(activeRoute.status) + 1 === STATUS_FLOW.indexOf(s);
                          return (
                            <li key={s} className="flex min-w-0 flex-1 items-center gap-1 last:flex-none">
                              <span className={`w-full truncate rounded-full px-2 py-1 text-center text-[10px] font-bold ${
                                reached ? "bg-forest-700 text-white" : isNext ? "bg-forest-100 text-forest-800" : "bg-cream text-[#5a6b60] ring-1 ring-forest-100"
                              }`}>
                                {DISPLAY_STATUS[s]}
                              </span>
                              {i < arr.length - 1 && <span className="shrink-0 text-[10px] text-sage-500" aria-hidden="true">›</span>}
                            </li>
                          );
                        })}
                      </ol>

                      {nextAction(activeRoute) && (
                        <button onClick={() => handleAdvance(activeRoute)} className="mt-3 w-full rounded-2xl bg-forest-700 px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-forest-800">
                          {nextAction(activeRoute)}
                        </button>
                      )}
                      <p className="mt-2 text-center text-xs text-[#5a6b60]">Keep food secure. Follow storage notes.</p>
                    </div>

                    {otherRoutes.length > 0 && (
                      <details className="mt-2 rounded-2xl border border-forest-100 bg-white px-4 py-3 shadow-sm">
                        <summary className="cursor-pointer list-none text-sm font-bold text-forest-800 [&::-webkit-details-marker]:hidden">
                          <span className="inline-flex items-center gap-1.5">{otherRoutes.length} more route{otherRoutes.length === 1 ? "" : "s"} <Icon d={P.chev} className="h-4 w-4" /></span>
                        </summary>
                        <div className="space-y-2 pb-1 pt-2">
                          {otherRoutes.map((d) => (
                            <div key={d.id} className="flex items-center gap-2 rounded-xl bg-cream p-2.5 ring-1 ring-forest-100">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold">{d.title}</p>
                                <p className="text-xs text-[#5a6b60]">{DISPLAY_STATUS[d.status]} · {d.distanceMiles} mi</p>
                              </div>
                              {nextAction(d) && (
                                <button onClick={() => handleAdvance(d)} className="shrink-0 rounded-xl bg-forest-700 px-3 py-2 text-[13px] font-bold text-white hover:bg-forest-800">
                                  {nextAction(d)}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* -------------------------------- Impact -------------------------------- */}
        <section id="impact" className="scroll-mt-20 border-b border-forest-100">
          <div className="mx-auto max-w-3xl px-4 py-10">
            <h2 className="text-xl font-extrabold tracking-tight">Food rescued, locally</h2>
            <p className="mt-0.5 text-sm text-[#5a6b60]">Every delivery keeps usable food in the community.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {[
                { label: "Pounds rescued", value: `${impact.lbs} lb` },
                { label: "Items rescued", value: `${impact.items}` },
                { label: "CO₂e avoided (est.)", value: `${impact.co2e} lb`, hot: flash },
                { label: "Deliveries", value: `${impact.deliveries}`, hot: flash },
              ].map((s) => (
                <div key={s.label} className={`rounded-3xl border bg-white p-4 text-center shadow-sm transition sm:p-5 ${s.hot ? "animate-flash border-forest-500" : "border-forest-100"}`}>
                  <p className="text-3xl font-extrabold tracking-tight text-forest-900">{s.value}</p>
                  <p className="mt-0.5 text-xs font-semibold text-[#5a6b60]">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-center text-xs text-[#5a6b60]">Each item is one sandwich, pastry, wrap, or meal. CO₂e avoided is a rough demo estimate (2.5 lbs per lb rescued, FAO figure) — not a certified calculation.</p>
            <p className="mt-1 text-center text-xs text-[#5a6b60]">{impact.active} active now · Demo activity</p>

            <div className="mt-4 rounded-3xl border border-forest-100 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="text-sm font-extrabold">Recovered by category</h3>
              {byCategory.length === 0 ? (
                <p className="mt-2 rounded-2xl bg-cream p-3 text-[13px] text-[#5a6b60]">
                  Complete a rescue above and this fills in.
                </p>
              ) : (
                <div className="mt-2.5 space-y-2">
                  {byCategory.map((c) => (
                    <div key={c.cat}>
                      <div className="flex justify-between text-xs font-semibold"><span>{c.cat}</span><span>{c.lbs} lbs</span></div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-forest-100">
                        <div className="h-full rounded-full bg-forest-600 transition-all" style={{ width: `${c.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <details className="mt-2 rounded-2xl border border-forest-100 bg-white px-4 py-3 shadow-sm">
              <summary className="cursor-pointer list-none text-sm font-bold text-forest-800 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-1.5">View donation history <Icon d={P.chev} className="h-4 w-4" /></span>
              </summary>
              <ul className="space-y-1.5 pb-1 pt-2">
                {donations.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 rounded-xl bg-cream px-3 py-2 text-[13px] ring-1 ring-forest-100">
                    <span className="min-w-0 truncate font-semibold">{d.title} <span className="font-normal text-[#5a6b60]">· {d.pounds} lbs</span></span>
                    <StatusPill status={d.status} />
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </section>

        {/* ------------------------------- How it works ------------------------------ */}
        <section id="how" className="scroll-mt-20 border-b border-forest-100">
          <div className="mx-auto max-w-3xl px-4 py-10">
            <h2 className="text-xl font-extrabold tracking-tight">How it works</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {HOW_STEPS.map((s, i) => (
                <div key={s.title} className="flex items-start gap-3 rounded-3xl border border-forest-100 bg-white p-4 shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-forest-100 text-forest-800">
                    <Icon d={P[s.icon]} />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold text-sage-500">{i + 1}</p>
                    <h3 className="text-sm font-extrabold">{s.title}</h3>
                    <p className="mt-0.5 text-[13px] leading-snug text-[#5a6b60]">{s.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <details className="mt-3 rounded-2xl border border-forest-100 bg-white px-4 py-3 shadow-sm">
              <summary className="cursor-pointer list-none text-sm font-bold text-forest-800 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-1.5">Prototype notes <Icon d={P.chev} className="h-4 w-4" /></span>
              </summary>
              <ul className="space-y-1.5 pb-1 pt-2 text-[13px] leading-relaxed text-[#43544a]">
                {PROTOTYPE_NOTES.map((n) => <li key={n}>· {n}</li>)}
              </ul>
            </details>

            <details className="mt-2 rounded-2xl border border-forest-100 bg-white px-4 py-3 shadow-sm">
              <summary className="cursor-pointer list-none text-sm font-bold text-forest-800 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-1.5">90-second demo <Icon d={P.chev} className="h-4 w-4" /></span>
              </summary>
              <ol className="space-y-1 pb-1 pt-2 text-[13px] text-[#43544a]">
                {GUIDE_STEPS.map((g, i) => <li key={g}><strong>{i + 1}.</strong> {g}</li>)}
              </ol>
              <div className="flex flex-wrap gap-2 pb-1 pt-2">
                <button onClick={loadFeatured} className="inline-flex items-center gap-1.5 rounded-xl bg-forest-700 px-3.5 py-2 text-[13px] font-bold text-white hover:bg-forest-800">
                  <Icon d={P.spark} className="h-3.5 w-3.5" /> Load featured scenario
                </button>
                <button onClick={doReset} className="rounded-xl px-3.5 py-2 text-[13px] font-semibold text-forest-800 ring-1 ring-forest-200 hover:bg-forest-50">
                  Reset demo
                </button>
              </div>
            </details>
          </div>
        </section>

        {/* -------------------------------- Footer -------------------------------- */}
        <footer className="bg-forest-950 text-forest-200">
          <div className="mx-auto max-w-3xl px-4 py-8 text-xs leading-relaxed">
            <p className="font-bold text-forest-50">Prototype disclaimer (fictional demo)</p>
            <p className="mt-1">
              All restaurants, nonprofits, drivers, and donations are fictional and for demonstration only.
              RescueRoute helps participating businesses organize food-donation records that <em>may</em> support
              their food-recovery reporting and sustainability efforts — it does not guarantee SB 1383 compliance.
              Users must follow all applicable food-safety rules and local requirements. Federal Good Samaritan
              food-donation protections are general information only, not legal advice.
            </p>
            <p className="mt-2">RescueRoute Fremont · hackathon prototype · data stays in this browser · no accounts, keys, or paid services.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

/* ------------------------------- components -------------------------------- */

function Chip({ label, tone }: { label: string; tone: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>{label}</span>;
}

function StatusDot({ status }: { status: Donation["status"] }) {
  const c: Record<Donation["status"], string> = {
    Available: "bg-forest-500",
    Claimed: "bg-amber-500",
    "Driver Assigned": "bg-sky-500",
    "Picked Up": "bg-violet-500",
    Delivered: "bg-zinc-400",
  };
  return <span className={`h-2 w-2 shrink-0 rounded-full ${c[status]}`} aria-hidden="true" />;
}

const STATUS_PILL: Record<Donation["status"], string> = {
  Available: "bg-forest-100 text-forest-800",
  Claimed: "bg-amber-100 text-amber-900",
  "Driver Assigned": "bg-sky-100 text-sky-900",
  "Picked Up": "bg-violet-100 text-violet-900",
  Delivered: "bg-zinc-200 text-zinc-600",
};

function StatusPill({ status }: { status: Donation["status"] }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${STATUS_PILL[status]}`}>
      <StatusDot status={status} />{DISPLAY_STATUS[status]}
    </span>
  );
}

function UrgencyChip({ d }: { d: Donation }) {
  const u = urgencyFor(d);
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${u.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${u.dot}`} aria-hidden="true" />{u.label}
    </span>
  );
}
