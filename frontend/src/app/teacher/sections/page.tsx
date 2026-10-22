"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { teacher as teacherApi } from "@/lib/api";
import { Pagination } from "@/components/ui/Pagination";
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
  ArrowRight,
  ShieldCheck,
  Hash,
  KeyRound,
  Bell,
  IdCard,
  Globe,
  Lock,
  FileCheck,
  FileSpreadsheet,
  Monitor,
  Play,
  Activity,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import {
  Skeleton,
  SkeletonSectionGrid,
  SkeletonDashboardPage,
} from "@/components/ui/Skeleton";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { LiveExamMonitorModal } from "@/components/LiveExamMonitorModal";

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
  has_pending_reset_request?: boolean;
}

interface SectionExamItem {
  id: string;
  section_id: string;
  exam_id: string;
  is_online_active: boolean;
  is_grades_released: boolean;
  is_started?: boolean;
  release_mode?: "FULL" | "SCORES_ONLY";
  created_at: string;
  exam?: {
    id: string;
    title: string;
    total_questions: number;
    is_public: boolean;
    answer_keys: Array<{ id: string; question_number: number; correct_option: string }>;
    questions?: Array<{
      id: string;
      question_number: number;
      question_text: string;
      option_a?: string | null;
      option_b?: string | null;
      option_c?: string | null;
      option_d?: string | null;
      explanation?: string | null;
    }>;
  };
  submission_count: number;
  average_score?: number | null;
  max_score?: number | null;
}

interface TeacherBankExamItem {
  id: string;
  title: string;
  total_questions: number;
  answer_keys: Array<{ id: string; question_number: number; correct_option: string }>;
  questions?: Array<{
    id: string;
    question_number: number;
    question_text: string;
  }>;
}

