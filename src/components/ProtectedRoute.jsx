// components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

 // console.log("ProtectedRoute - User:", user, "Required Role:", requiredRole); // Debug log

  if (loading) {
 //   console.log("ProtectedRoute - Loading..."); // Debug log
    return <div>Loading...</div>;
  }

  if (!user) {
//    console.log("ProtectedRoute - No user, redirecting to login"); // Debug log
    return <Navigate to="/" replace />;
  }

  // Check if user has the required role
  if (requiredRole && user.role !== requiredRole) {
 //   console.log( `ProtectedRoute - Role mismatch. User role: ${user.role}, Required: ${requiredRole}`); // Debug log

    // Redirect to their role-specific dashboard
    if (user.role === "admin") {
     // console.log("Redirecting to /admin"); // Debug log
      return <Navigate to="/admin" replace />;
    } else if (user.role === "employee") {
   //   console.log("Redirecting to /employee"); // Debug log
      return <Navigate to="/employee" replace />;
    } else if (user.role === "inspector") {
       return <Navigate to="/inspectorDashboard" replace />;
    }
    else {
    //  console.log("Redirecting to login"); // Debug log
      return <Navigate to="/" replace />;
    }
  }

 // console.log("ProtectedRoute - Access granted"); // Debug log
  return children;
};

export default ProtectedRoute;
