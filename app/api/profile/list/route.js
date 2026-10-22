import { connectDB } from "@/lib/db";
import Profile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { cacheOrSet } from "@/lib/cache";
import { logPiiAccess } from "@/lib/activityLog";
import { canViewPII, resolvePiiBatch, searchIndexQuery, applyRowPii } from "@/lib/profileBroker";

const JWT_SECRET = process.env.JWT_SECRET;
const LIST_CACHE_TTL = 15 * 1000; // 15 seconds

function parseListParam(value) {
  if (!value) return null;
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : null;
}

export async function GET(req) {
  try {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(
      200,
      Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)),
    );
    const college = url.searchParams.get("college")?.trim() || null;
    const type = url.searchParams.get("type")?.trim() || null;

    const sex = url.searchParams.get("sex")?.trim() || null;
    const yearLevel = url.searchParams.get("yearLevel")?.trim() || null;
    const colleges = parseListParam(url.searchParams.get("colleges"));
    const offices = parseListParam(url.searchParams.get("offices"));
    const employmentStatus =
      url.searchParams.get("employmentStatus")?.trim() || null;
    const appointmentStatus = parseListParam(
      url.searchParams.get("appointmentStatus"),
    );
    const schoolYear = url.searchParams.get("schoolYear")?.trim() || null;
    const semester = url.searchParams.get("semester")?.trim() || null;
    const search = url.searchParams.get("search")?.trim() || null;

    const role = user?.role || null;
    /* The payload carries `assignedCollege`, which the account document does
       not; the token itself is already verified by requireAuth above. */
    const token = req.cookies.get("auth_token")?.value;
    let decoded = null;
    if (token) {
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch {
        decoded = null;
      }
    }
    const scopedCollege = college || decoded?.assignedCollege || null;

    /* `role` is part of the key: the response is masked or revealed by role,
       so serving one caller's cached page to another would leak a name. */
    const cacheKey = `profile:list:${role || "anon"}:${scopedCollege || "all"}:${type || "all"}:${page}:${limit}:${sex || "all"}:${yearLevel || "all"}:${colleges?.join(",") || "all"}:${offices?.join(",") || "all"}:${employmentStatus || "all"}:${appointmentStatus?.join(",") || "all"}:${schoolYear || "all"}:${semester || "all"}:${search || "all"}`;

    const result = await cacheOrSet(
      cacheKey,
      async () => {
        let termProfileIds = null;
        if (schoolYear || semester) {
          const termFilter = {};
          if (schoolYear) termFilter.school_year = schoolYear;
          if (semester) termFilter.semester = semester;
          const matchingTerms = await ProfileTerm.find(termFilter, {
            profile_id: 1,
          }).lean();
          termProfileIds = new Set(
            matchingTerms.map((t) => String(t.profile_id)),
          );
        }

        const conditions = [];

        if (scopedCollege) {
          conditions.push({
            $or: [
              {
                "personal_info_id.affiliation.academic_information.college":
                  scopedCollege,
              },
              {
                "personal_info_id.affiliation.employment_information.office":
                  scopedCollege,
              },
            ],
          });
        }
        if (type) {
          /* Filter on `affiliation.person_type`, the column that replaced
             `personal.currentStatus`. It is dropped from the row by the strip,
             so a `$match` on the legacy path would silently page out every
             result. `person_type` is GEMS-owned and survives. */
          conditions.push({ "personal_info_id.affiliation.person_type": type });
        }
        /* The sex filter is applied in memory after the vault overlay, not in
           the query: `gadData.sexAtBirth` is vault-owned and encrypted, so a
           `$match` on it would silently return an empty page once the legacy
           column is stripped. Filtering here would also break the total count,
           which is computed from the same pipeline. */
        if (yearLevel) {
          conditions.push({
            "personal_info_id.affiliation.academic_information.year_level":
              yearLevel,
          });
        }
        if (colleges?.length) {
          conditions.push({
            "personal_info_id.affiliation.academic_information.college": {
              $in: colleges,
            },
          });
        }
        if (offices?.length) {
          conditions.push({
            "personal_info_id.affiliation.employment_information.office": {
              $in: offices,
            },
          });
        }
        if (employmentStatus) {
          conditions.push({
            "personal_info_id.affiliation.employment_information.employment_status":
              employmentStatus,
          });
        }
        if (appointmentStatus?.length) {
          conditions.push({
            "personal_info_id.affiliation.employment_information.employment_appointment_status":
              { $in: appointmentStatus },
          });
        }
        if (schoolYear || semester) {
          const termIds = [...termProfileIds].map(
            (id) => new mongoose.Types.ObjectId(id),
          );
          conditions.push({ "personal_info_id._id": { $in: termIds } });
        }
        if (search) {
          /* Name search runs on the blind-index digests stored on the GEMS
             profile, not on the name columns: those are encrypted (or gone),
             so a `$regex` there would silently match nothing. A term with no
             usable tokens is answered as "no matches" rather than falling
             back to a scan that cannot succeed. */
          const digests = searchIndexQuery(search);
          conditions.push(
            digests?.length
              ? { "personal_info_id.profileSearchIndex": { $in: digests } }
              : { _id: null },
          );
        }

        const match = conditions.length ? { $and: conditions } : {};
        const hasMatch = conditions.length > 0;

        const countPipeline = [
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
        if (hasMatch) {
          countPipeline.push({ $match: { "personal_info_id._id": { $ne: null } } });
          countPipeline.push({ $match: match });
        }
        countPipeline.push({ $count: "total" });

        const [countResult] = await UserAuth.aggregate(countPipeline);
        const total = countResult?.total || 0;

        const dataPipeline = [
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
        if (hasMatch) {
          dataPipeline.push({ $match: { "personal_info_id._id": { $ne: null } } });
          dataPipeline.push({ $match: match });
        }
        /* The sex filter cannot run in the database (the value is encrypted in
           the vault), so when it is set the whole matching set is pulled, then
           narrowed in memory after the vault overlay. Pagination is applied to
           the filtered set below, and `total` is derived from it too, so the
           page count stays honest. Every other filter is plaintext and still
           runs in the query. */
        const sexFilteredInMemory = Boolean(sex);

        if (!sexFilteredInMemory) {
          dataPipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });
        }

        dataPipeline.push({
          $project: {
            _id: 1,
            username: 1,
            role: 1,
            assignedCollege: 1,
            is_active: 1,
            "personal_info_id._id": 1,
            /* `vaultRef` is the pointer into the identity vault. It is needed
               here to resolve the identity below, but it is stripped from the
               response before it is returned — it must never reach the
               browser. `gemsPublicId` is a public identifier and may stay. */
            "personal_info_id.vaultRef": 1,
            "personal_info_id.gemsPublicId": 1,
            /* `person_type` and the affiliation block are identifiers, not
               PII, so they keep coming straight from the GEMS document. The
               legacy `currentStatus` path is selected alongside for rows the
               backfill has not reached yet. */
            "personal_info_id.personal.currentStatus": 1,
            "personal_info_id.affiliation.person_type": 1,
            "personal_info_id.affiliation.academic_information": 1,
            "personal_info_id.affiliation.employment_information": 1,
          },
        });

        const data = await UserAuth.aggregate(dataPipeline);

        const profileIds = data
          .map((u) => u.personal_info_id?._id)
          .filter(Boolean);

        const allTerms = profileIds.length
          ? await ProfileTerm.aggregate([
              { $match: { profile_id: { $in: profileIds } } },

              {
                $addFields: {
                  semester_rank: {
                    $switch: {
                      branches: [
                        { case: { $eq: ["$semester", "Summer"] }, then: 3 },
                        { case: { $eq: ["$semester", "2nd"] }, then: 2 },
                        { case: { $eq: ["$semester", "1st"] }, then: 1 },
                      ],
                      default: 0,
                    },
                  },
                },
              },
              { $sort: { school_year: -1, semester_rank: -1 } },
              {
                $group: {
                  _id: "$profile_id",
                  profile_terms: {
                    $push: {
                      profile_term_id: "$_id",
                      school_year: "$school_year",
                      semester: "$semester",
                      updatedAt: "$updatedAt",
                      createdAt: "$createdAt",
                    },
                  },
                  latest_school_year: { $first: "$school_year" },
                  latest_semester: { $first: "$semester" },
                  latest_profile_term_id: { $first: "$_id" },
                },
              },
            ])
          : [];

        const termByProfileId = new Map(
          allTerms.map((term) => [String(term._id), term]),
        );

        const dataWithTerms = data.map((user) => {
          const profileId = user.personal_info_id?._id;
          const term = profileId
            ? termByProfileId.get(String(profileId))
            : null;
          return {
            ...user,
            school_year: term?.latest_school_year || null,
            semester: term?.latest_semester || null,
            profile_term_id: term?.latest_profile_term_id || null,
            profile_terms: term?.profile_terms || [],
          };
        });

        /* One vault read for the whole page, then each row is masked or
           revealed by the caller's role. A profile with no vault row yet is
           left exactly as it came out of the database (legacy fields). */
        const piiByRef = await resolvePiiBatch({
          vaultRefs: dataWithTerms.map(
            (user) => user.personal_info_id?.vaultRef,
          ),
          role,
        });

        const dataWithPii = dataWithTerms.map((user) => {
          const info = user.personal_info_id;
          if (!info) return user;

          /* `vaultRef` was selected to resolve the identity just below; it is
             dropped before any early return so the browser never receives the
             vault pointer, whether or not a vault row answered. */
          const { vaultRef: _vaultRef, ...safeInfo } = info;

          const resolved = piiByRef.get(String(info.vaultRef || ""));
          if (!resolved) {
            /* No vault row (unmigrated profile): keep the legacy fields, but
               still return the row without the pointer. */
            return { ...user, personal_info_id: safeInfo };
          }

          return {
            ...user,
            personal_info_id: {
              ...safeInfo,
              ...applyRowPii(
                {
                  personal: info.personal || {},
                  gadData: info.gadData || {},
                  contact: info.contact || {},
                  /* `applyRowPii` needs the affiliation block to resolve
                     `person_type`; the spread above would otherwise carry the
                     raw block through while the status mirror stays empty. */
                  affiliation: info.affiliation || {},
                },
                resolved,
              ),
            },
          };
        });

        /* With a sex filter the set returned above is the whole match, so the
           vault-backed value is known for every row and the page can be sliced
           here. `total` comes from this same filtered set, keeping the page
           count and the pagination controls in agreement. */
        if (sexFilteredInMemory) {
          const matched = dataWithPii.filter(
            (user) => user.personal_info_id?.gadData?.sexAtBirth === sex,
          );
          const start = (page - 1) * limit;
          return {
            data: matched.slice(start, start + limit),
            total: matched.length,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(matched.length / limit)),
          };
        }

        return {
          data: dataWithPii,
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        };
      },
      LIST_CACHE_TTL,
    );

    /* A revealed page contains real names, so the read is recorded. One entry
       per request (not per row) keeps the log useful rather than enormous. */
    if (canViewPII(role) && Array.isArray(result?.data) && result.data.length) {
      await logPiiAccess({
        req,
        user_id: user?._id || null,
        role,
        fields: ["personal", "gadData", "contact"],
        context: "profile-list",
      });
    }

    return NextResponse.json({ status: "success", ...result });
  } catch (error) {
    console.error("GET /api/profile/list error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}