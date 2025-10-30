import React, { useState, useEffect, useCallback } from "react";
import EmployeeSidebar from "./EmployeeSidebar";
import Hamburger from "./Hamburger";
import styles from "./EmployeeLeaveDashboard.module.css";
import { useSidebar } from "./SidebarContext.jsx";
import { Title, Meta } from "react-head";

// Import your actual database functions - REMOVED getCurrentUser
import {
  openDB,
  STORE_PERSONNEL,
  STORE_LEAVE,
  getLeaveRequests,
  updateRecord,
  deleteRecord,
  getPersonnelList,
} from "./db"; // Adjust the import path as needed

const EmployeeLeaveDashboard = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [leaveData, setLeaveData] = useState({
    leaveCounts: {},
    userRequests: [],
  });
  const [cachedPersonnel, setCachedPersonnel] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isSidebarCollapsed } = useSidebar();

  // Table and pagination states (UPDATED with filter card functionality)
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [currentFilterCard, setCurrentFilterCard] = useState("total");
  const rowsPerPage = 5;

  // Date formatting helper
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate days between dates
  const calculateDays = (start, end) => {
    return (
      Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1
    );
  };

  // Monthly leave accrual
  const accrueMonthlyLeave = useCallback(async (emp) => {
    if (!emp) return emp;

    const now = new Date();
    if (emp.lastAccrual) {
      const last = new Date(emp.lastAccrual);
      if (
        last.getFullYear() === now.getFullYear() &&
        last.getMonth() === now.getMonth()
      ) {
        return emp;
      }
    }

    const updatedEmployee = {
      ...emp,
      earnedVacation: Math.min((emp.earnedVacation || 0) + 1.25, 15),
      earnedSick: Math.min((emp.earnedSick || 0) + 1, 10),
      earnedEmergency: Math.min((emp.earnedEmergency || 0) + 0.5, 5),
      lastAccrual: now.toISOString(),
    };

    await updateRecord(STORE_PERSONNEL, updatedEmployee);
    return updatedEmployee;
  }, []);

  // Fetch leave data
  const getLeaveData = useCallback(async (user) => {
    try {
      const allLeaves = await getLeaveRequests();
      const userRequests = allLeaves.filter((r) => r.username === user);

      const leaveCounts = { vacation: 0, sick: 0, emergency: 0 };
      userRequests.forEach((req) => {
        if (req.status === "Approved") {
          const days =
            parseInt(req.numDays) || calculateDays(req.startDate, req.endDate);
          if (req.leaveType === "Vacation") leaveCounts.vacation += days;
          if (req.leaveType === "Sick") leaveCounts.sick += days;
          if (req.leaveType === "Emergency") leaveCounts.emergency += days;
        }
      });

      return {
        leaveCounts,
        userRequests: userRequests.sort(
          (a, b) => new Date(b.dateOfFiling) - new Date(a.dateOfFiling)
        ),
      };
    } catch (error) {
      console.error("Error fetching leave data:", error);
      return { leaveCounts: {}, userRequests: [] };
    }
  }, []);

  // Get current user from session storage
  const getCurrentUserFromSession = async () => {
    try {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        return JSON.parse(storedUser);
      }

      const sessionUser = sessionStorage.getItem("currentUser");
      if (sessionUser) {
        return JSON.parse(sessionUser);
      }

      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("session", "readonly");
        const store = tx.objectStore("session");
        const request = store.get("currentUser");

        request.onsuccess = () => {
          const session = request.result;
          resolve(session ? session.value : null);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  };

  // Update leave cards
  const getLeaveCardData = (emp, lData) => {
    if (!emp || !lData) return null;

    const remaining = {
      vacation: Math.max(
        0,
        (emp.earnedVacation || 0) - lData.leaveCounts.vacation
      ),
      sick: Math.max(0, (emp.earnedSick || 0) - lData.leaveCounts.sick),
      emergency: Math.max(
        0,
        (emp.earnedEmergency || 0) - lData.leaveCounts.emergency
      ),
    };

    const earned = { vacation: 1.25, sick: 1, emergency: 0.5 };

    return {
      vacation: {
        earned: earned.vacation.toFixed(2),
        value: `${remaining.vacation.toFixed(2)} / ${(
          emp.earnedVacation || 0
        ).toFixed(2)}`,
        progress:
          (emp.earnedVacation || 0) > 0
            ? (remaining.vacation / (emp.earnedVacation || 1)) * 100
            : 0,
      },
      sick: {
        earned: earned.sick.toFixed(2),
        value: `${remaining.sick.toFixed(2)} / ${(emp.earnedSick || 0).toFixed(
          2
        )}`,
        progress:
          (emp.earnedSick || 0) > 0
            ? (remaining.sick / (emp.earnedSick || 1)) * 100
            : 0,
      },
      emergency: {
        earned: earned.emergency.toFixed(2),
        value: `${remaining.emergency.toFixed(2)} / ${(
          emp.earnedEmergency || 0
        ).toFixed(2)}`,
        progress:
          (emp.earnedEmergency || 0) > 0
            ? (remaining.emergency / (emp.earnedEmergency || 1)) * 100
            : 0,
      },
    };
  };

  // Summary cards data (UPDATED with filter card functionality)
  const getSummaryCardsData = () => {
    const totalRequests = leaveData.userRequests.length;
    const approvedRequests = leaveData.userRequests.filter(
      (req) => req.status === "Approved"
    ).length;
    const pendingRequests = leaveData.userRequests.filter(
      (req) => req.status === "Pending"
    ).length;
    const rejectedRequests = leaveData.userRequests.filter(
      (req) => req.status === "Rejected"
    ).length;

    return {
      total: totalRequests,
      approved: approvedRequests,
      pending: pendingRequests,
      rejected: rejectedRequests,
    };
  };

  // Filtering logic (UPDATED with filter card functionality)
  const applyFilters = (requests) => {
    let filtered = [...requests];

    // Card filter (NEW)
    if (currentFilterCard === "approved") {
      filtered = filtered.filter((req) => req.status === "Approved");
    } else if (currentFilterCard === "pending") {
      filtered = filtered.filter((req) => req.status === "Pending");
    } else if (currentFilterCard === "rejected") {
      filtered = filtered.filter((req) => req.status === "Rejected");
    }

    // Search filter
    const s = search.trim().toLowerCase();
    if (s) {
      filtered = filtered.filter(
        (req) =>
          req.leaveType.toLowerCase().includes(s) ||
          req.status.toLowerCase().includes(s) ||
          formatDate(req.startDate).toLowerCase().includes(s) ||
          formatDate(req.endDate).toLowerCase().includes(s)
      );
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter(
        (req) => req.status.toLowerCase() === filterStatus.toLowerCase()
      );
    }

    // Type filter
    if (filterType) {
      filtered = filtered.filter(
        (req) => req.leaveType.toLowerCase() === filterType.toLowerCase()
      );
    }

    return filtered;
  };

  // Card click handler (NEW)
  const handleCardClick = (filter) => {
    if (currentFilterCard === filter) {
      setCurrentFilterCard("total");
    } else {
      setCurrentFilterCard(filter);
    }
    setCurrentPage(1);
  };

  // Pagination logic
  const filteredRequests = applyFilters(leaveData.userRequests);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / rowsPerPage)
  );
  const pageStart = (currentPage - 1) * rowsPerPage;
  const paginatedRequests = filteredRequests.slice(
    pageStart,
    pageStart + rowsPerPage
  );

  // Pagination buttons renderer (UPDATED with inventory-style classes)
  const renderPaginationButtons = () => {
    const pageCount = Math.max(
      1,
      Math.ceil(filteredRequests.length / rowsPerPage)
    );
    const hasNoData = filteredRequests.length === 0;

    const buttons = [];

    // Previous button
    buttons.push(
      <button
        key="prev"
        className={`${styles.EMPLDpaginationBtn} ${
          hasNoData ? styles.EMPLDdisabled : ""
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
        className={`${styles.EMPLDpaginationBtn} ${
          1 === currentPage ? styles.EMPLDactive : ""
        } ${hasNoData ? styles.EMPLDdisabled : ""}`}
        onClick={() => setCurrentPage(1)}
        disabled={hasNoData}
      >
        1
      </button>
    );

    // Show ellipsis after first page if needed
    if (currentPage > 3) {
      buttons.push(
        <span key="ellipsis1" className={styles.EMPLDpaginationEllipsis}>
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
            className={`${styles.EMPLDpaginationBtn} ${
              i === currentPage ? styles.EMPLDactive : ""
            } ${hasNoData ? styles.EMPLDdisabled : ""}`}
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
        <span key="ellipsis2" className={styles.EMPLDpaginationEllipsis}>
          ...
        </span>
      );
    }

    // Always show last page if there is more than 1 page
    if (pageCount > 1) {
      buttons.push(
        <button
          key={pageCount}
          className={`${styles.EMPLDpaginationBtn} ${
            pageCount === currentPage ? styles.EMPLDactive : ""
          } ${hasNoData ? styles.EMPLDdisabled : ""}`}
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
        className={`${styles.EMPLDpaginationBtn} ${
          hasNoData ? styles.EMPLDdisabled : ""
        }`}
        disabled={currentPage === pageCount || hasNoData}
        onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
      >
        Next
      </button>
    );

    return buttons;
  };

  // Update all stats
  const updateAllStats = useCallback(
    async (emp, lData) => {
      const updatedEmployee = await accrueMonthlyLeave(emp);
      if (updatedEmployee) {
        setEmployee(updatedEmployee);
      }
      setLeaveData(lData);
      setLoading(false);
    },
    [accrueMonthlyLeave]
  );

  // Event handlers
  const handleEdit = (request) => {
    setSelectedRequest(request);
    setEditModalOpen(true);
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setDeleteModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    const formData = new FormData(e.target);
    const updatedRequest = {
      ...selectedRequest,
      leaveType: formData.get("leaveType"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      numDays: calculateDays(
        formData.get("startDate"),
        formData.get("endDate")
      ),
    };

    try {
      await updateRecord(STORE_LEAVE, updatedRequest);

      const newLeaveData = await getLeaveData(currentUser);
      const updatedEmployee = cachedPersonnel.find(
        (p) => p.username === currentUser
      );

      if (updatedEmployee) {
        await updateRecord(STORE_PERSONNEL, updatedEmployee);
      }

      setEditModalOpen(false);
      setSelectedRequest(null);
      updateAllStats(updatedEmployee, newLeaveData);
    } catch (error) {
      console.error("Error updating leave request:", error);
      alert("Error updating leave request. Please try again.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    try {
      await deleteRecord(STORE_LEAVE, Number(deleteId));

      const newLeaveData = await getLeaveData(currentUser);
      const updatedEmployee = cachedPersonnel.find(
        (p) => p.username === currentUser
      );

      if (updatedEmployee) {
        await updateRecord(STORE_PERSONNEL, updatedEmployee);
      }

      setDeleteModalOpen(false);
      setDeleteId(null);
      updateAllStats(updatedEmployee, newLeaveData);
    } catch (error) {
      console.error("Error deleting leave request:", error);
      alert("Error deleting leave request. Please try again.");
    }
  };

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);

        // Get current user from session
        const user = await getCurrentUserFromSession();
        if (!user) {
          console.log("No user found in session, redirecting to login...");
          window.location.href = "/";
          return;
        }

        setCurrentUser(user);
        await openDB();

        // Get personnel data
        const personnelList = await getPersonnelList();
        setCachedPersonnel(personnelList);

        const emp = personnelList.find((p) => p.username === user);
        if (!emp) {
          console.error("Employee not found for user:", user);
          setLoading(false);
          return;
        }

        // Initialize leave balances if they don't exist
        const employeeWithDefaults = {
          ...emp,
          earnedVacation: emp.earnedVacation || 0,
          earnedSick: emp.earnedSick || 0,
          earnedEmergency: emp.earnedEmergency || 0,
          lastAccrual: emp.lastAccrual || new Date().toISOString(),
        };

        const lData = await getLeaveData(user);
        await updateAllStats(employeeWithDefaults, lData);
      } catch (error) {
        console.error("Initialization error:", error);
        setLoading(false);
      }
    };

    initialize();
  }, [getLeaveData, updateAllStats]);

  const leaveCardData = getLeaveCardData(employee, leaveData);
  const summaryCardsData = getSummaryCardsData();

  if (loading) {
    return (
      <div className="appELD">
        <EmployeeSidebar />
        <Hamburger />
        <main
          className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}
        >
         
        </main>
      </div>
    );
  }

  return (
    <div className="appELD">
      <Title>Employee Leave Dashboard | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />
      <EmployeeSidebar />
      <Hamburger />

      <main className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className={styles.EMPLDdashboardHeader}>
          <h1>Employee Leave Dashboard</h1>
        </div>

        {/* Welcome Message */}
      
        {/* UPDATED: Summary Cards with Filter Functionality */}
        <div className={styles.EMPLDsummaryCards}>
          <button
            className={`${styles.EMPLDsummaryCard} ${styles.EMPLDtotal} ${
              currentFilterCard === "total" ? styles.EMPLDactive : ""
            }`}
            onClick={() => handleCardClick("total")}
          >
            <h3>Total Requests</h3>
            <p>{summaryCardsData.total}</p>
          </button>
          <button
            className={`${styles.EMPLDsummaryCard} ${styles.EMPLDapproved} ${
              currentFilterCard === "approved" ? styles.EMPLDactive : ""
            }`}
            onClick={() => handleCardClick("approved")}
          >
            <h3>Approved</h3>
            <p>{summaryCardsData.approved}</p>
          </button>
          <button
            className={`${styles.EMPLDsummaryCard} ${styles.EMPLDpending} ${
              currentFilterCard === "pending" ? styles.EMPLDactive : ""
            }`}
            onClick={() => handleCardClick("pending")}
          >
            <h3>Pending</h3>
            <p>{summaryCardsData.pending}</p>
          </button>
          <button
            className={`${styles.EMPLDsummaryCard} ${styles.EMPLDrejected} ${
              currentFilterCard === "rejected" ? styles.EMPLDactive : ""
            }`}
            onClick={() => handleCardClick("rejected")}
          >
            <h3>Rejected</h3>
            <p>{summaryCardsData.rejected}</p>
          </button>
        </div>

        {/* Leave Cards */}
        <div className={styles.EMPLDleaveCards}>
          <div className={styles.EMPLDleaveCard}>
            <h4>Vacation Leave</h4>
            <p>
              Total Earned This Month:{" "}
              <span>{leaveCardData?.vacation.earned || "0"}</span> days
            </p>
            <div className={styles.EMPLDprogressBar}>
              <div
                className={styles.EMPLDleaveProgress}
                style={{ width: `${leaveCardData?.vacation.progress || 0}%` }}
              ></div>
            </div>
            <p>
              <span>{leaveCardData?.vacation.value || "0 / 0"}</span> days
              remaining
            </p>
          </div>

          <div className={styles.EMPLDleaveCard}>
            <h4>Sick Leave</h4>
            <p>
              Total Earned This Month:{" "}
              <span>{leaveCardData?.sick.earned || "0"}</span> days
            </p>
            <div className={styles.EMPLDprogressBar}>
              <div
                className={styles.EMPLDleaveProgress}
                style={{ width: `${leaveCardData?.sick.progress || 0}%` }}
              ></div>
            </div>
            <p>
              <span>{leaveCardData?.sick.value || "0 / 0"}</span> days remaining
            </p>
          </div>

          <div className={styles.EMPLDleaveCard}>
            <h4>Emergency Leave</h4>
            <p>
              Total Earned This Month:{" "}
              <span>{leaveCardData?.emergency.earned || "0"}</span> days
            </p>
            <div className={styles.EMPLDprogressBar}>
              <div
                className={styles.EMPLDleaveProgress}
                style={{ width: `${leaveCardData?.emergency.progress || 0}%` }}
              ></div>
            </div>
            <p>
              <span>{leaveCardData?.emergency.value || "0 / 0"}</span> days
              remaining
            </p>
          </div>
        </div>

        {/* Recent Leave Requests */}
        <div className={styles.EMPLDtableSectionHeader}>
          <h2>Recent Leave Requests</h2>
        </div>

        {/* UPDATED: Top Controls (Filters and Search) */}
        <div className={styles.EMPLDtopControls}>
          <div className={styles.EMPLDtableHeader}>
            <select
              className={styles.EMPLDfilterType}
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Types</option>
              <option value="Vacation">Vacation</option>
              <option value="Sick">Sick</option>
              <option value="Emergency">Emergency</option>
            </select>

            <select
              className={styles.EMPLDfilterStatus}
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>

            <input
              type="text"
              className={styles.EMPLDsearchBar}
              placeholder="🔍 Search requests..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* UPDATED: Top Pagination */}
        <div
          className={`${styles.EMPLDpaginationContainer} ${styles.EMPLDtopPagination}`}
        >
          {renderPaginationButtons()}
        </div>

        {/* UPDATED: Table Container with Inventory Styling */}
        <div className={styles.EMPLDtableContainer}>
          <table className={styles.EMPLDtable}>
            <thead>
              <tr>
                <th>Leave Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days</th>
                <th>Status</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody className={styles.EMPLDtbody}>
              {paginatedRequests.length > 0 ? (
                paginatedRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.leaveType}</td>
                    <td>{formatDate(request.startDate)}</td>
                    <td>{formatDate(request.endDate)}</td>
                    <td>{request.numDays}</td>
                    <td
                      className={
                        request.status.toLowerCase() === "approved"
                          ? styles.EMPLDstatusApproved
                          : request.status.toLowerCase() === "pending"
                          ? styles.EMPLDstatusPending
                          : styles.EMPLDstatusRejected
                      }
                    >
                      {request.status}
                    </td>
                    <td>
                      <div className={styles.EMPLDmanageButtons}>
                        <button
                          className={styles.EMPLDbtnEdit}
                          onClick={() => handleEdit(request)}
                        >
                          Edit
                        </button>
                        <button
                          className={styles.EMPLDbtnDelete}
                          onClick={() => handleDelete(request.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="8"
                    className={styles.EMPLDNoRequestsTable}
                  >
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      📋
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
                    <p style={{ fontSize: "14px", color: "#999" }}>
                      {search ||
                      filterStatus ||
                      filterType ||
                      currentFilterCard !== "total"
                        ? "Try adjusting your filters or search terms"
                        : "You haven't submitted any leave requests yet"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>



        {/* Edit Modal */}
        <div
          className={`${styles.EMPLDmodal} ${
            editModalOpen ? styles.EMPLDmodalOpen : ""
          }`}
        >
          <div className={styles.EMPLDmodalContent}>
            <span
              className={styles.EMPLDclose}
              onClick={() => setEditModalOpen(false)}
            >
              &times;
            </span>
            <h2>Edit Leave Request</h2>
            <form onSubmit={handleEditSubmit}>
              <input
                type="hidden"
                name="id"
                value={selectedRequest?.id || ""}
              />
              <label>Leave Type</label>
              <select
                name="leaveType"
                defaultValue={selectedRequest?.leaveType || ""}
                required
              >
                <option value="Vacation">Vacation</option>
                <option value="Sick">Sick</option>
                <option value="Emergency">Emergency</option>
              </select>
              <label>Start Date</label>
              <input
                type="date"
                name="startDate"
                defaultValue={selectedRequest?.startDate || ""}
                required
              />
              <label>End Date</label>
              <input
                type="date"
                name="endDate"
                defaultValue={selectedRequest?.endDate || ""}
                required
              />
              <div className={styles.EMPLDmodalActions}>
                <button
                  type="button"
                  className={styles.EMPLDmodalCancel}
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.EMPLDmodalSubmit}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Delete Modal */}
        <div
          className={`${styles.EMPLDmodal} ${
            deleteModalOpen ? styles.EMPLDmodalOpen : ""
          }`}
        >
          <div className={styles.EMPLDmodalContent}>
            <span
              className={styles.EMPLDclose}
              onClick={() => setDeleteModalOpen(false)}
            >
              &times;
            </span>
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to delete this leave request?</p>
            <div className={styles.EMPLDmodalActions}>
              <button
                className={styles.EMPLDmodalCancel}
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className={styles.EMPLDconfirmDelete}
                onClick={handleDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeLeaveDashboard;
