'use client'
import React from "react";
import CreateEventsContent from "./content";
import { useRouter } from "next/navigation";

export default function CreateEventsPage() {
  const router = useRouter();
  return (
    <div className="pt-8">
<div className="pl-2 md:pl-20 pb-6">
        <button
        className="text-sm text-blue-600 hover:underline"
        onClick={() => router.push("/events-list")}
      >
        ← Back to Events
      </button>
</div>
            
      <CreateEventsContent />
    </div>
  );
}
