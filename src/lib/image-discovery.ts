import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { toSlug } from "@/lib/slug";

export type DiscoveredImageSource =
  | "image-src"
  | "json-ld"
  | "official-og"
  | "twitter-image";

export type DiscoveredImage = {
  confidenceScore: number;
  imageUrl: string;
  source: DiscoveredImageSource;
};

type ImageCandidate = {
  alt?: string | null;
  height?: number | null;
  source: DiscoveredImageSource;
  url: string | null;
  width?: number | null;
};

const maxHtmlBytes = 512 * 1024;
const fetchTimeoutMs = 7000;

export async function discoverOfficialWebsiteImage(
  officialWebsiteUrl: string,
): Promise<DiscoveredImage | null> {
  const url = await validatePublicHttpUrl(officialWebsiteUrl);

  if (!url) {
    return null;
  }

  const html = await fetchHtml(url);

  if (!html) {
    return null;
  }

  return selectBestDiscoveredImage(extractImageCandidates(html), url);
}

export function isWeakOrGenericImageUrl(value: string | null | undefined) {
  if (!value) {
    return true;
  }

  const normalized = toSlug(decodeURIComponent(value));

  return (
    genericImagePatterns.some((pattern) => normalized.includes(pattern)) ||
    normalized.includes("apple-touch-icon") ||
    normalized.includes("logo-small") ||
    normalized.includes("x-logo")
  );
}

async function validatePublicHttpUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(url.protocol) || isBlockedHostname(url.hostname)) {
    return null;
  }

  try {
    const addresses = await lookup(url.hostname, { all: true });

    if (!addresses.length || addresses.some((address) => isPrivateAddress(address.address))) {
      return null;
    }
  } catch {
    return null;
  }

  return url;
}

async function fetchHtml(url: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0 (compatible; fuarbul-image-discovery/1.0)",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok || !isHtmlResponse(response.headers.get("content-type"))) {
      return null;
    }

    const reader = response.body?.getReader();

    if (!reader) {
      return null;
    }

    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (receivedBytes < maxHtmlBytes) {
      const { done, value } = await reader.read();

      if (done || !value) {
        break;
      }

      chunks.push(value);
      receivedBytes += value.byteLength;
    }

    return new TextDecoder().decode(
      Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), receivedBytes),
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractImageCandidates(html: string): ImageCandidate[] {
  return [
    {
      source: "official-og",
      url: getMetaContent(html, "og:image"),
    },
    {
      source: "official-og",
      url: getMetaContent(html, "og:image:secure_url"),
    },
    {
      source: "twitter-image",
      url: getMetaContent(html, "twitter:image"),
    },
    {
      source: "image-src",
      url: getLinkHref(html, "image_src"),
    },
    ...extractJsonLdImageCandidates(html),
  ];
}

function selectBestDiscoveredImage(candidates: ImageCandidate[], baseUrl: URL) {
  return candidates
    .map((candidate) => scoreCandidate(candidate, baseUrl))
    .filter((candidate): candidate is DiscoveredImage => Boolean(candidate))
    .sort((a, b) => b.confidenceScore - a.confidenceScore)[0] ?? null;
}

function scoreCandidate(candidate: ImageCandidate, baseUrl: URL): DiscoveredImage | null {
  const imageUrl = normalizeImageUrl(candidate.url, baseUrl);

  if (!imageUrl || isWeakOrGenericImageUrl(imageUrl)) {
    return null;
  }

  if (
    (typeof candidate.width === "number" && candidate.width > 0 && candidate.width < 80) ||
    (typeof candidate.height === "number" && candidate.height > 0 && candidate.height < 40)
  ) {
    return null;
  }

  let confidenceScore =
    candidate.source === "official-og"
      ? 75
      : candidate.source === "twitter-image"
        ? 68
        : candidate.source === "json-ld"
          ? 62
          : 58;
  const normalizedUrl = toSlug(decodeURIComponent(imageUrl));

  if (/\/media|\/uploads|\/upload|\/images|\/img/i.test(imageUrl)) {
    confidenceScore += 8;
  }

  if (/logo|event|fair|fuar|expo/i.test(imageUrl)) {
    confidenceScore += 8;
  }

  if (normalizedUrl.includes(toSlug(baseUrl.hostname.split(".")[0] ?? ""))) {
    confidenceScore += 4;
  }

  return {
    confidenceScore: Math.min(confidenceScore, 100),
    imageUrl,
    source: candidate.source,
  };
}

