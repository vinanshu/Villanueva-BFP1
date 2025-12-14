// App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./components/AuthContext";
import { SidebarProvider } from "./components/SidebarContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./components/Login";

// Admin Components
import AdminDashboard from "./components/AdminDashboard";
import InventoryControl from "./components/InventoryControl";
import LeaveManagement from "./components/LeaveManagement";
import ClearanceSystem from "./components/ClearanceSystem";
import PersonnelRegister from "./components/PersonnelRegister";
import PersonnelProfile from "./components/PersonnelProfile";
import LeaveRecords from "./components/LeaveRecords";
import ClearanceRecords from "./components/ClearanceRecords";
import MedicalRecords from "./components/MedicalRecords";
import AwardsCommendations from "./components/AwardsCommendations";
import Promotion from "./components/Promotion";
import RecruitmentPersonnel from "./components/RecruitmentPersonnel";
import Trainings from "./components/Trainings";
import Placement from "./components/Placement";
import History from "./components/History";

// Recruitment Components
import RecruitmentDashboard from "./components/RecruitmentDashboard";

// Employee Components
import EmployeeDashboard from "./components/EmployeeDashboard";
import EmployeeLeaveDashboard from "./components/EmployeeLeaveDashboard";
import EmployeeLeaveRequest from "./components/EmployeeLeaveRequest";
import MyClearanceRecordPersonnel from "./components/MyClearanceRecordPersonnel";

// Inspector Components
import InspectorDashboard from "./components/InspectorDashboard";
import InspectorInventoryControl from "./components/InspectorInventoryControl";
import InspectorEquipmentInspection from "./components/InspectorEquipmentInspection";
import InspectorInspectionReport from "./components/InspectorInspectionReport";
import InspectionHistory from "./components/InspectionHistory"; // ADD THIS IMPORT

import UserSwitcher from "./UserSwitcher";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { HeadProvider } from "react-head";

function App() {
  return (
    <AuthProvider>
      <UserSwitcher />
      <SidebarProvider>
        <HeadProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Login />} />

              {/* Admin-only routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventoryControl"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <InventoryControl />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaveManagement"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <LeaveManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clearanceSystem"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ClearanceSystem />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/personnelRegister"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <PersonnelRegister />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/personnelProfile"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <PersonnelProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaveRecords"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <LeaveRecords />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clearanceRecords"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ClearanceRecords />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/medicalRecords"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <MedicalRecords />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/awardsCommendations"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AwardsCommendations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/promotion"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Promotion />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recruitmentPersonnel"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <RecruitmentPersonnel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trainings"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Trainings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/placement"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Placement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <History />
                  </ProtectedRoute>
                }
              />

              {/* Recruitment Personnel routes */}
              <Route
                path="/recruitment"
                element={
                  <ProtectedRoute requiredRole="recruitment">
                    <RecruitmentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recruitment/profile"
                element={
                  <ProtectedRoute requiredRole="recruitment">
                    <PersonnelProfile isRecruitment={true} />
                  </ProtectedRoute>
                }
              />

              {/* Inspector routes */}
              <Route
                path="/InspectorDashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <InspectorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inspectorInventoryControl"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <InspectorInventoryControl />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inspectorEquipmentInspection"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <InspectorEquipmentInspection />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inspectorInspectionReport"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <InspectorInspectionReport />
                  </ProtectedRoute>
                }
              />
              {/* ADD INSPECTION HISTORY ROUTE */}
              <Route
                path="/inspectionHistory"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <InspectionHistory />
                  </ProtectedRoute>
                }
              />

              {/* Employee-only routes */}
              <Route
                path="/employee"
                element={
                  <ProtectedRoute requiredRole="employee">
                    <EmployeeDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employeeLeaveDashboard"
                element={
                  <ProtectedRoute requiredRole="employee">
                    <EmployeeLeaveDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employeeLeaveRequest"
                element={
                  <ProtectedRoute requiredRole="employee">
                    <EmployeeLeaveRequest />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/myClearanceRecords"
                element={
                  <ProtectedRoute requiredRole="employee">
                    <MyClearanceRecordPersonnel />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/recruitment/myClearanceRecords"
                element={
                  <ProtectedRoute requiredRole="recruitment">
                    <MyClearanceRecordPersonnel />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/inspector/myClearanceRecords"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <MyClearanceRecordPersonnel />
                  </ProtectedRoute>
                }
              />

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <ToastContainer />
          </Router>
        </HeadProvider>
      </SidebarProvider>
    </AuthProvider>
  );
}

export default App;