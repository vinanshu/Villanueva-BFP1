import React, { useState, useEffect } from "react";
import { openDB, getAll, updateRecord, STORE_LEAVE } from "./db.jsx";
import styles from "./LeaveManagement.module.css";
import Sidebar from "./Sidebar.jsx";
import Hamburger from "./Hamburger.jsx";
import { useSidebar } from "./SidebarContext.jsx";
import { Title, Meta } from "react-head";

const LeaveManagement = () => {
  const { isSidebarCollapsed } = useSidebar();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [currentView, setCurrentView] = useState("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageCards, setCurrentPageCards] = useState(1);
  const [searchValue, setSearchValue] = useState("");
  const [filterValue, setFilterValue] = useState("All");
  const [modalData, setModalData] = useState(null);

  const rowsPerPage = 5;
  const rowsPerPageCards = 4;

  // Load leave requests on component mount
  useEffect(() => {
    loadLeaveRequests();
  }, []);

  useEffect(() => {
    applyFilterAndSearch();
  }, [searchValue, filterValue, leaveRequests]);

  // Load leave requests from IndexedDB
  const loadLeaveRequests = async () => {
    try {
      console.log("Loading leave requests from IndexedDB...");
      const leaves = await getAll(STORE_LEAVE);
      console.log("Loaded leave requests:", leaves);
      setLeaveRequests(leaves);
      setFilteredRequests(leaves);
    } catch (err) {
      console.error("Error loading leave requests:", err);
    }
  };

  // Apply search + filter
  const applyFilterAndSearch = () => {
    const filtered = leaveRequests.filter((req) => {
      const statusMatch =
        filterValue.toLowerCase() === "all" ||
        (req.status &&
          req.status.toLowerCase().trim() === filterValue.toLowerCase());
      const searchMatch =
        req.employeeName?.toLowerCase().includes(searchValue.toLowerCase()) ||
        req.leaveType?.toLowerCase().includes(searchValue.toLowerCase()) ||
        (req.location &&
          req.location.toLowerCase().includes(searchValue.toLowerCase()));
      return statusMatch && searchMatch;
    });
    setFilteredRequests(filtered);
    setCurrentPage(1);
    setCurrentPageCards(1);
  };

  const toggleView = () => {
    setCurrentView(currentView === "table" ? "cards" : "table");
  };

  const updateStatus = async (id, newStatus) => {
    const req = leaveRequests.find((r) => r.id === id);
    if (!req) return;

    try {
      const updatedReq = { ...req, status: newStatus };
      await updateRecord(STORE_LEAVE, updatedReq);

      // Update leave balance if approved
      if (newStatus === "Approved") {
        const allPersonnel = await getAll("personnel");
        const employee = allPersonnel.find(
          (p) => p.username === req.username || p.id === req.employeeId
        );
        if (employee) {
          const keyMap = {
            vacation: "earnedVacation",
            sick: "earnedSick",
            emergency: "earnedEmergency",
          };
          const key = keyMap[req.leaveType?.toLowerCase()];
          if (key && employee[key] != null) {
            employee[key] = Math.max(
              0,
              employee[key] - Number(req.numDays || 0)
            );
            await updateRecord("personnel", employee);
          }
        }
      }

      await loadLeaveRequests(); // Reload to show updated status
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Pagination logic
  const paginate = (data, page, rows) => {
    const start = (page - 1) * rows;
    return data.slice(start, start + rows);
  };

  const renderPaginationButtons = (page, setPage, rows) => {
    const pageCount = Math.max(1, Math.ceil(filteredRequests.length / rows));
    const hasNoRequests = filteredRequests.length === 0;

    const buttons = [];

    // Previous button
    buttons.push(
      <button
        key="prev"
        className={`${styles.leavePaginationBtn} ${
          hasNoRequests ? styles.leaveDisabled : ""
        }`}
        disabled={page === 1 || hasNoRequests}
        onClick={() => setPage(Math.max(1, page - 1))}
      >
        Previous
      </button>
    );

    // Always show first page
    buttons.push(
      <button
        key={1}
        className={`${styles.leavePaginationBtn} ${
          1 === page ? styles.leaveActive : ""
        } ${hasNoRequests ? styles.leaveDisabled : ""}`}
        onClick={() => setPage(1)}
        disabled={hasNoRequests}
      >
        1
      </button>
    );

    // Show ellipsis after first page if needed
    if (page > 3) {
      buttons.push(
        <span key="ellipsis1" className={styles.leavePaginationEllipsis}>
          ...
        </span>
      );
    }

    // Show pages around current page (max 5 pages total including first and last)
    let startPage = Math.max(2, page - 1);
    let endPage = Math.min(pageCount - 1, page + 1);

    // Adjust if we're near the beginning
    if (page <= 3) {
      endPage = Math.min(pageCount - 1, 4);
    }

    // Adjust if we're near the end
    if (page >= pageCount - 2) {
      startPage = Math.max(2, pageCount - 3);
    }

    // Generate middle page buttons
    for (let i = startPage; i <= endPage; i++) {
      if (i > 1 && i < pageCount) {
        buttons.push(
          <button
            key={i}
            className={`${styles.leavePaginationBtn} ${
              i === page ? styles.leaveActive : ""
            } ${hasNoRequests ? styles.leaveDisabled : ""}`}
            onClick={() => setPage(i)}
            disabled={hasNoRequests}
          >
            {i}
          </button>
        );
      }
    }

    // Show ellipsis before last page if needed
    if (page < pageCount - 2) {
      buttons.push(
        <span key="ellipsis2" className={styles.leavePaginationEllipsis}>
          ...
        </span>
      );
    }

    // Always show last page if there is more than 1 page
    if (pageCount > 1) {
      buttons.push(
        <button
          key={pageCount}
          className={`${styles.leavePaginationBtn} ${
            pageCount === page ? styles.leaveActive : ""
          } ${hasNoRequests ? styles.leaveDisabled : ""}`}
          onClick={() => setPage(pageCount)}
          disabled={hasNoRequests}
        >
          {pageCount}
        </button>
      );
    }

    // Next button
    buttons.push(
      <button
        key="next"
        className={`${styles.leavePaginationBtn} ${
          hasNoRequests ? styles.leaveDisabled : ""
        }`}
        disabled={page === pageCount || hasNoRequests}
        onClick={() => setPage(Math.min(pageCount, page + 1))}
      >
        Next
      </button>
    );

    return buttons;
  };

  // Get status badge class
  const getStatusClass = (status) => {
    const statusClass = status?.toLowerCase() || "";
    return `${styles.leave}${
      statusClass.charAt(0).toUpperCase() + statusClass.slice(1)
    }`;
  };

  return (
    <div className="app-container">
      <Title>Leave Management | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />
      <Hamburger />
      <Sidebar />

      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <h1>Leave Management</h1>

        {/* Filter/Search */}
        <div className={styles.leaveFilterSearchWrapper}>
          <div className={styles.leaveFilterGroup}>
            <label htmlFor="leaveStatusFilter">Filter by Status:</label>
            <select
              id={styles.leaveStatusFilter}
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className={styles.leaveSearchGroup}>
            <label htmlFor="leaveSearchInput">Search:</label>
            <input
              id={styles.leaveSearchInput}
              type="text"
              placeholder="Search by employee, type, location..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
        </div>

        <button className={styles.leaveViewToggle} onClick={toggleView}>
          🔄 Switch to {currentView === "table" ? "Card" : "Table"} View
        </button>

        {/* Table View */}
        {currentView === "table" && (
          <>
            <table className={styles.leaveTable}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length > 0 ? (
                  paginate(filteredRequests, currentPage, rowsPerPage).map(
                    (req) => {
                      const statusClass = getStatusClass(req.status);
                      return (
                        <tr key={req.id}>
                          <td>{req.employeeName || "Unknown"}</td>
                          <td>{req.leaveType || "N/A"}</td>
                          <td>{req.location || "-"}</td>
                          <td>{req.startDate || "N/A"}</td>
                          <td>{req.endDate || "N/A"}</td>
                          <td>{req.numDays || 0}</td>
                          <td className={statusClass}>
                            {req.status || "Pending"}
                          </td>
                          <td className={styles.leaveActions}>
                            {req.status?.toLowerCase() === "pending" ||
                            !req.status ? (
                              <>
                                <button
                                  className={styles.leaveApprove}
                                  onClick={() =>
                                    updateStatus(req.id, "Approved")
                                  }
                                >
                                  Approve
                                </button>
                                <button
                                  className={styles.leaveReject}
                                  onClick={() =>
                                    updateStatus(req.id, "Rejected")
                                  }
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <button onClick={() => setModalData(req)}>
                                View
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )
                ) : (
                  <tr>
                    <td colSpan="8" className={styles.leaveNoRequestsTable}>
                      <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                        📭
                      </div>
                      <h3
                        style={{
                          fontSize: "18px",
                          fontWeight: "600",
                          color: "#2b2b2b",
                          marginBottom: "8px",
                        }}
                      >
                        No Leave Requests Found
                      </h3>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#999",
                        }}
                      >
                        Try adjusting your search or filter criteria
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className={styles.leavePaginationContainer1}>
              {renderPaginationButtons(
                currentPage,
                setCurrentPage,
                rowsPerPage
              )}
            </div>
          </>
        )}

        {/* Card View */}
        {currentView === "cards" && (
          <>
            <div id={styles.leaveCards} className={styles.leaveCards}>
              {filteredRequests.length === 0 ? (
                <div className={styles.leaveNoRequests}>
                  <div style={{ fontSize: "48px", marginBottom: "1px" }}>
                    📭
                  </div>
                  <h3>No Leave Requests Found</h3>
                  <p>Try adjusting your search or filter criteria</p>
                </div>
              ) : (
                paginate(
                  filteredRequests,
                  currentPageCards,
                  rowsPerPageCards
                ).map((req) => {
                  const statusClass = getStatusClass(req.status);
                  return (
                    <div key={req.id} className={styles.leaveCard}>
                      <div className={styles.leaveCardHeader}>
                        <h3>{req.employeeName || "Unknown Employee"}</h3>
                        <span className={statusClass}>
                          {req.status || "Pending"}
                        </span>
                      </div>
                      <div className={styles.leaveCardBody}>
                        <p>
                          <strong>Type:</strong> {req.leaveType || "N/A"}
                        </p>
                        <p>
                          <strong>Location:</strong> {req.location || "-"}
                        </p>
                        <p>
                          <strong>Duration:</strong> {req.startDate} to{" "}
                          {req.endDate}
                        </p>
                        <p>
                          <strong>Days:</strong> {req.numDays || 0}
                        </p>
                        <p>
                          <strong>Filed:</strong>{" "}
                          {req.dateOfFiling || "Unknown"}
                        </p>
                      </div>
                      <div className={styles.leaveCardActions}>
                        {req.status?.toLowerCase() === "pending" ||
                        !req.status ? (
                          <>
                            <button
                              className={styles.leaveApprove}
                              onClick={() => updateStatus(req.id, "Approved")}
                            >
                              Approve
                            </button>
                            <button
                              className={styles.leaveReject}
                              onClick={() => updateStatus(req.id, "Rejected")}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setModalData(req)}>
                            View Details
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            <div className={styles.leavePaginationContainer}>
              {renderPaginationButtons(
                currentPageCards,
                setCurrentPageCards,
                rowsPerPageCards
              )}
            </div>
          </>
        )}

        {/* Modal */}
        {modalData && (
          <div
            className={`${styles.leaveModal} ${styles.leaveActive}`}
            onClick={() => setModalData(null)}
          >
            <div
              className={styles.leaveModalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className={styles.leaveCloseBtn}
                onClick={() => setModalData(null)}
              >
                &times;
              </span>
              <h2>Leave Request Details</h2>
              <div id={styles.leaveModalBody}>
                <p>
                  <b>Employee:</b> {modalData.employeeName || "Unknown"}
                </p>
                <p>
                  <b>Type:</b> {modalData.leaveType || "N/A"}
                </p>
                <p>
                  <b>Location:</b> {modalData.location || "-"}
                </p>
                <p>
                  <b>Start Date:</b> {modalData.startDate || "N/A"}
                </p>
                <p>
                  <b>End Date:</b> {modalData.endDate || "N/A"}
                </p>
                <p>
                  <b>Number of Days:</b> {modalData.numDays || 0}
                </p>
                <p>
                  <b>Date of Filing:</b> {modalData.dateOfFiling || "Unknown"}
                </p>
                <p>
                  <b>Status:</b>{" "}
                  <span className={getStatusClass(modalData.status)}>
                    {modalData.status || "Pending"}
                  </span>
                </p>
                {modalData.submittedAt && (
                  <p>
                    <b>Submitted At:</b>{" "}
                    {new Date(modalData.submittedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveManagement;
