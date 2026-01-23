import InvitedContent from "./content";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";

export default async function InvitedPage() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;

  if (!authToken) return redirect("/");

  let userId;
  try {
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch (err) {
    console.error("Invalid token", err);
    return redirect("/");
  }

  const res = await fetch(
    `${
      process.env.NEXT_PUBLIC_BASE_URL || ""
    }/api/events/user-events?user_id=${userId}`,
    {
      headers: { Cookie: `auth_token=${authToken}` },
      cache: "no-store",
    }
  );

  if (!res.ok) return redirect("/");

  const data = await res.json();
  console.log("invitedEvents", data.invitedEvents);
  return (
    <InvitedContent
      participatedEvents={data.participatedEvents}
      invitedEvents={data.invitedEvents}
    />
  );
}
