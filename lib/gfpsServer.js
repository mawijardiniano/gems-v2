import mongoose from "mongoose";

/**
 * GFPS members are manual-first: a member carries a typed `official_text` as
 * its source of truth, alongside the `position_title` seat the memorandum
 * defines. The helpers below work off those two text fields and never require
 * the officials roster to be complete or even present.
 */

export const GFPS_SECTION_KEYS = [
  "chairOrHeadOfAgency",
  "executiveCommittee",
  "technicalWorkingGroup",
  "secretariat",
];

export const getId = (o) =>
  typeof o === "object" ? o?._id?.toString() : o?.toString();

/**
 * Case/whitespace-insensitive form of a typed name, for identity comparison.
 *
 * Mirrors the normalization `models/official.js` already applies to
 * `Official.name` and `norm()` in scripts/migrate-officials-to-terms.mjs, so
 * "  Dela  Cruz , Juan " and "dela cruz, juan" are the same person here too.
 */
export const normalizeMemberName = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

/**
 * Identity of a GFPS member row.
 *
 * Keyed on the typed name, failing that on the seat title. The typed-name
 * branch is essential: with manual-first entry two rows are told apart by who
 * they name, and a key that evaluated to `undefined` for every manual member
 * made two different people compare equal — so `mergeMembers` silently
 * collapsed them into one and the second entry was lost.
 *
 * The `position_title` tier exists for memo-seeded rows, which have a seat but
 * no name yet: without it every vacant seat has an empty name, keys to the same
 * value, and the whole seeded chart collapses into a single row.
 */
export const memberKey = (member) =>
  normalizeMemberName(member?.official_text) ||
  normalizeMemberName(member?.position_title) ||
  getId(member?._id) ||
  null;

/**
 * Whether a row identifies anything at all.
 *
 * A row is meaningful when it names a person or a seat. The memo seeds seats
 * before appointments exist, so a name alone cannot be required — but a row
 * with neither is empty and is dropped rather than stored as a blank member.
 */
export const hasIdentity = (member) =>
  Boolean(
    String(member?.official_text ?? "").trim() ||
      normalizeMemberName(member?.position_title),
  );

