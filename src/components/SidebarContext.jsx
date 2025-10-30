// contexts/SidebarContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({ children }) => {
  // Sidebar state - sessionStorage (resets when browser closes)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = sessionStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  // Theme state - localStorage (persists permanently)
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("appTheme") || "light";
  });

  // Save sidebar state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(
      "sidebarCollapsed",
      JSON.stringify(isSidebarCollapsed)
    );
  }, [isSidebarCollapsed]);

  // Save theme to localStorage and apply to document
  useEffect(() => {
    localStorage.setItem("appTheme", currentTheme);
    document.documentElement.setAttribute("data-theme", currentTheme);
  }, [currentTheme]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const resetSidebar = () => {
    setIsSidebarCollapsed(false);
    sessionStorage.removeItem("sidebarCollapsed");
  };
  const expandSidebar = () => {
    setIsSidebarCollapsed(true);
  };

  const collapseSidebar = () => {
    setIsSidebarCollapsed(true);
  };

  const toggleTheme = () => {
    const newTheme = currentTheme === "light" ? "dark" : "light";
    setCurrentTheme(newTheme);
  };

  const value = {
    isSidebarCollapsed,
    toggleSidebar,
    expandSidebar,
    collapseSidebar,
    currentTheme,
    toggleTheme,
    setIsSidebarCollapsed,
    resetSidebar,
  };

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
};
