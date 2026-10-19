import { connectDB } from "@/lib/db";
import Profile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";
import SystemSetting from "@/models/systemSetting";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
import { toTitleCase } from "@/app/api/integration/_utils/mapping";
import {
  normalizeStudentUsername,
  normalizeEmployeeUsername,
  usernameEqualsFilter,
} from "@/lib/usernames";
import { rateLimiters } from "@/lib/rateLimit";
import { cacheOrSet, cacheDelPrefix } from "@/lib/cache";
import { assignIdentifiers, extractPiiFromProfile, savePii } from "@/lib/vaultWriter";
import {
  resolvePiiBatch,
  applyRowPii,
  searchIndexQuery,
  loadDecryptedPiiBatch,
} from "@/lib/profileBroker";

const PROFILE_LIST_CACHE_TTL = 15 * 1000; // 15 seconds

const JWT_SECRET = process.env.JWT_SECRET;

const CAPITALIZE_KEYS = new Set([
  "first_name",
  "last_name",
  "middle_name",
  "nationality",
  "student_id",
  "headOfHousehold",
]);

async function generateUniqueUsername(personal, affiliation, contact) {
  const isStudent = personal?.currentStatus === "Student";
  const isEmployee = personal?.currentStatus === "Employee";

  const candidates = [];

  if (isStudent) {
    const studentId = affiliation?.academic_information?.student_id;
    if (studentId) {
      candidates.push(normalizeStudentUsername(studentId));
    }
  }

  if (isEmployee) {
    const email = contact?.email;
    if (email) {
      const trimmed = String(email).trim();
      // Keep full emails as-is so email login keeps working.
      // Only sanitize the local-part fallback (no @) per locked rule.
      candidates.push(trimmed.includes("@") ? trimmed : normalizeEmployeeUsername(trimmed));
    }
  }

  const uniqueCandidates = [...new Set(candidates.filter(Boolean))];

  for (const candidate of uniqueCandidates) {
    const exists = await UserAuth.findOne(usernameEqualsFilter(candidate)).lean();
    if (!exists) {
      return candidate;
    }
  }

  throw new Error(
    "Unable to generate a unique username. Please provide a valid student ID (for students) or email (for employees).",
  );
}

function generateTempPassword() {
  return `gems1234`;
}

function capitalizeObjectStrings(value) {
  if (!value) return value;
  if (Array.isArray(value)) return value.map(capitalizeObjectStrings);

  const newObj = { ...value };
  for (const key in newObj) {
    if (CAPITALIZE_KEYS.has(key) && typeof newObj[key] === "string") {
      newObj[key] = toTitleCase(newObj[key]);
    } else if (typeof newObj[key] === "object") {
      newObj[key] = capitalizeObjectStrings(newObj[key]);
    }
  }
  return newObj;
}

/**
 * The GEMS-owned fields that live inside the legacy `personal` block but are
 * not identity, so they survive the move to the vault. Everything else in that
 * block (name parts, `civil_status`, `nationality`, `bloodType`,
 * `religion_other`, `birthday`) belongs to the vault and must never be used as
 * a merge base — see `rosterRowForClient`.
 */
/**
 * Confirms a name collision is really the same person by comparing birthdays.
 *
 * The name match comes from the blind index, so it can only say "some name
 * part digests as the same string". The birthday is the second factor, and it
 * is encrypted with a random IV, so it cannot be compared in the query: equal
 * dates never produce equal ciphertext. It has to be decrypted first.
 *
 * Only the handful of rows the index already narrowed down are decrypted, so
 * this stays a small, bounded read rather than a scan.
 *
 * An unreadable or missing vault row counts as no match: refusing a
 * registration because a vault read failed would be worse than the duplicate
 * it was guarding against.
 */
