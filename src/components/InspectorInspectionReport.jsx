import React, { useState, useEffect } from "react";
import styles from "./InspectorInspectionReport.module.css";
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
};

const STORE_CLEARANCE_REQUESTS = "clearanceRequests";
const STORE_INVENTORY = "inventory";

const InspectorInspectionReport = () => {
     const { isSidebarCollapsed } = useSidebar();
  const [clearances, setClearances] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [missingAmounts, setMissingAmounts] = useState({});

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [clearanceData, inventoryData] = await Promise.all([
      mockDB.getAll(STORE_CLEARANCE_REQUESTS),
      mockDB.getAll(STORE_INVENTORY),
    ]);

    setClearances(clearanceData);
    setInventory(inventoryData);
  };

  // Group inventory by employee for quick access
  const inventoryByEmployee = inventory.reduce((acc, item) => {
    if (!acc[item.assignedTo]) {
      acc[item.assignedTo] = [];
    }
    acc[item.assignedTo].push(item);
    return acc;
  }, {});

  // Process clearances data
  const processedClearances = clearances
    .map((clearance) => {
      const assignedItems = inventoryByEmployee[clearance.employee] || [];
      const nonOperationalItems = assignedItems.filter(
        (item) => item.status !== "Operational"
      );

      return {
        ...clearance,
        items: nonOperationalItems.length,
        equipmentNames: nonOperationalItems.map(
          (item) => item.equipmentName || item.name || "Unnamed"
        ),
        equipmentStatuses: nonOperationalItems.map(
          (item) => item.status || "Unknown"
        ),
        requestDate: clearance.requestDate || new Date().toISOString(),
      };
    })
    .sort((a, b) => a.employee.localeCompare(b.employee));

  // Update clearance statuses
  useEffect(() => {
    const updatedClearances = processedClearances.map((clearance) => {
      if (
        clearance.status !== "Rejected" &&
        clearance.status !== "Equipment Clearance Missing" &&
        clearance.items === 0
      ) {
        return { ...clearance, status: "Verified" };
      }
      return clearance;
    });

    if (JSON.stringify(updatedClearances) !== JSON.stringify(clearances)) {
      setClearances(updatedClearances);
      localStorage.setItem(
        STORE_CLEARANCE_REQUESTS,
        JSON.stringify(updatedClearances)
      );
    }
  }, [processedClearances]);

  const verifyClearance = (index) => {
    const updatedClearances = [...clearances];
    updatedClearances[index] = {
      ...updatedClearances[index],
      status: "Completed",
      requestDate:
        updatedClearances[index].requestDate || new Date().toISOString(),
    };

    // Remove missing amount when verified
    delete updatedClearances[index].missingAmount;

    setClearances(updatedClearances);
    localStorage.setItem(
      STORE_CLEARANCE_REQUESTS,
      JSON.stringify(updatedClearances)
    );
  };

  const rejectClearance = (index) => {
    const updatedClearances = [...clearances];
    const clearance = updatedClearances[index];

    const missingItems = inventory.filter(
      (item) =>
        item.assignedTo === clearance.employee && item.status !== "Operational"
    );

    let totalAmount = 0;
    missingItems.forEach((item) => {
      totalAmount += parseFloat(item.amount || 0);
    });

    updatedClearances[index] = {
      ...clearance,
      status: "Equipment Clearance Missing",
      missingAmount: totalAmount,
      requestDate: clearance.requestDate || new Date().toISOString(),
    };

    setClearances(updatedClearances);
    localStorage.setItem(
      STORE_CLEARANCE_REQUESTS,
      JSON.stringify(updatedClearances)
    );
  };

  const handleMissingAmountChange = (index, value) => {
    setMissingAmounts((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  const saveMissingAmount = (index) => {
    const amount = parseFloat(missingAmounts[index]);
    if (!isNaN(amount) && amount >= 0) {
      const updatedClearances = [...clearances];
      updatedClearances[index] = {
        ...updatedClearances[index],
        missingAmount: amount,
      };

      setClearances(updatedClearances);
      localStorage.setItem(
        STORE_CLEARANCE_REQUESTS,
        JSON.stringify(updatedClearances)
      );
      alert("Missing amount updated.");
    } else {
      alert("Please enter a valid non-negative number.");
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderClearanceRows = () => {
    const rows = [];

    processedClearances.forEach((clearance, index) => {
      const assignedItems = inventoryByEmployee[clearance.employee] || [];
      const nonOperationalItems = assignedItems.filter(
        (item) => item.status !== "Operational"
      );

      if (nonOperationalItems.length === 0) {
        // No items to verify
        rows.push(
          <tr key={`${clearance.employee}-${index}`}>
            <td>{clearance.employee}</td>
            <td>{formatDate(clearance.requestDate)}</td>
            <td>0 items</td>
            <td>-</td>
            <td>-</td>
            <td>{clearance.status}</td>
            <td>
              <button
                className={`${styles.IIRBtn} ${styles.IIRVerify}`}
                onClick={() => verifyClearance(index)}
                disabled={clearance.status === "Completed"}
              >
                Verify
              </button>
              <button
                className={`${styles.IIRBtn} ${styles.IIRReject}`}
                onClick={() => rejectClearance(index)}
              >
                Reject
              </button>
            </td>
          </tr>
        );
      } else {
        // Show one row per non-operational item
        nonOperationalItems.forEach((item, itemIndex) => {
          const isFirstRow = itemIndex === 0;

          const statusCellContent = isFirstRow ? (
            clearance.status === "Equipment Clearance Missing" ? (
              <>
                {clearance.status}
                <br />
                <small>
                  Amount to Purchase: ₱
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      missingAmounts[index] !== undefined
                        ? missingAmounts[index]
                        : (clearance.missingAmount || 0).toFixed(2)
                    }
                    onChange={(e) =>
                      handleMissingAmountChange(index, e.target.value)
                    }
                    className={styles.IIRAmountInput}
                  />
                  <button
                    onClick={() => saveMissingAmount(index)}
                    className={styles.IIRSaveAmountBtn}
                  >
                    Save
                  </button>
                </small>
              </>
            ) : (
              clearance.status
            )
          ) : null;

          rows.push(
            <tr key={`${clearance.employee}-${index}-${itemIndex}`}>
              <td>{isFirstRow ? clearance.employee : ""}</td>
              <td>{isFirstRow ? formatDate(clearance.requestDate) : ""}</td>
              <td>1 item</td>
              <td>{item.equipmentName || item.name || "Unnamed"}</td>
              <td>{item.status || "Unknown"}</td>
              <td>{statusCellContent}</td>
              <td>
                {isFirstRow && (
                  <>
                    <button
                      className={`${styles.IIRBtn} ${styles.IIRVerify}`}
                      onClick={() => verifyClearance(index)}
                      disabled={clearance.status === "Completed"}
                    >
                      Verify
                    </button>
                    <button
                      className={`${styles.IIRBtn} ${styles.IIRReject}`}
                      onClick={() => rejectClearance(index)}
                    >
                      Reject
                    </button>
                  </>
                )}
              </td>
            </tr>
          );
        });
      }
    });

    return rows;
  };

  return (
 <div className="AppInspectorInventoryControl">
             <Title>Inspector Inspection Report | BFP Villanueva</Title>
              <Meta name="robots" content="noindex, nofollow" />
      <InspectorSidebar />
      <Hamburger />
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
      <section className={styles.IIRSection}>
        <div className={styles.IIRSectionHeader}>
          <h2>Pending Clearance Verifications</h2>
          <a href="#" className={styles.IIRViewAll}>
            View All
          </a>
        </div>
        <table className={styles.IIRTable}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Request Date</th>
              <th>Items to Verify</th>
              <th>Equipment Names</th>
              <th>Equipment Statuses</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {renderClearanceRows()}
            {processedClearances.length === 0 && (
              <tr>
                <td colSpan="7" className={styles.IIRNoData}>
                  No pending clearance verifications found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
    </div>
  );
};

export default InspectorInspectionReport;
