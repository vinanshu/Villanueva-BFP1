// hooks/EmployeeSidebar.jsx - Updated with React Router
import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom"; // Import Link
import { useSidebar } from "./SidebarContext";

const EmployeeSidebar = () => {
  const { isSidebarCollapsed, expandSidebar, currentTheme, toggleTheme } =
    useSidebar();
  const [activeTab, setActiveTab] = useState("");
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;
    setActiveTab(currentPath);
  }, [location.pathname]);

  const isTabActive = (href) => activeTab === href;

  const handleTabClick = (e, href) => {
    if (isSidebarCollapsed) {
      expandSidebar();
    }
  };

  return (
    <div className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
      <div className="theme-toggle">
        <button onClick={toggleTheme}>
          {currentTheme === "light" ? "🌙" : "☀️"}
        </button>
      </div>
      <div className="sidebar-inner">
        <h2>Employee</h2>
        <Link
          to="/employee"
          className="no-hover"
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "10px",
          }}
          onClick={(e) => handleTabClick(e, "/employee")}
        >
          <img
            src="/src/assets/logo-bfp.jpg"
            alt="Logo"
            style={{
              height: "30px",
              width: "30px",
              objectFit: "cover",
              borderRadius: "50%",
              marginRight: "10px",
            }}
          />
          <span style={{ color: "var(--text-primary)", fontWeight: "bold" }}>
            Villanueva FireStation
          </span>
        </Link>

        {/* Use React Router Link instead of regular anchor tags */}
        <Link
          to="/employee"
          onClick={(e) => handleTabClick(e, "/employee")}
          className={`${isTabActive("/employee") ? "active" : ""}`}
        >
          👤 <span>Profile</span>
        </Link>
        <Link
          to="/employeeLeaveDashboard"
          onClick={(e) => handleTabClick(e, "/employeeLeaveDashboard")}
          className={`${
            isTabActive("/employeeLeaveDashboard") ? "active" : ""
          }`}
        >
          📊 <span>Leave Dashboard</span>
        </Link>
        <Link
          to="/employeeLeaveRequest"
          onClick={(e) => handleTabClick(e, "/employeeLeaveRequest")}
          className={`${isTabActive("/employeeLeaveRequest") ? "active" : ""}`}
        >
          📝 <span>Leave Request</span>
        </Link>

        {/* Additional employee tabs */}
        <Link
          to="/myProfile"
          onClick={(e) => handleTabClick(e, "/myProfile")}
          className={`${isTabActive("/myProfile") ? "active" : ""}`}
        >
          📋 <span>My Clearance Records</span>
        </Link>
        <Link
          to="/myLeaveRecords"
          onClick={(e) => handleTabClick(e, "/myLeaveRecords")}
          className={`${isTabActive("/myLeaveRecords") ? "active" : ""}`}
        >
          📑 <span>My Leave Records</span>
        </Link>
        {/* ... other links */}

        <Link
          to="/"
          onClick={(e) => {
            handleTabClick(e, "/");
            // You might want to add logout logic here
          }}
          className={`${isTabActive("/") ? "active" : ""}`}
        >
          🚪 <span>Logout</span>
        </Link>
      </div>
    </div>
  );
};

export default EmployeeSidebar;
