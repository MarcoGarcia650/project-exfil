// Light/dark theme. Light is the default; the choice is remembered per
// browser (a viewer convenience, so localStorage is fine; it may be
// unavailable in private windows, hence the try/catch).
const KEY = "exfil-theme";
const THEME_COLORS = { light: "#6d28d9", dark: "#16171d" };

export function getTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // storage blocked: the theme still applies for this visit
  }
}