async function findSameNameAndBirthday(candidates, birthday) {
  if (!candidates?.length) return null;
  if (Number.isNaN(birthday?.getTime?.())) return null;

  const refs = candidates.map((c) => c.vaultRef).filter(Boolean);
  if (!refs.length) return null;

  let piiByRef;
  try {
    piiByRef = await loadDecryptedPiiBatch(refs);
  } catch (err) {
    console.error("[profile] duplicate-check vault read failed:", err.message);
    return null;
  }

  for (const candidate of candidates) {
    const pii = piiByRef.get(String(candidate.vaultRef));
    if (!pii?.birthday) continue;

    const existing = new Date(pii.birthday);
    if (Number.isNaN(existing.getTime())) continue;

    /* Compare on the calendar day: the stored value may be a date at midnight
       in a different zone, so an exact timestamp compare would miss a real
       duplicate. */
    if (sameCalendarDay(existing, birthday)) return candidate;
  }

  return null;
}

/** True when two dates fall on the same UTC year/month/day. */
function sameCalendarDay(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

const GEMS_OWNED_PERSONAL_FIELDS = ["currentStatus"];

/** A `personal` block reduced to the fields GEMS itself owns. */
function gemsOwnedPersonal(personal) {
  if (!personal) return {};
  const out = {};
  for (const key of GEMS_OWNED_PERSONAL_FIELDS) {
    if (personal[key] !== undefined) out[key] = personal[key];
  }
  return out;
}

/**
 * Shapes one roster row for the client: strips the password, routes the
 * identity through the broker, and removes the vault bookkeeping.
 *
 * `vaultRef` and `profileSearchIndex` must never reach the browser. The ref is
 * a handle into the encrypted vault, and the index is a set of HMAC digests of
 * every spelling of a person's name — a small, offline-checkable name oracle.
 * Neither is read by any client, so both are dropped for every role.
 *
 * The identity itself is masked or revealed by `applyRowPii` according to the
 * caller's role.
 *
 * The row handed to `applyRowPii` carries ONLY the GEMS-owned `personal`
 * fields, never the legacy plaintext block. `applyRowPii` merges as
 * `{ ...row.personal, ...chosen.personal }`, so any plaintext key the chosen
 * identity shape omits would silently survive the merge: `maskedRowPii`
 * returns only the initials and `birthday`, so seeding the merge with the raw
 * block left `civil_status`, `nationality`, `bloodType` and `religion_other`
 * in a MASKED row. Withholding them here makes the broker's answer — masked or
 * revealed — the sole source of identity.
 *
 * `legacy` is passed only for a row the vault cannot answer for, so a
 * mid-migration record still renders instead of blanking out. A row with a
 * vault entry is resolved from the vault alone.
 */
export function rosterRowForClient(user, resolvedByRef) {
  if (!user) return user;

  const { password: _password, ...rest } = user;

  const profile = rest.personal_info_id;
  if (profile) {
    const ref = profile.vaultRef;
    const resolved = ref ? resolvedByRef?.get(String(ref)) || null : null;

    /* A resolved row reads from the vault only; the legacy block still holds
       plaintext for it, so letting it through as a fallback would undo the
       broker's masking. */
    const legacy = resolved
      ? null
      : {
          personal: profile.personal || null,
          gadData: profile.gadData || null,
          contact: profile.contact || null,
        };

    rest.personal_info_id = applyRowPii(
      { ...profile, personal: gemsOwnedPersonal(profile.personal) },
      resolved,
      { legacy },
    );

    delete rest.personal_info_id.vaultRef;
    delete rest.personal_info_id.profileSearchIndex;
  }

  return rest;
}

export async function GET(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const token = req.cookies.get("auth_token")?.value;
    let decoded = null;
    if (token) {
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch {
        decoded = null;
      }
    }

    const assignedCollege = decoded?.assignedCollege || null;
    const role = decoded?.role || null;
    /* `role` is part of the key because the rows this route returns are
       masked or revealed by it, and `assignedCollege` alone does not separate
       the two: a Dean and an Admin in the same college would otherwise share
       one cached entry, and whichever request landed first would decide
       whether the other saw real names. */
    const cacheKey = `profile:list:${assignedCollege || "all"}:${role || "anon"}`;

    const usersNoPassword = await cacheOrSet(
      cacheKey,
      async () => {

        const match = {};
        if (assignedCollege) {
          match.$or = [
            {
              "personal_info_id.affiliation.academic_information.college":
                assignedCollege,
            },
            {
              "personal_info_id.affiliation.employment_information.office":
                assignedCollege,
            },
          ];
        }

        const pipeline = [
          {
            $lookup: {
              from: Profile.collection.name,
              localField: "personal_info_id",
              foreignField: "_id",
              as: "personal_info_id",
            },
          },
          { $unwind: { path: "$personal_info_id", preserveNullAndEmptyArrays: true } },
        ];

        if (assignedCollege) {
          pipeline.push({ $match: match });
        }

        const scopedUsers = await UserAuth.aggregate(pipeline);

        const profileIds = scopedUsers
          .map((user) => user.personal_info_id?._id)
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

        const filteredUsers = scopedUsers
          .map((user) => {
            const profileId = user.personal_info_id?._id;
            const term = profileId ? termByProfileId.get(String(profileId)) : null;

            return {
              ...user,
              school_year: term?.latest_school_year || null,
              semester: term?.latest_semester || null,
              profile_term_id: term?.latest_profile_term_id || null,
              profile_terms: term?.profile_terms || [],
            };
          })
          .filter((u) => u.username !== "Admin" && u.username !== "Focal");

        /* One batch decrypt for the whole page, then mask or reveal per role.
           Doing this here (after the filters) keeps it to a single vault query
           regardless of page size. */
        const vaultRefs = filteredUsers
          .map((u) => u.personal_info_id?.vaultRef)
          .filter(Boolean);
        const resolvedByRef = vaultRefs.length
          ? await resolvePiiBatch({ vaultRefs, role })
          : new Map();

        return filteredUsers.map((u) => rosterRowForClient(u, resolvedByRef));
      },
      PROFILE_LIST_CACHE_TTL,
    );

    return NextResponse.json({ status: "success", data: usersNoPassword });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const rateLimitResult = await rateLimiters.register(req);
    if (rateLimitResult.error) {
      return NextResponse.json(
        { success: false, error: rateLimitResult.error },
        { status: rateLimitResult.status, headers: rateLimitResult.headers },
      );
    }

    await connectDB();

    const body = await req.json();

    const capitalizedBody = capitalizeObjectStrings(body);

    if (capitalizedBody?.affiliation?.academic_information?.student_id) {
      capitalizedBody.affiliation.academic_information.student_id =
        capitalizedBody.affiliation.academic_information.student_id.toUpperCase();
    }

    let personal =
      capitalizedBody.personal || capitalizedBody.personal_information;
    if (!personal || !personal.first_name || !personal.last_name) {
      throw new Error(
        "personal.first_name and personal.last_name are required",
      );
    }

    if (personal.birthday) {
      /* Duplicate detection runs on the blind index, not on the name columns.
         `personal.first_name` / `personal.last_name` are PII and are removed by
         the strip, so the `$regex` that used to sit here would match nothing —
         and a filter that matches nothing reads as "no duplicate", which is
         the wrong answer in the one direction that matters: it would let a
         second record for the same person through.

         The index holds digests of every spelling of the name, so the terms
         are looked up as digests. The exact-token digest is the one that
         corresponds to "first name equals X", which is stricter than the old
         case-insensitive `$regex` (it also no longer treats `O'Brien` and
         `OBrien` as the same person).

         The birthday cannot be compared here — it is encrypted with a random
         IV, so equal dates never produce equal ciphertext and no index can
         match it. It is therefore checked after decryption, below. */
      const firstDigests = searchIndexQuery(personal.first_name);
      const lastDigests = searchIndexQuery(personal.last_name);

      if (firstDigests && lastDigests) {
        /* The whole-field digest is the first token `blindIndexTokens`
           produces, and it is the one that means "this stored field is exactly
           this string" — which is what a name-and-birthday duplicate check
           wants. Matching on every token instead would also require the row to
           carry the same first-name split, so a stored "Vic Ronel" would fail
           to match a submitted "Vic" even though the person is the same.

           `$all` takes a flat list of digests the index must contain. */
        const candidates = await Profile.find(
          {
            profileSearchIndex: {
              $all: [firstDigests[0], lastDigests[0]],
            },
          },
          { _id: 1, vaultRef: 1 },
        ).lean();

        const birthdayDate = new Date(personal.birthday);
        const collision = await findSameNameAndBirthday(
          candidates,
          birthdayDate,
        );

        if (collision) {
          return NextResponse.json(
            {
              success: false,
              error:
                "A user with the same name and birthday already exists in the system",
            },
            { status: 409 },
          );
        }
      }
    }

    if (capitalizedBody?.affiliation?.academic_information?.student_id) {
      const studentId =
        capitalizedBody.affiliation.academic_information.student_id;
      const existingProfile = await Profile.findOne({
        "affiliation.academic_information.student_id": studentId,
      });
      if (existingProfile) {
        return NextResponse.json(
          {
            success: false,
            error: "This Student ID is already registered in the system",
          },
          { status: 409 },
        );
      }

      const existingUsername = await UserAuth.findOne(
        usernameEqualsFilter(normalizeStudentUsername(studentId)),
      ).lean();
      if (existingUsername) {
        return NextResponse.json(
          {
            success: false,
            error: "This Student ID is already registered in the system",
          },
          { status: 409 },
        );
      }
    }

    if (capitalizedBody?.affiliation?.employment_information?.employee_id) {
      const employeeId =
        capitalizedBody.affiliation.employment_information.employee_id;
      const existingProfile = await Profile.findOne({
        "affiliation.employment_information.employee_id": employeeId,
      });
      if (existingProfile) {
        return NextResponse.json(
          {
            success: false,
            error: "This Employee ID is already registered in the system",
          },
          { status: 409 },
        );
      }

      const existingUsername = await UserAuth.findOne(
        usernameEqualsFilter(normalizeEmployeeUsername(employeeId)),
      ).lean();
      if (existingUsername) {
        return NextResponse.json(
          {
            success: false,
            error: "This Employee ID is already registered in the system",
          },
          { status: 409 },
        );
      }
    }

    if (personal.religion) {
      const allowedReligions = [
        "Roman Catholic",
        "Iglesia ni Cristo",
        "Iglesia Independencia Filipina",
        "Protestant",
        "Born Again Christian",
        "Evangelical Christian",
        "Latter Day Saints",
        "Members Church of God International (MGCI)",
        "Other",
      ];
      personal.religion =
        allowedReligions.find(
          (r) => r.toLowerCase() === personal.religion.toLowerCase(),
        ) || personal.religion;
    }
    if (personal.bloodType) {
      const allowedBloodTypes = [
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-",
        "Unknown",
      ];
      personal.bloodType =
        allowedBloodTypes.find(
          (b) => b.toLowerCase() === personal.bloodType.toLowerCase(),
        ) || personal.bloodType;
    }

    /* `affiliation.person_type` is the required student/employee discriminator.
       The registration form still posts it as `personal.currentStatus`, so it
       is lifted onto the affiliation block here — the one place every create
       path passes through. `personal.currentStatus` itself is no longer echoed
       onto the document: the legacy block was stripped, so `person_type` is
       now its only home. */
    const affiliationPayload = { ...(capitalizedBody.affiliation || {}) };
    if (!affiliationPayload.person_type) {
      affiliationPayload.person_type =
        personal.currentStatus || undefined;
    }

    const profilePayload = {
      ...capitalizedBody,
      affiliation: affiliationPayload,
    };
    delete profilePayload.personal_information;
    /* The legacy blocks no longer exist on the schema, and their values are
       written to the vault below. Passing them to `create` would be ignored by
       Mongoose anyway (paths not in the schema), but sending them explicitly
       would also mean a future strict-mode change could store plaintext PII
       again — the exact thing this migration removed. */
    delete profilePayload.personal;
    delete profilePayload.gadData;
    delete profilePayload.contact;

    /* PII split, step 1 of 2: mint the identifiers. `gemsPublicId` is the only
       identifier a screen may show, and `vaultRef` links this profile to its
       encrypted IdentityVault row. Both are random, so neither can be guessed
       from the other or from a leaked GEMS document. */
    const { gemsPublicId, vaultRef } = await assignIdentifiers(Profile);

    const token = req.cookies.get("auth_token")?.value;
    let createdByUserId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        createdByUserId = decoded.id;
      } catch {}
    }

    const profilePayloadWithAudit = {
      ...profilePayload,
      created_by: createdByUserId,
      gemsPublicId,
      vaultRef,
      migrationStatus: "vaulted",
    };

    const email = capitalizedBody?.contact?.email;
    if (email) {
      /* Same reasoning as the name check above: `contact.email` is PII and is
         being removed, so a query against the column would stop matching once
         the strip lands. The digest is carried in the same blind index. */
      const emailDigests = searchIndexQuery(email);
      const existingEmail = emailDigests
        ? await Profile.findOne({
            profileSearchIndex: { $in: emailDigests },
          })
        : null;
      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            error: "This email is already registered in the system",
          },
          { status: 409 },
        );
      }
    }

    const role = "User";

    const username = await generateUniqueUsername(
      personal,
      capitalizedBody.affiliation,
      capitalizedBody.contact,
    );
    const tempPassword = generateTempPassword();

    const session = await mongoose.startSession();
    let profile;
    try {
      await session.withTransaction(async () => {
        profile = await Profile.create([profilePayloadWithAudit], { session });

        await UserAuth.create(
          [
            {
              personal_info_id: profile[0]._id,
              username,
              password: tempPassword,
              role,
            },
          ],
          { session },
        );

        const activeTermSetting = await SystemSetting.findOne({
          key: "active_term",
        }).lean();
        if (activeTermSetting?.value) {
          const { school_year, semester } = activeTermSetting.value;
          if (school_year && semester) {
            await ProfileTerm.create(
              [
                {
                  profile_id: profile[0]._id,
                  school_year,
                  semester,
                  affiliation: profile[0].affiliation || {},
                },
              ],
              { session },
            );
          }
        }
      });
    } finally {
      await session.endSession();
    }

    const createdProfile = profile[0];

    /* PII split, step 2 of 2: encrypt the personal / GAD / contact values into
       the vault and store the search digests on the GEMS row. The legacy
       fields stay populated for now (dual-write) so nothing breaks while the
       rest of the app is moved over. */
    const pii = extractPiiFromProfile({
      personal,
      gadData: capitalizedBody.gadData,
      contact: capitalizedBody.contact,
    });

    const { patch } = await savePii({
      profileId: createdProfile._id,
      vaultRef,
      pii,
      ownerType: "profile",
    });

    createdProfile.profileSearchIndex = patch.profileSearchIndex;
    await Profile.updateOne(
      { _id: createdProfile._id },
      { $set: { profileSearchIndex: patch.profileSearchIndex } },
    );

    cacheDelPrefix("profile:list:");

    await logActivity({
      req,
      action: "PROFILE_CREATE",
      description: `Profile created for ${personal.first_name} ${personal.last_name} (role: ${role})`,
      resource_type: "profile",
      resource_id: createdProfile._id,
      severity: "info",
    });

    if (global.io) {
      global.io.emit("profile:new", createdProfile);
      console.log("✅ Emitted profile:new", createdProfile._id);
    }

    return NextResponse.json(
      {
        success: true,
        profile_id: createdProfile._id,
        gems_public_id: createdProfile.gemsPublicId,
        username,
        temporary_password: tempPassword,
        role,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/profile error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}

export async function DELETE(req) {
  try {
    const { error, status } = await requireAdmin(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const usersToDelete = await UserAuth.find({ role: "User" }).select(
      "personal_info_id",
    );
    const profileIds = usersToDelete.map((u) => u.personal_info_id);

    await Profile.deleteMany({ _id: { $in: profileIds } });
    await UserAuth.deleteMany({ role: "User" });

    cacheDelPrefix("profile:list:");

    await logActivity({
      req,
      action: "BULK_PROFILE_DELETE",
      description: `Bulk deleted ${usersToDelete.length} user(s) with role "User"`,
      resource_type: "profile",
      severity: "critical",
      metadata: { count: usersToDelete.length },
    });

    if (global.io) {
      global.io.emit("profile:deleted");
      console.log("✅ Emitted profile:deleted for User role only");
    }

    return NextResponse.json({
      status: "success",
      message: `Deleted ${usersToDelete.length} users with role "User".`,
    });
  } catch (error) {
    console.error("DELETE /api/profile error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
