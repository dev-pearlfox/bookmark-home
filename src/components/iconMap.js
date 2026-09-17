/**
 * Single source of truth for icon name -> component mapping.
 * Data (defaultData.js) only stores string names — this keeps
 * persistence serializable and decouples data from React.
 */

import {
  // ❤️  HEART LOGIC — Heart import is protected. Do not remove.  ❤️
  Home, Heart, Sun, Moon, Star, Sparkles,
  Briefcase, Building2, Calendar, ClipboardList, Mail, Phone,
  GraduationCap, Book, BookOpen, Pencil, Palette, Lightbulb,
  Code, Terminal, Cpu, Database, Cloud, GitBranch,
  Music, Film, Camera, Gamepad2, Tv, Headphones,
  ShoppingBag, ShoppingCart, Gift, CreditCard, Wallet, Tag,
  Plane, Car, MapPin, Compass, Coffee, Utensils,
  Dumbbell, Bike, PawPrint, Leaf, Flower, Flame,
  Wrench, Rocket, Globe, Bookmark,
  HelpCircle,
} from 'lucide-react';

const MAP = {
  // ❤️  HEART LOGIC — Heart mapping must remain. See PROTECTED.md.  ❤️
  Home, Heart, Sun, Moon, Star, Sparkles,
  Briefcase, Building2, Calendar, ClipboardList, Mail, Phone,
  GraduationCap, Book, BookOpen, Pencil, Palette, Lightbulb,
  Code, Terminal, Cpu, Database, Cloud, GitBranch,
  Music, Film, Camera, Gamepad2, Tv, Headphones,
  ShoppingBag, ShoppingCart, Gift, CreditCard, Wallet, Tag,
  Plane, Car, MapPin, Compass, Coffee, Utensils,
  Dumbbell, Bike, PawPrint, Leaf, Flower, Flame,
  Wrench, Rocket, Globe, Bookmark,
};

export function getIcon(name) {
  return MAP[name] || HelpCircle;
}

export default MAP;
