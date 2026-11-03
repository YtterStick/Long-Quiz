/**
 * Client-side content moderation filter for student and teacher study mottos.
 * Detects sensitive, offensive, vulgar, and inappropriate words in both English and Tagalog/Filipino.
 */

const TAGALOG_SENSITIVE_WORDS = [
  "putangina", "tangina", "puta", "pota", "putragis", "tarantado", "tarantada",
  "gago", "gaga", "ulol", "punyeta", "bwisit", "buwisit", "leche", "hinayupak",
  "hudas", "kupal", "pakyu", "pakshet", "lintik", "tanginamo", "putanginamo",
  "bobo", "tanga", "inutil", "bano", "engot", "gunggong", "ogag",
  "pokpok", "malandi", "higad", "putang",
  "tite", "burat", "bayag", "kantot", "kantutan", "jakol", "chupa", "tsupa",
  "tamod", "pekpek", "puke", "puki", "kiki", "puday", "libog", "manyak", "manyakis",
  "salbahe", "ungas", "animal ka", "hayop ka",
];

const ENGLISH_SENSITIVE_WORDS = [
  "fuck", "fucking", "fucker", "motherfucker", "shit", "bullshit",
  "bitch", "asshole", "bastard", "dick", "cock", "cunt", "pussy",
  "whore", "slut", "nigger", "nigga", "faggot", "retard", "dumbass",
  "blowjob", "handjob", "masturbate", "porn", "porno", "sex", "sexy",
  "horny", "penis", "vagina", "dildo", "boobs", "tits", "kill yourself",
  "suicide",
];

const LEET_MAP: Record<string, string> = {
  "@": "a",
  "4": "a",
  "8": "b",
  "3": "e",
  "1": "i",
  "!": "i",
  "0": "o",
  "$": "s",
  "5": "s",
  "7": "t",
  "+": "t",
};

export function checkSensitiveMotto(motto: string): { isValid: boolean; error?: string } {
  if (!motto || !motto.trim()) {
    return { isValid: true };
  }

  const raw = motto.trim().toLowerCase();

  // Decode leetspeak
  let decoded = "";
  for (const char of raw) {
    decoded += LEET_MAP[char] || char;
  }

  // Clean separators
  const normalized = decoded.replace(/[\s\._\-\*~`^,]+/g, " ");
  const collapsed = normalized.replace(/[^a-z0-9]/g, "");

  const allSensitive = [...TAGALOG_SENSITIVE_WORDS, ...ENGLISH_SENSITIVE_WORDS];
  const allowlist = ["asset", "class", "document", "tangent", "taekwondo", "bobcat"];

  for (const word of allSensitive) {
    const cleanWord = word.replace(/\s+/g, "");

    // 1. Boundary match in normalized string
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(normalized)) {
      return {
        isValid: false,
        error: "Motto contains sensitive or inappropriate language (English/Tagalog). Please choose an inspiring, respectful motto.",
      };
    }

    // 2. Multi-word phrases
    if (word.includes(" ") && normalized.includes(word)) {
      return {
        isValid: false,
        error: "Motto contains sensitive or inappropriate language (English/Tagalog). Please choose an inspiring, respectful motto.",
      };
    }

    // 3. Spaced-out / collapsed match for words with 4+ chars
    if (cleanWord.length >= 4 && collapsed.includes(cleanWord)) {
      const isAllowed = allowlist.some((allow) => normalized.includes(allow));
      if (!isAllowed) {
        return {
          isValid: false,
          error: "Motto contains sensitive or inappropriate language (English/Tagalog). Please choose an inspiring, respectful motto.",
        };
      }
    }
  }

  return { isValid: true };
}

