export interface KnowledgeEntry {
  keywords: string[];
  category: string;
  question: string;
  answer: string;
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // Company info
  { keywords: ["what", "ayms", "amigas", "company", "about", "who"], category: "company", question: "What is Amigas Y Más Social?", answer: "Amigas Y Más Social (AYMS) is a Latina community and travel company founded by Sally Vee. We bring women together through curated group trips, local events, and an online community. Our mission is connection, empowerment, and celebration — sisterhood through travel and shared experiences." },
  { keywords: ["founder", "sally", "vee", "started", "created", "who founded"], category: "company", question: "Who founded AYMS?", answer: "AYMS was founded by Sally Vee, a traveler, foodie, and entrepreneur. She had a vision of sisterhood and made it her mission to bring it to life. Through countless meetings, sleepless nights, and a lot of elbow grease, Amigas Y Más was born." },
  { keywords: ["mission", "values", "purpose", "why"], category: "company", question: "What is the AYMS mission?", answer: "Our mission is built on four pillars: Sisterhood (women supporting women), Culture (celebrating our Latina roots), Connection (creating spaces to bond), and Growth (empowering each other). We believe every amiga is family." },
  { keywords: ["contact", "reach", "email", "instagram", "social media"], category: "company", question: "How can I contact AYMS?", answer: "You can reach us at hello@amigasymassocial.com or follow us on Instagram @amigasymassocial. We respond within 24-48 hours. You can also use the contact form on our website." },

  // Trips - General
  { keywords: ["trips", "travel", "destinations", "where", "go", "upcoming"], category: "trips", question: "What trips do you offer?", answer: "We offer curated group trips to incredible destinations! Currently available: Cancún Mexico (Aug 2026, $1,850), Wine Country Napa (Oct 2026, $950), NYC Weekend (Nov 2026, $1,100), Colombia (Dec 2026, $2,400), and Safari Kenya (Jul 2026, $3,500). We also have waitlist trips to Japan and sold-out trips to Bali and Morocco." },
  { keywords: ["book", "how", "reserve", "sign up", "join trip", "register"], category: "trips", question: "How do I book a trip?", answer: "Booking is simple! 1) Browse our trips page and pick your adventure. 2) Secure your spot with a deposit or full payment. 3) You'll receive a travel agreement to sign via email. 4) Join our mandatory pre-trip group Zoom call to meet your amigas. 5) We'll meet you at the airport — just bring yourself and good vibes!" },
  { keywords: ["payment", "plan", "deposit", "cost", "pay", "price", "expensive"], category: "trips", question: "Do you offer payment plans?", answer: "Sí! All trips offer payment plans. You can secure your spot with a deposit (ranging from $300-$900 depending on the trip) and pay the balance in installments before the trip date. Full details are on each trip's page." },
  { keywords: ["flight", "flights", "airfare", "included", "fly"], category: "trips", question: "Are flights included?", answer: "International flights are NOT included in the trip price. You book your own flight from your home airport, and we meet up at the destination. However, domestic flights within a trip itinerary (like between cities) ARE included when specified." },
  { keywords: ["cancel", "cancellation", "refund", "change"], category: "trips", question: "What is your cancellation policy?", answer: "Deposits are non-refundable but may be transferable to a future trip depending on timing. Full cancellation details are provided in the travel agreement you sign when booking. We recommend purchasing travel insurance for full protection." },
  { keywords: ["insurance", "travel insurance", "covered"], category: "trips", question: "Do I need travel insurance?", answer: "Travel insurance is not required but HIGHLY recommended. We suggest coverage for: trip cancellation, luggage loss, and healthcare costs abroad. We can recommend providers during our pre-trip Zoom call." },
  { keywords: ["solo", "alone", "single", "by myself", "first time"], category: "trips", question: "Can I travel solo?", answer: "Absolutely! Most of our amigas travel solo — that's the whole point! You'll be matched with a roommate or can opt for a single room supplement. By day two, you'll feel like you've known everyone for years. We've built a safe, welcoming environment specifically for solo female travelers." },
  { keywords: ["group size", "how many", "people", "women"], category: "trips", question: "How many people are on each trip?", answer: "Our groups are intentionally small — typically 10-20 amigas plus the trip leader. This ensures everyone bonds and no one gets lost in the crowd. Some popular trips may add additional spots." },
  { keywords: ["age", "old", "young", "ages"], category: "trips", question: "What ages are welcome?", answer: "We welcome women 21+ on all trips. Our groups typically range from late 20s to mid 50s, but all ages are welcome — what matters is the vibes! We're all amigas here." },
  { keywords: ["location", "state", "california", "live", "where from"], category: "trips", question: "Do I have to live in California to join?", answer: "Not at all! We have amigas joining from all over the US — California, New York, Texas, Florida, Illinois, Arizona, Georgia, Nevada, and many more states. Everyone is welcome regardless of location." },
  { keywords: ["included", "what's included", "included in price", "get"], category: "trips", question: "What's typically included in trip prices?", answer: "Each trip varies, but generally includes: accommodations (boutique hotels/resorts), most meals, all excursions and activities, local transportation, airport transfers, and a trip leader. Check each trip's detail page for the exact breakdown of what's included and what's not." },
  { keywords: ["safe", "safety", "secure", "dangerous"], category: "trips", question: "Is it safe to travel with AYMS?", answer: "Safety is our top priority! All destinations are thoroughly vetted. We use trusted local partners and experienced trip leaders. We hold a mandatory pre-trip Zoom call covering safety guidelines and emergency protocols. Our leaders carry emergency contacts, local hospital info, and embassy details at every destination." },
  { keywords: ["diet", "dietary", "food", "vegetarian", "vegan", "allergy", "gluten"], category: "trips", question: "Can you accommodate dietary restrictions?", answer: "Yes! We accommodate all dietary needs. Just let us know when you book and we'll ensure every meal works for you. Our local partners handle vegetarian, vegan, gluten-free, and allergy requirements." },

