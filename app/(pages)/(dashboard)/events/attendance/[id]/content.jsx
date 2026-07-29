"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AttendancePageContent() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id;

  useEffect(() => {
    if (eventId) {
      router.replace(`/events/discover/${eventId}?attendance=1`);
    }
  }, [eventId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Redirecting...</p>
      </div>
    </div>
  );
}