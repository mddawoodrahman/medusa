"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

interface Props {
  className?: string;
  mobile?: boolean;
}

const STORAGE_KEY = "medusa-theme";

const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
};

const getPreferredTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(STORAGE_KEY);
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const ThemeToggle = ({ className, mobile = false }: Props) => {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const currentTheme = getPreferredTheme();
    setTheme(currentTheme);
    applyTheme(currentTheme);
    setMounted(true);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      const storedTheme = window.localStorage.getItem(STORAGE_KEY);

      if (storedTheme === "dark" || storedTheme === "light") {
        return;
      }

      const nextTheme: Theme = event.matches ? "dark" : "light";
      setTheme(nextTheme);
      applyTheme(nextTheme);
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      const nextTheme: Theme = event.newValue === "dark" ? "dark" : "light";
      setTheme(nextTheme);
      applyTheme(nextTheme);
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  const nextModeLabel = theme === "dark" ? "light" : "dark";

  return (
    <Button
      type="button"
      onClick={toggleTheme}
      className={cn(
        mobile ? "mobile-theme-toggle-button" : "theme-toggle-button",
        className,
      )}
      aria-label={mounted ? `Switch to ${nextModeLabel} mode` : "Toggle theme"}
      title={mounted ? `Switch to ${nextModeLabel} mode` : "Toggle theme"}
    >
      {mounted && (theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />)}
      {mobile && <p>{theme === "dark" ? "Light mode" : "Dark mode"}</p>}
    </Button>
  );
};

export default ThemeToggle;