import { useEffect, useRef, useState } from "react";
import { getJobLogs, jobLogsStreamUrl } from "../api/jobs";
import "./Modal.css";
import "./JobLogsModal.css";

export default function JobLogsModal({ job, onClose, onError }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    getJobLogs(job.id)
      .then((data) => {
        if (!cancelled) setLogs(Array.isArray(data) ? data : []);
      })
      .catch((err) => onError?.(err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  // Tail new lines live while the modal is open.
  useEffect(() => {
    const source = new EventSource(jobLogsStreamUrl(job.id), { withCredentials: true });

    source.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data);
        setLogs((prev) => [...prev, entry]);
      } catch {
        /* ignore malformed frame */
      }
    };

    source.onerror = () => source.close();

    return () => source.close();
  }, [job.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [logs.length]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal modal--wide logs-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="logs-modal__header">
          <h3>Logs — {job.job_type}</h3>
          <button className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="logs-modal__body mono">
          {loading && <div className="logs-modal__empty">Loading logs…</div>}
          {!loading && logs.length === 0 && (
            <div className="logs-modal__empty">No log entries yet.</div>
          )}
          {logs.map((entry, i) => (
            <div key={entry.id ?? i} className={`logs-modal__line logs-modal__line--${(entry.level || "info").toLowerCase()}`}>
              <span className="logs-modal__level">{(entry.level || "info").toUpperCase()}</span>
              <span>{entry.message}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
