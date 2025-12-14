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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check all possible storage locations
    const checkStoredUser = () => {
      // Try localStorage first (where Login.jsx stores it)
      const localStorageUser = localStorage.getItem('currentUser');
      const localStorageAuth = localStorage.getItem('auth');
      
      // Try sessionStorage
      const sessionStorageUser = sessionStorage.getItem('currentUser');
      
      let storedUser = null;
      
      // Priority: localStorage > sessionStorage
      if (localStorageUser) {
        try {
          storedUser = JSON.parse(localStorageUser);
          console.log("Loaded user from localStorage:", storedUser);
        } catch (error) {
          console.error("Error parsing localStorage user:", error);
        }
      } else if (localStorageAuth) {
        try {
          const authData = JSON.parse(localStorageAuth);
          if (authData.user) {
            storedUser = authData.user;
            console.log("Loaded user from localStorage auth:", storedUser);
          }
        } catch (error) {
          console.error("Error parsing localStorage auth:", error);
        }
      } else if (sessionStorageUser) {
        try {
          storedUser = JSON.parse(sessionStorageUser);
          console.log("Loaded user from sessionStorage:", storedUser);
        } catch (error) {
          console.error("Error parsing sessionStorage user:", error);
        }
      }
      
      // Validate and set user
      if (storedUser && storedUser.username && storedUser.role) {
        // Determine role if not explicitly set
        let role = storedUser.role;
        if (!role) {
          if (storedUser.isAdmin) role = 'admin';
          else if (storedUser.isRecruitment) role = 'recruitment';
          else role = 'employee';
        }
        
        const validatedUser = {
          ...storedUser,
          role: role,
          isAdmin: role === 'admin',
          isRecruitment: role === 'recruitment',
          isEmployee: role === 'employee'
        };
        
        setUser(validatedUser);
        setIsAuthenticated(true);
      } else {
        console.warn("Invalid or no user data found in storage");
        // Clear invalid data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('auth');
        sessionStorage.removeItem('currentUser');
      }
      
      setLoading(false);
    };
    
    checkStoredUser();
  }, []);

  const login = (userData) => {
    console.log("AuthContext login called with:", userData);
    
    if (!userData || !userData.username) {
      console.error("Invalid user data provided to login:", userData);
      return;
    }
    
    // Determine role
    let role = 'employee';
    if (userData.role === 'admin' || userData.isAdmin) {
      role = 'admin';
    } else if (userData.role === 'recruitment' || userData.isRecruitment) {
      role = 'recruitment';
    }
    
    // Create validated user object
    const validatedUser = {
      ...userData,
      role: role,
      isAdmin: role === 'admin',
      isRecruitment: role === 'recruitment',
      isEmployee: role === 'employee'
    };
    
    console.log("Setting user in AuthContext:", validatedUser);
    
    // Store in localStorage (for persistence across tabs/browser restarts)
    localStorage.setItem('currentUser', JSON.stringify(validatedUser));
    localStorage.setItem('isAuthenticated', 'true');
    
    // Also store in sessionStorage for compatibility
    sessionStorage.setItem('currentUser', JSON.stringify(validatedUser));
    
    // Set state
    setUser(validatedUser);
    setIsAuthenticated(true);
  };

  const logout = () => {
    console.log("Logging out user");
    
    // Clear all storage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('auth');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isRecruitment');
    
    sessionStorage.removeItem('currentUser');
    
    // Clear state
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};