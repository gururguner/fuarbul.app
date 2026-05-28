import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin";
import { importTobbFairs } from "@/lib/importers/tobb-importer";

const maxFileSize = 10 * 1024 * 1024;
const allowedExtensions = [".xlsx", ".xls"];

export const runtime = "nodejs";

export async function POST(request: Request) {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const autoPublishHighConfidence =
      formData.get("autoPublishHighConfidence") === "true";
    const dryRun = formData.get("dryRun") === "true";
    const sourceUrl = getFormString(formData, "sourceUrl");
    const file = formData.get("file");
    const input = await getImportInput({ file, sourceUrl });
    const result = await importTobbFairs({
      adminUserId: adminUser.id,
      autoPublishHighConfidence,
      buffer: input.buffer,
      dryRun,
      sourceUrl: input.sourceUrl,
    });

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "import_failed" },
      { status: 400 },
    );
  }
}

async function getImportInput({
  file,
  sourceUrl,
}: {
  file: FormDataEntryValue | null;
  sourceUrl: string;
}) {
  if (file instanceof File && file.size > 0) {
    validateFileName(file.name);

    if (file.size > maxFileSize) {
      throw new Error("file_too_large");
    }

    return {
      buffer: Buffer.from(await file.arrayBuffer()),
      sourceUrl: sourceUrl || null,
    };
  }

  if (!sourceUrl) {
    throw new Error("missing_import_source");
  }

  const url = validateImportUrl(sourceUrl);
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("url_fetch_failed");
  }

  const contentLength = response.headers.get("content-length");

  if (contentLength && Number(contentLength) > maxFileSize) {
    throw new Error("file_too_large");
  }

  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength > maxFileSize) {
    throw new Error("file_too_large");
  }

  return {
    buffer: Buffer.from(arrayBuffer),
    sourceUrl: url.toString(),
  };
}

function validateFileName(fileName: string) {
  const lowerFileName = fileName.toLowerCase();

  if (!allowedExtensions.some((extension) => lowerFileName.endsWith(extension))) {
    throw new Error("invalid_file_type");
  }
}

function validateImportUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("invalid_url");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("invalid_url");
  }

  validateFileName(url.pathname);

  return url;
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}
