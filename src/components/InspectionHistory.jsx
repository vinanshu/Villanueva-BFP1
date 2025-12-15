// InspectionHistory.jsx
import React, { useState, useEffect, useMemo } from "react";
import styles from "./InspectionHistory.module.css";
import { Title, Meta } from "react-head";
import InspectorSidebar from "./InspectorSidebar";
import Hamburger from "./Hamburger";
import { useSidebar } from "./SidebarContext";
import { supabase } from "../lib/supabaseClient";
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  User,
  Package,
  RefreshCw
} from "lucide-react";

const InspectionHistory = () => {
  const { isSidebarCollapsed } = useSidebar();
  const [inspections, setInspections] = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [activeTab, setActiveTab] = useState("inspections");
  const [exportLoading, setExportLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Loading inspection history data...");
      
      // 1. Load inspection records from the new table
      const { data: inspectionData, error: inspectionError } = await supabase
        .from("inspections")
        .select(`
          *,
          inspector:inspector_id (
            id,
            first_name,
            last_name,
            rank,
            designation
          )
        `)
        .order("inspection_date", { ascending: false });

      if (inspectionError) {
        console.error("Error loading inspections:", inspectionError);
        setError(`Error loading inspections: ${inspectionError.message}`);
        setInspections([]);
      } else {
        console.log(`Loaded ${inspectionData?.length || 0} inspection records`);
        setInspections(inspectionData || []);
      }

      // 2. Load inventory control logs
      const { data: logData, error: logError } = await supabase
        .from("inventory_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (logError) {
        console.log("Trying audit_logs table...");
        const { data: auditData, error: auditError } = await supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        
        if (auditError) {
          console.log("No inventory logs table found. Creating sample data...");
          await createSampleInventoryLogs();
          await loadData();
          return;
        } else {
          setInventoryLogs(auditData || []);
        }
      } else {
        setInventoryLogs(logData || []);
      }

    } catch (error) {
      console.error("Error in loadData:", error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createSampleInventoryLogs = async () => {
    try {
      const { error: createError } = await supabase
        .from("inventory_logs")
        .insert([
          {
            action: "INSPECTION",
            item_name: "Fire Hose 1",
            item_code: "FH-001",
            previous_status: "Pending",
            new_status: "Operational",
            inspector_name: "Inspector Smith",
            notes: "Routine monthly inspection passed",
            created_at: new Date(Date.now() - 86400000).toISOString()
          },
          {
            action: "MAINTENANCE",
            item_name: "Breathing Apparatus",
            item_code: "BA-005",
            previous_status: "Operational",
            new_status: "Maintenance",
            inspector_name: "Inspector Johnson",
            notes: "Scheduled maintenance - air tank replacement",
            created_at: new Date(Date.now() - 172800000).toISOString()
          },
          {
            action: "REPAIR",
            item_name: "Fire Extinguisher",
            item_code: "FE-012",
            previous_status: "Damaged",
            new_status: "Repaired",
            inspector_name: "Inspector Williams",
            notes: "Pressure gauge replaced",
            created_at: new Date(Date.now() - 259200000).toISOString()
          },
          {
            action: "REPLACEMENT",
            item_name: "Protective Helmet",
            item_code: "PH-008",
            previous_status: "Lost",
            new_status: "Replaced",
            inspector_name: "Inspector Brown",
            notes: "Replacement issued to Firefighter Davis",
            created_at: new Date(Date.now() - 345600000).toISOString()
          }
        ]);
      
      if (createError) {
        console.error("Error creating sample logs:", createError);
        if (createError.code !== '42P01') {
          setError(`Failed to create sample logs: ${createError.message}`);
        }
      }
    } catch (error) {
      console.error("Error creating sample logs:", error);
      setError(`Failed to create sample logs: ${error.message}`);
    }
  };

  const filteredInspections = useMemo(() => {
    return inspections.filter(inspection => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === "" || 
        (inspection.inspector && (
          (inspection.inspector.first_name?.toLowerCase() || '').includes(searchLower) ||
          (inspection.inspector.last_name?.toLowerCase() || '').includes(searchLower) ||
          (inspection.equipment_name?.toLowerCase() || '').includes(searchLower) ||
          (inspection.findings?.toLowerCase() || '').includes(searchLower) ||
          (inspection.notes?.toLowerCase() || '').includes(searchLower)
        )) ||
        (!inspection.inspector && (
          (inspection.equipment_name?.toLowerCase() || '').includes(searchLower) ||
          (inspection.findings?.toLowerCase() || '').includes(searchLower) ||
          (inspection.notes?.toLowerCase() || '').includes(searchLower)
        ));
      
      const matchesStatus = selectedStatus === "all" || 
        (inspection.status?.toLowerCase() || '') === selectedStatus.toLowerCase();
      
      // Since inspections table doesn't have "type" field, we'll use status as type filter
      const matchesType = selectedType === "all" || 
        (inspection.status?.toLowerCase() || '') === selectedType.toLowerCase();
      
      const inspectionDate = inspection.inspection_date ? new Date(inspection.inspection_date) : null;
      let matchesDate = true;
      
      if (dateRange.start || dateRange.end) {
        matchesDate = false;
        if (inspectionDate) {
          const startDate = dateRange.start ? new Date(dateRange.start) : null;
          const endDate = dateRange.end ? new Date(dateRange.end) : null;
          
          if (startDate) startDate.setHours(0, 0, 0, 0);
          if (endDate) endDate.setHours(23, 59, 59, 999);
          
          if (startDate && endDate) {
            matchesDate = inspectionDate >= startDate && inspectionDate <= endDate;
          } else if (startDate) {
            matchesDate = inspectionDate >= startDate;
          } else if (endDate) {
            matchesDate = inspectionDate <= endDate;
          }
        }
      }
      
      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  }, [inspections, searchTerm, selectedStatus, selectedType, dateRange]);

  const filteredInventoryLogs = useMemo(() => {
    return inventoryLogs.filter(log => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === "" || 
        (log.item_name?.toLowerCase() || '').includes(searchLower) ||
        (log.item_code?.toLowerCase() || '').includes(searchLower) ||
        (log.inspector_name?.toLowerCase() || '').includes(searchLower) ||
        (log.notes?.toLowerCase() || '').includes(searchLower);
      
      const matchesAction = selectedType === "all" || 
        (log.action?.toLowerCase() || '') === selectedType.toLowerCase();
      
      const logDate = log.created_at ? new Date(log.created_at) : null;
      let matchesDate = true;
      
      if (dateRange.start || dateRange.end) {
        matchesDate = false;
        if (logDate) {
          const startDate = dateRange.start ? new Date(dateRange.start) : null;
          const endDate = dateRange.end ? new Date(dateRange.end) : null;
          
          if (startDate) startDate.setHours(0, 0, 0, 0);
          if (endDate) endDate.setHours(23, 59, 59, 999);
          
          if (startDate && endDate) {
            matchesDate = logDate >= startDate && logDate <= endDate;
          } else if (startDate) {
            matchesDate = logDate >= startDate;
          } else if (endDate) {
            matchesDate = logDate <= endDate;
          }
        }
      }
      
      return matchesSearch && matchesAction && matchesDate;
    });
  }, [inventoryLogs, searchTerm, selectedType, dateRange]);

  // Paginated data
  const paginatedInspections = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInspections.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInspections, currentPage]);

  const paginatedInventoryLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInventoryLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInventoryLogs, currentPage]);

  const totalPages = useMemo(() => {
    const totalItems = activeTab === "inspections" ? filteredInspections.length : filteredInventoryLogs.length;
    return Math.ceil(totalItems / itemsPerPage);
  }, [activeTab, filteredInspections.length, filteredInventoryLogs.length]);

  const getStatusBadgeClass = (status) => {
    if (!status) return styles.statusDefault;
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('pending')) return styles.statusPending;
    if (statusLower.includes('progress')) return styles.statusInProgress;
    if (statusLower.includes('completed')) return styles.statusCompleted;
    if (statusLower.includes('failed')) return styles.statusRejected;
    if (statusLower.includes('cancelled')) return styles.statusCancelled;
    return styles.statusDefault;
  };

  const getActionBadgeClass = (action) => {
    if (!action) return styles.actionDefault;
    
    const actionUpper = action.toUpperCase();
    if (actionUpper.includes('INSPECTION')) return styles.actionInspection;
    if (actionUpper.includes('MAINTENANCE')) return styles.actionMaintenance;
    if (actionUpper.includes('REPAIR')) return styles.actionRepair;
    if (actionUpper.includes('REPLACEMENT')) return styles.actionReplacement;
    if (actionUpper.includes('TRANSFER')) return styles.actionTransfer;
    if (actionUpper.includes('ISSUE')) return styles.actionIssue;
    return styles.actionDefault;
  };

  const getStatusIcon = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('completed')) {
      return <CheckCircle size={16} />;
    }
    if (statusLower.includes('failed') || statusLower.includes('cancelled')) {
      return <XCircle size={16} />;
    }
    if (statusLower.includes('pending')) {
      return <Clock size={16} />;
    }
    if (statusLower.includes('progress')) {
      return <AlertCircle size={16} />;
    }
    return <FileText size={16} />;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "";
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  };

  const exportToCSV = async () => {
    setExportLoading(true);
    try {
      const data = activeTab === "inspections" ? filteredInspections : filteredInventoryLogs;
      
      if (data.length === 0) {
        alert("No data to export!");
        return;
      }

      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      
      if (activeTab === "inspections") {
        // Updated headers for inspections table
        const headers = ["ID", "Equipment Name", "Inspector", "Status", "Findings", "Inspection Date", "Next Inspection Date", "Recommendations", "Notes"];
        csvContent += headers.join(",") + "\n";
        
        data.forEach(item => {
          const row = [
            item.id || '',
            item.equipment_name?.replace(/"/g, '""') || '',
            item.inspector ? `${item.inspector.first_name || ''} ${item.inspector.last_name || ''}`.replace(/"/g, '""') : item.inspector_name?.replace(/"/g, '""') || '',
            item.status?.replace(/"/g, '""') || '',
            item.findings?.replace(/"/g, '""') || '',
            formatDate(item.inspection_date).replace(/"/g, '""'),
            formatDate(item.next_inspection_date).replace(/"/g, '""'),
            item.recommendations?.replace(/"/g, '""') || '',
            item.notes?.replace(/"/g, '""') || ''
          ].map(field => `"${field}"`).join(",");
          csvContent += row + "\n";
        });
      } else {
        const headers = ["ID", "Action", "Item Name", "Item Code", "Previous Status", "New Status", "Inspector", "Notes", "Date"];
        csvContent += headers.join(",") + "\n";
        
        data.forEach(item => {
          const row = [
            item.id || '',
            item.action?.replace(/"/g, '""') || '',
            item.item_name?.replace(/"/g, '""') || '',
            item.item_code?.replace(/"/g, '""') || '',
            item.previous_status?.replace(/"/g, '""') || '',
            item.new_status?.replace(/"/g, '""') || '',
            item.inspector_name?.replace(/"/g, '""') || '',
            item.notes?.replace(/"/g, '""') || '',
            formatDateTime(item.created_at).replace(/"/g, '""')
          ].map(field => `"${field}"`).join(",");
          csvContent += row + "\n";
        });
      }
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${activeTab}_history_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert(`Exported ${data.length} records to CSV successfully!`);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert(`Failed to export data: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedStatus("all");
    setSelectedType("all");
    setDateRange({ start: "", end: "" });
    setCurrentPage(1);
  };

  const getUniqueStatuses = () => {
    const statuses = [...new Set(inspections.map(item => item.status).filter(Boolean))];
    return statuses;
  };

  const getUniqueTypes = () => {
    if (activeTab === "inspections") {
      // For inspections, use status as type since there's no "type" field
      const statuses = [...new Set(inspections.map(item => item.status).filter(Boolean))];
      return statuses;
    } else {
      const actions = [...new Set(inventoryLogs.map(item => item.action).filter(Boolean))];
      return actions;
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (loading) {
    return (
      <div className="AppInspectorInventoryControl">
        <InspectorSidebar />
        <Hamburger />
        <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <div className={styles.loadingContainer}>
            <RefreshCw size={48} className={styles.spinningIcon} />
            <h2>Loading Inspection History...</h2>
            <p>Please wait while we load the historical data.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="AppInspectorInventoryControl">
      <Title>Inspection History | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />
      <InspectorSidebar />
      <Hamburger />
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <section className={styles.IHSection}>
          <div className={styles.IHSectionHeader}>
            <h2>
              <FileText size={28} className={styles.headerIcon} />
              Inspection History & Audit Logs
            </h2>
            <div className={styles.headerActions}>
              <button
                className={`${styles.IHBtn} ${styles.IHRefresh}`}
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? styles.spinningIcon : ""} />
                Refresh Data
              </button>
              <button
                className={`${styles.IHBtn} ${styles.IHExport}`}
                onClick={exportToCSV}
                disabled={exportLoading || (activeTab === "inspections" ? filteredInspections.length === 0 : filteredInventoryLogs.length === 0)}
              >
                <Download size={16} />
                {exportLoading ? "Exporting..." : "Export CSV"}
              </button>
            </div>
          </div>
          
          {error && (
            <div className={styles.errorAlert}>
              <AlertCircle size={20} />
              <span>{error}</span>
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}
          
          <div className={styles.statsSummary}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <FileText size={24} />
              </div>
              <span className={styles.statNumber}>
                {inspections.length}
              </span>
              <span className={styles.statLabel}>Total Inspections</span>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <CheckCircle size={24} />
              </div>
              <span className={styles.statNumber}>
                {inspections.filter(i => 
                  i.status && 
                  i.status.toLowerCase().includes('completed')
                ).length}
              </span>
              <span className={styles.statLabel}>Completed</span>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Package size={24} />
              </div>
              <span className={styles.statNumber}>
                {inventoryLogs.length}
              </span>
              <span className={styles.statLabel}>Inventory Actions</span>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <User size={24} />
              </div>
              <span className={styles.statNumber}>
                {[...new Set(inspections.map(i => i.inspector_id).filter(Boolean))].length}
              </span>
              <span className={styles.statLabel}>Inspectors</span>
            </div>
          </div>

          <div className={styles.tabsContainer}>
            <button
              className={`${styles.tabButton} ${activeTab === "inspections" ? styles.activeTab : ""}`}
              onClick={() => {
                setActiveTab("inspections");
                setCurrentPage(1);
              }}
            >
              <FileText size={18} />
              Equipment Inspections
              <span className={styles.tabBadge}>{inspections.length}</span>
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === "inventory" ? styles.activeTab : ""}`}
              onClick={() => {
                setActiveTab("inventory");
                setCurrentPage(1);
              }}
            >
              <Package size={18} />
              Inventory Control Logs
              <span className={styles.tabBadge}>{inventoryLogs.length}</span>
            </button>
          </div>

          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder={`Search ${activeTab === "inspections" ? "equipment, inspector, or findings..." : "item, inspector, or notes..."}`}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className={styles.searchInput}
              />
            </div>
            
            <div className={styles.filterGroup}>
              <Filter size={16} />
              <select 
                className={styles.filterSelect}
                value={activeTab === "inspections" ? selectedStatus : selectedType}
                onChange={(e) => {
                  if (activeTab === "inspections") {
                    setSelectedStatus(e.target.value);
                  } else {
                    setSelectedType(e.target.value);
                  }
                  setCurrentPage(1);
                }}
              >
                <option value="all">All {activeTab === "inspections" ? "Status" : "Actions"}</option>
                {getUniqueTypes().map((type, index) => (
                  <option key={index} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            
            {activeTab === "inspections" && (
              <div className={styles.filterGroup}>
                <select 
                  className={styles.filterSelect}
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            )}
            
            <div className={styles.filterGroup}>
              <Calendar size={16} />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  setDateRange(prev => ({ ...prev, start: e.target.value }));
                  setCurrentPage(1);
                }}
                className={styles.dateInput}
                max={dateRange.end || new Date().toISOString().split('T')[0]}
              />
              <span className={styles.dateSeparator}>to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange(prev => ({ ...prev, end: e.target.value }));
                  setCurrentPage(1);
                }}
                className={styles.dateInput}
                min={dateRange.start}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <button 
              className={`${styles.IHBtn} ${styles.IHClear}`}
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>

          <div className={styles.resultsCount}>
            Showing {activeTab === "inspections" ? filteredInspections.length : filteredInventoryLogs.length} of {activeTab === "inspections" ? inspections.length : inventoryLogs.length} records
          </div>

          {activeTab === "inspections" ? (
            <div className={styles.tableContainer}>
              {filteredInspections.length === 0 ? (
                <div className={styles.noDataMessage}>
                  <FileText size={48} className={styles.noDataIcon} />
                  <h3>No inspection records found</h3>
                  <p>Try adjusting your filters or search terms.</p>
                </div>
              ) : (
                <>
                  <table className={styles.IHTable}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Equipment</th>
                        <th>Inspector</th>
                        <th>Status</th>
                        <th>Findings</th>
                        <th>Inspection Date</th>
                        <th>Next Inspection</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedInspections.map((inspection) => (
                        <tr key={inspection.id}>
                          <td className={styles.idCell}>
                            <code>{inspection.id ? inspection.id.substring(0, 8) + '...' : 'N/A'}</code>
                          </td>
                          <td>
                            <div className={styles.personnelCell}>
                              <Package size={14} className={styles.cellIcon} />
                              <div>
                                <strong>{inspection.equipment_name || 'Unknown Equipment'}</strong>
                                {inspection.equipment_id && (
                                  <div className={styles.personnelDetails}>
                                    ID: {inspection.equipment_id.substring(0, 8)}...
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.personnelCell}>
                              <User size={14} className={styles.cellIcon} />
                              <div>
                                <strong>{inspection.inspector ? `${inspection.inspector.first_name || ''} ${inspection.inspector.last_name || ''}` : inspection.inspector_name || 'Unknown'}</strong>
                                <div className={styles.personnelDetails}>
                                  {inspection.inspector?.designation || ''} • {inspection.inspector?.rank || ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${getStatusBadgeClass(inspection.status)}`}>
                              {getStatusIcon(inspection.status)}
                              {inspection.status || 'PENDING'}
                            </span>
                          </td>
                          <td className={styles.reasonCell}>
                            {inspection.findings || 'No findings provided'}
                          </td>
                          <td>
                            <div className={styles.dateCell}>
                              <Calendar size={12} />
                              {formatDate(inspection.inspection_date)}
                            </div>
                          </td>
                          <td>
                            <div className={styles.dateCell}>
                              <Calendar size={12} />
                              {formatDate(inspection.next_inspection_date)}
                            </div>
                          </td>
                          <td>
                            <button
                              className={`${styles.IHBtn} ${styles.IHView}`}
                              onClick={() => {
                                const details = `
Inspection Details:
------------------------
ID: ${inspection.id || ''}
Equipment: ${inspection.equipment_name || ''}
Equipment ID: ${inspection.equipment_id || ''}
Inspector: ${inspection.inspector ? `${inspection.inspector.first_name || ''} ${inspection.inspector.last_name || ''}` : inspection.inspector_name || ''}
Status: ${inspection.status || 'PENDING'}
Inspection Date: ${formatDate(inspection.inspection_date)}
Next Inspection Date: ${formatDate(inspection.next_inspection_date)}
Findings: ${inspection.findings || ''}
Recommendations: ${inspection.recommendations || ''}
Notes: ${inspection.notes || ''}
Created: ${formatDateTime(inspection.created_at)}
${inspection.updated_at ? `Updated: ${formatDateTime(inspection.updated_at)}` : ''}
                                `.trim();
                                alert(details);
                              }}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {totalPages > 1 && (
                    <div className={styles.pagination}>
                      <div className={styles.paginationInfo}>
                        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredInspections.length)} to {Math.min(currentPage * itemsPerPage, filteredInspections.length)} of {filteredInspections.length} entries
                      </div>
                      <div className={styles.paginationControls}>
                        <button 
                          className={styles.paginationButton} 
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <button 
                              key={pageNum}
                              className={`${styles.paginationButton} ${currentPage === pageNum ? styles.active : ''}`}
                              onClick={() => handlePageChange(pageNum)}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button 
                          className={styles.paginationButton}
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className={styles.tableContainer}>
              {filteredInventoryLogs.length === 0 ? (
                <div className={styles.noDataMessage}>
                  <Package size={48} className={styles.noDataIcon} />
                  <h3>No inventory control logs found</h3>
                  <p>Try adjusting your filters or search terms.</p>
                </div>
              ) : (
                <>
                  <table className={styles.IHTable}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Action</th>
                        <th>Item Details</th>
                        <th>Status Change</th>
                        <th>Inspector</th>
                        <th>Date & Time</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedInventoryLogs.map((log, index) => (
                        <tr key={log.id || `log-${index}`}>
                          <td className={styles.idCell}>
                            <code>{log.id ? log.id.substring(0, 8) + '...' : 'N/A'}</code>
                          </td>
                          <td>
                            <span className={`${styles.actionBadge} ${getActionBadgeClass(log.action)}`}>
                              {log.action || 'UNKNOWN'}
                            </span>
                          </td>
                          <td>
                            <div className={styles.itemCell}>
                              <strong>{log.item_name || 'Unnamed Item'}</strong>
                              <div className={styles.itemCode}>
                                <code>{log.item_code || 'No Code'}</code>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.statusChange}>
                              <span className={`${styles.statusIndicator} ${styles[log.previous_status?.toLowerCase()] || styles.unknown}`}>
                                {log.previous_status || 'Unknown'}
                              </span>
                              <span className={styles.changeArrow}>→</span>
                              <span className={`${styles.statusIndicator} ${styles[log.new_status?.toLowerCase()] || styles.unknown}`}>
                                {log.new_status || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.inspectorCell}>
                              <User size={14} className={styles.cellIcon} />
                              {log.inspector_name || 'Unknown Inspector'}
                            </div>
                        </td>
                        <td>
                          <div className={styles.dateCell}>
                            <Calendar size={12} />
                            {formatDateTime(log.created_at)}
                          </div>
                        </td>
                        <td className={styles.notesCell}>
                          {log.notes || 'No notes provided'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <div className={styles.paginationInfo}>
                      Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredInventoryLogs.length)} to {Math.min(currentPage * itemsPerPage, filteredInventoryLogs.length)} of {filteredInventoryLogs.length} entries
                    </div>
                    <div className={styles.paginationControls}>
                      <button 
                        className={styles.paginationButton} 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button 
                            key={pageNum}
                            className={`${styles.paginationButton} ${currentPage === pageNum ? styles.active : ''}`}
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button 
                        className={styles.paginationButton}
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        </section>
      </div>
    </div>
  );
};

export default InspectionHistory;