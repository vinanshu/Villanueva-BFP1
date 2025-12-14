// RecruitmentPersonnel.jsx
import React, { useState, useEffect } from "react";
import styles from "./RecruitmentPersonnel.module.css";
import Sidebar from "./Sidebar.jsx";
import Hamburger from "./Hamburger.jsx";
import { useSidebar } from "./SidebarContext.jsx";
import { Title, Meta } from "react-head";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import { supabase } from "../lib/supabaseClient";

const RecruitmentPersonnel = () => {
  const [formData, setFormData] = useState({
    candidate: "",
    position: "",
    applicationDate: "",
    stage: "",
    interviewDate: "",
    status: "",
    photoUrl: "",
    resumeUrl: "",
  });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
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
  
  // Loading state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // File upload states
  const [photoFile, setPhotoFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load data from Supabase
  useEffect(() => {
    fetchRecruitmentData();
  }, []);

  // Generate username from candidate name
  const generateUsername = (candidateName) => {
    if (!candidateName) return "";
    
    // Remove special characters and spaces, convert to lowercase
    const baseUsername = candidateName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 15); // Limit length
    
    // Add random numbers for uniqueness
    const randomNumbers = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `${baseUsername}${randomNumbers}`;
  };

  // Generate random password
  const generatePassword = () => {
    const length = 10;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    
    // Ensure at least one of each type
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    password += "0123456789"[Math.floor(Math.random() * 10)];
    password += "!@#$%^&*"[Math.floor(Math.random() * 8)];
    
    // Fill the rest
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  // Auto-generate username when candidate name changes
  useEffect(() => {
    if (formData.candidate && editId === null) {
      const generatedUsername = generateUsername(formData.candidate);
      setUsername(generatedUsername);
      
      // Also generate password if not already set
      if (!password) {
        const generatedPassword = generatePassword();
        setPassword(generatedPassword);
      }
    }
  }, [formData.candidate]);

  // Generate new password
  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setPassword(newPassword);
  };

  const fetchRecruitmentData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recruitment_personnel')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recruitment data:', error);
        return;
      }

      setRecords(data || []);
    } catch (error) {
      console.error('Error in fetchRecruitmentData:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // Handle photo file selection
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPEG, PNG, etc.)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file size should be less than 5MB');
        return;
      }
      
      setPhotoFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle resume file selection
  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      // Check both MIME type and file extension
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const isValidType = allowedTypes.includes(file.type) || 
                         ['pdf', 'doc', 'docx'].includes(fileExtension);
      
      if (!isValidType) {
        alert('Please select a PDF or Word document (PDF, DOC, DOCX)');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Resume file size should be less than 10MB');
        return;
      }
      
      setResumeFile(file);
      setResumeFileName(file.name);
    }
  };

  // Upload file to Supabase Storage
  const uploadFile = async (file, bucket, fileName) => {
    try {
      // Create unique filename
      const fileExt = fileName.split('.').pop();
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${bucket}/${uniqueFileName}`;

      const { data, error } = await supabase.storage
        .from('recruitment-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading file:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('recruitment-files')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error in uploadFile:', error);
      throw error;
    }
  };

  // Delete file from Supabase Storage
  const deleteFile = async (url) => {
    if (!url) return;
    
    try {
      // Extract the file path from the URL
      const urlParts = url.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('recruitment-files') + 1).join('/');
      
      const { error } = await supabase.storage
        .from('recruitment-files')
        .remove([filePath]);

      if (error) {
        console.error('Error deleting file:', error);
      }
    } catch (error) {
      console.error('Error in deleteFile:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editId !== null) {
      await handleUpdateCandidate(e);
      return;
    }
    
    await addNewCandidate();
  };

  const addNewCandidate = async () => {
    try {
      setSubmitting(true);
      setUploadProgress(0);

      // Validate required fields
      if (!username || !password) {
        alert('Please ensure username and password are generated');
        setSubmitting(false);
        return;
      }

      let photoUrl = "";
      let resumeUrl = "";

      // Upload photo if selected
      if (photoFile) {
        setUploadProgress(30);
        photoUrl = await uploadFile(photoFile, 'photos', photoFile.name);
      }

      // Upload resume if selected
      if (resumeFile) {
        setUploadProgress(60);
        resumeUrl = await uploadFile(resumeFile, 'resumes', resumeFile.name);
      }

      setUploadProgress(90);

      const newCandidate = {
        candidate: formData.candidate,
        position: formData.position,
        username: username,
        password: password,
        application_date: formData.applicationDate,
        stage: formData.stage,
        interview_date: formData.interviewDate,
        status: formData.status,
        photo_url: photoUrl,
        resume_url: resumeUrl,
      };

      const { data, error } = await supabase
        .from('recruitment_personnel')
        .insert([newCandidate])
        .select()
        .single();

      if (error) {
        console.error('Error adding candidate:', error);
        
        if (error.code === '23505') {
          alert('Username already exists. Please try again.');
        } else {
          alert('Failed to add candidate. Please try again.');
        }
        return;
      }

      setUploadProgress(100);

      // Refresh the data
      await fetchRecruitmentData();
      
      // Reset form and file states
      resetForm();
      setShowForm(false);
      setCurrentPage(1);
      
      setTimeout(() => {
        setUploadProgress(0);
        alert('Candidate added successfully!\n\nCredentials:\nUsername: ' + username + '\nPassword: ' + password);
      }, 500);
      
    } catch (error) {
      console.error('Error in addNewCandidate:', error);
      alert('An error occurred. Please try again.');
      setUploadProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      candidate: "",
      position: "",
      applicationDate: "",
      stage: "",
      interviewDate: "",
      status: "",
      photoUrl: "",
      resumeUrl: "",
    });
    setUsername("");
    setPassword("");
    setShowPassword(false);
    setPhotoFile(null);
    setResumeFile(null);
    setPhotoPreview("");
    setResumeFileName("");
  };

  const handleEdit = (id) => {
    const record = records.find((item) => item.id === id);
    if (record) {
      setFormData({
        candidate: record.candidate,
        position: record.position,
        applicationDate: record.application_date || "",
        stage: record.stage,
        interviewDate: record.interview_date || "",
        status: record.status,
        photoUrl: record.photo_url || "",
        resumeUrl: record.resume_url || "",
      });
      setUsername(record.username || "");
      setPassword(record.password || "");
      setPhotoPreview(record.photo_url || "");
      setResumeFileName(record.resume_url ? record.resume_url.split('/').pop() : "");
      setEditId(id);
      setShowEditModal(true);
    }
  };

  const handleUpdateCandidate = async (e) => {
    e.preventDefault();
    
    if (editId === null) return;

    try {
      setSubmitting(true);
      setUploadProgress(0);

      let photoUrl = formData.photoUrl;
      let resumeUrl = formData.resumeUrl;
      let oldPhotoUrl = formData.photoUrl;
      let oldResumeUrl = formData.resumeUrl;

      // Upload new photo if selected
      if (photoFile) {
        setUploadProgress(30);
        photoUrl = await uploadFile(photoFile, 'photos', photoFile.name);
        // Delete old photo if it exists
        if (oldPhotoUrl) {
          await deleteFile(oldPhotoUrl);
        }
      }

      // Upload new resume if selected
      if (resumeFile) {
        setUploadProgress(60);
        resumeUrl = await uploadFile(resumeFile, 'resumes', resumeFile.name);
        // Delete old resume if it exists
        if (oldResumeUrl) {
          await deleteFile(oldResumeUrl);
        }
      }

      setUploadProgress(90);

      const updatedData = {
        candidate: formData.candidate,
        position: formData.position,
        username: username,
        password: password,
        application_date: formData.applicationDate,
        stage: formData.stage,
        interview_date: formData.interviewDate,
        status: formData.status,
        photo_url: photoUrl,
        resume_url: resumeUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('recruitment_personnel')
        .update(updatedData)
        .eq('id', editId);

      if (error) {
        console.error('Error updating candidate:', error);
        
        if (error.code === '23505') {
          alert('Username already exists. Please change the username.');
        } else {
          alert('Failed to update candidate. Please try again.');
        }
        return;
      }

      setUploadProgress(100);

      // Refresh the data
      await fetchRecruitmentData();
      
      // Reset states
      setShowEditModal(false);
      setEditId(null);
      resetForm();
      
      setTimeout(() => {
        setUploadProgress(0);
        alert('Candidate updated successfully!');
      }, 500);
      
    } catch (error) {
      console.error('Error in handleUpdateCandidate:', error);
      alert('An error occurred. Please try again.');
      setUploadProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;

    try {
      // Get the record first to delete associated files
      const record = records.find((item) => item.id === deleteId);
      
      // Delete associated files from storage if they exist
      if (record?.photo_url) {
        await deleteFile(record.photo_url);
      }

      if (record?.resume_url) {
        await deleteFile(record.resume_url);
      }

      // Delete from database
      const { error } = await supabase
        .from('recruitment_personnel')
        .delete()
        .eq('id', deleteId);

      if (error) {
        console.error('Error deleting candidate:', error);
        alert('Failed to delete candidate. Please try again.');
        return;
      }

      // Refresh the data
      await fetchRecruitmentData();
      
      setShowDeleteModal(false);
      setDeleteId(null);
      setCurrentPage(1);
      
      alert('Candidate deleted successfully!');
      
    } catch (error) {
      console.error('Error in confirmDelete:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteId(null);
  };

  // Function to view/download resume
  const viewResume = (url) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('No resume available for this candidate.');
    }
  };

  // Function to view/download photo
  const viewPhoto = (url) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('No photo available for this candidate.');
    }
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

  // Get file name from URL
  const getFileNameFromUrl = (url) => {
    if (!url) return "";
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  // Password cell component for table
  const PasswordCell = ({ password }) => {
    const [showPass, setShowPass] = useState(false);
    
    return (
      <td className={styles.passwordCell}>
        <span className={styles.passwordMask}>
          {showPass ? password : "••••••"}
        </span>
        <button
          type="button"
          className={styles.togglePassword}
          onClick={() => setShowPass(!showPass)}
        >
          {showPass ? "🙈" : "👁"}
        </button>
      </td>
    );
  };

  // Filtering & pagination logic
  function applyFilters(items) {
    let filtered = [...items];

    // Card filter
    if (currentFilterCard === "applied") {
      filtered = filtered.filter((i) => i.stage?.toLowerCase() === "applied");
    } else if (currentFilterCard === "screening") {
      filtered = filtered.filter((i) => i.stage?.toLowerCase() === "screening");
    } else if (currentFilterCard === "interview") {
      filtered = filtered.filter((i) => i.stage?.toLowerCase() === "interview");
    } else if (currentFilterCard === "final") {
      filtered = filtered.filter(
        (i) => i.stage?.toLowerCase() === "final review"
      );
    }

    // Text filters
    const s = search.trim().toLowerCase();
    const stageFilter = filterStage.trim().toLowerCase();
    const statusFilter = filterStatus.trim().toLowerCase();

    filtered = filtered.filter((i) => {
      const text =
        `${i.candidate} ${i.position} ${i.username} ${i.application_date} ${i.stage} ${i.interview_date} ${i.status}`.toLowerCase();
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

  // Summary numbers for cards
  const totalItems = records.length;
  const appliedItems = records.filter(
    (i) => i.stage?.toLowerCase() === "applied"
  ).length;
  const screeningItems = records.filter(
    (i) => i.stage?.toLowerCase() === "screening"
  ).length;
  const interviewItems = records.filter(
    (i) => i.stage?.toLowerCase() === "interview"
  ).length;
  const finalReviewItems = records.filter(
    (i) => i.stage?.toLowerCase() === "final review"
  ).length;

  function handleCardClick(filter) {
    if (currentFilterCard === filter) {
      setCurrentFilterCard("total");
    } else {
      setCurrentFilterCard(filter);
    }
    setCurrentPage(1);
  }

  // Pagination function
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

        {/* Form Card */}
        <div className={styles.card}>
          <h2>Add New Candidate</h2>
          <button
            className={`${styles.showFormBtn} ${styles.submit}${
              showForm ? styles.showing : ""
            }`}
            onClick={() => setShowForm(!showForm)}
            type="button"
            disabled={submitting}
          >
            {showForm ? "Hide Form" : "Add New Candidate"}
          </button>

          {/* Upload Progress Bar */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className={styles.progressBarContainer}>
              <div 
                className={styles.progressBar} 
                style={{ width: `${uploadProgress}%` }}
              >
                Uploading... {uploadProgress}%
              </div>
            </div>
          )}

          <form
            className={`${styles.form} ${styles.layout} ${
              showForm ? styles.show : ""
            }`}
            onSubmit={handleSubmit}
          >
            {/* Left: Photo Section */}
            <div className={styles.photoSection}>
              <div className={styles.photoPreview}>
                {photoPreview ? (
                  <img 
                    src={photoPreview} 
                    alt="Candidate preview" 
                    className={styles.photoImage}
                  />
                ) : (
                  <span>No Photo</span>
                )}
              </div>
              <div className={styles.fileUpload}>
                <label htmlFor="photo" className={styles.fileUploadLabel}>
                  📂 Upload Photo (Max 5MB)
                </label>
                <input
                  type="file"
                  id="photo"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={submitting}
                />
                <span>{photoFile ? photoFile.name : "No photo selected"}</span>
              </div>
              
              {/* Resume Upload */}
              <div className={styles.fileUpload} style={{ marginTop: '20px' }}>
                <label htmlFor="resume" className={styles.fileUploadLabel}>
                  📄 Upload Resume (PDF/DOC, Max 10MB)
                </label>
                <input
                  type="file"
                  id="resume"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleResumeChange}
                  disabled={submitting}
                />
                <span>{resumeFileName || "No resume selected"}</span>
              </div>
            </div>

            {/* Right: Info fields */}
            <div className={styles.infoSection}>
              {/* Username and Password Fields */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <div className={styles.floatingGroup}>
                    <input
                      type="text"
                      id="username"
                      className={styles.floatingInput}
                      placeholder=" "
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={submitting}
                    />
                    <label htmlFor="username" className={styles.floatingLabel}>
                      Username *
                    </label>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <div className={styles.floatingGroup}>
                    <div className={styles.passwordInputGroup}>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        className={styles.floatingInput}
                        placeholder=" "
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        className={styles.showPasswordBtn}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? "🙈" : "👁"}
                      </button>
                    </div>
                    <label htmlFor="password" className={styles.floatingLabel}>
                      Password *
                    </label>
                  </div>
                  <button
                    type="button"
                    className={styles.generatePasswordBtn}
                    onClick={handleGeneratePassword}
                    disabled={submitting}
                  >
                    Generate
                  </button>
                </div>
              </div>

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
                      disabled={submitting}
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
                      disabled={submitting}
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
                          applicationDate: date ? date.toISOString().split('T')[0] : "",
                        }))
                      }
                      options={{
                        dateFormat: "Y-m-d",
                        maxDate: "today",
                      }}
                      className={styles.floatingInput}
                      placeholder=" "
                      disabled={submitting}
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
                      disabled={submitting}
                      style={{
                        backgroundColor:
                          getOptionColor("stage", formData.stage) || "#fff",
                        color: getOptionColor("stage", formData.stage)
                          ? "#fff"
                          : "#000",
                      }}
                    >
                      <option value="" disabled></option>
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
                          interviewDate: date ? date.toISOString().split('T')[0] : "",
                        }))
                      }
                      options={{
                        dateFormat: "Y-m-d",
                      }}
                      className={styles.floatingInput}
                      placeholder=" "
                      disabled={submitting}
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
                      disabled={submitting}
                      style={{
                        backgroundColor:
                          getOptionColor("status", formData.status) || "#fff",
                        color: getOptionColor("status", formData.status)
                          ? "#fff"
                          : "#000",
                      }}
                    >
                      <option value="" disabled></option>
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
                    resetForm();
                    setShowForm(false);
                  }}
                  disabled={submitting}
                >
                  Clear Information
                </button>
                <button 
                  type="submit" 
                  className={styles.submit}
                  disabled={submitting}
                >
                  {submitting ? "Processing..." : 
                   editId !== null ? "Update Candidate" : "Add Candidate"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Table Section */}
        <div className={styles.tableHeaderSection}>
          <h2>All Recruitment Records</h2>
          {renderPaginationButtons()}
        </div>

        <div className={styles.tableBorder}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Photo</th>
                <th>Candidate</th>
                <th>Position</th>
                <th>Username</th>
                <th>Password</th>
                <th>Application Date</th>
                <th>Stage</th>
                <th>Interview Date</th>
                <th>Status</th>
                <th>Resume</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: "center", padding: "40px" }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      ⏳
                    </div>
                    <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#2b2b2b" }}>
                      Loading recruitment data...
                    </h3>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: "center", padding: "40px" }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      📇
                    </div>
                    <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#2b2b2b" }}>
                      No Recruitment Records
                    </h3>
                    <p style={{ fontSize: "14px", color: "#999" }}>
                      Add your first candidate to get started
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((record) => (
                  <tr key={record.id}>
                    <td>
                      {record.photo_url ? (
                        <div className={styles.photoCell}>
                          <img 
                            src={record.photo_url} 
                            alt={record.candidate}
                            className={styles.tablePhoto}
                            onClick={() => viewPhoto(record.photo_url)}
                            title="Click to view full photo"
                          />
                        </div>
                      ) : (
                        <div className={styles.noPhoto}>No Photo</div>
                      )}
                    </td>
                    <td>{record.candidate}</td>
                    <td>{record.position}</td>
                    <td>{record.username || "N/A"}</td>
                    <PasswordCell password={record.password} />
                    <td>{formatDate(record.application_date)}</td>
                    <td>
                      <span
                        className={styles.status}
                        style={{
                          backgroundColor: getOptionColor("stage", record.stage),
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
                    <td>{formatDate(record.interview_date)}</td>
                    <td>
                      <span
                        className={styles.status}
                        style={{
                          backgroundColor: getOptionColor("status", record.status),
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
                      {record.resume_url ? (
                        <div className={styles.resumeCell}>
                          <button
                            className={styles.resumeBtn}
                            onClick={() => viewResume(record.resume_url)}
                            title={`View ${getFileNameFromUrl(record.resume_url)}`}
                          >
                            📄 View Resume
                          </button>
                          <div className={styles.resumeInfo}>
                            <small>{getFileNameFromUrl(record.resume_url)}</small>
                          </div>
                        </div>
                      ) : (
                        <span className={styles.noResume}>No Resume</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.editBtn}
                          onClick={() => handleEdit(record.id)}
                          disabled={submitting}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(record.id)}
                          disabled={submitting}
                        >
                          Delete
                        </button>
                      </div>
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
                <p>Are you sure you want to delete this candidate record? This will also delete associated files.</p>
                <div className={styles.modalActions}>
                  <button onClick={cancelDelete} className={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className={styles.deleteConfirmBtn}
                    disabled={submitting}
                  >
                    {submitting ? "Deleting..." : "Delete"}
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
              
              {/* Upload Progress Bar for Edit Modal */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className={styles.progressBarContainer}>
                  <div 
                    className={styles.progressBar} 
                    style={{ width: `${uploadProgress}%` }}
                  >
                    Uploading... {uploadProgress}%
                  </div>
                </div>
              )}

              <form className={styles.editForm} onSubmit={handleUpdateCandidate}>
                <div className={styles.editFormLayout}>
                  {/* Left: Photo Section */}
                  <div className={styles.editPhotoSection}>
                    <div className={styles.photoPreview}>
                      {photoPreview ? (
                        <img 
                          src={photoPreview} 
                          alt="Candidate preview" 
                          className={styles.photoImage}
                        />
                      ) : (
                        <span>No Photo</span>
                      )}
                    </div>
                    <div className={styles.fileUpload}>
                      <label htmlFor="editPhoto" className={styles.fileUploadLabel}>
                        📂 Change Photo
                      </label>
                      <input
                        type="file"
                        id="editPhoto"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        disabled={submitting}
                      />
                      <span>{photoFile ? photoFile.name : "Keep current photo"}</span>
                    </div>
                    
                    {/* Resume Upload for Edit */}
                    <div className={styles.fileUpload} style={{ marginTop: '20px' }}>
                      <label htmlFor="editResume" className={styles.fileUploadLabel}>
                        📄 Change Resume
                      </label>
                      <input
                        type="file"
                        id="editResume"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleResumeChange}
                        disabled={submitting}
                      />
                      <span>{resumeFileName || "Keep current resume"}</span>
                    </div>
                  </div>

                  {/* Right: Form Fields */}
                  <div className={styles.editFieldsSection}>
                    {/* Username and Password Fields for Edit */}
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="editUsername">Username</label>
                        <input
                          type="text"
                          id="editUsername"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          disabled={submitting}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="editPassword">Password</label>
                        <div className={styles.passwordInputGroup}>
                          <input
                            type={showPassword ? "text" : "password"}
                            id="editPassword"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={submitting}
                          />
                          <button
                            type="button"
                            className={styles.showPasswordBtn}
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? "🙈" : "👁"}
                          </button>
                        </div>
                        <button
                          type="button"
                          className={styles.generatePasswordBtn}
                          onClick={handleGeneratePassword}
                          style={{ marginTop: '5px' }}
                          disabled={submitting}
                        >
                          Generate New Password
                        </button>
                      </div>
                    </div>

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
                          disabled={submitting}
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
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="editApplicationDate">Application Date</label>
                        <Flatpickr
                          value={formData.applicationDate}
                          onChange={([date]) =>
                            setFormData((prev) => ({
                              ...prev,
                              applicationDate: date ? date.toISOString().split('T')[0] : "",
                            }))
                          }
                          options={{
                            dateFormat: "Y-m-d",
                            maxDate: "today",
                          }}
                          disabled={submitting}
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
                          disabled={submitting}
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
                              interviewDate: date ? date.toISOString().split('T')[0] : "",
                            }))
                          }
                          options={{
                            dateFormat: "Y-m-d",
                          }}
                          disabled={submitting}
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
                          disabled={submitting}
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
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className={styles.submit}
                        disabled={submitting}
                      >
                        {submitting ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
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