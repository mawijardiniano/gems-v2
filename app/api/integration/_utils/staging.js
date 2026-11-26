import { createHash } from "node:crypto";
import ImportBatch from "@/models/importBatch";
import StagingRecord from "@/models/stagingRecord";
import {
  buildIdentity,
  buildIdentityDedupeKey,
  mapToStagingPayload,
} from "@/app/api/integration/_utils/mapping";
import {
  buildHeaderMap,
  canonicalizeRow,
  collectColumns,
  headerReport,
} from "@/app/api/integration/_utils/headerMap";

/* Upper bounds on what one batch may hold. Validation and migration run
   row by row inside a request, so an unbounded file or feed would time out
   or exhaust memory before it ever reached review. */
export const MAX_BATCH_ROWS = 10000;
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

export async function stageRows({
  rows,
  sourceType,
  sourceName,
  sourceFileKey = "",
  createdBy,
  createdByUsername,
  defaults = {},
  /* { "Source column": "field_key" } saved in the field mapping. */
  customHeaders = {},
  /* Stage nothing when an earlier batch has exactly these rows. */
  skipUnchanged = false,
}) {
  const docs = [];
  const firstDocIndexByKey = new Map();
  let duplicateCount = 0;

  /* Column names are matched ignoring case, spaces and punctuation, so
     "Employee No." reads as employee_id. The report flags columns that
     would fail every row, once, instead of one error per row. */
  const columns = collectColumns(rows);
  const headerMap = buildHeaderMap(columns, customHeaders);
  const report = headerReport(columns, headerMap, defaults);

  for (let idx = 0; idx < rows.length; idx += 1) {
    const raw = rows[idx];
    const mapped = mapToStagingPayload(
      canonicalizeRow(raw, headerMap),
      defaults,
    );
    const identity = buildIdentity(mapped);
    const dedupeKey = buildIdentityDedupeKey(identity);

    let status = "pending";
    if (dedupeKey) {
      if (firstDocIndexByKey.has(dedupeKey)) {
        status = "duplicate";
        duplicateCount += 1;
      } else {
        firstDocIndexByKey.set(dedupeKey, idx);
      }
    }

    docs.push({
      row_number: idx + 1,
      raw_payload: raw,
      mapped_payload: mapped,
      identity,
      school_year: mapped.school_year || "",
      semester: mapped.semester || "",
      status,
    });
  }

  /* Same rows as a batch staged before (same file uploaded twice, or a feed
     that has not changed): staged anyway, but reported so the reviewer can
     delete the repeat. */
  const contentHash = createHash("sha256")
    .update(JSON.stringify(rows))
    .digest("hex");
  const previous = await ImportBatch.findOne({ content_hash: contentHash })
    .sort({ createdAt: -1 })
    .select("source_name status createdAt")
    .lean();
  const sameAs = previous
    ? {
        batch_id: previous._id,
        source_name: previous.source_name || "",
        status: previous.status,
        created_at: previous.createdAt,
      }
    : null;

  /* A scheduled sync of a feed that has not changed stages nothing, so an
     unchanged HRMIS feed does not pile up a new batch every day. */
  if (skipUnchanged && sameAs) {
    return {
      batch: null,
      insertedCount: 0,
      duplicateCount: 0,
      sameAs,
      headerReport: report,
      skipped: true,
    };
  }

  const batch = await ImportBatch.create({
    source_type: sourceType,
    source_name: sourceName,
    source_file_key: sourceFileKey,
    content_hash: contentHash,
    header_report: report,
    created_by: createdBy,
    created_by_username: createdByUsername,
    totals: { fetched: rows.length, duplicates: duplicateCount },
  });

  if (docs.length > 0) {
    const inserted = await StagingRecord.insertMany(
      docs.map((doc) => ({ ...doc, batch_id: batch._id })),
      { ordered: false },
    );

    const firstIdByKey = new Map();
    const linkOps = [];
    for (const doc of inserted) {
      const key = doc.identity ? buildIdentityDedupeKey(doc.identity) : "";
      if (!key) continue;
      if (doc.status === "duplicate") {
        const firstId = firstIdByKey.get(key);
        if (firstId) {
          linkOps.push({
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: { duplicate_of: firstId } },
            },
          });
        }
      } else if (!firstIdByKey.has(key)) {
        firstIdByKey.set(key, doc._id);
      }
    }
    if (linkOps.length > 0) {
      await StagingRecord.bulkWrite(linkOps, { ordered: false });
    }
  }

  return {
    batch,
    insertedCount: docs.length,
    duplicateCount,
    sameAs,
    headerReport: report,
  };
}