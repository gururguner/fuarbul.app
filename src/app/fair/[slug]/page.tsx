import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { FairDetail } from "@/components/fairs/FairDetail";
import { getFairBySlug, getIsFairFollowedByUser } from "@/lib/fair-queries";
import { getLocalizedFair } from "@/lib/fairs";
import { defaultLocale, translate } from "@/lib/i18n";

type FairDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: FairDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const fair = await getFairBySlug(slug);

  if (!fair) {
    return {
      title: translate("fairDetail.notFoundTitle"),
    };
  }

  const displayFair = getLocalizedFair(fair, defaultLocale);

  return {
    title: displayFair.name,
    description: displayFair.summary,
  };
}

export default async function FairDetailPage({ params }: FairDetailPageProps) {
  const { slug } = await params;
  const [fair, session] = await Promise.all([getFairBySlug(slug), auth()]);

  if (!fair) {
    notFound();
  }

  const isFollowing = await getIsFairFollowedByUser(
    fair.id,
    session?.user?.id,
  );

  return <FairDetail fair={fair} isFollowing={isFollowing} />;
}
