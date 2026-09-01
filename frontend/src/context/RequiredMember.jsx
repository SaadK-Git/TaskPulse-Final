import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireMember({ children }) {
  const { user, loading, isAuthenticated } = useAuth();

  // Same pattern as RequireAdmin: don't flash login or the panel while
  // the /me round trip is still deciding who's logged in.
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

  if (user.role !== "member") {
    return <Navigate to="/login" replace />;
  }

  return children;
}