"""
Google Gemini AI Service for Evalo.
Provides high-speed, zero-cost AI generation of:
1. Teacher Exam Questionnaires from Handouts (questions, options A/B/C/D, answer keys, explanations)
2. Student Handout Reviewer Decks (topics, key pointers, 3D flashcards, quiz practice)
Includes automatic fallback to local heuristic parsing if the API key is unavailable or throttled.
"""

import os
import re
import json
import random
import logging
import urllib.request
import urllib.error
from typing import Dict, List, Any, Optional

from app.config import get_settings
from app.reviewer_generator import distill_handout_text

logger = logging.getLogger("evalo.gemini")

def get_gemini_api_key() -> str:
    """Retrieve Gemini API key from environment or settings."""
    env_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if env_key:
        return env_key
    try:
        from dotenv import load_dotenv
        load_dotenv()
        env_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if env_key:
            return env_key
    except Exception:
        pass
    settings = get_settings()
    return getattr(settings, "GEMINI_API_KEY", "").strip()


def call_gemini_json(
    prompt: str,
    system_instruction: Optional[str] = None,
    max_output_tokens: int = 32768,
) -> Optional[Dict[str, Any]]:
    """
    Calls Google Gemini API requesting strict JSON output.
    Tries high-capacity Gemini Flash models first with large output token limits.
    """
    key = get_gemini_api_key()
    if not key:
        logger.warning("No GEMINI_API_KEY available. Falling back to local parser.")
        return None

    models_to_try = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-flash-latest",
        "gemini-2.5-flash-lite",
        "gemini-flash-lite-latest",
    ]

    def _build_payload(token_limit: int) -> bytes:
        payload: Dict[str, Any] = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
                "maxOutputTokens": token_limit,
            }
        }
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }
        return json.dumps(payload).encode("utf-8")

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        token_limits = [max_output_tokens, 8192] if max_output_tokens > 8192 else [max_output_tokens]

        for token_limit in token_limits:
            req = urllib.request.Request(
                url,
                data=_build_payload(token_limit),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            try:
                with urllib.request.urlopen(req, timeout=90) as resp:
                    raw_bytes = resp.read()
                    data = json.loads(raw_bytes.decode("utf-8"))
                    candidates = data.get("candidates", [])
                    if not candidates:
                        break
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if not parts:
                        break
                    content_text = parts[0].get("text", "").strip()
                    # Remove any markdown code fence if present
                    if content_text.startswith("```json"):
                        content_text = content_text[7:]
                    if content_text.startswith("```"):
                        content_text = content_text[3:]
                    if content_text.endswith("```"):
                        content_text = content_text[:-3]
                    parsed = json.loads(content_text.strip())
                    return parsed
            except urllib.error.HTTPError as e:
                err_body = ""
                try:
                    err_body = e.read().decode("utf-8")
                except Exception:
                    pass
                logger.warning(f"Gemini API model {model} (maxTokens={token_limit}) HTTP {e.code}: {err_body}")
                if e.code == 400 and token_limit > 8192:
                    # Retry same model with 8192 maxOutputTokens if 32768 was rejected
                    continue
                break
            except Exception as e:
                logger.warning(f"Gemini API model {model} call error: {str(e)}")
                break

    return None


def generate_exam_from_handout(
    raw_text: str,
    question_count: int = 10,
    custom_title: Optional[str] = None,
    include_scenarios: bool = True,
    custom_instructions: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generates a teacher exam questionnaire directly from handout text.
    Returns:
    - title: str
    - total_questions: int
    - answer_keys: list of { question_number: int, correct_option: 'A'|'B'|'C'|'D' }
    - questions: list of { question_number: int, question_text: str, option_a: str, option_b: str, option_c: str, option_d: str, explanation: str }
    """
    distilled = distill_handout_text(raw_text)
    source_text = distilled if (distilled and len(distilled) > 100) else raw_text
    
    # Cap source text if extremely long to fit within fast token window
    if len(source_text) > 120000:
        source_text = source_text[:120000]

    system_prompt = (
        "You are an expert college test creator and curriculum assessor at a Philippine higher education institution (such as STI College). "
        "Your role is to formulate official, high-standard midterm/final multiple-choice examination questionnaires based on lesson handouts and syllabi. "
        "You create balanced, academically sound exams matching Philippine college standards (prelim, midterm, finals): "
        "clear, natural English questions without gimmicky prefixes, and 4 well-structured options (A, B, C, D)."
    )

    if include_scenarios:
        style_instruction = (
            "1. QUESTION STYLE & BALANCE:\n"
            "   - Provide a balanced mix of:\n"
            "     * 50% Conceptual & Definition understanding: Paraphrase concepts clearly into natural, grammatically complete test questions (e.g. \"Which of the following describes the primary purpose of...\", \"What distinguishes...\", \"Which protocol is responsible for...\"). DO NOT copy-paste raw definitions with quotation marks or broken fragments.\n"
            "     * 50% Situational & Application Questions: Present a practical computing, workplace, or system problem scenario where the student must apply a concept from the handout (e.g. \"An IT specialist is designing a company network across three remote branches...\", \"A developer notices that an API request fails with code 403...\", \"In a banking database, suppose a power outage occurs while transferring funds...\").\n"
            "   - CRITICAL RULE ON SCENARIOS: NEVER prefix any question with \"Scenario:\", \"Case Study:\", or \"Situation:\". State the context or problem directly and naturally as the question stem."
        )
    else:
        style_instruction = (
            "1. QUESTION STYLE (100% DIRECT CONCEPTUAL & DEFINITIONS):\n"
            "   - Formulate 100% direct conceptual, definition, function, and principle-based questions based strictly on the handout.\n"
            "   - DO NOT include lengthy situational scenarios, hypothetical company case studies, or story setups.\n"
            "   - Ask clear, direct academic questions (e.g. \"Which of the following best defines...\", \"What is the primary function of...\", \"Which protocol operates at...\", \"Which property guarantees...\").\n"
            "   - DO NOT prefix any question with \"Scenario:\" or \"Case Study:\"."
        )

    teacher_custom_block = ""
    if custom_instructions and custom_instructions.strip():
        teacher_custom_block = f"""
TEACHER'S CUSTOM PROMPT & INSTRUCTIONS:
\"\"\"{custom_instructions.strip()}\"\"\"
You MUST strictly incorporate and prioritize the teacher's custom instructions above (e.g., specific topics to emphasize, difficulty level, focus areas) while maintaining valid JSON structure.
"""

    user_prompt = f"""
Analyze the following course handout / lesson notes:
---
{source_text}
---

Generate an official college examination consisting of exactly {question_count} high-quality multiple choice questions.

Follow these strict STI College Examination standards:
{style_instruction}
2. FOUR COMPLETE & BALANCED CHOICES (Option A, Option B, Option C, Option D):
   - Every single option MUST be a full, grammatically parallel, realistic term or phrase from the same domain.
   - NEVER output incomplete words, missing characters, ellipses ("..."), or random unrelated text.
   - The 3 distractors (wrong choices) must be real, plausible alternatives that a student studying this subject would consider (e.g. other related protocols, ACID properties, OOP pillars, or architectural models).
   - Randomly distribute correct answer keys across A, B, C, and D.
3. EXPLANATIONS:
   - Provide a clear, educational explanation for why the correct option is right and how it applies to the concept.
4. EXAM TITLE:
   - Generate a concise, professional title based on the handout's topic (e.g. "Advance Database Systems - Transactions & Normalization", "Object-Oriented Programming Prelim Exam").
5. STRICT EXCLUSIONS:
   - DO NOT create questions about references, bibliographies, book publishers, citations, or course syllabus metadata.
   - Every question must be complete, fluent, and test legitimate academic knowledge from the handout.
{teacher_custom_block}
Return ONLY a valid JSON object matching this schema:
{{
  "title": "Clean Subject & Topic Title",
  "questions": [
    {{
      "question_number": 1,
      "question_text": "Complete, grammatically fluent question?",
      "option_a": "First plausible choice",
      "option_b": "Second plausible choice",
      "option_c": "Third plausible choice",
      "option_d": "Fourth plausible choice",
      "correct_option": "A",
      "explanation": "Clear explanation of why this answer is correct."
    }}
  ]
}}
"""

    gemini_result = call_gemini_json(user_prompt, system_instruction=system_prompt)

    if gemini_result and "questions" in gemini_result and len(gemini_result["questions"]) > 0:
        raw_questions = gemini_result["questions"]
        formatted_questions = []
        formatted_keys = []
        
        for idx, q in enumerate(raw_questions[:question_count], start=1):
            c_opt = str(q.get("correct_option", "A")).strip().upper()
            if c_opt not in ("A", "B", "C", "D"):
                c_opt = "A"

            formatted_questions.append({
                "question_number": idx,
                "question_text": q.get("question_text", f"Question #{idx}"),
                "option_a": q.get("option_a", "Option A"),
                "option_b": q.get("option_b", "Option B"),
                "option_c": q.get("option_c", "Option C"),
                "option_d": q.get("option_d", "Option D"),
                "explanation": q.get("explanation", ""),
            })

            formatted_keys.append({
                "question_number": idx,
                "correct_option": c_opt,
            })

        final_title = custom_title or gemini_result.get("title") or "Class Exam from Handout"
        return {
            "title": final_title,
            "total_questions": len(formatted_questions),
            "answer_keys": formatted_keys,
            "questions": formatted_questions,
            "is_ai_generated": True,
        }

    # Fallback to local heuristic question generator
    logger.info("Using local fallback generator for exam questions.")
    return fallback_generate_exam_from_text(source_text, question_count=question_count, custom_title=custom_title)


def fallback_generate_exam_from_text(
    raw_text: str,
    question_count: int = 10,
    custom_title: Optional[str] = None
) -> Dict[str, Any]:
    """
    Local algorithmic generator if Gemini is offline or rate-limited.
    Extracts real academic concepts and definitions, strictly rejecting
    header noise, syllabus boilerplate, or broken word fragments.
    """
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    title = custom_title or (lines[0] if lines and len(lines[0]) < 70 else "Handout Quiz")
    title = re.sub(r"^[#\*\-=\s]+", "", title).strip()

    junk_words = {
        "handout", "module", "chapter", "page", "example", "examples",
        "figure", "table", "note", "sti", "course", "section", "lecture",
        "unit", "exercise", "lesson", "objective", "objectives", "property of sti"
    }
    invalid_edges = {
        "in", "of", "to", "for", "is", "are", "was", "were", "helps", "determine",
        "at", "on", "by", "with", "from", "the", "a", "an", "and", "or", "as",
        "such", "each", "which", "this", "that", "these", "those"
    }

    def is_valid_concept_term(t: str) -> bool:
        if not t or len(t.strip()) < 3 or len(t.split()) > 5:
            return False
        clean = re.sub(r"^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$", "", t).strip()
        lower = clean.lower()
        words = lower.split()
        if not words:
            return False
        if any(jw in lower for jw in junk_words):
            return False
        if words[-1] in invalid_edges or words[0] in invalid_edges:
            return False
        return True

    term_pattern = re.compile(r"^([A-Z0-9][A-Za-z0-9\s\-_/()]{2,45})\s*[:\-–—]\s*(.+)$")
    verb_pattern = re.compile(r"^([A-Z][A-Za-z0-9\s\-_]{2,35})\s+(?:is defined as|refers to|is a process that|is a mechanism that|is used to|consists of)\s+(.+)$", re.IGNORECASE)

    defs: List[Dict[str, str]] = []

    for line in lines:
        m = term_pattern.match(line)
        if m:
            t = m.group(1).strip()
            d = m.group(2).strip()
            if is_valid_concept_term(t) and len(d) > 10:
                defs.append({"term": t, "definition": d})
                continue

        m_verb = verb_pattern.match(line)
        if m_verb:
            t = m_verb.group(1).strip()
            d = m_verb.group(2).strip()
            if is_valid_concept_term(t) and len(d) > 10:
                defs.append({"term": t, "definition": d})

    # High quality academic fallback distractors for computer science & IT
    domain_distractors = [
        "Identity and Access Management",
        "Cloud Security Posture",
        "Virtual Private Cloud",
        "Role-Based Access Control",
        "Data Encryption Standard",
        "Database Normalization",
        "Referential Integrity",
        "Software Development Lifecycle",
        "Multi-Factor Authentication",
        "Object-Oriented Design Pattern",
        "Fault Tolerance Architecture",
        "Network Protocol Stack",
        "Application Programming Interface",
        "Distributed System Concurrency",
    ]

    all_terms = [d["term"] for d in defs]
    questions = []
    answer_keys = []

    for idx, item in enumerate(defs[:question_count], start=1):
        term = item["term"]
        definition = item["definition"]

        distractors = [t for t in all_terms if t.lower() != term.lower()]
        for dd in domain_distractors:
            if len(distractors) >= 4:
                break
            if dd.lower() != term.lower() and dd not in distractors:
                distractors.append(dd)

        chosen = random.sample(distractors, min(3, len(distractors)))
        opts = [term] + chosen[:3]
        random.shuffle(opts)

        keys_map = ["A", "B", "C", "D"]
        correct_key = "A"
        opts_dict = {}
        for k, val in zip(keys_map, opts):
            opts_dict[f"option_{k.lower()}"] = val
            if val == term:
                correct_key = k

        clean_def = definition.strip().rstrip(".,;:")
        if len(clean_def) > 200:
            sub_sentences = re.split(r"(?<=[.!?])\s+", clean_def)
            clean_def = sub_sentences[0] if sub_sentences else clean_def[:200]

        q_text = f"Which concept or term is described as: \"{clean_def}\"?"

        questions.append({
            "question_number": idx,
            "question_text": q_text,
            "option_a": opts_dict.get("option_a", "Option A"),
            "option_b": opts_dict.get("option_b", "Option B"),
            "option_c": opts_dict.get("option_c", "Option C"),
            "option_d": opts_dict.get("option_d", "Option D"),
            "explanation": f"'{term}' is defined as: {clean_def}",
        })

        answer_keys.append({
            "question_number": idx,
            "correct_option": correct_key,
        })

    return {
        "title": title,
        "total_questions": len(questions),
        "answer_keys": answer_keys,
        "questions": questions,
        "is_ai_generated": False,
        "fallback_reason": "Gemini AI was not reachable or GEMINI_API_KEY is not configured on the backend.",
    }


def generate_reviewer_deck_gemini(raw_text: str, custom_title: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Uses Gemini to generate an enriched, 100% comprehensive student study reviewer deck:
    - Grouped topics covering every major section/chapter across the entire handout
    - Complete key terms and definitions
    - In-depth bullet pointers and exam tips
    - 3D Flip Flashcards spanning all topics evenly from start to finish
    - Interactive practice quiz cards with explanations
    - Strictly excludes references, bibliographies, citations, and incomplete fragments.
    Returns None if Gemini is unavailable, allowing caller to use local parser.
    """
    key = get_gemini_api_key()
    if not key:
        return None

    distilled = distill_handout_text(raw_text)
    source_text = distilled if (distilled and len(distilled) > 100) else raw_text
    # Support full documents up to 120,000 characters without early truncation
    if len(source_text) > 120000:
        source_text = source_text[:120000]

    system_instruction = (
        "You are an expert university curriculum assessor and academic reviewer specialist. "
        "Your mission is to generate an exhaustive, line-by-line, section-by-section student study reviewer "
        "that captures 100% of the important topics, subtopics, enumerations, characteristics, architectures, "
        "step-by-step processes, schemas, formulas, and comparisons from the lesson handout without omitting "
        "any section from start to finish. You strictly exclude only end-of-document bibliographies/reference citation lists."
    )

    clean_deck_title = custom_title or "Comprehensive Handout Study Reviewer"

    prompt = f"""
Analyze the following complete course handout / lecture notes sequentially from the very first line to the very last line:
---
{source_text}
---

Generate an EXHAUSTIVE, 100% COMPLETE academic study reviewer deck based strictly on the handout provided above.
Students rely on this reviewer as their primary study material for exams—DO NOT skip, compress, or gloss over any topic or sub-topic in the handout!

CRITICAL COVERAGE REQUIREMENTS:
1. EXHAUSTIVE SECTION-BY-SECTION & SUBTOPIC EXTRACTION (ZERO OMISSIONS):
   - Walk through the handout sequentially from beginning to end.
   - Create a dedicated Topic Module (`topics` item) for EVERY major heading, sub-heading, conceptual group, architecture/component breakdown, classification/type list, step-by-step workflow/process, schema/model type, and comparison table in the handout.
   - Do NOT merge distinct sections together just to keep the topic count small. Generate as many topic modules as needed to represent every section in the handout (typically 5 to 15 topic modules depending on handout length).
   - Never stop halfway or summarize only the first few pages.

2. 100% COMPLETE ENUMERATIONS, LISTS, ARCHITECTURES & COMPARISONS:
   - Whenever the handout presents a list or enumeration (e.g., "4 Characteristics of a Data Warehouse", "Types of ...", "Components/Layers of Architecture", "Steps/Phases in ETL", "Database Schemas: Star, Snowflake, Fact Constellation", "OLTP vs. OLAP", "Advantages & Disadvantages"), you MUST include EVERY SINGLE ITEM from that list!
   - Never include only 2 out of 4 characteristics or 3 out of 6 components. Every enumerated item must appear in `key_terms` (with its full explanation/definition and examples from the handout) AND be thoroughly explained in `bullet_points`.
   - If the handout contains diagrams, layers, or tables (e.g., Data Sources -> Staging Area -> Warehouse -> Data Marts -> Users, or comparison tables), extract every layer, box, and comparison row into `key_terms` and `bullet_points`.

3. RICH DEPTH PER TOPIC MODULE:
   - Each topic module must contain ALL key terms/concepts introduced in that section (`key_terms`: typically 4 to 12 items per topic) with complete, detailed definitions (2–3 sentences or full explanation including examples when provided in the handout).
   - Each topic module must contain comprehensive `bullet_points` (typically 4 to 10 detailed takeaway points per topic) explaining rules, distinctions, mechanisms, use cases, and cause-and-effect relationships.
   - Include 2 to 3 specific, actionable `exam_tips` per topic highlighting common exam traps, distinctions to memorize, or scenario cues.

4. STRICT EXCLUSIONS (WHAT NOT TO INCLUDE):
   - DO NOT include end-of-document bibliographies, textbook reference citations, works cited, external web URLs, or ISBNs.
   - Note: Technical terms that naturally contain the word "Reference" or "Source" (such as "Referential Integrity", "Reference Data", "OSI Reference Model", "Data Sources", "Source Systems") ARE valid academic concepts and MUST be included!

REQUIRED OUTPUT STRUCTURE (Valid JSON):
{{
  "title": "{clean_deck_title}",
  "topics": [
    {{
      "topic_name": "Clear, specific section/topic title matching the handout's progression",
      "description": "Comprehensive 2-sentence overview of what this topic module covers and why it matters",
      "key_terms": [
        {{ "term": "Exact Term, Characteristic, Component, or Step Name", "definition": "Complete, rigorous definition and explanation including key details/examples from the handout" }}
      ],
      "bullet_points": [
        "Detailed takeaway point explaining a core rule, mechanism, comparison, or sub-concept from this section"
      ],
      "exam_tips": [
        "High-yield exam tip pointing out how this concept is tested or how to distinguish it from similar terms"
      ]
    }}
  ],
  "flashcards": [
    {{
      "id": "fc-1",
      "front": "Exact, Complete Term, Characteristic, Component, or Concept Name (NEVER a question, pronoun like 'It', or truncated fragment)",
      "back": "Complete, comprehensive definition, rule, or explanation matching the study pointers",
      "category": "Specific Topic Name or Key Terminology"
    }}
  ],
  "quiz_cards": [
    {{
      "id": "quiz-1",
      "question_number": 1,
      "question": "Clear, complete exam-grade question stem (definition, distinction, or practical scenario) testing understanding",
      "options": {{
        "A": "First complete, accurate choice (never a single pronoun or cut-off fragment)",
        "B": "Second complete, accurate choice",
        "C": "Third complete, accurate choice",
        "D": "Fourth complete, accurate choice"
      }},
      "correct_option": "A",
      "correct_answer_text": "Exact matching text of the correct option",
      "explanation": "Clear explanation of why this answer is correct and why the distractors do not fit"
    }}
  ]
}}

Generate:
- topics: 5 to 15 topic modules covering EVERY section, subtopic, enumeration, architecture, process, and comparison in the handout from start to finish.
- flashcards: 25 to 45 flashcards covering ALL key terms across ALL topic modules. Every flashcard `front` MUST be the complete Term/Concept Name and `back` MUST be its complete definition.
- quiz_cards: 15 to 25 practice questions spanning ALL topic modules across the entire handout with 4 complete, accurate options each.

Return ONLY a valid JSON object matching this schema.
"""

    result = call_gemini_json(prompt, system_instruction=system_instruction, max_output_tokens=32768)
    if result and "topics" in result and "flashcards" in result and "quiz_cards" in result:
        # Post-filter out only actual bibliography/reference citation sections (do NOT drop academic terms containing "reference" or "source")
        exact_bad_topics = {
            "references", "reference list", "bibliography", "works cited",
            "suggested reading", "suggested readings", "further reading",
            "further readings", "reading list", "textbook references",
            "online references", "acknowledgments", "acknowledgements",
        }
        citation_url_re = re.compile(r"https?://|www\.|\bisbn[\s:\-]*\d|\bdoi\s*:|\bretrieved\s+from\b", re.IGNORECASE)

        cleaned_topics = []
        for t in result.get("topics", []):
            name_clean = re.sub(r"[^a-z\s]", "", (t.get("topic_name") or "").lower()).strip()
            if name_clean in exact_bad_topics:
                continue

            # Filter terms inside topic
            clean_terms = []
            for item in t.get("key_terms", []):
                t_name = (item.get("term") or "").strip()
                t_def = (item.get("definition") or "").strip()
                if not t_name or not t_def:
                    continue
                t_name_clean = re.sub(r"[^a-z\s]", "", t_name.lower()).strip()
                if t_name_clean in exact_bad_topics or citation_url_re.search(t_def):
                    continue
                clean_terms.append(item)
            t["key_terms"] = clean_terms

            # Filter bullets inside topic
            clean_bullets = []
            for b in t.get("bullet_points", []):
                b_str = (b or "").strip()
                if b_str and not citation_url_re.search(b_str):
                    clean_bullets.append(b_str)
            t["bullet_points"] = clean_bullets

            if t["key_terms"] or t["bullet_points"]:
                cleaned_topics.append(t)

        result["topics"] = cleaned_topics

        # Filter flashcards
        clean_flashcards = []
        for fc in result.get("flashcards", []):
            front = (fc.get("front") or "").strip()
            back = (fc.get("back") or "").strip()
            if not front or not back:
                continue
            front_clean = re.sub(r"[^a-z\s]", "", front.lower()).strip()
            if front_clean in exact_bad_topics or citation_url_re.search(back):
                continue
            clean_flashcards.append(fc)
        result["flashcards"] = clean_flashcards

        # Filter quiz cards
        clean_quizzes = []
        for q in result.get("quiz_cards", []):
            q_text = (q.get("question") or "").strip()
            if not q_text or citation_url_re.search(q_text):
                continue
            clean_quizzes.append(q)
        result["quiz_cards"] = clean_quizzes

        result["total_pointers"] = sum(len(t.get("key_terms", [])) + len(t.get("bullet_points", [])) for t in result.get("topics", []))
        result["total_flashcards"] = len(result.get("flashcards", []))
        result["total_quiz_cards"] = len(result.get("quiz_cards", []))
        result["source_word_count"] = len(raw_text.split())
        result["is_ai_powered"] = True
        try:
            from app.reviewer_generator import clean_and_repair_deck
            result = clean_and_repair_deck(result)
        except Exception:
            pass
        return result

    return None
