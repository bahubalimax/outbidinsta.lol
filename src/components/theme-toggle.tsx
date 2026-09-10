"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconMonitor, IconSun } from "@/components/icons";

type Theme = "light" | "dark" | "system";

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (theme === "system") {
    try {
      localStorage.removeItem("obi-theme");
    } catch {
      /* ignore */
    }
    return;
  }
  root.classList.add(theme);
  try {
    localStorage.setItem("obi-theme", theme);
  } catch {
    /* ignore */
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    let stored: Theme = "system";
    try {
      stored = (localStorage.getItem("obi-theme") as Theme | null) ?? "system";
    } catch {
      /* ignore */
    }
    setTheme(stored);
  }, []);

  function cycle() {
    const next: Theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
    apply(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${theme}. Click to change.`}
      title={`Theme: ${theme}`}
      className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {theme === "dark" ? (
        <IconMoon className="size-4" />
      ) : theme === "light" ? (
        <IconSun className="size-4" />
      ) : (
        <IconMonitor className="size-4" />
      )}
    </button>
  );
}

/** Inline script to set the theme class before hydration (no flash). */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('obi-theme');if(t==='dark'||t==='light'){document.documentElement.classList.add(t);}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
