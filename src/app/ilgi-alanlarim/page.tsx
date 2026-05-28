import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { InterestsContent } from "@/components/profile/InterestsContent";
import { getActiveCategories, getUserInterests } from "@/lib/fair-queries";

export const dynamic = "force-dynamic";

export default async function IlgiAlanlarimPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?next=/ilgi-alanlarim");
  }

  const [categories, userInterests] = await Promise.all([
    getActiveCategories(),
    getUserInterests(session.user.id),
  ]);

  return (
    <InterestsContent
      categories={categories}
      selectedCategoryIds={userInterests.map((interest) => interest.id)}
    />
  );
}
