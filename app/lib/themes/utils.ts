import { ThemeColor, applyTheme } from "./index";

/**
 * Set the application theme
 * Can be used anywhere in the application without requiring the Context
 * 
 * @example
 * // In any component or function
 * import { setAppTheme } from "~/lib/themes/utils";
 * 
 * // Set theme based on user selection or condition
 * setAppTheme("black-pacificsmoke");
 */
export function setAppTheme(theme: ThemeColor): void {
  applyTheme(theme);
}

/**
 * Get theme from localStorage with validation
 */
export function getStoredTheme(): ThemeColor {
  const storedTheme = localStorage.getItem("themeColor") as ThemeColor;
  
  const validThemes: ThemeColor[] = ["default", "dark", "black-pacificsmoke", "green-kent"];
  
  if (storedTheme && validThemes.includes(storedTheme)) {
    return storedTheme;
  }
  
  return "default";
} 