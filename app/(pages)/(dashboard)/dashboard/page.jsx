"use client";

import React, { useEffect, useState } from "react";
import { useMyProfile } from "@/hooks/useMyProfile";

export default function Dashboard() {
  const [token, setToken] = useState(null);
  const { profile } = useMyProfile(token);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    setToken(savedToken);
  }, []);

  return (
    <div>
      Welcome {profile?.userId.name}
      <br />
      <div className="flex justify-between p-10">
      <button className="bg-black p-2 text-white rounded-md">
        Edit Profile
      </button>
      </div>

    </div>
  );
}
