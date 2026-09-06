import { Route, Routes } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import MemberJobsView from "../components/MemberJobsView";
import MemberDashboardView from "../components/MemberDashboardView";

const LINKS = [
  { to: "/member/jobs", label: "Jobs", icon: "\u26a1" },
  { to: "/member", label: "Dashboard", icon: "\ud83d\udcca", end: true },
];

export default function Memberpanel() {
  return (
    <div className="app-shell">
      <Sidebar links={LINKS} />
      <main className="main">
        <Routes>
          <Route index element={<MemberDashboardView />} />
          <Route path="jobs" element={<MemberJobsView />} />
        </Routes>
      </main>
    </div>
  );
}
