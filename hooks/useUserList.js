"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function useUserList() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUsers = async () => {
      try {
        const res = await axios.get("/api/profile", { withCredentials: true });
        setUsers(res.data.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };

    getUsers();
  }, []);

  return { users, error, loading };
}
