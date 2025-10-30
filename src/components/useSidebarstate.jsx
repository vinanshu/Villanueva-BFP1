// hooks/useSidebarState.js
import { useState, useEffect } from "react";

export const useSidebarState = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("appTheme") || "light";
  });

  useEffect(() => {
    localStorage.setItem(
      "sidebarCollapsed",
      JSON.stringify(isSidebarCollapsed)
    );
  }, [isSidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem("appTheme", currentTheme);
    document.documentElement.setAttribute("data-theme", currentTheme);
  }, [currentTheme]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleTheme = () => {
    const newTheme = currentTheme === "light" ? "dark" : "light";
    setCurrentTheme(newTheme);
  };

  return {
    isSidebarCollapsed,
    toggleSidebar,
    currentTheme,
    toggleTheme,
    setIsSidebarCollapsed,
  };
};
