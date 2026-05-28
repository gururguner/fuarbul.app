import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin";
import { importIfmFairs } from "@/lib/importers/ifm-importer";

const maxSourceSize = 3 * 1024 * 1024;

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
    const pastedText = getFormString(formData, "sourceText");
    const input = await getImportInput({ pastedText, sourceUrl });
    const result = await importIfmFairs({
      adminUserId: adminUser.id,
      autoPublishHighConfidence,
      dryRun,
      sourceText: input.sourceText,
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
  pastedText,
  sourceUrl,
}: {
  pastedText: string;
  sourceUrl: string;
}) {
  if (pastedText) {
    if (new Blob([pastedText]).size > maxSourceSize) {
      throw new Error("source_too_large");
    }

    return {
      sourceText: pastedText,
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

  if (contentLength && Number(contentLength) > maxSourceSize) {
    throw new Error("source_too_large");
  }

  const sourceText = await response.text();

  if (new Blob([sourceText]).size > maxSourceSize) {
    throw new Error("source_too_large");
  }

  return {
    sourceText,
    sourceUrl: url.toString(),
  };
}

function validateImportUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("invalid_url");
  }

  if (!["http:", "https:"].includes(url.protocol) || isBlockedHostname(url.hostname)) {
    throw new Error("invalid_url");
  }

  return url;
}

function isBlockedHostname(hostname: string) {
  const normalizedHost = hostname.toLowerCase();

  if (
    normalizedHost === "localhost" ||
    normalizedHost === "0.0.0.0" ||
    normalizedHost === "::1" ||
    normalizedHost.endsWith(".local")
  ) {
    return true;
  }

  if (
    normalizedHost.startsWith("127.") ||
    normalizedHost.startsWith("10.") ||
    normalizedHost.startsWith("192.168.")
  ) {
    return true;
  }

  const private172 = normalizedHost.match(/^172\.(\d{1,2})\./);

  return Boolean(
    private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31,
  );
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}
