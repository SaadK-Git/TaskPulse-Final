import { useEffect, useState } from "react";
import { jobProgressSocketUrl, jobStatusStreamUrl } from "../api/jobs";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

/**
 * One job = one WebSocket (progress, from JobProgress schema: job_id,
 * progress, stage) + one SSE stream (status). Mirrors the pattern already
 * agreed on: the initial REST job object seeds state, then these two
 * connections are the only things that change it. Both close themselves
 * once the job reaches a terminal status, so a finished job doesn't keep
 * a live socket open in the background.
 *
 * ASSUMPTION: the status SSE payload is JSON shaped like `{ status }`
 * (no schema was given for it) — adjust the one line marked below if the
 * backend actually sends something else.
 */
export function useJobLiveState(job) {
  const [progress, setProgress] = useState(job.progress ?? 0);
  const [stage, setStage] = useState(null);
  const [status, setStatus] = useState(job.status);
  const [connectionIssue, setConnectionIssue] = useState(false);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(job.status)) return; // never opens sockets for finished jobs

    let closedByUs = false;
    const ws = new WebSocket(jobProgressSocketUrl(job.id));

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (typeof data.progress === "number") setProgress(data.progress);
        if (data.stage) setStage(data.stage);
      } catch {
        /* ignore malformed frame */
      }
    };

    ws.onerror = () => setConnectionIssue(true);

    ws.onclose = () => {
      if (!closedByUs) setConnectionIssue(true);
    };

    return () => {
      closedByUs = true;
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(job.status)) return;

    const source = new EventSource(jobStatusStreamUrl(job.id), { withCredentials: true });

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const nextStatus = data.status ?? data; // <- adjust if payload shape differs
        setStatus(nextStatus);
        if (TERMINAL_STATUSES.has(nextStatus)) source.close();
      } catch {
        /* ignore malformed frame */
      }
    };

    source.onerror = () => {
      setConnectionIssue(true);
      source.close();
    };

    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  return { progress, stage, status, connectionIssue };
}
