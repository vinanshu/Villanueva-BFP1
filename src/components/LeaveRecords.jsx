// LeaveRecords.jsx
import React, { useState, useEffect } from "react";
import { STORE_PERSONNEL, STORE_LEAVE, getAll } from "./db";
import styles from "./LeaveRecords.module.css";
import Sidebar from "./Sidebar.jsx";
import Hamburger from "./Hamburger.jsx";
import { useSidebar } from "./SidebarContext.jsx";
import { Title, Meta } from "react-head";

const LeaveRecords = () => {
  const [leaveData, setLeaveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);
  const { isSidebarCollapsed } = useSidebar();

  // State variables for table functionality
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLeaveType, setFilterLeaveType] = useState("");
  const [currentFilterCard, setCurrentFilterCard] = useState("total");

  useEffect(() => {
    loadLeaveRecords();
  }, []);

  const loadLeaveRecords = async () => {
    try {
      const personnelList = await getAll(STORE_PERSONNEL);
      const leaveRequests = await getAll(STORE_LEAVE);

      // console.log("=== DEBUG LEAVE RECORDS ===");
      // console.log("Total Personnel:", personnelList.length);
      // console.log("Total Leave Requests:", leaveRequests.length);
      //  console.log("Leave Requests Data:", leaveRequests);

      // Check if there are any leave requests
      if (leaveRequests.length === 0) {
        //    console.log("No leave requests found in database");
        setNoData(true);
        setLoading(false);
        return;
      }

      const processedData = [];
      let matchedRequests = 0;

      // Only process personnel who have leave requests
      personnelList.forEach((person) => {
        const requests = leaveRequests.filter(
          (req) => req.username === person.username
        );

        //     console.log( `Person: ${person.username}, Matching requests: ${requests.length}`   );

        // Only add to processedData if the person has at least one leave request
        if (requests.length > 0) {
          matchedRequests += requests.length;
          requests.forEach((req) => {
            const status = req.status || "Pending";
            processedData.push({
              id: `${person.id}-${req.dateOfFiling}`,
              fullName: `${person.first_name} ${person.last_name}`,
              rank: person.rank,
              dateOfFiling: req.dateOfFiling,
              leaveType: req.leaveType,
              startDate: req.startDate,
              endDate: req.endDate,
              numDays: req.numDays,
              status: status,
              username: person.username,
            });
          });
        }
      });

      // console.log("=== PROCESSING RESULTS ===");
      // console.log("Total processed records:", processedData.length);
      //  console.log("Matched requests:", matchedRequests);
      //  console.log("Final processed data:", processedData);

      setLeaveData(processedData);
      setLoading(false);

      // Set noData if no processed records
      if (processedData.length === 0) {
        //    console.log("No matching records found after processing");
        setNoData(true);
      } else {
        setNoData(false);
      }
    } catch (err) {
      console.error("[leaveRecords] error loading", err);
      setNoData(true);
      setLoading(false);
    }
  };

  // Filtering & pagination logic
  function applyFilters(items) {
    let filtered = [...items];

    // Card filter
    if (currentFilterCard === "pending") {
      filtered = filtered.filter((i) => i.status.toLowerCase() === "pending");
    } else if (currentFilterCard === "approved") {
      filtered = filtered.filter((i) => i.status.toLowerCase() === "approved");
    } else if (currentFilterCard === "rejected") {
      filtered = filtered.filter((i) => i.status.toLowerCase() === "rejected");
    }

    // Text filters
    const s = search.trim().toLowerCase();
    const statusFilter = filterStatus.trim().toLowerCase();
    const typeFilter = filterLeaveType.trim().toLowerCase();

    filtered = filtered.filter((i) => {
      const text =
        `${i.fullName} ${i.rank} ${i.dateOfFiling} ${i.leaveType} ${i.startDate} ${i.endDate} ${i.numDays} ${i.status}`.toLowerCase();
      const statusMatch =
        !statusFilter || (i.status || "").toLowerCase().includes(statusFilter);
      const typeMatch =
        !typeFilter || (i.leaveType || "").toLowerCase().includes(typeFilter);
      const searchMatch = !s || text.includes(s);
      return statusMatch && typeMatch && searchMatch;
    });

    return filtered;
  }

  const filteredLeaveData = applyFilters(leaveData);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredLeaveData.length / rowsPerPage)
  );
  const pageStart = (currentPage - 1) * rowsPerPage;
  const paginated = filteredLeaveData.slice(pageStart, pageStart + rowsPerPage);

  // Pagination function
  // Pagination function
  const renderPaginationButtons = () => {
    const pageCount = Math.max(
      1,
      Math.ceil(filteredLeaveData.length / rowsPerPage)
    );
    const hasNoData = filteredLeaveData.length === 0;

    const buttons = [];

    // Previous button
    buttons.push(
      <button
        key="prev"
        className={`${styles.leavePaginationBtn} ${
          hasNoData ? styles.leaveDisabled : ""
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
        className={`${styles.leavePaginationBtn} ${
          1 === currentPage ? styles.leaveActive : ""
        } ${hasNoData ? styles.leaveDisabled : ""}`}
        onClick={() => setCurrentPage(1)}
        disabled={hasNoData}
      >
        1
      </button>
    );

    // Show ellipsis after first page if needed
    if (currentPage > 3) {
      buttons.push(
        <span key="ellipsis1" className={styles.leavePaginationEllipsis}>
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
            className={`${styles.leavePaginationBtn} ${
              i === currentPage ? styles.leaveActive : ""
            } ${hasNoData ? styles.leaveDisabled : ""}`}
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
            pageCount === currentPage ? styles.leaveActive : ""
          } ${hasNoData ? styles.leaveDisabled : ""}`}
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
        className={`${styles.leavePaginationBtn} ${
          hasNoData ? styles.leaveDisabled : ""
        }`}
        disabled={currentPage === pageCount || hasNoData}
        onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
      >
        Next
      </button>
    );

    return buttons;
  };
  // Summary numbers - only count actual leave requests
  const totalItems = leaveData.length;
  const pendingItems = leaveData.filter(
    (i) => i.status.toLowerCase() === "pending"
  ).length;
  const approvedItems = leaveData.filter(
    (i) => i.status.toLowerCase() === "approved"
  ).length;
  const rejectedItems = leaveData.filter(
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
      pending: styles.pending,
      approved: styles.approved,
      rejected: styles.rejected,
    };
    return statusMap[status.toLowerCase()] || styles.pending;
  };

  const handleManageClick = (username, dateOfFiling) => {
    if (dateOfFiling && dateOfFiling !== "-") {
      const manageUrl = `/leaveManagement?username=${encodeURIComponent(
        username
      )}&date=${encodeURIComponent(dateOfFiling)}`;
      window.location.href = manageUrl;
    }
  };

  if (loading) {
    return (
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <p>Loading leave records...</p>
      </div>
    );
  }

  return (
    <div className={styles.leaveAppContainer}>
      <Title>Leave Records | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />

      <Hamburger />
      <Sidebar />

      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <h1>Leave Records</h1>

        {/* Top Controls */}
        <div className={styles.leaveTopControls}>
          <div className={styles.leaveTableHeader}>
            <select
              className={styles.leaveFilterStatus}
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Status </option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>

            <select
              className={styles.leaveFilterType}
              value={filterLeaveType}
              onChange={(e) => {
                setFilterLeaveType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Leave Types</option>
              <option>Vacation</option>
              <option>Sick</option>
              <option>Emergency</option>
              <option>Maternity</option>
              <option>Paternity</option>
            </select>

            <input
              type="text"
              className={styles.leaveSearchBar}
              placeholder="🔍 Search leave records..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className={styles.leaveSummary}>
          <button
            className={`${styles.leaveSummaryCard} ${styles.leaveTotal} ${
              currentFilterCard === "total" ? styles.leaveActive : ""
            }`}
            onClick={() => handleCardClick("total")}
          >
            <h3>Total Records</h3>
            <p>{totalItems}</p>
          </button>
          <button
            className={`${styles.leaveSummaryCard} ${styles.leavePending} ${
              currentFilterCard === "pending" ? styles.leaveActive : ""
            }`}
            onClick={() => handleCardClick("pending")}
          >
            <h3>Pending</h3>
            <p>{pendingItems}</p>
          </button>
          <button
            className={`${styles.leaveSummaryCard} ${styles.leaveApproved} ${
              currentFilterCard === "approved" ? styles.leaveActive : ""
            }`}
            onClick={() => handleCardClick("approved")}
          >
            <h3>Approved</h3>
            <p>{approvedItems}</p>
          </button>
          <button
            className={`${styles.leaveSummaryCard} ${styles.leaveRejected} ${
              currentFilterCard === "rejected" ? styles.leaveActive : ""
            }`}
            onClick={() => handleCardClick("rejected")}
          >
            <h3>Rejected</h3>
            <p>{rejectedItems}</p>
          </button>
        </div>

        {/* Table */}
        <div className={styles.leaveTableContainer}>
          <div className={styles.leavePaginationContainer}>
            {renderPaginationButtons()}
          </div>

          <table className={styles.leaveTable}>
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Rank</th>
                <th>Date of Filing</th>
                <th>Leave Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Number of Days</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="9" className={styles.leaveNoRequestsTable}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      📭
                    </div>
                    <h3>No Leave Requests Found</h3>
                    <p>There are no leave requests submitted yet.</p>
                  </td>
                </tr>
              ) : (
                paginated.map((record) => (
                  <tr key={record.id}>
                    <td>{record.fullName}</td>
                    <td>{record.rank}</td>
                    <td>{record.dateOfFiling}</td>
                    <td>{record.leaveType}</td>
                    <td>{record.startDate}</td>
                    <td>{record.endDate}</td>
                    <td>{record.numDays}</td>
                    <td>
                      <span
                        className={`${styles.status} ${getStatusClass(
                          record.status
                        )}`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.manageBtn}
                        onClick={() =>
                          handleManageClick(
                            record.username,
                            record.dateOfFiling
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

export default LeaveRecords;
