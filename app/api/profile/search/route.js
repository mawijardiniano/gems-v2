import { connectDB } from "@/lib/db";
import Profile from "@/models/profile";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { cacheOrSet } from "@/lib/cache";
import { logPiiAccess } from "@/lib/activityLog";
import { resolvePiiBatch, searchIndexQuery, applyRowPii } from "@/lib/profileBroker";

const SEARCH_CACHE_TTL = 15 * 1000;

/** Escapes a user-supplied term so it is matched literally in a `$regex`. */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req) {
  try {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || "";
    /* The account's own role decides what comes back. This used to be read
       from the query string — `?role=Admin` was caller-supplied, so any
       authenticated user could ask for the Admin view. */
    const role = user?.role || null;
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "30", 10)),
    );

    /* `role` belongs in the key because the rows are masked or revealed by
       it: a Dean's search must never be served an Admin's cached names. */
    const cacheKey = `profile:search:${q || "all"}:${role || "anon"}:${limit}`;

    const data = await cacheOrSet(
      cacheKey,
      async () => {
        const match = { role: { $ne: "Admin" } };

        const pipeline = [
          {
            $lookup: {
              from: Profile.collection.name,
              localField: "personal_info_id",
              foreignField: "_id",
              as: "personal_info_id",
            },
          },
          {
            $unwind: {
              path: "$personal_info_id",
              preserveNullAndEmptyArrays: true,
            },
          },
        ];

        if (q) {
          /* Usernames are not PII and stay searchable directly. */
          match.$or = [{ username: new RegExp(escapeRegex(q), "i") }];

          /* Names are encrypted, so they can only be found through the blind
             index on the profile. A `$regex` over `personal.first_name` would
             return an empty page with no error once the legacy columns are
             gone — which is exactly how this silently stopped working. */
          const digests = searchIndexQuery(q);
          if (digests) {
            const byDigest = await Profile.find(
              { profileSearchIndex: { $in: digests } },
              { _id: 1 },
            ).lean();
            if (byDigest.length) {
              match.$or.push({
                personal_info_id: { $in: byDigest.map((p) => p._id) },
              });
            }
          }
        }

        if (Object.keys(match).length > 0) {
          pipeline.push({ $match: match });
        }

        pipeline.push(
          { $limit: limit },
          {
            $project: {
              _id: 1,
              username: 1,
              role: 1,
              assignedCollege: 1,
              "personal_info_id._id": 1,
              "personal_info_id.vaultRef": 1,
              "personal_info_id.gemsPublicId": 1,
              "personal_info_id.personal.currentStatus": 1,
              "personal_info_id.affiliation.person_type": 1,
              /* The attendance sheet only accepts Male / Female, and the manual
                 encode endpoint rejects a profile without `gadData.sexAtBirth`.
                 The modal needs it up front to block the Record button instead
                 of letting the request fail after the organizer has chosen.
                 It comes from the vault below — never from the legacy column. */
            },
          },
        );

        const rows = await UserAuth.aggregate(pipeline);

        /* One vault read for the page, then each row is masked or revealed by
           the caller's role. This route returns identities, so it must go
           through the broker — it previously projected the plaintext names
           straight out of the database with no masking at all. */
        const piiByRef = await resolvePiiBatch({
          vaultRefs: rows.map((r) => r.personal_info_id?.vaultRef),
          role,
        });

        return rows.map((row) => {
          const info = row.personal_info_id;
          if (!info) return row;

          const resolved = piiByRef.get(String(info.vaultRef || ""));
          /* A profile with no vault row keeps whatever it had (legacy), so the
             screen does not blank out mid-migration. */
          const merged = applyRowPii(
            {
              personal: info.personal || {},
              gadData: info.gadData || {},
              contact: info.contact || {},
              /* Resolves `person_type` for the status mirror below. */
              affiliation: info.affiliation || {},
            },
            resolved,
          );

          return {
            ...row,
            gemPublicId: info.gemsPublicId || null,
            personal_info_id: {
              _id: info._id,
              vaultRef: info.vaultRef,
              gemsPublicId: info.gemsPublicId,
              personal: merged.personal,
              gadData: merged.gadData,
              displayName: merged.displayName || null,
              age: merged.age ?? null,
              masked: merged.masked ?? false,
            },
          };
        });
      },
      SEARCH_CACHE_TTL,
    );

    /* A revealed page carries real names, so the read is recorded. One entry
       per request keeps the audit log useful rather than enormous. */
    if (Array.isArray(data) && data.some((row) => row?.personal_info_id && !row.personal_info_id.masked)) {
      await logPiiAccess({
        req,
        user_id: user?._id || null,
        role,
        fields: ["personal", "gadData"],
        context: "profile-search",
      });
    }

    return NextResponse.json({ status: "success", data });
  } catch (error) {
    console.error("GET /api/profile/search error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}