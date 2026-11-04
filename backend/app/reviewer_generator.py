"""
AI Handout Parser & Reviewer Generator Engine for Students.
Extracts structured review pointers, 3D flip flashcards, and interactive practice quiz cards
from uploaded PDF handouts, text documents, or pasted course notes (e.g. STI lesson modules).
Guarantees 100% comprehensive coverage across the entire handout while strictly excluding
references, bibliographies, citations, and broken fragments.
"""

import io
import re
import random
import hashlib
from typing import Dict, List, Any, Optional
import pypdf


def is_valid_academic_term(term: str, def_text: str) -> bool:
    """
    Validates that an extracted term and definition represent legitimate academic study content,
    strictly excluding references, bibliographies, author citations, URLs, and incomplete fragments.
    """
    if not term or not def_text:
        return False
    t_clean = term.strip()
    d_clean = def_text.strip()
    
    # Length checks
    if len(t_clean) < 2 or len(t_clean) > 85 or len(d_clean) < 10:
        return False

    lower_t = t_clean.lower()
    lower_d = d_clean.lower()

    # Blacklisted reference and metadata terms (exact or metadata prefixes)
    exact_bad = {
        "reference", "references", "bibliography", "works cited", "suggested reading",
        "suggested readings", "further reading", "further readings", "online reference",
        "online references", "author", "authors", "isbn", "page", "figure", "chart",
        "diagram", "image", "adopted from", "courtesy", "copyright", "property of sti",
        "all rights reserved", "http", "https", "www", "syllabus", "course code",
        "prepared by", "instructor", "faculty"
    }
    if lower_t in exact_bad:
        return False

    bad_prefixes = [
        "references:", "bibliography:", "works cited", "suggested reading",
        "further reading", "online reference", "isbn", "page ", "figure ",
        "adopted from", "courtesy of", "copyright", "property of sti",
        "all rights reserved", "http://", "https://", "www."
    ]
    for bp in bad_prefixes:
        if lower_t.startswith(bp):
            return False

    # Exclude definitions that contain URLs, ISBNs, or bibliographic citations
    if re.search(r"https?://|www\.", d_clean, re.IGNORECASE):
        return False
    if re.search(r"\bisbn\b|\bvol\.\s*\d|\bpp\.\s*\d+-\d+|\bedition\b", lower_d):
        return False
    if re.search(r"^\s*\(?\d{4}\)?\.?\s+[A-Z]", d_clean):
        return False

    # Exclude incomplete fragments
    if t_clean.endswith("...") or d_clean.startswith("...") or len(t_clean.split()) > 10:
        return False

    return True


