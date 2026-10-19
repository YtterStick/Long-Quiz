/**
 * Types, palettes, presets and helpers for Student & Teacher Avatar Character Creation.
 * Everything is fully type-safe, customizable, gender-selectable, and serializable to JSON.
 */

export type GenderId = "female" | "male";

export type SkinToneId = "fair" | "peach" | "honey" | "caramel" | "bronze" | "deep" | "slate";

export type HairStyleId =
  // Feminine Styles
  | "bun"
  | "twintails"
  | "ponytail"
  | "bob"
  | "wavy"
  | "bangs"
  | "long_straight"
  // Masculine Styles
  | "crop"
  | "fade"
  | "pompadour"
  | "textured"
  | "curls"
  | "dreads"
  | "buzz"
  // Academic / Casual Unisex
  | "beanie"
  | "grad_cap";

export type HairColorId =
  | "midnight"
  | "espresso"
  | "chestnut"
  | "golden"
  | "auburn"
  | "steel_blue"
  | "rose"
  | "platinum";

export type ExpressionId =
  | "sparkle"
  | "focused"
  | "confident"
  | "chill"
  | "curious"
  | "smile"
  | "determined";

export type GlassesId = "none" | "round" | "square" | "wireframe" | "cateye";

export type AccessoryId = "none" | "headphones" | "blush" | "freckles" | "earrings" | "star_pin";

export type OutfitId =
  // Student Standard
  | "blazer"
  | "hoodie"
  | "varsity"
  | "vest"
  | "polo"
  | "labcoat"
  | "tee"
  // Teacher / Faculty Formal
  | "teacher_blazer"
  | "cardigan"
  | "academic_gown"
  | "formal_suit";

export type OutfitColorId =
  | "steel"
  | "burgundy"
  | "tan"
  | "cream"
  | "sage"
  | "slate"
  | "lavender"
  | "coral";

export type OutfitAccentId = "cream" | "tan" | "steel" | "sage" | "burgundy" | "white" | "gold";

export type BackdropThemeId =
  | "study_glow"
  | "chalkboard"
  | "geometric"
  | "sage_leaf"
  | "minimal";

export interface StudentAvatarConfig {
  gender?: GenderId;
  skinTone: SkinToneId;
  hairStyle: HairStyleId;
  hairColor: HairColorId;
  expression: ExpressionId;
  glasses: GlassesId;
  accessory: AccessoryId;
  outfit: OutfitId;
  outfitColor: OutfitColorId;
  outfitAccent: OutfitAccentId;
  backdrop: BackdropThemeId;
  bio?: string;
}

/* ── Color Palette Definitions ─────────────────────────────────── */

export const SKIN_TONES: Record<SkinToneId, { label: string; hex: string; shadow: string }> = {
  fair: { label: "Fair Porcelaine", hex: "#ffe0bd", shadow: "#f3c89c" },
  peach: { label: "Warm Peach", hex: "#ffd1a4", shadow: "#eeb581" },
  honey: { label: "Golden Honey", hex: "#e8b87d", shadow: "#cf9754" },
  caramel: { label: "Caramel Tan", hex: "#c68642", shadow: "#a56627" },
  bronze: { label: "Deep Bronze", hex: "#8d5524", shadow: "#6e3e14" },
  deep: { label: "Rich Espresso", hex: "#5c3818", shadow: "#40230b" },
  slate: { label: "Cool Academic Slate", hex: "#cad8e4", shadow: "#9bb4c0" },
};

