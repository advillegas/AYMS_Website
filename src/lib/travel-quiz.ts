import type { Trip } from "@/lib/trips-data";

/**
 * "Find Your Destination" travel quiz — a lightweight enrichment tool that
 * matches a taker's answers to one of the AYMS destination archetypes and,
 * where possible, to a live bookable trip.
 *
 * Scoring model: every answer option contributes points across a set of
 * trait dimensions; each destination archetype carries a weight vector over
 * those same dimensions. The match is the destination with the highest dot
 * product of (accumulated answer traits) · (destination weights).
 *
 * The archetypes intentionally mirror the live trip catalog (see
 * `tripMatchers`) so the result can deep-link a real trip when one exists.
 */

export type TraitKey =
  | "beach"
  | "adventure"
  | "culture"
  | "luxury"
  | "nature"
  | "social"
  | "foodie"
  | "wellness";

export type Traits = Partial<Record<TraitKey, number>>;

export interface QuizOption {
  /** Short answer label shown on the option button. */
  text: string;
  /** Optional emoji shown alongside the label. */
  emoji?: string;
  /** Points this answer adds to each trait dimension. */
  traits: Traits;
}

export interface QuizQuestion {
  id: string;
  question: string;
  emoji: string;
  options: QuizOption[];
}

export interface DestinationArchetype {
  id: string;
  name: string;
  country: string;
  emoji: string;
  /** One-line hook shown big on the result screen. */
  tagline: string;
  /** Longer description of the destination vibe. */
  description: string;
  /** Second-person "why this is you" blurb, personalized-feeling copy. */
  whyYou: string;
  /** Tailwind gradient stops for the result hero + card. */
  gradient: string;
  /** Weight vector matched against accumulated answer traits. */
  traits: Traits;
  /**
   * Lowercase substrings tested against a live trip's title/destination/
   * country to surface a real bookable trip for this archetype.
   */
  tripMatchers: string[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    question: "It's the first morning of your dream trip. What's the plan?",
    emoji: "🌅",
    options: [
      { text: "Toes in the sand, coffee in hand", emoji: "🏖️", traits: { beach: 3, wellness: 1 } },
      { text: "Out the door for a sunrise hike", emoji: "🥾", traits: { adventure: 3, nature: 2 } },
      { text: "Wandering an old city before the crowds", emoji: "🏛️", traits: { culture: 3, foodie: 1 } },
      { text: "Slow breakfast in a gorgeous suite", emoji: "🥂", traits: { luxury: 3, wellness: 1 } },
    ],
  },
  {
    id: "q2",
    question: "Pick the photo you'd post first.",
    emoji: "📸",
    options: [
      { text: "Turquoise water forever", emoji: "🌊", traits: { beach: 3, social: 1 } },
      { text: "A wild animal in its element", emoji: "🦁", traits: { adventure: 2, nature: 3 } },
      { text: "A plate you'll never forget", emoji: "🍜", traits: { foodie: 3, culture: 1 } },
      { text: "Golden hour with the whole crew", emoji: "🥳", traits: { social: 3, beach: 1 } },
    ],
  },
  {
    id: "q3",
    question: "Your ideal travel budget vibe?",
    emoji: "💸",
    options: [
      { text: "Treat myself — spa, fine dining, the works", emoji: "💎", traits: { luxury: 3, wellness: 1 } },
      { text: "Balanced — comfort with a few splurges", emoji: "⚖️", traits: { culture: 1, foodie: 1, beach: 1 } },
      { text: "Experiences over stuff — put it toward adventures", emoji: "🎒", traits: { adventure: 3, nature: 1 } },
      { text: "All about the food & nightlife", emoji: "🍸", traits: { foodie: 2, social: 2 } },
    ],
  },
  {
    id: "q4",
    question: "How do you recharge?",
    emoji: "🔋",
    options: [
      { text: "Yoga, spa, and doing absolutely nothing", emoji: "🧘‍♀️", traits: { wellness: 3, beach: 1 } },
      { text: "Adrenaline — the bigger the rush the better", emoji: "🪂", traits: { adventure: 3 } },
      { text: "Museums, markets, meeting locals", emoji: "🗺️", traits: { culture: 3, foodie: 1 } },
      { text: "Dancing until 2am with new friends", emoji: "💃", traits: { social: 3, beach: 1 } },
    ],
  },
  {
    id: "q5",
    question: "Which landscape calls you?",
    emoji: "🏞️",
    options: [
      { text: "Palm trees & powder-white beaches", emoji: "🌴", traits: { beach: 3, wellness: 1 } },
      { text: "Jungles, volcanoes, and rice terraces", emoji: "🌋", traits: { nature: 3, wellness: 1 } },
      { text: "Ancient streets & colorful architecture", emoji: "🕌", traits: { culture: 3 } },
      { text: "Endless savanna & big skies", emoji: "🌄", traits: { adventure: 2, nature: 3 } },
    ],
  },
  {
    id: "q6",
    question: "Dinner tonight is…",
    emoji: "🍽️",
    options: [
      { text: "A tasting menu paired with local wine", emoji: "🍷", traits: { luxury: 2, foodie: 3 } },
      { text: "Street food crawl, one bite at a time", emoji: "🌮", traits: { foodie: 3, culture: 1 } },
      { text: "Fresh ceviche with your feet in the sand", emoji: "🦐", traits: { beach: 2, foodie: 1 } },
      { text: "Whatever the group's feeling — it's about the company", emoji: "🥘", traits: { social: 3 } },
    ],
  },
  {
    id: "q7",
    question: "What do you want to bring home?",
    emoji: "🎁",
    options: [
      { text: "A tan and a totally reset nervous system", emoji: "☀️", traits: { beach: 2, wellness: 2 } },
      { text: "Stories no one will believe", emoji: "📖", traits: { adventure: 3 } },
      { text: "A deeper love for a new culture", emoji: "❤️", traits: { culture: 3 } },
      { text: "A new group of ride-or-die amigas", emoji: "👯‍♀️", traits: { social: 3 } },
    ],
  },
  {
    id: "q8",
    question: "Be honest — your travel superpower is…",
    emoji: "✨",
    options: [
      { text: "Finding the best beach club in any city", emoji: "🍹", traits: { beach: 2, social: 2 } },
      { text: "Saying yes to the scary, exciting thing", emoji: "🔥", traits: { adventure: 3 } },
      { text: "Knowing the history of everything", emoji: "🧠", traits: { culture: 3 } },
      { text: "Sniffing out the best meal within a mile", emoji: "👃", traits: { foodie: 3 } },
    ],
  },
];

