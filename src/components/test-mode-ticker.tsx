/**
 * A news-ticker style bar announcing the site is closed for new listings
 * ahead of launch. Delete this component (and its import in layout.tsx)
 * once real payments go live — no other cleanup needed.
 */
export function TestModeTicker() {
  const message = "Launching soon — new listings are paused while we get ready. Check back shortly!";

  return (
    <div className="brand-gradient-bg overflow-hidden py-1.5 text-white">
      <div className="obi-marquee-track flex w-max whitespace-nowrap text-xs font-medium">
        {[0, 1].map((i) => (
          <span key={i} className="flex items-center" aria-hidden={i === 1}>
            {Array.from({ length: 6 }).map((_, j) => (
              <span key={j} className="mx-4 inline-flex items-center gap-2">
                <span aria-hidden>🚀</span>
                {message}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
