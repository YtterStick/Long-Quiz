/**
 * API client for communicating with the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** What students see once grades are released for a class exam. */
export type ReleaseMode = "FULL" | "SCORES_ONLY";

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, isFormData = false } = options;
  const token = getToken();

  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  if (!isFormData && body) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body) {
    config.body = isFormData ? (body as FormData) : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, config);
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
      throw new Error("Unable to connect to the server. Please ensure the backend is running.");
    }
    throw err;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Request failed" }));
    let detail = "Request failed";
    if (typeof errorData.detail === "string") {
      detail = errorData.detail;
    } else if (Array.isArray(errorData.detail) && errorData.detail[0]?.msg) {
      detail = errorData.detail[0].msg;
    }
    throw new ApiError(response.status, detail);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}

// ─── Auth ─────────────────────────────────────────────────────
export const auth = {
  login: (username: string, password: string) =>
    request<{
      access_token: string;
      role: string;
      must_change_password: boolean;
      user_id: string;
    }>("/api/auth/login", {
      method: "POST",
      body: { username, password },
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request("/api/auth/change-password", {
      method: "POST",
      body: { current_password: currentPassword, new_password: newPassword },
    }),

  requestStudentPasswordReset: (identifier: string) =>
    request<{
      message: string;
      student_name: string;
      student_id: string;
    }>("/api/auth/student-reset-request", {
      method: "POST",
      body: { identifier },
    }),

  getMe: () => request<{
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    must_change_password: boolean;
  }>("/api/auth/me"),
};

// ─── Admin ────────────────────────────────────────────────────
export const admin = {
  getDashboard: () =>
    request<{
      total_teachers: number;
      total_students: number;
      total_sections: number;
      total_exams: number;
      total_submissions: number;
    }>("/api/admin/dashboard"),

  listTeachers: () => request<Array<{
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
  }>>("/api/admin/teachers"),

  createTeacher: (data: {
    username?: string;
    first_name: string;
    last_name: string;
    role: string;
    password?: string;
  }) =>
    request<{ message: string; user_id: string; username: string; temp_password: string }>(
      "/api/admin/teachers", { method: "POST", body: data }
    ),

  updateTeacher: (userId: string, data: {
    first_name?: string;
    last_name?: string;
    is_active?: boolean;
  }) => request("/api/admin/teachers/" + userId, { method: "PUT", body: data }),

  deleteTeacher: (userId: string) =>
    request("/api/admin/teachers/" + userId, { method: "DELETE" }),
};

// ─── Teacher ──────────────────────────────────────────────────
export const teacher = {
  getDashboard: () =>
    request<{
      total_sections: number;
      total_students: number;
      total_exams: number;
      total_submissions: number;
    }>("/api/teacher/dashboard"),

  // Sections
  listSections: () => request<Array<{
    id: string;
    name: string;
    subject: string;
    teacher_id: string;
    created_at: string;
    student_count: number;
  }>>("/api/teacher/sections"),

  createSection: (data: { name: string; subject: string }) =>
    request("/api/teacher/sections", { method: "POST", body: data }),

  updateSection: (id: string, data: { name?: string; subject?: string }) =>
    request("/api/teacher/sections/" + id, { method: "PUT", body: data }),

  deleteSection: (id: string) =>
    request("/api/teacher/sections/" + id, { method: "DELETE" }),

  // Section Exams (Class Exam Administration)
  listSectionExams: (sectionId: string) =>
    request<Array<{
      id: string;
      section_id: string;
      exam_id: string;
      is_online_active: boolean;
      is_grades_released: boolean;
      is_started?: boolean;
      release_mode?: ReleaseMode;
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
    }>>(`/api/teacher/sections/${sectionId}/exams`),

  assignExamToSection: (sectionId: string, examId: string) =>
    request<{
      id: string;
      section_id: string;
      exam_id: string;
      is_online_active: boolean;
      is_grades_released: boolean;
      created_at: string;
    }>(`/api/teacher/sections/${sectionId}/exams`, {
      method: "POST",
      body: { exam_id: examId },
    }),

  unassignExamFromSection: (sectionId: string, examId: string) =>
    request(`/api/teacher/sections/${sectionId}/exams/${examId}`, {
      method: "DELETE",
    }),

  toggleSectionExamOnline: (sectionId: string, examId: string, is_online_active?: boolean) =>
    request<{
      id: string;
      section_id: string;
      exam_id: string;
      is_online_active: boolean;
      is_grades_released: boolean;
      created_at: string;
    }>(`/api/teacher/sections/${sectionId}/exams/${examId}/toggle-online`, {
      method: "PUT",
      body: is_online_active !== undefined ? { is_online_active } : undefined,
    }),

  toggleSectionExamGrades: (
    sectionId: string,
    examId: string,
    is_grades_released?: boolean,
    release_mode?: ReleaseMode
  ) =>
    request<{
      id: string;
      section_id: string;
      exam_id: string;
      is_online_active: boolean;
      is_grades_released: boolean;
      release_mode: ReleaseMode;
      created_at: string;
    }>(`/api/teacher/sections/${sectionId}/exams/${examId}/toggle-grades`, {
      method: "PUT",
      body:
        is_grades_released !== undefined || release_mode !== undefined
          ? { is_grades_released, release_mode }
          : undefined,
    }),

  allowStudentRetake: (sectionId: string, examId: string, studentId: string, reset_violations = true) =>
    request<{ message: string; student_id: string; next_attempt: number; had_submission: boolean }>(
      `/api/teacher/sections/${sectionId}/exams/${examId}/students/${studentId}/allow-retake`,
      { method: "POST", body: { reset_violations } }
    ),

  startSectionExam: (sectionId: string, examId: string, is_started: boolean) =>
    request<{ is_started: boolean; is_online_active: boolean }>(
      `/api/teacher/sections/${sectionId}/exams/${examId}/start`,
      { method: "PUT", body: { is_started } }
    ),

  monitorSectionExam: (sectionId: string, examId: string) =>
    request<{
      is_online_active: boolean;
      is_started: boolean;
      total_students: number;
      counts: { in_lobby: number; ready: number; taking: number; submitted: number; not_joined: number };
      students: Array<{
        student_id: string;
        student_number: number;
        name: string;
        status: "NOT_JOINED" | "DISCONNECTED" | "IN_LOBBY" | "TAKING" | "SUBMITTED";
        is_fullscreen: boolean;
        is_focused: boolean;
        violations: number;
        tab_switches: number;
        fullscreen_exits: number;
        attempt_number: number;
        retakes_granted: number;
        auto_submitted: boolean;
        is_online_submission: boolean;
        last_seen: string | null;
        submission_id: string | null;
        total_score: number | null;
        max_score: number | null;
        submitted_at: string | null;
        answers: Array<{ question_number: number; shaded_option: string | null; is_correct: boolean }>;
      }>;
    }>(`/api/teacher/sections/${sectionId}/exams/${examId}/monitor`),

  // Students
  listStudents: (sectionId: string) =>
    request<Array<{
      id: string;
      user_id: string;
      student_number: number;
      full_student_id?: string;
      section_id: string;
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
    }>>(`/api/teacher/sections/${sectionId}/students`),

  listAllStudents: (params?: { search?: string; unassigned_only?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.unassigned_only) q.append("unassigned_only", "true");
    const queryStr = q.toString() ? `?${q.toString()}` : "";
    return request<Array<{
      id: string;
      user_id: string;
      student_number: number;
      full_student_id?: string;
      section_id?: string | null;
      section?: {
        id: string;
        name: string;
        subject: string;
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
    }>>(`/api/teacher/students${queryStr}`);
  },

  createStudent: (data: { first_name: string; last_name: string; student_number?: number | string; username?: string; section_id?: string }) =>
    request<{
      id: string;
      user_id: string;
      student_number: number;
      full_student_id?: string;
      section_id?: string | null;
      user: { username: string };
      temp_password?: string;
    }>(`/api/teacher/students`, { method: "POST", body: data }),

  enrollStudent: (sectionId: string, studentId: string) =>
    request(`/api/teacher/sections/${sectionId}/enroll`, { method: "POST", body: { student_id: studentId } }),

  unenrollStudent: (sectionId: string, studentId: string) =>
    request(`/api/teacher/sections/${sectionId}/students/${studentId}`, { method: "DELETE" }),

  addStudent: (sectionId: string, data: { first_name: string; last_name: string; student_number?: number | string; username?: string }) =>
    request(`/api/teacher/sections/${sectionId}/students`, { method: "POST", body: data }),

  addStudentsCSV: (sectionId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ created: number; students: any[] }>(`/api/teacher/sections/${sectionId}/students/upload`, {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  },

  importStudentsExcel: (sectionId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ created: number; students: any[] }>(`/api/teacher/sections/${sectionId}/students/upload`, {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  },

  deleteStudent: (studentId: string) =>
    request(`/api/teacher/students/${studentId}`, { method: "DELETE" }),

  // Password Reset Management
  listPasswordResetRequests: () =>
    request<Array<{
      id: string;
      student_id: string;
      status: string;
      created_at: string;
      resolved_at?: string | null;
      student_name: string;
      student_username: string;
      student_number: number;
      full_student_id: string;
      section_name?: string | null;
      section_subject?: string | null;
    }>>("/api/teacher/password-reset-requests"),

  resetStudentPassword: (studentId: string) =>
    request<{
      student_id: string;
      student_name: string;
      username: string;
      full_student_id: string;
      temp_password: string;
      message: string;
    }>(`/api/teacher/students/${studentId}/reset-password`, {
      method: "POST",
    }),

  dismissPasswordResetRequest: (requestId: string) =>
    request<{ message: string }>(`/api/teacher/password-reset-requests/${requestId}/dismiss`, {
      method: "POST",
    }),

  // Exams
  listExams: (includePublic = false) =>
    request<Array<{
      id: string;
      teacher_id: string;
      title: string;
      total_questions: number;
      is_public: boolean;
      created_at: string;
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
    }>>(`/api/teacher/exams?include_public=${includePublic}`),

  createExam: (data: {
    title: string;
    total_questions: number;
    is_public: boolean;
    answer_keys: Array<{ question_number: number; correct_option: string }>;
    questions?: Array<{
      question_number: number;
      question_text: string;
      option_a?: string | null;
      option_b?: string | null;
      option_c?: string | null;
      option_d?: string | null;
      explanation?: string | null;
    }>;
  }) => request("/api/teacher/exams", { method: "POST", body: data }),

  getExam: (id: string) => request<{
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
  }>(`/api/teacher/exams/${id}`),

  updateExam: (id: string, data: {
    title?: string;
    total_questions?: number;
    is_public?: boolean;
    answer_keys?: Array<{ question_number: number; correct_option: string }>;
    questions?: Array<{
      question_number: number;
      question_text: string;
      option_a?: string | null;
      option_b?: string | null;
      option_c?: string | null;
      option_d?: string | null;
      explanation?: string | null;
    }>;
  }) => request(`/api/teacher/exams/${id}`, { method: "PUT", body: data }),

  updateQuestionnaire: (examId: string, questions: Array<{
    question_number: number;
    question_text: string;
    option_a?: string | null;
    option_b?: string | null;
    option_c?: string | null;
    option_d?: string | null;
    explanation?: string | null;
  }>) => request(`/api/teacher/exams/${examId}/questionnaire`, {
    method: "PUT",
    body: { questions },
  }),

  getQuestionnaire: (examId: string) => request<Array<{
    id: string;
    question_number: number;
    question_text: string;
    option_a?: string | null;
    option_b?: string | null;
    option_c?: string | null;
    option_d?: string | null;
    explanation?: string | null;
  }>>(`/api/teacher/exams/${examId}/questionnaire`),

  toggleExamVisibility: (examId: string, is_public: boolean) => request<{
    id: string;
    is_public: boolean;
    is_online_active: boolean;
    is_grades_released: boolean;
  }>(`/api/teacher/exams/${examId}/visibility`, {
    method: "PATCH",
    body: { is_public },
  }),

  toggleExamOnline: (examId: string, is_online_active?: boolean) =>
    request<{
      id: string;
      is_public: boolean;
      is_online_active: boolean;
      is_grades_released: boolean;
    }>(`/api/teacher/exams/${examId}/toggle-online`, {
      method: "PUT",
      body: is_online_active !== undefined ? { is_online_active } : undefined,
    }),

  toggleExamGradesRelease: (examId: string, is_grades_released?: boolean) =>
    request<{
      id: string;
      is_public: boolean;
      is_online_active: boolean;
      is_grades_released: boolean;
    }>(`/api/teacher/exams/${examId}/toggle-grades-release`, {
      method: "PUT",
      body: is_grades_released !== undefined ? { is_grades_released } : undefined,
    }),

  deleteExam: (id: string) =>
    request(`/api/teacher/exams/${id}`, { method: "DELETE" }),

  cloneExam: (id: string) =>
    request(`/api/teacher/exams/${id}/clone`, { method: "POST" }),

  // Bubble Sheet PDF
  getBlankBubbleSheetUrl: (questions: number = 50) =>
    `${API_BASE}/api/teacher/blank-bubble-sheet?questions=${questions}`,

  getBubbleSheetUrl: (examId: string) =>
    `${API_BASE}/api/teacher/exams/${examId}/bubble-sheet`,

  // Scanning
  scanAnswerKey: (file: File, totalQuestions: number = 50) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ answers: Record<number, string> }>(`/api/teacher/scan-key?total_questions=${totalQuestions}`, {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  },

  scanSheet: (examId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request(`/api/teacher/exams/${examId}/scan`, {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  },

  // Submissions
  listSubmissions: (examId: string) =>
    request<Array<{
      id: string;
      exam_id: string;
      student_id: string;
      total_score: number;
      max_score: number;
      scanned_image_url: string;
      is_published: boolean;
      scanned_at: string;
      answers: Array<{
        id: string;
        question_number: number;
        shaded_option: string | null;
        is_correct: boolean;
      }>;
      student: {
        id: string;
        student_number: number;
        user: { first_name: string; last_name: string };
      };
    }>>(`/api/teacher/exams/${examId}/submissions`),

  overrideSubmission: (submissionId: string, answers: Array<{ question_number: number; correct_option: string }>) =>
    request(`/api/teacher/submissions/${submissionId}/override`, {
      method: "PUT",
      body: { answers },
    }),

  publishSubmission: (submissionId: string) =>
    request(`/api/teacher/submissions/${submissionId}/publish`, { method: "PUT" }),

  publishAllSubmissions: (examId: string) =>
    request(`/api/teacher/exams/${examId}/publish-all`, { method: "PUT" }),

  // Analytics
  getItemAnalysis: (examId: string) =>
    request<Array<{
      question_number: number;
      correct_count: number;
      total_count: number;
      correct_percentage: number;
      option_distribution: Record<string, number>;
    }>>(`/api/teacher/exams/${examId}/analytics`),

  getGradebook: (sectionId: string) =>
    request<Array<{
      student_id: string;
      student_number: number;
      name: string;
      total_exams_taken: number;
      average_score: number;
      exams: Array<{
        exam_title: string;
        score: number;
        max_score: number;
        percentage: number;
      }>;
    }>>(`/api/teacher/sections/${sectionId}/gradebook`),
};

// ─── Student ──────────────────────────────────────────────────
export const student = {
  getDashboard: () =>
    request<{
      student_number: number;
      full_student_id?: string;
      static_prefix?: string;
      section_id: string;
      first_name: string;
      last_name: string;
      total_exams: number;
      average_percentage: number;
    }>("/api/student/dashboard"),

  getGrades: () =>
    request<Array<{
      exam_id: string;
      exam_title: string;
      total_score: number;
      max_score: number;
      percentage: number;
      scanned_image_url: string | null;
      is_published: boolean;
      is_public: boolean;
      scanned_at: string;
      answers: Array<{
        id: string;
        question_number: number;
        shaded_option: string | null;
        is_correct: boolean;
      }>;
      answer_keys: Array<{
        id: string;
        question_number: number;
        correct_option: string;
      }>;
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
    }>>("/api/student/grades"),

  getPublicReviewers: () =>
    request<Array<{
      id: string;
      title: string;
      total_questions: number;
      is_public: boolean;
      created_at: string;
      answer_keys: Array<{ id: string; question_number: number; correct_option: string }>;
      questions: Array<{
        id: string;
        question_number: number;
        question_text: string;
        option_a?: string | null;
        option_b?: string | null;
        option_c?: string | null;
        option_d?: string | null;
        explanation?: string | null;
      }>;
    }>>("/api/student/reviewer/public-exams"),

  listAvailableExams: () =>
    request<Array<{
      id: string;
      title: string;
      total_questions: number;
      is_public: boolean;
      created_at: string;
      teacher_name: string;
      question_count: number;
      has_submitted: boolean;
      submission_id?: string | null;
      total_score?: number | null;
      max_score?: number | null;
      percentage?: number | null;
      submitted_at?: string | null;
    }>>("/api/student/available-exams"),

  getExamForTaking: (examId: string) =>
    request<{
      id: string;
      title: string;
      total_questions: number;
      is_public: boolean;
      created_at: string;
      teacher_name: string;
      has_submitted: boolean;
      submission_id?: string | null;
      total_score?: number | null;
      max_score?: number | null;
      percentage?: number | null;
      questions: Array<{
        question_number: number;
        question_text: string;
        option_a?: string | null;
        option_b?: string | null;
        option_c?: string | null;
        option_d?: string | null;
      }>;
    }>(`/api/student/exams/${examId}`),

  submitExamOnline: (
    examId: string,
    data: {
      answers: Array<{
        question_number: number;
        selected_option: string;
      }>;
      auto_submitted?: boolean;
    }
  ) =>
    request<{
      message: string;
      submission_id: string;
      exam_id: string;
      exam_title: string;
      has_submitted?: boolean;
      is_grades_released?: boolean;
      total_score?: number | null;
      max_score?: number | null;
      percentage?: number | null;
      submitted_at?: string;
    }>(`/api/student/exams/${examId}/submit`, {
      method: "POST",
      body: data,
    }),

  pingLobby: (
    examId: string,
    data: {
      is_fullscreen: boolean;
      is_focused: boolean;
      violation?: boolean;
      violation_type?: "TAB" | "FULLSCREEN";
    }
  ) =>
    request<{
      status: "CLOSED" | "WAITING" | "STARTED" | "SUBMITTED";
      title: string;
      total_questions: number;
      teacher_name: string;
    }>(`/api/student/exams/${examId}/lobby`, {
      method: "POST",
      body: data,
    }),
};

export { ApiError };

