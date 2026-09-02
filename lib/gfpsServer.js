import UniversityOfficial from "@/models/universityOfficials";

const userAuthPopulate = {
  path: "personal_info_id",
  populate: {
    path: "personal",
  },
};

export const OFFICIAL_GROUP_KEYS = [
  "president",
  "vicePresidents",
  "campusDirectors",
  "collegeDeans",
  "associateDeans",
  "office_of_the_president",
  "office_of_the_vice_president_academic_affairs",
  "office_of_the_vice_president_admin_finance",
  "office_of_the_vice_president_student_affairs",
  "office_of_the_vice_president_research_extension",
];

export const UNIVERSITY_OFFICIALS_POPULATE = OFFICIAL_GROUP_KEYS.map(
  (group) => ({
    path: `${group}.name`,
    model: "UserAuth",
    populate: userAuthPopulate,
  }),
);

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

export const getOfficialGroups = (universityOfficials) =>
  OFFICIAL_GROUP_KEYS.map((group) => ({
    arr:
      group === "president"
        ? universityOfficials?.president
          ? [universityOfficials.president]
          : []
        : universityOfficials?.[group],
    group,
  }));

export function makeFilterHelpers(universityOfficials) {
  function findOfficialById(id, refId) {
    if (!id || !universityOfficials) return null;

    const idStr = id.toString();

    if (refId) {
      const refStr = refId.toString();
      for (const { arr, group } of getOfficialGroups(universityOfficials)) {
        if (!Array.isArray(arr)) continue;
        const found = arr.find((item) => item._id?.toString() === refStr);
        if (found) return { ...found, group };
      }
    }

    for (const { arr, group } of getOfficialGroups(universityOfficials)) {
      if (!Array.isArray(arr)) continue;

      const found = arr.find((item) => {
        const nameId =
          typeof item.name === "object" ? item.name?._id : item.name;

        return nameId?.toString() === idStr;
      });

      if (found) return { ...found, group };
    }

    return null;
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

export async function normalizeOfficialId(id) {
  if (!id) return null;
  const universityOfficials = await UniversityOfficial.findOne({}).lean();
  const idStr = id.toString();

  for (const { arr, group } of getOfficialGroups(universityOfficials)) {

    if (group === "president") {
      if (arr[0]?.name?.toString() === idStr) return arr[0].name.toString();
      continue;
    }

    if (!Array.isArray(arr)) continue;
    const found = arr.find((item) => item._id?.toString() === idStr);
    if (found) return found.name?.toString();
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
