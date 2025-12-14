// components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ children, requiredRole, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

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

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  const userRole = user.role?.toLowerCase();

  /* ----- Multiple roles allowed ----- */
  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
    return redirectByRole(userRole);
  }

  /* ----- Single role required ----- */
  if (requiredRole) {
    const required = requiredRole.toLowerCase();

    // Inspector special case
    if (required === "inspector") {
      const isInspector =
        userRole === "admin" &&
        user.personnelData?.admin_role?.toLowerCase() === "inspector";

      if (!isInspector) return redirectByRole(userRole);
    }
    // Recruitment role
    else if (required === "recruitment") {
      if (userRole !== "recruitment" && !user.isRecruitment) {
        return redirectByRole(userRole);
      }
    }
    // Default exact match
    else if (userRole !== required) {
      return redirectByRole(userRole);
    }
  }

  return children;
};

function redirectByRole(role) {
  switch (role) {
    case "admin":
      return <Navigate to="/admin" replace />;
    case "employee":
      return <Navigate to="/employee" replace />;
    case "recruitment":
      return <Navigate to="/recruitment" replace />;
    default:
      return <Navigate to="/" replace />;
  }
}

export default ProtectedRoute;
