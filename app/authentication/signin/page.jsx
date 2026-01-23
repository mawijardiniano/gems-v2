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
      { withCredentials: true }
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
        hasProfile: false,
      })
    );


    if (role === "admin") {
      console.log("Admin detected, redirecting to /sample-dashboard");
      router.push("/sample-dashboard");
      return;
    }

    // For regular users, fetch their profile
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
        hasProfile,
      })
    );

    const redirectUrl = hasProfile ? "/dashboard" : "/";
    console.log("Redirecting to:", redirectUrl);
    router.push(redirectUrl);
  } catch (err) {
    console.error("Login error:", err);

    if (err.response?.data?.error) {
      setError(err.response.data.error);
    } else {
      setError("Invalid username or password.");
    }
  }
};


  return (
    <div className="min-h-screen px-4 sm:px-6 md:px-8">
      <div className="flex justify-center items-center min-h-screen py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 md:p-10 space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Enter your credentials to access your account
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            <div className="space-y-4">
              {/* Username input */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700"
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
                    className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Password input */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
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
                    className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Sign in
            </button>

            {/* <div className="flex justify-center">
              <p className="text-sm">
                Don't have an account?{" "}
                <Link
                  href="/authentication/signup"
                  className="text-sm font-medium text-gray-900"
                >
                  Register here
                </Link>
              </p>
            </div> */}
          </form>
        </div>
      </div>
    </div>
  );
}
