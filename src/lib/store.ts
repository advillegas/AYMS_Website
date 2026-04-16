import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  location: string;
  joinedDate: string;
  role: "amiga" | "leader" | "admin";
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "general" | "trips" | "events" | "fun";
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  endDate?: string;
  type: "trip" | "meetup" | "camp" | "social";
  location: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  register: (name: string, email: string, password: string) => boolean;
  logout: () => void;
}

interface ChatState {
  messages: Message[];
  channels: Channel[];
  activeChannel: string;
  setActiveChannel: (id: string) => void;
  sendMessage: (content: string) => void;
}

interface EventState {
  events: CalendarEvent[];
}

interface CommunityState {
  members: User[];
  onlineMembers: string[];
}

const MOCK_USERS: User[] = [
  {
    id: "1",
    name: "Maria Garcia",
    email: "maria@ayms.com",
    avatar: "",
    bio: "Five-year vet who loves long walks watching elephant seals",
    location: "Los Angeles, CA",
    joinedDate: "2021-03-15",
    role: "leader",
  },
  {
    id: "2",
    name: "Sofia Rodriguez",
    email: "sofia@ayms.com",
    avatar: "",
    bio: "Travel enthusiast and foodie. Always planning the next adventure!",
    location: "Miami, FL",
    joinedDate: "2022-06-20",
    role: "amiga",
  },
  {
    id: "3",
    name: "Isabella Martinez",
    email: "isabella@ayms.com",
    avatar: "",
    bio: "Camp counselor and community organizer",
    location: "Austin, TX",
    joinedDate: "2022-01-10",
    role: "leader",
  },
  {
    id: "4",
    name: "Valentina Lopez",
    email: "valentina@ayms.com",
    avatar: "",
    bio: "New to the group but already feel like family!",
    location: "New York, NY",
    joinedDate: "2024-09-01",
    role: "amiga",
  },
  {
    id: "5",
    name: "Camila Torres",
    email: "camila@ayms.com",
    avatar: "",
    bio: "Photographer and storyteller. Capturing our memories together.",
    location: "Chicago, IL",
    joinedDate: "2023-04-12",
    role: "amiga",
  },
];

const MOCK_CHANNELS: Channel[] = [
  { id: "general", name: "General", description: "Welcome! Say hi and introduce yourself", icon: "💬", category: "general" },
  { id: "announcements", name: "Announcements", description: "Important updates from the AYMS team", icon: "📢", category: "general" },
  { id: "introductions", name: "Introductions", description: "New here? Tell us about yourself!", icon: "👋", category: "general" },
  { id: "trip-planning", name: "Trip Planning", description: "Plan and discuss upcoming trips", icon: "✈️", category: "trips" },
  { id: "travel-tips", name: "Travel Tips", description: "Share your best travel advice", icon: "🗺️", category: "trips" },
  { id: "trip-photos", name: "Trip Photos", description: "Share your favorite travel photos", icon: "📸", category: "trips" },
  { id: "upcoming-events", name: "Upcoming Events", description: "What's happening next?", icon: "📅", category: "events" },
  { id: "camp-talk", name: "Camp Talk", description: "Everything about AYMS Summer Camp", icon: "🏕️", category: "events" },
  { id: "random", name: "Random", description: "Off-topic chat and fun stuff", icon: "🎉", category: "fun" },
  { id: "recipes", name: "Recipes", description: "Share your favorite recipes", icon: "🍳", category: "fun" },
  { id: "music", name: "Music", description: "What are you listening to?", icon: "🎵", category: "fun" },
];

