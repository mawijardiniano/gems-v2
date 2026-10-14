import "dotenv/config";
import mongoose from "mongoose";
import "../models/universityOfficials.js";

const UniversityOfficial = mongoose.models.UniversityOfficial;

/**
 * Seeds the MarSU Official Roster AY 2026-2027 (46 rows).
 * Offices reuse existing HEADERS (same offices, different terms);
 * positions + names are manually encoded (assigned-only mode).
 * Rerunnable: upserts on {academic_year, header, position}.
 * Usage: node scripts/seed-officials-2026-2027.mjs
 */

const AY = "2026-2027";

const ROWS = [
  // Office of the University President -> OFFICE OF THE PRESIDENT (8)
  ["OFFICE OF THE PRESIDENT", "Secretary of the University and of the Board of Regents", "Dr. Maria Morena V. Santos"],
  ["OFFICE OF THE PRESIDENT", "Chief, Presidential Management Staff", "Dr. Alfredo M. Ofrecio III (concurrent)"],
  ["OFFICE OF THE PRESIDENT", "Acting Executive Assistant", "Ms. Lenie P. Zulueta"],
  ["OFFICE OF THE PRESIDENT", "Director, Policy Strategy and Performance", "Ms. Mila Grace D. Gutierrez"],
  ["OFFICE OF THE PRESIDENT", "Director, University Quality Assurance", "Assoc. Prof. Raoul J. Magcamit"],
  ["OFFICE OF THE PRESIDENT", "Director, Legal Risk and Governance", "Atty. Pearl B. De Luna-Rodas"],
  ["OFFICE OF THE PRESIDENT", "Director, External Relations and Partnerships", "Asst. Prof. Jholey Rose L. Lancion"],
  ["OFFICE OF THE PRESIDENT", "Director, Internal Audit Services", "Mr. Abet R. Faundo"],
  // Academic Affairs Department -> OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS (16)
  ["OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS", "Vice-President for Academic Affairs", "Dr. Leodegario M. Jalos, Jr."],
  ["OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS", "Director, Curriculum and Instructions Systems", "Dr. Liza Marie Manoos-Pacia"],
  ["OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS", "Director, Academic Support and Student Academic Records", "Ms. Gemma A. Tirol"],
  ["OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS", "Dean, Graduate Studies", "Assoc. Prof. Dr. Julieta Q. Nabos"],
  ["OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS", "Dean, College of Teacher Education", "Assoc. Prof. Dr. Susan B. Pineda"],
  ["OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS", "Dean, College of Arts and Sciences", "Assoc. Prof. Dr. Ernesto L. Largado"],
  ["OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS", "Dean, College of Business and Accountancy", "Asst. Prof. Lynle N. Mendoza"],
  ["OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS", "Dean, College of Engineering", "Assoc. Prof. Engr. Melito L. Hirondo"],
  ["OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS", "Dean, College of Industrial Technology", "Assoc. Prof. Mario T. Mascareñas"],
  ["OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS", "Dean, College of Information and Computing Sciences", "Assoc. Prof. Dr. Ronjie Mar L. Malinao"],
  ["OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS", "Dean, College of Governance", "Instr. Dr. Keam Eric L. Malabayabas"],
  ["OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS", "Dean, College of Criminal Justice Education", "Asst. Prof. Dr. Vergel L. Mayo"],
  ["OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS", "Dean, College of Allied Health and Social Sciences", "Assoc. Prof. Marvin P. Plata"],
  ["OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS", "Dean, College of Fisheries and Aquatic Sciences", "Prof. Dr. Paloma DC. De Chavez"],
  ["OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS", "Dean, College of Agri-Ecosystem Solution", "Assoc. Prof. Dr. Marilyn A. Mayores"],
  ["OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS", "Director, Institute of Physical Education", "Instr. Sharmaine B. Balut"],
  // Administration, Finance and Economic Enterprise Department -> ...ADMINISTRATION AND FINANCE (11)
  ["OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE", "Vice President for Administration, Finance and Economic Enterprise", "Atty. Crispin Francis M. Jandusay"],
  ["OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE", "Director, Administrative and Gen. Services", "Ms. Erma E. Reyes"],
  ["OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE", "Director, Human Resource Management and Development", "Ms. Erma E. Reyes (concurrent)"],
  ["OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE", "Director, Financial Management Services", "Dr. Alfredo M. Ofrecio III"],
  ["OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE", "Director, Information and Digital Systems", "Mr. Wilbert P. Benedicto"],
  ["OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE", "Director, Project Management", "Asst. Prof. Ar. Maynard M. Muhi"],
  ["OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE", "Director, Campus Operations and Systems Coordination, MarSU Sta. Cruz", "Assoc. Prof. Dr. Randell R. Reginio"],
  ["OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE", "Director, Campus Operations and Systems Coordination, MarSU Torrijos", "Assoc. Prof. Andy L. Soberano"],
  ["OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE", "Director, Campus Operations and Systems Coordination, MarSU Gasan", "Assoc. Prof. Dr. Jovito L. Opeña"],
  ["OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE", "Administrator, Mogpog Extramural Study Center", "Assoc. Prof. Dr. Joy S. Montejo"],
  ["OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE", "Director, Economic Enterprise and Resource Generation", "Asst. Prof. Dr. Michael Jaye P. Ribleza"],
  // Research, Innovation and Extension Department -> ...RESEARCH AND EXTENSION (5)
  ["OFFICE OF THE VICE PRESIDENT FOR RESEARCH AND EXTENSION", "Vice President for Research, Innovation and Extension", "Prof. Dr. Ma. Edelwina M. Blasé"],
  ["OFFICE OF THE VICE PRESIDENT FOR RESEARCH AND EXTENSION", "Director, Research and Publication", "Assoc. Prof. Dr. Evangeline B. Mandia"],
  ["OFFICE OF THE VICE PRESIDENT FOR RESEARCH AND EXTENSION", "Director, Intellectual Property and Technology Transfer", "Assoc. Prof. Edgardo R. Laririt"],
  ["OFFICE OF THE VICE PRESIDENT FOR RESEARCH AND EXTENSION", "Director, Extension Services", "Prof. Dr. Doreen R. Mascareñas"],
  ["OFFICE OF THE VICE PRESIDENT FOR RESEARCH AND EXTENSION", "Director, Campus RET Coordination", "Assoc. Prof. Dr. Michael V. Capiña"],
  // Student Services Department -> ...STUDENT AFFAIRS AND SERVICES (6)
  ["OFFICE OF THE VICE PRESIDENT FOR STUDENT AFFAIRS AND SERVICES", "Vice President for Student Services", "Assoc. Prof. Dr. Verna Liza L. Capiña"],
  ["OFFICE OF THE VICE PRESIDENT FOR STUDENT AFFAIRS AND SERVICES", "Director, Admission and Transition Services", "Assoc. Prof. Julie P. Rodelas"],
  ["OFFICE OF THE VICE PRESIDENT FOR STUDENT AFFAIRS AND SERVICES", "Director, Student Welfare and Well-being", "Asst. Prof. Emelita R. Rodelas"],
  ["OFFICE OF THE VICE PRESIDENT FOR STUDENT AFFAIRS AND SERVICES", "Director, Student Development, Engagement and Governance", "Asst. Prof. Arnel M. Lantitat"],
  ["OFFICE OF THE VICE PRESIDENT FOR STUDENT AFFAIRS AND SERVICES", "Director, Student Success and Career Services", "Assoc. Prof. Dr. Merryrose R. Palma"],
  ["OFFICE OF THE VICE PRESIDENT FOR STUDENT AFFAIRS AND SERVICES", "Director, Health and Wellness", "Mr. John Ryan R. Leaño"],
];

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[seed-officials-2026-2027] MONGODB_URI is not defined in .env");
  process.exit(1);
}

async function run() {
  console.log(`[seed-officials-2026-2027] rows=${ROWS.length}`);
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  let upserted = 0;
  let matched = 0;
  for (const [header, position, name_text] of ROWS) {
    const res = await UniversityOfficial.updateOne(
      { academic_year: AY, header, position },
      {
        $set: {
          academic_year: AY,
          header,
          title: position,
          position,
          unit: "",
          name: null,
          name_text,
        },
      },
      { upsert: true },
    );
    if (res.upsertedCount) upserted += 1;
    else matched += 1;
  }
  const count = await UniversityOfficial.countDocuments({ academic_year: AY });
  console.log(`[seed-officials-2026-2027] upserted=${upserted} matched=${matched} total-2026-2027=${count}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("[seed-officials-2026-2027] FAILED:", err);
  process.exit(1);
});