export default function TeacherSectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Top-level navigation: Sections view vs Student Directory
  const [activeTab, setActiveTab] = useState<"sections" | "directory">("sections");

  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Active selected section for managing students & exams
  const [selectedSection, setSelectedSection] = useState<SectionItem | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Pagination states
  const [sectionsPage, setSectionsPage] = useState(1);
  const [sectionsPageSize, setSectionsPageSize] = useState(6);
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterPageSize, setRosterPageSize] = useState(9);
  const [dirPage, setDirPage] = useState(1);
  const [dirPageSize, setDirPageSize] = useState(9);
  const [secExamsPage, setSecExamsPage] = useState(1);
  const [secExamsPageSize, setSecExamsPageSize] = useState(6);

  // Sub-tabs inside selected section: "students" vs "exams"
  const [sectionViewTab, setSectionViewTab] = useState<"students" | "exams">("students");
  const [sectionExams, setSectionExams] = useState<SectionExamItem[]>([]);
  const [sectionExamsLoading, setSectionExamsLoading] = useState(false);
  const [teacherBankExams, setTeacherBankExams] = useState<TeacherBankExamItem[]>([]);
  const [isAssignExamOpen, setIsAssignExamOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [assigningExamId, setAssigningExamId] = useState<string | null>(null);
  const [examToUnassign, setExamToUnassign] = useState<SectionExamItem | null>(null);
  const [togglingSectionOnlineId, setTogglingSectionOnlineId] = useState<string | null>(null);
  const [togglingSectionGradesId, setTogglingSectionGradesId] = useState<string | null>(null);
  const [monitoringSectionExam, setMonitoringSectionExam] = useState<SectionExamItem | null>(null);

  // All students across application
  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directorySearch, setDirectorySearch] = useState("");
  const [directoryFilter, setDirectoryFilter] = useState<"all" | "unassigned">("all");

  // Student Info Detail Modal (Clicking any student in directory or roster)
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentItem | null>(null);
  const [modalTargetSection, setModalTargetSection] = useState<string>("");
  const [updatingSection, setUpdatingSection] = useState(false);

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
  const [detailCopied, setDetailCopied] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [tempPasswordIssued, setTempPasswordIssued] = useState<{
    studentName: string;
    username: string;
    fullStudentId: string;
    tempPassword: string;
  } | null>(null);
  const [copiedTempPassword, setCopiedTempPassword] = useState(false);

  // Edit Section & Subject Modal state
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);
  const [editSectionName, setEditSectionName] = useState("");
  const [editSectionSubject, setEditSectionSubject] = useState("");
  const [savingSection, setSavingSection] = useState(false);
  const [editSectionError, setEditSectionError] = useState<string | null>(null);

  // Edit Student Modal state
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [editStudentFirstName, setEditStudentFirstName] = useState("");
  const [editStudentLastName, setEditStudentLastName] = useState("");
  const [editStudentNumber, setEditStudentNumber] = useState("");
  const [editStudentSectionId, setEditStudentSectionId] = useState("");
  const [savingStudent, setSavingStudent] = useState(false);
  const [editStudentError, setEditStudentError] = useState<string | null>(null);

  // Modal in-flight loading states
  const [deletingSection, setDeletingSection] = useState(false);
  const [unrollingStudent, setUnrollingStudent] = useState(false);
  const [permanentlyDeletingStudent, setPermanentlyDeletingStudent] = useState(false);
  const [unassigningExam, setUnassigningExam] = useState(false);

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
      setLoading(true);
      setDirectoryLoading(true);
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
          if (!ignore) {
            setLoading(false);
            setDirectoryLoading(false);
          }
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

  const loadSectionExams = async (sectionId: string) => {
    setSectionExamsLoading(true);
    try {
      const data = await teacherApi.listSectionExams(sectionId);
      setSectionExams(data as SectionExamItem[]);
    } catch (err: unknown) {
      console.error("Failed to load section exams:", err);
    } finally {
      setSectionExamsLoading(false);
    }
  };

  const loadTeacherBankExams = async () => {
    try {
      const data = await teacherApi.listExams(false);
      setTeacherBankExams(data as TeacherBankExamItem[]);
    } catch (err: unknown) {
      console.error("Failed to load teacher bank exams:", err);
    }
  };

  const handleOpenAssignModal = async () => {
    setAssignSearch("");
    setIsAssignExamOpen(true);
    await loadTeacherBankExams();
  };

  const handleAssignExamToSection = async (examId: string) => {
    if (!selectedSection) return;
    setAssigningExamId(examId);
    try {
      await teacherApi.assignExamToSection(selectedSection.id, examId);
      await loadSectionExams(selectedSection.id);
      setIsAssignExamOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to assign exam to class");
    } finally {
      setAssigningExamId(null);
    }
  };

  const confirmUnassignExam = async () => {
    if (!selectedSection || !examToUnassign) return;
    try {
      await teacherApi.unassignExamFromSection(selectedSection.id, examToUnassign.exam_id);
      setExamToUnassign(null);
      await loadSectionExams(selectedSection.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to unassign exam from class");
    }
  };

  const handleToggleSectionOnline = async (se: SectionExamItem) => {
    if (!selectedSection) return;
    setTogglingSectionOnlineId(se.id);
    const nextVal = !se.is_online_active;
    try {
      const res = await teacherApi.toggleSectionExamOnline(selectedSection.id, se.exam_id, nextVal);
      setSectionExams((prev) =>
        prev.map((item) => (item.id === se.id ? { ...item, is_online_active: res.is_online_active } : item))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle online web quiz");
    } finally {
      setTogglingSectionOnlineId(null);
    }
  };

  const handleToggleSectionGrades = async (se: SectionExamItem) => {
    if (!selectedSection) return;
    setTogglingSectionGradesId(se.id);
    const nextVal = !se.is_grades_released;
    try {
      const res = await teacherApi.toggleSectionExamGrades(
        selectedSection.id,
        se.exam_id,
        nextVal,
        se.release_mode || "FULL"
      );
      setSectionExams((prev) =>
        prev.map((item) =>
          item.id === se.id
            ? { ...item, is_grades_released: res.is_grades_released, release_mode: res.release_mode }
            : item
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle grade release");
    } finally {
      setTogglingSectionGradesId(null);
    }
  };

  const handleChangeReleaseMode = async (se: SectionExamItem, mode: "FULL" | "SCORES_ONLY") => {
    if (!selectedSection || (se.release_mode || "FULL") === mode) return;
    setTogglingSectionGradesId(se.id);
    try {
      const res = await teacherApi.toggleSectionExamGrades(selectedSection.id, se.exam_id, se.is_grades_released, mode);
      setSectionExams((prev) =>
        prev.map((item) =>
          item.id === se.id
            ? { ...item, is_grades_released: res.is_grades_released, release_mode: res.release_mode }
            : item
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to change release mode");
    } finally {
      setTogglingSectionGradesId(null);
    }
  };

  const openStudentDetail = (s: StudentItem) => {
    setSelectedStudentDetail(s);
    setModalTargetSection(s.section_id || "");
    setDetailCopied(false);
    setTempPasswordIssued(null);
    setCopiedTempPassword(false);
  };

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
      await loadAllStudents();
      if (selectedSection) {
        await loadStudents(selectedSection.id);
      }
      const refreshed = (await teacherApi.listAllStudents()).find((st) => st.id === selectedStudentDetail.id);
      if (refreshed) {
        setSelectedStudentDetail(refreshed as StudentItem);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reset student password");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleCopyTempPassword = () => {
    if (!tempPasswordIssued) return;
    const text = `LongQuiz Login Credentials\nStudent: ${tempPasswordIssued.studentName}\nStudent ID: ${tempPasswordIssued.fullStudentId}\nUsername: ${tempPasswordIssued.username}\nTemporary Password: ${tempPasswordIssued.tempPassword}\n\n* You will be prompted to set your personal password upon sign-in.`;
    navigator.clipboard.writeText(text);
    setCopiedTempPassword(true);
    setTimeout(() => setCopiedTempPassword(false), 2000);
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
    setDeletingSection(true);
    try {
      await teacherApi.deleteSection(sectionToDelete.id);
      if (selectedSection?.id === sectionToDelete.id) setSelectedSection(null);
      setSectionToDelete(null);
      await loadSections();
      await loadAllStudents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete section");
    } finally {
      setDeletingSection(false);
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

  const handleModalUpdateSection = async () => {
    if (!selectedStudentDetail) return;
    setUpdatingSection(true);
    try {
      if (modalTargetSection) {
        await teacherApi.enrollStudent(modalTargetSection, selectedStudentDetail.id);
      } else if (selectedStudentDetail.section_id) {
        await teacherApi.unenrollStudent(selectedStudentDetail.section_id, selectedStudentDetail.id);
      }
      await loadAllStudents();
      await loadSections();
      if (selectedSection) {
        await loadStudents(selectedSection.id);
      }

      // Refresh currently viewed student detail
      const refreshed = (await teacherApi.listAllStudents()).find((st) => st.id === selectedStudentDetail.id);
      if (refreshed) {
        setSelectedStudentDetail(refreshed as StudentItem);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update student section");
    } finally {
      setUpdatingSection(false);
    }
  };

  const handleModalUnenroll = async () => {
    if (!selectedStudentDetail || !selectedStudentDetail.section_id) return;
    setUpdatingSection(true);
    try {
      await teacherApi.unenrollStudent(selectedStudentDetail.section_id, selectedStudentDetail.id);
      await loadAllStudents();
      await loadSections();
      if (selectedSection) {
        await loadStudents(selectedSection.id);
      }
      // Refresh currently viewed student detail
      const refreshed = (await teacherApi.listAllStudents()).find((st) => st.id === selectedStudentDetail.id);
      if (refreshed) {
        setSelectedStudentDetail(refreshed as StudentItem);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to unenroll student");
    } finally {
      setUpdatingSection(false);
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
    setUnrollingStudent(true);
    try {
      await teacherApi.unenrollStudent(selectedSection.id, studentToUnenroll.id);
      const sId = selectedSection.id;
      setStudentToUnenroll(null);
      await loadStudents(sId);
      await loadSections();
      await loadAllStudents();
      if (selectedStudentDetail?.id === studentToUnenroll.id) {
        setSelectedStudentDetail(null);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to unenroll student");
    } finally {
      setUnrollingStudent(false);
    }
  };

  const confirmPermanentDeleteStudent = async () => {
    if (!studentToPermanentlyDelete) return;
    setPermanentlyDeletingStudent(true);
    try {
      await teacherApi.deleteStudent(studentToPermanentlyDelete.id);
      const sId = studentToPermanentlyDelete.section_id || selectedSection?.id;
      setStudentToPermanentlyDelete(null);
      if (selectedStudentDetail?.id === studentToPermanentlyDelete.id) {
        setSelectedStudentDetail(null);
      }
      if (sId && selectedSection) {
        await loadStudents(sId);
      }
      await loadSections();
      await loadAllStudents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete student account");
    } finally {
      setPermanentlyDeletingStudent(false);
    }
  };

  const openEditSectionModal = (sec: SectionItem) => {
    setEditingSection(sec);
    setEditSectionName(sec.name);
    setEditSectionSubject(sec.subject);
    setEditSectionError(null);
  };

  const handleSaveSectionEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    if (!editSectionName.trim() || !editSectionSubject.trim()) {
      setEditSectionError("Section name and subject name are required.");
      return;
    }
    setSavingSection(true);
    setEditSectionError(null);
    try {
      const updated = await teacherApi.updateSection(editingSection.id, {
        name: editSectionName.trim(),
        subject: editSectionSubject.trim(),
      });
      setSections((prev) =>
        prev.map((s) =>
          s.id === updated.id ? { ...s, name: updated.name, subject: updated.subject } : s
        )
      );
      if (selectedSection?.id === updated.id) {
        setSelectedSection((prev) =>
          prev ? { ...prev, name: updated.name, subject: updated.subject } : null
        );
      }
      setEditingSection(null);
    } catch (err: unknown) {
      setEditSectionError(err instanceof Error ? err.message : "Failed to update section");
    } finally {
      setSavingSection(false);
    }
  };

  const openEditStudentModal = (s: StudentItem) => {
    setEditingStudent(s);
    setEditStudentFirstName(s.user.first_name);
    setEditStudentLastName(s.user.last_name);
    setEditStudentNumber(String(s.student_number));
    setEditStudentSectionId(s.section_id || "");
    setEditStudentError(null);
  };

  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editStudentFirstName.trim() || !editStudentLastName.trim()) {
      setEditStudentError("First name and last name are required.");
      return;
    }
    setSavingStudent(true);
    setEditStudentError(null);
    try {
      const res = await teacherApi.updateStudent(editingStudent.id, {
        first_name: editStudentFirstName.trim(),
        last_name: editStudentLastName.trim(),
        student_number: editStudentNumber.trim() ? editStudentNumber.trim() : undefined,
        section_id: editStudentSectionId ? editStudentSectionId : "",
      });
      await loadAllStudents();
      if (selectedSection) {
        await loadStudents(selectedSection.id);
      }
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
      setEditStudentError(err instanceof Error ? err.message : "Failed to update student");
    } finally {
      setSavingStudent(false);
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

  // Reset pagination when search / active section changes
  useEffect(() => {
    setDirPage(1);
  }, [directorySearch, directoryFilter, dirPageSize]);

  useEffect(() => {
    setRosterPage(1);
  }, [selectedSection, rosterPageSize]);

  useEffect(() => {
    setSecExamsPage(1);
  }, [selectedSection, secExamsPageSize]);

  const paginatedSections = useMemo(() => {
    const start = (sectionsPage - 1) * sectionsPageSize;
    return sections.slice(start, start + sectionsPageSize);
  }, [sections, sectionsPage, sectionsPageSize]);

  const paginatedRosterStudents = useMemo(() => {
    const start = (rosterPage - 1) * rosterPageSize;
    return students.slice(start, start + rosterPageSize);
  }, [students, rosterPage, rosterPageSize]);

  const paginatedDirectoryStudents = useMemo(() => {
    const start = (dirPage - 1) * dirPageSize;
    return filteredDirectoryStudents.slice(start, start + dirPageSize);
  }, [filteredDirectoryStudents, dirPage, dirPageSize]);

  const paginatedSectionExams = useMemo(() => {
    const start = (secExamsPage - 1) * secExamsPageSize;
    return sectionExams.slice(start, start + secExamsPageSize);
  }, [sectionExams, secExamsPage, secExamsPageSize]);

  // Filter available students for enrolling into the current section
  const availableToEnroll = allStudents.filter((s) => {
    if (!selectedSection) return false;
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

  // Filter teacher bank exams available to assign to this section
  const availableToAssignExams = teacherBankExams.filter((exam) => {
    const alreadyAssigned = sectionExams.some((se) => se.exam_id === exam.id);
    if (alreadyAssigned) return false;
    if (!assignSearch.trim()) return true;
    const term = assignSearch.toLowerCase().trim();
    return exam.title.toLowerCase().includes(term);
  });

  if (authLoading) {
    return <SkeletonDashboardPage role="teacher" />;
  }

  return (
    <div className="min-h-screen text-text-primary">
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
                className="hover:text-tan transition-colors cursor-pointer"
              >
                Sections & Roster
              </button>
              <span>/</span>
              <span className="text-text-primary font-medium">{selectedSection.name}</span>
            </>
          ) : (
            <span className="text-text-primary font-medium">Sections & Student Directory</span>
          )}
        </div>

        {/* Section Detail View or Main Tabs */}
        {selectedSection ? (
          /* Single Section Management (Roster + Exams) */
          <div>
            {/* Header: Class Info & Context Actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedSection(null)}
                  className="rounded-xl bg-surface-subtle p-2 text-text-muted hover:bg-surface-muted hover:text-text-primary transition-colors cursor-pointer"
                  title="Back to Sections"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-text-primary">{selectedSection.name}</h1>
                    <span className="rounded-full bg-tan-ghost px-2.5 py-0.5 text-xs font-semibold text-tan border border-tan-border">
                      {selectedSection.subject}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditSectionModal(selectedSection)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-border-default bg-surface-subtle hover:bg-surface-muted text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer ml-1"
                      title="Edit Section Name & Subject"
                    >
                      <Pencil className="h-3.5 w-3.5 text-steel" />
                      <span>Edit Section</span>
                    </button>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {students.length} Enrolled Students • {sectionExams.length} Assigned Exams
                  </p>
                </div>
              </div>

              {/* Context Actions depending on sub-tab */}
              <div className="flex flex-wrap items-center gap-2">
                {sectionViewTab === "students" ? (
                  <>
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
                      <FileSpreadsheet className="h-4 w-4 text-sage" />
                      Import Excel / CSV
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
                  </>
                ) : (
                  <button
                    onClick={handleOpenAssignModal}
                    className="flex items-center justify-center gap-1.5 rounded-xl gradient-bg-primary px-4 py-2 text-xs font-semibold text-text-primary shadow-lg shadow-steel/20 hover:opacity-95 transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Assign Exam to Class
                  </button>
                )}
              </div>
            </div>

            {/* Class Sub-navigation Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-border-default/80 pb-3">
              <button
                onClick={() => setSectionViewTab("students")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  sectionViewTab === "students"
                    ? "bg-steel text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-primary bg-surface-subtle border border-border-emphasis"
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Enrolled Students</span>
                <span className="rounded-full bg-surface-base px-2 py-0.5 text-[10px] font-bold">
                  {students.length}
                </span>
              </button>

              <button
                onClick={() => setSectionViewTab("exams")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  sectionViewTab === "exams"
                    ? "bg-steel text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-primary bg-surface-subtle border border-border-emphasis"
                }`}
              >
                <FileCheck className="h-4 w-4" />
                <span>Class Exams & Quizzes</span>
                <span className="rounded-full bg-surface-base px-2 py-0.5 text-[10px] font-bold">
                  {sectionExams.length}
                </span>
              </button>
            </div>

            {/* Sub-tab 1: Enrolled Students List */}
            {sectionViewTab === "students" && (
              <div>
                {studentsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse rounded-2xl bg-surface-subtle p-5 border border-border-default space-y-3">
                        <div className="h-4 w-28 bg-surface-muted rounded" />
                        <div className="h-5 w-40 bg-surface-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : students.length === 0 ? (
                  <div className="glass-card rounded-2xl p-12 text-center border border-border-default space-y-4">
                    <Users className="mx-auto h-12 w-12 text-text-faint" />
                    <p className="font-semibold text-text-primary text-base">No students enrolled in this section yet</p>
                    <p className="text-xs text-text-muted max-w-sm mx-auto">
                      You can enroll students registered in the application, or register brand new students directly into this section.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      <button
                        onClick={() => {
                          setEnrollSearch("");
                          setIsEnrollExistingOpen(true);
                        }}
                        className="rounded-xl border border-border-emphasis bg-surface-subtle px-4 py-2 text-xs font-semibold text-tan hover:bg-surface-muted cursor-pointer"
                      >
                        Enroll Registered Student
                      </button>
                      <button
                        onClick={() => {
                          setNewStudentCredentials(null);
                          setStudentTargetSection(selectedSection.id);
                          setIsAddStudentOpen(true);
                        }}
                        className="rounded-xl gradient-bg-primary px-4 py-2 text-xs font-semibold text-text-primary cursor-pointer"
                      >
                        Register New Student
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {paginatedRosterStudents.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => openStudentDetail(s)}
                        className="glass-card glass-card-hover rounded-2xl p-5 border border-border-default hover:border-steel/40 transition-all cursor-pointer flex flex-col justify-between group space-y-4 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-text-primary tracking-wide group-hover:text-steel-light transition-colors">
                                02000{String(s.student_number).padStart(6, "0")}
                              </span>
                              {s.has_pending_reset_request && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-tan/15 px-2 py-0.5 text-[10px] font-bold text-tan border border-tan/30 animate-pulse">
                                  <KeyRound className="h-2.5 w-2.5" />
                                  Reset Requested
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditStudentModal(s);
                                }}
                                className="rounded-lg bg-surface-subtle p-1.5 text-text-muted hover:text-steel hover:bg-steel-ghost transition-colors cursor-pointer"
                                title="Edit Student Name & Info"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStudentToUnenroll(s);
                                }}
                                className="rounded-lg bg-surface-subtle p-1.5 text-text-muted hover:bg-burgundy-ghost hover:text-burgundy-light transition-colors cursor-pointer"
                                title="Remove from Section (Unenroll)"
                              >
                                <UserX className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-sm font-bold text-text-primary border border-border-emphasis group-hover:border-steel/50 transition-colors">
                              {s.user.first_name[0]?.toUpperCase()}{s.user.last_name[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-sm text-text-primary truncate group-hover:text-tan transition-colors">
                                {s.user.first_name} {s.user.last_name}
                              </h3>
                              <p className="font-mono text-xs text-text-muted truncate">
                                @{s.user.username}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-border-default/60 text-[11px] text-text-muted group-hover:text-text-secondary transition-colors">
                          <span>OMR: {String(s.student_number).padStart(6, "0")}</span>
                          <span className="font-semibold text-steel-light group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            Student Info &rarr;
                          </span>
                        </div>
                      </div>
                    ))}
                    </div>
                    <Pagination
                      currentPage={rosterPage}
                      totalPages={Math.ceil(students.length / rosterPageSize)}
                      totalItems={students.length}
                      pageSize={rosterPageSize}
                      onPageChange={setRosterPage}
                      onPageSizeChange={setRosterPageSize}
                      pageSizeOptions={[9, 18, 36]}
                      itemLabel="students in roster"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Class Exams & Quizzes */}
            {sectionViewTab === "exams" && (
              <div>
                {sectionExamsLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse rounded-2xl bg-surface-subtle p-6 border border-border-default space-y-4">
                        <div className="h-5 w-48 bg-surface-muted rounded" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="h-28 bg-surface-muted rounded-xl" />
                          <div className="h-28 bg-surface-muted rounded-xl" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : sectionExams.length === 0 ? (
                  <div className="glass-card rounded-2xl p-12 text-center border border-border-default space-y-4">
                    <FileCheck className="mx-auto h-12 w-12 text-text-faint" />
                    <p className="font-semibold text-text-primary text-base">No exams assigned to this class yet</p>
                    <p className="text-xs text-text-muted max-w-md mx-auto">
                      Assign an exam from your Exam Bank to conduct online desktop web quizzes, scan paper OMR bubble sheets, and manage grade releases for {selectedSection.name}.
                    </p>
                    <div className="flex justify-center gap-2 pt-2">
                      <button
                        onClick={handleOpenAssignModal}
                        className="flex items-center gap-1.5 rounded-xl gradient-bg-primary px-4 py-2 text-xs font-semibold text-text-primary shadow-lg shadow-steel/20 hover:opacity-95 transition-all cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        Assign Exam from Bank
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paginatedSectionExams.map((se) => (
                      <div
                        key={se.id}
                        className="glass-card rounded-2xl p-5 sm:p-6 border border-border-default space-y-5 transition-all"
                      >
                        {/* Top: Title, Badges, and Unassign */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border-default/60">
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h3 className="font-bold text-base sm:text-lg text-text-primary">
                                {se.exam?.title || "Class Exam"}
                              </h3>
                              <span className="rounded-full bg-steel/15 px-2.5 py-0.5 text-xs font-semibold text-steel-light border border-steel/30">
                                {se.exam?.total_questions || 0} Questions
                              </span>
                              <span className="rounded-full bg-tan/15 px-2.5 py-0.5 text-xs font-semibold text-tan border border-tan/30">
                                {se.exam?.answer_keys?.length || 0} Keys Configured
                              </span>
                              {se.exam?.questions && se.exam.questions.length > 0 && (
                                <span className="rounded-full bg-sage-ghost px-2.5 py-0.5 text-xs font-semibold text-sage border border-sage-border">
                                  {se.exam.questions.length} Reviewer Prompts
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-text-muted mt-1">
                              Assigned to {selectedSection.name} • Control online quiz access and grade visibility for this class below
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setExamToUnassign(se)}
                              className="flex items-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-text-muted hover:bg-burgundy-ghost hover:text-burgundy-light transition-colors cursor-pointer"
                              title="Remove exam from this section"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Remove from Class</span>
                            </button>
                          </div>
                        </div>

                        {/* Middle: DUAL CONTROLS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Control 1: Online Web Quiz */}
                          <div
                            className={`rounded-2xl border p-4.5 transition-all flex flex-col justify-between space-y-4 ${
                              se.is_online_active
                                ? "border-steel/40 bg-steel/10"
                                : "border-border-default bg-surface-subtle/50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                    se.is_online_active
                                      ? "bg-steel text-text-primary shadow-sm"
                                      : "bg-surface-subtle text-text-muted border border-border-emphasis"
                                  }`}
                                >
                                  <Globe className="h-4 w-4" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-text-primary">Online Desktop Quiz</h4>
                                  <p className="text-[11px] text-text-muted">
                                    Student Web Portal Access
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide border ${
                                  se.is_online_active
                                    ? "bg-steel/20 text-steel-light border-steel/40"
                                    : "bg-surface-base text-text-muted border-border-emphasis"
                                }`}
                              >
                                {se.is_online_active ? "ACTIVE (ONLINE)" : "INACTIVE (PAPER)"}
                              </span>
                            </div>

                            <p className="text-xs text-text-secondary">
                              {se.is_online_active
                                ? "Students in this class can take this quiz online in desktop full-screen mode."
                                : "Online quiz closed for this class. Use printed paper OMR bubble sheets or activate when ready."}
                            </p>

                            <div className="pt-2 border-t border-border-default/40 flex items-center justify-between">
                              <span className="text-xs font-medium text-text-muted">
                                {se.is_online_active ? "Online quiz enabled" : "Online quiz disabled"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleSectionOnline(se)}
                                disabled={togglingSectionOnlineId === se.id}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                                  se.is_online_active ? "bg-steel" : "bg-surface-muted"
                                }`}
                                role="switch"
                                aria-checked={se.is_online_active}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    se.is_online_active ? "translate-x-5" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Control 2: Grades & Reviewer Release */}
                          <div
                            className={`rounded-2xl border p-4.5 transition-all flex flex-col justify-between space-y-4 ${
                              se.is_grades_released
                                ? "border-sage-border bg-sage-ghost"
                                : "border-border-default bg-surface-subtle/50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                    se.is_grades_released
                                      ? "bg-sage text-text-primary shadow-sm"
                                      : "bg-surface-subtle text-text-muted border border-border-emphasis"
                                  }`}
                                >
                                  <FileSpreadsheet className="h-4 w-4" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-text-primary">Grades & Reviewer</h4>
                                  <p className="text-[11px] text-text-muted">
                                    Class Score & Solution Visibility
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide border ${
                                  se.is_grades_released
                                    ? "bg-sage-ghost text-sage border-sage-border"
                                    : "bg-surface-base text-text-muted border-border-emphasis"
                                }`}
                              >
                                {se.is_grades_released ? "RELEASED TO CLASS" : "HIDDEN FROM CLASS"}
                              </span>
                            </div>

                            <p className="text-xs text-text-secondary">
                              {!se.is_grades_released
                                ? "Grades and questions are strictly confidential. Students cannot see scores or reviewer."
                                : (se.release_mode || "FULL") === "SCORES_ONLY"
                                ? "Students in this class can only see their score. Questionnaire and answer key stay hidden."
                                : "Students in this class can view their exam score, correct answers, and questionnaire reviewer."}
                            </p>

                            {/* What to release */}
                            <div>
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                                What to release
                              </span>
                              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-surface-base border border-border-default">
                                {([
                                  { key: "SCORES_ONLY", label: "Scores only", hint: "Score & %" },
                                  { key: "FULL", label: "Full review", hint: "Score + questions + key" },
                                ] as const).map((opt) => {
                                  const active = (se.release_mode || "FULL") === opt.key;
                                  return (
                                    <button
                                      key={opt.key}
                                      id={`release-mode-${se.id}-${opt.key}`}
                                      type="button"
                                      onClick={() => handleChangeReleaseMode(se, opt.key)}
                                      disabled={togglingSectionGradesId === se.id}
                                      className={`rounded-lg px-2 py-1.5 text-left transition-all cursor-pointer disabled:opacity-60 ${
                                        active
                                          ? "bg-sage text-white shadow-sm"
                                          : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
                                      }`}
                                    >
                                      <span className="block text-[11px] font-bold">{opt.label}</span>
                                      <span className={`block text-[9px] ${active ? "text-white/80" : "text-text-faint"}`}>
                                        {opt.hint}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-border-default/40 flex items-center justify-between">
                              <span className="text-xs font-medium text-text-muted">
                                {se.is_grades_released
                                  ? (se.release_mode || "FULL") === "SCORES_ONLY"
                                    ? "Scores visible • key hidden"
                                    : "Scores & reviewer visible"
                                  : "Scores hidden from students"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleSectionGrades(se)}
                                disabled={togglingSectionGradesId === se.id}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                                  se.is_grades_released ? "bg-sage" : "bg-surface-muted"
                                }`}
                                role="switch"
                                aria-checked={se.is_grades_released}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    se.is_grades_released ? "translate-x-5" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Bottom: Class Stats & Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border-default/60 text-xs">
                          <div className="flex items-center gap-4 text-text-muted">
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-text-faint" />
                              <span>
                                <strong className="text-text-primary">{se.submission_count}</strong> of {students.length} students submitted
                              </span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1.5">
                              <FileCheck className="h-3.5 w-3.5 text-text-faint" />
                              <span>
                                Average: <strong className="text-text-primary">{se.average_score !== null && se.average_score !== undefined ? `${se.average_score.toFixed(1)} / ${se.max_score || se.exam?.total_questions || 0}` : "N/A"}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setMonitoringSectionExam(se)}
                              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm ${
                                se.is_started
                                  ? "bg-sage-ghost text-sage border-sage-border animate-pulse hover:bg-sage/20"
                                  : se.is_online_active
                                  ? "bg-steel/15 text-steel-light border-steel/40 hover:bg-steel/25"
                                  : "border-tan-border/60 bg-tan-ghost text-tan hover:bg-tan/20"
                              }`}
                              title="Open section gradebook, student submissions, and live monitoring"
                            >
                              {se.is_started ? (
                                <>
                                  <Activity className="h-3.5 w-3.5 text-sage" />
                                  <span>Live Exam Active</span>
                                </>
                              ) : se.is_online_active ? (
                                <>
                                  <Monitor className="h-3.5 w-3.5 text-steel-light" />
                                  <span>Live Lobby &amp; Gradebook</span>
                                </>
                              ) : (
                                <>
                                  <FileSpreadsheet className="h-3.5 w-3.5 text-tan" />
                                  <span>Gradebook &amp; Submissions</span>
                                </>
                              )}
                            </button>

                            <Link
                              href={`/teacher/scan?section_id=${selectedSection.id}&exam_id=${se.exam_id}`}
                              className="flex items-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-tan hover:bg-surface-muted transition-colors"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Scan Bubble Sheets
                            </Link>
                            <Link
                              href="/teacher/exams"
                              className="flex items-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              Exam Bank
                            </Link>
                          </div>
                        </div>
                      </div>

                    ))}
                    <Pagination
                      currentPage={secExamsPage}
                      totalPages={Math.ceil(sectionExams.length / secExamsPageSize)}
                      totalItems={sectionExams.length}
                      pageSize={secExamsPageSize}
                      onPageChange={setSecExamsPage}
                      onPageSizeChange={setSecExamsPageSize}
                      pageSizeOptions={[6, 12]}
                      itemLabel="assigned exams"
                    />
                  </div>
                )}
              </div>
            )}
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
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {paginatedSections.map((sec) => (
                      <div
                        key={sec.id}
                        className="glass-card glass-card-hover rounded-2xl p-6 border border-border-default flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="rounded-full bg-tan-ghost px-2.5 py-0.5 text-xs font-semibold text-tan border border-tan-border">
                              {sec.subject}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditSectionModal(sec);
                                }}
                                className="text-text-faint hover:text-steel transition-colors p-1 cursor-pointer rounded-lg hover:bg-surface-subtle"
                                title="Edit Section & Subject Name"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSectionToDelete(sec)}
                                className="text-text-faint hover:text-burgundy-light transition-colors p-1 cursor-pointer rounded-lg hover:bg-surface-subtle"
                                title="Delete Section"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <h3 className="text-xl font-bold text-text-primary">{sec.name}</h3>
                          <div className="mt-4 flex items-center gap-2 text-xs text-text-muted">
                            <Users className="h-4 w-4 text-text-faint" />
                            <span>{sec.student_count} Enrolled Students</span>
                          </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-2 pt-4 border-t border-border-default">
                          <button
                            onClick={() => {
                              setSelectedSection(sec);
                              setSectionViewTab("students");
                              loadStudents(sec.id);
                              loadSectionExams(sec.id);
                            }}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle/90 py-2.5 text-xs font-semibold text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
                          >
                            <Users className="h-3.5 w-3.5 text-tan" />
                            Roster
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSection(sec);
                              setSectionViewTab("exams");
                              loadStudents(sec.id);
                              loadSectionExams(sec.id);
                            }}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle/90 py-2.5 text-xs font-semibold text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
                          >
                            <FileCheck className="h-3.5 w-3.5 text-steel-light" />
                            Exams & Quizzes
                          </button>
                        </div>
                      </div>
                    ))}
                    </div>
                    <Pagination
                      currentPage={sectionsPage}
                      totalPages={Math.ceil(sections.length / sectionsPageSize)}
                      totalItems={sections.length}
                      pageSize={sectionsPageSize}
                      onPageChange={setSectionsPage}
                      onPageSizeChange={setSectionsPageSize}
                      pageSizeOptions={[6, 9, 18]}
                      itemLabel="sections"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Student Directory (Card-based interactive grid) */}
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
                        All {directoryLoading ? "..." : `(${allStudents.length})`}
                      </button>
                      <button
                        onClick={() => setDirectoryFilter("unassigned")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          directoryFilter === "unassigned"
                            ? "bg-steel text-text-primary"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        Not in Roster {directoryLoading ? "..." : `(${allStudents.filter((s) => !s.section_id).length})`}
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

                {/* Directory Content */}
                <div>
                  {directoryLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="animate-pulse rounded-2xl bg-surface-subtle p-5 border border-border-default space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="h-4 w-28 bg-surface-muted rounded" />
                            <div className="h-4 w-20 bg-surface-muted rounded-full" />
                          </div>
                          <div className="h-5 w-40 bg-surface-muted rounded" />
                          <div className="h-3 w-24 bg-surface-muted rounded" />
                        </div>
                      ))}
                    </div>
                  ) : filteredDirectoryStudents.length === 0 ? (
                    <div className="glass-card rounded-2xl p-12 text-center border border-border-default space-y-2">
                      <Users className="mx-auto h-10 w-10 text-text-faint" />
                      <p className="font-semibold text-text-secondary">No registered students found</p>
                      <p className="text-xs text-text-muted">
                        {directorySearch
                          ? "Try a different search query."
                          : "Register students into the application directory to use them across any class section."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {paginatedDirectoryStudents.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => openStudentDetail(s)}
                          className="glass-card glass-card-hover rounded-2xl p-5 border border-border-default hover:border-steel/40 transition-all cursor-pointer flex flex-col justify-between group space-y-4 shadow-sm"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              {/* Full Student ID & Alert Badge */}
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-text-primary tracking-wide group-hover:text-steel-light transition-colors">
                                  02000{String(s.student_number).padStart(6, "0")}
                                </span>
                                {s.has_pending_reset_request && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-tan/15 px-2 py-0.5 text-[10px] font-bold text-tan border border-tan/30 animate-pulse">
                                    <KeyRound className="h-2.5 w-2.5" />
                                    Reset Requested
                                  </span>
                                )}
                              </div>

                              {/* Section Badge */}
                              {s.section ? (
                                <span className="inline-flex items-center rounded-full bg-steel/15 px-2.5 py-0.5 text-xs font-semibold text-steel-light border border-steel/30">
                                  {s.section.name}
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-cream-ghost px-2.5 py-0.5 text-xs font-semibold text-cream border border-cream-border">
                                  Not in Roster
                                </span>
                              )}
                            </div>

                            {/* Student Name & Username */}
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-sm font-bold text-text-primary border border-border-emphasis group-hover:border-steel/50 transition-colors">
                                {s.user.first_name[0]?.toUpperCase()}{s.user.last_name[0]?.toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-sm text-text-primary truncate group-hover:text-tan transition-colors">
                                  {s.user.first_name} {s.user.last_name}
                                </h3>
                                <p className="font-mono text-xs text-text-muted truncate">
                                  @{s.user.username}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Footer hint */}
                          <div className="flex items-center justify-between pt-3 border-t border-border-default/60 text-[11px] text-text-muted group-hover:text-text-secondary transition-colors">
                            <span>{s.section ? `${s.section.subject || "Enrolled"}` : "Click to enroll into class"}</span>
                            <span className="font-semibold text-steel-light group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                              View Info &rarr;
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Pagination
                      currentPage={dirPage}
                      totalPages={Math.ceil(filteredDirectoryStudents.length / dirPageSize)}
                      totalItems={filteredDirectoryStudents.length}
                      pageSize={dirPageSize}
                      onPageChange={setDirPage}
                      onPageSizeChange={setDirPageSize}
                      pageSizeOptions={[9, 18, 36]}
                      itemLabel="registered students"
                    />
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal: Student Info & Management (Clicking any student) */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-border-default bg-surface-overlay/95 p-6 shadow-2xl backdrop-blur-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border-default pb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gradient-bg-primary text-text-primary text-base font-bold shadow-md shadow-steel/20 border border-steel-light/30">
                  {selectedStudentDetail.user.first_name[0]?.toUpperCase()}
                  {selectedStudentDetail.user.last_name[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-text-primary">
                      {selectedStudentDetail.user.first_name} {selectedStudentDetail.user.last_name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => openEditStudentModal(selectedStudentDetail)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-border-default bg-surface-subtle hover:bg-surface-muted text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                      title="Edit Student Name"
                    >
                      <Pencil className="h-3.5 w-3.5 text-steel" />
                      <span>Edit Name</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="font-mono text-xs text-tan font-medium">
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
                className="rounded-xl p-2 text-text-muted hover:bg-surface-subtle hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Pending Password Reset Alert Banner */}
            {selectedStudentDetail.has_pending_reset_request && (
              <div className="rounded-2xl border border-tan/40 bg-linear-to-r from-tan/15 via-tan/10 to-transparent p-3.5 flex items-center justify-between gap-3 animate-in fade-in">
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
                  className="shrink-0 flex items-center gap-1.5 rounded-xl gradient-bg-primary px-3 py-1.5 text-xs font-semibold text-text-primary shadow-sm hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {resettingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                  <span>Reset Now</span>
                </button>
              </div>
            )}

            {/* Identification Badges Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-surface-base p-3.5 border border-border-default space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-text-muted tracking-wider">
                  <IdCard className="h-3.5 w-3.5 text-steel" />
                  <span>Full Student ID</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-text-primary text-sm tracking-wide">
                    02000{String(selectedStudentDetail.student_number).padStart(6, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`02000${String(selectedStudentDetail.student_number).padStart(6, "0")}`);
                      setDetailCopied(true);
                      setTimeout(() => setDetailCopied(false), 2000);
                    }}
                    className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-1"
                    title="Copy Student ID"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-surface-base p-3.5 border border-border-default space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-text-muted tracking-wider">
                  <Hash className="h-3.5 w-3.5 text-tan" />
                  <span>OMR Shading Digit</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-tan text-sm tracking-widest">
                    {String(selectedStudentDetail.student_number).padStart(6, "0")}
                  </span>
                  <span className="text-[10px] text-text-faint font-sans">(6 digits)</span>
                </div>
              </div>
            </div>

            {/* Current Section & Enrollment Management */}
            <div className="rounded-2xl bg-surface-base p-4 border border-border-default space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">Academic Class Section</span>
              </div>

              {selectedStudentDetail.section ? (
                <div className="flex items-center justify-between rounded-xl bg-surface-subtle p-3 border border-border-emphasis">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-steel/15 text-steel-light border border-steel/25">
                      <School className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">
                        {selectedStudentDetail.section.name}
                      </p>
                      <p className="text-[10px] text-text-muted truncate">
                        {selectedStudentDetail.section.subject}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleModalUnenroll}
                    disabled={updatingSection}
                    className="text-xs font-semibold text-burgundy-light hover:text-burgundy hover:underline transition-colors cursor-pointer shrink-0 ml-2"
                    title="Remove student from this section roster"
                  >
                    {updatingSection ? "Removing..." : "Remove from Roster"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-surface-subtle p-3 border border-border-emphasis text-xs text-text-muted">
                  <span className="flex h-2 w-2 rounded-full bg-cream-border shrink-0" />
                  <span>Not enrolled in any class roster (Directory only)</span>
                </div>
              )}

              {/* Assign or Transfer Section */}
              <div className="space-y-2 pt-1 border-t border-border-default/60">
                <label className="block text-[11px] font-semibold text-text-secondary">
                  Assign or Change Class Section:
                </label>
                <CustomSelect
                  value={modalTargetSection}
                  onChange={(val) => setModalTargetSection(val)}
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
                {modalTargetSection !== (selectedStudentDetail.section_id || "") && (
                  <button
                    type="button"
                    onClick={handleModalUpdateSection}
                    disabled={updatingSection}
                    className="w-full flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-2 px-3 text-xs font-semibold text-text-primary shadow-sm hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {updatingSection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    <span>Save Section Assignment</span>
                  </button>
                )}
              </div>
            </div>

            {/* Account Security & Password Reset */}
            <div className="rounded-2xl bg-surface-base p-4 border border-border-default space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-steel" />
                  <span className="text-xs font-bold text-text-primary">Account Security & Credentials</span>
                </div>
                <span className="rounded-full bg-sage-ghost px-2 py-0.5 text-[10px] font-semibold text-sage border border-sage-border">
                  Active Account
                </span>
              </div>

              {tempPasswordIssued ? (
                <div className="rounded-xl border border-sage-border bg-sage-ghost/15 p-3.5 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sage flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      New Temporary Password Generated!
                    </span>
                    <button
                      type="button"
                      onClick={() => setTempPasswordIssued(null)}
                      className="text-[10px] text-text-muted hover:text-text-primary cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-surface-base border border-border-emphasis px-3 py-2 text-xs font-mono">
                    <span className="font-bold text-steel-light text-sm tracking-wider">
                      {tempPasswordIssued.tempPassword}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyTempPassword}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                    >
                      {copiedTempPassword ? <Check className="h-3.5 w-3.5 text-sage" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedTempPassword ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-text-muted leading-relaxed">
                    Give this temporary password to {selectedStudentDetail.user.first_name}. They will be prompted to set their own secure password on next login.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDirectPasswordReset}
                  disabled={resettingPassword}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-steel/30 bg-steel/10 py-2.5 px-4 text-xs font-semibold text-steel-light hover:bg-steel/20 hover:border-steel/50 transition-all cursor-pointer disabled:opacity-50"
                >
                  {resettingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating Temporary Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4 text-steel" />
                      <span>Reset Student Password</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Footer with permanent delete option */}
            <div className="flex items-center justify-between pt-2 border-t border-border-default">
              <button
                type="button"
                onClick={() => {
                  setStudentToPermanentlyDelete(selectedStudentDetail);
                }}
                className="text-xs text-burgundy-light hover:text-burgundy hover:underline flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Permanently Delete Student</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="rounded-xl border border-border-emphasis bg-surface-subtle px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <CustomSelect
                      value={studentTargetSection}
                      onChange={(val) => setStudentTargetSection(val)}
                      placeholder="None (Keep unassigned in Student Directory)"
                      options={[
                        { value: "", label: "None (Keep unassigned in Student Directory)" },
                        ...sections.map((sec) => ({
                          value: sec.id,
                          label: sec.name,
                          badge: sec.subject,
                        })),
                      ]}
                    />
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

      {/* Excel / CSV Bulk Upload Modal */}
      {isCsvUploadOpen && selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-start justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-ghost text-sage border border-sage-border">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-primary">Import Students from Excel / CSV</h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Class: <span className="text-text-primary font-semibold">{selectedSection.name}</span> ({selectedSection.subject})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCsvResult(null);
                  setIsCsvUploadOpen(false);
                }}
                className="rounded-xl bg-surface-subtle p-2 text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Upload your official school roster file (<strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong>). The system automatically reads only the <strong>ID</strong> and <strong>Name</strong> columns.
            </p>

            {/* Expected format hint */}
            <div className="rounded-xl border border-border-default bg-surface-base/80 p-3 text-xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                Supported Column Layout
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead>
                    <tr className="border-b border-border-default text-text-muted">
                      <th className="pb-1 pr-3">ID</th>
                      <th className="pb-1 pr-3">Name</th>
                      <th className="pb-1 text-text-faint">Other columns (ignored)</th>
                    </tr>
                  </thead>
                  <tbody className="text-text-secondary divide-y divide-border-default/40">
                    <tr>
                      <td className="py-1 pr-3 text-tan">2000361208</td>
                      <td className="py-1 pr-3">BONGCARAS</td>
                      <td className="py-1 text-text-faint">SGB, Plan, 3y1...</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-3 text-tan">2000357470</td>
                      <td className="py-1 pr-3">AGUILAR,CHRISTIAN BARIAS</td>
                      <td className="py-1 text-text-faint">SGB, Plan, 4y1...</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-text-muted pt-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-sage shrink-0" />
                <span>Full Names formatted as <code className="text-tan">LASTNAME,FIRSTNAME</code> are automatically parsed into first and last names.</span>
              </p>
            </div>

            {csvResult ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-sage-ghost border border-sage-border p-4 text-xs">
                  <p className="font-bold text-sage mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Successfully enrolled {csvResult.created} students into this class!
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 font-mono text-[11px] pr-1">
                    {csvResult.students.map((s, idx) => (
                      <div key={idx} className="rounded-lg bg-surface-base/60 p-2 border border-border-default/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div>
                          <strong className="text-text-primary">{s.user.first_name} {s.user.last_name}</strong>
                          <span className="text-text-muted block text-[10px]">
                            ID: 02000{String(s.student_number).padStart(6, "0")} • Username: @{s.user.username}
                          </span>
                        </div>
                        {s.temp_password && (
                          <span className="rounded bg-steel/15 px-2 py-0.5 text-[10px] font-bold text-steel-light border border-steel/30 self-start sm:self-auto">
                            Pass: {s.temp_password}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCsvResult(null);
                    setIsCsvUploadOpen(false);
                  }}
                  className="w-full rounded-xl gradient-bg-primary py-2.5 text-xs font-bold text-text-primary cursor-pointer hover:opacity-95"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCsvUpload} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="rounded-xl border border-dashed border-border-emphasis bg-surface-base p-6 text-center space-y-2">
                  <FileSpreadsheet className="mx-auto h-8 w-8 text-sage mb-1" />
                  <p className="text-xs font-semibold text-text-primary">
                    Select your Excel or CSV file
                  </p>
                  <p className="text-[11px] text-text-muted">
                    Supports .xlsx, .xls, and .csv files
                  </p>
                  <input
                    id="student-excel-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    required
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="text-xs text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sage-ghost file:text-sage hover:file:bg-sage-ghost cursor-pointer mx-auto block mt-2"
                  />
                  {csvFile && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface-subtle border border-border-default px-3 py-1 text-xs text-sage font-semibold">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      {csvFile.name}
                    </div>
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
                    id="submit-excel-import"
                    disabled={submitting || !csvFile}
                    className="w-1/2 flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-2.5 text-xs font-bold text-text-primary shadow-lg shadow-steel/20 disabled:opacity-50 cursor-pointer hover:opacity-95"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Import Students
                      </>
                    )}
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
        loading={deletingSection}
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
        loading={unrollingStudent}
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
        loading={permanentlyDeletingStudent}
        title="Permanently Delete Student Account"
        message={`Are you sure you want to permanently delete the account for ${studentToPermanentlyDelete?.user.first_name} ${studentToPermanentlyDelete?.user.last_name} (ID: 02000${String(studentToPermanentlyDelete?.student_number).padStart(6, "0")})? This action cannot be undone.`}
        confirmText="Permanently Delete"
        cancelText="Cancel"
        variant="danger"
        icon={<Trash2 className="h-5 w-5 text-burgundy-light" />}
        onConfirm={confirmPermanentDeleteStudent}
        onCancel={() => setStudentToPermanentlyDelete(null)}
      />
      {/* Assign Exam to Section Modal */}
      {isAssignExamOpen && selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-text-primary">Assign Exam to {selectedSection.name}</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Select an exam from your Exam Bank to schedule an online quiz or paper exam for this class.
                </p>
              </div>
              <button
                onClick={() => setIsAssignExamOpen(false)}
                className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Bank Exams */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                placeholder="Search exam by title..."
                className="w-full rounded-xl border border-border-emphasis bg-surface-base pl-9 pr-3.5 py-2.5 text-xs text-text-primary focus:border-steel focus:outline-none"
              />
            </div>

            {/* Exam List */}
            <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
              {availableToAssignExams.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-emphasis p-8 text-center space-y-3">
                  <FileCheck className="mx-auto h-8 w-8 text-text-faint" />
                  <p className="text-xs text-text-muted">
                    {assignSearch
                      ? "No unassigned exams matching your search."
                      : teacherBankExams.length === 0
                      ? "You haven't created any exams in your Exam Bank yet."
                      : "All exams from your Exam Bank are already assigned to this class."}
                  </p>
                  <Link
                    href="/teacher/exams"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-tan hover:bg-surface-muted transition-colors"
                  >
                    Go to Exam Bank &rarr;
                  </Link>
                </div>
              ) : (
                availableToAssignExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border-default bg-surface-subtle p-3.5 hover:border-steel/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-text-primary truncate">{exam.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted">
                        <span>{exam.total_questions} Questions</span>
                        <span>•</span>
                        <span>{exam.answer_keys?.length || 0} Keys</span>
                        {exam.questions && exam.questions.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-sage">{exam.questions.length} Reviewer Qs</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAssignExamToSection(exam.id)}
                      disabled={assigningExamId === exam.id}
                      className="shrink-0 flex items-center gap-1.5 rounded-xl gradient-bg-primary px-3.5 py-1.5 text-xs font-semibold text-text-primary shadow-sm hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
                    >
                      {assigningExamId === exam.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          Assign to Class
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border-default/60">
              <button
                type="button"
                onClick={() => setIsAssignExamOpen(false)}
                className="rounded-xl border border-border-emphasis bg-surface-subtle px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-muted transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exam Unassign Confirmation Modal */}
      <ConfirmModal
        isOpen={!!examToUnassign}
        loading={unassigningExam}
        title="Remove Exam from Class"
        message={`Are you sure you want to remove "${examToUnassign?.exam?.title || "this exam"}" from ${selectedSection?.name}? The exam questionnaire and answer keys remain safe in your Exam Bank. Student submissions will be preserved.`}
        confirmText="Remove Exam"
        cancelText="Cancel"
        variant="danger"
        icon={<Trash2 className="h-5 w-5 text-burgundy-light" />}
        onConfirm={confirmUnassignExam}
        onCancel={() => setExamToUnassign(null)}
      />

      {/* Live Exam Monitor & Lobby Proctoring Modal */}
      {monitoringSectionExam && selectedSection && (
        <LiveExamMonitorModal
          isOpen={!!monitoringSectionExam}
          onClose={() => setMonitoringSectionExam(null)}
          sectionId={selectedSection.id}
          sectionName={selectedSection.name}
          examId={monitoringSectionExam.exam_id}
          examTitle={monitoringSectionExam.exam?.title || "Class Exam"}
          totalQuestions={monitoringSectionExam.exam?.total_questions || 50}
          onStatusChanged={(isOnline, isStarted) => {
            setSectionExams((prev) =>
              prev.map((item) =>
                item.id === monitoringSectionExam.id
                  ? { ...item, is_online_active: isOnline, is_started: isStarted }
                  : item
              )
            );
          }}
        />
      )}


      {/* ── MODAL: EDIT SECTION & SUBJECT ─────────────────────── */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-border-default bg-surface-raised p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tan-ghost text-tan border border-tan-border">
                  <Pencil className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-primary">Edit Section & Subject</h2>
                  <p className="text-[11px] text-text-muted">Update class section name and course subject.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-subtle cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editSectionError && (
              <div className="flex items-center gap-2 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editSectionError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSectionEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Section / Class Name <span className="text-burgundy">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editSectionName}
                  onChange={(e) => setEditSectionName(e.target.value)}
                  placeholder="e.g. BSIT 3-A"
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3 py-2 text-xs text-text-primary placeholder-text-faint focus:border-steel focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Subject / Course Name <span className="text-burgundy">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editSectionSubject}
                  onChange={(e) => setEditSectionSubject(e.target.value)}
                  placeholder="e.g. Data Structures & Algorithms"
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3 py-2 text-xs text-text-primary placeholder-text-faint focus:border-steel focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="flex-1 rounded-xl border border-border-default bg-surface-base py-2.5 text-xs font-bold text-text-muted hover:text-text-primary hover:bg-surface-subtle cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSection}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl gradient-bg-primary py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingSection ? (
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

      {/* ── MODAL: EDIT STUDENT NAME & DETAILS ─────────────────── */}
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

            {editStudentError && (
              <div className="flex items-center gap-2 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editStudentError}</span>
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
                    value={editStudentFirstName}
                    onChange={(e) => setEditStudentFirstName(e.target.value)}
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
                    value={editStudentLastName}
                    onChange={(e) => setEditStudentLastName(e.target.value)}
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
                  value={editStudentSectionId}
                  onChange={(val) => setEditStudentSectionId(val)}
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
                  disabled={savingStudent}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl gradient-bg-primary py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingStudent ? (
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

      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
}

