import { notFound } from "next/navigation";

import { AdminFairForm } from "@/components/admin/AdminFairForm";
import { getAdminFairById, getAdminTaxonomy } from "@/lib/admin-fair-queries";
import {
  sourceNameValues,
  type SourceNameValue,
} from "@/lib/admin-fair-options";

type EditAdminFairPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditAdminFairPage({
  params,
}: EditAdminFairPageProps) {
  const { id } = await params;
  const [fair, taxonomy] = await Promise.all([
    getAdminFairById(id),
    getAdminTaxonomy(),
  ]);

  if (!fair) {
    notFound();
  }

  return (
    <AdminFairForm
      fair={{
        categoryIds: fair.categories.map(({ categoryId }) => categoryId),
        city: fair.city,
        description: fair.description ?? "",
        district: fair.district ?? "",
        endDate: toDateTimeInputValue(fair.endDate),
        hall: fair.hall ?? "",
        id: fair.id,
        imageUrl: fair.imageUrl ?? "",
        isFeatured: fair.isFeatured,
        isIstanbulPriority: fair.isIstanbulPriority,
        isPublished: fair.isPublished,
        name: fair.name,
        officialWebsite: fair.officialWebsite ?? "",
        organizer: fair.organizer ?? "",
        slug: fair.slug,
        sourceName: toEditableSourceName(fair.sources[0]?.sourceName),
        sourceUrl: fair.sources[0]?.sourceUrl ?? "",
        startDate: toDateTimeInputValue(fair.startDate),
        status: fair.status,
        subcategoryIds: fair.subcategories.map(
          ({ subcategoryId }) => subcategoryId,
        ),
        venue: fair.venue,
      }}
      mode="edit"
      taxonomy={taxonomy}
    />
  );
}

function toDateTimeInputValue(date: Date) {
  return date.toISOString().slice(0, 16);
}

function toEditableSourceName(
  sourceName: string | null | undefined,
): SourceNameValue | "" {
  return sourceNameValues.includes(sourceName as SourceNameValue)
    ? (sourceName as SourceNameValue)
    : "";
}
