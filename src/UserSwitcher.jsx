// components/UserSwitcher.jsx - Enhanced with responsive positioning
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./components/AuthContext";
import { getPersonnelList } from "./components/db";

const UserSwitcher = () => {
  const { user, login, logout } = useAuth();
  const [employeeList, setEmployeeList] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [menuPosition, setMenuPosition] = useState("right"); // 'right' or 'left'
  const dragRef = useRef(null);
  const gearRef = useRef(null);

  // Load real employees from IndexedDB
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const personnel = await getPersonnelList();
        setEmployeeList(personnel);
      } catch (error) {
        console.error("Error loading employees:", error);
      }
    };
    loadEmployees();
  }, []);

  // Calculate menu position based on gear position
  useEffect(() => {
    if (isOpen) {
      const viewportWidth = window.innerWidth;
      // If gear is on the left side of screen, show menu to the right
      // If gear is on the right side, show menu to the left
      if (position.x < viewportWidth / 2) {
        setMenuPosition("right");
      } else {
        setMenuPosition("left");
      }
    }
  }, [isOpen, position]);

  // Drag and drop functionality
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;

      // Keep gear within viewport bounds
      const newX = Math.max(
        10,
        Math.min(e.clientX - 20, window.innerWidth - 50)
      );
      const newY = Math.max(
        10,
        Math.min(e.clientY - 20, window.innerHeight - 50)
      );

      setPosition({
        x: newX,
        y: newY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none"; // Prevent text selection during drag
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = ""; // Restore text selection
    };
  }, [isDragging]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const toggleMenu = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const switchToAdmin = () => {
    login({
      username: "admin",
      role: "admin",
      name: "System Administrator",
    });
    setIsOpen(false);
  };

  const switchToEmployee = () => {
    if (employeeList.length > 0) {
      const realEmployee = employeeList[0];
      login({
        username: realEmployee.username,
        role: "employee",
        name: `${realEmployee.first_name} ${realEmployee.last_name}`,
        id: realEmployee.id,
        personnelData: realEmployee,
      });
    } else {
      login({
        username: "testemployee",
        role: "employee",
        name: "Test Employee",
        id: 1,
      });
    }
    setIsOpen(false);
  };

  const switchToSpecificEmployee = (employee) => {
    login({
      username: employee.username,
      role: "employee",
      name: `${employee.first_name} ${employee.last_name}`,
      id: employee.id,
      personnelData: employee,
    });
    setIsOpen(false);
  };

  const clearAll = () => {
    localStorage.clear();
    sessionStorage.clear();
    logout();
    window.location.reload();
  };
  // In your UserSwitcher.jsx - Add inspector switch function
  const switchToInspector = () => {
    login({
      username: "inspector",
      role: "inspector",
      name: "System Inspector",
    });
    setIsOpen(false);
  };

  // Add the inspector button in the return section:

  // Calculate menu position styles
  const getMenuPositionStyles = () => {
    const baseStyle = {
      position: "fixed",
      top: `${position.y}px`,
      zIndex: 9998,
      background: "#f8f9fa",
      padding: "15px",
      border: "1px solid #dee2e6",
      borderRadius: "8px",
      maxWidth: "400px",

      maxHeight: "500px",
      overflow: "auto",
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      animation: "fadeIn 0.2s ease",
    };

    if (menuPosition === "right") {
      return {
        ...baseStyle,
        left: `${position.x + 50}px`,
        right: "auto",
      };
    } else {
      return {
        ...baseStyle,
        right: `${window.innerWidth - position.x + 10}px`,
        left: "auto",
      };
    }
  };

  // Calculate arrow position
  const getArrowStyles = () => {
    const arrowStyle = {
      position: "absolute",
      top: "15px",
      width: "0",
      height: "0",
      borderTop: "8px solid transparent",
      borderBottom: "8px solid transparent",
    };

    if (menuPosition === "right") {
      return {
        ...arrowStyle,
        left: "-8px",
        borderRight: "8px solid #dee2e6",
      };
    } else {
      return {
        ...arrowStyle,
        right: "-8px",
        borderLeft: "8px solid #dee2e6",
      };
    }
  };

  return (
    <>
      {/* Draggable Gear Icon */}
      <div
        ref={gearRef}
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: "40px",
          height: "40px",
          background: isDragging ? "#0056b3" : "#007bff",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isDragging ? "grabbing" : "grab",
          zIndex: 9999,
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
          border: "2px solid white",
          userSelect: "none",
          transition: isDragging ? "none" : "all 0.2s ease",
          transform: isDragging ? "scale(1.1)" : "scale(1)",
        }}
        onMouseDown={handleMouseDown}
        onClick={toggleMenu}
        title="User Switcher - Drag to move, Click to open"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          style={{
            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
            transition: "transform 0.3s ease",
          }}
        >
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div ref={dragRef} style={getMenuPositionStyles()}>
          {/* Arrow pointing to gear */}
          <div style={getArrowStyles()} />

          <div
            style={{
              marginBottom: "10px",
              borderBottom: "1px solid #dee2e6",
              paddingBottom: "8px",
            }}
          >
            <div style={{ fontWeight: "bold", fontSize: "14px" }}>
              🔄 User Switcher
            </div>
            <div style={{ fontSize: "12px", color: "#6c757d" }}>
              Current: <strong>{user?.role || "None"}</strong>
            </div>
            {user?.name && (
              <div style={{ fontSize: "12px", color: "#6c757d" }}>
                User: {user.name}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              onClick={switchToAdmin}
              style={{
                padding: "8px 12px",
                background: user?.role === "admin" ? "#e7f3ff" : "#fff",
                border: "1px solid #007bff",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: user?.role === "admin" ? "bold" : "normal",
                color: user?.role === "admin" ? "#007bff" : "#333",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) =>
                (e.target.style.background =
                  user?.role === "admin" ? "#d4e9ff" : "#f8f9fa")
              }
              onMouseLeave={(e) =>
                (e.target.style.background =
                  user?.role === "admin" ? "#e7f3ff" : "#fff")
              }
            >
              👑 Switch to Admin
            </button>
            <button
              onClick={switchToInspector}
              style={{
                padding: "8px 12px",
                background: user?.role === "inspector" ? "#fff3cd" : "#fff",
                border: "1px solid #ffc107",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: user?.role === "inspector" ? "bold" : "normal",
                color: user?.role === "inspector" ? "#856404" : "#333",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) =>
                (e.target.style.background =
                  user?.role === "inspector" ? "#ffeaa7" : "#f8f9fa")
              }
              onMouseLeave={(e) =>
                (e.target.style.background =
                  user?.role === "inspector" ? "#fff3cd" : "#fff")
              }
            >
              🔍 Switch to Inspector
            </button>
            <button
              onClick={switchToEmployee}
              style={{
                padding: "8px 12px",
                background: user?.role === "employee" ? "#e7f3ff" : "#fff",
                border: "1px solid #28a745",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: user?.role === "employee" ? "bold" : "normal",
                color: user?.role === "employee" ? "#28a745" : "#333",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) =>
                (e.target.style.background =
                  user?.role === "employee" ? "#d4edda" : "#f8f9fa")
              }
              onMouseLeave={(e) =>
                (e.target.style.background =
                  user?.role === "employee" ? "#e7f3ff" : "#fff")
              }
            >
              👤 Switch to Employee
            </button>

            {/* Real Employees List */}
            {employeeList.length > 0 && (
              <div style={{ marginTop: "8px" }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#495057",
                    marginBottom: "6px",
                  }}
                >
                  Real Employees:
                </div>
                <div
                  style={{
                    maxHeight: "150px",
                    overflowY: "auto",
                    border: "1px solid #e9ecef",
                    borderRadius: "4px",
                  }}
                >
                  {employeeList.slice(0, 8).map((emp, index) => (
                    <button
                      key={emp.id || index}
                      onClick={() => switchToSpecificEmployee(emp)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: "11px",
                        textAlign: "left",
                        borderBottom: "1px solid #f8f9fa",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.background = "#f8f9fa")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.background = "transparent")
                      }
                    >
                      <span style={{ fontSize: "10px" }}>👤</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold" }}>{emp.username}</div>
                        <div style={{ fontSize: "9px", color: "#6c757d" }}>
                          {emp.first_name} {emp.last_name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {employeeList.length > 8 && (
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#6c757d",
                      textAlign: "center",
                      marginTop: "4px",
                    }}
                  >
                    ... and {employeeList.length - 8} more
                  </div>
                )}
              </div>
            )}

            <button
              onClick={clearAll}
              style={{
                marginTop: "12px",
                padding: "8px 12px",
                background: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => (e.target.style.background = "#c82333")}
              onMouseLeave={(e) => (e.target.style.background = "#dc3545")}
            >
              🗑️ Clear All & Reload
            </button>
          </div>

          <div
            style={{
              fontSize: "9px",
              color: "#6c757d",
              textAlign: "center",
              marginTop: "10px",
              borderTop: "1px solid #dee2e6",
              paddingTop: "8px",
            }}
          >
            Drag the gear icon to move • Menu position: {menuPosition}
          </div>
        </div>
      )}

      {/* Close menu when clicking outside */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9997,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateX(${
              menuPosition === "right" ? "-10px" : "10px"
            }); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}
      </style>
    </>
  );
};

export default UserSwitcher;
