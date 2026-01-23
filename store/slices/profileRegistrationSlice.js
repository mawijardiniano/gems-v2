// import { createSlice } from "@reduxjs/toolkit";

// const initialState = {
//   currentStep: 1,
//   userId: null,
//   currentStatus: "",
//   personal: {
//     lastName: "",
//     firstName: "",
//     middleName: "",
//     birthday: "",
//     civilStatus: "",
//     nationality: "",
//     bloodType: "",
//     religion: "",
//   },
//   gadData: {
//     sexAtBirth: "",
//     genderIdentity: "",
//     genderExpression: "",
//     sexualOrientation: "",
//     isPWD: "",
//     disabilityDetails: "",
//     isIndigenousPerson: "",
//     socioEconomicStatus: "",
//     headOfHousehold: "",
//   },
//   affiliation: {
//     campus: "",
//     college: "",
//     employeeDetails: {
//       department: "",
//       position: "",
//       employmentType: "",
//     },
//     studentDetails: {
//       course: "",
//       yearLevel: "",
//       isScholar: "",
//     },
//   },
// contact: {
//   email: "",
//   mobileNumber: "",
//   permanentAddress: {
//     houseNo: "",
//     barangay: "",
//     city: "",
//     province: "",
//   },
//   currentAddress: {
//     houseNo: "",
//     barangay: "",
//     city: "",
//     province: "",
//   },
// },
// };

// const profileRegistrationSlice = createSlice({
//   name: "profile",
//   initialState,
//   reducers: {
//     setStatus: (state, action) => {
//       state.currentStatus = action.payload.value;
//     },
//     setPersonal: (state, action) => {
//       const { field, value } = action.payload;
//       state.personal = {
//         ...state.personal,
//         [field]: value,
//       };
//     },
//     setGadData: (state, action) => {
//       const { field, value } = action.payload;
//       state.gadData = {
//         ...state.gadData,
//         [field]: value,
//       };
//     },
//     setAffiliation: (state, action) => {
//       const { field, value } = action.payload;

//       if (
//         typeof value === "object" &&
//         value !== null &&
//         !Array.isArray(value)
//       ) {
//         state.affiliation[field] = {
//           ...state.affiliation[field],
//           ...value,
//         };
//       } else {
//         state.affiliation[field] = value;
//       }
//     },
//     setContact: (state, action) => {
//       const { field, value } = action.payload;
//       state.contact = {
//         ...state.contact,
//         [field]: value,
//       };
//     },
//     nextStep: (state) => {
//       state.currentStep += 1;
//     },
//     prevStep: (state) => {
//       if (state.currentStep > 1) state.currentStep -= 1;
//     },
//     reset: () => initialState,
//   },
// });

// export const {
//   setStatus,
//   setPersonal,
//   setGadData,
//   setAffiliation,
//   setContact,
//   nextStep,
//   prevStep,
//   reset,
// } = profileRegistrationSlice.actions;
// export default profileRegistrationSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";

const RA_fields = [
  "RA_6275",
  "RA_10354",
  "RA_7192",
  "RA_7877",
  "RA_8972",
  "RA_9710",
  "RA_9262",
  "RA_7277",
  "RA_11313",
  "RA_8353",
  "RA_11596",
];

const createRAState = () =>
  RA_fields.reduce((acc, ra) => ({ ...acc, [ra]: "N/A" }), {});

