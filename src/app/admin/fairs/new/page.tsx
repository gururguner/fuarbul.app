import { AdminFairForm } from "@/components/admin/AdminFairForm";
import { getAdminTaxonomy } from "@/lib/admin-fair-queries";

export const dynamic = "force-dynamic";

export default async function NewAdminFairPage() {
  const taxonomy = await getAdminTaxonomy();

  return <AdminFairForm mode="create" taxonomy={taxonomy} />;
}
