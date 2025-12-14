import React, { useState, useEffect } from "react";
import styles from "./MedicalRecords.module.css";
import Sidebar from "./Sidebar.jsx";
import Hamburger from "./Hamburger.jsx";
import { useSidebar } from "./SidebarContext.jsx";
import { Title, Meta } from "react-head";
import { supabase } from "../lib/supabaseClient";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const MedicalRecords = () => {
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isSidebarCollapsed } = useSidebar();

  // State variables for table functionality
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;
  const [search, setSearch] = useState("");
  const [filterRecordType, setFilterRecordType] = useState("");
  const [currentFilterCard, setCurrentFilterCard] = useState("total");

  // Load medical records from Supabase
  useEffect(() => {
    loadMedicalRecords();
  }, []);

  const loadMedicalRecords = async () => {
    try {
      setLoading(true);
      
      // Fetch only medical records (category = 'Medical Record')
      const { data, error } = await supabase
        .from("personnel_documents")
        .select(`
          *,
          personnel (
            first_name,
            middle_name,
            last_name,
            rank,
            designation
          )
        `)
        .eq('category', 'Medical Record') // Only get medical records
        .order("uploaded_at", { ascending: false });

      if (error) throw error;

      // Transform the data
      const transformedRecords = (data || []).map(record => {
        const personnel = record.personnel || {};
        
        // Use record_type from database, fallback to determining from name
        let recordType = record.record_type || "General";
        
        // If record type is General, try to determine from document name
        if (recordType === "General") {
          const docName = record.name?.toLowerCase() || "";
          if (docName.includes("dental")) {
            recordType = "Dental";
          } else if (docName.includes("checkup") || docName.includes("medical")) {
            recordType = "Checkup";
          } else if (docName.includes("lab") || docName.includes("test")) {
            recordType = "Lab Test";
          } else if (docName.includes("imaging") || docName.includes("x-ray") || 
                     docName.includes("mri") || docName.includes("scan")) {
            recordType = "Imaging";
          }
        }

        return {
          id: record.id,
          name: `${personnel.first_name || ""} ${personnel.middle_name || ""} ${personnel.last_name || ""}`.replace(/\s+/g, ' ').trim(),
          rank: personnel.rank || "",
          designation: personnel.designation || "",
          recordName: record.name,
          recordType: recordType,
          dateUploaded: record.uploaded_at ? 
            new Date(record.uploaded_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric"
            }) : 
            new Date().toLocaleDateString(),
          downloadUrl: record.file_url,
          fileName: record.name,
          personnelId: record.personnel_id,
          filePath: record.file_path,
          fileSize: record.file_size,
          description: record.description,
          uploadDate: record.uploaded_at
        };
      });

      console.log("Loaded medical records:", transformedRecords.length);
      setMedicalRecords(transformedRecords);
    } catch (error) {
      console.error("Error loading medical records:", error);
      toast.error("Failed to load medical records");
    } finally {
      setLoading(false);
    }
  };

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

    if (currentPage < pageCount - 2) {
      buttons.push(
        <span key="ellipsis2" className={styles.MDRPaginationEllipsis}>
          ...
        </span>
      );
    }

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

  // Handle download
  const handleDownload = async (record) => {
    try {
      console.log("Downloading medical record:", record.id, record.fileName);

      if (record.downloadUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement("a");
        link.href = record.downloadUrl;
        link.download = record.fileName || "medical_record";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Download started");
      } else {
        toast.error("No download URL available");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Error downloading file");
    }
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

  if (loading) {
    return (
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className={styles.loadingContainer}>
          <p>Loading medical records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.MDRAppContainer}>
      <Title>Medical Records | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />

      <Hamburger />
      <Sidebar />
      
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <h1 className={styles.MDRTitle}>Medical Records of Personnel</h1>

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
              <option value="Checkup">Checkup</option>
              <option value="Lab Test">Lab Test</option>
              <option value="Imaging">Imaging</option>
              <option value="Dental">Dental</option>
              <option value="General">General</option>
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
                <th>File Size</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="8" className={styles.MDRNoRequestsTable}>
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
                          styles[record.recordType.toLowerCase().replace(" ", "")]
                        }`}
                      >
                        {record.recordType}
                      </span>
                    </td>
                    <td>{record.dateUploaded}</td>
                    <td>
                      {record.fileSize ? 
                        `${Math.round(record.fileSize / 1024)} KB` : 
                        "N/A"
                      }
                    </td>
                    <td>
                      <button
                        className={styles.MDRDownloadLink}
                        onClick={() => handleDownload(record)}
                        disabled={!record.downloadUrl}
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

export default MedicalRecords;