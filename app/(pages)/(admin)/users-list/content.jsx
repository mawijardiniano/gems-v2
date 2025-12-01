"use client";

import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";

export default function UserListPageContent({ useUserList }) {
  const { users, error } = useUserList();
  return (
    <div className="p-6">
      <Breadcrumb aria-label="Default breadcrumb example">
        <BreadcrumbItem
          href="/admin-dashboard"
          className="hover:text-black focus:text-black"
        >
          Dashboard
        </BreadcrumbItem>
        <BreadcrumbItem>User List</BreadcrumbItem>
      </Breadcrumb>

      <div className="flex justify-between items-center mt-4 mb-6">
        <h1 className="text-3xl font-bold">User List</h1>
        <Button className="bg-black text-white hover:bg-gray-800">
          Add User
        </Button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="overflow-x-auto">
        <Table className="bg-white" striped={false} color="none">
          <TableHead className="bg-gray-200 text-black">
            <TableHeadCell>ID</TableHeadCell>
            <TableHeadCell>Name</TableHeadCell>
            <TableHeadCell>Email</TableHeadCell>
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
                <TableCell>{user._id}</TableCell>
                <TableCell>
                  {user.personal.firstName} {user.personal.lastName}
                </TableCell>
                <TableCell>{user.contact.email}</TableCell>
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
