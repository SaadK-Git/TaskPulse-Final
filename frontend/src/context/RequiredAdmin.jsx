import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequiredAdmin({ children }) {
  const { status, role } = useAuth();
  const location = useLocation();

  if (status === "loading") return null; // AuthProvider is still checking /auth/me

  if (status === "guest") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role !== "admin") {
    return <Navigate to="/member" replace />;
  }

  return children;
}
