"use client";

import { useSelector, useDispatch } from "react-redux";
import React from "react";
import Navbar from "./components/layout/navbar";

import PrivacyConsent from "./components/privacyConsent";
import PersonalInformation from "./components/personalInformation";
import GadInformation from "./components/gadInformation";
import AcademicInformation from "./components/AcademicInformation";
import EmploymentInformation from "./components/EmploymentInformation";
import ContactInformation from "./components/contactInformation";
import SubmitProfile from "./components/submitProfile";

import { reset } from "@/store/slices/profileRegistrationSlice";

export default function ProfileRegistration() {
  const dispatch = useDispatch();
  const currentStep = useSelector((state) => state.profile.currentStep);
  const currentStatus = useSelector(
    (state) => state.profile.personal.currentStatus,
  );

  React.useEffect(() => {
    dispatch(reset());
  }, [dispatch]);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <PrivacyConsent />;
      case 1:
        return <PersonalInformation />;
      case 2:
        if (currentStatus === "Student") return <AcademicInformation />;
        if (currentStatus === "Employee") return <EmploymentInformation />;
      case 3:
        return <GadInformation />;
      case 4:
        return <ContactInformation />;
      case 5:
        return <SubmitProfile />;
      default:
        return <PrivacyConsent />;
    }
  };

  return (
    <>
      <Navbar />
      <main className="py-30">{renderStep()}</main>
    </>
  );
}