export const HAIR_COLORS: Record<HairColorId, { label: string; hex: string; highlight: string }> = {
  midnight: { label: "Midnight Black", hex: "#1c242c", highlight: "#374e63" },
  espresso: { label: "Espresso Brown", hex: "#3b261b", highlight: "#573c2e" },
  chestnut: { label: "Chestnut Brown", hex: "#633c22", highlight: "#825537" },
  golden: { label: "Caramel Blonde", hex: "#d1a355", highlight: "#edd498" },
  auburn: { label: "Auburn Rust", hex: "#8c3b28", highlight: "#b35b44" },
  steel_blue: { label: "Cool Slate Steel", hex: "#3d6b84", highlight: "#7796a8" },
  rose: { label: "Pastel Rose", hex: "#b85d77", highlight: "#dc8da2" },
  platinum: { label: "Platinum Ash", hex: "#d9e2ec", highlight: "#ffffff" },
};

export const OUTFIT_COLORS: Record<OutfitColorId, { label: string; hex: string; shadow: string }> = {
  steel: { label: "Steel Blue", hex: "#3d6b84", shadow: "#2b4f63" },
  burgundy: { label: "Burgundy Wine", hex: "#703b3b", shadow: "#542828" },
  tan: { label: "Earth Tan", hex: "#766346", shadow: "#5a4b33" },
  cream: { label: "Sand Cream", hex: "#8a6c3e", shadow: "#6e542d" },
  sage: { label: "Success Sage", hex: "#2d6b44", shadow: "#1e4e2f" },
  slate: { label: "Midnight Slate", hex: "#1e293b", shadow: "#0f172a" },
  lavender: { label: "Academic Lavender", hex: "#5d547b", shadow: "#453c61" },
  coral: { label: "Warm Coral", hex: "#af5440", shadow: "#8c3b28" },
};

export const ACCENT_COLORS: Record<OutfitAccentId, { label: string; hex: string }> = {
  cream: { label: "Cream Accent", hex: "#e1d0b3" },
  tan: { label: "Tan Accent", hex: "#a18d6d" },
  steel: { label: "Steel Accent", hex: "#9bb4c0" },
  sage: { label: "Sage Accent", hex: "#75a383" },
  burgundy: { label: "Burgundy Accent", hex: "#a85858" },
  white: { label: "Crisp White", hex: "#ffffff" },
  gold: { label: "Honors Gold", hex: "#f59e0b" },
};

export const BACKDROP_THEMES: Record<
  BackdropThemeId,
  { label: string; bgClass: string; ringColor: string; description: string }
> = {
  study_glow: {
    label: "Study Glow",
    bgClass: "from-steel/20 via-cream/15 to-tan/20",
    ringColor: "#9bb4c0",
    description: "Soft atmospheric glow matching Evalo cool tone theme",
  },
  chalkboard: {
    label: "Midnight Chalkboard",
    bgClass: "from-surface-subtle via-surface-overlay to-surface-base",
    ringColor: "#7796a8",
    description: "Dark academy chalkboard with math stars",
  },
  geometric: {
    label: "Classroom Arch",
    bgClass: "from-tan-ghost via-cream-ghost to-steel-ghost",
    ringColor: "#a18d6d",
    description: "Pastel architectural study pedestals",
  },
  sage_leaf: {
    label: "Sage Garden",
    bgClass: "from-sage-ghost via-steel-ghost to-sage-ghost",
    ringColor: "#75a383",
    description: "Calm growth and academic focus vibes",
  },
  minimal: {
    label: "Clean Minimal",
    bgClass: "from-surface-base to-surface-raised",
    ringColor: "var(--color-border-emphasis)",
    description: "Crisp modern card frame",
  },
};

/* ── Default Avatars ─────────────────────────────────── */

export const DEFAULT_AVATAR_CONFIG: StudentAvatarConfig = {
  gender: "female",
  skinTone: "peach",
  hairStyle: "bangs",
  hairColor: "chestnut",
  expression: "focused",
  glasses: "none",
  accessory: "none",
  outfit: "blazer",
  outfitColor: "steel",
  outfitAccent: "cream",
  backdrop: "study_glow",
  bio: "Ready to learn & ace every exam! 📚",
};

export const DEFAULT_FEMALE_AVATAR_CONFIG = DEFAULT_AVATAR_CONFIG;

