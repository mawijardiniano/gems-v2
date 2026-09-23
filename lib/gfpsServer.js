import mongoose from "mongoose";
import UniversityOfficial from "@/models/universityOfficials";

/**
 * Officials are stored as one document per filled seat
 * (header + title + unit, see lib/universityOfficialsConstants.js), so the
 * lookup helpers below simply search that flat roster.
 */

const userAuthPopulate = {
  path: "personal_info_id",
  populate: {
    path: "personal",
  },
};

export const UNIVERSITY_OFFICIALS_POPULATE = [
  {
    path: "name",
    model: "UserAuth",
    populate: userAuthPopulate,
  },
];

export const GFPS_SECTION_KEYS = [
  "chairOrHeadOfAgency",
  "executiveCommittee",
  "technicalWorkingGroup",
  "secretariat",
];

export const getId = (o) =>
  typeof o === "object" ? o?._id?.toString() : o?.toString();

export function findMemberIndex(members, newMember) {
  const newRef = getId(newMember.official_ref);
  const newId = getId(newMember.official);

  if (newRef) {
    const refIndex = members.findIndex(
      (m) => getId(m.official_ref) === newRef
    );
    if (refIndex !== -1) return refIndex;

    return members.findIndex(
      (m) => !m.official_ref && getId(m.official) === newId
    );
  }

  return members.findIndex(
    (m) => !m.official_ref && getId(m.official) === newId
  );
}

export function mergeMembers(existing, incoming) {
  incoming.forEach((newMember) => {
    const index = findMemberIndex(existing, newMember);

    if (index !== -1) {
      existing[index] = { ...existing[index], ...newMember };
    } else {
      existing.push(newMember);
    }
  });
}

export function removeSensitiveUserFields(userAuth) {
  if (!userAuth) return userAuth;

  const obj =
    typeof userAuth.toObject === "function"
      ? userAuth.toObject()
      : { ...userAuth };

  delete obj.username;
  delete obj.password;
  delete obj.role;
  delete obj.createdAt;
  delete obj.updatedAt;

  return obj;
}

export const normalizeSectionOfficials = (section) => {
  if (!section) return section;

  if (!section.members && section.official) {
    return {
      ...section,
      official: getId(section.official),
    };
  }

  if (Array.isArray(section)) {
    return section.map((m) => ({
      ...m,
      official: getId(m.official),
      first_name: m.first_name,
      last_name: m.last_name,
    }));
  }

  return {
    ...section,
    members: (section.members || []).map((m) => ({
      ...m,
      official: getId(m.official),
      role: m.role || "member",
      first_name: m.first_name,
      last_name: m.last_name,
    })),
  };
};

export function makeFilterHelpers(universityOfficials) {
  const officials = Array.isArray(universityOfficials)
    ? universityOfficials.filter(Boolean)
    : universityOfficials
      ? [universityOfficials]
      : [];

  function findOfficialById(id, refId) {
    const refStr = refId ? refId.toString() : null;
    const idStr = id ? id.toString() : null;

    if (!refStr && !idStr) return null;

    if (refStr) {
      const byRef = officials.find(
        (o) =>
          o._id?.toString() === refStr ||
          o.name?._id?.toString() === refStr ||
          o.name?.toString() === refStr
      );
      if (byRef) return byRef;
    }

    return (
      officials.find((o) => {
        const nameId = typeof o.name === "object" ? o.name?._id : o.name;
        return (
          o._id?.toString() === idStr || nameId?.toString() === idStr
        );
      }) || null
    );
  }

  function filterOfficialWithDetails(member) {
    if (!member?.official) return member;

    const details = findOfficialById(member.official, member.official_ref);
    if (!details) return { ...member, official: null };

    const personal = details?.name?.personal_info_id?.personal;

    const first_name =
      personal?.first_name ||
      details.first_name ||
      member.first_name ||
      "";

    const last_name =
      personal?.last_name ||
      details.last_name ||
      member.last_name ||
      "";

    return {
      ...member,
      official: {
        ...details,
        name: removeSensitiveUserFields(details.name),
        personal_info_id: details?.name?.personal_info_id?._id || details?.personal_info_id,
        first_name,
        last_name,
      },
    };
  }

  function filterSectionWithDetails(section) {
    if (!section) return section;

    if (Array.isArray(section)) {
      return section.map(filterOfficialWithDetails);
    }

    if (section.members) {
      return {
        ...section,
        members: section.members.map(filterOfficialWithDetails),
      };
    }

    if (section.official) {
      return filterOfficialWithDetails(section);
    }

    return section;
  }

  return { filterOfficialWithDetails, filterSectionWithDetails };
}

/**
 * GFPS records may hold either a seat document id or the person's UserAuth
 * id; normalize both to the person's UserAuth id.
 */
export async function normalizeOfficialId(id) {
  if (!id) return null;
  const idStr = id.toString();

  if (mongoose.isValidObjectId(idStr)) {
    const found = await UniversityOfficial.findById(idStr).lean();
    if (found?.name) return found.name.toString();
  }

  return id;
}

export function getGFPSMemberList(doc, sectionKey) {
  const section = doc?.[sectionKey];
  if (!section) return null;

  if (Array.isArray(section)) return section;
  if (Array.isArray(section.members)) return section.members;

  return null;
}
