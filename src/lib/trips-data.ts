export interface Trip {
  id: string;
  title: string;
  destination: string;
  country: string;
  dates: string;
  duration: string;
  price: number;
  deposit: number;
  status: "available" | "sold-out" | "waitlist" | "coming-soon";
  spots: number;
  spotsLeft: number;
  description: string;
  highlights: string[];
  includes: string[];
  notIncluded: string[];
  emoji: string;
  gradient: string;
  /** Representative location photo (self-hosted under /public/trips). */
  image: string;
  /**
   * CSS object-position for `image` (e.g. "50% 30%"). Lets the admin pick a
   * focal point so an off-center photo crops nicely in the card's fixed-height
   * media area. Defaults to "50% 50%" (centered) when unset.
   */
  imagePosition?: string;
  /**
   * Admin publish gate. Only published trips render on the public
   * marketing site; drafts are visible to admins in the CRM only.
   * `undefined` counts as published so the legacy static seeds (and any
   * trip created before this field existed) keep showing.
   */
  published?: boolean;
  /** Featured trips surface in the homepage spotlight. */
  featured?: boolean;
  /** Manual sort order in listings (ascending; falls back to seed order). */
  order?: number;
  /**
   * Optional external "Book Now" link — a payment page or details page the
   * admin wants viewers sent to. When set, the trip shows a Book Now button
   * that opens this URL in a new tab.
   */
  bookingUrl?: string;
  /** Text for the trip's single call-to-action button (defaults to "Book Now").
   *  If `bookingUrl` is set the button links there; otherwise it does the
   *  in-app reservation hold. */
  bookingLabel?: string;
  /** Firebase uid of the admin who created the trip in the live store. */
  createdBy?: string;
  /** ISO timestamps populated by the live store. */
  createdAt?: string;
  updatedAt?: string;
}

