// Inspection.jsx
import React, { useEffect, useState, useRef } from "react";
import styles from "./InspectorInventoryControl.module.css"
import { Html5QrcodeScanner } from "html5-qrcode";
import InspectorSidebar from "./InspectorSidebar";
import Hamburger from "./Hamburger.jsx";
import { useSidebar } from "./SidebarContext.jsx";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Title, Meta } from "react-head";
import { supabase } from "../lib/supabaseClient"; // Import Supabase client

export default function InspectionControl() {
  // data
  const [inspections, setInspections] = useState([]);
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
    equipment_id: "",
    equipment_name: "",
    inspector_id: "",
    inspector_name: "",
    inspection_date: "",
    next_inspection_date: "",
    status: "",
    findings: "",
    recommendations: "",
    notes: "",
  };
  const [newInspection, setNewInspection] = useState(emptyNew);

  // State to track floating labels for add sidebar
  const [floatingLabels, setFloatingLabels] = useState({
    equipment_id: false,
    inspector_id: false,
    status: false,
  });

  // State to track floating labels for edit modal
  const [editFloatingLabels, setEditFloatingLabels] = useState({
    equipment_id: false,
    inspector_id: false,
    status: false,
  });

  // edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editInspection, setEditInspection] = useState(emptyNew);

  // delete modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // add sidebar state
  const [isAddSidebarOpen, setIsAddSidebarOpen] = useState(false);

  // Summary numbers (computed)
  const totalInspections = inspections.length;
  const passedInspections = inspections.filter(
    (i) => i.status === "Passed"
  ).length;
  const failedInspections = inspections.filter(
    (i) => i.status === "Failed"
  ).length;
  const needsAttentionInspections = inspections.filter(
    (i) => i.status === "Needs Attention"
  ).length;

  // Load inspections, inventory & personnel from Supabase
  async function loadInspections() {
    try {
      const { data, error } = await supabase
        .from("inspections")
        .select("*")
        .order("inspection_date", { ascending: false });

      if (error) throw error;
      setInspections(data || []);
      // reset page if necessary
      const totalPages = Math.max(1, Math.ceil((data?.length || 0) / rowsPerPage));
      if (currentPage > totalPages) setCurrentPage(totalPages);
    } catch (err) {
      console.error("loadInspections error", err);
    }
  }

  async function loadInventory() {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("id, item_name, item_code, category")
        .order("item_name");

      if (error) throw error;
      setInventory(data || []);
    } catch (err) {
      console.error("loadInventory error", err);
    }
  }

  async function loadPersonnel() {
    try {
      const { data, error } = await supabase
        .from("personnel")
        .select("id, first_name, last_name")
        .order("last_name");

      if (error) throw error;
      setPersonnel(data || []);
    } catch (err) {
      console.error("loadPersonnel error", err);
    }
  }

  useEffect(() => {
    loadInspections();
    loadInventory();
    loadPersonnel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for select changes in add sidebar
  const handleAddSelectChange = (field, value) => {
    setNewInspection((prev) => ({ ...prev, [field]: value }));
    setFloatingLabels((prev) => ({ ...prev, [field]: value !== "" }));

    // Auto-fill equipment name when equipment is selected
    if (field === "equipment_id") {
      const selectedEquipment = inventory.find((item) => item.id === value);
      if (selectedEquipment) {
        setNewInspection((prev) => ({
          ...prev,
          equipment_id: value,
          equipment_name: selectedEquipment.item_name,
        }));
      }
    }

    // Auto-fill inspector name when inspector is selected
    if (field === "inspector_id") {
      const selectedInspector = personnel.find((person) => person.id === value);
      if (selectedInspector) {
        setNewInspection((prev) => ({
          ...prev,
          inspector_id: value,
          inspector_name: `${selectedInspector.first_name} ${selectedInspector.last_name}`,
        }));
      }
    }
  };

  // Handler for select changes in edit modal
  const handleEditSelectChange = (field, value) => {
    setEditInspection((prev) => ({ ...prev, [field]: value }));
    setEditFloatingLabels((prev) => ({ ...prev, [field]: value !== "" }));

    // Auto-fill equipment name when equipment is selected
    if (field === "equipment_id") {
      const selectedEquipment = inventory.find((item) => item.id === value);
      if (selectedEquipment) {
        setEditInspection((prev) => ({
          ...prev,
          equipment_id: value,
          equipment_name: selectedEquipment.item_name,
        }));
      }
    }

    // Auto-fill inspector name when inspector is selected
    if (field === "inspector_id") {
      const selectedInspector = personnel.find((person) => person.id === value);
      if (selectedInspector) {
        setEditInspection((prev) => ({
          ...prev,
          inspector_id: value,
          inspector_name: `${selectedInspector.first_name} ${selectedInspector.last_name}`,
        }));
      }
    }
  };

  // Filtering & pagination logic
  function applyFilters(items) {
    // card filter
    let filtered = [...items];
    if (currentFilterCard === "passed") {
      filtered = filtered.filter((i) => i.status === "Passed");
    } else if (currentFilterCard === "failed") {
      filtered = filtered.filter((i) => i.status === "Failed");
    } else if (currentFilterCard === "needsAttention") {
      filtered = filtered.filter((i) => i.status === "Needs Attention");
    }

    // category & status filters + search
    const s = search.trim().toLowerCase();
    const cat = filterCategory.trim().toLowerCase();
    const stat = filterStatus.trim().toLowerCase();

    filtered = filtered.filter((i) => {
      const text =
        `${i.equipment_name} ${i.inspector_name} ${i.status} ${i.findings} ${i.recommendations} ${i.notes}`.toLowerCase();
      const catMatch =
        !cat || (i.equipment_name || "").toLowerCase().includes(cat);
      const statMatch = !stat || (i.status || "").toLowerCase().includes(stat);
      const searchMatch = !s || text.includes(s);
      return catMatch && statMatch && searchMatch;
    });

    return filtered;
  }

  const filteredInspections = applyFilters(inspections);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredInspections.length / rowsPerPage)
  );
  const pageStart = (currentPage - 1) * rowsPerPage;
  const paginated = filteredInspections.slice(
    pageStart,
    pageStart + rowsPerPage
  );

  const renderPaginationButtons = () => {
    const pageCount = Math.max(
      1,
      Math.ceil(filteredInspections.length / rowsPerPage)
    );
    const hasNoData = filteredInspections.length === 0;

    const buttons = [];

    // Previous button
    buttons.push(
      <button
        key="prev"
        className={`${styles.inspectionPaginationBtn} ${
          hasNoData ? styles.inspectionDisabled : ""
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
        className={`${styles.inspectionPaginationBtn} ${
          1 === currentPage ? styles.inspectionActive : ""
        } ${hasNoData ? styles.inspectionDisabled : ""}`}
        onClick={() => setCurrentPage(1)}
        disabled={hasNoData}
      >
        1
      </button>
    );

    // Show ellipsis after first page if needed
    if (currentPage > 3) {
      buttons.push(
        <span key="ellipsis1" className={styles.inspectionPaginationEllipsis}>
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
            className={`${styles.inspectionPaginationBtn} ${
              i === currentPage ? styles.inspectionActive : ""
            } ${hasNoData ? styles.inspectionDisabled : ""}`}
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
        <span key="ellipsis2" className={styles.inspectionPaginationEllipsis}>
          ...
        </span>
      );
    }

    // Always show last page if there is more than 1 page
    if (pageCount > 1) {
      buttons.push(
        <button
          key={pageCount}
          className={`${styles.inspectionPaginationBtn} ${
            pageCount === currentPage ? styles.inspectionActive : ""
          } ${hasNoData ? styles.inspectionDisabled : ""}`}
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
        className={`${styles.inspectionPaginationBtn} ${
          hasNoData ? styles.inspectionDisabled : ""
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
    loadInventory();
    loadPersonnel();
    // Reset floating labels when opening sidebar
    setFloatingLabels({
      equipment_id: false,
      inspector_id: false,
      status: false,
    });
  }

  function closeAddSidebar() {
    setIsAddSidebarOpen(false);
    setNewInspection(emptyNew);
    setFloatingLabels({
      equipment_id: false,
      inspector_id: false,
      status: false,
    });
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from("inspections")
        .insert([{
          equipment_id: newInspection.equipment_id,
          equipment_name: newInspection.equipment_name,
          inspector_id: newInspection.inspector_id,
          inspector_name: newInspection.inspector_name,
          inspection_date: newInspection.inspection_date,
          next_inspection_date: newInspection.next_inspection_date,
          status: newInspection.status,
          findings: newInspection.findings,
          recommendations: newInspection.recommendations,
          notes: newInspection.notes
        }])
        .select();

      if (error) throw error;
      
      await loadInspections();
      closeAddSidebar();
    } catch (err) {
      console.error("add error", err);
      alert(`Failed to add inspection: ${err.message}`);
    }
  }

  function openEditModal(inspection) {
    setEditId(inspection.id);
    const editData = {
      equipment_id: inspection.equipment_id || "",
      equipment_name: inspection.equipment_name || "",
      inspector_id: inspection.inspector_id || "",
      inspector_name: inspection.inspector_name || "",
      inspection_date: inspection.inspection_date || "",
      next_inspection_date: inspection.next_inspection_date || "",
      status: inspection.status || "",
      findings: inspection.findings || "",
      recommendations: inspection.recommendations || "",
      notes: inspection.notes || "",
    };
    setEditInspection(editData);

    // Set initial floating labels for edit modal
    setEditFloatingLabels({
      equipment_id: !!editData.equipment_id,
      inspector_id: !!editData.inspector_id,
      status: !!editData.status,
    });

    loadInventory();
    loadPersonnel();
    setIsEditOpen(true);
  }

  function closeEditModal() {
    setIsEditOpen(false);
    setEditId(null);
    setEditInspection(emptyNew);
    setEditFloatingLabels({
      equipment_id: false,
      inspector_id: false,
      status: false,
    });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editId) return;

    try {
      const { error } = await supabase
        .from("inspections")
        .update({
          equipment_id: editInspection.equipment_id,
          equipment_name: editInspection.equipment_name,
          inspector_id: editInspection.inspector_id,
          inspector_name: editInspection.inspector_name,
          inspection_date: editInspection.inspection_date,
          next_inspection_date: editInspection.next_inspection_date,
          status: editInspection.status,
          findings: editInspection.findings,
          recommendations: editInspection.recommendations,
          notes: editInspection.notes,
          updated_at: new Date().toISOString()
        })
        .eq("id", editId);

      if (error) throw error;
      
      await loadInspections();
      closeEditModal();
    } catch (err) {
      console.error("edit error", err);
      alert(`Failed to update inspection: ${err.message}`);
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
      const { error } = await supabase
        .from("inspections")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      
      await loadInspections();
      cancelDelete();
    } catch (err) {
      console.error("delete error", err);
      alert(`Failed to delete inspection: ${err.message}`);
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
        },
      });

      stream.getTracks().forEach((track) => track.stop());

      const permissionRequest = document.getElementById(
        styles.inspectionCameraPermissionRequest
      );
      const qrReader = document.getElementById(styles.inspectionQrReader);

      if (permissionRequest && qrReader) {
        permissionRequest.style.display = "none";
        qrReader.style.display = "block";
      }

      if (
        document.getElementById(styles.inspectionQrReader) &&
        !qrScannerRef.current?.html5QrcodeScanner
      ) {
        qrScannerRef.current = {
          html5QrcodeScanner: new Html5QrcodeScanner(
            styles.inspectionQrReader,
            {
              fps: 10,
              qrbox: { width: 250, height: 150 },
            },
            false
          ),
        };

        qrScannerRef.current.html5QrcodeScanner.render(
          async (decodedText) => {
            console.log("Scanned barcode:", decodedText);
            // Find equipment by barcode in Supabase
            const { data: scannedEquipment, error } = await supabase
              .from("inventory")
              .select("*")
              .eq("item_code", decodedText)
              .single();

            if (error) {
              console.error("Error finding equipment:", error);
              alert(`Equipment with barcode ${decodedText} not found`);
            } else if (scannedEquipment) {
              setNewInspection((prev) => ({
                ...prev,
                equipment_id: scannedEquipment.id,
                equipment_name: scannedEquipment.item_name,
              }));
            }
            stopScanner();
          },
          (errorMessage) => {
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

  const formatDate = (dateString) => {
    if (!dateString || dateString.trim() === "") return "";

    let date;
    if (dateString.includes("-")) {
      date = new Date(dateString);
    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      console.warn("Invalid date:", dateString);
      return dateString;
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleCameraError = (error) => {
    const permissionRequest = document.getElementById(
      styles.inspectionCameraPermissionRequest
    );
    if (permissionRequest) {
      permissionRequest.innerHTML = `
      <div class="${styles.inspectionPermissionIcon}">❌</div>
      <h4>Camera Access Denied</h4>
      <p>Unable to access camera. Please ensure you've granted camera permissions and that no other app is using the camera.</p>
      <div class="${styles.inspectionPermissionTroubleshoot}">
        <p><strong>To fix this:</strong></p>
        <ul>
          <li>Check browser permissions</li>
          <li>Ensure no other app is using the camera</li>
          <li>Try refreshing the page</li>
        </ul>
      </div>
      <button class="${styles.inspectionRequestPermissionBtn} ${styles.inspectionRetryBtn}" onclick="window.location.reload()">
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

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className={styles.inspectionAppContainer}>
      <Title>Inspection Control | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />
      <InspectorSidebar />
      <Hamburger />

      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <h1>Inspection Control</h1>
        <div className={styles.inspectionTopControls}>
          <button
            id={styles.inspectionAddInspectionBtn}
            className={styles.inspectionAddBtn}
            onClick={openAddSidebar}
          >
            + Add Inspection
          </button>

          <div className={styles.inspectionTableHeader}>
            <select
              className={styles.inspectionFilterCategory}
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Equipment</option>
              {Array.from(new Set(inventory.map((item) => item.category))).map(
                (category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                )
              )}
            </select>

            <select
              className={styles.inspectionFilterStatus}
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Status</option>
              <option>Passed</option>
              <option>Failed</option>
              <option>Needs Attention</option>
            </select>

            <input
              type="text"
              className={styles.inspectionSearchBar}
              placeholder="🔍 Search inspections..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div
          id={styles.inspectionSummary}
          style={{ display: "flex", gap: 20, margin: 20 }}
        >
          <button
            className={`${styles.inspectionSummaryCard} ${
              styles.inspectionTotal
            } ${currentFilterCard === "total" ? styles.inspectionActive : ""}`}
            onClick={() => handleCardClick("total")}
          >
            <h3>Total Inspections</h3>
            <p id={styles.inspectionTotalItems}>{totalInspections}</p>
          </button>
          <button
            className={`${styles.inspectionSummaryCard} ${
              styles.inspectionPassed
            } ${currentFilterCard === "passed" ? styles.inspectionActive : ""}`}
            onClick={() => handleCardClick("passed")}
          >
            <h3>Passed</h3>
            <p id={styles.inspectionPassedItems}>{passedInspections}</p>
          </button>
          <button
            className={`${styles.inspectionSummaryCard} ${
              styles.inspectionFailed
            } ${currentFilterCard === "failed" ? styles.inspectionActive : ""}`}
            onClick={() => handleCardClick("failed")}
          >
            <h3>Failed</h3>
            <p id={styles.inspectionFailedItems}>{failedInspections}</p>
          </button>
          <button
            className={`${styles.inspectionSummaryCard} ${
              styles.inspectionNeedsAttention
            } ${
              currentFilterCard === "needsAttention"
                ? styles.inspectionActive
                : ""
            }`}
            onClick={() => handleCardClick("needsAttention")}
          >
            <h3>Needs Attention</h3>
            <p id={styles.inspectionNeedsAttentionItems}>
              {needsAttentionInspections}
            </p>
          </button>
        </div>

        {isAddSidebarOpen && (
          <div
            className={styles.inspectionRightSidebarOverlay}
            onClick={closeAddSidebar}
          >
            <div
              className={styles.inspectionRightSidebar}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.inspectionSidebarHeader}>
                <h3>Add New Inspection</h3>
                <button
                  className={styles.inspectionCloseBtn}
                  onClick={closeAddSidebar}
                >
                  &times;
                </button>
              </div>
              <form
                className={styles.inspectionSidebarForm}
                onSubmit={handleAddSubmit}
              >
                <div className={styles.inspectionFormSection}>
                  <h3>Inspection Details</h3>

                  <div className={styles.inspectionInputGroup}>
                    <select
                      id={styles.inspectionAddEquipment}
                      required
                      value={newInspection.equipment_id}
                      onChange={(e) =>
                        handleAddSelectChange("equipment_id", e.target.value)
                      }
                      className={
                        floatingLabels.equipment_id ? styles.floating : ""
                      }
                    >
                      <option value="" disabled hidden></option>
                      {inventory.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.item_name} - {item.item_code}
                        </option>
                      ))}
                    </select>
                    <h4>Select Equipment</h4>
                  </div>

                  <div className={styles.inspectionInputGroup}>
                    <select
                      id={styles.inspectionAddInspector}
                      required
                      value={newInspection.inspector_id}
                      onChange={(e) =>
                        handleAddSelectChange("inspector_id", e.target.value)
                      }
                      className={
                        floatingLabels.inspector_id ? styles.floating : ""
                      }
                    >
                      <option value="" disabled hidden></option>
                      {personnel.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.first_name} {person.last_name}
                        </option>
                      ))}
                    </select>
                    <h4>Select Inspector</h4>
                  </div>

                  <div className={styles.inspectionInputGroup}>
                    <select
                      id={styles.inspectionAddStatus}
                      required
                      value={newInspection.status}
                      onChange={(e) =>
                        handleAddSelectChange("status", e.target.value)
                      }
                      className={floatingLabels.status ? styles.floating : ""}
                    >
                      <option value="" disabled hidden></option>
                      <option value="Passed">Passed</option>
                      <option value="Failed">Failed</option>
                      <option value="Needs Attention">Needs Attention</option>
                    </select>
                    <h4>Inspection Status</h4>
                  </div>
                </div>

                <div className={styles.inspectionFormSection}>
                  <h3>Dates</h3>

                  <div className={styles.inspectionInputGroup}>
                    <Flatpickr
                      id={styles.inspectionAddInspectionDate}
                      type="date"
                      required
                      value={newInspection.inspection_date}
                      onChange={(dates) => {
                        if (dates && dates[0]) {
                          const dateStr = dates[0].toISOString().split("T")[0];
                          setNewInspection((s) => ({
                            ...s,
                            inspection_date: dateStr,
                          }));
                        }
                      }}
                      options={{
                        dateFormat: "Y-m-d",
                        maxDate: "today",
                      }}
                      placeholder=" "
                    />
                    <h4>Inspection Date</h4>
                  </div>

                  <div className={styles.inspectionInputGroup}>
                    <Flatpickr
                      id={styles.inspectionAddNextInspectionDate}
                      type="date"
                      required
                      value={newInspection.next_inspection_date}
                      onChange={(dates) => {
                        if (dates && dates[0]) {
                          const dateStr = dates[0].toISOString().split("T")[0];
                          setNewInspection((s) => ({
                            ...s,
                            next_inspection_date: dateStr,
                          }));
                        }
                      }}
                      options={{
                        dateFormat: "Y-m-d",
                        minDate: "today",
                      }}
                      placeholder=" "
                    />
                    <h4>Next Inspection Date</h4>
                  </div>
                </div>

                <div className={styles.inspectionFormSection}>
                  <h3>Findings & Notes</h3>

                  <div className={styles.inspectionInputGroup}>
                    <textarea
                      id={styles.inspectionAddFindings}
                      value={newInspection.findings}
                      onChange={(e) =>
                        setNewInspection((s) => ({
                          ...s,
                          findings: e.target.value,
                        }))
                      }
                      placeholder=" "
                      rows="3"
                    />
                    <h4>Findings</h4>
                  </div>

                  <div className={styles.inspectionInputGroup}>
                    <textarea
                      id={styles.inspectionAddRecommendations}
                      value={newInspection.recommendations}
                      onChange={(e) =>
                        setNewInspection((s) => ({
                          ...s,
                          recommendations: e.target.value,
                        }))
                      }
                      placeholder=" "
                      rows="3"
                    />
                    <h4>Recommendations</h4>
                  </div>

                  <div className={styles.inspectionInputGroup}>
                    <textarea
                      id={styles.inspectionAddNotes}
                      value={newInspection.notes}
                      onChange={(e) =>
                        setNewInspection((s) => ({
                          ...s,
                          notes: e.target.value,
                        }))
                      }
                      placeholder=" "
                      rows="2"
                    />
                    <h4>Additional Notes</h4>
                  </div>
                </div>

                <div className={styles.inspectionSidebarActions}>
                  <button type="submit" className={styles.inspectionSubmitBtn}>
                    Add Inspection
                  </button>
                  <button
                    className={styles.inspectionCancelBtn}
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
          id={styles.inspectionTableContainer}
          className={styles.inspectionTableContainer}
        >
          <div
            className={`${styles.inspectionPaginationContainer} ${styles.inspectionTopPagination}`}
          >
            {renderPaginationButtons()}
          </div>

          <table className={styles.inspectionTable}>
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Inspector</th>
                <th>Inspection Date</th>
                <th>Next Inspection</th>
                <th>Status</th>
                <th>Findings</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id={styles.inspectionTableBody}>
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      🔍
                    </div>
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#2b2b2b",
                        marginBottom: "8px",
                      }}
                    >
                      No Inspections Found
                    </h3>
                    <p style={{ fontSize: "14px", color: "#999" }}>
                      No inspection records available
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((inspection) => (
                  <tr key={inspection.id}>
                    <td>{inspection.equipment_name}</td>
                    <td>{inspection.inspector_name}</td>
                    <td>{formatDate(inspection.inspection_date)}</td>
                    <td>{formatDate(inspection.next_inspection_date)}</td>
                    <td>
                      <span
                        className={`${styles.inspectionStatus} ${
                          inspection.status === "Passed"
                            ? styles.inspectionStatusPassed
                            : inspection.status === "Failed"
                            ? styles.inspectionStatusFailed
                            : styles.inspectionStatusNeedsAttention
                        }`}
                      >
                        {inspection.status}
                      </span>
                    </td>
                    <td>{inspection.findings || "No findings"}</td>
                    <td>
                      <button
                        className={styles.inspectionEditBtn}
                        onClick={() => openEditModal(inspection)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className={styles.inspectionDeleteBtn}
                        onClick={() => confirmDelete(inspection.id)}
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

        {/* Delete Modal */}
        {isDeleteOpen && (
          <div
            className={styles.inspectionModalDeleteOverlay}
            style={{ display: "flex" }}
          >
            <div
              className={styles.inspectionModalDeleteContent}
              style={{ maxWidth: "450px" }}
            >
              <div className={styles.inspectionModalDeleteHeader}>
                <h2 style={{ marginLeft: "30px" }}>Confirm Deletion</h2>
                <span
                  className={styles.inspectionModalDeleteCloseBtn}
                  onClick={cancelDelete}
                >
                  &times;
                </span>
              </div>

              <div className={styles.inspectionModalDeleteBody}>
                <div className={styles.inspectionDeleteConfirmationContent}>
                  <div className={styles.inspectionDeleteWarningIcon}>⚠️</div>
                  <p className={styles.inspectionDeleteConfirmationText}>
                    Are you sure you want to delete the inspection record for
                  </p>
                  <p className={styles.inspectionDocumentNameHighlight}>
                    "
                    {inspections.find((item) => item.id === deleteId)
                      ?.equipment_name || "this equipment"}
                    "?
                  </p>
                  <p className={styles.inspectionDeleteWarning}>
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className={styles.inspectionModalDeleteActions}>
                <button
                  className={`${styles.inspectionModalDeleteBtn} ${styles.inspectionModalCancelBtn}`}
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
                <button
                  className={`${styles.inspectionModalDeleteBtn} ${styles.inspectionDeleteConfirmBtn}`}
                  onClick={performDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditOpen && (
          <div
            id={styles.inspectionEditModal}
            className={styles.inspectionModalOverlay}
            style={{ display: "flex" }}
          >
            <div className={styles.inspectionModalContainer}>
              <div className={styles.inspectionModalHeader}>
                <h3 className={styles.inspectionModalTitle}>Edit Inspection</h3>
                <button
                  className={styles.inspectionModalCloseBtn}
                  onClick={closeEditModal}
                >
                  &times;
                </button>
              </div>

              <form
                id={styles.inspectionEditForm}
                className={styles.inspectionModalForm}
                onSubmit={handleEditSubmit}
              >
                <div className={styles.inspectionModalSection}>
                  <h3 className={styles.inspectionModalSectionTitle}>
                    Inspection Details
                  </h3>

                  <div className={styles.inspectionModalInputRow}>
                    <div
                      className={`${styles.inspectionModalInputGroup} ${styles.fullWidth}`}
                    >
                      <select
                        id={styles.inspectionEditEquipment}
                        required
                        value={editInspection.equipment_id}
                        onChange={(e) =>
                          handleEditSelectChange("equipment_id", e.target.value)
                        }
                        className={`${styles.inspectionModalSelect} ${
                          editFloatingLabels.equipment_id ? styles.floating : ""
                        }`}
                      >
                        <option value="" disabled hidden>
                          Select Equipment
                        </option>
                        {inventory.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.item_name} - {item.item_code}
                          </option>
                        ))}
                      </select>
                      <h4 className={styles.inspectionModalInputLabel}>
                        Equipment
                      </h4>
                    </div>

                    <div
                      className={`${styles.inspectionModalInputGroup} ${styles.fullWidth}`}
                    >
                      <select
                        id={styles.inspectionEditInspector}
                        required
                        value={editInspection.inspector_id}
                        onChange={(e) =>
                          handleEditSelectChange("inspector_id", e.target.value)
                        }
                        className={`${styles.inspectionModalSelect} ${
                          editFloatingLabels.inspector_id ? styles.floating : ""
                        }`}
                      >
                        <option value="" disabled hidden>
                          Select Inspector
                        </option>
                        {personnel.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.first_name} {person.last_name}
                          </option>
                        ))}
                      </select>
                      <h4 className={styles.inspectionModalInputLabel}>
                        Inspector
                      </h4>
                    </div>

                    <div className={styles.inspectionModalInputGroup}>
                      <select
                        id={styles.inspectionEditStatus}
                        required
                        value={editInspection.status}
                        onChange={(e) =>
                          handleEditSelectChange("status", e.target.value)
                        }
                        className={`${styles.inspectionModalSelect} ${
                          editFloatingLabels.status ? styles.floating : ""
                        }`}
                      >
                        <option value="" disabled hidden>
                          Select Status
                        </option>
                        <option value="Passed">Passed</option>
                        <option value="Failed">Failed</option>
                        <option value="Needs Attention">Needs Attention</option>
                      </select>
                      <h4 className={styles.inspectionModalInputLabel}>
                        Status
                      </h4>
                    </div>
                  </div>
                </div>

                <div className={styles.inspectionModalSection}>
                  <h3 className={styles.inspectionModalSectionTitle}>Dates</h3>

                  <div className={styles.inspectionModalInputRow}>
                    <div className={styles.inspectionModalInputGroup}>
                      <Flatpickr
                        id={styles.inspectionEditInspectionDate}
                        type="date"
                        required
                        value={editInspection.inspection_date}
                        onChange={(dates) => {
                          if (dates && dates[0]) {
                            const dateStr = dates[0]
                              .toISOString()
                              .split("T")[0];
                            setEditInspection((s) => ({
                              ...s,
                              inspection_date: dateStr,
                            }));
                          }
                        }}
                        options={{
                          dateFormat: "Y-m-d",
                          maxDate: "today",
                        }}
                        placeholder=" "
                        className={styles.inspectionModalInput}
                      />
                      <h4 className={styles.inspectionModalInputLabel}>
                        Inspection Date
                      </h4>
                    </div>

                    <div className={styles.inspectionModalInputGroup}>
                      <Flatpickr
                        id={styles.inspectionEditNextInspectionDate}
                        type="date"
                        required
                        value={editInspection.next_inspection_date}
                        onChange={(dates) => {
                          if (dates && dates[0]) {
                            const dateStr = dates[0]
                              .toISOString()
                              .split("T")[0];
                            setEditInspection((s) => ({
                              ...s,
                              next_inspection_date: dateStr,
                            }));
                          }
                        }}
                        options={{
                          dateFormat: "Y-m-d",
                          minDate: "today",
                        }}
                        placeholder=" "
                        className={styles.inspectionModalInput}
                      />
                      <h4 className={styles.inspectionModalInputLabel}>
                        Next Inspection
                      </h4>
                    </div>
                  </div>
                </div>

                <div className={styles.inspectionModalSection}>
                  <h3 className={styles.inspectionModalSectionTitle}>
                    Findings & Notes
                  </h3>

                  <div className={styles.inspectionModalInputRow}>
                    <div
                      className={`${styles.inspectionModalInputGroup} ${styles.fullWidth}`}
                    >
                      <textarea
                        id={styles.inspectionEditFindings}
                        value={editInspection.findings}
                        onChange={(e) =>
                          setEditInspection((s) => ({
                            ...s,
                            findings: e.target.value,
                          }))
                        }
                        placeholder=" "
                        rows="3"
                        className={styles.inspectionModalTextarea}
                      />
                      <h4 className={styles.inspectionModalInputLabel}>
                        Findings
                      </h4>
                    </div>

                    <div
                      className={`${styles.inspectionModalInputGroup} ${styles.fullWidth}`}
                    >
                      <textarea
                        id={styles.inspectionEditRecommendations}
                        value={editInspection.recommendations}
                        onChange={(e) =>
                          setEditInspection((s) => ({
                            ...s,
                            recommendations: e.target.value,
                          }))
                        }
                        placeholder=" "
                        rows="3"
                        className={styles.inspectionModalTextarea}
                      />
                      <h4 className={styles.inspectionModalInputLabel}>
                        Recommendations
                      </h4>
                    </div>

                    <div
                      className={`${styles.inspectionModalInputGroup} ${styles.fullWidth}`}
                    >
                      <textarea
                        id={styles.inspectionEditNotes}
                        value={editInspection.notes}
                        onChange={(e) =>
                          setEditInspection((s) => ({
                            ...s,
                            notes: e.target.value,
                          }))
                        }
                        placeholder=" "
                        rows="2"
                        className={styles.inspectionModalTextarea}
                      />
                      <h4 className={styles.inspectionModalInputLabel}>
                        Additional Notes
                      </h4>
                    </div>
                  </div>
                </div>

                <div className={styles.inspectionModalActions}>
                  <button
                    type="submit"
                    className={styles.inspectionModalSubmitBtn}
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className={styles.inspectionModalCancelBtn}
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
            className={styles.inspectionQrScannerModalOverlay}
            onClick={stopScanner}
          >
            <div
              className={styles.inspectionQrScannerModal}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.inspectionQrScannerHeader}>
                <h3>Scan Equipment Barcode</h3>
                <button
                  className={styles.inspectionCloseBtn}
                  onClick={stopScanner}
                >
                  &times;
                </button>
              </div>
              <div className={styles.inspectionQrScannerContent}>
                <div
                  className={styles.inspectionCameraPermissionRequest}
                  id={styles.inspectionCameraPermissionRequest}
                >
                  <div className={styles.inspectionPermissionIcon}>📷</div>
                  <h4>Camera Access Required</h4>
                  <p>
                    To scan barcodes, we need access to your camera. Please
                    allow camera permissions when prompted.
                  </p>
                  <button
                    className={`${styles.inspectionRequestPermissionBtn} ${
                      isRequestingPermission ? styles.inspectionLoading : ""
                    }`}
                    onClick={startScanner}
                    disabled={isRequestingPermission}
                  >
                    {isRequestingPermission
                      ? "Requesting..."
                      : "Allow Camera Access"}
                  </button>
                </div>

                <div
                  id={styles.inspectionQrReader}
                  className={styles.inspectionQrReader}
                  style={{ display: "none" }}
                ></div>

                <p className={styles.inspectionQrScannerHint}>
                  Point camera at equipment barcode to scan automatically
                </p>
                <div className={styles.inspectionQrScannerActions}>
                  <button
                    className={styles.inspectionCancelScanBtn}
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