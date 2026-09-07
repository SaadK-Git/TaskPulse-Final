import { useState } from "react";
import { useJobLiveState } from "../hooks/useJobLiveState";
import { cancelJob } from "../api/jobs";
import { formatJobType, statusMeta } from "../lib/format";
import ConfirmModal from "./ConfirmModal";
import JobLogsModal from "./JobLogsModal";
import "./JobCard.css";

const CANCELLABLE = new Set(["pending", "running"]);

export default function JobCard({ job, onChanged, onError, ownerLabel }) {
  const { progress, status } = useJobLiveState(job);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const meta = statusMeta(status);
  const canCancel = CANCELLABLE.has(status);

  async function handleConfirmCancel() {
    setCancelling(true);
    try {
      await cancelJob(job.id);
      setConfirmingCancel(false);
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