export const TRIPS_DATA: Trip[] = [
  {
    id: "cancun-aug-26",
    title: "Cancún, Mexico",
    destination: "Cancún",
    country: "Mexico",
    dates: "August 20–25, 2026",
    duration: "6 days / 5 nights",
    price: 1850,
    deposit: 500,
    status: "available",
    spots: 20,
    spotsLeft: 8,
    description: "All-inclusive Caribbean adventure with beach days, cenote swims, Mayan ruins, and nightlife. Sun, cultura, and sisterhood.",
    highlights: ["Chichén Itzá day trip", "Cenote swimming", "Beach club day", "Tulum ruins", "Group dinner on the sand"],
    includes: ["5 nights all-inclusive resort", "Airport transfers", "All excursions", "Welcome dinner", "Group activities"],
    notIncluded: ["International flights", "Travel insurance", "Personal spending"],
    emoji: "🇲🇽",
    gradient: "from-[#FF0099] via-[#B51760] to-[#C44B3F]",
    image: "/trips/cancun-aug-26.jpg",
  },
  {
    id: "napa-oct-26",
    title: "Wine Country, Napa",
    destination: "Napa Valley",
    country: "USA",
    dates: "October 10–12, 2026",
    duration: "3 days / 2 nights",
    price: 950,
    deposit: 300,
    status: "available",
    spots: 16,
    spotsLeft: 12,
    description: "A relaxing weekend of wine tastings, spa treatments, and meaningful conversations in California wine country.",
    highlights: ["3 winery tours", "Spa afternoon", "Hot air balloon ride", "Farm-to-table dinner", "Sunset vineyard picnic"],
    includes: ["2 nights boutique hotel", "All wine tastings", "Spa access", "Group meals", "Transportation"],
    notIncluded: ["Flights/driving to Napa", "Travel insurance", "Personal wine purchases"],
    emoji: "🍷",
    gradient: "from-[#DAA520] via-[#C44B3F] to-[#FF0099]",
    image: "/trips/napa-oct-26.jpg",
  },
  {
    id: "nyc-nov-26",
    title: "NYC Weekend",
    destination: "New York City",
    country: "USA",
    dates: "November 7–9, 2026",
    duration: "3 days / 2 nights",
    price: 1100,
    deposit: 350,
    status: "available",
    spots: 18,
    spotsLeft: 5,
    description: "The city that never sleeps! Broadway, food tours, and shopping with your amigas in Manhattan.",
    highlights: ["Broadway show", "Food tour in Queens", "Shopping on 5th Ave", "Rooftop dinner", "Central Park morning walk"],
    includes: ["2 nights Manhattan hotel", "Broadway ticket", "Food tour", "Group dinners", "Metro passes"],
    notIncluded: ["Flights to NYC", "Travel insurance", "Personal shopping"],
    emoji: "🗽",
    gradient: "from-[#9B2C8A] via-[#B51760] to-[#FF0099]",
    image: "/trips/nyc-nov-26.jpg",
  },
  {
    id: "colombia-dec-26",
    title: "Colombia",
    destination: "Cartagena & Medellín",
    country: "Colombia",
    dates: "December 5–12, 2026",
    duration: "8 days / 7 nights",
    price: 2400,
    deposit: 650,
    status: "available",
    spots: 14,
    spotsLeft: 14,
    description: "Explore the magic of Colombia — colonial streets of Cartagena, nightlife in Medellín, and Caribbean vibes.",
    highlights: ["Old City walking tour", "Rosario Islands boat trip", "Medellín street art tour", "Salsa lessons", "Coffee farm visit"],
    includes: ["7 nights hotels", "Internal flight", "All excursions", "Daily breakfast", "Welcome & farewell dinners"],
    notIncluded: ["International flights", "Travel insurance", "Meals not listed"],
    emoji: "🇨🇴",
    gradient: "from-[#DAA520] via-[#FF0099] to-[#9B2C8A]",
    image: "/trips/colombia-dec-26.jpg",
  },
  {
    id: "bali-jun-26",
    title: "Bali, Indonesia",
    destination: "Bali",
    country: "Indonesia",
    dates: "June 14–22, 2026",
    duration: "9 days / 8 nights",
    price: 2800,
    deposit: 750,
    status: "sold-out",
    spots: 12,
    spotsLeft: 0,
    description: "Temples, rice terraces, beach clubs, and wellness retreats in the island of the gods.",
    highlights: ["Ubud rice terraces", "Temple visits", "Beach club day", "Yoga retreat", "Waterfall hike"],
    includes: ["8 nights villas", "All excursions", "Daily breakfast", "Yoga sessions", "Airport transfers"],
    notIncluded: ["International flights", "Travel insurance", "Visa fees"],
    emoji: "🏝️",
    gradient: "from-[#2D8B6F] via-[#DAA520] to-[#FF0099]",
    image: "/trips/bali-jun-26.jpg",
  },
  {
    id: "morocco-may-26",
    title: "Morocco",
    destination: "Marrakech & Sahara",
    country: "Morocco",
    dates: "May 15–22, 2026",
    duration: "8 days / 7 nights",
    price: 2600,
    deposit: 700,
    status: "sold-out",
    spots: 14,
    spotsLeft: 0,
    description: "From the souks of Marrakech to glamping in the Sahara Desert — an unforgettable cultural immersion.",
    highlights: ["Medina walking tour", "Sahara Desert glamping", "Camel ride", "Cooking class", "Atlas Mountains hike"],
    includes: ["7 nights riads & glamping", "All excursions", "Most meals", "Desert camp experience", "Local guides"],
    notIncluded: ["International flights", "Travel insurance", "Souvenirs"],
    emoji: "🇲🇦",
    gradient: "from-[#C44B3F] via-[#DAA520] to-[#FF0099]",
    image: "/trips/morocco-may-26.jpg",
  },
  {
    id: "japan-nov-26",
    title: "Japan",
    destination: "Tokyo, Kyoto & Osaka",
    country: "Japan",
    dates: "November 15–24, 2026",
    duration: "10 days / 9 nights",
    price: 3200,
    deposit: 850,
    status: "waitlist",
    spots: 12,
    spotsLeft: 0,
    description: "Cherry blossom culture, ancient temples, incredible food, and neon-lit streets — Japan with your amigas.",
    highlights: ["Tokyo city tour", "Kyoto temples", "Osaka street food", "Tea ceremony", "Bullet train experience"],
    includes: ["9 nights hotels", "JR Rail Pass", "All excursions", "Cultural experiences", "Group meals"],
    notIncluded: ["International flights", "Travel insurance", "Personal shopping"],
    emoji: "🇯🇵",
    gradient: "from-[#FF0099] via-[#FF6BA8] to-[#FFB3D0]",
    image: "/trips/japan-nov-26.jpg",
  },
  {
    id: "safari-jul-26",
    title: "Safari, Kenya",
    destination: "Nairobi & Masai Mara",
    country: "Kenya",
    dates: "July 8–15, 2026",
    duration: "8 days / 7 nights",
    price: 3500,
    deposit: 900,
    status: "available",
    spots: 10,
    spotsLeft: 3,
    description: "Witness the Great Migration, spot the Big Five, and experience the magic of the African savanna.",
    highlights: ["Masai Mara safari drives", "Big Five spotting", "Masai village visit", "Hot air balloon ride", "Sundowner cocktails"],
    includes: ["7 nights lodges & camps", "All safari drives", "Park fees", "Most meals", "Airport transfers"],
    notIncluded: ["International flights", "Travel insurance", "Visa fees", "Tips"],
    emoji: "🦁",
    gradient: "from-[#DAA520] via-[#C44B3F] to-[#8B4513]",
    image: "/trips/safari-jul-26.jpg",
  },
];