export const DESTINATIONS: DestinationArchetype[] = [
  {
    id: "cancun",
    name: "Cancún",
    country: "Mexico",
    emoji: "🇲🇽",
    tagline: "Sun, sisterhood & Caribbean blue",
    description:
      "All-inclusive beach days, cenote swims, Mayan ruins, and nightlife that goes until sunrise.",
    whyYou:
      "You're a social sun-chaser who recharges with your feet in the sand and your favorite people close by. Cancún is your happy place.",
    gradient: "from-[#00BCD4] via-[#FF0099] to-[#B51760]",
    traits: { beach: 4, social: 3, wellness: 1 },
    tripMatchers: ["cancún", "cancun", "mexico"],
  },
  {
    id: "cartagena",
    name: "Cartagena",
    country: "Colombia",
    emoji: "🇨🇴",
    tagline: "Colorful streets & coastal soul",
    description:
      "Balconies dripping with bougainvillea, salsa in the plazas, and island days on the Caribbean coast.",
    whyYou:
      "You love a place with color, rhythm, and history — where every street is a photo and every night ends dancing.",
    gradient: "from-[#DAA520] via-[#FF0099] to-[#C44B3F]",
    traits: { culture: 3, social: 2, beach: 2, foodie: 1 },
    tripMatchers: ["colombia", "cartagena"],
  },
  {
    id: "bali",
    name: "Bali",
    country: "Indonesia",
    emoji: "🌴",
    tagline: "Wellness, jungle & total reset",
    description:
      "Rice terraces, waterfalls, temple mornings, and spa afternoons designed to melt the year off you.",
    whyYou:
      "You travel to reset. Bali's mix of nature, wellness, and slow luxury is exactly the exhale you've been needing.",
    gradient: "from-[#0F9B8E] via-[#7FB069] to-[#FF0099]",
    traits: { wellness: 4, nature: 3, beach: 1 },
    tripMatchers: ["bali", "indonesia"],
  },
  {
    id: "morocco",
    name: "Marrakech",
    country: "Morocco",
    emoji: "🇲🇦",
    tagline: "Souks, spices & desert magic",
    description:
      "Labyrinth medinas, rooftop mint tea, Sahara dune nights, and riads that feel like a dream.",
    whyYou:
      "You're a curious culture-seeker with an adventurous streak — the sensory overload of Morocco is your idea of heaven.",
    gradient: "from-[#C44B3F] via-[#DAA520] to-[#B51760]",
    traits: { culture: 3, adventure: 2, foodie: 2 },
    tripMatchers: ["morocco", "marrakech"],
  },
  {
    id: "japan",
    name: "Japan",
    country: "Japan",
    emoji: "🇯🇵",
    tagline: "Ancient temples meet neon nights",
    description:
      "Kyoto shrines, Tokyo food halls, cherry blossoms, and the most thoughtful culture on earth.",
    whyYou:
      "You crave depth — food, history, design, contrast. Japan rewards exactly your kind of curious, detail-loving traveler.",
    gradient: "from-[#FF0099] via-[#B51760] to-[#2B2D42]",
    traits: { culture: 3, foodie: 3, adventure: 1 },
    tripMatchers: ["japan", "kyoto", "tokyo"],
  },
  {
    id: "kenya",
    name: "Kenya Safari",
    country: "Kenya",
    emoji: "🦁",
    tagline: "Wild horizons & once-in-a-lifetime",
    description:
      "Sunrise game drives, the Great Migration, and nights under more stars than you've ever seen.",
    whyYou:
      "You want the trip that changes you. A Kenyan safari is raw, wild, and unforgettable — made for the bold.",
    gradient: "from-[#DAA520] via-[#C44B3F] to-[#6B4226]",
    traits: { adventure: 4, nature: 3 },
    tripMatchers: ["kenya", "safari"],
  },
  {
    id: "napa",
    name: "Napa Valley",
    country: "USA",
    emoji: "🍷",
    tagline: "Vineyards, spa days & slow luxury",
    description:
      "Rolling vineyards, tasting menus, hot-air balloons at dawn, and spa afternoons in wine country.",
    whyYou:
      "You know how to treat yourself. Napa's elegant, foodie, unhurried luxury is your love language.",
    gradient: "from-[#B51760] via-[#C44B3F] to-[#6B2737]",
    traits: { luxury: 4, foodie: 3, wellness: 1 },
    tripMatchers: ["napa"],
  },
  {
    id: "nyc",
    name: "New York City",
    country: "USA",
    emoji: "🗽",
    tagline: "The city that has it all",
    description:
      "Broadway, rooftop dinners, gallery days, and the best people-watching on the planet.",
    whyYou:
      "You're energized by culture, food, and buzz. NYC gives you a hundred lifetimes in one weekend — your kind of high.",
    gradient: "from-[#2B2D42] via-[#B51760] to-[#FF0099]",
    traits: { culture: 2, social: 3, foodie: 2, luxury: 1 },
    tripMatchers: ["new york", "nyc"],
  },
];

