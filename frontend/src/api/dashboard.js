import { apiClient } from "./client";

/**
 * TODO(confirm): no router was shared for MemberDashboardSchema /
 * AdmindashboardSchema, so these paths are a guess based on your other
 * routers' naming (prefix + noun). Update the two paths below once you
 * paste the actual dashboard router — nothing else in the dashboard UI
 * needs to change, it just reads whatever shape these return.
 */
export function getMemberDashboard() {
  return apiClient.get("/member/dashboard");
}

export function getAdminDashboard() {
  return apiClient.get("/admin/dashboard");
}
