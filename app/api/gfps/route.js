import { connectDB } from "@/lib/db";
import GFPS from "@/models/gfps";
import UniversityOfficial from "@/models/universityOfficials";

function filterOfficial(member) {
  if (!member || !member.official) return member;
  return member;
}

function filterSection(section) {
  if (!section) return section;
  if (Array.isArray(section)) {
    return section.map(filterOfficial);
  }
  if (section.chair || section.members) {
    const filtered = { ...section };
    if (filtered.chair) filtered.chair = filterOfficial(filtered.chair);
    if (filtered.members)
      filtered.members = filtered.members.map(filterOfficial);
    return filtered;
  }
  return section;
}

async function normalizeOfficialId(id) {
  if (!id) return null;
  const universityOfficials = await UniversityOfficial.findOne({}).lean();
  const idStr = id.toString();
  // Debug log for president matching
  if (universityOfficials.president) {
    console.log(
      "[normalizeOfficialId] Incoming id:",
      idStr,
      "| president.name:",
      universityOfficials.president.name?.toString(),
    );
    if (universityOfficials.president.name?.toString() === idStr) {
      console.log(
        "[normalizeOfficialId] Matched president! Returning:",
        universityOfficials.president.name?.toString(),
      );
      return universityOfficials.president.name?.toString();
    }
  }
  for (const vp of universityOfficials.vicePresidents || []) {
    if (vp._id?.toString() === idStr) return vp.name?.toString();
  }
  for (const cd of universityOfficials.campusDirectors || []) {
    if (cd._id?.toString() === idStr) return cd.name?.toString();
  }
  for (const dean of universityOfficials.collegeDeans || []) {
    if (dean._id?.toString() === idStr) return dean.name?.toString();
  }
  for (const ad of universityOfficials.associateDeans || []) {
    if (ad._id?.toString() === idStr) return ad.name?.toString();
  }
  for (const op of universityOfficials.office_of_the_president || []) {
    if (op._id?.toString() === idStr) return op.name?.toString();
  }
  for (const arr of [
    universityOfficials.office_of_the_vice_president_academic_affairs,
    universityOfficials.office_of_the_vice_president_admin_finance,
    universityOfficials.office_of_the_vice_president_student_affairs,
    universityOfficials.office_of_the_vice_president_research_extension,
  ]) {
    for (const item of arr || []) {
      if (item._id?.toString() === idStr) return item.name?.toString();
    }
  }

  console.log(
    "[normalizeOfficialId] No match found for id:",
    idStr,
    "| Returning as is.",
  );
  return id;
}

function removeSensitiveUserFields(userAuth) {
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

  if (obj.personal_info_id) {
    if (typeof obj.personal_info_id === "object") {
      const p = obj.personal_info_id;

      if (p.personal) {
        delete p.personal;
      }
    }
  }

  return obj;
}

async function normalizeSectionOfficials(section) {
  if (!section) return section;
  if (Array.isArray(section)) {
    return Promise.all(section.map(normalizeSectionOfficials));
  }
  const normalized = { ...section };
  if (normalized.official) {
    normalized.official = await normalizeOfficialId(normalized.official);
  }
  if (normalized.chair) {
    normalized.chair = await normalizeSectionOfficials(normalized.chair);
  }
  if (normalized.members) {
    normalized.members = await Promise.all(
      (normalized.members || []).map(normalizeSectionOfficials),
    );
  }
  return normalized;
}

