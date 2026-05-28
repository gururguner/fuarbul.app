import { auth } from "@/auth";
import { HomePageContent } from "@/components/fairs/HomePageContent";
import {
  getFeaturedFairs,
  getRecommendedFairsForUser,
  getUpcomingFairs,
  getUserInterests,
} from "@/lib/fair-queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id;
  const [upcomingFairs, featuredFairs, userInterests, recommendedFairs] =
    await Promise.all([
      getUpcomingFairs(3),
      getFeaturedFairs(),
      userId ? getUserInterests(userId) : Promise.resolve([]),
      userId ? getRecommendedFairsForUser(userId, 3) : Promise.resolve([]),
    ]);

  return (
    <HomePageContent
      featuredFairs={featuredFairs.slice(0, 3)}
      hasSelectedInterests={userInterests.length > 0}
      recommendedFairs={recommendedFairs}
      upcomingFairs={upcomingFairs}
    />
  );
}
