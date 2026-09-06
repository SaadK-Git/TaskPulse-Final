import { apiClient } from "./client";

/**
 * Matches app/routers/auth.py.
 * Note: login is by `name`, not email — the backend's Userlogin schema
 * only has { name, password }. Registration still collects an email.
 */

export function registerUser({ name, email, password, role = "member" }) {
  return apiClient.post("/auth/register", { name, email, password, role });
}

export function loginUser({ name, password }) {
  return apiClient.post("/auth/login", { name, password });
}

export function fetchCurrentUser() {
  return apiClient.get("/auth/me");
}

export function logoutUser() {
  return apiClient.get("/auth/logout");
}
