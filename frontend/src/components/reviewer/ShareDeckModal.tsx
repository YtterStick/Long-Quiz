"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Share2,
  Users,
  Search,
  Check,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Mail,
  MessageCircle,
  ExternalLink,
  Sparkles,
  Link2,
  Smartphone,
  BookOpen,
  Layers,
} from "lucide-react";
import {
  student as studentApi,
  StudentFriendCard,
  GeneratedReviewerDeck,
} from "@/lib/api";
import { StudentAvatar } from "@/components/avatar/StudentAvatar";
import { parseAvatarConfig } from "@/types/avatar";

interface ShareDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: GeneratedReviewerDeck;
  onSharedSuccess?: (friendName: string) => void;
}

export function ShareDeckModal({
  isOpen,
  onClose,
  deck,
  onSharedSuccess,
}: ShareDeckModalProps) {
  const [mode, setMode] = useState<"links" | "friends">("links");
  const [friends, setFriends] = useState<StudentFriendCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Generate public-facing direct student link
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/student/dashboard?tab=reviewers&deck=${encodeURIComponent(
          deck.title
        )}`
      : "";

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setStatusMessage(null);
      setSelectedFriendId(null);
      setCopiedLink(false);
      setNote("");
      studentApi
        .getFriends()
        .then((data) => {
          setFriends(data.friends || []);
        })
        .catch(() => {
          setStatusMessage({
            type: "error",
            text: "Could not load friends list.",
          });
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setStatusMessage({
        type: "success",
        text: "Reviewer link copied to clipboard!",
      });
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      setStatusMessage({
        type: "error",
        text: "Could not copy link automatically. Please select and copy.",
      });
    }
  };

  const handleShareMessenger = () => {
    // 1. Copy link as convenience
    navigator.clipboard?.writeText(shareUrl).catch(() => {});

    // 2. Open Facebook / Messenger dialog
    const fbSendUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(
      shareUrl
    )}&app_id=291494419107518&redirect_uri=${encodeURIComponent(shareUrl)}`;

    const isMobile =
      typeof window !== "undefined" &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      // Try opening mobile Messenger app link, fallback to web
      window.location.href = `fb-messenger://share/?link=${encodeURIComponent(shareUrl)}`;
      setTimeout(() => {
        window.open(fbSendUrl, "_blank", "noopener,noreferrer");
      }, 500);
    } else {
      window.open(fbSendUrl, "_blank", "width=600,height=550,noopener,noreferrer");
    }

    setStatusMessage({
      type: "success",
      text: "Link copied! Opening Messenger...",
    });
  };

  const handleShareEmail = () => {
    const subject = `Check out this Evalo Reviewer: ${deck.title}`;
    const firstTopic = deck.topics?.[0];
    const summaryExcerpt = firstTopic
      ? `${firstTopic.topic_name}${firstTopic.description ? ` — ${firstTopic.description}` : ""}`
      : "Interactive AI study flashcards and practice quiz.";
    const flashcardCount = deck.total_flashcards || deck.flashcards?.length || 0;
    const quizCount = deck.total_quiz_cards || deck.quiz_cards?.length || 0;
    const body = `Hi!\n\nI'm sharing my study reviewer deck "${deck.title}" with you on Evalo.\n\nKey Topic:\n${summaryExcerpt}\n\n• Flashcards: ${flashcardCount}\n• Practice Quiz: ${quizCount} questions\n\nStudy it on Evalo here:\n${shareUrl}\n\nHappy studying!`;

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;

    setStatusMessage({
      type: "success",
      text: "Opening email composer with prefilled study deck details!",
    });
  };

  const handleShareWhatsApp = () => {
    const text = `Hey! Check out this study reviewer deck "${deck.title}" on Evalo:\n${shareUrl}`;
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleShareTelegram = () => {
    const text = `Study Reviewer: "${deck.title}" on Evalo`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleNativeShare = async () => {
    const flashcardCount = deck.total_flashcards || deck.flashcards?.length || 0;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Evalo Reviewer: ${deck.title}`,
          text: `Check out this study reviewer "${deck.title}" with ${flashcardCount} flashcards on Evalo:`,
          url: shareUrl,
        });
        setStatusMessage({
          type: "success",
          text: "Shared successfully!",
        });
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const filteredFriends = friends.filter(
    (f) =>
      f.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.full_student_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedFriend = friends.find((f) => f.student_id === selectedFriendId);

  const handleSendToFriend = async () => {
    if (!selectedFriendId) {
      setStatusMessage({ type: "error", text: "Please select a friend to share with." });
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage(null);
      await studentApi.shareDeck({
        receiver_student_id: selectedFriendId,
        title: deck.title,
        deck_data: deck,
        note: note.trim() || undefined,
      });

      setStatusMessage({
        type: "success",
        text: `Successfully sent to ${selectedFriend?.full_name || "friend"}!`,
      });
      if (onSharedSuccess && selectedFriend) {
        onSharedSuccess(selectedFriend.full_name);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.detail || "Failed to share deck. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] max-sm:rounded-t-3xl max-sm:pb-6 sm:rounded-3xl bg-surface-raised dark:bg-slate-900 border border-border-default dark:border-slate-800 shadow-2xl p-5 sm:p-7 flex flex-col overflow-hidden">
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto -mt-1 mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border-default dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 shadow-sm shrink-0">
              <Share2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-text-primary dark:text-slate-100 truncate">
                Share Reviewer Deck
              </h3>
              <p className="text-xs text-text-muted dark:text-slate-400 line-clamp-1">
                &quot;{deck.title}&quot;
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

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-base dark:bg-slate-800/80 rounded-2xl border border-border-default dark:border-slate-800 mt-4 shrink-0">
          <button
            type="button"
            onClick={() => setMode("links")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              mode === "links"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
            }`}
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>Copy Link & Apps</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("friends")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              mode === "friends"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Study Friends {friends.length > 0 ? `(${friends.length})` : ""}</span>
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 shrink-0 ${
              statusMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-4 pr-1.5">
          {mode === "links" ? (
            <div className="space-y-4">
              {/* Direct Link Section */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-secondary dark:text-slate-300">
                  Direct Shareable Link
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="w-full pl-3 pr-8 py-2.5 bg-surface-base dark:bg-slate-800/80 border border-border-default dark:border-slate-700 rounded-xl text-xs font-mono text-text-primary dark:text-slate-100 select-all focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 transition shrink-0 cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-white" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-text-muted dark:text-slate-400">
                  Anyone with this link can view this reviewer on Evalo.
                </p>
              </div>

              {/* Fast Social & Messenger Apps Grid */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-secondary dark:text-slate-300">
                  Send to Messaging Apps & Email
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Facebook Messenger */}
                  <button
                    type="button"
                    onClick={handleShareMessenger}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100/70 dark:hover:bg-blue-950/60 text-left transition group cursor-pointer"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-sm group-hover:scale-105 transition-transform">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                        Messenger
                      </p>
                      <p className="text-[10px] text-blue-700/70 dark:text-blue-300/70 truncate">
                        Send to chat or group
                      </p>
                    </div>
                  </button>

                  {/* Email */}
                  <button
                    type="button"
                    onClick={handleShareEmail}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100/70 dark:hover:bg-rose-950/60 text-left transition group cursor-pointer"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-sm group-hover:scale-105 transition-transform">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                        Email
                      </p>
                      <p className="text-[10px] text-rose-700/70 dark:text-rose-300/70 truncate">
                        Prefilled summary
                      </p>
                    </div>
                  </button>

                  {/* WhatsApp */}
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/60 text-left transition group cursor-pointer"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-sm group-hover:scale-105 transition-transform">
                      <Send className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        WhatsApp
                      </p>
                      <p className="text-[10px] text-emerald-700/70 dark:text-emerald-300/70 truncate">
                        Send to contacts
                      </p>
                    </div>
                  </button>

                  {/* Telegram */}
                  <button
                    type="button"
                    onClick={handleShareTelegram}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/60 dark:bg-sky-950/30 hover:bg-sky-100/70 dark:hover:bg-sky-950/60 text-left transition group cursor-pointer"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-500 text-white shadow-sm group-hover:scale-105 transition-transform">
                      <ExternalLink className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-sky-900 dark:text-sky-200">
                        Telegram
                      </p>
                      <p className="text-[10px] text-sky-700/70 dark:text-sky-300/70 truncate">
                        Post to channel or chat
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Native Device Share Button (Mobile & Desktop) */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-border-default dark:border-slate-700 bg-surface-base dark:bg-slate-800/80 hover:bg-surface-subtle text-xs font-bold text-text-primary dark:text-slate-100 transition shadow-sm cursor-pointer"
              >
                <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Open Device Share Menu (Instagram, Viber, Discord &amp; more)</span>
              </button>

              {/* Deck Summary Preview */}
              <div className="p-3.5 rounded-2xl border border-border-default/60 dark:border-slate-800 bg-surface-subtle/50 dark:bg-slate-800/30 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-text-primary dark:text-slate-200">
                  <BookOpen className="h-3.5 w-3.5 text-steel" />
                  <span>{deck.title}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-text-muted dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {deck.total_flashcards || deck.flashcards?.length || 0} Flashcards
                  </span>
                  <span>•</span>
                  <span>
                    {deck.total_quiz_cards || deck.quiz_cards?.length || 0} Practice Questions
                  </span>
                </div>
                {deck.topics?.[0] && (
                  <p className="text-[11px] text-text-muted dark:text-slate-400 line-clamp-2 italic pt-1">
                    &quot;{deck.topics[0].topic_name}
                    {deck.topics[0].description
                      ? `: ${deck.topics[0].description}`
                      : ""}&quot;
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Friends Tab */
            <div className="space-y-4">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-text-muted">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 mb-2" />
                  <p className="text-xs">Loading study friends...</p>
                </div>
              ) : friends.length === 0 ? (
                <div className="py-10 text-center space-y-2 border border-dashed border-border-default dark:border-slate-800 rounded-2xl p-6">
                  <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-text-primary dark:text-slate-200">
                    No friends in your study circle yet
                  </p>
                  <p className="text-xs text-text-muted dark:text-slate-400 max-w-xs mx-auto">
                    You can switch to the &quot;Copy Link &amp; Apps&quot; tab to send this reviewer directly via Messenger, Email, or WhatsApp!
                  </p>
                </div>
              ) : (
                <>
                  {/* Search Friends */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter friends by name or ID..."
                      className="w-full pl-9 pr-3 py-2 bg-surface-base dark:bg-slate-800/60 border border-border-default dark:border-slate-700 rounded-xl text-xs text-text-primary dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>

                  {/* Friends Selector List */}
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {filteredFriends.map((friend) => {
                      const isSelected = selectedFriendId === friend.student_id;
                      return (
                        <div
                          key={friend.student_id}
                          onClick={() => setSelectedFriendId(friend.student_id)}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                            isSelected
                              ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500"
                              : "bg-surface-base dark:bg-slate-800/40 border-border-default dark:border-slate-800 hover:border-blue-300"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <StudentAvatar
                              config={parseAvatarConfig(friend.avatar_config)}
                              size={40}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-text-primary dark:text-slate-100 truncate">
                                {friend.full_name}
                              </p>
                              <p className="text-[11px] text-text-muted dark:text-slate-400 truncate">
                                {friend.full_student_id}{" "}
                                {friend.section_name ? `• ${friend.section_name}` : ""}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                              isSelected
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Optional Note */}
                  <div>
                    <label className="block text-xs font-bold text-text-secondary dark:text-slate-300 mb-1.5">
                      Optional Study Note for Friend
                    </label>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Check out the pointers on polymorphism for our upcoming quiz!"
                      className="w-full p-3 bg-surface-base dark:bg-slate-800/60 border border-border-default dark:border-slate-700 rounded-xl text-xs text-text-primary dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-border-default dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-text-muted dark:text-slate-400">
            {mode === "links" ? "Instant link sharing active" : "Study circle direct delivery"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-primary hover:bg-surface-subtle transition cursor-pointer"
            >
              Close
            </button>
            {mode === "friends" && (
              <button
                type="button"
                onClick={handleSendToFriend}
                disabled={!selectedFriendId || submitting || friends.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>Send to Friend</span>
              </button>
            )}
            {mode === "links" && (
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 transition cursor-pointer"
              >
                {copiedLink ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span>{copiedLink ? "Copied" : "Copy Link"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
