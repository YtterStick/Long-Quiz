import { DashboardBackdrop } from "@/components/ui/DashboardBackdrop";

/**
 * Shared shell for every /student/* page — adds the soft, sage-tinted
 * education doodle backdrop.
 */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen">
      <DashboardBackdrop role="student" />
      {children}
    </div>
  );
}
