// --- PERSONALITY QUIZ ---

export interface QuizQuestion {
  id: string;
  question: string;
  emoji: string;
  options: { text: string; traits: Record<string, number> }[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1", question: "It's Saturday morning. What are you doing?", emoji: "☀️",
    options: [
      { text: "Sleeping in, then brunch with mimosas", traits: { relaxation: 3, social: 2 } },
      { text: "Already at the farmers market by 8am", traits: { culture: 3, adventure: 1 } },
      { text: "Hitting the gym or going for a hike", traits: { adventure: 3, nature: 2 } },
      { text: "Binge-watching my favorite show in bed", traits: { relaxation: 2, comfort: 2 } },
    ],
  },
  {
    id: "q2", question: "Pick your ideal dinner vibe", emoji: "🍽️",
    options: [
      { text: "Street food from a tiny stall — the sketchier the better", traits: { adventure: 3, culture: 2 } },
      { text: "Fancy rooftop restaurant with a view", traits: { luxury: 3, social: 1 } },
      { text: "Cooking class where I learn the local cuisine", traits: { culture: 3, learning: 2 } },
      { text: "Beachside seafood with my toes in the sand", traits: { relaxation: 3, nature: 2 } },
    ],
  },
  {
    id: "q3", question: "You have a free afternoon abroad. You...", emoji: "🗺️",
    options: [
      { text: "Get lost wandering through local neighborhoods", traits: { adventure: 2, culture: 3 } },
      { text: "Book a spa day — self-care is non-negotiable", traits: { relaxation: 3, luxury: 2 } },
      { text: "Find the nearest hike or outdoor activity", traits: { adventure: 3, nature: 3 } },
      { text: "Shop at local markets and boutiques", traits: { culture: 2, social: 2 } },
    ],
  },
  {
    id: "q4", question: "What's your travel playlist energy?", emoji: "🎵",
    options: [
      { text: "Reggaeton and Latin beats 💃", traits: { social: 3, culture: 2 } },
      { text: "Chill lo-fi or acoustic vibes", traits: { relaxation: 3, nature: 1 } },
      { text: "Pump-up anthems for adventure mode", traits: { adventure: 3, social: 1 } },
      { text: "Whatever the locals are playing", traits: { culture: 3, learning: 2 } },
    ],
  },
  {
    id: "q5", question: "Pick a travel fear to conquer", emoji: "😱",
    options: [
      { text: "Bungee jumping or skydiving", traits: { adventure: 4, nature: 1 } },
      { text: "Eating something I can't identify", traits: { culture: 3, adventure: 2 } },
      { text: "Going somewhere I don't speak the language", traits: { culture: 2, learning: 3 } },
      { text: "Traveling completely solo", traits: { social: 1, adventure: 2, learning: 2 } },
    ],
  },
  {
    id: "q6", question: "What do you post on Instagram from a trip?", emoji: "📸",
    options: [
      { text: "Golden hour selfie at a scenic overlook", traits: { nature: 2, luxury: 2 } },
      { text: "A close-up of incredible food", traits: { culture: 3, relaxation: 1 } },
      { text: "Group photo with my new amigas", traits: { social: 4 } },
      { text: "An artsy shot of local architecture or art", traits: { culture: 3, learning: 2 } },
    ],
  },
  {
    id: "q7", question: "Your dream hotel is...", emoji: "🏨",
    options: [
      { text: "A luxurious overwater bungalow", traits: { luxury: 4, relaxation: 2 } },
      { text: "A cozy riad in a historic medina", traits: { culture: 4, adventure: 1 } },
      { text: "A treehouse in the jungle", traits: { adventure: 3, nature: 3 } },
      { text: "A chic boutique hotel in the city center", traits: { social: 2, luxury: 2 } },
    ],
  },
];

export interface Destination {
  id: string;
  name: string;
  country: string;
  emoji: string;
  description: string;
  whyYou: string;
  traits: Record<string, number>;
  tripLink?: string;
  gradient: string;
}

