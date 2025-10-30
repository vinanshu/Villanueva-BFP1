// components/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use sessionStorage instead of localStorage
    const savedUser = sessionStorage.getItem("currentUser");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log("Loaded user from sessionStorage:", parsedUser);

        if (
          parsedUser &&
          typeof parsedUser === "object" &&
          parsedUser.username &&
          parsedUser.role
        ) {
          setUser(parsedUser);
        } else {
          console.warn("Invalid user data in sessionStorage, clearing...");
          sessionStorage.removeItem("currentUser");
        }
      } catch (error) {
        console.error("Error parsing user data from sessionStorage:", error);
        sessionStorage.removeItem("currentUser");
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    console.log("Logging in user:", userData);
    if (!userData || !userData.username || !userData.role) {
      console.error("Invalid user data provided to login:", userData);
      return;
    }

    setUser(userData);
    sessionStorage.setItem("currentUser", JSON.stringify(userData)); // sessionStorage
  };

  const logout = () => {
    console.log("Logging out user");
    setUser(null);
    sessionStorage.removeItem("currentUser"); // sessionStorage
  };

  const value = {
    user,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