  // Specific trips
  { keywords: ["cancun", "mexico", "caribbean"], category: "trips", question: "Tell me about the Cancún trip", answer: "Our Cancún, Mexico trip runs August 20-25, 2026 (6 days/5 nights) at $1,850/person ($500 deposit). It's an all-inclusive Caribbean adventure featuring: Chichén Itzá day trip, cenote swimming, beach club day, Tulum ruins, and a group dinner on the sand. Includes 5 nights all-inclusive resort, airport transfers, all excursions, and welcome dinner. Only 8 spots left!" },
  { keywords: ["napa", "wine", "california", "winery"], category: "trips", question: "Tell me about the Napa Valley trip", answer: "Wine Country Napa runs October 10-12, 2026 (3 days/2 nights) at $950/person ($300 deposit). Features: 3 winery tours, spa afternoon, hot air balloon ride, farm-to-table dinner, and sunset vineyard picnic. Includes 2 nights boutique hotel, all wine tastings, spa access, group meals, and transportation." },
  { keywords: ["nyc", "new york", "city", "broadway"], category: "trips", question: "Tell me about the NYC trip", answer: "NYC Weekend runs November 7-9, 2026 (3 days/2 nights) at $1,100/person ($350 deposit). Features: Broadway show, food tour in Queens, shopping on 5th Ave, rooftop dinner, and Central Park morning walk. Includes 2 nights Manhattan hotel, Broadway ticket, food tour, group dinners, and metro passes. Only 5 spots left!" },
  { keywords: ["colombia", "cartagena", "medellin"], category: "trips", question: "Tell me about the Colombia trip", answer: "Colombia runs December 5-12, 2026 (8 days/7 nights) at $2,400/person ($650 deposit). Explore Cartagena's colonial streets and Medellín's nightlife. Features: Old City walking tour, Rosario Islands boat trip, street art tour, salsa lessons, and coffee farm visit. Includes 7 nights hotels, internal flight, all excursions, and welcome/farewell dinners." },
  { keywords: ["safari", "kenya", "africa", "animals"], category: "trips", question: "Tell me about the Safari trip", answer: "Safari Kenya runs July 8-15, 2026 (8 days/7 nights) at $3,500/person ($900 deposit). Witness the Great Migration and spot the Big Five! Features: Masai Mara safari drives, Masai village visit, hot air balloon ride, and sundowner cocktails. Includes 7 nights lodges & camps, all safari drives, park fees, and most meals. Only 3 spots left!" },
  { keywords: ["japan", "tokyo", "kyoto"], category: "trips", question: "Tell me about the Japan trip", answer: "Japan runs November 15-24, 2026 (10 days/9 nights) at $3,200/person ($850 deposit). Currently on WAITLIST. Explore Tokyo, Kyoto & Osaka with cherry blossom culture, ancient temples, incredible food, and neon-lit streets. Would include 9 nights hotels, JR Rail Pass, all excursions, cultural experiences, and group meals." },
  { keywords: ["bali", "indonesia"], category: "trips", question: "Tell me about the Bali trip", answer: "Our Bali trip (June 14-22, 2026) is SOLD OUT. It was 9 days/8 nights at $2,800/person featuring temples, rice terraces, beach clubs, and wellness retreats. Keep an eye out for future Bali trips!" },
  { keywords: ["morocco", "marrakech", "sahara"], category: "trips", question: "Tell me about the Morocco trip", answer: "Our Morocco trip (May 15-22, 2026) is SOLD OUT. It was 8 days/7 nights at $2,600/person featuring souks of Marrakech, Sahara Desert glamping, camel rides, cooking class, and Atlas Mountains hike. We may offer another Morocco trip in the future!" },

