/**
 * Predefined interest categories for user profiles.
 *
 * Stored as a normalized string[] in Firestore so they're clean
 * for future vectorization / algorithmic friend suggestions.
 */
export const INTEREST_CATEGORIES = [
  "Travel",
  "Cooking",
  "Hiking",
  "Fitness",
  "Music",
  "Art",
  "Photography",
  "Dancing",
  "Reading",
  "Wine & Spirits",
  "Beach",
  "Camping",
  "Yoga",
  "Fashion",
  "Nightlife",
  "Volunteering",
  "Entrepreneurship",
  "Parenting",
  "Spirituality",
  "Sports",
  "Gaming",
  "Pets",
  "Wellness",
  "Culture",
] as const;

export const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "Portuguese",
  "French",
  "Italian",
  "German",
  "Mandarin",
  "Japanese",
  "Korean",
  "Arabic",
  "Hindi",
  "Tagalog",
  "Vietnamese",
  "Russian",
  "Polish",
  "Dutch",
  "Haitian Creole",
  "ASL",
] as const;
