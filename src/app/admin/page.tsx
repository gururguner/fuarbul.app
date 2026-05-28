import { AdminDashboardContent } from "@/components/admin/AdminDashboardContent";
import { getAdminFairStats } from "@/lib/admin-fair-queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const stats = await getAdminFairStats();

  return <AdminDashboardContent stats={stats} />;
}