const MOCK_MESSAGES: Message[] = [
  { id: "m1", channelId: "general", userId: "1", userName: "Maria Garcia", userAvatar: "", content: "Welcome to Amigas Y Más! So happy to have everyone here 💕", timestamp: "2026-04-15T09:00:00Z" },
  { id: "m2", channelId: "general", userId: "2", userName: "Sofia Rodriguez", userAvatar: "", content: "Hey everyone! Can't wait for the next trip!", timestamp: "2026-04-15T09:15:00Z" },
  { id: "m3", channelId: "general", userId: "3", userName: "Isabella Martinez", userAvatar: "", content: "Who's coming to the summer camp this year? 🏕️", timestamp: "2026-04-15T09:30:00Z" },
  { id: "m4", channelId: "general", userId: "4", userName: "Valentina Lopez", userAvatar: "", content: "I just joined and I already love this community!", timestamp: "2026-04-15T10:00:00Z" },
  { id: "m5", channelId: "trip-planning", userId: "1", userName: "Maria Garcia", userAvatar: "", content: "Thinking about a Cancún trip in August. Who's interested?", timestamp: "2026-04-14T14:00:00Z" },
  { id: "m6", channelId: "trip-planning", userId: "5", userName: "Camila Torres", userAvatar: "", content: "Count me in! I'll bring my camera 📸", timestamp: "2026-04-14T14:30:00Z" },
  { id: "m7", channelId: "announcements", userId: "1", userName: "Maria Garcia", userAvatar: "", content: "Coffee and Cuties event is coming up on May 19th! Don't miss it ☕", timestamp: "2026-04-13T08:00:00Z" },
  { id: "m8", channelId: "camp-talk", userId: "3", userName: "Isabella Martinez", userAvatar: "", content: "Camp registrations are now open! Early bird pricing ends May 1st.", timestamp: "2026-04-12T10:00:00Z" },
  { id: "m9", channelId: "recipes", userId: "2", userName: "Sofia Rodriguez", userAvatar: "", content: "Just made the best tamales ever. Recipe coming soon! 🫔", timestamp: "2026-04-11T18:00:00Z" },
  { id: "m10", channelId: "random", userId: "4", userName: "Valentina Lopez", userAvatar: "", content: "Anyone watching the new season of that show? No spoilers please! 😂", timestamp: "2026-04-15T11:00:00Z" },
];

const MOCK_EVENTS: CalendarEvent[] = [
  { id: "e1", title: "Coffee and Cuties", description: "Monthly meetup for coffee and connection. Bring your little ones!", date: "2026-05-19", type: "social", location: "Local Café, LA" },
  { id: "e2", title: "AYMS Summer Camp 2026", description: "Our annual summer camp! Three days of fun, bonding, and empowerment.", date: "2026-07-15", endDate: "2026-07-18", type: "camp", location: "Camp Wilderness, CA" },
  { id: "e3", title: "Water Day", description: "Beat the heat with our summer water day celebration!", date: "2026-08-12", type: "social", location: "Riverside Park, LA" },
  { id: "e4", title: "Cancún Trip", description: "Group trip to Cancún! All-inclusive resort adventure.", date: "2026-08-20", endDate: "2026-08-25", type: "trip", location: "Cancún, Mexico" },
  { id: "e5", title: "Fall Kickoff Dinner", description: "Kick off the fall season with a community dinner.", date: "2026-09-12", type: "meetup", location: "Amiga's Kitchen, LA" },
  { id: "e6", title: "Dia de los Muertos Celebration", description: "Honor our loved ones with a beautiful celebration.", date: "2026-11-01", type: "social", location: "Community Center, LA" },
  { id: "e7", title: "Holiday Posada", description: "Annual holiday party with music, food, and gift exchange.", date: "2026-12-15", type: "social", location: "Maria's Home, LA" },
  { id: "e8", title: "Wine & Paint Night", description: "Unleash your inner artist! Supplies included.", date: "2026-05-05", type: "meetup", location: "Art Studio, Santa Monica" },
  { id: "e9", title: "Hiking Adventure", description: "Morning hike followed by brunch. All fitness levels welcome!", date: "2026-04-26", type: "meetup", location: "Griffith Observatory, LA" },
];

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  login: (email: string, _password: string) => {
    const found = MOCK_USERS.find((u) => u.email === email);
    if (found) {
      set({ user: found, isAuthenticated: true });
      return true;
    }
    const newUser: User = {
      id: Date.now().toString(),
      name: email.split("@")[0],
      email,
      avatar: "",
      bio: "New amiga!",
      location: "",
      joinedDate: new Date().toISOString().split("T")[0],
      role: "amiga",
    };
    set({ user: newUser, isAuthenticated: true });
    return true;
  },
  register: (name: string, email: string, _password: string) => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      avatar: "",
      bio: "New amiga!",
      location: "",
      joinedDate: new Date().toISOString().split("T")[0],
      role: "amiga",
    };
    set({ user: newUser, isAuthenticated: true });
    return true;
  },
  logout: () => set({ user: null, isAuthenticated: false }),
}));

export const useChat = create<ChatState>((set, get) => ({
  messages: MOCK_MESSAGES,
  channels: MOCK_CHANNELS,
  activeChannel: "general",
  setActiveChannel: (id: string) => set({ activeChannel: id }),
  sendMessage: (content: string) => {
    const { user } = useAuth.getState();
    if (!user) return;
    const msg: Message = {
      id: `m${Date.now()}`,
      channelId: get().activeChannel,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      content,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, msg] }));
  },
}));

export const useEvents = create<EventState>(() => ({
  events: MOCK_EVENTS,
}));

export const useCommunity = create<CommunityState>(() => ({
  members: MOCK_USERS,
  onlineMembers: ["1", "2", "4"],
}));
