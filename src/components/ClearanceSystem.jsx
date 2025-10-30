import React, { useState, useEffect } from "react";
import {
  getAll,
  addRecord,
  updateRecord,
  STORE_CLEARANCE,
  STORE_PERSONNEL,
} from "./db.jsx";
import Sidebar from "./Sidebar.jsx";
import Hamburger from "./Hamburger.jsx";
import styles from "./ClearanceSystem.module.css";
import { useSidebar } from "./SidebarContext.jsx";
import { Title, Meta } from "react-head";

const ClearanceSystem = () => {
  const { isSidebarCollapsed } = useSidebar();
  const [clearanceRequests, setClearanceRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [personnelList, setPersonnelList] = useState([]);
  const [currentPage, setCurrentPage] = useState();
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filters, setFilters] = useState({
    status: "All",
    search: "",
  });
  const [newClearance, setNewClearance] = useState({
    employee: "",
    type: "",
  });

  const rowsPerPage = 5;

  // Load data
  useEffect(() => {
    loadClearanceRequests();
    loadPersonnel();
  }, []);

  // Filter data when filters change
  useEffect(() => {
    filterData();
  }, [clearanceRequests, filters]);

  const loadClearanceRequests = async () => {
    try {
      const data = (await getAll(STORE_CLEARANCE)) || [];
      const sortedData = data.sort((a, b) => (b.id || 0) - (a.id || 0));
      setClearanceRequests(sortedData);
    } catch (err) {
      console.error("[clearance] loadClearanceRequests error", err);
    }
  };

  const loadPersonnel = async () => {
    try {
      const data = (await getAll(STORE_PERSONNEL)) || [];
      setPersonnelList(data);
    } catch (err) {
      console.error("[clearance] loadPersonnel error", err);
    }
  };

  const filterData = () => {
    let filtered = clearanceRequests.filter((req) => {
      const statusMatch =
        filters.status === "All" || req.status === filters.status;
      const searchMatch =
        (req.employee || "")
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        (req.type || "").toLowerCase().includes(filters.search.toLowerCase());
      return statusMatch && searchMatch;
    });
    setFilteredRequests(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Pagination functions with sliding window
  const totalPages = Math.ceil(filteredRequests.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredRequests.slice(
    startIndex,
    startIndex + rowsPerPage
  );

const renderPaginationButtons = () => {
  const pageCount = Math.max(1, Math.ceil(filteredRequests.length / rowsPerPage));
  const hasNoData = filteredRequests.length === 0;

  const buttons = [];

  // Previous button
  buttons.push(
    <button
      key="prev"
      className={`${styles.clearancePaginationBtn} ${
        hasNoData ? styles.clearanceDisabled : ""
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
      className={`${styles.clearancePaginationBtn} ${
        1 === currentPage ? styles.clearanceActive : ""
      } ${hasNoData ? styles.clearanceDisabled : ""}`}
      onClick={() => setCurrentPage(1)}
      disabled={hasNoData}
    >
      1
    </button>
  );

  // Show ellipsis after first page if needed
  if (currentPage > 3) {
    buttons.push(
      <span key="ellipsis1" className={styles.clearancePaginationEllipsis}>
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
          className={`${styles.clearancePaginationBtn} ${
            i === currentPage ? styles.clearanceActive : ""
          } ${hasNoData ? styles.clearanceDisabled : ""}`}
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
      <span key="ellipsis2" className={styles.clearancePaginationEllipsis}>
        ...
      </span>
    );
  }

  // Always show last page if there is more than 1 page
  if (pageCount > 1) {
    buttons.push(
      <button
        key={pageCount}
        className={`${styles.clearancePaginationBtn} ${
          pageCount === currentPage ? styles.clearanceActive : ""
        } ${hasNoData ? styles.clearanceDisabled : ""}`}
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
      className={`${styles.clearancePaginationBtn} ${
        hasNoData ? styles.clearanceDisabled : ""
      }`}
      disabled={currentPage === pageCount || hasNoData}
      onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
    >
      Next
    </button>
  );

  return buttons;
};

  // Status management
  const updateStatus = async (id, newStatus) => {
    try {
      const reqs = await getAll(STORE_CLEARANCE);
      const req = reqs.find((r) => Number(r.id) === Number(id));
      if (!req) return;

      req.status = newStatus;
      await updateRecord(STORE_CLEARANCE, req);
      await loadClearanceRequests();
    } catch (err) {
      console.error("[clearance] updateStatus error", err);
    }
  };

  // View details
  const showDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  // Initiate clearance
  const handleInitiateClearance = async (e) => {
    e.preventDefault();
    const { employee, type } = newClearance;

    if (!employee || !type) {
      alert("Please select both Employee and Clearance Type.");
      return;
    }

    try {
      const personnel = await getAll(STORE_PERSONNEL);
      const emp = personnel.find(
        (p) =>
          `${p.first_name || ""} ${p.middle_name || ""} ${p.last_name || ""}`
            .trim()
            .toLowerCase() === employee.toLowerCase()
      );

      if (!emp) {
        alert("Selected employee not found in personnel records.");
        return;
      }

      const newRequest = {
        id: Date.now(),
        username: emp.username,
        employee,
        type,
        status: "Pending",
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      };

      await addRecord(STORE_CLEARANCE, newRequest);
      setNewClearance({ employee: "", type: "" });
      setShowInitiateModal(false);
      await loadClearanceRequests();
      alert("Clearance request initiated successfully!");
    } catch (err) {
      console.error("[clearance] submitClearance error", err);
      alert("Failed to submit clearance — check console.");
    }
  };

  const statusToClass = (status) => {
    return (status || "").toLowerCase().replace(/\s+/g, "-");
  };

  const FloatingLabelSelect = ({
    id,
    label,
    value,
    onChange,
    required = false,
    options = [],
  }) => (
    <div className={styles.clearanceFloatingLabel}>
      <select id={id} value={value} onChange={onChange} required={required}>
        <option value="" disabled></option>
        {options.map((option) => (
          <option key={option.value || option} value={option.value || option}>
            {option.label || option}
          </option>
        ))}
      </select>
      <label htmlFor={id}>{label}</label>
    </div>
  );

  return (
    <div className={styles.clearanceSystem}>
      <Title>Clearance System | BFP Villanueva</Title>

      <Meta name="robots" content="noindex, nofollow" />
      <Hamburger />
      <Sidebar />

      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <h1>Clearance System</h1>
        {/* Filter & Search */}
        <div className={styles.clearanceFilterSearchWrapper}>
          <div className={styles.clearanceFilterGroup}>
            <label htmlFor="clearanceStatusFilter">Filter by Status:</label>
            <select
              id={styles.clearanceStatusFilter}
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div className={styles.clearanceSearchGroup}>
            <label htmlFor="clearanceSearchInput">Search:</label>
            <input
              type="text"
              id={styles.clearanceSearchInput}
              placeholder="Search by employee or type..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </div>
        </div>
        <div style={{ marginBottom: "15px" }}>
          <button
            className={styles.clearanceActionsBtn}
            onClick={() => setShowInitiateModal(true)}
          >
            Initiate Clearance
          </button>
        </div>
        {/* Pagination */}
        <div
          className={`${styles.clearancePaginationContainer} ${styles.clearanceTopPagination}`}
        >
          {renderPaginationButtons()}
        </div>
        {/* Initiate Clearance Button */}
        {/* Table */}
        <div id={styles.clearanceTableContainer}>
          <table className={styles.clearanceTable}>
            <thead>
              <tr>
                <th>Request Date</th>
                <th>Employee</th>
                <th>Clearance Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((req) => (
                  <tr key={req.id}>
                    <td>{req.date || ""}</td>
                    <td>{req.employee || ""}</td>
                    <td>{req.type || ""}</td>
                    <td>
                      <span
                        className={`${styles.clearanceStatus} ${
                          styles[statusToClass(req.status)]
                        }`}
                      >
                        {req.status || ""}
                      </span>
                    </td>
                    <td className={styles.clearanceActions}>
                      {req.status === "Pending" ? (
                        <>
                          <button
                            id={styles.clearanceApprove}
                            onClick={() => updateStatus(req.id, "Completed")}
                          >
                            Approve
                          </button>
                          <button
                            className={styles.clearanceRejects}
                            onClick={() => updateStatus(req.id, "Rejected")}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <button
                          className={styles.clearanceView}
                          onClick={() => showDetails(req)}
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="8"
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      📜
                    </div>
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#2b2b2b",
                        marginBottom: "8px",
                      }}
                    >
                      No clearance documents available
                    </h3>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#999",
                      }}
                    >
                      No clearance applications found in the system
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div
          className={`${styles.clearanceModal} ${styles.clearanceActiveDetails}`}
        >
          <div className={styles.clearanceModalContentDetails}>
            <div className={styles.clearanceModalHeaderDetails}>
              <h2>Clearance Request Details</h2>
              <button
                className={styles.clearanceCloseBtnDetails}
                onClick={() => setShowDetailsModal(false)}
              >
                &times;
              </button>
            </div>

            <div className={styles.clearanceModalBodyDetails}>
              <div id={styles.clearanceModalBodyDetails}>
                {/* Employee Information Section */}
                <div className={styles.clearanceModalSectionDetails}>
                  <h3 className={styles.clearanceModalSectionTitleDetails}>
                    Employee Information
                  </h3>
                  <div className={styles.clearanceModalDetailsGridDetails}>
                    <div className={styles.clearanceModalDetailItemDetails}>
                      <span className={styles.clearanceModalLabelDetails}>
                        Employee:{" "}
                      </span>
                      <span className={styles.clearanceModalValueDetailsEmp}>
                        {selectedRequest.employee}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Clearance Details Section */}
                <div className={styles.clearanceModalSectionDetails}>
                  <h3 className={styles.clearanceModalSectionTitleDetailsClear}>
                    Clearance Details
                  </h3>
                  <div className={styles.clearanceModalDetailsGridDetails}>
                    <div className={styles.clearanceModalDetailItemDetails}>
                      <span className={styles.clearanceModalLabelDetails}>
                        Type:{" "}
                      </span>
                      <span className={styles.clearanceModalValueDetailsType}>
                        {selectedRequest.type}
                      </span>
                    </div>
                    <div className={styles.clearanceModalDetailItem}>
                      <span className={styles.clearanceModalLabelDetails}>
                        Request Date:{" "}
                      </span>
                      <span className={styles.clearanceModalValueDetailsDate}>
                        {" "}
                        {selectedRequest.date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Section */}
                <div className={styles.clearanceModalSectionDetails}>
                  <h3 className={styles.clearanceModalSectionTitleDetails}>
                    Request Status
                  </h3>
                  <div className={styles.clearanceModalDetailsGridDetails}>
                    <div className={styles.clearanceModalDetailItemDetails}>
                      <span className={styles.clearanceModalLabelDetails}>
                        Status:{" "}
                      </span>
                      <span
                        className={`${
                          styles.clearanceModalValueDetailsStatus
                        } ${styles.clearanceModalStatusDetails} ${
                          styles["clearance" + selectedRequest.status]
                        }`}
                      >
                        {selectedRequest.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay */}
      {showInitiateModal && (
        <div
          className={styles.clearanceRightSidebarOverlay}
          onClick={() => setShowInitiateModal(false)}
        >
          <div
            className={styles.clearanceRightSidebar}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.clearanceSidebarHeader}>
              <h3>Initiate Clearance</h3>
              <button
                className={styles.clearanceCloseBtn}
                onClick={() => setShowInitiateModal(false)}
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={handleInitiateClearance}
              className={styles.clearanceSidebarForm}
            >
              {/* Employee Selection */}
              <div className={styles.clearanceFormSection}>
                <h3>Employee Information</h3>

                <div className={styles.clearanceInputGroup}>
                  <select
                    id={styles.clearanceEmployeeSelect}
                    required
                    value={newClearance.employee}
                    onChange={(e) =>
                      setNewClearance((prev) => ({
                        ...prev,
                        employee: e.target.value,
                      }))
                    }
                  >
                    <option value="" disabled></option>
                    {personnelList.map((emp) => (
                      <option
                        key={emp.id}
                        value={`${emp.first_name || ""} ${
                          emp.middle_name || ""
                        } ${emp.last_name || ""}`.trim()}
                      >
                        {`${emp.first_name || ""} ${emp.middle_name || ""} ${
                          emp.last_name || ""
                        }`.trim()}
                      </option>
                    ))}
                  </select>
                  <h4>Select Employee</h4>
                </div>
              </div>

              {/* Clearance Details */}
              <div className={styles.clearanceFormSection}>
                <h3>Clearance Details</h3>

                <div className={styles.clearanceInputGroup}>
                  <select
                    id={styles.clearanceTypeSelect}
                    required
                    value={newClearance.type}
                    onChange={(e) =>
                      setNewClearance((prev) => ({
                        ...prev,
                        type: e.target.value,
                      }))
                    }
                  >
                    <option value="" disabled></option>
                    <option value="Resignation">Resignation</option>
                    <option value="Retirement">Retirement</option>
                    <option value="Equipment Completion">
                      Equipment Completion
                    </option>
                  </select>
                  <h4>Select Clearance Type</h4>
                </div>
              </div>

              {/* Actions */}
              <div className={styles.clearanceSidebarActions}>
                <button type="submit" className={styles.clearanceSubmitBtn}>
                  Submit Clearance
                </button>
                <button
                  type="button"
                  onClick={() => setShowInitiateModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClearanceSystem;
