/**
 * Marinduque State University — Offices & Administrative Designations
 *
 * Single source of truth for the org chart. Every header, title and unit is
 * encoded here; the database only stores who currently fills a seat.
 *
 * A seat is identified by `header + title + unit` (see CATALOG.key below).
 * Titles repeat across the whole chart (Head, Director, Program Chair, ...)
 * while units are unique per title; the header disambiguates the identical
 * title+unit pairs that exist under different campus branches.
 */

export const MARSU_OFFICES = [
  {
    header: "EXECUTIVE OFFICIALS",
    positions: [
      { title: "University President" },
      { title: "Vice President for Academic Affairs" },
      { title: "Vice President for Student Affairs and Services" },
      { title: "Vice President for Administration and Finance" },
      { title: "Vice President for Research Development and Extension" },
      { title: "Campus Director", unit: "MarSU Boac (Main)" },
      { title: "Campus Director", unit: "MarSU Torrijos" },
      { title: "Campus Director", unit: "MarSU Santa Cruz" },
      { title: "Campus Director", unit: "MarSU Gasan" },
      { title: "Campus Director", unit: "MarSU Extramural Center in Mogpog" },
      { title: "Executive Assistant" },
      { title: "University Secretary" },
    ],
  },
  {
    header: "OFFICE OF THE PRESIDENT",
    positions: [
      { title: "Chief", unit: "Presidential Management Staff" },
      { title: "Director", unit: "International Relations and Linkages Office" },
      { title: "Director", unit: "Quality Assurance Office" },
      { title: "GAD Focal Person" },
      { title: "Head", unit: "Legal Services Unit" },
      { title: "Head", unit: "Information Unit" },
      { title: "Head", unit: "Planning and Development Unit" },
      { title: "Head", unit: "Internal Audit Service Unit" },
      { title: "Presidential Assistant", unit: "Special Projects & Advocacy Programs" },
      { title: "Presidential Assistant", unit: "Social Media Communications" },
      { title: "Data Protection Officer" },
    ],
  },
  {
    header: "OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS",
    positions: [
      { title: "Dean", unit: "College of Agriculture" },
      { title: "Dean", unit: "College of Allied Health Sciences" },
      { title: "Dean", unit: "College of Arts and Social Sciences" },
      { title: "Dean", unit: "College of Business and Accountancy" },
      { title: "Dean", unit: "College of Criminal Justice Education" },
      { title: "Dean", unit: "College of Education" },
      { title: "Dean", unit: "College of Engineering" },
      { title: "Dean", unit: "College of Environment Studies" },
      { title: "Dean", unit: "College of Fisheries and Aquatic Sciences" },
      { title: "Dean", unit: "College of Governance" },
      { title: "Dean", unit: "College of Industrial Technology" },
      { title: "Dean", unit: "College of Information and Computing Sciences" },
      { title: "Dean", unit: "Graduate School" },
      { title: "Associate Dean", unit: "College of Allied Health Sciences" },
      { title: "Associate Dean", unit: "College of Business and Accountancy - Santa Cruz Campus" },
      { title: "Associate Dean", unit: "College of Education" },
      { title: "Associate Dean", unit: "Graduate School" },
      { title: "Director", unit: "Curriculum and Instruction" },
      { title: "Principal", unit: "Integrated High School" },
      { title: "Manager", unit: "Science Laboratories" },
    ],
  },
  {
    header: "OFFICE OF THE VICE PRESIDENT FOR STUDENT AFFAIRS AND SERVICES",
    positions: [
      { title: "Director", unit: "Student Development Office" },
      { title: "Director", unit: "Student Programs and Services Office" },
      { title: "Director", unit: "Student Welfare Office" },
      { title: "Head", unit: "Admission and Registration Office" },
      { title: "Head", unit: "Alumni Relations Office" },
      { title: "Head", unit: "Career & Job Placement Services Office" },
      { title: "Head", unit: "Culture and Arts Office" },
      { title: "Head", unit: "Foreign/International Student Service Office" },
      { title: "Head", unit: "Guidance and Counseling Services Office" },
      { title: "Head", unit: "Health Services Office" },
      { title: "Head", unit: "Learning Resource Center" },
      { title: "Head", unit: "Multi-faith Services Office" },
      { title: "Head", unit: "National Service Training Program Office" },
      { title: "Head", unit: "Testing, Information and Orientation Services Office" },
      { title: "Head", unit: "Scholarship & Finance Assistance Service Office" },
      { title: "Head", unit: "Sports and Wellness Office" },
      { title: "Head", unit: "Student Assistantship and Economic Enterprise Dev. Office" },
      { title: "Head", unit: "Student Discipline Office" },
      { title: "Head", unit: "Student Housing & Residential Service Office" },
      { title: "Head", unit: "Student Organization & Activities Office" },
      { title: "Head", unit: "Student Publication" },
      { title: "Head", unit: "Student Volunteer and Community Outreach" },
      { title: "Focal Person", unit: "SAS Research Unit" },
      { title: "Focal Person", unit: "Services for Persons with Disabilities & Special Needs" },
    ],
  },
  {
    header: "OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE",
    positions: [
      { title: "Supervising Administrative Officer / Acting Chief Administrative Officer" },
      { title: "Director", unit: "Business Affairs & Production Services" },
      { title: "Director", unit: "Financial Services" },
      { title: "Head", unit: "Accounting Unit" },
      { title: "Head", unit: "Budgeting Unit" },
      { title: "Head", unit: "Business Affairs Office" },
      { title: "Head", unit: "Cashiering Unit" },
      { title: "Head", unit: "Disaster Risk Reduction & Management" },
      { title: "Deputy Head", unit: "Disaster Risk Reduction & Management" },
      { title: "Head", unit: "Electrical Services" },
      { title: "Head", unit: "General Services" },
      { title: "Head", unit: "Human Resource Management Unit" },
      { title: "Head", unit: "Information, Communication & Technology Services Center" },
      { title: "Head", unit: "Motorpool Services" },
      { title: "Head", unit: "Physical Facilities & Project Management Unit" },
      { title: "Head", unit: "Procurement Unit" },
      { title: "Head", unit: "Production and Commercialization Unit" },
      { title: "Head", unit: "Records Management Unit" },
      { title: "Head", unit: "Security Services" },
      { title: "Head", unit: "Supply and Property Management" },
    ],
  },
  {
    header: "OFFICE OF THE VICE PRESIDENT FOR RESEARCH AND EXTENSION",
    positions: [
      { title: "Director", unit: "Extension" },
      { title: "Director", unit: "Knowledge and Technology Transfer Office" },
      { title: "Director", unit: "Research" },
      { title: "Director", unit: "Publications" },
      { title: "Director", unit: "Marinduque Research and Development Center" },
      { title: "Manager", unit: "Innovations and Technical Support Office" },
    ],
  },
  {
    header: "PROGRAM CHAIRPERSONS",
    positions: [
      { title: "Program Chair", unit: "Extended Graduate Programs in EQC & QECI" },
      { title: "Program Chair", unit: "Doctor of Education & Master of Arts in Education" },
      { title: "Program Chair", unit: "Master in Public Administration" },
      { title: "Program Chair", unit: "Programs under Consortia with Other SUCs" },
      { title: "Program Chair", unit: "Master in Information Technology" },
      { title: "Program Chair", unit: "BS in Agriculture" },
      { title: "Program Chair", unit: "Diploma/B in Agricultural Technology" },
      { title: "Program Chair", unit: "BS in Nursing" },
      { title: "Program Chair", unit: "BS in Midwifery" },
      { title: "Program Chair", unit: "BS in Environmental Sciences" },
      { title: "Program Chair", unit: "BS in Fisheries" },
      { title: "Program Chair", unit: "B of Elementary Education" },
      { title: "Program Chair", unit: "B of Secondary Education" },
      { title: "Program Chair", unit: "B of Culture & Arts Education" },
      { title: "Program Chair", unit: "B of Technology and Livelihood Education" },
      { title: "Program Chair", unit: "B of Arts in English Language Studies" },
      { title: "Assistant Program Chair", unit: "B of Arts in English Language Studies" },
      { title: "Program Chair", unit: "B of Arts in Communication" },
      { title: "Program Chair", unit: "BS in Social Work" },
      { title: "Program Chair", unit: "BS Accountancy & BSAIS" },
      { title: "Assistant Program Chair", unit: "BS Accountancy & BSAIS" },
      { title: "Program Chair", unit: "BS in Entrepreneurship" },
      { title: "Program Chair", unit: "BSBA major in Financial Management" },
      { title: "Program Chair", unit: "BSBA major in Marketing Management" },
      { title: "Program Chair", unit: "BSBA major in Human Resource Management" },
      { title: "Program Chair", unit: "BS in Tourism Management" },
      { title: "Program Chair", unit: "B of Public Administration" },
      { title: "Program Chair", unit: "BS in Law Enforcement Administration" },
      { title: "Program Chair", unit: "BS in Criminology" },
      { title: "Program Chair", unit: "B of Arts in Political Science" },
      { title: "Program Chair", unit: "BS in Civil Engineering" },
      { title: "Program Chair", unit: "BS in Computer Engineering" },
      { title: "Program Chair", unit: "BS in Electrical Engineering" },
      { title: "Program Chair", unit: "BS in Electronics Engineering" },
      { title: "Program Chair", unit: "BS in Mechanical Engineering" },
      { title: "Program Chair", unit: "BS in Information Technology" },
      { title: "Program Chair", unit: "BS in Information System (Boac)"},
      { title: "Program Chair", unit: "BS in Information System (Santa Cruz)" },
      { title: "Program Chair", unit: "BS Automotive Technology" },
      { title: "Program Chair", unit: "BSIT Drafting Technology" },
      { title: "Program Chair", unit: "BSIT Food Technology" },
      { title: "Program Chair", unit: "BSIT Electrical Technology" },
      { title: "Program Chair", unit: "BSIT Welding, Mechanical & Fabrication Tech" },
    ],
  },
  {
    header: "MARSU TORRIJOS BRANCH",
    positions: [
      { title: "Head", unit: "Human Resource Services" },
      { title: "Head", unit: "Physical Resource Services" },
      { title: "Head", unit: "Research Services" },
      { title: "Head", unit: "Extension Services" },
      { title: "Head", unit: "Student Affairs and Services" },
    ],
  },
  {
    header: "MARSU SANTA CRUZ BRANCH",
    positions: [
      { title: "Focal Person", unit: "Human Resource Services & Records Keeping" },
      { title: "Head", unit: "Physical Management and General Services" },
      { title: "Head", unit: "Research, Extension and Training" },
      { title: "Head", unit: "Student Affairs and Services" },
    ],
  },
  {
    header: "MARSU GASAN BRANCH",
    positions: [
      { title: "Head", unit: "Physical Resource Services" },
      { title: "Head", unit: "Research, Extension and Training" },
      { title: "Head", unit: "Student Affairs and Services" },
    ],
  },
];

