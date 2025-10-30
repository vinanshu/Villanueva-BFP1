import React, { useState, useEffect } from "react";
import styles from "./MedicalRecords.module.css";
import {
  getMedicalRecordsWithPersonnel,
  downloadMedicalRecord,
  migratePersonnelDocumentsToMedicalRecords,
  addMedicalRecord,
} from "./db";
import Sidebar from "./Sidebar.jsx";
import Hamburger from "./Hamburger.jsx";
import { useSidebar } from "./SidebarContext.jsx";
import { Title, Meta } from "react-head";

const MDRMedicalRecords = () => {
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isSidebarCollapsed } = useSidebar();

  // State variables for table functionality
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;
  const [search, setSearch] = useState("");
  const [filterRecordType, setFilterRecordType] = useState("");
  const [currentFilterCard, setCurrentFilterCard] = useState("total");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    personnelId: "",
    recordType: "Checkup",
    documentName: "",
    description: "",
    file: null,
  });

  // Extract the transformation logic to a separate function
 const transformRecords = (recordsWithPersonnel) => {
   // Use a more specific unique key that includes record type and other identifiers
   const uniqueRecords = new Map();

   recordsWithPersonnel.forEach((record) => {
     // Create a more comprehensive unique key
     const uniqueKey = `${record.personnelId}-${record.documentName}-${record.recordType}-${record.id}`;

     if (!uniqueRecords.has(uniqueKey)) {
       uniqueRecords.set(uniqueKey, record);
     } else {
       console.log("Duplicate record skipped:", uniqueKey);
     }
   });

   console.log("After deduplication:", uniqueRecords.size, "records");

   return Array.from(uniqueRecords.values()).map((record) => {
     let recordType = record.recordType || "General";

     if (!record.recordType || record.recordType === "General") {
       const docName = record.documentName?.toLowerCase() || "";
       const recordTypeLower = record.recordType?.toLowerCase() || "";

       if (docName.includes("dental") || recordTypeLower.includes("dental")) {
         recordType = "Dental";
       } else if (
         docName.includes("checkup") ||
         docName.includes("medical") ||
         recordTypeLower.includes("checkup")
       ) {
         recordType = "Checkup";
       } else if (
         docName.includes("lab") ||
         docName.includes("test") ||
         recordTypeLower.includes("lab")
       ) {
         recordType = "Lab Test";
       } else if (
         docName.includes("imaging") ||
         docName.includes("x-ray") ||
         docName.includes("mri") ||
         docName.includes("scan") ||
         recordTypeLower.includes("imaging")
       ) {
         recordType = "Imaging";
       }
     }

     return {
       id: record.id,
       name: `${record.personnel.first_name || ""} ${
         record.personnel.last_name || ""
       }`.trim(),
       rank: record.personnel.rank || "",
       designation: record.personnel.designation || "",
       recordName: record.documentName,
       recordType: recordType,
       dateUploaded: record.uploadDate
         ? new Date(record.uploadDate).toLocaleDateString()
         : new Date().toLocaleDateString(),
       downloadUrl: record.downloadUrl || "#",
       fileName: record.fileName,
       personnelId: record.personnelId,
       rawRecord: record,
     };
   });
 };

  useEffect(() => {
    const fetchMedicalRecords = async () => {
      try {
        console.log("=== STARTING MEDICAL RECORDS FETCH ===");

        // First, migrate any existing personnel documents to medical records
        await migratePersonnelDocumentsToMedicalRecords();

        // Then fetch all medical records with personnel data
        const recordsWithPersonnel = await getMedicalRecordsWithPersonnel();

        // DETAILED DEBUGGING
        console.log("=== DATABASE ANALYSIS ===");
        console.log("Total records from DB:", recordsWithPersonnel.length);

        // Count by type
        const typeCount = {};
        recordsWithPersonnel.forEach((record) => {
          const type = record.recordType || "Unknown";
          typeCount[type] = (typeCount[type] || 0) + 1;
        });
        console.log("Record type counts:", typeCount);

        // Use the transformRecords function
        const transformedRecords = transformRecords(recordsWithPersonnel);

        console.log("=== FINAL TRANSFORMED RECORDS ===");
        console.log("Transformed records:", transformedRecords);

        const finalTypeCount = {};
        transformedRecords.forEach((record) => {
          const type = record.recordType;
          finalTypeCount[type] = (finalTypeCount[type] || 0) + 1;
        });
        console.log("Final type counts:", finalTypeCount);

        setMedicalRecords(transformedRecords);
        setLoading(false);
      } catch (error) {
        console.error("Error loading medical records from IndexedDB:", error);
        setLoading(false);
      }
    };

    fetchMedicalRecords();
  }, []);


  // Filtering & pagination logic
  function applyFilters(items) {
    let filtered = [...items];

    // Card filter
    if (currentFilterCard === "checkup") {
      filtered = filtered.filter(
        (i) => i.recordType.toLowerCase() === "checkup"
      );
    } else if (currentFilterCard === "lab") {
      filtered = filtered.filter((i) =>
        i.recordType.toLowerCase().includes("lab")
      );
    } else if (currentFilterCard === "imaging") {
      filtered = filtered.filter(
        (i) => i.recordType.toLowerCase() === "imaging"
      );
    } else if (currentFilterCard === "dental") {
      filtered = filtered.filter(
        (i) => i.recordType.toLowerCase() === "dental"
      );
    }

    // Text filters
    const s = search.trim().toLowerCase();
    const typeFilter = filterRecordType.trim().toLowerCase();

    filtered = filtered.filter((i) => {
      const text =
        `${i.name} ${i.rank} ${i.designation} ${i.recordName} ${i.recordType} ${i.dateUploaded}`.toLowerCase();
      const typeMatch =
        !typeFilter || (i.recordType || "").toLowerCase().includes(typeFilter);
      const searchMatch = !s || text.includes(s);
      return typeMatch && searchMatch;
    });

    return filtered;
  }

  const filteredMedicalData = applyFilters(medicalRecords);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredMedicalData.length / rowsPerPage)
  );
  const pageStart = (currentPage - 1) * rowsPerPage;
  const paginated = filteredMedicalData.slice(
    pageStart,
    pageStart + rowsPerPage
  );

  // Pagination function
  const renderPaginationButtons = () => {
    const pageCount = Math.max(
      1,
      Math.ceil(filteredMedicalData.length / rowsPerPage)
    );
    const hasNoData = filteredMedicalData.length === 0;

    const buttons = [];

    // Previous button
    buttons.push(
      <button
        key="prev"
        className={`${styles.MDRPaginationBtn} ${
          hasNoData ? styles.MDRDisabled : ""
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
        className={`${styles.MDRPaginationBtn} ${
          1 === currentPage ? styles.MDRActive : ""
        } ${hasNoData ? styles.MDRDisabled : ""}`}
        onClick={() => setCurrentPage(1)}
        disabled={hasNoData}
      >
        1
      </button>
    );

    // Show ellipsis after first page if needed
    if (currentPage > 3) {
      buttons.push(
        <span key="ellipsis1" className={styles.MDRPaginationEllipsis}>
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
            className={`${styles.MDRPaginationBtn} ${
              i === currentPage ? styles.MDRActive : ""
            } ${hasNoData ? styles.MDRDisabled : ""}`}
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
        <span key="ellipsis2" className={styles.MDRPaginationEllipsis}>
          ...
        </span>
      );
    }

    // Always show last page if there is more than 1 page
    if (pageCount > 1) {
      buttons.push(
        <button
          key={pageCount}
          className={`${styles.MDRPaginationBtn} ${
            pageCount === currentPage ? styles.MDRActive : ""
          } ${hasNoData ? styles.MDRDisabled : ""}`}
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
        className={`${styles.MDRPaginationBtn} ${
          hasNoData ? styles.MDRDisabled : ""
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
  const totalItems = medicalRecords.length;
  const checkupItems = medicalRecords.filter(
    (i) => i.recordType.toLowerCase() === "checkup"
  ).length;
  const labItems = medicalRecords.filter((i) =>
    i.recordType.toLowerCase().includes("lab")
  ).length;
  const imagingItems = medicalRecords.filter(
    (i) => i.recordType.toLowerCase() === "imaging"
  ).length;
  const dentalItems = medicalRecords.filter(
    (i) => i.recordType.toLowerCase() === "dental"
  ).length;

  function handleCardClick(filter) {
    if (currentFilterCard === filter) {
      setCurrentFilterCard("total");
    } else {
      setCurrentFilterCard(filter);
    }
    setCurrentPage(1);
  }

  const handleDownload = async (record) => {
    try {
      console.log("Downloading medical record:", record.id, record.fileName);

      if (record.rawRecord && record.rawRecord.downloadUrl) {
        // Use the blob URL if available
        const link = document.createElement("a");
        link.href = record.rawRecord.downloadUrl;
        link.download = record.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Fallback to the download function
        await downloadMedicalRecord(record.id);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Error downloading file. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <p>Loading medical records...</p>
      </div>
    );
  }

  return (
    <div className={styles.MDRAppContainer}>
      <Title>Medical Records | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />

      <Hamburger />
      <Sidebar />
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <h1 className={styles.MDRTitle}>Medical Records of Employees</h1>

        {/* Top Controls */}
        <div className={styles.MDRTopControls}>
          <div className={styles.MDRTableHeader}>
            <select
              className={styles.MDRFilterType}
              value={filterRecordType}
              onChange={(e) => {
                setFilterRecordType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Record Types</option>
              <option>Checkup</option>
              <option>Lab Test</option>
              <option>Imaging</option>
              <option>Dental</option>
              <option>General</option>
            </select>

            <input
              type="text"
              className={styles.MDRSearchBar}
              placeholder="🔍 Search medical records..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />

            {/* ADD UPLOAD BUTTON */}
          
          </div>
        </div>

   

        {/* Summary Cards */}
        <div className={styles.MDRSummary}>
          <button
            className={`${styles.MDRSummaryCard} ${styles.MDRTotal} ${
              currentFilterCard === "total" ? styles.MDRActive : ""
            }`}
            onClick={() => handleCardClick("total")}
          >
            <h3>Total Records</h3>
            <p>{totalItems}</p>
          </button>
          <button
            className={`${styles.MDRSummaryCard} ${styles.MDRCheckup} ${
              currentFilterCard === "checkup" ? styles.MDRActive : ""
            }`}
            onClick={() => handleCardClick("checkup")}
          >
            <h3>Checkups</h3>
            <p>{checkupItems}</p>
          </button>
          <button
            className={`${styles.MDRSummaryCard} ${styles.MDRLab} ${
              currentFilterCard === "lab" ? styles.MDRActive : ""
            }`}
            onClick={() => handleCardClick("lab")}
          >
            <h3>Lab Tests</h3>
            <p>{labItems}</p>
          </button>
          <button
            className={`${styles.MDRSummaryCard} ${styles.MDRImaging} ${
              currentFilterCard === "imaging" ? styles.MDRActive : ""
            }`}
            onClick={() => handleCardClick("imaging")}
          >
            <h3>Imaging</h3>
            <p>{imagingItems}</p>
          </button>
          <button
            className={`${styles.MDRSummaryCard} ${styles.MDRDental} ${
              currentFilterCard === "dental" ? styles.MDRActive : ""
            }`}
            onClick={() => handleCardClick("dental")}
          >
            <h3>Dental</h3>
            <p>{dentalItems}</p>
          </button>
        </div>

        {/* Table */}
        <div className={styles.MDRTableContainer}>
          <div className={styles.MDRPaginationContainer}>
            {renderPaginationButtons()}
          </div>

          <table className={styles.MDRTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Rank</th>
                <th>Designation</th>
                <th>Record Name</th>
                <th>Record Type</th>
                <th>Date Uploaded</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="7" className={styles.MDRNoRequestsTable}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      🏥
                    </div>
                    <h3>No Medical Records Found</h3>
                    <p>There are no medical records uploaded yet.</p>
                  </td>
                </tr>
              ) : (
                paginated.map((record) => (
                  <tr key={record.id} className={styles.MDRTableRow}>
                    <td>{record.name}</td>
                    <td>{record.rank}</td>
                    <td>{record.designation}</td>
                    <td>{record.recordName}</td>
                    <td>
                      <span
                        className={`${styles.MDRStatus} ${
                          styles[
                            record.recordType.toLowerCase().replace(" ", "")
                          ]
                        }`}
                      >
                        {record.recordType}
                      </span>
                    </td>
                    <td>{record.dateUploaded}</td>
                    <td>
                      <button
                        className={styles.MDRDownloadLink}
                        onClick={() => handleDownload(record)}
                        style={{
                          border: "none",
                          cursor: "pointer",
                          fontSize: "inherit",
                        }}
                      >
                        📥 Download
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

export default MDRMedicalRecords;