export const DESTINATIONS: Destination[] = [
  { id: "cancun", name: "Cancún", country: "Mexico", emoji: "🇲🇽", gradient: "from-[#00BCD4] to-[#E8458B]", traits: { relaxation: 4, social: 3, nature: 2 }, description: "Caribbean beaches, ancient ruins, and all-inclusive vibes", whyYou: "You're a social butterfly who loves the beach, good drinks, and making memories with your girls. Cancún is your playground.", tripLink: "/trips" },
  { id: "colombia", name: "Cartagena", country: "Colombia", emoji: "🇨🇴", gradient: "from-[#DAA520] to-[#E8458B]", traits: { culture: 4, social: 3, adventure: 2 }, description: "Colonial charm, salsa nights, and Caribbean coast magic", whyYou: "You crave culture, color, and connection. Dancing salsa in Cartagena's plazas is literally your dream night.", tripLink: "/trips" },
  { id: "bali", name: "Bali", country: "Indonesia", emoji: "🏝️", gradient: "from-[#2D8B6F] to-[#DAA520]", traits: { relaxation: 3, nature: 4, culture: 3, luxury: 2 }, description: "Temples, rice terraces, and spiritual wellness retreats", whyYou: "You're seeking balance — adventure AND peace. Bali will reset your soul while feeding your wanderlust." },
  { id: "morocco", name: "Marrakech", country: "Morocco", emoji: "🇲🇦", gradient: "from-[#C44B3F] to-[#DAA520]", traits: { culture: 5, adventure: 3, learning: 3 }, description: "Souks, spices, Sahara glamping, and sensory overload", whyYou: "You're fearless and culturally curious. You want to haggle in souks, ride camels at sunset, and eat with your hands." },
  { id: "japan", name: "Tokyo", country: "Japan", emoji: "🇯🇵", gradient: "from-[#E8458B] to-[#9B2C8A]", traits: { culture: 4, learning: 4, adventure: 2 }, description: "Ancient temples meet neon streets, cherry blossoms, and ramen", whyYou: "You're endlessly curious and love contrast — traditional tea ceremonies one hour, robot restaurants the next." },
  { id: "kenya", name: "Nairobi", country: "Kenya", emoji: "🦁", gradient: "from-[#DAA520] to-[#8B4513]", traits: { adventure: 5, nature: 5 }, description: "Big Five safaris, the Great Migration, and sunset on the savanna", whyYou: "You're an adrenaline-seeker with a deep respect for nature. A hot air balloon over the Masai Mara? Yes please." },
  { id: "nyc", name: "New York City", country: "USA", emoji: "🗽", gradient: "from-[#9B2C8A] to-[#E8458B]", traits: { social: 4, luxury: 3, culture: 2 }, description: "Broadway, rooftop bars, food from every corner of the globe", whyYou: "You love the energy of a city that never sleeps. Shopping, shows, and skyline views with your amigas — perfection." },
  { id: "napa", name: "Napa Valley", country: "USA", emoji: "🍷", gradient: "from-[#9B2C8A] to-[#DAA520]", traits: { relaxation: 4, luxury: 4, social: 2 }, description: "Rolling vineyards, wine tastings, and golden hour sunsets", whyYou: "You're all about the finer things — wine, conversation, and beautiful scenery. Napa is your happy place." },
];

export function matchDestination(traits: Record<string, number>): Destination {
  let best = DESTINATIONS[0];
  let bestScore = -Infinity;
  for (const dest of DESTINATIONS) {
    let score = 0;
    for (const [key, val] of Object.entries(dest.traits)) {
      score += (traits[key] || 0) * val;
    }
    if (score > bestScore) {
      bestScore = score;
      best = dest;
    }
  }
  return best;
}

// --- INTERACTIVE WORLD MAP CITIES ---

