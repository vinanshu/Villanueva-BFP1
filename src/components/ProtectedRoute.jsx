// components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isAuthenticated, loading } = useAuth();

  // Debug logs (comment out in production)
  console.log("ProtectedRoute - User:", user, "Required Role:", requiredRole, "Loading:", loading);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    console.log("ProtectedRoute - Not authenticated, redirecting to login");
    return <Navigate to="/" replace />;
  }

  // Check if user has the required role
  if (requiredRole) {
    // Normalize roles for comparison
    const userRole = user.role?.toLowerCase();
    const requiredRoleNormalized = requiredRole.toLowerCase();
    
    console.log(`ProtectedRoute - User role: ${userRole}, Required: ${requiredRoleNormalized}`);

    // Check if role matches
    const roleMatches = userRole === requiredRoleNormalized;
    
    // Special case: inspectors use admin role but have inspector routes
    if (requiredRoleNormalized === "inspector" && userRole === "admin") {
      // Check if this is actually an inspector (based on user data)
      const isInspector = user.personnelData?.admin_role?.toLowerCase() === "inspector" || 
                          user.username === "inspector";
      
      if (!isInspector) {
        console.log("ProtectedRoute - Not an inspector, redirecting");
        return <Navigate to="/admin" replace />;
      }
    }
    // Special case: recruitment role check
    else if (requiredRoleNormalized === "recruitment" && userRole !== "recruitment") {
      console.log("ProtectedRoute - Not recruitment personnel, redirecting");
      return <Navigate to="/" replace />;
    }
    // For all other roles, check exact match
    else if (!roleMatches && requiredRoleNormalized !== "inspector") {
      console.log(`ProtectedRoute - Role mismatch, redirecting based on user role: ${userRole}`);
      
      // Redirect to appropriate dashboard based on user role
      if (userRole === "admin") {
        return <Navigate to="/admin" replace />;
      } else if (userRole === "employee") {
        return <Navigate to="/employee" replace />;
      } else if (userRole === "recruitment") {
        return <Navigate to="/recruitment" replace />;
      } else {
        return <Navigate to="/" replace />;
      }
    }
  }

  console.log("ProtectedRoute - Access granted");
  return children;
};

export default ProtectedRoute;