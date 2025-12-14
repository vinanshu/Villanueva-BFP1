import React, { useState, useEffect } from "react";
import styles from "./InspectorInspectionReport.module.css";
import { Title, Meta } from "react-head";
import InspectorSidebar from "./InspectorSidebar";
import Hamburger from "./Hamburger";
import { useSidebar } from "./SidebarContext";
import { supabase } from "../lib/supabaseClient";

const InspectorInspectionReport = () => {
  const { isSidebarCollapsed } = useSidebar();
  const [clearances, setClearances] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMissingAmount, setEditingMissingAmount] = useState(null);
  const [missingAmountValue, setMissingAmountValue] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedClearanceId, setSelectedClearanceId] = useState(null);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log("Loading clearance data...");
      
      // First, let's load data separately to debug
      
      // 1. Load clearance requests
      const { data: clearanceData, error: clearanceError } = await supabase
        .from("clearance_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (clearanceError) {
        console.error("Error loading clearances:", clearanceError);
        alert(`Error loading clearances: ${clearanceError.message}`);
        setClearances([]);
      } else {
        console.log(`Loaded ${clearanceData?.length || 0} clearance requests`);
        setClearances(clearanceData || []);
      }

      // 2. Load personnel separately
      const { data: personnelData, error: personnelError } = await supabase
        .from("personnel")
        .select("id, first_name, last_name, role")
        .order("last_name", { ascending: true });

      if (personnelError) {
        console.error("Error loading personnel:", personnelError);
        // Try with just basic columns
        const { data: simplePersonnel } = await supabase
          .from("personnel")
          .select("id, first_name, last_name")
          .order("last_name", { ascending: true });
        
        setPersonnel(simplePersonnel || []);
      } else {
        setPersonnel(personnelData || []);
      }

      // 3. Load inventory
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select("id, item_code, item_name, assigned_personnel_id, status, purchase_price")
        .order("item_name", { ascending: true });

      if (inventoryError) {
        console.error("Error loading inventory:", inventoryError);
        setInventory([]);
      } else {
        setInventory(inventoryData || []);
      }

    } catch (error) {
      console.error("Error in loadData:", error);
      alert(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getPersonnelName = (clearance) => {
    if (!clearance || !clearance.personnel_id) {
      return "Unknown Personnel";
    }
    
    // Try to find personnel in our loaded list
    const person = personnel.find(p => p.id === clearance.personnel_id);
    if (person) {
      return `${person.first_name || ''} ${person.last_name || ''}`.trim();
    }
    
    // Check if we have personnel data in the clearance object (from join)
    if (clearance.personnel && clearance.personnel.first_name) {
      return `${clearance.personnel.first_name} ${clearance.personnel.last_name}`;
    }
    
    return "Unknown Personnel";
  };

  const getPersonnelRole = (clearance) => {
    if (!clearance || !clearance.personnel_id) {
      return "";
    }
    
    const person = personnel.find(p => p.id === clearance.personnel_id);
    if (person) {
      return person.role || "";
    }
    
    if (clearance.personnel && clearance.personnel.role) {
      return clearance.personnel.role;
    }
    
    return "";
  };

  const getAssignedInventory = (personnelId) => {
    if (!personnelId) return [];
    return inventory.filter(item => item.assigned_personnel_id === personnelId);
  };

  // Filter for equipment-related clearances
  const equipmentClearances = clearances.filter(
    clearance => clearance.type === 'Equipment Completion' || 
                 clearance.type === 'Equipment Clearance' ||
                 clearance.type === 'Others' || // Sometimes equipment might be under Others
                 (!clearance.type && clearance.status === 'Pending') // Fallback
  );

  const verifyClearance = async (clearanceId) => {
    try {
      const { error } = await supabase
        .from("clearance_requests")
        .update({
          status: "Completed",
          approved_by: "Inspector",
          approved_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", clearanceId);

      if (error) throw error;

      alert("Clearance verified successfully!");
      await loadData();
    } catch (error) {
      console.error("Error verifying clearance:", error);
      alert(`Failed to verify clearance: ${error.message}`);
    }
  };

  const rejectClearance = async (clearanceId) => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }

    try {
      const clearance = clearances.find(c => c.id === clearanceId);
      const personnelId = clearance?.personnel_id;
      
      // Get assigned items for this personnel
      const assignedItems = getAssignedInventory(personnelId);
      const nonOperationalItems = assignedItems.filter(
        item => item.status !== 'Operational' && item.status !== 'Good'
      );
      
      let totalMissingAmount = 0;
      nonOperationalItems.forEach(item => {
        totalMissingAmount += parseFloat(item.purchase_price || 0);
      });

      const { error } = await supabase
        .from("clearance_requests")
        .update({
          status: "Rejected",
          missing_amount: totalMissingAmount,
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clearanceId);

      if (error) throw error;

      alert("Clearance rejected!");
      setShowRejectModal(false);
      setRejectionReason("");
      await loadData();
    } catch (error) {
      console.error("Error rejecting clearance:", error);
      alert(`Failed to reject clearance: ${error.message}`);
    }
  };

  const updateMissingAmount = async (clearanceId, amount) => {
    try {
      const { error } = await supabase
        .from("clearance_requests")
        .update({
          missing_amount: parseFloat(amount),
          updated_at: new Date().toISOString(),
        })
        .eq("id", clearanceId);

      if (error) throw error;

      alert("Missing amount updated successfully!");
      setEditingMissingAmount(null);
      await loadData();
    } catch (error) {
      console.error("Error updating missing amount:", error);
      alert(`Failed to update missing amount: ${error.message}`);
    }
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

  const getStatusBadgeClass = (status) => {
    if (!status) return styles.statusDefault;
    
    switch (status.toLowerCase()) {
      case 'pending': return styles.statusPending;
      case 'in progress': return styles.statusInProgress;
      case 'completed': return styles.statusCompleted;
      case 'rejected': return styles.statusRejected;
      case 'cancelled': return styles.statusCancelled;
      default: return styles.statusDefault;
    }
  };

  if (loading) {
    return (
      <div className="AppInspectorInventoryControl">
        <InspectorSidebar />
        <Hamburger />
        <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <div className={styles.loadingContainer}>
            <h2>Loading inspection reports...</h2>
            <p>Please wait while we load the data.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="AppInspectorInventoryControl">
      <Title>Inspector Inspection Report | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />
      <InspectorSidebar />
      <Hamburger />
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <section className={styles.IIRSection}>
          <div className={styles.IIRSectionHeader}>
            <h2>Equipment Clearance Verifications</h2>
            <div className={styles.headerActions}>
              <button
                className={`${styles.IIRBtn} ${styles.IIRRefresh}`}
                onClick={loadData}
              >
                Refresh
              </button>
              <span className={styles.IIRViewAll}>
                Showing {equipmentClearances.length} equipment clearances
              </span>
            </div>
          </div>
          
          <div className={styles.statsSummary}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>
                {equipmentClearances.filter(c => c.status === 'Pending').length}
              </span>
              <span className={styles.statLabel}>Pending</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>
                {equipmentClearances.filter(c => c.status === 'In Progress').length}
              </span>
              <span className={styles.statLabel}>In Progress</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>
                {equipmentClearances.filter(c => c.status === 'Completed').length}
              </span>
              <span className={styles.statLabel}>Completed</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>
                {equipmentClearances.filter(c => c.status === 'Rejected').length}
              </span>
              <span className={styles.statLabel}>Rejected</span>
            </div>
          </div>

          {clearances.length === 0 ? (
            <div className={styles.noDataMessage}>
              <h3>No clearance data found</h3>
              <p>There are no clearance requests in the database yet.</p>
              <button 
                className={`${styles.IIRBtn} ${styles.createSampleBtn}`}
                onClick={async () => {
                  try {
                    // Create a sample clearance request
                    if (personnel.length > 0) {
                      const samplePerson = personnel[0];
                      const { error } = await supabase
                        .from("clearance_requests")
                        .insert([{
                          personnel_id: samplePerson.id,
                          type: "Equipment Completion",
                          status: "Pending",
                          reason: "Sample equipment clearance request",
                          remarks: "Created for testing purposes",
                          effective_date: new Date().toISOString().split('T')[0]
                        }]);
                      
                      if (error) throw error;
                      alert("Sample clearance request created!");
                      await loadData();
                    } else {
                      alert("No personnel found to create sample data.");
                    }
                  } catch (error) {
                    console.error("Error creating sample:", error);
                    alert(`Failed to create sample: ${error.message}`);
                  }
                }}
              >
                Create Sample Data
              </button>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.IIRTable}>
                <thead>
                  <tr>
                    <th>Personnel</th>
                    <th>Type</th>
                    <th>Request Date</th>
                    <th>Status</th>
                    <th>Missing Equipment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentClearances.map((clearance) => {
                    const assignedItems = getAssignedInventory(clearance.personnel_id);
                    const nonOperationalItems = assignedItems.filter(
                      item => item.status !== 'Operational' && item.status !== 'Good'
                    );
                    
                    return (
                      <React.Fragment key={clearance.id}>
                        <tr>
                          <td>
                            <strong>{getPersonnelName(clearance)}</strong>
                            {getPersonnelRole(clearance) && (
                              <div className={styles.personnelRole}>
                                {getPersonnelRole(clearance)}
                              </div>
                            )}
                            {clearance.personnel_id && (
                              <div className={styles.personnelId}>
                                ID: {clearance.personnel_id.substring(0, 8)}...
                              </div>
                            )}
                          </td>
                          <td>{clearance.type || "Equipment"}</td>
                          <td>{formatDate(clearance.created_at)}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${getStatusBadgeClass(clearance.status)}`}>
                              {clearance.status || "Pending"}
                            </span>
                            {clearance.approved_by && (
                              <div className={styles.verifiedInfo}>
                                Approved by: {clearance.approved_by}
                                <br />
                                {formatDateTime(clearance.approved_at)}
                              </div>
                            )}
                          </td>
                          <td>
                            {nonOperationalItems.length > 0 ? (
                              <span className={styles.missingCount}>
                                {nonOperationalItems.length} items
                                {(clearance.missing_amount || 0) > 0 && (
                                  <div className={styles.missingAmount}>
                                    ₱{parseFloat(clearance.missing_amount || 0).toFixed(2)}
                                  </div>
                                )}
                              </span>
                            ) : (
                              <span className={styles.noMissing}>No missing items</span>
                            )}
                          </td>
                          <td>
                            <div className={styles.actionButtons}>
                              {clearance.status !== 'Completed' && 
                               clearance.status !== 'Rejected' && 
                               clearance.status !== 'Cancelled' && (
                                <>
                                  <button
                                    className={`${styles.IIRBtn} ${styles.IIRVerify}`}
                                    onClick={() => verifyClearance(clearance.id)}
                                    title="Verify Clearance"
                                  >
                                    Verify
                                  </button>
                                  <button
                                    className={`${styles.IIRBtn} ${styles.IIRReject}`}
                                    onClick={() => {
                                      setSelectedClearanceId(clearance.id);
                                      setShowRejectModal(true);
                                    }}
                                    title="Reject Clearance"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                className={`${styles.IIRBtn} ${styles.IIRView}`}
                                onClick={() => {
                                  // Show details in a better format
                                  let details = `Personnel: ${getPersonnelName(clearance)}\n`;
                                  details += `Personnel ID: ${clearance.personnel_id || ''}\n`;
                                  details += `Type: ${clearance.type || ''}\n`;
                                  details += `Status: ${clearance.status || 'Pending'}\n`;
                                  details += `Request Date: ${formatDate(clearance.created_at)}\n`;
                                  details += `Effective Date: ${formatDate(clearance.effective_date)}\n`;
                                  if (clearance.reason) details += `Reason: ${clearance.reason}\n`;
                                  if (clearance.remarks) details += `Remarks: ${clearance.remarks}\n`;
                                  details += `Missing Equipment: ${nonOperationalItems.length} items\n`;
                                  if (clearance.missing_amount) details += `Missing Amount: ₱${clearance.missing_amount}\n`;
                                  if (clearance.rejection_reason) details += `Rejection Reason: ${clearance.rejection_reason}\n`;
                                  
                                  alert(details.trim());
                                }}
                                title="View Details"
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expandable row for equipment details */}
                        {nonOperationalItems.length > 0 && (
                          <tr className={styles.detailRow}>
                            <td colSpan="6">
                              <div className={styles.equipmentDetails}>
                                <h4>Non-Operational Equipment ({nonOperationalItems.length} items):</h4>
                                <div className={styles.equipmentList}>
                                  {nonOperationalItems.map((item, idx) => (
                                    <div key={idx} className={styles.equipmentItem}>
                                      <span className={styles.equipmentName}>
                                        {item.item_name || item.item_code || 'Unnamed Equipment'}
                                      </span>
                                      <span className={`${styles.equipmentStatus} ${styles[item.status]}`}>
                                        {item.status || 'Unknown'}
                                      </span>
                                      <span className={styles.equipmentValue}>
                                        Value: ₱{parseFloat(item.purchase_price || 0).toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                
                                {(clearance.status === 'Rejected' || clearance.status === 'Pending') && (clearance.missing_amount || 0) > 0 && (
                                  <div className={styles.missingAmountSection}>
                                    <h4>Missing Equipment Amount:</h4>
                                    {editingMissingAmount === clearance.id ? (
                                      <div className={styles.amountEdit}>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={missingAmountValue}
                                          onChange={(e) => setMissingAmountValue(e.target.value)}
                                          className={styles.amountInput}
                                          placeholder="Enter amount"
                                        />
                                        <button
                                          onClick={() => updateMissingAmount(clearance.id, missingAmountValue)}
                                          className={styles.saveAmountBtn}
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingMissingAmount(null);
                                            setMissingAmountValue("");
                                          }}
                                          className={styles.cancelAmountBtn}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <div className={styles.amountDisplay}>
                                        <span className={styles.amountValue}>
                                          ₱{parseFloat(clearance.missing_amount || 0).toFixed(2)}
                                        </span>
                                        <button
                                          onClick={() => {
                                            setEditingMissingAmount(clearance.id);
                                            setMissingAmountValue(clearance.missing_amount || "0");
                                          }}
                                          className={styles.editAmountBtn}
                                        >
                                          Edit Amount
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3>Reject Clearance Request</h3>
                <button 
                  className={styles.modalClose}
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason("");
                  }}
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                <p>Please provide a reason for rejecting this clearance request:</p>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className={styles.reasonInput}
                  rows="4"
                />
                <p className={styles.modalNote}>
                  Note: This will mark the clearance as "Rejected" and calculate the missing amount based on non-operational equipment.
                </p>
              </div>
              <div className={styles.modalActions}>
                <button
                  className={`${styles.IIRBtn} ${styles.cancelBtn}`}
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className={`${styles.IIRBtn} ${styles.confirmRejectBtn}`}
                  onClick={() => rejectClearance(selectedClearanceId)}
                  disabled={!rejectionReason.trim()}
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InspectorInspectionReport;