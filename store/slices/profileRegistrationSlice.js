import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  currentStep: 1,
  userId: null,
  currentStatus: "",
  personal: {
    lastName: "",
    firstName: "",
    middleName: "",
    birthday: "",
    civilStatus: "",
    nationality: "",
    bloodType: "",
    religion: "",
  },
  gadData: {
    sexAtBirth: "",
    genderIdentity: "",
    genderExpression: "",
    sexualOrientation: "",
    isPWD: "",
    disabilityDetails: "",
    isIndigenousPerson: "",
    socioEconomicStatus: "",
    headOfHousehold: "",
  },
  affiliation: {
    campus: "",
    college: "",
    employeeDetails: {
      department: "",
      position: "",
      employmentType: "",
    },
    studentDetails: {
      course: "",
      yearLevel: "",
      isScholar: "",
    },
  },
contact: {
  email: "",
  mobileNumber: "",
  permanentAddress: {
    houseNo: "",
    barangay: "",
    city: "",
    province: "",
  },
  currentAddress: {
    houseNo: "",
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
    setStatus: (state, action) => {
      state.currentStatus = action.payload.value;
    },
    setPersonal: (state, action) => {
      const { field, value } = action.payload;
      state.personal = {
        ...state.personal,
        [field]: value,
      };
    },
    setGadData: (state, action) => {
      const { field, value } = action.payload;
      state.gadData = {
        ...state.gadData,
        [field]: value,
      };
    },
    setAffiliation: (state, action) => {
      const { field, value } = action.payload;

      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        state.affiliation[field] = {
          ...state.affiliation[field],
          ...value,
        };
      } else {
        state.affiliation[field] = value;
      }
    },
    setContact: (state, action) => {
      const { field, value } = action.payload;
      state.contact = {
        ...state.contact,
        [field]: value,
      };
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
  setStatus,
  setPersonal,
  setGadData,
  setAffiliation,
  setContact,
  nextStep,
  prevStep,
  reset,
} = profileRegistrationSlice.actions;
export default profileRegistrationSlice.reducer;
