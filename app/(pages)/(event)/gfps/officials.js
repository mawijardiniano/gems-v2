
import { OFFICIAL_GROUPS_ORDER } from "./gfps-config";

export const normalizeGroupItems = (items) => {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
};

export const officialItemKey = (section, item) =>
  `${section}:${item._id || item.name?._id || item.name}`;

export const findOfficialItem = (items, id) =>
  (items || []).find((item) => {
    const subId = item._id?.toString();
    const nameId = item.name?._id?.toString() || item.name?.toString();
    return subId === id || nameId === id;
  });

export const findOfficialKey = (officials, officialId) => {
  if (!officialId) return null;
  const idStr = officialId.toString();

  for (const group of OFFICIAL_GROUPS_ORDER) {
    const items = normalizeGroupItems(officials[group]);
    if (items.length === 0) continue;

    const subMatch = items.find((item) => item._id?.toString() === idStr);
    if (subMatch) {
      return `${group}:${subMatch._id.toString()}`;
    }

    const match = items.find((item) => {
      const nameId = item.name?._id?.toString();
      const nameStr = item.name?.toString();
      return nameId === idStr || nameStr === idStr;
    });

    if (match) {
      const matchId = match._id || match.name?._id || match.name;
      return `${group}:${matchId}`;
    }
  }
  return null;
};

export const getOfficialNames = (officials, key) => {
  const [group, id] = key.split(":");
  const found = findOfficialItem(normalizeGroupItems(officials[group]), id);
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
    officialRef: found?._id?.toString() || null,
    officialGroup: group,
    first_name,
    last_name,
  };
};
