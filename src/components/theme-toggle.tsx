"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cx } from "./ui";

type Theme = "light" | "dark";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function current(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("arvo-theme", theme);
  } catch {
    // Private browsing: the choice simply lasts for this visit.
  }
  listeners.forEach((listener) => listener());
}

export function ThemeToggle({ className, labelled = false }: { className?: string; labelled?: boolean }) {
  const theme = useSyncExternalStore<Theme>(subscribe, current, () => "light");
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      className={cx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-control text-ink-2 transition-colors hover:bg-sunken hover:text-ink",
        labelled ? "px-3 text-[14px]" : "w-10",
        className,
      )}
    >
      <span suppressHydrationWarning>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</span>
      {labelled ? <span suppressHydrationWarning>{theme === "dark" ? "Light theme" : "Dark theme"}</span> : null}
    </button>
  );
}