export async function GET(req) {
  await connectDB();
  const universityOfficials = await UniversityOfficial.findOne({})
    .populate([
      {
        path: "president.name",
        model: "UserAuth",
        populate: { path: "personal_info_id" },
      },
      {
        path: "vicePresidents.name",
        model: "UserAuth",
        populate: { path: "personal_info_id" },
      },
      {
        path: "campusDirectors.name",
        model: "UserAuth",
        populate: { path: "personal_info_id" },
      },
      {
        path: "collegeDeans.name",
        model: "UserAuth",
        populate: { path: "personal_info_id" },
      },
      {
        path: "associateDeans.name",
        model: "UserAuth",
        populate: { path: "personal_info_id" },
      },
      {
        path: "office_of_the_president.name",
        model: "UserAuth",
        populate: { path: "personal_info_id" },
      },
      {
        path: "office_of_the_vice_president_academic_affairs.name",
        model: "UserAuth",
        populate: { path: "personal_info_id" },
      },
      {
        path: "office_of_the_vice_president_admin_finance.name",
        model: "UserAuth",
        populate: { path: "personal_info_id" },
      },
      {
        path: "office_of_the_vice_president_student_affairs.name",
        model: "UserAuth",
        populate: { path: "personal_info_id" },
      },
      {
        path: "office_of_the_vice_president_research_extension.name",
        model: "UserAuth",
        populate: { path: "personal_info_id" },
      },
    ])
    .lean();
  function findOfficialById(id) {
    if (!id || !universityOfficials) return null;
    const idStr = id.toString();

    if (universityOfficials.president) {
      let presidentId = universityOfficials.president.name;
      if (presidentId && typeof presidentId === "object" && presidentId._id) {
        presidentId = presidentId._id;
      }
      presidentId = presidentId?.toString();
      console.log(
        "[findOfficialById] Searching for id:",
        idStr,
        "| president.name:",
        presidentId,
      );
      if (presidentId === idStr) {
        console.log("[findOfficialById] Matched president!");
        return { ...universityOfficials.president, group: "president" };
      }
    }

    const arrays = [
      { arr: universityOfficials.vicePresidents, group: "vicePresidents" },
      { arr: universityOfficials.campusDirectors, group: "campusDirectors" },
      { arr: universityOfficials.collegeDeans, group: "collegeDeans" },
      { arr: universityOfficials.associateDeans, group: "associateDeans" },
      {
        arr: universityOfficials.office_of_the_president,
        group: "office_of_the_president",
      },
      {
        arr: universityOfficials.office_of_the_vice_president_academic_affairs,
        group: "office_of_the_vice_president_academic_affairs",
      },
      {
        arr: universityOfficials.office_of_the_vice_president_admin_finance,
        group: "office_of_the_vice_president_admin_finance",
      },
      {
        arr: universityOfficials.office_of_the_vice_president_student_affairs,
        group: "office_of_the_vice_president_student_affairs",
      },
      {
        arr: universityOfficials.office_of_the_vice_president_research_extension,
        group: "office_of_the_vice_president_research_extension",
      },
    ];
    for (const { arr, group } of arrays) {
      if (Array.isArray(arr)) {
        const found = arr.find((item) => {
          let nameId = item.name;
          // Handle populated UserAuth object
          if (nameId && typeof nameId === "object" && nameId._id) {
            nameId = nameId._id;
          }
          nameId = nameId?.toString();
          return nameId === idStr;
        });
        if (found) return { ...found, group };
      }
    }
    return null;
  }

  function filterOfficialWithDetails(member) {
    if (!member || !member.official) return member;
    const details = findOfficialById(member.official);
    if (!details) return { ...member, official: null };
    let personal_info_id = details.name?.personal_info_id;
    let first_name = "";
    let last_name = "";
    if (personal_info_id && typeof personal_info_id === "object") {
      if (personal_info_id.personal) {
        first_name = personal_info_id.personal.first_name || "";
        last_name = personal_info_id.personal.last_name || "";
      } else {
        first_name = personal_info_id.first_name || "";
        last_name = personal_info_id.last_name || "";
      }
    }
    // return {
    //   ...member,
    //   official: {
    //     ...details,
    //     personal_info_id: personal_info_id?._id || personal_info_id,
    //     first_name,
    //     last_name,
    //   },
    // };
    return {
      ...member,
      official: {
        ...details,
        name: removeSensitiveUserFields(details.name),
        personal_info_id: personal_info_id?._id || personal_info_id,
        first_name,
        last_name,
      },
    };
  }
  function filterSectionWithDetails(section) {
    if (!section) return section;
    if (Array.isArray(section)) {
      return section.map(filterOfficialWithDetails);
    }
    if (section.chair || section.members) {
      const filtered = { ...section };
      if (filtered.chair)
        filtered.chair = filterOfficialWithDetails(filtered.chair);
      if (filtered.members)
        filtered.members = filtered.members.map(filterOfficialWithDetails);
      return filtered;
    }
    return section;
  }

  let gfps = await GFPS.find();
  gfps = gfps.map((doc) => {
    const obj = doc.toObject();
    obj.chairOrHeadOfAgency = filterOfficialWithDetails(
      obj.chairOrHeadOfAgency,
    );
    obj.executiveCommittee = filterSectionWithDetails(obj.executiveCommittee);
    obj.technicalWorkingGroup = filterSectionWithDetails(
      obj.technicalWorkingGroup,
    );
    obj.secretariat = filterSectionWithDetails(obj.secretariat);
    return obj;
  });
  return Response.json({ success: true, data: gfps });
}

