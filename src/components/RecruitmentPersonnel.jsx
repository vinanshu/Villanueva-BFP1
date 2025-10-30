// RecruitmentPersonnel.jsx
import React, { useState, useEffect } from "react";
import styles from "./RecruitmentPersonnel.module.css";
import Sidebar from "./Sidebar.jsx";
import Hamburger from "./Hamburger.jsx";
import { useSidebar } from "./SidebarContext.jsx";
import { Title, Meta } from "react-head";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";

const RecruitmentPersonnel = () => {
  const [formData, setFormData] = useState({
    candidate: "",
    position: "",
    applicationDate: "",
    stage: "",
    interviewDate: "",
    status: "",
  });

  const [records, setRecords] = useState([]);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { isSidebarCollapsed } = useSidebar();

  // State variables for table functionality
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentFilterCard, setCurrentFilterCard] = useState("total");

  // Load initial data
  useEffect(() => {
    const mockData = [
      {
        id: 1,
        candidate: "John Doe",
        position: "Firefighter",
        applicationDate: "2024-01-15",
        stage: "Applied",
        interviewDate: "2024-01-25",
        status: "Pending",
      },
      {
        id: 2,
        candidate: "Jane Smith",
        position: "Fire Inspector",
        applicationDate: "2024-01-10",
        stage: "Interview",
        interviewDate: "2024-01-20",
        status: "Approved",
      },
      {
        id: 3,
        candidate: "Mike Johnson",
        position: "Firefighter",
        applicationDate: "2024-01-18",
        stage: "Screening",
        interviewDate: "2024-01-28",
        status: "Pending",
      },
      {
        id: 4,
        candidate: "Sarah Wilson",
        position: "Fire Inspector",
        applicationDate: "2024-01-12",
        stage: "Final Review",
        interviewDate: "2024-01-22",
        status: "Approved",
      },
      {
        id: 5,
        candidate: "David Brown",
        position: "Firefighter",
        applicationDate: "2024-01-20",
        stage: "Applied",
        interviewDate: "2024-01-30",
        status: "Rejected",
      },
      {
        id: 6,
        candidate: "Lisa Taylor",
        position: "Fire Inspector",
        applicationDate: "2024-01-08",
        stage: "Interview",
        interviewDate: "2024-01-18",
        status: "Pending",
      },
    ];
    setRecords(mockData);
  }, []);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (editId !== null) {
      setRecords((prev) =>
        prev.map((record) =>
          record.id === editId ? { ...formData, id: editId } : record
        )
      );
      setEditId(null);
    } else {
      const newRecord = {
        ...formData,
        id: Date.now(),
      };
      setRecords((prev) => [...prev, newRecord]);
    }

    setFormData({
      candidate: "",
      position: "",
      applicationDate: "",
      stage: "",
      interviewDate: "",
      status: "",
    });

    setShowForm(false);
    setCurrentPage(1);
  };

  const handleEdit = (id) => {
    const record = records.find((item) => item.id === id);
    if (record) {
      setFormData({
        candidate: record.candidate,
        position: record.position,
        applicationDate: record.applicationDate,
        stage: record.stage,
        interviewDate: record.interviewDate,
        status: record.status,
      });
      setEditId(id);
      setShowEditModal(true);
    }
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (editId !== null) {
      setRecords((prev) =>
        prev.map((record) =>
          record.id === editId ? { ...formData, id: editId } : record
        )
      );
      setShowEditModal(false);
      setEditId(null);
      setFormData({
        candidate: "",
        position: "",
        applicationDate: "",
        stage: "",
        interviewDate: "",
        status: "",
      });
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (deleteId !== null) {
      setRecords((prev) => prev.filter((record) => record.id !== deleteId));
      setShowDeleteModal(false);
      setDeleteId(null);
      setCurrentPage(1);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteId(null);
  };

  const getOptionColor = (selectId, value) => {
    const options = {
      stage: {
        Applied: "#facc15",
        Screening: "#3b82f6",
        Interview: "#06b6d4",
        "Final Review": "#10b981",
      },
      status: {
        Pending: "#facc15",
        Approved: "#10b981",
        Rejected: "#dc2626",
      },
    };
    return options[selectId]?.[value] || null;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "-";
    }
  };

  // Filtering & pagination logic
  function applyFilters(items) {
    let filtered = [...items];

    // Card filter
    if (currentFilterCard === "applied") {
      filtered = filtered.filter((i) => i.stage.toLowerCase() === "applied");
    } else if (currentFilterCard === "screening") {
      filtered = filtered.filter((i) => i.stage.toLowerCase() === "screening");
    } else if (currentFilterCard === "interview") {
      filtered = filtered.filter((i) => i.stage.toLowerCase() === "interview");
    } else if (currentFilterCard === "final") {
      filtered = filtered.filter(
        (i) => i.stage.toLowerCase() === "final review"
      );
    }

    // Text filters
    const s = search.trim().toLowerCase();
    const stageFilter = filterStage.trim().toLowerCase();
    const statusFilter = filterStatus.trim().toLowerCase();

    filtered = filtered.filter((i) => {
      const text =
        `${i.candidate} ${i.position} ${i.applicationDate} ${i.stage} ${i.interviewDate} ${i.status}`.toLowerCase();
      const stageMatch =
        !stageFilter || (i.stage || "").toLowerCase().includes(stageFilter);
      const statusMatch =
        !statusFilter || (i.status || "").toLowerCase().includes(statusFilter);
      const searchMatch = !s || text.includes(s);
      return stageMatch && statusMatch && searchMatch;
    });

    return filtered;
  }

  const filteredRecruitmentData = applyFilters(records);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecruitmentData.length / rowsPerPage)
  );
  const pageStart = (currentPage - 1) * rowsPerPage;
  const paginated = filteredRecruitmentData.slice(
    pageStart,
    pageStart + rowsPerPage
  );

  // Pagination function (replicated from personnel register)
  const renderPaginationButtons = () => {
    const pageCount = Math.max(
      1,
      Math.ceil(filteredRecruitmentData.length / rowsPerPage)
    );
    const hasNoData = filteredRecruitmentData.length === 0;

    const buttons = [];

    // Previous button
    buttons.push(
      <button
        key="prev"
        className={`${styles.paginationBtn} ${
          hasNoData ? styles.disabled : ""
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
        className={`${styles.paginationBtn} ${
          1 === currentPage ? styles.active : ""
        } ${hasNoData ? styles.disabled : ""}`}
        onClick={() => setCurrentPage(1)}
        disabled={hasNoData}
      >
        1
      </button>
    );

    // Show ellipsis after first page if needed
    if (currentPage > 3) {
      buttons.push(
        <span key="ellipsis1" className={styles.paginationEllipsis}>
          ...
        </span>
      );
    }

    // Show pages around current page
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(pageCount - 1, currentPage + 1);

    if (currentPage <= 3) {
      endPage = Math.min(pageCount - 1, 4);
    }

    if (currentPage >= pageCount - 2) {
      startPage = Math.max(2, pageCount - 3);
    }

    // Generate middle page buttons
    for (let i = startPage; i <= endPage; i++) {
      if (i > 1 && i < pageCount) {
        buttons.push(
          <button
            key={i}
            className={`${styles.paginationBtn} ${
              i === currentPage ? styles.active : ""
            } ${hasNoData ? styles.disabled : ""}`}
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
        <span key="ellipsis2" className={styles.paginationEllipsis}>
          ...
        </span>
      );
    }

    // Always show last page if there is more than 1 page
    if (pageCount > 1) {
      buttons.push(
        <button
          key={pageCount}
          className={`${styles.paginationBtn} ${
            pageCount === currentPage ? styles.active : ""
          } ${hasNoData ? styles.disabled : ""}`}
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
        className={`${styles.paginationBtn} ${
          hasNoData ? styles.disabled : ""
        }`}
        disabled={currentPage === pageCount || hasNoData}
        onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
      >
        Next
      </button>
    );

    return (
      <div className={`${styles.paginationContainer} ${styles.topPagination}`}>
        {buttons}
      </div>
    );
  };

  // Summary numbers for cards
  const totalItems = records.length;
  const appliedItems = records.filter(
    (i) => i.stage.toLowerCase() === "applied"
  ).length;
  const screeningItems = records.filter(
    (i) => i.stage.toLowerCase() === "screening"
  ).length;
  const interviewItems = records.filter(
    (i) => i.stage.toLowerCase() === "interview"
  ).length;
  const finalReviewItems = records.filter(
    (i) => i.stage.toLowerCase() === "final review"
  ).length;

  function handleCardClick(filter) {
    if (currentFilterCard === filter) {
      setCurrentFilterCard("total");
    } else {
      setCurrentFilterCard(filter);
    }
    setCurrentPage(1);
  }

  return (
    <div className={styles.container}>
      <Title>Recruitment Personnel | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />

      <Hamburger />
      <Sidebar />
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <h1>Recruitment Personnel</h1>

        {/* Top Controls */}
        <div className={styles.topControls}>
          <div className={styles.tableHeader}>
            <select
              className={styles.filterType}
              value={filterStage}
              onChange={(e) => {
                setFilterStage(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Stages</option>
              <option>Applied</option>
              <option>Screening</option>
              <option>Interview</option>
              <option>Final Review</option>
            </select>

            <select
              className={styles.filterType}
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Status</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>

            <input
              type="text"
              className={styles.searchBar}
              placeholder="🔍 Search candidates..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className={styles.summary}>
          <button
            className={`${styles.summaryCard} ${styles.total} ${
              currentFilterCard === "total" ? styles.active : ""
            }`}
            onClick={() => handleCardClick("total")}
          >
            <h3>Total Candidates</h3>
            <p>{totalItems}</p>
          </button>
          <button
            className={`${styles.summaryCard} ${styles.applied} ${
              currentFilterCard === "applied" ? styles.active : ""
            }`}
            onClick={() => handleCardClick("applied")}
          >
            <h3>Applied</h3>
            <p>{appliedItems}</p>
          </button>
          <button
            className={`${styles.summaryCard} ${styles.screening} ${
              currentFilterCard === "screening" ? styles.active : ""
            }`}
            onClick={() => handleCardClick("screening")}
          >
            <h3>Screening</h3>
            <p>{screeningItems}</p>
          </button>
          <button
            className={`${styles.summaryCard} ${styles.interview} ${
              currentFilterCard === "interview" ? styles.active : ""
            }`}
            onClick={() => handleCardClick("interview")}
          >
            <h3>Interview</h3>
            <p>{interviewItems}</p>
          </button>
          <button
            className={`${styles.summaryCard} ${styles.final} ${
              currentFilterCard === "final" ? styles.active : ""
            }`}
            onClick={() => handleCardClick("final")}
          >
            <h3>Final Review</h3>
            <p>{finalReviewItems}</p>
          </button>
        </div>

        {/* Form Card - Replicated from Personnel Register */}
        <div className={styles.card}>
          <h2>Register New Candidate</h2>
          <button
            className={`${styles.showFormBtn} ${styles.submit}${
              showForm ? styles.showing : ""
            }`}
            onClick={() => setShowForm(!showForm)}
            type="button"
          >
            {showForm ? "Hide Form" : "Add New Candidate"}
          </button>

          <form
            className={`${styles.form} ${styles.layout} ${
              showForm ? styles.show : ""
            }`}
            onSubmit={handleSubmit}
          >
            {/* Left: Empty Photo Section (for layout consistency) */}
            <div className={styles.photoSection}>
              <div className={styles.photoPreview}>
                <span>No Photo</span>
              </div>
              <div className={styles.fileUpload}>
                <label htmlFor="photo" className={styles.fileUploadLabel}>
                  📂 Upload Photo
                </label>
                <input
                  type="file"
                  id="photo"
                  accept="image/*"
                  style={{ display: "none" }}
                />
                <span>No Photo selected</span>
              </div>
            </div>

            {/* Right: Info fields */}
            <div className={styles.infoSection}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <div className={styles.floatingGroup}>
                    <input
                      type="text"
                      id="candidate"
                      className={styles.floatingInput}
                      placeholder=" "
                      value={formData.candidate}
                      onChange={handleInputChange}
                      required
                    />
                    <label htmlFor="candidate" className={styles.floatingLabel}>
                      Candidate Name
                    </label>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <div className={styles.floatingGroup}>
                    <input
                      type="text"
                      id="position"
                      className={styles.floatingInput}
                      placeholder=" "
                      value={formData.position}
                      onChange={handleInputChange}
                      required
                    />
                    <label htmlFor="position" className={styles.floatingLabel}>
                      Position
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <div className={styles.floatingGroup}>
                    <Flatpickr
                      value={formData.applicationDate}
                      onChange={([date]) =>
                        setFormData((prev) => ({
                          ...prev,
                          applicationDate: date,
                        }))
                      }
                      options={{
                        dateFormat: "Y-m-d",
                        maxDate: "today",
                      }}
                      className={styles.floatingInput}
                      placeholder=" "
                    />
                    <label
                      htmlFor="applicationDate"
                      className={styles.floatingLabel}
                    >
                      Application Date
                    </label>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <div className={styles.floatingGroup}>
                    <select
                      id="stage"
                      className={styles.floatingSelect}
                      value={formData.stage}
                      onChange={handleInputChange}
                      required
                      style={{
                        backgroundColor:
                          getOptionColor("stage", formData.stage) || "#fff",
                        color: getOptionColor("stage", formData.stage)
                          ? "#fff"
                          : "#000",
                      }}
                    >
                      <option value="" disabled>
                       
                      </option>
                      <option value="Applied">Applied</option>
                      <option value="Screening">Screening</option>
                      <option value="Interview">Interview</option>
                      <option value="Final Review">Final Review</option>
                    </select>
                    <label htmlFor="stage" className={styles.floatingLabel}>
                     Select Stage
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <div className={styles.floatingGroup}>
                    <Flatpickr
                      value={formData.interviewDate}
                      onChange={([date]) =>
                        setFormData((prev) => ({
                          ...prev,
                          interviewDate: date,
                        }))
                      }
                      options={{
                        dateFormat: "Y-m-d",
                      }}
                      className={styles.floatingInput}
                      placeholder=" "
                    />
                    <label
                      htmlFor="interviewDate"
                      className={styles.floatingLabel}
                    >
                      Interview Date
                    </label>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <div className={styles.floatingGroup}>
                    <select
                      id="status"
                      className={styles.floatingSelect}
                      value={formData.status}
                      onChange={handleInputChange}
                      required
                      style={{
                        backgroundColor:
                          getOptionColor("status", formData.status) || "#fff",
                        color: getOptionColor("status", formData.status)
                          ? "#fff"
                          : "#000",
                      }}
                    >
                      <option value="" disabled>
                  
                      </option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                    <label htmlFor="status" className={styles.floatingLabel}>
                       Select Status
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancel}
                  onClick={() => {
                    setFormData({
                      candidate: "",
                      position: "",
                      applicationDate: "",
                      stage: "",
                      interviewDate: "",
                      status: "",
                    });
                    setShowForm(false);
                  }}
                >
                  Clear Information
                </button>
                <button type="submit" className={styles.submit}>
                  {editId !== null ? "Update Candidate" : "Register Candidate"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Table Section - Replicated from Personnel Register */}
        <div className={styles.tableHeaderSection}>
          <h2>All Recruitment Records</h2>
          {renderPaginationButtons()}
        </div>

        <div className={styles.tableBorder}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Position</th>
                <th>Application Date</th>
                <th>Stage</th>
                <th>Interview Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      📇
                    </div>
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#2b2b2b",
                        marginBottom: "8px",
                      }}
                    >
                      No Recruitment Records
                    </h3>
                    <p style={{ fontSize: "14px", color: "#999" }}>
                      Recruitment records are empty - add your first candidate
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((record) => (
                  <tr key={record.id}>
                    <td>{record.candidate}</td>
                    <td>{record.position}</td>
                    <td>{formatDate(record.applicationDate)}</td>
                    <td>
                      <span
                        className={styles.status}
                        style={{
                          backgroundColor: getOptionColor(
                            "stage",
                            record.stage
                          ),
                          color: "#fff",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        {record.stage}
                      </span>
                    </td>
                    <td>{formatDate(record.interviewDate)}</td>
                    <td>
                      <span
                        className={styles.status}
                        style={{
                          backgroundColor: getOptionColor(
                            "status",
                            record.status
                          ),
                          color: "#fff",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.editBtn}
                        onClick={() => handleEdit(record.id)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(record.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className={`${styles.modal} ${styles.show}`}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>Confirm Deletion</h2>
                <button onClick={cancelDelete} className={styles.closeBtn}>
                  &times;
                </button>
              </div>
              <div className={styles.modalBody}>
                <p>Are you sure you want to delete this candidate record?</p>
                <div className={styles.modalActions}>
                  <button onClick={cancelDelete} className={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className={styles.deleteConfirmBtn}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <div className={`${styles.modal} ${styles.show}`}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>Edit Candidate</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className={styles.closeBtn}
                >
                  &times;
                </button>
              </div>
              <form className={styles.editForm} onSubmit={handleUpdate}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="editCandidate">Candidate Name</label>
                    <input
                      type="text"
                      id="editCandidate"
                      value={formData.candidate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          candidate: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="editPosition">Position</label>
                    <input
                      type="text"
                      id="editPosition"
                      value={formData.position}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          position: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="editApplicationDate">
                      Application Date
                    </label>
                    <Flatpickr
                      value={formData.applicationDate}
                      onChange={([date]) =>
                        setFormData((prev) => ({
                          ...prev,
                          applicationDate: date,
                        }))
                      }
                      options={{
                        dateFormat: "Y-m-d",
                        maxDate: "today",
                      }}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="editStage">Stage</label>
                    <select
                      id="editStage"
                      value={formData.stage}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          stage: e.target.value,
                        }))
                      }
                      required
                      style={{
                        backgroundColor:
                          getOptionColor("stage", formData.stage) || "#fff",
                        color: getOptionColor("stage", formData.stage)
                          ? "#fff"
                          : "#000",
                      }}
                    >
                      <option value="" disabled>
                        Select Stage
                      </option>
                      <option value="Applied">Applied</option>
                      <option value="Screening">Screening</option>
                      <option value="Interview">Interview</option>
                      <option value="Final Review">Final Review</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="editInterviewDate">Interview Date</label>
                    <Flatpickr
                      value={formData.interviewDate}
                      onChange={([date]) =>
                        setFormData((prev) => ({
                          ...prev,
                          interviewDate: date,
                        }))
                      }
                      options={{
                        dateFormat: "Y-m-d",
                      }}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="editStatus">Status</label>
                    <select
                      id="editStatus"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                      required
                      style={{
                        backgroundColor:
                          getOptionColor("status", formData.status) || "#fff",
                        color: getOptionColor("status", formData.status)
                          ? "#fff"
                          : "#000",
                      }}
                    >
                      <option value="" disabled>
                        Select Status
                      </option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={styles.cancel}
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.submit}>
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruitmentPersonnel;
