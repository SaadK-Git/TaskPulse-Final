import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminPanelPage from "./pages/AdminPanel";
import RequireAdmin from "./context/RequiredAdmin";
import RequireMember from "./context/RequiredMember";
import MemberPanel from "./pages/Memberpanel";
import { AuthProvider } from "./context/AuthContext";
import { ErrorModalProvider } from "./context/ErrorModalContext";
import "./App.css";
// import RequireSuperAdmin from "./context/Requiresuperadmin";
// import SuperAdminPanel from "./pages/SuperAdminPanel";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorModalProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin/*" element={<RequireAdmin><AdminPanelPage /></RequireAdmin>} />
            <Route path="/member/*" element={<RequireMember><MemberPanel /></RequireMember>} />
            {/* <Route path="/superadmin" element={<RequireSuperAdmin><SuperAdminPanel /></RequireSuperAdmin>} /> */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ErrorModalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}