import { DashboardBackdrop } from "@/components/ui/DashboardBackdrop";

/**
 * Shared shell for every /teacher/* page (dashboard, sections, exams, scan) —
 * adds the soft, steel-tinted education doodle backdrop.
 */
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen">
      <DashboardBackdrop role="teacher" />
      {children}
    </div>
  );
}
