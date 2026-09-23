import { HEADERS } from "@/lib/universityOfficialsConstants";

/**
 * Officials are a flat roster of assignments ({ header, title, unit, name }),
 * so grouping simply filters by the chart header.
 */

export const normalizeGroupItems = (items) => {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
};

export const groupItems = (officials, header) =>
  normalizeGroupItems(officials).filter((o) => o.header === header);

export const officialItemKey = (header, item) =>
  `${header}:${item._id || item.name?._id || item.name}`;

export const findOfficialItem = (items, id) =>
  normalizeGroupItems(items).find((item) => {
    const subId = item._id?.toString();
    const nameId = item.name?._id?.toString() || item.name?.toString();
    return subId === id || nameId === id;
  });

export const findOfficialKey = (officials, officialId) => {
  if (!officialId) return null;
  const idStr = officialId.toString();

  for (const header of HEADERS) {
    const items = groupItems(officials, header);
    if (items.length === 0) continue;

    const subMatch = items.find((item) => item._id?.toString() === idStr);
    if (subMatch) {
      return `${header}:${subMatch._id.toString()}`;
    }

    const match = items.find((item) => {
      const nameId = item.name?._id?.toString();
      const nameStr = item.name?.toString();
      return nameId === idStr || nameStr === idStr;
    });

    if (match) {
      const matchId = match._id || match.name?._id || match.name;
      return `${header}:${matchId}`;
    }
  }
  return null;
};

export const getOfficialNames = (officials, key) => {
  const [header, id] = key.split(":");
  const found = findOfficialItem(groupItems(officials, header), id);
  const o = found?.name || found;

  const first_name =
    o?.first_name ||
    o?.personal_info_id?.personal?.first_name ||
    o?.personal_info_id?.first_name ||
    "";

  const last_name =
    o?.last_name ||
    o?.personal_info_id?.personal?.last_name ||
    o?.personal_info_id?.last_name ||
    "";

  return {
    officialId:
      found?.name?._id?.toString() ||
      found?.name?.toString() ||
      found?._id?.toString() ||
      id,
    officialRef: null,
    officialGroup: header,
    first_name,
    last_name,
  };
};
