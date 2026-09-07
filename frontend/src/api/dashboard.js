import { apiClient } from "./client";

/** Matches app/routers/dashboard.py exactly (prefix /dashboard, under /api). */

export function getMemberDashboard() {
  return apiClient.get("/dashboard/memberStats");
}

export function getAdminDashboard() {
  return apiClient.get("/dashboard/adminStats");
}
