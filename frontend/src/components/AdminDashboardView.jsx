import { useEffect, useState } from "react";
import { getAdminDashboard } from "../api/dashboard";
import { useErrorModal } from "../context/ErrorModalContext";
import StatCard from "./StatCard";

/**
 * get_Admin_dashboard_stats actually returns:
 *   { total_users, total_jobs, worker_status: { active_workers } }
 * — no jobs_by_status at all, despite AdmindashboardSchema declaring one
 * (that field is never computed on the backend, and response_model isn't
 * actually wired to the route — see NOTES.md). So this shows three plain
 * numbers instead of a breakdown that has no data to show.
 */
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
        <div className="grid-jobs">
          <StatCard label="Total users" value={stats.total_users ?? 0} accent="var(--signal-done)" />
          <StatCard label="Total jobs" value={stats.total_jobs ?? 0} accent="var(--signal-running)" />
          <StatCard
            label="Active workers"
            value={stats.worker_status?.active_workers ?? 0}
            accent="var(--signal-pending)"
          />
        </div>
      )}
    </>
  );
}
