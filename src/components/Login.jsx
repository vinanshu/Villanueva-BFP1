// components/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Title, Meta } from "react-head";
import { Eye, EyeOff, AlertTriangle, Lock, User, Loader2, Briefcase, Shield, UserPlus } from "lucide-react";
import "./Login.css";
import { supabase } from "../lib/supabaseClient";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [modal, setModal] = useState({ show: false, title: "", message: "" });
  const [isLocked, setIsLocked] = useState(false);
  const [loginButtonText, setLoginButtonText] = useState("Login");
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const [attempts, setAttempts] = useState(0);
  const [securityData, setSecurityData] = useState(null);
  const [loadingSecurity, setLoadingSecurity] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState(true);

  const MAX_ATTEMPTS = 3;
  const MAX_LOCKOUTS = 3;
  const [clientIp, setClientIp] = useState("unknown");

  // Get client IP
  useEffect(() => {
    const getIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setClientIp(data.ip);
      } catch (error) {
        console.log("Could not get IP:", error);
        setClientIp(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      }
    };
    getIP();
  }, []);

  // Load security data when IP is available
  useEffect(() => {
    if (clientIp !== "unknown") {
      loadSecurityData();
    }
  }, [clientIp]);

  const loadSecurityData = async () => {
    try {
      setLoadingSecurity(true);
      const now = Date.now();

      // Test Supabase connection
      try {
        const { error: testError } = await supabase
          .from("personnel")
          .select("count", { count: 'exact', head: true });

        if (testError) {
          console.error("Supabase connection error:", testError);
          setSupabaseConnected(false);
        }
      } catch (connError) {
        setSupabaseConnected(false);
      }

      if (supabaseConnected) {
        // Try to load from login_security table
        try {
          const { data, error } = await supabase
            .from("login_security")
            .select("*")
            .eq("ip_address", clientIp)
            .single();

          if (error && error.code !== "PGRST116") { // PGRST116 means no rows returned
            console.error("Error loading security data:", error);
            // Fallback to localStorage
            loadLocalSecurityData(now);
          } else if (data) {
            setSecurityData(data);
            handleSecurityData(data, now);
          } else {
            // Create new security record
            await createSecurityRecord();
          }
        } catch (error) {
          console.error("Error in security data load:", error);
          loadLocalSecurityData(now);
        }
      } else {
        loadLocalSecurityData(now);
      }
    } catch (error) {
      console.error("Error in loadSecurityData:", error);
      loadLocalSecurityData(Date.now());
    } finally {
      setLoadingSecurity(false);
    }
  };

  const loadLocalSecurityData = (now) => {
    try {
      const lockoutCount = parseInt(localStorage.getItem(`lockoutCount_${clientIp}`)) || 0;
      const bruteForceUntil = parseInt(localStorage.getItem(`bruteForceUntil_${clientIp}`)) || 0;
      const tempUntil = parseInt(localStorage.getItem(`tempUntil_${clientIp}`)) || 0;
      const failedAttempts = parseInt(localStorage.getItem(`failedAttempts_${clientIp}`)) || 0;
      
      const data = {
        lockout_count: lockoutCount,
        brute_force_until: bruteForceUntil,
        temp_until: tempUntil,
        failed_attempts: failedAttempts
      };
      
      setSecurityData(data);
      handleSecurityData(data, now);
    } catch (error) {
      console.error("Error loading local security data:", error);
      // Default security data
      const defaultData = {
        lockout_count: 0,
        brute_force_until: 0,
        temp_until: 0,
        failed_attempts: 0
      };
      setSecurityData(defaultData);
      setIsLocked(false);
    }
  };

  const handleSecurityData = (data, now) => {
    if (data?.brute_force_until && now < data.brute_force_until) {
      const remainingMs = data.brute_force_until - now;
      startBruteForceCountdown(remainingMs);
      showModal(
        "🚫 Login Blocked",
        `Login is blocked. Please wait ${formatMs(remainingMs)} before trying again.`
      );
      return;
    }

    if (data?.temp_until && now < data.temp_until) {
      const remaining = Math.ceil((data.temp_until - now) / 1000);
      lockLoginTemp(remaining);
      showModal(
        "⏳ Temporary Lock",
        `Too many failed attempts. Please wait ${remaining} seconds before retrying.`
      );
    } else {
      setIsLocked(false);
      setAttempts(data?.failed_attempts || 0);
    }
  };

  const createSecurityRecord = async () => {
    try {
      const newRecord = {
        ip_address: clientIp,
        failed_attempts: 0,
        lockout_count: 0,
        temp_until: null,
        brute_force_until: null,
        last_attempt: new Date().toISOString()
      };

      if (supabaseConnected) {
        const { data, error } = await supabase
          .from("login_security")
          .insert([newRecord])
          .select()
          .single();

        if (!error) {
          setSecurityData(data);
          return data;
        }
      }

      // Fallback to localStorage
      saveLocalSecurityData(newRecord);
      setSecurityData(newRecord);
      return newRecord;
    } catch (error) {
      console.error("Error creating security record:", error);
      const fallbackRecord = {
        failed_attempts: 0,
        lockout_count: 0,
        temp_until: 0,
        brute_force_until: 0
      };
      saveLocalSecurityData(fallbackRecord);
      setSecurityData(fallbackRecord);
      return fallbackRecord;
    }
  };

  const saveLocalSecurityData = (data) => {
    try {
      // Handle null values safely
      const lockoutCount = data.lockout_count ?? 0;
      const bruteForceUntil = data.brute_force_until ?? 0;
      const tempUntil = data.temp_until ?? 0;
      const failedAttempts = data.failed_attempts ?? 0;

      localStorage.setItem(`lockoutCount_${clientIp}`, lockoutCount.toString());
      localStorage.setItem(`bruteForceUntil_${clientIp}`, bruteForceUntil.toString());
      localStorage.setItem(`tempUntil_${clientIp}`, tempUntil.toString());
      localStorage.setItem(`failedAttempts_${clientIp}`, failedAttempts.toString());
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const updateSecurityRecord = async (updates) => {
    try {
      // Convert null to 0 for localStorage compatibility
      const sanitizedUpdates = {
        ...updates,
        last_attempt: new Date().toISOString()
      };
      
      // Ensure numeric values for localStorage
      if (sanitizedUpdates.temp_until === null) sanitizedUpdates.temp_until = 0;
      if (sanitizedUpdates.brute_force_until === null) sanitizedUpdates.brute_force_until = 0;
      if (sanitizedUpdates.failed_attempts === undefined) sanitizedUpdates.failed_attempts = securityData?.failed_attempts ?? 0;
      if (sanitizedUpdates.lockout_count === undefined) sanitizedUpdates.lockout_count = securityData?.lockout_count ?? 0;

      if (supabaseConnected) {
        // For Supabase, we can keep null values
        const supabaseUpdates = { ...updates, last_attempt: new Date().toISOString() };
        
        const { data, error } = await supabase
          .from("login_security")
          .update(supabaseUpdates)
          .eq("ip_address", clientIp)
          .select()
          .single();

        if (!error && data) {
          setSecurityData(data);
          // Convert null to 0 for localStorage sync
          const localStorageData = {
            ...data,
            temp_until: data.temp_until ?? 0,
            brute_force_until: data.brute_force_until ?? 0
          };
          saveLocalSecurityData(localStorageData);
          return data;
        }
      }

      // Fallback to localStorage
      const currentData = securityData || {
        failed_attempts: 0,
        lockout_count: 0,
        temp_until: 0,
        brute_force_until: 0
      };
      
      const newData = { ...currentData, ...sanitizedUpdates };
      saveLocalSecurityData(newData);
      setSecurityData(newData);
      return newData;
    } catch (error) {
      console.error("Error updating security record:", error);
      return securityData;
    }
  };

  const formatMs = (ms) => {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const showModal = (title, message) => {
    setModal({ show: true, title, message });
  };

  const closeModal = () => {
    setModal({ show: false, title: "", message: "" });
  };

  const lockLoginTemp = async (seconds) => {
    setIsLocked(true);
    const now = Date.now();
    const tempUntil = now + seconds * 1000;

    await updateSecurityRecord({
      temp_until: tempUntil
    });

    let remaining = seconds;
    setLoginButtonText(`Retry in ${remaining}s`);

    const interval = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        setLoginButtonText(`Retry in ${remaining}s`);
      } else {
        clearInterval(interval);
        setIsLocked(false);
        setAttempts(0);
        updateSecurityRecord({
          temp_until: 0, // Use 0 instead of null for localStorage
          failed_attempts: 0
        });
        setLoginButtonText("Login");
      }
    }, 1000);
  };

  const startBruteForceCountdown = (remainingMs) => {
    const update = () => {
      remainingMs -= 1000;

      if (remainingMs <= 0) {
        updateSecurityRecord({
          brute_force_until: 0, // Use 0 instead of null
          lockout_count: 0,
          failed_attempts: 0
        });
        setLoginButtonText("Login");
        if (modal.show) {
          closeModal();
        }
        return;
      }

      const formatted = formatMs(remainingMs);
      setLoginButtonText(`Blocked ${formatted}`);
      
      setTimeout(update, 1000);
    };

    update();
  };

  const triggerBruteForceBlock = async (seconds) => {
    const now = Date.now();
    const until = now + seconds * 1000;

    await updateSecurityRecord({
      brute_force_until: until,
      lockout_count: (securityData?.lockout_count || 0) + 1,
      failed_attempts: 0,
      temp_until: 0 // Use 0 instead of null
    });

    startBruteForceCountdown(seconds * 1000);
    showModal(
      "🚫 Account Blocked",
      `Multiple lockouts detected. Login blocked for ${Math.ceil(seconds / 60)} minute(s).`
    );
  };

  const handleTempLockAndMaybeBruteForce = async (seconds) => {
    const newLockoutCount = (securityData?.lockout_count || 0) + 1;
    
    await updateSecurityRecord({
      lockout_count: newLockoutCount,
      failed_attempts: MAX_ATTEMPTS
    });

    lockLoginTemp(seconds);

    if (newLockoutCount >= MAX_LOCKOUTS) {
      triggerBruteForceBlock(600);
    }
  };

  // Recruitment Personnel Login Handler
  const handleRecruitmentLogin = async (recruitmentUser) => {
    try {
      console.log("Processing recruitment personnel login:", recruitmentUser.username);
      
      const userData = {
        username: recruitmentUser.username,
        role: "recruitment",
        name: recruitmentUser.candidate || "Recruitment Candidate",
        id: recruitmentUser.id,
        personnelData: recruitmentUser,
        isRecruitment: true,
        isAdmin: false
      };

      console.log("Recruitment user data prepared:", userData);

      // Store session in localStorage
      localStorage.setItem('currentUser', JSON.stringify(userData));
      localStorage.setItem('isRecruitment', 'true');
      localStorage.setItem('isAdmin', 'false');
      localStorage.setItem('auth', JSON.stringify({
        user: userData,
        token: 'recruitment-token',
        isAuthenticated: true
      }));

      // Reset security with 0 instead of null
      await updateSecurityRecord({
        failed_attempts: 0,
        lockout_count: 0,
        temp_until: 0,
        brute_force_until: 0
      });

      // Call login from AuthContext
      console.log("Calling login with recruitment userData");
      login(userData);
      
      // Navigate to recruitment dashboard
      console.log("Navigating to /recruitment");
      navigate("/recruitment");
      return true;

    } catch (error) {
      console.error("Recruitment login error:", error);
      showModal("Login Error", "Failed to process recruitment login. Please try again.");
      return false;
    }
  };

  // Admin Login Handler
  const handleAdminLogin = async () => {
    try {
      console.log("Admin credentials detected");
      
      let userData;
      
      // Check if admin exists in database
      if (supabaseConnected) {
        const { data: adminData, error: adminError } = await supabase
          .from("personnel")
          .select("*")
          .eq("username", "admin")
          .eq("password", "admin123")
          .single();

        if (!adminError && adminData) {
          console.log("Admin found in database:", adminData);
          userData = {
            username: adminData.username,
            role: "admin",
            name: `${adminData.first_name || ''} ${adminData.last_name || ''}`.trim() || "System Administrator",
            id: adminData.id,
            personnelData: adminData,
            isAdmin: true,
            isRecruitment: false
          };
        } else {
          // Fallback admin
          userData = createFallbackAdmin();
        }
      } else {
        // Fallback when no database connection
        userData = createFallbackAdmin();
      }

      // Store session
      storeSessionData(userData, true);
      
      // Reset security with 0 instead of null
      await updateSecurityRecord({
        failed_attempts: 0,
        lockout_count: 0,
        temp_until: 0,
        brute_force_until: 0
      });

      // Call login
      login(userData);
      console.log("Navigating to /admin");
      navigate("/admin");
      return true;

    } catch (error) {
      console.error("Admin login error:", error);
      // Final fallback
      const userData = createFallbackAdmin();
      storeSessionData(userData, true);
      await updateSecurityRecord({
        failed_attempts: 0,
        lockout_count: 0,
        temp_until: 0,
        brute_force_until: 0
      });
      login(userData);
      navigate("/admin");
      return true;
    }
  };

  const createFallbackAdmin = () => {
    return {
      username: "admin",
      role: "admin",
      name: "System Administrator",
      id: "admin-id",
      personnelData: {
        is_admin: true,
        can_approve_leaves: true,
        admin_role: "Super Admin",
        rank: "Chief",
        designation: "System Administrator"
      },
      isAdmin: true,
      isRecruitment: false
    };
  };

  const storeSessionData = (userData, isAdmin = false) => {
    localStorage.setItem('currentUser', JSON.stringify(userData));
    localStorage.setItem('isAdmin', isAdmin.toString());
    localStorage.setItem('isRecruitment', (userData.role === 'recruitment').toString());
    localStorage.setItem('auth', JSON.stringify({
      user: userData,
      token: `${userData.role}-token`,
      isAuthenticated: true
    }));
  };

  // Inspector Login Handler
  const handleInspectorLogin = async () => {
    try {
      let userData;
      
      if (supabaseConnected) {
        const { data: inspectorData, error: inspectorError } = await supabase
          .from("personnel")
          .select("*")
          .eq("username", "inspector")
          .eq("password", "inspect123")
          .single();

        if (!inspectorError && inspectorData) {
          userData = {
            username: inspectorData.username,
            role: "admin",
            name: `${inspectorData.first_name || ''} ${inspectorData.last_name || ''}`.trim() || "System Inspector",
            id: inspectorData.id,
            personnelData: inspectorData,
            isAdmin: true,
            isRecruitment: false
          };
        } else {
          userData = {
            username: "inspector",
            role: "admin",
            name: "System Inspector",
            id: "inspector-id",
            personnelData: {
              is_admin: true,
              can_approve_leaves: true,
              admin_role: "Inspector"
            },
            isAdmin: true,
            isRecruitment: false
          };
        }
      } else {
        userData = {
          username: "inspector",
          role: "admin",
          name: "System Inspector",
          id: "inspector-id",
          personnelData: {
            is_admin: true,
            can_approve_leaves: true,
            admin_role: "Inspector"
          },
          isAdmin: true,
          isRecruitment: false
        };
      }

      storeSessionData(userData, true);
      
      await updateSecurityRecord({
        failed_attempts: 0,
        lockout_count: 0,
        temp_until: 0,
        brute_force_until: 0
      });

      login(userData);
      navigate("/InspectorDashboard");
      return true;

    } catch (error) {
      console.error("Inspector login error:", error);
      const fallbackUserData = {
        username: "inspector",
        role: "admin",
        name: "System Inspector",
        id: "inspector-id",
        personnelData: {
          is_admin: true,
          can_approve_leaves: true,
          admin_role: "Inspector"
        },
        isAdmin: true,
        isRecruitment: false
      };
      storeSessionData(fallbackUserData, true);
      await updateSecurityRecord({
        failed_attempts: 0,
        lockout_count: 0,
        temp_until: 0,
        brute_force_until: 0
      });
      login(fallbackUserData);
      navigate("/InspectorDashboard");
      return true;
    }
  };

  // Regular Personnel Login Handler
  const handleRegularPersonnelLogin = async (user) => {
    console.log("Regular user found:", user.username);
    
    // Check if user is admin from database
    const isAdmin = user.is_admin === true && user.can_approve_leaves === true;
    console.log("Is user admin?", isAdmin);
    
    const userData = {
      username: user.username,
      role: isAdmin ? "admin" : "employee",
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
      id: user.id,
      personnelData: user,
      isAdmin: isAdmin,
      isRecruitment: false
    };

    console.log("User data prepared:", userData);

    storeSessionData(userData, isAdmin);
    
    // Reset security with 0 instead of null
    await updateSecurityRecord({
      failed_attempts: 0,
      lockout_count: 0,
      temp_until: 0,
      brute_force_until: 0
    });

    console.log("Calling login with userData");
    login(userData);
    
    // Redirect based on role
    if (isAdmin) {
      console.log("Redirecting to /admin");
      navigate("/admin");
    } else {
      console.log("Redirecting to /employee");
      navigate("/employee");
    }
    
    return true;
  };

  // Main login handler
  const handleLogin = async () => {
    console.log("Login attempt with username:", username);
    
    if (loadingSecurity) {
      showModal("Please wait", "System is initializing...");
      return;
    }

    // Check if securityData is loaded
    if (!securityData) {
      showModal("System Error", "Security system not initialized. Please refresh the page.");
      return;
    }

    // Check brute force lock (using 0 instead of null check)
    if (securityData.brute_force_until && Date.now() < securityData.brute_force_until) {
      const remainingMs = securityData.brute_force_until - Date.now();
      showModal(
        "🚫 Login blocked",
        `Please wait ${formatMs(remainingMs)} before trying again.`
      );
      return;
    }

    if (isLocked) {
      showModal("Please wait", "Temporary cooldown active. Please wait a moment.");
      return;
    }

    if (!username.trim() || !password.trim()) {
      showModal("Missing fields", "Please enter both username and password.");
      return;
    }

    // Handle special logins
    if (username === "admin" && password === "admin123") {
      await handleAdminLogin();
      return;
    }

    if (username === "inspector" && password === "inspect123") {
      await handleInspectorLogin();
      return;
    }

    try {
      console.log("Attempting login...");
      
      // 1. FIRST: Check recruitment_personnel table
      console.log("Checking recruitment_personnel table...");
      let recruitmentUser = null;
      
      if (supabaseConnected) {
        const { data: recruitmentList, error: recruitmentError } = await supabase
          .from("recruitment_personnel")
          .select("*")
          .eq("username", username)
          .eq("password", password)
          .maybeSingle();

        if (!recruitmentError && recruitmentList) {
          recruitmentUser = recruitmentList;
        }
      }

      if (recruitmentUser) {
        console.log("Recruitment personnel found:", recruitmentUser.username);
        await handleRecruitmentLogin(recruitmentUser);
        return;
      }

      // 2. SECOND: Check personnel table
      console.log("Checking personnel table...");
      let regularUser = null;
      
      if (supabaseConnected) {
        const { data: personnelList, error: personnelError } = await supabase
          .from("personnel")
          .select("*")
          .eq("username", username)
          .eq("password", password)
          .maybeSingle();

        if (!personnelError && personnelList) {
          regularUser = personnelList;
        }
      }

      if (regularUser) {
        await handleRegularPersonnelLogin(regularUser);
        return;
      }

      // If no user found anywhere
      console.log("User not found in any table or invalid credentials");
      
      // Failed login
      const newAttempts = (securityData?.failed_attempts || 0) + 1;
      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - newAttempts);

      await updateSecurityRecord({
        failed_attempts: newAttempts
      });

      setUsername("");
      setPassword("");
      setShake(true);
      setTimeout(() => setShake(false), 400);

      if (newAttempts >= MAX_ATTEMPTS) {
        handleTempLockAndMaybeBruteForce(30); // Reduced from 100 to 30 seconds
        showModal(
          "Too many attempts",
          `Too many failed attempts. Account locked for 30 seconds.`
        );
      } else {
        showModal(
          "Invalid credentials",
          `Invalid username or password. Attempts left: ${attemptsLeft}`
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      showModal(
        "Database error",
        "Unable to access personnel records. Please try again."
      );
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  if (loadingSecurity) {
    return (
      <div className="login-container">
        <div className="login-box">
          <div className="loading-spinner">
            <Loader2 className="animate-spin" size={32} />
          </div>
          <h2>Loading Security Settings...</h2>
          <p>Please wait while we initialize the login system</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <Title>Bureau of Fire Protection Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />

      {!supabaseConnected && (
        <div className="warning-banner">
          <AlertTriangle size={16} />
          <span>Using local security mode</span>
        </div>
      )}

      <div className={`login-box ${shake ? "shake" : ""}`}>
        <div className="login-header">
          <div className="header-icons">
            <Shield className="header-icon shield-icon" size={32} />
            <UserPlus className="header-icon user-icon" size={32} />
          </div>
          <h2>Welcome Back</h2>
          <p>Bureau of Fire Protection Villanueva</p>
        </div>

        <div className="input-group">
          <User className="input-icon" size={18} />
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            required
            placeholder=" "
            disabled={isLocked || (securityData?.brute_force_until && Date.now() < securityData.brute_force_until)}
            autoComplete="username"
          />
          <label htmlFor="username">Username</label>
        </div>

        <div className="input-group">
          <Lock className="input-icon" size={18} />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            required
            placeholder=" "
            disabled={isLocked || (securityData?.brute_force_until && Date.now() < securityData.brute_force_until)}
            autoComplete="current-password"
          />
          <label htmlFor="password">Password</label>
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          className="login-button"
          onClick={handleLogin}
          disabled={isLocked || (securityData?.brute_force_until && Date.now() < securityData.brute_force_until) || loadingSecurity}
        >
          {loginButtonText}
        </button>

        <div className="login-info">
          <div className="role-tags">
            <span className="role-tag admin-tag">
              <Shield size={12} /> Admin
            </span>
            <span className="role-tag employee-tag">
              <User size={12} /> Employee
            </span>
            <span className="role-tag recruitment-tag">
              <UserPlus size={12} /> Recruitment
            </span>
          </div>
          <div className="security-status">
            <small>
              Security: {securityData?.failed_attempts || 0}/{MAX_ATTEMPTS} attempts
            </small>
            <small className="ip-display">
              IP: {clientIp.substring(0, 8)}...
            </small>
          </div>
        </div>
      </div>

      {modal.show && (
        <div className="modal-overlay-log">
          <div className="modal-content-log">
            <div className="modal-header-log">
              <AlertTriangle className="modal-icon-log" size={24} />
              <h3>{modal.title}</h3>
            </div>
            <p>{modal.message}</p>
            <button 
              className="modal-button-log" 
              onClick={closeModal}
              autoFocus
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;