/** Display/grouping headers, in document order (10 values). */
export const HEADERS = MARSU_OFFICES.map((office) => office.header);

/** Composes the stored display string: "Head, Legal Services Unit". */
export const composePosition = (title, unit) =>
  unit ? `${title}, ${unit}` : String(title || "");

/**
 * Flat catalog of every seat: one row per position in the document.
 * `key` is the stable identity used to join with the database roster.
 */
export const CATALOG = MARSU_OFFICES.flatMap((office) =>
  office.positions.map((position) => {
    const unit = position.unit || "";
    return {
      header: office.header,
      title: position.title,
      unit,
      position: composePosition(position.title, unit),
      key: `${office.header}::${position.title}::${unit}`,
    };
  }),
);

/** Every distinct title in the chart (the enum used by the model). */
export const ALL_TITLES = [...new Set(CATALOG.map((seat) => seat.title))];

/** Seats grouped by header: { [header]: [{ title, unit, position, key }] }. */
export const SEATS_BY_HEADER = Object.fromEntries(
  HEADERS.map((header) => [
    header,
    CATALOG.filter((seat) => seat.header === header),
  ]),
);

/** Distinct units per header, for the unit suggestions in the UI. */
export const UNITS_BY_HEADER = Object.fromEntries(
  HEADERS.map((header) => [
    header,
    [...new Set(SEATS_BY_HEADER[header].map((seat) => seat.unit).filter(Boolean))],
  ]),
);

/** Finds a catalog seat by its parts, or null when it is not a real seat. */
export const findSeatByParts = ({ header, title, unit } = {}) =>
  CATALOG.find(
    (seat) =>
      seat.header === header &&
      seat.title === title &&
      seat.unit === (unit || ""),
  ) || null;

