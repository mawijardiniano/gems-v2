// import { connectDB } from "@/lib/db";
// import GFPS from "@/models/gfps";

// // GET GFPS
// export async function GET() {
//   try {
//     await connectDB();

//     const data = await GFPS.findOne({ isActive: true })
//       .populate("sections.PRESIDENT.members.official")
//       .populate("sections.COLLEGE_DEANS.members.official");

//     return Response.json({ success: true, data });
//   } catch (err) {
//     return Response.json({ success: false, error: err.message }, { status: 500 });
//   }
// }

// // CREATE INITIAL GFPS (optional setup)
// export async function POST() {
//   try {
//     await connectDB();

//     const exists = await GFPS.findOne({ isActive: true });
//     if (exists) {
//       return Response.json({ success: true, data: exists });
//     }

//     const gfps = await GFPS.create({
//       name: "GFPS Organization",
//       sections: {},
//     });

//     return Response.json({ success: true, data: gfps });
//   } catch (err) {
//     return Response.json({ success: false, error: err.message }, { status: 500 });
//   }
// }

import { connectDB } from "@/lib/db";
import GFPS from "@/models/gfps";
import UniversityOfficial from "@/models/universityOfficials";

const userAuthPopulate = {
  path: "personal_info_id",
  populate: {
    path: "personal",
  },
};

const UNIVERSITY_OFFICIALS_POPULATE = [
  { path: "president.name", model: "UserAuth", populate: userAuthPopulate },
  { path: "vicePresidents.name", model: "UserAuth", populate: userAuthPopulate },
  { path: "campusDirectors.name", model: "UserAuth", populate: userAuthPopulate },
  { path: "collegeDeans.name", model: "UserAuth", populate: userAuthPopulate },
  { path: "associateDeans.name", model: "UserAuth", populate: userAuthPopulate },
  { path: "office_of_the_president.name", model: "UserAuth", populate: userAuthPopulate },
  { path: "office_of_the_vice_president_academic_affairs.name", model: "UserAuth", populate: userAuthPopulate },
  { path: "office_of_the_vice_president_admin_finance.name", model: "UserAuth", populate: userAuthPopulate },
  { path: "office_of_the_vice_president_student_affairs.name", model: "UserAuth", populate: userAuthPopulate },
  { path: "office_of_the_vice_president_research_extension.name", model: "UserAuth", populate: userAuthPopulate },
];

const getId = (o) =>
  typeof o === "object" ? o?._id?.toString() : o?.toString();

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

  return obj;
}

const normalizeSectionOfficials = (section) => {
  if (!section) return section;

  // chair
  if (!section.members && section.official) {
    return {
      ...section,
      official: getId(section.official),
    };
  }

  if (Array.isArray(section)) {
    return section.map((m) => ({
      ...m,
      official: getId(m.official),
      first_name: m.first_name,
      last_name: m.last_name,
    }));
  }

  // members section
  return {
    ...section,
    members: (section.members || []).map((m) => ({
      ...m,
      official: getId(m.official),
      role: m.role || "member",
      first_name: m.first_name,
      last_name: m.last_name,
    })),
  };
};

