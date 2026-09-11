import "server-only";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 4000;

/**
 * Best-effort lookup of a public Instagram profile photo via the og:image
 * meta tag Instagram serves on every public profile page for link-preview
 * unfurling. No login, no private API, no scraping beyond one public page
 * fetch. Always resolves — never throws — since a missed avatar just leaves
 * the initials fallback in place; this must never break a page render.
 */
export async function fetchInstagramAvatarUrl(username: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
      headers: { "User-Agent": BROWSER_UA, "Accept-Language": "en-US,en;q=0.9" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<meta property="og:image" content="([^"]+)"/);
    return match ? match[1].replace(/&amp;/g, "&") : null;
  } catch {
    return null;
  }
}

/** Fetch an avatar image's bytes and inline them as a data URI (avoids hotlink/referrer issues when embedding in next/og). */
export async function toAvatarDataUri(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Referer: "https://www.instagram.com/" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
