export interface ParsedQuestion {
  question_number: number;
  original_number?: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  explanation: string;
  key: string | null;
}

export interface ParseExamResult {
  title: string;
  questions: ParsedQuestion[];
  keys: Record<number, string>;
  total: number;
  keyCount: number;
  warnings: string[];
}

export function parseExamText(rawText: string): ParseExamResult {
  if (!rawText || !rawText.trim()) {
    return {
      title: "",
      questions: [],
      keys: {},
      total: 0,
      keyCount: 0,
      warnings: ["No text was provided."],
    };
  }

  const lines = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const warnings: string[] = [];

  // 1. Locate Answer Key section if present at the bottom
  let answerKeyStartIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (/^(?:answer\s*keys?|answers?|keys?|solutions?|correct\s*answers?)(?:\s*[:=-].*)?$/i.test(trimmed)) {
      answerKeyStartIndex = i;
      break;
    }
  }

  let questionsTextLines = lines;
  let keyTextLines: string[] = [];
  if (answerKeyStartIndex !== -1) {
    questionsTextLines = lines.slice(0, answerKeyStartIndex);
    keyTextLines = lines.slice(answerKeyStartIndex + 1);
  }

  // Parse Answer Keys from keyTextLines
  const parsedKeys: Record<number, string> = {};

  if (keyTextLines.length > 0) {
    let lastSeenNum = 0;
    const keyLines = keyTextLines.map((l) => l.trim()).filter(Boolean);

    for (const kLine of keyLines) {
      let chunks: string[] = [];
      if (kLine.includes("|") || kLine.includes(",")) {
        chunks = kLine.split(/\s*[|,]\s*/).map((c) => c.trim()).filter(Boolean);
      } else if (/\d+[.:\)-]+\s*[A-Da-d]/.test(kLine)) {
        chunks = kLine.split(/\s{2,}|\t+/).map((c) => c.trim()).filter(Boolean);
        if (chunks.length <= 1) {
          const allMatches = [...kLine.matchAll(/(\d+)[.:\)-]+\s*([A-Da-d])/g)];
          if (allMatches.length > 0) {
            allMatches.forEach((m) => {
              const num = parseInt(m[1], 10);
              const opt = m[2].toUpperCase();
              parsedKeys[num] = opt;
              lastSeenNum = Math.max(lastSeenNum, num);
            });
            continue;
          }
        }
      } else {
        chunks = [kLine];
      }

      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];

        // Format: "1. C" or "1: C" or "1 - C" or "1 C" or "1) C" or "Q1. C"
        const numMatch = chunk.match(/^(?:Q|Question|Item)?\s*(\d+)[.\s:)-]+([A-Da-d])$/i);
        if (numMatch) {
          const num = parseInt(numMatch[1], 10);
          const opt = numMatch[2].toUpperCase();
          parsedKeys[num] = opt;
          lastSeenNum = Math.max(lastSeenNum, num);
          continue;
        }

        // Format: Standalone letter e.g. "C" in "C | 2. B | 3. C" or "B | 12. B"
        const singleLetter = chunk.match(/^([A-Da-d])$/i);
        if (singleLetter) {
          const opt = singleLetter[1].toUpperCase();
          let assignedNum: number | null = null;
          if (ci + 1 < chunks.length) {
            const nextMatch = chunks[ci + 1].match(/^(?:Q|Question|Item)?\s*(\d+)[.\s:)-]+/i);
            if (nextMatch) {
              const nextNum = parseInt(nextMatch[1], 10);
              assignedNum = nextNum - 1;
            }
          }
          if (assignedNum === null || assignedNum <= 0) {
            assignedNum = lastSeenNum + 1;
          }
          parsedKeys[assignedNum] = opt;
          lastSeenNum = Math.max(lastSeenNum, assignedNum);
          continue;
        }
      }
    }
  }

  // 2. Parse Questions, Options, Inline Keys, Explanations, and Sections
  interface RawQuestionAcc {
    question_number: number;
    section: string;
    promptLines: string[];
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    explanation: string;
    key: string | null;
  }

  const rawQuestions: RawQuestionAcc[] = [];
  let currentQ: RawQuestionAcc | null = null;
  let currentChoice: "A" | "B" | "C" | "D" | null = null;
  let currentSectionHeader = "";
  let detectedTitle = "";

  const questionStartRegex = /^(?:(?:Question|Item|Q)\s*)?(?:\(?(\d+)\)?[.:\)-]|[\[\(](\d+)[\]\)])\s*(.*)$/i;
  const choiceRegex = /^(?:(?:\(([A-Da-d])\))|(?:\[([A-Da-d])\])|(?:([A-Da-d])[.)\-:]))\s*(.*)$/;
  const inlineKeyRegex = /^(?:Answer|Correct\s*Answer|Ans|Key)\s*[:=-]\s*([A-Da-d])/i;
  const explanationRegex = /^(?:Explanation|Rationale|Note)\s*[:=-]\s*(.*)$/i;

  for (let li = 0; li < questionsTextLines.length; li++) {
    const rawLine = questionsTextLines[li];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (currentQ && !currentChoice) {
        currentQ.promptLines.push("");
      }
      continue;
    }

    // Check for Section / Part headers (e.g. "Part 1: Database Administration and Security (05 Handout 1)")
    if (/^(?:Part|Section|Module|Chapter)\s+([A-Z0-9]+)[:\s-]*(.*)$/i.test(trimmed)) {
      currentSectionHeader = trimmed;
      if (!detectedTitle) {
        const m = trimmed.match(/^(?:Part|Section|Module|Chapter)\s+[A-Z0-9]+[:\s-]*(.+)$/i);
        if (m && m[1]) {
          detectedTitle = m[1].trim();
        } else {
          detectedTitle = trimmed;
        }
      }
      continue;
    }

    // Check if line before first question is a title
    if (!currentQ && rawQuestions.length === 0 && !detectedTitle) {
      if (/^(?:Title|Exam|Quiz|Reviewer)\s*[:=-]\s*(.+)$/i.test(trimmed)) {
        detectedTitle = trimmed.replace(/^(?:Title|Exam|Quiz|Reviewer)\s*[:=-]\s*/i, "").trim();
        continue;
      }
    }

    // Check for Question start
    const qStartMatch = trimmed.match(questionStartRegex);
    if (qStartMatch) {
      if (currentQ) {
        rawQuestions.push(currentQ);
      }
      const qNum = parseInt(qStartMatch[1] || qStartMatch[2], 10);
      currentQ = {
        question_number: qNum,
        section: currentSectionHeader,
        promptLines: [qStartMatch[3] || ""],
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        explanation: "",
        key: null,
      };
      currentChoice = null;
      continue;
    }

    // If inside a question:
    if (currentQ) {
      // Check for choice line
      const choiceMatch = trimmed.match(choiceRegex);
      if (choiceMatch) {
        const letter = (choiceMatch[1] || choiceMatch[2] || choiceMatch[3]).toUpperCase() as "A" | "B" | "C" | "D";
        currentChoice = letter;
        const text = (choiceMatch[4] || "").trim();
        if (letter === "A") currentQ.option_a = text;
        else if (letter === "B") currentQ.option_b = text;
        else if (letter === "C") currentQ.option_c = text;
        else if (letter === "D") currentQ.option_d = text;
        continue;
      }

      // Check for inline answer key
      const inlineKeyMatch = trimmed.match(inlineKeyRegex);
      if (inlineKeyMatch) {
        currentQ.key = inlineKeyMatch[1].toUpperCase();
        continue;
      }

      // Check for explanation
      const expMatch = trimmed.match(explanationRegex);
      if (expMatch) {
        currentQ.explanation = expMatch[1].trim();
        continue;
      }

      // Continuation line
      if (currentChoice) {
        if (currentChoice === "A") currentQ.option_a += (currentQ.option_a ? " " : "") + trimmed;
        else if (currentChoice === "B") currentQ.option_b += (currentQ.option_b ? " " : "") + trimmed;
        else if (currentChoice === "C") currentQ.option_c += (currentQ.option_c ? " " : "") + trimmed;
        else if (currentChoice === "D") currentQ.option_d += (currentQ.option_d ? " " : "") + trimmed;
      } else {
        currentQ.promptLines.push(trimmed);
      }
    }
  }

  if (currentQ) {
    rawQuestions.push(currentQ);
  }

  if (rawQuestions.length === 0) {
    warnings.push("Could not detect any numbered questions. Make sure questions start with '1.', '2.', etc.");
  }

  // Format final questions with 1-based sequential normalization
  const finalQuestions: ParsedQuestion[] = rawQuestions.map((q, idx) => {
    const qNum = q.question_number || idx + 1;
    const finalKey = q.key || parsedKeys[qNum] || parsedKeys[idx + 1] || null;
    return {
      question_number: idx + 1,
      original_number: qNum,
      question_text: q.promptLines.join("\n").trim(),
      option_a: q.option_a.trim(),
      option_b: q.option_b.trim(),
      option_c: q.option_c.trim(),
      option_d: q.option_d.trim(),
      explanation: q.explanation || (q.section ? `Topic: ${q.section}` : ""),
      key: finalKey,
    };
  });

  const normalizedKeys: Record<number, string> = {};
  finalQuestions.forEach((q) => {
    if (q.key) {
      normalizedKeys[q.question_number] = q.key;
    } else if (parsedKeys[q.question_number]) {
      normalizedKeys[q.question_number] = parsedKeys[q.question_number];
      q.key = parsedKeys[q.question_number];
    }
  });

  // Check for questions missing keys
  const missingKeys = finalQuestions.filter((q) => !q.key).map((q) => q.question_number);
  if (missingKeys.length > 0 && missingKeys.length < finalQuestions.length) {
    warnings.push(`Questions missing answer key: ${missingKeys.slice(0, 5).join(", ")}${missingKeys.length > 5 ? "..." : ""}`);
  } else if (missingKeys.length === finalQuestions.length) {
    warnings.push("No answer keys were found in the text. You can still import questions and select keys in the builder.");
  }

  return {
    title: detectedTitle || "Imported Questionnaire",
    questions: finalQuestions,
    keys: normalizedKeys,
    total: finalQuestions.length,
    keyCount: Object.keys(normalizedKeys).length,
    warnings,
  };
}

