import { v4 as uuid } from "uuid";
import type { BuilderElement } from "./builder-store";

function el(type: string, props: Record<string, unknown>): BuilderElement {
  return { id: uuid(), type: type as any, props };
}

// ── Cream "editorial" palette (mirrors the live redesigned site) ──
// canvas/ink: cream #FDFCF7 / #FFF7FB · ink #221019 (text), soft ink #5C4452
// brand pinks: #FF0099 #B51760 #C2266A #9B2C8A · blush #FACDE8
// coral/clay: #FF7F50 #C44B3F · supporting #DAA520 #2D8B6F #2D6BB8
const INK = "#221019";
const INK_SOFT = "#5C4452";
const CREAM_GRAD = "linear-gradient(135deg, #FFF7FB 0%, #FDFCF7 55%, #FCEAF4 100%)";
const CTA_CREAM_GRAD = "linear-gradient(135deg, #FFF1F8 0%, #FDFCF7 100%)";

export function snapshotHomePage(): BuilderElement[] {
  return [
    // ── HERO ──
    el("hero", { title: "Come as strangers, leave as amigas", subtitle: "The Latina travel community where sisterhood meets adventure. Group trips, local meetups, and lifelong friendships — we're ready to be your new family.", ctaText: "Become an Amiga ♡", ctaHref: "/register", bgGradient: CREAM_GRAD, overlayOpacity: "0", minHeight: "560", align: "center" }),
    el("button", { text: "Learn More", href: "#about", variant: "outline", align: "center", bgColor: "", textColor: INK }),
    el("spacer", { height: "16" }),
    el("card", { title: "Connect", description: "Build lifelong friendships", emoji: "❤️", bgColor: "", borderColor: "#FF0099", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#FF0099", gradientTo: "#C2266A", flipEnabled: true, sparkleEnabled: true, glowEnabled: true, flipTitle: "Conectar", flipDescription: "Construye amistades para toda la vida", flipGradientFrom: "#B51760", flipGradientTo: "#9B2C8A", flipTextColor: "#ffffff", flipDescColor: "#ffffffe6", sparkleColor: "#ffffff", sparkleCount: "10", glowColor: "#FF0099" }),
    el("card", { title: "Empower", description: "Grow together as a community", emoji: "👯", bgColor: "", borderColor: "#B51760", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#B51760", gradientTo: "#9B2C8A", flipEnabled: true, sparkleEnabled: true, glowEnabled: true, flipTitle: "Empoderar", flipDescription: "Crecer juntas como comunidad", flipGradientFrom: "#9B2C8A", flipGradientTo: "#FF0099", flipTextColor: "#ffffff", flipDescColor: "#ffffffe6", sparkleColor: "#ffffff", sparkleCount: "10", glowColor: "#B51760" }),
    el("card", { title: "Celebrate", description: "Travel and create memories", emoji: "✨", bgColor: "", borderColor: "#C44B3F", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#C44B3F", gradientTo: "#FF0099", flipEnabled: true, sparkleEnabled: true, glowEnabled: true, flipTitle: "Celebrar", flipDescription: "Viajar y crear recuerdos", flipGradientFrom: "#FF7F50", flipGradientTo: "#FF0099", flipTextColor: "#ffffff", flipDescColor: "#ffffffe6", sparkleColor: "#ffffff", sparkleCount: "10", glowColor: "#C44B3F" }),

    // ── MARQUEE ──
    el("banner", { text: "✺ CONNECT · EMPOWER · CELEBRATE · LATINA TRAVEL · AMIGAS Y MÁS SOCIAL · SISTERHOOD · CULTURA · AVENTURA · HERMANDAD ✺", speed: "30", bgColor: "#B51760", textColor: "#ffffff", fontSize: "14" }),

    // ── ABOUT US ──
    el("spacer", { height: "48" }),
    el("heading", { text: "More than a community — we are family", level: "h2", align: "center", color: INK }),
    el("text", { text: "Amigas Y Más Social is the Latina travel community built on connection, empowerment, and celebration. Founded by Sally Vee, we bring Latina women together through curated group trips, local meetups, and a sisterhood that lasts a lifetime.", align: "center", color: INK_SOFT, fontSize: "16" }),
    el("spacer", { height: "16" }),
    el("text", { text: "“We don't just travel together — we belong together.”  · The AYMS promise", align: "center", color: "#B51760", fontSize: "18" }),
    el("spacer", { height: "32" }),
    el("card", { title: "Sisterhood", description: "We believe in the power of women supporting women. Every amiga is family.", emoji: "❤️", bgColor: "", borderColor: "#FF0099", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#FF0099", gradientTo: "#C2266A", flipEnabled: true, sparkleEnabled: true, glowEnabled: true, flipTitle: "Hermandad", flipDescription: "Creemos en el poder de las mujeres apoyando a mujeres. Cada amiga es familia.", flipGradientFrom: "#FF0099", flipGradientTo: "#9B2C8A", flipTextColor: "#ffffff", flipDescColor: "#ffffffe6", sparkleColor: "#ffffff", sparkleCount: "8", glowColor: "#FF0099" }),
    el("card", { title: "Culture", description: "Celebrating our Latina roots through shared experiences, traditions, and pride.", emoji: "🌎", bgColor: "", borderColor: "#FF7F50", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#FF7F50", gradientTo: "#C44B3F", flipEnabled: true, sparkleEnabled: true, glowEnabled: true, flipTitle: "Cultura", flipDescription: "Celebrando nuestras raíces Latinas a través de experiencias, tradiciones y orgullo.", flipGradientFrom: "#C44B3F", flipGradientTo: "#FF7F50", flipTextColor: "#ffffff", flipDescColor: "#ffffffe6", sparkleColor: "#ffffff", sparkleCount: "8", glowColor: "#FF7F50" }),
    el("card", { title: "Connection", description: "From Coffee & Cuties meetups to group trips, we create spaces to bond.", emoji: "☕", bgColor: "", borderColor: "#9B2C8A", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#9B2C8A", gradientTo: "#B51760", flipEnabled: true, sparkleEnabled: true, glowEnabled: true, flipTitle: "Conexión", flipDescription: "De nuestros meetups de Café y Cuties a viajes grupales, creamos espacios para conectar.", flipGradientFrom: "#B51760", flipGradientTo: "#9B2C8A", flipTextColor: "#ffffff", flipDescColor: "#ffffffe6", sparkleColor: "#ffffff", sparkleCount: "8", glowColor: "#9B2C8A" }),
    el("card", { title: "Growth", description: "Empowering each other to grow, explore, and become our best selves.", emoji: "✨", bgColor: "", borderColor: "#C2266A", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#C2266A", gradientTo: "#FF0099", flipEnabled: true, sparkleEnabled: true, glowEnabled: true, flipTitle: "Crecimiento", flipDescription: "Empoderándonos mutuamente para crecer, explorar y ser nuestra mejor versión.", flipGradientFrom: "#FF0099", flipGradientTo: "#C2266A", flipTextColor: "#ffffff", flipDescColor: "#ffffffe6", sparkleColor: "#ffffff", sparkleCount: "8", glowColor: "#C2266A" }),

    // ── FOUNDER SPOTLIGHT ──
    el("spacer", { height: "32" }),
    el("testimonial", { quote: "I had a vision of sisterhood and made it my mission to bring it to life. Through countless meetings, sleepless nights, and a lot of elbow grease, Amigas Y Más was born. It feels like family, every time.", name: "Sally Vee", location: "Founder & CEO", tripName: "AYMS", avatarInitials: "SV", gradientFrom: "#FF0099", gradientTo: "#B51760" }),
    el("spacer", { height: "48" }),
    el("divider", { color: "#FF0099", opacity: "0.18", width: "60%" }),

    // ── WHY TRAVEL WITH US ──
    el("spacer", { height: "48" }),
    el("heading", { text: "Sit back & relax, you're in good hands", level: "h2", align: "center", color: INK }),
    el("text", { text: "Unlike big commercial group tours, we prioritize boutique experiences, hand-crafted itineraries, and real connections.", align: "center", color: INK_SOFT, fontSize: "16" }),
    el("spacer", { height: "24" }),
    el("card", { title: "Small Groups", description: "Intimate groups of 10–20 amigas so everyone bonds and no one gets lost in the crowd.", emoji: "👯", bgColor: "", borderColor: "#FF0099", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#FF0099", gradientTo: "#C2266A", flipEnabled: true, sparkleEnabled: false, glowEnabled: true, flipTitle: "Grupos Pequeños", flipDescription: "Grupos íntimos de 10–20 amigas para que todas se conecten y nadie se pierda.", flipGradientFrom: "#FF0099", flipGradientTo: "#B51760", flipTextColor: "#ffffff", flipDescColor: "#ffffffe6", sparkleColor: "#ffffff", sparkleCount: "8", glowColor: "#FF0099" }),
    el("card", { title: "Curated Itineraries", description: "Every meal, excursion, and surprise is hand-picked. No cookie-cutter tours here.", emoji: "👑", bgColor: "", borderColor: "#FF7F50", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#FF7F50", gradientTo: "#C44B3F", flipEnabled: true, sparkleEnabled: false, glowEnabled: true, flipTitle: "Itinerarios Curados", flipDescription: "Cada comida, excursión y sorpresa es elegida a mano. Nada genérico aquí.", flipGradientFrom: "#C44B3F", flipGradientTo: "#FF7F50", flipTextColor: "#ffffff", flipDescColor: "#ffffffe6", sparkleColor: "#ffffff", sparkleCount: "8", glowColor: "#FF7F50" }),
    el("card", { title: "Safe & Supported", description: "Experienced trip leaders, local guides, and emergency protocols at every destination.", emoji: "🛡️", bgColor: "", borderColor: "#9B2C8A", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#9B2C8A", gradientTo: "#B51760", flipEnabled: true, sparkleEnabled: false, glowEnabled: true, flipTitle: "Seguras y Apoyadas", flipDescription: "Líderes de viaje experimentadas, guías locales y protocolos de emergencia en cada destino.", flipGradientFrom: "#9B2C8A", flipGradientTo: "#FF0099", flipTextColor: "#ffffff", flipDescColor: "#ffffffe6", sparkleColor: "#ffffff", sparkleCount: "8", glowColor: "#9B2C8A" }),
    el("card", { title: "Latina Sisterhood", description: "Built by Latinas, for Latinas. A community that gets you — your culture, your vibe, your language.", emoji: "❤️", bgColor: "", borderColor: "#C44B3F", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#C44B3F", gradientTo: "#FF0099", flipEnabled: true, sparkleEnabled: false, glowEnabled: true, flipTitle: "Hermandad Latina", flipDescription: "Creado por Latinas, para Latinas. Una comunidad que te entiende — tu cultura, tu onda, tu idioma.", flipGradientFrom: "#C44B3F", flipGradientTo: "#FF7F50", flipTextColor: "#ffffff", flipDescColor: "#ffffffe6", sparkleColor: "#ffffff", sparkleCount: "8", glowColor: "#C44B3F" }),
    el("card", { title: "Bucket List Destinations", description: "From Cancún to Kenya, Bali to NYC — we go where the magic is.", emoji: "📍", bgColor: "", borderColor: "#FF0099", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#FF0099", gradientTo: "#9B2C8A", flipEnabled: true, sparkleEnabled: false, glowEnabled: true, flipTitle: "Destinos de Ensueño", flipDescription: "De Cancún a Kenya, Bali a NYC — vamos donde está la magia.", flipGradientFrom: "#FF0099", flipGradientTo: "#9B2C8A", flipTextColor: "#ffffff", flipDescColor: "#ffffffe6", sparkleColor: "#ffffff", sparkleCount: "8", glowColor: "#FF0099" }),
    el("card", { title: "All-Inclusive Vibes", description: "Hotels, meals, activities, and transfers included. Just show up and enjoy.", emoji: "✨", bgColor: "", borderColor: "#B51760", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#B51760", gradientTo: "#FF0099", flipEnabled: true, sparkleEnabled: false, glowEnabled: true, flipTitle: "Todo Incluido", flipDescription: "Hoteles, comidas, actividades y traslados incluidos. Solo llega y disfruta.", flipGradientFrom: "#B51760", flipGradientTo: "#FF0099", flipTextColor: "#ffffff", flipDescColor: "#ffffffe6", sparkleColor: "#ffffff", sparkleCount: "8", glowColor: "#B51760" }),
    el("spacer", { height: "48" }),
    el("divider", { color: "#FF0099", opacity: "0.18", width: "60%" }),

    // ── WHERE WILL YOU GO? (Destinations) ──
    el("spacer", { height: "48" }),
    el("heading", { text: "Where will you go?", level: "h2", align: "center", color: INK }),
    el("spacer", { height: "24" }),
    el("card", { title: "Mexico", description: "3 trips", emoji: "🇲🇽", bgColor: "", borderColor: "#FF009900", image: "", href: "/trips", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#FF0099", gradientTo: "#C44B3F" }),
    el("card", { title: "Colombia", description: "1 trip", emoji: "🇨🇴", bgColor: "", borderColor: "#DAA52000", image: "", href: "/trips", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#DAA520", gradientTo: "#C44B3F" }),
    el("card", { title: "Bali", description: "2 trips", emoji: "🏝️", bgColor: "", borderColor: "#2D8B6F00", image: "", href: "/trips", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#2D8B6F", gradientTo: "#DAA520" }),
    el("card", { title: "Japan", description: "1 trip", emoji: "🇯🇵", bgColor: "", borderColor: "#FF009900", image: "", href: "/trips", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#FF0099", gradientTo: "#FF6BA8" }),
    el("card", { title: "Kenya", description: "1 trip", emoji: "🦁", bgColor: "", borderColor: "#DAA52000", image: "", href: "/trips", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#DAA520", gradientTo: "#8B4513" }),
    el("card", { title: "Morocco", description: "1 trip", emoji: "🇲🇦", bgColor: "", borderColor: "#C44B3F00", image: "", href: "/trips", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#C44B3F", gradientTo: "#DAA520" }),
    el("card", { title: "Peru", description: "1 trip", emoji: "🇵🇪", bgColor: "", borderColor: "#9B2C8A00", image: "", href: "/trips", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#9B2C8A", gradientTo: "#FF0099" }),
    el("card", { title: "Greece", description: "1 trip", emoji: "🇬🇷", bgColor: "", borderColor: "#2D6BB800", image: "", href: "/trips", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#2D6BB8", gradientTo: "#2D8B6F" }),

    // ── MARQUEE 2 ──
    el("banner", { text: "♡ AMIGAS · TRAVEL · COMMUNITY · CULTURA · EMPOWERMENT · SISTERHOOD ♡", speed: "30", bgColor: "#FF0099", textColor: "#ffffff", fontSize: "13" }),

    // ── SUMMER CAMP ──
    el("spacer", { height: "48" }),
    el("heading", { text: "Amigas Summer Camp 2026", level: "h2", align: "center", color: INK }),
    el("text", { text: "Three days of bonding, growth, and unforgettable memories. Our annual camp brings amigas together for workshops, outdoor adventures, and sisterhood.", align: "center", color: INK_SOFT, fontSize: "16" }),
    el("text", { text: "July 15–18, 2026 · Camp Wilderness, CA · Limited to 50 Amigas · 3 Days of Fun", align: "center", color: "#C44B3F", fontSize: "14" }),
    el("countdown", { targetDate: "2026-07-15", label: "Summer Camp Starts In", bgColor: "#B51760", accentColor: "#FF7F50" }),
    el("spacer", { height: "16" }),
    el("button", { text: "Register Now ♡", href: "/register", variant: "primary", align: "center", bgColor: "", textColor: "" }),
    el("spacer", { height: "48" }),
    el("divider", { color: "#FF0099", opacity: "0.18", width: "60%" }),

    // ── UPCOMING TRIPS ──
    el("spacer", { height: "48" }),
    el("heading", { text: "Travel with your amigas", level: "h2", align: "center", color: INK }),
    el("text", { text: "We organize group trips that create lifelong memories. From beach getaways to city adventures, there's something for every amiga.", align: "center", color: INK_SOFT, fontSize: "16" }),
    el("spacer", { height: "16" }),
    el("trip-card", { emoji: "🇲🇽", destination: "Cancún, Mexico", dates: "Aug 20–25, 2026", price: "$1,850", status: "open", description: "All-inclusive Caribbean adventure. Sun, cultura, and sisterhood.", ctaText: "Book Now", ctaHref: "/trips" }),
    el("trip-card", { emoji: "🍷", destination: "Wine Country, Napa", dates: "Oct 10–12, 2026", price: "$950", status: "open", description: "Wine tastings, spa treatments, and meaningful conversations.", ctaText: "Book Now", ctaHref: "/trips" }),
    el("trip-card", { emoji: "🗽", destination: "NYC Weekend", dates: "Nov 7–9, 2026", price: "$1,100", status: "open", description: "Broadway, food tours, and shopping with your amigas.", ctaText: "Book Now", ctaHref: "/trips" }),
    el("spacer", { height: "48" }),
    el("divider", { color: "#FF0099", opacity: "0.18", width: "60%" }),

    // ── UNFORGETTABLE EXPERIENCES ──
    el("spacer", { height: "48" }),
    el("heading", { text: "Unforgettable experiences", level: "h2", align: "center", color: INK }),
    el("text", { text: "Every trip is packed with curated activities that you'll remember forever. Here are just a few.", align: "center", color: INK_SOFT, fontSize: "16" }),
    el("spacer", { height: "24" }),
    el("card", { title: "Cenote Swimming in the Yucatán", description: "Mexico", emoji: "🏊‍♀️", bgColor: "", borderColor: "#2D8B6F00", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#2D8B6F", gradientTo: "#1a5c4a" }),
    el("card", { title: "Cooking Class in Cartagena", description: "Colombia", emoji: "🍳", bgColor: "", borderColor: "#DAA52000", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#DAA520", gradientTo: "#8B6914" }),
    el("card", { title: "Sunrise Safari Drive", description: "Kenya", emoji: "🦒", bgColor: "", borderColor: "#C44B3F00", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#C44B3F", gradientTo: "#8B3029" }),
    el("card", { title: "Wine Tasting in Napa Valley", description: "California", emoji: "🍷", bgColor: "", borderColor: "#9B2C8A00", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#9B2C8A", gradientTo: "#6B1D5E" }),
    el("card", { title: "Salsa Night in Medellín", description: "Colombia", emoji: "💃", bgColor: "", borderColor: "#FF009900", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#FF0099", gradientTo: "#B8306A" }),
    el("card", { title: "Temple Visit in Kyoto", description: "Japan", emoji: "⛩️", bgColor: "", borderColor: "#B5176000", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#B51760", gradientTo: "#9B2C8A" }),
    el("spacer", { height: "48" }),
    el("divider", { color: "#FF0099", opacity: "0.18", width: "60%" }),

    // ── TESTIMONIALS ──
    el("spacer", { height: "48" }),
    el("heading", { text: "See what it's really like", level: "h2", align: "center", color: INK }),
    el("text", { text: "Honest words from amigas who showed up solo and left with a second family.", align: "center", color: INK_SOFT, fontSize: "16" }),
    el("testimonial", { quote: "AYMS gave me a second family. The trips are incredible and the friendships are real. I've never felt so welcomed.", name: "Sofia R.", location: "Miami, FL", tripName: "Cancún, 2025", avatarInitials: "SR", gradientFrom: "#FF0099", gradientTo: "#B51760" }),
    el("testimonial", { quote: "From the first Coffee & Cuties event, I knew I was home. The sisterhood here is unlike anything I've experienced before.", name: "Valentina L.", location: "New York, NY", tripName: "Coffee & Cuties, 2026", avatarInitials: "VL", gradientFrom: "#FF7F50", gradientTo: "#C44B3F" }),
    el("testimonial", { quote: "Summer camp changed my life. The bonds we built in three days will last a lifetime. Can't wait for next year!", name: "Camila T.", location: "Chicago, IL", tripName: "Summer Camp, 2025", avatarInitials: "CT", gradientFrom: "#9B2C8A", gradientTo: "#FF0099" }),
    el("testimonial", { quote: "Everything was planned perfectly but still felt spontaneous. The temples, the food, the friendships — Bali with AYMS was a dream.", name: "Isabella M.", location: "Austin, TX", tripName: "Bali, 2024", avatarInitials: "IM", gradientFrom: "#2D8B6F", gradientTo: "#DAA520" }),
    el("testimonial", { quote: "The Sahara glamping was something out of a movie. I never thought I'd ride a camel at sunset with 13 amigas. Thank you AYMS!", name: "Diana P.", location: "Los Angeles, CA", tripName: "Morocco, 2025", avatarInitials: "DP", gradientFrom: "#C44B3F", gradientTo: "#FF7F50" }),
    el("testimonial", { quote: "Cartagena was magical. The salsa lessons, the street food, the rooftop dinners — every single detail was curated to perfection.", name: "Ana G.", location: "Houston, TX", tripName: "Colombia, 2025", avatarInitials: "AG", gradientFrom: "#B51760", gradientTo: "#9B2C8A" }),
    el("spacer", { height: "48" }),
    el("divider", { color: "#FF0099", opacity: "0.18", width: "60%" }),

    // ── COMMUNITY PREVIEW + CONTACT / CTA ──
    el("spacer", { height: "48" }),
    el("heading", { text: "Become an Amiga", level: "h2", align: "center", color: INK }),
    el("text", { text: "Real friendships, bucket-list adventures, and a sisterhood that travels together. Membership is free — your seat at the table is waiting.", align: "center", color: INK_SOFT, fontSize: "16" }),
    el("spacer", { height: "16" }),
    el("cta-block", { heading: "Ready to join the family?", description: "Have questions about events, trips, or membership? We'd love to hear from you. Reach out and we'll get back to you shortly.", primaryText: "Become an Amiga — it's free ♡", primaryHref: "/register", secondaryText: "Browse trips", secondaryHref: "/trips", bgGradient: CTA_CREAM_GRAD }),
    el("spacer", { height: "32" }),
    el("card", { title: "@amigasymassocial", description: "Follow us on Instagram", emoji: "📸", bgColor: "", borderColor: "#FF0099", image: "", href: "https://www.instagram.com/amigasymassocial/", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#FF0099", gradientTo: "#C2266A" }),
    el("card", { title: "hello@amigasymassocial.com", description: "Email us anytime", emoji: "✉️", bgColor: "", borderColor: "#C44B3F", image: "", href: "mailto:hello@amigasymassocial.com", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#C44B3F", gradientTo: "#FF7F50" }),
    el("card", { title: "Become an Amiga", description: "Join for free and access the community portal", emoji: "❤️", bgColor: "", borderColor: "#9B2C8A", image: "", href: "/register", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#9B2C8A", gradientTo: "#B51760" }),
  ];
}

export function snapshotTripsPage(): BuilderElement[] {
  return [
    el("hero", { title: "Shop Trips", subtitle: "Leave the hassle of planning to us. All you need to worry about is enjoying your trip while creating lifelong memories con tus nuevas Amigas.", ctaText: "View All Trips", ctaHref: "#trips", bgGradient: CREAM_GRAD, overlayOpacity: "0", minHeight: "380", align: "center" }),
    el("spacer", { height: "32" }),
    el("trip-card", { emoji: "🌴", destination: "Cancún, Mexico", dates: "Aug 20–25, 2026", price: "$1,850", status: "open", description: "6 days/5 nights · All-inclusive Caribbean adventure. Only 8 spots left!", ctaText: "Book Now", ctaHref: "#" }),
    el("trip-card", { emoji: "🍷", destination: "Wine Country, Napa", dates: "Oct 10–12, 2026", price: "$950", status: "open", description: "3 days/2 nights · Wine tastings, spa, and vineyard sunsets.", ctaText: "Book Now", ctaHref: "#" }),
    el("trip-card", { emoji: "🗽", destination: "NYC Weekend", dates: "Nov 7–9, 2026", price: "$1,100", status: "open", description: "3 days/2 nights · Broadway, food tours, and shopping. Only 5 spots left!", ctaText: "Book Now", ctaHref: "#" }),
    el("trip-card", { emoji: "💃", destination: "Colombia", dates: "Dec 5–12, 2026", price: "$2,400", status: "open", description: "8 days/7 nights · Cartagena & Medellín. Salsa lessons, coffee farm, colonial streets.", ctaText: "Book Now", ctaHref: "#" }),
    el("trip-card", { emoji: "🦁", destination: "Safari, Kenya", dates: "Jul 8–15, 2026", price: "$3,500", status: "open", description: "8 days/7 nights · Big Five, Masai Mara, hot air balloon. Only 3 spots left!", ctaText: "Book Now", ctaHref: "#" }),
    el("trip-card", { emoji: "🗾", destination: "Japan", dates: "Nov 15–24, 2026", price: "$3,200", status: "waitlist", description: "10 days/9 nights · Tokyo, Kyoto & Osaka. Cherry blossoms, temples, ramen.", ctaText: "Join Waitlist", ctaHref: "#" }),
    el("spacer", { height: "32" }),
    el("divider", { color: "#FF0099", opacity: "0.18", width: "60%" }),
    el("spacer", { height: "32" }),
    el("heading", { text: "How to Book", level: "h2", align: "center", color: INK }),
    el("text", { text: "1. Secure your spot with a deposit or payment plan\n2. Sign the travel agreement & waiver via email\n3. Meet your amigas on a group Zoom call\n4. Pack & go — we meet you at the airport!", align: "left", color: INK_SOFT, fontSize: "15" }),
    el("spacer", { height: "32" }),
    el("pricing", { price: "500", currency: "$", period: "deposit", title: "Reserve Your Spot", features: ["Secure your trip", "Payment plans available", "Full refund up to 60 days before", "Group Zoom included"], ctaText: "Pay Deposit", ctaHref: "#", highlight: true }),
  ];
}

export function snapshotEventsPage(): BuilderElement[] {
  return [
    el("hero", { title: "Upcoming Events", subtitle: "Coffee meetups, camp weekends, group trips, and social celebrations. There's always something happening with AYMS.", ctaText: "Open Community Calendar ♡", ctaHref: "/community/calendar", bgGradient: CREAM_GRAD, overlayOpacity: "0", minHeight: "380", align: "center" }),
    el("spacer", { height: "32" }),
    el("event-card", { dateMonth: "APR", dateDay: "26", title: "Hiking Adventure", location: "Griffith Observatory, LA", type: "Meetup", description: "Morning hike followed by brunch. All fitness levels welcome!", ctaText: "RSVP", ctaHref: "#" }),
    el("event-card", { dateMonth: "MAY", dateDay: "5", title: "Wine & Paint Night", location: "Art Studio, Santa Monica", type: "Social", description: "Unleash your inner artist! Supplies included.", ctaText: "RSVP", ctaHref: "#" }),
    el("event-card", { dateMonth: "MAY", dateDay: "19", title: "Coffee and Cuties", location: "Local Café, LA", type: "Meetup", description: "Monthly meetup for coffee and connection. Bring your little ones!", ctaText: "RSVP", ctaHref: "#" }),
    el("event-card", { dateMonth: "JUL", dateDay: "15", title: "AYMS Summer Camp", location: "Camp Wilderness, CA", type: "Camp", description: "Our annual summer camp! Three days of fun, bonding, and empowerment.", ctaText: "Register", ctaHref: "#" }),
    el("event-card", { dateMonth: "AUG", dateDay: "12", title: "Water Day", location: "Riverside Park, LA", type: "Social", description: "Beat the heat with our summer water day celebration!", ctaText: "RSVP", ctaHref: "#" }),
    el("event-card", { dateMonth: "NOV", dateDay: "1", title: "Dia de los Muertos", location: "Community Center, LA", type: "Social", description: "Honor our loved ones with a beautiful celebration.", ctaText: "RSVP", ctaHref: "#" }),
    el("spacer", { height: "32" }),
    el("cta-block", { heading: "Want to see the full calendar?", description: "Every meetup, camp weekend, and group trip lives on the community calendar. Join free to RSVP and never miss a thing.", primaryText: "Open Community Calendar ♡", primaryHref: "/community/calendar", secondaryText: "Join Community", secondaryHref: "/register", bgGradient: CTA_CREAM_GRAD }),
  ];
}

export function snapshotGalleryPage(): BuilderElement[] {
  return [
    el("hero", { title: "Past Trips", subtitle: "Where we've been, who we've become. Every trip builds bonds that last a lifetime.", ctaText: "Book Next Trip", ctaHref: "/trips", bgGradient: CREAM_GRAD, overlayOpacity: "0", minHeight: "380", align: "center" }),
    el("spacer", { height: "32" }),
    el("gallery", { images: ["", "", "", "", "", ""], columns: "3", gap: "8", borderRadius: "12" }),
    el("spacer", { height: "32" }),
    el("trip-card", { emoji: "🇹🇭", destination: "Thailand New Years 2026", dates: "Dec 28 – Jan 4", price: "Completed", status: "sold-out", description: "Bangkok & Chiang Mai — 16 amigas", ctaText: "View Photos", ctaHref: "#" }),
    el("trip-card", { emoji: "🇵🇪", destination: "Peru April 2026", dates: "Apr 5–14", price: "Completed", status: "sold-out", description: "Lima, Cusco & Machu Picchu — 14 amigas", ctaText: "View Photos", ctaHref: "#" }),
    el("trip-card", { emoji: "🇪🇬", destination: "Egypt 2025", dates: "Mar 2025", price: "Completed", status: "sold-out", description: "Cairo, Luxor & Aswan — 13 amigas", ctaText: "View Photos", ctaHref: "#" }),
    el("trip-card", { emoji: "🇯🇵", destination: "Japan May 2025", dates: "May 2025", price: "Completed", status: "sold-out", description: "Tokyo & Kyoto — 12 amigas", ctaText: "View Photos", ctaHref: "#" }),
    el("trip-card", { emoji: "🇰🇪", destination: "Safari 2025", dates: "Jul 2025", price: "Completed", status: "sold-out", description: "Kenya — 10 amigas", ctaText: "View Photos", ctaHref: "#" }),
    el("trip-card", { emoji: "🇬🇷", destination: "Greece 2024", dates: "Sep 2024", price: "Completed", status: "sold-out", description: "Athens & Santorini — 16 amigas", ctaText: "View Photos", ctaHref: "#" }),
    el("spacer", { height: "24" }),
    el("banner", { text: "Trips completed · Amigas traveled · 10+ countries visited · ∞ memories made", speed: "30", bgColor: "#FF0099", textColor: "#ffffff", fontSize: "14" }),
  ];
}

export function snapshotFaqPage(): BuilderElement[] {
  return [
    el("hero", { title: "Frequently Asked", subtitle: "Everything you need to know about traveling with AYMS. Can't find your answer? Reach out to us anytime.", ctaText: "Contact Us", ctaHref: "/#contact", bgGradient: CREAM_GRAD, overlayOpacity: "0", minHeight: "340", align: "center" }),
    el("spacer", { height: "32" }),
    el("heading", { text: "Trips & Booking", level: "h3", align: "left", color: "#B51760" }),
    el("faq-item", { question: "Do you offer payment plans?", answer: "Sí! All of our tours are available with a payment plan option. You can secure your spot with a deposit and pay the remaining balance in installments before the trip.", open: false }),
    el("faq-item", { question: "Are flights included?", answer: "International flights are not included in the trip price. You will book your own flight from your home airport and we will meet up at the destination airport.", open: false }),
    el("faq-item", { question: "How many Amigas come on a tour?", answer: "On average our groups have 12–20 amigas plus the group tour leader. We keep groups intimate to ensure everyone bonds.", open: false }),
    el("spacer", { height: "24" }),
    el("heading", { text: "Travel & Logistics", level: "h3", align: "left", color: "#B51760" }),
    el("faq-item", { question: "What if I'm a solo traveler?", answer: "Most of our amigas travel solo — that's the whole point! You'll be matched with a roommate. By day two, you'll feel like you've known everyone for years.", open: false }),
    el("faq-item", { question: "Do I need travel insurance?", answer: "Travel insurance is not required but highly recommended. We suggest coverage for: trip cancellation, luggage loss, and healthcare costs abroad.", open: false }),
    el("spacer", { height: "24" }),
    el("heading", { text: "Community & Membership", level: "h3", align: "left", color: "#B51760" }),
    el("faq-item", { question: "How do I join the AYMS community?", answer: "Just create an account on our website! Membership is free and gives you access to our community portal with chat channels, event calendar, and member directory.", open: false }),
    el("faq-item", { question: "Is the community free?", answer: "Yes! Community membership is completely free. Create an account to access the chat channels, event calendar, and member directory. Trips are paid separately.", open: false }),
    el("spacer", { height: "24" }),
    el("heading", { text: "Safety & Support", level: "h3", align: "left", color: "#B51760" }),
    el("faq-item", { question: "Is it safe to travel with AYMS?", answer: "Absolutely. Every trip has experienced leaders, vetted local guides, and emergency protocols. You're never alone — your amigas and our team have your back the whole way.", open: false }),
    el("spacer", { height: "32" }),
    el("cta-block", { heading: "Still have questions?", description: "Reach out and we'll get back to you shortly.", primaryText: "Contact Us ♡", primaryHref: "/#contact", secondaryText: "Browse Trips", secondaryHref: "/trips", bgGradient: CTA_CREAM_GRAD }),
  ];
}

export function snapshotFeaturedPage(): BuilderElement[] {
  return [
    el("hero", { title: "Your Next Adventure", subtitle: "The trip everyone's talking about — grab your spot before it's gone.", ctaText: "Get Notified", ctaHref: "#", bgGradient: CREAM_GRAD, overlayOpacity: "0", minHeight: "420", align: "center" }),
    el("spacer", { height: "24" }),
    el("countdown", { targetDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10), label: "Event Starts In", bgColor: "#B51760", accentColor: "#FF7F50" }),
    el("spacer", { height: "24" }),
    el("image", { src: "", alt: "Featured spotlight banner", width: "100%", borderRadius: "16" }),
    el("spacer", { height: "24" }),
    el("text", { text: "Add your featured spotlight details here.", align: "center", color: INK_SOFT, fontSize: "16" }),
    el("spacer", { height: "16" }),
    el("cta-block", { heading: "Don't miss the next one", description: "Spots are limited. Reserve yours today and be first to know when the next adventure drops.", primaryText: "Register Now", primaryHref: "#", secondaryText: "Learn More", secondaryHref: "#", bgGradient: CTA_CREAM_GRAD }),
  ];
}

export function snapshotPlayPage(): BuilderElement[] {
  return [
    el("section", { bgColor: "#FFF7FB", bgGradient: CREAM_GRAD, padding: "64", maxWidth: "1000", borderTop: false }),
    el("heading", { text: "Travel Playground", level: "h1", align: "center", color: INK }),
    el("text", { text: "Take the quiz, explore the map, or live an adventure — your choice, amiga!", align: "center", color: INK_SOFT, fontSize: "16" }),
    el("spacer", { height: "32" }),
    el("card", { title: "Travel Quiz", description: "Answer 7 questions and we'll match you with your dream destination.", emoji: "🧭", bgColor: "", borderColor: "#FF0099", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#FF0099", gradientTo: "#B51760" }),
    el("card", { title: "World Map", description: "Explore an interactive map — click any city to start an adventure.", emoji: "🗺️", bgColor: "", borderColor: "#9B2C8A", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#9B2C8A", gradientTo: "#FF0099" }),
    el("card", { title: "Quick Adventure", description: "Jump into a random choose-your-own-adventure story.", emoji: "✨", bgColor: "", borderColor: "#B51760", image: "", href: "", textColor: "#ffffff", descColor: "#ffffffe6", gradientFrom: "#B51760", gradientTo: "#9B2C8A" }),
  ];
}

export function snapshotLoginPage(): BuilderElement[] {
  return [
    el("section", { bgColor: "#FFF7FB", bgGradient: CREAM_GRAD, padding: "80", maxWidth: "500", borderTop: false }),
    el("heading", { text: "Welcome back, amiga", level: "h1", align: "center", color: INK }),
    el("text", { text: "Sign in with your username, email, or Google account", align: "center", color: INK_SOFT, fontSize: "14" }),
    el("spacer", { height: "24" }),
    el("button", { text: "Log In", href: "/community", variant: "primary", align: "center" }),
    el("spacer", { height: "16" }),
    el("text", { text: "Not an amiga yet? Join us", align: "center", color: "#B51760", fontSize: "14" }),
  ];
}

export function snapshotRegisterPage(): BuilderElement[] {
  return [
    el("section", { bgColor: "#FFF7FB", bgGradient: CREAM_GRAD, padding: "80", maxWidth: "500", borderTop: false }),
    el("heading", { text: "Become an Amiga", level: "h1", align: "center", color: INK }),
    el("text", { text: "Create your account and join the community", align: "center", color: INK_SOFT, fontSize: "14" }),
    el("spacer", { height: "24" }),
    el("button", { text: "Become an Amiga ♡", href: "/community", variant: "primary", align: "center" }),
    el("spacer", { height: "16" }),
    el("text", { text: "Already an amiga? Log In", align: "center", color: "#B51760", fontSize: "14" }),
  ];
}

export const PAGE_SNAPSHOTS: Record<string, () => BuilderElement[]> = {
  home: snapshotHomePage,
  trips: snapshotTripsPage,
  events: snapshotEventsPage,
  gallery: snapshotGalleryPage,
  faq: snapshotFaqPage,
  featured: snapshotFeaturedPage,
  play: snapshotPlayPage,
  login: snapshotLoginPage,
  register: snapshotRegisterPage,
};
