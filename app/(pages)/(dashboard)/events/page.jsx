import EventContent from "./content";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";

/* A server-side fetch needs an absolute URL. Fall back to the request's own
   host when NEXT_PUBLIC_BASE_URL is unset, rather than a relative path that
   throws in Node. */
async function apiBase() {
  if (process.env.NEXT_PUBLIC_BASE_URL)
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : "";
}

export default async function EventPage() {
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

  /* A failed lookup only empties the "my events" tabs; the page still
     renders (the client shows its own error for the event list) instead of
     bouncing the user back to the login page. */
  let data = {};
  let unauthorized = false;
  try {
    const res = await fetch(
      `${await apiBase()}/api/events/user-events?user_id=${userId}`,
      {
        headers: { Cookie: `auth_token=${authToken}` },
        cache: "no-store",
      },
    );
    if (res.status === 401) unauthorized = true;
    else if (res.ok) data = await res.json();
    else console.error("user-events failed:", res.status);
  } catch (err) {
    console.error("user-events request failed:", err);
  }
  /* Outside the try: redirect() works by throwing. */
  if (unauthorized) return redirect("/");

  return (
    <EventContent
      createdEvents={data.createdEvents || []}
      participatedEvents={data.participatedEvents || []}
    />
  );
}
