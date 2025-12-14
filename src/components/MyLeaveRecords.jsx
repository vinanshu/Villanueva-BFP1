// pages/MyLeaveRecords.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EmployeeSidebar from "../components/EmployeeSidebar";
import "./MyLeaveRecords.css";

const MyLeaveRecords = () => {
  const navigate = useNavigate();
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - replace with actual API call
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockRecords = [
        {
          id: 1,
          leaveType: "Annual Leave",
          startDate: "2024-03-01",
          endDate: "2024-03-05",
          duration: 5,
          status: "Approved",
          appliedDate: "2024-02-15",
          approvedDate: "2024-02-20",
          approver: "John Smith",
          reason: "Family vacation",
          remarks: "Enjoy your time off!"
        },
        {
          id: 2,
          leaveType: "Sick Leave",
          startDate: "2024-03-10",
          endDate: "2024-03-11",
          duration: 2,
          status: "Approved",
          appliedDate: "2024-03-09",
          approvedDate: "2024-03-09",
          approver: "John Smith",
          reason: "Flu",
          remarks: "Get well soon"
        },
        {
          id: 3,
          leaveType: "Emergency Leave",
          startDate: "2024-03-15",
          endDate: "2024-03-16",
          duration: 2,
          status: "Pending",
          appliedDate: "2024-03-14",
          approvedDate: null,
          approver: null,
          reason: "Family emergency",
          remarks: ""
        },
        {
          id: 4,
          leaveType: "Maternity Leave",
          startDate: "2024-04-01",
          endDate: "2024-06-30",
          duration: 90,
          status: "Approved",
          appliedDate: "2024-02-01",
          approvedDate: "2024-02-05",
          approver: "Jane Doe",
          reason: "Maternity",
          remarks: "Congratulations!"
        },
        {
          id: 5,
          leaveType: "Annual Leave",
          startDate: "2024-01-10",
          endDate: "2024-01-12",
          duration: 3,
          status: "Rejected",
          appliedDate: "2024-01-05",
          approvedDate: "2024-01-07",
          approver: "John Smith",
          reason: "Personal",
          remarks: "Not approved due to critical project deadline"
        },
        {
          id: 6,
          leaveType: "Study Leave",
          startDate: "2024-05-01",
          endDate: "2024-05-07",
          duration: 7,
          status: "Cancelled",
          appliedDate: "2024-04-20",
          approvedDate: null,
          approver: null,
          reason: "Exam preparation",
          remarks: "Cancelled by employee"
        }
      ];
      setLeaveRecords(mockRecords);
      setLoading(false);
    }, 1000);
  }, []);

  // Filter records based on selected filters
  const filteredRecords = leaveRecords.filter(record => {
    // Filter by status
    if (filterStatus !== "all" && record.status !== filterStatus) {
      return false;
    }
    
    // Filter by type
    if (filterType !== "all" && record.leaveType !== filterType) {
      return false;
    }
    
    // Filter by year
    const recordYear = new Date(record.startDate).getFullYear();
    if (filterYear !== "all" && recordYear !== filterYear) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        record.leaveType.toLowerCase().includes(searchLower) ||
        record.reason.toLowerCase().includes(searchLower) ||
        record.status.toLowerCase().includes(searchLower) ||
        (record.approver && record.approver.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  // Get status badge class
  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "status-approved";
      case "pending":
        return "status-pending";
      case "rejected":
        return "status-rejected";
      case "cancelled":
        return "status-cancelled";
      default:
        return "status-default";
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  // Calculate leave statistics
  const calculateStats = () => {
    const stats = {
      total: leaveRecords.length,
      approved: leaveRecords.filter(r => r.status === "Approved").length,
      pending: leaveRecords.filter(r => r.status === "Pending").length,
      rejected: leaveRecords.filter(r => r.status === "Rejected").length,
      totalDays: leaveRecords
        .filter(r => r.status === "Approved")
        .reduce((sum, record) => sum + record.duration, 0)
    };
    return stats;
  };

  const stats = calculateStats();

  // Get unique years for filter
  const getUniqueYears = () => {
    const years = leaveRecords.map(record => 
      new Date(record.startDate).getFullYear()
    );
    return ["all", ...new Set(years)].sort((a, b) => b - a);
  };

  // Get unique leave types for filter
  const getUniqueLeaveTypes = () => {
    const types = leaveRecords.map(record => record.leaveType);
    return ["all", ...new Set(types)];
  };

  // Handle view details
  const handleViewDetails = (record) => {
    // You can navigate to a detailed view or show a modal
    alert(`Leave Details:\n\nType: ${record.leaveType}\nPeriod: ${formatDate(record.startDate)} - ${formatDate(record.endDate)}\nStatus: ${record.status}\nReason: ${record.reason}`);
  };

  // Handle download/print
  const handleDownload = () => {
    alert("Download functionality would be implemented here");
    // In a real app, this would generate a PDF or CSV
  };

  return (
    <div className="employee-layout">
      <EmployeeSidebar />
      
      <div className="my-leave-records-container">
        <div className="page-header">
          <h1>My Leave Records</h1>
          <p>View and manage your leave application history</p>
        </div>

        {/* Stats Cards */}
        <div className="stats-container">
          <div className="stat-card total">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <h3>{stats.total}</h3>
              <p>Total Applications</p>
            </div>
          </div>
          <div className="stat-card approved">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <h3>{stats.approved}</h3>
              <p>Approved</p>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <h3>{stats.pending}</h3>
              <p>Pending</p>
            </div>
          </div>
          <div className="stat-card days">
            <div className="stat-icon">📅</div>
            <div className="stat-info">
              <h3>{stats.totalDays}</h3>
              <p>Total Days Taken</p>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="filters-section">
          <div className="filter-group">
            <label htmlFor="statusFilter">Status</label>
            <select 
              id="statusFilter" 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="yearFilter">Year</label>
            <select 
              id="yearFilter" 
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value === "all" ? "all" : parseInt(e.target.value))}
            >
              {getUniqueYears().map(year => (
                <option key={year} value={year}>
                  {year === "all" ? "All Years" : year}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="typeFilter">Leave Type</label>
            <select 
              id="typeFilter" 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              {getUniqueLeaveTypes().map(type => (
                <option key={type} value={type}>
                  {type === "all" ? "All Types" : type}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group search-group">
            <label htmlFor="search">Search</label>
            <input
              id="search"
              type="text"
              placeholder="Search by type, reason, or approver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            className="download-btn"
            onClick={handleDownload}
          >
            📥 Download Report
          </button>
        </div>

        {/* Leave Records Table */}
        <div className="records-table-container">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading your leave records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="no-records">
              <p>No leave records found matching your criteria.</p>
            </div>
          ) : (
            <table className="leave-records-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Applied Date</th>
                  <th>Approver</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(record => (
                  <tr key={record.id}>
                    <td>{record.leaveType}</td>
                    <td>{formatDate(record.startDate)}</td>
                    <td>{formatDate(record.endDate)}</td>
                    <td>{record.duration} day(s)</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td>{formatDate(record.appliedDate)}</td>
                    <td>{record.approver || "N/A"}</td>
                    <td>
                      <button 
                        className="view-details-btn"
                        onClick={() => handleViewDetails(record)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Summary Section */}
        <div className="summary-section">
          <h3>Leave Summary</h3>
          <div className="summary-content">
            <p>
              You have taken <strong>{stats.totalDays} days</strong> of approved leave 
              from <strong>{stats.approved} approved applications</strong>.
            </p>
            <p>
              You currently have <strong>{stats.pending} pending</strong> applications 
              and <strong>{stats.rejected} rejected</strong> applications.
            </p>
            <button 
              className="new-leave-btn"
              onClick={() => navigate("/employeeLeaveRequest")}
            >
              + Apply for New Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyLeaveRecords;