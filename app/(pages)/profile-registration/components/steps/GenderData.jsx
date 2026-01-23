// import { useDispatch, useSelector } from "react-redux";
// import {
//   nextStep,
//   prevStep,
//   setGadData,
// } from "@/store/slices/profileRegistrationSlice";
// import StepIndicator from "@/app/(pages)/profile-registration/components/StepIndicator";

// export default function GenderData() {
//   const dispatch = useDispatch();
//   const gadData = useSelector((state) => state.profile.gadData) || {};

//   const validateFields = () => {
//     if (!gadData.sexAtBirth) return false;
//     if (gadData.isPWD === undefined || gadData.isPWD === "") return false;
//     if (
//       gadData.isIndigenousPerson === undefined ||
//       gadData.isIndigenousPerson === ""
//     )
//       return false;

//     if (gadData.isPWD === true && !gadData.disabilityDetails) return false;

//     return true;
//   };

//   const canProceed = validateFields();

//   const handleChange = (field, value) => {
//     dispatch(setGadData({ field, value }));
//   };

//   return (
//     <div className="flex justify-center items-center h-screen px-4">
//       <div className="w-[900px] border border-gray-200 p-6 sm:p-16 rounded-xl bg-white">
//         {/* Step Indicator */}
//         <div className="flex justify-center items-center mb-6">
//           <StepIndicator
//             titles={[
//               "Identification",
//               "Personal",
//               "Gender",
//               "Affiliation",
//               "Contact",
//             ]}
//           />
//         </div>

//         <h2 className="text-xl font-bold mb-4">GAD / Gender & Equity</h2>

//         <div className="grid grid-cols-2 gap-4">
//           <div>
//             <label className="block font-medium mb-1">
//               Sex at Birth <span className="text-red-500">*</span>
//             </label>
//             <select
//               value={gadData.sexAtBirth || ""}
//               onChange={(e) => handleChange("sexAtBirth", e.target.value)}
//               className="w-full border p-2 rounded"
//               required
//             >
//               <option value="">Select</option>
//               <option value="Female">Female</option>
//               <option value="Male">Male</option>
//               <option value="Intersex">Intersex</option>
//               <option value="Prefer not to disclose">
//                 Prefer not to disclose
//               </option>
//             </select>
//           </div>

//           <div>
//             <label className="block font-medium mb-1">Gender Identity</label>
//             <input
//               type="text"
//               className="w-full border p-2 rounded"
//               value={gadData.genderIdentity || ""}
//               onChange={(e) => handleChange("genderIdentity", e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block font-medium mb-1">Gender Expression</label>
//             <input
//               type="text"
//               className="w-full border p-2 rounded"
//               value={gadData.genderExpression || ""}
//               onChange={(e) => handleChange("genderExpression", e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block font-medium mb-1">Sexual Orientation</label>
//             <select
//               className="w-full border p-2 rounded"
//               value={gadData.sexualOrientation || ""}
//               onChange={(e) =>
//                 handleChange("sexualOrientation", e.target.value)
//               }
//             >
//               <option value="">Select</option>
//               <option value="Heterosexual">Heterosexual</option>
//               <option value="Homosexual">Homosexual</option>
//               <option value="Bisexual">Bisexual</option>
//               <option value="Pansexual">Pansexual</option>
//               <option value="Asexual">Asexual</option>
//               <option value="Aromantic">Aromantic</option>
//               <option value="Demisexual">Demisexual</option>
//               <option value="Queer">Queer</option>
//               <option value="Prefer not to disclose">
//                 Prefer not to disclose
//               </option>
//             </select>
//           </div>

//           <div>
//             <label className="block font-medium mb-1">
//               Person with Disability? <span className="text-red-500">*</span>
//             </label>
//             <select
//               className="w-full border p-2 rounded"
//               value={String(gadData.isPWD)}
//               onChange={(e) => handleChange("isPWD", e.target.value === "true")}
//               required
//             >
//               <option value="">Select</option>
//               <option value="true">Yes</option>
//               <option value="false">No</option>
//             </select>
//           </div>

//           {gadData.isPWD === true && (
//             <div className="col-span-2">
//               <label className="block font-medium mb-1">
//                 Disability Details <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 className="w-full border p-2 rounded"
//                 value={gadData.disabilityDetails || ""}
//                 onChange={(e) =>
//                   handleChange("disabilityDetails", e.target.value)
//                 }
//                 placeholder="Specify disability"
//               />
//             </div>
//           )}

//           <div>
//             <label className="block font-medium mb-1">
//               Indigenous Person? <span className="text-red-500">*</span>
//             </label>
//             <select
//               className="w-full border p-2 rounded"
//               value={String(gadData.isIndigenousPerson)}
//               onChange={(e) =>
//                 handleChange("isIndigenousPerson", e.target.value === "true")
//               }
//               required
//             >
//               <option value="">Select</option>
//               <option value="true">Yes</option>
//               <option value="false">No</option>
//             </select>
//           </div>

//           <div>
//             <label className="block text-gray-700 font-medium mb-1">
//               Socio-Economic Status
//             </label>
//             <select
//               value={gadData.socioEconomicStatus || ""}
//               onChange={(e) =>
//                 handleChange("socioEconomicStatus", e.target.value)
//               }
//               className="w-full p-2 border rounded"
//             >
//               <option value="" disabled>
//                 Select your socio-economic status
//               </option>
//               <option value="Low Income">Low Income</option>
//               <option value="Middle Income">Middle Income</option>
//               <option value="High Income">High Income</option>
//               <option value="Prefer not to disclose">
//                 Prefer not to disclose
//               </option>
//             </select>
//           </div>

//           <div>
//             <label className="block font-medium mb-1">Head of Household</label>
//             <input
//               type="text"
//               className="w-full border p-2 rounded"
//               value={gadData.headOfHousehold || ""}
//               onChange={(e) => handleChange("headOfHousehold", e.target.value)}
//               placeholder="e.g., Self, Spouse, Parent"
//             />
//           </div>
//         </div>

//         {/* Buttons */}
//         <div className="flex justify-between mt-8">
//           <button
//             className="bg-gray-300 px-5 py-2 rounded"
//             onClick={() => dispatch(prevStep())}
//           >
//             ← Previous
//           </button>

//           <button
//             className={`px-5 py-2 rounded ${
//               canProceed
//                 ? "bg-black text-white"
//                 : "bg-gray-400 text-gray-700 cursor-not-allowed"
//             }`}
//             onClick={() => canProceed && dispatch(nextStep())}
//             disabled={!canProceed}
//           >
//             Next →
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
