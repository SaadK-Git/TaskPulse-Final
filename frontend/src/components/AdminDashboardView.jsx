import { useEffect, useState } from "react";
import { getAdminDashboard } from "../api/dashboard";
import { useErrorModal } from "../context/ErrorModalContext";
import StatCard, { BreakdownCard } from "./StatCard";

export default function AdminDashboardView() {
  const { reportError } = useErrorModal();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getAdminDashboard()
      .then(setStats)
      .catch((err) => reportError(err, "Couldn't load the dashboard"));
  }, [reportError]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Everyone's jobs, at a glance.</p>
        </div>
      </div>

      {!stats ? (
        <div className="empty-state">Loading stats…</div>
      ) : (
        <>
          <div className="grid-jobs" style={{ marginBottom: 20 }}>
            <StatCard label="Total users" value={stats.total_users ?? 0} accent="var(--signal-done)" />
            <StatCard label="Total jobs" value={stats.total_jobs ?? 0} accent="var(--signal-running)" />
          </div>
          <div className="grid-jobs">
            <BreakdownCard title="Jobs by status" entries={stats.jobs_by_status} />
            <BreakdownCard title="Worker status" entries={stats.worker_status} />
          </div>
        </>
      )}
    </>
  );
}
