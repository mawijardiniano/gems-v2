"use client";

import { useState } from "react";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import axios from "axios";
import { loginSuccess } from "@/store/slices/authSlice";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      console.log("Logging in with:", { username, password });

      const res = await axios.post(
        "/api/auth/login",
        { username, password },
        { withCredentials: true },
      );

      const user = res.data.user;
      console.log("Logged in user:", user);

      if (!user) {
        setError("No user returned from login.");
        return;
      }

      const role = user.role.toLowerCase();
      console.log("User role:", role);

      dispatch(
        loginSuccess({
          userId: user._id,
          role,
          college: user.assignedCollege,
          hasProfile: false,
        }),
      );

      if (role === "admin") {
        console.log("Admin detected, redirecting to /admin-dashboard");
        router.push("/admin-dashboard");
        return;
      }

      if (role === "gad focal person" || role === "gad coordinator") {
        console.log("Focal detected, redirecting to /events-dashboard");
        router.push("/events-dashboard");
        return;
      }

      if (role === "planning director") {
        console.log("Focal detected, redirecting to /gpb");
        router.push("/planning-director/dashboard");
        return;
      }

            if (role === "dean") {
        console.log("Focal detected, redirecting to /dean-dashboard");
        router.push("/dean/dashboard");
        return;
      }
      

      const profileRes = await axios.get("/api/profile/my-profile", {
        withCredentials: true,
      });

      console.log("Profile response:", profileRes.data);

      const profile = profileRes.data.data;
      const hasProfile = !!profile;

      console.log("Has profile:", hasProfile);

      dispatch(
        loginSuccess({
          userId: user._id,
          role,
          college: user.assignedCollege,
          hasProfile,
        }),
      );

      const redirectUrl = hasProfile ? "/dashboard" : "/";
      console.log("Redirecting to:", redirectUrl);
      router.push(redirectUrl);
    } catch (err) {
      console.error("Login error:", err);

      const status = err.response?.status;
      const message = err.response?.data?.error;

      if (status === 403) {
        setError(message || "Account is deactivated.");
        return;
      }

      if (status === 401) {
        setError(message || "Invalid username or password.");
        return;
      }

      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className=" px-4 sm:px-6 md:px-8">
      <div className="flex justify-center items-center  py-16 px-6">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-black">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-gray-800">
                Enter your credentials to access your account
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-800"
                >
                  Username
                </label>
                <div className="mt-1">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="appearance-none block w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-800"
                >
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="appearance-none block w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-900 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Sign in
            </button>



            <div className="flex justify-center">
              <p className="text-sm">
                Don't have an account?{" "}
                <Link
                  href="/profile-registration"
                  className="text-sm font-medium text-orange-500"
                >
                  Register here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
