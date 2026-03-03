import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  currentStep: 0,
  personal: {
    first_name: "",
    middle_name: "",
    last_name: "",
    birthday: "",
    bloodType: "",
    nationality: "Filipino",
    civil_status: "",
    religion: "",
    currentStatus: "", // Student | Employee
  },
  gadData: {
    sexAtBirth: "", // Male | Female
    gender_preference: "",
    isPWD: null,
    pwd_type: "",
    isIndigenousPerson: null,
    socioEconomicStatus: "",
    headOfHousehold: "",
  },
  affiliation: {
    academic_information: {
      student_id: "",
      campus: "",
      college: "",
      course: "",
      year_level: "",
      isScholar: "",
    },
    employment_information: {
      employee_id: "",
      office: "",
      employment_status: "",
      employment_appointment_status: "",
    },
  },
  contact: {
    email: "",
    mobileNumber: "",
    permanentAddress: {
      barangay: "",
      city: "",
      province: "",
    },
    currentAddress: {
      barangay: "",
      city: "",
      province: "",
    },
  },
};

const profileRegistrationSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setPersonal: (state, action) => {
      const { field, value } = action.payload;
      state.personal[field] = value;
    },
    setGadData: (state, action) => {
      const { field, value } = action.payload;
      state.gadData[field] = value;
    },
    setAffiliation: (state, action) => {
      const { field, value } = action.payload;
      if (typeof field === "string" && field.includes(".")) {
        const parts = field.split(".");
        const last = parts.pop();
        let target = state.affiliation;
        for (const part of parts) {
          if (target[part] === undefined || target[part] === null)
            target[part] = {};
          target = target[part];
        }
        target[last] = value;
        return;
      }
      state.affiliation[field] = value;
    },
    setContact: (state, action) => {
      const { field, value } = action.payload;
      if (typeof field === "string" && field.includes(".")) {
        const parts = field.split(".");
        const last = parts.pop();
        let target = state.contact;
        for (const part of parts) {
          if (target[part] === undefined || target[part] === null)
            target[part] = {};
          target = target[part];
        }
        target[last] = value;
        return;
      }
      state.contact[field] = value;
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
  setPersonal,
  setGadData,
  setAffiliation,
  setContact,
  nextStep,
  prevStep,
  reset,
} = profileRegistrationSlice.actions;

export default profileRegistrationSlice.reducer;
