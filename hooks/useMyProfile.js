import { useState, useEffect } from "react";
import axios from "axios";

export const useMyProfile = (token) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getProfile = async () => {
      try {
        const res = await axios.get("/api/profile/my-profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setProfile(res.data.data);
        console.log("DATA", res.data.data)
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) getProfile();
  }, [token]);

  return { profile, loading };
};
