import { useEffect, useState } from "react";
import { getMemberDashboard } from "../api/dashboard";
import { useErrorModal } from "../context/ErrorModalContext";
import StatCard, { BreakdownCard } from "./StatCard";

export default function MemberDashboardView() {
  const { reportError } = useErrorModal();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getMemberDashboard()
      .then(setStats)
      .catch((err) => reportError(err, "Couldn't load your dashboard"));
  }, [reportError]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Your jobs, at a glance.</p>
        </div>
      </div>

      {!stats ? (
        <div className="empty-state">Loading stats…</div>
      ) : (
        <>
          <div className="grid-jobs" style={{ marginBottom: 20 }}>
            <StatCard label="Total jobs" value={stats.total_jobs ?? 0} accent="var(--signal-running)" />
          </div>
          <div className="grid-jobs">
            <BreakdownCard title="Jobs by status" entries={stats.jobs_by_status} />
            <BreakdownCard title="Average duration by type (s)" entries={stats.average_duration_by_type} />
          </div>
        </>
      )}
    </>
  );
}
