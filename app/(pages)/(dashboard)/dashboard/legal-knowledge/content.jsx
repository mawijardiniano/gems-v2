"use client";
import { useState, useEffect } from "react";
import { FaShieldAlt } from "react-icons/fa";

const LAW_LABELS = {
  RA_6275:
    "RA No. 6275: An Act Strengthening the Prohibition on Discrimination Against Women with respect to terms and conditions of employment, amending for the purpose Article 135 of the Labor Code, as amended",
  RA_10354:
    "RA No. 10354: An Act Providing for a National Policy on Responsible Parenthood and Reproductive Health",
  RA_7192:
    "RA No. 7192: Women in Development and Nation Building Act – an act promoting the integration of women as full equal partners of men in development and nation building and for other purposes",
  RA_7877:
    "RA No. 7877: Anti-Sexual Harassment Act of 1995 – an act declaring sexual harassment unlawful in the employment, education or training environment and for other purposes",
  RA_8972:
    "RA No. 8972: Solo Parent’s Welfare Act of 2000 – an act providing for benefits and privileges to solo parents and their children, appropriating funds therefor and for other purposes",
  RA_9710: "RA No. 9710: An Act Providing for the Magna Carta of Women",
  RA_9262:
    "RA No. 9262: Anti-Violence Against Women and their Children Act of 2004 – an act defining violence against women and their children, providing for protective measures for victims, prescribing penalties therefor, and for other purposes",
  RA_7277:
    "RA No. 7277: Magna Carta for Disabled Persons – An Act Providing for the Rehabilitation, Self-Development and Self-Reliance of Disabled Persons and their Integration into the Mainstream of Society and for other purposes",
  RA_11313:
    "RA No. 11313: Safe Spaces Act – An Act Defining Gender-Based Sexual Harassment in Streets, Public Spaces, Online, Workplaces, and Educational or Training Institutions, Providing Protective Measures and Prescribing Penalties Therefor",
  RA_8353:
    "RA No. 8353: The Anti-Rape Law of 1997 – An Act Expanding the Definition of the Crime of Rape, Reclassifying the same as Crime against Persons, Amending for the Purpose Act No. 3815, as Amended, otherwise known as the Revised Penal Code, and for Other Purposes",
  RA_11596:
    "RA No. 11596: An Act Prohibiting the Practice of Child Marriage and Imposing Penalties for Violations Thereof",
};

const OPTIONS = ["Yes", "No", "Not Sure"];

export default function LegalContent({ profile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    awareness: {},
    observed_in_university_or_community: {},
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setFormData({
      awareness: profile.social_development.awareness || {},
      observed_in_university_or_community:
        profile.social_development.observed_in_university_or_community || {},
    });
  }, [profile]);

  const handleChange = (section, lawKey, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [lawKey]: value },
    }));
  };

  const handleSave = async () => {
    try {
      setIsUpdating(true);

      // Merge updates with existing social_development
      const updatedSocialDevelopment = {
        ...profile.social_development,
        awareness: formData.awareness,
        observed_in_university_or_community:
          formData.observed_in_university_or_community,
      };

      const response = await fetch(`/api/profile/${profile._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ social_development: updatedSocialDevelopment }),
      });

      if (!response.ok) throw new Error("Failed to update legal info");

      const data = await response.json();

      setFormData({
        awareness: data.data.social_development.awareness,
        observed_in_university_or_community:
          data.data.social_development.observed_in_university_or_community,
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderSelect = (section, lawKey, value) => (
    <select
      value={value || ""}
      onChange={(e) => handleChange(section, lawKey, e.target.value)}
      className="border px-2 py-1 rounded"
    >
      {OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );

  return (
    <div className="py-6">
      <div className="border border-gray-200 p-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <FaShieldAlt /> Legal Knowledge
          </h1>
          <div className="flex gap-2">
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {isUpdating ? "Saving..." : "Save"}
              </button>
            )}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-white border border-gray-300 px-4 py-2 rounded"
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-200 px-4 py-2 text-left">
                  Law / RA
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left">
                  Awareness
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left">
                  Observed in University / Community
                </th>
              </tr>
            </thead>

            <tbody>
              {Object.keys(LAW_LABELS).map((lawKey) => (
                <tr key={lawKey} className="odd:bg-white even:bg-gray-50">
                  <td className="border border-gray-200 px-4 py-2">
                    {LAW_LABELS[lawKey]}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    {isEditing
                      ? renderSelect(
                          "awareness",
                          lawKey,
                          formData.awareness[lawKey]
                        )
                      : formData.awareness[lawKey]}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    {isEditing
                      ? renderSelect(
                          "observed_in_university_or_community",
                          lawKey,
                          formData.observed_in_university_or_community[lawKey]
                        )
                      : formData.observed_in_university_or_community[lawKey]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
