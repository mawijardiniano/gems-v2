import ImportBatch from "@/models/importBatch";
import StagingRecord from "@/models/stagingRecord";
import {
  buildIdentity,
  buildIdentityDedupeKey,
  mapToStagingPayload,
} from "@/app/api/integration/_utils/mapping";

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
}) {
  const docs = [];
  const firstDocIndexByKey = new Map();
  let duplicateCount = 0;

  for (let idx = 0; idx < rows.length; idx += 1) {
    const raw = rows[idx];
    const mapped = mapToStagingPayload(raw, defaults);
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

  const batch = await ImportBatch.create({
    source_type: sourceType,
    source_name: sourceName,
    source_file_key: sourceFileKey,
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
  };
}