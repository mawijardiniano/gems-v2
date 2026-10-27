export const SECTIONS = [
  { key: "chairOrHeadOfAgency", label: "Chair/Head of Agency" },
  { key: "executiveCommittee", label: "Executive Committee" },
  { key: "technicalWorkingGroup", label: "Technical Working Group" },
  { key: "secretariat", label: "Secretariat" },
];

// The officials picker groups seats by the MarSU chart headers.
export { HEADERS as OFFICIAL_GROUPS_ORDER } from "@/lib/universityOfficialsConstants";

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

/* Builds one member row for the API.
 *
 * A member carries a typed `official_text` as the source of truth for the
 * person and a `position_title` for the seat the memorandum defines. Both are
 * sent even when only one is known: the memo seeds seats before appointments
 * exist, and a hand-typed member may have no seat at all.
 *
 * Nothing else is sent. The row used to also carry `official_term`,
 * `official_group`, `manual` and the split `first_name` / `last_name`; the
 * roster picker is gone, so those were either always null/""/true or a second
 * copy of `official_text`, and `normalizeMember` on the server rebuilds rows
 * from the two text fields plus `sort_order` / `role` anyway. */
const toPayloadMember = (resolved, role) => ({
  position_title: String(resolved?.position_title || "").trim(),
  official_text: String(resolved?.official_text || "").trim(),
  ...(resolved?.sort_order !== undefined && resolved?.sort_order !== null
    ? { sort_order: Number(resolved.sort_order) }
    : {}),
  ...(role ? { role } : {}),
});

/* The chair section is one slot, so an empty selection has no row at all.
 * `toPayloadMember(undefined)` would still return an object — every field blank
 * rather than `null` — and a blank row is not the same as no chair. Sending
 * blanks made the API normalize the value to `null`, and because the routes
 * guard with `if (body[key])` a `null` was then never assigned: the request
 * reported success while the stored chair was left untouched, so adding a chair
 * appeared to do nothing. Sending an explicit `null` clears the slot instead. */
const toPayloadSingle = (resolved) =>
  resolved ? toPayloadMember(resolved) : null;

export const SECTION_BEHAVIOR = {
  chairOrHeadOfAgency: {
    supportsRoles: false,
    isSingle: true,
    read: (gfps) => ({
      members: [],
      chairData: gfps?.chairOrHeadOfAgency || null,
    }),
    buildPayload: (resolved) => ({
      chairOrHeadOfAgency: toPayloadSingle(resolved[0]),
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
