import React, { useState, useEffect } from "react";
import { STORE_PERSONNEL, STORE_CLEARANCE, getAll } from "./db";
import styles from "./ClearanceRecords.module.css";
import Sidebar from "./Sidebar.jsx";
import Hamburger from "./Hamburger.jsx";
import { useSidebar } from "./SidebarContext.jsx";
import { Title, Meta } from "react-head";

const CRSClearanceRecords = () => {
  const [clearanceData, setClearanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);
  const { isSidebarCollapsed } = useSidebar();

  // State variables for table functionality
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterClearanceType, setFilterClearanceType] = useState("");
  const [currentFilterCard, setCurrentFilterCard] = useState("total");

  useEffect(() => {
    loadClearanceRecords();
  }, []);

  const loadClearanceRecords = async () => {
    try {
      const personnelList = await getAll(STORE_PERSONNEL);
      const clearanceRequests = await getAll(STORE_CLEARANCE);

      console.log("=== DEBUG CLEARANCE RECORDS ===");
      console.log("Total Personnel:", personnelList.length);
      console.log("Total Clearance Requests:", clearanceRequests.length);
      console.log("Clearance Requests Data:", clearanceRequests);

      // Check if there are any clearance requests
      if (clearanceRequests.length === 0) {
        console.log("No clearance requests found in database");
        setNoData(true);
        setLoading(false);
        return;
      }

      const processedData = [];
      let matchedRequests = 0;

      // Create a map for quick personnel lookup
      const personnelMap = new Map();
      personnelList.forEach((person) => {
        personnelMap.set(person.username, person);
      });

      // Process clearance requests directly
      clearanceRequests.forEach((req, index) => {
        const personnel = personnelMap.get(req.username);

        if (personnel) {
          matchedRequests++;
          const status = req.status || "Pending";

          // Create a unique ID using index + timestamp + random string
          const uniqueId = `clearance-${index}-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;

          processedData.push({
            id: uniqueId,
            fullName: `${personnel.first_name} ${personnel.last_name}`, // FIXED: Changed emp to personnel
            rank: personnel.rank, // FIXED: Changed emp to personnel
            clearanceType: req.type,
            dateRequested: req.date || "N/A", // FIXED: Changed date to dateRequested for consistency
            status: status,
            username: req.username,
            // Include original request data for debugging
            originalRequest: req,
          });

          console.log(`Processed request for ${personnel.username}:`, {
            id: uniqueId,
            type: req.type,
            status: status,
          });
        } else {
          console.warn(`No personnel found for username: ${req.username}`);
        }
      });

      console.log("=== PROCESSING RESULTS ===");
      console.log("Total processed records:", processedData.length);
      console.log("Matched requests:", matchedRequests);
      console.log("Final processed data:", processedData);

      // Remove duplicates based on unique combination of fields
      const uniqueData = removeDuplicates(processedData);
      console.log("After deduplication:", uniqueData.length, "records");

      setClearanceData(uniqueData);
      setLoading(false);

      // Set noData if no processed records
      if (uniqueData.length === 0) {
        console.log("No matching records found after processing");
        setNoData(true);
      } else {
        setNoData(false);
      }
    } catch (err) {
      console.error("[CRSClearanceRecords] error loading", err);
      setNoData(true);
      setLoading(false);
    }
  };

  // Add this helper function to remove duplicates
  const removeDuplicates = (data) => {
    const seen = new Set();
    return data.filter((item) => {
      // Create a unique key from the combination of fields that should be unique
      const key = `${item.username}-${item.clearanceType}-${item.dateRequested}-${item.status}`;
      if (seen.has(key)) {
        console.warn("Duplicate found and removed:", key);
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  // Filtering & pagination logic
  function applyFilters(items) {
    let filtered = [...items];

    // Card filter
    if (currentFilterCard === "pending") {
      filtered = filtered.filter((i) => i.status.toLowerCase() === "pending");
    } else if (currentFilterCard === "completed") {
      filtered = filtered.filter((i) => i.status.toLowerCase() === "completed");
    } else if (currentFilterCard === "rejected") {
      filtered = filtered.filter((i) => i.status.toLowerCase() === "rejected");
    }

    // Text filters
    const s = search.trim().toLowerCase();
    const statusFilter = filterStatus.trim().toLowerCase();
    const typeFilter = filterClearanceType.trim().toLowerCase();

    filtered = filtered.filter((i) => {
      const text =
        `${i.fullName} ${i.rank} ${i.dateRequested} ${i.clearanceType} ${i.status}`.toLowerCase();
      const statusMatch =
        !statusFilter || (i.status || "").toLowerCase().includes(statusFilter);
      const typeMatch =
        !typeFilter ||
        (i.clearanceType || "").toLowerCase().includes(typeFilter);
      const searchMatch = !s || text.includes(s);
      return statusMatch && typeMatch && searchMatch;
    });

    return filtered;
  }

  const filteredClearanceData = applyFilters(clearanceData);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredClearanceData.length / rowsPerPage)
  );
  const pageStart = (currentPage - 1) * rowsPerPage;
  const paginated = filteredClearanceData.slice(
    pageStart,
    pageStart + rowsPerPage
  );

  // Pagination function
  // Pagination function
  const renderPaginationButtons = () => {
    const pageCount = Math.max(
      1,
      Math.ceil(filteredClearanceData.length / rowsPerPage)
    );
    const hasNoData = filteredClearanceData.length === 0;

    const buttons = [];

    // Previous button
    buttons.push(
      <button
        key="prev"
        className={`${styles.CRSpaginationBtn} ${
          hasNoData ? styles.CRSdisabled : ""
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
        className={`${styles.CRSpaginationBtn} ${
          1 === currentPage ? styles.CRSactive : ""
        } ${hasNoData ? styles.CRSdisabled : ""}`}
        onClick={() => setCurrentPage(1)}
        disabled={hasNoData}
      >
        1
      </button>
    );

    // Show ellipsis after first page if needed
    if (currentPage > 3) {
      buttons.push(
        <span key="ellipsis1" className={styles.CRSpaginationEllipsis}>
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
            className={`${styles.CRSpaginationBtn} ${
              i === currentPage ? styles.CRSactive : ""
            } ${hasNoData ? styles.CRSdisabled : ""}`}
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
        <span key="ellipsis2" className={styles.CRSpaginationEllipsis}>
          ...
        </span>
      );
    }

    // Always show last page if there is more than 1 page
    if (pageCount > 1) {
      buttons.push(
        <button
          key={pageCount}
          className={`${styles.CRSpaginationBtn} ${
            pageCount === currentPage ? styles.CRSactive : ""
          } ${hasNoData ? styles.CRSdisabled : ""}`}
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
        className={`${styles.CRSpaginationBtn} ${
          hasNoData ? styles.CRSdisabled : ""
        }`}
        disabled={currentPage === pageCount || hasNoData}
        onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
      >
        Next
      </button>
    );

    return buttons;
  };
  // Summary numbers - only count actual clearance requests
  const totalItems = clearanceData.length;
  const pendingItems = clearanceData.filter(
    (i) => i.status.toLowerCase() === "pending"
  ).length;
  const completedItems = clearanceData.filter(
    (i) => i.status.toLowerCase() === "completed"
  ).length;
  const rejectedItems = clearanceData.filter(
    (i) => i.status.toLowerCase() === "rejected"
  ).length;

  function handleCardClick(filter) {
    if (currentFilterCard === filter) {
      setCurrentFilterCard("total");
    } else {
      setCurrentFilterCard(filter);
    }
    setCurrentPage(1);
  }

  const getStatusClass = (status) => {
    const statusMap = {
      pending: styles.CRSpending,
      completed: styles.CRScompleted,
      rejected: styles.CRSrejected,
    };
    return statusMap[status.toLowerCase()] || styles.CRSpending;
  };

  const handleManageClick = (username, clearanceType) => {
    if (username && clearanceType) {
      const manageUrl = `/clearanceSystem?username=${encodeURIComponent(
        username
      )}&type=${encodeURIComponent(clearanceType)}`;
      window.location.href = manageUrl;
    }
  };

  if (loading) {
    return (
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <p>Loading clearance records...</p>
      </div>
    );
  }

  return (
    <div className={styles.CRSappContainer}>
      <Title>Clearance Records | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />

      <Hamburger />
      <Sidebar />

      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <h1>Clearance Records</h1>

        {/* Top Controls */}
        <div className={styles.CRStopControls}>
          <div className={styles.CRStableHeader}>
            <select
              className={styles.CRSfilterStatus}
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Status</option>
              <option>Pending</option>
              <option>Completed</option>
              <option>Rejected</option>
            </select>

            <select
              className={styles.CRSfilterType}
              value={filterClearanceType}
              onChange={(e) => {
                setFilterClearanceType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Clearance Types</option>
              <option>Resignation</option>
              <option>Retirement</option>
              <option>Equipment Completions</option>
            </select>

            <input
              type="text"
              className={styles.CRSsearchBar}
              placeholder="🔍 Search clearance records..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className={styles.CRSsummary}>
          <button
            className={`${styles.CRSsummaryCard} ${styles.CRStotal} ${
              currentFilterCard === "total" ? styles.CRSactive : ""
            }`}
            onClick={() => handleCardClick("total")}
          >
            <h3>Total Records</h3>
            <p>{totalItems}</p>
          </button>
          <button
            className={`${styles.CRSsummaryCard} ${styles.CRSpending} ${
              currentFilterCard === "pending" ? styles.CRSactive : ""
            }`}
            onClick={() => handleCardClick("pending")}
          >
            <h3>Pending</h3>
            <p>{pendingItems}</p>
          </button>
          <button
            className={`${styles.CRSsummaryCard} ${styles.CRScompleted} ${
              currentFilterCard === "completed" ? styles.CRSactive : ""
            }`}
            onClick={() => handleCardClick("completed")}
          >
            <h3>Completed</h3>
            <p>{completedItems}</p>
          </button>
          <button
            className={`${styles.CRSsummaryCard} ${styles.CRSrejected} ${
              currentFilterCard === "rejected" ? styles.CRSactive : ""
            }`}
            onClick={() => handleCardClick("rejected")}
          >
            <h3>Rejected</h3>
            <p>{rejectedItems}</p>
          </button>
        </div>

        {/* Table */}
        <div className={styles.CRStableContainer}>
          <div className={styles.CRSpaginationContainer}>
            {renderPaginationButtons()}
          </div>

          <table className={styles.CRStable}>
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Rank</th>
                <th>Date Requested</th>
                <th>Clearance Type</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.CRSnoRequestsTable}>
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
                      No Clearance Requests Found
                    </h3>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#999",
                      }}
                    >
                      There are no clearance requests submitted yet.
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((record) => (
                  <tr key={record.id}>
                    <td>{record.fullName}</td>
                    <td>{record.rank}</td>
                    <td>{record.dateRequested}</td>
                    <td>{record.clearanceType}</td>
                    <td>
                      <span
                        className={`${styles.CRSstatus} ${getStatusClass(
                          record.status
                        )}`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.CRSmanageBtn}
                        onClick={() =>
                          handleManageClick(
                            record.username,
                            record.clearanceType
                          )
                        }
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CRSClearanceRecords;
