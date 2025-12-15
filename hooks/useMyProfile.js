import { useState, useEffect } from "react";
import axios from "axios";

export const useMyProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getProfile = async () => {
      try {
        const res = await axios.get("/api/profile/my-profile", {
          withCredentials: true,
        });

        if (res.data.success) {
          setProfile(res.data.data);
          console.log("PROFILE DATA:", res.data.data);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, []);

  return { profile, loading };
};