export function findMemberIndex(members, newMember) {
  const key = memberKey(newMember);
  if (!key) return -1;

  return members.findIndex((m) => memberKey(m) === key);
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

/**
 * Normalizes one member row for storage.
 *
 * `official_text` and `position_title` are the only identity fields, and both
 * are trimmed here so a row that arrives with only whitespace is stored as the
 * empty string rather than a blank that still satisfies "present".
 *
 * The row is rebuilt from the known fields rather than spread from the input.
 * A spread carried whatever the client sent — including the retired
 * `official_term` / `official_group` / name-part keys — and Mongoose silently
 * dropped the undeclared ones, so the payload and the stored document
 * disagreed. Building the row explicitly keeps them identical.
 */
const normalizeMember = (m, { role, fallbackRole } = {}) => {
  const member = {
    position_title: String(m?.position_title ?? "").trim(),
    official_text: String(m?.official_text ?? "").trim(),
  };

  /* Order is kept only when it is a real number. `Number("")` is 0, so a blank
     field from a form would otherwise become order 0 and sort the row ahead of
     the memorandum's first entry instead of leaving it unnumbered. */
  const rawOrder = m?.sort_order;
  if (rawOrder !== "" && rawOrder !== null && rawOrder !== undefined) {
    const order = Number(rawOrder);
    if (Number.isFinite(order)) member.sort_order = order;
  }

  /* An EC row must carry a role (the schema's enum requires one), but an
     existing `chair` must never be overwritten by the default. */
  if (role) member.role = m?.role || role;
  else if (fallbackRole) member.role = m?.role || fallbackRole;

  return member;
};

/* Drops rows that identify nothing (see `hasIdentity`), then normalizes what is
   left. Without this a memo row edited down to an empty name and empty seat
   would be stored as a blank member rather than removed. */
const mapMembers = (list, opts) =>
  list.map((m) => normalizeMember(m, opts)).filter(hasIdentity);

export const normalizeSectionOfficials = (section, opts = {}) => {
  if (!section) return section;

  if (Array.isArray(section)) {
    const out = mapMembers(section);
    return out;
  }

  if (Array.isArray(section.members)) {
    /* A section that holds member rows is either the Executive Committee or the
       Technical Working Group, and only the former has a `role` the schema
       requires. It cannot be identified from the rows alone — a brand-new EC row
       arrives with no `role` at all — so the caller passes
       `isExecutiveCommittee`, and a row that already has a role keeps it.

       The default is applied when the caller marks the section, when any row
       already carries a role, or when the caller supplied no hint at all (a bare
       `{members: [...]}` is an Executive Committee shape far more often than
       not, and an absent role would fail the schema's enum). The update path
       marks the section explicitly, so the Technical Working Group — which has no
       role field — never gets one.

       What must not happen is passing a section-wide `role` default, which is
       exactly what demoted every EC chair to a plain member. */
    const rows = section.members;
    const carriesRoles = rows.some((m) => m && "role" in m);
    const members = mapMembers(
      rows,
      carriesRoles || opts.isExecutiveCommittee !== false
        ? { fallbackRole: "member" }
        : undefined,
    );

    /* The caller's hint is not a stored field, so it must not be spread into
       the value that is written. */
    const { isExecutiveCommittee, ...rest } = section;
    return {
      ...rest,
      members,
    };
  }

  const single = normalizeMember(section);
  const kept = hasIdentity(single);
  return kept ? single : null;
};

/**
 * Read-path view of one GFPS member row.
 *
 * A member is rendered from what it stores — the typed `official_text` and the
 * `position_title` seat — and nothing else. There is no roster lookup here: the
 * row's text is the truth, so a member can never render blank because some
 * pointer failed to resolve.
 *
 * Everything this adds is derived, never stored. `manual` is constant (every
 * GFPS row is typed by hand now that the roster picker is gone) but is still
 * reported so the chart's badge keeps its single source of truth, and `vacant`
 * marks a seat the memo defined before anyone was appointed to it — a normal
 * state, not missing data, which is why the seat is surfaced as-is.
 *
 * The row is rebuilt from its known fields rather than spread from the stored
 * document. A spread copied every key still physically present — and dropping
 * a field from the schema does not remove it from documents that already exist,
 * since `strict` only strips unknown paths when a document is written. So rows
 * persisted under the old roster picker kept answering with `official_term`,
 * `official_group` and the split `first_name` / `last_name` long after every
 * display path stopped reading them, and the API contract disagreed with the
 * schema until each row happened to be saved again. Listing the fields keeps
 * the response identical to what `normalizeMember` stores and makes it
 * independent of whether such a cleanup has run.
 */
function describeMember(member) {
  if (!member) return member;

  const official_text = String(member.official_text ?? "").trim();
  const position_title = String(member.position_title ?? "").trim();

  const described = {
    position_title,
    official_text,
    manual: true,
    // True when the seat is known but nobody has been appointed to it yet.
    vacant: !official_text,
  };

  /* `_id` identifies the row for edit/delete; `sort_order` and `role` are the
     only other stored fields. They are added only when present so a described
     row never claims a seat number or an Executive Committee role it lacks —
     `role` in particular must stay absent outside the EC, where the schema
     does not allow it. */
  if (member._id !== undefined) described._id = member._id;
  if (member.sort_order !== undefined && member.sort_order !== null) {
    described.sort_order = member.sort_order;
  }
  if (member.role) described.role = member.role;

  return described;
}

/**
 * Builds the per-section read helpers.
 *
 * Takes no roster: the decorated rows are built entirely from their own fields,
 * so GFPS renders correctly with or without an officials roster. The parameter
 * used to carry the roster for resolving `official_term` links; those links no
 * longer exist, which also removed an OfficialTerm aggregation from every GET.
 */
export function makeFilterHelpers() {
  /**
   * Whether a described row has anything to show.
   *
   * A row with no name and no seat identifies nothing. Rendering it as
   * "Unnamed member" invents a member who does not exist and buries the seats
   * that do, so it is dropped from the response instead.
   */
  const showsSomething = (m) =>
    Boolean(
      String(m?.official_text ?? "").trim() ||
        String(m?.position_title ?? "").trim(),
    );

  /* The memo numbers its seats, so the chart must mirror that order rather than
     whatever order rows were merged in. Rows without an order keep their
     relative position after the numbered ones (a stable sort), so hand-added
     members land at the end. */
  const byMemoOrder = (a, b) => {
    const ao = Number.isFinite(Number(a?.sort_order)) ? Number(a.sort_order) : Infinity;
    const bo = Number.isFinite(Number(b?.sort_order)) ? Number(b.sort_order) : Infinity;
    return ao - bo;
  };

  function filterSectionWithDetails(section) {
    if (!section) return section;

    if (Array.isArray(section)) {
      return section.map(describeMember).filter(showsSomething).sort(byMemoOrder);
    }
    if (section.members) {
      return {
        ...section,
        members: section.members
          .map(describeMember)
          .filter(showsSomething)
          .sort(byMemoOrder),
      };
    }
    /* A single-member section is the chair. It is stored as the member object
       itself, so the identity fields (`official_text`, `position_title`) sit on
       the section rather than under `members`. A chair document written before
       the seat model carries neither, and such a stub is reported as absent
       rather than described, so an empty chair cannot render as "Unnamed
       member" while the identical list row is dropped. */
    const candidate = section;
    if (
      candidate.official_text === undefined &&
      candidate.position_title === undefined
    ) {
      return null;
    }

    const single = describeMember(candidate);
    return showsSomething(single) ? single : null;
  }

  return { describeMember, filterSectionWithDetails };
}

export function getGFPSMemberList(doc, sectionKey) {
  const section = doc?.[sectionKey];
  if (!section) return null;

  if (Array.isArray(section)) return section;
  if (Array.isArray(section.members)) return section.members;

  return null;
}
