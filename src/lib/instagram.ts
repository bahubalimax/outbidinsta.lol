/**
 * Instagram profile identifier normalization + validation.
 *
 * We accept:
 *   https://instagram.com/username
 *   https://www.instagram.com/username
 *   https://www.instagram.com/username/
 *   http://instagram.com/username?hl=en
 *   instagram.com/username
 *   @username
 *   username
 *
 * and normalize everything to a lowercase `username` plus the canonical URL
 * `https://www.instagram.com/username/`.
 *
 * We do NOT log in to Instagram, ask for passwords, or scrape aggressively.
 */

/** Instagram handles: 1-30 chars, letters/digits/period/underscore. */
const USERNAME_RE = /^[a-z0-9._]{1,30}$/;

/**
 * Path segments that are Instagram routes, not profiles. A URL like
 * instagram.com/p/xxxx or instagram.com/reel/xxxx is not a profile.
 */
const RESERVED = new Set([
  "p",
  "reel",
  "reels",
  "explore",
  "stories",
  "accounts",
  "directory",
  "about",
  "developer",
  "developers",
  "legal",
  "privacy",
  "terms",
  "api",
  "web",
  "graphql",
  "challenge",
  "session",
  "oauth",
  "help",
  "tv",
  "igtv",
  "s",
  "ar",
  "create",
  "direct",
  "emails",
  "push",
  "invites",
  "lite",
  "your_activity",
]);

export interface NormalizedInstagram {
  username: string;
  canonicalUrl: string;
}

export class InvalidInstagramError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInstagramError";
  }
}

function isValidUsername(candidate: string): boolean {
  const u = candidate.toLowerCase();
  if (!USERNAME_RE.test(u)) return false;
  if (u.startsWith(".") || u.endsWith(".")) return false;
  if (u.includes("..")) return false;
  if (/^\.+$/.test(u)) return false;
  if (RESERVED.has(u)) return false;
  return true;
}

/**
 * Try to normalize any accepted input. Returns null if it cannot be recognised
 * as an Instagram profile identifier.
 */
export function tryNormalizeInstagram(input: string): NormalizedInstagram | null {
  if (typeof input !== "string") return null;
  let value = input.trim();
  if (!value) return null;

  // "@username"
  if (value.startsWith("@")) {
    value = value.slice(1).trim();
  }

  // A bare handle with no slashes / dots-as-domain.
  if (!value.includes("/") && !value.includes(" ")) {
    // Could still be "instagram.com" style without protocol handled below;
    // a bare token without a dot-domain is treated as a handle.
    if (!/\b(instagram\.com|instagr\.am)\b/i.test(value)) {
      const handle = value.toLowerCase();
      return isValidUsername(handle) ? build(handle) : null;
    }
  }

  // URL-ish input. Add a protocol so URL() can parse it.
  let urlStr = value;
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = "https://" + urlStr.replace(/^\/\//, "");
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "instagram.com" && host !== "instagr.am") {
    return null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  // Allow a leading locale-ish nothing; take the first meaningful segment.
  const first = decodeURIComponent(segments[0]).toLowerCase();
  if (!isValidUsername(first)) return null;

  return build(first);
}

function build(username: string): NormalizedInstagram {
  return {
    username,
    canonicalUrl: `https://www.instagram.com/${username}/`,
  };
}

/** Strict version — throws InvalidInstagramError with a user-facing message. */
export function normalizeInstagram(input: string): NormalizedInstagram {
  const result = tryNormalizeInstagram(input);
  if (!result) {
    throw new InvalidInstagramError(
      "Enter a valid Instagram profile — e.g. @username or instagram.com/username",
    );
  }
  return result;
}

export function canonicalInstagramUrl(username: string): string {
  return `https://www.instagram.com/${username.toLowerCase()}/`;
}
