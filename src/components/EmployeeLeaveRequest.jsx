import React, { useState, useEffect } from "react";
import styles from "./EmployeeLeaveRequest.module.css";
import Hamburger from "./Hamburger";
import EmployeeSidebar from "./EmployeeSidebar";
import { useSidebar } from "./SidebarContext.jsx";
import { useAuth } from "./AuthContext";
import { Title, Meta } from "react-head";
import { supabase } from "../lib/supabaseClient";

const EmployeeLeaveRequest = () => {
  const [formData, setFormData] = useState({
    employeeName: "",
    dateOfFiling: "",
    leaveType: "",
    startDate: "",
    endDate: "",
    numDays: 0,
  });

  const [leaveBalance, setLeaveBalance] = useState({
    vacation: 15.00,
    sick: 15.00,
    emergency: 5.00,
  });

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [chosenLocation, setChosenLocation] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { isSidebarCollapsed } = useSidebar();
  const { user, loading: authLoading } = useAuth();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Format date as YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };

  // Calculate number of days between start and end date
  const calculateDays = (start, end) => {
    if (!start || !end) return 0;

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate) || isNaN(endDate) || endDate < startDate) return 0;

    const timeDiff = endDate - startDate;
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
  };

  // Load employee data from Supabase
  const loadEmployeeData = async () => {
    try {
      setIsLoading(true);
      console.log("Loading employee data from Supabase...");

      if (!user) {
        console.warn("No user found in AuthContext");
        window.location.href = "/index.html";
        return;
      }

      console.log("Current user from AuthContext:", user);

      // Load employee details
      const { data: employeeData, error: employeeError } = await supabase
        .from("personnel")
        .select("*")
        .eq("username", user.username)
        .single();

      if (employeeError) {
        console.error("Error loading employee:", employeeError);
        throw employeeError;
      }

      if (employeeData) {
        console.log("Found employee record:", employeeData);
        
        // Store employee ID
        setEmployeeId(employeeData.id);
        
        const middle = employeeData.middle_name ? ` ${employeeData.middle_name}` : "";
        const fullName = `${employeeData.first_name}${middle} ${employeeData.last_name}`.trim();

        setFormData((prev) => ({
          ...prev,
          employeeName: fullName,
        }));

        // Set leave balance from employee record
        setLeaveBalance({
          vacation: parseFloat(employeeData.earned_vacation) || 15.00,
          sick: parseFloat(employeeData.earned_sick) || 15.00,
          emergency: parseFloat(employeeData.earned_emergency) || 5.00,
        });
      }
    } catch (error) {
      console.error("Error loading employee data:", error);
      setErrorMessage("Failed to load employee data. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize form when user is loaded
  useEffect(() => {
    if (!authLoading && user) {
      loadEmployeeData();

      const today = formatDate(new Date());
      const minStartDate = new Date();
      minStartDate.setDate(minStartDate.getDate() + 5);
      const minStart = formatDate(minStartDate);

      setFormData((prev) => ({
        ...prev,
        dateOfFiling: today,
        startDate: minStart,
        endDate: minStart,
      }));

      const days = calculateDays(minStart, minStart);
      setFormData((prev) => ({ ...prev, numDays: days }));
    }
  }, [user, authLoading]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      console.log("No user found, redirecting to login...");
      window.location.href = "/index.html";
    }
  }, [user, authLoading]);

  // Update days when start or end date changes
  useEffect(() => {
    const days = calculateDays(formData.startDate, formData.endDate);
    setFormData((prev) => ({ ...prev, numDays: days }));
  }, [formData.startDate, formData.endDate]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "leaveType" && value === "Vacation") {
      setShowLocationModal(true);
      // Reset chosen location when changing to vacation
      setChosenLocation("");
    } else if (name === "leaveType") {
      setChosenLocation("");
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "startDate" && formData.endDate < value) {
      setFormData((prev) => ({
        ...prev,
        endDate: value,
      }));
    }
  };

  // Handle location confirmation
  const handleConfirmLocation = () => {
    if (selectedLocation) {
      setChosenLocation(selectedLocation);
      setShowLocationModal(false);
    } else {
      alert("Please select a location.");
    }
  };

  // Close location modal without selecting
  const handleCloseLocationModal = () => {
    setShowLocationModal(false);
    // If they close without selecting, reset leave type
    if (formData.leaveType === "Vacation") {
      setFormData(prev => ({ ...prev, leaveType: "" }));
    }
    setSelectedLocation("");
  };

  // Simple direct insert function without .select()
  const submitLeaveRequest = async (leaveRequestData) => {
    try {
      console.log("Attempting to submit leave request:", leaveRequestData);
      
      // Try simple insert without .select() first
      const { error } = await supabase
        .from("leave_requests")
        .insert([leaveRequestData]);

      if (error) {
        console.error("Error with simple insert:", error);
        throw error;
      }

      console.log("Leave request submitted successfully (simple insert)");
      return { success: true };
      
    } catch (error) {
      console.error("Error in submitLeaveRequest:", error);
      
      // If first method fails, try with timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${supabase.supabaseUrl}/rest/v1/leave_requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabase.supabaseKey,
            'Authorization': `Bearer ${supabase.supabaseKey}`
          },
          body: JSON.stringify(leaveRequestData),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log("Leave request submitted via fetch:", data);
        return { success: true, data };
        
      } catch (fetchError) {
        console.error("Error with fetch method:", fetchError);
        throw fetchError;
      }
    }
  };

  // Handle form submission to Supabase
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setErrorMessage("");

    if (!user) {
      alert("Please log in to submit a leave request.");
      window.location.href = "/index.html";
      setSubmitLoading(false);
      return;
    }

    // Validate form data
    if (!formData.leaveType) {
      alert("Please select a leave type.");
      setSubmitLoading(false);
      return;
    }

    // For vacation leave, location is required
    if (formData.leaveType === "Vacation" && !chosenLocation) {
      alert("Please select a location for vacation leave.");
      setShowLocationModal(true);
      setSubmitLoading(false);
      return;
    }

    // Validate dates
    if (!formData.startDate || !formData.endDate) {
      alert("Please select both start and end dates.");
      setSubmitLoading(false);
      return;
    }

    // Validate that numDays is a positive number
    if (!formData.numDays || formData.numDays <= 0) {
      alert("Please enter a valid number of days.");
      setSubmitLoading(false);
      return;
    }

    try {
      console.log("Submitting leave request...");
      console.log("Form data:", formData);
      console.log("Employee ID:", employeeId);
      console.log("Username:", user.username);
      console.log("Location:", chosenLocation);
      console.log("Number of days:", formData.numDays);

      // Prepare the data object
      const leaveRequestData = {
        personnel_id: employeeId,
        username: user.username,
        employee_name: formData.employeeName,
        leave_type: formData.leaveType,
        location: formData.leaveType === "Vacation" ? chosenLocation : null,
        date_of_filing: formData.dateOfFiling,
        start_date: formData.startDate,
        end_date: formData.endDate,
        num_days: parseInt(formData.numDays),
        status: 'Pending',
        reason: `Leave request for ${formData.leaveType.toLowerCase()} leave`,
        submitted_at: new Date().toISOString()
      };

      console.log("Sending data to Supabase:", leaveRequestData);

      // Submit the leave request
      const result = await submitLeaveRequest(leaveRequestData);

      if (result.success) {
        console.log("Leave request submitted successfully");

        // Show success toast
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);

        // Reset form
        const today = formatDate(new Date());
        const minStartDate = new Date();
        minStartDate.setDate(minStartDate.getDate() + 5);
        const minStart = formatDate(minStartDate);

        setFormData({
          employeeName: formData.employeeName,
          dateOfFiling: today,
          leaveType: "",
          startDate: minStart,
          endDate: minStart,
          numDays: calculateDays(minStart, minStart),
        });

        setChosenLocation("");
        setSelectedLocation("");

        // Clear any previous error messages
        setErrorMessage("");
      }

    } catch (error) {
      console.error("Error saving leave request:", error);
      
      let errorMsg = "Failed to submit leave request. Please try again.";
      
      if (error.message?.includes("network") || error.message?.includes("connection")) {
        errorMsg = "Network error. Please check your internet connection and try again.";
      } else if (error.message?.includes("timeout")) {
        errorMsg = "Request timed out. Please try again.";
      } else if (error.code === '23503') {
        errorMsg = "Employee not found in database. Please contact administrator.";
      } else if (error.code === '23502') {
        errorMsg = "Missing required field. Please fill all required fields.";
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
      alert(errorMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    const today = formatDate(new Date());
    const minStartDate = new Date();
    minStartDate.setDate(minStartDate.getDate() + 5);
    const minStart = formatDate(minStartDate);

    setFormData({
      employeeName: formData.employeeName,
      dateOfFiling: today,
      leaveType: "",
      startDate: minStart,
      endDate: minStart,
      numDays: calculateDays(minStart, minStart),
    });

    setChosenLocation("");
    setSelectedLocation("");
    setShowLocationModal(false);
    setErrorMessage("");
  };

  // Calculate progress percentages
  const maxLeaveDays = 15;
  const vacationPercent = Math.min((leaveBalance.vacation / maxLeaveDays) * 100, 100);
  const sickPercent = Math.min((leaveBalance.sick / maxLeaveDays) * 100, 100);
  const emergencyPercent = Math.min((leaveBalance.emergency / maxLeaveDays) * 100, 100);

  // Show loading while checking authentication
  if (authLoading || isLoading) {
    return (
      <div className="app">
        <EmployeeSidebar />
        <Hamburger />
        <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <div className={styles.leaveFormContainer}>
            <div className={styles.loading}>Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if no user (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="app">
      <Title>Employee Leave Request | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />
      <EmployeeSidebar />
      <Hamburger />
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className={styles.leaveFormContainer}>
          <h2 className={styles.pageTitle}>Request Leave</h2>

          {/* Error Message Display */}
          {errorMessage && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              {errorMessage}
            </div>
          )}

          <div className={styles.contentWrapper}>
            {/* Leave Balance Card */}
            <div className={styles.leaveBalance}>
              <h3>Leave Balance</h3>
              <ul>
                <li>
                  <div className={styles.label}>
                    <span>Vacation</span>
                    <span>{leaveBalance.vacation.toFixed(2)}</span> days
                  </div>
                  <div className={styles.progress}>
                    <div
                      className={`${styles.progressBar} ${styles.progressVacation}`}
                      style={{ width: `${vacationPercent}%` }}
                    ></div>
                  </div>
                </li>

                <li>
                  <div className={styles.label}>
                    <span>Sick</span>
                    <span>{leaveBalance.sick.toFixed(2)}</span> days
                  </div>
                  <div className={styles.progress}>
                    <div
                      className={`${styles.progressBar} ${styles.progressSick}`}
                      style={{ width: `${sickPercent}%` }}
                    ></div>
                  </div>
                </li>

                <li>
                  <div className={styles.label}>
                    <span>Emergency</span>
                    <span>{leaveBalance.emergency.toFixed(2)}</span> days
                  </div>
                  <div className={styles.progress}>
                    <div
                      className={`${styles.progressBar} ${styles.progressEmergency}`}
                      style={{ width: `${emergencyPercent}%` }}
                    ></div>
                  </div>
                </li>
              </ul>
            </div>

            {/* Leave Request Form */}
            <form onSubmit={handleSubmit} className={styles.formCard}>
              <div className={styles.formGrid}>
                {/* Employee Name */}
                <div className={styles.formGroup}>
                  <input
                    type="text"
                    name="employeeName"
                    value={formData.employeeName}
                    readOnly
                    placeholder=" "
                  />
                  <label>Employee Name</label>
                </div>

                {/* Date of Filing */}
                <div className={styles.formGroup}>
                  <input
                    type="date"
                    name="dateOfFiling"
                    value={formData.dateOfFiling}
                    onChange={handleInputChange}
                    placeholder=" "
                    required
                    max={formatDate(new Date())}
                  />
                  <label>Date of Filing</label>
                </div>

                {/* Leave Type */}
                <div className={styles.formGroup}>
                  <select
                    name="leaveType"
                    value={formData.leaveType}
                    onChange={handleInputChange}
                    required
                    disabled={submitLoading}
                  >
                    <option value="" disabled hidden></option>
                    <option value="Vacation">Vacation Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Emergency">Emergency Leave</option>
                    <option value="Maternity">Maternity Leave</option>
                    <option value="Paternity">Paternity Leave</option>
                  </select>
                  <label>Leave Type</label>
                  {chosenLocation && formData.leaveType === "Vacation" && (
                    <small className={styles.chosenLocation}>
                      Location: {chosenLocation}
                    </small>
                  )}
                </div>

                {/* Start Date */}
                <div className={styles.formGroup}>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    placeholder=" "
                    required
                    min={formatDate(
                      new Date(new Date().setDate(new Date().getDate() + 5))
                    )}
                    disabled={submitLoading}
                  />
                  <label>Start Date</label>
                </div>

                {/* End Date */}
                <div className={styles.formGroup}>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    placeholder=" "
                    required
                    min={formData.startDate}
                    disabled={submitLoading}
                  />
                  <label>End Date</label>
                </div>

                {/* Number of Days */}
                <div className={styles.formGroup}>
                  <input
                    type="number"
                    name="numDays"
                    value={formData.numDays}
                    readOnly
                    placeholder=" "
                    className={styles.numDaysInput}
                  />
                  <label>Number of Days</label>
                </div>
              </div>

              <div className={styles.formButtons}>
                <button
                  type="button"
                  onClick={handleReset}
                  className={styles.btnSecondary}
                  disabled={submitLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={styles.btnPrimary}
                  disabled={submitLoading}
                >
                  {submitLoading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Location Modal */}
        <div
          className={`${styles.modal} ${
            showLocationModal ? styles.modalShow : ""
          }`}
        >
          <div className={styles.modalContent}>
            <span
              className={styles.closeBtn}
              onClick={handleCloseLocationModal}
            >
              &times;
            </span>
            <h3>Select Location for Vacation Leave</h3>
            <div className={styles.modalRadioOptions}>
              <label>
                <input
                  type="radio"
                  name="location"
                  value="Abroad"
                  checked={selectedLocation === "Abroad"}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                />
                Abroad
              </label>
              <label>
                <input
                  type="radio"
                  name="location"
                  value="Philippines"
                  checked={selectedLocation === "Philippines"}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                />
                Philippines
              </label>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={handleConfirmLocation}
                className={styles.btnPrimary}
                disabled={!selectedLocation}
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        <div className={`${styles.toast} ${showToast ? styles.toastShow : ""}`}>
          ✅ Leave request submitted successfully!
        </div>
      </div>
    </div>
  );
};

export default EmployeeLeaveRequest;