export async function POST(req) {
  await connectDB();
  const body = await req.json();

  // Normalize all official fields in all sections before saving
  if (body.chairOrHeadOfAgency) {
    body.chairOrHeadOfAgency = await normalizeSectionOfficials(
      body.chairOrHeadOfAgency,
    );
  }
  if (body.executiveCommittee) {
    body.executiveCommittee = await normalizeSectionOfficials(
      body.executiveCommittee,
    );
  }
  if (body.technicalWorkingGroup) {
    body.technicalWorkingGroup = await normalizeSectionOfficials(
      body.technicalWorkingGroup,
    );
  }
  if (body.secretariat) {
    body.secretariat = await normalizeSectionOfficials(body.secretariat);
  }
  console.log("[GFPS POST] Incoming body:", JSON.stringify(body, null, 2));
  try {
    let existing = await GFPS.findOne({});
    let doc;
    if (existing) {
      if (body.chairOrHeadOfAgency) {
        existing.chairOrHeadOfAgency = body.chairOrHeadOfAgency;
      }
      if (body.executiveCommittee?.members?.length) {
        // Ensure executiveCommittee and its members array are initialized
        if (!existing.executiveCommittee) {
          existing.executiveCommittee = { members: [] };
        }
        if (!Array.isArray(existing.executiveCommittee.members)) {
          existing.executiveCommittee.members = [];
        }
        const newMembers = body.executiveCommittee.members.filter(
          (newMember) =>
            !existing.executiveCommittee.members.some(
              (existingMember) =>
                existingMember.official?.toString() === newMember.official,
            ),
        );
        existing.executiveCommittee.members.push(...newMembers);
      }
      if (body.technicalWorkingGroup?.members?.length) {
        // Ensure technicalWorkingGroup and its members array are initialized
        if (!existing.technicalWorkingGroup) {
          existing.technicalWorkingGroup = { members: [] };
        }
        if (!Array.isArray(existing.technicalWorkingGroup.members)) {
          existing.technicalWorkingGroup.members = [];
        }
        const newMembers = body.technicalWorkingGroup.members.filter(
          (newMember) =>
            !existing.technicalWorkingGroup.members.some(
              (existingMember) =>
                existingMember.official?.toString() === newMember.official,
            ),
        );
        existing.technicalWorkingGroup.members.push(...newMembers);
      }
      if (body.secretariat?.length) {
        const newMembers = body.secretariat.filter(
          (newMember) =>
            !existing.secretariat.some(
              (existingMember) =>
                existingMember.official?.toString() === newMember.official,
            ),
        );
        existing.secretariat.push(...newMembers);
      }
      await existing.save();
      doc = existing;
    } else {
      doc = await GFPS.create(body);
    }
    console.log("[GFPS POST] Saved/created doc:", JSON.stringify(doc, null, 2));
    let populated = await GFPS.findById(doc._id).populate([
      { path: "chairOrHeadOfAgency.official" },
      { path: "executiveCommittee.members.official" },
      { path: "technicalWorkingGroup.members.official" },
      { path: "secretariat.official" },
    ]);
    populated = populated.toObject();
    populated.chairOrHeadOfAgency = filterOfficial(
      populated.chairOrHeadOfAgency,
    );
    // Only use members array for executiveCommittee
    if (
      populated.executiveCommittee &&
      Array.isArray(populated.executiveCommittee.members)
    ) {
      populated.executiveCommittee.members =
        populated.executiveCommittee.members.map(filterOfficial);
    }
    populated.technicalWorkingGroup = filterSection(
      populated.technicalWorkingGroup,
    );
    populated.secretariat = filterSection(populated.secretariat);
    return Response.json({ success: true, data: populated });
  } catch (error) {
    console.error("[GFPS POST] Error:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}

export async function DELETE(req) {
  await connectDB();
  try {
    await GFPS.deleteMany({});
    return Response.json({
      success: true,
      message: "All GFPS documents deleted.",
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}
