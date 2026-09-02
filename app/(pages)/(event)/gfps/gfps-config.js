export const SECTIONS = [
  { key: "chairOrHeadOfAgency", label: "Chair/Head of Agency" },
  { key: "executiveCommittee", label: "Executive Committee" },
  { key: "technicalWorkingGroup", label: "Technical Working Group" },
  { key: "secretariat", label: "Secretariat" },
];

export const OFFICIAL_GROUPS_ORDER = [
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

export const SECTION_STYLES = {
  chairOrHeadOfAgency: {
    border: "border-purple-200",
    bg: "bg-purple-50",
    headerBg: "bg-purple-100/50",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    badge: "bg-purple-100 text-purple-700",
    avatarBg: "bg-purple-100",
    avatarText: "text-purple-600",
  },
  executiveCommittee: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    headerBg: "bg-blue-100/50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
    avatarBg: "bg-blue-100",
    avatarText: "text-blue-600",
  },
  technicalWorkingGroup: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    headerBg: "bg-emerald-100/50",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    avatarBg: "bg-emerald-100",
    avatarText: "text-emerald-600",
  },
  secretariat: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    headerBg: "bg-amber-100/50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
    avatarBg: "bg-amber-100",
    avatarText: "text-amber-600",
  },
};

const toPayloadMember = (resolved, role) => ({
  official: resolved?.officialId,
  official_ref: resolved?.officialRef || undefined,
  official_group: resolved?.officialGroup || undefined,
  ...(role ? { role } : {}),
  first_name: resolved?.first_name || "",
  last_name: resolved?.last_name || "",
});

export const SECTION_BEHAVIOR = {
  chairOrHeadOfAgency: {
    supportsRoles: false,
    isSingle: true,
    read: (gfps) => ({
      members: [],
      chairData: gfps?.chairOrHeadOfAgency || null,
    }),
    buildPayload: (resolved) => ({
      chairOrHeadOfAgency: toPayloadMember(resolved[0]),
    }),
  },
  executiveCommittee: {
    supportsRoles: true,
    isSingle: false,
    read: (gfps) => ({
      members: gfps?.executiveCommittee?.members || [],
      chairData: null,
    }),
    buildPayload: (resolved, execRoles) => ({
      executiveCommittee: {
        members: resolved.map((d) =>
          toPayloadMember(d, execRoles?.[d.key] || "member"),
        ),
      },
    }),
  },
  technicalWorkingGroup: {
    supportsRoles: false,
    isSingle: false,
    read: (gfps) => ({
      members: gfps?.technicalWorkingGroup?.members || [],
      chairData: null,
    }),
    buildPayload: (resolved) => ({
      technicalWorkingGroup: {
        members: resolved.map((d) => toPayloadMember(d)),
      },
    }),
  },
  secretariat: {
    supportsRoles: false,
    isSingle: false,
    read: (gfps) => ({
      members: Array.isArray(gfps?.secretariat) ? gfps.secretariat : [],
      chairData: null,
    }),
    buildPayload: (resolved) => ({
      secretariat: resolved.map((d) => toPayloadMember(d)),
    }),
  },
};

export const getSectionData = (gfps, key) => {
  const behavior = SECTION_BEHAVIOR[key];
  return behavior
    ? behavior.read(gfps || {})
    : { members: [], chairData: null };
};

export const getSectionEditMembers = (gfps, key) => {
  const { members, chairData } = getSectionData(gfps, key);
  return chairData ? [chairData, ...members] : members;
};

export const sectionHasData = (gfps, key) => {
  const { members, chairData } = getSectionData(gfps, key);
  return !!chairData || members.length > 0;
};
