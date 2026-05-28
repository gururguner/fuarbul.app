import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ProfileContent } from "@/components/profile/ProfileContent";
import { getUserInterests } from "@/lib/fair-queries";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.email || !session.user.id) {
    redirect("/login?next=/profile");
  }

  const [user, interests] = await Promise.all([
    prisma.user.findFirst({
      where: {
        OR: [
          {
            id: session.user.id,
          },
          {
            email: session.user.email,
          },
        ],
      },
      select: {
        birthDate: true,
        city: true,
        email: true,
        gender: true,
        name: true,
        phone: true,
        profession: true,
        surname: true,
      },
    }),
    getUserInterests(session.user.id),
  ]);

  if (!user) {
    redirect("/login?next=/profile");
  }

  const notificationPreferences =
    await prisma.notificationPreference.upsert({
      create: {
        userId: session.user.id,
      },
      update: {},
      where: {
        userId: session.user.id,
      },
      select: {
        emailEnabled: true,
        inAppEnabled: true,
        remindFairStarted: true,
        remindOneDayBefore: true,
        remindSevenDaysBefore: true,
        remindThirtyDaysBefore: true,
      },
    });

  return (
    <ProfileContent
      interests={interests}
      notificationPreferences={notificationPreferences}
      showDevEmailTest={process.env.NODE_ENV !== "production"}
      user={{
        ...user,
        birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : "",
      }}
    />
  );
}
