import { useCallback, useEffect, useState } from "react";
import { getAllJobsAdmin, normalizeList } from "../api/admin";
import { usePersistedState } from "../hooks/usePersistedState";
import { useErrorModal } from "../context/ErrorModalContext";
import JobCard from "./JobCard";

const PAGE_SIZE = 9;

export default function AdminJobsView() {
  const { reportError } = useErrorModal();
  const [page, setPage] = usePersistedState("adm.jobs.page", 1);
  const [jobType, setJobType] = usePersistedState("adm.jobs.jobtype", "");
  const [activeOnly, setActiveOnly] = usePersistedState("adm.jobs.active", true);
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getAllJobsAdmin({ page, pageSize: PAGE_SIZE, jobType, activeOnly })
      .then((data) => {
        const { items, total: t } = normalizeList(data);
        setJobs(items);
        setTotal(t);
      })
      .catch((err) => reportError(err, "Couldn't load jobs"))
      .finally(() => setLoading(false));
  }, [page, jobType, activeOnly, reportError]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Jobs</h1>
          <p>Every job across every member, updating live.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div className="field">
            <label htmlFor="jobtype-filter">Job type</label>
            <input
              id="jobtype-filter"
              placeholder="e.g. DATA_PROCESSING"
              value={jobType}
              onChange={(e) => {
                setPage(1);
                setJobType(e.target.value);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="state-filter">Status</label>
            <select
              id="state-filter"
              value={activeOnly ? "active" : "inactive"}
              onChange={(e) => {
                setPage(1);
                setActiveOnly(e.target.value === "active");
              }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">No jobs match this filter.</div>
      ) : (
        <div className="grid-jobs">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onChanged={load}
              onError={(e) => reportError(e)}
              ownerLabel={job.owner_email || job.user_email || job.owner_name || undefined}
            />
          ))}
        </div>
      )}

      <div className="pagination">
        <button className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span className="mono">
          Page {page}
          {total ? ` \u00b7 ${total} total` : ""}
        </span>
        <button
          className="btn btn--ghost"
          disabled={jobs.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </>
  );
}
