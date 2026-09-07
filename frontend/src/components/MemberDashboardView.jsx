import { useEffect, useState } from "react";
import { getMemberDashboard } from "../api/dashboard";
import { useErrorModal } from "../context/ErrorModalContext";
import StatCard, { BreakdownCard } from "./StatCard";

/**
 * get_Member_dashboard_stats actually returns:
 *   { total_jobs, pending_jobs, running, completed, failed, average_duration_by_type }
 * — flat status counts, not the nested `jobs_by_status` dict the
 * MemberDashboardSchema promises (that field is never populated on the
 * backend). We build the breakdown client-side from the flat counts.
 */
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
            <BreakdownCard
              title="Jobs by status"
              entries={{
                pending: stats.pending_jobs ?? 0,
                running: stats.running ?? 0,
                completed: stats.completed ?? 0,
                failed: stats.failed ?? 0,
              }}
            />
            <BreakdownCard
              title="Average duration by type (s)"
              entries={Object.fromEntries(
                Object.entries(stats.average_duration_by_type || {}).map(([k, v]) => [
                  k,
                  Math.round(v * 10) / 10,
                ])
              )}
            />
          </div>
        </>
      )}
    </>
  );
}