export const DEFAULT_MALE_AVATAR_CONFIG: StudentAvatarConfig = {
  gender: "male",
  skinTone: "honey",
  hairStyle: "crop",
  hairColor: "midnight",
  expression: "focused",
  glasses: "none",
  accessory: "none",
  outfit: "hoodie",
  outfitColor: "steel",
  outfitAccent: "tan",
  backdrop: "study_glow",
  bio: "Aiming high, learning every day! 🎯",
};

export const DEFAULT_TEACHER_AVATAR_CONFIG: StudentAvatarConfig = {
  gender: "female",
  skinTone: "fair",
  hairStyle: "bob",
  hairColor: "espresso",
  expression: "smile",
  glasses: "round",
  accessory: "star_pin",
  outfit: "teacher_blazer",
  outfitColor: "steel",
  outfitAccent: "gold",
  backdrop: "chalkboard",
  bio: "Inspiring excellence in every lesson 🎓",
};

export const DEFAULT_FEMALE_TEACHER_AVATAR_CONFIG = DEFAULT_TEACHER_AVATAR_CONFIG;

export const DEFAULT_MALE_TEACHER_AVATAR_CONFIG: StudentAvatarConfig = {
  gender: "male",
  skinTone: "caramel",
  hairStyle: "fade",
  hairColor: "midnight",
  expression: "confident",
  glasses: "square",
  accessory: "none",
  outfit: "formal_suit",
  outfitColor: "slate",
  outfitAccent: "steel",
  backdrop: "chalkboard",
  bio: "Guiding learners to their highest potential 💡",
};

export interface AvatarPreset {
  id: string;
  name: string;
  gender: GenderId | "all";
  role?: "student" | "teacher" | "all";
  subtitle: string;
  config: StudentAvatarConfig;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  // Feminine Student Presets
  {
    id: "honors_scholar_f",
    name: "The Honors Scholar",
    gender: "female",
    role: "student",
    subtitle: "Always prepared, top of the class",
    config: {
      gender: "female",
      skinTone: "peach",
      hairStyle: "bun",
      hairColor: "chestnut",
      expression: "sparkle",
      glasses: "round",
      accessory: "earrings",
      outfit: "blazer",
      outfitColor: "burgundy",
      outfitAccent: "gold",
      backdrop: "geometric",
      bio: "Aiming for 100% on every bubble sheet! 🎯",
    },
  },
  {
    id: "creative_artist_f",
    name: "The Creative Mind",
    gender: "female",
    role: "student",
    subtitle: "Curtain bangs, lo-fi beats, creative sparks",
    config: {
      gender: "female",
      skinTone: "fair",
      hairStyle: "bangs",
      hairColor: "rose",
      expression: "sparkle",
      glasses: "cateye",
      accessory: "headphones",
      outfit: "tee",
      outfitColor: "lavender",
      outfitAccent: "white",
      backdrop: "study_glow",
      bio: "Thinking outside the bubble! ✨",
    },
  },
  {
    id: "campus_twintails_f",
    name: "The Cheerful Learner",
    gender: "female",
    role: "student",
    subtitle: "High twin pigtails with varsity spirit",
    config: {
      gender: "female",
      skinTone: "honey",
      hairStyle: "twintails",
      hairColor: "golden",
      expression: "smile",
      glasses: "none",
      accessory: "blush",
      outfit: "varsity",
      outfitColor: "tan",
      outfitAccent: "cream",
      backdrop: "chalkboard",
      bio: "Practice makes progress! ✨",
    },
  },
  {
    id: "chic_valedictorian_f",
    name: "The Chic Valedictorian",
    gender: "female",
    role: "student",
    subtitle: "Sleek straight hair and sweater vest",
    config: {
      gender: "female",
      skinTone: "caramel",
      hairStyle: "long_straight",
      hairColor: "midnight",
      expression: "determined",
      glasses: "wireframe",
      accessory: "freckles",
      outfit: "vest",
      outfitColor: "sage",
      outfitAccent: "cream",
      backdrop: "sage_leaf",
      bio: "In my future valedictorian era 🎓",
    },
  },

