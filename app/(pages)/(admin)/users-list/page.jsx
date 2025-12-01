import useUserList from "@/hooks/useUserList";
import UserListPageContent from "./content";

async function getData() {
  return { useUserList };
}

export default async function UsersListPage() {
  return <UserListPageContent {...await getData()} />;
}
