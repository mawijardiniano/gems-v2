"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get("/api/profile/my-profile", {
          withCredentials: true, 
        });

        console.log("Profile API response:", res.data); 

        const hasProfile = res.data?.hasProfile ?? res.data?.data?.hasProfile;

        if (hasProfile) {
          router.replace("/dashboard");
        } else {
          setAuthorized(true);
        }
      } catch (err) {
        console.error(err);
        router.replace("/");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);
  if (!authorized) return null;

  return <>{children}</>;
}
