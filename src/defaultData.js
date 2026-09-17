/**
 * Default seed data. Kept in one place so App and any reset flow
 * pull from a single source of truth (DRY).
 *
 * `icon` values map to lucide-react icon names in components/iconMap.js
 * so we don't leak component references into plain data.
 */

export const DEFAULT_CATEGORIES = [
  { id: 'cat-home',          name: 'Home',          icon: 'Home',      color: 'pink'   },
  { id: 'cat-work',          name: 'Work',          icon: 'Briefcase', color: 'sky'    },
  // ❤️  HEART LOGIC — PROTECTED  ❤️
  // The "Personal" default category uses the Heart icon. Do NOT change
  // the icon (or remove this category) without explicit owner approval.
  // See PROTECTED.md at the project root for the rules of engagement.
  { id: 'cat-personal',      name: 'Personal',      icon: 'Heart',     color: 'rose'   },
  // ❤️  END HEART LOGIC  ❤️
  { id: 'cat-learning',      name: 'Learning',      icon: 'GraduationCap', color: 'mint'   },
  { id: 'cat-entertainment', name: 'Entertainment', icon: 'Music',     color: 'peach'  },
  { id: 'cat-tools',         name: 'Tools',         icon: 'Wrench',    color: 'lilac'  },
];

export const AVAILABLE_ICONS = [
  // Life
  // ❤️  HEART LOGIC — 'Heart' must stay in this list, do not remove.  ❤️
  'Home', 'Heart', 'Sun', 'Moon', 'Star', 'Sparkles',
  // Work / productivity
  'Briefcase', 'Building2', 'Calendar', 'ClipboardList', 'Mail', 'Phone',
  // Learning / creative
  'GraduationCap', 'Book', 'BookOpen', 'Pencil', 'Palette', 'Lightbulb',
  // Tech / dev
  'Code', 'Terminal', 'Cpu', 'Database', 'Cloud', 'GitBranch',
  // Media / fun
  'Music', 'Film', 'Camera', 'Gamepad2', 'Tv', 'Headphones',
  // Shopping / lifestyle
  'ShoppingBag', 'ShoppingCart', 'Gift', 'CreditCard', 'Wallet', 'Tag',
  // Travel / food
  'Plane', 'Car', 'MapPin', 'Compass', 'Coffee', 'Utensils',
  // Health / hobbies
  'Dumbbell', 'Bike', 'PawPrint', 'Leaf', 'Flower', 'Flame',
  // Tools / generic
  'Wrench', 'Rocket', 'Globe', 'Bookmark',
];

export const AVAILABLE_COLORS = [
  'pink', 'lilac', 'sky', 'mint', 'peach', 'lemon', 'rose',
];

/* One sample bookmark per default category so a fresh install never
   shows an empty column. Order is oldest → newest so App's initial
   sort places them predictably. */
export const SAMPLE_BOOKMARKS = [
  {
    id: 'bm-sample-home',
    url: 'https://pearlfox.io',
    title: 'PearlFox',
    favicon: 'https://www.google.com/s2/favicons?domain=pearlfox.io&sz=64',
    categoryId: 'cat-home',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
  },
  {
    id: 'bm-sample-work',
    url: 'https://github.com',
    title: 'GitHub',
    favicon: 'https://www.google.com/s2/favicons?domain=github.com&sz=64',
    categoryId: 'cat-work',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  },
  {
    id: 'bm-sample-personal',
    url: 'https://mail.google.com',
    title: 'Gmail',
    favicon: 'https://www.google.com/s2/favicons?domain=mail.google.com&sz=64',
    categoryId: 'cat-personal',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
  },
  {
    id: 'bm-sample-learning',
    url: 'https://developer.mozilla.org',
    title: 'MDN Web Docs',
    favicon: 'https://www.google.com/s2/favicons?domain=developer.mozilla.org&sz=64',
    categoryId: 'cat-learning',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
  {
    id: 'bm-sample-entertainment',
    url: 'https://youtube.com',
    title: 'YouTube',
    favicon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64',
    categoryId: 'cat-entertainment',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: 'bm-sample-tools',
    url: 'https://figma.com',
    title: 'Figma',
    favicon: 'https://www.google.com/s2/favicons?domain=figma.com&sz=64',
    categoryId: 'cat-tools',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
  },
];
