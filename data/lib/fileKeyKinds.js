/* Which kind of record a storage key belongs to, from its folder, and who
   uploaded it. Pure, so the download check (data/lib/fileAccess.js) and
   tests share it. Upload routes write `<folder>/<uploaderId>/<name>`. */

// Relative paths (not "@/"), so node --test can load this file directly.
import { POSTER_FOLDER, REPORT_FOLDERS } from "./eventFileKeys.js";
import { EVIDENCE_FOLDER, PROOF_FOLDER } from "./projectFileKeys.js";
import { S3_FOLDER as KNOWLEDGE_FOLDER } from "./knowledgeResources.js";

export const GPB_SCAN_FOLDER = "status/scanned";
export const GFPS_ISSUANCE_FOLDER = "gfps/issuance";

const FOLDER_KINDS = [
  [POSTER_FOLDER, "poster"],
  ...Object.values(REPORT_FOLDERS).map((folder) => [folder, "report"]),
  [EVIDENCE_FOLDER, "project"],
  [PROOF_FOLDER, "project"],
  [GPB_SCAN_FOLDER, "gpb-scan"],
  [KNOWLEDGE_FOLDER, "knowledge"],
  [GFPS_ISSUANCE_FOLDER, "gfps-issuance"],
];

const isSafeKey = (key) => {
  const k = String(key || "");
  return (
    Boolean(k) &&
    !k.startsWith("/") &&
    !k.includes("\\") &&
    !k.split("/").includes("..")
  );
};

const folderOf = (key) => {
  if (!isSafeKey(key)) return null;
  const k = String(key);
  const match = FOLDER_KINDS.find(([folder]) => k.startsWith(`${folder}/`));
  return match || null;
};

/** "poster" | "report" | "project" | "gpb-scan" | "knowledge", or null for
    any other key (audit archives, unknown folders, unsafe paths). */
export function fileKeyKind(key) {
  return folderOf(key)?.[1] ?? null;
}

/** The uploader id segment of a key, or null. */
export function uploaderOfKey(key) {
  const match = folderOf(key);
  if (!match) return null;
  const rest = String(key).slice(match[0].length + 1);
  const id = rest.split("/")[0];
  return id && rest.includes("/") ? id : null;
}
