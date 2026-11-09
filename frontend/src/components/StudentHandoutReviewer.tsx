"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  UploadCloud,
  Cloud,
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
  FolderPlus,
  Folder,
  MoveRight,
  Search,
  Share2,
  Edit3,
  Plus,
  Users,
  MessageSquare,
  MoreVertical,
  ChevronDown,
  ChevronLeft,
  Timer,
  Eye,
  Send,
  ExternalLink,
  Lock,
} from "lucide-react";
import { ExamIcon } from "@/components/ui/ExamIcon";
import { SkeletonDeckGenerating } from "@/components/ui/Skeleton";
import {
  student as studentApi,
  GeneratedReviewerDeck,
  ReviewerFlashcard,
  ReviewerQuizCard,
  FriendSharedDeckItem,
  CustomStudentDeckItem,
} from "@/lib/api";
import { ShareDeckModal } from "@/components/reviewer/ShareDeckModal";
import { CustomDeckModal } from "@/components/reviewer/CustomDeckModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { StudentAvatar } from "@/components/avatar/StudentAvatar";
import { parseAvatarConfig } from "@/types/avatar";

export interface StudyFolder {
  id: string;
  name: string;
  color: "steel" | "emerald" | "amber" | "violet" | "rose" | "indigo";
}

const STORAGE_KEY = "evalo_student_saved_decks_v2";
const FOLDERS_STORAGE_KEY = "evalo_student_deck_folders";

const DEFAULT_FOLDERS: StudyFolder[] = [
  { id: "general", name: "General", color: "steel" },
];

const BAD_SINGLE_TERMS = new Set([
  "it", "this", "that", "these", "those", "here", "there", "they", "we", "you",
  "he", "she", "its", "their", "our", "your", "example", "examples", "note",
  "notes", "summary", "overview", "introduction", "conclusion", "name",
  "country", "gender", "email", "mobile", "phone", "address", "age", "id",
]);

function isCleanClientTerm(term: string, defText: string): boolean {
  const t = (term || "").trim();
  const d = (defText || "").trim();
  if (!t || !d || t.length < 2 || t.length > 75 || d.length < 12) return false;
  if (t.includes("...") || t.includes("===") || t.includes("?") || t.includes("{") || t.includes("}")) return false;
  const tLow = t.toLowerCase();
  if (BAD_SINGLE_TERMS.has(tLow)) return false;
  if (
    tLow.startsWith("key principle #") ||
    tLow.startsWith("to ") ||
    tLow.startsWith("if ") ||
    tLow.startsWith("when ") ||
    tLow.startsWith("while ") ||
    tLow.startsWith("because ") ||
    tLow.startsWith("now ") ||
    tLow.startsWith("here ") ||
    tLow.startsWith("there ") ||
    tLow.startsWith("it ") ||
    tLow.startsWith("this ") ||
    tLow.startsWith("that ") ||
    tLow.startsWith("what ") ||
    tLow.startsWith("which ") ||
    tLow.startsWith("how ") ||
    tLow.startsWith("why ")
  ) {
    return false;
  }
  const words = t.split(/\s+/);
  if (words.length > 7) return false;
  return true;
}

function sanitizeReviewerDeckClient(deck: GeneratedReviewerDeck): GeneratedReviewerDeck {
  if (!deck || typeof deck !== "object") return deck;
  const topics = Array.isArray(deck.topics) ? deck.topics : [];
  const validTerms: Array<{ term: string; definition: string; topic: string }> = [];
  const seenTerms = new Set<string>();

  const cleanedTopics = topics.map((t) => {
    const tName = t.topic_name || "Core Concepts";
    const kts = (t.key_terms || []).filter((kt) => {
      const ok = isCleanClientTerm(kt?.term || "", kt?.definition || "");
      if (ok && !seenTerms.has(kt.term.trim().toLowerCase())) {
        seenTerms.add(kt.term.trim().toLowerCase());
        validTerms.push({
          term: kt.term.trim(),
          definition: kt.definition.trim(),
          topic: tName,
        });
      }
      return ok;
    });
    const bps = (t.bullet_points || []).filter(
      (bp) => typeof bp === "string" && bp.trim() && !bp.trim().startsWith("===")
    );
    return { ...t, key_terms: kts, bullet_points: bps };
  });

  const seenFc = new Set<string>();
  const cleanedFlashcards: ReviewerFlashcard[] = [];
  for (const fc of deck.flashcards || []) {
    const front = (fc?.front || "").trim();
    const back = (fc?.back || "").trim();
    if (!isCleanClientTerm(front, back)) continue;
    const fLow = front.toLowerCase();
    if (!seenFc.has(fLow)) {
      seenFc.add(fLow);
      cleanedFlashcards.push({
        id: `fc-${cleanedFlashcards.length + 1}`,
        front,
        back,
        category: fc.category || "Key Terminology",
      });
    }
  }

  for (const vt of validTerms) {
    const fLow = vt.term.toLowerCase();
    if (!seenFc.has(fLow)) {
      seenFc.add(fLow);
      cleanedFlashcards.push({
        id: `fc-${cleanedFlashcards.length + 1}`,
        front: vt.term,
        back: vt.definition,
        category: vt.topic,
      });
    }
  }

  const allTermNames = validTerms.map((v) => v.term);
  const cleanedQuiz: ReviewerQuizCard[] = [];
  for (const qc of deck.quiz_cards || []) {
    const qText = (qc?.question || "").trim();
    const opts = qc?.options || ({} as any);
    if (!qText || (qText.startsWith("Which concept or term refers to:") && qText.includes("..."))) {
      continue;
    }
    let optsValid = true;
    for (const k of ["A", "B", "C", "D"] as const) {
      const val = String(opts[k] || "").trim();
      if (!val || BAD_SINGLE_TERMS.has(val.toLowerCase()) || val.startsWith("===") || val.endsWith("...")) {
        optsValid = false;
        break;
      }
    }
    if (!optsValid) continue;
    const cOpt = (["A", "B", "C", "D"].includes(qc.correct_option) ? qc.correct_option : "A") as "A" | "B" | "C" | "D";
    cleanedQuiz.push({
      ...qc,
      id: `quiz-${cleanedQuiz.length + 1}`,
      question_number: cleanedQuiz.length + 1,
      correct_option: cOpt,
      correct_answer_text: String(opts[cOpt] || qc.correct_answer_text || "").trim(),
    });
  }

  if (cleanedQuiz.length < Math.min(10, validTerms.length)) {
    const usedAnswers = new Set(cleanedQuiz.map((q) => q.correct_answer_text.toLowerCase()));
    for (const vt of validTerms) {
      if (usedAnswers.has(vt.term.toLowerCase())) continue;
      const distractors = allTermNames.filter((n) => n.toLowerCase() !== vt.term.toLowerCase());
      while (distractors.length < 3) {
        distractors.push(["Data Abstraction Layer", "Transaction Control Manager", "System Catalog Schema", "Relational Integrity Constraint"][distractors.length % 4]);
      }
      const chosen = distractors.slice(0, 3);
      const pool = [vt.term, ...chosen];
      const keys = ["A", "B", "C", "D"] as const;
      const optionsObj: Record<"A" | "B" | "C" | "D", string> = { A: "", B: "", C: "", D: "" };
      let correctKey: "A" | "B" | "C" | "D" = "A";
      keys.forEach((k, i) => {
        optionsObj[k] = pool[(i + cleanedQuiz.length) % 4];
        if (optionsObj[k] === vt.term) correctKey = k;
      });
      cleanedQuiz.push({
        id: `quiz-${cleanedQuiz.length + 1}`,
        question_number: cleanedQuiz.length + 1,
        question: `Which concept or term best matches the following description: "${vt.definition}"?`,
        options: optionsObj,
        correct_option: correctKey,
        correct_answer_text: vt.term,
        explanation: `'${vt.term}' is defined in the study pointers as: ${vt.definition}`,
      });
      if (cleanedQuiz.length >= 20) break;
    }
  }

  return {
    ...deck,
    topics: cleanedTopics,
    flashcards: cleanedFlashcards,
    quiz_cards: cleanedQuiz,
    total_flashcards: cleanedFlashcards.length,
    total_quiz_cards: cleanedQuiz.length,
    total_pointers: cleanedTopics.reduce(
      (acc, t) => acc + (t.key_terms?.length || 0) + (t.bullet_points?.length || 0),
      0
    ),
  };
}

const FOLDER_COLORS: Record<
  StudyFolder["color"],
  { bg: string; text: string; border: string; activeBg: string }
> = {
  steel: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    activeBg: "bg-blue-600 text-white",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    activeBg: "bg-emerald-600 text-white",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    activeBg: "bg-amber-600 text-white",
  },
  violet: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
    activeBg: "bg-purple-600 text-white",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
    activeBg: "bg-rose-600 text-white",
  },
  indigo: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800",
    activeBg: "bg-indigo-600 text-white",
  },
};