function extractJsonLdImageCandidates(html: string): ImageCandidate[] {
  const scripts = Array.from(
    html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  );

  return scripts.flatMap((match) => {
    try {
      const parsed = JSON.parse(stripHtml(match[1]));

      return findJsonLdImageValues(parsed).flatMap((value) =>
        imageCandidatesFromUnknown(value),
      );
    } catch {
      return [];
    }
  });
}

function findJsonLdImageValues(value: unknown): unknown[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(findJsonLdImageValues);
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) =>
    toSlug(key) === "image"
      ? [nestedValue]
      : findJsonLdImageValues(nestedValue),
  );
}

function imageCandidatesFromUnknown(value: unknown): ImageCandidate[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string" || typeof value === "number") {
    return [{ source: "json-ld", url: String(value) }];
  }

  if (Array.isArray(value)) {
    return value.flatMap(imageCandidatesFromUnknown);
  }

  if (typeof value === "object") {
    const object = value as Record<string, unknown>;

    return [
      {
        height: parseOptionalNumber(object.height),
        source: "json-ld",
        url: getObjectString(object, ["url", "contentUrl", "src", "@id"]),
        width: parseOptionalNumber(object.width),
      },
    ];
  }

  return [];
}

function getMetaContent(html: string, metaName: string) {
  const target = toSlug(metaName);
  const tag = Array.from(html.matchAll(/<meta\b[^>]*>/gi))
    .map((match) => match[0])
    .find((item) => {
      const property = item.match(/\bproperty=["']([^"']+)["']/i)?.[1] ?? "";
      const name = item.match(/\bname=["']([^"']+)["']/i)?.[1] ?? "";

      return toSlug(property) === target || toSlug(name) === target;
    });

  return decodeHtmlEntities(tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1] ?? "");
}

function getLinkHref(html: string, relName: string) {
  const target = toSlug(relName);
  const tag = Array.from(html.matchAll(/<link\b[^>]*>/gi))
    .map((match) => match[0])
    .find((item) => {
      const rel = item.match(/\brel=["']([^"']+)["']/i)?.[1] ?? "";

      return rel.split(/\s+/).some((part) => toSlug(part) === target);
    });

  return decodeHtmlEntities(tag?.match(/\bhref=["']([^"']*)["']/i)?.[1] ?? "");
}

function normalizeImageUrl(value: string | null | undefined, baseUrl: URL) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value, baseUrl);

    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function isHtmlResponse(contentType: string | null) {
  return !contentType || /text\/html|application\/xhtml\+xml/i.test(contentType);
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized.endsWith(".local")
  );
}

function isPrivateAddress(address: string) {
  if (address === "::1") {
    return true;
  }

  const ipVersion = isIP(address);

  if (ipVersion === 4) {
    return (
      address.startsWith("10.") ||
      address.startsWith("127.") ||
      address.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(address) ||
      /^169\.254\./.test(address)
    );
  }

  if (ipVersion === 6) {
    return /^(fc|fd|fe80):/i.test(address);
  }

  return true;
}

const genericImagePatterns = [
  "apple-touch-icon",
  "default",
  "facebook",
  "favicon",
  "icon",
  "instagram",
  "linkedin",
  "logo-small",
  "no-image",
  "placeholder",
  "social",
  "sprite",
  "twitter",
  "whatsapp",
  "x-logo",
  "youtube",
];

function getObjectString(object: Record<string, unknown>, keys: string[]) {
  const value = Object.entries(object).find(([key]) =>
    keys.some((alias) => toSlug(key) === toSlug(alias)),
  )?.[1];

  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function parseOptionalNumber(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function stripHtml(text: string) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<[^>]+>/g, "\n");
}

function decodeHtmlEntities(text: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, value: string) =>
      String.fromCodePoint(Number.parseInt(value, 16)),
    )
    .replace(/&#(\d+);/g, (_, value: string) =>
      String.fromCodePoint(Number.parseInt(value, 10)),
    )
    .replace(/&([a-z]+);/gi, (match, value: string) => namedEntities[value] ?? match);
}
