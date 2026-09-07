import { useEffect, useState } from "react";
import { useJobLiveState } from "../hooks/useJobLiveState";
import { cancelJob } from "../api/jobs";
import { formatJobType, statusMeta } from "../lib/format";
import ConfirmModal from "./ConfirmModal";
import JobLogsModal from "./JobLogsModal";
import "./JobCard.css";

const CANCELLABLE = new Set(["pending", "running"]);
const TERMINAL = new Set(["completed", "failed", "cancelled"]);

export default function JobCard({ job, onChanged, onError, ownerLabel }) {
  const { progress, status } = useJobLiveState(job);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // The backend's cancel endpoint only sets a Redis flag — it doesn't
  // touch the job's actual status, and the worker has to notice that flag
  // on its own schedule before anything really changes. Without this,
  // the card would look like cancel did nothing for however long that
  // takes. This just tells the truth about what's happening in between:
  // request sent, waiting for the worker to actually honor it.
  const [cancelRequested, setCancelRequested] = useState(false);

  useEffect(() => {
    if (TERMINAL.has(status)) setCancelRequested(false);
  }, [status]);

  const meta = cancelRequested
    ? { label: "Cancelling…", ink: "var(--signal-cancelled)", bg: "var(--signal-cancelled-bg)" }
    : statusMeta(status);
  const canCancel = CANCELLABLE.has(status) && !cancelRequested;

  async function handleConfirmCancel() {
    setCancelling(true);
    try {
      await cancelJob(job.id);
      setConfirmingCancel(false);
      setCancelRequested(true);
      onChanged?.();
    } catch (err) {
      onError?.(err);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="job-card" style={{ "--card-accent": meta.ink }}>
      <div className="job-card__header">
        <div className="job-card__icon" aria-hidden="true">
          📄
        </div>

        <div className="job-card__heading">
          <h3 className="job-card__title">{formatJobType(job.job_type)}</h3>
          {ownerLabel && <span className="job-card__owner">{ownerLabel}</span>}
          <span className="job-card__badge" style={{ color: meta.ink, background: meta.bg }}>
            <span className="job-card__dot" style={{ background: meta.ink }} />
            {meta.label}
          </span>
        </div>

        {canCancel && (
          <button
            className="btn btn--ghost btn--icon"
            title="Cancel job"
            aria-label="Cancel job"
            onClick={() => setConfirmingCancel(true)}
          >
            🗑
          </button>
        )}
      </div>

      <div className="job-card__body">
        <div className="job-card__progress-track">
          <div
            className="job-card__progress-fill"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%`, background: meta.ink }}
          />
        </div>
        <span className="job-card__progress-value mono">{progress}%</span>
      </div>

      <div className="job-card__footer">
        <button className="btn btn--link" onClick={() => setShowLogs(true)}>
          📄 View logs
        </button>
        <span className="job-card__id mono">{job.id.slice(0, 8)}</span>
      </div>

      {confirmingCancel && (
        <ConfirmModal
          title="Cancel this job?"
          message={`"${formatJobType(job.job_type)}" will stop running. This can't be undone.`}
          confirmLabel="Cancel job"
          tone="danger"
          busy={cancelling}
          onConfirm={handleConfirmCancel}
          onCancel={() => setConfirmingCancel(false)}
        />
      )}

      {showLogs && (
        <JobLogsModal job={job} onClose={() => setShowLogs(false)} onError={onError} />
      )}
    </div>
  );
}