export function StudentHandoutReviewer() {
  // Input states (supports 1 to 3 handout files per reviewer)
  const MAX_HANDOUT_FILES = 3;
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [selectedFiles, setSelectedFiles] = useState<
    Array<{ file: File; previewUrl: string; text?: string }>
  >([]);
  const [removeFileIndexTarget, setRemoveFileIndexTarget] = useState<number | null>(null);
  const [activeHandoutFileIndex, setActiveHandoutFileIndex] = useState(0);
  const [rawText, setRawText] = useState("");
  const [deckTitle, setDeckTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Deck State
  const [activeDeck, setActiveDeck] = useState<GeneratedReviewerDeck | null>(null);
  const [activeTab, setActiveTab] = useState<"pointers" | "flashcards" | "quiz">("pointers");
  const rootRef = useRef<HTMLDivElement>(null);

  // Layout state: "library" (browse/generate) vs "study" (focused deck view)
  const [view, setView] = useState<"library" | "study">("library");
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [openMenuDeck, setOpenMenuDeck] = useState<string | null>(null);
  const [collapsedTopics, setCollapsedTopics] = useState<Set<number>>(new Set());

  const scrollToTop = () => {
    setTimeout(() => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const handleSelectDeckToStudy = (deck: any) => {
    if (activeDeck?.title !== deck.title) {
      setActiveTab("pointers");
      setMasteredCards(new Set());
      setCardAttempts({});
      setCardInput("");
      setCollapsedTopics(new Set());
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setCurrentQuizIndex(0);
      setSelectedAnswers({});
      setQuizFinished(false);
    }
    setActiveDeck(deck);
    setView("study");
    scrollToTop();
  };

  // Flashcards state (Active-Recall Quiz Mode)
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set());
  const [cardInput, setCardInput] = useState("");
  const [cardAttempts, setCardAttempts] = useState<
    Record<string, { answer: string; matched: boolean }>
  >({});
  const [cardPromptMode, setCardPromptMode] = useState<"definition_first" | "term_first">("definition_first");
  const cardInputRef = useRef<HTMLInputElement>(null);

  // Uploaded Handout Viewer state
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileText, setUploadedFileText] = useState<string | null>(null);
  const [handoutViewerOpen, setHandoutViewerOpen] = useState(false);
  const [handoutViewTab, setHandoutViewTab] = useState<"pdf" | "text">("pdf");
  const [handoutSearch, setHandoutSearch] = useState("");

  // Generation loading animation step
  const [loadingStep, setLoadingStep] = useState(0);

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
  // Friends & Custom Decks
  const [friendSharedDecks, setFriendSharedDecks] = useState<FriendSharedDeckItem[]>([]);
  const [customCloudDecks, setCustomCloudDecks] = useState<CustomStudentDeckItem[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<GeneratedReviewerDeck | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [removeFileModalOpen, setRemoveFileModalOpen] = useState(false);
  const [deleteDeckTarget, setDeleteDeckTarget] = useState<string | null>(null);

  // Folder states
  const [folders, setFolders] = useState<StudyFolder[]>(DEFAULT_FOLDERS);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState<StudyFolder["color"]>("steel");
  const [movingDeck, setMovingDeck] = useState<any | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<StudyFolder | null>(null);
  const [deckSearchQuery, setDeckSearchQuery] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchQuotaAndShared = async () => {
    try {
      const [quota, shared, friendShared, customDecks] = await Promise.all([
        studentApi.getReviewerQuota().catch(() => null),
        studentApi.getSharedDecks().catch(() => []),
        studentApi.getSharedWithMeDecks().catch(() => []),
        studentApi.getCustomDecks().catch(() => []),
      ]);
      if (quota) setQuotaInfo(quota);
      if (shared) setSharedSectionDecks(shared);
      if (friendShared) setFriendSharedDecks(friendShared);
      if (customDecks && Array.isArray(customDecks)) {
        setCustomCloudDecks(customDecks);

        // Parse and sanitize all cloud-stored decks
        const cloudDecksParsed: GeneratedReviewerDeck[] = customDecks.map((c: any) => {
          const d = c.deck || {};
          return {
            ...sanitizeReviewerDeckClient(d),
            id: c.id || d.id,
            title: d.title || c.title,
            folder_id: d.folder_id || "general",
            folder_name: d.folder_name,
            folder_color: d.folder_color,
          };
        });

        // Seamlessly merge cloud decks with any locally cached decks
        setSavedDecks((prevSaved) => {
          const cloudTitles = new Set(cloudDecksParsed.map((d) => d.title.toLowerCase()));
          const localOnly = prevSaved.filter((loc) => !cloudTitles.has(loc.title.toLowerCase()));

          // Auto-migrate / sync any local-only decks up to the cloud database
          if (localOnly.length > 0) {
            localOnly.forEach((locDeck) => {
              studentApi
                .createCustomDeck({
                  title: locDeck.title,
                  description: `Study deck • ${locDeck.flashcards?.length || 0} cards`,
                  deck_data: locDeck,
                })
                .then((res) => {
                  if (res?.id) {
                    locDeck.id = res.id;
                  }
                })
                .catch(() => {});
            });
          }

          const combined = [...cloudDecksParsed, ...localOnly].slice(0, 50);

          // Restore any custom folders saved across devices
          setFolders((prevFolders) => {
            const existingFolderIds = new Set(prevFolders.map((f) => f.id));
            const restoredFolders: StudyFolder[] = [];
            combined.forEach((d: any) => {
              if (d.folder_id && d.folder_id !== "general" && !existingFolderIds.has(d.folder_id)) {
                existingFolderIds.add(d.folder_id);
                restoredFolders.push({
                  id: d.folder_id,
                  name: d.folder_name || d.folder_id.replace("folder_", "Folder "),
                  color: d.folder_color || "steel",
                });
              }
            });
            if (restoredFolders.length > 0) {
              const merged = [...prevFolders, ...restoredFolders];
              try {
                localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(merged));
              } catch {}
              return merged;
            }
            return prevFolders;
          });

          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
          } catch {}
          return combined;
        });
      }

      // Auto-activate deck if specified in URL param ?deck=...
      if (typeof window !== "undefined") {
        const urlDeck = new URLSearchParams(window.location.search).get("deck");
        if (urlDeck) {
          const matchShared = shared?.find(
            (s: any) => s.title?.toLowerCase() === urlDeck.toLowerCase()
          )?.deck;
          const matchFriend = friendShared?.find(
            (f: any) => f.title?.toLowerCase() === urlDeck.toLowerCase()
          )?.deck;
          const matchCustom = customDecks?.find(
            (c: any) => c.title?.toLowerCase() === urlDeck.toLowerCase()
          )?.deck;
          const target = matchShared || matchFriend || matchCustom;
          if (target) {
            setActiveDeck(target);
            setView("study");
          }
        }
      }
    } catch {
      // Non-blocking
    }
  };

  const reviewerSessionHydratedRef = useRef(false);

  useEffect(() => {
    fetchQuotaAndShared();
  }, []);

  // Load saved decks, folders, and active study session on mount
  useEffect(() => {
    try {
      const storedFolders = localStorage.getItem(FOLDERS_STORAGE_KEY);
      if (storedFolders) {
        const parsed = JSON.parse(storedFolders);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFolders(parsed);
        }
      }
    } catch {}

    try {
      // Load and safely migrate any historical local decks from older versions
      let rawOldDecks: any[] = [];
      const oldV1 = localStorage.getItem("evalo_student_saved_decks");
      if (oldV1) {
        try {
          const parsedV1 = JSON.parse(oldV1);
          if (Array.isArray(parsedV1)) rawOldDecks.push(...parsedV1);
        } catch {}
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsedV2 = JSON.parse(stored);
          if (Array.isArray(parsedV2)) rawOldDecks.push(...parsedV2);
        } catch {}
      }

      if (rawOldDecks.length > 0) {
        const seenTitles = new Set<string>();
        const sanitizedList: any[] = [];
        rawOldDecks.forEach((d: any) => {
          if (!d || !d.title) return;
          const low = d.title.trim().toLowerCase();
          if (!seenTitles.has(low)) {
            seenTitles.add(low);
            sanitizedList.push({
              ...sanitizeReviewerDeckClient(d),
              folder_id: d.folder_id || "general",
            });
          }
        });
        if (sanitizedList.length > 0) {
          setSavedDecks(sanitizedList);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedList));

          // Check if URL specified a saved deck
          const urlDeck =
            typeof window !== "undefined"
              ? new URLSearchParams(window.location.search).get("deck")
              : null;
          if (urlDeck) {
            const matchSaved = sanitizedList.find(
              (d: any) => d.title?.toLowerCase() === urlDeck.toLowerCase()
            );
            if (matchSaved) {
              setActiveDeck(matchSaved);
              setView("study");
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to load saved decks:", e);
    }

    try {
      const rawSession = sessionStorage.getItem("evalo_student_reviewer_session");
      if (rawSession) {
        const parsedSession = JSON.parse(rawSession);
        if (parsedSession.view === "study" && parsedSession.activeDeck) {
          setActiveDeck(sanitizeReviewerDeckClient(parsedSession.activeDeck));
          setView("study");
          if (
            parsedSession.activeTab === "pointers" ||
            parsedSession.activeTab === "flashcards" ||
            parsedSession.activeTab === "quiz"
          ) {
            setActiveTab(parsedSession.activeTab);
          }
          if (typeof parsedSession.currentCardIndex === "number") {
            setCurrentCardIndex(parsedSession.currentCardIndex);
          }
          if (typeof parsedSession.currentQuizIndex === "number") {
            setCurrentQuizIndex(parsedSession.currentQuizIndex);
          }
          if (parsedSession.selectedAnswers && typeof parsedSession.selectedAnswers === "object") {
            setSelectedAnswers(parsedSession.selectedAnswers);
          }
          if (typeof parsedSession.quizFinished === "boolean") {
            setQuizFinished(parsedSession.quizFinished);
          }
        }
        if (typeof parsedSession.selectedFolderId === "string") {
          setSelectedFolderId(parsedSession.selectedFolderId);
        }
      }
    } catch {
      // Ignore
    }
    reviewerSessionHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!reviewerSessionHydratedRef.current || typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        "evalo_student_reviewer_session",
        JSON.stringify({
          view,
          activeDeck: view === "study" ? activeDeck : null,
          activeTab,
          currentCardIndex,
          currentQuizIndex,
          selectedAnswers,
          quizFinished,
          selectedFolderId,
        })
      );
    } catch {
      // Ignore
    }
  }, [
    view,
    activeDeck,
    activeTab,
    currentCardIndex,
    currentQuizIndex,
    selectedAnswers,
    quizFinished,
    selectedFolderId,
  ]);

  // Warn if student refreshes or closes tab while generating reviewer
  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue =
        "Your AI study reviewer is currently generating. Refreshing or leaving this page will cancel it.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 4);
    }, 2400);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(interval);
    };
  }, [loading]);

  const saveDeckToStorage = async (deck: GeneratedReviewerDeck, folderId?: string) => {
    try {
      const existing = savedDecks.filter((d) => d.title !== deck.title);
      const targetFolderId =
        folderId ||
        (deck as any).folder_id ||
        (selectedFolderId !== "all" ? selectedFolderId : "general");
      const folderObj = folders.find((f) => f.id === targetFolderId);
      const deckWithFolder = {
        ...deck,
        folder_id: targetFolderId,
        folder_name: folderObj?.name || (deck as any).folder_name || "General",
        folder_color: folderObj?.color || (deck as any).folder_color || "steel",
      };
      const updated = [deckWithFolder, ...existing].slice(0, 50);
      setSavedDecks(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}

      // Persist to database in background so it's instantly available on phone & other devices
      try {
        const cloudRes = await studentApi.createCustomDeck({
          title: deckWithFolder.title,
          description: `Study deck • ${deckWithFolder.flashcards?.length || 0} cards`,
          deck_data: deckWithFolder,
        });
        if (cloudRes?.id) {
          deckWithFolder.id = cloudRes.id;
          const withId = updated.map((d) => (d.title === deckWithFolder.title ? { ...d, id: cloudRes.id } : d));
          setSavedDecks(withId);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(withId));
          } catch {}
        }
      } catch (cloudErr) {
        console.warn("Database reviewer sync deferred:", cloudErr);
      }
    } catch (e) {
      console.error("Failed to save deck:", e);
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: StudyFolder = {
      id: "folder_" + Date.now(),
      name: newFolderName.trim(),
      color: newFolderColor,
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(updated));
    setSelectedFolderId(newFolder.id);
    setNewFolderName("");
    setCreateFolderModalOpen(false);
    showToast(`Folder "${newFolder.name}" created!`);
  };

  const handleDeleteFolder = (folder: StudyFolder) => {
    // Safely reassign all decks in this folder to "general" so none are lost
    const updatedDecks = savedDecks.map((d: any) => {
      if (d.folder_id === folder.id) {
        return { ...d, folder_id: "general" };
      }
      return d;
    });
    setSavedDecks(updatedDecks);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDecks));

    const updatedFolders = folders.filter((f) => f.id !== folder.id);
    setFolders(updatedFolders);
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(updatedFolders));
    setSelectedFolderId("all");
    setDeleteFolderTarget(null);
    showToast(`Folder "${folder.name}" deleted. Decks moved to General.`);
  };

  const moveDeckToFolder = async (deckTitle: string, targetFolderId: string) => {
    const folderObj = folders.find((f) => f.id === targetFolderId);
    let targetDeck: any = null;
    const updated = savedDecks.map((d: any) => {
      if (d.title === deckTitle) {
        targetDeck = {
          ...d,
          folder_id: targetFolderId,
          folder_name: folderObj?.name || "General",
          folder_color: folderObj?.color || "steel",
        };
        return targetDeck;
      }
      return d;
    });
    setSavedDecks(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    setMovingDeck(null);
    const folderName = folderObj?.name || "folder";
    showToast(`Moved "${deckTitle}" to ${folderName}`);

    // Update in database so folder organization syncs across phone and PC
    if (targetDeck) {
      try {
        await studentApi.createCustomDeck({
          title: targetDeck.title,
          description: `Study deck • ${targetDeck.flashcards?.length || 0} cards`,
          deck_data: targetDeck,
        });
      } catch (err) {
        console.warn("Database folder sync failed:", err);
      }
    }
  };

  const requestDeleteSavedDeck = (title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDeckTarget(title);
  };

  const confirmDeleteSavedDeck = async () => {
    if (!deleteDeckTarget) return;
    const title = deleteDeckTarget;
    const targetDeck = savedDecks.find((d) => d.title === title);
    const updated = savedDecks.filter((d) => d.title !== title);
    setSavedDecks(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    if (activeDeck?.title === title) {
      setActiveDeck(null);
      setView("library");
    }
    setDeleteDeckTarget(null);
    showToast(`Removed "${title}" from your saved decks.`);

    // Persist deletion to PostgreSQL DB so it's deleted from all devices
    const idOrTitle = targetDeck?.id || title;
    try {
      await studentApi.deleteCustomDeck(idOrTitle);
    } catch (err) {
      console.warn("Database deck deletion failed:", err);
    }
  };

  const confirmRemoveFile = () => {
    if (removeFileIndexTarget !== null) {
      setSelectedFiles((prev) => {
        const next = prev.filter((_, idx) => idx !== removeFileIndexTarget);
        if (next.length > 0) {
          setDeckTitle(
            next
              .map((item) => item.file.name.replace(/\.[^/.]+$/, ""))
              .join(" + ")
          );
        } else {
          setDeckTitle("");
        }
        return next;
      });
    } else {
      setSelectedFiles([]);
      setDeckTitle("");
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setRemoveFileIndexTarget(null);
    setRemoveFileModalOpen(false);
    showToast("Uploaded file removed.");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const incoming = Array.from(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const remainingSlots = MAX_HANDOUT_FILES - selectedFiles.length;
    if (remainingSlots <= 0) {
      showToast(`Maximum of ${MAX_HANDOUT_FILES} handout files allowed per reviewer.`);
      return;
    }

    const allowedIncoming = incoming.slice(0, remainingSlots);
    if (incoming.length > remainingSlots) {
      showToast(
        `Added ${allowedIncoming.length} file(s). Maximum of ${MAX_HANDOUT_FILES} files per reviewer.`
      );
    }

    const newEntries = await Promise.all(
      allowedIncoming.map(async (file) => {
        const previewUrl = URL.createObjectURL(file);
        let text: string | undefined;
        if (
          file.name.toLowerCase().endsWith(".txt") ||
          file.name.toLowerCase().endsWith(".md")
        ) {
          try {
            text = await file.text();
          } catch {
            text = undefined;
          }
        }
        return { file, previewUrl, text };
      })
    );

    setSelectedFiles((prev) => {
      // Avoid exact duplicate filename in current selection
      const existingNames = new Set(prev.map((p) => p.file.name));
      const deduped = newEntries.filter((n) => !existingNames.has(n.file.name));
      const merged = [...prev, ...deduped].slice(0, MAX_HANDOUT_FILES);
      setDeckTitle(
        merged
          .map((item) => item.file.name.replace(/\.[^/.]+$/, ""))
          .join(" + ")
      );
      return merged;
    });
    setError(null);
  };

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);

    try {
      let result: GeneratedReviewerDeck;

      if (inputMode === "file") {
        if (selectedFiles.length === 0) {
          throw new Error("Please select 1 to 3 handout files to upload.");
        }
        const formData = new FormData();
        selectedFiles.forEach((item) => {
          formData.append("files", item.file);
        });
        formData.append("file", selectedFiles[0].file);
        if (deckTitle.trim()) {
          formData.append("title", deckTitle.trim());
        }
        result = await studentApi.generateReviewerFromFile(formData);
        result.file_name =
          result.file_name || selectedFiles.map((s) => s.file.name).join(", ");
        result.file_preview_url = selectedFiles[0].previewUrl;
        result.uploaded_files = selectedFiles.map((s) => ({
          name: s.file.name,
          preview_url: s.previewUrl,
          text: s.text,
          is_pdf:
            s.file.name.toLowerCase().endsWith(".pdf") ||
            s.file.type === "application/pdf",
        }));
      } else {
        if (!rawText.trim() || rawText.trim().length < 30) {
          throw new Error("Please paste at least a few sentences of lecture notes.");
        }
        result = await studentApi.generateReviewerFromText({
          raw_text: rawText.trim(),
          title: deckTitle.trim() || undefined,
        });
        result.source_text = result.source_text || rawText.trim();
      }

      const cleanedResult = sanitizeReviewerDeckClient(result);
      setActiveDeck(cleanedResult);
      saveDeckToStorage(cleanedResult);
      fetchQuotaAndShared();

      // Clear generator inputs so next time "Generate from handout" is opened it is fresh
      setSelectedFiles([]);
      setUploadedFileUrl(null);
      setUploadedFileText(null);
      setDeckTitle("");
      setRawText("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setGeneratorOpen(false);
      setCollapsedTopics(new Set());
      setView("study");
      scrollToTop();
      // Reset view
      setActiveTab("pointers");
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setMasteredCards(new Set());
      setCardAttempts({});
      setCardInput("");
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

  // Flashcard Helpers (Quiz-style Active Recall to Reveal Back)
  const currentCard = activeDeck?.flashcards[currentCardIndex];
  const currentCardAttempt = currentCard ? cardAttempts[currentCard.id] : undefined;

  const evaluateCardAnswer = (
    userRaw: string,
    targetAnswer: string,
    altTarget?: string
  ): boolean => {
    const clean = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const u = clean(userRaw);
    const t = clean(targetAnswer);
    const alt = altTarget ? clean(altTarget) : "";
    if (!u || u.length < 2) return false;
    if (u === t || (alt && u === alt)) return true;
    if (t.includes(u) && u.length >= Math.min(4, t.length)) return true;
    if (u.includes(t) && t.length >= 3) return true;
    if (alt && ((alt.includes(u) && u.length >= 4) || (u.includes(alt) && alt.length >= 3))) {
      return true;
    }

    const stopWords = new Set([
      "the", "and", "for", "that", "with", "from", "this", "are", "was", "were",
      "into", "such", "have", "has", "had", "not", "but", "can", "will", "its",
      "which", "their", "used", "using", "also", "more", "than", "when", "where",
    ]);
    const targetWords = (t + " " + alt)
      .split(" ")
      .filter((w) => w.length >= 3 && !stopWords.has(w));
    const userWords = new Set(u.split(" ").filter((w) => w.length >= 3));
    if (targetWords.length === 0) return u.length >= 2;

    let hits = 0;
    for (const tw of targetWords) {
      if (userWords.has(tw)) hits++;
    }
    return hits >= 1 && (hits >= 2 || hits / Math.min(targetWords.length, 4) >= 0.35);
  };

  const handleCardAnswerSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentCard || !cardInput.trim()) return;

    const expectedBack =
      cardPromptMode === "definition_first" ? currentCard.front : currentCard.back;
    const altSide =
      cardPromptMode === "definition_first" ? currentCard.back : currentCard.front;

    const matched = evaluateCardAnswer(cardInput, expectedBack, altSide);
    setCardAttempts((prev) => ({
      ...prev,
      [currentCard.id]: { answer: cardInput.trim(), matched },
    }));
    if (matched) {
      setMasteredCards((prev) => {
        const next = new Set(prev);
        next.add(currentCard.id);
        return next;
      });
    }
    setIsFlipped(true);
  };

  const markCardCorrectOverride = (cardId: string) => {
    setCardAttempts((prev) => {
      const existing = prev[cardId];
      if (!existing) return prev;
      return { ...prev, [cardId]: { ...existing, matched: true } };
    });
    setMasteredCards((prev) => {
      const next = new Set(prev);
      next.add(cardId);
      return next;
    });
  };

  const resetCardAttempt = (cardId: string) => {
    setCardAttempts((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
    setMasteredCards((prev) => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
    setCardInput("");
    setIsFlipped(false);
    setTimeout(() => cardInputRef.current?.focus(), 60);
  };

  const nextCard = () => {
    if (!activeDeck || !activeDeck.flashcards?.length) return;
    const nextIdx = (currentCardIndex + 1) % activeDeck.flashcards.length;
    const nextCardObj = activeDeck.flashcards[nextIdx];
    const nextAttempt = nextCardObj ? cardAttempts[nextCardObj.id] : undefined;
    setIsFlipped(false);
    setCurrentCardIndex(nextIdx);
    setCardInput(nextAttempt?.answer || "");
  };

  const prevCard = () => {
    if (!activeDeck || !activeDeck.flashcards?.length) return;
    const prevIdx =
      (currentCardIndex - 1 + activeDeck.flashcards.length) %
      activeDeck.flashcards.length;
    const prevCardObj = activeDeck.flashcards[prevIdx];
    const prevAttempt = prevCardObj ? cardAttempts[prevCardObj.id] : undefined;
    setIsFlipped(false);
    setCurrentCardIndex(prevIdx);
    setCardInput(prevAttempt?.answer || "");
  };

  const shuffleCards = () => {
    if (!activeDeck) return;
    const shuffled = [...activeDeck.flashcards].sort(() => Math.random() - 0.5);
    setActiveDeck({ ...activeDeck, flashcards: shuffled });
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setCardInput("");
  };

  const shuffleQuiz = () => {
    if (!activeDeck || !activeDeck.quiz_cards || activeDeck.quiz_cards.length === 0) return;
    const letters = ["A", "B", "C", "D"] as const;

    // 1. Shuffle question order
    const shuffledCards = [...activeDeck.quiz_cards].sort(() => Math.random() - 0.5);

    // 2. Shuffle choices (A, B, C, D) for each question & update correct_option dynamically
    const rumbledQuizCards = shuffledCards.map((qc, newIdx) => {
      const availableLetters = letters.filter(
        (l) => qc.options && qc.options[l] && qc.options[l].trim() !== ""
      );

      if (availableLetters.length < 2) {
        return { ...qc, question_number: newIdx + 1 };
      }

      const perm = [...availableLetters].sort(() => Math.random() - 0.5);
      const newOptions: Record<string, string> = { ...qc.options };
      let newCorrect = qc.correct_option;

      availableLetters.forEach((targetLetter, i) => {
        const sourceLetter = perm[i];
        newOptions[targetLetter] = qc.options[sourceLetter];
        if (sourceLetter === qc.correct_option) {
          newCorrect = targetLetter;
        }
      });

      return {
        ...qc,
        question_number: newIdx + 1,
        options: newOptions,
        correct_option: newCorrect,
      };
    });

    setActiveDeck({
      ...activeDeck,
      quiz_cards: rumbledQuizCards,
    });
    setSelectedAnswers({});
    setCurrentQuizIndex(0);
    setQuizFinished(false);
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

  // ── Derived helpers for the redesigned UI ─────────────────────────
  const getDeckFolder = (deck: any) =>
    folders.find((f) => f.id === (deck.folder_id || "general")) || folders[0] || DEFAULT_FOLDERS[0];
  const getCardCount = (deck: any) => deck?.total_flashcards || deck?.flashcards?.length || 0;
  const getQuizCount = (deck: any) => deck?.total_quiz_cards || deck?.quiz_cards?.length || 0;

  const normalizedQuery = deckSearchQuery.trim().toLowerCase();
  const filteredDecks = savedDecks.filter((deck: any) => {
    const inFolder =
      selectedFolderId === "all"
        ? true
        : selectedFolderId === "general"
        ? !deck.folder_id || deck.folder_id === "general"
        : deck.folder_id === selectedFolderId;
    if (!inFolder) return false;
    if (!normalizedQuery) return true;
    return (
      deck.title?.toLowerCase().includes(normalizedQuery) ||
      deck.topics?.some((t: any) => t.topic_name?.toLowerCase().includes(normalizedQuery))
    );
  });
  const selectedFolder = folders.find((f) => f.id === selectedFolderId);
  const quotaLow = (quotaInfo?.remaining ?? 10) <= 3;
  const flashTotal = activeDeck?.flashcards?.length || 0;
  const pointerCount = activeDeck?.topics?.length || 0;

  const openSharedDeck = (deck: GeneratedReviewerDeck) => {
    saveDeckToStorage(deck);
    handleSelectDeckToStudy(deck);
  };

  const toggleTopic = (idx: number) => {
    setCollapsedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const renderSourceRow = (opts: {
    key: string;
    title: string;
    subtitle: string;
    note?: string;
    leading: React.ReactNode;
    active: boolean;
    onOpen: () => void;
    onDismiss?: () => void;
  }) => (
    <li key={opts.key}>
      <div
        className={`flex items-center gap-3 rounded-2xl p-3 sm:p-3.5 transition-colors ${
          opts.active ? "bg-steel-ghost" : "hover:bg-surface-subtle/70"
        }`}
      >
        <button
          type="button"
          onClick={opts.onOpen}
          className="flex flex-1 min-w-0 items-center gap-3 text-left cursor-pointer"
        >
          {opts.leading}
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold leading-snug text-text-primary line-clamp-2 wrap-break-word">
              {opts.title}
            </span>
            <span className="mt-0.5 block text-[13px] text-text-muted truncate">{opts.subtitle}</span>
            {opts.note && (
              <span className="mt-1 block text-[13px] italic text-text-secondary line-clamp-2">
                &ldquo;{opts.note}&rdquo;
              </span>
            )}
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-text-faint" />
        </button>
        {opts.onDismiss && (
          <button
            type="button"
            onClick={opts.onDismiss}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-burgundy-ghost hover:text-burgundy transition cursor-pointer"
            title="Dismiss"
            aria-label={`Dismiss ${opts.title}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </li>
  );

  return (
    <div ref={rootRef} className="space-y-5 scroll-mt-24">
      {/* ════════════════════════════════════════════════════════════ */}
      {/* STUDY VIEW — focused, one deck at a time                      */}
      {/* ════════════════════════════════════════════════════════════ */}
      {view === "study" && activeDeck && !loading ? (
        <div className="space-y-4 rv-fade">
          {/* Deck Header */}
          <section className="rounded-3xl border border-border-default bg-surface-raised p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <button
                id="reviewer-back-to-library"
                type="button"
                onClick={() => setView("library")}
                className="-ml-2 inline-flex min-h-10 items-center gap-1 rounded-xl px-2.5 text-sm font-semibold text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
                My decks
              </button>
              <div className="flex flex-wrap items-center gap-1.5">
                {(activeDeck.uploaded_files?.length ||
                  activeDeck.file_preview_url ||
                  activeDeck.source_text ||
                  uploadedFileUrl ||
                  uploadedFileText) && (
                  <button
                    id="reviewer-view-handout"
                    type="button"
                    onClick={() => {
                      setActiveHandoutFileIndex(0);
                      const firstUploaded = activeDeck.uploaded_files?.[0];
                      const hasPdf = firstUploaded
                        ? Boolean(firstUploaded.preview_url && firstUploaded.is_pdf)
                        : Boolean(activeDeck.file_preview_url || uploadedFileUrl) &&
                          (activeDeck.file_name || "")
                            .toLowerCase()
                            .endsWith(".pdf");
                      setHandoutViewTab(hasPdf ? "pdf" : "text");
                      setHandoutViewerOpen(true);
                    }}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-tan-border bg-tan-ghost px-3 text-sm font-semibold text-tan hover:brightness-105 transition cursor-pointer"
                  >
                    <Eye className="h-4 w-4" />
                    {activeDeck.uploaded_files && activeDeck.uploaded_files.length > 1
                      ? `View Handouts (${activeDeck.uploaded_files.length})`
                      : "View Handout"}
                  </button>
                )}
                <button
                  id="reviewer-edit-deck"
                  type="button"
                  onClick={() => {
                    setEditingDeck(activeDeck);
                    setCustomModalOpen(true);
                  }}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border-default px-3 text-sm font-semibold text-text-primary hover:bg-surface-subtle transition cursor-pointer"
                >
                  <Edit3 className="h-4 w-4 text-steel" />
                  Edit
                </button>
                <button
                  id="reviewer-share-deck"
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border-default px-3 text-sm font-semibold text-text-primary hover:bg-surface-subtle transition cursor-pointer"
                >
                  <Share2 className="h-4 w-4 text-steel" />
                  Share
                </button>
              </div>
            </div>

            <div>
              {activeDeck.cached && (
                <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-sage-ghost border border-sage-border px-2.5 py-1 text-xs font-semibold text-sage">
                  <Sparkles className="h-3.5 w-3.5" />
                  From class cache · no quota used
                </span>
              )}
              <h2 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-text-primary wrap-break-word">
                {activeDeck.title}
              </h2>
            </div>

            {/* Study Mode Tabs */}
            <div role="tablist" className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-subtle p-1">
              {(
                [
                  { id: "pointers", label: "Pointers", icon: BookOpen, count: pointerCount },
                  { id: "flashcards", label: "Cards", icon: Layers, count: flashTotal },
                  { id: "quiz", label: "Quiz", icon: Award, count: totalQuiz },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    id={`reviewer-tab-${tab.id}`}
                    role="tab"
                    aria-selected={isActive}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex min-h-12 flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 rounded-xl px-2 text-sm font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-surface-raised text-text-primary shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon className={`h-4 w-4 ${isActive ? "text-steel" : ""}`} />
                      {tab.label}
                    </span>
                    <span className={`text-xs font-medium ${isActive ? "text-steel" : "text-text-faint"}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── TAB 1: POINTERS ─────────────────────────────────── */}
          {activeTab === "pointers" && (
            <div className="space-y-3 rv-fade">
              {pointerCount === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-border-default p-8 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-text-faint" />
                  <p className="mt-2 text-sm font-semibold text-text-secondary">No pointers in this deck yet.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-1">
                    <p className="text-sm text-text-muted">
                      {pointerCount} {pointerCount === 1 ? "topic" : "topics"} to review
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedTopics(
                          collapsedTopics.size === 0
                            ? new Set(activeDeck.topics.map((_, i) => i))
                            : new Set()
                        )
                      }
                      className="text-sm font-semibold text-steel hover:underline cursor-pointer"
                    >
                      {collapsedTopics.size === 0 ? "Collapse all" : "Expand all"}
                    </button>
                  </div>

                  {activeDeck.topics.map((topic, tIdx) => {
                    const collapsed = collapsedTopics.has(tIdx);
                    return (
                      <article
                        key={tIdx}
                        className="overflow-hidden rounded-3xl border border-border-default bg-surface-raised shadow-sm"
                      >
                        <button
                          type="button"
                          onClick={() => toggleTopic(tIdx)}
                          aria-expanded={!collapsed}
                          className="flex w-full items-start gap-3 p-4 sm:p-5 text-left hover:bg-surface-subtle/40 transition-colors cursor-pointer"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tan-ghost border border-tan-border text-sm font-bold text-tan">
                            {tIdx + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-base sm:text-lg font-bold leading-snug text-text-primary">
                              {topic.topic_name}
                            </span>
                            {topic.description && (
                              <span className="mt-1 block text-sm leading-relaxed text-text-secondary">
                                {topic.description}
                              </span>
                            )}
                          </span>
                          <ChevronDown
                            className={`mt-1.5 h-5 w-5 shrink-0 text-text-muted transition-transform duration-200 ${
                              collapsed ? "" : "rotate-180"
                            }`}
                          />
                        </button>

                        {!collapsed && (
                          <div className="space-y-5 px-4 pb-5 sm:px-5 sm:pb-6 rv-fade">
                            {/* Key Terms */}
                            {topic.key_terms?.length > 0 && (
                              <div>
                                <h4 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                                  <Lightbulb className="h-4 w-4 text-tan" />
                                  Key terms
                                </h4>
                                <dl className="overflow-hidden rounded-2xl border border-border-default bg-surface-base">
                                  {topic.key_terms.map((item, kIdx) => (
                                    <div
                                      key={kIdx}
                                      className={`p-4 ${kIdx > 0 ? "border-t border-border-default" : ""}`}
                                    >
                                      <dt className="text-[15px] font-bold text-steel">{item.term}</dt>
                                      <dd className="mt-1 text-[15px] leading-relaxed text-text-secondary">
                                        {item.definition}
                                      </dd>
                                    </div>
                                  ))}
                                </dl>
                              </div>
                            )}

                            {/* Takeaways */}
                            {topic.bullet_points && topic.bullet_points.length > 0 && (
                              <div>
                                <h4 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                                  <CheckCircle2 className="h-4 w-4 text-sage" />
                                  Key takeaways
                                </h4>
                                <ul className="space-y-3">
                                  {topic.bullet_points.map((bp, bIdx) => (
                                    <li key={bIdx} className="flex items-start gap-3">
                                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-steel" />
                                      <span className="text-[15px] leading-relaxed text-text-secondary">{bp}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Exam Tips */}
                            {topic.exam_tips && topic.exam_tips.length > 0 && (
                              <div className="rounded-2xl border border-tan-border bg-tan-ghost p-4">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-tan">
                                  <Sparkles className="h-4 w-4" />
                                  Exam tips
                                </h4>
                                <ul className="mt-2 space-y-2">
                                  {topic.exam_tips.map((tip, tipIdx) => (
                                    <li key={tipIdx} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-text-primary">
                                      <span className="mt-0.5 text-tan">›</span>
                                      <span>{tip}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* ── TAB 2: FLASHCARDS (ACTIVE-RECALL QUIZ MODE) ───────── */}
          {activeTab === "flashcards" && (
            <div className="space-y-4 rv-fade">
              {!currentCard ? (
                <div className="rounded-3xl border-2 border-dashed border-border-default p-8 text-center">
                  <Layers className="mx-auto h-8 w-8 text-text-faint" />
                  <p className="mt-2 text-sm font-semibold text-text-secondary">This deck has no flashcards.</p>
                </div>
              ) : (
                <>
                  {/* Progress & Prompt Direction */}
                  <div className="rounded-2xl border border-border-default bg-surface-raised p-4 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-text-primary">
                        Card {currentCardIndex + 1}
                        <span className="font-normal text-text-muted"> of {flashTotal}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-sage">
                          <CheckCircle2 className="h-4 w-4" />
                          {masteredCards.size}/{flashTotal}
                          <span className="hidden sm:inline font-normal">correct</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCardPromptMode((prev) =>
                              prev === "definition_first" ? "term_first" : "definition_first"
                            );
                            setIsFlipped(Boolean(currentCardAttempt));
                          }}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border-default bg-surface-base px-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition cursor-pointer"
                          title="Switch what is shown on the front of the card"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-steel" />
                          {cardPromptMode === "definition_first"
                            ? "Prompt: Definition → Answer Term"
                            : "Prompt: Term → Answer Meaning"}
                        </button>
                        <button
                          id="reviewer-shuffle-cards"
                          type="button"
                          onClick={shuffleCards}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border-default px-3 text-sm font-semibold text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition cursor-pointer"
                        >
                          <Shuffle className="h-4 w-4" />
                          Shuffle
                        </button>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full rv-progress transition-all duration-300"
                        style={{ width: `${((currentCardIndex + 1) / flashTotal) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Flip Card (Locked until answered) */}
                  <div
                    id="reviewer-flashcard"
                    role="button"
                    tabIndex={0}
                    aria-label={
                      currentCardAttempt
                        ? isFlipped
                          ? "Show prompt"
                          : "Show answer"
                        : "Enter your answer below to reveal the back of the card"
                    }
                    onClick={() => {
                      if (!currentCardAttempt) {
                        cardInputRef.current?.focus();
                        showToast("Type your answer below to unlock and reveal the back of the card!");
                        return;
                      }
                      setIsFlipped(!isFlipped);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        if (!currentCardAttempt) {
                          cardInputRef.current?.focus();
                          return;
                        }
                        setIsFlipped(!isFlipped);
                      } else if (e.key === "ArrowRight") nextCard();
                      else if (e.key === "ArrowLeft") prevCard();
                    }}
                    className="relative h-88 sm:h-96 w-full cursor-pointer select-none perspective-1000 outline-none focus-visible:ring-2 focus-visible:ring-steel rounded-3xl"
                  >
                    <div
                      key={currentCard.id || currentCardIndex}
                      className="relative h-full w-full rounded-3xl transition-transform duration-500 shadow-lg rv-fade"
                      style={{
                        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                        transformStyle: "preserve-3d",
                      }}
                    >
                      {/* Front */}
                      <div
                        className="absolute inset-0 flex flex-col rounded-3xl border border-border-default bg-surface-raised p-5 sm:p-8"
                        style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          {currentCard.category ? (
                            <span className="max-w-[70%] truncate rounded-full bg-steel-ghost border border-steel-border px-3 py-1 text-xs font-semibold text-steel">
                              {currentCard.category}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-faint">
                            {!currentCardAttempt && <Lock className="h-3.5 w-3.5 text-tan" />}
                            {cardPromptMode === "definition_first" ? "Clue / Definition" : "Term"}
                          </span>
                        </div>
                        <div className="flex flex-1 items-center justify-center overflow-y-auto py-4">
                          {cardPromptMode === "definition_first" ? (
                            <p className="text-center text-lg sm:text-xl font-bold leading-relaxed text-text-primary wrap-break-word max-w-2xl">
                              {currentCard.back}
                            </p>
                          ) : (
                            <h3 className="text-center text-2xl sm:text-3xl font-black leading-tight tracking-tight text-text-primary wrap-break-word">
                              {currentCard.front}
                            </h3>
                          )}
                        </div>
                        <p className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium text-text-muted">
                          {currentCardAttempt ? (
                            <>
                              <RotateCcw className="h-4 w-4 text-steel" />
                              Tap card to flip to answer
                            </>
                          ) : (
                            <>
                              <Lock className="h-3.5 w-3.5 text-tan" />
                              Submit your answer below to reveal the back
                            </>
                          )}
                        </p>
                      </div>

                      {/* Back */}
                      <div
                        className="absolute inset-0 flex flex-col rounded-3xl border border-tan-border bg-surface-raised p-5 sm:p-8"
                        style={{
                          backfaceVisibility: "hidden",
                          WebkitBackfaceVisibility: "hidden",
                          transform: "rotateY(180deg)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-full bg-tan-ghost border border-tan-border px-3 py-1 text-xs font-semibold text-tan">
                            Revealed Back
                          </span>
                          <span className="max-w-[60%] truncate text-xs font-semibold text-text-muted">
                            {cardPromptMode === "definition_first" ? "Exact Term" : currentCard.front}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto py-4 text-center space-y-2">
                          {isFlipped ? (
                            cardPromptMode === "definition_first" ? (
                              <>
                                <h3 className="text-2xl sm:text-3xl font-black text-sage wrap-break-word">
                                  {currentCard.front}
                                </h3>
                                <p className="max-w-xl text-sm text-text-secondary leading-relaxed">
                                  {currentCard.back}
                                </p>
                              </>
                            ) : (
                              <p className="w-full text-base sm:text-lg font-medium leading-relaxed text-text-primary">
                                {currentCard.back}
                              </p>
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center text-text-muted gap-2 py-4">
                              <Lock className="h-6 w-6 text-tan" />
                              <p className="text-sm font-semibold">Answer prompt to reveal</p>
                            </div>
                          )}
                        </div>
                        <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-text-muted">
                          <RotateCcw className="h-4 w-4" />
                          Tap to flip back
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Active-Recall Answer Input / Result Box (Replaces "I know this") */}
                  {!currentCardAttempt ? (
                    <form
                      onSubmit={handleCardAnswerSubmit}
                      className="rounded-2xl border border-border-default bg-surface-raised p-3.5 sm:p-4 shadow-sm space-y-2.5"
                    >
                      <label
                        htmlFor="reviewer-card-answer-input"
                        className="block text-xs font-bold uppercase tracking-wider text-text-secondary"
                      >
                        {cardPromptMode === "definition_first"
                          ? "What term or concept matches this definition?"
                          : "Type the meaning or key concept to reveal the back:"}
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          ref={cardInputRef}
                          id="reviewer-card-answer-input"
                          type="text"
                          value={cardInput}
                          onChange={(e) => setCardInput(e.target.value)}
                          placeholder={
                            cardPromptMode === "definition_first"
                              ? "Type the term / answer here..."
                              : "Type key words or explanation..."
                          }
                          className="flex-1 rounded-xl border border-border-default bg-surface-base px-4 py-3 text-[15px] text-text-primary placeholder:text-text-faint focus:border-steel focus:outline-none transition"
                        />
                        <button
                          id="reviewer-submit-card-answer"
                          type="submit"
                          disabled={!cardInput.trim()}
                          className="rv-btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold shadow-md transition active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Send className="h-4 w-4" />
                          Submit &amp; Reveal
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div
                      className={`rounded-2xl border p-4 shadow-sm space-y-3 rv-fade ${
                        currentCardAttempt.matched
                          ? "border-sage-border bg-sage-ghost"
                          : "border-tan-border bg-tan-ghost"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                              currentCardAttempt.matched ? "text-sage" : "text-tan"
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {currentCardAttempt.matched
                              ? "Correct! Back of card unlocked"
                              : "Back of card revealed — compare your answer"}
                          </span>
                          <p className="mt-1 text-sm text-text-primary">
                            <span className="font-semibold text-text-secondary">Your answer: </span>
                            <span className="font-bold">&ldquo;{currentCardAttempt.answer}&rdquo;</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!currentCardAttempt.matched && (
                            <button
                              type="button"
                              onClick={() => markCardCorrectOverride(currentCard.id)}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-sage px-3 text-xs font-bold text-white shadow-xs hover:brightness-105 transition cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              My answer was right
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => resetCardAttempt(currentCard.id)}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border-default bg-surface-raised px-3 text-xs font-semibold text-text-secondary hover:text-text-primary transition cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Try again
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Controls */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      id="reviewer-prev-card"
                      type="button"
                      onClick={prevCard}
                      aria-label="Previous card"
                      className="flex h-12 flex-1 sm:flex-initial sm:px-6 items-center justify-center gap-1.5 rounded-2xl border border-border-default bg-surface-raised text-sm font-semibold text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition active:scale-95 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                      <span>Previous</span>
                    </button>
                    <button
                      id="reviewer-next-card"
                      type="button"
                      onClick={nextCard}
                      aria-label="Next card"
                      className="rv-btn-primary flex h-12 flex-1 sm:flex-initial sm:px-6 items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold shadow-md active:scale-95 cursor-pointer"
                    >
                      <span>Next Card</span>
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB 3: PRACTICE QUIZ ────────────────────────────── */}
          {activeTab === "quiz" && (
            <div className="space-y-4 rv-fade">
              {totalQuiz === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-border-default p-8 text-center">
                  <Award className="mx-auto h-8 w-8 text-text-faint" />
                  <p className="mt-2 text-sm font-semibold text-text-secondary">This deck has no quiz questions.</p>
                </div>
              ) : !quizFinished && currentQuiz ? (
                <section className="rounded-3xl border border-border-default bg-surface-raised p-5 sm:p-7 shadow-sm space-y-5">
                  {/* Progress */}
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-semibold text-text-primary">
                        Question {currentQuizIndex + 1}
                        <span className="font-normal text-text-muted"> of {totalQuiz}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          id="reviewer-quiz-shuffle"
                          onClick={shuffleQuiz}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-subtle border border-border-default hover:bg-surface-muted text-xs font-semibold text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                          title="Shuffle quiz questions and multiple-choice options"
                        >
                          <Shuffle className="h-3.5 w-3.5 text-steel" />
                          <span>Shuffle Questions &amp; Choices</span>
                        </button>
                        <span className="text-text-muted text-xs">{answeredCount} answered</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full rv-progress transition-all duration-300"
                        style={{ width: `${((currentQuizIndex + 1) / totalQuiz) * 100}%` }}
                      />
                    </div>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold leading-snug text-text-primary">
                    {currentQuiz.question}
                  </h3>

                  {/* Options */}
                  <div className="space-y-2.5">
                    {(["A", "B", "C", "D"] as const).map((optKey) => {
                      const optText = currentQuiz.options[optKey];
                      if (!optText) return null;
                      const picked = selectedAnswers[currentQuiz.question_number];
                      const hasAnswered = picked !== undefined;
                      const isSelected = picked === optKey;
                      const isCorrect = optKey === currentQuiz.correct_option;

                      let rowStyle =
                        "border-border-default bg-surface-base hover:border-steel hover:bg-steel-ghost text-text-primary";
                      let letterStyle = "border-border-default bg-surface-raised text-text-secondary";
                      if (hasAnswered) {
                        if (isCorrect) {
                          rowStyle = "border-sage bg-sage-ghost text-text-primary";
                          letterStyle = "border-transparent bg-sage text-white";
                        } else if (isSelected) {
                          rowStyle = "border-burgundy bg-burgundy-ghost text-text-primary";
                          letterStyle = "border-transparent bg-burgundy text-white";
                        } else {
                          rowStyle = "border-border-default bg-surface-base text-text-muted opacity-60";
                        }
                      }

                      return (
                        <button
                          key={optKey}
                          id={`reviewer-quiz-option-${optKey}`}
                          type="button"
                          disabled={hasAnswered}
                          onClick={() =>
                            setSelectedAnswers((prev) => ({
                              ...prev,
                              [currentQuiz.question_number]: optKey,
                            }))
                          }
                          className={`flex w-full items-start gap-3 rounded-2xl border-2 p-3.5 sm:p-4 text-left transition-all disabled:cursor-default cursor-pointer ${rowStyle}`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${letterStyle}`}
                          >
                            {optKey}
                          </span>
                          <span className="flex-1 pt-1 text-[15px] font-medium leading-relaxed">{optText}</span>
                          {hasAnswered && isCorrect && <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-sage" />}
                          {hasAnswered && isSelected && !isCorrect && (
                            <X className="mt-1 h-5 w-5 shrink-0 text-burgundy" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {selectedAnswers[currentQuiz.question_number] !== undefined && currentQuiz.explanation && (
                    <div className="rounded-2xl border border-tan-border bg-tan-ghost p-4 rv-fade">
                      <p className="flex items-center gap-2 text-sm font-bold text-tan">
                        <Lightbulb className="h-4 w-4" />
                        {selectedAnswers[currentQuiz.question_number] === currentQuiz.correct_option
                          ? "Correct! Here's why"
                          : `Answer: ${currentQuiz.correct_option}`}
                      </p>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-text-primary">
                        {currentQuiz.explanation}
                      </p>
                    </div>
                  )}

                  {/* Nav */}
                  <div className="flex items-center gap-2 border-t border-border-default pt-4">
                    <button
                      id="reviewer-quiz-prev"
                      type="button"
                      disabled={currentQuizIndex === 0}
                      onClick={() => setCurrentQuizIndex((p) => Math.max(0, p - 1))}
                      className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-border-default px-4 text-sm font-semibold text-text-secondary hover:bg-surface-subtle hover:text-text-primary disabled:opacity-40 transition active:scale-95 cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                    {currentQuizIndex < totalQuiz - 1 ? (
                      <button
                        id="reviewer-quiz-next"
                        type="button"
                        onClick={() => setCurrentQuizIndex((p) => p + 1)}
                        className="rv-btn-primary flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold shadow-md active:scale-[0.98] cursor-pointer"
                      >
                        Next question
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        id="reviewer-quiz-finish"
                        type="button"
                        onClick={() => setQuizFinished(true)}
                        className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-sage text-sm font-semibold text-white shadow-md hover:brightness-110 transition active:scale-[0.98] cursor-pointer"
                      >
                        <Award className="h-4 w-4" />
                        Finish &amp; see score
                      </button>
                    )}
                  </div>
                </section>
              ) : (
                (() => {
                  const result = calculateScore();
                  const missed = activeDeck.quiz_cards.filter(
                    (q) => selectedAnswers[q.question_number] !== q.correct_option
                  );
                  return (
                    <section className="rounded-3xl border border-border-default bg-surface-raised p-5 sm:p-8 shadow-sm space-y-6">
                      <div className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sage-ghost border border-sage-border text-sage">
                          <Award className="h-8 w-8" />
                        </div>
                        <h3 className="mt-3 text-xl sm:text-2xl font-black text-text-primary">Quiz complete!</h3>
                        <p className="mt-1 text-sm text-text-muted">
                          {result.percentage >= 75
                            ? "Great work — you're ready for this topic."
                            : "Keep going — review the items below and try again."}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-border-default bg-surface-base p-4 text-center">
                          <p className="text-3xl font-black text-text-primary">
                            {result.score}
                            <span className="text-lg font-semibold text-text-muted">/{result.total}</span>
                          </p>
                          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-text-muted">Correct</p>
                        </div>
                        <div className="rounded-2xl border border-border-default bg-surface-base p-4 text-center">
                          <p className={`text-3xl font-black ${result.percentage >= 75 ? "text-sage" : "text-tan"}`}>
                            {result.percentage}%
                          </p>
                          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-text-muted">Score</p>
                        </div>
                      </div>

                      {missed.length > 0 && (
                        <div>
                          <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-text-muted">
                            Review these ({missed.length})
                          </h4>
                          <ul className="space-y-2.5">
                            {missed.map((q) => (
                              <li key={q.question_number} className="rounded-2xl border border-border-default bg-surface-base p-4">
                                <p className="text-[15px] font-semibold leading-snug text-text-primary">{q.question}</p>
                                <p className="mt-2 text-sm text-sage">
                                  <span className="font-bold">Correct:</span> {q.correct_option}. {q.options[q.correct_option as "A"]}
                                </p>
                                {selectedAnswers[q.question_number] && (
                                  <p className="mt-0.5 text-sm text-burgundy">
                                    <span className="font-bold">Yours:</span> {selectedAnswers[q.question_number]}.{" "}
                                    {q.options[selectedAnswers[q.question_number] as "A"]}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <button
                          id="reviewer-quiz-retake"
                          type="button"
                          onClick={() => {
                            setSelectedAnswers({});
                            setCurrentQuizIndex(0);
                            setQuizFinished(false);
                          }}
                          className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border-default text-sm font-semibold text-text-primary hover:bg-surface-subtle transition cursor-pointer"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Retake quiz
                        </button>
                        <button
                          id="reviewer-quiz-shuffle-retake"
                          type="button"
                          onClick={shuffleQuiz}
                          className="rv-btn-primary flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-semibold shadow-md cursor-pointer"
                        >
                          <Shuffle className="h-4 w-4" />
                          Shuffle &amp; Retake
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("flashcards")}
                          className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border-default text-sm font-semibold text-text-primary hover:bg-surface-subtle transition cursor-pointer"
                        >
                          <Layers className="h-4 w-4" />
                          Review flashcards
                        </button>
                      </div>
                    </section>
                  );
                })()
              )}
            </div>
          )}
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════ */
        /* LIBRARY VIEW — generate, browse & organise decks              */
        /* ════════════════════════════════════════════════════════════ */
        <div className="space-y-5 rv-fade">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl border border-border-default bg-surface-raised p-5 sm:p-6 shadow-sm">
            <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-steel/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-tan/10 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-wider text-tan">AI Study Reviewer</p>
              <h2 className="mt-1 text-xl sm:text-2xl font-black leading-tight tracking-tight text-text-primary">
                Turn your handouts into a reviewer
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-text-secondary">
                Upload a handout or paste notes — get key pointers, flashcards and a practice quiz in seconds.
              </p>

              <div
                title="Shared and saved decks don't use your monthly quota."
                className={`mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  quotaInfo && quotaInfo.remaining === 0
                    ? "border-tan-border bg-tan-ghost text-tan"
                    : quotaLow
                    ? "border-tan-border bg-tan-ghost text-tan"
                    : "border-sage-border bg-sage-ghost text-sage"
                }`}
              >
                {quotaInfo && quotaInfo.remaining === 0 ? (
                  <>
                    <Timer className="h-3.5 w-3.5" />
                    Generator currently resting • Unlimited saved & shared decks
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    {quotaInfo
                      ? `${quotaInfo.remaining} of ${quotaInfo.limit} generations left this month`
                      : "10 generations per month"}
                  </>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  id="reviewer-toggle-generator"
                  type="button"
                  onClick={() => setGeneratorOpen((o) => !o)}
                  aria-expanded={generatorOpen}
                  className="rv-btn-primary flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold shadow-md active:scale-[0.98] cursor-pointer"
                >
                  {generatorOpen ? <X className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
                  {generatorOpen ? "Close generator" : "Generate from handout"}
                </button>
                <button
                  id="reviewer-create-custom"
                  type="button"
                  onClick={() => {
                    setEditingDeck(null);
                    setCustomModalOpen(true);
                  }}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border-default bg-surface-raised px-4 text-sm font-semibold text-text-primary hover:bg-surface-subtle transition active:scale-[0.98] cursor-pointer"
                >
                  <Plus className="h-4 w-4 text-steel" />
                  Create custom deck
                </button>
              </div>
            </div>
          </section>

          {/* Generator Panel */}
          {generatorOpen && (
            <section
              id="reviewer-generator"
              className="rounded-3xl border border-border-default bg-surface-raised p-5 sm:p-6 shadow-sm space-y-4 rv-fade"
            >
              <div>
                <h3 className="text-lg font-bold text-text-primary">New reviewer</h3>
                <p className="mt-0.5 text-sm text-text-muted">Choose how you want to add your lesson.</p>
              </div>

              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-subtle p-1">
                {(
                  [
                    { id: "file", label: "Upload file", icon: UploadCloud },
                    { id: "text", label: "Paste notes", icon: FileText },
                  ] as const
                ).map((m) => {
                  const Icon = m.icon;
                  const isActive = inputMode === m.id;
                  return (
                    <button
                      key={m.id}
                      id={`reviewer-mode-${m.id}`}
                      type="button"
                      onClick={() => setInputMode(m.id)}
                      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                        isActive ? "bg-surface-raised text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "text-steel" : ""}`} />
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-burgundy-border bg-burgundy-ghost p-3.5 text-sm text-burgundy">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="reviewer-deck-title" className="mb-1.5 block text-sm font-semibold text-text-secondary">
                  Deck title <span className="font-normal text-text-muted">(optional)</span>
                </label>
                <input
                  id="reviewer-deck-title"
                  type="text"
                  placeholder="e.g. Advance Database – Prelims"
                  value={deckTitle}
                  onChange={(e) => setDeckTitle(e.target.value)}
                  className="w-full rounded-2xl border border-border-default bg-surface-base px-4 py-3 text-[15px] text-text-primary placeholder:text-text-faint focus:border-steel focus:outline-none transition"
                />
              </div>

              {inputMode === "file" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>
                      Upload 1 to {MAX_HANDOUT_FILES} handouts for this reviewer
                    </span>
                    <span className="font-semibold text-text-secondary">
                      {selectedFiles.length} / {MAX_HANDOUT_FILES} selected
                    </span>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.txt,.docx,.md"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {selectedFiles.length > 0 ? (
                    <div className="space-y-2.5">
                      {selectedFiles.map((item, idx) => (
                        <div
                          key={`${item.file.name}-${idx}`}
                          className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-default bg-surface-base p-3.5"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-steel-ghost border border-steel-border text-steel font-bold text-xs">
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold text-text-primary">
                              {item.file.name}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-text-muted">
                              {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                              <span aria-hidden>·</span>
                              <span className="inline-flex items-center gap-1 font-semibold text-sage">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                              </span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveHandoutFileIndex(idx);
                              const isPdf =
                                item.file.name.toLowerCase().endsWith(".pdf") ||
                                item.file.type === "application/pdf";
                              setHandoutViewTab(isPdf ? "pdf" : "text");
                              setHandoutViewerOpen(true);
                            }}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-tan-border bg-tan-ghost px-3 text-sm font-semibold text-tan hover:brightness-105 transition cursor-pointer"
                            title="Preview uploaded handout"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Check Handout</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRemoveFileIndexTarget(idx);
                              setRemoveFileModalOpen(true);
                            }}
                            aria-label={`Remove ${item.file.name}`}
                            title="Remove uploaded file"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-burgundy-ghost hover:text-burgundy transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}

                      {selectedFiles.length < MAX_HANDOUT_FILES && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-emphasis bg-surface-base/50 py-3 px-4 text-sm font-semibold text-steel hover:border-steel hover:bg-steel-ghost transition cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          <span>
                            Add another handout ({MAX_HANDOUT_FILES - selectedFiles.length} slot
                            {MAX_HANDOUT_FILES - selectedFiles.length === 1 ? "" : "s"} left)
                          </span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      id="reviewer-dropzone"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="group w-full rounded-2xl border-2 border-dashed border-border-emphasis bg-surface-base/60 p-6 sm:p-8 text-center hover:border-steel hover:bg-steel-ghost transition cursor-pointer"
                    >
                      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-steel-ghost border border-steel-border text-steel transition-transform group-hover:scale-105">
                        <UploadCloud className="h-6 w-6" />
                      </span>
                      <span className="block text-[15px] font-semibold text-text-primary">
                        Tap to choose 1 to {MAX_HANDOUT_FILES} handouts
                      </span>
                      <span className="mt-1 block text-[13px] text-text-muted">
                        PDF, DOCX, TXT or MD · up to {MAX_HANDOUT_FILES} files combined in 1 reviewer
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <label htmlFor="reviewer-raw-text" className="mb-1.5 block text-sm font-semibold text-text-secondary">
                    Lecture notes
                  </label>
                  <textarea
                    id="reviewer-raw-text"
                    rows={7}
                    placeholder="Paste definitions, module summaries or chapter topics here…"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full rounded-2xl border border-border-default bg-surface-base p-4 text-[15px] leading-relaxed text-text-primary placeholder:text-text-faint focus:border-steel focus:outline-none transition"
                  />
                  <div className="mt-2.5">
                    <p className="mb-2 text-[13px] text-text-muted">Or try a sample:</p>
                    <div className="mobile-chip-row">
                      {(
                        [
                          { id: "db", label: "Database & ACID" },
                          { id: "oop", label: "OOP Concepts" },
                          { id: "net", label: "Networking" },
                        ] as const
                      ).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => loadSampleHandout(s.id)}
                          className="shrink-0 rounded-full border border-border-default bg-surface-base px-3.5 py-2 text-[13px] font-semibold text-text-secondary hover:border-steel hover:text-steel transition cursor-pointer"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {quotaInfo && quotaInfo.remaining <= 0 && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-tan-ghost border border-tan-border p-3.5 text-xs text-tan mb-3">
                  <Timer className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-text-primary text-xs">
                      AI Generator is Currently Resting
                    </strong>
                    <span className="text-[11px] text-text-secondary block mt-0.5">
                      This automated feature is currently unavailable and taking a rest for this monthly cycle. You can still study all your saved decks, practice shared flashcards, and take quizzes freely with zero limits!
                    </span>
                  </div>
                </div>
              )}

              <button
                id="reviewer-generate"
                type="button"
                onClick={handleGenerate}
                disabled={loading || (quotaInfo !== null && quotaInfo.remaining <= 0) || (inputMode === "file" && selectedFiles.length === 0) || (inputMode === "text" && !rawText.trim())}
                className="rv-btn-primary flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-6 text-[15px] font-semibold shadow-md active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating your reviewer…
                  </>
                ) : quotaInfo && quotaInfo.remaining <= 0 ? (
                  <>
                    <Timer className="h-5 w-5" />
                    Currently Unavailable (Resting this cycle)
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate reviewer
                  </>
                )}
              </button>
            </section>
          )}

          {/* Generating Skeleton */}
          {loading && <SkeletonDeckGenerating />}

          {/* Continue Studying */}
          {!loading && activeDeck && (
            <button
              id="reviewer-continue"
              type="button"
              onClick={() => handleSelectDeckToStudy(activeDeck)}
              className="rv-btn-primary flex w-full items-center gap-4 rounded-3xl p-4 sm:p-5 text-left shadow-lg active:scale-[0.99] cursor-pointer"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <BookOpen className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wider opacity-80">Continue studying</span>
                <span className="mt-0.5 block text-base font-bold leading-snug line-clamp-2 wrap-break-word">
                  {activeDeck.title}
                </span>
                <span className="mt-0.5 block text-[13px] opacity-80">
                  {getCardCount(activeDeck)} cards · {getQuizCount(activeDeck)} quiz questions
                </span>
              </span>
              <ChevronRight className="h-6 w-6 shrink-0 opacity-80" />
            </button>
          )}

          {/* Library */}
          <section className="rounded-3xl border border-border-default bg-surface-raised shadow-sm">
            <div className="space-y-4 p-5 sm:p-6 pb-2 sm:pb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-text-primary">My study decks</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-steel-ghost px-2 py-0.5 text-[11px] font-semibold text-steel border border-steel/20">
                      <Cloud className="h-3 w-3" />
                      Cloud-saved
                    </span>
                  </div>
                  <p className="text-sm text-text-muted">
                    {savedDecks.length} {savedDecks.length === 1 ? "deck" : "decks"} · {folders.length}{" "}
                    {folders.length === 1 ? "folder" : "folders"} · Accessible on phone & PC
                  </p>
                </div>
                <button
                  id="reviewer-new-folder"
                  type="button"
                  onClick={() => setCreateFolderModalOpen(true)}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border-default px-3.5 text-sm font-semibold text-text-primary hover:bg-surface-subtle transition cursor-pointer"
                >
                  <FolderPlus className="h-4 w-4 text-steel" />
                  New folder
                </button>
              </div>

              {savedDecks.length > 0 && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
                  <input
                    id="reviewer-deck-search"
                    type="search"
                    value={deckSearchQuery}
                    onChange={(e) => setDeckSearchQuery(e.target.value)}
                    placeholder="Search decks or topics"
                    className="w-full rounded-2xl border border-border-default bg-surface-base py-3 pl-10 pr-4 text-[15px] text-text-primary placeholder:text-text-faint focus:border-steel focus:outline-none transition"
                  />
                </div>
              )}

              {/* Folder chips */}
              <div className="mobile-chip-row -mx-5 px-5 sm:-mx-6 sm:px-6">
                {[{ id: "all", name: "All", color: "steel" as const }, ...folders].map((folder) => {
                  const isAll = folder.id === "all";
                  const count = isAll
                    ? savedDecks.length
                    : savedDecks.filter((d: any) =>
                        folder.id === "general"
                          ? !d.folder_id || d.folder_id === "general"
                          : d.folder_id === folder.id
                      ).length;
                  const isSelected = selectedFolderId === folder.id;
                  const colors = FOLDER_COLORS[folder.color] || FOLDER_COLORS.steel;
                  return (
                    <button
                      key={folder.id}
                      id={`reviewer-folder-${folder.id}`}
                      type="button"
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition cursor-pointer ${
                        isSelected
                          ? "border-transparent bg-steel text-white shadow-xs rv-chip-active"
                          : "border-border-default bg-surface-base text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {isAll ? (
                        <Layers className="h-4 w-4" />
                      ) : (
                        <Folder className={`h-4 w-4 ${isSelected ? "" : colors.text}`} />
                      )}
                      <span className="max-w-40 truncate">{folder.name}</span>
                      <span className={`text-xs ${isSelected ? "opacity-70" : "text-text-faint"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {selectedFolder && selectedFolder.id !== "general" && (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-base px-4 py-2.5">
                  <p className="min-w-0 truncate text-sm text-text-secondary">
                    <Folder className={`mr-1.5 inline h-4 w-4 align-[-3px] ${FOLDER_COLORS[selectedFolder.color]?.text}`} />
                    {selectedFolder.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => setDeleteFolderTarget(selectedFolder)}
                    className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-burgundy hover:underline cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete folder
                  </button>
                </div>
              )}
            </div>

            <div className="p-2.5 sm:p-3.5">
              {filteredDecks.length === 0 ? (
                <div className="m-2.5 rounded-2xl border-2 border-dashed border-border-default p-8 text-center">
                  <FolderOpen className="mx-auto h-8 w-8 text-text-faint" />
                  <p className="mt-2 text-[15px] font-semibold text-text-secondary">
                    {normalizedQuery
                      ? "No decks match your search."
                      : selectedFolderId === "all"
                      ? "No saved decks yet."
                      : "This folder is empty."}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
                    {normalizedQuery
                      ? "Try a different keyword."
                      : "Generate a reviewer from a handout, or move decks here from the menu."}
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {filteredDecks.map((deck: any) => {
                    const isActive = activeDeck?.title === deck.title;
                    const folder = getDeckFolder(deck);
                    const colors = FOLDER_COLORS[folder.color] || FOLDER_COLORS.steel;
                    const menuOpen = openMenuDeck === deck.title;
                    return (
                      <li key={deck.title} className="relative">
                        <div
                          className={`flex items-center gap-2 rounded-2xl p-2.5 sm:p-3 transition-colors ${
                            isActive ? "bg-steel-ghost" : "hover:bg-surface-subtle/70"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectDeckToStudy(deck)}
                            className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 text-left cursor-pointer"
                          >
                            <span
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${colors.bg} ${colors.text} ${colors.border}`}
                            >
                              <Layers className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[15px] font-bold leading-snug text-text-primary line-clamp-2 wrap-break-word">
                                {deck.title}
                              </span>
                              <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-text-muted">
                                <span>{getCardCount(deck)} cards</span>
                                <span aria-hidden>·</span>
                                <span>{getQuizCount(deck)} quiz</span>
                                <span aria-hidden>·</span>
                                <span className={`font-semibold ${colors.text}`}>{folder.name}</span>
                              </span>
                              {isActive && (
                                <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-steel">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Currently studying
                                </span>
                              )}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenMenuDeck(menuOpen ? null : deck.title)}
                            aria-label={`More actions for ${deck.title}`}
                            aria-expanded={menuOpen}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-surface-subtle hover:text-text-primary transition cursor-pointer"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                        </div>

                        {menuOpen && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setOpenMenuDeck(null)} />
                            <div className="absolute right-2 top-14 z-40 w-56 rounded-2xl border border-border-default bg-surface-raised p-1.5 shadow-xl rv-pop">
                              {[
                                {
                                  label: "Study now",
                                  icon: BookOpen,
                                  onClick: () => handleSelectDeckToStudy(deck),
                                },
                                {
                                  label: "Edit deck",
                                  icon: Edit3,
                                  onClick: () => {
                                    setEditingDeck(deck);
                                    setCustomModalOpen(true);
                                  },
                                },
                                { label: "Move to folder", icon: MoveRight, onClick: () => setMovingDeck(deck) },
                                {
                                  label: "Share with friends",
                                  icon: Share2,
                                  onClick: () => {
                                    setActiveDeck(deck);
                                    setShareModalOpen(true);
                                  },
                                },
                              ].map((item) => {
                                const Icon = item.icon;
                                return (
                                  <button
                                    key={item.label}
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuDeck(null);
                                      item.onClick();
                                    }}
                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-text-primary hover:bg-surface-subtle transition cursor-pointer"
                                  >
                                    <Icon className="h-4 w-4 text-text-muted" />
                                    {item.label}
                                  </button>
                                );
                              })}
                              <div className="my-1 border-t border-border-default" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  setOpenMenuDeck(null);
                                  requestDeleteSavedDeck(deck.title, e);
                                }}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-burgundy hover:bg-burgundy-ghost transition cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete deck
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Shared by Friends */}
          {friendSharedDecks.length > 0 && (
            <section className="rounded-3xl border border-border-default bg-surface-raised shadow-sm">
              <div className="flex items-center justify-between gap-3 p-5 sm:p-6 pb-2 sm:pb-2">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-text-primary">
                    <Users className="h-5 w-5 text-steel" />
                    Shared by friends
                  </h3>
                  <p className="text-sm text-text-muted">Tap to open and save to your library</p>
                </div>
                <span className="shrink-0 rounded-full bg-steel-ghost px-2.5 py-1 text-xs font-bold text-steel">
                  {friendSharedDecks.length} new
                </span>
              </div>
              <ul className="space-y-1 p-2.5 sm:p-3.5">
                {friendSharedDecks.map((item) =>
                  renderSourceRow({
                    key: item.id,
                    title: item.title,
                    subtitle: `From ${item.sender?.full_name || "a study friend"}`,
                    note: item.note || undefined,
                    active: activeDeck?.title === item.title,
                    leading: item.sender?.avatar_config ? (
                      <span className="shrink-0">
                        <StudentAvatar config={parseAvatarConfig(item.sender.avatar_config)} size={44} />
                      </span>
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-steel-ghost text-sm font-bold text-steel">
                        {item.sender?.first_name?.[0] || "F"}
                      </span>
                    ),
                    onOpen: () => {
                      openSharedDeck(item.deck);
                      showToast(`Loaded "${item.title}" from ${item.sender?.full_name || "friend"}!`);
                    },
                    onDismiss: async () => {
                      try {
                        await studentApi.dismissSharedDeck(item.id);
                        setFriendSharedDecks((prev) => prev.filter((d) => d.id !== item.id));
                        showToast("Deck dismissed.");
                      } catch {}
                    },
                  })
                )}
              </ul>
            </section>
          )}

          {/* Custom Cloud Decks */}
          {customCloudDecks.length > 0 && (
            <section className="rounded-3xl border border-border-default bg-surface-raised shadow-sm">
              <div className="p-5 sm:p-6 pb-2 sm:pb-2">
                <h3 className="flex items-center gap-2 text-lg font-bold text-text-primary">
                  <Sparkles className="h-5 w-5 text-tan" />
                  My custom decks
                </h3>
                <p className="text-sm text-text-muted">Saved to your account</p>
              </div>
              <ul className="space-y-1 p-2.5 sm:p-3.5">
                {customCloudDecks.map((cDeck) =>
                  renderSourceRow({
                    key: cDeck.id,
                    title: cDeck.title,
                    subtitle: `${getCardCount(cDeck.deck)} cards · ${getQuizCount(cDeck.deck)} quiz`,
                    active: activeDeck?.title === cDeck.title,
                    leading: (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-tan-ghost border border-tan-border text-tan">
                        <Edit3 className="h-5 w-5" />
                      </span>
                    ),
                    onOpen: () => openSharedDeck(cDeck.deck),
                  })
                )}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-surface-raised/95 text-text-primary text-sm font-semibold rounded-2xl shadow-xl backdrop-blur border border-border-emphasis rv-fade">
          <CheckCircle2 className="w-4 h-4 text-sage shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Share Deck Modal */}
      {activeDeck && (
        <ShareDeckModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          deck={activeDeck}
          onSharedSuccess={(name) => showToast(`Shared "${activeDeck.title}" with ${name}!`)}
        />
      )}

      {/* Custom Deck Modal (Create / Edit) */}
      <CustomDeckModal
        isOpen={customModalOpen}
        onClose={() => {
          setCustomModalOpen(false);
          setEditingDeck(null);
        }}
        initialDeck={editingDeck}
        onSaved={(savedDeck) => {
          setActiveDeck(savedDeck);
          saveDeckToStorage(savedDeck);
          setView("study");
          showToast(`Saved "${savedDeck.title}" to your study library!`);
          fetchQuotaAndShared();
        }}
      />

      {/* Confirm Warning for File Removal */}
      <ConfirmModal
        isOpen={removeFileModalOpen}
        title="Remove uploaded file?"
        message={`Are you sure you want to remove "${
          removeFileIndexTarget !== null
            ? selectedFiles[removeFileIndexTarget]?.file.name || "this file"
            : "this file"
        }"?`}
        confirmText="Remove File"
        cancelText="Keep File"
        variant="danger"
        onConfirm={confirmRemoveFile}
        onCancel={() => {
          setRemoveFileIndexTarget(null);
          setRemoveFileModalOpen(false);
        }}
      />

      {/* Confirm Warning for Saved Deck Deletion */}
      <ConfirmModal
        isOpen={deleteDeckTarget !== null}
        title="Delete study deck?"
        message={`Are you sure you want to delete "${deleteDeckTarget}"? This will permanently remove it and all its flashcards from your saved library.`}
        confirmText="Delete Deck"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteSavedDeck}
        onCancel={() => setDeleteDeckTarget(null)}
      />

      {/* Create Folder Modal */}
      {createFolderModalOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateFolderModalOpen(false);
          }}
        >
          <div
            className="relative w-full max-sm:rounded-3xl max-h-[90vh] sm:max-w-sm sm:rounded-3xl bg-surface-raised border border-border-default shadow-2xl p-5 sm:p-6 space-y-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-steel-ghost text-steel border border-steel-border">
                  <FolderPlus className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-text-primary">
                  New Study Folder
                </h3>
              </div>
              <button
                onClick={() => setCreateFolderModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Database Systems, Web Dev, Midterms"
                  className="w-full p-2.5 bg-surface-base border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:border-steel"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  Folder Color Tag
                </label>
                <div className="flex items-center gap-2.5">
                  {(["steel", "emerald", "amber", "violet", "rose", "indigo"] as const).map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewFolderColor(c)}
                        className={`h-7 w-7 rounded-full border-2 transition-transform cursor-pointer ${
                          newFolderColor === c
                            ? "scale-115 border-text-primary shadow-sm"
                            : "border-transparent opacity-75 hover:opacity-100"
                        } ${
                          c === "steel"
                            ? "bg-blue-500"
                            : c === "emerald"
                            ? "bg-emerald-500"
                            : c === "amber"
                            ? "bg-amber-500"
                            : c === "violet"
                            ? "bg-purple-500"
                            : c === "rose"
                            ? "bg-rose-500"
                            : "bg-indigo-500"
                        }`}
                      />
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border-default">
              <button
                type="button"
                onClick={() => setCreateFolderModalOpen(false)}
                className="flex-1 py-2 text-xs font-bold text-text-muted hover:text-text-primary rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="flex-1 py-2 text-xs font-bold bg-steel hover:bg-steel-light text-white rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Move Deck Modal */}
      {movingDeck && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMovingDeck(null);
          }}
        >
          <div
            className="relative w-full max-sm:rounded-3xl max-h-[90vh] sm:max-w-sm sm:rounded-3xl bg-surface-raised border border-border-default shadow-2xl p-5 sm:p-6 space-y-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-steel-ghost text-steel border border-steel-border">
                  <MoveRight className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    Move to Folder
                  </h3>
                  <p className="text-[11px] text-text-muted truncate max-w-50">
                    &quot;{movingDeck.title}&quot;
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMovingDeck(null)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {folders.map((folder) => {
                const isCurrent = (movingDeck.folder_id || "general") === folder.id;
                const colors = FOLDER_COLORS[folder.color] || FOLDER_COLORS.steel;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => moveDeckToFolder(movingDeck.title, folder.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isCurrent
                        ? "bg-steel-ghost/40 border-steel text-steel font-bold"
                        : "bg-surface-base border-border-default hover:border-steel text-text-primary"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Folder className={`h-4 w-4 ${colors.text}`} />
                      <span className="text-xs font-semibold">{folder.name}</span>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] text-steel font-bold">Current</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border-default flex justify-end">
              <button
                type="button"
                onClick={() => setMovingDeck(null)}
                className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-primary rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Delete Folder Modal */}
      <ConfirmModal
        isOpen={deleteFolderTarget !== null}
        title={`Delete folder "${deleteFolderTarget?.name}"?`}
        message="All study decks inside this folder will safely be moved to your 'General' folder. No flashcards will be deleted."
        confirmText="Delete Folder"
        cancelText="Keep Folder"
        variant="danger"
        onConfirm={() => {
          if (deleteFolderTarget) handleDeleteFolder(deleteFolderTarget);
        }}
        onCancel={() => setDeleteFolderTarget(null)}
      />

      {/* Full-Screen Non-Clickable Loading Overlay with Multi-Element Animated Evalo Icon */}
      {loading &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="alertdialog"
            aria-busy="true"
            aria-live="assertive"
            aria-label="Generating study reviewer"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/70 backdrop-blur-md p-6 select-none cursor-wait pointer-events-auto animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <ExamIcon animated className="h-24 w-24 sm:h-28 sm:w-28 drop-shadow-2xl" />
            <p className="mt-5 text-sm font-bold tracking-wide text-white/90 text-center">
              {loadingStep === 0 && "Reading & distilling your handout..."}
              {loadingStep === 1 && "Extracting all topics & definitions..."}
              {loadingStep === 2 && "Building cards & practice quiz..."}
              {loadingStep === 3 && "Finalizing your study reviewer..."}
            </p>
            <p className="mt-1.5 text-xs text-white/60 text-center">
              Do not refresh or close this tab — refreshing will cancel generation.
            </p>
          </div>,
          document.body
        )}

      {/* Uploaded Handout Viewer Modal */}
      {handoutViewerOpen &&
        typeof document !== "undefined" &&
        createPortal(
          (() => {
            const isStudyMode = view === "study" && Boolean(activeDeck);
            const handoutFilesList = isStudyMode
              ? activeDeck?.uploaded_files && activeDeck.uploaded_files.length > 0
                ? activeDeck.uploaded_files
                : activeDeck?.file_preview_url || activeDeck?.source_text
                  ? [
                      {
                        name:
                          activeDeck.file_name ||
                          activeDeck.title ||
                          "Uploaded Handout",
                        preview_url: activeDeck.file_preview_url,
                        text: activeDeck.source_text,
                        is_pdf: Boolean(
                          activeDeck.file_preview_url &&
                            (activeDeck.file_name || "")
                              .toLowerCase()
                              .endsWith(".pdf")
                        ),
                      },
                    ]
                  : []
              : selectedFiles.map((s) => ({
                  name: s.file.name,
                  preview_url: s.previewUrl,
                  text: s.text,
                  is_pdf:
                    s.file.name.toLowerCase().endsWith(".pdf") ||
                    s.file.type === "application/pdf",
                }));

            const safeIdx =
              handoutFilesList.length > 0
                ? Math.min(activeHandoutFileIndex, handoutFilesList.length - 1)
                : 0;
            const currentFile = handoutFilesList[safeIdx];

            const pdfUrl =
              currentFile?.preview_url ||
              (isStudyMode ? activeDeck?.file_preview_url : uploadedFileUrl);
            const fileName =
              currentFile?.name ||
              (isStudyMode
                ? activeDeck?.file_name || activeDeck?.title || "Uploaded Handout"
                : "Uploaded Handout");
            const isPdfAvailable = Boolean(
              pdfUrl &&
                (currentFile?.is_pdf || fileName.toLowerCase().endsWith(".pdf"))
            );
            const fullSourceText =
              currentFile?.text ||
              (isStudyMode
                ? activeDeck?.source_text || ""
                : uploadedFileText || rawText || activeDeck?.source_text || "");
            const searchClean = handoutSearch.trim().toLowerCase();
            const filteredLines = fullSourceText
              ? fullSourceText
                  .split("\n")
                  .filter((line) =>
                    searchClean ? line.toLowerCase().includes(searchClean) : true
                  )
              : [];

            return (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-5 animate-fadeIn"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setHandoutViewerOpen(false);
                }}
              >
                <div
                  className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl border border-border-default bg-surface-raised shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default p-4 sm:px-6">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tan-ghost border border-tan-border text-tan">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-text-primary">
                          {fileName}
                        </h3>
                        <p className="text-xs text-text-muted">
                          Uploaded Handout Reference Viewer
                          {handoutFilesList.length > 1
                            ? ` · Handout ${safeIdx + 1} of ${handoutFilesList.length}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPdfAvailable && fullSourceText && (
                        <div className="flex rounded-xl bg-surface-subtle p-1 border border-border-default">
                          <button
                            type="button"
                            onClick={() => setHandoutViewTab("pdf")}
                            className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                              handoutViewTab === "pdf"
                                ? "bg-surface-raised text-text-primary shadow-xs"
                                : "text-text-muted hover:text-text-primary"
                            }`}
                          >
                            PDF Document
                          </button>
                          <button
                            type="button"
                            onClick={() => setHandoutViewTab("text")}
                            className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                              handoutViewTab === "text"
                                ? "bg-surface-raised text-text-primary shadow-xs"
                                : "text-text-muted hover:text-text-primary"
                            }`}
                          >
                            Extracted Text
                          </button>
                        </div>
                      )}
                      {pdfUrl && (
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border-default bg-surface-base px-3 text-xs font-semibold text-text-secondary hover:text-text-primary transition"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Open in tab</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setHandoutViewerOpen(false)}
                        aria-label="Close handout viewer"
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-text-muted hover:bg-surface-subtle hover:text-text-primary transition cursor-pointer"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Multi-File Switcher Bar (when 2 or 3 files uploaded) */}
                  {handoutFilesList.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2 border-b border-border-default bg-surface-subtle/60 px-4 py-2.5 sm:px-6">
                      {handoutFilesList.map((fItem, fIdx) => {
                        const isSelected = fIdx === safeIdx;
                        return (
                          <button
                            key={`${fItem.name}-${fIdx}`}
                            type="button"
                            onClick={() => {
                              setActiveHandoutFileIndex(fIdx);
                              setHandoutViewTab(
                                fItem.preview_url && fItem.is_pdf ? "pdf" : "text"
                              );
                            }}
                            className={`inline-flex max-w-[240px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                              isSelected
                                ? "bg-steel text-white shadow-xs"
                                : "border border-border-default bg-surface-base text-text-secondary hover:text-text-primary"
                            }`}
                          >
                            <span className="shrink-0 font-bold">#{fIdx + 1}</span>
                            <span className="truncate">{fItem.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Modal Body */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {isPdfAvailable && handoutViewTab === "pdf" && pdfUrl ? (
                      <iframe
                        src={pdfUrl}
                        title={fileName}
                        className="w-full h-[68vh] rounded-2xl border border-border-default bg-surface-base"
                      />
                    ) : fullSourceText ? (
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
                          <input
                            type="search"
                            value={handoutSearch}
                            onChange={(e) => setHandoutSearch(e.target.value)}
                            placeholder="Search inside your uploaded handout..."
                            className="w-full rounded-xl border border-border-default bg-surface-base py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-faint focus:border-steel focus:outline-none transition"
                          />
                        </div>
                        <div className="max-h-[58vh] overflow-y-auto rounded-2xl border border-border-default bg-surface-base p-4 sm:p-5 space-y-2 text-sm leading-relaxed text-text-primary font-sans whitespace-pre-wrap">
                          {filteredLines.length > 0 ? (
                            filteredLines.map((line, i) => (
                              <p
                                key={i}
                                className={
                                  line.trim().length > 0 &&
                                  line.trim().length < 70 &&
                                  !line.trim().endsWith(".")
                                    ? "font-bold text-steel pt-2"
                                    : "text-text-secondary"
                                }
                              >
                                {line}
                              </p>
                            ))
                          ) : (
                            <p className="text-center text-text-muted py-8">
                              No lines in the handout match &ldquo;{handoutSearch}&rdquo;.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-sm text-text-muted">
                        No handout content is attached to this deck.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })(),
          document.body
        )}
    </div>
  );
}
