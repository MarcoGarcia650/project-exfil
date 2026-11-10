import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { getTheme, setTheme } from "../lib/theme.js";

export function ThemeToggle() {
  const [theme, setThemeState] = useState(getTheme);
  const next = theme === "dark" ? "light" : "dark";

  function toggle() {
    setTheme(next);
    setThemeState(next);
  }

  return (
    <button type="button" className="icon-button" onClick={toggle} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