const initialState = {
  currentStep: 1,
  personal_information: {
    first_name: "",
    middle_name: "",
    last_name: "",
    sex: "",
    gender_preference: "",
    age_bracket: "",
    civil_status: "",
    civil_status_other: "",
    religion: "",
    religion_other: "",
    college_office: "",
    employment_status: "",
    employment_appointment_status: "",
    solo_parent: null,
    total_annual_family_income: "",
    health_problems: [],
    health_problems_other: "",
  },
  economic_financial_role: {
    breadwinner: null,
    income_sources: "",
    income_sources_other: "",
    cultural_barrier_work: null,
    manage_financial_resources: null,
    participate_financial_decisions: null,
  },
  reproductive_family_role: {
    childbearing_stage: "",
    child_rearing_stage: "",
    family_planning: "",
    spouse_share_childcare: "",
    attend_school_needs: "",
    childcare_responsibility: "",
  },
  household_managing_role: {
    spouse_participate_household: "",
    family_participate_household: null,
    decision_manage_household: null,
    household_decision_explanation: "",
  },
  community_involvement: {
    community_involvement: null,
    exercise_right_to_vote: null,
    spouse_different_religion: "",
    spouse_cultural_difference: "",
  },
  social_development: {
    housing_work_life_balance: {
      house_property_owned: null,
      job_hinder_parent_role: null,
      working_parent_hindrance_career: null,
      enough_rest: null,
      manage_stress: null,
      stress_management_methods: "",
    },
    personal_development_empowerment: {
      undertake_empowerment_activities: null,
      empowerment_activities_examples: "",
      home_environment_growth: null,
      community_environment_growth: null,
      environment_growth_reason: "",
    },
    awareness: createRAState(),
    observed_in_university_or_community: createRAState(),
    other_training_needs: [],
    other_training_needs_specify: "",
  },
  environmental_climate: {
    environmental_protection: "",
    disaster_reduction: "",
    disaster_knowledge_personal: "",
    disaster_knowledge_family: "",
    disaster_knowledge_officemates: "",
    fire_drill: "",
    earthquake_drill: "",
    trained_marshals: null,
    emergency_equipment_home: "",
    emergency_equipment_office: "",
  },
  gender_responsive: {
    equal_access_resources: null,
    control_over_resources: null,
    consulted_community_issues: null,
    consulted_women_issues: null,
    consulted_organization_issues: null,
    officials_respect_rights: "",
    treated_with_respect: "",
  },
  security_peace: {
    gender_based_experiences: {},
    other_experiences: {},
    reason_not_discuss: "",
    vaw_services_awareness: {},
  },
};

const profileRegistrationSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setPersonalInformation: (state, action) => {
      const { field, value } = action.payload;
      state.personal_information[field] = value;
    },
    setEconomicFinancialRole: (state, action) => {
      const { field, value } = action.payload;
      state.economic_financial_role[field] = value;
    },
    setReproductiveFamilyRole: (state, action) => {
      const { field, value } = action.payload;
      state.reproductive_family_role[field] = value;
    },
    setHouseholdManagingRole: (state, action) => {
      const { field, value } = action.payload;
      state.household_managing_role[field] = value;
    },
    setCommunityInvolvement: (state, action) => {
      const { field, value } = action.payload;
      state.community_involvement[field] = value;
    },
    setSocialDevelopment: (state, action) => {
      const { section, field, value } = action.payload;

      if (field === null) {
        state.social_development[section] = value;
        return;
      }

      if (Array.isArray(field)) {
        const [subSection, key] = field; // e.g., ["awareness", "RA_6275"]
        if (!state.social_development[subSection])
          state.social_development[subSection] = {};
        state.social_development[subSection][key] = value;
        return;
      }

      state.social_development[section][field] = value;
    },
    setEnvironmentalClimate: (state, action) => {
      const { field, value } = action.payload;
      state.environmental_climate[field] = value;
    },
    setGenderResponsive: (state, action) => {
      const { field, value } = action.payload;
      state.gender_responsive[field] = value;
    },
    setSecurityPeace: (state, action) => {
      const { section, field, value } = action.payload;
      state.security_peace[section][field] = value;
    },
    nextStep: (state) => {
      state.currentStep += 1;
    },
    prevStep: (state) => {
      if (state.currentStep > 1) state.currentStep -= 1;
    },
    reset: () => initialState,
  },
});

export const {
  setPersonalInformation,
  setEconomicFinancialRole,
  setReproductiveFamilyRole,
  setHouseholdManagingRole,
  setCommunityInvolvement,
  setSocialDevelopment,
  setEnvironmentalClimate,
  setGenderResponsive,
  setSecurityPeace,
  nextStep,
  prevStep,
  reset,
} = profileRegistrationSlice.actions;

export default profileRegistrationSlice.reducer;
