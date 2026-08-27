import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
    userId:
      typeof window !== "undefined" ? localStorage.getItem("userId") : null,
    role: typeof window !== "undefined" ? localStorage.getItem("role") : null,
    college:
      typeof window !== "undefined" ? localStorage.getItem("college") : null,
    hasProfile:
      typeof window !== "undefined"
        ? localStorage.getItem("hasProfile") === "true"
        : false,
    isAuthenticated:
      typeof window !== "undefined" ? !!localStorage.getItem("token") : false,
  },

  reducers: {
    loginSuccess: (state, action) => {
      const { token, userId, role, college, hasProfile } = action.payload;

      state.token = token ?? null;
      state.userId = userId;
      state.role = role;
      state.college = college ?? null;
      state.hasProfile = hasProfile;
      state.isAuthenticated = true;

      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }
      localStorage.setItem("userId", userId);
      localStorage.setItem("role", role);
      localStorage.setItem("college", college ?? "");
      localStorage.setItem("hasProfile", hasProfile);
    },
    logout: (state) => {
      state.token = null;
      state.userId = null;
      state.role = null;
      state.college = null;
      state.hasProfile = false;
      state.isAuthenticated = false;

      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("role");
      localStorage.removeItem("college");
      localStorage.removeItem("hasProfile");
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
