// components/EmployeeDashboard.jsx - UPDATED with colored quick stats
import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import {
  openDB,
  STORE_PERSONNEL,
  STORE_INVENTORY,
  STORE_CLEARANCE,
} from "./db";
import EmployeeSidebar from "./EmployeeSidebar";
import Hamburger from "./Hamburger";
import styles from "./EmployeeDashboard.module.css";
import { useSidebar } from "./SidebarContext.jsx";
import { Title, Meta } from "react-head";

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [assignedEquipment, setAssignedEquipment] = useState([]);
  const [clearanceRequests, setClearanceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const { isSidebarCollapsed } = useSidebar();

  useEffect(() => {
    if (user && user.role === "employee") {
      if (user.personnelData) {
        setEmployee(user.personnelData);
        loadAssignedEquipmentWithDB(user.personnelData);
        loadClearanceRequestsWithDB(user.personnelData);
        setLoading(false);
      } else {
        loadEmployeeProfile(user.username);
      }
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadEmployeeProfile = async (username) => {
    try {
      const db = await openDB();
      const personnelTx = db.transaction(STORE_PERSONNEL, "readonly");
      const personnelStore = personnelTx.objectStore(STORE_PERSONNEL);
      const personnelReq = personnelStore.getAll();

      personnelReq.onsuccess = () => {
        const personnelList = personnelReq.result || [];
        const emp = personnelList.find((p) => p.username === username);

        if (!emp) {
          setEmployee(null);
          setLoading(false);
          return;
        }

        setEmployee(emp);
        loadAssignedEquipment(db, emp);
        loadClearanceRequests(db, emp);
        setLoading(false);
      };

      personnelReq.onerror = () => {
        alert("Error loading employee profile.");
        setLoading(false);
      };
    } catch (error) {
      console.error("Error loading employee profile:", error);
      setLoading(false);
    }
  };

  const loadAssignedEquipment = (db, emp) => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase().trim();
    const tx = db.transaction(STORE_INVENTORY, "readonly");
    const store = tx.objectStore(STORE_INVENTORY);
    const req = store.getAll();

    req.onsuccess = () => {
      const inventory = req.result || [];
      const assignedItems = inventory.filter(
        (item) =>
          item.assignedTo &&
          item.assignedTo.toLowerCase().replace(/\s+/g, " ").includes(fullName)
      );
      setAssignedEquipment(assignedItems);
    };
  };

  const loadAssignedEquipmentWithDB = async (emp) => {
    try {
      const db = await openDB();
      loadAssignedEquipment(db, emp);
    } catch (error) {
      console.error("Error loading assigned equipment:", error);
    }
  };

  const loadClearanceRequests = (db, emp) => {
    const fullName = `${emp.first_name} ${emp.middle_name || ""} ${
      emp.last_name
    }`
      .replace(/\s+/g, " ")
      .trim();
    const tx = db.transaction(STORE_CLEARANCE, "readonly");
    const store = tx.objectStore(STORE_CLEARANCE);
    const req = store.getAll();

    req.onsuccess = () => {
      const clearanceList = req.result || [];
      const userClearances = clearanceList.filter(
        (c) => c.employee === fullName
      );
      setClearanceRequests(userClearances);
    };
  };

  const loadClearanceRequestsWithDB = async (emp) => {
    try {
      const db = await openDB();
      loadClearanceRequests(db, emp);
    } catch (error) {
      console.error("Error loading clearance requests:", error);
    }
  };

  const safeRender = (value) => {
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    if (value === null || value === undefined) {
      return "-";
    }
    return String(value);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
      case "active":
        return "#10b981";
      case "pending":
        return "#f59e0b";
      case "rejected":
      case "inactive":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  if (loading) {
    return (
      <div className={styles.modernLoading}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.modernLoading}>
        <p>Please log in to access the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Title>Employee Dashboard | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />
      <EmployeeSidebar />
      <Hamburger />

      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className={styles.modernHeader}>
          <div className={styles.headerContent}>
            <h1>Employee Dashboard</h1>
            <p>Welcome back, {employee?.first_name || "Employee"}!</p>
          </div>
        </div>

        <main className={styles.modernMain}>
          {/* Quick Stats */}
          <div className={styles.quickStats}>
            <div className={`${styles.statCard} ${styles.equipmentStat}`}>
              <div className={styles.statIcon}>
                <i className="fas fa-laptop"></i>
              </div>
              <div className={styles.statInfo}>
                <h3>{assignedEquipment.length}</h3>
                <p>Assigned Equipment</p>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.clearanceStat}`}>
              <div className={styles.statIcon}>
                <i className="fas fa-file-contract"></i>
              </div>
              <div className={styles.statInfo}>
                <h3>{clearanceRequests.length}</h3>
                <p>Clearance Requests</p>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.rankStat}`}>
              <div className={styles.statIcon}>
                <i className="fas fa-user-shield"></i>
              </div>
              <div className={styles.statInfo}>
                <h3>{employee?.rank || "N/A"}</h3>
                <p>Current Rank</p>
              </div>
            </div>
          </div>

          {/* Rest of your component remains the same */}
          <div className={styles.dashboardGrid}>
            {/* Profile Card */}
            <div className={styles.profileCard}>
              <div className={styles.cardHeader}>
                <h2>Profile Information</h2>
                <div className={styles.statusBadge}>
                  <span className={styles.statusDot}></span>
                  Active
                </div>
              </div>

              <div className={styles.profileContent}>
                <div className={styles.avatarSection}>
                  <div className={styles.avatarWrapper}>
                    <img
                      src={
                        employee?.photoURL &&
                        employee.photoURL.startsWith("data:image")
                          ? employee.photoURL
                          : "/default-profile.png"
                      }
                      alt={`${employee?.rank || ""} ${
                        employee?.first_name || ""
                      } ${employee?.last_name || ""}'s photo`}
                      className={styles.profilePhoto}
                    />
                    <div className={styles.avatarOverlay}>
                      <i className="fas fa-camera"></i>
                    </div>
                  </div>
                  <h3>{`${employee?.rank} ${employee?.first_name} ${
                    employee?.middle_name || ""
                  } ${employee?.last_name}`}</h3>
                  <p>{employee?.designation || "Employee"}</p>
                </div>

                <div className={styles.profileDetails}>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailItem}>
                      <i className="fas fa-id-badge"></i>
                      <div>
                        <label>Badge Number</label>
                        <span>{employee?.badge_number || "-"}</span>
                      </div>
                    </div>

                    <div className={styles.detailItem}>
                      <i className="fas fa-map-marker-alt"></i>
                      <div>
                        <label>Station</label>
                        <span>{employee?.station || "-"}</span>
                      </div>
                    </div>

                    <div className={styles.detailItem}>
                      <i className="fas fa-birthday-cake"></i>
                      <div>
                        <label>Birth Date</label>
                        <span>{safeRender(employee?.birth_date)}</span>
                      </div>
                    </div>

                    <div className={styles.detailItem}>
                      <i className="fas fa-calendar-alt"></i>
                      <div>
                        <label>Date Hired</label>
                        <span>{safeRender(employee?.date_hired)}</span>
                      </div>
                    </div>

                    <div className={styles.detailItem}>
                      <i className="fas fa-user"></i>
                      <div>
                        <label>Username</label>
                        <span>{employee?.username || "-"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className={styles.contentArea}>
              {/* Navigation Tabs */}
              <div className={styles.tabNavigation}>
                <button
                  className={`${styles.tabButton} ${
                    activeTab === "overview" ? styles.active : ""
                  }`}
                  onClick={() => setActiveTab("overview")}
                >
                  <i className="fas fa-chart-pie"></i>
                  Overview
                </button>
                <button
                  className={`${styles.tabButton} ${
                    activeTab === "equipment" ? styles.active : ""
                  }`}
                  onClick={() => setActiveTab("equipment")}
                >
                  <i className="fas fa-laptop"></i>
                  Equipment
                </button>
                <button
                  className={`${styles.tabButton} ${
                    activeTab === "clearance" ? styles.active : ""
                  }`}
                  onClick={() => setActiveTab("clearance")}
                >
                  <i className="fas fa-file-contract"></i>
                  Clearance
                </button>
              </div>

              {/* Tab Content */}
              <div className={styles.tabContent}>
                {activeTab === "overview" && (
                  <div className={styles.overviewGrid}>
                    {/* Recent Equipment - Now takes full width */}
                    <div className={styles.overviewCard}>
                      <h3>Recent Equipment</h3>
                      <div className={styles.equipmentList}>
                        {assignedEquipment.slice(0, 6).map((item, index) => (
                          <div key={index} className={styles.equipmentItem}>
                            <div className={styles.equipmentIcon}>
                              <i className="fas fa-laptop"></i>
                            </div>
                            <div className={styles.equipmentInfo}>
                              <h4>{item.itemName || "Unnamed Equipment"}</h4>
                              <p>{item.category || "No Category"}</p>
                            </div>
                            <div
                              className={styles.equipmentStatus}
                              style={{
                                backgroundColor: getStatusColor(item.status),
                              }}
                            ></div>
                          </div>
                        ))}
                        {assignedEquipment.length === 0 && (
                          <p className={styles.noData}>No equipment assigned</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "equipment" && (
                  <div className={styles.tableCard}>
                    <div className={styles.cardHeader}>
                      <h3>Assigned Equipment</h3>
                      <span className={styles.badge}>
                        {assignedEquipment.length} items
                      </span>
                    </div>
                    <div className={styles.tableContainer}>
                      <table className={styles.modernTable}>
                        <thead>
                          <tr>
                            <th>Equipment Name</th>
                            <th>Barcode</th>
                            <th>Category</th>
                            <th>Purchase Date</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignedEquipment.map((item, index) => (
                            <tr key={index}>
                              <td>
                                <div className={styles.itemWithIcon}>
                                  <i className="fas fa-laptop"></i>
                                  {item.itemName || "-"}
                                </div>
                              </td>
                              <td>{item.itemCode || "-"}</td>
                              <td>
                                <span className={styles.categoryTag}>
                                  {item.category || "-"}
                                </span>
                              </td>
                              <td>{safeRender(item.purchaseDate)}</td>
                              <td>
                                <span
                                  className={styles.statusBadge}
                                  style={{
                                    backgroundColor: getStatusColor(
                                      item.status
                                    ),
                                    color: "white",
                                  }}
                                >
                                  {item.status || "-"}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {assignedEquipment.length === 0 && (
                            <tr>
                              <td colSpan="5" className={styles.noData}>
                                No equipment assigned.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === "clearance" && (
                  <div className={styles.tableCard}>
                    <div className={styles.cardHeader}>
                      <h3>Clearance Requests</h3>
                      <span className={styles.badge}>
                        {clearanceRequests.length} requests
                      </span>
                    </div>
                    <div className={styles.tableContainer}>
                      <table className={styles.modernTable}>
                        <thead>
                          <tr>
                            <th>Request Date</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clearanceRequests.map((clearance, index) => (
                            <tr key={index}>
                              <td>{safeRender(clearance.date)}</td>
                              <td>
                                <span className={styles.typeTag}>
                                  {clearance.type}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={styles.statusBadge}
                                  style={{
                                    backgroundColor: getStatusColor(
                                      clearance.status
                                    ),
                                    color: "white",
                                  }}
                                >
                                  {clearance.status}
                                </span>
                              </td>
                              <td>
                                <button className={styles.actionIcon}>
                                  <i className="fas fa-eye"></i>
                                </button>
                                <button className={styles.actionIcon}>
                                  <i className="fas fa-download"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                          {clearanceRequests.length === 0 && (
                            <tr>
                              <td colSpan="4" className={styles.noData}>
                                No clearance requests found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
