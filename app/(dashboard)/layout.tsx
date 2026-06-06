import { AuthGuard } from "@/components/AuthGuard";
import { NotificationSheet } from "@/components/organisms/NotificationSheet";
import { SearchDialog } from "@/components/organisms/SearchDialog";
import { MobileSidebar, Sidebar } from "@/components/organisms/Sidebar";
import { Topbar } from "@/components/organisms/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-[#F4F6F8]">
        <Sidebar />
        <MobileSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
            {children}
          </main>
        </div>
        <NotificationSheet />
        <SearchDialog />
      </div>
    </AuthGuard>
  );
}
