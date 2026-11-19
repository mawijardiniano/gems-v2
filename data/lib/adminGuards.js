import mongoose from "mongoose";
import UserAuth from "@/models/user";

/* Guards shared by the user-management routes (role change, deactivate,
   delete). Their job is to keep the system administrable: an admin must not
   remove their own access by accident, and the last active Admin must never
   be demoted, deactivated or deleted — after that nobody can manage roles. */

export function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ""));
}

export function isSelf(actor, targetId) {
  return String(actor?._id || "") === String(targetId || "");
}

/**
 * True when the given account ids include every remaining active Admin, i.e.
 * removing Admin access from all of them would leave none.
 */
export async function wouldRemoveLastAdmin(targetIds) {
  const ids = (Array.isArray(targetIds) ? targetIds : [targetIds]).map(String);
  const activeAdmins = await UserAuth.find(
    { role: "Admin", is_active: { $ne: false } },
    { _id: 1 },
  ).lean();
  if (activeAdmins.length === 0) return false;
  return activeAdmins.every((a) => ids.includes(String(a._id)));
}

export const ROLE_VALUES = UserAuth.schema.path("role").enumValues;
