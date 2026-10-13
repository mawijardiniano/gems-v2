import { redirect } from "next/navigation";

export default async function EventsAttendanceAliasPage({ params }) {
  const { id } = await params;
  redirect(`/attend/${id}`);
}
