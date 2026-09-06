import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequiredMember() {
  const { status, role } = useAuth();
  const location = useLocation();

  if (status === "loading") return null;

  if (status === "guest") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role !== "member") {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
