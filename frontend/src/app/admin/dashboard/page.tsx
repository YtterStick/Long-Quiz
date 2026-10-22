"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  Upload,
  Key,
  KeyRound,
  Download,
  Sparkles,
  FileText,
  IdCard,
  UserCheck,
  Filter,
} from "lucide-react";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import { SkeletonStatCards, SkeletonTable, SkeletonDashboardPage } from "@/components/ui/Skeleton";
import { ConfirmModal } from "@/components/ConfirmModal";
import { WelcomeHero } from "@/components/WelcomeHero";
import { Pagination } from "@/components/ui/Pagination";

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

interface StudentItem {
  id: string;
  user_id: string;
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
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
    must_change_password: boolean;
    created_at: string;
  };
  temp_password?: string;
  has_pending_reset_request?: boolean;
}

interface SectionItem {
  id: string;
  name: string;
  subject: string;
  teacher_id: string;
  teacher_name?: string;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"teachers" | "students">("students");

  const [stats, setStats] = useState({
    total_teachers: 0,
    total_students: 0,
    total_sections: 0,
    total_exams: 0,
    total_submissions: 0,
  });

  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("all");

  // Teacher Modals
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [isEditTeacherModalOpen, setIsEditTeacherModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherItem | null>(null);

  // Student Modals
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isBatchUploadModalOpen, setIsBatchUploadModalOpen] = useState(false);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentItem | null>(null);

