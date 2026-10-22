"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { teacher as teacherApi, BatchCreateStudentsResult } from "@/lib/api";
import {
  Users,
  Search,
  Plus,
  UserPlus,
  Upload,
  FileSpreadsheet,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Check,
  X,
  KeyRound,
  Trash2,
  IdCard,
  Hash,
  School,
  Bell,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Download,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ConfirmModal } from "@/components/ConfirmModal";

interface SectionItem {
  id: string;
  name: string;
  subject: string;
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
  has_pending_reset_request?: boolean;
}

export default function TeacherStudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");

  // View mode: table vs grid
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals
  const [isSingleOpen, setIsSingleOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentItem | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<StudentItem | null>(null);

  // Single Registration Form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentIdInput, setStudentIdInput] = useState("");
  const [targetSection, setTargetSection] = useState("");
  const [submittingSingle, setSubmittingSingle] = useState(false);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [singleSuccess, setSingleSuccess] = useState<{
    name: string;
    student_number: number;
    full_student_id: string;
    username: string;
    temp_password?: string;
  } | null>(null);

  // Batch Form (Manual rows vs file upload)
  const [batchTab, setBatchTab] = useState<"manual" | "upload">("manual");
  const [batchSection, setBatchSection] = useState("");
  const [batchRows, setBatchRows] = useState<
    Array<{ first_name: string; last_name: string; student_number: string }>
  >([
    { first_name: "", last_name: "", student_number: "" },
    { first_name: "", last_name: "", student_number: "" },
    { first_name: "", last_name: "", student_number: "" },
  ]);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [submittingBatch, setSubmittingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchCreateStudentsResult | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Detail Modal Actions
  const [modalTargetSection, setModalTargetSection] = useState("");
  const [updatingSection, setUpdatingSection] = useState(false);
  const [detailCopied, setDetailCopied] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [tempPasswordIssued, setTempPasswordIssued] = useState<{
    studentName: string;
    username: string;
    fullStudentId: string;
    tempPassword: string;
  } | null>(null);
  const [copiedTempPassword, setCopiedTempPassword] = useState(false);
  const [copiedSingle, setCopiedSingle] = useState(false);

  // Edit Student Modal state
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editStudentNumber, setEditStudentNumber] = useState("");
  const [editSectionId, setEditSectionId] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "TEACHER")) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allSecs, allSts] = await Promise.all([
        teacherApi.listSections(),
        teacherApi.listAllStudents(),
      ]);
      setSections(allSecs);
      setStudents(allSts as StudentItem[]);
    } catch (err: unknown) {
      console.error("Failed to load students directory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "TEACHER") {
      loadData();
    }
  }, [user]);

  // Filtering
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Section filter
      if (sectionFilter === "UNASSIGNED" && s.section_id) return false;
      if (sectionFilter !== "ALL" && sectionFilter !== "UNASSIGNED" && s.section_id !== sectionFilter) {
        return false;
      }
      // Search term
      if (!search.trim()) return true;
      const term = search.toLowerCase().trim();
      const fullName = `${s.user.first_name} ${s.user.last_name}`.toLowerCase();
      const idStr = `02000${String(s.student_number).padStart(6, "0")}`;
      const rawId = String(s.student_number);
      const userStr = s.user.username.toLowerCase();
      const secName = (s.section?.name || "").toLowerCase();
      return (
        fullName.includes(term) ||
        idStr.includes(term) ||
        rawId.includes(term) ||
        userStr.includes(term) ||
        secName.includes(term)
      );
    });
  }, [students, sectionFilter, search]);

  // Reset pagination when filter/search changes
  useEffect(() => {
    setPage(1);
  }, [search, sectionFilter, pageSize]);

  // Paginated slice
  const totalItems = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice(startIndex, startIndex + pageSize);
  }, [filteredStudents, startIndex, pageSize]);

  // Open detail
  const openStudentDetail = (s: StudentItem) => {
    setSelectedStudentDetail(s);
    setModalTargetSection(s.section_id || "");
    setDetailCopied(false);
    setTempPasswordIssued(null);
    setCopiedTempPassword(false);
  };

  // Single Student Registration
  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleError(null);
    setSubmittingSingle(true);
    try {
      const res = await teacherApi.createStudent({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        student_number: studentIdInput.trim() || undefined,
        section_id: targetSection || undefined,
      });

      setSingleSuccess({
        name: `${firstName.trim()} ${lastName.trim()}`,
        student_number: res.student_number,
        full_student_id: res.full_student_id || `02000${String(res.student_number).padStart(6, "0")}`,
        username: res.user.username,
        temp_password: res.temp_password,
      });

      setFirstName("");
      setLastName("");
      setStudentIdInput("");
      setTargetSection("");
      await loadData();
    } catch (err: unknown) {
      setSingleError(err instanceof Error ? err.message : "Failed to register student");
    } finally {
      setSubmittingSingle(false);
    }
  };

  // Batch Registration
  const handleAddBatchRow = () => {
    setBatchRows((prev) => [...prev, { first_name: "", last_name: "", student_number: "" }]);
  };

  const handleRemoveBatchRow = (index: number) => {
    setBatchRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBatchRowChange = (index: number, field: "first_name" | "last_name" | "student_number", val: string) => {
    setBatchRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError(null);
    setSubmittingBatch(true);
    try {
      let res: BatchCreateStudentsResult;
      if (batchTab === "manual") {
        const validRows = batchRows.filter((r) => r.first_name.trim() && r.last_name.trim());
        if (validRows.length === 0) {
          throw new Error("Please enter at least one student with first and last name.");
        }
        res = await teacherApi.batchCreateStudents({
          section_id: batchSection || undefined,
          students: validRows.map((r) => ({
            first_name: r.first_name.trim(),
            last_name: r.last_name.trim(),
            student_number: r.student_number.trim() || undefined,
          })),
        });
      } else {
        if (!batchFile) {
          throw new Error("Please select a .csv or .xlsx file to upload.");
        }
        res = await teacherApi.batchUploadStudents(batchFile, batchSection || undefined);
      }
      setBatchResult(res);
      await loadData();
    } catch (err: unknown) {
      setBatchError(err instanceof Error ? err.message : "Batch creation failed");
    } finally {
      setSubmittingBatch(false);
    }
  };

  const handleDownloadCsvTemplate = () => {
    const csv = "ID,Name\n02000123456,Juan Dela Cruz\n02000234567,Maria Santos\n,Alex Reyes\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "evalo_students_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Direct Password Reset in modal
  const handleDirectPasswordReset = async () => {
    if (!selectedStudentDetail) return;
    setResettingPassword(true);
    try {
      const res = await teacherApi.resetStudentPassword(selectedStudentDetail.id);
      setTempPasswordIssued({
        studentName: res.student_name,
        username: res.username,
        fullStudentId: res.full_student_id,
        tempPassword: res.temp_password,
      });
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setResettingPassword(false);
    }
  };

  // Section Update in modal
  const handleModalUpdateSection = async () => {
    if (!selectedStudentDetail) return;
    setUpdatingSection(true);
    try {
      if (modalTargetSection) {
        await teacherApi.enrollStudent(modalTargetSection, selectedStudentDetail.id);
      } else if (selectedStudentDetail.section_id) {
        await teacherApi.unenrollStudent(selectedStudentDetail.section_id, selectedStudentDetail.id);
      }
      await loadData();
      const refreshed = (await teacherApi.listAllStudents()).find((st) => st.id === selectedStudentDetail.id);
      if (refreshed) {
        setSelectedStudentDetail(refreshed as StudentItem);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update section");
    } finally {
      setUpdatingSection(false);
    }
  };

  // Permanent Delete
  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      await teacherApi.deleteStudent(studentToDelete.id);
      if (selectedStudentDetail?.id === studentToDelete.id) {
        setSelectedStudentDetail(null);
      }
      setStudentToDelete(null);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete student account");
    }
  };

  const openEditModal = (s: StudentItem) => {
    setEditingStudent(s);
    setEditFirstName(s.user.first_name);
    setEditLastName(s.user.last_name);
    setEditStudentNumber(String(s.student_number));
    setEditSectionId(s.section_id || "");
    setEditError(null);
  };

  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editFirstName.trim() || !editLastName.trim()) {
      setEditError("First name and last name are required.");
      return;
    }
    setSubmittingEdit(true);
    setEditError(null);
    try {
      const res = await teacherApi.updateStudent(editingStudent.id, {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        student_number: editStudentNumber.trim() ? editStudentNumber.trim() : undefined,
        section_id: editSectionId ? editSectionId : "",
      });
      await loadData();
      if (selectedStudentDetail?.id === editingStudent.id) {
        setSelectedStudentDetail((prev) =>
          prev
            ? {
                ...prev,
                student_number: res.student_number,
                full_student_id: res.full_student_id,
                section_id: res.section_id,
                section: res.section,
                user: {
                  ...prev.user,
                  first_name: res.user.first_name,
                  last_name: res.user.last_name,
                },
              }
            : null
        );
      }
      setEditingStudent(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update student");
    } finally {
      setSubmittingEdit(false);
    }
  };

  return (
    <div className="min-h-screen text-text-primary">
      <Navbar onOpenPasswordModal={() => setPasswordModalOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:pb-12 sm:px-6">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-text-muted">
          <Link href="/teacher/dashboard" className="hover:text-steel transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-text-primary font-medium">Student Registration & Directory</span>
        </div>

        {/* Page Title & Main Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-steel-ghost text-steel border border-steel-border shadow-xs">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-text-primary">
                  Student Registration & Directory
                </h1>
                <p className="text-xs text-text-muted mt-0.5">
                  Register individual or batch student accounts, manage roster enrollment, and view records.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons: Single Register & Batch Creation */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setBatchResult(null);
                setBatchError(null);
                setBatchFile(null);
                setIsBatchOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-steel/40 bg-steel-ghost px-4 py-2 text-xs font-bold text-steel hover:bg-steel hover:text-white transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Batch Account Creation</span>
            </button>

            <button
              onClick={() => {
                setSingleSuccess(null);
                setSingleError(null);
                setIsSingleOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl gradient-bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-steel/25 hover:opacity-95 transition-all cursor-pointer active:scale-95"
            >
              <UserPlus className="h-4 w-4" />
              <span>Register Student</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar: Search, Section Filter, View Mode Toggle, Page Size */}
        <div className="rounded-2xl border border-border-default bg-surface-raised p-4 mb-5 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-56 flex-1 sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, student name, username..."
                className="w-full rounded-xl border border-border-default bg-surface-base pl-9 pr-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-steel focus:outline-none transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Section Filter */}
            <div className="min-w-44">
              <CustomSelect
                value={sectionFilter}
                onChange={(val) => setSectionFilter(val)}
                placeholder="All Sections"
                options={[
                  { value: "ALL", label: `All Students (${students.length})` },
                  {
                    value: "UNASSIGNED",
                    label: `Not in Roster (${students.filter((s) => !s.section_id).length})`,
                  },
                  ...sections.map((sec) => ({
                    value: sec.id,
                    label: sec.name,
                    badge: sec.subject,
                  })),
                ]}
              />
            </div>
          </div>

          {/* Right Toolbar Controls: Table / Grid toggle + Page Size */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-default/60">
            {/* Rows per page */}
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="hidden md:inline">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-border-default bg-surface-base px-2 py-1 text-xs text-text-primary focus:border-steel focus:outline-none cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Table / Grid Switcher */}
            <div className="inline-flex rounded-xl bg-surface-base p-1 border border-border-default shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-steel text-white shadow-xs"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
                }`}
                title="Table View"
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-steel text-white shadow-xs"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area: Loading vs Empty vs Table vs Grid */}
        {loading ? (
          <div className="rounded-2xl border border-border-default bg-surface-raised p-8 text-center space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-steel" />
            <p className="text-xs text-text-muted">Loading registered students...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-default bg-surface-raised/50 p-12 text-center space-y-3">
            <Users className="mx-auto h-12 w-12 text-text-muted opacity-60" />
            <h3 className="text-sm font-bold text-text-primary">No students found</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              {search || sectionFilter !== "ALL"
                ? "Try adjusting your search query or section filter."
                : "Register students individually or use Batch Account Creation to import multiple accounts."}
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsSingleOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl gradient-bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                Register Student
              </button>
              <button
                type="button"
                onClick={() => setIsBatchOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-steel/40 bg-steel-ghost px-3.5 py-2 text-xs font-bold text-steel hover:bg-steel hover:text-white transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Batch Creation
              </button>
            </div>
          </div>
        ) : viewMode === "table" ? (
          /* ── TABLE VIEW ─────────────────────────────────────────── */
          <div className="rounded-2xl border border-border-default bg-surface-raised shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-default bg-surface-base/80 text-[11px] uppercase font-bold text-text-muted tracking-wider">
                    <th className="py-3.5 px-4">Student ID (OMR)</th>
                    <th className="py-3.5 px-4">Name</th>
                    <th className="py-3.5 px-4">Username</th>
                    <th className="py-3.5 px-4">Section / Class</th>
                    <th className="py-3.5 px-4">Status / Alerts</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default/60">
                  {paginatedStudents.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => openStudentDetail(s)}
                      className="hover:bg-surface-subtle/70 transition-colors cursor-pointer group"
                    >
                      {/* ID Column */}
                      <td className="py-3.5 px-4 font-mono font-bold text-text-primary group-hover:text-steel transition-colors whitespace-nowrap">
                        02000{String(s.student_number).padStart(6, "0")}
                      </td>

                      {/* Name Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-subtle border border-border-default text-[11px] font-bold text-text-primary">
                            {s.user.first_name[0]?.toUpperCase()}
                            {s.user.last_name[0]?.toUpperCase()}
                          </div>
                          <span className="font-bold text-text-primary">
                            {s.user.first_name} {s.user.last_name}
                          </span>
                        </div>
                      </td>

                      {/* Username Column */}
                      <td className="py-3.5 px-4 font-mono text-steel whitespace-nowrap">
                        @{s.user.username}
                      </td>

                      {/* Section Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {s.section ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-steel-ghost px-2.5 py-0.5 text-[11px] font-bold text-steel border border-steel-border">
                            <School className="h-3 w-3" />
                            {s.section.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-surface-subtle px-2.5 py-0.5 text-[11px] font-semibold text-text-muted border border-border-default">
                            Not in Roster
                          </span>
                        )}
                      </td>

                      {/* Status / Alerts */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {s.has_pending_reset_request ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-tan/15 px-2.5 py-0.5 text-[10px] font-bold text-tan border border-tan/30 animate-pulse">
                            <KeyRound className="h-2.5 w-2.5" />
                            Reset Requested
                          </span>
                        ) : (
                          <span className="text-[11px] text-text-muted">Active</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(s);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-text-muted hover:text-steel hover:bg-steel-ghost border border-transparent hover:border-steel-border transition-colors cursor-pointer"
                            title="Edit Student Name & Details"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openStudentDetail(s);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-steel hover:bg-steel-ghost border border-transparent hover:border-steel-border transition-colors cursor-pointer"
                          >
                            Manage &rarr;
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── GRID / CARD VIEW ───────────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paginatedStudents.map((s) => (
              <div
                key={s.id}
                onClick={() => openStudentDetail(s)}
                className="rounded-2xl p-5 border border-border-default bg-surface-raised hover:border-steel/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-3.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="font-mono font-bold text-sm text-text-primary group-hover:text-steel transition-colors">
                      02000{String(s.student_number).padStart(6, "0")}
                    </span>

                    {s.has_pending_reset_request ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-tan/15 px-2 py-0.5 text-[10px] font-bold text-tan border border-tan/30 animate-pulse">
                        <KeyRound className="h-2.5 w-2.5" />
                        Reset
                      </span>
                    ) : s.section ? (
                      <span className="inline-flex items-center rounded-full bg-steel-ghost px-2.5 py-0.5 text-[10px] font-bold text-steel border border-steel-border">
                        {s.section.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-semibold text-text-muted border border-border-default">
                        Not in Roster
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-xs font-bold text-text-primary border border-border-default group-hover:border-steel/50 transition-colors">
                      {s.user.first_name[0]?.toUpperCase()}
                      {s.user.last_name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-text-primary truncate group-hover:text-steel transition-colors">
                        {s.user.first_name} {s.user.last_name}
                      </h3>
                      <p className="font-mono text-xs text-text-muted truncate">@{s.user.username}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border-default/60 text-[11px] text-text-muted">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(s);
                    }}
                    className="inline-flex items-center gap-1 text-text-muted hover:text-steel font-bold cursor-pointer transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                  <span className="font-bold text-steel group-hover:translate-x-0.5 transition-transform">
                    View Info &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PAGINATION CONTROLS ───────────────────────────────── */}
        {!loading && filteredStudents.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
            <div>
              Showing{" "}
              <strong className="text-text-primary font-bold">{startIndex + 1}</strong> to{" "}
              <strong className="text-text-primary font-bold">
                {Math.min(startIndex + pageSize, totalItems)}
              </strong>{" "}
              of <strong className="text-text-primary font-bold">{totalItems}</strong> students
            </div>

            <div className="flex items-center gap-1.5">
              {/* First Page */}
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-border-default bg-surface-raised hover:bg-surface-subtle disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              {/* Prev Page */}
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-border-default bg-surface-raised hover:bg-surface-subtle disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((pNum) => {
                    if (totalPages <= 7) return true;
                    if (pNum === 1 || pNum === totalPages) return true;
                    return Math.abs(pNum - currentPage) <= 1;
                  })
                  .map((pNum, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && pNum - prev > 1;
                    return (
                      <React.Fragment key={pNum}>
                        {showEllipsis && <span className="px-1 text-text-muted">...</span>}
                        <button
                          type="button"
                          onClick={() => setPage(pNum)}
                          className={`h-7 w-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentPage === pNum
                              ? "bg-steel text-white shadow-xs"
                              : "border border-border-default bg-surface-raised text-text-secondary hover:bg-surface-subtle"
                          }`}
                        >
                          {pNum}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              {/* Next Page */}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-border-default bg-surface-raised hover:bg-surface-subtle disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Last Page */}
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-border-default bg-surface-raised hover:bg-surface-subtle disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL 1: REGISTER SINGLE STUDENT ─────────────────────── */}
      {isSingleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-border-default bg-surface-raised p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-steel-ghost text-steel border border-steel-border">
                  <UserPlus className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-primary">Register Student Account</h2>
                  <p className="text-[11px] text-text-muted">Create a single student record with credentials.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSingleOpen(false)}
                className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-subtle cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {singleSuccess ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-sage-ghost/50 border border-sage-border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sage font-bold text-xs">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Account Created Successfully!</span>
                  </div>
                  <div className="rounded-xl bg-surface-base p-3 space-y-1.5 text-xs font-mono border border-border-default">
                    <p className="text-text-secondary">
                      Name: <span className="font-bold text-text-primary font-sans">{singleSuccess.name}</span>
                    </p>
                    <p className="text-text-secondary">
                      Full Student ID: <span className="font-bold text-sage">{singleSuccess.full_student_id}</span>
                    </p>
                    <p className="text-text-secondary">
                      Username: <span className="font-bold text-steel">@{singleSuccess.username}</span>
                    </p>
                    <p className="text-text-secondary">
                      Temp Password: <span className="font-bold text-amber-500">{singleSuccess.temp_password}</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Student: ${singleSuccess.name}\nStudent ID: ${singleSuccess.full_student_id}\nUsername: ${singleSuccess.username}\nTemp Password: ${singleSuccess.temp_password}`
                      );
                      setCopiedSingle(true);
                      setTimeout(() => setCopiedSingle(false), 2000);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border-default bg-surface-base py-2.5 text-xs font-bold text-text-primary hover:bg-surface-subtle cursor-pointer"
                  >
                    {copiedSingle ? <Check className="h-4 w-4 text-sage" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedSingle ? "Copied!" : "Copy Details"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSingleSuccess(null);
                      setIsSingleOpen(false);
                    }}
                    className="flex-1 rounded-xl gradient-bg-primary py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSingle} className="space-y-3.5">
                {singleError && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{singleError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Juan"
                      className="w-full rounded-xl border border-border-default bg-surface-base px-3 py-2 text-xs text-text-primary focus:border-steel focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Dela Cruz"
                      className="w-full rounded-xl border border-border-default bg-surface-base px-3 py-2 text-xs text-text-primary focus:border-steel focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary mb-1">
                    Student ID / OMR Digits (Optional)
                  </label>
                  <input
                    type="text"
                    value={studentIdInput}
                    onChange={(e) => setStudentIdInput(e.target.value)}
                    placeholder="e.g. 02000123456 or 123456 (auto if blank)"
                    className="w-full rounded-xl border border-border-default bg-surface-base px-3 py-2 text-xs font-mono text-text-primary focus:border-steel focus:outline-none"
                  />
                  <p className="text-[10px] text-text-muted mt-1">
                    Leave blank to auto-generate a unique 6-digit OMR student number.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary mb-1">
                    Class Section (Optional)
                  </label>
                  <CustomSelect
                    value={targetSection}
                    onChange={(val) => setTargetSection(val)}
                    placeholder="None (Unassigned / Directory Only)"
                    options={[
                      { value: "", label: "None (Unassigned / Directory Only)" },
                      ...sections.map((sec) => ({
                        value: sec.id,
                        label: sec.name,
                        badge: sec.subject,
                      })),
                    ]}
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-border-default">
                  <button
                    type="button"
                    onClick={() => setIsSingleOpen(false)}
                    className="rounded-xl border border-border-default bg-surface-base px-4 py-2 text-xs font-bold text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSingle}
                    className="flex items-center gap-1.5 rounded-xl gradient-bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:opacity-95 cursor-pointer disabled:opacity-50"
                  >
                    {submittingSingle && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Register Student</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 2: BATCH ACCOUNT CREATION ──────────────────────── */}
      {isBatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl border border-border-default bg-surface-raised shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-border-default flex items-center justify-between shrink-0 bg-surface-base/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-steel-ghost text-steel border border-steel-border">
                  <FileSpreadsheet className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-primary">Batch Account Creation</h2>
                  <p className="text-[11px] text-text-muted">
                    Quickly generate multiple student accounts at once.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchOpen(false)}
                className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-subtle cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {batchResult ? (
                /* Results Summary */
                <div className="space-y-4">
                  <div className="rounded-2xl bg-sage-ghost/50 border border-sage-border p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sage font-bold text-sm">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>
                        Created {batchResult.created} Student Account
                        {batchResult.created !== 1 ? "s" : ""}!
                      </span>
                    </div>
                    {batchResult.skipped && batchResult.skipped > 0 ? (
                      <p className="text-xs text-amber-500 font-medium">
                        {batchResult.skipped} row(s) were skipped due to validation/duplicate ID issues.
                      </p>
                    ) : null}
                  </div>

                  {batchResult.errors && batchResult.errors.length > 0 && (
                    <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 space-y-1">
                      <p className="text-xs font-bold text-rose-500">Skipped Issues:</p>
                      <ul className="list-disc list-inside text-[11px] text-rose-400 space-y-0.5">
                        {batchResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* List of created accounts */}
                  <div className="rounded-2xl border border-border-default bg-surface-base overflow-hidden">
                    <div className="p-3 border-b border-border-default flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary">
                        Created Accounts ({batchResult.students.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const text = batchResult.students
                            .map(
                              (st) =>
                                `${st.user.first_name} ${st.user.last_name} | ID: ${
                                  st.full_student_id || "02000" + st.student_number
                                } | Username: ${st.user.username} | Password: ${st.temp_password || "(set)"}`
                            )
                            .join("\n");
                          navigator.clipboard.writeText(text);
                          alert("All credentials copied to clipboard!");
                        }}
                        className="flex items-center gap-1 text-xs text-steel hover:underline font-bold cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy All Credentials</span>
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-border-default/60">
                      {batchResult.students.map((st) => (
                        <div key={st.id} className="p-2.5 text-xs flex items-center justify-between font-mono">
                          <div>
                            <span className="font-bold text-text-primary font-sans">
                              {st.user.first_name} {st.user.last_name}
                            </span>
                            <span className="text-text-muted ml-2">
                              ID: {st.full_student_id || `02000${st.student_number}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-steel">@{st.user.username}</span>
                            <span className="text-amber-500 font-bold">{st.temp_password}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBatchResult(null);
                        setIsBatchOpen(false);
                      }}
                      className="rounded-xl gradient-bg-primary px-5 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitBatch} className="space-y-4">
                  {batchError && (
                    <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{batchError}</span>
                    </div>
                  )}

                  {/* Section Assignment for Batch */}
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Assign to Class Section (Optional)
                    </label>
                    <CustomSelect
                      value={batchSection}
                      onChange={(val) => setBatchSection(val)}
                      placeholder="None (Unassigned / Directory Only)"
                      options={[
                        { value: "", label: "None (Unassigned / Directory Only)" },
                        ...sections.map((sec) => ({
                          value: sec.id,
                          label: sec.name,
                          badge: sec.subject,
                        })),
                      ]}
                    />
                    <p className="text-[10px] text-text-muted mt-1">
                      All accounts in this batch will be enrolled into the chosen section (or left unassigned in the directory).
                    </p>
                  </div>

                  {/* Switcher: Table Entry vs File Upload */}
                  <div className="flex items-center gap-2 border-b border-border-default pb-2">
                    <button
                      type="button"
                      onClick={() => setBatchTab("manual")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        batchTab === "manual"
                          ? "bg-steel text-white shadow-xs"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      <TableIcon className="h-3.5 w-3.5" />
                      <span>Table Rows Entry</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchTab("upload")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        batchTab === "upload"
                          ? "bg-steel text-white shadow-xs"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload Excel / CSV</span>
                    </button>
                  </div>

                  {batchTab === "manual" ? (
                    /* Manual Rows Entry */
                    <div className="space-y-2">
                      <div className="rounded-2xl border border-border-default bg-surface-base overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-border-default bg-surface-subtle/80 text-[10px] uppercase font-bold text-text-muted tracking-wider">
                              <th className="py-2 px-3 w-8">#</th>
                              <th className="py-2 px-3">First Name *</th>
                              <th className="py-2 px-3">Last Name *</th>
                              <th className="py-2 px-3">Student ID (OMR)</th>
                              <th className="py-2 px-2 w-8"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-default/60">
                            {batchRows.map((row, idx) => (
                              <tr key={idx}>
                                <td className="py-2 px-3 font-mono text-text-muted text-[11px]">{idx + 1}</td>
                                <td className="py-1 px-2">
                                  <input
                                    type="text"
                                    value={row.first_name}
                                    onChange={(e) => handleBatchRowChange(idx, "first_name", e.target.value)}
                                    placeholder="First Name"
                                    className="w-full rounded-lg border border-border-default bg-surface-raised px-2.5 py-1 text-xs text-text-primary focus:border-steel focus:outline-none"
                                  />
                                </td>
                                <td className="py-1 px-2">
                                  <input
                                    type="text"
                                    value={row.last_name}
                                    onChange={(e) => handleBatchRowChange(idx, "last_name", e.target.value)}
                                    placeholder="Last Name"
                                    className="w-full rounded-lg border border-border-default bg-surface-raised px-2.5 py-1 text-xs text-text-primary focus:border-steel focus:outline-none"
                                  />
                                </td>
                                <td className="py-1 px-2">
                                  <input
                                    type="text"
                                    value={row.student_number}
                                    onChange={(e) => handleBatchRowChange(idx, "student_number", e.target.value)}
                                    placeholder="auto if blank"
                                    className="w-full rounded-lg border border-border-default bg-surface-raised px-2.5 py-1 text-xs font-mono text-text-primary focus:border-steel focus:outline-none"
                                  />
                                </td>
                                <td className="py-1 px-2 text-center">
                                  {batchRows.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBatchRow(idx)}
                                      className="text-text-muted hover:text-rose-500 cursor-pointer"
                                      title="Remove Row"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <button
                          type="button"
                          onClick={handleAddBatchRow}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-steel/50 bg-steel-ghost/30 text-xs font-bold text-steel hover:bg-steel-ghost cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Another Row</span>
                        </button>
                        <span className="text-[11px] text-text-muted">
                          {batchRows.filter((r) => r.first_name.trim() && r.last_name.trim()).length} valid student(s)
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* File Upload Mode */
                    <div className="space-y-3">
                      <div className="rounded-2xl border-2 border-dashed border-border-default bg-surface-base p-6 text-center space-y-2">
                        <FileSpreadsheet className="mx-auto h-10 w-10 text-steel" />
                        <div>
                          <p className="text-xs font-bold text-text-primary">
                            Upload Student Masterlist (.xlsx, .xls, .csv)
                          </p>
                          <p className="text-[11px] text-text-muted">
                            File must contain <strong>ID</strong> and <strong>Name</strong> columns.
                          </p>
                        </div>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => setBatchFile(e.target.files?.[0] || null)}
                          className="text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-steel file:text-white cursor-pointer"
                        />
                        {batchFile && (
                          <p className="text-xs font-bold text-sage pt-1">Selected: {batchFile.name}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-text-muted">
                        <span>Need sample format?</span>
                        <button
                          type="button"
                          onClick={handleDownloadCsvTemplate}
                          className="flex items-center gap-1 text-steel hover:underline font-bold cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download CSV Template</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-3 border-t border-border-default flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBatchOpen(false)}
                      className="rounded-xl border border-border-default bg-surface-base px-4 py-2 text-xs font-bold text-text-muted hover:text-text-primary cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingBatch}
                      className="flex items-center gap-1.5 rounded-xl gradient-bg-primary px-5 py-2 text-xs font-bold text-white shadow-xs hover:opacity-95 cursor-pointer disabled:opacity-50"
                    >
                      {submittingBatch ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Generating Accounts...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Create Accounts</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: STUDENT DETAIL & ROSTER MANAGEMENT ─────────── */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-border-default bg-surface-raised p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border-default pb-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-steel-ghost text-steel text-base font-bold border border-steel-border">
                  {selectedStudentDetail.user.first_name[0]?.toUpperCase()}
                  {selectedStudentDetail.user.last_name[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-text-primary">
                      {selectedStudentDetail.user.first_name} {selectedStudentDetail.user.last_name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedStudentDetail)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-border-default bg-surface-subtle hover:bg-surface-muted text-[11px] font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                      title="Edit Student Name"
                    >
                      <Pencil className="h-3 w-3 text-steel" />
                      <span>Edit Name</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-xs text-steel font-bold">
                      @{selectedStudentDetail.user.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedStudentDetail.user.username);
                        setDetailCopied(true);
                        setTimeout(() => setDetailCopied(false), 2000);
                      }}
                      className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-0.5"
                      title="Copy Username"
                    >
                      {detailCopied ? <Check className="h-3 w-3 text-sage" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="rounded-lg p-1.5 text-text-muted hover:bg-surface-subtle hover:text-text-primary cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Pending Password Reset Banner */}
            {selectedStudentDetail.has_pending_reset_request && (
              <div className="rounded-2xl border border-tan/40 bg-linear-to-r from-tan/15 via-tan/10 to-transparent p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-tan/20 text-tan border border-tan/30">
                    <Bell className="h-4 w-4 animate-bounce" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary">Password Reset Requested</p>
                    <p className="text-[11px] text-text-secondary truncate">
                      Student requested account recovery credentials.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDirectPasswordReset}
                  disabled={resettingPassword}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl gradient-bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {resettingPassword ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}
                  <span>Reset Now</span>
                </button>
              </div>
            )}

            {/* Identification Badges */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-surface-base p-3 border border-border-default space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-text-muted tracking-wider">
                  <IdCard className="h-3.5 w-3.5 text-steel" />
                  <span>Full Student ID</span>
                </div>
                <span className="font-mono font-bold text-text-primary text-xs">
                  02000{String(selectedStudentDetail.student_number).padStart(6, "0")}
                </span>
              </div>

              <div className="rounded-2xl bg-surface-base p-3 border border-border-default space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-text-muted tracking-wider">
                  <Hash className="h-3.5 w-3.5 text-tan" />
                  <span>OMR Digit</span>
                </div>
                <span className="font-mono font-bold text-tan text-xs tracking-wider">
                  {String(selectedStudentDetail.student_number).padStart(6, "0")}
                </span>
              </div>
            </div>

            {/* Class Section & Roster Management */}
            <div className="rounded-2xl bg-surface-base p-3.5 border border-border-default space-y-2.5">
              <span className="text-xs font-bold text-text-primary block">Class Section Enrollment</span>

              <CustomSelect
                value={modalTargetSection}
                onChange={(val) => setModalTargetSection(val)}
                placeholder="None (Unassigned / Directory Only)"
                options={[
                  { value: "", label: "None (Unassigned / Directory Only)" },
                  ...sections.map((sec) => ({
                    value: sec.id,
                    label: sec.name,
                    badge: sec.subject,
                  })),
                ]}
              />

              {modalTargetSection !== (selectedStudentDetail.section_id || "") && (
                <button
                  type="button"
                  onClick={handleModalUpdateSection}
                  disabled={updatingSection}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl gradient-bg-primary py-2 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {updatingSection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Save Section Assignment</span>
                </button>
              )}
            </div>

            {/* Password Reset */}
            <div className="rounded-2xl bg-surface-base p-3.5 border border-border-default space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-steel" />
                  Credentials & Security
                </span>
              </div>

              {tempPasswordIssued ? (
                <div className="rounded-xl border border-sage-border bg-sage-ghost/30 p-3 space-y-1.5">
                  <span className="text-[11px] font-bold text-sage">New Temporary Password:</span>
                  <div className="flex items-center justify-between rounded-lg bg-surface-base border border-border-default px-2.5 py-1.5 text-xs font-mono font-bold text-steel">
                    <span>{tempPasswordIssued.tempPassword}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(tempPasswordIssued.tempPassword);
                        setCopiedTempPassword(true);
                        setTimeout(() => setCopiedTempPassword(false), 2000);
                      }}
                      className="text-xs text-text-muted hover:text-text-primary cursor-pointer flex items-center gap-1"
                    >
                      {copiedTempPassword ? <Check className="h-3 w-3 text-sage" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedTempPassword ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDirectPasswordReset}
                  disabled={resettingPassword}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-steel/30 bg-steel-ghost py-2 text-xs font-bold text-steel hover:bg-steel hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {resettingPassword ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}
                  <span>Reset Password</span>
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border-default">
              <button
                type="button"
                onClick={() => setStudentToDelete(selectedStudentDetail)}
                className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Account</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="rounded-xl border border-border-default bg-surface-base px-4 py-2 text-xs font-bold text-text-muted hover:text-text-primary cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: EDIT STUDENT NAME & DETAILS ─────────────────── */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-border-default bg-surface-raised p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-steel-ghost text-steel border border-steel-border">
                  <Pencil className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-primary">Edit Student</h2>
                  <p className="text-[11px] text-text-muted">Update student name and institutional profile.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-subtle cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="flex items-center gap-2 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStudentEdit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    First Name <span className="text-burgundy">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="e.g. Maria"
                    className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3 py-2 text-xs text-text-primary placeholder-text-faint focus:border-steel focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Last Name <span className="text-burgundy">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="e.g. Santos"
                    className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3 py-2 text-xs text-text-primary placeholder-text-faint focus:border-steel focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Student ID (OMR Number)
                </label>
                <div className="flex items-center rounded-xl border border-border-emphasis bg-surface-base focus-within:border-steel transition-colors overflow-hidden">
                  <span className="px-3 py-2 text-xs font-mono font-bold text-text-muted bg-surface-subtle border-r border-border-default select-none">
                    02000
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    value={editStudentNumber}
                    onChange={(e) => setEditStudentNumber(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="282222"
                    className="w-full bg-transparent px-3 py-2 text-xs font-mono font-bold text-text-primary placeholder-text-faint focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-text-muted mt-1">6-digit number printed on bubble sheets.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Class Section Assignment
                </label>
                <CustomSelect
                  value={editSectionId}
                  onChange={(val) => setEditSectionId(val)}
                  placeholder="None (Unassigned in Directory)"
                  options={[
                    { value: "", label: "None (Unassigned in Directory)" },
                    ...sections.map((sec) => ({
                      value: sec.id,
                      label: sec.name,
                      badge: sec.subject,
                    })),
                  ]}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="flex-1 rounded-xl border border-border-default bg-surface-base py-2.5 text-xs font-bold text-text-muted hover:text-text-primary hover:bg-surface-subtle cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl gradient-bg-primary py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingEdit ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Permanent Delete */}
      <ConfirmModal
        isOpen={!!studentToDelete}
        onCancel={() => setStudentToDelete(null)}
        onConfirm={confirmDeleteStudent}
        title="Permanently Delete Student"
        message={`Are you sure you want to permanently delete ${studentToDelete?.user.first_name} ${studentToDelete?.user.last_name}? All exam submissions, grades, and records associated with this student will be erased.`}
        confirmText="Yes, Delete Account"
        variant="danger"
      />

      {/* Teacher Password Change */}
      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
}
