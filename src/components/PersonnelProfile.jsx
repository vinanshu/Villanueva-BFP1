import React, { useState, useEffect, useRef } from "react";
import {
  STORE_PERSONNEL,
  getAll,
  updateRecord,
  getPersonnelList,
  addMedicalRecord,
} from "./db";
import Sidebar from "./Sidebar.jsx";
import Hamburger from "./Hamburger.jsx";
import { useSidebar } from "./SidebarContext.jsx";
import { Title, Meta } from "react-head";
import styles from "./PersonnelProfile.module.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PersonnelProfile = () => {
  const { isSidebarCollapsed } = useSidebar();
  const [personnelList, setPersonnelList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBy, setFilterBy] = useState("firstName");
  const [pendingUploads, setPendingUploads] = useState({});
  const [showMedicalRecordModal, setShowMedicalRecordModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [currentPersonnelIndex, setCurrentPersonnelIndex] = useState(null);
  const [medicalRecordTypes, setMedicalRecordTypes] = useState({});
  const [awardTypes, setAwardTypes] = useState({});
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showPreviewSidebar, setShowPreviewSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 6;
  // Format date to display full month names
  const formatDate = (dateString) => {
    if (!dateString || dateString.trim() === "") return "";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  // Format timestamp to display like "Sep 29, 2025 9:00pm"
  const formatTimestamp = (dateString) => {
    if (!dateString || dateString.trim() === "") return "";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid
      }

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return dateString;
    }
  };
  // Load personnel from IndexedDB
  useEffect(() => {
    const loadData = async () => {
      try {
        const personnel = await getPersonnelList();
        const updatedPersonnel = await syncMedicalRecordsToPersonnel(personnel);
        setPersonnelList(updatedPersonnel);
      } catch (error) {
        console.error("Error loading personnel:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Sync medical records back to personnel documents
  const syncMedicalRecordsToPersonnel = async (personnelList) => {
    try {
      const medicalRecords = await getAll("medicalRecords");
      if (!medicalRecords || medicalRecords.length === 0) {
        return personnelList;
      }

      let hasUpdates = false;
      const updatedPersonnel = [...personnelList];

      for (const medicalRecord of medicalRecords) {
        const personnelIndex = updatedPersonnel.findIndex(
          (p) => p.id === medicalRecord.personnelId
        );

        if (personnelIndex !== -1) {
          const personnel = updatedPersonnel[personnelIndex];
          const documents = personnel.documents || [];
          const existingDoc = documents.find(
            (doc) =>
              doc.name === medicalRecord.documentName &&
              doc.category === "Medical Record"
          );

          if (!existingDoc) {
            documents.push({
              name: medicalRecord.documentName,
              category: "Medical Record",
              url: medicalRecord.blobUrl || "#",
              uploadedAt: medicalRecord.uploadDate,
              recordType: medicalRecord.recordType || "General",
            });

            updatedPersonnel[personnelIndex] = {
              ...personnel,
              documents: documents,
            };
            hasUpdates = true;
          }
        }
      }

      if (hasUpdates) {
        for (const personnel of updatedPersonnel) {
          await updateRecord(STORE_PERSONNEL, personnel);
        }
        console.log("Synced medical records to personnel documents");
      }

      return updatedPersonnel;
    } catch (error) {
      console.error("Error syncing medical records:", error);
      return personnelList;
    }
  };

  // Define getFieldValue FIRST
  const getFieldValue = (personnel, field) => {
    switch (field) {
      case "firstName":
        return personnel.first_name || "";
      case "lastName":
        return personnel.last_name || "";
      case "rank":
        return personnel.rank || "";
      case "designation":
        return personnel.designation || "";
      case "dateHired":
        return personnel.date_hired || "";
      case "Retirement":
        return personnel.retirement_date || "";
      default:
        return "";
    }
  };

  // Filter personnel based on search
  const filteredPersonnel = personnelList.filter((personnel) => {
    if (!searchQuery.trim()) return true;
    const fieldValue = getFieldValue(personnel, filterBy);
    return fieldValue.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Pagination logic
  const totalPages = Math.max(
    1,
    Math.ceil(filteredPersonnel.length / rowsPerPage)
  );
  const pageStart = (currentPage - 1) * rowsPerPage;
  const paginatedPersonnel = filteredPersonnel.slice(
    pageStart,
    pageStart + rowsPerPage
  );

  // Pagination function
  const renderPaginationButtons = () => {
    const pageCount = Math.max(
      1,
      Math.ceil(filteredPersonnel.length / rowsPerPage)
    );
    const hasNoData = filteredPersonnel.length === 0;

    const buttons = [];

    // Previous button
    buttons.push(
      <button
        key="prev"
        className={`${styles.paginationBtn} ${
          hasNoData ? styles.paginationDisabled : ""
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
          1 === currentPage ? styles.paginationActive : ""
        } ${hasNoData ? styles.paginationDisabled : ""}`}
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

    for (let i = startPage; i <= endPage; i++) {
      if (i > 1 && i < pageCount) {
        buttons.push(
          <button
            key={i}
            className={`${styles.paginationBtn} ${
              i === currentPage ? styles.paginationActive : ""
            } ${hasNoData ? styles.paginationDisabled : ""}`}
            onClick={() => setCurrentPage(i)}
            disabled={hasNoData}
          >
            {i}
          </button>
        );
      }
    }

    if (currentPage < pageCount - 2) {
      buttons.push(
        <span key="ellipsis2" className={styles.paginationEllipsis}>
          ...
        </span>
      );
    }

    if (pageCount > 1) {
      buttons.push(
        <button
          key={pageCount}
          className={`${styles.paginationBtn} ${
            pageCount === currentPage ? styles.paginationActive : ""
          } ${hasNoData ? styles.paginationDisabled : ""}`}
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
          hasNoData ? styles.paginationDisabled : ""
        }`}
        disabled={currentPage === pageCount || hasNoData}
        onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
      >
        Next
      </button>
    );

    return buttons;
  };

  // Highlight search text
  const highlightText = (text, fieldType) => {
    if (!searchQuery.trim() || !text) return text;

    const shouldHighlight = () => {
      switch (filterBy) {
        case "firstName":
          return fieldType === "first_name";
        case "lastName":
          return fieldType === "last_name";
        case "rank":
          return fieldType === "rank";
        case "designation":
          return fieldType === "designation";
        case "dateHired":
          return fieldType === "date_hired";
        case "Retirement":
          return fieldType === "retirement_date";
        default:
          return false;
      }
    };

    if (!shouldHighlight()) return text;

    const regex = new RegExp(
      `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    return text
      .toString()
      .replace(
        regex,
        '<mark style="background:yellow; color:black;">$1</mark>'
      );
  };

  // Modal Functions
  const openMedicalRecordModal = (index) => {
    setCurrentPersonnelIndex(index);
    setShowMedicalRecordModal(true);
  };

  const openAwardModal = (index) => {
    setCurrentPersonnelIndex(index);
    setShowAwardModal(true);
  };

  const closeMedicalRecordModal = () => {
    setShowMedicalRecordModal(false);
    setCurrentPersonnelIndex(null);
  };

  const closeAwardModal = () => {
    setShowAwardModal(false);
    setCurrentPersonnelIndex(null);
  };

  const handleMedicalRecordTypeSelect = (personnelId, type) => {
    setMedicalRecordTypes((prev) => ({
      ...prev,
      [personnelId]: type,
    }));
  };

  const handleAwardTypeSelect = (personnelId, type) => {
    setAwardTypes((prev) => ({
      ...prev,
      [personnelId]: type,
    }));
  };

  const openDeleteModal = (
    personnelId,
    documentIndex,
    documentName,
    documentCategory
  ) => {
    setDocumentToDelete({
      personnelId,
      documentIndex,
      documentName,
      documentCategory,
    });
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDocumentToDelete(null);
  };

  const confirmDelete = async () => {
    if (documentToDelete) {
      await removeDocument(
        documentToDelete.personnelId,
        documentToDelete.documentIndex,
        documentToDelete.documentName,
        documentToDelete.documentCategory
      );
      closeDeleteModal();
    }
  };

  // File upload functionality
  const prepareUpload = (event, index) => {
    const files = event.target.files;
    const categorySelect = document.getElementById(`doc-category-${index}`);
    const selectedCategory = categorySelect ? categorySelect.value : "";

    if (files.length > 0) {
      const fileNames = Array.from(files)
        .map((file) => file.name)
        .join(", ");
      const message =
        files.length === 1
          ? `Selected file: ${fileNames}`
          : `Selected ${files.length} files: ${fileNames}`;
      toast.info(message);
    }

    // Open appropriate modal based on category
    if (selectedCategory === "Medical Record" && files.length > 0) {
      setPendingUploads((prev) => ({
        ...prev,
        [index]: files,
      }));
      openMedicalRecordModal(index);
    } else if (selectedCategory === "Award/Commendation" && files.length > 0) {
      setPendingUploads((prev) => ({
        ...prev,
        [index]: files,
      }));
      openAwardModal(index);
    } else {
      setPendingUploads((prev) => ({
        ...prev,
        [index]: files,
      }));
    }
  };

  const saveUploadedFiles = async (index) => {
    if (!pendingUploads[index]) return;

    try {
      const files = pendingUploads[index];
      const personnelToUpdate = paginatedPersonnel[index];
      const personnelId = personnelToUpdate.id;
      const category = document.getElementById(`doc-category-${index}`).value;
      const newDocs = [...(personnelToUpdate.documents || [])];

      let recordType = "";

      if (category === "Medical Record") {
        recordType = medicalRecordTypes[personnelId] || "General";
      } else if (category === "Award/Commendation") {
        recordType = awardTypes[personnelId] || "General";
      }

      // Process each file
      for (const file of files) {
        const url = URL.createObjectURL(file);
        const fileData = await fileToArrayBuffer(file);

        // Create document object for personnel store
        const documentObj = {
          name: file.name,
          category,
          url,
          fileData: fileData,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          recordType: recordType,
        };

        newDocs.push(documentObj);

        // Save to medical records store if it's a medical record
        if (category === "Medical Record") {
          try {
            await addMedicalRecord(
              {
                personnelId: personnelToUpdate.id,
                documentName: file.name,
                recordType: recordType,
                fileName: file.name,
                uploadDate: new Date().toISOString(),
                description: `Medical record for ${personnelToUpdate.first_name} ${personnelToUpdate.last_name}`,
                category: "Medical Record",
              },
              file
            );
          } catch (medicalError) {
            console.error(
              `Error saving to medical records store:`,
              medicalError
            );
            toast.warning(
              `Medical record saved to personnel but failed in medical store: ${file.name}`
            );
          }
        }
      }

      // Update personnel record with new documents
      const updatedPersonnel = {
        ...personnelToUpdate,
        documents: newDocs,
      };

      await updateRecord(STORE_PERSONNEL, updatedPersonnel);

      // Reload the data from IndexedDB to refresh the UI
      const updatedList = await getPersonnelList();
      setPersonnelList(updatedList);

      // Clear pending uploads for this index
      setPendingUploads((prev) => {
        const newPending = { ...prev };
        delete newPending[index];
        return newPending;
      });

      // Clear record types
      setMedicalRecordTypes((prev) => {
        const newTypes = { ...prev };
        delete newTypes[personnelId];
        return newTypes;
      });
      setAwardTypes((prev) => {
        const newTypes = { ...prev };
        delete newTypes[personnelId];
        return newTypes;
      });

      toast.success(
        `Successfully saved ${files.length} file(s) for ${personnelToUpdate.first_name} ${personnelToUpdate.last_name}`
      );
    } catch (error) {
      console.error("Error saving uploaded files:", error);
      toast.error("Error saving files. Please try again.");
    }
  };

  // Helper function to convert files to ArrayBuffer
  const fileToArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Document click handler for Windows 11-style preview
  const handleDocumentClick = (doc, personnel) => {
    setSelectedDocument({
      ...doc,
      personnelName: `${personnel.first_name} ${personnel.last_name}`,
      personnelRank: personnel.rank,
      personnelDesignation: personnel.designation,
    });
    setShowPreviewSidebar(true);
  };

  // Close preview sidebar
  const closePreviewSidebar = () => {
    setShowPreviewSidebar(false);
    setSelectedDocument(null);
  };

  // Remove document function
  const removeDocument = async (
    personnelId,
    documentIndex,
    documentName,
    documentCategory
  ) => {
    try {
      const personnelIndex = personnelList.findIndex(
        (p) => p.id === personnelId
      );
      if (personnelIndex === -1) {
        toast.error("Personnel not found");
        return;
      }

      const personnel = personnelList[personnelIndex];
      const documents = [...(personnel.documents || [])];

      if (documentIndex < 0 || documentIndex >= documents.length) {
        toast.error("Document not found");
        return;
      }

      const removedDocument = documents[documentIndex];
      documents.splice(documentIndex, 1);

      const updatedPersonnel = {
        ...personnel,
        documents: documents,
      };

      // Update personnel record in IndexedDB
      await updateRecord(STORE_PERSONNEL, updatedPersonnel);

      // If it's a medical record, also remove from medical records store
      if (removedDocument.category === "Medical Record") {
        try {
          const medicalRecords = await getAll("medicalRecords");
          const medicalRecordToDelete = medicalRecords.find(
            (record) =>
              record.personnelId === personnelId &&
              record.documentName === removedDocument.name
          );

          if (medicalRecordToDelete) {
            // Delete from medical records store
            await deleteRecord("medicalRecords", medicalRecordToDelete.id);
            console.log(
              "Also removed from medical records store:",
              removedDocument.name
            );
          }
        } catch (medicalError) {
          console.error(
            "Error removing from medical records store:",
            medicalError
          );
          // Don't show error to user - main deletion was successful
        }
      }

      // Update local state
      const updatedList = [...personnelList];
      updatedList[personnelIndex] = updatedPersonnel;
      setPersonnelList(updatedList);

      toast.success(`Document "${removedDocument.name}" removed successfully`);

      // Close preview sidebar if the deleted document is currently being viewed
      if (selectedDocument && selectedDocument.name === removedDocument.name) {
        closePreviewSidebar();
      }
    } catch (error) {
      console.error("Error removing document:", error);
      toast.error("Error removing document. Please try again.");
    }
  };
  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Keyboard shortcut for clearing search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && searchQuery) {
        clearSearch();
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterBy]);

  if (isLoading) {
    return (
      <div className={styles.preLoading}>
        <p>Loading personnel data...</p>
      </div>
    );
  }

  return (
    <div className={styles.prePersonnelProfile}>
      {/* Medical Record Modal */}
      {showMedicalRecordModal && currentPersonnelIndex !== null && (
        <MedicalRecordModal
          personnel={paginatedPersonnel[currentPersonnelIndex]}
          onSelectType={(type) =>
            handleMedicalRecordTypeSelect(
              paginatedPersonnel[currentPersonnelIndex].id,
              type
            )
          }
          onClose={closeMedicalRecordModal}
          selectedType={
            medicalRecordTypes[paginatedPersonnel[currentPersonnelIndex]?.id] ||
            ""
          }
        />
      )}
      {/* Award/Commendation Modal */}
      {showAwardModal && currentPersonnelIndex !== null && (
        <AwardModal
          personnel={paginatedPersonnel[currentPersonnelIndex]}
          onSelectType={(type) =>
            handleAwardTypeSelect(
              paginatedPersonnel[currentPersonnelIndex].id,
              type
            )
          }
          onClose={closeAwardModal}
          selectedType={
            awardTypes[paginatedPersonnel[currentPersonnelIndex]?.id] || ""
          }
        />
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && documentToDelete && (
        <DeleteConfirmationModal
          documentName={documentToDelete.documentName}
          onConfirm={confirmDelete}
          onCancel={closeDeleteModal}
        />
      )}

      {showPreviewSidebar && selectedDocument && (
        <>
          <div
            className={styles.previewSidebarOverlay}
            onClick={closePreviewSidebar}
          />
          <PreviewSidebar
            document={selectedDocument}
            onClose={closePreviewSidebar}
            formatTimestamp={formatTimestamp}
          />
        </>
      )}
      <Title>Personnel Profile | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />
      <Hamburger />
      <Sidebar />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      {/* Main Content */}
      <div
        className={`main-content ${isSidebarCollapsed ? "collapsed" : ""} ${
          showPreviewSidebar ? styles.withPreviewSidebar : ""
        }`}
      >
        <div className={styles.preSearchBar}>
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
          >
            <option value="firstName">First Name</option>
            <option value="lastName">Last Name</option>
            <option value="rank">Rank</option>
            <option value="designation">Designation</option>
            <option value="dateHired">Date Hired</option>
            <option value="Retirement">Retirement</option>
          </select>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search personnel..."
          />
          <button onClick={clearSearch}>✕</button>
        </div>
        <h1>Personnel Profile (201 Files)</h1>
        {/* Pagination Controls */}
        <div className={styles.paginationContainer}>
          {renderPaginationButtons()}
        </div>

        <div className={styles.prePersonnelCards}>
          {paginatedPersonnel.length > 0 ? (
            paginatedPersonnel.map((personnel, index) => (
              <PersonnelCard
                key={personnel.id}
                personnel={personnel}
                index={index}
                searchQuery={searchQuery}
                filterBy={filterBy}
                highlightText={highlightText}
                onPrepareUpload={prepareUpload}
                onSaveUploadedFiles={saveUploadedFiles}
                pendingUploads={pendingUploads}
                onDocumentClick={handleDocumentClick}
                onRemoveDocument={openDeleteModal}
                medicalRecordType={medicalRecordTypes[personnel.id] || ""}
                awardType={awardTypes[personnel.id] || ""}
                formatDate={formatDate} // Add this
                formatTimestamp={formatTimestamp} // Add this
              />
            ))
          ) : (
            <div className={styles.preEmptyState}>
              <div className={styles.emptyStateIcon}>📇</div>
              <div className={styles.emptyStateTitle}>No Personnel Records</div>
              <div className={styles.emptyStateMessage}>
                {searchQuery
                  ? `No personnel found matching "${searchQuery}"`
                  : "BFP personnel register is empty - add your first team member"}
              </div>
            </div>
          )}
        </div>
        {/* Pagination Controls */}
        {filteredPersonnel.length > rowsPerPage && (
          <div className={styles.paginationContainer}>
            {renderPaginationButtons()}
          </div>
        )}
      </div>
    </div>
  );
};

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ documentName, onConfirm, onCancel }) => {
  return (
    <div className={styles.preModalDelete} style={{ display: "flex" }}>
      <div className={styles.preModalContentDelete} style={{ maxWidth: "450px" }}>
        <div className={styles.preModalHeaderDelete}>
          <h2 style={{ marginLeft: "30px" }}>Confirm Deletion</h2>
          <span className={styles.preCloseBtn} onClick={onCancel}>
            &times;
          </span>
        </div>

        <div className={styles.preModalBody}>
          <div className={styles.deleteConfirmationContent}>
            <div className={styles.deleteWarningIcon}>⚠️</div>
            <p className={styles.deleteConfirmationText}>
              Are you sure you want to delete the document
            </p>
            <p className={styles.documentNameHighlight}>"{documentName}"?</p>
            <p className={styles.deleteWarning}>
              This action cannot be undone.
            </p>
          </div>
        </div>

        <div className={styles.preModalActions}>
          <button
            className={`${styles.preBtn} ${styles.preCancelBtn}`}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className={`${styles.preBtn} ${styles.deleteConfirmBtn}`}
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Award Modal Component (Similar to Medical Record Modal)
const AwardModal = ({ personnel, onSelectType, onClose, selectedType }) => {
  const awardTypes = [
    { id: "Medal", label: "Medal", icon: "🏅" },
    { id: "Commendation", label: "Commendation", icon: "⭐" },
    { id: "Certificate", label: "Certificate", icon: "📜" },
    { id: "Ribbon", label: "Ribbon", icon: "🎗️" },
    { id: "Badge", label: "Badge", icon: "🛡️" },
  ];

  const handleContinue = () => {
    if (!selectedType) {
      alert("Please select an award type first.");
      return;
    }
    onClose();
  };

  return (
    <div className={styles.preModal} style={{ display: "flex" }}>
      <div className={styles.preModalContent} style={{ maxWidth: "500px" }}>
        <div className={styles.preModalHeader}>
          <h2>Select Award Type</h2>
          <span className={styles.preCloseBtn} onClick={onClose}>
            &times;
          </span>
        </div>

        <div className={styles.preModalBody}>
          <p style={{ marginBottom: "20px", textAlign: "center" }}>
            For{" "}
            <strong>
              {personnel.first_name} {personnel.last_name}
            </strong>
          </p>

          <div className={styles.medicalRecordTypes}>
            {awardTypes.map((type) => (
              <button
                key={type.id}
                className={`${styles.medicalRecordTypeBtn} ${
                  selectedType === type.id
                    ? styles.medicalRecordTypeBtnSelected
                    : ""
                }`}
                onClick={() => onSelectType(type.id)}
              >
                <span className={styles.medicalRecordIcon}>{type.icon}</span>
                <span className={styles.medicalRecordLabel}>{type.label}</span>
              </button>
            ))}
          </div>

          {selectedType && (
            <div className={styles.selectedTypeInfo}>
              <p>
                Selected:{" "}
                <strong>
                  {awardTypes.find((t) => t.id === selectedType)?.label}
                </strong>
              </p>
              <p className={styles.instruction}>
                You can now save the files as awards/commendations.
              </p>
            </div>
          )}
        </div>

        <div className={styles.preModalActions}>
          <button
            className={`${styles.preBtn} ${styles.preCancelBtnModal}`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`${styles.preBtn} ${styles.preSaveBtn}`}
            onClick={handleContinue}
            disabled={!selectedType}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

// Medical Record Modal Component
const MedicalRecordModal = ({
  personnel,
  onSelectType,
  onClose,
  selectedType,
}) => {
  const recordTypes = [
    { id: "Checkup", label: "Check Ups", icon: "🩺" },
    { id: "Lab", label: "Lab Tests", icon: "🧪" },
    { id: "Imaging", label: "Imaging", icon: "📷" },
    { id: "Dental", label: "Dental", icon: "🦷" },
  ];

  const handleContinue = () => {
    if (!selectedType) {
      alert("Please select a medical record type first.");
      return;
    }
    onClose();
  };

  return (
    <div className={styles.preModal} style={{ display: "flex" }}>
      <div className={styles.preModalContent} style={{ maxWidth: "500px" }}>
        <div className={styles.preModalHeader}>
          <h2>Select Medical Record Type</h2>
          <span className={styles.preCloseBtn} onClick={onClose}>
            &times;
          </span>
        </div>

        <div className={styles.preModalBody}>
          <p style={{ marginBottom: "20px", textAlign: "center" }}>
            For{" "}
            <strong>
              {personnel.first_name} {personnel.last_name}
            </strong>
          </p>

          <div className={styles.medicalRecordTypes}>
            {recordTypes.map((type) => (
              <button
                key={type.id}
                className={`${styles.medicalRecordTypeBtn} ${
                  selectedType === type.id
                    ? styles.medicalRecordTypeBtnSelected
                    : ""
                }`}
                onClick={() => onSelectType(type.id)}
              >
                <span className={styles.medicalRecordIcon}>{type.icon}</span>
                <span className={styles.medicalRecordLabel}>{type.label}</span>
              </button>
            ))}
          </div>

          {selectedType && (
            <div className={styles.selectedTypeInfo}>
              <p>
                Selected:{" "}
                <strong>
                  {recordTypes.find((t) => t.id === selectedType)?.label}
                </strong>
              </p>
              <p className={styles.instruction}>
                You can now save the files as medical records.
              </p>
            </div>
          )}
        </div>

        <div className={styles.preModalActions}>
          <button
            className={`${styles.preBtn} ${styles.preCancelBtnModal}`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`${styles.preBtn} ${styles.preSaveBtn}`}
            onClick={handleContinue}
            disabled={!selectedType}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

// Preview Sidebar Component (Windows 11-style)
const PreviewSidebar = ({ document, onClose, formatTimestamp }) => { // Add formatTimestamp prop
  const [pdfError, setPdfError] = useState(false);
  const iframeRef = useRef(null);

  const getFileIcon = (fileName) => {
    if (fileName.toLowerCase().endsWith(".pdf")) return "📄";
    if (fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i))
      return "🖼️";
    if (fileName.toLowerCase().match(/\.(doc|docx)$/i)) return "📝";
    if (fileName.toLowerCase().match(/\.(xls|xlsx)$/i)) return "📊";
    return "📎";
  };

  useEffect(() => {
    setPdfError(false);
  }, [document]);

  const handlePdfError = () => {
    console.error("PDF failed to load:", document.url);
    setPdfError(true);
  };

  const handleIframeLoad = () => {
    console.log("Iframe loaded successfully");
  };

  return (
    <div className={styles.previewSidebar}>
      <div className={styles.previewHeader}>
        <h3>Preview</h3>
        <button className={styles.previewCloseBtn} onClick={onClose}>
          ×
        </button>
      </div>

      <div className={styles.previewContent}>
        <div className={styles.filePreview}>
          {document.name.toLowerCase().endsWith(".pdf") ? (
            pdfError ? (
              <div className={styles.pdfError}>
                <div className={styles.fileIconLarge}>📄</div>
                <p>Unable to display PDF preview</p>
                <a
                  href={document.url}
                  className={styles.openInNewTabBtn}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open PDF in new tab
                </a>
              </div>
            ) : (
              <>
                <iframe
                  ref={iframeRef}
                  src={document.url}
                  type="application/pdf"
                  className={styles.previewIframe}
                  onLoad={handleIframeLoad}
                  onError={handlePdfError}
                  title={`PDF Preview: ${document.name}`}
                />
                <embed
                  src={document.url}
                  type="application/pdf"
                  className={styles.previewEmbed}
                  onError={handlePdfError}
                  style={{ display: "none" }}
                />
              </>
            )
          ) : document.name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
            <img
              src={document.url}
              alt={document.name}
              className={styles.previewImage}
              onError={(e) => {
                console.error("Image failed to load:", document.url);
                e.target.style.display = "none";
              }}
            />
          ) : (
            <div className={styles.noPreview}>
              <div className={styles.fileIconLarge}>
                {getFileIcon(document.name)}
              </div>
              <p>No preview available</p>
              <p className={styles.fileTypeNote}>
                {document.name.split(".").pop()?.toUpperCase()} file
              </p>
            </div>
          )}
        </div>

        <div className={styles.fileDetails}>
          <div className={styles.detailSection}>
            <h4>File Information</h4>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Name:</span>
              <span className={styles.detailValue}>{document.name}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Type:</span>
              <span className={styles.detailValue}>{document.category}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>File Type:</span>
              <span className={styles.detailValue}>
                {document.name.split(".").pop()?.toUpperCase()}
              </span>
            </div>
            {document.recordType && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Record Type:</span>
                <span className={styles.detailValue}>
                  {document.recordType}
                </span>
              </div>
            )}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Uploaded:</span>
              <span className={styles.detailValue}>
                {formatTimestamp(document.uploadedAt)} {/* Use the passed function */}
              </span>
            </div>
          </div>

          <div className={styles.detailSection}>
            <h4>Personnel Information</h4>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Name:</span>
              <span className={styles.detailValue}>
                {document.personnelName}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Rank:</span>
              <span className={styles.detailValue}>
                {document.personnelRank}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Designation:</span>
              <span className={styles.detailValue}>
                {document.personnelDesignation}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const PersonnelCard = ({
  personnel,
  index,
  searchQuery,
  filterBy,
  highlightText,
  onPrepareUpload,
  onSaveUploadedFiles,
  pendingUploads,
  onDocumentClick,
  onRemoveDocument,
  medicalRecordType,
  awardType,
  formatDate,
  formatTimestamp,
}) => {
  const safeRender = (value, defaultValue = "") => {
    if (value === null || value === undefined) return defaultValue;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? defaultValue : value.toLocaleDateString();
    }
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const handleCategoryChange = (e) => {
    console.log("Category changed to:", e.target.value);
  };

  // Format dates with full month names
  const firstName = highlightText(
    safeRender(personnel.first_name),
    "first_name"
  );

  const lastName = highlightText(safeRender(personnel.last_name), "last_name");
  const rank = highlightText(safeRender(personnel.rank), "rank");
  const designation = highlightText(
    safeRender(personnel.designation),
    "designation"
  );
  const dateHired = highlightText(
    formatDate(safeRender(personnel.date_hired)), // Apply formatting
    "date_hired"
  );
  const retirementDate = highlightText(
    formatDate(safeRender(personnel.retirement_date)), // Apply formatting
    "retirement_date"
  );
  const birthDate = formatDate(safeRender(personnel.birth_date)); // Apply formatting

  return (
    <div className={styles.prePersonnelCard}>
      <div className={styles.preCardHeader}>
        <img
          src={personnel.photoURL || "/bfp.jpg"}
          alt={`${safeRender(personnel.first_name)} ${safeRender(
            personnel.last_name
          )}`}
        />
        <div>
          <h3
            dangerouslySetInnerHTML={{ __html: `${firstName} ${lastName}` }}
          />
          <small
            dangerouslySetInnerHTML={{ __html: `${rank} – ${designation}` }}
          />
          <small>Badge: {safeRender(personnel.badge_number)}</small>
        </div>
      </div>
      <div className={styles.preCardBody}>
        <div>
          <strong>Station:</strong> {safeRender(personnel.station)}
        </div>
        <div>
          <strong>Birth Date:</strong> {birthDate} {/* Formatted birth date */}
        </div>
        <div>
          <strong>Date Hired:</strong>{" "}
          <span dangerouslySetInnerHTML={{ __html: dateHired }} />
        </div>
        <div>
          <strong>Retirement:</strong>{" "}
          <span dangerouslySetInnerHTML={{ __html: retirementDate }} />
        </div>
      </div>
      <div className={styles.preCardActions}>
        <div className={styles.preDocumentUpload}>
          <select id={`doc-category-${index}`} onChange={handleCategoryChange}>
            <option value="Medical Record">Medical Record</option>
            <option value="Award/Commendation">Award/Commendation</option>
            <option value="Others">Others</option>
          </select>
          <div className={styles.preFileUpload}>
            <input
              type="file"
              id={`fileInput-${index}`}
              multiple
              onChange={(e) => onPrepareUpload(e, index)}
            />
            <label htmlFor={`fileInput-${index}`}>📂 Choose Files</label>
          </div>
          {medicalRecordType && (
            <div className={styles.medicalRecordTypeIndicator}>
              🩺 Medical Type: {medicalRecordType}
            </div>
          )}
          {awardType && (
            <div className={styles.awardTypeIndicator}>
              🏅 Award Type: {awardType}
            </div>
          )}
          <button
            className={`${styles.preBtn} ${styles.preSaveFilesBtn}`}
            onClick={() => onSaveUploadedFiles(index)}
            disabled={!pendingUploads[index]}
          >
            Save Files
          </button>
          <DocumentList
            documents={personnel.documents || []}
            personnel={personnel}
            onDocumentClick={onDocumentClick}
            onRemoveDocument={onRemoveDocument} // This should now work correctly
            formatTimestamp={formatTimestamp}
          />
        </div>
      </div>
    </div>
  );
};


const DocumentList = ({
  documents,
  personnel,
  onDocumentClick,
  onRemoveDocument,
  formatTimestamp,
}) => {
  const safeRender = (value) => {
    if (value === null || value === undefined) return "N/A";
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? "Invalid date" : formatTimestamp(value);
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return "[Object]";
      }
    }
    return String(value);
  };

  const handleDocumentClick = (doc, personnel) => {
    let url = doc.url;
    if ((!url || url === "#") && doc.fileData) {
      const blob = new Blob([doc.fileData], { type: doc.fileType });
      url = URL.createObjectURL(blob);
      doc.url = url;
    }
    onDocumentClick({ ...doc, url }, personnel);
  };

  const handleRemoveClick = (e, docIndex, documentName, documentCategory) => {
    e.stopPropagation();
    onRemoveDocument(personnel.id, docIndex, documentName, documentCategory);
  };

  if (!documents || !documents.length) {
    return (
      <div className={styles.preDocumentList}>
        <i>No documents uploaded</i>
      </div>
    );
  }

  return (
    <div className={styles.preDocumentList}>
      {documents.map((doc, docIndex) => (
        <div
          key={docIndex}
          className={styles.preDocumentItem}
          onClick={() => handleDocumentClick(doc, personnel)}
        >
          <div className={styles.documentContent}>
            <div className={styles.documentInfo}>
              📎 <strong>[{safeRender(doc.category)}]</strong>
              <span className={styles.documentName}>
                {safeRender(doc.name)}
              </span>
              {doc.recordType && (
                <span className={styles.recordTypeBadge}>{doc.recordType}</span>
              )}
              <span className={styles.preDocumentMeta}>
                ({formatTimestamp(doc.uploadedAt)})
              </span>
              {(!doc.url || doc.url === "#") && doc.fileData && (
                <span
                  className={styles.regeneratedIndicator}
                  title="URL regenerated"
                >
                  🔄
                </span>
              )}
            </div>
            <button
              className={styles.preRemoveBtn}
              onClick={(e) =>
                handleRemoveClick(e, docIndex, doc.name, doc.category)
              }
              title="Remove document"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PersonnelProfile;