function makeFilterHelpers(universityOfficials) {
  function findOfficialById(id) {
    if (!id || !universityOfficials) return null;

    const idStr = id.toString();

    const allGroups = [
  { arr: universityOfficials.president ? [universityOfficials.president] : [], group: "president" },

  { arr: universityOfficials.vicePresidents, group: "vicePresidents" },

  { arr: universityOfficials.campusDirectors, group: "campusDirectors" },

  { arr: universityOfficials.collegeDeans, group: "collegeDeans" },

  { arr: universityOfficials.associateDeans, group: "associateDeans" },

  { arr: universityOfficials.office_of_the_president, group: "office_of_the_president" },

  { arr: universityOfficials.office_of_the_vice_president_academic_affairs, group: "office_of_the_vice_president_academic_affairs" },

  { arr: universityOfficials.office_of_the_vice_president_admin_finance, group: "office_of_the_vice_president_admin_finance" },

  { arr: universityOfficials.office_of_the_vice_president_student_affairs, group: "office_of_the_vice_president_student_affairs" },

  { arr: universityOfficials.office_of_the_vice_president_research_extension, group: "office_of_the_vice_president_research_extension" },
];

    for (const { arr, group } of allGroups) {
      if (!Array.isArray(arr)) continue;

      const found = arr.find((item) => {
        const nameId =
          typeof item.name === "object" ? item.name?._id : item.name;

        return nameId?.toString() === idStr;
      });

      if (found) return { ...found, group };
    }

    return null;
  }

  function filterOfficialWithDetails(member) {
  if (!member?.official) return member;

  const details = findOfficialById(member.official);
  if (!details) return { ...member, official: null };

  const personal = details?.name?.personal_info_id?.personal;

  const first_name =
    personal?.first_name ||
    details.first_name ||
    member.first_name ||
    "";

  const last_name =
    personal?.last_name ||
    details.last_name ||
    member.last_name ||
    "";

  return {
    ...member,
    official: {
      ...details,
      name: removeSensitiveUserFields(details.name),
      personal_info_id: details?.name?.personal_info_id?._id || details?.personal_info_id,
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

    if (section.members) {
      return {
        ...section,
        members: section.members.map(filterOfficialWithDetails),
      };
    }

    if (section.official) {
      return filterOfficialWithDetails(section);
    }

    return section;
  }

  return { filterOfficialWithDetails, filterSectionWithDetails };
}

export async function GET() {
  await connectDB();

  const universityOfficials = await UniversityOfficial.findOne({})
    .populate(UNIVERSITY_OFFICIALS_POPULATE)
    .lean();

  const { filterSectionWithDetails } =
    makeFilterHelpers(universityOfficials);

  let gfps = await GFPS.find().lean();

  gfps = gfps.map((doc) => ({
    ...doc,
    chairOrHeadOfAgency: filterSectionWithDetails(doc.chairOrHeadOfAgency),
    executiveCommittee: filterSectionWithDetails(doc.executiveCommittee),
    technicalWorkingGroup: filterSectionWithDetails(doc.technicalWorkingGroup),
    secretariat: filterSectionWithDetails(doc.secretariat),
  }));

  return Response.json({ success: true, data: gfps });
}

export async function POST(req) {
  await connectDB();

  const body = await req.json();

  console.log("[GFPS POST] incoming:", body);

  if (body.chairOrHeadOfAgency) {
    body.chairOrHeadOfAgency = normalizeSectionOfficials(body.chairOrHeadOfAgency);
  }

  if (body.executiveCommittee) {
    body.executiveCommittee = normalizeSectionOfficials(body.executiveCommittee);
  }

  if (body.technicalWorkingGroup) {
    body.technicalWorkingGroup = normalizeSectionOfficials(body.technicalWorkingGroup);
  }

  if (body.secretariat) {
    body.secretariat = normalizeSectionOfficials(body.secretariat);
  }

  let doc = await GFPS.findOne({});

  if (!doc) {
    doc = await GFPS.create(body);
  } else {
    if (body.chairOrHeadOfAgency)
      doc.chairOrHeadOfAgency = body.chairOrHeadOfAgency;

if (body.executiveCommittee?.members) {
  doc.executiveCommittee ||= { members: [] };

  body.executiveCommittee.members.forEach((newMember) => {
    const newId = getId(newMember.official);

    const index = doc.executiveCommittee.members.findIndex(
      (m) => getId(m.official) === newId
    );

    if (index !== -1) {
      // 🔥 UPDATE existing instead of skipping
      doc.executiveCommittee.members[index] = {
        ...doc.executiveCommittee.members[index],
        ...newMember,
      };
    } else {
      // insert new
      doc.executiveCommittee.members.push(newMember);
    }
  });
}

if (body.technicalWorkingGroup?.members) {
  doc.technicalWorkingGroup ||= { members: [] };

  body.technicalWorkingGroup.members.forEach((newMember) => {
    const newId = getId(newMember.official);

    const index = doc.technicalWorkingGroup.members.findIndex(
      (m) => getId(m.official) === newId
    );

    if (index !== -1) {
      doc.technicalWorkingGroup.members[index] = {
        ...doc.technicalWorkingGroup.members[index],
        ...newMember,
      };
    } else {
      doc.technicalWorkingGroup.members.push(newMember);
    }
  });
}

if (body.secretariat) {
  body.secretariat.forEach((newMember) => {
    const newId = getId(newMember.official);

    const index = doc.secretariat.findIndex(
      (m) => getId(m.official) === newId
    );

    if (index !== -1) {
      doc.secretariat[index] = {
        ...doc.secretariat[index],
        ...newMember,
      };
    } else {
      doc.secretariat.push(newMember);
    }
  });
}

    await doc.save();
  }

  return Response.json({ success: true, data: doc });
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
export async function DELETE() {
  await connectDB();
  await GFPS.deleteMany({});
  return Response.json({ success: true });
}