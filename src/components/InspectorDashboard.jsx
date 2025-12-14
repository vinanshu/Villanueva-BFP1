import React, { useState, useEffect } from "react";
import styles from "./InspectorDashboard.module.css";
import { Title, Meta } from "react-head";
import InspectorSidebar from "./InspectorSidebar";
import Hamburger from "./Hamburger";
import { useSidebar } from "./SidebarContext";
import { supabase } from "../lib/supabaseClient";
import { Calendar, Wrench, FileCheck, AlertCircle, Package, CheckCircle, Clock } from "lucide-react";

const InspectorDashboard = () => {
  const { isSidebarCollapsed } = useSidebar();
  const [dashboardData, setDashboardData] = useState({
    equipmentDueInspection: 0,
    itemsNeedingMaintenance: 0,
    pendingClearances: 0,
    totalEquipment: 0,
    operationalEquipment: 0,
    recentInspections: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadDashboardSummary = async () => {
    setStatsLoading(true);
    try {
      console.log("Loading dashboard data from Supabase...");
      
      const today = new Date();
      const in7Days = new Date();
      in7Days.setDate(today.getDate() + 7);
      const todayStr = today.toISOString().split('T')[0];
      const in7DaysStr = in7Days.toISOString().split('T')[0];

      // 1. Load equipment due for inspection (from inventory table)
      const { data: equipmentData, error: equipmentError } = await supabase
        .from("inventory")
        .select("id, item_name, last_inspection_date, next_inspection_date, status")
        .eq("status", "Operational") // Only operational equipment
        .or(`next_inspection_date.lte.${in7DaysStr},next_inspection_date.is.null`);

      if (equipmentError) {
        console.error("Error loading equipment:", equipmentError);
      }

      // Filter equipment due for inspection (within next 7 days)
      const equipmentDueInspection = equipmentData?.filter(item => {
        if (!item.next_inspection_date) return true; // Never inspected
        const nextDate = new Date(item.next_inspection_date);
        return nextDate <= in7Days && nextDate >= today;
      }).length || 0;

      // 2. Load items needing maintenance (from inventory table)
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from("inventory")
        .select("id, item_name, status")
        .or(`status.ilike.%maintenance%,status.ilike.%repair%,status.ilike.%damaged%`);

      if (maintenanceError) {
        console.error("Error loading maintenance items:", maintenanceError);
      }

      const itemsNeedingMaintenance = maintenanceData?.length || 0;

      // 3. Load pending clearance verifications (from clearance_requests table)
      const { data: clearanceData, error: clearanceError } = await supabase
        .from("clearance_requests")
        .select("id, type, status")
        .eq("status", "Pending");

      if (clearanceError) {
        console.error("Error loading clearance requests:", clearanceError);
      }

      const pendingClearances = clearanceData?.length || 0;

      // 4. Load total equipment count
      const { count: totalEquipment, error: totalError } = await supabase
        .from("inventory")
        .select("*", { count: 'exact', head: true });

      if (totalError) {
        console.error("Error loading total equipment:", totalError);
      }

      // 5. Load operational equipment count
      const { count: operationalEquipment, error: operationalError } = await supabase
        .from("inventory")
        .select("*", { count: 'exact', head: true })
        .eq("status", "Operational");

      if (operationalError) {
        console.error("Error loading operational equipment:", operationalError);
      }

      // 6. Load recent inspections (last 7 days from inspection_logs or inventory_logs)
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      const { data: recentLogs, error: logsError } = await supabase
        .from("inventory_logs")
        .select("id, action, created_at")
        .eq("action", "INSPECTION")
        .gte("created_at", weekAgoStr)
        .limit(5);

      if (logsError) {
        console.log("Trying audit_logs table for recent inspections...");
        const { data: auditLogs } = await supabase
          .from("audit_logs")
          .select("id, action, created_at")
          .eq("action", "INSPECTION")
          .gte("created_at", weekAgoStr)
          .limit(5);
        
        setRecentActivities(auditLogs || []);
      } else {
        setRecentActivities(recentLogs || []);
      }

      const recentInspections = recentActivities.length;

      // 7. Load recent clearance activities for the activity feed
      const { data: recentClearances, error: recentClearanceError } = await supabase
        .from("clearance_requests")
        .select(`
          id,
          type,
          status,
          created_at,
          approved_at,
          personnel:personnel_id (first_name, last_name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!recentClearanceError && recentClearances) {
        setRecentActivities(prev => [
          ...recentClearances.map(clearance => ({
            id: clearance.id,
            type: "CLEARANCE",
            action: clearance.status === "Completed" ? "Approved" : "Requested",
            details: `${clearance.type} - ${clearance.personnel?.first_name || ''} ${clearance.personnel?.last_name || ''}`,
            timestamp: clearance.approved_at || clearance.created_at
          })),
          ...prev
        ]);
      }

      setDashboardData({
        equipmentDueInspection,
        itemsNeedingMaintenance,
        pendingClearances,
        totalEquipment: totalEquipment || 0,
        operationalEquipment: operationalEquipment || 0,
        recentInspections
      });

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      alert(`Failed to load dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardSummary();

    // Optional: Set up an interval to refresh data periodically
    const interval = setInterval(loadDashboardSummary, 60000); // Refresh every 60 seconds

    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "";
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'approved':
        return '#10b981'; // green
      case 'pending':
        return '#f59e0b'; // amber
      case 'rejected':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  if (loading) {
    return (
      <div className="AppInspector">
        <Title>Inspector Dashboard | BFP Villanueva</Title>
        <Meta name="robots" content="noindex, nofollow" />
        <InspectorSidebar />
        <Hamburger />
        <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <div className={styles.loadingContainer}>
            <h2>Loading Inspector Dashboard...</h2>
            <p>Please wait while we load the dashboard data.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="AppInspector">
      <Title>Inspector Dashboard | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />
      <InspectorSidebar />
      <Hamburger />
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className={styles.INSHeader}>
          <h1>
            <Package size={32} className={styles.headerIcon} />
            Inspector Dashboard
          </h1>
          <p>Welcome, Inspector. Monitor equipment status and clearance requests.</p>
          <button 
            className={styles.refreshBtn}
            onClick={loadDashboardSummary}
            disabled={statsLoading}
          >
            {statsLoading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>

        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.primary}`}>
            <div className={styles.statIcon}>
              <Calendar size={24} />
            </div>
            <div className={styles.statContent}>
              <h3>Equipment Due for Inspection</h3>
              <span className={styles.statNumber}>
                {dashboardData.equipmentDueInspection}
              </span>
              <p className={styles.statSubtext}>
                Within next 7 days
              </p>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.warning}`}>
            <div className={styles.statIcon}>
              <Wrench size={24} />
            </div>
            <div className={styles.statContent}>
              <h3>Items Needing Maintenance</h3>
              <span className={styles.statNumber}>
                {dashboardData.itemsNeedingMaintenance}
              </span>
              <p className={styles.statSubtext}>
                Require attention
              </p>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.info}`}>
            <div className={styles.statIcon}>
              <FileCheck size={24} />
            </div>
            <div className={styles.statContent}>
              <h3>Pending Clearance Verifications</h3>
              <span className={styles.statNumber}>
                {dashboardData.pendingClearances}
              </span>
              <p className={styles.statSubtext}>
                Awaiting approval
              </p>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.success}`}>
            <div className={styles.statIcon}>
              <CheckCircle size={24} />
            </div>
            <div className={styles.statContent}>
              <h3>Operational Equipment</h3>
              <span className={styles.statNumber}>
                {dashboardData.operationalEquipment}
              </span>
              <p className={styles.statSubtext}>
                of {dashboardData.totalEquipment} total
              </p>
            </div>
          </div>
        </div>

        <div className={styles.dashboardGrid}>
          <div className={styles.recentActivity}>
            <div className={styles.sectionHeader}>
              <h3>
                <Clock size={20} />
                Recent Activity
              </h3>
            </div>
            <div className={styles.activityList}>
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <div key={activity.id || index} className={styles.activityItem}>
                    <div 
                      className={styles.activityDot}
                      style={{ backgroundColor: getStatusColor(activity.action) }}
                    />
                    <div className={styles.activityContent}>
                      <div className={styles.activityTitle}>
                        {activity.type === "CLEARANCE" ? "Clearance" : "Inspection"} {activity.action}
                      </div>
                      <div className={styles.activityDetails}>
                        {activity.details || `Activity ${index + 1}`}
                      </div>
                    </div>
                    <div className={styles.activityTime}>
                      {formatDate(activity.timestamp)}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noActivity}>
                  <AlertCircle size={24} />
                  <p>No recent activity found</p>
                </div>
              )}
            </div>
          </div>

          <div className={styles.quickActions}>
            <div className={styles.sectionHeader}>
              <h3>Quick Actions</h3>
            </div>
            <div className={styles.actionButtons}>
              <a href="/inspectorEquipmentInspection" className={styles.actionBtn}>
                <Calendar size={18} />
                <span>Schedule Inspection</span>
              </a>
              <a href="/inspectorInspectionReport" className={styles.actionBtn}>
                <FileCheck size={18} />
                <span>Review Clearances</span>
              </a>
              <a href="/inspectorInventoryControl" className={styles.actionBtn}>
                <Package size={18} />
                <span>Inventory Control</span>
              </a>
              <a href="/inspectionHistory" className={styles.actionBtn}>
                <Clock size={18} />
                <span>View History</span>
              </a>
            </div>
            
            <div className={styles.importantNotes}>
              <div className={styles.sectionHeader}>
                <h4>Important Notes</h4>
              </div>
              <ul className={styles.notesList}>
                <li>• Regular equipment inspections prevent failures</li>
                <li>• Clearance requests should be reviewed within 48 hours</li>
                <li>• Document all maintenance activities</li>
                <li>• Update equipment status after inspection</li>
              </ul>
            </div>
          </div>
        </div>

        <div className={styles.systemHealth}>
          <div className={styles.sectionHeader}>
            <h3>System Health Status</h3>
          </div>
          <div className={styles.healthIndicators}>
            <div className={styles.healthItem}>
              <div className={styles.healthLabel}>Data Connection</div>
              <div className={styles.healthStatus}>
                <span className={`${styles.statusDot} ${styles.healthy}`} />
                Connected
              </div>
            </div>
            <div className={styles.healthItem}>
              <div className={styles.healthLabel}>Database</div>
              <div className={styles.healthStatus}>
                <span className={`${styles.statusDot} ${styles.healthy}`} />
                Operational
              </div>
            </div>
            <div className={styles.healthItem}>
              <div className={styles.healthLabel}>Last Updated</div>
              <div className={styles.healthStatus}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectorDashboard;