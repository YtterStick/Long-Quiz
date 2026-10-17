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


def call_gemini_json(prompt: str, system_instruction: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Calls Google Gemini API requesting strict JSON output.
    Tries gemini-flash-latest first, then gemini-3.8-flash.
    """
    key = get_gemini_api_key()
    if not key:
        logger.warning("No GEMINI_API_KEY available. Falling back to local parser.")
        return None

    models_to_try = ["gemini-flash-latest", "gemini-3.8-flash"]
    payload: Dict[str, Any] = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.3,
        }
    }

    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }

    encoded_data = json.dumps(payload).encode("utf-8")

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        req = urllib.request.Request(
            url,
            data=encoded_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=35) as resp:
                raw_bytes = resp.read()
                data = json.loads(raw_bytes.decode("utf-8"))
                candidates = data.get("candidates", [])
                if not candidates:
                    continue
                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts:
                    continue
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
            logger.warning(f"Gemini API model {model} HTTP {e.code}: {err_body}")
            continue
        except Exception as e:
            logger.warning(f"Gemini API model {model} call error: {str(e)}")
            continue

    return None


def generate_exam_from_handout(
    raw_text: str,
    question_count: int = 10,
    custom_title: Optional[str] = None
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
    if len(source_text) > 40000:
        source_text = source_text[:40000]

    system_prompt = (
        "You are an expert college test creator and curriculum assessor at a Philippine higher education institution (such as STI College). "
        "Your role is to formulate official, high-standard midterm/final multiple-choice examination questionnaires based on lesson handouts and syllabi. "
        "You create balanced, academically sound exams matching Philippine college standards (prelim, midterm, finals): "
        "clear, natural English questions, realistic situational application scenarios, and 4 well-structured options (A, B, C, D)."
    )

    user_prompt = f"""
Analyze the following course handout / lesson notes:
---
{source_text}
---

Generate an official college examination consisting of exactly {question_count} high-quality multiple choice questions.

Follow these strict STI College Examination standards:
1. QUESTION STYLE & BALANCE:
   - Provide a natural mix of:
     * 50% Conceptual & Definition understanding: Paraphrase concepts clearly into natural, grammatically complete test questions (e.g. "Which of the following describes the primary purpose of...", "What distinguishes...", "Which protocol is responsible for..."). DO NOT copy-paste raw definitions with quotation marks or broken sentence fragments.
     * 50% Situational & Scenario-Based Questions: Present a practical computing, programming, or workplace scenario where the student must apply a concept from the handout (e.g. "Scenario: An IT specialist is designing a company network across three remote branches...", "A developer notices that...", "In a banking database, suppose a power outage occurs while transferring funds...").
2. FOUR COMPLETE & BALANCED CHOICES (Option A, Option B, Option C, Option D):
   - Every single option MUST be a full, grammatically parallel, realistic term or phrase from the same domain.
   - NEVER output incomplete words, missing characters, ellipses ("..."), or random unrelated text.
   - The 3 distractors (wrong choices) must be real, plausible alternatives that a student studying this subject would consider (e.g. other related protocols, ACID properties, OOP pillars, or architectural models).
   - Randomly distribute correct answer keys across A, B, C, and D.
3. EXPLANATIONS:
   - Provide a clear, educational explanation for why the correct option is right and how it applies to the concept or scenario.
4. EXAM TITLE:
   - Generate a concise, professional title based on the handout's topic (e.g. "Advance Database Systems - Transactions & Normalization", "Object-Oriented Programming Prelim Exam").

Return ONLY a valid JSON object matching this schema:
{{
  "title": "Clean Subject & Topic Title",
  "questions": [
    {{
      "question_number": 1,
      "question_text": "Complete, grammatically fluent question or situational scenario?",
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
    Uses Gemini to generate an enriched student study reviewer deck:
    - Grouped topics with key terms and exam pointers
    - 3D Flip Flashcards
    - Interactive practice quiz cards with explanations
    Returns None if Gemini is unavailable, allowing caller to use local parser.
    """
    key = get_gemini_api_key()
    if not key:
        return None

    distilled = distill_handout_text(raw_text)
    source_text = distilled if (distilled and len(distilled) > 100) else raw_text
    if len(source_text) > 40000:
        source_text = source_text[:40000]

    prompt = f"""
Analyze this student study handout / lecture notes:
---
{source_text}
---

Generate an interactive, comprehensive student study reviewer deck with:
1. title: Clean descriptive subject / module title.
2. topics: List of 2 to 4 major topic modules. Each topic must have:
   - topic_name: string
   - description: string
   - key_terms: list of {{ "term": string, "definition": string }}
   - bullet_points: list of key takeaway summary bullet strings
   - exam_tips: list of practical exam advice strings
3. flashcards: 10 to 20 flashcards with:
   - id: string ("fc-1", "fc-2", ...)
   - front: Term or core concept (keep concise)
   - back: Definition, formula, or clear explanation
   - category: string ("Key Terminology", "Concept", "Formula")
4. quiz_cards: 10 to 15 practice multiple-choice questions with:
   - id: string ("quiz-1", "quiz-2", ...)
   - question_number: int
   - question: string
   - options: {{ "A": string, "B": string, "C": string, "D": string }}
   - correct_option: "A" | "B" | "C" | "D"
   - correct_answer_text: string
   - explanation: string explaining why this is correct

Return ONLY a valid JSON object matching this schema.
"""

    result = call_gemini_json(prompt, system_instruction="You are a dedicated university academic tutor creating high-retention study flashcards and review materials.")
    if result and "topics" in result and "flashcards" in result and "quiz_cards" in result:
        result["total_pointers"] = sum(len(t.get("key_terms", [])) + len(t.get("bullet_points", [])) for t in result.get("topics", []))
        result["total_flashcards"] = len(result.get("flashcards", []))
        result["total_quiz_cards"] = len(result.get("quiz_cards", []))
        result["source_word_count"] = len(raw_text.split())
        result["is_ai_powered"] = True
        return result

    return None
