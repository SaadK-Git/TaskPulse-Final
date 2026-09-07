import { useCallback, useEffect, useState } from "react";
import { getJobs, createJob } from "../api/jobs";
import { usePersistedState } from "../hooks/usePersistedState";
import { useErrorModal } from "../context/ErrorModalContext";
import JobCard from "./JobCard";
import CreateJobModal from "./CreateJobModal";

const PAGE_SIZE = 9;

export default function MemberJobsView() {
  const { reportError } = useErrorModal();
  const [page, setPage] = usePersistedState("mem.jobs.page", 1);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getJobs({ page, pageSize: PAGE_SIZE })
      .then((data) => setJobs(Array.isArray(data) ? data : []))
      .catch((err) => reportError(err, "Couldn't load your jobs"))
      .finally(() => setLoading(false));
  }, [page, reportError]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(jobType) {
    setCreating(true);
    try {
      await createJob(jobType);
      setShowCreate(false);
      setPage(1);
      load();
    } catch (err) {
      reportError(err, "Couldn't start that job");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Jobs</h1>
          <p>Every job you've started, updating live.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
          + New job
        </button>
      </div>

      {loading ? (
        <div className="empty-state">Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          No jobs yet. Start one with <strong>New job</strong> above.
        </div>
      ) : (
        <div className="grid-jobs">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onChanged={load} onError={(e) => reportError(e)} />
          ))}
        </div>
      )}

      <div className="pagination">
        <button className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span className="mono">Page {page}</span>
        <button
          className="btn btn--ghost"
          disabled={jobs.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>

      {showCreate && (
        <CreateJobModal
          creating={creating}
          onCreate={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  );
}
