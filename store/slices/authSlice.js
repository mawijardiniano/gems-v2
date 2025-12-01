import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
    userId:
      typeof window !== "undefined" ? localStorage.getItem("userId") : null,
    role: typeof window !== "undefined" ? localStorage.getItem("role") : null,
    hasProfile:
      typeof window !== "undefined"
        ? localStorage.getItem("hasProfile") === "true"
        : false,
    isAuthenticated:
      typeof window !== "undefined" ? !!localStorage.getItem("token") : false,
  },

  reducers: {
    loginSuccess: (state, action) => {
      const { token, userId, role, hasProfile } = action.payload;

      state.token = token;
      state.userId = userId;
      state.role = role;
      state.hasProfile = hasProfile;
      state.isAuthenticated = true;

      localStorage.setItem("token", token);
      localStorage.setItem("userId", userId);
      localStorage.setItem("role", role);
      localStorage.setItem("hasProfile", hasProfile);
    },
    logout: (state) => {
      state.token = null;
      state.userId = null;
      state.role = null;
      state.hasProfile = false;
      state.isAuthenticated = false;

      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("role");
      localStorage.removeItem("hasProfile");
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
