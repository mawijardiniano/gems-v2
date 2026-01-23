// import Navbar from "./components/layout/navbar";
// import Progress from "./components/progress";
// import PersonalInformation from "./components/personalInformation";

// export default function GAD() {
//   return (
//     <div className="h-screen">
//       <Navbar />
//       <div className="pt-16 px-4 sm:px-6 flex items-center justify-center h-[calc(100vh-4rem)]">
//         <div className="w-full max-w-3xl flex flex-col items-center justify-center border border-gray-200 p-6">
//           <Progress />
//              <PersonalInformation />

//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useSelector } from "react-redux";
import Navbar from "./components/layout/navbar";

import PersonalInformation from "./components/personalInformation";
import EconomicFinancial from "./components/economicFinancial";
import ReproductiveFamilyRole from "./components/reproductive";
import HouseholdManagingRole from "./components/household";
import CommunityInvolvement from "./components/community";
import SocialDevelopment from "./components/socials";
import Environmental from "./components/environmental";
import GenderResponsiveForm from "./components/genderResponsive";
import SecurityPeaceJustice from "./components/security";

export default function ProfileRegistration() {
  const currentStep = useSelector((state) => state.profile.currentStep);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <PersonalInformation />;
      case 2:
        return <EconomicFinancial />;
      case 3:
        return <ReproductiveFamilyRole />;
      case 4:
        return <HouseholdManagingRole />;
      case 5:
        return <CommunityInvolvement />;
      case 6:
        return <SocialDevelopment />;
      case 7:
        return <Environmental />;
      case 8:
        return <GenderResponsiveForm />;
      case 9:
        return <SecurityPeaceJustice />;
      default:
        return <PersonalInformation />;
    }
  };

  return (
    <>
      <Navbar />
      <main className="py-30">{renderStep()}</main>
    </>
  );
}
