import "server-only";

import {
  discoverOfficialWebsiteImage,
  isWeakOrGenericImageUrl,
} from "@/lib/image-discovery";
import { prisma } from "@/lib/prisma";

export type FairImageBackfillResult = {
  failedCount: number;
  scannedCount: number;
  skippedCount: number;
  updatedCount: number;
};

export async function updateMissingFairImages(): Promise<FairImageBackfillResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fairs = await prisma.fair.findMany({
    where: {
      endDate: {
        gte: today,
      },
      isPublished: true,
      officialWebsite: {
        not: null,
      },
      status: {
        notIn: ["ARCHIVED", "CANCELLED"],
      },
    },
    orderBy: {
      startDate: "asc",
    },
    select: {
      id: true,
      imageUrl: true,
      officialWebsite: true,
    },
  });
  const records = fairs.filter(
    (fair) => !fair.imageUrl || isWeakOrGenericImageUrl(fair.imageUrl),
  );
  const result: FairImageBackfillResult = {
    failedCount: 0,
    scannedCount: records.length,
    skippedCount: 0,
    updatedCount: 0,
  };

  await runWithConcurrency(records, 4, async (fair) => {
    try {
      if (!fair.officialWebsite) {
        result.skippedCount += 1;
        return;
      }

      const discoveredImage = await discoverOfficialWebsiteImage(fair.officialWebsite);

      if (!discoveredImage) {
        result.skippedCount += 1;
        return;
      }

      await prisma.fair.update({
        data: {
          imageUrl: discoveredImage.imageUrl,
        },
        where: {
          id: fair.id,
        },
      });
      result.updatedCount += 1;
    } catch {
      result.failedCount += 1;
    }
  });

  return result;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let index = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    async () => {
      while (index < items.length) {
        const item = items[index];
        index += 1;
        await worker(item);
      }
    },
  );

  await Promise.all(workers);
}

export async function discoverImportImage({
  currentImageUrl,
  existingImageUrl,
  officialWebsite,
}: {
  currentImageUrl?: string | null;
  existingImageUrl?: string | null;
  officialWebsite?: string | null;
}) {
  if (!officialWebsite) {
    return currentImageUrl ?? null;
  }

  if (currentImageUrl && !isWeakOrGenericImageUrl(currentImageUrl)) {
    return currentImageUrl;
  }

  if (existingImageUrl && !isWeakOrGenericImageUrl(existingImageUrl)) {
    return existingImageUrl;
  }

  const discoveredImage = await discoverOfficialWebsiteImage(officialWebsite);

  return discoveredImage?.imageUrl ?? currentImageUrl ?? existingImageUrl ?? null;
}