  // Password Modals
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    student_name: string;
    username: string;
    full_student_id: string;
    temp_password: string;
  } | null>(null);
  const [resetTeacherPasswordModal, setResetTeacherPasswordModal] = useState<{
    teacher_name: string;
    username: string;
    temp_password: string;
  } | null>(null);

  // In-flight Action Loading States
  const [resettingTeacherId, setResettingTeacherId] = useState<string | null>(null);
  const [resettingStudentId, setResettingStudentId] = useState<string | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(false);

  // Pagination State
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(10);
  const [teacherPage, setTeacherPage] = useState(1);
  const [teacherPageSize, setTeacherPageSize] = useState(10);

  // Teacher Form State
  const [newTeacherFirstName, setNewTeacherFirstName] = useState("");
  const [newTeacherLastName, setNewTeacherLastName] = useState("");
  const [newTeacherUsername, setNewTeacherUsername] = useState("");
  const [teacherUsernameEdited, setTeacherUsernameEdited] = useState(false);
  const [createdTeacherCredentials, setCreatedTeacherCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);

  const [editingTeacher, setEditingTeacher] = useState<TeacherItem | null>(null);
  const [editTeacherFirstName, setEditTeacherFirstName] = useState("");
  const [editTeacherLastName, setEditTeacherLastName] = useState("");
  const [editTeacherIsActive, setEditTeacherIsActive] = useState(true);

  // Student Form State
  const [studentFirstName, setStudentFirstName] = useState("");
  const [studentLastName, setStudentLastName] = useState("");
  const [studentNumberInput, setStudentNumberInput] = useState("");
  const [studentSectionId, setStudentSectionId] = useState("");
  const [createdStudentCredentials, setCreatedStudentCredentials] = useState<{
    full_student_id: string;
    username: string;
    password: string;
    name: string;
  } | null>(null);

  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [editStudentFirstName, setEditStudentFirstName] = useState("");
  const [editStudentLastName, setEditStudentLastName] = useState("");
  const [editStudentNumber, setEditStudentNumber] = useState("");
  const [editStudentSectionId, setEditStudentSectionId] = useState("");
  const [editStudentIsActive, setEditStudentIsActive] = useState(true);

  // Batch Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [batchUploadResult, setBatchUploadResult] = useState<{
    created: number;
    skipped?: number;
    total?: number;
    students: Array<{
      full_student_id?: string;
      student_number: number;
      user: { username: string; first_name: string; last_name: string };
      temp_password?: string;
    }>;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const fetchData = async (showSkeleton = false) => {
    if (showSkeleton) setLoading(true);
    try {
      const [statsData, teachersData, studentsData, sectionsData] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.listTeachers(),
        adminApi.listStudents(),
        adminApi.listSections(),
      ]);
      setStats(statsData);
      setTeachers(teachersData as TeacherItem[]);
      setStudents(studentsData as StudentItem[]);
      setSections(sectionsData as SectionItem[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (user && user.role === "ADMIN") {
      Promise.all([
        adminApi.getDashboard(),
        adminApi.listTeachers(),
        adminApi.listStudents(),
        adminApi.listSections(),
      ])
        .then(([statsData, teachersData, studentsData, sectionsData]) => {
          if (!ignore) {
            setStats(statsData);
            setTeachers(teachersData as TeacherItem[]);
            setStudents(studentsData as StudentItem[]);
            setSections(sectionsData as SectionItem[]);
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

  // Teacher Username auto-suggestion
  const updateTeacherUsernameSuggestion = (first: string, last: string) => {
    if (!teacherUsernameEdited) {
      const cleanFirst = first.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanLast = last.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanFirst && cleanLast) {
        setNewTeacherUsername(`${cleanFirst}.${cleanLast}`);
      } else if (cleanFirst) {
        setNewTeacherUsername(cleanFirst);
      } else if (cleanLast) {
        setNewTeacherUsername(cleanLast);
      } else {
        setNewTeacherUsername("");
      }
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await adminApi.createTeacher({
        first_name: newTeacherFirstName.trim(),
        last_name: newTeacherLastName.trim(),
        username: newTeacherUsername.trim() || undefined,
        role: "TEACHER",
      });
      setCreatedTeacherCredentials({
        username: res.username,
        password: res.temp_password,
      });
      setNewTeacherFirstName("");
      setNewTeacherLastName("");
      setNewTeacherUsername("");
      setTeacherUsernameEdited(false);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create teacher");
    } finally {
      setSubmitting(false);
    }
  };

  const copyTeacherCredentials = () => {
    if (!createdTeacherCredentials) return;
    navigator.clipboard.writeText(
      `Username: ${createdTeacherCredentials.username}\nPassword: ${createdTeacherCredentials.password}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setError(null);
    setSubmitting(true);
    try {
      await adminApi.updateTeacher(editingTeacher.user.id, {
        first_name: editTeacherFirstName,
        last_name: editTeacherLastName,
        is_active: editTeacherIsActive,
      });
      setIsEditTeacherModalOpen(false);
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
    setDeletingTeacher(true);
    try {
      await adminApi.deleteTeacher(teacherToDelete.user.id);
      setTeacherToDelete(null);
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete teacher");
    } finally {
      setDeletingTeacher(false);
    }
  };

  // Student Handlers
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await adminApi.createStudent({
        first_name: studentFirstName.trim(),
        last_name: studentLastName.trim(),
        student_number: studentNumberInput.trim() || undefined,
        section_id: studentSectionId || undefined,
      });
      setCreatedStudentCredentials({
        full_student_id: res.full_student_id || `02000${res.student_number}`,
        username: res.user.username,
        password: res.temp_password || "Password on reset",
        name: `${studentFirstName.trim()} ${studentLastName.trim()}`,
      });
      setStudentFirstName("");
      setStudentLastName("");
      setStudentNumberInput("");
      setStudentSectionId("");
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create student");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setError(null);
    setSubmitting(true);
    try {
      await adminApi.updateStudent(editingStudent.id, {
        first_name: editStudentFirstName.trim(),
        last_name: editStudentLastName.trim(),
        student_number: editStudentNumber.trim() || undefined,
        section_id: editStudentSectionId || null,
        is_active: editStudentIsActive,
      });
      setIsEditStudentModalOpen(false);
      setEditingStudent(null);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update student");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setDeletingStudent(true);
    try {
      await adminApi.deleteStudent(studentToDelete.id);
      setStudentToDelete(null);
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete student");
    } finally {
      setDeletingStudent(false);
    }
  };

  const handleResetPassword = async (student: StudentItem) => {
    setResettingStudentId(student.id);
    try {
      const res = await adminApi.resetStudentPassword(student.id);
      setResetPasswordModal({
        student_name: `${student.user.first_name} ${student.user.last_name}`,
        username: res.username,
        full_student_id: res.full_student_id,
        temp_password: res.temp_password,
      });
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setResettingStudentId(null);
    }
  };

  const handleResetTeacherPassword = async (teacher: TeacherItem) => {
    setResettingTeacherId(teacher.id);
    try {
      const res = await adminApi.resetTeacherPassword(teacher.user_id || teacher.id);
      setResetTeacherPasswordModal({
        teacher_name: `${teacher.user.first_name} ${teacher.user.last_name}`,
        username: res.username,
        temp_password: res.temp_password,
      });
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reset teacher password");
    } finally {
      setResettingTeacherId(null);
    }
  };

  // Batch Excel / CSV upload
  const handleBatchUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setError(null);
    setUploading(true);
    try {
      const res = await adminApi.uploadStudents(uploadFile);
      setBatchUploadResult(res);
      setUploadFile(null);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to parse and upload student file");
    } finally {
      setUploading(false);
    }
  };

  const copyBatchCredentials = () => {
    if (!batchUploadResult || !batchUploadResult.students.length) return;
    const header = "Student ID\tName\tUsername\tTemporary Password\n";
    const body = batchUploadResult.students
      .map(
        (s) =>
          `${s.full_student_id || `02000${s.student_number}`}\t${s.user.last_name}, ${s.user.first_name}\t${s.user.username}\t${s.temp_password || ""}`
      )
      .join("\n");
    navigator.clipboard.writeText(header + body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBatchCredentialsCSV = () => {
    if (!batchUploadResult || !batchUploadResult.students.length) return;
    const csvRows = [
      ["Student ID", "Last Name", "First Name", "Username", "Temporary Password"],
      ...batchUploadResult.students.map((s) => [
        s.full_student_id || `02000${s.student_number}`,
        s.user.last_name,
        s.user.first_name,
        s.user.username,
        s.temp_password || "",
      ]),
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      csvRows.map((e) => e.map((val) => `"${val}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `evalo_students_credentials_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filters
  const filteredTeachers = teachers.filter(
    (t) =>
      t.user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_number.toString().includes(searchTerm) ||
      (s.full_student_id && s.full_student_id.includes(searchTerm)) ||
      (s.section && s.section.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSection =
      selectedSectionFilter === "all"
        ? true
        : selectedSectionFilter === "unassigned"
        ? !s.section_id
        : s.section_id === selectedSectionFilter;

    return matchesSearch && matchesSection;
  });

  // Reset pagination when search or filters change
  useEffect(() => {
    setStudentPage(1);
  }, [searchTerm, selectedSectionFilter, studentPageSize]);

  useEffect(() => {
    setTeacherPage(1);
  }, [searchTerm, teacherPageSize]);

  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * studentPageSize;
    return filteredStudents.slice(start, start + studentPageSize);
  }, [filteredStudents, studentPage, studentPageSize]);

  const paginatedTeachers = useMemo(() => {
    const start = (teacherPage - 1) * teacherPageSize;
    return filteredTeachers.slice(start, start + teacherPageSize);
  }, [filteredTeachers, teacherPage, teacherPageSize]);

  if (authLoading) {
    return <SkeletonDashboardPage role="admin" />;
  }

  return (
    <div className="min-h-screen text-text-primary">
      <Navbar onOpenPasswordModal={() => setPasswordModalOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:pb-12 sm:px-6">
        {/* Welcome Header */}
        <div className="mb-8">
          <WelcomeHero
            role="admin"
            showRoleBadge={false}
            name={user?.first_name}
            loading={authLoading}
            description="Institutional administration for student enrollment, teacher accounts, and section directories."
            actions={
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  id="hero-batch-upload"
                  onClick={() => {
                    setBatchUploadResult(null);
                    setUploadFile(null);
                    setError(null);
                    setIsBatchUploadModalOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all active:scale-95 border border-emerald-400/30"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Batch Create (Excel / CSV)
                </button>
                <button
                  id="hero-add-student"
                  onClick={() => {
                    setCreatedStudentCredentials(null);
                    setError(null);
                    setIsAddStudentModalOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-2xl border border-border-emphasis bg-surface-overlay px-4 py-2.5 text-xs font-bold text-text-primary hover:bg-surface-subtle transition-all active:scale-95"
                >
                  <GraduationCap className="h-4 w-4 text-steel" />
                  Add Student
                </button>
                <button
                  id="hero-add-teacher"
                  onClick={() => {
                    setCreatedTeacherCredentials(null);
                    setError(null);
                    setIsAddTeacherModalOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-2xl gradient-bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-steel/20 hover:opacity-95 transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Add Teacher
                </button>
              </div>
            }
          />
        </div>

        {/* Stats Grid */}
        {loading ? (
          <SkeletonStatCards count={4} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard
              title="Total Students"
              value={stats.total_students}
              icon={GraduationCap}
              color="steel"
            />
            <StatCard
              title="Total Teachers"
              value={stats.total_teachers}
              icon={Users}
              color="tan"
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

        {/* Tab Selection Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="inline-flex rounded-2xl bg-surface-base p-1.5 border border-border-default shadow-inner">
            <button
              onClick={() => {
                setActiveTab("students");
                setSearchTerm("");
              }}
              className={`flex items-center gap-2.5 rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
                activeTab === "students"
                  ? "bg-steel text-white shadow-md shadow-steel/20"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/50"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              <span>Student Directory</span>
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  activeTab === "students"
                    ? "bg-white/20 text-white"
                    : "bg-surface-overlay text-text-secondary"
                }`}
              >
                {students.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("teachers");
                setSearchTerm("");
              }}
              className={`flex items-center gap-2.5 rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
                activeTab === "teachers"
                  ? "bg-steel text-white shadow-md shadow-steel/20"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/50"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Teacher Accounts</span>
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  activeTab === "teachers"
                    ? "bg-white/20 text-white"
                    : "bg-surface-overlay text-text-secondary"
                }`}
              >
                {teachers.length}
              </span>
            </button>
          </div>

          {/* Action buttons matching current tab */}
          <div className="flex items-center gap-2.5">
            {activeTab === "students" ? (
              <>
                <button
                  onClick={() => {
                    setBatchUploadResult(null);
                    setUploadFile(null);
                    setError(null);
                    setIsBatchUploadModalOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950/20 transition-all border border-emerald-400/30"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Batch Import Excel
                </button>
                <button
                  onClick={() => {
                    setCreatedStudentCredentials(null);
                    setError(null);
                    setIsAddStudentModalOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-xl gradient-bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-steel/20 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add Student
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setCreatedTeacherCredentials(null);
                  setError(null);
                  setIsAddTeacherModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl gradient-bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-steel/20 transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Teacher
              </button>
            )}
          </div>
        </div>

        {/* ─── STUDENTS TAB CONTENT ───────────────────────────── */}
        {activeTab === "students" && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-text-primary">Institutional Student Directory</h2>
                <p className="text-xs text-text-muted">
                  Official student master list. Student IDs with 02000 prefix sync with OMR paper tests and online lobbies.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                {/* Section filter */}
                <div className="relative">
                  <select
                    value={selectedSectionFilter}
                    onChange={(e) => setSelectedSectionFilter(e.target.value)}
                    className="w-full sm:w-48 appearance-none rounded-xl border border-border-emphasis bg-surface-overlay px-3.5 py-2 pr-8 text-xs text-text-primary focus:border-steel focus:outline-none"
                  >
                    <option value="all">All Sections ({students.length})</option>
                    <option value="unassigned">Unassigned Only</option>
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name} ({sec.subject})
                      </option>
                    ))}
                  </select>
                  <Filter className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-text-faint" />
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Search by ID, name, username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-border-emphasis bg-surface-overlay px-3.5 py-2 pl-9 text-xs text-text-primary placeholder-text-faint focus:border-steel focus:outline-none"
                  >
                  </input>
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-faint" />
                </div>
              </div>
            </div>

            {loading ? (
              <SkeletonTable rows={5} />
            ) : filteredStudents.length === 0 ? (
              <div className="py-16 text-center text-sm text-text-faint">
                <GraduationCap className="mx-auto h-10 w-10 text-text-muted/40 mb-3" />
                <p className="font-semibold text-text-secondary">No students found</p>
                <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                  Click &quot;Batch Import Excel&quot; to import an official roster with 02000 IDs, or &quot;Add Student&quot; to register individually.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border-default text-text-muted font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Student ID (OMR)</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Username</th>
                      <th className="py-3 px-4">Enrolled Section</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default/60 text-text-secondary">
                    {paginatedStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-surface-subtle/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono">
                          <span className="font-bold text-text-primary">
                            {st.full_student_id || `02000${st.student_number}`}
                          </span>
                          <span className="ml-2 inline-flex items-center rounded-md bg-steel/10 px-1.5 py-0.5 text-[10px] font-mono text-steel border border-steel/20">
                            OMR: {st.student_number}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-text-primary">
                          {st.user.last_name}, {st.user.first_name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-tan">
                          @{st.user.username}
                        </td>
                        <td className="py-3.5 px-4">
                          {st.section ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-subtle px-2.5 py-1 text-[11px] font-medium text-text-primary border border-border-default">
                              <School className="h-3 w-3 text-steel" />
                              {st.section.name}
                            </span>
                          ) : (
                            <span className="text-[11px] text-text-muted italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {st.user.is_active ? (
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
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              title="Reset Password"
                              disabled={resettingStudentId === st.id}
                              onClick={() => handleResetPassword(st)}
                              className="rounded-lg p-1.5 text-text-muted hover:bg-surface-subtle hover:text-amber-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                            >
                              {resettingStudentId === st.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                              ) : (
                                <Key className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              title="Edit Student"
                              onClick={() => {
                                setEditingStudent(st);
                                setEditStudentFirstName(st.user.first_name);
                                setEditStudentLastName(st.user.last_name);
                                setEditStudentNumber(st.full_student_id || `02000${st.student_number}`);
                                setEditStudentSectionId(st.section_id || "");
                                setEditStudentIsActive(st.user.is_active);
                                setIsEditStudentModalOpen(true);
                              }}
                              className="rounded-lg p-1.5 text-text-muted hover:bg-surface-subtle hover:text-steel transition-colors cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              title="Delete Student"
                              onClick={() => setStudentToDelete(st)}
                              className="rounded-lg p-1.5 text-text-muted hover:bg-surface-subtle hover:text-burgundy-light transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination
                  currentPage={studentPage}
                  totalPages={Math.ceil(filteredStudents.length / studentPageSize)}
                  totalItems={filteredStudents.length}
                  pageSize={studentPageSize}
                  onPageChange={setStudentPage}
                  onPageSizeChange={setStudentPageSize}
                  pageSizeOptions={[10, 25, 50]}
                  itemLabel="students"
                />
              </div>
            )}
          </div>
        )}

        {/* ─── TEACHERS TAB CONTENT ───────────────────────────── */}
        {activeTab === "teachers" && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-text-primary">Teacher Accounts</h2>
                <p className="text-xs text-text-muted">
                  List of registered teachers and their access status across your school.
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
                No teachers found. Click &quot;Add Teacher&quot; to create one.
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
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default/60 text-text-secondary">
                    {paginatedTeachers.map((t) => (
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
                            <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                              Verified
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              title="Reset Teacher Password"
                              disabled={resettingTeacherId === t.id}
                              onClick={() => handleResetTeacherPassword(t)}
                              className="rounded-lg p-1.5 text-text-muted hover:bg-surface-subtle hover:text-amber-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                            >
                              {resettingTeacherId === t.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                              ) : (
                                <KeyRound className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              title="Edit Teacher Profile"
                              onClick={() => {
                                setEditingTeacher(t);
                                setEditTeacherFirstName(t.user.first_name);
                                setEditTeacherLastName(t.user.last_name);
                                setEditTeacherIsActive(t.user.is_active);
                                setIsEditTeacherModalOpen(true);
                              }}
                              className="rounded-lg p-1.5 text-text-muted hover:bg-surface-subtle hover:text-steel transition-colors cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              title="Delete Teacher"
                              onClick={() => setTeacherToDelete(t)}
                              className="rounded-lg p-1.5 text-text-muted hover:bg-surface-subtle hover:text-burgundy-light transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination
                  currentPage={teacherPage}
                  totalPages={Math.ceil(filteredTeachers.length / teacherPageSize)}
                  totalItems={filteredTeachers.length}
                  pageSize={teacherPageSize}
                  onPageChange={setTeacherPage}
                  onPageSizeChange={setTeacherPageSize}
                  pageSizeOptions={[10, 25, 50]}
                  itemLabel="teachers"
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── MODAL: BATCH CREATE STUDENTS FROM EXCEL / CSV ─── */}
      {isBatchUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-border-default bg-surface-overlay p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Smart Roster Parser Active
                </div>
                <h2 className="text-xl font-black text-text-primary">
                  Batch Create Student Accounts
                </h2>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Upload any official Excel or CSV file. Evalo will automatically detect IDs like{" "}
                  <code className="text-emerald-400 font-mono">02000XXXXXX</code> or{" "}
                  <code className="text-emerald-400 font-mono">2000XXXXXX</code> and split names like{" "}
                  <code className="text-emerald-400 font-mono">&quot;AGLUBA, MARK JAMES BONGCARAS&quot;</code>.
                </p>
              </div>
              <button
                onClick={() => setIsBatchUploadModalOpen(false)}
                className="rounded-xl p-2 text-text-muted hover:bg-surface-subtle hover:text-text-primary transition-colors"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!batchUploadResult ? (
              <form onSubmit={handleBatchUpload} className="space-y-5 flex-1 flex flex-col justify-between">
                {/* Drag and drop upload zone */}
                <div
                  onClick={() => document.getElementById("admin-excel-upload-input")?.click()}
                  className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-emphasis bg-surface-base p-8 text-center hover:border-emerald-500/60 transition-all cursor-pointer"
                >
                  <input
                    id="admin-excel-upload-input"
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                        setError(null);
                      }
                    }}
                  />
                  <div className="rounded-2xl bg-emerald-500/10 p-4 text-emerald-400 group-hover:scale-110 transition-transform mb-3 border border-emerald-500/20">
                    <FileSpreadsheet className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-bold text-text-primary">
                    {uploadFile ? uploadFile.name : "Click or drag & drop student Excel or CSV roster"}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Supports .xlsx, .xls, or .csv formats
                  </p>
                  {uploadFile && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                      <Check className="h-3 w-3" />
                      {(uploadFile.size / 1024).toFixed(1)} KB ready to process
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-surface-base p-4 border border-border-default space-y-2">
                  <p className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    How the Auto-Detection Works:
                  </p>
                  <ul className="text-[11px] text-text-secondary space-y-1 list-disc list-inside">
                    <li>
                      <strong>Student IDs:</strong> Any column containing numbers starting with 02000 or 2000 (e.g. 2000361208) is automatically mapped to full ID <span className="font-mono text-emerald-400">02000361208</span> and 6-digit OMR code <span className="font-mono text-emerald-400">361208</span>.
                    </li>
                    <li>
                      <strong>Full Names:</strong> Values like <span className="font-mono text-emerald-400">&quot;AGLUBA, MARK JAMES BONGCARAS&quot;</span> are cleanly separated into Surname (<span className="text-emerald-400">Agluba</span>) and Given Names (<span className="text-emerald-400">Mark James Bongcaras</span>).
                    </li>
                    <li>
                      <strong>Guaranteed Unique Usernames:</strong> Automatically generates <span className="font-mono text-emerald-400">agluba.361208</span> and temporary passwords.
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBatchUploadModalOpen(false)}
                    className="w-1/2 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!uploadFile || uploading}
                    className="w-1/2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/30 disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing & Creating Accounts...
                      </>
                    ) : (
                      "Create Accounts Now"
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Success results view */
              <div className="space-y-4 flex-1 flex flex-col justify-between overflow-hidden">
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="h-5 w-5" />
                      Batch Creation Completed Successfully!
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-300">
                      {batchUploadResult.created} Created ({batchUploadResult.skipped || 0} Skipped/Existing)
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Student accounts are now ready for login. Temporary passwords have been generated below.
                  </p>
                </div>

                {/* Table of generated credentials */}
                <div className="overflow-y-auto max-h-60 rounded-xl border border-border-default bg-surface-base">
                  <table className="w-full text-left text-[11px]">
                    <thead className="sticky top-0 bg-surface-raised border-b border-border-default text-text-muted font-semibold uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Student ID</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Username</th>
                        <th className="py-2.5 px-3 font-mono">Temp Password</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default/60 text-text-secondary">
                      {batchUploadResult.students.map((st, i) => (
                        <tr key={i} className="hover:bg-surface-subtle/40">
                          <td className="py-2 px-3 font-mono font-semibold text-text-primary">
                            {st.full_student_id || `02000${st.student_number}`}
                          </td>
                          <td className="py-2 px-3">
                            {st.user.last_name}, {st.user.first_name}
                          </td>
                          <td className="py-2 px-3 font-mono text-tan">
                            @{st.user.username}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-400">
                            {st.temp_password}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copyBatchCredentials}
                      className="flex items-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2 text-xs font-semibold text-text-primary hover:bg-surface-subtle transition-all"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied All Credentials!" : "Copy All Credentials"}
                    </button>
                    <button
                      type="button"
                      onClick={downloadBatchCredentialsCSV}
                      className="flex items-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2 text-xs font-semibold text-text-primary hover:bg-surface-subtle transition-all"
                    >
                      <Download className="h-3.5 w-3.5 text-steel" />
                      Download Credentials (.CSV)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsBatchUploadModalOpen(false);
                      setBatchUploadResult(null);
                    }}
                    className="rounded-xl gradient-bg-primary px-6 py-2 text-xs font-bold text-white shadow-md shadow-steel/20"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD SINGLE STUDENT ─── */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-text-primary mb-2">Register Student Account</h2>
            <p className="text-xs text-text-muted mb-5">
              Create an individual student account. Student number will be formatted with 02000 prefix.
            </p>

            {createdStudentCredentials ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-border-default bg-surface-base p-4">
                  <div className="flex items-center gap-2 text-sage text-xs font-bold mb-3">
                    <CheckCircle2 className="h-4 w-4" />
                    Account Created Successfully!
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between border-b border-border-default/60 pb-1.5">
                      <span className="text-text-muted">Student Name:</span>
                      <span className="font-bold text-text-primary">{createdStudentCredentials.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-border-default/60 pb-1.5">
                      <span className="text-text-muted">Student ID:</span>
                      <span className="font-bold text-emerald-400">{createdStudentCredentials.full_student_id}</span>
                    </div>
                    <div className="flex justify-between border-b border-border-default/60 pb-1.5">
                      <span className="text-text-muted">Username:</span>
                      <span className="font-bold text-tan">@{createdStudentCredentials.username}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-text-muted">Temp Password:</span>
                      <span className="font-bold text-steel">{createdStudentCredentials.password}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `ID: ${createdStudentCredentials.full_student_id}\nUsername: ${createdStudentCredentials.username}\nPassword: ${createdStudentCredentials.password}`
                      );
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="w-1/2 flex items-center justify-center gap-2 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-primary hover:bg-surface-muted"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-sage" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy Info"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddStudentModalOpen(false);
                      setCreatedStudentCredentials(null);
                    }}
                    className="w-1/2 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-white shadow-lg shadow-steel/20"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateStudent} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mark James"
                      value={studentFirstName}
                      onChange={(e) => setStudentFirstName(e.target.value)}
                      className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary placeholder-text-faint focus:border-steel focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Agluba"
                      value={studentLastName}
                      onChange={(e) => setStudentLastName(e.target.value)}
                      className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary placeholder-text-faint focus:border-steel focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Student ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 02000361208 or 2000361208 (Auto-generates if blank)"
                    value={studentNumberInput}
                    onChange={(e) => setStudentNumberInput(e.target.value)}
                    className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary placeholder-text-faint focus:border-steel focus:outline-none font-mono"
                  />
                  <p className="text-[11px] text-text-muted mt-1">
                    Accepts 02000XXXXXX, 2000XXXXXX, or 6-digit OMR code.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Assign Section (Optional)
                  </label>
                  <select
                    value={studentSectionId}
                    onChange={(e) => setStudentSectionId(e.target.value)}
                    className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                  >
                    <option value="">Leave Unassigned (Enroll Later)</option>
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name} — {sec.subject} ({sec.teacher_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddStudentModalOpen(false)}
                    className="w-1/2 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-1/2 flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-white shadow-lg shadow-steel/20"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register Student"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT STUDENT ─── */}
      {isEditStudentModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-text-primary mb-2">Edit Student Profile</h2>
            <p className="text-xs text-text-muted mb-5">
              Update details or section enrollment for @{editingStudent.user.username}.
            </p>

            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editStudentFirstName}
                    onChange={(e) => setEditStudentFirstName(e.target.value)}
                    className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editStudentLastName}
                    onChange={(e) => setEditStudentLastName(e.target.value)}
                    className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Student ID</label>
                <input
                  type="text"
                  required
                  value={editStudentNumber}
                  onChange={(e) => setEditStudentNumber(e.target.value)}
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary font-mono focus:border-steel focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Enrolled Section</label>
                <select
                  value={editStudentSectionId}
                  onChange={(e) => setEditStudentSectionId(e.target.value)}
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                >
                  <option value="">Unassigned (No Section)</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} — {sec.subject} ({sec.teacher_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-surface-base p-3.5 border border-border-default">
                <div>
                  <p className="text-xs font-semibold text-text-primary">Account Status</p>
                  <p className="text-[11px] text-text-muted">
                    {editStudentIsActive ? "Active and permitted to log in" : "Deactivated access"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditStudentIsActive(!editStudentIsActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editStudentIsActive ? "bg-steel" : "bg-surface-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editStudentIsActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditStudentModalOpen(false)}
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

      {/* ─── MODAL: RESET PASSWORD RESULT ─── */}
      {resetPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-bold mb-3">
              <Key className="h-5 w-5" />
              Password Reset Generated
            </div>
            <p className="text-xs text-text-muted mb-4">
              Temporary password for <span className="font-bold text-text-primary">{resetPasswordModal.student_name}</span> ({resetPasswordModal.full_student_id}):
            </p>

            <div className="rounded-xl border border-border-default bg-surface-base p-3 mb-4 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Username:</span>
                <span className="font-bold text-tan">@{resetPasswordModal.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Temp Password:</span>
                <span className="font-bold text-emerald-400">{resetPasswordModal.temp_password}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `ID: ${resetPasswordModal.full_student_id}\nUsername: ${resetPasswordModal.username}\nPassword: ${resetPasswordModal.temp_password}`
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-1/2 flex items-center justify-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle py-2 text-xs font-semibold text-text-primary hover:bg-surface-muted"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-sage" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => setResetPasswordModal(null)}
                className="w-1/2 rounded-xl gradient-bg-primary py-2 text-xs font-bold text-white shadow-md shadow-steel/20 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: RESET TEACHER PASSWORD RESULT ─── */}
      {resetTeacherPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-bold mb-3">
              <KeyRound className="h-5 w-5" />
              Teacher Password Reset
            </div>
            <p className="text-xs text-text-muted mb-4">
              Temporary password for <span className="font-bold text-text-primary">{resetTeacherPasswordModal.teacher_name}</span>:
            </p>

            <div className="rounded-xl border border-border-default bg-surface-base p-3 mb-4 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Username:</span>
                <span className="font-bold text-tan">@{resetTeacherPasswordModal.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Temp Password:</span>
                <span className="font-bold text-emerald-400">{resetTeacherPasswordModal.temp_password}</span>
              </div>
            </div>

            <p className="text-[11px] text-text-muted mb-4">
              The teacher will be required to choose a new password upon their next login.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Teacher: ${resetTeacherPasswordModal.teacher_name}\nUsername: ${resetTeacherPasswordModal.username}\nTemporary Password: ${resetTeacherPasswordModal.temp_password}`
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-1/2 flex items-center justify-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle py-2 text-xs font-semibold text-text-primary hover:bg-surface-muted cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-sage" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => setResetTeacherPasswordModal(null)}
                className="w-1/2 rounded-xl gradient-bg-primary py-2 text-xs font-bold text-white shadow-md shadow-steel/20 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD TEACHER ─── */}
      {isAddTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-text-primary mb-2">Create Teacher Account</h2>
            <p className="text-xs text-text-muted mb-5">
              Teacher will receive a temporary password and will be prompted to change it upon first login.
            </p>

            {createdTeacherCredentials ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-border-default bg-surface-base p-4">
                  <div className="flex items-center gap-2 text-sage text-xs font-bold mb-3">
                    <CheckCircle2 className="h-4 w-4" />
                    Teacher Created Successfully!
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between border-b border-border-default/60 pb-1.5">
                      <span className="text-text-muted">Username:</span>
                      <span className="font-bold text-tan">@{createdTeacherCredentials.username}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-text-muted">Temp Password:</span>
                      <span className="font-bold text-steel">{createdTeacherCredentials.password}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copyTeacherCredentials}
                    className="w-1/2 flex items-center justify-center gap-2 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-primary hover:bg-surface-muted"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-sage" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddTeacherModalOpen(false);
                      setCreatedTeacherCredentials(null);
                    }}
                    className="w-1/2 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-white shadow-lg shadow-steel/20"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateTeacher} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Andrei"
                      value={newTeacherFirstName}
                      onChange={(e) => {
                        setNewTeacherFirstName(e.target.value);
                        updateTeacherUsernameSuggestion(e.target.value, newTeacherLastName);
                      }}
                      className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary placeholder-text-faint focus:border-steel focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dilag"
                      value={newTeacherLastName}
                      onChange={(e) => {
                        setNewTeacherLastName(e.target.value);
                        updateTeacherUsernameSuggestion(newTeacherFirstName, e.target.value);
                      }}
                      className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary placeholder-text-faint focus:border-steel focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-text-secondary">Username</label>
                    <span className="text-[10px] text-text-muted">Auto-suggested</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. andrei.dilag"
                    value={newTeacherUsername}
                    onChange={(e) => {
                      setNewTeacherUsername(e.target.value);
                      setTeacherUsernameEdited(true);
                    }}
                    className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary placeholder-text-faint focus:border-steel focus:outline-none font-mono"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddTeacherModalOpen(false);
                      setTeacherUsernameEdited(false);
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

      {/* ─── MODAL: EDIT TEACHER ─── */}
      {isEditTeacherModalOpen && editingTeacher && (
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
                  value={editTeacherFirstName}
                  onChange={(e) => setEditTeacherFirstName(e.target.value)}
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={editTeacherLastName}
                  onChange={(e) => setEditTeacherLastName(e.target.value)}
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-surface-base p-3.5 border border-border-default">
                <div>
                  <p className="text-xs font-semibold text-text-primary">Account Status</p>
                  <p className="text-[11px] text-text-muted">
                    {editTeacherIsActive ? "Active and allowed to log in" : "Deactivated access"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditTeacherIsActive(!editTeacherIsActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editTeacherIsActive ? "bg-steel" : "bg-surface-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editTeacherIsActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditTeacherModalOpen(false)}
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

      {/* Delete Teacher Confirmation */}
      <ConfirmModal
        isOpen={!!teacherToDelete}
        loading={deletingTeacher}
        title="Delete Teacher Account"
        message={`Are you sure you want to delete the account for ${teacherToDelete?.user.first_name} ${teacherToDelete?.user.last_name} (@${teacherToDelete?.user.username})? All their sections and exams will also be permanently deleted.`}
        confirmText="Delete Account"
        cancelText="Cancel"
        variant="danger"
        icon={<Trash2 className="h-5 w-5 text-burgundy-light" />}
        onConfirm={confirmDeleteTeacher}
        onCancel={() => setTeacherToDelete(null)}
      />

      {/* Delete Student Confirmation */}
      <ConfirmModal
        isOpen={!!studentToDelete}
        loading={deletingStudent}
        title="Delete Student Account"
        message={`Are you sure you want to delete the account for ${studentToDelete?.user.first_name} ${studentToDelete?.user.last_name} (${studentToDelete?.full_student_id || `02000${studentToDelete?.student_number}`})? Their exam history and lobby access will be permanently removed.`}
        confirmText="Delete Account"
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
