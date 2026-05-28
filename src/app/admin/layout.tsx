import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminUnauthorized } from "@/components/admin/AdminUnauthorized";
import { auth } from "@/auth";
import { isCurrentUserAdmin } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?next=/admin");
  }

  if (!(await isCurrentUserAdmin())) {
    return <AdminUnauthorized />;
  }

  return children;
}
