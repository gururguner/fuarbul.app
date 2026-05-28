import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { FollowingPageContent } from "@/components/fairs/FollowingPageContent";
import { getFollowedFairsByUser } from "@/lib/fair-queries";

export const dynamic = "force-dynamic";

export default async function FollowingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?next=/following");
  }

  const fairs = await getFollowedFairsByUser(session.user.id);

  return <FollowingPageContent fairs={fairs} />;
}
