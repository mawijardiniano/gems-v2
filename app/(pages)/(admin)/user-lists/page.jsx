import { redirect } from "next/navigation";

/* The old combined list here was broken (Edit and Delete did nothing and the
   filters only searched the rows already loaded) and duplicated the
   Students and Employees pages, which page and filter on the server. Kept as
   a redirect so the "User Lists" breadcrumb and old links still land on a
   working list. */
export default function UsersListPage() {
  redirect("/user-lists/students");
}
