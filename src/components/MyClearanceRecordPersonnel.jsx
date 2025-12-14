import React, { useState, useEffect } from "react";
import { useSidebar } from "../components/SidebarContext";
import { supabase } from "../lib/supabaseClient";
import { Title, Meta } from "react-head";
import styles from "./ClearanceSystem.module.css";

// Assuming you have these components - adjust if they're different
import Sidebar from "./Sidebar.jsx";
import Hamburger from "./Hamburger.jsx";

const MyClearanceRecordPersonnel = () => {
  const { isSidebarCollapsed } = useSidebar();
  const [clearanceRequests, setClearanceRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filters, setFilters] = useState({
    status: "All",
    type: "All",
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const rowsPerPage = 5;

  // Load user session and data
  useEffect(() => {
    loadUserSession();
  }, []);

  useEffect(() => {
    if (user) {
      loadMyClearanceRequests();
    }
  }, [user]);

  // Filter data when filters change
  useEffect(() => {
    filterData();
  }, [clearanceRequests, filters]);

  const loadUserSession = async () => {
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error:", sessionError);
        return;
      }
      
      if (session?.user) {
        // Get user details from personnel table
        const { data: personnelData, error } = await supabase
          .from("personnel")
          .select("*")
          .eq("auth_user_id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching personnel:", error);
          // Try alternative: check if user email matches
          const { data: altPersonnelData, error: altError } = await supabase
            .from("personnel")
            .select("*")
            .eq("email", session.user.email)
            .single();
            
          if (altError) {
            console.error("Alternative fetch error:", altError);
            return;
          }
          
          setUser(altPersonnelData);
        } else {
          setUser(personnelData);
        }
      } else {
        console.log("No active session found");
        // Redirect to login if no session
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Error loading user session:", err);
    }
  };

  const loadMyClearanceRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // First, let's check if the clearance_requests table exists and has data
      const { data, error, count } = await supabase
        .from("clearance_requests")
        .select(`
          *,
          approved_by_user:approved_by (
            first_name,
            last_name,
            username
          )
        `, { count: 'exact' })
        .eq("personnel_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        // Check if table exists
        if (error.code === 'PGRST116') {
          console.error("Table 'clearance_requests' might not exist");
          alert("Clearance requests table is not available. Please contact administrator.");
          setClearanceRequests([]);
          return;
        }
        throw error;
      }

      console.log("Fetched data:", data);

      // Format the data
      const formattedData = (data || []).map(request => {
        const approver = request.approved_by_user || {};
        const approvedByName = `${approver.first_name || ''} ${approver.last_name || ''}`.trim();
        
        return {
          id: request.id,
          type: request.type || 'Unknown',
          status: request.status || 'Pending',
          date: request.created_at ? new Date(request.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }) : 'Date not available',
          approved_date: request.approved_at ? new Date(request.approved_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }) : null,
          approved_by: approvedByName || request.approved_by || 'N/A',
          approver_username: approver.username,
          remarks: request.remarks || 'No remarks',
          created_at: request.created_at,
          updated_at: request.updated_at
        };
      });

      setClearanceRequests(formattedData);
      console.log("Formatted data:", formattedData);
    } catch (err) {
      console.error("Error loading clearance requests:", err);
      alert("Failed to load clearance requests. Please try again.");
      setClearanceRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = clearanceRequests.filter((req) => {
      const statusMatch =
        filters.status === "All" || req.status === filters.status;
      const typeMatch =
        filters.type === "All" || req.type === filters.type;
      return statusMatch && typeMatch;
    });
    setFilteredRequests(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Pagination functions
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

    // Page buttons
    for (let i = 1; i <= pageCount; i++) {
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

  // View details
  const showDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  // Get status badge color
  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'Completed':
        return styles.clearanceCompleted;
      case 'Pending':
        return styles.clearancePending;
      case 'Rejected':
        return styles.clearanceRejected;
      default:
        return '';
    }
  };

  return (
    <div className={styles.clearanceSystem}>
      <Title>My Clearance Records | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />
      
      <Hamburger />
      <Sidebar />

      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className={styles.clearanceHeader}>
          <h1>My Clearance Records</h1>
          <div className={styles.clearanceSubHeader}>
            {user ? (
              <>
                <span className={styles.clearanceUserInfo}>
                  {`${user.first_name} ${user.last_name}`}
                </span>
                <span className={styles.clearanceUserBadge}>
                  {user.badge_number ? `Badge: ${user.badge_number}` : 'No badge number'}
                </span>
              </>
            ) : (
              <span className={styles.clearanceUserInfo}>
                Loading user information...
              </span>
            )}
          </div>
        </div>
        
        {/* Filter Section */}
        <div className={styles.clearanceFilterSearchWrapper}>
          <div className={styles.clearanceFilterGroup}>
            <label htmlFor="clearanceStatusFilter">Filter by Status:</label>
            <select
              id={styles.clearanceStatusFilter}
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          
          <div className={styles.clearanceFilterGroup}>
            <label htmlFor="clearanceTypeFilter">Filter by Type:</label>
            <select
              id={styles.clearanceTypeFilter}
              value={filters.type}
              onChange={(e) => handleFilterChange("type", e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Resignation">Resignation</option>
              <option value="Retirement">Retirement</option>
              <option value="Equipment Completion">Equipment Completion</option>
              <option value="Transfer">Transfer</option>
              <option value="Promotion">Promotion</option>
            </select>
          </div>
        </div>
        
        {/* Statistics Cards */}
        <div className={styles.clearanceStatsContainer}>
          <div className={styles.clearanceStatCard}>
            <div className={styles.clearanceStatNumber}>
              {clearanceRequests.length}
            </div>
            <div className={styles.clearanceStatLabel}>Total Requests</div>
          </div>
          <div className={styles.clearanceStatCard}>
            <div className={styles.clearanceStatNumber}>
              {clearanceRequests.filter(r => r.status === 'Pending').length}
            </div>
            <div className={styles.clearanceStatLabel}>Pending</div>
          </div>
          <div className={styles.clearanceStatCard}>
            <div className={styles.clearanceStatNumber}>
              {clearanceRequests.filter(r => r.status === 'Completed').length}
            </div>
            <div className={styles.clearanceStatLabel}>Approved</div>
          </div>
          <div className={styles.clearanceStatCard}>
            <div className={styles.clearanceStatNumber}>
              {clearanceRequests.filter(r => r.status === 'Rejected').length}
            </div>
            <div className={styles.clearanceStatLabel}>Rejected</div>
          </div>
        </div>
        
        {/* Pagination Top */}
        {!loading && clearanceRequests.length > 0 && (
          <div className={`${styles.clearancePaginationContainer} ${styles.clearanceTopPagination}`}>
            {renderPaginationButtons()}
          </div>
        )}
        
        {/* Table */}
        <div id={styles.clearanceTableContainer}>
          <table className={styles.clearanceTable}>
            <thead>
              <tr>
                <th>Request Date</th>
                <th>Clearance Type</th>
                <th>Status</th>
                <th>Approved Date</th>
                <th>Approved By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px" }}>
                    <div className={styles.clearanceLoading}>
                      Loading your clearance records...
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((req) => (
                  <tr key={req.id}>
                    <td>{req.date}</td>
                    <td>
                      <span className={styles.clearanceTypeBadge}>
                        {req.type}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.clearanceStatus} ${getStatusBadgeClass(req.status)}`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td>{req.approved_date || "Not yet approved"}</td>
                    <td>{req.approved_by}</td>
                    <td className={styles.clearanceActions}>
                      <button
                        className={styles.clearanceView}
                        onClick={() => showDetails(req)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px" }}>
                    <div className={styles.clearanceEmptyState}>
                      <div className={styles.clearanceEmptyIcon}>📜</div>
                      <h3>No clearance records found</h3>
                      <p>
                        {clearanceRequests.length === 0 
                          ? "You haven't submitted any clearance requests yet." 
                          : "No records match your current filters."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bottom */}
        {!loading && clearanceRequests.length > 0 && (
          <div className={styles.clearancePaginationContainer}>
            {renderPaginationButtons()}
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className={`${styles.clearanceModal} ${styles.clearanceActiveDetails}`}>
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
                {/* Clearance Details Section */}
                <div className={styles.clearanceModalSectionDetails}>
                  <h3 className={styles.clearanceModalSectionTitleDetails}>
                    Clearance Information
                  </h3>
                  <div className={styles.clearanceModalDetailsGridDetails}>
                    <div className={styles.clearanceModalDetailItemDetails}>
                      <span className={styles.clearanceModalLabelDetails}>
                        Type:
                      </span>
                      <span className={styles.clearanceModalValueDetailsType}>
                        {selectedRequest.type}
                      </span>
                    </div>
                    <div className={styles.clearanceModalDetailItemDetails}>
                      <span className={styles.clearanceModalLabelDetails}>
                        Request Date:
                      </span>
                      <span className={styles.clearanceModalValueDetailsDate}>
                        {selectedRequest.date}
                      </span>
                    </div>
                    {selectedRequest.approved_date && (
                      <div className={styles.clearanceModalDetailItemDetails}>
                        <span className={styles.clearanceModalLabelDetails}>
                          Approved Date:
                        </span>
                        <span className={styles.clearanceModalValueDetails}>
                          {selectedRequest.approved_date}
                        </span>
                      </div>
                    )}
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
                        Status:
                      </span>
                      <span
                        className={`${styles.clearanceModalValueDetailsStatus} ${styles.clearanceModalStatusDetails} ${getStatusBadgeClass(selectedRequest.status)}`}
                      >
                        {selectedRequest.status}
                      </span>
                    </div>
                    {selectedRequest.approved_by && (
                      <div className={styles.clearanceModalDetailItemDetails}>
                        <span className={styles.clearanceModalLabelDetails}>
                          Approved By:
                        </span>
                        <span className={styles.clearanceModalValueDetails}>
                          {selectedRequest.approved_by}
                          {selectedRequest.approver_username && ` (${selectedRequest.approver_username})`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remarks Section */}
                {selectedRequest.remarks && (
                  <div className={styles.clearanceModalSectionDetails}>
                    <h3 className={styles.clearanceModalSectionTitleDetails}>
                      Remarks
                    </h3>
                    <div className={styles.clearanceModalRemarksBox}>
                      {selectedRequest.remarks}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyClearanceRecordPersonnel;