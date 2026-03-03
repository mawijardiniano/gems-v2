import UserListPageContent from "../content";
import { cookies } from "next/headers";

export default async function EmployeesUserListPage() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/profile`, {
    headers: {
      Cookie: `auth_token=${authToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch users");
  }

  const data = await res.json();

  return <UserListPageContent users={data.data} defaultType="Employee" />;
}
