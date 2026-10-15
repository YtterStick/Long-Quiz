"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { StatCard } from "@/components/StatCard";
import { admin as adminApi } from "@/lib/api";
import {
  Users,
  GraduationCap,
  School,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Search,
  Loader2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import { SkeletonStatCards, SkeletonTable, SkeletonDashboardPage } from "@/components/ui/Skeleton";
import { ConfirmModal } from "@/components/ConfirmModal";
import { WelcomeHero } from "@/components/WelcomeHero";

interface TeacherItem {
  id: string;
  user_id: string;
  user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
    must_change_password: boolean;
    created_at: string;
  };
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({
    total_teachers: 0,
    total_students: 0,
    total_sections: 0,
    total_exams: 0,
    total_submissions: 0,
  });
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherItem | null>(null);

  // Form states
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);

  const [editingTeacher, setEditingTeacher] = useState<TeacherItem | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, teachersData] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.listTeachers(),
      ]);
      setStats(statsData);
      setTeachers(teachersData as TeacherItem[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (user && user.role === "ADMIN") {
      Promise.all([adminApi.getDashboard(), adminApi.listTeachers()])
        .then(([statsData, teachersData]) => {
          if (!ignore) {
            setStats(statsData);
            setTeachers(teachersData as TeacherItem[]);
          }
        })
        .catch((err: unknown) => {
          if (!ignore) setError(err instanceof Error ? err.message : "Failed to load admin data");
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [user]);

  const updateTeacherUsernameSuggestion = (first: string, last: string) => {
    if (!usernameManuallyEdited) {
      const cleanFirst = first.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanLast = last.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanFirst && cleanLast) {
        setNewUsername(`${cleanFirst}.${cleanLast}`);
      } else if (cleanFirst) {
        setNewUsername(cleanFirst);
      } else if (cleanLast) {
        setNewUsername(cleanLast);
      } else {
        setNewUsername("");
      }
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await adminApi.createTeacher({
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        username: newUsername.trim() || undefined,
        role: "TEACHER",
      });
      setCreatedCredentials({
        username: res.username,
        password: res.temp_password,
      });
      setNewFirstName("");
      setNewLastName("");
      setNewUsername("");
      setUsernameManuallyEdited(false);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create teacher");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setError(null);
    setSubmitting(true);
    try {
      await adminApi.updateTeacher(editingTeacher.user.id, {
        first_name: editFirstName,
        last_name: editLastName,
        is_active: editIsActive,
      });
      setIsEditModalOpen(false);
      setEditingTeacher(null);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update teacher");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    try {
      await adminApi.deleteTeacher(teacherToDelete.user.id);
      setTeacherToDelete(null);
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete teacher");
    }
  };

  const copyCredentials = () => {
    if (!createdCredentials) return;
    navigator.clipboard.writeText(
      `Username: ${createdCredentials.username}\nPassword: ${createdCredentials.password}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) {
    return <SkeletonDashboardPage role="admin" />;
  }

  return (
    <div className="min-h-screen text-text-primary">
      <Navbar onOpenPasswordModal={() => setPasswordModalOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:pb-12 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <WelcomeHero
            role="admin"
            showRoleBadge={false}
            name={user?.first_name}
            loading={authLoading}
            description="Manage system users, teachers, sections, and overall system activity across your school."
            actions={
              <button
                id="hero-add-teacher"
                onClick={() => {
                  setCreatedCredentials(null);
                  setIsAddModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 rounded-2xl gradient-bg-primary px-5 py-3 text-xs font-bold text-white shadow-lg shadow-steel/20 hover:opacity-95 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Add New Teacher
              </button>
            }
          />
        </div>

        {/* Stats Grid */}
        {loading ? (
          <SkeletonStatCards count={4} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard
              title="Total Teachers"
              value={stats.total_teachers}
              icon={Users}
              color="tan"
            />
            <StatCard
              title="Total Students"
              value={stats.total_students}
              icon={GraduationCap}
              color="steel"
            />
            <StatCard
              title="Active Sections"
              value={stats.total_sections}
              icon={School}
              color="sage"
            />
            <StatCard
              title="Scanned Submissions"
              value={stats.total_submissions}
              icon={FileSpreadsheet}
              color="cream"
            />
          </div>
        )}

        {/* Teachers Table Section */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Teacher Accounts</h2>
              <p className="text-xs text-text-muted">
                List of registered teachers and their access status.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search by name or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-border-emphasis bg-surface-overlay px-3.5 py-2 pl-9 text-xs text-text-primary placeholder-text-faint focus:border-steel focus:outline-none"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-faint" />
            </div>
          </div>

          {loading ? (
            <SkeletonTable rows={4} />
          ) : filteredTeachers.length === 0 ? (
            <div className="py-12 text-center text-sm text-text-faint">
              No teachers found. Click &quot;Add New Teacher&quot; to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-default text-text-muted font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Teacher Name</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">First-Time Flag</th>
                    <th className="py-3 px-4">Date Added</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default/60 text-text-secondary">
                  {filteredTeachers.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-subtle/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-text-primary">
                        {t.user.first_name} {t.user.last_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-tan">
                        @{t.user.username}
                      </td>
                      <td className="py-3.5 px-4">
                        {t.user.is_active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sage-ghost px-2.5 py-0.5 text-[10px] font-bold text-sage border border-sage-border">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-burgundy-ghost px-2.5 py-0.5 text-[10px] font-bold text-burgundy-light border border-burgundy-border">
                            <XCircle className="h-3 w-3" />
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {t.user.must_change_password ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-cream-ghost px-2 py-0.5 text-[10px] font-medium text-cream">
                            Pending Reset
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] text-text-muted">
                            Verified
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-text-muted">
                        {new Date(t.user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingTeacher(t);
                              setEditFirstName(t.user.first_name);
                              setEditLastName(t.user.last_name);
                              setEditIsActive(t.user.is_active);
                              setIsEditModalOpen(true);
                            }}
                            className="rounded-lg bg-surface-subtle p-1.5 text-text-muted hover:bg-steel-ghost hover:text-steel transition-colors"
                            title="Edit Teacher"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setTeacherToDelete(t)}
                            className="rounded-lg bg-surface-subtle p-1.5 text-text-muted hover:bg-burgundy-ghost hover:text-burgundy-light transition-colors"
                            title="Delete Teacher"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add Teacher Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-text-primary mb-2">Add New Teacher</h2>
            <p className="text-xs text-text-muted mb-5">
              Create a teacher account. Temporary credentials will be generated automatically.
            </p>

            {createdCredentials ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-sage-ghost border border-sage-border p-4">
                  <div className="flex items-center gap-2 text-sage font-semibold text-sm mb-3">
                    <CheckCircle2 className="h-5 w-5" />
                    Teacher Account Created!
                  </div>
                  <div className="space-y-2 text-xs font-mono bg-surface-base p-3 rounded-lg border border-border-default">
                    <p className="text-text-secondary">
                      Username: <span className="text-tan">{createdCredentials.username}</span>
                    </p>
                    <p className="text-text-secondary">
                      Temp Password: <span className="text-sage">{createdCredentials.password}</span>
                    </p>
                  </div>
                  <p className="text-[11px] text-cream mt-3">
                    * The teacher will be forced to change this password on their first login.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={copyCredentials}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted transition-colors"
                  >
                    {copied ? <Check className="h-4 w-4 text-sage" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied!" : "Copy Credentials"}
                  </button>
                  <button
                    onClick={() => {
                      setCreatedCredentials(null);
                      setIsAddModalOpen(false);
                    }}
                    className="flex-1 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-white hover:opacity-95"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateTeacher} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewFirstName(val);
                      updateTeacherUsernameSuggestion(val, newLastName);
                    }}
                    placeholder="e.g. Andrei"
                    className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewLastName(val);
                      updateTeacherUsernameSuggestion(newFirstName, val);
                    }}
                    placeholder="e.g. Dilag"
                    className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Username <span className="text-text-muted font-normal">(e.g. andrei.dilag)</span>
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => {
                      setUsernameManuallyEdited(true);
                      setNewUsername(e.target.value);
                    }}
                    placeholder="e.g. andrei.dilag (auto-generated if empty)"
                    className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none font-mono"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setUsernameManuallyEdited(false);
                    }}
                    className="w-1/2 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-1/2 flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-white shadow-lg shadow-steel/20"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {isEditModalOpen && editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-text-primary mb-2">Edit Teacher Profile</h2>
            <p className="text-xs text-text-muted mb-5">
              Update details or deactivate account access for @{editingTeacher.user.username}.
            </p>

            <form onSubmit={handleUpdateTeacher} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-surface-base p-3.5 border border-border-default">
                <div>
                  <p className="text-xs font-semibold text-text-primary">Account Status</p>
                  <p className="text-[11px] text-text-muted">
                    {editIsActive ? "Active and allowed to log in" : "Deactivated access"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editIsActive ? "bg-steel" : "bg-surface-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editIsActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-1/2 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-white shadow-lg shadow-steel/20"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Teacher Confirmation Modal */}
      <ConfirmModal
        isOpen={!!teacherToDelete}
        title="Delete Teacher Account"
        message={`Are you sure you want to delete the account for ${teacherToDelete?.user.first_name} ${teacherToDelete?.user.last_name} (@${teacherToDelete?.user.username})? All their sections and exams will also be permanently deleted.`}
        confirmText="Delete Account"
        cancelText="Cancel"
        variant="danger"
        icon={<Trash2 className="h-5 w-5 text-burgundy-light" />}
        onConfirm={confirmDeleteTeacher}
        onCancel={() => setTeacherToDelete(null)}
      />

      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
}
