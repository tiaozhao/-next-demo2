import React, { createContext, useContext, useEffect, useState } from "react";
import { type ThemeColor, applyTheme, getCurrentTheme } from "./index";

/**
 * Context for theme management
 */
type ThemeContextType = {
  theme: ThemeColor;
  setTheme: (theme: ThemeColor) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Theme Provider Component
 * Manages theme state and provides theme context to the application
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeColor>("default");
  
  const setTheme = (newTheme: ThemeColor) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  useEffect(() => {
    // Apply theme on initial load
    const savedTheme = getCurrentTheme();
    setThemeState(savedTheme);
    applyTheme(savedTheme);
    
    // Listen for localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "themeColor" && e.newValue) {
        const newTheme = e.newValue as ThemeColor;
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to access the theme context
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}; 