import axios from "axios";

const BASE_URL = "http://localhost:8000/api/auth";

export async function login(username, password) {
  try {
    const response = await axios.post(`${BASE_URL}/login`, { username, password } , {withCredentials: true});
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status,
      data: { message: error.response?.data?.detail ?? "Login failed. Try again." },
    };
  }
}

export async function register(email, username, password) {
  try {
    const response = await axios.post(`${BASE_URL}/register`, { email, username, password }, {withCredentials: true});
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status,
      data: { message: error.response?.data?.detail ?? "Registration failed. Try again." },
    };
  }
}