  // Masculine Student Presets
  {
    id: "tech_prodigy_m",
    name: "The Code & Quiz Prodigy",
    gender: "male",
    role: "student",
    subtitle: "Listens to lo-fi beats, solves in record time",
    config: {
      gender: "male",
      skinTone: "honey",
      hairStyle: "textured",
      hairColor: "midnight",
      expression: "confident",
      glasses: "square",
      accessory: "headphones",
      outfit: "hoodie",
      outfitColor: "steel",
      outfitAccent: "tan",
      backdrop: "study_glow",
      bio: "Curious mind at work, one question at a time 💡",
    },
  },
  {
    id: "campus_prep_m",
    name: "The Classic Scholar",
    gender: "male",
    role: "student",
    subtitle: "Clean side-part crop & academy blazer",
    config: {
      gender: "male",
      skinTone: "fair",
      hairStyle: "crop",
      hairColor: "espresso",
      expression: "focused",
      glasses: "round",
      accessory: "none",
      outfit: "blazer",
      outfitColor: "steel",
      outfitAccent: "cream",
      backdrop: "geometric",
      bio: "Focused on consistency and high grades 📚",
    },
  },
  {
    id: "sharp_fader_m",
    name: "The Confident Lead",
    gender: "male",
    role: "student",
    subtitle: "Modern fade, textured jacket & keen drive",
    config: {
      gender: "male",
      skinTone: "bronze",
      hairStyle: "fade",
      hairColor: "midnight",
      expression: "determined",
      glasses: "wireframe",
      accessory: "star_pin",
      outfit: "polo",
      outfitColor: "slate",
      outfitAccent: "steel",
      backdrop: "chalkboard",
      bio: "Never stop learning, never stop growing 🚀",
    },
  },
  {
    id: "lab_specialist_m",
    name: "The Science Specialist",
    gender: "male",
    role: "student",
    subtitle: "Crisp lab coat, ready for calculations",
    config: {
      gender: "male",
      skinTone: "caramel",
      hairStyle: "pompadour",
      hairColor: "chestnut",
      expression: "curious",
      glasses: "square",
      accessory: "none",
      outfit: "labcoat",
      outfitColor: "slate",
      outfitAccent: "steel",
      backdrop: "sage_leaf",
      bio: "Every mistake is just another learning data point 🔬",
    },
  },

  // Teacher / Faculty Presets
  {
    id: "prof_mentor_f",
    name: "Prof. Mentor",
    gender: "female",
    role: "teacher",
    subtitle: "Dedicated instructor with sharp blazer",
    config: {
      gender: "female",
      skinTone: "peach",
      hairStyle: "bob",
      hairColor: "espresso",
      expression: "smile",
      glasses: "round",
      accessory: "star_pin",
      outfit: "teacher_blazer",
      outfitColor: "steel",
      outfitAccent: "gold",
      backdrop: "chalkboard",
      bio: "Teaching is unlocking human potential 💡",
    },
  },
  {
    id: "academic_dean_m",
    name: "Dean of Studies",
    gender: "male",
    role: "teacher",
    subtitle: "Formal executive suit & academic leadership",
    config: {
      gender: "male",
      skinTone: "caramel",
      hairStyle: "crop",
      hairColor: "midnight",
      expression: "focused",
      glasses: "square",
      accessory: "none",
      outfit: "formal_suit",
      outfitColor: "slate",
      outfitAccent: "burgundy",
      backdrop: "chalkboard",
      bio: "Cultivating academic excellence and integrity 🎓",
    },
  },
  {
    id: "cozy_lecturer_f",
    name: "The Faculty Guide",
    gender: "female",
    role: "teacher",
    subtitle: "Warm knit cardigan and encouraging mentorship",
    config: {
      gender: "female",
      skinTone: "fair",
      hairStyle: "wavy",
      hairColor: "chestnut",
      expression: "smile",
      glasses: "wireframe",
      accessory: "earrings",
      outfit: "cardigan",
      outfitColor: "sage",
      outfitAccent: "cream",
      backdrop: "sage_leaf",
      bio: "Every student can excel with the right encouragement 🌱",
    },
  },
  {
    id: "grand_master_m",
    name: "Master Lecturer",
    gender: "male",
    role: "teacher",
    subtitle: "Regalia academic gown & seasoned wisdom",
    config: {
      gender: "male",
      skinTone: "deep",
      hairStyle: "fade",
      hairColor: "midnight",
      expression: "determined",
      glasses: "wireframe",
      accessory: "star_pin",
      outfit: "academic_gown",
      outfitColor: "burgundy",
      outfitAccent: "gold",
      backdrop: "geometric",
      bio: "Empowering scholars for tomorrow's challenges 🏆",
    },
  },
];

