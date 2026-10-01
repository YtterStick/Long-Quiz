"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { teacher as teacherApi } from "@/lib/api";
import {
  School,
  Plus,
  Users,
  Upload,
  UserPlus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import { SkeletonTable, SkeletonSectionGrid } from "@/components/ui/Skeleton";
import { ConfirmModal } from "@/components/ConfirmModal";

interface SectionItem {
  id: string;
  name: string;
  subject: string;
  created_at: string;
  student_count: number;
}

interface StudentItem {
  id: string;
  student_number: number;
  section_id: string;
  user: {
    first_name: string;
    last_name: string;
    username: string;
  };
  temp_password?: string;
}

export default function TeacherSectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Active selected section for managing students
  const [selectedSection, setSelectedSection] = useState<SectionItem | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Deletion confirm states
  const [sectionToDelete, setSectionToDelete] = useState<SectionItem | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<StudentItem | null>(null);

  // Modals
  const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isCsvUploadOpen, setIsCsvUploadOpen] = useState(false);

  // Form states
  const [sectionName, setSectionName] = useState("");
  const [sectionSubject, setSectionSubject] = useState("");

  const [studentFirstName, setStudentFirstName] = useState("");
  const [studentLastName, setStudentLastName] = useState("");
  const [newStudentCredentials, setNewStudentCredentials] = useState<{
    name: string;
    student_number: number;
    username: string;
    temp_password?: string;
  } | null>(null);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvResult, setCsvResult] = useState<{ created: number; students: StudentItem[] } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "TEACHER")) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const loadSections = async () => {
    setLoading(true);
    try {
      const data = await teacherApi.listSections();
      setSections(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load sections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (user && user.role === "TEACHER") {
      teacherApi
        .listSections()
        .then((data) => {
          if (!ignore) setSections(data);
        })
        .catch((err: unknown) => {
          if (!ignore) setError(err instanceof Error ? err.message : "Failed to load sections");
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [user]);

  const loadStudents = async (sectionId: string) => {
    setStudentsLoading(true);
    try {
      const data = await teacherApi.listStudents(sectionId);
      setStudents(data as StudentItem[]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await teacherApi.createSection({ name: sectionName, subject: sectionSubject });
      setSectionName("");
      setSectionSubject("");
      setIsCreateSectionOpen(false);
      await loadSections();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create section");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteSection = async () => {
    if (!sectionToDelete) return;
    try {
      await teacherApi.deleteSection(sectionToDelete.id);
      if (selectedSection?.id === sectionToDelete.id) setSelectedSection(null);
      setSectionToDelete(null);
      await loadSections();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete section");
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await teacherApi.addStudent(selectedSection.id, {
        first_name: studentFirstName,
        last_name: studentLastName,
      }) as unknown as { student_number: number; user: { username: string }; temp_password?: string };
      setNewStudentCredentials({
        name: `${studentFirstName} ${studentLastName}`,
        student_number: res.student_number,
        username: res.user.username,
        temp_password: res.temp_password,
      });
      setStudentFirstName("");
      setStudentLastName("");
      await loadStudents(selectedSection.id);
      await loadSections();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !csvFile) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await teacherApi.addStudentsCSV(selectedSection.id, csvFile);
      setCsvResult(res as { created: number; students: StudentItem[] });
      setCsvFile(null);
      await loadStudents(selectedSection.id);
      await loadSections();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "CSV Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      await teacherApi.deleteStudent(studentToDelete.id);
      const sId = studentToDelete.section_id || selectedSection?.id;
      setStudentToDelete(null);
      if (sId) {
        await loadStudents(sId);
        await loadSections();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete student");
    }
  };

  return (
    <div className="min-h-screen bg-surface-base text-text-primary">
      <Navbar onOpenPasswordModal={() => setPasswordModalOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:pb-12 sm:px-6">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-text-muted">
          <Link href="/teacher/dashboard" className="hover:text-tan transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-text-primary font-medium">Sections & Roster</span>
        </div>

        {/* Section Detail View or Main Grid */}
        {selectedSection ? (
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedSection(null)}
                  className="rounded-xl bg-surface-subtle p-2 text-text-muted hover:bg-surface-muted hover:text-text-primary transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-text-primary">{selectedSection.name}</h1>
                    <span className="rounded-full bg-tan-ghost px-2.5 py-0.5 text-xs font-semibold text-tan border border-tan-border">
                      {selectedSection.subject}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Enrolled Students: {students.length} • Numerical IDs used for OMR shading
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCsvResult(null);
                    setIsCsvUploadOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle px-3.5 py-2 text-xs font-semibold text-text-primary hover:bg-surface-muted transition-colors"
                >
                  <Upload className="h-4 w-4 text-tan" />
                  CSV Bulk Upload
                </button>
                <button
                  onClick={() => {
                    setNewStudentCredentials(null);
                    setIsAddStudentOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl gradient-bg-primary px-3.5 py-2 text-xs font-semibold text-text-primary shadow-lg shadow-steel/20 hover:opacity-95 transition-all"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Student
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="glass-card rounded-2xl p-6 border border-border-default">
              {studentsLoading ? (
                <SkeletonTable rows={5} />
              ) : students.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-sm">
                  No students in this section yet. Add students manually or via CSV.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border-default text-text-muted font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">6-Digit Student ID (OMR)</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Username</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default/60 text-text-secondary">
                      {students.map((s) => (
                        <tr key={s.id} className="hover:bg-surface-subtle/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-sage">
                            {s.student_number}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-text-primary">
                            {s.user.first_name} {s.user.last_name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-tan">
                            @{s.user.username}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setStudentToDelete(s)}
                              className="rounded-lg bg-surface-subtle p-1.5 text-text-muted hover:bg-burgundy-ghost hover:text-burgundy-light transition-colors"
                              title="Remove Student"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Sections Main List */
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                  Class Sections
                </h1>
                <p className="text-sm text-text-muted mt-1">
                  Manage your academic sections and student rosters.
                </p>
              </div>
              <button
                onClick={() => setIsCreateSectionOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl gradient-bg-primary px-4 py-2.5 text-sm font-semibold text-text-primary shadow-lg shadow-steel/20 hover:opacity-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                Create Section
              </button>
            </div>

            {loading ? (
              <SkeletonSectionGrid count={3} />
            ) : sections.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center border border-border-default">
                <School className="mx-auto h-12 w-12 text-text-faint mb-3" />
                <h3 className="text-lg font-bold text-text-primary">No Sections Created</h3>
                <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 mb-6">
                  Create your first section (e.g. BSIT 3-A) to begin enrolling students and generating OMR student IDs.
                </p>
                <button
                  onClick={() => setIsCreateSectionOpen(true)}
                  className="rounded-xl gradient-bg-primary px-4 py-2.5 text-xs font-semibold text-text-primary"
                >
                  Create First Section
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {sections.map((sec) => (
                  <div
                    key={sec.id}
                    className="glass-card glass-card-hover rounded-2xl p-6 border border-border-default flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="rounded-full bg-tan-ghost px-2.5 py-0.5 text-xs font-semibold text-tan border border-tan-border">
                          {sec.subject}
                        </span>
                        <button
                          onClick={() => setSectionToDelete(sec)}
                          className="text-text-faint hover:text-burgundy-light transition-colors p-1"
                          title="Delete Section"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <h3 className="text-xl font-bold text-text-primary">{sec.name}</h3>
                      <div className="mt-4 flex items-center gap-2 text-xs text-text-muted">
                        <Users className="h-4 w-4 text-text-faint" />
                        <span>{sec.student_count} Enrolled Students</span>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-2 pt-4 border-t border-border-default">
                      <button
                        onClick={() => {
                          setSelectedSection(sec);
                          loadStudents(sec.id);
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-border-emphasis bg-surface-subtle/90 py-2.5 text-xs font-semibold text-text-primary hover:bg-surface-muted hover:text-text-primary transition-colors"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-tan" />
                        View Roster
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Section Modal */}
      {isCreateSectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-text-primary mb-2">Create Section</h2>
            <p className="text-xs text-text-muted mb-5">
              Specify the section name and course subject.
            </p>

            <form onSubmit={handleCreateSection} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Section Name</label>
                <input
                  type="text"
                  required
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="e.g. BSIT 3-A"
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Subject / Course</label>
                <input
                  type="text"
                  required
                  value={sectionSubject}
                  onChange={(e) => setSectionSubject(e.target.value)}
                  placeholder="e.g. Computer Science 101"
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSectionOpen(false)}
                  className="w-1/2 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-text-primary shadow-lg shadow-steel/20"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Section"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddStudentOpen && selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-text-primary mb-2">Add Student to {selectedSection.name}</h2>
            <p className="text-xs text-text-muted mb-5">
              A 6-digit numerical Student ID and temporary credentials will be auto-generated.
            </p>

            {newStudentCredentials ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-sage-ghost border border-sage-border p-4">
                  <div className="flex items-center gap-2 text-sage font-semibold text-sm mb-3">
                    <CheckCircle2 className="h-5 w-5" />
                    Student Enrolled!
                  </div>
                  <div className="space-y-2 text-xs font-mono bg-surface-base p-3 rounded-lg border border-border-default">
                    <p className="text-text-secondary">Name: <span className="text-text-primary">{newStudentCredentials.name}</span></p>
                    <p className="text-text-secondary">6-Digit ID: <span className="text-sage">{newStudentCredentials.student_number}</span></p>
                    <p className="text-text-secondary">Username: <span className="text-tan">{newStudentCredentials.username}</span></p>
                    <p className="text-text-secondary">Temp Password: <span className="text-cream">{newStudentCredentials.temp_password}</span></p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Student: ${newStudentCredentials.name}\n6-Digit OMR ID: ${newStudentCredentials.student_number}\nUsername: ${newStudentCredentials.username}\nPassword: ${newStudentCredentials.temp_password}`
                      );
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-primary"
                  >
                    {copied ? <Check className="h-4 w-4 text-sage" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied!" : "Copy Details"}
                  </button>
                  <button
                    onClick={() => {
                      setNewStudentCredentials(null);
                      setIsAddStudentOpen(false);
                    }}
                    className="flex-1 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-text-primary"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddStudent} className="space-y-4">
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
                    value={studentFirstName}
                    onChange={(e) => setStudentFirstName(e.target.value)}
                    placeholder="e.g. Juan"
                    className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={studentLastName}
                    onChange={(e) => setStudentLastName(e.target.value)}
                    placeholder="e.g. Dela Cruz"
                    className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddStudentOpen(false)}
                    className="w-1/2 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-1/2 flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-text-primary shadow-lg shadow-steel/20"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Student"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CSV Bulk Upload Modal */}
      {isCsvUploadOpen && selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-text-primary mb-2">CSV Bulk Student Import</h2>
            <p className="text-xs text-text-muted mb-4">
              Upload a CSV file containing <code className="text-tan font-mono">first_name,last_name</code> columns.
            </p>

            {csvResult ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-sage-ghost border border-sage-border p-4 text-xs">
                  <p className="font-semibold text-sage mb-2">
                    Successfully imported {csvResult.created} students!
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-[11px]">
                    {csvResult.students.map((s, idx) => (
                      <p key={idx} className="text-text-secondary">
                        • {s.user.first_name} {s.user.last_name} → ID: {s.student_number} (Pass: {s.temp_password})
                      </p>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setCsvResult(null);
                    setIsCsvUploadOpen(false);
                  }}
                  className="w-full rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-text-primary"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCsvUpload} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="rounded-xl border border-dashed border-border-emphasis bg-surface-base p-6 text-center">
                  <Upload className="mx-auto h-8 w-8 text-text-faint mb-2" />
                  <input
                    type="file"
                    accept=".csv"
                    required
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="text-xs text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-tan-ghost file:text-tan hover:file:bg-tan-ghost"
                  />
                  {csvFile && (
                    <p className="mt-2 text-xs text-sage font-semibold">{csvFile.name}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCsvUploadOpen(false)}
                    className="w-1/2 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !csvFile}
                    className="w-1/2 flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-text-primary shadow-lg shadow-steel/20 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import CSV"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Section Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!sectionToDelete}
        title="Delete Class Section"
        message={`Are you sure you want to delete "${sectionToDelete?.name}" (${sectionToDelete?.subject})? All enrolled students will be unassigned from this section.`}
        confirmText="Delete Section"
        cancelText="Cancel"
        variant="danger"
        icon={<Trash2 className="h-5 w-5 text-burgundy-light" />}
        onConfirm={confirmDeleteSection}
        onCancel={() => setSectionToDelete(null)}
      />

      {/* Student Removal Confirmation Modal */}
      <ConfirmModal
        isOpen={!!studentToDelete}
        title="Remove Student"
        message={`Are you sure you want to remove ${studentToDelete?.user.first_name} ${studentToDelete?.user.last_name} (ID: ${studentToDelete?.student_number}) from this section?`}
        confirmText="Remove Student"
        cancelText="Cancel"
        variant="danger"
        icon={<Trash2 className="h-5 w-5 text-burgundy-light" />}
        onConfirm={confirmDeleteStudent}
        onCancel={() => setStudentToDelete(null)}
      />

      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
}
