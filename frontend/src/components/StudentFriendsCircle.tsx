"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  UserCheck,
  Search,
  Check,
  X,
  Trash2,
  Sparkles,
  BookOpen,
  GraduationCap,
  Clock,
  Loader2,
  AlertCircle,
  Share2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import {
  student as studentApi,
  StudentFriendCard,
  StudentFriendsData,
} from "@/lib/api";
import { StudentAvatar } from "@/components/avatar/StudentAvatar";
import { parseAvatarConfig } from "@/types/avatar";

interface StudentFriendsCircleProps {
  onOpenReviewerWithDeck?: (deck: any) => void;
}

export function StudentFriendsCircle({ onOpenReviewerWithDeck }: StudentFriendsCircleProps) {
  const [data, setData] = useState<StudentFriendsData>({
    friends: [],
    incoming_requests: [],
    outgoing_requests: [],
    classmates: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentFriendCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadFriendsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await studentApi.getFriends();
      setData(res);
    } catch (err: any) {
      setError(err?.detail || "Could not load friends list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriendsData();
  }, []);

  // Listen to cross-component updates from notification bell
  useEffect(() => {
    const handleUpdate = () => {
      loadFriendsData();
    };
    window.addEventListener("evalo_friends_updated", handleUpdate);
    return () => window.removeEventListener("evalo_friends_updated", handleUpdate);
  }, []);

  // Search effect
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await studentApi.searchFriends(q);
        setSearchResults(results);
      } catch (e) {
        console.error("Search failed", e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSendRequest = async (targetStudentId: string, name: string) => {
    try {
      setActionLoadingId(targetStudentId);
      const res = await studentApi.sendFriendRequest(targetStudentId);
      showToast(res.message || `Friend request sent to ${name}!`);
      await loadFriendsData();
      if (searchQuery.trim().length >= 2) {
        const updated = await studentApi.searchFriends(searchQuery.trim());
        setSearchResults(updated);
      }
      window.dispatchEvent(new Event("evalo_notifications_refresh"));
    } catch (err: any) {
      showToast(err?.detail || "Could not send friend request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRespondRequest = async (requestId: string, action: "ACCEPT" | "DECLINE") => {
    try {
      setActionLoadingId(requestId);
      const res = await studentApi.respondFriendRequest(requestId, action);
      showToast(res.message);
      await loadFriendsData();
      window.dispatchEvent(new Event("evalo_notifications_refresh"));
    } catch (err: any) {
      showToast(err?.detail || "Failed to respond to request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveFriend = async (friendStudentId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from your study circle?`)) return;
    try {
      setActionLoadingId(friendStudentId);
      await studentApi.removeFriend(friendStudentId);
      showToast(`${name} removed from your study circle.`);
      await loadFriendsData();
      window.dispatchEvent(new Event("evalo_notifications_refresh"));
    } catch (err: any) {
      showToast(err?.detail || "Could not remove friend");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <Loader2 className="w-8 h-8 animate-spin text-steel mb-3" />
        <p className="text-sm font-medium">Connecting to your Study Circle...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-surface-overlay/95 border border-border-emphasis text-text-primary text-sm font-semibold rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-sage shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border-emphasis/60 bg-surface-raised p-6 md:p-8 shadow-sm">
        <div className="h-1.5 w-full bg-linear-to-r from-steel via-steel-light to-cream absolute top-0 left-0" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-steel-ghost text-steel border border-steel-border/50 text-xs font-semibold uppercase tracking-wider mb-3">
            <Users className="w-3.5 h-3.5" /> Study Circle &amp; Classmates
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-primary">
            Connect, Share &amp; Master Together
          </h2>
          <p className="mt-2 text-sm md:text-base text-text-secondary leading-relaxed">
            Form your study circle with classmates. Share your AI-distilled review pointers, 3D flashcards, and custom revision decks with friends so they can save and study them anywhere.
          </p>
        </div>
        <div className="absolute -right-8 -bottom-10 opacity-10 pointer-events-none text-steel">
          <Users className="w-64 h-64" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-surface-raised p-5 rounded-2xl border border-border-default shadow-sm">
        <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
          Find Classmates &amp; Students
        </label>
        <div className="relative">
          <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name or 6-digit student number..."
            className="w-full pl-11 pr-4 py-3 bg-surface-base border border-border-default rounded-xl text-sm focus:outline-none focus:border-steel focus:ring-2 focus:ring-steel/20 text-text-primary placeholder:text-text-faint transition"
          />
          {isSearching && (
            <Loader2 className="w-4 h-4 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2 text-steel" />
          )}
        </div>

        {/* Search Results Dropdown/Box */}
        {searchQuery.trim().length >= 2 && (
          <div className="mt-4 pt-4 border-t border-border-default">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
              Search Results ({searchResults.length})
            </h4>
            {searchResults.length === 0 && !isSearching ? (
              <p className="text-sm text-text-muted py-3 text-center">
                No students found matching &quot;{searchQuery}&quot;.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map((st) => (
                  <div
                    key={st.student_id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border-default bg-surface-base/80 hover:bg-surface-overlay hover:border-steel/40 transition shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <StudentAvatar
                        config={parseAvatarConfig(st.avatar_config)}
                        size={40}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">
                          {st.full_name}
                        </p>
                        <p className="text-xs text-text-muted font-mono truncate">
                          ID: {st.full_student_id} {st.section_name ? `• ${st.section_name}` : ""}
                        </p>
                      </div>
                    </div>
                    <div>
                      {st.relationship_status === "FRIEND" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sage-ghost text-sage border border-sage-border">
                          <Check className="w-3 h-3" /> Friends
                        </span>
                      ) : st.relationship_status === "PENDING_OUTGOING" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-tan-ghost text-tan border border-tan-border">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      ) : st.relationship_status === "PENDING_INCOMING" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-steel-ghost text-steel border border-steel-border">
                          Check Requests
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(st.student_id, st.full_name)}
                          disabled={actionLoadingId === st.student_id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-steel hover:bg-steel-light text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {actionLoadingId === st.student_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="w-3.5 h-3.5" />
                          )}
                          Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Incoming Requests Banner */}
      {data.incoming_requests.length > 0 && (
        <div className="bg-tan-ghost/60 border border-tan-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-tan">
            <UserPlus className="w-5 h-5" />
            <h3 className="text-base font-bold">
              Friend Requests ({data.incoming_requests.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.incoming_requests.map((req) => (
              <div
                key={req.request_id}
                className="flex items-center justify-between p-3.5 bg-surface-raised rounded-xl border border-border-default hover:border-tan-border shadow-xs transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StudentAvatar
                    config={parseAvatarConfig(req.avatar_config)}
                    size={40}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">
                      {req.full_name}
                    </p>
                    <p className="text-xs text-text-muted font-mono truncate">
                      {req.section_name || req.full_student_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleRespondRequest(req.request_id!, "ACCEPT")}
                    disabled={actionLoadingId === req.request_id}
                    className="p-2 bg-sage hover:bg-sage-light text-white rounded-xl transition shadow-xs cursor-pointer"
                    title="Accept Friend"
                  >
                    {actionLoadingId === req.request_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleRespondRequest(req.request_id!, "DECLINE")}
                    disabled={actionLoadingId === req.request_id}
                    className="p-2 bg-surface-subtle hover:bg-burgundy-ghost text-text-muted hover:text-burgundy-light border border-border-default rounded-xl transition cursor-pointer"
                    title="Decline"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted Friends Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-steel" />
            <h3 className="text-base sm:text-lg font-bold text-text-primary">
              Study Circle Friends ({data.friends.length})
            </h3>
          </div>
          <span className="text-xs text-text-muted">
            Share decks directly from your reviewer
          </span>
        </div>

        {data.friends.length === 0 ? (
          <div className="bg-surface-raised rounded-2xl border-2 border-dashed border-border-default p-8 sm:p-10 text-center">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-surface-subtle border border-border-default text-steel mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-text-primary">
              No friends in your study circle yet
            </h4>
            <p className="text-xs sm:text-sm text-text-muted max-w-md mx-auto mt-1 mb-4 leading-relaxed">
              Add your classmates below to share study pointers, 3D flashcards, and custom quizzes before exams!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.friends.map((fr) => (
              <div
                key={fr.student_id}
                className="group relative bg-surface-raised rounded-2xl border border-border-default hover:border-steel/50 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <StudentAvatar
                        config={parseAvatarConfig(fr.avatar_config)}
                        size={48}
                      />
                      <div className="min-w-0">
                        <h4 className="text-base font-bold text-text-primary leading-snug truncate">
                          {fr.full_name}
                        </h4>
                        <p className="text-xs font-mono text-text-muted">
                          {fr.full_student_id}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFriend(fr.student_id, fr.full_name)}
                      disabled={actionLoadingId === fr.student_id}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition p-1.5 text-text-muted hover:text-burgundy-light rounded-xl hover:bg-burgundy-ghost min-h-8 min-w-8 flex items-center justify-center cursor-pointer shrink-0"
                      title="Remove from circle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {fr.section_name && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-steel-ghost border border-steel-border/40 text-xs font-medium text-steel mb-2">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {fr.section_name}
                    </div>
                  )}

                  {fr.bio && (
                    <p className="text-xs text-text-secondary italic line-clamp-2 mt-1">
                      &quot;{fr.bio}&quot;
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
                  <span>Connected friend</span>
                  <span className="flex items-center gap-1 text-sage font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section Classmates (Quick Connect) - 100% Theme-adaptive for Light & Dark Mode */}
      {data.classmates.length > 0 && (
        <div className="bg-surface-raised border border-border-default rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-text-primary">
                Classmates in Your Section
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Quickly add classmates enrolled in the same class
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-steel-ghost text-steel border border-steel-border/50">
              {data.classmates.length} Classmates
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.classmates.map((cm) => (
              <div
                key={cm.student_id}
                className="flex items-center justify-between p-3.5 bg-surface-base/80 hover:bg-surface-overlay rounded-xl border border-border-default hover:border-steel/40 transition shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StudentAvatar
                    config={parseAvatarConfig(cm.avatar_config)}
                    size={40}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {cm.full_name}
                    </p>
                    <p className="text-xs text-text-muted font-mono truncate">
                      {cm.full_student_id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSendRequest(cm.student_id, cm.full_name)}
                  disabled={actionLoadingId === cm.student_id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-steel/15 hover:bg-steel text-steel hover:text-white rounded-xl text-xs font-semibold transition border border-steel/30 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {actionLoadingId === cm.student_id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