export const FEMALE_HAIRSTYLES: HairStyleId[] = [
  "bun",
  "twintails",
  "ponytail",
  "bob",
  "wavy",
  "bangs",
  "long_straight",
  "curls",
  "beanie",
  "grad_cap",
];

export const MALE_HAIRSTYLES: HairStyleId[] = [
  "crop",
  "fade",
  "pompadour",
  "textured",
  "buzz",
  "dreads",
  "beanie",
  "grad_cap",
];

export function sanitizeHairForGender(hairStyle: HairStyleId, gender?: GenderId): HairStyleId {
  const isMale = gender === "male";
  const pool = isMale ? MALE_HAIRSTYLES : FEMALE_HAIRSTYLES;
  if (pool.includes(hairStyle)) return hairStyle;
  return isMale ? "crop" : "bangs";
}

export const STUDENT_OUTFITS: OutfitId[] = [
  "blazer",
  "hoodie",
  "varsity",
  "vest",
  "polo",
  "labcoat",
  "tee",
];

export const TEACHER_OUTFITS: OutfitId[] = [
  "teacher_blazer",
  "cardigan",
  "academic_gown",
  "formal_suit",
  "blazer",
  "labcoat",
];

const SKIN_KEYS: SkinToneId[] = ["fair", "peach", "honey", "caramel", "bronze", "deep", "slate"];
const HAIR_COLOR_KEYS: HairColorId[] = ["midnight", "espresso", "chestnut", "golden", "auburn", "steel_blue", "rose", "platinum"];
const EXPRESSION_KEYS: ExpressionId[] = ["sparkle", "focused", "confident", "chill", "curious", "smile", "determined"];
const GLASSES_KEYS: GlassesId[] = ["none", "round", "square", "wireframe", "cateye"];
const ACCESSORY_KEYS: AccessoryId[] = ["none", "headphones", "blush", "freckles", "earrings", "star_pin"];
const OUTFIT_COLOR_KEYS: OutfitColorId[] = ["steel", "burgundy", "tan", "cream", "sage", "slate", "lavender", "coral"];
const ACCENT_KEYS: OutfitAccentId[] = ["cream", "tan", "steel", "sage", "burgundy", "white", "gold"];
const BACKDROP_KEYS: BackdropThemeId[] = ["study_glow", "chalkboard", "geometric", "sage_leaf", "minimal"];

const STUDENT_MOTTOS = [
  "Ready to ace every quiz! 🚀",
  "Coffee, study notes & good vibes ☕",
  "Aiming for 100% on every bubble sheet! 🎯",
  "Curious mind at work 💡",
  "In my student era 📚",
  "Practice makes progress! ✨",
  "Future graduate in training 🎓",
];

