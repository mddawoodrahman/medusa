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
    document.documentElement.classList.toggle("dark", currentTheme === "dark");
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
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
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
      {mobile && <p>{theme === "dark" ? "Light mode" : "Dark mode"}</p>}
    </Button>
  );
};

export default ThemeToggle;