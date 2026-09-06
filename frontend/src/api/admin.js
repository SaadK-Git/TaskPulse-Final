import { apiClient } from "./client";

/**
 * Matches app/routers/admin.py (prefix /admin, role: ADMIN).
 *
 * ASSUMPTION (please confirm against get_AllUsers / get_all_Jobs in
 * admin_service.py): the `state` flag is treated as "show active only"
 * vs "show deactivated only" — there's no third "show everything" value
 * since it's a plain bool with default True. If the service actually
 * ignores `state` when omitted, swap the two-way toggle in UsersView
 * for a three-way one and drop the default here.
 */

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
 * The two list endpoints don't have a documented envelope. This normalizes
 * either a bare array or a `{ items / results / users / projects, total }`
 * shaped response so the UI doesn't care which one comes back.
 */
export function normalizeList(payload) {
  if (Array.isArray(payload)) {
    return { items: payload, total: payload.length };
  }
  if (payload && typeof payload === "object") {
    const items =
      payload.items || payload.results || payload.users || payload.projects || payload.jobs || [];
    return { items, total: payload.total ?? items.length };
  }
  return { items: [], total: 0 };
}
