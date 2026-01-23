import React from "react";

export default function GenderResponsive({ data }) {
  const total = data.length;

  const percent = (count) =>
    total === 0 ? 0 : Math.round((count / total) * 100);

  const equalAccess = percent(
    data.filter(
      (d) => d.gender_responsive?.equal_access_resources === true
    ).length
  );

  const controlOverResources = percent(
    data.filter(
      (d) => d.gender_responsive?.control_over_resources === true
    ).length
  );

  const communityConsultation = percent(
    data.filter(
      (d) => d.gender_responsive?.consulted_community_issues === true
    ).length
  );

  const womenConsultation = percent(
    data.filter(
      (d) => d.gender_responsive?.consulted_women_issues === true
    ).length
  );

  const organizationConsultation = percent(
    data.filter(
      (d) =>
        d.gender_responsive?.consulted_organization_issues === true
    ).length
  );

  const ProgressBar = ({ label, value }) => (
    <div className="mb-4">
      <div className="flex justify-between text-sm font-medium mb-1">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="w-full bg-white border border-gray-200 rounded-md px-8 py-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Gender-Responsive Governance</h1>
        <p className="text-sm text-gray-500">
          Participation and respect indicators
        </p>
      </div>

      <h2 className="text-md font-semibold mb-4">Governance Indicators</h2>

      <div className="bg-gray-50 p-4">
        <ProgressBar label="Equal Access to Resources" value={equalAccess} />
        <ProgressBar
          label="Control Over Resources"
          value={controlOverResources}
        />
        <ProgressBar
          label="Community Consultation"
          value={communityConsultation}
        />
        <ProgressBar label="Women Consultation" value={womenConsultation} />

        <ProgressBar
          label="Organization Consultation"
          value={organizationConsultation}
        />
      </div>
    </div>
  );
}