export interface MapCity {
  id: string;
  name: string;
  country: string;
  emoji: string;
  x: number; // percent position on SVG map
  y: number;
  storyId: string;
  gradient: string;
}

export const MAP_CITIES: MapCity[] = [
  { id: "cancun", name: "Cancún", country: "Mexico", emoji: "🇲🇽", x: 22, y: 48, storyId: "cancun", gradient: "from-[#00BCD4] to-[#E8458B]" },
  { id: "nyc", name: "New York", country: "USA", emoji: "🗽", x: 26, y: 38, storyId: "nyc", gradient: "from-[#9B2C8A] to-[#E8458B]" },
  { id: "cartagena", name: "Cartagena", country: "Colombia", emoji: "🇨🇴", x: 24, y: 55, storyId: "cartagena", gradient: "from-[#DAA520] to-[#E8458B]" },
  { id: "marrakech", name: "Marrakech", country: "Morocco", emoji: "🇲🇦", x: 46, y: 40, storyId: "marrakech", gradient: "from-[#C44B3F] to-[#DAA520]" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", emoji: "🦁", x: 56, y: 58, storyId: "nairobi", gradient: "from-[#DAA520] to-[#8B4513]" },
  { id: "tokyo", name: "Tokyo", country: "Japan", emoji: "🇯🇵", x: 82, y: 38, storyId: "tokyo", gradient: "from-[#E8458B] to-[#9B2C8A]" },
  { id: "bali", name: "Bali", country: "Indonesia", emoji: "🏝️", x: 78, y: 62, storyId: "bali", gradient: "from-[#2D8B6F] to-[#DAA520]" },
  { id: "paris", name: "Paris", country: "France", emoji: "🇫🇷", x: 48, y: 34, storyId: "paris", gradient: "from-[#E8458B] to-[#FF6BA8]" },
];

// --- CHOOSE YOUR ADVENTURE STORIES ---

export interface StoryNode {
  id: string;
  text: string;
  emoji: string;
  choices?: { text: string; nextId: string }[];
  ending?: { title: string; description: string; emoji: string };
}

export interface Story {
  id: string;
  city: string;
  intro: string;
  nodes: Record<string, StoryNode>;
}

export const STORIES: Record<string, Story> = {
  cancun: {
    id: "cancun", city: "Cancún", intro: "You just landed in Cancún! The warm Caribbean air hits you as you step off the plane. Your amigas are already at the resort...",
    nodes: {
      start: { id: "start", text: "You arrive at the all-inclusive resort. The pool is sparkling, the beach is calling, and your amigas are waving from the swim-up bar. What do you do?", emoji: "🏖️", choices: [{ text: "Dive straight into the pool party 🎉", nextId: "pool" }, { text: "Drop your bags and hit the beach 🌊", nextId: "beach" }, { text: "Grab a drink and explore the resort 🍹", nextId: "explore" }] },
      pool: { id: "pool", text: "The DJ is playing reggaeton and your amigas already ordered you a margarita! Someone suggests a group water volleyball game.", emoji: "🏊‍♀️", choices: [{ text: "Join the volleyball game 🏐", nextId: "volleyball" }, { text: "Relax on a pool float and people-watch 😎", nextId: "float" }] },
      beach: { id: "beach", text: "The turquoise water is unreal. You find a perfect spot where the sand is powder-soft. A local vendor walks by selling fresh coconuts.", emoji: "🥥", choices: [{ text: "Buy a coconut and wade into the water 🌴", nextId: "swim" }, { text: "Set up for a beach photo shoot 📸", nextId: "photos" }] },
      explore: { id: "explore", text: "You discover the resort has a hidden cenote-style pool, a tequila tasting room, and a rooftop sunset bar. A sign says 'Salsa Lessons at 4pm'.", emoji: "🗺️", choices: [{ text: "Tequila tasting — yes please 🥃", nextId: "tequila" }, { text: "Sign up for salsa lessons 💃", nextId: "salsa" }] },
      volleyball: { id: "volleyball", text: "Your team wins! The losing team has to buy the next round of drinks. You're already becoming best friends with everyone.", emoji: "🏐", choices: [{ text: "Celebrate with a group photo 📸", nextId: "victory" }] },
      float: { id: "float", text: "You drift peacefully on the float, cocktail in hand, sun warming your face. This is literally the life. An amiga swims over with gossip.", emoji: "🍹", ending: { title: "The Chill Queen", emoji: "👑", description: "You mastered the art of relaxation. Your amigas are jealous of your tan and your vibes. Cancún was made for you!" } },
      swim: { id: "swim", text: "The water is warm and crystal clear. You can see fish swimming around your feet! An amiga suggests snorkeling at a nearby reef.", emoji: "🐠", choices: [{ text: "Go snorkeling! 🤿", nextId: "snorkel" }] },
      photos: { id: "photos", text: "You and your amigas take the most incredible beach photos. Golden hour, turquoise water, matching swimsuits — Instagram is about to go crazy.", emoji: "📸", ending: { title: "The Content Creator", emoji: "📱", description: "Your Cancún content went viral! 500 new followers and 10 DMs asking 'where is this?!' Your amigas are your best photo crew." } },
      tequila: { id: "tequila", text: "You learn the difference between blanco, reposado, and añejo. The bartender teaches you the proper way to sip (not shoot!) good tequila.", emoji: "🥃", ending: { title: "The Tequila Connoisseur", emoji: "🥃", description: "You came to Cancún a tourist, you're leaving a tequila expert. Your amigas will never let you order a bad margarita again." } },
      salsa: { id: "salsa", text: "The instructor is amazing and patient. By the end, you and your amigas are spinning and laughing. A local DJ plays 'Vivir Mi Vida'.", emoji: "💃", ending: { title: "The Salsa Star", emoji: "💃", description: "Who knew you had those moves?! You danced the night away and made memories that'll last forever. Cancún brought out your inner Latina diva!" } },
      victory: { id: "victory", text: "The group photo is absolutely iconic. Everyone's laughing, drinks in hand, sun-kissed and happy. This is what AYMS is all about.", emoji: "🏆", ending: { title: "The Team MVP", emoji: "🏆", description: "You came to Cancún for a vacation and found your second family. Between the volleyball wins and the sunset dinners, this was the trip of a lifetime." } },
      snorkel: { id: "snorkel", text: "The reef is magical — colorful fish, sea turtles, and the most incredible underwater world. You and your amiga take underwater selfies!", emoji: "🤿", ending: { title: "The Ocean Explorer", emoji: "🌊", description: "Cancún showed you a whole world under the waves. You're already planning your next underwater adventure with the amigas!" } },
    },
  },
  marrakech: {
    id: "marrakech", city: "Marrakech", intro: "The sounds of the medina fill your ears — call to prayer, vendors calling, mopeds honking. The air smells of spices and orange blossoms...",
    nodes: {
      start: { id: "start", text: "You step into the bustling Jemaa el-Fnâa square. Snake charmers, henna artists, and food stalls surround you. Your amigas look at you — where to first?", emoji: "🕌", choices: [{ text: "Dive into the souks for shopping 🛍️", nextId: "souks" }, { text: "Get henna tattoos as a group 🤲", nextId: "henna" }, { text: "Find the best rooftop terrace for mint tea 🍵", nextId: "rooftop" }] },
      souks: { id: "souks", text: "The souks are a maze of color! Leather bags, ceramics, lanterns, spices. A vendor offers you a 'special price, my friend!' Do you...", emoji: "🛍️", choices: [{ text: "Haggle like your abuela taught you 😏", nextId: "haggle" }, { text: "Keep exploring deeper into the maze 🗺️", nextId: "deep" }] },
      henna: { id: "henna", text: "An artist creates the most beautiful floral designs on your hands. Your amigas get matching patterns. It feels like a bonding ritual.", emoji: "🤲", ending: { title: "The Culture Collector", emoji: "🌺", description: "You embraced Moroccan traditions with open arms. The henna will fade but the memories with your amigas never will." } },
      rooftop: { id: "rooftop", text: "You find a hidden gem — a riad rooftop with views of the Atlas Mountains. The mint tea is sweet and the sunset is painting the sky pink.", emoji: "🍵", choices: [{ text: "Stay for sunset photos and dinner 🌅", nextId: "sunset" }, { text: "Head to the night market for street food 🥘", nextId: "food" }] },
      haggle: { id: "haggle", text: "You go back and forth with the vendor, both of you smiling. You get an incredible leather bag for half the starting price. Your amigas cheer!", emoji: "💰", ending: { title: "The Haggle Queen", emoji: "👑", description: "Your abuela would be SO proud. You navigated the Marrakech souks like a pro and scored amazing deals for the whole group!" } },
      deep: { id: "deep", text: "Deep in the medina, you discover a tiny workshop where a man hand-carves wooden boxes. He invites you in for tea and shows you his craft.", emoji: "🎨", ending: { title: "The Hidden Gem Finder", emoji: "💎", description: "While everyone else was haggling, you found the soul of Marrakech. Authentic connections in unexpected places — that's your superpower." } },
      sunset: { id: "sunset", text: "The sunset over Marrakech is otherworldly. Pink, orange, purple — and the call to prayer echoes across the rooftops. Everyone is speechless.", emoji: "🌅", ending: { title: "The Sunset Chaser", emoji: "🌅", description: "Marrakech gave you the most beautiful sunset of your life, shared with your amigas on a magical rooftop. Pure poetry." } },
      food: { id: "food", text: "The night market is alive with sizzling tagines, fresh bread, and grilled kebabs. You try everything — each bite is an explosion of flavor.", emoji: "🥘", ending: { title: "The Fearless Foodie", emoji: "🍽️", description: "You ate your way through Marrakech without hesitation. From tagine to pastilla, you proved that food is the best way to experience a culture!" } },
    },
  },
  tokyo: {
    id: "tokyo", city: "Tokyo", intro: "Neon lights everywhere. The Shibuya crossing buzzes with thousands of people. Your amigas are wide-eyed...",
    nodes: {
      start: { id: "start", text: "You're standing in the middle of Shibuya. The world's busiest crossing just did its thing. There's a ramen shop, a karaoke bar, and a temple nearby.", emoji: "🏙️", choices: [{ text: "Hit the ramen shop — you're starving 🍜", nextId: "ramen" }, { text: "Karaoke with the amigas! 🎤", nextId: "karaoke" }, { text: "Find peace at the nearby Meiji Shrine ⛩️", nextId: "shrine" }] },
      ramen: { id: "ramen", text: "You order from a vending machine ticket system (so cool!). The ramen arrives — rich tonkotsu broth, perfect noodles, a soft-boiled egg. Life-changing.", emoji: "🍜", choices: [{ text: "Hunt for more street food in Harajuku 🍡", nextId: "harajuku" }, { text: "Visit a themed café (cat café? robot café?) 🤖", nextId: "cafe" }] },
      karaoke: { id: "karaoke", text: "Your private room has a disco ball and tambourines. Someone queues up 'Livin' La Vida Loca' and the whole group loses it. Pure joy.", emoji: "🎤", ending: { title: "The Karaoke Legend", emoji: "🎤", description: "Your rendition of Ricky Martin in a Tokyo karaoke box is the stuff of AYMS legend. Your amigas are still talking about it!" } },
      shrine: { id: "shrine", text: "The chaos of Shibuya melts away as you enter the forested path to Meiji Shrine. It's peaceful, ancient, and beautiful. You write a wish on an ema board.", emoji: "⛩️", choices: [{ text: "Write a wish for more adventures with your amigas 💫", nextId: "wish" }] },
      harajuku: { id: "harajuku", text: "Takeshita Street is a candy-colored fever dream. Crepes, mochi, cotton candy the size of your head. You try a matcha soft-serve — incredible.", emoji: "🍡", ending: { title: "The Sweet Tooth Explorer", emoji: "🍬", description: "Harajuku was your wonderland. You tried every sweet treat Tokyo had to offer and your amigas crowned you the dessert queen!" } },
      cafe: { id: "cafe", text: "You pick the robot café. Giant robots dance to electronic music while you eat a bento box. It's the most unhinged thing you've ever seen. You love it.", emoji: "🤖", ending: { title: "The Chaos Embracer", emoji: "🤖", description: "Tokyo's weirdness is your happy place. Robot cafés, capsule hotels, vending machines that sell everything — you thrived in the beautiful chaos!" } },
      wish: { id: "wish", text: "You write your wish, hang it on the board, and feel a wave of gratitude. Your amigas gather for a quiet group moment under the ancient trees.", emoji: "💫", ending: { title: "The Mindful Traveler", emoji: "🙏", description: "In the heart of one of the world's busiest cities, you found stillness. Tokyo taught you that peace and chaos can coexist — and so can you." } },
    },
  },
  nairobi: {
    id: "nairobi", city: "Nairobi", intro: "The African sun is warm on your face. The red earth stretches to the horizon. Your safari jeep awaits...",
    nodes: {
      start: { id: "start", text: "Your guide points to the horizon — the Masai Mara stretches endlessly before you. 'What would you like to see first?' she asks.", emoji: "🦁", choices: [{ text: "The Big Five — let's find lions! 🦁", nextId: "lions" }, { text: "I want the sunrise hot air balloon ride 🎈", nextId: "balloon" }, { text: "Take me to a Masai village first 🏘️", nextId: "village" }] },
      lions: { id: "lions", text: "After 20 minutes of driving, your guide spots a pride of lions resting under an acacia tree. A lioness lifts her head and looks directly at you. Chills.", emoji: "🦁", choices: [{ text: "Stay and watch the lions until sunset 🌅", nextId: "lion_sunset" }, { text: "Keep driving — I want to find elephants too! 🐘", nextId: "elephants" }] },
      balloon: { id: "balloon", text: "You rise above the savanna at dawn. Below you, herds of wildebeest move like rivers across the golden grass. The silence up here is profound.", emoji: "🎈", ending: { title: "The Sky Dreamer", emoji: "🎈", description: "Floating over the Masai Mara at sunrise was the most breathtaking moment of your life. Africa has your heart forever." } },
      village: { id: "village", text: "The Masai warriors welcome you with a jumping dance. They show you their homes, their beadwork, and teach you traditional songs. You're deeply moved.", emoji: "🏘️", ending: { title: "The Cultural Bridge", emoji: "🤝", description: "You came to Kenya for animals but found humanity. The Masai people's warmth and wisdom changed your perspective on the world." } },
      lion_sunset: { id: "lion_sunset", text: "The sun sets behind the acacia trees as the lions begin to stir. The golden light makes everything look like a painting. Your amiga is crying happy tears.", emoji: "🌅", ending: { title: "The Patient Observer", emoji: "🦁", description: "You waited, you watched, and Africa rewarded you with the most magical sunset imaginable. Some things are worth waiting for." } },
      elephants: { id: "elephants", text: "A family of elephants crosses right in front of your jeep. A baby elephant plays in a mud puddle while its mother watches. Everyone is speechless.", emoji: "🐘", ending: { title: "The Wildlife Whisperer", emoji: "🐘", description: "Three of the Big Five in one day! Your safari was legendary. You're already planning your return to Africa with AYMS!" } },
    },
  },
  cartagena: {
    id: "cartagena", city: "Cartagena", intro: "Colors everywhere — bright yellow, blue, and pink colonial buildings line the cobblestone streets. Music drifts from every corner...",
    nodes: {
      start: { id: "start", text: "You're walking through the walled Old City. Bougainvillea drapes over balconies, street musicians play cumbia, and the smell of arepas fills the air.", emoji: "🏛️", choices: [{ text: "Find a salsa club and dance 💃", nextId: "salsa" }, { text: "Explore street art in Getsemaní 🎨", nextId: "art" }, { text: "Head to the Rosario Islands by boat ⛵", nextId: "islands" }] },
      salsa: { id: "salsa", text: "The locals welcome you to the dance floor! A man spins you expertly. Your amigas form a circle and everyone takes turns. The energy is electric.", emoji: "💃", ending: { title: "La Salsera", emoji: "💃", description: "You came to Cartagena and left as a salsa queen! The rhythm of Colombia runs through your veins now. ¡Que viva la salsa!" } },
      art: { id: "art", text: "Getsemaní is covered in incredible murals — stories of resilience, identity, and joy. A local artist offers to teach you spray paint basics.", emoji: "🎨", choices: [{ text: "Create your own mini mural 🖌️", nextId: "mural" }, { text: "Buy original art from the gallery 🖼️", nextId: "gallery" }] },
      islands: { id: "islands", text: "The boat ride to the Rosario Islands is gorgeous. Crystal-clear water, tiny islands, and zero cell service. Paradise found.", emoji: "⛵", ending: { title: "The Island Escapist", emoji: "🏝️", description: "You disconnected from the world and reconnected with yourself and your amigas. Cartagena's islands are your forever happy place." } },
      mural: { id: "mural", text: "You spray-paint a small sun with 'AYMS' underneath on a practice wall. The artist takes a photo and says 'You have the spirit of Cartagena!'", emoji: "🖌️", ending: { title: "The Street Artist", emoji: "🎨", description: "You left your mark on Cartagena — literally! Your mini mural is a symbol of the creative, fearless amiga you are." } },
      gallery: { id: "gallery", text: "You find a stunning piece by a local Afro-Colombian artist. It reminds you of your own heritage. You buy it without hesitation.", emoji: "🖼️", ending: { title: "The Art Collector", emoji: "🖼️", description: "You brought a piece of Cartagena home. Every time you look at that painting, you'll remember the colors, the music, and the amigas." } },
    },
  },
  bali: {
    id: "bali", city: "Bali", intro: "The scent of incense and frangipani fills the air. Your villa overlooks emerald rice terraces that seem to go on forever...",
    nodes: {
      start: { id: "start", text: "Morning in Ubud. Your amiga suggests three options for the day. The rice terraces glow gold in the morning light.", emoji: "🌿", choices: [{ text: "Yoga and meditation at the temple 🧘‍♀️", nextId: "yoga" }, { text: "Chase waterfalls in the jungle 🌊", nextId: "waterfall" }, { text: "Beach club day in Seminyak 🍹", nextId: "beach" }] },
      yoga: { id: "yoga", text: "The outdoor yoga pavilion overlooks a river valley. You flow through sun salutations as monkeys play in the trees above. Inner peace: achieved.", emoji: "🧘‍♀️", ending: { title: "The Zen Master", emoji: "🧘‍♀️", description: "Bali reset your mind, body, and soul. You found stillness in paradise and a deeper connection with your amigas through shared mindfulness." } },
      waterfall: { id: "waterfall", text: "After a jungle trek, you hear the roar. The waterfall is massive — a curtain of water crashing into an emerald pool. You jump in without hesitation!", emoji: "💦", ending: { title: "The Waterfall Warrior", emoji: "💦", description: "You trekked through the jungle, jumped into a sacred waterfall, and screamed with joy! Bali's wild side matched your adventurous spirit." } },
      beach: { id: "beach", text: "The beach club has infinity pools, DJ sets, and the most Instagrammable sunset you've ever seen. Cocktails arrive with flowers. This is luxury.", emoji: "🍹", ending: { title: "The Beach Club Queen", emoji: "👑", description: "Seminyak's finest beach club, sunset cocktails, and your best amigas. You lived your most glamorous life in Bali!" } },
    },
  },
  nyc: {
    id: "nyc", city: "New York City", intro: "Yellow cabs, towering skyscrapers, and the smell of New York pizza. The energy hits you immediately...",
    nodes: {
      start: { id: "start", text: "Times Square is glowing. Your hotel is in Midtown and you have ONE evening to make count. Your amigas are ready.", emoji: "🌃", choices: [{ text: "Broadway show — we got Hamilton tickets! 🎭", nextId: "broadway" }, { text: "Rooftop bar with skyline views 🍸", nextId: "rooftop" }, { text: "Late-night food tour through Queens 🍕", nextId: "food" }] },
      broadway: { id: "broadway", text: "The lights dim, the orchestra swells, and the show begins. You and your amigas are completely captivated. Standing ovation at the end — tears flowing.", emoji: "🎭", ending: { title: "The Broadway Star", emoji: "🎭", description: "Hamilton on Broadway with your amigas — a bucket list moment checked off in the most magical way. NYC dreams come true!" } },
      rooftop: { id: "rooftop", text: "The Manhattan skyline sparkles like a million diamonds. The Empire State Building glows pink. Your amiga raises a cocktail — 'To us!'", emoji: "🍸", ending: { title: "The Skyline Queen", emoji: "✨", description: "NYC from above was everything you imagined and more. That rooftop toast with your amigas is a core memory forever." } },
      food: { id: "food", text: "Queens is the real culinary heart of NYC. You eat dumplings, empanadas, Korean BBQ, and finish with cheesecake. Your guide is a local legend.", emoji: "🍕", ending: { title: "The Food Tour Champion", emoji: "🍕", description: "You ate your way through the real New York — the diverse, delicious, no-pretense side that tourists miss. Your amigas are food coma happy!" } },
    },
  },
  paris: {
    id: "paris", city: "Paris", intro: "The Eiffel Tower sparkles in the distance. The air smells of fresh croissants and café au lait...",
    nodes: {
      start: { id: "start", text: "You're on a cobblestone street in Le Marais. A patisserie, a vintage shop, and the entrance to a secret garden are all within view.", emoji: "🗼", choices: [{ text: "Start with croissants and people-watching ☕", nextId: "cafe" }, { text: "Explore the secret garden 🌿", nextId: "garden" }, { text: "Vintage shopping spree! 👗", nextId: "vintage" }] },
      cafe: { id: "cafe", text: "You find a sidewalk table at a tiny café. The croissant is flaky perfection. A street musician plays accordion nearby. You never want to leave.", emoji: "☕", ending: { title: "The Parisian at Heart", emoji: "🥐", description: "You didn't try to see all of Paris — you lived it. One perfect croissant, one perfect café, one perfect moment with your amigas." } },
      garden: { id: "garden", text: "Behind an unmarked door, you discover a hidden courtyard garden full of roses and a tiny fountain. It's like a fairy tale. Your amigas gasp.", emoji: "🌹", ending: { title: "The Secret Keeper", emoji: "🌹", description: "You found the Paris that guidebooks miss. A hidden garden, a quiet moment, and the magic of discovering beauty in unexpected places." } },
      vintage: { id: "vintage", text: "Racks of Chanel, Dior, and YSL vintage pieces. You find a stunning silk scarf for €20. Your amigas are finding treasures everywhere!", emoji: "👗", ending: { title: "The Vintage Vixen", emoji: "👗", description: "You scored vintage Parisian fashion that would make anyone jealous. Your style + Paris = a match made in fashion heaven!" } },
    },
  },
};
