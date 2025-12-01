
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function useUserList() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const getUsers = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get("/api/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUsers(res.data.data || []);
      } catch (err) {
        setError("Failed to fetch users");
      }
    };

    getUsers();
  }, []);

  return { users, error };
}
