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
  { id: 'cat-personal',      name: 'Personal',      icon: 'Heart',     color: 'rose'   },
  { id: 'cat-learning',      name: 'Learning',      icon: 'GraduationCap', color: 'mint'   },
  { id: 'cat-entertainment', name: 'Entertainment', icon: 'Music',     color: 'peach'  },
  { id: 'cat-tools',         name: 'Tools',         icon: 'Wrench',    color: 'lilac'  },
];

export const AVAILABLE_ICONS = [
  // Life
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

export const SAMPLE_BOOKMARKS = [
  {
    id: 'bm-sample-1',
    url: 'https://pearlfox.io',
    title: 'PearlFox',
    favicon: 'https://www.google.com/s2/favicons?domain=pearlfox.io&sz=64',
    categoryId: 'cat-home',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: 'bm-sample-2',
    url: 'https://github.com',
    title: 'GitHub',
    favicon: 'https://www.google.com/s2/favicons?domain=github.com&sz=64',
    categoryId: 'cat-work',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'bm-sample-3',
    url: 'https://youtube.com',
    title: 'YouTube',
    favicon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64',
    categoryId: 'cat-entertainment',
    createdAt: Date.now() - 1000 * 60 * 30,
  },
];
