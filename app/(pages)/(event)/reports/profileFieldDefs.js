/* Field registry for the Gender Profile Report, in fixed column order.
   sources: which populations carry the field. bothOnly: exists only when
   students and employees are combined. listOnly: identifying field that is
   meaningless as a grouping key, so aggregated mode ignores it. */
import {
  AGE_GROUP_ORDER,
  ageFromBirthday,
  ageGroupForAge,
} from "../gender-statistics/components/ageGroups.js";

export const UNSPECIFIED = "Unspecified";
const DASH = "—";
const BOTH = ["students", "employees"];

const yesNo = (value) => (value ? "Yes" : "No");
const orDash = (value) => (value == null || value === "" ? DASH : value);

const simple = (value, label, sources, key, extra = {}) => ({
  value,
  label,
  sources,
  get: (r) => orDash(r[key]),
  ...extra,
});

const flag = (value, label, sources, key, extra = {}) => ({
  value,
  label,
  sources,
  get: (r) => yesNo(r[key]),
  ...extra,
});

export const FIELD_DEFS = [
  simple("name", "Name", BOTH, "fullName"),
  {
    value: "type",
    label: "Type (Student / Employee)",
    header: "Type",
    sources: [],
    bothOnly: true,
    get: (r) => orDash(r.__type),
    rank: (v) => (v === "Student" ? 0 : v === "Employee" ? 1 : 2),
  },
  simple("sex", "Sex", BOTH, "sex"),
  {
    value: "age",
    label: "Age",
    sources: BOTH,
    get: (r) => {
      const age = ageFromBirthday(r.birthday);
      return age == null ? DASH : age;
    },
    group: (r) => ageGroupForAge(ageFromBirthday(r.birthday)) || UNSPECIFIED,
    groupHeader: "Age Group",
    rank: (v) => {
      const index = AGE_GROUP_ORDER.indexOf(v);
      return index === -1 ? AGE_GROUP_ORDER.length : index;
    },
  },
  simple("yearLevel", "Year Level", ["students"], "yearLevel", {
    rank: (v) => parseInt(v, 10) || 99,
  }),
  simple("positionLevel", "Position Level", ["employees"], "positionLevel"),
  simple("studentId", "Student ID", ["students"], "studentId", {
    listOnly: true,
  }),
  simple("employeeId", "Employee ID", ["employees"], "employeeId", {
    listOnly: true,
  }),
  simple("email", "Email", BOTH, "email", { listOnly: true }),
  simple("campus", "Campus", ["students"], "campus"),
  {
    value: "college",
    label: "College / Office",
    sources: BOTH,
    get: (r) => orDash(r.college || r.office),
  },
  simple("program", "Program", ["students"], "course"),
  simple("department", "Department", ["employees"], "department"),
  simple("personnelType", "Personnel Type", ["employees"], "personnelType"),
  simple("academicRank", "Academic Rank", ["employees"], "academicRank"),
  simple(
    "appointmentStatus",
    "Appointment Status",
    ["employees"],
    "appointmentStatus",
  ),
  simple("birthday", "Birthday", BOTH, "birthday", { listOnly: true }),
  simple("civilStatus", "Civil Status", BOTH, "civilStatus"),
  simple("religion", "Religion", BOTH, "religion"),
  simple("genderIdentity", "Gender Identity", BOTH, "genderIdentity"),
  simple("income", "Income Level", BOTH, "income"),
  flag("scholar", "Scholar", ["students"], "scholar"),
  flag("pwd", "PWD", BOTH, "pwd"),
  flag("indigenous", "Indigenous Person (IP)", BOTH, "indigenous", {
    header: "IP",
  }),
  flag("soloParent", "Solo Parent", BOTH, "soloParent"),
];

export const FIELD_BY_VALUE = Object.fromEntries(
  FIELD_DEFS.map((d) => [d.value, d]),
);
