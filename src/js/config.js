export const PICKR_CONFIG = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
  appUrl: import.meta.env.VITE_APP_URL ?? window.location.origin,
  lobbyLifetimeHours: 24,
};

export const LIMITS = {
  code: 6,
  nickname: 20,
  option: 60,
  title: 80,
  maxParticipants: 15,
  maxIdeasPerParticipant: 6,
  maxOptions: 30,
  maxRounds: 20,
};

export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const STORAGE_KEYS = {
  settings: "pickr:settings",
  history: "pickr:history",
  activeParticipantPrefix: "pickr:participant:",
  lobbyPrefix: "pickr:lobby:",
  closedPrefix: "pickr:closed:",
};

export const CATEGORIES = [
  "Food",
  "Movies",
  "Activities",
  "Travel",
  "Games",
  "Party",
  "Shopping",
  "Who Pays",
  "Custom",
];

export const MODES = [
  {
    id: "swipe",
    label: "Swipe",
    icon: "heart",
    needsOptions: true,
  },
  {
    id: "blind",
    label: "Blind Vote",
    icon: "eye-off",
    needsOptions: true,
  },
  {
    id: "wheel",
    label: "Random Wheel",
    icon: "disc-3",
    needsOptions: true,
  },
  {
    id: "battle",
    label: "Battle",
    icon: "swords",
    needsOptions: true,
  },
  {
    id: "whoPays",
    label: "Who Pays",
    icon: "wallet-cards",
    needsOptions: false,
  },
];

export const DEFAULT_OPTIONS_BY_CATEGORY = {
  Food: ["Pizza", "Sushi", "Burger", "Pasta", "Mexican"],
  Movies: ["Interstellar", "Dune", "The Batman", "La La Land", "Spider-Verse"],
  Activities: ["Bowling", "Karaoke", "Escape Room", "Mini Golf", "Board Games"],
  Travel: ["Lisbon", "Barcelona", "Amsterdam", "Prague", "Copenhagen"],
  Games: ["Mario Kart", "Codenames", "FIFA", "Among Us", "Cards"],
  Party: ["Cocktails", "Club", "House Party", "Karaoke", "Late Dinner"],
  Shopping: ["Sneakers", "Plants", "Kitchen Stuff", "Books", "Tech"],
  "Who Pays": [],
  Custom: ["Option A", "Option B", "Option C"],
};

export const WHO_PAYS_VARIANTS = [
  "Pays Everything",
  "Pays Drinks",
  "Pays Dessert",
  "Lucky One Pays Nothing",
];

export const COPY_LINES = [
  "Democracy has spoken.",
  "The group has spoken.",
  "Decision made.",
  "Nobody could decide. Pickr did.",
  "You can blame Pickr.",
  "No take-backs.",
  "That was surprisingly unanimous.",
  "Bad luck.",
  "Tonight you're paying.",
  "Pickr has decided.",
];
