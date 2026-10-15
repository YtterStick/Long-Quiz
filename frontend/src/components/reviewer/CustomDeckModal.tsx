"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Save,
  Layers,
  BookOpen,
  Lightbulb,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  student as studentApi,
  GeneratedReviewerDeck,
  ReviewerFlashcard,
  ReviewerTopic,
} from "@/lib/api";

interface CustomDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDeck?: GeneratedReviewerDeck | null;
  onSaved: (deck: GeneratedReviewerDeck) => void;
}

export function CustomDeckModal({
  isOpen,
  onClose,
  initialDeck,
  onSaved,
}: CustomDeckModalProps) {
  const isEditing = Boolean(initialDeck);

  const [title, setTitle] = useState("");
  const [topicName, setTopicName] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [activeModalTab, setActiveModalTab] = useState<"flashcards" | "pointers">("flashcards");

  // Editable flashcards
  const [cards, setCards] = useState<ReviewerFlashcard[]>([]);

  // Editable pointers
  const [keyTerms, setKeyTerms] = useState<Array<{ term: string; definition: string }>>([]);
  const [bulletPoints, setBulletPoints] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialDeck) {
        setTitle(initialDeck.title);
        setCards(initialDeck.flashcards ? [...initialDeck.flashcards] : []);
        if (initialDeck.topics && initialDeck.topics.length > 0) {
          const first = initialDeck.topics[0];
          setTopicName(first.topic_name || "");
          setTopicDescription(first.description || "");
          setKeyTerms(first.key_terms ? [...first.key_terms] : []);
          setBulletPoints(first.bullet_points ? [...first.bullet_points] : []);
        } else {
          setTopicName(initialDeck.title);
          setTopicDescription("Core concepts and definitions");
          setKeyTerms([]);
          setBulletPoints([]);
        }
      } else {
        // Fresh custom deck
        setTitle("");
        setTopicName("");
        setTopicDescription("");
        setCards([
          {
            id: `card_${Date.now()}_1`,
            front: "",
            back: "",
            category: "General",
          },
        ]);
        setKeyTerms([{ term: "", definition: "" }]);
        setBulletPoints([""]);
      }
    }
  }, [isOpen, initialDeck]);

  if (!isOpen) return null;

  // Flashcard Actions
  const handleAddCard = () => {
    setCards((prev) => [
      ...prev,
      {
        id: `card_${Date.now()}_${prev.length + 1}`,
        front: "",
        back: "",
        category: topicName || "Key Concept",
      },
    ]);
  };

  const handleUpdateCard = (index: number, field: "front" | "back" | "category", value: string) => {
    setCards((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveCard = (index: number) => {
    setCards((prev) => prev.filter((_, i) => i !== index));
  };

  // Term Actions
  const handleAddTerm = () => {
    setKeyTerms((prev) => [...prev, { term: "", definition: "" }]);
  };

  const handleUpdateTerm = (index: number, field: "term" | "definition", value: string) => {
    setKeyTerms((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveTerm = (index: number) => {
    setKeyTerms((prev) => prev.filter((_, i) => i !== index));
  };

  // Bullet Points Actions
  const handleAddBullet = () => {
    setBulletPoints((prev) => [...prev, ""]);
  };

  const handleUpdateBullet = (index: number, value: string) => {
    setBulletPoints((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleRemoveBullet = (index: number) => {
    setBulletPoints((prev) => prev.filter((_, i) => i !== index));
  };

  // Save handler
  const handleSave = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Please provide a title for this deck.");
      return;
    }

    // Filter valid cards
    const validCards = cards
      .map((c) => ({
        ...c,
        front: c.front.trim(),
        back: c.back.trim(),
        category: c.category.trim() || "Concept",
      }))
      .filter((c) => c.front.length > 0 || c.back.length > 0);

    if (validCards.length === 0) {
      setError("Please add at least one flashcard with front and back content.");
      return;
    }

    const validTerms = keyTerms
      .map((t) => ({ term: t.term.trim(), definition: t.definition.trim() }))
      .filter((t) => t.term.length > 0 && t.definition.length > 0);

    const validBullets = bulletPoints
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    const topicItem: ReviewerTopic = {
      topic_name: topicName.trim() || cleanTitle,
      description: topicDescription.trim() || "Key study concepts",
      key_terms: validTerms,
      bullet_points: validBullets,
      exam_tips: initialDeck?.topics?.[0]?.exam_tips || [
        "Focus on understanding the definitions and applying them to problem scenarios.",
      ],
    };

    const assembledDeck: GeneratedReviewerDeck = {
      id: initialDeck?.id,
      title: cleanTitle,
      total_pointers: validTerms.length + validBullets.length,
      total_flashcards: validCards.length,
      total_quiz_cards: initialDeck?.quiz_cards?.length || 0,
      topics: [topicItem],
      flashcards: validCards,
      quiz_cards: initialDeck?.quiz_cards || [],
      source_word_count: validCards.reduce(
        (acc, c) => acc + c.front.split(" ").length + c.back.split(" ").length,
        0
      ),
    };

    try {
      setSaving(true);
      setError(null);

      if (initialDeck?.id) {
        // Update existing custom deck
        const res = await studentApi.updateCustomDeck(initialDeck.id, {
          title: cleanTitle,
          description: topicDescription.trim(),
          deck_data: assembledDeck,
        });
        assembledDeck.id = res.id;
      } else {
        // Create new custom deck in cloud
        const res = await studentApi.createCustomDeck({
          title: cleanTitle,
          description: topicDescription.trim(),
          deck_data: assembledDeck,
        });
        assembledDeck.id = res.id;
      }

      onSaved(assembledDeck);
      onClose();
    } catch (err: any) {
      // If cloud fails, still save locally
      console.warn("Cloud save failed, falling back to local save:", err);
      onSaved(assembledDeck);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] max-sm:rounded-t-3xl max-sm:pb-6 sm:rounded-3xl bg-surface-raised dark:bg-slate-900 border border-border-default dark:border-slate-800 shadow-2xl p-5 sm:p-7 flex flex-col overflow-hidden">
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto -mt-1 mb-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border-default dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-steel-ghost text-steel border border-steel-border">
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-text-primary dark:text-slate-100 truncate">
                {isEditing ? "Edit Study Deck" : "Create Custom Flashcards"}
              </h3>
              <p className="text-xs text-text-muted dark:text-slate-400 line-clamp-1">
                {isEditing
                  ? "Customize cards and study pointers in your deck"
                  : "Add custom flashcards and key study pointers from your notes"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-subtle transition min-h-9 min-w-9 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-4 pr-1.5">
          {/* Deck Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-slate-300 mb-1">
              Deck Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Data Structures & Algorithms Midterm Deck"
              className="w-full px-3.5 py-2.5 bg-surface-base dark:bg-slate-800/60 border border-border-default dark:border-slate-700 rounded-xl text-sm font-semibold text-text-primary dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-steel/30"
            />
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 border-b border-border-default dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveModalTab("flashcards")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeModalTab === "flashcards"
                  ? "bg-steel text-white shadow-xs"
                  : "text-text-muted hover:text-text-primary bg-surface-subtle"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Flashcards ({cards.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveModalTab("pointers")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeModalTab === "pointers"
                  ? "bg-steel text-white shadow-xs"
                  : "text-text-muted hover:text-text-primary bg-surface-subtle"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Pointers &amp; Terms ({keyTerms.length + bulletPoints.length})
            </button>
          </div>

          {/* TAB 1: FLASHCARDS BUILDER */}
          {activeModalTab === "flashcards" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary dark:text-slate-400">
                  Card Items (Front Question &amp; Back Answer)
                </span>
                <button
                  type="button"
                  onClick={handleAddCard}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-steel text-white rounded-xl text-xs font-bold hover:bg-steel-light transition cursor-pointer shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Card
                </button>
              </div>

              {cards.map((card, idx) => (
                <div
                  key={card.id || idx}
                  className="p-4 rounded-2xl border border-border-default dark:border-slate-800 bg-surface-base dark:bg-slate-800/40 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-steel">
                      Card #{idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={card.category || ""}
                        onChange={(e) => handleUpdateCard(idx, "category", e.target.value)}
                        placeholder="Tag (e.g. Definition, Law)"
                        className="px-2 py-0.5 text-[11px] bg-surface-raised dark:bg-slate-700/50 border border-border-default dark:border-slate-600 rounded-md text-text-secondary"
                      />
                      {cards.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCard(idx)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                          title="Delete card"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1">
                        Front (Prompt / Term)
                      </label>
                      <textarea
                        rows={2}
                        value={card.front}
                        onChange={(e) => handleUpdateCard(idx, "front", e.target.value)}
                        placeholder="What is..."
                        className="w-full p-2.5 bg-surface-raised dark:bg-slate-900 border border-border-default dark:border-slate-700 rounded-xl text-xs text-text-primary dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-steel resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1">
                        Back (Explanation / Definition)
                      </label>
                      <textarea
                        rows={2}
                        value={card.back}
                        onChange={(e) => handleUpdateCard(idx, "back", e.target.value)}
                        placeholder="The answer or explanation is..."
                        className="w-full p-2.5 bg-surface-raised dark:bg-slate-900 border border-border-default dark:border-slate-700 rounded-xl text-xs text-text-primary dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-steel resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: POINTERS & TERMS BUILDER */}
          {activeModalTab === "pointers" && (
            <div className="space-y-4">
              <div className="p-3.5 bg-surface-base dark:bg-slate-800/40 rounded-2xl border border-border-default dark:border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-text-secondary dark:text-slate-300">
                  Topic Category &amp; Summary
                </label>
                <input
                  type="text"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="Topic / Unit Name (e.g. Chapter 4: Object-Oriented Principles)"
                  className="w-full px-3 py-2 bg-surface-raised dark:bg-slate-900 border border-border-default dark:border-slate-700 rounded-xl text-xs text-text-primary dark:text-slate-100"
                />
                <input
                  type="text"
                  value={topicDescription}
                  onChange={(e) => setTopicDescription(e.target.value)}
                  placeholder="Short description or learning goal"
                  className="w-full px-3 py-2 bg-surface-raised dark:bg-slate-900 border border-border-default dark:border-slate-700 rounded-xl text-xs text-text-primary dark:text-slate-100"
                />
              </div>

              {/* Key Terms */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-secondary dark:text-slate-400">
                    Key Definitions ({keyTerms.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddTerm}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-subtle hover:bg-surface-muted text-text-secondary rounded-lg text-xs font-bold transition"
                  >
                    <Plus className="h-3 w-3" /> Add Definition
                  </button>
                </div>
                {keyTerms.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={t.term}
                      onChange={(e) => handleUpdateTerm(idx, "term", e.target.value)}
                      placeholder="Term (e.g. Encapsulation)"
                      className="w-1/3 px-3 py-2 bg-surface-base dark:bg-slate-800/60 border border-border-default dark:border-slate-700 rounded-xl text-xs font-semibold text-steel"
                    />
                    <input
                      type="text"
                      value={t.definition}
                      onChange={(e) => handleUpdateTerm(idx, "definition", e.target.value)}
                      placeholder="Definition..."
                      className="flex-1 px-3 py-2 bg-surface-base dark:bg-slate-800/60 border border-border-default dark:border-slate-700 rounded-xl text-xs text-text-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveTerm(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Bullet Points */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-secondary dark:text-slate-400">
                    Exam Bullet Points ({bulletPoints.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddBullet}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-subtle hover:bg-surface-muted text-text-secondary rounded-lg text-xs font-bold transition"
                  >
                    <Plus className="h-3 w-3" /> Add Point
                  </button>
                </div>
                {bulletPoints.map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={b}
                      onChange={(e) => handleUpdateBullet(idx, e.target.value)}
                      placeholder="Key takeaway or tip..."
                      className="flex-1 px-3 py-2 bg-surface-base dark:bg-slate-800/60 border border-border-default dark:border-slate-700 rounded-xl text-xs text-text-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBullet(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-border-default dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-text-muted">
            {cards.length} cards • {keyTerms.length + bulletPoints.length} pointers
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-primary hover:bg-surface-subtle transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-steel hover:bg-steel-light text-white shadow-md shadow-steel/25 transition cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isEditing ? "Save Changes" : "Save Deck"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
