// components/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getPersonnelList, setCurrentUser } from "./db"; // Import setCurrentUser
import { Title, Meta } from "react-head";
import { Eye, EyeOff, AlertTriangle, Lock, User } from "lucide-react";
import "./Login.css";

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

  // State for security features
  const [attempts, setAttempts] = useState(0);
  const [lockoutCount, setLockoutCount] = useState(0);
  const [bruteForceUntil, setBruteForceUntil] = useState(0);
  const [bruteForceLocked, setBruteForceLocked] = useState(false);

  const MAX_ATTEMPTS = 3;
  const MAX_LOCKOUTS = 3;

  // Load persistent state from localStorage (for security features only)
  useEffect(() => {
    const savedLockoutCount =
      parseInt(localStorage.getItem("lockoutCount")) || 0;
    const savedBruteForceUntil =
      parseInt(localStorage.getItem("bruteForceUntil")) || 0;
    const savedTempUntil = parseInt(localStorage.getItem("tempUntil")) || 0;
    const now = Date.now();

    setLockoutCount(savedLockoutCount);
    setBruteForceUntil(savedBruteForceUntil);

    // Check brute force lock
    if (savedBruteForceUntil && now < savedBruteForceUntil) {
      setBruteForceLocked(true);
      startBruteForceCountdown(savedBruteForceUntil - now);
      showModal(
        "🚫 Login blocked",
        `Login blocked. Time remaining: ${formatMs(savedBruteForceUntil - now)}`
      );
      return;
    }

    // Check temporary lock
    if (savedTempUntil && now < savedTempUntil) {
      const remaining = Math.ceil((savedTempUntil - now) / 1000);
      lockLoginTemp(remaining);
      showModal(
        "⏳ Temporary lock",
        `Please wait ${remaining}s before retrying.`
      );
    } else {
      setIsLocked(false);
      setAttempts(0);
      localStorage.removeItem("tempUntil");
    }

    // Cleanup expired brute force lock
    if (savedBruteForceUntil && now >= savedBruteForceUntil) {
      setBruteForceLocked(false);
      setBruteForceUntil(0);
      setLockoutCount(0);
      saveBruteState(0, 0);
    }
  }, []);

  const saveBruteState = (count, until) => {
    localStorage.setItem("lockoutCount", count.toString());
    localStorage.setItem("bruteForceUntil", until.toString());
  };

  const formatMs = (ms) => {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  const showModal = (title, message) => {
    setModal({ show: true, title, message });
  };

  const closeModal = () => {
    setModal({ show: false, title: "", message: "" });
  };

  const lockLoginTemp = (seconds) => {
    setIsLocked(true);
    const now = Date.now();
    const tempUntil = now + seconds * 1000;
    localStorage.setItem("tempUntil", tempUntil.toString());

    let remaining = seconds;
    setLoginButtonText(`Retry in ${remaining}s`);

    const interval = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        setLoginButtonText(`Retry in ${remaining}s`);
        if (modal.show) {
          setModal((prev) => ({
            ...prev,
            message: `Too many failed attempts. Try again in ${remaining}s.`,
          }));
        }
      } else {
        clearInterval(interval);
        setIsLocked(false);
        setAttempts(0);
        localStorage.removeItem("tempUntil");
        setLoginButtonText("Login");
        if (modal.show) {
          setModal((prev) => ({
            ...prev,
            message: "You may try logging in again.",
          }));
        }
      }
    }, 1000);
  };

  const startBruteForceCountdown = (remainingMs) => {
    const update = () => {
      remainingMs -= 1000;

      if (remainingMs <= 0) {
        setBruteForceLocked(false);
        setBruteForceUntil(0);
        setLockoutCount(0);
        saveBruteState(0, 0);
        setLoginButtonText("Login");
        if (modal.show) {
          setModal((prev) => ({
            ...prev,
            message: "Block expired. You may try logging in again.",
          }));
        }
        return;
      }

      const formatted = formatMs(remainingMs);
      setLoginButtonText(`Blocked ${formatted}`);
      if (modal.show) {
        setModal((prev) => ({
          ...prev,
          message: `Login blocked. Time remaining: ${formatted}`,
        }));
      }

      setTimeout(update, 1000);
    };

    update();
  };

  const triggerBruteForceBlock = (seconds) => {
    const now = Date.now();
    const until = now + seconds * 1000;
    setBruteForceLocked(true);
    setBruteForceUntil(until);
    const newLockoutCount = Math.max(0, lockoutCount);
    setLockoutCount(newLockoutCount);
    saveBruteState(newLockoutCount, until);

    startBruteForceCountdown(seconds * 1000);
    showModal(
      "🚫 Account Blocked",
      `Multiple lockouts detected. Login blocked for ${Math.ceil(
        seconds / 60
      )} minute(s).`
    );
  };

  const handleTempLockAndMaybeBruteForce = (seconds) => {
    const newLockoutCount = lockoutCount + 1;
    setLockoutCount(newLockoutCount);
    saveBruteState(newLockoutCount, bruteForceUntil);
    lockLoginTemp(seconds);

    if (newLockoutCount >= MAX_LOCKOUTS) {
      triggerBruteForceBlock(600); // 10 minutes
    }
  };

  const handleLogin = async () => {
    // Check brute force lock
    if (bruteForceLocked) {
      const remainingMs = bruteForceUntil - Date.now();
      showModal(
        "🚫 Login blocked",
        `Please wait ${formatMs(remainingMs)} before trying again.`
      );
      return;
    }

    // Check temporary lock
    if (isLocked) {
      showModal(
        "Please wait",
        "Temporary cooldown active. Please wait a moment."
      );
      return;
    }

    // Validate inputs
    if (!username.trim() || !password.trim()) {
      showModal("Missing fields", "Please enter both username and password.");
      return;
    }

    // Hardcoded admins
    if (username === "admin" && password === "admin123") {
      const userData = {
        username: "admin",
        role: "admin",
        name: "System Administrator",
      };

      // Set in both AuthContext and IndexedDB
      login(userData);
      await setCurrentUser(userData);
      navigate("/admin");
      return;
    }

    if (username === "inspector" && password === "inspect123") {
      const userData = {
        username: "inspector",
        role: "admin",
        name: "System Inspector",
      };

      // Set in both AuthContext and IndexedDB
      login(userData);
      await setCurrentUser(userData);
      navigate("/inspectorDashboard");
      return;
    }

    try {
      // Query personnel from IndexedDB
      const personnelList = await getPersonnelList();

      // Find user in personnel records
      const user = personnelList.find(
        (p) => p.username === username && p.password === password
      );

      if (user) {
        // Successful login
        setAttempts(0);
        setLockoutCount(0);
        setBruteForceUntil(0);
        localStorage.removeItem("tempUntil");
        saveBruteState(0, 0);

        const userData = {
          username: user.username,
          role: "employee",
          name: `${user.first_name} ${user.last_name}`,
          id: user.id,
          personnelData: user,
        };

        // Set in both AuthContext and IndexedDB
        login(userData);
        await setCurrentUser(userData);

        navigate("/employee");
      } else {
        // Failed login - FIXED: Calculate attemptsLeft properly
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        const attemptsLeft = Math.max(0, MAX_ATTEMPTS - newAttempts);

        // Clear inputs and trigger shake animation
        setUsername("");
        setPassword("");
        setShake(true);
        setTimeout(() => setShake(false), 400);

        if (newAttempts >= MAX_ATTEMPTS) {
          handleTempLockAndMaybeBruteForce(100); // 100s
          showModal(
            "Too many attempts",
            "Too many failed attempts. Temporary lock started."
          );
        } else {
          showModal(
            "Invalid credentials",
            `Invalid login. Attempts left: ${attemptsLeft}`
          );
        }
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

  return (
    <div className="login-container">
      <Title>Bureau of Fire Protection Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />

      <div className={`login-box ${shake ? "shake" : ""}`}>
        <h2>Welcome Back</h2>
        <p>Please log in to continue</p>

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
            disabled={isLocked || bruteForceLocked}
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
            disabled={isLocked || bruteForceLocked}
          />
          <label htmlFor="password">Password</label>
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          className="login-button"
          onClick={handleLogin}
          disabled={isLocked || bruteForceLocked}
        >
          {loginButtonText}
        </button>
      </div>

      {/* Modal */}
      {modal.show && (
        <div className="modal-overlay-log">
          <div className="modal-content-log">
            <div className="modal-header-log">
              <AlertTriangle className="modal-icon-log" size={24} />
              <h3>{modal.title}</h3>
            </div>
            <p>{modal.message}</p>
            <button className="modal-button-log" onClick={closeModal}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
