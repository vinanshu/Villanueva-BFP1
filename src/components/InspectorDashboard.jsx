import React, { useState, useEffect } from "react";
import styles from "./InspectorDashboard.module.css";
import { Title, Meta } from "react-head";
import InspectorSidebar from "./InspectorSidebar";
import Hamburger from "./Hamburger";
import { useSidebar } from "./SidebarContext";
const InspectorDashboard = () => {
      const { isSidebarCollapsed } = useSidebar();
  const [dashboardData, setDashboardData] = useState({
    equipmentDueInspection: 0,
    itemsNeedingMaintenance: 0,
    pendingClearances: 0,
  });

  const loadDashboardSummary = () => {
    // Load data from localStorage
    const scheduled =
      JSON.parse(localStorage.getItem("scheduledInspections")) || [];
    const inventory = JSON.parse(localStorage.getItem("inventory")) || [];
    const clearanceRequests =
      JSON.parse(localStorage.getItem("clearanceRequests")) || [];

    const today = new Date();
    const in7Days = new Date();
    in7Days.setDate(today.getDate() + 7);

    // Equipment due for inspection: scheduledDate within next 7 days and not past
    const equipmentDueInspection = scheduled.filter((ins) => {
      if (!ins.scheduledDate) return false;
      const scheduledDate = new Date(ins.scheduledDate);
      return (
        scheduledDate >= today &&
        scheduledDate <= in7Days &&
        ins.status?.toLowerCase() !== "completed"
      );
    }).length;

    // Items needing maintenance: status includes 'maintenance' (case insensitive) from inventory
    const itemsNeedingMaintenance = inventory.filter((item) => {
      return item.status && item.status.toLowerCase().includes("maintenance");
    }).length;

    // Pending clearance verifications: clearanceRequests not completed
    const pendingClearances = clearanceRequests.filter(
      (c) => !c.status || c.status.toLowerCase() !== "completed"
    ).length;

    setDashboardData({
      equipmentDueInspection,
      itemsNeedingMaintenance,
      pendingClearances,
    });
  };

  useEffect(() => {
    loadDashboardSummary();

    // Optional: Set up an interval to refresh data periodically
    const interval = setInterval(loadDashboardSummary, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="AppInspector">
             <Title>Inspector Dashboard | BFP Villanueva</Title>
              <Meta name="robots" content="noindex, nofollow" />
      <InspectorSidebar />
      <Hamburger />
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className={styles.INSHeader}>
          <h1>Logistic Dashboard</h1>
          <p>Welcome, Logistic User</p>
        </div>

        <div className={styles.INSSummaryCards}>
          <div className={styles.INSCard}>
            <h3>Equipment Due for Inspection</h3>
            <span>{dashboardData.equipmentDueInspection}</span>
          </div>
          <div className={styles.INSCard}>
            <h3>Items Needing Maintenance</h3>
            <span>{dashboardData.itemsNeedingMaintenance}</span>
          </div>
          <div className={styles.INSCard}>
            <h3>Pending Clearance Verifications</h3>
            <span>{dashboardData.pendingClearances}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectorDashboard;
