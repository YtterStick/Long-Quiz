import { DashboardBackdrop } from "@/components/ui/DashboardBackdrop";

/**
 * Shared shell for every /admin/* page — adds the soft, tan-tinted
 * education doodle backdrop (same visual language as the login screen).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen">
      <DashboardBackdrop role="admin" />
      {children}
    </div>
  );
}
