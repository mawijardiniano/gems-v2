import GenderEquityDataContent from "./content";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function GenderEquityDataPage() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;

  if (!authToken) {
    return redirect("/");
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/profile/my-profile`,
    {
      headers: {
        Cookie: `auth_token=${authToken}`,
      },
    },
  );

  if (!res.ok) {
    return redirect("/");
  }

  const data = await res.json();

  return <GenderEquityDataContent profile={data.data} />;
}
