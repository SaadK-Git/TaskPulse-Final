import { useEffect, useRef, useState } from "react";
import { getJobLogs, jobLogsStreamUrl } from "../api/jobs";
import "./Modal.css";
import "./JobLogsModal.css";

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

/**
 * Notes on the backend, since they shape this component:
 *
 * - GET /jobs/jobLogs/{id} (used for the initial load below) goes through
 *   the JobLogRead pydantic model, so it's reliable for both running and
 *   finished jobs.
 * - The SSE stream (/jobs/logs/sse/{id}) does two things worth knowing:
 *     1. On connect, for an already-terminal job, event_stream_jobLogs
 *        tries to json.dumps the raw SQLAlchemy log rows directly (not
 *        through JobLogRead) — that's not JSON-serializable and will
 *        error server-side. So we simply don't open the SSE tail for a
 *        job that's already finished; the REST fetch above already has
 *        the full history for that case.
 *     2. For a running job, it replays full history again *before* new
 *        entries, and separately reflows status pings as {"status":..}
 *        objects with no "message" field. We de-dupe against what REST
 *        already gave us and drop anything without a message.
 */
export default function JobLogsModal({ job, onClose, onError }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const seen = useRef(new Set());

  function signature(entry) {
    return `${entry.id ?? ""}|${entry.created_at ?? ""}|${entry.message ?? ""}`;
  }

  function addEntry(entry) {
    const sig = signature(entry);
    if (seen.current.has(sig)) return;
    seen.current.add(sig);
    setLogs((prev) => [...prev, entry]);
  }

  useEffect(() => {
    let cancelled = false;

    getJobLogs(job.id)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        list.forEach((entry) => seen.current.add(signature(entry)));
        setLogs(list);
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

  // Tail new lines live while the modal is open — only for jobs that
  // aren't finished yet (see note above on why terminal jobs skip this).
  useEffect(() => {
    if (TERMINAL_STATUSES.has(job.status)) return;

    const source = new EventSource(jobLogsStreamUrl(job.id), { withCredentials: true });

    source.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data);
        if (entry.message === undefined) return; // status ping, not a log line
        addEntry(entry);
      } catch {
        /* ignore malformed frame */
      }
    };

    source.onerror = () => source.close();

    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id, job.status]);

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
