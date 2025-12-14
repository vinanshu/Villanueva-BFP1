import React, { useState, useEffect } from "react";

const MyLeaveRecords = () => {
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Sample data - replace with API call
  const sampleData = [
    {
      id: 1,
      leaveId: "LV-2024-001",
      type: "Vacation Leave",
      status: "approved",
      startDate: "2024-01-10",
      endDate: "2024-01-15",
      days: 5,
      dateSubmitted: "2024-01-05",
      dateProcessed: "2024-01-08",
      approvingOfficer: "Capt. Juan Dela Cruz",
      remarks: "Annual vacation leave approved"
    },
    {
      id: 2,
      leaveId: "LV-2024-002",
      type: "Sick Leave",
      status: "pending",
      startDate: "2024-02-01",
      endDate: "2024-02-03",
      days: 3,
      dateSubmitted: "2024-01-30",
      dateProcessed: null,
      approvingOfficer: "",
      remarks: "Awaiting medical certificate"
    },
    {
      id: 3,
      leaveId: "LV-2023-012",
      type: "Emergency Leave",
      status: "rejected",
      startDate: "2023-12-20",
      endDate: "2023-12-22",
      days: 3,
      dateSubmitted: "2023-12-18",
      dateProcessed: "2023-12-19",
      approvingOfficer: "Ms. Maria Santos",
      remarks: "Emergency documentation required"
    },
    {
      id: 4,
      leaveId: "LV-2024-003",
      type: "Maternity Leave",
      status: "approved",
      startDate: "2024-03-01",
      endDate: "2024-05-01",
      days: 60,
      dateSubmitted: "2024-02-15",
      dateProcessed: "2024-02-20",
      approvingOfficer: "Mr. Robert Lim",
      remarks: "Maternity leave approved with proper documentation"
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setLeaveRecords(sampleData);
      setIsLoading(false);
    }, 1000);
  }, []);

  const filteredRecords = leaveRecords.filter(record => {
    const matchesFilter = filter === "all" || record.status === filter;
    const matchesSearch = 
      record.leaveId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'approved': return 'status-approved';
      case 'pending': return 'status-pending';
      case 'rejected': return 'status-rejected';
      default: return 'status-default';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
  };

  const handleCloseModal = () => {
    setSelectedRecord(null);
  };

  const handleRequestNewLeave = () => {
    // Redirect to leave request page
    window.location.href = "/employeeLeaveRequest";
  };

  return (
    <div className="leave-records-container">
      <div className="leave-header">
        <h1>My Leave Records</h1>
        <p>View your leave application history and status</p>
      </div>

      <div className="leave-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by Leave ID or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Filter by Status:</label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="status-filter"
            >
              <option value="all">All Records</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <button 
            className="btn-new-leave"
            onClick={handleRequestNewLeave}
          >
            + Request New Leave
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading leave records...</p>
        </div>
      ) : (
        <>
          <div className="leave-summary-cards">
            <div className="summary-card">
              <h3>Total Leaves</h3>
              <p className="count">{leaveRecords.length}</p>
            </div>
            <div className="summary-card pending">
              <h3>Pending</h3>
              <p className="count">
                {leaveRecords.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <div className="summary-card approved">
              <h3>Approved</h3>
              <p className="count">
                {leaveRecords.filter(r => r.status === 'approved').length}
              </p>
            </div>
            <div className="summary-card rejected">
              <h3>Rejected</h3>
              <p className="count">
                {leaveRecords.filter(r => r.status === 'rejected').length}
              </p>
            </div>
          </div>

          <div className="leave-table-container">
            <table className="leave-table">
              <thead>
                <tr>
                  <th>Leave ID</th>
                  <th>Type</th>
                  <th>Date Range</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map(record => (
                    <tr key={record.id}>
                      <td className="record-id">{record.leaveId}</td>
                      <td>{record.type}</td>
                      <td>
                        {new Date(record.startDate).toLocaleDateString()} - 
                        {new Date(record.endDate).toLocaleDateString()}
                      </td>
                      <td>{record.days} days</td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(record.status)}`}>
                          {getStatusText(record.status)}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-view-details"
                          onClick={() => handleViewDetails(record)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="no-records">
                      No leave records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Leave Details</h2>
              <button className="close-modal" onClick={handleCloseModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h3>Basic Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <strong>Leave ID:</strong>
                    <span>{selectedRecord.leaveId}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Type:</strong>
                    <span>{selectedRecord.type}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Status:</strong>
                    <span className={`status-badge ${getStatusBadgeClass(selectedRecord.status)}`}>
                      {getStatusText(selectedRecord.status)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <strong>Date Submitted:</strong>
                    <span>{new Date(selectedRecord.dateSubmitted).toLocaleDateString()}</span>
                  </div>
                  {selectedRecord.dateProcessed && (
                    <div className="detail-item">
                      <strong>Date Processed:</strong>
                      <span>{new Date(selectedRecord.dateProcessed).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <h3>Leave Details</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <strong>Start Date:</strong>
                    <span>{new Date(selectedRecord.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <strong>End Date:</strong>
                    <span>{new Date(selectedRecord.endDate).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Duration:</strong>
                    <span>{selectedRecord.days} days</span>
                  </div>
                  {selectedRecord.approvingOfficer && (
                    <div className="detail-item">
                      <strong>Approving Officer:</strong>
                      <span>{selectedRecord.approvingOfficer}</span>
                    </div>
                  )}
                  <div className="detail-item full-width">
                    <strong>Remarks:</strong>
                    <p>{selectedRecord.remarks}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCloseModal}>
                Close
              </button>
              {selectedRecord.status === 'pending' && (
                <button className="btn-primary">
                  Check Status Update
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyLeaveRecords;