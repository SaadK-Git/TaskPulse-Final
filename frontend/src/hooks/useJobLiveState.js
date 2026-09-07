import { useEffect, useState } from "react";
import { jobProgressSocketUrl, jobStatusStreamUrl } from "../api/jobs";

/**
 * Matches app/enums.py JobStatus exactly (lowercase, matching your DB/enum
 * values — NOT what I originally guessed).
 */
const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

/**
 * One job = one WebSocket (progress) + one SSE stream (status).
 *
 * Real payload shapes, confirmed from job_service.py:
 * - WebSocket sends plain JSON: {"job_id": "...", "progress": <int>} —
 *   no "stage" field is ever sent, so we don't track one.
 * - The status SSE does NOT send JSON. handle_job_progress/
 *   event_stream_jobStatus literally does `yield f"data: {status}\n\n"`
 *   where status is the bare string ("running", "completed", etc), not
 *   `{"status": "running"}`. event.data IS the status — JSON.parse-ing
 *   it (what the previous version did) throws on every single message,
 *   which is why the status pill never updated. Fixed below.
 */
export function useJobLiveState(job) {
  const [progress, setProgress] = useState(job.progress ?? 0);
  const [status, setStatus] = useState(job.status);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(job.status)) return; // finished jobs never open sockets

    const ws = new WebSocket(jobProgressSocketUrl(job.id));

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (typeof data.progress === "number") setProgress(data.progress);
      } catch {
        /* ignore malformed frame */
      }
    };

    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(job.status)) return;

    const source = new EventSource(jobStatusStreamUrl(job.id), { withCredentials: true });

    source.onmessage = (event) => {
      const nextStatus = event.data; // plain string, not JSON — see note above
      setStatus(nextStatus);
      if (TERMINAL_STATUSES.has(nextStatus)) source.close();
    };

    source.onerror = () => source.close();

    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  return { progress, status };
}
