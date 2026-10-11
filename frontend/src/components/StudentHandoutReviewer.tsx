"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Sparkles,
  BookOpen,
  Layers,
  CheckCircle2,
  X,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Shuffle,
  Lightbulb,
  Award,
  AlertCircle,
  Loader2,
  Trash2,
  Save,
  Download,
  HelpCircle,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import { SkeletonDeckGenerating } from "@/components/ui/Skeleton";
import {
  student as studentApi,
  GeneratedReviewerDeck,
  ReviewerFlashcard,
  ReviewerQuizCard,
} from "@/lib/api";

const STORAGE_KEY = "evalo_student_saved_decks";

export function StudentHandoutReviewer() {
  // Input states
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [deckTitle, setDeckTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Deck State
  const [activeDeck, setActiveDeck] = useState<GeneratedReviewerDeck | null>(null);
  const [activeTab, setActiveTab] = useState<"pointers" | "flashcards" | "quiz">("pointers");

  // Flashcards state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set());

  // Quiz state
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [quizFinished, setQuizFinished] = useState(false);

  // Saved Decks in LocalStorage
  const [savedDecks, setSavedDecks] = useState<GeneratedReviewerDeck[]>([]);
  // Quota & Section Shared Decks
  const [quotaInfo, setQuotaInfo] = useState<{ limit: number; used: number; remaining: number } | null>(null);
  const [sharedSectionDecks, setSharedSectionDecks] = useState<
    Array<{
      id: string;
      title: string;
      file_name?: string;
      views_count: number;
      deck: GeneratedReviewerDeck;
    }>
  >([]);

  const fetchQuotaAndShared = async () => {
    try {
      const [quota, shared] = await Promise.all([
        studentApi.getReviewerQuota(),
        studentApi.getSharedDecks(),
      ]);
      setQuotaInfo(quota);
      setSharedSectionDecks(shared);
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchQuotaAndShared();
  }, []);

  // Load saved decks on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedDecks(parsed);
          // Set first saved deck as active if none
          if (!activeDeck) {
            setActiveDeck(parsed[0]);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load saved decks:", e);
    }
  }, []);

  const saveDeckToStorage = (deck: GeneratedReviewerDeck) => {
    try {
      const existing = savedDecks.filter((d) => d.title !== deck.title);
      const updated = [deck, ...existing].slice(0, 10);
      setSavedDecks(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save deck:", e);
    }
  };

  const deleteSavedDeck = (title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedDecks.filter((d) => d.title !== title);
    setSavedDecks(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (activeDeck?.title === title) {
      setActiveDeck(updated.length > 0 ? updated[0] : null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError(null);
      if (!deckTitle) {
        setDeckTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);

    try {
      let result: GeneratedReviewerDeck;

      if (inputMode === "file") {
        if (!selectedFile) {
          throw new Error("Please select a PDF or Text handout to upload.");
        }
        const formData = new FormData();
        formData.append("file", selectedFile);
        if (deckTitle.trim()) {
          formData.append("title", deckTitle.trim());
        }
        result = await studentApi.generateReviewerFromFile(formData);
      } else {
        if (!rawText.trim() || rawText.trim().length < 30) {
          throw new Error("Please paste at least a few sentences of lecture notes.");
        }
        result = await studentApi.generateReviewerFromText({
          raw_text: rawText.trim(),
          title: deckTitle.trim() || undefined,
        });
      }

      setActiveDeck(result);
      saveDeckToStorage(result);
      fetchQuotaAndShared();
      // Reset view
      setActiveTab("pointers");
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setMasteredCards(new Set());
      setCurrentQuizIndex(0);
      setSelectedAnswers({});
      setQuizFinished(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate study reviewer");
    } finally {
      setLoading(false);
    }
  };

  const loadSampleHandout = (type: "db" | "oop" | "net") => {
    setInputMode("text");
    if (type === "db") {
      setDeckTitle("STI Advance Database - Module 1");
      setRawText(`Database Management System (DBMS): Software that manages, controls, and retrieves data stored in a digital database.
ACID Properties: The four key guarantees of relational transactions: Atomicity, Consistency, Isolation, and Durability.
Atomicity: All operations in a transaction succeed completely, or the entire transaction is rolled back with no changes.
Consistency: Transactions must preserve all database rules, integrity constraints, and foreign key cascades.
Isolation: Concurrent transactions execute independently without reading uncommitted intermediate states.
Durability: Once a transaction commits, its changes survive hardware crashes and power failures.
Normalization: The process of organizing relational tables to reduce data redundancy and improve data integrity (1NF, 2NF, 3NF, BCNF).
Primary Key: A unique, non-null column or combination of columns identifying each table row.
Foreign Key: A field in one table that links to the Primary Key of another table, enforcing referential integrity.
SQL Index: A data structure (such as B-Tree) that accelerates table search queries at the cost of slower insert/update operations.`);
    } else if (type === "oop") {
      setDeckTitle("Object-Oriented Programming (OOP) Essentials");
      setRawText(`Encapsulation: Bundling data attributes and methods inside a class while restricting direct external access via access modifiers (private, protected, public).
Inheritance: Mechanism where a child class acquires properties and behaviors from a parent base class using 'extends' or 'implements'.
Polymorphism: The ability of different classes to respond to the same method call in their own specific ways (Method Overloading and Overriding).
Abstraction: Hiding internal complex implementation details and showing only necessary interface behaviors through abstract classes and interfaces.
Class: A blueprint or prototype from which individual objects are instantiated in memory.
Object: A concrete runtime instance of a class holding actual state data and behavior.`);
    } else {
      setDeckTitle("Computer Networking & Protocols");
      setRawText(`TCP (Transmission Control Protocol): Connection-oriented protocol providing reliable, ordered, and error-checked delivery of stream data between applications.
UDP (User Datagram Protocol): Connectionless protocol offering fast, low-overhead transmission without delivery guarantees, ideal for streaming and gaming.
IP Address: A numerical label assigned to each device connected to a computer network (IPv4 and IPv6).
DNS (Domain Name System): Hierarchical naming system that translates human-readable domain names (e.g. google.com) into numerical IP addresses.
HTTP/HTTPS: Application protocol for transmitting hypermedia documents. HTTPS uses TLS/SSL encryption for secure communication.
Subnet Mask: A 32-bit number used in IPv4 to divide an IP address into network and host components.`);
    }
  };

  // Flashcard Helpers
  const currentCard = activeDeck?.flashcards[currentCardIndex];
  const toggleMastery = (cardId: string) => {
    setMasteredCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const nextCard = () => {
    if (!activeDeck) return;
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % activeDeck.flashcards.length);
  };

  const prevCard = () => {
    if (!activeDeck) return;
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + activeDeck.flashcards.length) % activeDeck.flashcards.length);
  };

  const shuffleCards = () => {
    if (!activeDeck) return;
    const shuffled = [...activeDeck.flashcards].sort(() => Math.random() - 0.5);
    setActiveDeck({ ...activeDeck, flashcards: shuffled });
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  // Quiz Helpers
  const currentQuiz = activeDeck?.quiz_cards[currentQuizIndex];
  const totalQuiz = activeDeck?.quiz_cards.length || 0;
  const answeredCount = Object.keys(selectedAnswers).length;

  const calculateScore = () => {
    if (!activeDeck) return { score: 0, total: 0, percentage: 0 };
    let score = 0;
    activeDeck.quiz_cards.forEach((q) => {
      if (selectedAnswers[q.question_number] === q.correct_option) {
        score++;
      }
    });
    const total = activeDeck.quiz_cards.length;
    return {
      score,
      total,
      percentage: total > 0 ? Math.round((score / total) * 100) : 0,
    };
  };

  return (
    <div className="space-y-6">
      {/* ── Top Hero & Uploader ─────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-5 sm:p-7 border border-border-default/80 bg-surface-raised relative overflow-hidden">
        {/* Ambient Halo */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-steel/10 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-tan/10 blur-[90px]" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-tan-ghost px-3 py-0.5 text-[11px] font-bold text-tan border border-tan-border">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Study Reviewer &amp; Flashcard Generator
                </div>

                <div
                  title="10 new handout generations allocated per week. Instant shared & saved decks do not consume quota."
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-bold border ${
                    (quotaInfo?.remaining ?? 10) > 3
                      ? "bg-sage-ghost text-sage border-sage-border"
                      : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>
                    {quotaInfo ? `${quotaInfo.remaining}/${quotaInfo.limit} Handouts Left This Week` : "10/10 Weekly Quota"}
                  </span>
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-text-primary">
                Upload Handout &amp; Generate Study Materials
              </h2>
              <p className="text-xs text-text-muted mt-1 max-w-2xl leading-relaxed">
                Upload your STI syllabus PDF, lecture notes, or paste topic summaries to automatically generate <strong>Key Pointers</strong>, <strong>3D Flip Flashcards</strong>, and <strong>Practice MCQ Quiz Cards</strong>.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center rounded-2xl bg-surface-subtle p-1 border border-border-default shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setInputMode("file")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  inputMode === "file" ? "bg-surface-raised text-steel shadow-sm" : "text-text-muted hover:text-text-primary"
                }`}
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload PDF / File
              </button>
              <button
                type="button"
                onClick={() => setInputMode("text")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  inputMode === "text" ? "bg-surface-raised text-steel shadow-sm" : "text-text-muted hover:text-text-primary"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Paste Notes
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-burgundy-ghost border border-burgundy-border p-3.5 text-xs text-burgundy-light animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Input Area */}
          <div className="mt-5 grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                Deck Title (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Advance Database - Prelim Exam Reviewer"
                value={deckTitle}
                onChange={(e) => setDeckTitle(e.target.value)}
                className="w-full rounded-2xl border border-border-default bg-surface-base px-4 py-2.5 text-xs text-text-primary placeholder:text-text-faint focus:border-steel focus:outline-none transition-all font-medium"
              />
            </div>

            {inputMode === "file" ? (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.txt,.docx,.md"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-border-emphasis/60 hover:border-steel bg-surface-base/60 p-6 text-center cursor-pointer transition-all group"
                >
                  <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-steel-ghost text-steel border border-steel-border group-hover:scale-105 transition-transform mb-3">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-text-primary">
                    {selectedFile ? selectedFile.name : "Click to browse or drop STI handout PDF / Document"}
                  </p>
                  <p className="text-[11px] text-text-muted mt-1">
                    Supports PDF handouts, Word `.docx`, `.txt`, and lecture notes (up to 20MB)
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  Paste Handout Text / Lecture Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste lesson definitions, module summaries, and chapter topics here..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full rounded-2xl border border-border-default bg-surface-base p-3.5 text-xs text-text-primary placeholder:text-text-faint focus:border-steel focus:outline-none transition-all font-mono leading-relaxed"
                />

                {/* Sample Presets */}
                <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-text-muted">
                  <span className="text-[11px]">Load Sample Handout:</span>
                  <button
                    type="button"
                    onClick={() => loadSampleHandout("db")}
                    className="px-2.5 py-1 rounded-lg bg-surface-subtle text-[11px] font-bold text-steel hover:bg-surface-muted transition-colors cursor-pointer"
                  >
                    ✦ Database &amp; ACID
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSampleHandout("oop")}
                    className="px-2.5 py-1 rounded-lg bg-surface-subtle text-[11px] font-bold text-tan hover:bg-surface-muted transition-colors cursor-pointer"
                  >
                    ✦ OOP Concepts
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSampleHandout("net")}
                    className="px-2.5 py-1 rounded-lg bg-surface-subtle text-[11px] font-bold text-sage hover:bg-surface-muted transition-colors cursor-pointer"
                  >
                    ✦ Networking Protocols
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || (inputMode === "file" && !selectedFile) || (inputMode === "text" && !rawText.trim())}
                className="flex items-center gap-2 rounded-2xl bg-steel px-6 py-3 text-xs font-bold text-white shadow-lg shadow-steel/25 hover:bg-steel-light hover:shadow-steel/35 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing Handout &amp; Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Study Reviewer Deck
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Saved Decks Drawer / Quick Switcher ─────────────────────── */}
      {savedDecks.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-text-muted flex items-center gap-1 shrink-0">
            <FolderOpen className="h-3.5 w-3.5" />
            Saved Decks:
          </span>
          {savedDecks.map((deck) => (
            <div
              key={deck.title}
              onClick={() => {
                setActiveDeck(deck);
                setCurrentCardIndex(0);
                setIsFlipped(false);
                setCurrentQuizIndex(0);
                setSelectedAnswers({});
                setQuizFinished(false);
              }}
              className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border shrink-0 ${
                activeDeck?.title === deck.title
                  ? "bg-steel text-white border-steel shadow-sm"
                  : "bg-surface-raised text-text-secondary border-border-default hover:border-border-emphasis"
              }`}
            >
              <span>{deck.title}</span>
              <button
                type="button"
                onClick={(e) => deleteSavedDeck(deck.title, e)}
                className="opacity-60 hover:opacity-100 p-0.5 rounded-md hover:bg-black/20"
                title="Delete Deck"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Section-Level Shared Decks (0 Quota Cost) ──────────────── */}
      {sharedSectionDecks.length > 0 && (
        <div className="rounded-2xl border border-steel-border/50 bg-surface-raised p-4 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-steel-light" />
              Section &amp; Class Shared Decks
              <span className="rounded-full bg-sage-ghost border border-sage-border px-2 py-0.2 text-[10px] font-bold text-sage">
                ⚡ 0 Quota Used
              </span>
            </span>
            <span className="text-[11px] text-text-muted font-medium">Already generated for your class</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {sharedSectionDecks.map((sDeck) => (
              <button
                key={sDeck.id}
                type="button"
                onClick={() => {
                  setActiveDeck(sDeck.deck);
                  saveDeckToStorage(sDeck.deck);
                }}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border ${
                  activeDeck?.title === sDeck.title
                    ? "bg-steel text-white border-steel shadow-sm shadow-steel/25"
                    : "bg-surface-subtle hover:bg-surface-muted text-text-secondary border-border-default"
                }`}
              >
                <span>{sDeck.title}</span>
                <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded font-mono">
                  {sDeck.views_count} views
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Generating Skeleton State ─────────────────────────────── */}
      {loading && <SkeletonDeckGenerating />}

      {/* ── Active Reviewer Deck Viewer ─────────────────────────────── */}
      {!loading && activeDeck && (
        <div className="space-y-4">
          {/* Deck Header & Study Mode Selector */}
          <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-raised">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-tan uppercase tracking-wider font-mono">
                  Active Study Deck
                </span>
                {activeDeck.cached && (
                  <span className="rounded-full bg-steel-ghost px-2.5 py-0.5 text-[10px] font-bold text-steel border border-steel-border">
                    ⚡ Instant Section Cache (0 Quota Used)
                  </span>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-black text-text-primary mt-0.5">
                {activeDeck.title}
              </h3>
              <p className="text-xs text-text-muted mt-0.5 flex items-center gap-3">
                <span>{activeDeck.total_pointers} Pointers</span>
                <span>•</span>
                <span>{activeDeck.total_flashcards} Flashcards</span>
                <span>•</span>
                <span>{activeDeck.total_quiz_cards} Practice Questions</span>
              </p>
            </div>

            {/* 3 Study Mode Buttons */}
            <div className="flex items-center rounded-2xl bg-surface-subtle p-1 border border-border-default shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("pointers")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "pointers"
                    ? "bg-steel text-white shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                1. Pointers to Review
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("flashcards")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "flashcards"
                    ? "bg-steel text-white shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                2. 3D Flashcards
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("quiz")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "quiz"
                    ? "bg-steel text-white shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                3. Card Quiz Practice
              </button>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 1: POINTERS TO REVIEW                                    */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === "pointers" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {activeDeck.topics.map((topic, tIdx) => (
                <div key={tIdx} className="space-y-4">
                  {/* Topic Card */}
                  <div className="glass-card rounded-3xl p-5 sm:p-6 border border-border-default bg-surface-raised space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-tan-ghost text-tan border border-tan-border font-bold text-xs">
                        {tIdx + 1}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-text-primary">
                          {topic.topic_name}
                        </h4>
                        <p className="text-xs text-text-muted">{topic.description}</p>
                      </div>
                    </div>

                    {/* Key Terminology Grid */}
                    <div>
                      <h5 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 text-tan" />
                        Essential Definitions &amp; Terms
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {topic.key_terms.map((item, kIdx) => (
                          <div
                            key={kIdx}
                            className="rounded-2xl border border-border-default/80 bg-surface-base p-3.5 space-y-1 hover:border-steel-border transition-colors"
                          >
                            <span className="font-bold text-xs text-steel font-mono block">
                              {item.term}
                            </span>
                            <p className="text-xs text-text-secondary leading-relaxed">
                              {item.definition}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bullet Points */}
                    {topic.bullet_points && topic.bullet_points.length > 0 && (
                      <div className="pt-2">
                        <h5 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-sage" />
                          Key Takeaways &amp; Bullet Points
                        </h5>
                        <ul className="space-y-2">
                          {topic.bullet_points.map((bp, bIdx) => (
                            <li
                              key={bIdx}
                              className="flex items-start gap-2.5 text-xs text-text-secondary rounded-xl bg-surface-subtle/50 p-2.5 border border-border-default/50"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-steel shrink-0 mt-1.5" />
                              <span className="leading-relaxed">{bp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Exam Tips Box */}
                    {topic.exam_tips && topic.exam_tips.length > 0 && (
                      <div className="rounded-2xl bg-tan-ghost/20 border border-tan-border/40 p-4 space-y-1.5 text-xs">
                        <span className="font-bold text-tan flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          High-Yield Exam Tips:
                        </span>
                        <ul className="space-y-1 pl-5 list-disc text-text-secondary">
                          {topic.exam_tips.map((tip, tipIdx) => (
                            <li key={tipIdx} className="leading-relaxed">
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 2: 3D FLIP FLASHCARDS                                    */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === "flashcards" && currentCard && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Progress & Deck Controls */}
              <div className="flex items-center justify-between text-xs px-2">
                <span className="text-text-muted font-bold">
                  Card {currentCardIndex + 1} of {activeDeck.flashcards.length}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sage font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {masteredCards.size} Mastered
                  </span>
                  <button
                    type="button"
                    onClick={shuffleCards}
                    className="flex items-center gap-1 px-3 py-1 rounded-xl bg-surface-subtle text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    Shuffle
                  </button>
                </div>
              </div>

              {/* 3D Flip Card Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="relative h-80 sm:h-96 w-full cursor-pointer perspective-1000 select-none group"
              >
                <div
                  className="relative h-full w-full rounded-3xl transition-transform duration-500 transform-style-3d shadow-xl"
                  style={{
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    transformStyle: "preserve-3d",
                  }}
                >
                  {/* Front Side */}
                  <div
                    className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8 backface-hidden rounded-3xl border border-steel-border/60 bg-surface-raised"
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(0deg)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-steel-ghost px-3 py-1 text-[11px] font-bold text-steel border border-steel-border">
                        {currentCard.category}
                      </span>
                      <span className="text-[11px] text-text-muted font-mono">
                        Click card to flip
                      </span>
                    </div>

                    <div className="my-auto text-center px-4">
                      <h4 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
                        {currentCard.front}
                      </h4>
                      <p className="text-xs text-text-muted mt-3">
                        Do you know the definition or meaning? Click to reveal.
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-text-faint">
                      <span>Card #{currentCardIndex + 1}</span>
                      <span className="flex items-center gap-1 text-steel font-bold">
                        <RotateCcw className="h-3.5 w-3.5" /> Flip Card
                      </span>
                    </div>
                  </div>

                  {/* Back Side (Flipped) */}
                  <div
                    className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8 backface-hidden rounded-3xl border border-tan-border/60 bg-surface-raised"
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-tan-ghost px-3 py-1 text-[11px] font-bold text-tan border border-tan-border">
                        Definition &amp; Meaning
                      </span>
                      <span className="text-[11px] text-text-muted font-mono">
                        Term: {currentCard.front}
                      </span>
                    </div>

                    <div className="my-auto text-left px-2 sm:px-6">
                      <p className="text-sm sm:text-base text-text-primary font-medium leading-relaxed">
                        {currentCard.back}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-text-faint">
                      <span>Card #{currentCardIndex + 1}</span>
                      <span className="flex items-center gap-1 text-tan font-bold">
                        <RotateCcw className="h-3.5 w-3.5" /> Flip to Front
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Navigation & Mastery Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={prevCard}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-border-default bg-surface-raised text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-all cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={nextCard}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-border-default bg-surface-raised text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-all cursor-pointer"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Mastery Toggle */}
                <button
                  type="button"
                  onClick={() => toggleMastery(currentCard.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                    masteredCards.has(currentCard.id)
                      ? "bg-sage text-white shadow-sage/20 hover:brightness-110"
                      : "bg-surface-subtle text-text-muted hover:text-text-primary border border-border-default"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {masteredCards.has(currentCard.id) ? "Marked as Mastered!" : "Mark as Mastered"}
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 3: PRACTICE CARD QUIZ (MCQS)                             */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === "quiz" && activeDeck.quiz_cards.length > 0 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {!quizFinished && currentQuiz ? (
                <div className="glass-card rounded-3xl p-5 sm:p-8 border border-border-default bg-surface-raised space-y-6">
                  {/* Quiz Progress Bar */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-text-secondary">
                      Question {currentQuizIndex + 1} of {totalQuiz}
                    </span>
                    <span className="font-mono text-text-muted">
                      {answeredCount} / {totalQuiz} Answered
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                    <div
                      style={{ width: `${((currentQuizIndex + 1) / totalQuiz) * 100}%` }}
                      className="h-full bg-steel transition-all duration-300"
                    />
                  </div>

                  {/* Question Title */}
                  <div>
                    <span className="rounded-full bg-steel-ghost px-3 py-1 text-[11px] font-bold text-steel border border-steel-border">
                      Practice Item #{currentQuiz.question_number}
                    </span>
                    <h4 className="text-base sm:text-lg font-bold text-text-primary mt-2 leading-relaxed">
                      {currentQuiz.question}
                    </h4>
                  </div>

                  {/* ABCD Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(["A", "B", "C", "D"] as const).map((optKey) => {
                      const optText = currentQuiz.options[optKey];
                      if (!optText) return null;
                      const isSelected = selectedAnswers[currentQuiz.question_number] === optKey;
                      const hasAnswered = selectedAnswers[currentQuiz.question_number] !== undefined;
                      const isCorrect = optKey === currentQuiz.correct_option;

                      let btnStyle = "border-border-default bg-surface-base hover:border-steel-border text-text-primary";
                      if (hasAnswered) {
                        if (isCorrect) {
                          btnStyle = "border-sage bg-sage-ghost text-sage font-bold shadow-sm";
                        } else if (isSelected) {
                          btnStyle = "border-burgundy bg-burgundy-ghost text-burgundy-light font-bold";
                        } else {
                          btnStyle = "border-border-default bg-surface-base/50 opacity-50";
                        }
                      }

                      return (
                        <button
                          key={optKey}
                          type="button"
                          disabled={hasAnswered}
                          onClick={() => {
                            setSelectedAnswers((prev) => ({
                              ...prev,
                              [currentQuiz.question_number]: optKey,
                            }));
                          }}
                          className={`flex items-center gap-3 p-4 rounded-2xl border text-left text-xs transition-all cursor-pointer ${btnStyle}`}
                        >
                          <span className="h-7 w-7 rounded-xl flex items-center justify-center font-bold font-mono border shrink-0 bg-surface-raised">
                            {optKey}
                          </span>
                          <span className="flex-1 font-medium leading-relaxed">{optText}</span>
                          {hasAnswered && isCorrect && <CheckCircle2 className="h-4 w-4 text-sage shrink-0" />}
                          {hasAnswered && isSelected && !isCorrect && <X className="h-4 w-4 text-burgundy-light shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation reveal if answered */}
                  {selectedAnswers[currentQuiz.question_number] !== undefined && (
                    <div className="rounded-2xl bg-tan-ghost/20 border border-tan-border/40 p-4 text-xs space-y-1 animate-in fade-in">
                      <span className="font-bold text-tan flex items-center gap-1.5">
                        <Lightbulb className="h-4 w-4" />
                        Explanation:
                      </span>
                      <p className="text-text-secondary leading-relaxed">
                        {currentQuiz.explanation}
                      </p>
                    </div>
                  )}

                  {/* Next / Previous Controls */}
                  <div className="flex items-center justify-between pt-4 border-t border-border-default/60">
                    <button
                      type="button"
                      disabled={currentQuizIndex === 0}
                      onClick={() => setCurrentQuizIndex((p) => Math.max(0, p - 1))}
                      className="px-4 py-2 rounded-xl border border-border-default bg-surface-base text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-40 cursor-pointer"
                    >
                      ← Previous
                    </button>

                    {currentQuizIndex < totalQuiz - 1 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentQuizIndex((p) => p + 1)}
                        className="px-5 py-2.5 rounded-xl bg-steel text-xs font-bold text-white shadow-md hover:bg-steel-light cursor-pointer"
                      >
                        Next Question →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setQuizFinished(true)}
                        className="px-6 py-2.5 rounded-xl bg-sage text-xs font-bold text-white shadow-lg shadow-sage/20 hover:brightness-110 cursor-pointer"
                      >
                        Finish Quiz &amp; View Score
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Quiz Finished Summary */
                <div className="glass-card rounded-3xl p-8 border border-border-default bg-surface-raised text-center space-y-6 max-w-lg mx-auto">
                  <div className="h-20 w-20 mx-auto rounded-3xl bg-sage-ghost text-sage border border-sage-border flex items-center justify-center shadow-inner">
                    <Award className="h-10 w-10" />
                  </div>

                  <div>
                    <h4 className="text-2xl font-black text-text-primary">
                      Practice Quiz Completed!
                    </h4>
                    <p className="text-xs text-text-muted mt-1">
                      Great job reviewing {activeDeck.title}.
                    </p>
                  </div>

                  {/* Score Tile */}
                  <div className="rounded-2xl bg-surface-base border border-border-default p-5 space-y-1">
                    <span className="text-xs text-text-muted">Your Mastery Score:</span>
                    <div className="text-3xl font-black text-sage font-mono">
                      {calculateScore().score} / {calculateScore().total}
                      <span className="text-base text-text-secondary font-normal ml-2">
                        ({calculateScore().percentage}%)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAnswers({});
                        setCurrentQuizIndex(0);
                        setQuizFinished(false);
                      }}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-steel text-xs font-bold text-white shadow-md hover:bg-steel-light cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Retake Quiz
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("flashcards")}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl border border-border-default bg-surface-base text-xs font-bold text-text-secondary hover:text-text-primary cursor-pointer"
                    >
                      Review Flashcards
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
