import { Route, Routes } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AdminJobsView from "../components/AdminJobsView";
import AdminUsersView from "../components/AdminUsersView";
import AdminDashboardView from "../components/AdminDashboardView";

const LINKS = [
  { to: "/admin/jobs", label: "Jobs", icon: "\u26a1" },
  { to: "/admin/users", label: "Users", icon: "\ud83d\udc65" },
  { to: "/admin", label: "Dashboard", icon: "\ud83d\udcca", end: true },
];

export default function AdminPanel() {
  return (
    <div className="app-shell">
      <Sidebar links={LINKS} />
      <main className="main">
        <Routes>
          <Route index element={<AdminDashboardView />} />
          <Route path="jobs" element={<AdminJobsView />} />
          <Route path="users" element={<AdminUsersView />} />
        </Routes>
      </main>
    </div>
  );
}
