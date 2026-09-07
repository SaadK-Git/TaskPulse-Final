export function formatJobType(jobType = "") {
  return jobType
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Matches app/enums.py JobStatus values exactly: pending, running,
 * completed, failed, cancelled (all lowercase).
 */
export function statusMeta(status) {
  switch (status) {
    case "running":
      return { label: "Running", ink: "var(--signal-running)", bg: "var(--signal-running-bg)" };
    case "completed":
      return { label: "Completed", ink: "var(--signal-done)", bg: "var(--signal-done-bg)" };
    case "failed":
      return { label: "Failed", ink: "var(--signal-failed)", bg: "var(--signal-failed-bg)" };
    case "cancelled":
      return { label: "Cancelled", ink: "var(--signal-cancelled)", bg: "var(--signal-cancelled-bg)" };
    case "pending":
    default:
      return { label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending", ink: "var(--signal-pending)", bg: "var(--signal-pending-bg)" };
  }
}

export function timeAgo(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}
