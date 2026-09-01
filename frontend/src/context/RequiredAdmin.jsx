import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireAdmin({ children }) {
  const { user, loading, isAuthenticated } = useAuth();

  // Don't flash the login page or the admin panel while we're still
  // waiting on the /me round trip that decides which one is correct.
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <span style={{ fontSize: 14, color: "#6B7280" }}>Checking your session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return children;
}