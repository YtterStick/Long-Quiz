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
  UserCheck,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ChevronLeft,
  Search,
  UserX,
  BookOpen,
  X,
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
  full_student_id?: string;
  section_id?: string | null;
  section?: {
    id: string;
    name: string;
    subject?: string;
  } | null;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
  };
  temp_password?: string;
}

export default function TeacherSectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Top-level navigation: Sections view vs Student Directory
  const [activeTab, setActiveTab] = useState<"sections" | "directory">("sections");

  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Active selected section for managing students
  const [selectedSection, setSelectedSection] = useState<SectionItem | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // All students across application
  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directorySearch, setDirectorySearch] = useState("");
  const [directoryFilter, setDirectoryFilter] = useState<"all" | "unassigned">("all");

  // Deletion / Unenroll confirm states
  const [sectionToDelete, setSectionToDelete] = useState<SectionItem | null>(null);
  const [studentToUnenroll, setStudentToUnenroll] = useState<StudentItem | null>(null);
  const [studentToPermanentlyDelete, setStudentToPermanentlyDelete] = useState<StudentItem | null>(null);

  // Modals
  const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isEnrollExistingOpen, setIsEnrollExistingOpen] = useState(false);
  const [enrollSearch, setEnrollSearch] = useState("");
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [isCsvUploadOpen, setIsCsvUploadOpen] = useState(false);

  // Form states for creating student
  const [studentFirstName, setStudentFirstName] = useState("");
  const [studentLastName, setStudentLastName] = useState("");
  const [studentOmrId, setStudentOmrId] = useState("");
  const [studentTargetSection, setStudentTargetSection] = useState<string>("");
  const [newStudentCredentials, setNewStudentCredentials] = useState<{
    name: string;
    student_number: number;
    full_student_id: string;
    username: string;
    temp_password?: string;
  } | null>(null);

  // Form states for section
  const [sectionName, setSectionName] = useState("");
  const [sectionSubject, setSectionSubject] = useState("");

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

  const loadAllStudents = async () => {
    setDirectoryLoading(true);
    try {
      const data = await teacherApi.listAllStudents();
      setAllStudents(data as StudentItem[]);
    } catch (err: unknown) {
      console.error("Failed to load student directory:", err);
    } finally {
      setDirectoryLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (user && user.role === "TEACHER") {
      Promise.all([teacherApi.listSections(), teacherApi.listAllStudents()])
        .then(([sectionsData, studentsData]) => {
          if (!ignore) {
            setSections(sectionsData);
            setAllStudents(studentsData as StudentItem[]);
          }
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
      await loadAllStudents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete section");
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const targetSec = selectedSection?.id || (studentTargetSection ? studentTargetSection : undefined);
      const res = await teacherApi.createStudent({
        first_name: studentFirstName.trim(),
        last_name: studentLastName.trim(),
        student_number: studentOmrId.trim() || undefined,
        section_id: targetSec,
      });

      setNewStudentCredentials({
        name: `${studentFirstName.trim()} ${studentLastName.trim()}`,
        student_number: res.student_number,
        full_student_id: res.full_student_id || `02000${String(res.student_number).padStart(6, "0")}`,
        username: res.user.username,
        temp_password: res.temp_password,
      });

      setStudentFirstName("");
      setStudentLastName("");
      setStudentOmrId("");
      setStudentTargetSection("");

      if (selectedSection) {
        await loadStudents(selectedSection.id);
      }
      await loadSections();
      await loadAllStudents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnrollExisting = async (studentId: string) => {
    if (!selectedSection) return;
    setEnrollingId(studentId);
    try {
      await teacherApi.enrollStudent(selectedSection.id, studentId);
      await loadStudents(selectedSection.id);
      await loadSections();
      await loadAllStudents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to enroll student");
    } finally {
      setEnrollingId(null);
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
      await loadAllStudents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "CSV Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmUnenrollStudent = async () => {
    if (!studentToUnenroll || !selectedSection) return;
    try {
      await teacherApi.unenrollStudent(selectedSection.id, studentToUnenroll.id);
      const sId = selectedSection.id;
      setStudentToUnenroll(null);
      await loadStudents(sId);
      await loadSections();
      await loadAllStudents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to unenroll student");
    }
  };

  const confirmPermanentDeleteStudent = async () => {
    if (!studentToPermanentlyDelete) return;
    try {
      await teacherApi.deleteStudent(studentToPermanentlyDelete.id);
      const sId = studentToPermanentlyDelete.section_id || selectedSection?.id;
      setStudentToPermanentlyDelete(null);
      if (sId && selectedSection) {
        await loadStudents(sId);
      }
      await loadSections();
      await loadAllStudents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete student account");
    }
  };

  // Filter students for Student Directory tab
  const filteredDirectoryStudents = allStudents.filter((s) => {
    if (directoryFilter === "unassigned" && s.section_id) return false;
    if (!directorySearch.trim()) return true;
    const term = directorySearch.toLowerCase().trim();
    const fullName = `${s.user.first_name} ${s.user.last_name}`.toLowerCase();
    const idStr = `02000${String(s.student_number).padStart(6, "0")}`;
    const rawId = String(s.student_number);
    const userStr = s.user.username.toLowerCase();
    return (
      fullName.includes(term) ||
      idStr.includes(term) ||
      rawId.includes(term) ||
      userStr.includes(term)
    );
  });

  // Filter available students for enrolling into the current section
  const availableToEnroll = allStudents.filter((s) => {
    if (!selectedSection) return false;
    // Don't show students already enrolled in this section
    if (s.section_id === selectedSection.id) return false;
    if (!enrollSearch.trim()) return true;
    const term = enrollSearch.toLowerCase().trim();
    const fullName = `${s.user.first_name} ${s.user.last_name}`.toLowerCase();
    const idStr = `02000${String(s.student_number).padStart(6, "0")}`;
    const rawId = String(s.student_number);
    const userStr = s.user.username.toLowerCase();
    return (
      fullName.includes(term) ||
      idStr.includes(term) ||
      rawId.includes(term) ||
      userStr.includes(term)
    );
  });

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
          {selectedSection ? (
            <>
              <button
                onClick={() => setSelectedSection(null)}
                className="hover:text-tan transition-colors"
              >
                Sections & Roster
              </button>
              <span>/</span>
              <span className="text-text-primary font-medium">{selectedSection.name} Roster</span>
            </>
          ) : (
            <span className="text-text-primary font-medium">Sections & Student Directory</span>
          )}
        </div>

        {/* Section Detail View or Main Tabs */}
        {selectedSection ? (
          /* Single Section Roster Management */
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedSection(null)}
                  className="rounded-xl bg-surface-subtle p-2 text-text-muted hover:bg-surface-muted hover:text-text-primary transition-colors cursor-pointer"
                  title="Back to Sections"
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
                    {students.length} Enrolled Students • Removing students unassigns them from this class without deleting their accounts
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setEnrollSearch("");
                    setIsEnrollExistingOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle px-3.5 py-2 text-xs font-semibold text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
                >
                  <UserCheck className="h-4 w-4 text-tan" />
                  Enroll Registered Student
                </button>
                <button
                  onClick={() => {
                    setCsvResult(null);
                    setIsCsvUploadOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle px-3.5 py-2 text-xs font-semibold text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
                >
                  <Upload className="h-4 w-4 text-steel-light" />
                  Import CSV
                </button>
                <button
                  onClick={() => {
                    setNewStudentCredentials(null);
                    setStudentTargetSection(selectedSection.id);
                    setIsAddStudentOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl gradient-bg-primary px-3.5 py-2 text-xs font-semibold text-text-primary shadow-lg shadow-steel/20 hover:opacity-95 transition-all cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  Register & Add
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="glass-card rounded-2xl p-6 border border-border-default">
              {studentsLoading ? (
                <SkeletonTable rows={5} />
              ) : students.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-sm space-y-3">
                  <p>No students enrolled in this section yet.</p>
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => {
                        setEnrollSearch("");
                        setIsEnrollExistingOpen(true);
                      }}
                      className="rounded-xl border border-border-emphasis bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-tan hover:bg-surface-muted cursor-pointer"
                    >
                      Enroll Registered Student
                    </button>
                    <button
                      onClick={() => {
                        setNewStudentCredentials(null);
                        setStudentTargetSection(selectedSection.id);
                        setIsAddStudentOpen(true);
                      }}
                      className="rounded-xl gradient-bg-primary px-3 py-1.5 text-xs font-semibold text-text-primary cursor-pointer"
                    >
                      Register New Student
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border-default text-text-muted font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Student ID</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Username</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default/60 text-text-secondary">
                      {students.map((s) => (
                        <tr key={s.id} className="hover:bg-surface-subtle/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono">
                            <span className="font-bold text-text-primary text-sm tracking-wide">
                              02000{String(s.student_number).padStart(6, "0")}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-text-primary">
                            {s.user.first_name} {s.user.last_name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-tan">
                            @{s.user.username}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setStudentToUnenroll(s)}
                              className="rounded-lg bg-surface-subtle p-1.5 text-text-muted hover:bg-burgundy-ghost hover:text-burgundy-light transition-colors cursor-pointer"
                              title="Remove from Section (Unenroll)"
                            >
                              <UserX className="h-4 w-4" />
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
          /* Main View: Class Sections & Student Directory Tabs */
          <div>
            {/* Top Navigation Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                  Sections & Student Directory
                </h1>
                <p className="text-sm text-text-muted mt-1">
                  Manage academic classes, class rosters, and all registered student accounts.
                </p>
              </div>

              {/* View Selector Tabs */}
              <div className="inline-flex rounded-xl bg-surface-subtle p-1 border border-border-emphasis">
                <button
                  onClick={() => setActiveTab("sections")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "sections"
                      ? "bg-steel text-text-primary shadow-sm"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <School className="h-4 w-4" />
                  <span>Class Sections</span>
                  <span className="rounded-full bg-surface-base px-2 py-0.5 text-[10px] font-bold">
                    {sections.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("directory")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "directory"
                      ? "bg-steel text-text-primary shadow-sm"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>Student Directory</span>
                  <span className="rounded-full bg-surface-base px-2 py-0.5 text-[10px] font-bold">
                    {allStudents.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Tab 1: Class Sections */}
            {activeTab === "sections" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-xs text-text-muted">
                    Click <strong>View Roster</strong> on any section to manage enrolled students or add new students.
                  </p>
                  <button
                    onClick={() => setIsCreateSectionOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-xl gradient-bg-primary px-4 py-2 text-xs font-semibold text-text-primary shadow-lg shadow-steel/20 hover:opacity-95 transition-all cursor-pointer"
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
                      Create your first section (e.g. BSIT 3-A) to begin enrolling students.
                    </p>
                    <button
                      onClick={() => setIsCreateSectionOpen(true)}
                      className="rounded-xl gradient-bg-primary px-4 py-2.5 text-xs font-semibold text-text-primary cursor-pointer"
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
                              className="text-text-faint hover:text-burgundy-light transition-colors p-1 cursor-pointer"
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
                            className="w-full flex items-center justify-center gap-2 rounded-xl border border-border-emphasis bg-surface-subtle/90 py-2.5 text-xs font-semibold text-text-primary hover:bg-surface-muted hover:text-text-primary transition-colors cursor-pointer"
                          >
                            <BookOpen className="h-3.5 w-3.5 text-tan" />
                            View Roster
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Student Directory */}
            {activeTab === "directory" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="relative min-w-64">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                      <input
                        type="text"
                        value={directorySearch}
                        onChange={(e) => setDirectorySearch(e.target.value)}
                        placeholder="Search student ID, name, or username..."
                        className="w-full rounded-xl border border-border-emphasis bg-surface-base pl-9 pr-3.5 py-2 text-xs text-text-primary focus:border-steel focus:outline-none"
                      />
                    </div>

                    {/* Filter Pills */}
                    <div className="inline-flex rounded-xl bg-surface-subtle p-0.5 border border-border-emphasis">
                      <button
                        onClick={() => setDirectoryFilter("all")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          directoryFilter === "all"
                            ? "bg-steel text-text-primary"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        All ({allStudents.length})
                      </button>
                      <button
                        onClick={() => setDirectoryFilter("unassigned")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          directoryFilter === "unassigned"
                            ? "bg-steel text-text-primary"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        Not in Roster ({allStudents.filter((s) => !s.section_id).length})
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setNewStudentCredentials(null);
                      setStudentTargetSection("");
                      setIsAddStudentOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl gradient-bg-primary px-4 py-2 text-xs font-semibold text-text-primary shadow-lg shadow-steel/20 hover:opacity-95 transition-all cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" />
                    Register Student
                  </button>
                </div>

                {/* Directory Table */}
                <div className="glass-card rounded-2xl p-6 border border-border-default">
                  {directoryLoading ? (
                    <SkeletonTable rows={6} />
                  ) : filteredDirectoryStudents.length === 0 ? (
                    <div className="py-12 text-center text-text-muted text-sm space-y-2">
                      <Users className="mx-auto h-10 w-10 text-text-faint" />
                      <p className="font-semibold text-text-secondary">No registered students found</p>
                      <p className="text-xs">
                        {directorySearch
                          ? "Try a different search query."
                          : "Register students into the application directory to use them across any class section."}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-border-default text-text-muted font-semibold uppercase tracking-wider">
                            <th className="py-3 px-4">Student ID</th>
                            <th className="py-3 px-4">Student Name</th>
                            <th className="py-3 px-4">Username</th>
                            <th className="py-3 px-4">Current Section</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-default/60 text-text-secondary">
                          {filteredDirectoryStudents.map((s) => (
                            <tr key={s.id} className="hover:bg-surface-subtle/30 transition-colors">
                              <td className="py-3.5 px-4 font-mono">
                                <span className="font-bold text-text-primary text-sm tracking-wide">
                                  02000{String(s.student_number).padStart(6, "0")}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-text-primary">
                                {s.user.first_name} {s.user.last_name}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-tan">
                                @{s.user.username}
                              </td>
                              <td className="py-3.5 px-4">
                                {s.section ? (
                                  <span className="inline-flex items-center rounded-full bg-steel/15 px-2.5 py-0.5 text-xs font-semibold text-steel-light border border-steel/30">
                                    {s.section.name} {s.section.subject ? `• ${s.section.subject}` : ""}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-cream-ghost px-2.5 py-0.5 text-xs font-semibold text-cream border border-cream-border">
                                    Not in Class Roster
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => setStudentToPermanentlyDelete(s)}
                                  className="rounded-lg bg-surface-subtle p-1.5 text-text-muted hover:bg-burgundy-ghost hover:text-burgundy-light transition-colors cursor-pointer"
                                  title="Permanently Delete Account"
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
            )}
          </div>
        )}
      </main>

      {/* Modal: Enroll Registered Student into Current Section */}
      {isEnrollExistingOpen && selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-text-primary">
                  Enroll into {selectedSection.name}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Select a registered student from the application directory to enroll into this section.
                </p>
              </div>
              <button
                onClick={() => setIsEnrollExistingOpen(false)}
                className="rounded-lg p-1 text-text-muted hover:bg-surface-subtle hover:text-text-primary cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                value={enrollSearch}
                onChange={(e) => setEnrollSearch(e.target.value)}
                placeholder="Search by student ID, name, or username..."
                className="w-full rounded-xl border border-border-emphasis bg-surface-base pl-9 pr-3.5 py-2 text-xs text-text-primary focus:border-steel focus:outline-none"
              />
            </div>

            {/* Available students list */}
            <div className="max-h-72 overflow-y-auto space-y-2 border border-border-default rounded-xl p-2 bg-surface-base">
              {availableToEnroll.length === 0 ? (
                <div className="py-8 text-center text-xs text-text-muted">
                  No other students found to enroll.
                </div>
              ) : (
                availableToEnroll.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-surface-subtle hover:bg-surface-muted transition-colors border border-border-emphasis/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-text-primary">
                          02000{String(s.student_number).padStart(6, "0")}
                        </span>
                        <span className="font-semibold text-xs text-text-primary">
                          {s.user.first_name} {s.user.last_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted">
                        <span className="font-mono text-tan">@{s.user.username}</span>
                        <span>•</span>
                        <span>
                          {s.section ? `In ${s.section.name}` : "Not in any class roster"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleEnrollExisting(s.id)}
                      disabled={enrollingId === s.id}
                      className="flex items-center gap-1.5 rounded-lg gradient-bg-primary px-3 py-1.5 text-xs font-semibold text-text-primary hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {enrollingId === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                      Enroll
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsEnrollExistingOpen(false)}
                className="rounded-xl border border-border-emphasis bg-surface-subtle px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-muted cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Register Student (New Account) */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-text-primary mb-2">Register Student</h2>
            <p className="text-xs text-text-muted mb-5">
              Create a student account. Assign their student ID with static prefix <strong className="text-tan">02000</strong> and 6-digit OMR bubble digit.
            </p>

            {newStudentCredentials ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-sage-ghost border border-sage-border p-4">
                  <div className="flex items-center gap-2 text-sage font-semibold text-sm mb-3">
                    <CheckCircle2 className="h-5 w-5" />
                    Student Account Created!
                  </div>
                  <div className="space-y-2 text-xs font-mono bg-surface-base p-3 rounded-lg border border-border-default">
                    <p className="text-text-secondary">Name: <span className="text-text-primary font-semibold">{newStudentCredentials.name}</span></p>
                    <p className="text-text-secondary">Full Student ID: <span className="text-sage font-bold">{newStudentCredentials.full_student_id}</span></p>
                    <p className="text-text-secondary">Username: <span className="text-tan font-bold">@{newStudentCredentials.username}</span></p>
                    <p className="text-text-secondary">Temp Password: <span className="text-cream font-bold">{newStudentCredentials.temp_password}</span></p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Student: ${newStudentCredentials.name}\nStudent ID: ${newStudentCredentials.full_student_id}\nUsername: ${newStudentCredentials.username}\nPassword: ${newStudentCredentials.temp_password}`
                      );
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-primary hover:bg-surface-muted cursor-pointer"
                  >
                    {copied ? <Check className="h-4 w-4 text-sage" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied!" : "Copy Details"}
                  </button>
                  <button
                    onClick={() => {
                      setNewStudentCredentials(null);
                      setIsAddStudentOpen(false);
                    }}
                    className="flex-1 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-text-primary cursor-pointer"
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

                {/* Section Assignment */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Assign to Class Section
                  </label>
                  {selectedSection ? (
                    <div className="rounded-xl border border-border-emphasis bg-surface-subtle px-3.5 py-2.5 text-xs font-semibold text-steel-light">
                      Enrolling into: <strong>{selectedSection.name}</strong> ({selectedSection.subject})
                    </div>
                  ) : (
                    <select
                      value={studentTargetSection}
                      onChange={(e) => setStudentTargetSection(e.target.value)}
                      className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-xs text-text-primary focus:border-steel focus:outline-none"
                    >
                      <option value="">None (Keep unassigned in Student Directory)</option>
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name} ({sec.subject})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Student ID with static 02000 prefix */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Student ID (OMR Number)
                  </label>
                  <div className="flex items-center rounded-xl border border-border-emphasis bg-surface-base focus-within:border-steel transition-colors overflow-hidden">
                    <div className="bg-surface-subtle px-3 py-2.5 text-xs font-mono font-bold text-text-secondary border-r border-border-emphasis flex items-center gap-1 select-none">
                      <span className="text-sage font-extrabold">02000</span>
                      <span className="text-text-muted">-</span>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={studentOmrId}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setStudentOmrId(val);
                      }}
                      placeholder="e.g. 282222 (leave blank to auto-generate)"
                      className="w-full bg-transparent px-3 py-2.5 text-sm font-mono text-text-primary focus:outline-none placeholder:text-text-faint"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text-muted mt-1">
                    <span>Static prefix <strong className="text-text-secondary">02000</strong></span>
                    {studentOmrId ? (
                      <span className="font-mono text-tan font-semibold">Full: 02000{studentOmrId.padStart(6, "0")}</span>
                    ) : (
                      <span className="italic text-text-faint">Auto-generates if empty</span>
                    )}
                  </div>
                </div>

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
                    onClick={() => {
                      setIsAddStudentOpen(false);
                      setStudentOmrId("");
                      setError(null);
                    }}
                    className="w-1/2 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-1/2 flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-text-primary shadow-lg shadow-steel/20 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Student"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create Section */}
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
                  placeholder="e.g. Information Management"
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSectionOpen(false)}
                  className="w-1/2 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-text-primary shadow-lg shadow-steel/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Section"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Upload Modal */}
      {isCsvUploadOpen && selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-text-primary mb-2">CSV Bulk Student Import</h2>
            <p className="text-xs text-text-muted mb-4">
              Upload a CSV file containing <code className="text-tan font-mono">first_name,last_name,student_id</code> (optional 6-digit OMR ID or 02000-prefixed ID).
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
                        • {s.user.first_name} {s.user.last_name} → ID: 02000{String(s.student_number).padStart(6, "0")} | User: @{s.user.username} (Pass: {s.temp_password})
                      </p>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setCsvResult(null);
                    setIsCsvUploadOpen(false);
                  }}
                  className="w-full rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-text-primary cursor-pointer"
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
                    className="text-xs text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-tan-ghost file:text-tan hover:file:bg-tan-ghost cursor-pointer"
                  />
                  {csvFile && (
                    <p className="mt-2 text-xs text-sage font-semibold">{csvFile.name}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCsvUploadOpen(false)}
                    className="w-1/2 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !csvFile}
                    className="w-1/2 flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-text-primary shadow-lg shadow-steel/20 disabled:opacity-50 cursor-pointer"
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
        message={`Are you sure you want to delete "${sectionToDelete?.name}" (${sectionToDelete?.subject})? All ${sectionToDelete?.student_count || 0} enrolled student accounts and past exam grades will remain safe and preserved in the application directory.`}
        confirmText="Delete Section"
        cancelText="Cancel"
        variant="danger"
        icon={<Trash2 className="h-5 w-5 text-burgundy-light" />}
        onConfirm={confirmDeleteSection}
        onCancel={() => setSectionToDelete(null)}
      />

      {/* Student Unenroll from Section Confirmation Modal */}
      <ConfirmModal
        isOpen={!!studentToUnenroll}
        title="Remove Student from Section"
        message={`Are you sure you want to remove ${studentToUnenroll?.user.first_name} ${studentToUnenroll?.user.last_name} (ID: 02000${String(studentToUnenroll?.student_number).padStart(6, "0")}) from "${selectedSection?.name}"? Their student account, login credentials, and quiz submissions will NOT be deleted and will remain intact in the application.`}
        confirmText="Remove from Section"
        cancelText="Cancel"
        variant="danger"
        icon={<UserX className="h-5 w-5 text-burgundy-light" />}
        onConfirm={confirmUnenrollStudent}
        onCancel={() => setStudentToUnenroll(null)}
      />

      {/* Permanent Account Delete Confirmation Modal (Directory only) */}
      <ConfirmModal
        isOpen={!!studentToPermanentlyDelete}
        title="Permanently Delete Student Account"
        message={`Are you sure you want to permanently delete the account for ${studentToPermanentlyDelete?.user.first_name} ${studentToPermanentlyDelete?.user.last_name} (ID: 02000${String(studentToPermanentlyDelete?.student_number).padStart(6, "0")})? This action cannot be undone.`}
        confirmText="Permanently Delete"
        cancelText="Cancel"
        variant="danger"
        icon={<Trash2 className="h-5 w-5 text-burgundy-light" />}
        onConfirm={confirmPermanentDeleteStudent}
        onCancel={() => setStudentToPermanentlyDelete(null)}
      />

      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
}