/** Sum answer trait vectors into a single accumulated trait map. */
export function accumulateTraits(options: QuizOption[]): Traits {
  const totals: Traits = {};
  for (const opt of options) {
    for (const [key, val] of Object.entries(opt.traits) as [TraitKey, number][]) {
      totals[key] = (totals[key] ?? 0) + val;
    }
  }
  return totals;
}

/** Rank destinations by dot product of their weights against the traits. */
export function rankDestinations(traits: Traits): DestinationArchetype[] {
  return [...DESTINATIONS]
    .map((dest) => {
      let score = 0;
      for (const [key, weight] of Object.entries(dest.traits) as [TraitKey, number][]) {
        score += (traits[key] ?? 0) * weight;
      }
      return { dest, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((r) => r.dest);
}

/** The single best-matched destination for a set of accumulated traits. */
export function matchDestination(traits: Traits): DestinationArchetype {
  return rankDestinations(traits)[0] ?? DESTINATIONS[0];
}

/**
 * Find the first live, published trip that matches a destination archetype
 * (by title / destination / country substring). Returns null when the
 * catalog has nothing bookable for that archetype yet.
 */
export function findMatchingTrip(
  archetype: DestinationArchetype,
  trips: Trip[],
): Trip | null {
  for (const trip of trips) {
    if (trip.published === false) continue;
    const haystack = `${trip.title} ${trip.destination} ${trip.country}`.toLowerCase();
    if (archetype.tripMatchers.some((m) => haystack.includes(m))) {
      return trip;
    }
  }
  return null;
}
