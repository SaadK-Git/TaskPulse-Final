import { apiClient, WS_BASE, API_BASE } from "./client";

/** Matches app/routers/jobs.py (prefix /jobs, role: MEMBER). */

export function getJobs({ page = 1, pageSize = 10 } = {}) {
  return apiClient.get(`/jobs/getjobs/${page}`, { params: { page_size: pageSize } });
}

export function createJob(jobType) {
  return apiClient.post("/jobs/createJob", { job_type: jobType });
}

export function getJobLogs(jobId) {
  return apiClient.get(`/jobs/jobLogs/${jobId}`);
}

export function cancelJob(jobId) {
  return apiClient.post(`/jobs/canceljobs/${jobId}`);
}

/** Live progress — binary websocket, one connection per job card. */
export function jobProgressSocketUrl(jobId) {
  return `${WS_BASE}/jobs/ws/progress/${jobId}`;
}

/** Live status — server-sent events, one stream per job card. */
export function jobStatusStreamUrl(jobId) {
  return `${API_BASE}/jobs/jobstatus/sse/${jobId}`;
}

/** Live logs — server-sent events, opened on demand from the logs modal. */
export function jobLogsStreamUrl(jobId) {
  return `${API_BASE}/jobs/logs/sse/${jobId}`;
}