  // Events
  { keywords: ["events", "what events", "happening", "upcoming events"], category: "events", question: "What events do you have?", answer: "We have lots coming up! Coffee and Cuties (May 19), Wine & Paint Night (May 5), Hiking Adventure (Apr 26), AYMS Summer Camp (Jul 15-18), Water Day (Aug 12), Fall Kickoff Dinner (Sep 12), Dia de los Muertos Celebration (Nov 1), and Holiday Posada (Dec 15). Check our Events page for full details!" },
  { keywords: ["coffee", "cuties", "meetup", "monthly"], category: "events", question: "What are Coffee & Cuties events?", answer: "Coffee & Cuties are our monthly local meetups! Amigas gather for coffee, brunch, or activities in a casual, welcoming setting. It's a great way to meet other amigas in person, especially if you're new to the community. The next one is May 19th!" },
  { keywords: ["camp", "summer", "camping"], category: "events", question: "Tell me about Summer Camp", answer: "AYMS Summer Camp 2026 runs July 15-18 at Camp Wilderness, CA. It's three days of bonding, growth, and unforgettable memories — workshops, outdoor adventures, and sisterhood. Limited to 50 amigas. Camp registrations are open with early bird pricing!" },

  // Community
  { keywords: ["community", "portal", "join", "member", "membership"], category: "community", question: "How do I join the community?", answer: "Just create a free account on our website! Membership gives you access to our community portal with Discord-like chat channels, event calendar, member directory, and profiles. You don't need to go on a trip to be part of the community — all are welcome!" },
  { keywords: ["chat", "channels", "discord", "talk"], category: "community", question: "What's in the community portal?", answer: "Our community portal has 11 chat channels organized by category: General (General, Announcements, Introductions), Trips & Travel (Trip Planning, Travel Tips, Trip Photos), Events (Upcoming Events, Camp Talk), and Fun & Lifestyle (Random, Recipes, Music). Plus a full event calendar, member directory, and user profiles!" },
  { keywords: ["free", "cost", "membership fee"], category: "community", question: "Is the community free?", answer: "Yes! Community membership is completely free. Create an account to access the chat channels, event calendar, member directory, and all community features. Trips are paid separately." },

  // Greetings & misc
  { keywords: ["hello", "hi", "hey", "hola"], category: "greeting", question: "Greeting", answer: "¡Hola amiga! 👋 Welcome to Amigas Y Más Social! I'm here to help you with anything — trips, events, community questions, or just to chat. What can I help you with?" },
  { keywords: ["thank", "thanks", "gracias"], category: "greeting", question: "Thanks", answer: "¡De nada, amiga! 💕 Happy to help. If you have any other questions, I'm always here. Don't forget to check out our trips and events pages!" },
  { keywords: ["bye", "goodbye", "see you", "adios"], category: "greeting", question: "Goodbye", answer: "¡Hasta luego, amiga! 🌸 Don't be a stranger — we're always here when you need us. Hope to see you on a trip soon!" },
  { keywords: ["help", "what can you do", "options"], category: "greeting", question: "Help", answer: "I can help you with:\n\n🗺️ **Trip info** — destinations, pricing, what's included\n📅 **Events** — upcoming meetups, camp, socials\n👥 **Community** — how to join, portal features\n❓ **FAQ** — booking, cancellations, safety, dietary needs\n🏢 **About AYMS** — our mission, founder, contact info\n\nJust ask me anything!" },
];

export function findBestMatch(query: string): KnowledgeEntry | null {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return null;

  const words = q.split(/\s+/).filter((w) => w.length > 1);
  const stopWords = new Set(["the", "is", "at", "in", "on", "a", "an", "to", "for", "of", "it", "do", "can", "i", "me", "my", "you", "your", "we", "us", "and", "or", "but", "if", "so", "up", "are", "was", "be", "have", "has", "had", "this", "that", "with", "from", "about", "what", "how", "when", "where", "who", "which", "there", "their", "they", "them", "would", "could", "should"]);
  const meaningfulWords = words.filter((w) => !stopWords.has(w));

  let bestScore = 0;
  let bestEntry: KnowledgeEntry | null = null;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;

    for (const word of meaningfulWords) {
      for (const keyword of entry.keywords) {
        if (keyword === word) {
          score += 3;
        } else if (keyword.includes(word) || word.includes(keyword)) {
          score += 2;
        } else if (levenshtein(keyword, word) <= 2) {
          score += 1;
        }
      }
    }

    if (q.includes(entry.category)) score += 1;

    for (const keyword of entry.keywords) {
      if (q.includes(keyword)) score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  return bestScore >= 2 ? bestEntry : null;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[m][n];
}

export function generateResponse(query: string): string {
  const match = findBestMatch(query);
  if (match) return match.answer;
  return "¡Hmm, I'm not sure about that one! 🤔 I can help with trip info, events, community questions, booking, and more. Try asking about a specific trip destination, our events, or how to join the community. Or type **help** to see everything I can do!";
}
