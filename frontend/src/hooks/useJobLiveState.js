import { useEffect, useRef, useState } from "react";
import { jobProgressSocketUrl, jobStatusStreamUrl } from "../api/jobs";

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);
const RECONNECT_DELAY_MS = 1500;

/**
 * One job = one WebSocket (progress) + one SSE stream (status), with
 * auto-reconnect. This matters specifically because `uvicorn --reload`
 * hard-kills the whole process on every backend file save, dropping every
 * open connection with no warning — without a retry loop, a card just
 * freezes forever the moment that happens, which looks exactly like "the
 * websocket doesn't work" even though the code and the connection were
 * both fine a second earlier.
 *
 * We only retry while the job is still non-terminal — once we've seen a
 * terminal status (from either stream), we stop for good, same as before.
 */
export function useJobLiveState(job) {
  const [progress, setProgress] = useState(job.progress ?? 0);
  const [status, setStatus] = useState(job.status);
  const statusRef = useRef(job.status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(job.status)) return;

    let cancelled = false;
    let ws;
    let retryTimer;

    function connect() {
      if (cancelled || TERMINAL_STATUSES.has(statusRef.current)) return;

      ws = new WebSocket(jobProgressSocketUrl(job.id));

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (typeof data.progress === "number") {
            setProgress(Math.min(100, Math.max(0, data.progress)));
          }
        } catch {
          /* ignore malformed frame */
        }
      };

      ws.onclose = () => {
        if (cancelled || TERMINAL_STATUSES.has(statusRef.current)) return;
        retryTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      ws?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(job.status)) return;

    let cancelled = false;
    let source;
    let retryTimer;

    function connect() {
      if (cancelled || TERMINAL_STATUSES.has(statusRef.current)) return;

      source = new EventSource(jobStatusStreamUrl(job.id), { withCredentials: true });

      source.onmessage = (event) => {
        const nextStatus = event.data; // plain string, not JSON
        setStatus(nextStatus);
        if (TERMINAL_STATUSES.has(nextStatus)) source.close();
      };

      source.onerror = () => {
        source.close();
        if (cancelled || TERMINAL_STATUSES.has(statusRef.current)) return;
        retryTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      source?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  return { progress, status };
}