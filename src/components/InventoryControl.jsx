// Inventory.jsx
import React, { useEffect, useState, useRef } from "react";
import styles from "./InventoryControl.module.css";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import Sidebar from "./Sidebar.jsx";
import Hamburger from "./Hamburger.jsx";
import { useSidebar } from "./SidebarContext.jsx";

import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Title, Meta } from "react-head";
// Adjust path to your Database.js file if necessary
import {
  getAll,
  addRecord,
  updateRecord,
  deleteRecord,
  STORE_INVENTORY,
  STORE_PERSONNEL,
} from "./db.jsx";

export default function InventoryControl() {
  // data
  const [inventory, setInventory] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const { isSidebarCollapsed } = useSidebar();
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentFilterCard, setCurrentFilterCard] = useState("total");
  const [showScanner, setShowScanner] = useState(false);
  const qrScannerRef = useRef(null);

  // add form controlled fields
  const emptyNew = {
    itemName: "",
    itemCode: "",
    category: "",
    status: "",
    assignedTo: "",
    purchaseDate: "",
    lastChecked: "",
  };
  const [newItem, setNewItem] = useState(emptyNew);

  // State to track floating labels for add sidebar
  const [floatingLabels, setFloatingLabels] = useState({
    category: false,
    status: false,
    assignedTo: false,
  });

  // State to track floating labels for edit modal
  const [editFloatingLabels, setEditFloatingLabels] = useState({
    category: false,
    status: false,
    assignedTo: false,
  });

  // edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editItem, setEditItem] = useState(emptyNew);

  // delete modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // add sidebar state
  const [isAddSidebarOpen, setIsAddSidebarOpen] = useState(false);

  // Summary numbers (computed)
  const totalItems = inventory.length;
  const assignedItems = inventory.filter(
    (i) => i.assignedTo && i.assignedTo !== "Unassigned"
  ).length;
  const storageItems = inventory.filter(
    (i) => !i.assignedTo || i.assignedTo === "Unassigned"
  ).length;

  // Load inventory & personnel
  async function loadInventory() {
    try {
      const items = (await getAll(STORE_INVENTORY)) || [];
      setInventory(items);
      // reset page if necessary
      const totalPages = Math.max(1, Math.ceil(items.length / rowsPerPage));
      if (currentPage > totalPages) setCurrentPage(totalPages);
    } catch (err) {
      console.error("loadInventory error", err);
    }
  }

  async function loadPersonnel() {
    try {
      const ppl = (await getAll(STORE_PERSONNEL)) || [];
      setPersonnel(ppl);
    } catch (err) {
      console.error("loadPersonnel error", err);
    }
  }

  useEffect(() => {
    loadInventory();
    loadPersonnel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for select changes in add sidebar
  const handleAddSelectChange = (field, value) => {
    setNewItem((prev) => ({ ...prev, [field]: value }));
    setFloatingLabels((prev) => ({ ...prev, [field]: value !== "" }));
  };

  // Handler for select changes in edit modal
  const handleEditSelectChange = (field, value) => {
    setEditItem((prev) => ({ ...prev, [field]: value }));
    setEditFloatingLabels((prev) => ({ ...prev, [field]: value !== "" }));
  };

  // Filtering & pagination logic
  function applyFilters(items) {
    // card filter
    let filtered = [...items];
    if (currentFilterCard === "assigned") {
      filtered = filtered.filter(
        (i) => i.assignedTo && i.assignedTo !== "Unassigned"
      );
    } else if (currentFilterCard === "storage") {
      filtered = filtered.filter(
        (i) => !i.assignedTo || i.assignedTo === "Unassigned"
      );
    }

    // category & status filters + search
    const s = search.trim().toLowerCase();
    const cat = filterCategory.trim().toLowerCase();
    const stat = filterStatus.trim().toLowerCase();

    filtered = filtered.filter((i) => {
      const text =
        `${i.itemName} ${i.itemCode} ${i.category} ${i.status} ${i.assignedTo} ${i.purchaseDate} ${i.lastChecked}`.toLowerCase();
      const catMatch = !cat || (i.category || "").toLowerCase().includes(cat);
      const statMatch = !stat || (i.status || "").toLowerCase().includes(stat);
      const searchMatch = !s || text.includes(s);
      return catMatch && statMatch && searchMatch;
    });

    return filtered;
  }

  const filteredInventory = applyFilters(inventory);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredInventory.length / rowsPerPage)
  );
  const pageStart = (currentPage - 1) * rowsPerPage;
  const paginated = filteredInventory.slice(pageStart, pageStart + rowsPerPage);

  const renderPaginationButtons = () => {
    const pageCount = Math.max(
      1,
      Math.ceil(filteredInventory.length / rowsPerPage)
    );
    const hasNoData = filteredInventory.length === 0;

    const buttons = [];

    // Previous button
    buttons.push(
      <button
        key="prev"
        className={`${styles.inventoryPaginationBtn} ${
          hasNoData ? styles.inventoryDisabled : ""
        }`}
        disabled={currentPage === 1 || hasNoData}
        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
      >
        Previous
      </button>
    );

    // Always show first page
    buttons.push(
      <button
        key={1}
        className={`${styles.inventoryPaginationBtn} ${
          1 === currentPage ? styles.inventoryActive : ""
        } ${hasNoData ? styles.inventoryDisabled : ""}`}
        onClick={() => setCurrentPage(1)}
        disabled={hasNoData}
      >
        1
      </button>
    );

    // Show ellipsis after first page if needed
    if (currentPage > 3) {
      buttons.push(
        <span key="ellipsis1" className={styles.inventoryPaginationEllipsis}>
          ...
        </span>
      );
    }

    // Show pages around current page (max 5 pages total including first and last)
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(pageCount - 1, currentPage + 1);

    // Adjust if we're near the beginning
    if (currentPage <= 3) {
      endPage = Math.min(pageCount - 1, 4);
    }

    // Adjust if we're near the end
    if (currentPage >= pageCount - 2) {
      startPage = Math.max(2, pageCount - 3);
    }

    // Generate middle page buttons
    for (let i = startPage; i <= endPage; i++) {
      if (i > 1 && i < pageCount) {
        buttons.push(
          <button
            key={i}
            className={`${styles.inventoryPaginationBtn} ${
              i === currentPage ? styles.inventoryActive : ""
            } ${hasNoData ? styles.inventoryDisabled : ""}`}
            onClick={() => setCurrentPage(i)}
            disabled={hasNoData}
          >
            {i}
          </button>
        );
      }
    }

    // Show ellipsis before last page if needed
    if (currentPage < pageCount - 2) {
      buttons.push(
        <span key="ellipsis2" className={styles.inventoryPaginationEllipsis}>
          ...
        </span>
      );
    }

    // Always show last page if there is more than 1 page
    if (pageCount > 1) {
      buttons.push(
        <button
          key={pageCount}
          className={`${styles.inventoryPaginationBtn} ${
            pageCount === currentPage ? styles.inventoryActive : ""
          } ${hasNoData ? styles.inventoryDisabled : ""}`}
          onClick={() => setCurrentPage(pageCount)}
          disabled={hasNoData}
        >
          {pageCount}
        </button>
      );
    }

    // Next button
    buttons.push(
      <button
        key="next"
        className={`${styles.inventoryPaginationBtn} ${
          hasNoData ? styles.inventoryDisabled : ""
        }`}
        disabled={currentPage === pageCount || hasNoData}
        onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
      >
        Next
      </button>
    );

    return buttons;
  };

  // Handlers
  function openAddSidebar() {
    setIsAddSidebarOpen(true);
    loadPersonnel();
    // Reset floating labels when opening sidebar
    setFloatingLabels({
      category: false,
      status: false,
      assignedTo: false,
    });
  }

  function closeAddSidebar() {
    setIsAddSidebarOpen(false);
    setNewItem(emptyNew);
    setFloatingLabels({
      category: false,
      status: false,
      assignedTo: false,
    });
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    try {
      await addRecord(STORE_INVENTORY, newItem);
      await loadInventory();
      closeAddSidebar();
    } catch (err) {
      console.error("add error", err);
    }
  }

  function openEditModal(item) {
    setEditId(item.id);
    const editData = {
      itemName: item.itemName || "",
      itemCode: item.itemCode || "",
      category: item.category || "",
      status: item.status || "",
      assignedTo: item.assignedTo || "Unassigned",
      purchaseDate: item.purchaseDate || "",
      lastChecked: item.lastChecked || "",
    };
    setEditItem(editData);

    // Set initial floating labels for edit modal
    setEditFloatingLabels({
      category: !!editData.category,
      status: !!editData.status,
      assignedTo: !!editData.assignedTo,
    });

    loadPersonnel();
    setIsEditOpen(true);
  }

  function closeEditModal() {
    setIsEditOpen(false);
    setEditId(null);
    setEditItem(emptyNew);
    setEditFloatingLabels({
      category: false,
      status: false,
      assignedTo: false,
    });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editId) return;

    const updated = { ...editItem, id: editId };
    try {
      // Use updateRecord instead of addRecord for existing items
      await updateRecord(STORE_INVENTORY, updated);
      await loadInventory();
      closeEditModal();
    } catch (err) {
      console.error("edit error", err);
    }
  }

  function confirmDelete(id) {
    setDeleteId(id);
    setIsDeleteOpen(true);
  }

  function cancelDelete() {
    setDeleteId(null);
    setIsDeleteOpen(false);
  }

  async function performDelete() {
    if (!deleteId) return;
    try {
      await deleteRecord(STORE_INVENTORY, deleteId);
      await loadInventory();
      cancelDelete();
    } catch (err) {
      console.error("delete error", err);
    }
  }

  function handleCardClick(filter) {
    if (currentFilterCard === filter) {
      setCurrentFilterCard("total");
    } else {
      setCurrentFilterCard(filter);
    }
    setCurrentPage(1);
  }

  const startScanner = async () => {
    setIsRequestingPermission(true);
    try {
      // Request camera permissions first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Prefer rear camera
        },
      });

      // Stop the stream immediately since html5-qrcode will handle it
      stream.getTracks().forEach((track) => track.stop());

      // Hide permission request, show scanner
      const permissionRequest = document.getElementById(
        styles.inventoryCameraPermissionRequest
      );
      const qrReader = document.getElementById(styles.inventoryQrReader);

      if (permissionRequest && qrReader) {
        permissionRequest.style.display = "none";
        qrReader.style.display = "block";
      }

      // Initialize scanner - SIMPLIFIED CONFIGURATION
      if (
        document.getElementById(styles.inventoryQrReader) &&
        !qrScannerRef.current?.html5QrcodeScanner
      ) {
        qrScannerRef.current = {
          html5QrcodeScanner: new Html5QrcodeScanner(
            styles.inventoryQrReader,
            {
              fps: 10,
              qrbox: { width: 250, height: 150 },
            },
            false
          ),
        };

        qrScannerRef.current.html5QrcodeScanner.render(
          (decodedText) => {
            console.log("Scanned barcode:", decodedText);
            setNewItem((prev) => ({ ...prev, itemCode: decodedText }));
            stopScanner();
          },
          (errorMessage) => {
            // Only log meaningful errors
            if (
              !errorMessage.includes("NotFoundException") &&
              !errorMessage.includes("No MultiFormat Readers")
            ) {
              console.log("Scan status:", errorMessage);
            }
          }
        );
      }
    } catch (error) {
      console.error("Camera permission denied:", error);
      handleCameraError(error);
    } finally {
      setIsRequestingPermission(false);
    }
  };
  // Robust date formatting function
  const formatDate = (dateString) => {
    if (!dateString || dateString.trim() === "") return "";

    // Handle different date formats
    let date;
    if (dateString.includes("-")) {
      // Assuming YYYY-MM-DD format
      date = new Date(dateString);
    } else {
      // Try parsing as is
      date = new Date(dateString);
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid date:", dateString);
      return dateString; // Return original string if invalid
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  const handleCameraError = (error) => {
    const permissionRequest = document.getElementById(
      styles.inventoryCameraPermissionRequest
    );
    if (permissionRequest) {
      permissionRequest.innerHTML = `
      <div class="${styles.inventoryPermissionIcon}">❌</div>
      <h4>Camera Access Denied</h4>
      <p>Unable to access camera. Please ensure you've granted camera permissions and that no other app is using the camera.</p>
      <div class="${styles.inventoryPermissionTroubleshoot}">
        <p><strong>To fix this:</strong></p>
        <ul>
          <li>Check browser permissions</li>
          <li>Ensure no other app is using the camera</li>
          <li>Try refreshing the page</li>
        </ul>
      </div>
      <button class="${styles.inventoryRequestPermissionBtn} ${styles.inventoryRetryBtn}" onclick="window.location.reload()">
        Retry Camera Access
      </button> 
    `;
    }
  };

  const stopScanner = () => {
    if (qrScannerRef.current?.html5QrcodeScanner) {
      try {
        qrScannerRef.current.html5QrcodeScanner.clear().catch((error) => {
          console.error("Failed to clear scanner:", error);
        });
        qrScannerRef.current.html5QrcodeScanner = null;
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
    setShowScanner(false);
  };

  // Clean up scanner when component unmounts
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className={styles.inventoryAppContainer}>
      <Title>Inventory Control | BFP Villanueva</Title>

      <Meta name="robots" content="noindex, nofollow" />

      <Hamburger />
      <Sidebar />

      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <h1>Inventory Control</h1>
        <div className={styles.inventoryTopControls}>
          <button
            id={styles.inventoryAddEquipmentBtn}
            className={styles.inventoryAddBtn}
            onClick={openAddSidebar}
          >
            + Add Equipment
          </button>

          <div className={styles.inventoryTableHeader}>
            <select
              className={styles.inventoryFilterCategory}
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Categories</option>
              <option>Firefighting Equipment</option>
              <option>Protective Gear</option>
              <option>Vehicle Equipment</option>
            </select>

            <select
              className={styles.inventoryFilterStatus}
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Status</option>
              <option>Good</option>
              <option>Needs Maintenance</option>
              <option>Damaged</option>
            </select>

            <input
              type="text"
              className={styles.inventorySearchBar}
              placeholder="🔍 Search equipment..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
        <div
          id={styles.inventorySummary}
          style={{ display: "flex", gap: 20, margin: 20 }}
        >
          <button
            className={`${styles.inventorySummaryCard} ${
              styles.inventoryTotal
            } ${currentFilterCard === "total" ? styles.inventoryActive : ""}`}
            data-filter="total"
            onClick={() => handleCardClick("total")}
          >
            <h3>Total Items</h3>
            <p id={styles.inventoryTotalItems}>{totalItems}</p>
          </button>
          <button
            className={`${styles.inventorySummaryCard} ${
              styles.inventoryAssigned
            } ${
              currentFilterCard === "assigned" ? styles.inventoryActive : ""
            }`}
            data-filter="assigned"
            onClick={() => handleCardClick("assigned")}
          >
            <h3>Assigned</h3>
            <p id={styles.inventoryAssignedItems}>{assignedItems}</p>
          </button>
          <button
            className={`${styles.inventorySummaryCard} ${
              styles.inventoryStorage
            } ${currentFilterCard === "storage" ? styles.inventoryActive : ""}`}
            data-filter="storage"
            onClick={() => handleCardClick("storage")}
          >
            <h3>In Storage</h3>
            <p id={styles.inventoryStorageItems}>{storageItems}</p>
          </button>
        </div>
        {isAddSidebarOpen && (
          <div
            className={styles.inventoryRightSidebarOverlay}
            onClick={closeAddSidebar}
          >
            <div
              className={styles.inventoryRightSidebar}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.inventorySidebarHeader}>
                <h3>Add New Equipment</h3>
                <button
                  className={styles.inventoryCloseBtn}
                  onClick={closeAddSidebar}
                >
                  &times;
                </button>
              </div>
              <form
                className={styles.inventorySidebarForm}
                onSubmit={handleAddSubmit}
              >
                <div className={styles.inventoryFormSection}>
                  <h3>Equipment Details</h3>

                  <div className={styles.inventoryInputGroup}>
                    <input
                      id={styles.inventoryAddItemName}
                      type="text"
                      required
                      value={newItem.itemName}
                      onChange={(e) =>
                        setNewItem((s) => ({ ...s, itemName: e.target.value }))
                      }
                      placeholder=" "
                    />
                    <h4>Equipment Name</h4>
                  </div>

                  <div className={styles.inventoryInputGroup}>
                    <div className={styles.inventoryBarcodeGrid}>
                      <input
                        id={styles.inventoryAddItemCode}
                        type="text"
                        required
                        value={newItem.itemCode}
                        onChange={(e) =>
                          setNewItem((s) => ({
                            ...s,
                            itemCode: e.target.value,
                          }))
                        }
                        placeholder=""
                      />
                      <h4>Barcode</h4>
                      <button
                        type="button"
                        className={styles.inventoryQrScannerBtn}
                        onClick={() => {
                          setShowScanner(true);
                          startScanner();
                        }}
                      >
                        📷 Scan
                      </button>
                    </div>
                  </div>
                  <div className={styles.inventoryInputGroup}>
                    <select
                      id={styles.inventoryAddCategory}
                      required
                      value={newItem.category}
                      onChange={(e) =>
                        handleAddSelectChange("category", e.target.value)
                      }
                      className={floatingLabels.category ? styles.floating : ""}
                    >
                      <option value="" disabled hidden></option>
                      <option value="Firefighting Equipment">
                        Firefighting Equipment
                      </option>
                      <option value="Protective Gear">Protective Gear</option>
                      <option value="Vehicle Equipment">
                        Vehicle Equipment
                      </option>
                    </select>
                    <h4>Select Category</h4>
                  </div>
                </div>

                <div className={styles.inventoryFormSection}>
                  <h3>Status & Assignment</h3>

                  <div className={styles.inventoryInputGroup}>
                    <select
                      id={styles.inventoryAddStatus}
                      required
                      value={newItem.status}
                      onChange={(e) =>
                        handleAddSelectChange("status", e.target.value)
                      }
                      className={floatingLabels.status ? styles.floating : ""}
                    >
                      <option value="" disabled hidden></option>
                      <option value="Good">Good</option>
                      <option value="Needs Maintenance">
                        Needs Maintenance
                      </option>
                      <option value="Damaged">Damaged</option>
                    </select>
                    <h4>Status</h4>
                  </div>

                  <div className={styles.inventoryInputGroup}>
                    <select
                      id={styles.inventoryAddAssignedTo}
                      required
                      value={newItem.assignedTo}
                      onChange={(e) =>
                        handleAddSelectChange("assignedTo", e.target.value)
                      }
                      className={
                        floatingLabels.assignedTo ? styles.floating : ""
                      }
                    >
                      <option value="" disabled hidden></option>
                      <option value="Unassigned">Unassigned</option>
                      {personnel.map((person) => (
                        <option
                          key={person.id}
                          value={`${person.first_name} ${person.last_name}`}
                        >
                          {person.first_name} {person.last_name}
                        </option>
                      ))}
                    </select>
                    <h4>Assign to Personnel</h4>
                  </div>
                </div>

                <div className={styles.inventoryFormSection}>
                  <h3>Dates</h3>

                  <div className={styles.inventoryInputGroup}>
                    <Flatpickr
                      id={styles.inventoryAddPurchaseDate}
                      type="date"
                      required
                      value={newItem.purchaseDate}
                      onChange={(dates) => {
                        if (dates && dates[0]) {
                          const dateStr = dates[0].toISOString().split("T")[0];
                          setNewItem((s) => ({ ...s, purchaseDate: dateStr }));
                        }
                      }}
                      options={{
                        dateFormat: "Y-m-d",
                        maxDate: "today",
                      }}
                      placeholder=" "
                    />
                    <h4>Purchase Date</h4>
                  </div>

                  <div className={styles.inventoryInputGroup}>
                    <Flatpickr
                      id={styles.inventoryAddLastChecked}
                      type="date"
                      required
                      value={newItem.lastChecked}
                      onChange={(dates) => {
                        if (dates && dates[0]) {
                          const dateStr = dates[0].toISOString().split("T")[0];
                          setNewItem((s) => ({ ...s, lastChecked: dateStr }));
                        }
                      }}
                      options={{
                        dateFormat: "Y-m-d",
                        maxDate: "today",
                      }}
                      placeholder=" "
                    />
                    <h4>Last Checked</h4>
                  </div>
                </div>

                <div className={styles.inventorySidebarActions}>
                  <button type="submit" className={styles.inventorySubmitBtn}>
                    Add Equipment
                  </button>
                  <button
                    className={styles.inventoryCancelBtn}
                    type="button"
                    onClick={closeAddSidebar}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Table */}
        <div
          id={styles.inventoryTableContainer}
          className={styles.inventoryTableContainer}
        >
          <div
            className={`${styles.inventoryPaginationContainer} ${styles.inventoryTopPagination}`}
          >
            {renderPaginationButtons()}
          </div>

          <table className={styles.inventoryTable}>
            <thead>
              <tr>
                <th>Equipment Name</th>
                <th>Barcode</th>
                <th>Category</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Purchase Date</th>
                <th>Last Checked</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id={styles.inventoryTableBody}>
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      🛠️
                    </div>
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#2b2b2b",
                        marginBottom: "8px",
                      }}
                    >
                      No Equipment Found
                    </h3>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#999",
                      }}
                    >
                      Ready to serve but no equipment in inventory yet
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((item) => (
                  <tr key={item.id}>
                    <td>{item.itemName}</td>
                    <td>{item.itemCode}</td>
                    <td>{item.category}</td>
                    <td>{item.status}</td>
                    <td>{item.assignedTo}</td>
                    <td>{formatDate(item.purchaseDate)}</td> {/* Updated */}
                    <td>{formatDate(item.lastChecked)}</td> {/* Updated */}
                    <td>
                      <button
                        className={styles.inventoryEditBtn}
                        onClick={() => openEditModal(item)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className={styles.inventoryDeleteBtn}
                        onClick={() => confirmDelete(item.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Rest of your component remains the same */}

        {isDeleteOpen && (
          <div
            className={styles.inventoryModalDeleteOverlay}
            style={{ display: "flex" }}
            onClick={(e) => {
              if (
                e.target.className.includes(styles.inventoryModalDeleteOverlay)
              )
                cancelDelete();
            }}
          >
            <div
              className={styles.inventoryModalDeleteContent}
              style={{ maxWidth: "450px" }}
            >
              <div className={styles.inventoryModalDeleteHeader}>
                <h2 style={{ marginLeft: "30px" }}>Confirm Deletion</h2>
                <span
                  className={styles.inventoryModalDeleteCloseBtn}
                  onClick={cancelDelete}
                >
                  &times;
                </span>
              </div>

              <div className={styles.inventoryModalDeleteBody}>
                <div className={styles.inventoryDeleteConfirmationContent}>
                  <div className={styles.inventoryDeleteWarningIcon}>⚠️</div>
                  <p className={styles.inventoryDeleteConfirmationText}>
                    Are you sure you want to delete the inventory item
                  </p>
                  <p className={styles.inventoryDocumentNameHighlight}>
                    "
                    {inventory.find((item) => item.id === deleteId)?.itemName ||
                      "this item"}
                    "?
                  </p>
                  <p className={styles.inventoryDeleteWarning}>
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className={styles.inventoryModalDeleteActions}>
                <button
                  className={`${styles.inventoryModalDeleteBtn} ${styles.inventoryModalCancelBtn}`}
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
                <button
                  className={`${styles.inventoryModalDeleteBtn} ${styles.inventoryDeleteConfirmBtn}`}
                  onClick={performDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Edit Modal with rearranged fields */}
        {isEditOpen && (
          <div
            id={styles.inventoryEditModal}
            className={styles.inventoryModalOverlay}
            style={{ display: "flex" }}
            onClick={(e) => {
              if (e.target.id === styles.inventoryEditModal) closeEditModal();
            }}
          >
            <div className={styles.inventoryModalContainer}>
              <div className={styles.inventoryModalHeader}>
                <h3 className={styles.inventoryModalTitle}>Edit Equipment</h3>
                <button
                  className={styles.inventoryModalCloseBtn}
                  onClick={closeEditModal}
                >
                  &times;
                </button>
              </div>

              <form
                id={styles.inventoryEditEquipmentForm}
                className={styles.inventoryModalForm}
                onSubmit={handleEditSubmit}
              >
                {/* Equipment Details Section */}
                <div className={styles.inventoryModalSection}>
                  <h3 className={styles.inventoryModalSectionTitle}>
                    Equipment Details
                  </h3>

                  <div className={styles.inventoryModalInputRow}>
                    {/* Equipment Name - Full Width */}
                    <div
                      className={`${styles.inventoryModalInputGroup} ${styles.fullWidth}`}
                    >
                      <input
                        id={styles.inventoryEditItemName}
                        type="text"
                        required
                        value={editItem.itemName}
                        onChange={(e) =>
                          setEditItem((s) => ({
                            ...s,
                            itemName: e.target.value,
                          }))
                        }
                        placeholder=" "
                        className={styles.inventoryModalInput}
                      />
                      <h4 className={styles.inventoryModalInputLabel}>
                        Equipment Name
                      </h4>
                    </div>

                    {/* Barcode with Scan Button - Full Width */}
                    <div className={styles.inventoryModalBarcodeGroup}>
                      <div className={styles.inventoryModalBarcodeContainer}>
                        <input
                          id={styles.inventoryEditItemCode}
                          type="text"
                          required
                          value={editItem.itemCode}
                          onChange={(e) =>
                            setEditItem((s) => ({
                              ...s,
                              itemCode: e.target.value,
                            }))
                          }
                          placeholder=" "
                          className={styles.inventoryModalInput}
                        />
                        <h4 className={styles.inventoryModalInputLabelBarCode}>
                          Barcode
                        </h4>
                        <button
                          type="button"
                          className={styles.inventoryModalScanBtn}
                          onClick={() => {
                            setShowScanner(true);
                            startScanner();
                          }}
                        >
                          📷 Scan
                        </button>
                      </div>
                    </div>

                    {/* Category and Status - Side by Side */}
                    <div className={styles.inventoryModalInputGroup}>
                      <select
                        id={styles.inventoryEditCategory}
                        required
                        value={editItem.category}
                        onChange={(e) =>
                          handleEditSelectChange("category", e.target.value)
                        }
                        className={`${styles.inventoryModalSelect} ${
                          editFloatingLabels.category ? styles.floating : ""
                        }`}
                      >
                        <option value="" disabled hidden>
                          Select Category
                        </option>
                        <option value="Firefighting Equipment">
                          Firefighting Equipment
                        </option>
                        <option value="Protective Gear">Protective Gear</option>
                        <option value="Vehicle Equipment">
                          Vehicle Equipment
                        </option>
                      </select>
                      <h4 className={styles.inventoryModalInputLabel}>
                        Category
                      </h4>
                    </div>

                    <div className={styles.inventoryModalInputGroup}>
                      <select
                        id={styles.inventoryEditStatus}
                        required
                        value={editItem.status}
                        onChange={(e) =>
                          handleEditSelectChange("status", e.target.value)
                        }
                        className={`${styles.inventoryModalSelect} ${
                          editFloatingLabels.status ? styles.floating : ""
                        }`}
                      >
                        <option value="" disabled hidden>
                          Select Status
                        </option>
                        <option value="Good">Good</option>
                        <option value="Needs Maintenance">
                          Needs Maintenance
                        </option>
                        <option value="Damaged">Damaged</option>
                      </select>
                      <h4 className={styles.inventoryModalInputLabel}>
                        Status
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Assignment Section */}
                <div className={styles.inventoryModalSection}>
                  <h3 className={styles.inventoryModalSectionTitle}>
                    Assignment
                  </h3>

                  <div className={styles.inventoryModalInputRow}>
                    <div
                      className={`${styles.inventoryModalInputGroup} ${styles.fullWidth}`}
                    >
                      <select
                        id={styles.inventoryEditAssignedTo}
                        required
                        value={editItem.assignedTo}
                        onChange={(e) =>
                          handleEditSelectChange("assignedTo", e.target.value)
                        }
                        className={`${styles.inventoryModalSelect} ${
                          editFloatingLabels.assignedTo ? styles.floating : ""
                        }`}
                      >
                        <option value="" disabled hidden>
                          Assign to Personnel
                        </option>
                        <option value="Unassigned">Unassigned</option>
                        {personnel.map((person) => (
                          <option
                            key={person.id}
                            value={`${person.first_name} ${person.last_name}`}
                          >
                            {person.first_name} {person.last_name}
                          </option>
                        ))}
                      </select>
                      <h4 className={styles.inventoryModalInputLabel}>
                        Assign to Personnel
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Dates Section */}
                <div className={styles.inventoryModalSection}>
                  <h3 className={styles.inventoryModalSectionTitle}>Dates</h3>

                  <div className={styles.inventoryModalInputRow}>
                    <div className={styles.inventoryModalInputGroup}>
                      <Flatpickr
                        id={styles.inventoryEditPurchaseDate}
                        type="date"
                        required
                        value={editItem.purchaseDate}
                        onChange={(dates) => {
                          if (dates && dates[0]) {
                            const dateStr = dates[0]
                              .toISOString()
                              .split("T")[0];
                            setEditItem((s) => ({
                              ...s,
                              purchaseDate: dateStr,
                            }));
                          }
                        }}
                        options={{
                          dateFormat: "Y-m-d",
                          maxDate: "today",
                        }}
                        placeholder=" "
                        className={styles.inventoryModalInput}
                      />
                      <h4 className={styles.inventoryModalInputLabel}>
                        Purchase Date
                      </h4>
                    </div>

                    <div className={styles.inventoryModalInputGroup}>
                      <Flatpickr
                        id={styles.inventoryEditLastChecked}
                        type="date"
                        required
                        value={editItem.lastChecked}
                        onChange={(dates) => {
                          if (dates && dates[0]) {
                            const dateStr = dates[0]
                              .toISOString()
                              .split("T")[0];
                            setEditItem((s) => ({
                              ...s,
                              lastChecked: dateStr,
                            }));
                          }
                        }}
                        options={{
                          dateFormat: "Y-m-d",
                          maxDate: "today",
                        }}
                        placeholder=" "
                        className={styles.inventoryModalInput}
                      />
                      <h4 className={styles.inventoryModalInputLabel}>
                        Last Checked
                      </h4>
                    </div>
                  </div>
                </div>

                <div className={styles.inventoryModalActions}>
                  <button
                    type="submit"
                    className={styles.inventoryModalSubmitBtn}
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className={styles.inventoryModalCancelBtn}
                    onClick={closeEditModal}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* QR Scanner Modal */}
        {showScanner && (
          <div
            className={styles.inventoryQrScannerModalOverlay}
            onClick={stopScanner}
          >
            <div
              className={styles.inventoryQrScannerModal}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.inventoryQrScannerHeader}>
                <h3>Scan Barcode</h3>
                <button
                  className={styles.inventoryCloseBtn}
                  onClick={stopScanner}
                >
                  &times;
                </button>
              </div>
              <div className={styles.inventoryQrScannerContent}>
                {/* Camera permission request section */}
                <div
                  className={styles.inventoryCameraPermissionRequest}
                  id={styles.inventoryCameraPermissionRequest}
                >
                  <div className={styles.inventoryPermissionIcon}>📷</div>
                  <h4>Camera Access Required</h4>
                  <p>
                    To scan barcodes, we need access to your camera. Please
                    allow camera permissions when prompted.
                  </p>
                  <button
                    className={`${styles.inventoryRequestPermissionBtn} ${
                      isRequestingPermission ? styles.inventoryLoading : ""
                    }`}
                    onClick={startScanner}
                    disabled={isRequestingPermission}
                  >
                    {isRequestingPermission
                      ? "Requesting..."
                      : "Allow Camera Access"}
                  </button>
                </div>

                {/* Scanner container - initially hidden */}
                <div
                  id={styles.inventoryQrReader}
                  className={styles.inventoryQrReader}
                  style={{ display: "none" }}
                ></div>

                <p className={styles.inventoryQrScannerHint}>
                  Point camera at barcode to scan automatically
                </p>
                <div className={styles.inventoryQrScannerActions}>
                  <button
                    className={styles.inventoryCancelScanBtn}
                    onClick={stopScanner}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