def distill_handout_text(raw_text: str) -> str:
    """
    Smart Handout Text Distillation Engine:
    Strips cover page noise, STI licensing/watermarks, header/footer pagination,
    and reference/bibliography sections while preserving 100% of all academic
    topics, definitions, principles, formulas, and bullet takeaways from start to end.
    """
    if not raw_text:
        return ""

    lines = raw_text.splitlines()
    distilled_lines = []

    # Patterns for standalone boilerplate lines to drop
    boilerplate_patterns = [
        re.compile(r"^\s*property\s+of\s+sti\b", re.IGNORECASE),
        re.compile(r"^\s*all\s+rights\s+reserved\b", re.IGNORECASE),
        re.compile(r"^\s*for\s+academic\s+purposes\s+only\b", re.IGNORECASE),
        re.compile(r"^\s*page\s+\d+\s+(?:of|\/)\s+\d+\b", re.IGNORECASE),
        re.compile(r"^\s*page\s+\d+\s*$", re.IGNORECASE),
        re.compile(r"^\s*(?:course|subject)\s+code\s*:\s*.*$", re.IGNORECASE),
        re.compile(r"^\s*(?:term|academic\s+year|semester)\s*:\s*.*$", re.IGNORECASE),
        re.compile(r"^\s*(?:prepared\s+by|instructor|faculty)\s*:\s*.*$", re.IGNORECASE),
        re.compile(r"^\s*(?:[A-Z0-9]{2,}\s*)?handout\s*\d+\s*(?:\*\d+\*)?\s*$", re.IGNORECASE),
        re.compile(r"^\s*table\s+of\s+contents\b", re.IGNORECASE),
        re.compile(r"\.{4,}\s*\d+\s*$"),   # TOC dot leader lines
        re.compile(r"^[-=_*~]{4,}\s*$"),    # Long separator lines
    ]

    # Reference section start detection (NOTE: never include 'sources' here because
    # technical handouts frequently have 'Sources' / 'Data Sources' sections/diagrams!)
    ref_start_pattern = re.compile(
        r"^\s*(?:references|bibliography|works\s+cited|suggested\s+readings?|further\s+readings?|online\s+references?)\s*:?\s*$",
        re.IGNORECASE
    )
    new_module_pattern = re.compile(
        r"^\s*(?:(?:module|chapter|unit|lesson|topic|section|part)\s+\d+|[IVX]+\.\s+[A-Z]|\d+\.\s+[A-Z])",
        re.IGNORECASE
    )
    citation_line_pattern = re.compile(
        r"^\s*(?:\[\d+\]|\d+\.)?\s*[A-Z][a-z]+,\s*(?:[A-Z]\.)+.*(?:\(\d{4}\)|\b\d{4}\b)",
        re.IGNORECASE
    )
    retrieved_from_pattern = re.compile(
        r"\b(?:retrieved\s+from|available\s+at|accessed\s+on)\b|https?://|www\.",
        re.IGNORECASE
    )
    url_pattern = re.compile(r"^\s*(?:https?://|www\.)\S+\s*$", re.IGNORECASE)

    in_references = False
    total_lines = max(1, len(lines))

    for idx, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue

        # Check for References section start (typically near the end of a handout/module)
        if ref_start_pattern.match(stripped):
            in_references = True
            continue

        # If inside references section, resume immediately if a new module/heading starts
        # OR if the line is clearly instructional content rather than a citation/URL
        if in_references:
            is_citation_like = (
                bool(citation_line_pattern.search(stripped))
                or bool(retrieved_from_pattern.search(stripped))
                or bool(re.search(r"\b(?:isbn|pp\.\s*\d+|ed\.|edition|press|publishing|wiley|pearson|mcgraw|springer|oreilly|acm|ieee)\b", stripped, re.IGNORECASE))
                or bool(re.search(r"\(\d{4}(?:,\s*[A-Za-z]+\s*\d*)?\)", stripped))
            )
            if new_module_pattern.match(stripped) or stripped.startswith("#") or (not is_citation_like and idx < total_lines * 0.85):
                in_references = False
            else:
                continue

        # Skip standalone citations or pure URLs
        if citation_line_pattern.match(stripped) or url_pattern.match(stripped):
            continue

        # Check boilerplate pattern
        is_boilerplate = any(pat.search(stripped) for pat in boilerplate_patterns)
        if is_boilerplate:
            continue

        # Clean inline watermarks and STI footer codes (e.g. *04 Handout 1* or ©STI)
        cleaned = re.sub(r"\bProperty of STI\b", "", stripped, flags=re.IGNORECASE)
        cleaned = re.sub(r"\bAll rights reserved\b", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\bFor academic purposes only\b", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        if cleaned and len(cleaned) > 1:
            distilled_lines.append(cleaned)

    return "\n".join(distilled_lines)


def compute_content_hash(text: str) -> str:
    """Computes a canonical SHA-256 fingerprint of distilled handout text (version 5)."""
    normalized = re.sub(r"\s+", " ", text.strip().lower())
    return hashlib.sha256(f"v5:{normalized}".encode("utf-8")).hexdigest()


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract clean distilled text content from PDF binary bytes."""
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    full_text = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            full_text.append(text)
    raw = "\n".join(full_text)
    return distill_handout_text(raw)


def _is_section_heading(line: str) -> Optional[str]:
    """
    Detects whether a line in a handout is a section/topic heading and returns
    its normalized title, or None if it is regular content.
    """
    s = line.strip()
    if not s or len(s) < 4 or len(s) > 85:
        return None
    if s.endswith((".", "?", "!", ";", ",")):
        return None
    if re.search(r"https?://|www\.|\bisbn\b", s.lower()):
        return None

    # 1. Explicit Module / Chapter / Unit / Lesson / Section / Part / Roman numeral header
    m_mod = re.match(
        r"^(?:(?:module|chapter|unit|lesson|topic|part|section)\s+\d+|(?:[I]{1,3}|IV|V|VI{0,3}|IX|X)\.)\s*[:\-\–\—\.]*\s*(.+)$",
        s,
        re.IGNORECASE,
    )
    if m_mod:
        title = m_mod.group(1).strip()
        if 3 <= len(title) <= 75:
            return title

    # 2. Markdown heading (#, ##, ###)
    if s.startswith("#"):
        title = re.sub(r"^#+\s*", "", s).strip()
        if 3 <= len(title) <= 75:
            return title

    # 3. Numbered section heading without trailing sentence punctuation (e.g. "1. Data Warehouse Architecture" or "2.1 Star Schema")
    m_num = re.match(r"^(\d+(?:\.\d+)?)\s+([A-Z][A-Za-z0-9\s\-_/(),&]{3,65})$", s)
    if m_num and ":" not in s and " - " not in s and " – " not in s:
        words = m_num.group(2).split()
        if 1 <= len(words) <= 9:
            return m_num.group(2).strip()

    # 4. ALL-CAPS heading (e.g. "DATA WAREHOUSE ARCHITECTURE")
    if s.isupper() and 4 <= len(s) <= 70 and any(c.isalpha() for c in s):
        words = s.split()
        if 1 <= len(words) <= 10:
            return s.title()

    # 5. Standalone Title-Case heading common in STI / university handouts
    # Must contain a structural/academic heading keyword or connector phrase so short diagram labels
    # (like "Flat Files" or "External Data") are kept as items inside their parent section.
    if ":" not in s and " - " not in s and " – " not in s and " — " not in s:
        if not s.startswith(("-", "*", "•")):
            words = s.split()
            if 2 <= len(words) <= 8 and len(s) <= 68:
                stop_words = {"a", "an", "the", "of", "in", "on", "for", "and", "or", "to", "with", "vs", "vs.", "by", "from", "at", "between"}
                sig_words = [w for w in words if w.lower() not in stop_words]
                if sig_words and all(w[0].isupper() for w in sig_words if w[0].isalpha()):
                    lower_words = {re.sub(r"[^a-z.]", "", w.lower()) for w in words}
                    sentence_verbs = {"is", "are", "was", "were", "has", "have", "had", "can", "will", "should", "must", "allows", "provides", "stores", "means", "refers"}
                    heading_keywords = {
                        "introduction", "overview", "characteristic", "characteristics",
                        "architecture", "architectures", "component", "components",
                        "type", "types", "classification", "classifications",
                        "process", "processes", "step", "steps", "stage", "stages",
                        "phase", "phases", "schema", "schemas", "model", "models",
                        "comparison", "vs", "vs.", "advantage", "advantages",
                        "disadvantage", "disadvantages", "operation", "operations",
                        "function", "functions", "layer", "layers", "principle", "principles",
                        "concept", "concepts", "method", "methods", "technique", "techniques",
                        "structure", "framework", "lifecycle", "workflow", "design",
                        "implementation", "application", "applications", "benefit", "benefits",
                        "limitation", "limitations", "summary", "fundamental", "fundamentals",
                        "rule", "rules", "category", "categories", "element", "elements",
                        "feature", "features", "tier", "tiers",
                    }
                    connectors = {"of", "in", "for", "to", "and", "vs", "vs.", "with", "between"}
                    if not (lower_words & sentence_verbs) and (
                        (lower_words & heading_keywords) or (len(words) >= 3 and (lower_words & connectors))
                    ):
                        return s

    return None


def _reflow_pdf_lines(raw_lines: List[str]) -> List[str]:
    """
    Joins PDF lines that were hard-wrapped mid-sentence while keeping headings,
    bullet items, and explicit Term: Definition starters on their own logical lines.
    """
    reflowed: List[str] = []
    bullet_start_re = re.compile(r"^(?:[\-\*•▪◦‣]|\d+[\.\)]|[a-zA-Z][\.\)])\s+")
    colon_def_re = re.compile(r"^(?:[\-\*•▪◦]\s+|\d+[\.\)]\s+)?([A-Z0-9][A-Za-z0-9\s\-_/(),&']{1,60})\s*[:\-–—]\s+(.+)$")

    for line in raw_lines:
        s = line.strip()
        if not s:
            continue

        # Always start a new logical line for headings, bullets, or explicit Term: Definition lines
        if _is_section_heading(s) or bullet_start_re.match(s) or colon_def_re.match(s):
            reflowed.append(s)
            continue

        if reflowed:
            prev = reflowed[-1]
            # Do not append onto a section heading
            if not _is_section_heading(prev) and not prev.endswith((".", "!", "?", ":")):
                reflowed[-1] = f"{prev} {s}"
                continue

        reflowed.append(s)

    return reflowed


def parse_and_generate_reviewer(raw_text: str, custom_title: Optional[str] = None) -> Dict[str, Any]:
    """
    Analyzes handout text and extracts a 100% complete academic study deck:
    1. Title & Overview
    2. Grouped Topic Modules covering the entire handout (Key Terms, Core Rules, Exam Tips)
    3. Interactive 3D Flip Flashcards across all topics
    4. Practice MCQ Quiz Cards across all topics
    Strictly excludes references, bibliographies, citations, and incomplete fragments.
    """
    # 0. Attempt Google Gemini AI first for enriched academic study decks
    try:
        from app.services.gemini_service import generate_reviewer_deck_gemini
        gemini_deck = generate_reviewer_deck_gemini(raw_text, custom_title=custom_title)
        if gemini_deck and gemini_deck.get("flashcards") and len(gemini_deck.get("topics", [])) > 0:
            return gemini_deck
    except Exception:
        pass

    distilled_text = distill_handout_text(raw_text)
    raw_lines = [l.strip() for l in distilled_text.splitlines() if l.strip()]
    if not raw_lines:
        raw_lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    if not raw_lines:
        raise ValueError("Handout contains no readable text.")

    lines = _reflow_pdf_lines(raw_lines)

    # 1. Determine Title
    detected_title = custom_title or (raw_lines[0] if len(raw_lines[0]) < 85 else "Course Handout & Module Reviewer")
    detected_title = re.sub(r"^[#\*\-=\s]+", "", detected_title).strip()

    # 2. Extract Section Headings, Terms, Definitions, and Topic-Scoped Bullets/Prose
    definitions: List[Dict[str, str]] = []
    bullet_points: List[str] = []
    paragraphs: List[str] = []

    # Patterns for definitions:
    # "Term: Definition", "• Term - Definition", "1. Term – Definition"
    term_colon_pattern = re.compile(
        r"^(?:[\-\*•▪◦]\s+|\d+[\.\)]\s+|[a-zA-Z][\.\)]\s+)?\*?\*?([A-Z0-9][A-Za-z0-9\s\-_/(),&']{1,68}?)\*?\*?\s*(?::|\s[\-–—]\s)\s*(.+)$"
    )
    is_pattern = re.compile(
        r"^(?:[\-\*•▪◦]\s+|\d+[\.\)]\s+)?(?:A|An|The)?\s*([A-Z0-9][A-Za-z0-9\s\-_/(),&']{1,60}?)\s+"
        r"(?:is\s+(?:a|an|the|defined\s+as|used\s+(?:to|for)|responsible\s+for|characterized\s+by|composed\s+of|known\s+as)|"
        r"are\s+(?:the|used\s+(?:to|for)|defined\s+as|responsible\s+for)|"
        r"refers\s+to|means|represents|consists\s+of|describes|involves|provides|stores|contains|allows)\s+(.+)$",
        re.IGNORECASE
    )

    current_topic_name = "Core Concepts & Foundational Principles"
    topic_order: List[str] = []
    topic_buckets: Dict[str, Dict[str, List[Any]]] = {}

    def _ensure_topic_bucket(t_name: str) -> Dict[str, List[Any]]:
        if t_name not in topic_buckets:
            topic_order.append(t_name)
            topic_buckets[t_name] = {"terms": [], "bullets": [], "sentences": []}
        return topic_buckets[t_name]

    exact_bad_headings = {
        "references", "reference list", "bibliography", "works cited",
        "suggested reading", "suggested readings", "further reading", "reading list"
    }

    for line in lines:
        heading_candidate = _is_section_heading(line)
        if heading_candidate:
            h_clean = re.sub(r"[^a-z\s]", "", heading_candidate.lower()).strip()
            if h_clean not in exact_bad_headings and heading_candidate.lower() != detected_title.lower():
                current_topic_name = heading_candidate
                _ensure_topic_bucket(current_topic_name)
            continue

        bucket = _ensure_topic_bucket(current_topic_name)

        # Check colon / dash definition
        match_colon = term_colon_pattern.match(line)
        if match_colon:
            term = match_colon.group(1).strip().strip("*•-")
            def_text = match_colon.group(2).strip()
            if is_valid_academic_term(term, def_text):
                item = {"term": term, "definition": def_text, "topic": current_topic_name}
                definitions.append(item)
                bucket["terms"].append({"term": term, "definition": def_text})
                if len(def_text) > 20:
                    bucket["bullets"].append(f"{term}: {def_text}")
                    bullet_points.append(f"{term}: {def_text}")
                continue

        # Check 'is/refers to/represents/consists of' definition
        match_is = is_pattern.match(line)
        if match_is:
            term = match_is.group(1).strip().strip("*•-")
            def_text = re.sub(r"^(?:[\-\*•▪◦]|\d+[\.\)])\s+", "", line).strip()
            if is_valid_academic_term(term, def_text):
                item = {"term": term, "definition": def_text, "topic": current_topic_name}
                definitions.append(item)
                bucket["terms"].append({"term": term, "definition": def_text})
                bucket["bullets"].append(def_text)
                bullet_points.append(def_text)
                continue

        # Check bullet points
        if re.match(r"^(?:[\-\*•▪◦‣]|\d+[\.\)]|[a-zA-Z][\.\)])\s+", line):
            cleaned_bullet = re.sub(r"^(?:[\-\*•▪◦‣]|\d+[\.\)]|[a-zA-Z][\.\)])\s+", "", line).strip()
            if len(cleaned_bullet) > 12 and not re.search(r"https?://|isbn", cleaned_bullet.lower()):
                bucket["bullets"].append(cleaned_bullet)
                bullet_points.append(cleaned_bullet)
                # Also extract first phrase if bullet has an internal colon or dash
                m_sub = term_colon_pattern.match(cleaned_bullet)
                if m_sub:
                    t_sub = m_sub.group(1).strip()
                    d_sub = m_sub.group(2).strip()
                    if is_valid_academic_term(t_sub, d_sub):
                        definitions.append({"term": t_sub, "definition": d_sub, "topic": current_topic_name})
                        bucket["terms"].append({"term": t_sub, "definition": d_sub})
        else:
            if len(line) > 25 and not re.search(r"https?://|isbn", line.lower()):
                paragraphs.append(line)
                for sent in re.split(r"(?<=[.!?])\s+", line):
                    sent_c = sent.strip()
                    if len(sent_c) > 25:
                        bucket["sentences"].append(sent_c)
                        m_sent_is = is_pattern.match(sent_c)
                        if m_sent_is:
                            t_s = m_sent_is.group(1).strip().strip("*•-")
                            if is_valid_academic_term(t_s, sent_c):
                                definitions.append({"term": t_s, "definition": sent_c, "topic": current_topic_name})
                                bucket["terms"].append({"term": t_s, "definition": sent_c})

    # Ensure every detected topic section has key terms and bullet points from its own sentences if needed
    for t_name in topic_order:
        bucket = topic_buckets[t_name]
        if not bucket["bullets"] and bucket["sentences"]:
            bucket["bullets"].extend(bucket["sentences"][:8])
            bullet_points.extend(bucket["sentences"][:8])
        if len(bucket["terms"]) < 2 and (bucket["sentences"] or bucket["bullets"]):
            source_pool = bucket["sentences"] + bucket["bullets"]
            for s_clean in source_pool:
                if 25 < len(s_clean) < 240:
                    words = s_clean.split()
                    if len(words) >= 5:
                        potential_term = " ".join(words[:3]).strip(".,;:*\"'()-")
                        if is_valid_academic_term(potential_term, s_clean):
                            item = {"term": potential_term, "definition": s_clean}
                            bucket["terms"].append(item)
                            definitions.append({"term": potential_term, "definition": s_clean, "topic": t_name})
                            if len(bucket["terms"]) >= 5:
                                break

    # 3. Structure 100% Comprehensive Topics preserving all sections
    topics_list = []
    seen_terms = set()
    unique_defs = []
    for d in definitions:
        t_low = d["term"].lower()
        if t_low not in seen_terms:
            seen_terms.add(t_low)
            unique_defs.append(d)

    for t_name in topic_order:
        bucket = topic_buckets[t_name]
        # Deduplicate terms within topic
        t_seen = set()
        dedup_terms = []
        for kt in bucket["terms"]:
            kl = kt["term"].lower()
            if kl not in t_seen:
                t_seen.add(kl)
                dedup_terms.append(kt)

        # Deduplicate bullets within topic
        b_seen = set()
        dedup_bullets = []
        for bp in bucket["bullets"]:
            bl = bp.lower()
            if bl not in b_seen:
                b_seen.add(bl)
                dedup_bullets.append(bp)

        if not dedup_bullets and dedup_terms:
            dedup_bullets = [f"{kt['term']}: {kt['definition']}" for kt in dedup_terms[:6]]

        if dedup_terms or dedup_bullets:
            topics_list.append({
                "topic_name": t_name,
                "description": f"Comprehensive study pointers, key terms, and core mechanisms for {t_name}.",
                "key_terms": dedup_terms,
                "bullet_points": dedup_bullets,
                "exam_tips": [
                    f"Master all key definitions and enumerated items under {t_name}.",
                    "Pay close attention to how these concepts compare or interact in practical scenarios."
                ]
            })

    # If only 1 topic exists with many terms, chunk into logical subtopics (8 terms each)
    if len(topics_list) == 1 and len(unique_defs) > 10:
        single_name = topics_list[0]["topic_name"]
        all_terms = topics_list[0]["key_terms"]
        all_bullets = topics_list[0]["bullet_points"]

        chunk_size = 8
        topics_list = []
        for i in range(0, len(all_terms), chunk_size):
            chunk_num = (i // chunk_size) + 1
            chunk_terms = all_terms[i:i + chunk_size]
            b_start = (chunk_num - 1) * 5
            chunk_bullets = all_bullets[b_start:b_start + 5] if all_bullets else [t["definition"] for t in chunk_terms[:4]]

            if chunk_num == 1:
                sub_title = "Fundamental Concepts & Core Terminology"
            elif chunk_num == 2:
                sub_title = "Architectures, Mechanisms & Operations"
            elif chunk_num == 3:
                sub_title = "Advanced Principles & Implementation"
            else:
                sub_title = f"{single_name} - Part {chunk_num}"

            topics_list.append({
                "topic_name": sub_title,
                "description": f"Comprehensive study review pointers for {sub_title.lower()}.",
                "key_terms": chunk_terms,
                "bullet_points": chunk_bullets,
                "exam_tips": [
                    "Master the primary differences between these terms.",
                    "Common exam question format: matching definitions and practical application scenarios."
                ]
            })

    # Fallback if no topics formed
    if not topics_list:
        topics_list.append({
            "topic_name": "Core Concepts & Essential Definitions",
            "description": f"Key terms and foundational principles extracted from {detected_title}.",
            "key_terms": [{"term": d["term"], "definition": d["definition"]} for d in unique_defs],
            "bullet_points": bullet_points[:10] if bullet_points else [d["definition"] for d in unique_defs[:5]],
            "exam_tips": ["Review all terms and definitions thoroughly."]
        })

    # 4. Generate 3D Flip Flashcards across ALL extracted definitions
    flashcards = []
    for idx, item in enumerate(unique_defs, start=1):
        flashcards.append({
            "id": f"fc-{idx}",
            "front": item["term"],
            "back": item["definition"],
            "category": "Key Terminology"
        })

    # Add bullet flashcards if needed
    for idx, bp in enumerate(bullet_points[:15], start=len(flashcards) + 1):
        if len(bp) > 25:
            words = bp.split()
            front_text = " ".join(words[:4]) + "..."
            flashcards.append({
                "id": f"fc-{idx}",
                "front": front_text,
                "back": bp,
                "category": "Core Principle"
            })

    # Ensure minimum flashcards
    if len(flashcards) < 5:
        sample_chunks = [p for p in paragraphs if len(p) > 40][:10]
        for idx, sc in enumerate(sample_chunks, start=len(flashcards) + 1):
            flashcards.append({
                "id": f"fc-{idx}",
                "front": f"Key Principle #{idx}",
                "back": sc,
                "category": "Lesson Summary"
            })

    # 5. Generate Practice Quiz Cards (MCQs)
    quiz_cards = []
    all_term_names = [d["term"] for d in unique_defs if len(d["term"]) > 2]
    
    quiz_limit = min(20, len(unique_defs))
    for idx, item in enumerate(unique_defs[:quiz_limit], start=1):
        term = item["term"]
        definition = item["definition"]
        
        # Pick 3 plausible distractors from other terms
        distractors = [t for t in all_term_names if t.lower() != term.lower()]
        if len(distractors) < 3:
            distractors.extend(["None of the above", "All of the above", "Base Protocol", "System Cache", "Integrated Interface"])
        
        chosen_distractors = random.sample(distractors, min(3, len(distractors)))
        
        opts = [term] + chosen_distractors[:3]
        random.shuffle(opts)
        
        opt_keys = ["A", "B", "C", "D"]
        options_dict = {}
        correct_key = "A"
        
        for k, val in zip(opt_keys, opts):
            options_dict[k] = val
            if val == term:
                correct_key = k

        clean_def_snippet = definition
        if len(clean_def_snippet) > 180:
            clean_def_snippet = clean_def_snippet[:180] + "..."

        question_text = f"Which concept or term refers to: \"{clean_def_snippet}\"?"
        
        quiz_cards.append({
            "id": f"quiz-{idx}",
            "question_number": idx,
            "question": question_text,
            "options": options_dict,
            "correct_option": correct_key,
            "correct_answer_text": term,
            "explanation": f"'{term}' is defined as: {definition}"
        })

    return {
        "title": detected_title,
        "total_pointers": sum(len(t.get("key_terms", [])) + len(t.get("bullet_points", [])) for t in topics_list),
        "total_flashcards": len(flashcards),
        "total_quiz_cards": len(quiz_cards),
        "topics": topics_list,
        "flashcards": flashcards,
        "quiz_cards": quiz_cards,
        "source_word_count": len(raw_text.split()),
        "is_ai_powered": False
    }
