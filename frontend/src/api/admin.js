import { apiClient } from "./client";

/** Matches app/routers/admin.py exactly (prefix /admin, under /api). */

export function getAllUsers({ page = 1, pageSize = 10, activeOnly = true } = {}) {
  return apiClient.get("/admin/allUsers", {
    params: { page, page_size: pageSize, state: activeOnly },
  });
}

export function getAllJobsAdmin({ page = 1, pageSize = 10, jobType = "", activeOnly = true } = {}) {
  return apiClient.get("/admin/allProjects", {
    params: { page, page_size: pageSize, jobtype: jobType, state: activeOnly },
  });
}

export function deactivateUser(userId) {
  return apiClient.put(`/admin/users/${userId}/deactivate`);
}

export function activateUser(userId) {
  return apiClient.put(`/admin/users/${userId}/activate`);
}

/**
 * Confirmed against admin_service.py:
 *   get_AllUsers  -> { total_users, page, page_size, users }
 *   get_all_jobs  -> { total_jobs, page, page_size, jobs }
 * (Two different envelope shapes for two different lists — this reads
 * whichever pair is present instead of assuming one fixed shape.)
 */
export function normalizeList(payload) {
  if (Array.isArray(payload)) {
    return { items: payload, total: payload.length };
  }
  if (payload && typeof payload === "object") {
    const items = payload.users || payload.jobs || payload.items || [];
    const total = payload.total_users ?? payload.total_jobs ?? payload.total ?? items.length;
    return { items, total };
  }
  return { items: [], total: 0 };
}