const TEACHER_MOTTOS = [
  "Inspiring curiosity and academic excellence 💡",
  "Every student has a story to tell and a mind to grow 🌱",
  "Excellence is not an act, but a habit 🏆",
  "Guiding tomorrow's leaders, one lesson at a time 📚",
  "Dedicated to fair grading and supportive mentorship ✨",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRandomAvatar(
  gender: GenderId = "female",
  role: "STUDENT" | "TEACHER" = "STUDENT"
): StudentAvatarConfig {
  const hairPool = gender === "male" ? MALE_HAIRSTYLES : FEMALE_HAIRSTYLES;
  const outfitPool = role === "TEACHER" ? TEACHER_OUTFITS : STUDENT_OUTFITS;
  const mottoPool = role === "TEACHER" ? TEACHER_MOTTOS : STUDENT_MOTTOS;

  return {
    gender,
    skinTone: pickRandom(SKIN_KEYS),
    hairStyle: pickRandom(hairPool),
    hairColor: pickRandom(HAIR_COLOR_KEYS),
    expression: pickRandom(EXPRESSION_KEYS),
    glasses: pickRandom(GLASSES_KEYS),
    accessory: pickRandom(ACCESSORY_KEYS),
    outfit: pickRandom(outfitPool),
    outfitColor: pickRandom(OUTFIT_COLOR_KEYS),
    outfitAccent: pickRandom(ACCENT_KEYS),
    backdrop: pickRandom(BACKDROP_KEYS),
    bio: pickRandom(mottoPool),
  };
}

export function parseAvatarConfig(raw?: string | null): StudentAvatarConfig {
  if (!raw) return DEFAULT_AVATAR_CONFIG;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const gender: GenderId = parsed.gender === "male" ? "male" : "female";
    const hairPool = gender === "male" ? MALE_HAIRSTYLES : FEMALE_HAIRSTYLES;
    const defaultHair: HairStyleId = gender === "male" ? "crop" : "bangs";
    const validHairStyle: HairStyleId = (parsed.hairStyle && hairPool.includes(parsed.hairStyle as HairStyleId))
      ? (parsed.hairStyle as HairStyleId)
      : defaultHair;

    return {
      gender,
      skinTone: parsed.skinTone && SKIN_TONES[parsed.skinTone as SkinToneId] ? parsed.skinTone : DEFAULT_AVATAR_CONFIG.skinTone,
      hairStyle: validHairStyle,
      hairColor: parsed.hairColor && HAIR_COLORS[parsed.hairColor as HairColorId] ? parsed.hairColor : DEFAULT_AVATAR_CONFIG.hairColor,
      expression: parsed.expression && EXPRESSION_KEYS.includes(parsed.expression) ? parsed.expression : DEFAULT_AVATAR_CONFIG.expression,
      glasses: parsed.glasses && GLASSES_KEYS.includes(parsed.glasses) ? parsed.glasses : DEFAULT_AVATAR_CONFIG.glasses,
      accessory: parsed.accessory && ACCESSORY_KEYS.includes(parsed.accessory) ? parsed.accessory : DEFAULT_AVATAR_CONFIG.accessory,
      outfit: parsed.outfit || DEFAULT_AVATAR_CONFIG.outfit,
      outfitColor: parsed.outfitColor && OUTFIT_COLORS[parsed.outfitColor as OutfitColorId] ? parsed.outfitColor : DEFAULT_AVATAR_CONFIG.outfitColor,
      outfitAccent: parsed.outfitAccent && ACCENT_COLORS[parsed.outfitAccent as OutfitAccentId] ? parsed.outfitAccent : DEFAULT_AVATAR_CONFIG.outfitAccent,
      backdrop: parsed.backdrop && BACKDROP_THEMES[parsed.backdrop as BackdropThemeId] ? parsed.backdrop : DEFAULT_AVATAR_CONFIG.backdrop,
      bio: typeof parsed.bio === "string" ? parsed.bio : DEFAULT_AVATAR_CONFIG.bio,
    };
  } catch {
    return DEFAULT_AVATAR_CONFIG;
  }
}
