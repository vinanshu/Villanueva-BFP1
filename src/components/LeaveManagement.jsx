import React, { useState, useEffect } from "react";
import styles from "./LeaveManagement.module.css";
import Sidebar from "./Sidebar.jsx";
import Hamburger from "./Hamburger.jsx";
import { useSidebar } from "./SidebarContext.jsx";
import { Title, Meta } from "react-head";
import { supabase } from "../lib/supabaseClient";

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
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const rowsPerPage = 5;
  const rowsPerPageCards = 4;

  useEffect(() => {
    const initialize = async () => {
      await checkIfAdmin();
      await loadLeaveRequests();
    };
    
    initialize();
    
    const channel = supabase
      .channel('leave-requests-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'leave_requests' }, 
        () => {
          loadLeaveRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilterAndSearch();
  }, [searchValue, filterValue, leaveRequests]);

  // Enhanced admin check with better debugging
  const checkIfAdmin = () => {
    console.log("🔍 Checking admin status...");
    
    // Check localStorage
    const currentUserData = localStorage.getItem('currentUser');
    const isAdminFlag = localStorage.getItem('isAdmin');
    
    console.log("localStorage currentUser:", currentUserData);
    console.log("localStorage isAdmin:", isAdminFlag);
    
    if (currentUserData) {
      try {
        const user = JSON.parse(currentUserData);
        console.log("Parsed user data:", user);
        
        setCurrentUser(user);
        
        // Check multiple conditions for admin
        const userIsAdmin = 
          user.username === "admin" || 
          user.username === "inspector" || 
          user.role === "admin" ||
          isAdminFlag === 'true' ||
          (user.personnelData && user.personnelData.is_admin === true);
        
        console.log("User is admin?", userIsAdmin);
        
        if (userIsAdmin) {
          setIsAdmin(true);
          setAdminUsername(user.username || "Admin");
          console.log("✅ User authenticated as ADMIN:", user.username);
        } else {
          setIsAdmin(false);
          console.log("❌ User is NOT admin");
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
      console.log("⚠️ No user data found in localStorage");
    }
  };

  const loadLeaveRequests = async () => {
    try {
      setLoading(true);
      console.log("Loading leave requests...");
      console.log("Current admin status:", isAdmin);
      console.log("Admin username:", adminUsername);
      
      let query = supabase
        .from("leave_requests")
        .select(`
          *,
          personnel:personnel_id (
            first_name,
            last_name,
            rank,
            station,
            username,
            email,
            is_admin,
            can_approve_leaves
          )
        `)
        .order("created_at", { ascending: false });

      // If not admin, filter by current user
      if (!isAdmin) {
        console.log("Filtering by current user (non-admin)");
        if (currentUser && currentUser.username) {
          query = query.eq("username", currentUser.username);
          console.log("Filtering by username:", currentUser.username);
        }
      } else {
        console.log("Admin mode: Showing ALL requests");
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading leave requests:", error);
        return;
      }

      console.log(`✅ Loaded ${data?.length} leave requests`);

      const transformedData = data.map(item => {
        const personnel = item.personnel || {};
        const employeeName = item.employee_name || 
          `${personnel.first_name || ''} ${personnel.last_name || ''}`.trim() || 
          item.username || 
          "Unknown Employee";
        
        return {
          id: item.id,
          personnel_id: item.personnel_id,
          username: item.username || personnel.username || "Unknown",
          employeeName: employeeName,
          leaveType: item.leave_type,
          startDate: item.start_date ? new Date(item.start_date).toISOString().split('T')[0] : "N/A",
          endDate: item.end_date ? new Date(item.end_date).toISOString().split('T')[0] : "N/A",
          numDays: item.num_days,
          location: item.location || personnel.station || "-",
          status: item.status || "Pending",
          dateOfFiling: item.date_of_filing ? new Date(item.date_of_filing).toISOString().split('T')[0] : "N/A",
          submittedAt: item.submitted_at,
          createdAt: item.created_at,
          updated_at: item.updated_at,
          approved_by: item.approved_by || null,
          reason: item.reason || null
        };
      });

      setLeaveRequests(transformedData);
      setFilteredRequests(transformedData);
    } catch (err) {
      console.error("Error loading leave requests:", err);
    } finally {
      setLoading(false);
    }
  };

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
    console.log(`🔄 Updating status for ${id} to ${newStatus}`);
    
    if (!isAdmin) {
      alert("❌ Only administrators can update leave request status.");
      return;
    }

    setProcessingAction(id);

    try {
      const { data: currentRequest, error: fetchError } = await supabase
        .from("leave_requests")
        .select("status, personnel_id, leave_type, num_days, username")
        .eq("id", id)
        .single();

      if (fetchError) {
        console.error("Error fetching request:", fetchError);
        throw fetchError;
      }

      if (currentRequest.status !== "Pending") {
        alert(`⚠️ This leave request has already been ${currentRequest.status.toLowerCase()}.`);
        setProcessingAction(null);
        await loadLeaveRequests();
        return;
      }

      const updateData = { 
        status: newStatus,
        updated_at: new Date().toISOString(),
        approved_by: adminUsername || "Admin"
      };

      if (newStatus === "Rejected") {
        const reason = prompt("Please enter a reason for rejection (optional):");
        if (reason !== null) {
          updateData.reason = reason;
        }
      }

      const { error: updateError } = await supabase
        .from("leave_requests")
        .update(updateData)
        .eq("id", id)
        .eq("status", "Pending");

      if (updateError) {
        console.error("Error updating request:", updateError);
        throw updateError;
      }

      console.log("✅ Status updated successfully");

      if (newStatus === "Approved") {
        console.log("📊 Updating leave balance for approved request");
        
        const { data: employee, error: employeeError } = await supabase
          .from("personnel")
          .select("earned_vacation, earned_sick, earned_emergency")
          .eq("id", currentRequest.personnel_id)
          .single();

        if (!employeeError && employee) {
          const balanceUpdateData = {};
          const leaveType = currentRequest.leave_type.toLowerCase();
          
          if (leaveType === "vacation" && employee.earned_vacation != null) {
            balanceUpdateData.earned_vacation = Math.max(
              0,
              parseFloat(employee.earned_vacation) - parseFloat(currentRequest.num_days)
            );
            console.log(`Updated vacation leave: ${employee.earned_vacation} - ${currentRequest.num_days} = ${balanceUpdateData.earned_vacation}`);
          } else if (leaveType === "sick" && employee.earned_sick != null) {
            balanceUpdateData.earned_sick = Math.max(
              0,
              parseFloat(employee.earned_sick) - parseFloat(currentRequest.num_days)
            );
            console.log(`Updated sick leave: ${employee.earned_sick} - ${currentRequest.num_days} = ${balanceUpdateData.earned_sick}`);
          } else if (leaveType === "emergency" && employee.earned_emergency != null) {
            balanceUpdateData.earned_emergency = Math.max(
              0,
              parseFloat(employee.earned_emergency) - parseFloat(currentRequest.num_days)
            );
            console.log(`Updated emergency leave: ${employee.earned_emergency} - ${currentRequest.num_days} = ${balanceUpdateData.earned_emergency}`);
          }

          if (Object.keys(balanceUpdateData).length > 0) {
            const { error: balanceError } = await supabase
              .from("personnel")
              .update(balanceUpdateData)
              .eq("id", currentRequest.personnel_id);

            if (balanceError) {
              console.error("Error updating leave balance:", balanceError);
            } else {
              console.log("✅ Leave balance updated successfully");
            }
          }
        }
      }

      alert(`✅ Leave request has been ${newStatus.toLowerCase()} successfully!`);
      await loadLeaveRequests();
      
    } catch (err) {
      console.error("Error updating status:", err);
      alert("❌ Error updating leave request status. Please try again.");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleApprove = async (id, employeeName) => {
    if (window.confirm(`✅ Are you sure you want to APPROVE the leave request for ${employeeName}?`)) {
      await updateStatus(id, "Approved");
    }
  };

  const handleReject = async (id, employeeName) => {
    if (window.confirm(`❌ Are you sure you want to REJECT the leave request for ${employeeName}?`)) {
      await updateStatus(id, "Rejected");
    }
  };

  const paginate = (data, page, rows) => {
    const start = (page - 1) * rows;
    return data.slice(start, start + rows);
  };

  const renderPaginationButtons = (page, setPage, rows) => {
    const pageCount = Math.max(1, Math.ceil(filteredRequests.length / rows));
    const hasNoRequests = filteredRequests.length === 0;

    const buttons = [];

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

    if (page > 3) {
      buttons.push(
        <span key="ellipsis1" className={styles.leavePaginationEllipsis}>
          ...
        </span>
      );
    }

    let startPage = Math.max(2, page - 1);
    let endPage = Math.min(pageCount - 1, page + 1);

    if (page <= 3) {
      endPage = Math.min(pageCount - 1, 4);
    }

    if (page >= pageCount - 2) {
      startPage = Math.max(2, pageCount - 3);
    }

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

    if (page < pageCount - 2) {
      buttons.push(
        <span key="ellipsis2" className={styles.leavePaginationEllipsis}>
          ...
        </span>
      );
    }

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

  const getStatusClass = (status) => {
    const statusClass = status?.toLowerCase() || "";
    return `${styles.leave}${
      statusClass.charAt(0).toUpperCase() + statusClass.slice(1)
    }`;
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === "N/A") return "N/A";
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
      <div className="app-container">
        <Hamburger />
        <Sidebar />
        <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading leave requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Title>Leave Management | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />
      <Hamburger />
      <Sidebar />

      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <h1>Leave Management</h1>
        
        {/* Debug info - remove in production */}
        <div style={{
          background: '#f0f0f0',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '20px',
          fontSize: '12px'
        }}>
          <strong>Debug Info:</strong> 
          Admin: {isAdmin ? '✅ YES' : '❌ NO'} | 
          Username: {currentUser?.username || 'None'} | 
          Role: {currentUser?.role || 'None'} |
          Total Requests: {leaveRequests.length}
        </div>
        
        {/* Simple admin indicator */}
        {isAdmin && (
          <div className={styles.adminIndicator}>
            <span className={styles.adminBadge}>ADMIN</span>
            <p>You are logged in as an administrator. You can approve or reject leave requests.</p>
            <p><small>Logged in as: <strong>{currentUser?.name || adminUsername}</strong></small></p>
          </div>
        )}

        {/* Simple user notice */}
        {!isAdmin && (
          <div className={styles.userNotice}>
            <p>You are viewing your own leave requests. Only administrators can approve or reject requests.</p>
            {currentUser && (
              <p><small>Logged in as: <strong>{currentUser.name || currentUser.username}</strong></small></p>
            )}
          </div>
        )}

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

        {currentView === "table" && (
          <>
            <div className={styles.tableWrapper}>
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
                        const isProcessing = processingAction === req.id;
                        const isPending = req.status?.toLowerCase() === "pending";
                        
                        return (
                          <tr key={req.id}>
                            <td>{req.employeeName || "Unknown"}</td>
                            <td>{req.leaveType || "N/A"}</td>
                            <td>{req.location || "-"}</td>
                            <td>{formatDate(req.startDate)}</td>
                            <td>{formatDate(req.endDate)}</td>
                            <td>{req.numDays || 0}</td>
                            <td className={statusClass}>
                              {req.status || "Pending"}
                            </td>
                            <td className={styles.leaveActions}>
                              {isAdmin && isPending ? (
                                <div className={styles.actionButtons}>
                                  <button
                                    className={`${styles.leaveApprove} ${isProcessing ? styles.processing : ''}`}
                                    onClick={() => handleApprove(req.id, req.employeeName)}
                                    disabled={isProcessing}
                                    title="Approve this leave request"
                                  >
                                    {isProcessing ? "Processing..." : "✓ Approve"}
                                  </button>
                                  <button
                                    className={`${styles.leaveReject} ${isProcessing ? styles.processing : ''}`}
                                    onClick={() => handleReject(req.id, req.employeeName)}
                                    disabled={isProcessing}
                                    title="Reject this leave request"
                                  >
                                    {isProcessing ? "Processing..." : "✗ Reject"}
                                  </button>
                                  <button 
                                    className={styles.viewBtn}
                                    onClick={() => setModalData(req)}
                                    title="View details"
                                  >
                                    👁 View
                                  </button>
                                </div>
                              ) : !isPending ? (
                                <div className={styles.statusInfo}>
                                  <button 
                                    className={styles.viewBtn}
                                    onClick={() => setModalData(req)}
                                  >
                                    👁 View
                                  </button>
                                  {req.approved_by && (
                                    <span className={styles.approvedBy}>
                                      By: {req.approved_by}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <button 
                                  className={styles.viewBtn}
                                  onClick={() => setModalData(req)}
                                >
                                  👁 View
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
            </div>

            <div className={styles.leavePaginationContainer1}>
              {renderPaginationButtons(
                currentPage,
                setCurrentPage,
                rowsPerPage
              )}
            </div>
          </>
        )}

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
                  const isProcessing = processingAction === req.id;
                  const isPending = req.status?.toLowerCase() === "pending";
                  
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
                          <strong>Duration:</strong> {formatDate(req.startDate)} to{" "}
                          {formatDate(req.endDate)}
                        </p>
                        <p>
                          <strong>Days:</strong> {req.numDays || 0}
                        </p>
                        <p>
                          <strong>Filed:</strong>{" "}
                          {formatDate(req.dateOfFiling) || "Unknown"}
                        </p>
                        {req.approved_by && req.status !== "Pending" && (
                          <p>
                            <strong>Processed by:</strong> {req.approved_by}
                          </p>
                        )}
                      </div>
                      <div className={styles.leaveCardActions}>
                        {isAdmin && isPending ? (
                          <div className={styles.cardActionButtons}>
                            <button
                              className={`${styles.leaveApprove} ${isProcessing ? styles.processing : ''}`}
                              onClick={() => handleApprove(req.id, req.employeeName)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? "Processing..." : "✓ Approve"}
                            </button>
                            <button
                              className={`${styles.leaveReject} ${isProcessing ? styles.processing : ''}`}
                              onClick={() => handleReject(req.id, req.employeeName)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? "Processing..." : "✗ Reject"}
                            </button>
                            <button 
                              className={styles.viewBtn}
                              onClick={() => setModalData(req)}
                            >
                              👁 Details
                            </button>
                          </div>
                        ) : (
                          <button 
                            className={styles.viewBtn}
                            onClick={() => setModalData(req)}
                          >
                            👁 View Details
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={styles.leavePaginationContainer}>
              {renderPaginationButtons(
                currentPageCards,
                setCurrentPageCards,
                rowsPerPageCards
              )}
            </div>
          </>
        )}

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
                  <b>Start Date:</b> {formatDate(modalData.startDate) || "N/A"}
                </p>
                <p>
                  <b>End Date:</b> {formatDate(modalData.endDate) || "N/A"}
                </p>
                <p>
                  <b>Number of Days:</b> {modalData.numDays || 0}
                </p>
                <p>
                  <b>Date of Filing:</b> {formatDate(modalData.dateOfFiling) || "Unknown"}
                </p>
                <p>
                  <b>Status:</b>{" "}
                  <span className={getStatusClass(modalData.status)}>
                    {modalData.status || "Pending"}
                  </span>
                </p>
                {modalData.username && (
                  <p>
                    <b>Username:</b> {modalData.username}
                  </p>
                )}
                {modalData.approved_by && (
                  <p>
                    <b>Processed by:</b> {modalData.approved_by}
                  </p>
                )}
                {modalData.reason && (
                  <p>
                    <b>Reason for rejection:</b> {modalData.reason}
                  </p>
                )}
                {modalData.updated_at && (
                  <p>
                    <b>Last Updated:</b>{" "}
                    {new Date(modalData.updated_at).toLocaleString()}
                  </p>
                )}
              </div>
              {isAdmin && modalData.status?.toLowerCase() === "pending" && (
                <div className={styles.modalActions}>
                  <button
                    className={styles.leaveApprove}
                    onClick={() => {
                      handleApprove(modalData.id, modalData.employeeName);
                      setModalData(null);
                    }}
                  >
                    ✓ Approve This Request
                  </button>
                  <button
                    className={styles.leaveReject}
                    onClick={() => {
                      handleReject(modalData.id, modalData.employeeName);
                      setModalData(null);
                    }}
                  >
                    ✗ Reject This Request
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveManagement;