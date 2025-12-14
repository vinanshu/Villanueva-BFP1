import React, { useState, useEffect } from "react";
import styles from "./InspectorEquipmentInspection.module.css";
import { Title, Meta } from "react-head";
import InspectorSidebar from "./InspectorSidebar";
import Hamburger from "./Hamburger";
import { useSidebar } from "./SidebarContext";
import { supabase } from "../lib/supabaseClient"; // Adjust path as needed

const InspectorEquipmentInspection = () => {
  const { isSidebarCollapsed } = useSidebar();
  const [recentInspections, setRecentInspections] = useState([]);
  const [scheduledInspections, setScheduledInspections] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [highlightedRow, setHighlightedRow] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    item_code: "",
    equipment_name: "",
    scheduled_date: "",
    status: "Pending",
    assigned_to: "",
    inspector: "",
    inventory_id: null,
  });

  // Load data from Supabase
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // Load inventory items
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select("id, item_code, item_name, last_checked, assigned_to, status")
        .order("item_name");

      if (inventoryError) throw inventoryError;
      setInventoryItems(inventoryData || []);

      // Load scheduled inspections
      const { data: scheduledData, error: scheduledError } = await supabase
        .from("scheduled_inspections")
        .select("*")
        .order("scheduled_date", { ascending: true });

      if (scheduledError) throw scheduledError;
      setScheduledInspections(scheduledData || []);

      // Process recent inspections
      const recent = (inventoryData || [])
        .filter((item) => item.last_checked)
        .map((item) => {
          const scheduledForItem = (scheduledData || [])
            .filter((ins) => ins.item_code === item.item_code)
            .sort(
              (a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date)
            )[0];

          return {
            item_code: item.item_code,
            equipment_name: item.item_name,
            last_checked: formatDate(item.last_checked),
            status: scheduledForItem
              ? scheduledForItem.status
              : item.status || "N/A",
            assigned_to: item.assigned_to || "Unassigned",
            inventory_id: item.id,
          };
        });

      setRecentInspections(recent);
    } catch (error) {
      console.error("Error loading data:", error);
      alert(`Failed to load data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleInventorySelect = (e) => {
    const itemCode = e.target.value;
    const selectedItem = inventoryItems.find(item => item.item_code === itemCode);
    
    if (selectedItem) {
      setFormData((prev) => ({
        ...prev,
        item_code: selectedItem.item_code,
        equipment_name: selectedItem.item_name,
        inventory_id: selectedItem.id,
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      item_code: "",
      equipment_name: "",
      scheduled_date: "",
      status: "Pending",
      assigned_to: "",
      inspector: "",
      inventory_id: null,
    });
    setEditingId(null);
  };

  const openScheduleModal = () => {
    resetForm();
    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate date
    if (!formData.scheduled_date) {
      alert("Please select a valid scheduled date.");
      return;
    }

    try {
      if (editingId) {
        // Update existing inspection
        const { error } = await supabase
          .from("scheduled_inspections")
          .update({
            item_code: formData.item_code.trim(),
            equipment_name: formData.equipment_name.trim(),
            scheduled_date: formData.scheduled_date,
            status: formData.status,
            assigned_to: formData.assigned_to.trim(),
            inspector: formData.inspector.trim(),
            inventory_id: formData.inventory_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);

        if (error) throw error;
      } else {
        // Add new inspection
        const { data, error } = await supabase
          .from("scheduled_inspections")
          .insert([{
            item_code: formData.item_code.trim(),
            equipment_name: formData.equipment_name.trim(),
            scheduled_date: formData.scheduled_date,
            status: formData.status,
            assigned_to: formData.assigned_to.trim(),
            inspector: formData.inspector.trim(),
            inventory_id: formData.inventory_id,
          }])
          .select();

        if (error) throw error;

        // Highlight the new row
        if (data && data[0]) {
          const newIndex = scheduledInspections.length;
          setHighlightedRow(newIndex);
          setTimeout(() => setHighlightedRow(null), 2000);
        }
      }

      // Refresh data
      await loadAllData();
      closeScheduleModal();
      alert(`Inspection ${editingId ? 'updated' : 'scheduled'} successfully!`);
    } catch (error) {
      console.error("Error saving inspection:", error);
      alert(`Failed to save inspection: ${error.message}`);
    }
  };

  const deleteInspection = async (id) => {
    if (!confirm("Are you sure you want to delete this scheduled inspection?"))
      return;

    try {
      const { error } = await supabase
        .from("scheduled_inspections")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Refresh data
      await loadAllData();
      alert("Inspection deleted successfully!");
    } catch (error) {
      console.error("Error deleting inspection:", error);
      alert(`Failed to delete inspection: ${error.message}`);
    }
  };

  const rescheduleInspection = (id) => {
    const inspection = scheduledInspections.find(ins => ins.id === id);
    if (!inspection) return;

    setFormData({
      item_code: inspection.item_code || "",
      equipment_name: inspection.equipment_name || "",
      scheduled_date: inspection.scheduled_date || "",
      status: inspection.status || "Pending",
      assigned_to: inspection.assigned_to || "",
      inspector: inspection.inspector || "",
      inventory_id: inspection.inventory_id || null,
    });
    setEditingId(id);
    setShowScheduleModal(true);
  };

  // Upload inspection document to Supabase Storage
  const uploadInspectionDocument = async (file, inspectionId) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${inspectionId}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('inspection-docs')
        .upload(fileName, file);

      if (error) throw error;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('inspection-docs')
        .getPublicUrl(fileName);
      
      // Update inspection record with document URL
      await supabase
        .from("scheduled_inspections")
        .update({ document_url: publicUrl })
        .eq("id", inspectionId);

      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Failed to upload document: ${error.message}`);
      return null;
    }
  };

  // Mark inspection as completed with findings
  const completeInspection = async (id, findings, documentFile = null) => {
    try {
      let documentUrl = null;
      
      // Upload document if provided
      if (documentFile) {
        documentUrl = await uploadInspectionDocument(documentFile, id);
      }

      const { error } = await supabase
        .from("scheduled_inspections")
        .update({
          status: "Completed",
          findings: findings,
          document_url: documentUrl,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Also update the inventory item's last_checked date
      const inspection = scheduledInspections.find(ins => ins.id === id);
      if (inspection?.inventory_id) {
        await supabase
          .from("inventory")
          .update({ last_checked: new Date().toISOString() })
          .eq("id", inspection.inventory_id);
      }

      await loadAllData();
      alert("Inspection marked as completed!");
    } catch (error) {
      console.error("Error completing inspection:", error);
      alert(`Failed to complete inspection: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="AppInspectorInventoryControl">
        <InspectorSidebar />
        <Hamburger />
        <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <div className={styles.loadingContainer}>
            <h2>Loading inspection data...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="AppInspectorInventoryControl">
      <Title>Inspector Equipment Inspection | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />
      <InspectorSidebar />
      <Hamburger />
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        {/* Recent Inspections Section */}
        <section className={styles.IEISection}>
          <div className={styles.IEISectionHeader}>
            <h2>Recent Inspections</h2>
            <a href="#" className={styles.IEIViewAll}>
              View All
            </a>
          </div>
          <table className={styles.IEITable}>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Equipment Name</th>
                <th>Inspection Date</th>
                <th>Status</th>
                <th>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {recentInspections.map((inspection, index) => (
                <tr key={index}>
                  <td>{inspection.item_code}</td>
                  <td>{inspection.equipment_name}</td>
                  <td>{inspection.last_checked}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[inspection.status.replace(' ', '')]}`}>
                      {inspection.status}
                    </span>
                  </td>
                  <td>{inspection.assigned_to}</td>
                </tr>
              ))}
              {recentInspections.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    No recent inspections found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Scheduled Inspections Section */}
        <section className={styles.IEISection}>
          <div className={styles.IEISectionHeader}>
            <h2>Scheduled Inspections</h2>
            <button
              className={`${styles.IEIBtn} ${styles.IEICreateNew}`}
              onClick={openScheduleModal}
            >
              Schedule New Inspection
            </button>
          </div>
          <table className={styles.IEITable}>
            <thead>
              <tr>
                <th>Inspection ID</th>
                <th>Item Code</th>
                <th>Equipment</th>
                <th>Scheduled Date</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Inspector</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scheduledInspections.map((inspection, index) => (
                <tr
                  key={inspection.id}
                  className={highlightedRow === index ? styles.IEIHighlight : ""}
                >
                  <td>INS-{String(index + 1).padStart(3, "0")}</td>
                  <td>{inspection.item_code}</td>
                  <td>{inspection.equipment_name}</td>
                  <td>{formatDate(inspection.scheduled_date)}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[inspection.status.replace(' ', '')]}`}>
                      {inspection.status}
                    </span>
                  </td>
                  <td>{inspection.assigned_to}</td>
                  <td>{inspection.inspector}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={`${styles.IEIBtn} ${styles.IEIReschedule}`}
                        onClick={() => rescheduleInspection(inspection.id)}
                      >
                        Reschedule
                      </button>
                      <button
                        className={`${styles.IEIBtn} ${styles.IEIComplete}`}
                        onClick={() => {
                          const findings = prompt("Enter inspection findings:");
                          if (findings) {
                            const fileInput = document.createElement('input');
                            fileInput.type = 'file';
                            fileInput.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
                            fileInput.onchange = (e) => {
                              const file = e.target.files[0];
                              completeInspection(inspection.id, findings, file);
                            };
                            fileInput.click();
                          }
                        }}
                      >
                        Complete
                      </button>
                      <button
                        className={`${styles.IEIBtn} ${styles.IEIDelete}`}
                        onClick={() => deleteInspection(inspection.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {scheduledInspections.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center" }}>
                    No scheduled inspections found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Schedule Inspection Modal */}
        {showScheduleModal && (
          <div className={styles.IEIModal}>
            <div className={styles.IEIModalContent}>
              <div className={styles.IEIModalHeader}>
                <h3>
                  {editingId ? "Reschedule Inspection" : "Schedule New Inspection"}
                </h3>
                <button 
                  className={styles.IEIModalClose} 
                  onClick={closeScheduleModal}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label htmlFor="itemCode">Select Equipment *</label>
                  <select
                    id="itemCode"
                    name="item_code"
                    value={formData.item_code}
                    onChange={handleInventorySelect}
                    required
                  >
                    <option value="">-- Select Equipment --</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.item_code}>
                        {item.item_name} ({item.item_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="equipmentName">Equipment Name *</label>
                  <input
                    type="text"
                    id="equipmentName"
                    name="equipment_name"
                    value={formData.equipment_name}
                    onChange={handleInputChange}
                    required
                    disabled
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="scheduledDate">Scheduled Date *</label>
                  <input
                    type="date"
                    id="scheduledDate"
                    name="scheduled_date"
                    value={formData.scheduled_date}
                    onChange={handleInputChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="status">Status *</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Missing">Missing</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="assignedTo">Assigned To *</label>
                  <input
                    type="text"
                    id="assignedTo"
                    name="assigned_to"
                    value={formData.assigned_to}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter personnel name"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="inspector">Inspector *</label>
                  <input
                    type="text"
                    id="inspector"
                    name="inspector"
                    value={formData.inspector}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter inspector name"
                  />
                </div>

                <div className={styles.IEIModalButtons}>
                  <button 
                    type="button" 
                    className={styles.IEICancelBtn}
                    onClick={closeScheduleModal}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={`${styles.IEIBtn} ${styles.IEISubmitBtn}`}
                  >
                    {editingId ? "Update Inspection" : "Schedule Inspection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InspectorEquipmentInspection;