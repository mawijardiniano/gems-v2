"use client";

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";

export default function UserListPageContent({ users }) {
  return (
    <div className="p-6">

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User List</h1>
        <h1 className="text-2xl font-bold">Filters?</h1>
      </div>

      <div className="overflow-x-auto">
        <Table className="bg-white" striped={false} color="none">
          <TableHead className="bg-gray-200 text-black">
            <TableHeadCell>Name</TableHeadCell>
            <TableHeadCell>Email</TableHeadCell>
            <TableHeadCell>College</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell>
              <span className="sr-only">Actions</span>
            </TableHeadCell>
          </TableHead>

          <TableBody className="bg-white divide-y">
            {users.map((user, index) => (
              <TableRow
                key={user.id || index}
                className="bg-white hover:bg-gray-50"
              >
                <TableCell>
                  {user.personal.firstName} {user.personal.lastName}
                </TableCell>
                <TableCell>{user.contact.email}</TableCell>
                <TableCell className="w-64">
                  {user.affiliation.college}
                </TableCell>
                <TableCell>{user.currentStatus}</TableCell>
                <TableCell>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700 px-2 py-1 text-sm">
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {users.length === 0 && (
              <TableRow className="bg-white">
                <TableCell colSpan={5} className="text-center py-4">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
