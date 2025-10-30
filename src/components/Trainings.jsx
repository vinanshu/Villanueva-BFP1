import React, { useState, useEffect } from "react";
import {
  getAllPersonnel,
  getTrainings,
  addTraining,
  updateTraining,
  deleteTraining,
  getTrainingsWithPersonnel,
} from "./db";
import styles from "./Trainings.module.css";
import Sidebar from "./Sidebar.jsx";
import Hamburger from "./Hamburger.jsx";
import { useSidebar } from "./SidebarContext.jsx";
import { Title, Meta } from "react-head";

const Trainings = () => {
  const [trainings, setTrainings] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isSidebarCollapsed } = useSidebar();

  // State variables for table functionality
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentFilterCard, setCurrentFilterCard] = useState("total");
  const [isFormOpen, setIsFormOpen] = useState(false); // For sidebar (Add Training)
  const [isModalOpen, setIsModalOpen] = useState(false); // For modal (Edit Training)
  const [editingTraining, setEditingTraining] = useState(null);
  const [formData, setFormData] = useState({
    personnelId: "",
    fullName: "",
    rank: "",
    dateOfTraining: "",
    days: "",
    status: "Pending",
  });

  useEffect(() => {
    loadPersonnel();
    loadTrainings();
  }, []);

  const loadPersonnel = async () => {
    try {
      const personnelData = await getAllPersonnel();
      setPersonnel(personnelData);
    } catch (error) {
      console.error("Error loading personnel:", error);
    }
  };

  const loadTrainings = async () => {
    try {
      setLoading(true);
      const trainingsData = await getTrainingsWithPersonnel();

      console.log("Loaded trainings:", trainingsData);

      // Transform training data for the table
      const transformedTrainings = trainingsData.map((training) => ({
        id: training.id,
        name: training.fullName,
        rank: training.rank,
        date: training.date,
        days: training.days,
        status: training.status || "Pending",
        personnelId: training.personnelId,
      }));

      setTrainings(transformedTrainings);
      setLoading(false);
    } catch (error) {
      console.error("Error loading trainings:", error);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;

    if (id === "personnelId") {
      const selectedPerson = personnel.find((p) => p.id == value);

      if (selectedPerson) {
        const fullName = `${selectedPerson.first_name} ${selectedPerson.middle_name} ${selectedPerson.last_name}`;

        setFormData((prev) => ({
          ...prev,
          personnelId: value,
          fullName: fullName,
          rank: selectedPerson.rank,
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [id]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newTraining = {
      personnelId: formData.personnelId,
      fullName: formData.fullName,
      rank: formData.rank,
      date: formData.dateOfTraining,
      days: formData.days,
      status: formData.status,
    };

    try {
      if (editingTraining !== null) {
        await updateTraining(editingTraining.id, newTraining);
      } else {
        await addTraining(newTraining);
      }

      await loadTrainings();
      closeAllForms();
    } catch (error) {
      console.error("Error saving training:", error);
    }
  };

  const addNewTraining = () => {
    setFormData({
      personnelId: "",
      fullName: "",
      rank: "",
      dateOfTraining: "",
      days: "",
      status: "Pending",
    });
    setEditingTraining(null);
    openSidebar();
  };

  const editTraining = (training) => {
    setFormData({
      personnelId: training.personnelId,
      fullName: training.name,
      rank: training.rank,
      dateOfTraining: training.date,
      days: training.days,
      status: training.status || "Pending",
    });
    setEditingTraining(training);
    openModal();
  };

  const deleteTrainingRecord = async (index) => {
    const training = trainings[index];
    if (window.confirm("Are you sure you want to delete this training?")) {
      await deleteTraining(training.id);
      await loadTrainings();
    }
  };

  const openSidebar = () => setIsFormOpen(true);
  const openModal = () => setIsModalOpen(true);

  const closeAllForms = () => {
    setIsFormOpen(false);
    setIsModalOpen(false);
    setEditingTraining(null);
    setFormData({
      personnelId: "",
      fullName: "",
      rank: "",
      dateOfTraining: "",
      days: "",
      status: "Pending",
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
    } else if (currentFilterCard === "ongoing") {
      filtered = filtered.filter((i) => i.status.toLowerCase() === "ongoing");
    } else if (currentFilterCard === "cancelled") {
      filtered = filtered.filter((i) => i.status.toLowerCase() === "cancelled");
    }

    // Text filters
    const s = search.trim().toLowerCase();
    const statusFilter = filterStatus.trim().toLowerCase();

    filtered = filtered.filter((i) => {
      const text =
        `${i.name} ${i.rank} ${i.date} ${i.days} ${i.status}`.toLowerCase();
      const statusMatch =
        !statusFilter || (i.status || "").toLowerCase().includes(statusFilter);
      const searchMatch = !s || text.includes(s);
      return statusMatch && searchMatch;
    });

    return filtered;
  }

  const filteredTrainingData = applyFilters(trainings);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTrainingData.length / rowsPerPage)
  );
  const pageStart = (currentPage - 1) * rowsPerPage;
  const paginated = filteredTrainingData.slice(
    pageStart,
    pageStart + rowsPerPage
  );

  // Fixed Pagination function
  const renderPaginationButtons = () => {
    const pageCount = Math.max(
      1,
      Math.ceil(filteredTrainingData.length / rowsPerPage)
    );
    const hasNoData = filteredTrainingData.length === 0;

    const buttons = [];

    // Previous button
    buttons.push(
      <button
        key="prev"
        className={`${styles.TSPaginationBtn} ${
          hasNoData ? styles.TSDisabled : ""
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
        className={`${styles.TSPaginationBtn} ${
          1 === currentPage ? styles.TSActive : ""
        } ${hasNoData ? styles.TSDisabled : ""}`}
        onClick={() => setCurrentPage(1)}
        disabled={hasNoData}
      >
        1
      </button>
    );

    // Show ellipsis after first page if needed
    if (currentPage > 3) {
      buttons.push(
        <span key="ellipsis1" className={styles.TSPaginationEllipsis}>
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
            className={`${styles.TSPaginationBtn} ${
              i === currentPage ? styles.TSActive : ""
            } ${hasNoData ? styles.TSDisabled : ""}`}
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
        <span key="ellipsis2" className={styles.TSPaginationEllipsis}>
          ...
        </span>
      );
    }

    // Always show last page if there is more than 1 page
    if (pageCount > 1) {
      buttons.push(
        <button
          key={pageCount}
          className={`${styles.TSPaginationBtn} ${
            pageCount === currentPage ? styles.TSActive : ""
          } ${hasNoData ? styles.TSDisabled : ""}`}
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
        className={`${styles.TSPaginationBtn} ${
          hasNoData ? styles.TSDisabled : ""
        }`}
        disabled={currentPage === pageCount || hasNoData}
        onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
      >
        Next
      </button>
    );

    return buttons;
  };

  // Summary numbers
  const totalItems = trainings.length;
  const pendingItems = trainings.filter(
    (i) => i.status.toLowerCase() === "pending"
  ).length;
  const completedItems = trainings.filter(
    (i) => i.status.toLowerCase() === "completed"
  ).length;
  const ongoingItems = trainings.filter(
    (i) => i.status.toLowerCase() === "ongoing"
  ).length;
  const cancelledItems = trainings.filter(
    (i) => i.status.toLowerCase() === "cancelled"
  ).length;

  function handleCardClick(filter) {
    if (currentFilterCard === filter) {
      setCurrentFilterCard("total");
    } else {
      setCurrentFilterCard(filter);
    }
    setCurrentPage(1);
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, currentFilterCard]);

  if (loading) {
    return (
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <p>Loading training records...</p>
      </div>
    );
  }

  return (
    <div className={styles.TSAppContainer}>
      <Title>Training Management | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />

      <Hamburger />
      <Sidebar />
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <h1 className={styles.TSTitle}>Training Management</h1>

        {/* Top Controls */}
        <div className={styles.TSTopControls}>
          <div className={styles.TSTableHeader}>
            <select
              className={styles.TSFilterType}
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Status</option>
              <option>Pending</option>
              <option>Completed</option>
              <option>Ongoing</option>
              <option>Cancelled</option>
            </select>

            <input
              type="text"
              className={styles.TSSearchBar}
              placeholder="🔍 Search training records..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className={styles.TSSummary}>
          <button
            className={`${styles.TSSummaryCard} ${styles.TSTotal} ${
              currentFilterCard === "total" ? styles.TSActive : ""
            }`}
            onClick={() => handleCardClick("total")}
          >
            <h3>Total Trainings</h3>
            <p>{totalItems}</p>
          </button>
          <button
            className={`${styles.TSSummaryCard} ${styles.TSPending} ${
              currentFilterCard === "pending" ? styles.TSActive : ""
            }`}
            onClick={() => handleCardClick("pending")}
          >
            <h3>Pending</h3>
            <p>{pendingItems}</p>
          </button>
          <button
            className={`${styles.TSSummaryCard} ${styles.TSCompleted} ${
              currentFilterCard === "completed" ? styles.TSActive : ""
            }`}
            onClick={() => handleCardClick("completed")}
          >
            <h3>Completed</h3>
            <p>{completedItems}</p>
          </button>
          <button
            className={`${styles.TSSummaryCard} ${styles.TSOngoing} ${
              currentFilterCard === "ongoing" ? styles.TSActive : ""
            }`}
            onClick={() => handleCardClick("ongoing")}
          >
            <h3>Ongoing</h3>
            <p>{ongoingItems}</p>
          </button>
          <button
            className={`${styles.TSSummaryCard} ${styles.TSCancelled} ${
              currentFilterCard === "cancelled" ? styles.TSActive : ""
            }`}
            onClick={() => handleCardClick("cancelled")}
          >
            <h3>Cancelled</h3>
            <p>{cancelledItems}</p>
          </button>
        </div>

        {/* Add Training Button */}
        <button className={styles.TSAddBtn} onClick={addNewTraining}>
          Add Training Personnel
        </button>

        {/* Table Container with Pagination */}
        <div className={styles.TSTableContainer}>
          {/* Pagination at the top */}
          <div className={styles.TSPaginationContainer}>
            {renderPaginationButtons()}
          </div>

          <table className={styles.TSTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Rank</th>
                <th>Training Date</th>
                <th>Days</th>
                <th>Status</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.TSNoRequestsTable}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      📚
                    </div>
                    <h3>No Training Records Found</h3>
                    <p>There are no training records added yet.</p>
                  </td>
                </tr>
              ) : (
                paginated.map((training, index) => (
                  <tr key={training.id} className={styles.TSTableRow}>
                    <td>{training.name}</td>
                    <td>{training.rank}</td>
                    <td>{training.date}</td>
                    <td>{training.days}</td>
                    <td>
                      <span
                        className={`${styles.TSStatus} ${
                          styles[training.status.toLowerCase()]
                        }`}
                      >
                        {training.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`${styles.TSActionBtn} ${styles.TSEditBtn}`}
                        onClick={() => editTraining(training)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className={`${styles.TSActionBtn} ${styles.TSDeleteBtn}`}
                        onClick={() => deleteTrainingRecord(pageStart + index)}
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

        {/* Sidebar Form for Add Training */}
        <div
          className={`${styles.TSFormCard} ${
            isFormOpen ? styles.TSActive : ""
          }`}
        >
          <div className={styles.TSFormHeader}>
            <h2>Add New Training</h2>
            <button
              type="button"
              className={styles.TSCloseBtn}
              onClick={closeAllForms}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Personnel Information Section */}
            <div className={styles.TSFormSection}>
              <h3>Personnel Information</h3>
              <div className={styles.TSFormRow}>
                <div className={styles.TSFormGroup}>
                  <label htmlFor="personnelId">Select Personnel *</label>
                  <select
                    id="personnelId"
                    value={formData.personnelId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">-- Choose Personnel --</option>
                    {personnel.map((person) => (
                      <option key={person.id} value={person.id}>
                        {`${person.first_name} ${person.middle_name} ${person.last_name}`}{" "}
                        - {person.rank}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.TSFormRow}>
                <div className={styles.TSFormGroup}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    readOnly
                    className={styles.TSReadOnlyInput}
                    placeholder="Auto-filled from selection"
                  />
                </div>
                <div className={styles.TSFormGroup}>
                  <label>Rank</label>
                  <input
                    type="text"
                    value={formData.rank}
                    readOnly
                    className={styles.TSReadOnlyInput}
                  />
                </div>
              </div>
            </div>

            {/* Training Details Section */}
            <div className={styles.TSFormSection}>
              <h3>Training Details</h3>
              <div className={styles.TSFormRow}>
                <div className={styles.TSFormGroup}>
                  <label htmlFor="dateOfTraining">Training Date *</label>
                  <input
                    type="date"
                    id="dateOfTraining"
                    value={formData.dateOfTraining}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className={styles.TSFormGroup}>
                  <label htmlFor="days">Duration (Days) *</label>
                  <input
                    type="number"
                    id="days"
                    min="1"
                    max="365"
                    value={formData.days}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., 5"
                  />
                </div>
              </div>

              <div className={styles.TSFormRow}>
                <div className={styles.TSFormGroup}>
                  <label htmlFor="status">Training Status *</label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Pending">Pending</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className={styles.TSFormActions}>
              <button type="submit" className={styles.TSSaveBtn}>
                Save Training
              </button>
              <button
                type="button"
                onClick={closeAllForms}
                className={styles.TSCancelBtn}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Edit Modal */}
        {isModalOpen && (
          <div className={styles.TSModalOverlay} onClick={closeAllForms}>
            <div
              className={styles.TSModalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.TSModalHeader}>
                <h2>Edit Training</h2>
                <button
                  type="button"
                  className={styles.TSCloseBtn}
                  onClick={closeAllForms}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Personnel Information Section */}
                <div className={styles.TSFormSection}>
                  <h3>Personnel Information</h3>
                  <div className={styles.TSFormRow}>
                    <div className={styles.TSFormGroup}>
                      <label htmlFor="personnelId">Select Personnel *</label>
                      <select
                        id="personnelId"
                        value={formData.personnelId}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">-- Choose Personnel --</option>
                        {personnel.map((person) => (
                          <option key={person.id} value={person.id}>
                            {`${person.first_name} ${person.middle_name} ${person.last_name}`}{" "}
                            - {person.rank}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.TSFormRow}>
                    <div className={styles.TSFormGroup}>
                      <label>Full Name</label>
                      <input
                        type="text"
                        value={formData.fullName}
                        readOnly
                        className={styles.TSReadOnlyInput}
                        placeholder="Auto-filled from selection"
                      />
                    </div>
                    <div className={styles.TSFormGroup}>
                      <label>Rank</label>
                      <input
                        type="text"
                        value={formData.rank}
                        readOnly
                        className={styles.TSReadOnlyInput}
                      />
                    </div>
                  </div>
                </div>

                {/* Training Details Section */}
                <div className={styles.TSFormSection}>
                  <h3>Training Details</h3>
                  <div className={styles.TSFormRow}>
                    <div className={styles.TSFormGroup}>
                      <label htmlFor="dateOfTraining">Training Date *</label>
                      <input
                        type="date"
                        id="dateOfTraining"
                        value={formData.dateOfTraining}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className={styles.TSFormGroup}>
                      <label htmlFor="days">Duration (Days) *</label>
                      <input
                        type="number"
                        id="days"
                        min="1"
                        max="365"
                        value={formData.days}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., 5"
                      />
                    </div>
                  </div>

                  <div className={styles.TSFormRow}>
                    <div className={styles.TSFormGroup}>
                      <label htmlFor="status">Training Status *</label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="Pending">Pending</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className={styles.TSFormActions}>
                  <button type="submit" className={styles.TSSaveBtn}>
                    Update Training
                  </button>
                  <button
                    type="button"
                    onClick={closeAllForms}
                    className={styles.TSCancelBtn}
                  >
                    Cancel
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

export default Trainings;
