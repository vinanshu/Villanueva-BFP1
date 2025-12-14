import React, { useState, useEffect } from "react";
import styles from "./LeaveRecords.module.css";
import Sidebar from "./Sidebar.jsx";
import Hamburger from "./Hamburger.jsx";
import { useSidebar } from "./SidebarContext.jsx";
import { Title, Meta } from "react-head";
import { supabase } from "../lib/supabaseClient";

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
    
    // Set up real-time subscription
    const channel = supabase
      .channel('leave-records-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'leave_requests' }, 
        () => {
          loadLeaveRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLeaveRecords = async () => {
    try {
      setLoading(true);
      console.log("Loading leave records from Supabase...");

      // Fetch leave requests with personnel information
      const { data: leaveRequests, error: leaveError } = await supabase
        .from("leave_requests")
        .select(`
          *,
          personnel:personnel_id (
            id,
            username,
            first_name,
            last_name,
            rank,
            badge_number,
            station
          )
        `)
        .order("date_of_filing", { ascending: false });

      if (leaveError) {
        console.error("Error loading leave requests:", leaveError);
        setNoData(true);
        setLoading(false);
        return;
      }

      console.log("Total Leave Requests:", leaveRequests?.length || 0);

      // Check if there are any leave requests
      if (!leaveRequests || leaveRequests.length === 0) {
        console.log("No leave requests found in database");
        setNoData(true);
        setLoading(false);
        setLeaveData([]);
        return;
      }

      // Process the data to match the expected structure
      const processedData = leaveRequests.map((req) => {
        const personnel = req.personnel || {};
        const status = req.status || "Pending";
        
        return {
          id: req.id,
          personnel_id: req.personnel_id,
          fullName: `${personnel.first_name || ""} ${personnel.last_name || ""}`.trim() || "Unknown",
          rank: personnel.rank || "N/A",
          dateOfFiling: req.date_of_filing ? new Date(req.date_of_filing).toLocaleDateString() : "N/A",
          leaveType: req.leave_type || "N/A",
          startDate: req.start_date ? new Date(req.start_date).toLocaleDateString() : "N/A",
          endDate: req.end_date ? new Date(req.end_date).toLocaleDateString() : "N/A",
          numDays: req.num_days || 0,
          status: status,
          username: req.username || personnel.username || "Unknown",
          station: personnel.station || "N/A",
          created_at: req.created_at,
          updated_at: req.updated_at
        };
      });

      console.log("Processed records:", processedData.length);
      console.log("Sample processed data:", processedData[0]);

      setLeaveData(processedData);
      setNoData(false);
    } catch (err) {
      console.error("[leaveRecords] error loading", err);
      setNoData(true);
    } finally {
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
        `${i.fullName} ${i.rank} ${i.station} ${i.dateOfFiling} ${i.leaveType} ${i.startDate} ${i.endDate} ${i.numDays} ${i.status}`.toLowerCase();
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

    // Show pages around current page
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

  const handleManageClick = (username, dateOfFiling, personnelId) => {
    // Navigate to leave management page with parameters
    const params = new URLSearchParams();
    if (username) params.append('username', username);
    if (dateOfFiling) params.append('date', dateOfFiling);
    if (personnelId) params.append('personnel_id', personnelId);
    
    const manageUrl = `/leaveManagement?${params.toString()}`;
    window.location.href = manageUrl;
  };

  // Format date helper function
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  if (loading) {
    return (
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading leave records...</p>
        </div>
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
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
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
              <option value="Vacation">Vacation</option>
              <option value="Sick">Sick</option>
              <option value="Emergency">Emergency</option>
              <option value="Maternity">Maternity</option>
              <option value="Paternity">Paternity</option>
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
              {noData || paginated.length === 0 ? (
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
                    <td>{formatDate(record.dateOfFiling)}</td>
                    <td>{record.leaveType}</td>
                    <td>{formatDate(record.startDate)}</td>
                    <td>{formatDate(record.endDate)}</td>
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
                            record.dateOfFiling,
                            record.personnel_id
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

          {/* Bottom Pagination */}
          <div className={styles.leavePaginationContainer}>
            {renderPaginationButtons()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveRecords;