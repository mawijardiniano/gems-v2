"use client";

import Identification from "./components/steps/Identification";
import PersonalDemographic from "./components/steps/PersonalDemographics";
import GenderData from "./components/steps/GenderData";
import UniversityAffiliation from "./components/steps/UniversityAffiliation";
import ContactDetails from "./components/steps/ContactDetails";
import { useSelector } from "react-redux";

export default function ProfileRegistration() {
  const currentStep = useSelector((state) => state.profile.currentStep);

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Identification />;
      case 2: return <PersonalDemographic />;
      case 3: return <GenderData />;
      case 4: return <UniversityAffiliation />;
      case 5: return <ContactDetails />;
      default: return <Identification />;
    }
  };

  return renderStep();
}
