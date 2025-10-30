import React, { useState, useEffect } from "react";
import styles from "./InspectorEquipmentInspection.module.css";
import { Title, Meta } from "react-head";
import InspectorSidebar from "./InspectorSidebar";
import Hamburger from "./Hamburger";
import { useSidebar } from "./SidebarContext";
// Mock database functions - replace with your actual db.js imports
const mockDB = {
  getAll: async (store) => {
    const data = localStorage.getItem(store) || "[]";
    return JSON.parse(data);
  },
  addRecord: async (store, record) => {
    const data = await mockDB.getAll(store);
    const newRecord = { ...record, id: Date.now() };
    data.push(newRecord);
    localStorage.setItem(store, JSON.stringify(data));
    return newRecord;
  },
  deleteRecord: async (store, id) => {
    const data = await mockDB.getAll(store);
    const filtered = data.filter((item) => item.id !== id);
    localStorage.setItem(store, JSON.stringify(filtered));
  },
};

const STORE_INVENTORY = "inventory";
const STORE_SCHEDULED_INSPECTIONS = "scheduledInspections";

const InspectorEquipmentInspection = () => {
         const { isSidebarCollapsed } = useSidebar();
  const [recentInspections, setRecentInspections] = useState([]);
  const [scheduledInspections, setScheduledInspections] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [highlightedRow, setHighlightedRow] = useState(null);
  const [formData, setFormData] = useState({
    itemCode: "",
    equipmentName: "",
    scheduledDate: "",
    status: "Pending",
    assignedTo: "",
    inspector: "",
  });

  // Load inspections data
  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    const inventory = await mockDB.getAll(STORE_INVENTORY);
    const scheduled = await mockDB.getAll(STORE_SCHEDULED_INSPECTIONS);

    // Process recent inspections (inventory items with lastChecked)
    const recent = inventory
      .filter((item) => item.lastChecked)
      .map((item) => {
        const scheduledForItem = scheduled
          .filter((ins) => ins.itemCode === item.itemCode)
          .sort(
            (a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate)
          )[0];

        return {
          itemCode: item.itemCode,
          equipmentName: item.itemName || item.name,
          lastChecked: item.lastChecked,
          status: scheduledForItem
            ? scheduledForItem.status
            : item.status || "N/A",
          assignedTo: item.assignedTo || "Unassigned",
        };
      });

    setRecentInspections(recent);
    setScheduledInspections(scheduled);
  };

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      itemCode: "",
      equipmentName: "",
      scheduledDate: "",
      status: "Pending",
      assignedTo: "",
      inspector: "",
    });
    setEditingIndex(null);
  };

  const openScheduleModal = () => {
    resetForm();
    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    resetForm();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate date
    if (!formData.scheduledDate) {
      alert("Please select a valid scheduled date.");
      return;
    }

    const newInspection = {
      itemCode: formData.itemCode.trim(),
      equipmentName: formData.equipmentName.trim(),
      scheduledDate: formData.scheduledDate,
      status: formData.status,
      assignedTo: formData.assignedTo.trim(),
      inspector: formData.inspector.trim(),
    };

    if (editingIndex !== null) {
      // Update existing inspection
      const updatedScheduled = [...scheduledInspections];
      updatedScheduled[editingIndex] = newInspection;
      localStorage.setItem(
        STORE_SCHEDULED_INSPECTIONS,
        JSON.stringify(updatedScheduled)
      );
      setScheduledInspections(updatedScheduled);
    } else {
      // Add new inspection
      const updatedScheduled = [...scheduledInspections, newInspection];
      localStorage.setItem(
        STORE_SCHEDULED_INSPECTIONS,
        JSON.stringify(updatedScheduled)
      );
      setScheduledInspections(updatedScheduled);
      highlightLastScheduled();
    }

    closeScheduleModal();
    loadInspections();
  };

  const highlightLastScheduled = () => {
    if (scheduledInspections.length === 0) return;

    const lastIndex = scheduledInspections.length;
    setHighlightedRow(lastIndex);

    // Remove highlight after 2 seconds
    setTimeout(() => setHighlightedRow(null), 2000);
  };

  const deleteInspection = (index) => {
    if (!confirm("Are you sure you want to delete this scheduled inspection?"))
      return;

    const updatedScheduled = scheduledInspections.filter((_, i) => i !== index);
    localStorage.setItem(
      STORE_SCHEDULED_INSPECTIONS,
      JSON.stringify(updatedScheduled)
    );
    setScheduledInspections(updatedScheduled);
  };

  const rescheduleInspection = (index) => {
    const inspection = scheduledInspections[index];
    if (!inspection) return;

    setFormData({
      itemCode: inspection.itemCode || "",
      equipmentName: inspection.equipmentName || "",
      scheduledDate: inspection.scheduledDate || "",
      status: inspection.status || "Pending",
      assignedTo: inspection.assignedTo || "",
      inspector: inspection.inspector || "",
    });
    setEditingIndex(index);
    setShowScheduleModal(true);
  };

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
                <td>{inspection.itemCode}</td>
                <td>{inspection.equipmentName}</td>
                <td>{inspection.lastChecked}</td>
                <td>{inspection.status}</td>
                <td>{inspection.assignedTo}</td>
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
            Create New
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
                key={index}
                className={
                  highlightedRow === index + 1 ? styles.IEIHighlight : ""
                }
              >
                <td>INS-{String(index + 1).padStart(3, "0")}</td>
                <td>{inspection.itemCode}</td>
                <td>{inspection.equipmentName}</td>
                <td>
                  {new Date(inspection.scheduledDate).toLocaleDateString()}
                </td>
                <td>{inspection.status}</td>
                <td>{inspection.assignedTo}</td>
                <td>{inspection.inspector}</td>
                <td>
                  <button
                    className={`${styles.IEIBtn} ${styles.IEIReschedule}`}
                    onClick={() => rescheduleInspection(index)}
                  >
                    Reschedule
                  </button>
                  <button
                    className={`${styles.IEIBtn} ${styles.IEIDelete}`}
                    onClick={() => deleteInspection(index)}
                  >
                    Delete
                  </button>
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
            <h3>
              {editingIndex !== null
                ? "Reschedule Inspection"
                : "Schedule New Inspection"}
            </h3>
            <form onSubmit={handleSubmit}>
              <label htmlFor="itemCode">Item Code</label>
              <input
                type="text"
                id="itemCode"
                name="itemCode"
                value={formData.itemCode}
                onChange={handleInputChange}
                required
                autoComplete="off"
              />

              <label htmlFor="equipmentName">Equipment Name</label>
              <input
                type="text"
                id="equipmentName"
                name="equipmentName"
                value={formData.equipmentName}
                onChange={handleInputChange}
                required
                autoComplete="off"
              />

              <label htmlFor="scheduledDate">Scheduled Date</label>
              <input
                type="date"
                id="scheduledDate"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleInputChange}
                required
              />

              <label htmlFor="status">Status</label>
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

              <label htmlFor="assignedTo">Assigned To</label>
              <input
                type="text"
                id="assignedTo"
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleInputChange}
                required
                autoComplete="off"
              />

              <label htmlFor="inspector">Inspector</label>
              <input
                type="text"
                id="inspector"
                name="inspector"
                value={formData.inspector}
                onChange={handleInputChange}
                required
                autoComplete="off"
              />

              <div className={styles.IEIModalButtons}>
                <button type="button" onClick={closeScheduleModal}>
                  Cancel
                </button>
                <button type="submit" className={styles.IEIBtn}>
                  {editingIndex !== null ? "Update" : "Save"}
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