/**
 * Look up a single trip by id. Returns undefined when nothing matches
 * so callers (e.g. the reservation hook + My Upcoming page) can resolve
 * a saved tripId back to its full marketing record without re-importing
 * the whole array.
 */
export function getTripById(id: string): Trip | undefined {
  return TRIPS_DATA.find((t) => t.id === id);
}

/**
 * Past trips for the /gallery wall. `image` is a representative location
 * photo self-hosted under /public — reusing the upcoming-trip + destination
 * photos where they overlap, plus dedicated shots under /public/gallery for
 * the rest. The card keeps its gradient + flag emoji as a fallback layer.
 */
export interface PastTrip {
  title: string;
  location: string;
  emoji: string;
  amigas: number;
  year: number;
  image: string;
}

export const PAST_TRIPS: PastTrip[] = [
  { title: "Thailand New Years 2026", location: "Bangkok & Chiang Mai", emoji: "🇹🇭", amigas: 16, year: 2026, image: "/gallery/thailand.jpg" },
  { title: "Peru April 2026", location: "Lima, Cusco & Machu Picchu", emoji: "🇵🇪", amigas: 14, year: 2026, image: "/destinations/peru.jpg" },
  { title: "Tequila, Jalisco 2026", location: "Guadalajara & Tequila", emoji: "🇲🇽", amigas: 12, year: 2026, image: "/gallery/tequila-jalisco.jpg" },
  { title: "Egypt 2025", location: "Cairo, Luxor & Aswan", emoji: "🇪🇬", amigas: 13, year: 2025, image: "/gallery/egypt.jpg" },
  { title: "Japan May 2025", location: "Tokyo & Kyoto", emoji: "🇯🇵", amigas: 12, year: 2025, image: "/trips/japan-nov-26.jpg" },
  { title: "Colombia 2025", location: "Cartagena & Medellín", emoji: "🇨🇴", amigas: 15, year: 2025, image: "/trips/colombia-dec-26.jpg" },
  { title: "Safari 2025", location: "Kenya", emoji: "🦁", amigas: 10, year: 2025, image: "/trips/safari-jul-26.jpg" },
  { title: "Costa Rica 2024", location: "San José & Manuel Antonio", emoji: "🇨🇷", amigas: 14, year: 2024, image: "/gallery/costa-rica.jpg" },
  { title: "Greece 2024", location: "Athens & Santorini", emoji: "🇬🇷", amigas: 16, year: 2024, image: "/destinations/greece.jpg" },
  { title: "Spain 2024", location: "Barcelona & Madrid", emoji: "🇪🇸", amigas: 12, year: 2024, image: "/gallery/spain.jpg" },
  { title: "Mexico City 2024", location: "CDMX", emoji: "🇲🇽", amigas: 18, year: 2024, image: "/gallery/mexico-city.jpg" },
  { title: "Bali 2024", location: "Ubud & Seminyak", emoji: "🏝️", amigas: 12, year: 2024, image: "/trips/bali-jun-26.jpg" },
];
