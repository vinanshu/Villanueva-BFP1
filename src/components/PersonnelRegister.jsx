// components/PersonnelRegister.jsx
import React, { useState, useEffect, useRef } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import Sidebar from "./Sidebar";
import Hamburger from "./Hamburger";
import { ToastContainer, toast } from "react-toastify";
import { useSidebar } from "./SidebarContext.jsx";
import "react-toastify/dist/ReactToastify.css";
import { Title, Meta } from "react-head";
import { supabase } from "../lib/supabaseClient";
import styles from "./PersonnelRegister.module.css";

const PersonnelRegister = () => {
  const { isSidebarCollapsed } = useSidebar();
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);
  const [personnel, setPersonnel] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRankModal, setShowRankModal] = useState(false);
  const [showEditRankModal, setShowEditRankModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [selectedRank, setSelectedRank] = useState("");
  const [selectedRankImage, setSelectedRankImage] = useState("");
  const [editSelectedRank, setEditSelectedRank] = useState("");
  const [editSelectedRankImage, setEditSelectedRankImage] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [fileChosen, setFileChosen] = useState("No Photo selected");
  const [EditfileChosen, setEditFileChosen] = useState("No new Photo selected");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const formRef = useRef(null);
  const photoInputRef = useRef(null);
  const editPhotoInputRef = useRef(null);
  const rankImageInputRef = useRef(null);
  const [deleteName, setDeleteName] = useState("");
  const [generatedUsername, setGeneratedUsername] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Rank options
  const rankOptions = [
    { rank: "FO1", name: "Fire Officer 1", image: "/FO1.png" },
    { rank: "FO2", name: "Fire Officer 2", image: "/FO2.png" },
    { rank: "FO3", name: "Fire Officer 3", image: "/FO3.png" },
    { rank: "SFO1", name: "Senior Fire Officer 1", image: "/SFO1.png" },
    { rank: "SFO2", name: "Senior Fire Officer 2", image: "/SFO2.png" },
    { rank: "SFO3", name: "Senior Fire Officer 3", image: "/SFO3.png" },
    { rank: "SFO4", name: "Senior Fire Officer 4", image: "/SFO4.png" },
  ];

  // Form state
  const [formData, setFormData] = useState({
    badge_number: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    designation: "",
    station: "",
    birth_date: "",
    date_hired: "",
    retirement_date: "",
  });

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "-";
    }
  };

  // Format date for input
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    try {
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch (error) {
      console.error("Error formatting date for input:", error);
      return "";
    }
  };

  const [editFormData, setEditFormData] = useState({
    badge_number: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    designation: "",
    station: "",
    birth_date: "",
    date_hired: "",
    retirement_date: "",
  });

  // Load personnel
  const loadPersonnel = async () => {
    try {
      setLoading(true);
      setError("");
      
      const { data, error } = await supabase
        .from("personnel")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error loading personnel:", error);
        throw error;
      }
      
      setPersonnel(data || []);
    } catch (error) {
      console.error("Error loading personnel:", error);
      setError("Failed to load personnel data");
      toast.error("Failed to load personnel data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonnel();
  }, []);

  // Upload image to Supabase Storage with RLS bypass
  const uploadImage = async (file, folder = "personnel") => {
  try {
    // ... (Keep your existing file size and type validation logic here) ...

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    // Simple upload attempt
    const { data, error: uploadError } = await supabase.storage
      .from('personnel-images') // Ensure this name matches the bucket in your dashboard
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Stop if the bucket simply doesn't exist
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('does not exist')) {
        toast.error("Storage bucket 'personnel-images' not found. Please create it in the Supabase dashboard.");
        return null;
      }
      toast.error(`Upload failed: ${uploadError.message}`);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('personnel-images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    toast.error("Failed to upload image. Please try again.");
    return null;
  }
};

  // Pagination
  const paginate = (data, page, rows) => {
    const start = (page - 1) * rows;
    return data.slice(start, start + rows);
  };

  const renderPaginationButtons = () => {
    const pageCount = Math.max(1, Math.ceil(personnel.length / rowsPerPage));
    const hasNoData = personnel.length === 0;

    const buttons = [];

    // Previous button
    buttons.push(
      <button
        key="prev"
        className={`${styles.paginationBtn} ${hasNoData ? styles.disabled : ""}`}
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
        className={`${styles.paginationBtn} ${hasNoData ? styles.disabled : ""}`}
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

  const generatePassword = (length = 8) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$";
    return Array.from(
      { length },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  };

  const generateUsername = (first, middle, last) => {
    const baseUsername = `${first}${middle ? middle[0] : ""}${last}`
      .toLowerCase()
      .replace(/\s+/g, "");
    
    return `${baseUsername}${Date.now().toString().slice(-4)}`;
  };

  // Generate username
  useEffect(() => {
    if (formData.first_name || formData.last_name) {
      const username = generateUsername(
        formData.first_name,
        formData.middle_name,
        formData.last_name
      );
      setGeneratedUsername(username);
    } else {
      setGeneratedUsername("");
    }
  }, [formData.first_name, formData.middle_name, formData.last_name]);

  // Generate password
  useEffect(() => {
    if (showForm) {
      setGeneratedPassword(generatePassword());
    }
  }, [showForm]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setFileChosen(file.name);
    } else {
      setFileChosen("No Photo selected");
    }
  };

  const handleEditPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setEditFileChosen(file.name);
    } else {
      setEditFileChosen("No new Photo selected");
    }
  };

  const clearPhoto = () => {
    setPhotoPreview(null);
    setFileChosen("No Photo selected");
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  const clearEditPhoto = () => {
    setEditPhotoPreview(null);
    setEditFileChosen("No new Photo selected");
    setIsPhotoRemoved(true);
    if (editPhotoInputRef.current) {
      editPhotoInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      // Validation
      if (!formData.first_name?.trim() || !formData.last_name?.trim()) {
        toast.error("First name and last name are required!");
        return;
      }

      if (!selectedRank) {
        toast.error("Please select a rank!");
        return;
      }

      // Validate dates
      const birthDate = formData.birth_date ? new Date(formData.birth_date) : null;
      const dateHired = formData.date_hired ? new Date(formData.date_hired) : null;
      const retirementDate = formData.retirement_date ? new Date(formData.retirement_date) : null;
      const now = new Date();

      if (birthDate && dateHired && birthDate > dateHired) {
        toast.error("Birth date cannot be after date hired!");
        return;
      }

      if (dateHired && retirementDate && dateHired > retirementDate) {
        toast.error("Date hired cannot be after retirement date!");
        return;
      }

      if (birthDate && birthDate > now) {
        toast.error("Birth date cannot be in the future!");
        return;
      }

      if (dateHired && dateHired > now) {
        toast.error("Date hired cannot be in the future!");
        return;
      }

      // Prepare data
      const username = generatedUsername;
      const password = generatedPassword;

      const newPersonnel = {
        badge_number: formData.badge_number || null,
        first_name: formData.first_name.trim(),
        middle_name: formData.middle_name?.trim() || null,
        last_name: formData.last_name.trim(),
        username,
        password,
        designation: formData.designation?.trim() || null,
        station: formData.station?.trim() || null,
        rank: selectedRank,
        rank_image: selectedRankImage,
        documents: [],
        birth_date: formData.birth_date ? new Date(formData.birth_date).toISOString() : null,
        date_hired: formData.date_hired ? new Date(formData.date_hired).toISOString() : null,
        retirement_date: formData.retirement_date ? new Date(formData.retirement_date).toISOString() : null,
      };

      console.log("Attempting to insert personnel:", newPersonnel);

      // Upload photo if exists
      let photoURL = null;
      if (photoPreview && photoInputRef.current?.files?.[0]) {
        console.log("Uploading photo...");
        photoURL = await uploadImage(photoInputRef.current.files[0]);
        if (photoURL) {
          newPersonnel.photo_url = photoURL;
          newPersonnel.photo_path = photoURL;
        }
      }

      // Insert into Supabase
      const { data, error: insertError } = await supabase
        .from("personnel")
        .insert([newPersonnel])
        .select()
        .single();

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        
        if (insertError.code === '42501') {
          toast.error("Permission denied. Please check Row Level Security policies.");
          
          // Try to disable RLS temporarily or check policies
          try {
            // You might need to run these SQL commands in Supabase dashboard:
            // ALTER TABLE personnel DISABLE ROW LEVEL SECURITY;
            // or create proper policies
            toast.info("Please check RLS policies in Supabase dashboard.");
          } catch (rlError) {
            console.error("RLS error:", rlError);
          }
        } else if (insertError.code === '23505') {
          toast.error("Username or badge number already exists. Please use different values.");
        } else if (insertError.code === '23514') {
          toast.error("Invalid date sequence. Please check: Birth Date ≤ Date Hired ≤ Retirement Date");
        } else {
          toast.error(`Failed to add personnel: ${insertError.message}`);
        }
        throw insertError;
      }

      console.log("Insert successful:", data);

      await loadPersonnel();
      resetForm();
      setShowForm(false);

      toast.success("Personnel registered successfully!");
    } catch (error) {
      console.error("Error adding personnel:", error);
      if (!error.message?.includes("already exists") && 
          !error.message?.includes("Permission denied") &&
          !error.message?.includes("Invalid date")) {
        toast.error("Failed to add personnel. Please try again.");
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");

      if (!editingPerson || !editingPerson.id) {
        toast.error("Invalid personnel record. Cannot update.");
        return;
      }

      // Validate dates
      const birthDate = editFormData.birth_date ? new Date(editFormData.birth_date) : null;
      const dateHired = editFormData.date_hired ? new Date(editFormData.date_hired) : null;
      const retirementDate = editFormData.retirement_date ? new Date(editFormData.retirement_date) : null;
      const now = new Date();

      if (birthDate && dateHired && birthDate > dateHired) {
        toast.error("Birth date cannot be after date hired!");
        return;
      }

      if (dateHired && retirementDate && dateHired > retirementDate) {
        toast.error("Date hired cannot be after retirement date!");
        return;
      }

      if (birthDate && birthDate > now) {
        toast.error("Birth date cannot be in the future!");
        return;
      }

      if (dateHired && dateHired > now) {
        toast.error("Date hired cannot be in the future!");
        return;
      }

      // Upload new photo
      let finalPhotoURL = editingPerson.photo_url;
      let finalPhotoPath = editingPerson.photo_path;
      if (editPhotoPreview && editPhotoInputRef.current?.files?.[0]) {
        finalPhotoURL = await uploadImage(editPhotoInputRef.current.files[0]);
        finalPhotoPath = finalPhotoURL;
      } else if (isPhotoRemoved) {
        finalPhotoURL = null;
        finalPhotoPath = null;
      }

      const updatedPersonnel = {
        id: editingPerson.id,
        badge_number: editFormData.badge_number || null,
        first_name: editFormData.first_name.trim(),
        middle_name: editFormData.middle_name?.trim() || null,
        last_name: editFormData.last_name.trim(),
        designation: editFormData.designation?.trim() || null,
        station: editFormData.station?.trim() || null,
        rank: editSelectedRank,
        rank_image: editSelectedRankImage,
        photo_url: finalPhotoURL,
        photo_path: finalPhotoPath,
        birth_date: editFormData.birth_date ? new Date(editFormData.birth_date).toISOString() : null,
        date_hired: editFormData.date_hired ? new Date(editFormData.date_hired).toISOString() : null,
        retirement_date: editFormData.retirement_date ? new Date(editFormData.retirement_date).toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      console.log("Updating personnel:", updatedPersonnel);

      // Update in Supabase
      const { data, error: updateError } = await supabase
        .from("personnel")
        .update(updatedPersonnel)
        .eq("id", editingPerson.id)
        .select()
        .single();

      if (updateError) {
        console.error("Supabase update error:", updateError);
        
        if (updateError.code === '42501') {
          toast.error("Permission denied. Please check Row Level Security policies.");
        } else if (updateError.code === '23514') {
          toast.error("Invalid date sequence. Please check: Birth Date ≤ Date Hired ≤ Retirement Date");
        } else {
          toast.error(`Failed to update personnel: ${updateError.message}`);
        }
        throw updateError;
      }

      console.log("Update successful:", data);

      setPersonnel((prev) =>
        prev.map((p) => (p.id === editingPerson.id ? data : p))
      );

      setShowEditModal(false);
      setEditingPerson(null);
      setEditPhotoPreview(null);
      setIsPhotoRemoved(false);

      toast.success("Personnel updated successfully!");
    } catch (error) {
      console.error("Error updating personnel:", error);
      if (!error.message) {
        toast.error("Failed to update personnel. Please try again.");
      }
    }
  };

  const handleCloseEditModal = () => {
    if (editingPerson) {
      toast.info("No changes made. Modal closed.");
    }
    setShowEditModal(false);
    setEditingPerson(null);
    setEditPhotoPreview(null);
    setEditFileChosen("No new Photo selected");
    setIsPhotoRemoved(false);
  };

  const openEdit = (person) => {
    try {
      setError("");
      if (!person || !person.id) {
        toast.error("Invalid personnel record selected.");
        return;
      }
      setEditingPerson(person);
      setEditFormData({
        badge_number: person.badge_number || "",
        first_name: person.first_name || "",
        middle_name: person.middle_name || "",
        last_name: person.last_name || "",
        designation: person.designation || "",
        station: person.station || "",
        birth_date: formatDateForInput(person.birth_date),
        date_hired: formatDateForInput(person.date_hired),
        retirement_date: formatDateForInput(person.retirement_date),
      });
      setEditSelectedRank(person.rank || "");
      setEditSelectedRankImage(person.rank_image || "");
      setEditPhotoPreview(null);
      setIsPhotoRemoved(false);
      setShowEditModal(true);
    } catch (error) {
      console.error("Error opening edit:", error);
      setError("Failed to load personnel data for editing.");
    }
  };

  const resetForm = () => {
    setFormData({
      badge_number: "",
      first_name: "",
      middle_name: "",
      last_name: "",
      designation: "",
      station: "",
      birth_date: "",
      date_hired: "",
      retirement_date: "",
    });
    setSelectedRank("");
    setSelectedRankImage("");
    setPhotoPreview(null);
    setFileChosen("No Photo selected");
    setGeneratedUsername("");
    setGeneratedPassword(generatePassword());
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  const handleDeleteClick = (id, name) => {
    if (!id) {
      toast.error("Invalid ID — cannot delete.");
      return;
    }

    setDeleteId(id);
    setDeleteName(name);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePersonnel = async () => {
    try {
      if (!deleteId) {
        toast.error("No personnel selected for deletion.");
        return;
      }

      const { error } = await supabase
        .from("personnel")
        .delete()
        .eq("id", deleteId);

      if (error) {
        console.error("Supabase delete error:", error);
        
        if (error.code === '42501') {
          toast.error("Permission denied. Please check Row Level Security policies.");
        } else {
          toast.error("Failed to delete personnel.");
        }
        throw error;
      }

      setPersonnel((prev) => prev.filter((p) => p.id !== deleteId));
      toast.warn("Personnel deleted successfully!");
      setShowDeleteConfirm(false);
      setDeleteId(null);
      setDeleteName("");
    } catch (error) {
      console.error("Error deleting personnel:", error);
      if (!error.message?.includes("Permission denied")) {
        toast.error("Failed to delete personnel.");
      }
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteId(null);
    setDeleteName("");
  };

  const selectRank = (rank, image) => {
    setSelectedRank(rank);
    setSelectedRankImage(image);
    setShowRankModal(false);
  };

  const selectEditRank = (rank, image) => {
    setEditSelectedRank(rank);
    setEditSelectedRankImage(image);
    setShowEditRankModal(false);
  };

  const getRankDisplay = (person) => {
    if (person.rank_image) {
      return (
        <div className={styles.prRankDisplay}>
          <div className={`${styles.rankIcon} ${person.rank}`}>
            <img src={person.rank_image} alt={person.rank} />
          </div>
          <span>{person.rank}</span>
        </div>
      );
    }
    return person.rank || "-";
  };

  const PasswordCell = ({ password }) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <td>
        <span className={styles.prPasswordMask}>
          {showPassword ? password : "••••••"}
        </span>
        <button
          className={styles.prTogglePass}
          onClick={() => setShowPassword(!showPassword)}
          type="button"
        >
          {showPassword ? "🙈" : "👁"}
        </button>
      </td>
    );
  };

  // Handle click outside modals
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEditModal && event.target.classList.contains(styles.modal)) {
        setShowEditModal(false);
      }
      if (showRankModal && event.target.classList.contains(styles.rankModal)) {
        setShowRankModal(false);
      }
      if (showEditRankModal && event.target.classList.contains(styles.rankModal)) {
        setShowEditRankModal(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showEditModal, showRankModal, showEditRankModal]);

  if (loading) {
    return (
      <div className={styles.prContainer}>
        <Title>Personnel Register | BFP Villanueva</Title>
        <Meta name="robots" content="noindex, nofollow" />
        <Hamburger />
        <Sidebar />
        <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <div style={{ textAlign: "center", padding: "50px" }}>
            Loading personnel data...
          </div>
        </div>
      </div>
    );
  }

  // Get current personnel for display
  const currentPersonnel = paginate(personnel, currentPage, rowsPerPage);

  return (
    <div className={styles.prContainer}>
      <Title>Personnel Register | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />
      <Hamburger />
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <Sidebar />
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <h1>Personnel Registration</h1>

        {error && <div className={styles.prErrorMessage}>{error}</div>}

        <div className={styles.prCard}>
          <h2>Register New Personnel</h2>
          <button
            className={`${styles.prShowFormBtn} ${styles.prSubmit}${
              showForm ? styles.showing : ""
            }`}
            onClick={() => setShowForm(!showForm)}
            type="button"
          >
            {showForm ? "Hide Form" : "Add New Personnel"}
          </button>

          <form
            className={`${styles.prForm} ${styles.prLayout} ${
              showForm ? styles.show : ""
            }`}
            onSubmit={handleSubmit}
            ref={formRef}
          >
            <div className={styles.prPhotoSection}>
              <div className={styles.prPhotoPreview} id="photo-preview">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" />
                ) : (
                  <span>No Photo</span>
                )}
              </div>
              <div className={styles.prFileUpload}>
                <label htmlFor="photo" className={styles.prFileUploadLabel}>
                  📂 Upload Photo
                </label>
                <input
                  type="file"
                  id="photo"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  ref={photoInputRef}
                />
                <span id="file-chosen">{fileChosen}</span>
              </div>
              {photoPreview && (
                <button
                  type="button"
                  id="clear-photo"
                  className={styles.prClearBtn}
                  onClick={clearPhoto}
                >
                  Clear Photo
                </button>
              )}
            </div>

            <div className={styles.prInfoSection}>
              <div className={styles.prFormRow}>
                <div className={styles.prFormGroup}>
                  <div className={styles.floatingGroup}>
                    <input
                      type="text"
                      id="badge-number"
                      className={styles.floatingInput}
                      placeholder=" "
                      value={formData.badge_number}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          badge_number: e.target.value,
                        }))
                      }
                    />
                    <label htmlFor="badge-number" className={styles.floatingLabel}>
                      Badge Number (Optional)
                    </label>
                  </div>
                </div>
                <div className={styles.prFormGroup}>
                  <div className={styles.floatingGroup} id="rank-floating-group">
                    <button
                      type="button"
                      id="rank-trigger"
                      className={styles.rankTrigger}
                      onClick={() => setShowRankModal(true)}
                    >
                      <div className={styles.selectedRank}>
                        {selectedRank ? (
                          <>
                            <div className={`${styles.rankIcon} ${selectedRank}`}>
                              <img src={selectedRankImage} alt={selectedRank} />
                            </div>
                            <span>
                              {rankOptions.find((r) => r.rank === selectedRank)?.name}
                            </span>
                          </>
                        ) : (
                          <span className={styles.placeholder}>Select Rank *</span>
                        )}
                      </div>
                    </button>
                    <input
                      type="hidden"
                      id="rank"
                      value={selectedRank}
                      ref={rankImageInputRef}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className={styles.prFormRow}>
                <div className={styles.prFormGroup}>
                  <div className={styles.floatingGroup}>
                    <input
                      type="text"
                      id="first-name"
                      className={styles.floatingInput}
                      placeholder=" "
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          first_name: e.target.value,
                        }))
                      }
                      required
                    />
                    <label htmlFor="first-name" className={styles.floatingLabel}>
                      First Name *
                    </label>
                  </div>
                </div>
                <div className={styles.prFormGroup}>
                  <div className={styles.floatingGroup}>
                    <input
                      type="text"
                      id="middle-name"
                      className={styles.floatingInput}
                      placeholder=" "
                      value={formData.middle_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          middle_name: e.target.value,
                        }))
                      }
                    />
                    <label htmlFor="middle-name" className={styles.floatingLabel}>
                      Middle Name
                    </label>
                  </div>
                </div>
                <div className={styles.prFormGroup}>
                  <div className={styles.floatingGroup}>
                    <input
                      type="text"
                      id="last-name"
                      className={styles.floatingInput}
                      placeholder=" "
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          last_name: e.target.value,
                        }))
                      }
                      required
                    />
                    <label htmlFor="last-name" className={styles.floatingLabel}>
                      Last Name *
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.prFormRow}>
                <div className={styles.prFormGroup}>
                  <div className={styles.floatingGroup}>
                    <input
                      type="text"
                      id="designation"
                      className={styles.floatingInput}
                      placeholder=" "
                      value={formData.designation}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          designation: e.target.value,
                        }))
                      }
                    />
                    <label htmlFor="designation" className={styles.floatingLabel}>
                      Designation
                    </label>
                  </div>
                </div>
                <div className={styles.prFormGroup}>
                  <div className={styles.floatingGroup}>
                    <input
                      type="text"
                      id="station"
                      className={styles.floatingInput}
                      placeholder=" "
                      value={formData.station}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          station: e.target.value,
                        }))
                      }
                    />
                    <label htmlFor="station" className={styles.floatingLabel}>
                      Station Assignment
                    </label>
                  </div>
                </div>
              </div>
              
              <div className={styles.prFormRow}>
                <div className={styles.prFormGroup}>
                  <div className={styles.floatingGroup}>
                    <input
                      type="text"
                      id="username-preview"
                      className={`${styles.floatingInput} ${styles.readOnlyField}`}
                      placeholder=" "
                      value={generatedUsername}
                      readOnly
                      disabled
                    />
                    <label htmlFor="username-preview" className={styles.floatingLabel}>
                      Username (Auto-generated)
                    </label>
                  </div>
                </div>
                <div className={styles.prFormGroup}>
                  <div className={styles.floatingGroup}>
                    <input
                      type="text"
                      id="password-preview"
                      className={`${styles.floatingInput} ${styles.readOnlyField}`}
                      placeholder=" "
                      value={generatedPassword}
                      readOnly
                      disabled
                    />
                    <label htmlFor="password-preview" className={styles.floatingLabel}>
                      Password (Auto-generated)
                    </label>
                  </div>
                  <button
                    type="button"
                    className={styles.regeneratePasswordBtn}
                    onClick={() => setGeneratedPassword(generatePassword())}
                  >
                    Regenerate
                  </button>
                </div>
              </div>
              
              <div className={styles.prFormRow}>
                <div className={styles.prFormGroup}>
                  <div className={styles.floatingGroup}>
                    <Flatpickr
                      value={formData.birth_date}
                      onChange={([date]) =>
                        setFormData((prev) => ({ ...prev, birth_date: date }))
                      }
                      options={{
                        dateFormat: "Y-m-d",
                        maxDate: "today",
                      }}
                      className={styles.floatingInput}
                      placeholder=" "
                    />
                    <label htmlFor="birth-date" className={styles.floatingLabel}>
                      Birth Date
                    </label>
                  </div>
                </div>
                <div className={styles.prFormGroup}>
                  <div className={styles.floatingGroup}>
                    <Flatpickr
                      value={formData.date_hired}
                      onChange={([date]) =>
                        setFormData((prev) => ({ ...prev, date_hired: date }))
                      }
                      options={{
                        dateFormat: "Y-m-d",
                        maxDate: "today",
                      }}
                      className={styles.floatingInput}
                      placeholder=" "
                    />
                    <label htmlFor="date-hired" className={styles.floatingLabel}>
                      Date Hired
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.prDateValidationNote}>
                <small>Note: Birth Date ≤ Date Hired ≤ Retirement Date</small>
              </div>

              <div className={styles.prFormActions}>
                <button
                  type="button"
                  className={styles.prCancel}
                  onClick={resetForm}
                >
                  Clear Information
                </button>
                <button type="submit" className={styles.prSubmit}>
                  Register Personnel
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className={styles.prTableHeaderSection}>
          <h2>All Registered Personnel</h2>
          {renderPaginationButtons()}
        </div>

        <div className={styles.prTableBorder}>
          <table className={styles.prTable}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Badge No.</th>
                <th>First</th>
                <th>Middle</th>
                <th>Last</th>
                <th>Designation</th>
                <th>Station</th>
                <th>Birth Date</th>
                <th>Date Hired</th>
                <th>Retirement</th>
                <th>Username</th>
                <th>Password</th>
                <th>Photo</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentPersonnel.length === 0 ? (
                <tr>
                  <td colSpan="14" style={{ textAlign: "center", padding: "40px" }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>📇</div>
                    <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#2b2b2b", marginBottom: "8px" }}>
                      No Personnel Registered
                    </h3>
                    <p style={{ fontSize: "14px", color: "#999" }}>
                      BFP personnel register is empty - add your first team member
                    </p>
                  </td>
                </tr>
              ) : (
                currentPersonnel.map((person) => (
                  <tr key={person.id}>
                    <td>{getRankDisplay(person)}</td>
                    <td>{person.badge_number || "-"}</td>
                    <td>{person.first_name}</td>
                    <td>{person.middle_name || "-"}</td>
                    <td>{person.last_name}</td>
                    <td>{person.designation || "-"}</td>
                    <td>{person.station || "-"}</td>
                    <td>{formatDate(person.birth_date)}</td>
                    <td>{formatDate(person.date_hired)}</td>
                    <td>{formatDate(person.retirement_date)}</td>
                    <td>{person.username}</td>
                    <PasswordCell password={person.password} />
                    <td>
                      {person.photo_url ? (
                        <img
                          src={person.photo_url}
                          className={styles.prPhotoThumb}
                          alt="Photo"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/50";
                          }}
                        />
                      ) : (
                        "No Photo"
                      )}
                    </td>
                    <td>
                      <button
                        className={styles.prEditBtn}
                        onClick={() => openEdit(person)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className={styles.prDeleteBtn}
                        onClick={() =>
                          handleDeleteClick(
                            person.id,
                            `${person.first_name} ${person.last_name}`
                          )
                        }
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
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div id="editModal" className={`${styles.modal} ${styles.show}`}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Edit Personnel</h2>
              <button
                onClick={handleCloseEditModal}
                className={styles.ShowEditModalCloseBtn}
              >
                &times;
              </button>
            </div>

            <div className={styles.prEditModalLayout}>
              <div className={styles.prEditModalPhotoSection}>
                <div className={styles.prEditModalPhotoPreview}>
                  {editPhotoPreview ? (
                    <img src={editPhotoPreview} alt="New Preview" />
                  ) : editingPerson?.photo_url ? (
                    <img src={editingPerson.photo_url} alt="Current" />
                  ) : (
                    <span>No Photo</span>
                  )}
                </div>
                <div className={styles.prEditModalFileUpload}>
                  <label htmlFor="edit-photo" className={styles.prEditModalFileUploadLabel}>
                    📂 Change Photo
                  </label>
                  <input
                    type="file"
                    id="edit-photo"
                    accept="image/*"
                    onChange={handleEditPhotoChange}
                    ref={editPhotoInputRef}
                  />
                  <span id="file-chosens">{EditfileChosen}</span>
                </div>
                {(editPhotoPreview || editingPerson?.photo_url) && (
                  <button
                    type="button"
                    className={styles.prEditModalClearBtn}
                    onClick={clearEditPhoto}
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              <form id="edit-form" onSubmit={handleEditSubmit}>
                <input type="hidden" id="edit-id" value={editingPerson?.id} />

                <div className={styles.prFormRow}>
                  <div className={styles.prFormGroup}>
                    <label htmlFor="edit-badge">Badge Number</label>
                    <input
                      type="text"
                      id="edit-badge"
                      value={editFormData.badge_number}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          badge_number: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className={styles.prFormGroup}>
                    <label htmlFor="edit-rank">Rank</label>
                    <div className={styles.prEditRankGroup}>
                      <button
                        type="button"
                        id="edit-rank-trigger"
                        className={styles.prEditRankTrigger}
                        onClick={() => setShowEditRankModal(true)}
                      >
                        <div className={styles.selectedRank}>
                          {editSelectedRank ? (
                            <>
                              <div className={`${styles.rankIcon} ${editSelectedRank}`}>
                                <img src={editSelectedRankImage} alt={editSelectedRank} />
                              </div>
                              <span>
                                {rankOptions.find((r) => r.rank === editSelectedRank)?.name}
                              </span>
                            </>
                          ) : (
                            <span className={styles.placeholder}>Select Rank</span>
                          )}
                        </div>
                      </button>
                      <input type="hidden" id="edit-rank" value={editSelectedRank} />
                      <input type="hidden" id="edit-rank-image" value={editSelectedRankImage} />
                    </div>
                  </div>
                </div>

                <div className={styles.prFormRow}>
                  <div className={styles.prFormGroup}>
                    <label htmlFor="edit-first">First Name *</label>
                    <input
                      type="text"
                      id="edit-first"
                      value={editFormData.first_name}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          first_name: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className={styles.prFormGroup}>
                    <label htmlFor="edit-middle">Middle Name</label>
                    <input
                      type="text"
                      id="edit-middle"
                      value={editFormData.middle_name}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          middle_name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className={styles.prFormGroup}>
                    <label htmlFor="edit-last">Last Name *</label>
                    <input
                      type="text"
                      id="edit-last"
                      value={editFormData.last_name}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          last_name: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className={styles.prFormRow}>
                  <div className={styles.prFormGroup}>
                    <label htmlFor="edit-designation">Designation</label>
                    <input
                      type="text"
                      id="edit-designation"
                      value={editFormData.designation}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          designation: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className={styles.prFormGroup}>
                    <label htmlFor="edit-station">Station</label>
                    <input
                      type="text"
                      id="edit-station"
                      value={editFormData.station}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          station: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className={styles.prFormGroup}>
                    <label htmlFor="edit-retirement">Retirement Date</label>
                    <Flatpickr
                      value={editFormData.retirement_date}
                      onChange={([date]) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          retirement_date: date,
                        }))
                      }
                      options={{
                        dateFormat: "Y-m-d",
                        minDate: editFormData.date_hired || "today",
                      }}
                    />
                  </div>
                </div>
                
                <div className={styles.prFormRow}>
                  <div className={styles.prFormGroup}>
                    <label htmlFor="edit-birth">Birth Date</label>
                    <Flatpickr
                      value={editFormData.birth_date}
                      onChange={([date]) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          birth_date: date,
                        }))
                      }
                      options={{
                        dateFormat: "Y-m-d",
                        maxDate: editFormData.date_hired || "today",
                      }}
                    />
                  </div>
                  <div className={styles.prFormGroup}>
                    <label htmlFor="edit-hired">Date Hired</label>
                    <Flatpickr
                      value={editFormData.date_hired}
                      onChange={([date]) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          date_hired: date,
                        }))
                      }
                      options={{
                        dateFormat: "Y-m-d",
                        minDate: editFormData.birth_date || "1900-01-01",
                        maxDate: editFormData.retirement_date || "today",
                      }}
                    />
                  </div>
                  <div className={styles.prFormGroup}></div>
                </div>

                <div className={styles.prDateValidationNote}>
                  <small>Note: Birth Date ≤ Date Hired ≤ Retirement Date</small>
                </div>

                <div className={styles.prFormActions}>
                  <button
                    onClick={handleCloseEditModal}
                    type="button"
                    className={styles.prCancel}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.prSubmit}>
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Rank Modal */}
      {showRankModal && (
        <div id="rankModal" className={`${styles.rankModal} ${styles.show}`}>
          <div className={styles.rankModalContent}>
            <div className={styles.rankModalHeader}>
              <h2>Select Rank</h2>
              <button
                className={styles.rankModalClose}
                onClick={() => setShowRankModal(false)}
              >
                &times;
              </button>
            </div>
            <div className={styles.rankOptions}>
              {rankOptions.map((option) => (
                <div
                  key={option.rank}
                  className={`${styles.rankOption} ${option.rank} ${
                    selectedRank === option.rank ? styles.selected : ""
                  }`}
                  onClick={() => selectRank(option.rank, option.image)}
                >
                  <div className={styles.rankIcon}>
                    <img src={option.image} alt={option.rank} />
                  </div>
                  <div className={styles.rankName}>{option.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Rank Modal */}
      {showEditRankModal && (
        <div id="editRankModal" className={`${styles.rankModal} ${styles.show}`}>
          <div className={styles.rankModalContent}>
            <div className={styles.rankModalHeader}>
              <h2>Select Rank</h2>
              <button
                className={styles.rankModalClose}
                onClick={() => setShowEditRankModal(false)}
              >
                &times;
              </button>
            </div>
            <div className={styles.rankOptions}>
              {rankOptions.map((option) => (
                <div
                  key={option.rank}
                  className={`${styles.rankOption} ${option.rank} ${
                    editSelectedRank === option.rank ? styles.selected : ""
                  }`}
                  onClick={() => selectEditRank(option.rank, option.image)}
                >
                  <div className={styles.rankIcon}>
                    <img src={option.image} alt={option.rank} />
                  </div>
                  <div className={styles.rankName}>{option.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className={styles.preModalDelete} style={{ display: "flex" }}>
          <div className={styles.preModalContentDelete} style={{ maxWidth: "450px" }}>
            <div className={styles.preModalHeaderDelete}>
              <h2 style={{ marginLeft: "30px" }}>Confirm Deletion</h2>
              <span className={styles.preCloseBtn} onClick={cancelDelete}>
                &times;
              </span>
            </div>

            <div className={styles.preModalBody}>
              <div className={styles.deleteConfirmationContent}>
                <div className={styles.deleteWarningIcon}>⚠️</div>
                <p className={styles.deleteConfirmationText}>
                  Are you sure you want to delete the personnel record for
                </p>
                <p className={styles.documentNameHighlight}>"{deleteName}"?</p>
                <p className={styles.deleteWarning}>
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className={styles.preModalActions}>
              <button
                className={`${styles.preBtn} ${styles.preCancelBtn}`}
                onClick={cancelDelete}
              >
                Cancel
              </button>
              <button
                className={`${styles.preBtn} ${styles.deleteConfirmBtn}`}
                onClick={confirmDeletePersonnel}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonnelRegister;