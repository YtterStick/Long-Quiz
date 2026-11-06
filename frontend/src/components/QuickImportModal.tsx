"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  FileText,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ClipboardList,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { parseExamText, ParsedQuestion, ParseExamResult } from "@/lib/examTextParser";

interface QuickImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (result: {
    title: string;
    total: number;
    questions: Array<{
      question_number: number;
      question_text: string;
      option_a: string;
      option_b: string;
      option_c: string;
      option_d: string;
      explanation: string;
    }>;
    keys: Record<number, string>;
  }) => void;
  initialTitle?: string;
  contextName?: string; // e.g. "Builder" or "Questionnaire"
  currentQuestionCount?: number;
}

export function QuickImportModal({
  isOpen,
  onClose,
  onImport,
  initialTitle = "",
  contextName = "Builder",
  currentQuestionCount = 50,
}: QuickImportModalProps) {
  const [rawText, setRawText] = useState("");
  const [applyTitle, setApplyTitle] = useState(true);
  const [adjustTotal, setAdjustTotal] = useState(true);
  const [showPreviewList, setShowPreviewList] = useState(true);

  // Parse on text change
  const parseResult: ParseExamResult = useMemo(() => {
    return parseExamText(rawText);
  }, [rawText]);

  useEffect(() => {
    if (isOpen) {
      setApplyTitle(true);
      setAdjustTotal(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (parseResult.total === 0) return;

    const finalTitle = applyTitle && parseResult.title ? parseResult.title : initialTitle;
    const finalTotal = adjustTotal ? parseResult.total : currentQuestionCount;

    onImport({
      title: finalTitle,
      total: finalTotal,
      questions: parseResult.questions.map((q) => ({
        question_number: q.question_number,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        explanation: q.explanation,
      })),
      keys: parseResult.keys,
    });

    onClose();
  };

  const handleInsertSample = () => {
    const sample = `Part 1: Database Administration and Security (05 Handout 1)
1. Which role is management-oriented and focuses on controlling the overall corporate data resources?
A. Database Security Officer
B. System Analyst
C. Data Administrator (DA)
D. Database Administrator (DBA)

2. Who is responsible for directing or performing activities that keep data secure and physical structures maintained?
A. Data Administrator (DA)
B. Database Administrator (DBA)
C. Network Administrator
D. End-User Manager

Answer Key
C | 2. B`;
    setRawText(sample);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col bg-surface-overlay border border-border-emphasis rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default shrink-0 bg-surface-base">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-ghost border border-sage-border text-sage">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                Quick Import Questionnaire & Answer Keys
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-steel-ghost text-steel border border-steel-border">
                  Auto-Parser
                </span>
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Paste your question sheet with options and answer keys. The parser extracts prompts, choices A–D, topics, and keys automatically.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-surface-subtle p-2 text-text-muted hover:bg-surface-muted hover:text-text-primary transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body: Split View */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Top Instructions & Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-surface-base border border-border-default rounded-xl p-3">
            <div className="flex items-center gap-2 text-text-muted">
              <Sparkles className="h-4 w-4 text-tan shrink-0" />
              <span>
                Supports <strong>&ldquo;1. Question&rdquo;</strong>, <strong>&ldquo;A. Choice&rdquo;</strong>, multi-line code/SQL, and bottom answer keys like <strong>&ldquo;C | 2. B | 3. C&rdquo;</strong> or inline <strong>&ldquo;Answer: C&rdquo;</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleInsertSample}
                className="text-[11px] font-medium text-steel hover:underline cursor-pointer"
              >
                Insert Sample
              </button>
              {rawText && (
                <>
                  <span className="text-border-default">•</span>
                  <button
                    type="button"
                    onClick={() => setRawText("")}
                    className="text-[11px] font-medium text-text-muted hover:text-burgundy cursor-pointer"
                  >
                    Clear Text
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Textarea Input Column */}
            <div className="lg:col-span-6 flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-steel" />
                  Paste Formatted Text
                </label>
                <span className="text-[11px] font-mono text-text-muted">
                  {rawText ? `${rawText.split("\n").length} lines • ${rawText.length} chars` : "Empty"}
                </span>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Paste your entire questionnaire here, e.g.:

Part 1: Database Administration and Security (05 Handout 1)
1. Which role is management-oriented and focuses on controlling corporate data?
A. Database Security Officer
B. System Analyst
C. Data Administrator (DA)
D. Database Administrator (DBA)

2. Who handles physical structures and database security?
A. Data Administrator (DA)
B. Database Administrator (DBA)
C. Network Administrator
D. End-User Manager

...

Answer Key
C | 2. B | 3. C | 4. B | 5. B`}
                rows={16}
                className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-3 text-xs font-mono text-text-primary focus:border-steel focus:outline-none resize-y leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Live Parsing Preview Column */}
            <div className="lg:col-span-6 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-sage" />
                  Live Parser Detection
                </label>
                {parseResult.total > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPreviewList(!showPreviewList)}
                    className="text-[11px] font-medium text-text-muted hover:text-text-primary flex items-center gap-1 cursor-pointer"
                  >
                    {showPreviewList ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        Hide Cards
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        Show Cards ({parseResult.total})
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Status Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-border-default bg-surface-base p-3">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Questions</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-bold font-mono text-text-primary">
                      {parseResult.total}
                    </span>
                    <span className="text-xs text-text-muted">detected</span>
                  </div>
                </div>

                <div className="rounded-xl border border-border-default bg-surface-base p-3">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Answer Keys</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-xl font-bold font-mono ${
                      parseResult.keyCount === parseResult.total && parseResult.total > 0
                        ? "text-sage"
                        : parseResult.keyCount > 0
                        ? "text-tan"
                        : "text-text-muted"
                    }`}>
                      {parseResult.keyCount}
                    </span>
                    <span className="text-xs text-text-muted">/ {parseResult.total}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-border-default bg-surface-base p-3 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Detected Title</span>
                  <div className="truncate text-xs font-semibold text-text-primary mt-1" title={parseResult.title}>
                    {parseResult.title || "None"}
                  </div>
                </div>
              </div>

              {/* Warnings if any */}
              {parseResult.warnings.length > 0 && rawText.trim() && (
                <div className="rounded-xl border border-tan-border bg-tan-ghost p-3 text-xs text-tan flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    {parseResult.warnings.map((w, idx) => (
                      <p key={idx}>{w}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Cards Container */}
              <div className="flex-1 rounded-xl border border-border-default bg-surface-base p-3 max-h-80 overflow-y-auto space-y-3">
                {parseResult.total === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-10 text-center text-text-muted">
                    <ClipboardList className="h-8 w-8 text-text-faint mb-2" />
                    <p className="text-xs font-semibold">Paste text to preview parsed questions</p>
                    <p className="text-[11px] text-text-faint mt-0.5">
                      The parser automatically recognizes question numbers, choices A-D, and answer keys.
                    </p>
                  </div>
                ) : showPreviewList ? (
                  parseResult.questions.map((q) => (
                    <div
                      key={q.question_number}
                      className="rounded-xl border border-border-default bg-surface-overlay p-3 space-y-2 hover:border-border-emphasis transition-colors text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-text-primary">
                            #{q.question_number}
                          </span>
                          {q.explanation && q.explanation.startsWith("Topic:") && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-steel-ghost text-steel border border-steel-border font-medium truncate max-w-50">
                              {q.explanation.replace(/^Topic:\s*/, "")}
                            </span>
                          )}
                        </div>
                        {q.key ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sage-ghost text-sage border border-sage-border">
                            <Check className="h-3 w-3" />
                            Key: {q.key}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-tan-ghost text-tan border border-tan-border font-semibold">
                            No Key
                          </span>
                        )}
                      </div>

                      <p className="text-text-primary whitespace-pre-wrap font-sans leading-relaxed">
                        {q.question_text || <span className="text-text-muted italic">No prompt text</span>}
                      </p>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {(["A", "B", "C", "D"] as const).map((opt) => {
                          const optKey = `option_${opt.toLowerCase()}` as keyof ParsedQuestion;
                          const text = (q[optKey] as string) || "";
                          const isCorrect = q.key === opt;

                          return (
                            <div
                              key={opt}
                              className={`flex items-start gap-1.5 p-1.5 rounded-lg border text-[11px] transition-colors ${
                                isCorrect
                                  ? "border-sage-border bg-sage-ghost/60 font-semibold text-text-primary"
                                  : "border-border-default bg-surface-base text-text-secondary"
                              }`}
                            >
                              <span
                                className={`font-mono font-bold px-1 rounded text-[10px] ${
                                  isCorrect ? "bg-sage text-white" : "text-text-muted"
                                }`}
                              >
                                {opt}.
                              </span>
                              <span className="truncate">{text || <span className="text-text-muted italic">Blank</span>}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-text-muted">
                    {parseResult.total} questions parsed. Click &ldquo;Show Cards&rdquo; to expand preview.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-t border-border-default bg-surface-base shrink-0">
          {/* Options Checkboxes */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {parseResult.title && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyTitle}
                  onChange={(e) => setApplyTitle(e.target.checked)}
                  className="rounded border-border-emphasis text-steel focus:ring-steel h-3.5 w-3.5"
                />
                <span className="text-text-secondary">
                  Set Title to &ldquo;{parseResult.title}&rdquo;
                </span>
              </label>
            )}

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={adjustTotal}
                onChange={(e) => setAdjustTotal(e.target.checked)}
                className="rounded border-border-emphasis text-steel focus:ring-steel h-3.5 w-3.5"
              />
              <span className="text-text-secondary">
                Set question count to {parseResult.total || currentQuestionCount}
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border-emphasis bg-surface-subtle px-4 py-2 text-xs font-semibold text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={parseResult.total === 0}
              className="flex items-center gap-2 rounded-xl gradient-bg-primary px-5 py-2 text-xs font-bold text-text-primary shadow-md hover:opacity-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4" />
              {parseResult.total > 0
                ? `Import ${parseResult.total} Questions & Keys into ${contextName}`
                : "Import Questions"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

