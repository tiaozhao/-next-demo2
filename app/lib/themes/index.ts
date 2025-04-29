export type ThemeColor = "default" | "dark" | "black-pacificsmoke" | "green-kent" | "white-myknobs";

/**
 * Apply a theme by setting the data-theme attribute on the document element
 */
export function applyTheme(theme: ThemeColor): void {
  const root = document.documentElement;
  
  // Remove any existing theme attribute
  if (theme === "default") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
  
  // For backwards compatibility with .dark class
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  
  // Save current theme to localStorage
  localStorage.setItem("themeColor", theme);
}

/**
 * Get current theme from localStorage
 */
export function getCurrentTheme(): ThemeColor {
  return (localStorage.getItem("themeColor") as ThemeColor) || "default";
} 