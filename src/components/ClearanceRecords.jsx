import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ClearanceSystem.module.css";
import Sidebar from "./Sidebar.jsx";
import Hamburger from "./Hamburger.jsx";
import { useSidebar } from "./SidebarContext.jsx";
import { Title, Meta } from "react-head";
import { supabase } from "../lib/supabaseClient";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ClearanceSystem = () => {
  const navigate = useNavigate();
  const { isSidebarCollapsed } = useSidebar();
  const [formData, setFormData] = useState({
    clearanceType: "",
    reason: "",
    effectiveDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [personnel, setPersonnel] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check authentication and load user data
  useEffect(() => {
    checkAuthAndLoadUser();
  }, []);

  const checkAuthAndLoadUser = async () => {
    try {
      setLoading(true);
      
      // Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error:", sessionError);
        toast.error("Authentication error. Please log in again.");
        navigate('/login');
        return;
      }
      
      if (!session) {
        console.log("No active session, redirecting to login");
        navigate('/login');
        return;
      }
      
      setUser(session.user);
      
      // Get personnel data for the current user
      const { data: personnelData, error: personnelError } = await supabase
        .from('personnel')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (personnelError) {
        console.error("Error fetching personnel data:", personnelError);
        
        // Try to find by email
        const { data: personnelByEmail, error: emailError } = await supabase
          .from('personnel')
          .select('*')
          .eq('email', session.user.email)
          .single();
          
        if (emailError) {
          console.error("Error finding personnel by email:", emailError);
          
          // Create a new personnel record if not found
          await createPersonnelRecord(session.user);
        } else {
          // Update existing record with user_id
          const { error: updateError } = await supabase
            .from('personnel')
            .update({ user_id: session.user.id })
            .eq('id', personnelByEmail.id);
            
          if (updateError) {
            console.error("Error updating personnel record:", updateError);
          }
          
          setPersonnel(personnelByEmail);
          console.log("Personnel data loaded via email:", personnelByEmail);
        }
      } else {
        setPersonnel(personnelData);
        console.log("Personnel data loaded:", personnelData);
      }
      
    } catch (error) {
      console.error("Error in auth check:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const createPersonnelRecord = async (userData) => {
    try {
      const newPersonnel = {
        user_id: userData.id,
        username: userData.email?.split('@')[0] || `user_${Date.now()}`,
        email: userData.email,
        first_name: userData.user_metadata?.first_name || '',
        last_name: userData.user_metadata?.last_name || '',
        is_active: true,
        is_admin: false,
        can_approve_requests: false,
        can_manage_personnel: false,
        can_approve_leaves: false
      };
      
      const { data, error } = await supabase
        .from('personnel')
        .insert([newPersonnel])
        .select()
        .single();
      
      if (error) {
        console.error("Error creating personnel record:", error);
        toast.error("Error creating your profile. Please contact administrator.");
        return null;
      }
      
      setPersonnel(data);
      toast.success("Profile created successfully!");
      return data;
      
    } catch (error) {
      console.error("Error in createPersonnelRecord:", error);
      return null;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInitiateClearance = async (e) => {
    e.preventDefault();
    
    if (!user || !personnel) {
      toast.error("Please log in and ensure your profile is complete.");
      return;
    }
    
    // Validate form
    if (!formData.clearanceType) {
      toast.error("Please select a clearance type.");
      return;
    }
    
    if (!formData.reason.trim()) {
      toast.error("Please provide a reason for the clearance.");
      return;
    }
    
    if (!formData.effectiveDate) {
      toast.error("Please select an effective date.");
      return;
    }
    
    // Check if effective date is not in the past
    const selectedDate = new Date(formData.effectiveDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast.error("Effective date cannot be in the past.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      console.log("Preparing to submit clearance request...");
      console.log("User ID:", user.id);
      console.log("Personnel ID:", personnel.id);
      
      // Prepare clearance request data
      const clearanceData = {
        personnel_id: personnel.id,
        type: formData.clearanceType,
        reason: formData.reason.trim(),
        effective_date: formData.effectiveDate,
        status: 'Pending',
        remarks: '',
        current_department: personnel.station || 'Main Office',
        pending_departments: ['Finance', 'HR', 'Operations', 'Supply', 'Training'],
        initiated_by: `${personnel.first_name} ${personnel.last_name}`,
        initiated_by_id: personnel.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log("Submitting clearance data:", clearanceData);
      
      // Insert clearance request
      const { data, error } = await supabase
        .from('clearance_requests')
        .insert([clearanceData])
        .select();
      
      if (error) {
        console.error("❌ Error submitting clearance:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Handle specific errors
        if (error.code === '42501') {
          toast.error("Permission denied. Please check your access rights or contact administrator.");
        } else if (error.code === '23503') {
          toast.error("Invalid personnel record. Please contact administrator.");
        } else if (error.code === '23505') {
          toast.error("Duplicate request detected.");
        } else if (error.code === '23502') {
          toast.error("Missing required fields. Please check your data.");
        } else {
          toast.error(`Error: ${error.message}`);
        }
        
        return;
      }
      
      console.log("✅ Clearance request submitted successfully:", data);
      
      toast.success("✅ Clearance request submitted successfully!");
      
      // Reset form
      setFormData({
        clearanceType: "",
        reason: "",
        effectiveDate: "",
      });
      
      // Navigate to clearance records after 2 seconds
      setTimeout(() => {
        navigate('/clearance-records');
      }, 2000);
      
    } catch (error) {
      console.error("❌ Unexpected error:", error);
      console.error("Error stack:", error.stack);
      toast.error("❌ An unexpected error occurred. Please try again or contact support.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewRequests = () => {
    navigate('/clearance-records');
  };

  if (loading) {
    return (
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Title>Clearance System | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />
      
      <Hamburger />
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
      <Sidebar />
      
      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className={styles.header}>
          <h1>Clearance Request System</h1>
          <p className={styles.subtitle}>
            Submit and track your clearance requests
          </p>
          
          {personnel && (
            <div className={styles.userInfo}>
              <span className={styles.userBadge}>
                👤 {personnel.first_name} {personnel.last_name}
                {personnel.rank && ` • ${personnel.rank}`}
                {personnel.station && ` • ${personnel.station}`}
              </span>
              <button 
                className={styles.viewRequestsBtn}
                onClick={handleViewRequests}
              >
                📋 View My Requests
              </button>
            </div>
          )}
        </div>
        
        <div className={styles.content}>
          <div className={styles.formSection}>
            <div className={styles.formCard}>
              <h2>Initiate New Clearance Request</h2>
              <p className={styles.formDescription}>
                Fill out the form below to submit a new clearance request. 
                All fields are required.
              </p>
              
              <form onSubmit={handleInitiateClearance}>
                <div className={styles.formGroup}>
                  <label htmlFor="clearanceType">
                    Clearance Type *
                  </label>
                  <select
                    id="clearanceType"
                    name="clearanceType"
                    value={formData.clearanceType}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    required
                    disabled={isSubmitting || !personnel}
                  >
                    <option value="">Select Clearance Type</option>
                    <option value="Resignation">Resignation</option>
                    <option value="Retirement">Retirement</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Promotion">Promotion</option>
                    <option value="Administrative">Administrative</option>
                    <option value="Equipment Completion">Equipment Completion</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="reason">
                    Reason for Clearance *
                  </label>
                  <textarea
                    id="reason"
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    className={styles.formTextarea}
                    placeholder="Please provide a detailed reason for requesting clearance..."
                    rows="4"
                    required
                    disabled={isSubmitting || !personnel}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="effectiveDate">
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    id="effectiveDate"
                    name="effectiveDate"
                    value={formData.effectiveDate}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    disabled={isSubmitting || !personnel}
                  />
                  <small className={styles.helperText}>
                    Select the date when the clearance should take effect
                  </small>
                </div>
                
                <div className={styles.formActions}>
                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isSubmitting || !personnel}
                  >
                    {isSubmitting ? (
                      <>
                        <span className={styles.spinner}></span>
                        Submitting...
                      </>
                    ) : (
                      "Submit Clearance Request"
                    )}
                  </button>
                  
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setFormData({
                      clearanceType: "",
                      reason: "",
                      effectiveDate: "",
                    })}
                    disabled={isSubmitting}
                  >
                    Clear Form
                  </button>
                </div>
              </form>
              
              {!personnel && (
                <div className={styles.warningMessage}>
                  ⚠️ Please wait while we load your profile information...
                </div>
              )}
            </div>
            
            <div className={styles.infoCard}>
              <h3>📋 Clearance Process Information</h3>
              <ul className={styles.processList}>
                <li>
                  <strong>Step 1:</strong> Submit your clearance request
                </li>
                <li>
                  <strong>Step 2:</strong> Request will be reviewed by relevant departments
                </li>
                <li>
                  <strong>Step 3:</strong> Track status in "Clearance Records"
                </li>
                <li>
                  <strong>Step 4:</strong> Receive final approval/completion
                </li>
              </ul>
              
              <div className={styles.noteBox}>
                <h4>⚠️ Important Notes:</h4>
                <ul>
                  <li>All clearance requests require proper justification</li>
                  <li>Processing time: 3-5 working days</li>
                  <li>You will be notified via email for updates</li>
                  <li>Contact HR for urgent requests</li>
                </ul>
              </div>
            </div>
          </div>
          
          {personnel && (
            <div className={styles.statsSection}>
              <div className={styles.statCard}>
                <h3>Your Clearance Stats</h3>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Active Requests:</span>
                  <span className={styles.statValue}>0</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Completed:</span>
                  <span className={styles.statValue}>0</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Pending:</span>
                  <span className={styles.statValue}>0</span>
                </div>
                <button 
                  className={styles.refreshStatsBtn}
                  onClick={handleViewRequests}
                >
                  View Detailed Report →
                </button>
              </div>
              
              <div className={styles.quickLinks}>
                <h3>Quick Links</h3>
                <button className={styles.quickLinkBtn} onClick={handleViewRequests}>
                  📋 My Clearance Records
                </button>
                <button className={styles.quickLinkBtn} onClick={() => window.print()}>
                  🖨️ Print Guidelines
                </button>
                <button className={styles.quickLinkBtn} onClick={() => navigate('/help')}>
                  ❓ Help & Support
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClearanceSystem;