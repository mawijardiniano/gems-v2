"use client";

import React from "react";
import FormattedDate from "@/utils/formattedDate";

export default function UserDashboardPageContent({ profile }) {
  const currentStatus = profile.currentStatus;

  return (
    <div className="pt-4 pb-10 sm:p-4">
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-blue-800">
            {profile?.personal.firstName} {profile?.personal.middleName}{" "}
            {profile?.personal.lastName}
          </h1>
        </div>

        <div className="flex flex-row gap-2 items-center">
          <div className="border border-blue-900 bg-blue-50 rounded px-2 h-6 flex items-center justify-center">
            {currentStatus}
          </div>
          <h1 className="text-gray-500">{profile?.affiliation.college}</h1>
        </div>

        <p className="text-gray-500 w-80 sm:w-[700px]">
          Welcome to your GEMS profile. Here you can view and manage your
          personal information, affiliation, and contact information.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 pt-8">
        {/* Personal Info */}
        <div className="shadow-sm bg-white px-6 py-6 rounded-md">
          <h1 className="text-xl font-bold sm:font-medium pb-4">
            Personal Info
          </h1>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-gray-500 font-medium">First Name</label>
              <h1 className="font-medium">{profile?.personal.firstName}</h1>
            </div>
            <div>
              <label className="text-gray-500 font-medium">Last Name</label>
              <h1 className="font-medium">{profile?.personal.lastName}</h1>
            </div>
            <div>
              <label className="text-gray-500 font-medium">Middle Name</label>
              <h1 className="font-medium">
                {profile?.personal.middleName
                  ? profile.personal.middleName
                  : "N/A"}{" "}
              </h1>
            </div>
            <div>
              <label className="text-gray-500 font-medium">Birthday</label>
              <h1 className="font-medium">
                <FormattedDate date={profile?.personal.birthday} />
              </h1>
            </div>
            <div>
              <label className="text-gray-500 font-medium">Civil Status</label>
              <h1 className="font-medium">{profile?.personal.civilStatus}</h1>
            </div>
            <div>
              <label className="text-gray-500 font-medium">Nationality</label>
              <h1 className="font-medium">{profile?.personal.nationality}</h1>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-gray-500 font-medium">Blood Type</label>
              <div className="bg-gray-200 rounded inline-block px-2 py-1 w-fit">
                <h1 className="font-medium">{profile?.personal.bloodType}</h1>
              </div>
            </div>

            <div>
              <label className="text-gray-500 font-medium">Religion</label>
              <h1 className="font-medium">{profile?.personal.religion ?? "N/A"}</h1>
            </div>
          </div>
        </div>

        {/* Gender & Equity Data */}
        <div className="shadow-sm bg-white px-6 py-6 rounded-md">
          <h1 className="text-xl font-bold sm:font-medium pb-4">
            Gender & Equity Data
          </h1>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-gray-500 font-medium">Sex At Birth</label>
              <h1 className="font-medium">{profile?.gadData.sexAtBirth}</h1>
            </div>
            <div>
              <label className="text-gray-500 font-medium">
                Gender Identity
              </label>
              <h1 className="font-medium">
                {profile?.gadData.genderIdentity ?? "N/A"}
              </h1>
            </div>
            <div>
              <label className="text-gray-500 font-medium">
                Gender Expression
              </label>
              <h1 className="font-medium">
                {profile?.gadData.genderExpression ?? "N/A"}
              </h1>
            </div>
            <div>
              <label className="text-gray-500 font-medium">
                Sexual Orientation
              </label>
              <h1 className="font-medium">
                {profile?.gadData.sexualOrientation ?? "N/A"}
              </h1>
            </div>
            <div>
              <label className="text-gray-500 font-medium">
                Person With Disability
              </label>
              <h1 className="font-medium">
                {profile?.gadData.isPWD ? "Yes" : "No"}
              </h1>
            </div>
            {profile?.gadData.isPWD && (
              <div>
                <label className="text-gray-500 font-medium">
                  Disability Details
                </label>
                <h1 className="font-medium">
                  {profile?.gadData.disabilityDetails || "Not specified"}
                </h1>
              </div>
            )}
            <div>
              <label className="text-gray-500 font-medium">
                Indigenous Person
              </label>
              <h1 className="font-medium">
                {profile?.gadData.isIndigenous ? "Yes" : "No"}
              </h1>
            </div>
            <div>
              <label className="text-gray-500 font-medium">
                Socio Economic Status
              </label>
              <h1 className="font-medium">
                {profile?.gadData.socioEconomicStatus ?? "N/A"}
              </h1>
            </div>
            <div>
              <label className="text-gray-500 font-medium">
                Head of Household
              </label>
              <h1 className="font-medium">
                {profile?.gadData.headOfHousehold ?? "N/A"}
              </h1>
            </div>
          </div>
        </div>

        {/* University Affiliation */}
        <div className="shadow-sm bg-white px-6 py-6 rounded-md">
          <h1 className="text-xl font-bold sm:font-medium pb-4">
            University Affiliation
          </h1>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-gray-500 font-medium">Campus</label>
              <h1 className="font-medium">{profile?.affiliation.campus}</h1>
            </div>
            <div>
              <label className="text-gray-500 font-medium">
                College/Office
              </label>
              <h1 className="font-medium">{profile?.affiliation.college}</h1>
            </div>
          </div>

          <div className="text-xl font-bold py-4">User Details</div>
          <div className="grid grid-cols-2 gap-2">
            {currentStatus === "Student" && (
              <>
                <div>
                  <label className="text-gray-500 font-medium">Course</label>
                  <h1 className="font-medium">
                    {profile?.affiliation.studentDetails.course}
                  </h1>
                </div>
                <div>
                  <label className="text-gray-500 font-medium">
                    Year Level
                  </label>
                  <h1 className="font-medium">
                    {profile?.affiliation.studentDetails.yearLevel}
                  </h1>
                </div>
                <div>
                  <label className="text-gray-500 font-medium">Scholar</label>
                  <h1 className="font-medium">
                    {profile?.affiliation.studentDetails.isScholar
                      ? "Yes"
                      : "No"}
                  </h1>
                </div>
              </>
            )}

            {currentStatus === "Employee" && (
              <>
                <div>
                  <label className="text-gray-500 font-medium">
                    Department
                  </label>
                  <h1 className="font-medium">
                    {profile?.affiliation.employeeDetails.department}
                  </h1>
                </div>
                <div>
                  <label className="text-gray-500 font-medium">Position</label>
                  <h1 className="font-medium">
                    {profile?.affiliation.employeeDetails.position}
                  </h1>
                </div>
                <div>
                  <label className="text-gray-500 font-medium">
                    Employment Type
                  </label>
                  <h1 className="font-medium">
                    {profile?.affiliation.employeeDetails.employmentType}
                  </h1>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="shadow-sm bg-white px-6 py-6 rounded-md">
          <h1 className="text-xl font-bold sm:font-medium pb-4">
            Contact Info
          </h1>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-gray-500 font-medium">Email</label>
              <h1 className="font-medium">{profile?.contact.email}</h1>
            </div>
            <div>
              <label className="text-gray-500 font-medium">Mobile Number</label>
              <h1 className="font-medium">{profile?.contact.mobileNumber}</h1>
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Permanent Address
              </label>
              <h1 className="font-medium">
                {[
                  profile?.contact.permanentAddress?.street,
                  profile?.contact.permanentAddress?.barangay,
                  profile?.contact.permanentAddress?.city,
                  profile?.contact.permanentAddress?.province,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </h1>
            </div>
            <div>
              <label className="text-gray-500 font-medium">
                Current Address
              </label>
              <h1 className="font-medium">
                {[
                  profile?.contact.currentAddress?.street,
                  profile?.contact.currentAddress?.barangay,
                  profile?.contact.currentAddress?.city,
                  profile?.contact.currentAddress?.province,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </h1>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
