import React, { useState, useEffect } from "react";
import styles from "./AwardsCommendations.module.css";
//import { getAll } from "./db.js";
//import Sidebar from "./Sidebar.jsx";
//import Hamburger from "./Hamburger.jsx";
//import { useSidebar } from "./SidebarContext.jsx";
//import { Title, Meta } from "react-head";
import { getAll } from "./db";
import Sidebar from "./Sidebar";
import Hamburger from "./Hamburger";
import { useSidebar } from "./SidebarContext";
import {Title, Meta} from "react-head"
const AwardsCommendations = () => {
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isSidebarCollapsed } = useSidebar();

  // State variables for table functionality
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;
  const [search, setSearch] = useState("");
  const [filterAwardType, setFilterAwardType] = useState("");
  const [currentFilterCard, setCurrentFilterCard] = useState("total");

  const loadAwards = async () => {
    try {
      const personnelList = await getAll("personnel");
      const awardsData = [];

      personnelList.forEach((p) => {
        const fullName = `${p.first_name || ""} ${p.middle_name || ""} ${
          p.last_name || ""
        }`.trim();
        const rank = p.rank || "N/A";
        const badge = p.badge_number || "N/A";
        const documents = Array.isArray(p.documents) ? p.documents : [];

        documents
          .filter((doc) => doc.category === "Award/Commendation")
          .forEach((doc) => {
            const dateTime = doc.uploadedAt
              ? new Date(doc.uploadedAt).toLocaleString()
              : "N/A";

            // Determine award type based on document name or category
            let awardType = "General";
            const docName = doc.name?.toLowerCase() || "";

            if (docName.includes("medal") || docName.includes("medal of")) {
              awardType = "Medal";
            } else if (
              docName.includes("commendation") ||
              docName.includes("commendation")
            ) {
              awardType = "Commendation";
            } else if (
              docName.includes("certificate") ||
              docName.includes("certificate of")
            ) {
              awardType = "Certificate";
            } else if (
              docName.includes("ribbon") ||
              docName.includes("service ribbon")
            ) {
              awardType = "Ribbon";
            } else if (
              docName.includes("badge") ||
              docName.includes("special badge")
            ) {
              awardType = "Badge";
            }

            awardsData.push({
              id: `${p.id}-${doc.name}-${Date.now()}`,
              fullName,
              rank,
              badgeNumber: badge,
              awardName: doc.name,
              awardType: awardType,
              dateTime,
              downloadUrl: doc.url,
              fileName: doc.name,
              personnelId: p.id,
              rawDocument: doc,
            });
          });
      });

      console.log("Loaded awards data:", awardsData);
      setAwards(awardsData);
      setLoading(false);
    } catch (error) {
      console.error("Error loading awards:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAwards();
  }, []);

  // Filtering & pagination logic
  function applyFilters(items) {
    let filtered = [...items];

    // Card filter
    if (currentFilterCard === "medal") {
      filtered = filtered.filter((i) => i.awardType.toLowerCase() === "medal");
    } else if (currentFilterCard === "commendation") {
      filtered = filtered.filter((i) =>
        i.awardType.toLowerCase().includes("commendation")
      );
    } else if (currentFilterCard === "certificate") {
      filtered = filtered.filter(
        (i) => i.awardType.toLowerCase() === "certificate"
      );
    } else if (currentFilterCard === "ribbon") {
      filtered = filtered.filter((i) => i.awardType.toLowerCase() === "ribbon");
    } else if (currentFilterCard === "badge") {
      filtered = filtered.filter((i) => i.awardType.toLowerCase() === "badge");
    }

    // Text filters
    const s = search.trim().toLowerCase();
    const typeFilter = filterAwardType.trim().toLowerCase();

    filtered = filtered.filter((i) => {
      const text =
        `${i.fullName} ${i.rank} ${i.badgeNumber} ${i.awardName} ${i.awardType} ${i.dateTime}`.toLowerCase();
      const typeMatch =
        !typeFilter || (i.awardType || "").toLowerCase().includes(typeFilter);
      const searchMatch = !s || text.includes(s);
      return typeMatch && searchMatch;
    });

    return filtered;
  }

  const filteredAwardsData = applyFilters(awards);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAwardsData.length / rowsPerPage)
  );
  const pageStart = (currentPage - 1) * rowsPerPage;
  const paginated = filteredAwardsData.slice(
    pageStart,
    pageStart + rowsPerPage
  );

  // Pagination function
  const renderPaginationButtons = () => {
    const pageCount = Math.max(
      1,
      Math.ceil(filteredAwardsData.length / rowsPerPage)
    );
    const hasNoData = filteredAwardsData.length === 0;

    const buttons = [];

    // Previous button
    buttons.push(
      <button
        key="prev"
        className={`${styles.ACSPaginationBtn} ${
          hasNoData ? styles.ACSDisabled : ""
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
        className={`${styles.ACSPaginationBtn} ${
          1 === currentPage ? styles.ACSActive : ""
        } ${hasNoData ? styles.ACSDisabled : ""}`}
        onClick={() => setCurrentPage(1)}
        disabled={hasNoData}
      >
        1
      </button>
    );

    // Show ellipsis after first page if needed
    if (currentPage > 3) {
      buttons.push(
        <span key="ellipsis1" className={styles.ACSPaginationEllipsis}>
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
            className={`${styles.ACSPaginationBtn} ${
              i === currentPage ? styles.ACSActive : ""
            } ${hasNoData ? styles.ACSDisabled : ""}`}
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
        <span key="ellipsis2" className={styles.ACSPaginationEllipsis}>
          ...
        </span>
      );
    }

    // Always show last page if there is more than 1 page
    if (pageCount > 1) {
      buttons.push(
        <button
          key={pageCount}
          className={`${styles.ACSPaginationBtn} ${
            pageCount === currentPage ? styles.ACSActive : ""
          } ${hasNoData ? styles.ACSDisabled : ""}`}
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
        className={`${styles.ACSPaginationBtn} ${
          hasNoData ? styles.ACSDisabled : ""
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
  const totalItems = awards.length;
  const medalItems = awards.filter(
    (i) => i.awardType.toLowerCase() === "medal"
  ).length;
  const commendationItems = awards.filter((i) =>
    i.awardType.toLowerCase().includes("commendation")
  ).length;
  const certificateItems = awards.filter(
    (i) => i.awardType.toLowerCase() === "certificate"
  ).length;
  const ribbonItems = awards.filter(
    (i) => i.awardType.toLowerCase() === "ribbon"
  ).length;
  const badgeItems = awards.filter(
    (i) => i.awardType.toLowerCase() === "badge"
  ).length;

  function handleCardClick(filter) {
    if (currentFilterCard === filter) {
      setCurrentFilterCard("total");
    } else {
      setCurrentFilterCard(filter);
    }
    setCurrentPage(1);
  }

  const handleDownload = async (award) => {
    try {
      console.log("Downloading award:", award.id, award.fileName);

      if (award.rawDocument && award.rawDocument.url) {
        // Use the blob URL if available
        const link = document.createElement("a");
        link.href = award.rawDocument.url;
        link.download = award.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (award.downloadUrl) {
        // Fallback to downloadUrl
        const link = document.createElement("a");
        link.href = award.downloadUrl;
        link.download = award.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert("Download link not available for this award.");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Error downloading file. Please try again.");
    }
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString || dateTimeString === "N/A") return "N/A";

    try {
      const date = new Date(dateTimeString);
      return isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
    } catch {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <p>Loading awards and commendations...</p>
      </div>
    );
  }

  return (
    <div className={styles.ACSAppContainer}>
      <Title>Awards & Commendations | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />

      <Hamburger />
      <Sidebar />
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <h1 className={styles.ACSTitle}>Awards & Commendations</h1>

        {/* Top Controls */}
        <div className={styles.ACSTopControls}>
          <div className={styles.ACSTableHeader}>
            <select
              className={styles.ACSFilterType}
              value={filterAwardType}
              onChange={(e) => {
                setFilterAwardType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Award Types</option>
              <option>Medal</option>
              <option>Commendation</option>
              <option>Certificate</option>
              <option>Ribbon</option>
              <option>Badge</option>
              <option>General</option>
            </select>

            <input
              type="text"
              className={styles.ACSSearchBar}
              placeholder="🔍 Search awards..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className={styles.ACSSummary}>
          <button
            className={`${styles.ACSSummaryCard} ${styles.ACSTotal} ${
              currentFilterCard === "total" ? styles.ACSActive : ""
            }`}
            onClick={() => handleCardClick("total")}
          >
            <h3>Total Awards</h3>
            <p>{totalItems}</p>
          </button>
          <button
            className={`${styles.ACSSummaryCard} ${styles.ACSMedal} ${
              currentFilterCard === "medal" ? styles.ACSActive : ""
            }`}
            onClick={() => handleCardClick("medal")}
          >
            <h3>Medals</h3>
            <p>{medalItems}</p>
          </button>
          <button
            className={`${styles.ACSSummaryCard} ${styles.ACSCommendation} ${
              currentFilterCard === "commendation" ? styles.ACSActive : ""
            }`}
            onClick={() => handleCardClick("commendation")}
          >
            <h3>Commendations</h3>
            <p>{commendationItems}</p>
          </button>
          <button
            className={`${styles.ACSSummaryCard} ${styles.ACSCertificate} ${
              currentFilterCard === "certificate" ? styles.ACSActive : ""
            }`}
            onClick={() => handleCardClick("certificate")}
          >
            <h3>Certificates</h3>
            <p>{certificateItems}</p>
          </button>
          <button
            className={`${styles.ACSSummaryCard} ${styles.ACSRibbon} ${
              currentFilterCard === "ribbon" ? styles.ACSActive : ""
            }`}
            onClick={() => handleCardClick("ribbon")}
          >
            <h3>Ribbons</h3>
            <p>{ribbonItems}</p>
          </button>
          <button
            className={`${styles.ACSSummaryCard} ${styles.ACSBadge} ${
              currentFilterCard === "badge" ? styles.ACSActive : ""
            }`}
            onClick={() => handleCardClick("badge")}
          >
            <h3>Badges</h3>
            <p>{badgeItems}</p>
          </button>
        </div>

        {/* Table */}
        <div className={styles.ACSTableContainer}>
          <div className={styles.ACSPaginationContainer}>
            {renderPaginationButtons()}
          </div>

          <table className={styles.ACSTable}>
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Rank</th>
                <th>Badge No.</th>
                <th>Award/Commendation</th>
                <th>Award Type</th>
                <th>Date & Time Uploaded</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="7" className={styles.ACSNoAwardsTable}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      🏆
                    </div>
                    <h3>No Awards & Commendations Found</h3>
                    <p>There are no awards or commendations uploaded yet.</p>
                  </td>
                </tr>
              ) : (
                paginated.map((award) => (
                  <tr key={award.id} className={styles.ACSTableRow}>
                    <td>{award.fullName}</td>
                    <td>{award.rank}</td>
                    <td>{award.badgeNumber}</td>
                    <td>{award.awardName}</td>
                    <td>
                      <span
                        className={`${styles.ACSStatus} ${
                          styles[award.awardType.toLowerCase().replace(" ", "")]
                        }`}
                      >
                        {award.awardType}
                      </span>
                    </td>
                    <td>{formatDateTime(award.dateTime)}</td>
                    <td>
                      <button
                        className={styles.ACSDownloadLink}
                        onClick={() => handleDownload(award)}
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

export default AwardsCommendations;
