import * as React from "react";

type P = React.SVGProps<SVGSVGElement>;
const base = "size-4 shrink-0";

export function IconTag({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className ?? base} {...p}>
      <path
        d="M3 8.4c0-1.9 0-2.8.6-3.4C4.2 4.4 5.1 4.4 7 4.4h1.8c.8 0 1.2 0 1.6.15.4.16.7.46 1.3 1.05l7 7c1 1 1.5 1.5 1.5 2.1 0 .6-.5 1.1-1.5 2.1l-1.7 1.7c-1 1-1.5 1.5-2.1 1.5-.6 0-1.1-.5-2.1-1.5l-7-7c-.6-.6-.9-.9-1.05-1.3C3 9.6 3 9.2 3 8.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="8" cy="9" r="1.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconHeart({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className ?? base} {...p}>
      <path d="M12 20.5s-7.4-4.6-10-9.1C.5 8.2 2 4.8 5.4 4.1c2-.4 4 .5 5.1 2.1a1 1 0 0 0 1.6 0c1.1-1.6 3.1-2.5 5.1-2.1 3.4.7 4.9 4.1 3.4 7.3-2.6 4.5-10 9.1-10 9.1Z" />
    </svg>
  );
}

export function IconGrid({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className ?? base} {...p}>
      <path
        d="M20.1 3.9C21.5 5.3 21.5 7.5 21.5 12s0 6.7-1.4 8.1S16.5 21.5 12 21.5s-6.7 0-8.1-1.4S2.5 16.5 2.5 12s0-6.7 1.4-8.1S7.5 2.5 12 2.5s6.7 0 8.1 1.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M21.5 12H2.5M12 2.5v19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconSearch({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className ?? base} {...p}>
      <path d="m17 17 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconSun({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className ?? base} {...p}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconMoon({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className ?? base} {...p}>
      <path
        d="M21.5 14.1A9 9 0 1 1 9.9 2.5a7 7 0 0 0 11.6 11.6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconMonitor({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className ?? base} {...p}>
      <rect x="2.5" y="4" width="19" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevronRight({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className ?? "size-3"} {...p}>
      <path
        d="M9 6s6 4.4 6 6-6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconChevronLeft({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className ?? "size-3"} {...p}>
      <path
        d="M15 6s-6 4.4-6 6 6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconChevronDown({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className ?? "size-4"} {...p}>
      <path
        d="M18 9s-4.4 6-6 6-6-6-6-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconX({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className ?? base} {...p}>
      <path d="M18.3 3h3.2l-7 8 8.2 10h-6.4l-5-6.5L5 21H1.8l7.5-8.6L1.4 3h6.5l4.5 6zM17 19.3h1.8L7.1 4.6H5.2z" />
    </svg>
  );
}

export function IconInstagram({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className ?? base} {...p}>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function IconLinkedIn({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className ?? base} {...p}>
      <circle cx="6.5" cy="7" r="1.8" />
      <rect x="5" y="10" width="3" height="9" />
      <path d="M11 10h3v1.4c.7-1 1.8-1.7 3.3-1.7 2.6 0 4.2 1.7 4.2 5V19h-3v-3.9c0-1.6-.6-2.6-2-2.6-1.1 0-1.8.8-2.1 1.5-.1.3-.1.6-.1 1V19h-3z" />
    </svg>
  );
}

export function IconReddit({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className ?? base} {...p}>
      <circle cx="12" cy="14.5" r="7" fill="currentColor" />
      <circle cx="18.5" cy="8.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 8 12.8 3l3.8 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="9.2" cy="14" r="1.2" fill="#17141d" />
      <circle cx="14.8" cy="14" r="1.2" fill="#17141d" />
      <path d="M9 17.5c1.5 1.1 4.5 1.1 6 0" stroke="#17141d" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconDownload({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className ?? base} {...p}>
      <path
        d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconLink({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className ?? base} {...p}>
      <path
        d="M9.5 14.5 14.5 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11 6.5 12.4 5a4 4 0 1 1 5.6 5.6L16.5 12M13 17.5 11.6 19a4 4 0 1 1-5.6-5.6L7.5 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconExternal({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className ?? "size-3.5"} {...p}>
      <path
        d="M15 3h6v6M21 3l-9 9M20 14v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
