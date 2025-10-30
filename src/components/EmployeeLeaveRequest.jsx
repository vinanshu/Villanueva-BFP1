import React, { useState, useEffect, useRef } from "react";
import styles from "./EmployeeLeaveRequest.module.css";
import Hamburger from "./Hamburger";
import EmployeeSidebar from "./EmployeeSidebar";
import { useSidebar } from "./SidebarContext.jsx";
import { useAuth } from "./AuthContext"; // Import useAuth
import { Title, Meta } from "react-head";

// Import your actual IndexedDB functions
import {
  addRecord,
  getPersonnelList,
  STORE_LEAVE,
} from "./db.jsx";

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
    vacation: 0,
    sick: 0,
    emergency: 0,
  });

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [chosenLocation, setChosenLocation] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { isSidebarCollapsed } = useSidebar();
  const { user, loading: authLoading } = useAuth(); // Get user from AuthContext

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

  // Load employee data
  const loadEmployee = async () => {
    try {
      setIsLoading(true);
      console.log("Loading employee data...");

      // Check if user is authenticated
      if (!user) {
        console.warn("No user found in AuthContext");
        window.location.href = "/index.html";
        return;
      }

      console.log("Current user from AuthContext:", user);

      const personnel = await getPersonnelList();
      console.log("Personnel list:", personnel);

      // Find employee by username from AuthContext
      const emp = personnel.find((p) => p.username === user.username);

      if (emp) {
        console.log("Found employee record:", emp);
        const middle = emp.middle_name ? ` ${emp.middle_name}` : "";
        const fullName = `${emp.first_name}${middle} ${emp.last_name}`.trim();

        setFormData((prev) => ({
          ...prev,
          employeeName: fullName,
        }));

        setLeaveBalance({
          vacation: emp.earnedVacation || emp.vacationDays || 0,
          sick: emp.earnedSick || emp.sickDays || 0,
          emergency: emp.earnedEmergency || emp.emergencyDays || 0,
        });
      } else {
        console.warn("Employee not found in personnel records");
        // Use name from AuthContext
        setFormData((prev) => ({
          ...prev,
          employeeName: user.name || user.username || "Unknown Employee",
        }));
      }
    } catch (error) {
      console.error("Error loading employee data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize form when user is loaded
  useEffect(() => {
    if (!authLoading && user) {
      loadEmployee();

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

      // Calculate initial days
      const days = calculateDays(minStart, minStart);
      setFormData((prev) => ({ ...prev, numDays: days }));
    }
  }, [user, authLoading]); // Add dependencies

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
    } else if (name === "leaveType") {
      setChosenLocation("");
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Update end date minimum when start date changes
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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Please log in to submit a leave request.");
      window.location.href = "/index.html";
      return;
    }

    // Validate form data
    if (!formData.leaveType) {
      alert("Please select a leave type.");
      return;
    }

    if (formData.leaveType === "Vacation" && !chosenLocation) {
      alert("Please select a location for vacation leave.");
      return;
    }

    const leaveRequest = {
      id: Date.now(),
      username: user.username,
      employeeName: formData.employeeName,
      dateOfFiling: formData.dateOfFiling,
      leaveType: formData.leaveType,
      location: chosenLocation,
      startDate: formData.startDate,
      endDate: formData.endDate,
      numDays: formData.numDays,
      status: "Pending",
      submittedAt: new Date().toISOString(),
    };

    try {
      console.log("Submitting leave request:", leaveRequest);
      
      // Use the actual IndexedDB function
      await addRecord(STORE_LEAVE, leaveRequest);

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

      console.log("Leave request submitted successfully!");

    } catch (error) {
      console.error("Error saving leave request:", error);
      alert("Failed to submit leave request. Please try again.");
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
                  >
                    <option value="" disabled hidden></option>
                    <option value="Vacation">Vacation Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Emergency">Emergency Leave</option>
                  </select>
                  <label>Leave Type</label>
                  {chosenLocation && (
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
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Submit Request
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
              onClick={() => setShowLocationModal(false)}
            >
              &times;
            </span>
            <h3>Select Location</h3>
            <div className={styles.modalRadioOptions}>
              <label>
                <input
                  type="radio"
                  name="location"
                  value="Abroad"
                  onChange={(e) => setSelectedLocation(e.target.value)}
                />
                Abroad
              </label>
              <label>
                <input
                  type="radio"
                  name="location"
                  value="Philippines"
                  onChange={(e) => setSelectedLocation(e.target.value)}
                />
                Philippines
              </label>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={handleConfirmLocation}
                className={styles.btnPrimary}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        <div className={`${styles.toast} ${showToast ? styles.toastShow : ""}`}>
          Leave request submitted successfully!
        </div>
      </div>
    </div>
  );
};

export default EmployeeLeaveRequest;