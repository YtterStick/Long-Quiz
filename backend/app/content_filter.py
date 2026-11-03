"""Content moderation and profanity filter for mottos and user bios.
Blocks sensitive, offensive, vulgar, and inappropriate words in both English and Tagalog/Filipino.
Handles common evasion techniques such as leetspeak, punctuation insertion, and extra spacing.
"""

import re
from typing import Optional, Tuple
from fastapi import HTTPException

# Normalized Tagalog / Filipino profanity, vulgarity, and sensitive terms
TAGALOG_SENSITIVE_WORDS = [
    # Severe profanities & curses
    "putangina", "tangina", "puta", "pota", "putragis", "tarantado", "tarantada",
    "gago", "gaga", "ulol", "punyeta", "bwisit", "buwisit", "leche", "hinayupak",
    "hudas", "kupal", "pakyu", "pakshet", "lintik", "tanginamo", "putanginamo",
    # Slurs, derogatory & abusive insults
    "bobo", "tanga", "inutil", "bano", "engot", "gunggong", "ogag",
    "pokpok", "malandi", "higad", "putang",
    # Sexual / anatomical / vulgar slang
    "tite", "burat", "bayag", "kantot", "kantutan", "jakol", "chupa", "tsupa",
    "tamod", "pekpek", "puke", "puki", "kiki", "puday", "libog", "manyak", "manyakis",
    "salbahe", "ungas", "animal ka", "hayop ka",
]

# English profanity, slurs, and explicit sexual terms
ENGLISH_SENSITIVE_WORDS = [
    "fuck", "fucking", "fucker", "motherfucker", "shit", "bullshit",
    "bitch", "asshole", "bastard", "dick", "cock", "cunt", "pussy",
    "whore", "slut", "nigger", "nigga", "faggot", "retard", "dumbass",
    "blowjob", "handjob", "masturbate", "porn", "porno", "sex", "sexy",
    "horny", "penis", "vagina", "dildo", "boobs", "tits", "kill yourself",
    "suicide",
]

# Character replacement map for leetspeak decoding
LEET_MAP = {
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
}


def _normalize_text(text: str) -> str:
    """Normalize text by decoding leetspeak and collapsing separators."""
    lower = text.lower()
    # Replace leetspeak characters
    chars = []
    for ch in lower:
        chars.append(LEET_MAP.get(ch, ch))
    normalized = "".join(chars)
    # Remove zero-width spaces, underscores, dots, hyphens often used to bypass filters
    cleaned = re.sub(r"[\s\._\-\*~`^,]+", " ", normalized)
    return cleaned


def check_sensitive_content(text: Optional[str]) -> Tuple[bool, Optional[str]]:
    """
    Checks if the given text contains sensitive, offensive, or vulgar words in Tagalog or English.
    Returns (True, matched_word) if inappropriate content is found, else (False, None).
    """
    if not text or not text.strip():
        return False, None

    raw = text.strip()
    norm = _normalize_text(raw)
    # Also create a collapsed version with no spaces for spaced-out words (e.g. "p u t a", "t a n g i n a")
    collapsed = re.sub(r"[^a-z0-9]", "", norm)

    all_sensitive = TAGALOG_SENSITIVE_WORDS + ENGLISH_SENSITIVE_WORDS

    for bad in all_sensitive:
        bad_clean = bad.replace(" ", "")

        # 1. Exact token / word-boundary match in normalized text
        # (Prevents false positives on words like "title", "class", "tangent")
        pattern = rf"\b{re.escape(bad)}\b"
        if re.search(pattern, norm):
            return True, bad

        # 2. For multi-word Tagalog curses like "putang ina" or "tang ina"
        if " " in bad and bad in norm:
            return True, bad

        # 3. For words with 4 or more letters, check if intentionally spaced out in collapsed text
        if len(bad_clean) >= 4 and bad_clean in collapsed:
            # Avoid short substring false positives (e.g. "sex" in "Essex" or "tae" in "taekwondo")
            safe_allowlist = ["asset", "class", "document", "tangent", "taekwondo", "bobcat"]
            is_false_pos = any(allow in norm for allow in safe_allowlist)
            if not is_false_pos:
                return True, bad

    return False, None


def validate_motto(text: Optional[str]) -> Optional[str]:
    """
    Validates a motto or bio string. Raises HTTPException(400) if inappropriate content is found.
    Returns the cleaned motto text.
    """
    if not text:
        return None

    cleaned = text.strip()[:160]
    is_sensitive, matched = check_sensitive_content(cleaned)
    if is_sensitive:
        raise HTTPException(
            status_code=400,
            detail=f"Motto contains sensitive or inappropriate words (English/Tagalog). Please choose an inspiring, respectful educational motto."
        )

    return cleaned

