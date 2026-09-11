/**
 * Brand mark — three ascending gradient bars (rank climbing) + the
 * "outbidinsta.lol" wordmark with "insta" carrying the brand gradient.
 * One SVG gradient def, reused by the header and the favicon (see
 * src/app/icon.svg, which mirrors these bars/colors).
 */
export function LogoMark({ className = "h-[1.4em] w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 32" fill="none" aria-hidden className={className}>
      <defs>
        <linearGradient id="obiLogoGrad" x1="0" y1="32" x2="36" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6a3df5" />
          <stop offset="55%" stopColor="#e1306c" />
          <stop offset="100%" stopColor="#f9a13b" />
        </linearGradient>
      </defs>
      <rect x="22" y="0" width="14" height="6" rx="3" fill="#f9a13b" />
      <rect x="12" y="11" width="24" height="6" rx="3" fill="#e1306c" />
      <rect x="0" y="22" width="36" height="6" rx="3" fill="url(#obiLogoGrad)" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      outbid<span className="brand-gradient-text">insta</span>
      <span className="text-muted-foreground">.lol</span>
    </span>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <LogoMark />
      <Wordmark />
    </span>
  );
}
